/** Everything is stored locally in the browser (chrome.storage.local). Nothing is sent to a server. */

import type { AnswerEntry, ApplicationRecord, Profile, QueueItem, Settings, UserCorrection } from "./types";
import { clampSettings } from "../background/queue";

export const EMPTY_PROFILE: Profile = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  location: "",
  country: "",
  linkedin: "",
  github: "",
  portfolio: "",
  resumeUrl: "https://drive.google.com/file/d/1_L5NAIAgNgMUZYuyqM25RNu02NELLGwp/view?usp=drive_link",
  currentCompany: "",
  currentTitle: "",
  school: "",
  degree: "",
  discipline: "",
  graduationYear: "",
  experienceYears: "",
  targetRoles: "",
  preferredLocations: "",
  skills: "",
  address: "",
  addressLine1: "",
  addressLine2: "",
  postalCode: "",
  state: "",
  educationLevel: "",
  timezone: "",
  skillsComplete: false,
  languagesComplete: false,
  workHistoryComplete: false,
};

export const MAX_APPLICATIONS = 1000;
export const MAX_SCREENSHOTS = 25;
export const MAX_ANSWERS = 1000;
export const MAX_CORRECTIONS = 500;
export const MAX_QUEUE = 1000;
export const STORAGE_QUOTA_BYTES = 10 * 1024 * 1024; // 10MB default in Chrome extensions

const KEYS = {
  profile: "profile", answers: "answers", applications: "applications", queue: "queue", settings: "settings", running: "queueRunning", corrections: "corrections",
} as const;

export function pruneQueue(queue: QueueItem[]): QueueItem[] {
  if (queue.length <= MAX_QUEUE) return queue;
  const terminal = new Set(["applied", "failed", "skipped"]);
  const active = queue.filter((q) => !terminal.has(q.status));
  const completed = queue.filter((q) => terminal.has(q.status));
  const allowedCompleted = Math.max(0, MAX_QUEUE - active.length);
  const keptCompleted = completed.slice(-allowedCompleted);
  return [...active, ...keptCompleted].slice(-MAX_QUEUE);
}

export async function loadQueue(): Promise<QueueItem[]> {
  const data = await chrome.storage.local.get(KEYS.queue);
  return (data[KEYS.queue] as QueueItem[] | undefined) ?? [];
}

export async function saveQueue(queue: QueueItem[]): Promise<void> {
  const pruned = pruneQueue(queue);
  await chrome.storage.local.set({ [KEYS.queue]: pruned });
}

export async function loadSettings(): Promise<Settings> {
  const data = await chrome.storage.local.get(KEYS.settings);
  return clampSettings((data[KEYS.settings] as Partial<Settings> | undefined) ?? {});
}

export async function saveSettings(settings: Partial<Settings>): Promise<Settings> {
  const clamped = clampSettings(settings);
  await chrome.storage.local.set({ [KEYS.settings]: clamped });
  return clamped;
}

export async function isQueueRunning(): Promise<boolean> {
  const data = await chrome.storage.local.get(KEYS.running);
  return data[KEYS.running] === true;
}

export async function setQueueRunning(running: boolean): Promise<void> {
  await chrome.storage.local.set({ [KEYS.running]: running });
}

export async function loadProfile(): Promise<Profile> {
  const data = await chrome.storage.local.get(KEYS.profile);
  return { ...EMPTY_PROFILE, ...(data[KEYS.profile] as Partial<Profile> | undefined) };
}

export async function saveProfile(profile: Profile): Promise<void> {
  await chrome.storage.local.set({ [KEYS.profile]: profile });
}

export function pruneAnswers(answers: AnswerEntry[]): AnswerEntry[] {
  if (answers.length <= MAX_ANSWERS) return answers;
  return [...answers].sort((a, b) => (a.updatedAt || "").localeCompare(b.updatedAt || "")).slice(-MAX_ANSWERS);
}

export async function loadAnswers(): Promise<AnswerEntry[]> {
  const data = await chrome.storage.local.get(KEYS.answers);
  return (data[KEYS.answers] as AnswerEntry[] | undefined) ?? [];
}

/** Add or replace the answer to a question (matched by exact question text). */
export function upsertAnswer(answers: AnswerEntry[], entry: AnswerEntry): AnswerEntry[] {
  const rest = answers.filter((a) => a.question.trim().toLowerCase() !== entry.question.trim().toLowerCase());
  return pruneAnswers([...rest, entry]);
}

export async function saveAnswers(answers: AnswerEntry[]): Promise<void> {
  const pruned = pruneAnswers(answers);
  await chrome.storage.local.set({ [KEYS.answers]: pruned });
}

/** Read, change and write one stored list as one step. Two saves close together (two clicks, two panel windows, the
 * panel and the background) each see the other's result instead of overwriting it. */
async function exclusive<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const locks = (globalThis.navigator as Navigator | undefined)?.locks;
  return locks ? locks.request(`applyagent:${name}`, fn) : fn();
}

export function updateAnswers(change: (answers: AnswerEntry[]) => AnswerEntry[]): Promise<void> {
  return exclusive("answers", async () => saveAnswers(change(await loadAnswers())));
}

export function updateApplications(change: (records: ApplicationRecord[]) => ApplicationRecord[]): Promise<void> {
  return exclusive("applications", async () => saveApplications(change(await loadApplications())));
}

/** Prune applications to ring buffer size (MAX_APPLICATIONS) and cap retained screenshots (MAX_SCREENSHOTS). */
export function pruneApplications(records: ApplicationRecord[]): {
  pruned: ApplicationRecord[];
  evictedScreenshotKeys: string[];
} {
  let kept = records.length > MAX_APPLICATIONS ? records.slice(-MAX_APPLICATIONS) : [...records];
  const evictedScreenshotKeys: string[] = [];

  if (records.length > MAX_APPLICATIONS) {
    const dropped = records.slice(0, records.length - MAX_APPLICATIONS);
    for (const r of dropped) {
      if (r.screenshotKey) evictedScreenshotKeys.push(r.screenshotKey);
    }
  }

  const withScreenshots = kept.filter((r) => !!r.screenshotKey);
  if (withScreenshots.length > MAX_SCREENSHOTS) {
    const excessCount = withScreenshots.length - MAX_SCREENSHOTS;
    const toClear = new Set(withScreenshots.slice(0, excessCount).map((r) => r.id));
    kept = kept.map((r) => {
      if (toClear.has(r.id) && r.screenshotKey) {
        evictedScreenshotKeys.push(r.screenshotKey);
        return { ...r, screenshotKey: undefined };
      }
      return r;
    });
  }

  return { pruned: kept, evictedScreenshotKeys };
}

export async function loadApplications(): Promise<ApplicationRecord[]> {
  const data = await chrome.storage.local.get(KEYS.applications);
  return (data[KEYS.applications] as ApplicationRecord[] | undefined) ?? [];
}

export async function saveApplications(records: ApplicationRecord[]): Promise<void> {
  const { pruned, evictedScreenshotKeys } = pruneApplications(records);
  if (evictedScreenshotKeys.length && typeof chrome !== "undefined" && chrome.storage?.local?.remove) {
    await chrome.storage.local.remove(evictedScreenshotKeys).catch(() => undefined);
  }
  await chrome.storage.local.set({ [KEYS.applications]: pruned });
}

export function pruneCorrections(corrections: UserCorrection[]): UserCorrection[] {
  if (corrections.length <= MAX_CORRECTIONS) return corrections;
  return [...corrections].sort((a, b) => (a.count ?? 0) - (b.count ?? 0) || (a.lastUpdated || "").localeCompare(b.lastUpdated || "")).slice(-MAX_CORRECTIONS);
}

export async function loadCorrections(): Promise<UserCorrection[]> {
  const data = await chrome.storage.local.get(KEYS.corrections);
  return (data[KEYS.corrections] as UserCorrection[] | undefined) ?? [];
}

export async function saveCorrections(corrections: UserCorrection[]): Promise<void> {
  const pruned = pruneCorrections(corrections);
  await chrome.storage.local.set({ [KEYS.corrections]: pruned });
}

export function updateCorrections(change: (corrections: UserCorrection[]) => UserCorrection[]): Promise<void> {
  return exclusive("corrections", async () => saveCorrections(change(await loadCorrections())));
}

/** Check storage quota usage and prune aggressively if nearing the 10MB quota. */
export async function enforceStorageQuota(): Promise<{
  bytesInUse?: number;
  prunedScreenshots: number;
  prunedApplications: number;
}> {
  if (typeof chrome === "undefined" || !chrome.storage?.local) {
    return { prunedScreenshots: 0, prunedApplications: 0 };
  }
  let bytesInUse: number | undefined;
  if (typeof chrome.storage.local.getBytesInUse === "function") {
    try {
      bytesInUse = await chrome.storage.local.getBytesInUse(null);
    } catch {}
  }
  const isNearQuota = bytesInUse !== undefined && bytesInUse > 8 * 1024 * 1024;
  const apps = await loadApplications();
  let prunedScreenshots = 0;
  let prunedApplications = 0;
  if (isNearQuota || apps.length > MAX_APPLICATIONS) {
    const targetApps = isNearQuota ? Math.min(500, MAX_APPLICATIONS) : MAX_APPLICATIONS;
    const targetScreenshots = isNearQuota ? 5 : MAX_SCREENSHOTS;
    let kept = apps.slice(-targetApps);
    prunedApplications = apps.length - kept.length;
    const withShots = kept.filter((r) => !!r.screenshotKey);
    const toRemoveKeys: string[] = [];
    if (withShots.length > targetScreenshots) {
      const excess = withShots.length - targetScreenshots;
      prunedScreenshots = excess;
      const toClear = new Set(withShots.slice(0, excess).map((r) => r.id));
      kept = kept.map((r) => {
        if (toClear.has(r.id) && r.screenshotKey) {
          toRemoveKeys.push(r.screenshotKey);
          return { ...r, screenshotKey: undefined };
        }
        return r;
      });
    }
    if (toRemoveKeys.length && chrome.storage.local.remove) {
      await chrome.storage.local.remove(toRemoveKeys).catch(() => undefined);
    }
    await chrome.storage.local.set({ [KEYS.applications]: kept });
  }
  return { bytesInUse, prunedScreenshots, prunedApplications };
}

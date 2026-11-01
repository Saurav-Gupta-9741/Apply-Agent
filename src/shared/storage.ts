/** Everything is stored locally in the browser (chrome.storage.local). Nothing is sent to a server. */

import type { AnswerEntry, ApplicationRecord, CandidateProfile, Profile, ProfilePersona, QueueItem, Settings, UserCorrection } from "./types";
import { clampSettings } from "../background/queue";
import { isNeverRemembered } from "../content/classify";

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
  resumeUrl: "",
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
/** @deprecated Screenshots are proof of submission and are never evicted (the extension has unlimitedStorage). */
export const MAX_SCREENSHOTS = Number.POSITIVE_INFINITY;
export const MAX_ANSWERS = 1000;
export const MAX_CORRECTIONS = 500;
export const MAX_QUEUE = 1000;
export const STORAGE_QUOTA_BYTES = 10 * 1024 * 1024; // 10MB default in Chrome extensions

const KEYS = {
  profile: "profile",
  profiles: "candidateProfiles",
  activeProfileId: "activeProfileId",
  answers: "answers",
  applications: "applications",
  queue: "queue",
  settings: "settings",
  running: "queueRunning",
  corrections: "corrections",
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


/** Read, change and write one stored list as one step. Two saves close together (two clicks, two panel windows, the
 * panel and the background) each see the other's result instead of overwriting it. */
export async function exclusive<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const locks = (globalThis.navigator as Navigator | undefined)?.locks;
  if (locks) return locks.request(`applyagent:${name}`, fn);
  // No Web Locks (older browsers, tests): at least serialise the steps taken in this context.
  const previous = fallbackChains.get(name) ?? Promise.resolve();
  const next = previous.then(fn, fn);
  fallbackChains.set(name, next.catch(() => undefined));
  return next;
}

const fallbackChains = new Map<string, Promise<unknown>>();

export async function loadProfile(): Promise<Profile> {
  const data = await chrome.storage.local.get(KEYS.profile);
  return { ...EMPTY_PROFILE, ...(data[KEYS.profile] as Partial<Profile> | undefined) };
}

export async function saveProfile(profile: Profile): Promise<void> {
  await chrome.storage.local.set({ [KEYS.profile]: profile });
}

export async function loadCandidateProfiles(): Promise<CandidateProfile[]> {
  const data = await chrome.storage.local.get([KEYS.profiles, KEYS.profile]);
  const list = data[KEYS.profiles] as CandidateProfile[] | undefined;
  if (Array.isArray(list) && list.length > 0) {
    return list;
  }
  const current = data[KEYS.profile] as Profile | undefined;
  if (current && (current.firstName || current.targetRoles || current.skills)) {
    const defaultProfile: CandidateProfile = {
      id: "default",
      name: current.targetRoles ? current.targetRoles.split(",")[0]!.trim() : "Default Profile",
      targetRole: current.targetRoles || undefined,
      profile: { ...EMPTY_PROFILE, ...current },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return [defaultProfile];
  }
  return [];
}

export const loadProfiles = loadCandidateProfiles;

export async function saveCandidateProfiles(profiles: CandidateProfile[]): Promise<void> {
  await chrome.storage.local.set({ [KEYS.profiles]: profiles });
}

export const saveProfiles = saveCandidateProfiles;

export async function loadActiveProfileId(): Promise<string | undefined> {
  const data = await chrome.storage.local.get(KEYS.activeProfileId);
  return data[KEYS.activeProfileId] as string | undefined;
}

export async function setActiveProfileId(id: string): Promise<void> {
  await chrome.storage.local.set({ [KEYS.activeProfileId]: id });
}

export async function getCandidateProfile(id: string): Promise<CandidateProfile | undefined> {
  const profiles = await loadCandidateProfiles();
  return profiles.find((p) => p.id === id);
}

export async function saveCandidateProfile(candidate: CandidateProfile): Promise<void> {
  await exclusive("profiles", async () => {
    const profiles = await loadCandidateProfiles();
    const existingIndex = profiles.findIndex((p) => p.id === candidate.id);
    let updated: CandidateProfile[];
    const entry: CandidateProfile = {
      ...candidate,
      updatedAt: new Date().toISOString(),
    };
    if (existingIndex >= 0) {
      updated = [...profiles];
      updated[existingIndex] = entry;
    } else {
      updated = [...profiles, entry];
    }
    await saveCandidateProfiles(updated);

    const activeId = await loadActiveProfileId();
    if (!activeId || activeId === candidate.id || profiles.length === 0) {
      await setActiveProfileId(candidate.id);
      await saveProfile(candidate.profile);
    }
  });
}

export async function switchProfile(id: string): Promise<Profile> {
  return exclusive("profiles", async () => {
    const profiles = await loadCandidateProfiles();
    const target = profiles.find((p) => p.id === id);
    if (!target) {
      throw new Error(`Profile with id "${id}" not found`);
    }
    await setActiveProfileId(id);
    await saveProfile(target.profile);
    return target.profile;
  });
}

export async function deleteCandidateProfile(id: string): Promise<void> {
  await exclusive("profiles", async () => {
    const profiles = await loadCandidateProfiles();
    const remaining = profiles.filter((p) => p.id !== id);
    await saveCandidateProfiles(remaining);
    const activeId = await loadActiveProfileId();
    if (activeId === id) {
      if (remaining.length > 0) {
        await setActiveProfileId(remaining[0]!.id);
        await saveProfile(remaining[0]!.profile);
      } else {
        await chrome.storage.local.remove(KEYS.activeProfileId);
        await saveProfile(EMPTY_PROFILE);
      }
    }
  });
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
  // Secrets, identity numbers and signatures are never stored, whoever saves them (side panel, inbox, corrections).
  if (isNeverRemembered(entry.question, entry.topic)) return answers;
  const rest = answers.filter((a) => a.question.trim().toLowerCase() !== entry.question.trim().toLowerCase());
  return pruneAnswers([...rest, entry]);
}

export async function saveAnswers(answers: AnswerEntry[]): Promise<void> {
  const pruned = pruneAnswers(answers);
  await chrome.storage.local.set({ [KEYS.answers]: pruned });
}


export function updateAnswers(change: (answers: AnswerEntry[]) => AnswerEntry[]): Promise<void> {
  return exclusive("answers", async () => saveAnswers(change(await loadAnswers())));
}

export function updateApplications(change: (records: ApplicationRecord[]) => ApplicationRecord[]): Promise<void> {
  return exclusive("applications", async () => saveApplications(change(await loadApplications())));
}

/** Prune applications to ring buffer size (MAX_APPLICATIONS). Proof-of-submission screenshots are never deleted:
 * the extension has unlimitedStorage, and a record that carries a screenshot is kept even past the cap (only the
 * oldest records without one make room). */
export function pruneApplications(records: ApplicationRecord[]): {
  pruned: ApplicationRecord[];
  evictedScreenshotKeys: string[];
} {
  if (records.length <= MAX_APPLICATIONS) return { pruned: [...records], evictedScreenshotKeys: [] };
  let excess = records.length - MAX_APPLICATIONS;
  const pruned = records.filter((r) => {
    if (excess > 0 && !r.screenshotKey) {
      excess--;
      return false;
    }
    return true;
  });
  return { pruned, evictedScreenshotKeys: [] };
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

/** Check storage usage. The extension has unlimitedStorage, so nothing is deleted for space: proof-of-submission
 * screenshots are kept, and only the application cap (records without a screenshot) applies. */
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
  const apps = await loadApplications();
  let prunedApplications = 0;
  if (apps.length > MAX_APPLICATIONS) {
    const { pruned } = pruneApplications(apps);
    prunedApplications = apps.length - pruned.length;
    await chrome.storage.local.set({ [KEYS.applications]: pruned });
  }
  return { bytesInUse, prunedScreenshots: 0, prunedApplications };
}

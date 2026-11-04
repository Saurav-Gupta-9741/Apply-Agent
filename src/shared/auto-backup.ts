/** Automatic backup to a file on the user's own PC (Downloads/ApplyAgent/applyagent-backup.json), so removing and
 * re-adding the extension, a new folder, or a new computer never means setting everything up again. Nothing is sent
 * anywhere: the file is written by Chrome's own downloads, and only after the user turns it on (the optional
 * "downloads" permission is asked for then). At most one backup an hour, a couple of minutes after a change. */

import { makeBackup } from "./backup";
import { loadAnswers, loadApplications, loadProfile, loadSettings } from "./storage";

export const AUTO_BACKUP_KEY = "autoBackup";
export const AUTO_BACKUP_ALARM = "auto-backup";
export const AUTO_BACKUP_FILE = "ApplyAgent/applyagent-backup.json";
const WATCHED = new Set(["profile", "answers", "applications", "settings", "myCompanies"]);
const DELAY_MS = 2 * 60_000;
const MIN_GAP_MS = 60 * 60_000;

export interface AutoBackupState {
  enabled: boolean;
  lastAt?: string;
  lastError?: string;
}

export async function loadAutoBackup(): Promise<AutoBackupState> {
  const { [AUTO_BACKUP_KEY]: v } = await chrome.storage.local.get(AUTO_BACKUP_KEY);
  return { enabled: false, ...(v ?? {}) };
}

async function saveAutoBackup(patch: Partial<AutoBackupState>): Promise<AutoBackupState> {
  const next = { ...(await loadAutoBackup()), ...patch };
  await chrome.storage.local.set({ [AUTO_BACKUP_KEY]: next });
  return next;
}

/** When the next backup may run: a little after the change, and at least an hour after the last one. */
export function nextBackupTime(lastAt: string | undefined, now: number): number {
  const last = lastAt ? Date.parse(lastAt) : 0;
  return Math.max(now + DELAY_MS, (Number.isFinite(last) ? last : 0) + MIN_GAP_MS);
}

async function hasDownloads(): Promise<boolean> {
  try {
    return await chrome.permissions.contains({ permissions: ["downloads"] });
  } catch {
    return false;
  }
}

function base64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

/** Writes the backup file now. Returns an error message, or undefined when it was written. */
export async function runAutoBackup(force = false): Promise<string | undefined> {
  const state = await loadAutoBackup();
  if (!state.enabled && !force) return undefined;
  if (!(await hasDownloads()) || !chrome.downloads) return "Chrome has not allowed ApplyAgent to save files. Turn automatic backup on again.";
  const profile = await loadProfile();
  if (!profile.firstName && !profile.email && !profile.resume) return undefined; // nothing worth keeping yet
  const { myCompanies } = await chrome.storage.local.get("myCompanies");
  const backup = makeBackup({
    profile, answers: await loadAnswers(), applications: await loadApplications(), settings: await loadSettings(),
    companies: Array.isArray(myCompanies) ? myCompanies : [],
  });
  try {
    const url = `data:application/json;base64,${base64(new TextEncoder().encode(JSON.stringify(backup)))}`;
    await chrome.downloads.download({ url, filename: AUTO_BACKUP_FILE, conflictAction: "overwrite", saveAs: false });
    await saveAutoBackup({ lastAt: new Date().toISOString(), lastError: undefined });
    return undefined;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await saveAutoBackup({ lastError: message });
    return message;
  }
}

/** Turns automatic backup on (asking Chrome for the downloads permission; needs a click) or off. */
export async function setAutoBackup(enabled: boolean): Promise<AutoBackupState> {
  if (enabled) {
    const granted = await chrome.permissions.request({ permissions: ["downloads"] }).catch(() => false);
    if (!granted) return saveAutoBackup({ enabled: false, lastError: "Chrome's permission was not given." });
    const state = await saveAutoBackup({ enabled: true, lastError: undefined });
    await runAutoBackup(true);
    return loadAutoBackup().then((s) => ({ ...state, ...s }));
  }
  await chrome.alarms.clear(AUTO_BACKUP_ALARM).catch(() => undefined);
  return saveAutoBackup({ enabled: false });
}

/** Background: a change to the profile, answers, history or settings schedules the next backup. */
export function initAutoBackup(): void {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !Object.keys(changes).some((k) => WATCHED.has(k))) return;
    void (async () => {
      const state = await loadAutoBackup();
      if (!state.enabled) return;
      // An alarm already waiting covers this change too (a steady stream of changes must not push it back forever).
      if (await chrome.alarms.get(AUTO_BACKUP_ALARM)) return;
      await chrome.alarms.create(AUTO_BACKUP_ALARM, { when: nextBackupTime(state.lastAt, Date.now()) });
    })();
  });
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === AUTO_BACKUP_ALARM) void runAutoBackup();
  });
}

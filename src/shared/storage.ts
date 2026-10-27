/** Everything is stored locally in the browser (chrome.storage.local). Nothing is sent to a server. */

import type { AnswerEntry, ApplicationRecord, Profile, QueueItem, Settings } from "./types";
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
};

const KEYS = {
  profile: "profile", answers: "answers", applications: "applications", queue: "queue", settings: "settings", running: "queueRunning",
} as const;

export async function loadQueue(): Promise<QueueItem[]> {
  const data = await chrome.storage.local.get(KEYS.queue);
  return (data[KEYS.queue] as QueueItem[] | undefined) ?? [];
}

export async function saveQueue(queue: QueueItem[]): Promise<void> {
  await chrome.storage.local.set({ [KEYS.queue]: queue });
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

export async function loadAnswers(): Promise<AnswerEntry[]> {
  const data = await chrome.storage.local.get(KEYS.answers);
  return (data[KEYS.answers] as AnswerEntry[] | undefined) ?? [];
}

/** Add or replace the answer to a question (matched by exact question text). */
export function upsertAnswer(answers: AnswerEntry[], entry: AnswerEntry): AnswerEntry[] {
  const rest = answers.filter((a) => a.question.trim().toLowerCase() !== entry.question.trim().toLowerCase());
  return [...rest, entry];
}

export async function saveAnswers(answers: AnswerEntry[]): Promise<void> {
  await chrome.storage.local.set({ [KEYS.answers]: answers });
}

export async function loadApplications(): Promise<ApplicationRecord[]> {
  const data = await chrome.storage.local.get(KEYS.applications);
  return (data[KEYS.applications] as ApplicationRecord[] | undefined) ?? [];
}

export async function saveApplications(records: ApplicationRecord[]): Promise<void> {
  await chrome.storage.local.set({ [KEYS.applications]: records });
}

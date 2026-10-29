/** Backup files: everything the user built up (profile, resume, answers, application history, settings) in one
 * JSON file, to restore later or on another computer. A file being restored is untrusted input: every value is
 * checked and copied field by field, never trusted as-is. Identity numbers and signatures are never in it. */

import {
  NEVER_REMEMBER, type AnswerEntry, type ApplicationRecord, type Profile, type ProfileKey, type ResumeFile, type SensitiveTopic,
  type QuickFacts, type Settings, type WorkEntry,
} from "./types";
import { EMPTY_PROFILE } from "./storage";
import { clampSettings } from "../background/queue";

export const BACKUP_FORMAT = "applyagent-backup";

export interface Backup {
  format: typeof BACKUP_FORMAT;
  version: 1;
  exportedAt: string;
  profile: Profile;
  answers: AnswerEntry[];
  applications: ApplicationRecord[];
  settings: Settings;
}

const TOPICS = new Set<SensitiveTopic>([
  "identity", "signature", "work_authorization", "sponsorship", "salary", "notice_period", "relocation", "gender", "race",
  "veteran", "disability", "sexual_orientation", "age", "criminal", "consent", "pronouns", "transgender", "accommodation",
]);
const STATUSES = new Set<ApplicationRecord["status"]>(["applied_confirmed", "needs_check", "in_progress"]);
const MAX_TEXT = 5000;
/** The resume limit is 5 MB; base64 makes it a third larger. */
const MAX_RESUME_BASE64 = Math.ceil((5 * 1024 * 1024 * 4) / 3) + 16;

export function makeBackup(data: Omit<Backup, "format" | "version" | "exportedAt">, now = new Date()): Backup {
  return {
    format: BACKUP_FORMAT,
    version: 1,
    exportedAt: now.toISOString(),
    profile: data.profile,
    answers: data.answers.filter((a) => !(a.topic && NEVER_REMEMBER.has(a.topic))),
    // Screenshots stay out: they are large, and the confirmation text is the proof.
    applications: data.applications.filter((a) => a.status !== "in_progress").map(({ screenshotKey: _, ...rest }) => rest),
    settings: data.settings,
  };
}

const str = (v: unknown, max = MAX_TEXT): string => (typeof v === "string" ? v.slice(0, max) : "");
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function httpUrl(v: unknown): string {
  try {
    const u = new URL(str(v));
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : "";
  } catch {
    return "";
  }
}

function readResume(v: unknown): ResumeFile | undefined {
  if (!isObject(v)) return undefined;
  const data = str(v.dataBase64, MAX_RESUME_BASE64 + 1);
  if (!data || data.length > MAX_RESUME_BASE64 || !/^[A-Za-z0-9+/]+=*$/.test(data)) return undefined;
  return { name: str(v.name, 200) || "resume.pdf", type: str(v.type, 100) || "application/pdf", dataBase64: data };
}


function readSkillsInventory(v: unknown) {
  if (!Array.isArray(v)) return undefined;
  const list = v.slice(0, 50).flatMap((s) => {
    if (!isObject(s)) return [];
    const name = str(s.name, 100);
    const years = typeof s.years === "number" ? Math.max(0, Math.min(50, s.years)) : Number(str(s.years, 10)) || 0;
    const level = s.level ? str(s.level, 50) : undefined;
    return name ? [{ name, years, level }] : [];
  });
  return list.length ? list : undefined;
}

function readLanguages(v: unknown) {
  if (!Array.isArray(v)) return undefined;
  const allowed = ["Native", "Fluent", "Professional", "Conversational", "Basic"] as const;
  const list = v.slice(0, 20).flatMap((l) => {
    if (!isObject(l)) return [];
    const language = str(l.language, 60);
    const proficiency = oneOf(l.proficiency, allowed) || "Fluent";
    return language ? [{ language, proficiency }] : [];
  });
  return list.length ? list : undefined;
}

function readProfile(v: unknown): Profile {
  const source = isObject(v) ? v : {};
  const profile: Profile = { ...EMPTY_PROFILE };
  for (const key of Object.keys(EMPTY_PROFILE) as ProfileKey[]) {
    if (typeof EMPTY_PROFILE[key] === "string") {
      profile[key] = str(source[key], 500) as any;
    }
  }
  if (source.skillsComplete === true) profile.skillsComplete = true;
  if (source.languagesComplete === true) profile.languagesComplete = true;
  if (source.workHistoryComplete === true) profile.workHistoryComplete = true;
  const resume = readResume(source.resume);
  if (resume) profile.resume = resume;
  const work = readWorkHistory(source.workHistory);
  if (work.length) profile.workHistory = work;
  const facts = readFacts(source.facts);
  if (facts) profile.facts = facts;
  const skills = readSkillsInventory(source.skillsInventory);
  if (skills) profile.skillsInventory = skills;
  const languages = readLanguages(source.languages);
  if (languages) profile.languages = languages;
  return profile;
}

function oneOf<T extends string>(v: unknown, allowed: readonly T[]): T | "" {
  return allowed.includes(v as T) ? (v as T) : "";
}

function readFacts(v: unknown): QuickFacts | undefined {
  if (!isObject(v)) return undefined;
  const yesNo = ["Yes", "No", "Decline"] as const;
  const f: QuickFacts = {
    workCountries: str(v.workCountries, 200), noticePeriod: str(v.noticePeriod, 100), currentCtc: str(v.currentCtc, 60),
    expectedCtc: str(v.expectedCtc, 60), relocate: oneOf(v.relocate, ["Yes", "No"] as const), heardFrom: str(v.heardFrom, 100),
    gender: oneOf(v.gender, ["Male", "Female", "Non-binary", "Decline"] as const), hispanic: oneOf(v.hispanic, yesNo),
    race: str(v.race, 80), veteran: oneOf(v.veteran, yesNo), disability: oneOf(v.disability, yesNo),
  };
  if (v.workMode !== undefined) f.workMode = oneOf(v.workMode, ["onsite", "hybrid", "remote", "any"] as const);
  if (v.maxOfficeDays !== undefined) f.maxOfficeDays = typeof v.maxOfficeDays === "number" ? v.maxOfficeDays : str(v.maxOfficeDays, 10);
  if (v.travel !== undefined) f.travel = oneOf(v.travel, yesNo);
  if (v.travelPercent !== undefined) f.travelPercent = str(v.travelPercent, 20);
  if (v.needsAccommodation !== undefined) f.needsAccommodation = oneOf(v.needsAccommodation, yesNo);
  if (v.pronouns !== undefined) f.pronouns = str(v.pronouns, 40);
  if (v.sexualOrientation !== undefined) f.sexualOrientation = str(v.sexualOrientation, 50);
  if (v.transgender !== undefined) f.transgender = oneOf(v.transgender, yesNo);
  if (v.over18 !== undefined) f.over18 = oneOf(v.over18, ["Yes", "No"] as const);
  if (v.age !== undefined) f.age = str(v.age, 10);
  return f;
}

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

function readWorkHistory(v: unknown): WorkEntry[] {
  if (!Array.isArray(v)) return [];
  return v.slice(0, 10).flatMap((w): WorkEntry[] => {
    if (!isObject(w)) return [];
    const entry: WorkEntry = {
      title: str(w.title, 200), company: str(w.company, 200), location: str(w.location, 200),
      start: MONTH.test(str(w.start)) ? str(w.start) : "", end: MONTH.test(str(w.end)) ? str(w.end) : "",
      current: w.current === true, summary: str(w.summary, 4000),
    };
    return entry.title || entry.company ? [entry] : [];
  });
}

function readAnswers(v: unknown): AnswerEntry[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((a): AnswerEntry[] => {
    if (!isObject(a)) return [];
    const question = str(a.question, 1000).trim();
    const answer = str(a.answer).trim();
    const topic = TOPICS.has(a.topic as SensitiveTopic) ? (a.topic as SensitiveTopic) : undefined;
    if (!question || !answer || (topic && NEVER_REMEMBER.has(topic))) return [];
    const updatedAt = Number.isNaN(Date.parse(str(a.updatedAt))) ? new Date(0).toISOString() : str(a.updatedAt);
    return [{ question, answer, ...(topic ? { topic } : {}), updatedAt }];
  });
}

function readApplications(v: unknown): ApplicationRecord[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((a): ApplicationRecord[] => {
    if (!isObject(a)) return [];
    const url = httpUrl(a.url);
    const status = a.status as ApplicationRecord["status"];
    if (!str(a.id) || !url || !STATUSES.has(status) || status === "in_progress" || Number.isNaN(Date.parse(str(a.createdAt)))) return [];
    return [{
      id: str(a.id, 100), url, platform: str(a.platform, 100), jobTitle: str(a.jobTitle, 300), status, createdAt: str(a.createdAt),
      ...(str(a.confirmationText) ? { confirmationText: str(a.confirmationText, 500) } : {}),
    }];
  });
}

/** A validated backup, or a message saying why the file can't be used. */
export function readBackup(raw: unknown): Backup | string {
  if (!isObject(raw) || raw.format !== BACKUP_FORMAT) return "This file isn't an ApplyAgent backup.";
  if (raw.version !== 1) return "This backup was made by a newer version of ApplyAgent. Update the extension, then try again.";
  return {
    format: BACKUP_FORMAT,
    version: 1,
    exportedAt: str(raw.exportedAt, 40),
    profile: readProfile(raw.profile),
    answers: readAnswers(raw.answers),
    applications: readApplications(raw.applications),
    settings: clampSettings(isObject(raw.settings) ? (raw.settings as Partial<Settings>) : {}),
  };
}

/** One answer per question; the more recent answer wins. */
export function mergeAnswers(current: AnswerEntry[], incoming: AnswerEntry[]): AnswerEntry[] {
  const byQuestion = new Map<string, AnswerEntry>();
  for (const a of [...current, ...incoming]) {
    const key = a.question.trim().toLowerCase();
    const existing = byQuestion.get(key);
    if (!existing || Date.parse(a.updatedAt) > Date.parse(existing.updatedAt)) byQuestion.set(key, a);
  }
  return [...byQuestion.values()];
}

/** Restored history joins the current one; records already present (same id) are kept as they are. */
export function mergeApplications(current: ApplicationRecord[], incoming: ApplicationRecord[]): ApplicationRecord[] {
  const known = new Set(current.map((a) => a.id));
  return [...current, ...incoming.filter((a) => !known.has(a.id))].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

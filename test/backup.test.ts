/** Backup files: a round trip keeps everything; a restored file is untrusted and is checked value by value. */

import { describe, expect, it } from "vitest";
import { makeBackup, mergeAnswers, mergeApplications, readBackup, type Backup } from "../src/shared/backup";
import { DEFAULT_SETTINGS } from "../src/background/queue";
import type { AnswerEntry, ApplicationRecord } from "../src/shared/types";
import { PROFILE } from "./fixtures";

const answers: AnswerEntry[] = [
  { question: "What is your notice period?", answer: "30 days", topic: "notice_period", updatedAt: "2026-10-01T00:00:00Z" },
  { question: "Aadhaar number", answer: "1234 5678 9012", topic: "identity", updatedAt: "2026-10-01T00:00:00Z" },
];
const applications: ApplicationRecord[] = [
  { id: "a1", url: "https://boards.greenhouse.io/acme/jobs/1", platform: "greenhouse", jobTitle: "Engineer", status: "applied_confirmed",
    createdAt: "2026-10-02T00:00:00Z", confirmationText: "Thank you for applying", screenshotKey: "proof:a1" },
  { id: "a2", url: "https://jobs.lever.co/x/2", platform: "lever", jobTitle: "Analyst", status: "in_progress", createdAt: "2026-10-03T00:00:00Z" },
];

describe("backup round trip", () => {
  it("keeps profile, resume, answers, history and settings; never identity numbers, placeholders or screenshots", () => {
    const backup = makeBackup({ profile: PROFILE, answers, applications, settings: { ...DEFAULT_SETTINGS, dailyCap: 40 } });
    const restored = readBackup(JSON.parse(JSON.stringify(backup))) as Backup;
    expect(restored.profile).toEqual(PROFILE);
    expect(restored.answers.map((a) => a.question)).toEqual(["What is your notice period?"]);
    expect(restored.applications.map((a) => a.id)).toEqual(["a1"]);
    expect(restored.applications[0]).not.toHaveProperty("screenshotKey");
    expect(restored.settings.dailyCap).toBe(40);
  });
});

describe("readBackup treats the file as untrusted", () => {
  const valid = () => JSON.parse(JSON.stringify(makeBackup({ profile: PROFILE, answers, applications, settings: DEFAULT_SETTINGS })));

  it("rejects files that are not backups, and backups from a newer version, with a clear message", () => {
    expect(readBackup(null)).toMatch(/isn't an ApplyAgent backup/);
    expect(readBackup({ profile: {} })).toMatch(/isn't an ApplyAgent backup/);
    expect(readBackup({ ...valid(), version: 2 })).toMatch(/newer version/);
  });

  it("drops unsafe or malformed values instead of storing them", () => {
    const raw = valid();
    raw.profile.firstName = { toString: "x" };
    raw.profile.unknownKey = "ignored";
    raw.profile.resume = { name: "r.pdf", dataBase64: "not base64!!" };
    raw.answers.push({ question: "Sign here", answer: "Asha", topic: "signature", updatedAt: "2026" }, { question: "", answer: "x" }, "junk");
    raw.applications.push({ id: "bad", url: "javascript:alert(1)", status: "applied_confirmed", createdAt: "2026-10-01" },
      { id: "bad2", url: "https://x.example", status: "hacked", createdAt: "2026-10-01" });
    raw.settings = { maxParallel: 99, dailyCap: -5, detection: "everywhere" };
    const backup = readBackup(raw) as Backup;
    expect(backup.profile.firstName).toBe("");
    expect(backup.profile).not.toHaveProperty("unknownKey");
    expect(backup.profile.resume).toBeUndefined();
    expect(backup.answers.map((a) => a.question)).toEqual(["What is your notice period?"]);
    expect(backup.applications.map((a) => a.id)).toEqual(["a1"]);
    expect(backup.settings).toMatchObject({ maxParallel: 5, dailyCap: 1, detection: "job_sites" });
  });
});

describe("merging a restore into what is already there", () => {
  it("answers: one per question, the newer one wins", () => {
    const merged = mergeAnswers(
      [{ question: "Notice period?", answer: "60 days", updatedAt: "2026-10-10T00:00:00Z" }],
      [{ question: "notice period?", answer: "30 days", updatedAt: "2026-09-01T00:00:00Z" }, { question: "Why us?", answer: "x", updatedAt: "2026-09-01T00:00:00Z" }],
    );
    expect(merged.map((a) => a.answer).sort()).toEqual(["60 days", "x"]);
  });

  it("history: existing records stay, new ones join, newest first", () => {
    const merged = mergeApplications([applications[0]!], [{ ...applications[0]!, jobTitle: "changed" },
      { id: "b", url: "https://x.example/1", platform: "", jobTitle: "New", status: "needs_check", createdAt: "2026-10-09T00:00:00Z" }]);
    expect(merged.map((a) => [a.id, a.jobTitle])).toEqual([["b", "New"], ["a1", "Engineer"]]);
  });
});

describe("quick answers in backups", () => {
  it("are kept, and invalid choices are dropped", () => {
    const facts = { workCountries: "India", noticePeriod: "30 days", currentCtc: "0", expectedCtc: "20 LPA", relocate: "Yes" as const,
      heardFrom: "LinkedIn", gender: "Decline" as const, hispanic: "No" as const, race: "Decline", veteran: "No" as const, disability: "No" as const };
    const raw = JSON.parse(JSON.stringify(makeBackup({ profile: { ...PROFILE, facts }, answers: [], applications: [], settings: DEFAULT_SETTINGS })));
    expect((readBackup(raw) as Backup).profile.facts).toEqual(facts);
    raw.profile.facts.gender = "<script>";
    raw.profile.facts.relocate = "Maybe";
    expect((readBackup(raw) as Backup).profile.facts).toMatchObject({ gender: "", relocate: "" });
  });
});

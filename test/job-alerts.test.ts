/** Daily job alerts: the first check only learns what is open; later checks announce good new matches once. */

import { describe, expect, it } from "vitest";
import { alertStateOf, badgeText, checkNewMatches, EMPTY_ALERTS, MIN_ALERT_SCORE } from "../src/shared/jobs/alerts";
import type { ListedCompany } from "../src/shared/jobs/companies";
import type { JobPosting } from "../src/shared/jobs/types";
import { EMPTY_PROFILE } from "../src/shared/storage";
import type { Profile } from "../src/shared/types";

const MID: Profile = {
  ...EMPTY_PROFILE, country: "India", location: "Pune", preferredLocations: "Pune, Remote", targetRoles: "Backend Engineer",
  experienceYears: "4", skills: "Java, Spring Boot, PostgreSQL, Kafka, AWS",
};
const DESC = " We build payment systems in Java and Spring Boot on PostgreSQL and Kafka, running on AWS, used across India.";
const job = (id: string, title: string, over: Partial<JobPosting> = {}): JobPosting => ({
  id, companySlug: "acme", companyName: "Acme", ats: "greenhouse", title, location: "Pune, India", isRemote: false,
  url: `https://job-boards.greenhouse.io/acme/jobs/${id}`, description: DESC, ...over,
});
const DIRECTORY = [{ slug: "acme", name: "Acme", ats: "greenhouse", country: "India", industry: "Fintech" }] as unknown as ListedCompany[];

describe("daily job alerts", () => {
  it("first check: learns today's jobs and announces none", async () => {
    const board = async () => [job("1", "Backend Engineer"), job("2", "Senior Backend Engineer")];
    const after = await checkNewMatches(MID, DIRECTORY, [], board, { ...EMPTY_ALERTS, on: true });
    expect(after.lastRun).toBeTruthy();
    expect(after.fresh).toEqual([]);
    expect(after.seen.length).toBeGreaterThan(0);
    expect(badgeText(after)).toBe("");
  });

  it("next checks: good new matches once, never the same job twice, never weak matches", async () => {
    let today = [job("1", "Backend Engineer")];
    const board = async () => today;
    let state = await checkNewMatches(MID, DIRECTORY, [], board, { ...EMPTY_ALERTS, on: true });
    today = [job("1", "Backend Engineer"), job("3", "Backend Engineer, Payments"), job("4", "Marketing Manager")];
    state = await checkNewMatches(MID, DIRECTORY, [], board, state);
    expect(state.fresh.map((j) => j.id)).toEqual(["3"]);
    expect(state.fresh[0]!.score).toBeGreaterThanOrEqual(MIN_ALERT_SCORE);
    expect(badgeText(state)).toBe("1");
    // The day after: nothing new; what was announced stays until the user marks it as seen.
    state = await checkNewMatches(MID, DIRECTORY, [], board, state);
    expect(state.fresh.map((j) => j.id)).toEqual(["3"]);
  });

  it("a board that does not answer is skipped, not fatal; off means no number", async () => {
    const state = await checkNewMatches(MID, DIRECTORY, [], async () => { throw new Error("HTTP 503"); }, { ...EMPTY_ALERTS, on: true, lastRun: "2026-11-12T00:00:00Z" });
    expect(state.fresh).toEqual([]);
    expect(badgeText({ ...state, on: false, fresh: [{ id: "x", title: "t", company: "c", url: "u", location: "", score: 90, why: "" }] })).toBe("");
  });

  it("stored state is read defensively", () => {
    expect(alertStateOf(undefined)).toEqual(EMPTY_ALERTS);
    expect(alertStateOf({ on: true, seen: [1, "a"], fresh: [{ id: 1 }, { id: "j", url: "https://x" }] })).toMatchObject({ on: true, seen: ["a"], fresh: [{ id: "j" }] });
  });
});

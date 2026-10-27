import { describe, expect, it } from "vitest";
import { parseFeed, rankFeed, scoreJob } from "../src/shared/fit";
import { EMPTY_PROFILE } from "../src/shared/storage";
import type { FeedJob, Profile } from "../src/shared/types";

const NOW = new Date("2026-10-25T10:00:00Z");

function job(overrides: Partial<FeedJob>): FeedJob {
  return {
    id: "x", company: "Acme", platform: "greenhouse", title: "Backend Engineer", location: "Bengaluru, India",
    is_india: true, is_remote: false, work_mode: "", seniority: "", exp_min: null, exp_max: null, employment_type: "",
    posted_at: "2026-10-24T10:00:00Z", first_seen_at: "2026-10-24T10:00:00Z", quality_score: 80,
    url: "https://boards.greenhouse.io/acme/jobs/1", ...overrides,
  };
}

const ME: Profile = {
  ...EMPTY_PROFILE, targetRoles: "Backend Engineer, Data Engineer", preferredLocations: "Bangalore, Remote",
  experienceYears: "2", skills: "Python, Go",
};

describe("scoreJob hard filters (the 'wrong jobs' complaint)", () => {
  it("excludes other roles, other cities and jobs far above the user's experience", () => {
    expect(scoreJob(job({ title: "Sales Manager" }), ME, NOW).excluded).toMatch(/role/i);
    expect(scoreJob(job({ location: "New York, NY", is_india: false }), ME, NOW).excluded).toMatch(/location/i);
    expect(scoreJob(job({ exp_min: 6 }), ME, NOW).excluded).toMatch(/6\+ years/);
  });

  it("keeps remote jobs when the user accepts remote, and knows Bangalore = Bengaluru", () => {
    expect(scoreJob(job({ location: "Remote", is_remote: true, is_india: false }), ME, NOW).excluded).toBeUndefined();
    expect(scoreJob(job({ location: "Bengaluru" }), ME, NOW).reasons).toContain("In Bangalore");
  });

  it("drops remote jobs restricted to other countries (real cases from the live feed)", () => {
    const remote = (location: string) => scoreJob(job({ location, is_remote: true, is_india: false }), ME, NOW).excluded;
    expect(remote("Remote - Spain")).toMatch(/location/i);
    expect(remote("Remote-USA")).toMatch(/location/i);
    expect(remote("US - Remote")).toMatch(/location/i);
    expect(remote("Remote, Canada")).toMatch(/location/i);
    expect(remote("Remote - Estonia")).toMatch(/location/i); // not in any country list: still restricted
    expect(remote("Fully Remote")).toBeUndefined();
    expect(remote("Remote")).toBeUndefined();
    expect(remote("Remote - Worldwide")).toBeUndefined();
    expect(scoreJob(job({ location: "Remote - India", is_remote: true }), ME, NOW).excluded).toBeUndefined();
  });

  it("does not show '2+ years' jobs to a fresher, but allows one year short", () => {
    const fresher = { ...ME, experienceYears: "0" };
    expect(scoreJob(job({ exp_min: 2 }), fresher, NOW).excluded).toMatch(/2\+ years/);
    expect(scoreJob(job({ exp_min: 1 }), fresher, NOW).excluded).toBeUndefined();
  });

  it("keeps senior roles away from freshers", () => {
    const fresher = { ...ME, experienceYears: "0" };
    expect(scoreJob(job({ seniority: "senior" }), fresher, NOW).excluded).toMatch(/senior/);
  });
});

describe("scoreJob ranking", () => {
  it("rewards exact role, location, experience fit and freshness, with reasons", () => {
    const r = scoreJob(job({ title: "Senior Backend Engineer (Go)", exp_min: 1, exp_max: 3 }), ME, NOW);
    expect(r.score).toBeGreaterThanOrEqual(90);
    expect(r.reasons).toEqual(expect.arrayContaining([
      'Matches "Backend Engineer"', "In Bangalore", "Fits your 2 yrs experience", "Mentions Go", "Posted in the last 3 days",
    ]));
  });

  it("flags long-open postings as possibly stale (ghost-job signal)", () => {
    const old = scoreJob(job({ posted_at: "2026-08-01T00:00:00Z" }), ME, NOW);
    const fresh = scoreJob(job({}), ME, NOW);
    expect(old.reasons.some((x) => x.includes("may be stale"))).toBe(true);
    expect(old.score).toBeLessThan(fresh.score);
  });

  it("ranks the feed best-first and counts what was filtered", () => {
    const { matches, excluded } = rankFeed([
      job({ id: "a", title: "Data Engineer", posted_at: "2026-10-10T00:00:00Z" }),
      job({ id: "b", title: "Backend Engineer" }),
      job({ id: "c", title: "Recruiter" }),
    ], ME, NOW);
    expect(matches.map((m) => m.job.id)).toEqual(["b", "a"]);
    expect(excluded).toBe(1);
  });
});

describe("parseFeed", () => {
  it("accepts a JobReach feed and drops malformed or unsafe entries", () => {
    const jobs = parseFeed({ jobs: [job({}), { title: "x" }, job({ url: "javascript:alert(1)" }), null] });
    expect(jobs).toHaveLength(1);
  });

  it("rejects files that are not feeds", () => {
    expect(() => parseFeed({ hello: 1 })).toThrow(/feed/);
  });
});

// @vitest-environment node
// static/companies.json: every company was verified on its own public job board (scripts/grow-companies.mjs), once
// per board, with a hiring profile Discover can rank by. Nothing guessed, no job sites.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { ListedCompany } from "../src/shared/jobs/companies";

const list = JSON.parse(readFileSync("static/companies.json", "utf8")) as ListedCompany[];
const ATS = new Set(["greenhouse", "lever", "ashby", "smartrecruiters", "recruitee", "personio", "workable"]);
const JOB_SITES = /(linkedin|naukri|indeed|glassdoor|foundit|monster|wellfound|instahyre|internshala|iimjobs|hirist|cutshort|ziprecruiter|dice|shine|apna)/i;

describe("company directory", () => {
  it("is large, verified and has one entry per job board", () => {
    expect(list.length).toBeGreaterThanOrEqual(250);
    const boards = new Set<string>();
    for (const c of list) {
      expect(ATS.has(c.ats), `${c.name}: ${c.ats}`).toBe(true);
      expect(c.unverified, c.name).toBe(false);
      expect(Number.isNaN(Date.parse(c.verifiedAt ?? ""))).toBe(false);
      expect(c.jobCount ?? 0, c.name).toBeGreaterThan(0);
      expect(c.slug).toMatch(/^[A-Za-z0-9._%-]+$/);
      expect(JOB_SITES.test(c.slug), c.slug).toBe(false);
      const key = `${c.ats}:${c.slug.toLowerCase()}`;
      expect(boards.has(key), key).toBe(false);
      boards.add(key);
    }
  });
  it("carries a hiring profile, including companies that hire in India", () => {
    const profiled = list.filter((c) => c.hires && c.families);
    expect(profiled.length).toBe(list.length);
    expect(list.filter((c) => (c.hires?.IN ?? 0) > 0).length).toBeGreaterThanOrEqual(30);
    expect(list.filter((c) => (c.families?.software ?? 0) > 0).length).toBeGreaterThanOrEqual(150);
  });
});

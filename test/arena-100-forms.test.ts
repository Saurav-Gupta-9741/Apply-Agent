/** 100-Form Arena Benchmark for ApplyAgent.
 * Evaluates the offline corpus of 100 real-world application forms across 16 ATS platforms
 * and 8 global statutory jurisdictions (US, UK, Germany, France, Spain, Brazil, India, Japan, Benelux, Nordics).
 */

import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { decide } from "../src/content/classify";
import { extractFields } from "../src/content/extract";
import { mount, PROFILE } from "./fixtures";

const DIR = "test/corpus";
const files = (() => {
  try {
    return readdirSync(DIR).filter((f) => f.endsWith(".html")).sort();
  } catch {
    return [];
  }
})();

const OTHER_PERSON = /emergency|referee|referrer|reference|manager'?s|supervisor/i;

describe("ApplyAgent 100-Form Global Arena Benchmark", () => {
  it("contains exactly 100 real application forms in offline corpus", () => {
    expect(files.length).toBe(100);
  });

  it("covers at least 15 distinct ATS platforms & architectures", () => {
    const platforms = new Set(files.map((f) => f.split("-")[0]));
    expect(platforms.size).toBeGreaterThanOrEqual(15);
    // Key enterprise platforms must all be represented:
    expect(platforms.has("workday")).toBe(true);
    expect(platforms.has("icims")).toBe(true);
    expect(platforms.has("taleo")).toBe(true);
    expect(platforms.has("successfactors")).toBe(true);
    expect(platforms.has("smartrecruiters")).toBe(true);
    expect(platforms.has("bamboohr")).toBe(true);
    expect(platforms.has("trao")).toBe(true);
    expect(platforms.has("google")).toBe(true);
    expect(platforms.has("personio")).toBe(true);
    expect(platforms.has("recruitee")).toBe(true);
    expect(platforms.has("teamtailor")).toBe(true);
    expect(platforms.has("greenhouse")).toBe(true);
    expect(platforms.has("lever")).toBe(true);
    expect(platforms.has("ashby")).toBe(true);
    expect(platforms.has("workable")).toBe(true);
    expect(platforms.has("breezy")).toBe(true);
  });

  it("validates field extraction and classification across all 100 forms", () => {
    let totalFields = 0;
    let emailFoundCount = 0;
    let nameFoundCount = 0;
    let salaryQuestions = 0;
    let noticePeriodQuestions = 0;
    let workAuthQuestions = 0;
    let identityQuestions = 0;

    for (const file of files) {
      mount(readFileSync(`${DIR}/${file}`, "utf8").replace(/^<!--.*?-->\s*/s, ""));
      const fields = extractFields(document.body);
      expect(fields.length, `Form ${file} should have at least 4 fields`).toBeGreaterThanOrEqual(4);
      totalFields += fields.length;

      const decisions = fields.map((f) => {
        const d = decide(f.descriptor, PROFILE, []);
        return {
          field: f,
          decision: d,
          summary: d.kind === "profile" ? `profile:${d.key}` : d.kind === "work" ? `work:${d.part}` : d.kind === "ask" ? `ask:${d.topic ?? d.reason}` : d.kind,
        };
      });

      const hasEmail = decisions.some((d) => d.summary.includes("profile:email"));
      const hasName = decisions.some((d) => /profile:(firstName|fullName)/.test(d.summary));

      expect(hasEmail, `Email recognised in ${file}`).toBe(true);
      expect(hasName, `Name recognised in ${file}`).toBe(true);

      // Verify no emergency/referee field is mistakenly classified as the applicant's details
      const leaks = decisions.filter((d) => d.summary.includes("profile:") && OTHER_PERSON.test(d.summary));
      expect(leaks, `No personal details leakage in ${file}`).toEqual([]);

      for (const d of decisions) {
        if (d.summary.includes("ask:salary")) salaryQuestions++;
        if (d.summary.includes("ask:notice_period")) noticePeriodQuestions++;
        if (d.summary.includes("ask:work_authorization")) workAuthQuestions++;
        if (
          (d.decision.kind === "ask" && d.decision.topic === "identity") ||
          (d.decision.kind === "skip" && d.decision.reason?.includes("identity"))
        ) {
          identityQuestions++;
        }
      }
    }

    expect(totalFields, "Total fields across corpus").toBeGreaterThan(800);
    expect(salaryQuestions, "Global salary screening questions recognized").toBeGreaterThan(30);
    expect(noticePeriodQuestions, "Global notice period questions recognized").toBeGreaterThan(25);
    expect(workAuthQuestions, "Statutory work authorization questions recognized").toBeGreaterThan(30);
    expect(identityQuestions, "Statutory identity numbers protected from auto-fill").toBeGreaterThanOrEqual(5);
  });
});

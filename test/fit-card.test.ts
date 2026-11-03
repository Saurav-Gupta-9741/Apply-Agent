// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { extractJobDescriptionText, fitSummary, requiredYears } from "../src/content/fit";
import { EMPTY_PROFILE } from "../src/shared/storage";

const page = (name: string) => new DOMParser().parseFromString(readFileSync(`test/corpus/${name}`, "utf8"), "text/html");

describe("Fit Card & Job Description Parsing", () => {
  it("extracts job description text from corpus while excluding nav, header, footer, and cookie banners", () => {
    const doc = page("ashby-airwallex.html");
    const text = extractJobDescriptionText(doc);

    expect(text.length).toBeGreaterThan(500);
    expect(text).toContain("Developer Product Marketing Manager");
    // Verify that noise selectors like scripts, navs, and footer banners were stripped
    expect(text).not.toContain("<script");
    expect(text).not.toContain("<nav");
    expect(text).not.toContain("<footer");
  });

  it("extracts required years of experience across various formats", () => {
    expect(requiredYears("Requires at least 5 years of professional software engineering experience.")).toEqual({ min: 5 });
    expect(requiredYears("Looking for candidates with 3+ yrs of React experience.")).toEqual({ min: 3 });
    expect(requiredYears("2-4 years of data analytics experience required.")).toEqual({ min: 2, max: 4 });
    expect(requiredYears("Minimum of 7 years of product management experience.")).toEqual({ min: 7 });
    expect(requiredYears("Founded 10 years ago in Silicon Valley.")).toBeNull();
  });

  it("generates truthful read-only fit summaries comparing candidate profile against job text", () => {
    const jd = `
      About the Role:
      We are looking for a Senior Data Engineer with 4+ years of experience.
      Requirements:
      - Strong Python and SQL programming skills
      - Experience with Kubernetes and Docker
      - Familiarity with Snowflake
    `;

    const profile = {
      ...EMPTY_PROFILE,
      skills: "Python, SQL, PostgreSQL",
      experienceYears: "2",
    };

    const summary = fitSummary(jd, profile);
    expect(summary.matched).toBe(2); // Python, SQL
    expect(summary.total).toBe(5); // Python, SQL, Kubernetes, Docker, Snowflake
    expect(summary.missing).toContain("Kubernetes");
    expect(summary.missing).toContain("Docker");
    expect(summary.missing).toContain("Snowflake");
    expect(summary.experience).toEqual({ needs: 4, max: undefined, have: 2, ok: false });
    expect(summary.line).toBe("Matches 2 of 5 skills · Missing: Kubernetes, Docker, Snowflake · Experience: needs 4+ yrs, you have 2");
  });
});

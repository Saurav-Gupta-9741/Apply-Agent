/** Suggestions for experience questions left for the user (live round 8 wordings), from their own resume. */

import { describe, expect, it } from "vitest";
import { experienceSuggestion, yearsSuggestion } from "../src/shared/evidence";

const RESUME = `Emily Carter
emily.carter@example.com | +1 512 555 0142
EXPERIENCE
Account Executive, Northwind Analytics (2021 - present)
• Sold analytics subscriptions into mid-market and enterprise accounts across the US, closing $2.1M ARR in 2024.
• Consistently exceeded quota: 118% of target in 2023 and 124% in 2024.
• Partnered with HR to support employee immigration and global mobility for new hires relocating to Austin.
People Operations Coordinator, Contoso (2018 - 2021)
• Ran onboarding and offboarding for 300 employees.`;

const YN = ["Yes", "No"];

describe("experience questions: Yes with the resume line, or nothing", () => {
  it("finds the line that names the question's own words", () => {
    const s = experienceSuggestion("Have you sold into mid-market or enterprise-level accounts?", YN, RESUME);
    expect(s).toMatchObject({ value: "Yes" });
    expect(s!.because).toMatch(/mid-market and enterprise accounts/);
    expect(experienceSuggestion("Do you have experience supporting employee immigration and/or global mobility processes?", YN, RESUME)?.because).toMatch(/immigration and global mobility/);
    expect(experienceSuggestion("Have you consistently met or exceeded your sales quota in prior roles?", YN, RESUME)?.because).toMatch(/exceeded quota/);
  });
  it("nothing when the resume does not say it (never a No)", () => {
    expect(experienceSuggestion("Do you have experience working with sales or account management, specifically in the DACH or German market?", YN, RESUME)).toBeUndefined();
    expect(experienceSuggestion("Have you worked on any query routing or load balancing logic in a production environment?", YN, RESUME)).toBeUndefined();
    expect(experienceSuggestion("Do you have a valid license to practice law in the state you are applying for?", YN, RESUME)).toBeUndefined();
  });
  it("never for questions about the employer, the law or the user's status", () => {
    expect(experienceSuggestion("Have you ever been employed full-time at Block or its subsidiaries?", YN, RESUME)).toBeUndefined();
    expect(experienceSuggestion("Do you have experience requiring visa sponsorship?", YN, RESUME)).toBeUndefined();
    expect(experienceSuggestion("Are you a veteran?", YN, RESUME)).toBeUndefined();
  });
  it("a list without a plain Yes gets nothing", () => {
    expect(experienceSuggestion("Have you sold into mid-market or enterprise-level accounts?", ["Some", "A lot"], RESUME)).toBeUndefined();
  });
});

describe("years of experience: the range holding the total, to confirm", () => {
  it("picks the one range holding the years; the boundary goes to the range that starts there", () => {
    const opts = ["Less than 1 year", "1–3 years", "3–5 years", "5–8 years", "8+ years"];
    expect(yearsSuggestion("How many years of relevant work experience do you have for this role?", opts, "5")).toMatchObject({ value: "5–8 years" });
    expect(yearsSuggestion("How many years of relevant work experience do you have for this role?", opts, "0.5")).toMatchObject({ value: "Less than 1 year" });
    expect(yearsSuggestion("How many years of relevant work experience do you have for this role?", opts, "12")).toMatchObject({ value: "8+ years" });
    expect(yearsSuggestion("How many years of relevant work experience do you have for this role?", opts, "5")!.because).toMatch(/relevant/);
    const hr = ["Less than 3 years", "3–4 years", "5–7 years", "8+ years"];
    expect(yearsSuggestion("How many years of professional experience do you have?", hr, "5")).toMatchObject({ value: "5–7 years" });
  });
  it("nothing without saved years, or for years of something else", () => {
    expect(yearsSuggestion("How many years of relevant work experience do you have?", ["1-3", "3-5"], "")).toBeUndefined();
    expect(yearsSuggestion("How old are you?", [], "5")).toBeUndefined();
    // One area: total years say nothing about it.
    expect(yearsSuggestion("How many years of professional experience do you have in People Operations, HR Operations?", ["Less than 3 years", "5–7 years"], "5")).toBeUndefined();
    expect(yearsSuggestion("How many years of experience do you have directly managing teams?", [], "5")).toBeUndefined();
    expect(yearsSuggestion("How many years of experience do you have with commercial/ utility-scale solar installations?", [], "5")).toBeUndefined();
  });
});

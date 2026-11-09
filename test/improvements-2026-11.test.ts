// Coverage improvements measured on 1,319 live forms (2026-11-08), each with its safety boundary.
import { describe, expect, it } from "vitest";
import { decide } from "../src/content/classify";
import type { PageFacts } from "../src/content/facts";
import { applyQuickAnswers, existingQuickAnswer, OTHER_COUNTRIES_ASK, OTHER_COUNTRIES_SPONSOR, QUICK_QUESTIONS } from "../src/shared/quick-answers";
import type { FieldDescriptor, Profile, QuickFacts } from "../src/shared/types";
import { PROFILE } from "./fixtures";

const field = (label: string, control: FieldDescriptor["control"] = "select", options: string[] = ["Yes", "No"]): FieldDescriptor =>
  ({ key: "k", label, name: "q", control, required: true, options, autocomplete: "", placeholder: "" });
const base: QuickFacts = { workCountries: "India", needsFutureSponsorship: "No", noticePeriod: "30 days", currentCtc: "", expectedCtc: "", relocate: "", heardFrom: "", gender: "", hispanic: "", race: "", veteran: "", disability: "" };
const me = (extra: Partial<QuickFacts> = {}): Profile => ({ ...PROFILE, country: "India", location: "Pune", facts: { ...base, ...extra } });
const job = (...c: string[]) => ({ jobCountries: c, url: "https://job-boards.greenhouse.io/x/jobs/1", company: "x" }) as unknown as PageFacts;

describe("1. 'For jobs in any other country: I would need visa sponsorship there'", () => {
  it("the wizard saves and shows it back", () => {
    const q = QUICK_QUESTIONS.find((x) => x.id === "otherCountries")!;
    const saved = applyQuickAnswers(me(), { otherCountries: OTHER_COUNTRIES_SPONSOR });
    expect(saved.facts!.otherCountries).toBe("sponsorship");
    expect(existingQuickAnswer(saved, q)).toBe(OTHER_COUNTRIES_SPONSOR);
    expect(applyQuickAnswers(me(), { otherCountries: OTHER_COUNTRIES_ASK }).facts!.otherCountries).toBe("ask");
  });
  it("answers authorization No and sponsorship Yes for an unlisted country", () => {
    const p = me({ otherCountries: "sponsorship" });
    expect(decide(field("Are you legally authorized to work in the United States?"), p, [], job("United States"))).toMatchObject({ kind: "answer", value: "No" });
    expect(decide(field("Will you now or in the future require visa sponsorship to work in the United States?"), p, [], job("United States"))).toMatchObject({ kind: "answer", value: "Yes" });
    expect(decide(field("Do you require sponsorship to work for us?"), p, [], job("Germany"))).toMatchObject({ kind: "answer", value: "Yes" });
  });
  it("the user's own countries keep their answers", () => {
    const p = me({ otherCountries: "sponsorship" });
    expect(decide(field("Are you legally authorized to work in India?"), p, [], job("India"))).toMatchObject({ kind: "answer", value: "Yes" });
    expect(decide(field("Will you require visa sponsorship to work in India?"), p, [], job("India"))).toMatchObject({ kind: "answer", value: "No" });
  });
  it("without it (or with 'ask'), unlisted countries are still asked", () => {
    for (const p of [me(), me({ otherCountries: "ask" })]) {
      expect(decide(field("Are you legally authorized to work in the United States?"), p, [], job("United States"))).not.toMatchObject({ kind: "answer" });
      expect(decide(field("Will you require visa sponsorship to work in the United States?"), p, [], job("United States"))).not.toMatchObject({ kind: "answer" });
    }
  });
  it("two countries with different answers, inverted or compound questions are still asked", () => {
    const p = me({ otherCountries: "sponsorship" });
    expect(decide(field("Are you authorized to work in India or the United States?"), p, [])).not.toMatchObject({ kind: "answer" });
    expect(decide(field("Are you authorized to work in the US and will you require sponsorship?"), p, [], job("United States"))).not.toMatchObject({ kind: "answer" });
  });
});

describe("2. 'Have you worked here before?' from a work history the user confirmed is complete", () => {
  const history = { workHistory: [{ company: "Acme Pay", title: "Data Engineer", location: "Bengaluru", start: "2021-07", end: "", current: true, summary: "" }] };
  const q = (label: string) => field(label);
  const page = { jobCountries: ["United States"], url: "https://job-boards.greenhouse.io/stripe/jobs/1", company: "stripe" } as unknown as PageFacts;
  it("the wizard question sets workHistoryComplete", () => {
    expect(applyQuickAnswers(me(), { workHistoryComplete: "Yes" }).workHistoryComplete).toBe(true);
    expect(existingQuickAnswer({ ...me(), workHistoryComplete: true }, QUICK_QUESTIONS.find((x) => x.id === "workHistoryComplete")!)).toBe("Yes");
  });
  it("complete history: 'Have you previously worked at Stripe?' -> No; never for the user's own employer", () => {
    const p = { ...me(), ...history, workHistoryComplete: true } as Profile;
    expect(decide(q("Have you previously been employed by Stripe?"), p, [], page)).toMatchObject({ kind: "answer", value: "No" });
    expect(decide(q("Have you ever worked for Acme Pay?"), p, [], page)).toMatchObject({ kind: "answer", value: "Yes" });
  });
  it("not confirmed complete: asked", () => {
    const p = { ...me(), ...history, workHistoryComplete: false } as Profile;
    expect(decide(q("Have you previously been employed by Stripe?"), p, [], page)).not.toMatchObject({ kind: "answer" });
  });
});

describe("3. one-time declarations: non-compete, relatives, security clearance", () => {
  const p = me({ nonCompete: "No", relativesAtCompanies: "No", securityClearance: "None" });
  it("plain yes/no questions are answered", () => {
    expect(decide(field("Are you currently subject to any non-compete or non-solicitation agreements?"), p, [])).toMatchObject({ kind: "answer", value: "No" });
    expect(decide(field("Do you have any relatives employed by Bandwidth?"), p, [])).toMatchObject({ kind: "answer", value: "No" });
    expect(decide(field("Do you currently hold an active security clearance?"), p, [])).toMatchObject({ kind: "answer", value: "No" });
  });
  it("follow-ups, details, 'willing to obtain' and inverted questions are left for the user", () => {
    for (const label of ["If yes, please list their names and positions.", "Do you have any family members currently working at VTEX? If so, please list their names and their positions.",
      "Are you able to obtain a security clearance?", "Are you willing to obtain and maintain a Secret clearance?", "Are you NOT bound by a non-compete?",
      "Please describe any non-compete agreements you are subject to."]) {
      expect(decide(field(label), p, [])).not.toMatchObject({ kind: "answer", question: expect.stringMatching(/Quick answers › (non-compete|relatives|security)/) });
    }
  });
  it("without the declarations nothing changes", () => {
    expect(decide(field("Do you have any relatives employed by Bandwidth?"), me(), [])).not.toMatchObject({ kind: "answer" });
  });
  it("the wizard saves them", () => {
    const saved = applyQuickAnswers(me(), { nonCompete: "No", relativesAtCompanies: "No, none of them", securityClearance: "No, never" });
    expect(saved.facts).toMatchObject({ nonCompete: "No", relativesAtCompanies: "No", securityClearance: "None" });
  });
});

describe("4. expected salary for jobs abroad, in the job's currency", () => {
  const p = me({ expectedCtc: "18 LPA", expectedSalaryAbroad: "USD 70,000, EUR 60,000" });
  it("a US job gets the USD figure, a German job the EUR figure, India the LPA figure", () => {
    expect(decide(field("What are your salary expectations?", "text", []), p, [], job("United States"))).toMatchObject({ kind: "answer", value: "USD 70,000" });
    expect(decide(field("What are your salary expectations?", "text", []), p, [], job("Germany"))).toMatchObject({ kind: "answer", value: "EUR 60,000" });
    expect(decide(field("What are your salary expectations?", "text", []), p, [], job("India"))).toMatchObject({ kind: "answer", value: "18 LPA" });
  });
  it("no figure in that currency: asked; a current salary is never swapped", () => {
    expect(decide(field("What are your salary expectations?", "text", []), p, [], job("United Kingdom"))).not.toMatchObject({ kind: "answer" });
    expect(decide(field("What is your current salary?", "text", []), me({ currentCtc: "12 LPA", expectedSalaryAbroad: "USD 70,000" }), [], job("United States"))).not.toMatchObject({ kind: "answer" });
  });
});

describe("5. start month / year from the notice period; 'not in the US' on US-state lists", () => {
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  it("30 days from 8 Nov 2026 is December 2026", async () => {
    const { startMonthYearAnswer } = await import("../src/content/facts");
    const today = new Date("2026-11-08T12:00:00Z");
    expect(startMonthYearAnswer(field("Start date month", "select", months), me(), today)).toMatchObject({ value: "December" });
    expect(startMonthYearAnswer(field("Start date year", "select", ["2026", "2027"]), me(), today)).toMatchObject({ value: "2026" });
    expect(startMonthYearAnswer(field("Start date", "text", []), me(), today)).toBeUndefined();
  });
  it("a user in India picks 'I am not in the US' on a US-state list, never a state", () => {
    const states = ["Alabama", "California", "New York", "I am not located in the US"];
    expect(decide(field("Which U.S. state do you currently reside in?", "select", states), me(), [])).toMatchObject({ kind: "answer", value: "I am not located in the US" });
    expect(decide(field("Which U.S. state do you currently reside in?", "select", ["Alabama", "California", "New York"]), me(), [])).not.toMatchObject({ kind: "answer" });
  });
});

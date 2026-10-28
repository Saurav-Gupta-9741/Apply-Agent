import { describe, expect, it } from "vitest";
import { decide } from "../src/content/classify";
import type { AnswerEntry, Decision, FieldDescriptor, Profile } from "../src/shared/types";
import { PROFILE } from "./fixtures";

const ME: Profile = { ...PROFILE };

const field = (
  label: string,
  control: FieldDescriptor["control"] = "select",
  options: string[] = ["Yes", "No"],
  required = true
): FieldDescriptor => ({
  key: "k",
  label,
  control,
  required,
  options,
  name: "",
  autocomplete: "",
  placeholder: "",
});

const value = (d: Decision) => (d.kind === "answer" ? d.value : d.kind);

describe("screening pre-answers: matching wordings", () => {
  const savedAnswers: AnswerEntry[] = [
    { question: "Do you have a valid driver's license?", answer: "Yes", updatedAt: "2026-10-28T12:00:00Z" },
    { question: "Are you at least 18 years of age or older?", answer: "Yes", updatedAt: "2026-10-28T12:00:00Z" },
    { question: "Are you willing to undergo a background check?", answer: "Yes", updatedAt: "2026-10-28T12:00:00Z" },
    { question: "Are you willing to take a drug test?", answer: "Yes", updatedAt: "2026-10-28T12:00:00Z" },
    { question: "Are you willing to work weekends or flexible shifts?", answer: "Yes", updatedAt: "2026-10-28T12:00:00Z" },
    { question: "Are you willing to travel for work?", answer: "Yes", updatedAt: "2026-10-28T12:00:00Z" },
    { question: "Are you comfortable working on site?", answer: "Yes", updatedAt: "2026-10-28T12:00:00Z" },
    { question: "Are you bound by a non-compete agreement?", answer: "No", updatedAt: "2026-10-28T12:00:00Z" },
  ];

  it("matches diverse general wordings for driver's license", () => {
    expect(value(decide(field("Do you hold a valid driver's license?"), ME, savedAnswers))).toBe("Yes");
    expect(value(decide(field("Do you have a valid driver's licence?"), ME, savedAnswers))).toBe("Yes");
    expect(value(decide(field("Do you possess a valid driver's license?"), ME, savedAnswers))).toBe("Yes");
    expect(value(decide(field("Do you hold a current driving licence?"), ME, savedAnswers))).toBe("Yes");
  });

  it("matches diverse general wordings for age 18+", () => {
    expect(value(decide(field("Are you at least 18 years of age?"), ME, savedAnswers))).toBe("Yes");
    expect(value(decide(field("Are you 18 years of age or older?"), ME, savedAnswers))).toBe("Yes");
    expect(value(decide(field("Are you 18 or older?"), ME, savedAnswers))).toBe("Yes");
    expect(value(decide(field("Are you of legal age to work?"), ME, savedAnswers))).toBe("Yes");
  });

  it("matches diverse general wordings for background check", () => {
    expect(value(decide(field("Are you willing to undergo a pre-employment background check?"), ME, savedAnswers))).toBe("Yes");
    expect(value(decide(field("Are you willing to submit to a background screening?"), ME, savedAnswers))).toBe("Yes");
    expect(value(decide(field("Are you willing to complete a background check?"), ME, savedAnswers))).toBe("Yes");
  });

  it("matches diverse general wordings for drug test", () => {
    expect(value(decide(field("Are you willing to submit to a drug test?"), ME, savedAnswers))).toBe("Yes");
    expect(value(decide(field("Are you willing to take a drug screen?"), ME, savedAnswers))).toBe("Yes");
    expect(value(decide(field("Willing to undergo a drug screening?"), ME, savedAnswers))).toBe("Yes");
  });

  it("matches diverse general wordings for weekends / shifts", () => {
    expect(value(decide(field("Are you willing to work flexible shifts?"), ME, savedAnswers))).toBe("Yes");
    expect(value(decide(field("Are you able to work weekends?"), ME, savedAnswers))).toBe("Yes");
    expect(value(decide(field("Willingness to do shift work?"), ME, savedAnswers))).toBe("Yes");
  });

  it("matches diverse general wordings for travel and on-site", () => {
    expect(value(decide(field("Are you open to business travel?"), ME, savedAnswers))).toBe("Yes");
    expect(value(decide(field("Are you willing to work on-site?"), ME, savedAnswers))).toBe("Yes");
    expect(value(decide(field("Are you comfortable working in person?"), ME, savedAnswers))).toBe("Yes");
  });

  it("matches diverse general wordings for non-compete", () => {
    expect(value(decide(field("Are you subject to a non-compete agreement?"), ME, savedAnswers))).toBe("No");
    expect(value(decide(field("Do you have an active non-compete?"), ME, savedAnswers))).toBe("No");
  });
});

describe("screening pre-answers: negated wordings and exception clauses (no reuse)", () => {
  const savedAnswers: AnswerEntry[] = [
    { question: "Do you have a valid driver's license?", answer: "Yes", updatedAt: "2026-10-28T12:00:00Z" },
    { question: "Are you willing to undergo a background check?", answer: "Yes", updatedAt: "2026-10-28T12:00:00Z" },
    { question: "Are you willing to take a drug test?", answer: "Yes", updatedAt: "2026-10-28T12:00:00Z" },
    { question: "Are you willing to travel for work?", answer: "Yes", updatedAt: "2026-10-28T12:00:00Z" },
    { question: "Are you comfortable working on site?", answer: "Yes", updatedAt: "2026-10-28T12:00:00Z" },
  ];

  it("does not reuse when form has negated wording", () => {
    expect(decide(field("Are you NOT willing to undergo a background check?"), ME, savedAnswers).kind).toBe("ask");
    expect(decide(field("Are you unwilling to undergo a background check?"), ME, savedAnswers).kind).toBe("ask");
    expect(decide(field("Are you unwilling to take a drug test?"), ME, savedAnswers).kind).toBe("ask");
    expect(decide(field("Do you NOT have a valid driver's license?"), ME, savedAnswers).kind).toBe("ask");
    expect(decide(field("Are you not willing to travel for work?"), ME, savedAnswers).kind).toBe("ask");
  });

  it("does not reuse when form has exception or condition clauses", () => {
    expect(decide(field("Are you willing to travel unless required on weekends?"), ME, savedAnswers).kind).toBe("ask");
    expect(decide(field("Are you willing to work on site other than in summer?"), ME, savedAnswers).kind).toBe("ask");
    expect(decide(field("Are you willing to take a drug test except where prohibited by law?"), ME, savedAnswers).kind).toBe("ask");
    expect(decide(field("Are you willing to undergo a background check with the exception of credit history?"), ME, savedAnswers).kind).toBe("ask");
  });
});

describe("screening pre-answers: company- and place-specific questions (no reuse)", () => {
  const savedAnswers: AnswerEntry[] = [
    { question: "Are you comfortable working on site?", answer: "Yes", updatedAt: "2026-10-28T12:00:00Z" },
    { question: "Do you have reliable transportation to get to work?", answer: "Yes", updatedAt: "2026-10-28T12:00:00Z" },
    { question: "Are you currently employed?", answer: "Yes", updatedAt: "2026-10-28T12:00:00Z" },
    { question: "Are you willing to relocate for this role?", answer: "Yes", updatedAt: "2026-10-28T12:00:00Z" },
  ];

  it("asks company-specific employment questions", () => {
    expect(decide(field("Have you worked for this company before?"), ME, savedAnswers).kind).toBe("ask");
    expect(decide(field("Have you worked at Acme before?"), ME, savedAnswers).kind).toBe("ask");
    expect(decide(field("Were you previously employed by us?"), ME, savedAnswers).kind).toBe("ask");
    expect(decide(field("Are you a former employee of this organization?"), ME, savedAnswers).kind).toBe("ask");
    expect(decide(field("Have you ever been employed by our company?"), ME, savedAnswers).kind).toBe("ask");
  });

  it("asks relative or employee relationship questions", () => {
    expect(decide(field("Are you related to an employee of this company?"), ME, savedAnswers).kind).toBe("ask");
    expect(decide(field("Do you have any relatives working at this company?"), ME, savedAnswers).kind).toBe("ask");
    expect(decide(field("Do you know anyone who works here?"), ME, savedAnswers).kind).toBe("ask");
  });

  it("asks place-specific commute or relocation questions", () => {
    expect(decide(field("Can you commute to New York?"), ME, savedAnswers).kind).toBe("ask");
    expect(decide(field("Can you commute to our Austin office?"), ME, savedAnswers).kind).toBe("ask");
    expect(decide(field("Are you able to commute to San Francisco?"), ME, savedAnswers).kind).toBe("ask");
    expect(decide(field("Are you willing to relocate to Boston?"), ME, savedAnswers).kind).toBe("ask");
    expect(decide(field("Are you comfortable working on site in Chicago?"), ME, savedAnswers).kind).toBe("ask");
  });
});

describe("screening pre-answers: yes/no choice field getting exact option", () => {
  const savedAnswers: AnswerEntry[] = [
    { question: "Do you have a valid driver's license?", answer: "Yes", updatedAt: "2026-10-28T12:00:00Z" },
    { question: "Are you at least 18 years of age or older?", answer: "Yes", updatedAt: "2026-10-28T12:00:00Z" },
    { question: "Are you bound by a non-compete agreement?", answer: "No", updatedAt: "2026-10-28T12:00:00Z" },
  ];

  it("picks the exact option on standard Yes/No select", () => {
    const f = field("Do you have a valid driver's license?", "select", ["Yes", "No"]);
    const d = decide(f, ME, savedAnswers);
    expect(d).toEqual({ kind: "answer", value: "Yes", question: "Do you have a valid driver's license?" });
  });

  it("picks the exact option on descriptive choices", () => {
    const f = field("Do you hold a valid driver's license?", "select", [
      "Yes, I hold a valid driver's license",
      "No, I do not have a driver's license",
    ]);
    const d = decide(f, ME, savedAnswers);
    expect(d).toEqual({
      kind: "answer",
      value: "Yes, I hold a valid driver's license",
      question: "Do you have a valid driver's license?",
    });
  });

  it("picks the exact option on Agree / Disagree", () => {
    const f = field("Are you at least 18 years of age or older?", "radio", ["I agree", "I disagree"]);
    const d = decide(f, ME, savedAnswers);
    expect(d).toEqual({
      kind: "answer",
      value: "I agree",
      question: "Are you at least 18 years of age or older?",
    });
  });

  it("picks the exact negative option on non-compete", () => {
    const f = field("Are you subject to a non-compete agreement?", "select", [
      "Yes, I am bound by a non-compete",
      "No, I am not subject to any non-compete",
    ]);
    const d = decide(f, ME, savedAnswers);
    expect(d).toEqual({
      kind: "answer",
      value: "No, I am not subject to any non-compete",
      question: "Are you bound by a non-compete agreement?",
    });
  });

  it("leaves unanswered screening questions to be asked", () => {
    const f = field("Are you willing to work night shifts?", "select", ["Yes", "No"]);
    expect(decide(f, ME, savedAnswers).kind).toBe("ask");
  });
});

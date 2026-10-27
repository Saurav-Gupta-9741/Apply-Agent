/** Quick answers: one answer per common question, used for any wording, but only where the question clearly is
 * that question. Question texts are from real forms in the coverage scan. */

import { describe, expect, it } from "vitest";
import { decide } from "../src/content/classify";
import { canonicalCountries, countriesIn } from "../src/shared/countries";
import type { Decision, FieldDescriptor, Profile, QuickFacts } from "../src/shared/types";
import { PROFILE } from "./fixtures";

const FACTS: QuickFacts = {
  workCountries: "India", noticePeriod: "Immediate", currentCtc: "0", expectedCtc: "20 LPA", relocate: "Yes", heardFrom: "LinkedIn",
  gender: "Male", hispanic: "No", race: "Decline", veteran: "No", disability: "No",
};
const ME: Profile = { ...PROFILE, country: "India", facts: FACTS };

const field = (label: string, control: FieldDescriptor["control"] = "select", options: string[] = ["Yes", "No"]): FieldDescriptor => ({
  key: "k", label, control, required: true, options, name: "", autocomplete: "", placeholder: "",
});
const value = (d: Decision) => (d.kind === "answer" ? d.value : d.kind);

describe("countries", () => {
  it("are recognised in questions, without mistaking 'us' for the United States", () => {
    expect(countriesIn("Are you legally authorized to work in the United States?")).toEqual(["United States"]);
    expect(countriesIn("Do you have a current UK work permit?")).toEqual(["United Kingdom"]);
    expect(countriesIn("Are you authorized to work in the U.S.?")).toEqual(["United States"]);
    expect(countriesIn("Will you need a visa to work in the US?")).toEqual(["United States"]);
    expect(countriesIn("Have you ever worked for us before?")).toEqual([]);
    expect(canonicalCountries("India, EU")).toEqual(["India", "European Union"]);
  });
});

describe("work authorization and sponsorship, from 'I can work in India'", () => {
  const cases: Array<[string, string]> = [
    ["Are you legally authorized to work in India?", "Yes"],
    ["Are you legally authorized to work in the United States?", "No"],
    ["Are you legally permitted to work in the UK?", "No"],
    ["Do you have a current UK work permit?", "No"],
    ["Will you now or in the future require DRW to sponsor you in the UK?", "Yes"],
    ["Will you now or in the future require visa sponsorship to work in India?", "No"],
    ["Are you authorized to work in the US without sponsorship?", "No"],
    ["Are you currently eligible to work in your country of residence?", "Yes"],
    ["Do you now or in the future require visa sponsorship to continue working in your country of residence?", "No"],
  ];
  for (const [label, expected] of cases) it(`${label} → ${expected}`, () => expect(value(decide(field(label), ME, []))).toBe(expected));

  it("asks when the country is not named, or the answer differs between the countries named", () => {
    for (const label of ["Are you legally authorized to work in the country where this job is located?",
      "Are you authorized to work in the location(s) you selected in your previous response?",
      "Are you legally authorized to work in India or the United States?"]) {
      expect(decide(field(label), ME, []).kind, label).toBe("ask");
    }
  });

  it("answers only yes/no questions, never an explanation box", () => {
    expect(decide(field("Please describe your work authorization status in India", "textarea", []), ME, []).kind).toBe("ask");
  });
});

describe("notice period, salary, relocation, how you heard", () => {
  it("notice period in any wording, but never into a date box or a month/year box", () => {
    expect(value(decide(field("What is your notice period?", "text", []), ME, []))).toBe("Immediate");
    expect(value(decide(field("When can you start?", "text", []), ME, []))).toBe("Immediate");
    expect(decide(field("Start date month", "select", ["January", "February"]), ME, []).kind).toBe("ask");
    expect(decide(field("Earliest start date", "date", []), ME, []).kind).toBe("ask");
  });

  it("current vs expected CTC; a number box gets the number; a question in dollars is asked", () => {
    expect(value(decide(field("What’s your current salary? (in lakhs per annum)", "text", []), ME, []))).toBe("0");
    expect(value(decide(field("Expected CTC", "text", []), ME, []))).toBe("20 LPA");
    expect(value(decide(field("Expected CTC (in lakhs)", "number", []), ME, []))).toBe("20");
    expect(decide(field("What is your desired salary in USD?", "text", []), ME, []).kind).toBe("ask");
    expect(decide(field("Salary", "text", []), ME, []).kind).toBe("ask"); // current or expected? unclear
  });

  it("relocation only for the general question", () => {
    expect(value(decide(field("Are you willing to relocate?"), ME, []))).toBe("Yes");
    expect(decide(field("Are you able to work onsite in the Esri location of this job posting, or relocate to do so?"), ME, []).kind).toBe("ask");
  });

  it("how you heard, in every wording", () => {
    for (const label of ["How did you hear about this job?", "How did you hear about this opportunity at Grafana?"]) {
      expect(value(decide(field(label, "text", []), ME, [])), label).toBe("LinkedIn");
    }
  });
});

describe("diversity questions: only into a clearly matching choice", () => {
  it("picks the one choice that means the answer", () => {
    expect(value(decide(field("Gender", "select", ["Male", "Female", "Decline To Self Identify"]), ME, []))).toBe("Male");
    expect(value(decide(field("Veteran Status", "select", ["I am not a protected veteran", "I identify as one or more of the classifications of protected veteran", "I don't wish to answer"]), ME, [])))
      .toBe("I am not a protected veteran");
    expect(value(decide(field("Disability Status", "select", ["Yes, I have a disability, or have had one in the past", "No, I do not have a disability and have not had one in the past", "I do not want to answer"]), ME, [])))
      .toBe("No, I do not have a disability and have not had one in the past");
    expect(value(decide(field("Are you Hispanic/Latino?", "select", ["Yes", "No", "Decline To Self Identify"]), ME, []))).toBe("No");
    expect(value(decide(field("Race", "select", ["Asian", "White", "Decline To Self Identify"]), ME, []))).toBe("Decline To Self Identify");
  });

  it("search-as-you-type lists get the words that find the choice", () => {
    expect(value(decide(field("Gender", "combobox", []), ME, []))).toBe("Male");
    expect(value(decide(field("Veteran Status", "combobox", []), ME, []))).toBe("I am not");
  });

  it("never as free text, never for a different question, never when no choice clearly matches", () => {
    expect(decide(field("Gender", "text", []), ME, []).kind).toBe("ask");
    expect(decide(field("Do you identify as transgender?"), ME, []).kind).toBe("ask");
    expect(decide(field("Pronouns", "select", ["He/him", "She/her"]), ME, []).kind).toBe("ask");
    expect(decide(field("Gender", "select", ["Man", "Woman", "Male (cis)", "Male (trans)"]), ME, []).kind).toBe("ask"); // two "male" choices
  });
});

describe("without quick answers nothing changes", () => {
  it("asks as before", () => {
    expect(decide(field("Are you legally authorized to work in India?"), PROFILE, []).kind).toBe("ask");
    expect(decide(field("Gender", "select", ["Male", "Female"]), PROFILE, []).kind).toBe("ask");
  });
  it("a saved answer for the exact question still wins over a quick answer", () => {
    const saved = [{ question: "What is your notice period?", answer: "60 days", topic: "notice_period" as const, updatedAt: "2026-10-26" }];
    expect(value(decide(field("What is your notice period?", "text", []), ME, saved))).toBe("60 days");
  });
});

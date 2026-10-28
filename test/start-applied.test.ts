import { describe, expect, it } from "vitest";
import { decide } from "../src/content/classify";
import {
  companyDomain,
  hasConfirmedApplication,
  isAppliedBeforeQuestion,
  isStartImmediatelyQuestion,
  startImmediatelyValue,
  type PageFacts,
} from "../src/content/facts";
import type { Decision, FieldDescriptor, Profile, QuickFacts } from "../src/shared/types";
import { PROFILE } from "./fixtures";

const FACTS: QuickFacts = {
  workCountries: "India",
  noticePeriod: "Immediate",
  currentCtc: "0",
  expectedCtc: "20 LPA",
  relocate: "Yes",
  heardFrom: "LinkedIn",
  gender: "Male",
  hispanic: "No",
  race: "Decline",
  veteran: "No",
  disability: "No",
};
const ME: Profile = { ...PROFILE, country: "India", facts: FACTS };

const field = (
  label: string,
  control: FieldDescriptor["control"] = "select",
  options: string[] = ["Yes", "No"],
): FieldDescriptor => ({
  key: "k",
  label,
  control,
  required: true,
  options,
  name: "",
  autocomplete: "",
  placeholder: "",
});

const value = (d: Decision) => (d.kind === "answer" ? d.value : d.kind);

describe("Can you start immediately (yes/no)", () => {
  it("recognises matching start immediately questions", () => {
    const valid = [
      "Can you start immediately?",
      "Can you start right away?",
      "Can you start work immediately?",
      "Are you able to start immediately?",
      "Are you available to start immediately?",
      "Could you start immediately?",
      "Would you be able to start immediately?",
      "Available to start immediately?",
      "Start immediately",
    ];
    for (const q of valid) {
      expect(isStartImmediatelyQuestion(q), `expected true for: ${q}`).toBe(true);
    }
  });

  it("strictly rejects other wordings, dates, hours, negations, company/place specific questions", () => {
    const invalid = [
      "When can you start?",
      "What is your notice period?",
      "Are you subject to a notice period?",
      "Do you have a notice period?",
      "Can you start on 01/15/2027?",
      "Can you start in September?",
      "Can you start work at 8am?",
      "Are you unable to start immediately?",
      "Can you not start immediately?",
      "Can you start immediately in London?",
      "Can you start immediately at Acme Corp?",
      "Can you start immediately unless you need a visa?",
      "Why can't you start immediately?",
    ];
    for (const q of invalid) {
      expect(isStartImmediatelyQuestion(q), `expected false for: ${q}`).toBe(false);
    }
  });

  it("answers only when notice period clearly says Immediately/0 days (Yes) or >0 days/weeks (No)", () => {
    expect(startImmediatelyValue("Immediate")).toBe("Yes");
    expect(startImmediatelyValue("Immediately")).toBe("Yes");
    expect(startImmediatelyValue("0 days")).toBe("Yes");
    expect(startImmediatelyValue("0 weeks")).toBe("Yes");
    expect(startImmediatelyValue("0")).toBe("Yes");

    expect(startImmediatelyValue("30 days")).toBe("No");
    expect(startImmediatelyValue("15 days")).toBe("No");
    expect(startImmediatelyValue("2 weeks")).toBe("No");
    expect(startImmediatelyValue("1 month")).toBe("No");
    expect(startImmediatelyValue("60 days")).toBe("No");

    // Anything else asks
    expect(startImmediatelyValue("June 2027")).toBeUndefined();
    expect(startImmediatelyValue("negotiable")).toBeUndefined();
    expect(startImmediatelyValue("as soon as possible")).toBeUndefined();
    expect(startImmediatelyValue("")).toBeUndefined();
  });

  it("decide answers Yes when notice period is Immediate and maps to exact option", () => {
    const immediateProfile: Profile = { ...PROFILE, facts: { ...FACTS, noticePeriod: "Immediate" } };
    expect(value(decide(field("Can you start immediately?", "select", ["Yes", "No"]), immediateProfile, []))).toBe("Yes");
    expect(
      value(
        decide(
          field("Are you able to start immediately?", "select", ["Yes, I can start immediately", "No, I need notice"]),
          immediateProfile,
          [],
        ),
      ),
    ).toBe("Yes, I can start immediately");
  });

  it("decide answers No when notice period is above 0 days/weeks", () => {
    const noticeProfile: Profile = { ...PROFILE, facts: { ...FACTS, noticePeriod: "30 days" } };
    expect(value(decide(field("Can you start immediately?", "select", ["Yes", "No"]), noticeProfile, []))).toBe("No");
    expect(value(decide(field("Are you available to start immediately?", "select", ["Yes", "No"]), noticeProfile, []))).toBe("No");
  });

  it("decide asks user when notice period is unclear or date-like", () => {
    const juneProfile: Profile = { ...PROFILE, facts: { ...FACTS, noticePeriod: "June 2027" } };
    expect(decide(field("Can you start immediately?", "select", ["Yes", "No"]), juneProfile, []).kind).toBe("ask");

    const noFactsProfile: Profile = { ...PROFILE, facts: undefined };
    expect(decide(field("Can you start immediately?", "select", ["Yes", "No"]), noFactsProfile, []).kind).toBe("ask");
  });
});

describe("Have you applied here before (yes/no)", () => {
  it("recognises matching applied before questions", () => {
    const valid = [
      "Have you applied here before?",
      "Have you applied to this company before?",
      "Have you previously applied to this company?",
      "Have you previously applied for a role with us?",
      "Have you ever applied to our company before?",
      "Did you previously apply for a role with us?",
      "Have you applied to Acme before?",
      "Have you applied to this position or any other position at our company before?",
    ];
    for (const q of valid) {
      expect(isAppliedBeforeQuestion(q), `expected true for: ${q}`).toBe(true);
    }
  });

  it("strictly rejects previous employment, current employment, visa, other companies, details", () => {
    const invalid = [
      "Have you worked here before?",
      "Have you ever been employed by us before?",
      "Are you currently an employee of this company?",
      "Are you a former employee of this company?",
      "Have you applied for a visa before?",
      "Have you applied to other companies?",
      "Where else have you applied?",
      "Why are you applying for this role?",
      "When did you apply?",
      "If you previously applied, please specify the role",
    ];
    for (const q of invalid) {
      expect(isAppliedBeforeQuestion(q), `expected false for: ${q}`).toBe(false);
    }
  });

  it("companyDomain extracts company identifier correctly across job boards and career sites", () => {
    expect(companyDomain("https://boards.greenhouse.io/stripe/jobs/1234")).toBe("stripe");
    expect(companyDomain("https://jobs.lever.co/stripe/5678")).toBe("stripe");
    expect(companyDomain("https://stripe.com/jobs/123")).toBe("stripe.com");
    expect(companyDomain("https://careers.stripe.com/apply")).toBe("stripe.com");
  });

  it("answers Yes only when tracker has a confirmed application to the same company domain", () => {
    const page: PageFacts = {
      jobCountries: ["United States"],
      url: "https://boards.greenhouse.io/stripe/jobs/1234",
      applications: [
        {
          id: "app-1",
          url: "https://boards.greenhouse.io/stripe/jobs/9999",
          platform: "greenhouse",
          jobTitle: "Software Engineer",
          status: "applied_confirmed",
          createdAt: new Date().toISOString(),
        },
      ],
    };

    const d = decide(field("Have you applied to this company before?", "select", ["Yes", "No"]), ME, [], page);
    expect(value(d)).toBe("Yes");
  });

  it("with no confirmed record (unconfirmed, different company, or empty), it ASKS the user", () => {
    const unconfirmedPage: PageFacts = {
      jobCountries: ["United States"],
      url: "https://boards.greenhouse.io/stripe/jobs/1234",
      applications: [
        {
          id: "app-1",
          url: "https://boards.greenhouse.io/stripe/jobs/9999",
          platform: "greenhouse",
          jobTitle: "Software Engineer",
          status: "needs_check", // not confirmed!
          createdAt: new Date().toISOString(),
        },
      ],
    };
    expect(decide(field("Have you applied to this company before?", "select", ["Yes", "No"]), ME, [], unconfirmedPage).kind).toBe("ask");

    const differentCompanyPage: PageFacts = {
      jobCountries: ["United States"],
      url: "https://boards.greenhouse.io/stripe/jobs/1234",
      applications: [
        {
          id: "app-2",
          url: "https://boards.greenhouse.io/airbnb/jobs/5555",
          platform: "greenhouse",
          jobTitle: "Designer",
          status: "applied_confirmed",
          createdAt: new Date().toISOString(),
        },
      ],
    };
    expect(decide(field("Have you applied to this company before?", "select", ["Yes", "No"]), ME, [], differentCompanyPage).kind).toBe("ask");

    const noRecordsPage: PageFacts = {
      jobCountries: ["United States"],
      url: "https://boards.greenhouse.io/stripe/jobs/1234",
      applications: [],
    };
    expect(decide(field("Have you applied to this company before?", "select", ["Yes", "No"]), ME, [], noRecordsPage).kind).toBe("ask");

    // Undefined page
    expect(decide(field("Have you applied to this company before?", "select", ["Yes", "No"]), ME, []).kind).toBe("ask");
  });
});

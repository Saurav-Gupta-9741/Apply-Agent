/**
 * Unit and integration tests for Quick Answers setup wizard and profile mapping (Step 2).
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { QUICK_QUESTIONS, applyQuickAnswers, type QuickQuestion } from "../src/shared/quick-answers";
import { mountQuickAnswers } from "../src/sidepanel/quick-answers";
import { decide } from "../src/content/classify";
import type { FieldDescriptor, Profile } from "../src/shared/types";
import { PROFILE } from "./fixtures";

// Mock chrome storage
const storageStore: Record<string, any> = {};
vi.stubGlobal("chrome", {
  storage: {
    local: {
      get: vi.fn(async (keys?: string | string[] | Record<string, any>) => {
        if (!keys) return { ...storageStore };
        if (typeof keys === "string") return { [keys]: storageStore[keys] };
        if (Array.isArray(keys)) {
          const res: Record<string, any> = {};
          keys.forEach((k) => (res[k] = storageStore[k]));
          return res;
        }
        return { ...keys, ...storageStore };
      }),
      set: vi.fn(async (items: Record<string, any>) => {
        Object.assign(storageStore, items);
      }),
    },
  },
});

const field = (label: string, control: FieldDescriptor["control"] = "text", options: string[] = []): FieldDescriptor => ({
  key: "f",
  label,
  control,
  required: true,
  options,
  name: "",
  autocomplete: "",
  placeholder: "",
});

describe("QUICK_QUESTIONS schema catalog", () => {
  it("contains 29 questions with distinct ids and non-empty prompt and why explanations", () => {
    expect(QUICK_QUESTIONS.length).toBe(29);
    const ids = new Set<string>();
    for (const q of QUICK_QUESTIONS) {
      expect(ids.has(q.id), `duplicate id ${q.id}`).toBe(false);
      ids.add(q.id);
      expect(q.prompt.length).toBeGreaterThan(10);
      expect(q.why.length).toBeGreaterThan(10);
      expect(q.factKey.length).toBeGreaterThan(0);
      expect(["yesno", "choice", "multi", "number", "text", "date"]).toContain(q.kind);
      if (q.kind === "choice" || q.kind === "multi") {
        expect(Array.isArray(q.options) && q.options.length > 0).toBe(true);
      }
    }
  });
});

describe("applyQuickAnswers mapping", () => {
  const baseProfile: Profile = {
    ...PROFILE,
    facts: {
      workCountries: "",
      noticePeriod: "",
      currentCtc: "",
      expectedCtc: "",
      relocate: "",
      heardFrom: "",
      gender: "",
      hispanic: "",
      race: "",
      veteran: "",
      disability: "",
    },
  };

  it("purely maps all 27 quick questions to the respective profile or profile.facts keys", () => {
    const rawAnswers: Record<string, string | string[]> = {
      workCountries: ["India", "United States"],
      temporaryWorkCountries: "Canada",
      needsFutureSponsorship: "No",
      relocate: "Yes",
      preferredLocations: "Bangalore, Remote",
      noticePeriod: "30 days",
      currentCtc: "15 LPA",
      expectedCtc: "22 LPA",
      workMode: "hybrid",
      maxOfficeDays: "3",
      travel: "Yes",
      travelPercent: "25%",
      over18: "Yes",
      highestDegree: "Master's Degree",
      graduationYear: "2020",
      experienceYears: "5",
      languages: "English: Native, German: Basic",
      gender: "Female",
      hispanic: "No",
      race: "Asian",
      veteran: "No",
      disability: "No",
      pronouns: "she/her",
      heardFrom: "LinkedIn",
      linkedin: "https://linkedin.com/in/testuser",
      github: "https://github.com/testuser",
      portfolio: "https://testuser.dev",
    };

    const updated = applyQuickAnswers(baseProfile, rawAnswers);

    // Profile root properties
    expect(updated.preferredLocations).toBe("Bangalore, Remote");
    expect(updated.educationLevel).toBe("Master's Degree");
    expect(updated.graduationYear).toBe("2020");
    expect(updated.experienceYears).toBe("5");
    expect(updated.linkedin).toBe("https://linkedin.com/in/testuser");
    expect(updated.github).toBe("https://github.com/testuser");
    expect(updated.portfolio).toBe("https://testuser.dev");

    // Languages array
    expect(updated.languages).toEqual([
      { language: "English", proficiency: "Native" },
      { language: "German", proficiency: "Basic" },
    ]);

    // Facts properties
    expect(updated.facts?.workCountries).toBe("India, United States");
    expect(updated.facts?.temporaryWorkCountries).toBe("Canada");
    expect(updated.facts?.needsFutureSponsorship).toBe("No");
    expect(updated.facts?.relocate).toBe("Yes");
    expect(updated.facts?.noticePeriod).toBe("30 days");
    expect(updated.facts?.currentCtc).toBe("15 LPA");
    expect(updated.facts?.expectedCtc).toBe("22 LPA");
    expect(updated.facts?.workMode).toBe("hybrid");
    expect(updated.facts?.maxOfficeDays).toBe("3");
    expect(updated.facts?.travel).toBe("Yes");
    expect(updated.facts?.travelPercent).toBe("25%");
    expect(updated.facts?.over18).toBe("Yes");
    expect(updated.facts?.gender).toBe("Female");
    expect(updated.facts?.hispanic).toBe("No");
    expect(updated.facts?.race).toBe("Asian");
    expect(updated.facts?.veteran).toBe("No");
    expect(updated.facts?.disability).toBe("No");
    expect(updated.facts?.pronouns).toBe("she/her");
    expect(updated.facts?.heardFrom).toBe("LinkedIn");

    // Pure: does not mutate baseProfile
    expect(baseProfile.facts?.workCountries).toBe("");
  });

  it("sanitizes enum choices strictly", () => {
    const invalidAnswers = {
      gender: "InvalidGender",
      hispanic: "Maybe",
      veteran: "VeteranOfficer",
      disability: "Unknown",
      needsFutureSponsorship: "Sure",
      relocate: "Perhaps",
      workMode: "everywhere",
      over18: "18+",
    };

    const updated = applyQuickAnswers(baseProfile, invalidAnswers);
    expect(updated.facts?.gender).toBe("");
    expect(updated.facts?.hispanic).toBe("");
    expect(updated.facts?.veteran).toBe("");
    expect(updated.facts?.disability).toBe("");
    expect(updated.facts?.needsFutureSponsorship).toBe("");
    expect(updated.facts?.relocate).toBe("");
    expect(updated.facts?.workMode).toBe("");
    expect(updated.facts?.over18).toBe("");
  });
});

describe("Autofill integration with decide", () => {
  it("enables automatic fills for common questions populated from Quick Answers", () => {
    const populated = applyQuickAnswers(PROFILE, {
      workCountries: ["India"],
      needsFutureSponsorship: "No",
      relocate: "Yes",
      over18: "Yes",
      experienceYears: "4",
      noticePeriod: "30 days",
      expectedCtc: "18 LPA",
      gender: "Female",
    });

    // 1. Work authorization
    const authDecision = decide(field("Are you legally authorized to work in India?", "select", ["Yes", "No"]), populated, []);
    expect(authDecision.kind).toBe("answer");
    if (authDecision.kind === "answer") expect(authDecision.value).toBe("Yes");

    // 2. Sponsorship
    const sponDecision = decide(
      field("Will you require visa sponsorship now or in the future to work in India?", "select", ["Yes", "No"]),
      populated,
      []
    );
    expect(sponDecision.kind).toBe("answer");
    if (sponDecision.kind === "answer") expect(sponDecision.value).toBe("No");

    // 3. Over 18
    const ageDecision = decide(field("Are you at least 18 years of age or older?", "select", ["Yes", "No"]), populated, []);
    expect(ageDecision.kind).toBe("answer");
    if (ageDecision.kind === "answer") expect(ageDecision.value).toBe("Yes");

    // 4. Relocate
    const reloDecision = decide(field("Are you willing to relocate for this position?", "select", ["Yes", "No"]), populated, []);
    expect(reloDecision.kind).toBe("answer");
    if (reloDecision.kind === "answer") expect(reloDecision.value).toBe("Yes");

    // 5. Notice period
    const noticeDecision = decide(field("What is your notice period?", "text"), populated, []);
    expect(noticeDecision.kind).toBe("answer");
    if (noticeDecision.kind === "answer") expect(noticeDecision.value).toBe("30 days");

    // 6. Experience years
    const expDecision = decide(field("Total years of experience", "text"), populated, []);
    expect(expDecision.kind).toBe("profile");
    if (expDecision.kind === "profile") expect(expDecision.value).toBe("4");
  });
});

describe("mountQuickAnswers UI component", () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.replaceChildren(container);
    storageStore["profile"] = { ...PROFILE };
  });

  it("renders wizard, advances through questions, and persists on completion", async () => {
    let completedAnswers: Record<string, any> | undefined;
    await mountQuickAnswers(container, (answers) => {
      completedAnswers = answers;
    });

    // Step 1: Check header and Question 1
    expect(container.querySelector(".wizard-step-counter")?.textContent).toBe(`Question 1 of ${QUICK_QUESTIONS.length}`);
    expect(container.querySelector(".wizard-prompt")?.textContent).toBe(QUICK_QUESTIONS[0]!.prompt);
    expect(container.querySelector(".wizard-why")?.textContent).toContain("Why we ask");

    // Back button on step 1 is disabled
    const backBtn = container.querySelector<HTMLButtonElement>(".wizard-back");
    expect(backBtn?.disabled).toBe(true);

    // Multi select pills on step 1 (workCountries)
    const pills = container.querySelectorAll<HTMLButtonElement>(".wizard-multi-group .btn");
    expect(pills.length).toBeGreaterThan(0);

    // Click Next
    const nextBtn = container.querySelector<HTMLButtonElement>(".wizard-next");
    nextBtn?.click();

    // Now on Question 2
    expect(container.querySelector(".wizard-step-counter")?.textContent).toBe(`Question 2 of ${QUICK_QUESTIONS.length}`);
    expect(container.querySelector<HTMLButtonElement>(".wizard-back")?.disabled).toBe(false);

    // Click Back
    container.querySelector<HTMLButtonElement>(".wizard-back")?.click();
    expect(container.querySelector(".wizard-step-counter")?.textContent).toBe(`Question 1 of ${QUICK_QUESTIONS.length}`);

    // Click Save & Exit
    const exitBtn = container.querySelector<HTMLButtonElement>(".wizard-save-exit");
    exitBtn?.click();

    // Verify persisted
    await new Promise((r) => setTimeout(r, 20));
    expect(completedAnswers).toBeDefined();
    expect(storageStore["profile"]).toBeDefined();
  });
});

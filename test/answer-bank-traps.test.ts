import { describe, it, expect } from "vitest";
import { decide, findAnswer } from "../src/content/classify";
import { EMPTY_PROFILE } from "../src/shared/storage";
import type { AnswerEntry, FieldDescriptor } from "../src/shared/types";

describe("Saved-Answer Reuse Safety Traps (42 Traps + 8 Reuses = 50 Tests)", () => {
  const makeField = (
    label: string,
    options: string[] = ["Yes", "No"],
    control: FieldDescriptor["control"] = "radio"
  ): FieldDescriptor => ({
    key: "k",
    label,
    name: "field",
    control,
    required: true,
    options,
    autocomplete: "",
    placeholder: "",
  });

  const makeAnswer = (
    question: string,
    answer: string,
    extra: Partial<AnswerEntry> = {}
  ): AnswerEntry[] => [
    {
      question,
      answer,
      updatedAt: "2026-01-01T00:00:00Z",
      ...extra,
    },
  ];

  // 1. Company Trap
  it("Trap 1: never reuses an answer for Google when asked about Microsoft", () => {
    const field = makeField("Have you worked at Microsoft previously?");
    const answers = makeAnswer("Have you worked at Google previously?", "Yes");
    expect(findAnswer(field, answers)).toBeUndefined();
    expect(decide(field, EMPTY_PROFILE, answers).kind).toBe("ask");
  });

  // 2. Number Trap (5+ vs 3+)
  it("Trap 2: never reuses 5+ years experience for 3+ years experience", () => {
    const field = makeField("Do you have 3+ years of experience with Python?");
    const answers = makeAnswer("Do you have 5+ years of experience with Python?", "Yes");
    expect(findAnswer(field, answers)).toBeUndefined();
    expect(decide(field, EMPTY_PROFILE, answers).kind).toBe("ask");
  });

  // 3. Tech Stack Trap (Python vs Java)
  it("Trap 3: never reuses 3+ years Python experience for 3+ years Java experience", () => {
    const field = makeField("Do you have 3+ years of experience with Java?");
    const answers = makeAnswer("Do you have 3+ years of experience with Python?", "Yes");
    expect(findAnswer(field, answers)).toBeUndefined();
    expect(decide(field, EMPTY_PROFILE, answers).kind).toBe("ask");
  });

  // 4. Country Trap (US vs Canada)
  it("Trap 4: never reuses US work authorization for Canada", () => {
    const field = makeField("Are you authorized to work in Canada?");
    const answers = makeAnswer("Are you authorized to work in the United States?", "Yes", {
      topic: "work_authorization",
    });
    expect(findAnswer(field, answers, "work_authorization")).toBeUndefined();
    expect(decide(field, EMPTY_PROFILE, answers).kind).toBe("ask");
  });

  // 5. Country Trap (US vs UK)
  it("Trap 5: never reuses US work authorization for the UK", () => {
    const field = makeField("Are you authorized to work in the UK?");
    const answers = makeAnswer("Are you authorized to work in the United States?", "Yes", {
      topic: "work_authorization",
    });
    expect(findAnswer(field, answers, "work_authorization")).toBeUndefined();
    expect(decide(field, EMPTY_PROFILE, answers).kind).toBe("ask");
  });

  // 6. Negation Trap (require sponsorship vs NOT require)
  it("Trap 6: never reuses require sponsorship answer for NOT require sponsorship", () => {
    const field = makeField("Will you NOT require visa sponsorship?");
    const answers = makeAnswer("Will you require visa sponsorship?", "No", { topic: "sponsorship" });
    expect(findAnswer(field, answers, "sponsorship")).toBeUndefined();
    expect(decide(field, EMPTY_PROFILE, answers).kind).toBe("ask");
  });

  // 7. Scope Trap (now vs now or in the future)
  it("Trap 7: never reuses require sponsorship now for require sponsorship now or in the future", () => {
    const field = makeField("Will you now or in the future require visa sponsorship?");
    const answers = makeAnswer("Will you now require visa sponsorship?", "No", { topic: "sponsorship" });
    expect(findAnswer(field, answers, "sponsorship")).toBeUndefined();
    expect(decide(field, EMPTY_PROFILE, answers).kind).toBe("ask");
  });

  // 8. Follow-up Trap (If yes, which one?)
  it("Trap 8: never reuses a general answer for 'If yes, which one?' follow-up", () => {
    const field = makeField("If yes, which one?", [], "text");
    const answers = makeAnswer("Do you have any certifications?", "Yes");
    expect(findAnswer(field, answers)).toBeUndefined();
    expect(decide(field, EMPTY_PROFILE, answers).kind).toBe("ask");
  });

  // 9. Follow-up Trap (If no, why?)
  it("Trap 9: never reuses a general answer for 'If no, why?' follow-up", () => {
    const field = makeField("If no, why?", [], "text");
    const answers = makeAnswer("Are you willing to relocate?", "No");
    expect(findAnswer(field, answers)).toBeUndefined();
    expect(decide(field, EMPTY_PROFILE, answers).kind).toBe("ask");
  });

  // 10. Options Trap (Yes/No vs Yes/No/Prefer not to say)
  it("Trap 10: never reuses answer when option choices differ (Prefer not to say missing)", () => {
    const field = makeField("Do you have a disability?", ["Yes", "No"]);
    const answers = makeAnswer("Do you have a disability?", "I prefer not to say", {
      topic: "disability",
    });
    expect(decide(field, EMPTY_PROFILE, answers).kind).toBe("ask");
  });

  // 11. Word Numbers Trap (three years vs 5 years)
  it("Trap 11: never reuses three years experience for 5 years experience", () => {
    const field = makeField("Do you have 5 years of experience in sales?");
    const answers = makeAnswer("Do you have three years of experience in sales?", "Yes");
    expect(findAnswer(field, answers)).toBeUndefined();
    expect(decide(field, EMPTY_PROFILE, answers).kind).toBe("ask");
  });

  // 12. Currency Trap (INR vs USD)
  it("Trap 12: never reuses salary saved in INR for question asking USD", () => {
    const field = makeField("What is your expected salary in USD?", [], "text");
    const answers = makeAnswer("What is your expected salary in INR?", "20 LPA", { topic: "salary" });
    expect(findAnswer(field, answers, "salary")).toBeUndefined();
    expect(decide(field, EMPTY_PROFILE, answers).kind).toBe("ask");
  });

  // 13. Frequency Trap (monthly vs annual)
  it("Trap 13: never reuses annual salary for question asking monthly salary", () => {
    const field = makeField("What is your expected monthly salary?", [], "text");
    const answers = makeAnswer("What is your expected annual salary?", "1200000", { topic: "salary" });
    expect(findAnswer(field, answers, "salary")).toBeUndefined();
    expect(decide(field, EMPTY_PROFILE, answers).kind).toBe("ask");
  });

  // 14. Company Host Trap
  it("Trap 14: never reuses 'worked here before' across different company hosts", () => {
    const field = makeField("Have you worked here before?");
    const answers = makeAnswer("Have you worked here before?", "Yes", { company: "Google" });
    const page = { company: "Meta", jobCountries: [] };
    expect(findAnswer(field, answers, undefined, page)).toBeUndefined();
    expect(decide(field, EMPTY_PROFILE, answers, page).kind).toBe("ask");
  });

  // 15. Age Polarity Flip Trap (Over 18 vs Under 18)
  it("Trap 15: never reuses 'over 18' answer for 'under 18'", () => {
    const field = makeField("Are you under 18 years of age?");
    const answers = makeAnswer("Are you over 18 years of age?", "Yes");
    expect(findAnswer(field, answers)).toBeUndefined();
    expect(decide(field, EMPTY_PROFILE, answers).kind).toBe("ask");
  });

  // 16. Relocation City Trap (Pune vs Berlin)
  it("Trap 16: never reuses willing to relocate to Pune for relocation to Berlin", () => {
    const field = makeField("Are you willing to relocate to Berlin?");
    const answers = makeAnswer("Are you willing to relocate to Pune?", "Yes", { topic: "relocation" });
    expect(findAnswer(field, answers, "relocation")).toBeUndefined();
    expect(decide(field, EMPTY_PROFILE, answers).kind).toBe("ask");
  });

  // 17. Notice Period vs Immediate Start
  it("Trap 17: notice period of 30 days must never answer Yes to starting within 2 weeks", () => {
    const field = makeField("Can you start within 2 weeks?");
    const answers = makeAnswer("What is your notice period?", "30 days", { topic: "notice_period" });
    const d = decide(field, EMPTY_PROFILE, answers);
    expect(d.kind === "ask" || (d.kind === "answer" && d.value === "No")).toBe(true);
  });

  // 18. Shift Trap (Night vs Day)
  it("Trap 18: never reuses night shifts answer for day shifts", () => {
    const field = makeField("Are you willing to work day shifts?");
    const answers = makeAnswer("Are you willing to work night shifts?", "Yes");
    expect(findAnswer(field, answers)).toBeUndefined();
    expect(decide(field, EMPTY_PROFILE, answers).kind).toBe("ask");
  });

  // 19. Degree Level Trap (Bachelor's vs Master's)
  it("Trap 19: never reuses Bachelor's degree answer for Master's degree", () => {
    const field = makeField("Do you hold a Master's degree?");
    const answers = makeAnswer("Do you hold a Bachelor's degree?", "Yes");
    expect(findAnswer(field, answers)).toBeUndefined();
    expect(decide(field, EMPTY_PROFILE, answers).kind).toBe("ask");
  });

  // 20. License Type Trap (Regular vs CDL)
  it("Trap 20: never reuses Driver's license answer for Commercial Driver's License (CDL)", () => {
    const field = makeField("Do you hold a Commercial Driver's License (CDL)?");
    const answers = makeAnswer("Do you hold a valid Driver's license?", "Yes");
    expect(findAnswer(field, answers)).toBeUndefined();
    expect(decide(field, EMPTY_PROFILE, answers).kind).toBe("ask");
  });

  // 21. Travel Percentage Trap (25% vs 75%)
  it("Trap 21: never reuses 25% travel answer for 75% travel requirement", () => {
    const field = makeField("Are you willing to travel up to 75% of the time?");
    const answers = makeAnswer("Are you willing to travel up to 25% of the time?", "Yes");
    expect(findAnswer(field, answers)).toBeUndefined();
    expect(decide(field, EMPTY_PROFILE, answers).kind).toBe("ask");
  });

  // 22. Employment Type Trap (Full-time vs Part-time)
  it("Trap 22: never reuses full-time employment preference for part-time employment", () => {
    const field = makeField("Are you seeking part-time employment?");
    const answers = makeAnswer("Are you seeking full-time employment?", "Yes");
    expect(findAnswer(field, answers)).toBeUndefined();
    expect(decide(field, EMPTY_PROFILE, answers).kind).toBe("ask");
  });

  // 23. Work Mode Trap (On-site vs Remote)
  it("Trap 23: never reuses on-site preference for 100% remote requirement", () => {
    const field = makeField("Are you comfortable working 100% remote?");
    const answers = makeAnswer("Are you comfortable working on-site?", "Yes");
    expect(findAnswer(field, answers)).toBeUndefined();
    expect(decide(field, EMPTY_PROFILE, answers).kind).toBe("ask");
  });

  // 24. Citizenship Status Trap (US Citizen vs Permanent Resident)
  it("Trap 24: never reuses US Citizen answer for Lawful Permanent Resident", () => {
    const field = makeField("Are you a Lawful Permanent Resident of the United States?");
    const answers = makeAnswer("Are you a US Citizen?", "Yes");
    expect(findAnswer(field, answers)).toBeUndefined();
    expect(decide(field, EMPTY_PROFILE, answers).kind).toBe("ask");
  });

  // 25. Legal Conviction Trap (Felony vs Misdemeanor)
  it("Trap 25: never reuses felony conviction answer for misdemeanor", () => {
    const field = makeField("Have you ever been convicted of a misdemeanor?");
    const answers = makeAnswer("Have you ever been convicted of a felony?", "No");
    expect(findAnswer(field, answers)).toBeUndefined();
    expect(decide(field, EMPTY_PROFILE, answers).kind).toBe("ask");
  });

  // 26. Agreement Trap (Non-compete vs NDA)
  it("Trap 26: never reuses non-compete answer for non-disclosure agreement (NDA)", () => {
    const field = makeField("Are you currently bound by a non-disclosure agreement (NDA)?");
    const answers = makeAnswer("Are you currently bound by a non-compete agreement?", "No");
    expect(findAnswer(field, answers)).toBeUndefined();
    expect(decide(field, EMPTY_PROFILE, answers).kind).toBe("ask");
  });

  // 27. Leadership Scope Trap (Leading a team vs Managing a department)
  it("Trap 27: never reuses leading a team answer for managing an entire department", () => {
    const field = makeField("Do you have experience managing an entire department?");
    const answers = makeAnswer("Do you have experience leading a team?", "Yes");
    expect(findAnswer(field, answers)).toBeUndefined();
    expect(decide(field, EMPTY_PROFILE, answers).kind).toBe("ask");
  });

  // 28. Reference Timing Trap (Upon request vs Immediately today)
  it("Trap 28: never reuses references upon request for 3 references immediately today", () => {
    const field = makeField("Can you provide 3 professional references immediately today?");
    const answers = makeAnswer("Can you provide professional references upon request?", "Yes");
    expect(findAnswer(field, answers)).toBeUndefined();
    expect(decide(field, EMPTY_PROFILE, answers).kind).toBe("ask");
  });

  // 29. Language Fluency Trap (English vs German)
  it("Trap 29: never reuses English fluency answer for German fluency", () => {
    const field = makeField("Are you fluent in German?");
    const answers = makeAnswer("Are you fluent in English?", "Yes");
    expect(findAnswer(field, answers)).toBeUndefined();
    expect(decide(field, EMPTY_PROFILE, answers).kind).toBe("ask");
  });

  // 30. Start Availability Trap (Immediate vs In 3 months)
  it("Trap 30: never reuses immediate start answer for starting in 3 months", () => {
    const field = makeField("Are you available to start in 3 months?");
    const answers = makeAnswer("Are you available for an immediate start?", "Yes");
    expect(findAnswer(field, answers)).toBeUndefined();
    expect(decide(field, EMPTY_PROFILE, answers).kind).toBe("ask");
  });

  // --- 5 Tests that SHOULD Reuse ---

  // 31. Reuse 1: Punctuation difference (missing question mark)
  it("Reuse 1: reuses answer when only trailing question mark differs", () => {
    const field = makeField("Are you authorized to work in the United States");
    const answers = makeAnswer("Are you authorized to work in the United States?", "Yes", {
      topic: "work_authorization",
    });
    const match = findAnswer(field, answers, "work_authorization");
    expect(match).toBeDefined();
    expect(match?.answer).toBe("Yes");
    const d = decide(field, EMPTY_PROFILE, answers);
    expect(d.kind).toBe("answer");
    if (d.kind === "answer") expect(d.value).toBe("Yes");
  });

  // 32. Reuse 2: Case difference
  it("Reuse 2: reuses answer across casing differences", () => {
    const field = makeField("do you require visa sponsorship?");
    const answers = makeAnswer("Do you require visa sponsorship?", "No", { topic: "sponsorship" });
    const match = findAnswer(field, answers, "sponsorship");
    expect(match).toBeDefined();
    expect(match?.answer).toBe("No");
    const d = decide(field, EMPTY_PROFILE, answers);
    expect(d.kind).toBe("answer");
    if (d.kind === "answer") expect(d.value).toBe("No");
  });

  // 33. Reuse 3: Whitespace spacing differences
  it("Reuse 3: reuses answer across internal whitespace differences", () => {
    const field = makeField("What is your   notice   period?", [], "text");
    const answers = makeAnswer("What is your notice period?", "30 days", { topic: "notice_period" });
    const match = findAnswer(field, answers, "notice_period");
    expect(match).toBeDefined();
    expect(match?.answer).toBe("30 days");
    const d = decide(field, EMPTY_PROFILE, answers);
    expect(d.kind).toBe("answer");
    if (d.kind === "answer") expect(d.value).toBe("30 days");
  });

  // 34. Reuse 4: Trailing spaces
  it("Reuse 4: reuses answer with trailing whitespace", () => {
    const field = makeField("What is your gender? ", ["Female", "Male"]);
    const answers = makeAnswer("What is your gender?", "Female", { topic: "gender" });
    const match = findAnswer(field, answers, "gender");
    expect(match).toBeDefined();
    expect(match?.answer).toBe("Female");
    const d = decide(field, EMPTY_PROFILE, answers);
    expect(d.kind).toBe("answer");
    if (d.kind === "answer") expect(d.value).toBe("Female");
  });

  // 35. Reuse 5: Multiple punctuation symbols (!?)
  it("Reuse 5: reuses answer with varied punctuation marks", () => {
    const field = makeField("Are you willing to relocate?!");
    const answers = makeAnswer("Are you willing to relocate?", "Yes", { topic: "relocation" });
    const match = findAnswer(field, answers, "relocation");
    expect(match).toBeDefined();
    expect(match?.answer).toBe("Yes");
    const d = decide(field, EMPTY_PROFILE, answers);
    expect(d.kind).toBe("answer");
    if (d.kind === "answer") expect(d.value).toBe("Yes");
  });

  // 36. Trap 31: Follow-up Condition Trap (If yes, please explain)
  it("Trap 31: never reuses a general answer for 'If yes, please explain' follow-up", () => {
    const field = makeField("If yes, please explain your certifications", [], "text");
    const answers = makeAnswer("Do you have any certifications?", "Yes");
    expect(findAnswer(field, answers)).toBeUndefined();
    expect(decide(field, EMPTY_PROFILE, answers).kind).toBe("ask");
  });

  // 37. Trap 32: Follow-up Condition Trap (If applicable, describe)
  it("Trap 32: never reuses a general answer for 'If applicable, describe' follow-up", () => {
    const field = makeField("If applicable, please describe your experience with AWS", [], "text");
    const answers = makeAnswer("Do you have experience with AWS?", "Yes");
    expect(findAnswer(field, answers)).toBeUndefined();
    expect(decide(field, EMPTY_PROFILE, answers).kind).toBe("ask");
  });

  // 38. Trap 33: Time Scope Trap (Currently authorized vs future sponsorship requirement)
  it("Trap 33: never reuses current work authorization answer for future visa sponsorship requirement", () => {
    const field = makeField("Will you in the future require visa sponsorship to work in the United States?");
    const answers = makeAnswer("Are you currently authorized to work in the United States?", "Yes", {
      topic: "work_authorization",
    });
    expect(findAnswer(field, answers, "sponsorship")).toBeUndefined();
    expect(decide(field, EMPTY_PROFILE, answers).kind).toBe("ask");
  });

  // 39. Trap 34: Time Scope Trap (Previously employed vs currently employed)
  it("Trap 34: never reuses previously employed answer for currently employed question", () => {
    const field = makeField("Are you currently employed at Google?");
    const answers = makeAnswer("Were you previously employed at Google?", "Yes");
    expect(findAnswer(field, answers)).toBeUndefined();
    expect(decide(field, EMPTY_PROFILE, answers).kind).toBe("ask");
  });

  // 40. Trap 35: Negation Trap (Willing to work overtime vs unwilling)
  it("Trap 35: never reuses willing to work overtime answer for unwilling to work overtime", () => {
    const field = makeField("Are you unwilling to work overtime?");
    const answers = makeAnswer("Are you willing to work overtime?", "Yes");
    expect(findAnswer(field, answers)).toBeUndefined();
    expect(decide(field, EMPTY_PROFILE, answers).kind).toBe("ask");
  });

  // 41. Trap 36: Negation Trap (Work without restrictions vs having restrictions)
  it("Trap 36: never reuses authorized without restrictions for having restrictions on work authorization", () => {
    const field = makeField("Do you have any restrictions on your work authorization?");
    const answers = makeAnswer("Are you authorized to work without restrictions?", "Yes");
    expect(findAnswer(field, answers)).toBeUndefined();
    expect(decide(field, EMPTY_PROFILE, answers).kind).toBe("ask");
  });

  // 42. Trap 37: Country Trap (Germany vs France)
  it("Trap 37: never reuses German work authorization for France", () => {
    const field = makeField("Are you authorized to work in France?");
    const answers = makeAnswer("Are you authorized to work in Germany?", "Yes", {
      topic: "work_authorization",
    });
    expect(findAnswer(field, answers, "work_authorization")).toBeUndefined();
    expect(decide(field, EMPTY_PROFILE, answers).kind).toBe("ask");
  });

  // 43. Trap 38: Country Trap (Australia vs Singapore)
  it("Trap 38: never reuses located in Australia answer for Singapore", () => {
    const field = makeField("Are you located in Singapore?");
    const answers = makeAnswer("Are you located in Australia?", "Yes", {
      topic: "relocation",
    });
    expect(findAnswer(field, answers, "relocation")).toBeUndefined();
    expect(decide(field, EMPTY_PROFILE, answers).kind).toBe("ask");
  });

  // 44. Trap 39: Company Trap (Amazon vs Apple)
  it("Trap 39: never reuses worked at Amazon for worked at Apple", () => {
    const field = makeField("Have you ever worked at Apple?");
    const answers = makeAnswer("Have you ever worked at Amazon?", "Yes");
    expect(findAnswer(field, answers)).toBeUndefined();
    expect(decide(field, EMPTY_PROFILE, answers).kind).toBe("ask");
  });

  // 45. Trap 40: Hours/Commitment Trap (40 hours vs 20 hours per week)
  it("Trap 40: never reuses 40 hours per week commitment for 20 hours per week", () => {
    const field = makeField("Can you commit to 20 hours per week?");
    const answers = makeAnswer("Can you commit to 40 hours per week?", "Yes");
    expect(findAnswer(field, answers)).toBeUndefined();
    expect(decide(field, EMPTY_PROFILE, answers).kind).toBe("ask");
  });

  // 46. Trap 41: Degree Level Trap (Master's vs PhD / Doctorate)
  it("Trap 41: never reuses Master's degree answer for PhD or Doctorate requirement", () => {
    const field = makeField("Do you hold a PhD or Doctoral degree?");
    const answers = makeAnswer("Do you hold a Master's degree?", "Yes");
    expect(findAnswer(field, answers)).toBeUndefined();
    expect(decide(field, EMPTY_PROFILE, answers).kind).toBe("ask");
  });

  // 47. Trap 42: Tech Stack Trap (Kubernetes vs Docker)
  it("Trap 42: never reuses Kubernetes experience answer for Docker experience question", () => {
    const field = makeField("Do you have experience with Docker?");
    const answers = makeAnswer("Do you have experience with Kubernetes?", "Yes");
    expect(findAnswer(field, answers)).toBeUndefined();
    expect(decide(field, EMPTY_PROFILE, answers).kind).toBe("ask");
  });

  // 48. Reuse 6: Driver's license paraphrase
  it("Reuse 6: reuses driver's license answer for 'Do you possess a current, valid driver's license?'", () => {
    const field = makeField("Do you possess a current, valid driver's license?");
    const answers = makeAnswer("Do you have a valid driver's license?", "Yes");
    const match = findAnswer(field, answers);
    expect(match).toBeDefined();
    expect(match?.answer).toBe("Yes");
    const d = decide(field, EMPTY_PROFILE, answers);
    expect(d.kind).toBe("answer");
    if (d.kind === "answer") {
      expect(d.value).toBe("Yes");
      expect(d.reused).toBe(true);
    }
  });

  // 49. Reuse 7: Background check paraphrase
  it("Reuse 7: reuses background check answer for 'Are you willing to submit to a pre-employment background check?'", () => {
    const field = makeField("Are you willing to submit to a pre-employment background check?");
    const answers = makeAnswer("Are you willing to undergo a background check?", "Yes");
    const match = findAnswer(field, answers);
    expect(match).toBeDefined();
    expect(match?.answer).toBe("Yes");
    const d = decide(field, EMPTY_PROFILE, answers);
    expect(d.kind).toBe("answer");
    if (d.kind === "answer") {
      expect(d.value).toBe("Yes");
      expect(d.reused).toBe(true);
    }
  });

  // 50. Reuse 8: Source / heard-about paraphrase
  it("Reuse 8: reuses heard-about answer for 'Where did you hear about this job?'", () => {
    const field = makeField("Where did you hear about this job?", [], "text");
    const answers = makeAnswer("How did you hear about this opportunity?", "LinkedIn");
    const match = findAnswer(field, answers);
    expect(match).toBeDefined();
    expect(match?.answer).toBe("LinkedIn");
    const d = decide(field, EMPTY_PROFILE, answers);
    expect(d.kind).toBe("answer");
    if (d.kind === "answer") {
      expect(d.value).toBe("LinkedIn");
      expect(d.reused).toBe(true);
    }
  });
});

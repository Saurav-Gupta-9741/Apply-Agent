import { describe, it, expect } from "vitest";
import { findAnswer } from "../src/content/classify";
import type { AnswerEntry, FieldDescriptor } from "../src/shared/types";

describe("Saved-Answer Reuse Safety Traps", () => {
  // Trap 1: Company Trap
  describe("1. Company Trap", () => {
    it("never reuses an answer given to 'Have you worked at Meta previously?' for 'Have you worked at Google previously?'", () => {
      const field: FieldDescriptor = {
        key: "f1",
        label: "Have you worked at Google previously?",
        name: "prev_google",
        control: "radio",
        required: true,
        options: ["Yes", "No"],
        autocomplete: "",
        placeholder: "",
      };
      const savedAnswers: AnswerEntry[] = [
        {
          question: "Have you worked at Meta previously?",
          answer: "No",
          updatedAt: "2026-01-01T00:00:00Z",
        },
      ];

      const match = findAnswer(field, savedAnswers);
      expect(match).toBeUndefined();
    });

    it("never reuses a generic 'Have you worked here before?' answer across different companies", () => {
      const field: FieldDescriptor = {
        key: "f2",
        label: "Have you worked here before?",
        name: "worked_here",
        control: "radio",
        required: true,
        options: ["Yes", "No"],
        autocomplete: "",
        placeholder: "",
      };
      const savedAnswers: AnswerEntry[] = [
        {
          question: "Have you worked here before?",
          answer: "No",
          updatedAt: "2026-01-01T00:00:00Z",
          company: "Meta",
        },
      ];

      // Current page is for Google: must NOT reuse
      const match = findAnswer(field, savedAnswers, undefined, { company: "Google", jobCountries: [] });
      expect(match).toBeUndefined();
    });
  });

  // Trap 2: Number Trap
  describe("2. Number Trap", () => {
    it("never reuses an answer for 3+ years when the question asks for 5+ years", () => {
      const field: FieldDescriptor = {
        key: "f3",
        label: "Do you have 5+ years of experience with Python?",
        name: "python_exp",
        control: "radio",
        required: true,
        options: ["Yes", "No"],
        autocomplete: "",
        placeholder: "",
      };
      const savedAnswers: AnswerEntry[] = [
        {
          question: "Do you have 3+ years of experience with Python?",
          answer: "Yes",
          updatedAt: "2026-01-01T00:00:00Z",
        },
      ];

      const match = findAnswer(field, savedAnswers);
      expect(match).toBeUndefined();
    });

    it("never reuses an answer for 2 years when the question asks for 10 years", () => {
      const field: FieldDescriptor = {
        key: "f4",
        label: "Do you have at least 10 years of software engineering experience?",
        name: "swe_exp",
        control: "radio",
        required: true,
        options: ["Yes", "No"],
        autocomplete: "",
        placeholder: "",
      };
      const savedAnswers: AnswerEntry[] = [
        {
          question: "Do you have at least 2 years of software engineering experience?",
          answer: "Yes",
          updatedAt: "2026-01-01T00:00:00Z",
        },
      ];

      const match = findAnswer(field, savedAnswers);
      expect(match).toBeUndefined();
    });
  });

  // Trap 3: Country Trap
  describe("3. Country Trap", () => {
    it("never reuses work authorization for Canada when question asks about the US", () => {
      const field: FieldDescriptor = {
        key: "f5",
        label: "Are you authorized to work in the United States?",
        name: "auth_us",
        control: "radio",
        required: true,
        options: ["Yes", "No"],
        autocomplete: "",
        placeholder: "",
      };
      const savedAnswers: AnswerEntry[] = [
        {
          question: "Are you authorized to work in Canada?",
          answer: "Yes",
          updatedAt: "2026-01-01T00:00:00Z",
        },
      ];

      const match = findAnswer(field, savedAnswers, "work_authorization");
      expect(match).toBeUndefined();
    });

    it("never reuses UK work authorization for Germany", () => {
      const field: FieldDescriptor = {
        key: "f6",
        label: "Do you have the right to work in Germany?",
        name: "auth_de",
        control: "radio",
        required: true,
        options: ["Yes", "No"],
        autocomplete: "",
        placeholder: "",
      };
      const savedAnswers: AnswerEntry[] = [
        {
          question: "Do you have the right to work in the UK?",
          answer: "Yes",
          updatedAt: "2026-01-01T00:00:00Z",
        },
      ];

      const match = findAnswer(field, savedAnswers, "work_authorization");
      expect(match).toBeUndefined();
    });
  });

  // Trap 4: Negation Trap
  describe("4. Negation Trap", () => {
    it("never reuses 'authorized to work' answer for 'require visa sponsorship'", () => {
      const field: FieldDescriptor = {
        key: "f7",
        label: "Will you now or in the future require visa sponsorship?",
        name: "require_sponsor",
        control: "radio",
        required: true,
        options: ["Yes", "No"],
        autocomplete: "",
        placeholder: "",
      };
      const savedAnswers: AnswerEntry[] = [
        {
          question: "Are you authorized to work without sponsorship?",
          answer: "Yes",
          updatedAt: "2026-01-01T00:00:00Z",
        },
      ];

      const match = findAnswer(field, savedAnswers, "sponsorship");
      expect(match).toBeUndefined();
    });

    it("never flips an answer between requiring sponsorship and not requiring sponsorship", () => {
      const field: FieldDescriptor = {
        key: "f8",
        label: "Do you need sponsorship for employment visa status?",
        name: "need_sponsor",
        control: "radio",
        required: true,
        options: ["Yes", "No"],
        autocomplete: "",
        placeholder: "",
      };
      const savedAnswers: AnswerEntry[] = [
        {
          question: "Are you legally authorized to work?",
          answer: "Yes",
          updatedAt: "2026-01-01T00:00:00Z",
        },
      ];

      const match = findAnswer(field, savedAnswers, "sponsorship");
      expect(match).toBeUndefined();
    });
  });
});

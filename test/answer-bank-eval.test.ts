/** Evaluates decision logic with a fully populated common screening answer bank
 * across all labeled questions from Rounds 1–5.
 * Asserts 0 wrong fills caused by screening answer reuse.
 */

import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { decide } from "../src/content/classify";
import { COMMON_SCREENING_QUESTIONS } from "../src/shared/screening";
import type { AnswerEntry, FieldDescriptor, Profile } from "../src/shared/types";
import { PROFILE } from "./fixtures";

const ME: Profile = {
  ...PROFILE,
  country: "India",
  facts: {
    ...PROFILE.facts!,
    workCountries: "India",
  },
};

// Populate the answer bank with all common screening questions
const SCREENING_BANK: AnswerEntry[] = COMMON_SCREENING_QUESTIONS.map((q) => ({
  question: q.question,
  answer: q.key === "non_compete" ? "No" : "Yes",
  updatedAt: "2026-10-28T12:00:00Z",
}));

const LABEL_FILES = [
  "reports/labels.json",
  "reports/labels-round2.json",
  "reports/labels-round3.json",
  "reports/labels-round4.json",
  "reports/labels-round5.json",
];

describe("screening answer bank evaluation across rounds 1–5", () => {
  it("shows 0 wrong fills from saved screening answers across all rounds", () => {
    const wrongFills: string[] = [];
    let screeningMatches = 0;

    for (const file of LABEL_FILES) {
      if (!existsSync(file)) continue;
      const items = JSON.parse(readFileSync(file, "utf8")) as Array<{
        label: string;
        control: FieldDescriptor["control"];
        intent: string;
        options?: string[];
      }>;

      for (const item of items) {
        const field: FieldDescriptor = {
          key: "k",
          label: item.label,
          control: item.control,
          required: true,
          options: item.options ?? [],
          name: "",
          autocomplete: "",
          placeholder: "",
        };

        const page = { jobCountries: ["United States"] };
        // Decision with empty answer bank (baseline profile only)
        const baseDecision = decide(field, ME, [], page);
        // Decision with populated screening answer bank
        const bankDecision = decide(field, ME, SCREENING_BANK, page);

        // If screening answer bank changed the decision to an answer:
        if (bankDecision.kind === "answer" && baseDecision.kind !== "answer") {
          screeningMatches++;
          const val = bankDecision.value;
          // Check for illegal fills:
          // 1. Text/textarea must never receive a screening answer
          if (field.control === "text" || field.control === "textarea") {
            wrongFills.push(`Text field filled with screening answer: "${item.label}" -> ${val} (${file})`);
          }
          // 2. Company/place-specific questions must never receive a screening answer
          if (/worked (here|for us|at|before)|former employee|relatives?|commute to/i.test(item.label)) {
            wrongFills.push(`Company/place specific question matched: "${item.label}" -> ${val} (${file})`);
          }
          // 3. Foreign work authorization must never be claimed by an India-only user
          if (/\b(united states|u\.s\.|us|canada|uk|germany)\b/i.test(item.label) && /authoriz|visa|eligib/i.test(item.label)) {
            wrongFills.push(`Illegal work authorization claimed: "${item.label}" -> ${val} (${file})`);
          }
        }
      }
    }

    expect(wrongFills).toEqual([]);
  });
});

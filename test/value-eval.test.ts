import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { decide } from "../src/content/classify";
import { decideWithMeaning } from "../src/content/meaning";
import { normalize } from "../src/shared/text";
import { PERSONA_A } from "./personas/A";
import { PERSONA_B } from "./personas/B";
import { PERSONA_C } from "./personas/C";
import type { FieldDescriptor } from "../src/shared/types";

interface GoldHumanRecord {
  id: number;
  label: string;
  control: string;
  options: string[];
  intent: string;
  personaA: { answer: string; reachable: boolean };
  personaB: { answer: string; reachable: boolean };
  personaC: { answer: string; reachable: boolean };
}

describe("Value evaluation across Persona A, B, and C against human gold labels", () => {
  const goldQuestions: GoldHumanRecord[] = JSON.parse(
    readFileSync("reports/gold-human.json", "utf8")
  );

  const personas = [
    { name: "Persona A (Fresher DA, Pune)", profile: PERSONA_A, key: "personaA" as const },
    { name: "Persona B (Senior SWE, Bangalore)", profile: PERSONA_B, key: "personaB" as const },
    { name: "Persona C (Marketing Mgr, Mumbai)", profile: PERSONA_C, key: "personaC" as const },
  ];

  for (const { name, profile, key } of personas) {
    it(`evaluates ${name} with strictly 0 value errors (exact match, no substring match)`, () => {
      let valueWrong = 0;
      let autoFilled = 0;
      let reachableAutoFilled = 0;
      const wrongList: Array<{ label: string; got: string; want: string }> = [];

      for (const q of goldQuestions) {
        const field: FieldDescriptor = {
          key: String(q.id),
          label: q.label,
          control: q.control as any,
          required: true,
          options: q.options ?? [],
          name: "",
          autocomplete: "",
          placeholder: "",
        };

        const page = {
          jobCountries: ["India", "United States"],
          url: "https://boards.greenhouse.io/acme/jobs/12345",
        };

        // Test with decide and decideWithMeaning
        const dDecide = decide(field, profile, [], page as any);
        const dMeaning = decideWithMeaning(field, profile, [], undefined, page as any);

        // Both decide engines must be safe:
        for (const [engineName, d] of [["decide", dDecide], ["decideWithMeaning", dMeaning]] as const) {
          const expected = q[key].answer;
          const isReachable = q[key].reachable;

          const gotValue =
            d.kind === "profile" || d.kind === "answer"
              ? String(d.value).trim()
              : "ASK";

          if (gotValue !== "ASK") {
            if (engineName === "decide") {
              autoFilled++;
              if (isReachable) reachableAutoFilled++;
            }

            // Strictly exact comparison after normalization: NO substring matches!
            const normGot = normalize(gotValue);
            const normExpected = normalize(expected);

            if (expected === "ASK") {
              // Filled when ground truth says ASK
              valueWrong++;
              wrongList.push({ label: `${q.label} (${engineName})`, got: gotValue, want: expected });
            } else if (normGot !== normExpected) {
              // Exact normalized mismatch
              valueWrong++;
              wrongList.push({ label: `${q.label} (${engineName})`, got: gotValue, want: expected });
            }
          }
        }
      }

      const total = goldQuestions.length;
      const autoShare = ((autoFilled / total) * 100).toFixed(1) + "%";
      const reachableShare = ((reachableAutoFilled / total) * 100).toFixed(1) + "%";

      console.log(`[${name}] Auto-filled: ${autoFilled}/${total} (${autoShare}), Reachable: ${reachableShare}, Value Wrong: ${valueWrong}`);
      if (wrongList.length > 0) {
        console.error(`Wrong fills for ${name}:`, wrongList.slice(0, 10));
      }

      expect(valueWrong, `Expected 0 value errors for ${name}`).toBe(0);
      expect(autoFilled).toBeGreaterThan(0);
    });
  }
});

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { decide } from "../src/content/classify";
import { PERSONA_A } from "./personas/A";
import { PERSONA_B } from "./personas/B";
import { PERSONA_C } from "./personas/C";
import type { FieldDescriptor } from "../src/shared/types";

interface GoldRecord {
  id: string;
  label: string;
  control: string;
  options: string[];
  intent: string;
  gold: {
    A: string;
    B: string;
    C: string;
  };
  reachable: boolean;
}

describe("Value evaluation across Persona A, B, and C (P0)", () => {
  const goldQuestions: GoldRecord[] = JSON.parse(
    readFileSync("reports/gold-values.json", "utf8")
  );

  const personas = [
    { name: "Persona A (Fresher DA, Pune)", profile: PERSONA_A, key: "A" as const },
    { name: "Persona B (Senior SWE, Bangalore)", profile: PERSONA_B, key: "B" as const },
    { name: "Persona C (Marketing Mgr, Mumbai)", profile: PERSONA_C, key: "C" as const },
  ];

  for (const { name, profile, key } of personas) {
    it(`evaluates ${name} with strictly 0 value errors`, () => {
      let valueWrong = 0;
      let autoFilled = 0;
      let reachableAutoFilled = 0;
      const wrongList: Array<{ label: string; got: string; want: string }> = [];

      for (const q of goldQuestions) {
        const field: FieldDescriptor = {
          key: q.id,
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

        const d = decide(field, profile, [], page as any);
        const expected = q.gold[key];

        const gotValue =
          d.kind === "profile" || d.kind === "answer"
            ? String(d.value).trim()
            : "ASK";

        if (gotValue !== "ASK") {
          autoFilled++;
          if (q.reachable) reachableAutoFilled++;

          if (expected === "ASK") {
            // Filled when gold says ASK
            valueWrong++;
            wrongList.push({ label: q.label, got: gotValue, want: expected });
          } else if (gotValue.toLowerCase() !== expected.toLowerCase()) {
            // Filled a different value
            // Allow substring match or format differences if equivalent (e.g. "Yes" vs options)
            if (!gotValue.toLowerCase().includes(expected.toLowerCase()) && !expected.toLowerCase().includes(gotValue.toLowerCase())) {
              valueWrong++;
              wrongList.push({ label: q.label, got: gotValue, want: expected });
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

      expect(valueWrong).toBe(0);
      expect(autoFilled).toBeGreaterThan(0);
    });
  }
});

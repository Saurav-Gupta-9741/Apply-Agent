/** Measures the whole decision logic on the real questions (reports/labels.json, hand-checked meanings): rules only vs
 * rules + the local model's reading (reports/oof.json: predictions made without ever training on that question).
 * Counts every value ApplyAgent would put on a form and whether it is the right kind of value.
 *   POLICY_EVAL=1 npx vitest run test/policy-eval.test.ts
 * Another set (e.g. fresh forms the model never saw, read by scripts/read-questions.mjs):
 *   POLICY_EVAL=1 POLICY_LABELS=reports/labels-round2.json POLICY_READINGS=reports/readings-round2.json npx vitest run … */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { decide } from "../src/content/classify";
import { decideWithMeaning } from "../src/content/meaning";
import type { Decision, FieldDescriptor, Profile } from "../src/shared/types";
import { PROFILE } from "./fixtures";

const FULL: Profile = {
  ...PROFILE, location: "Pune", country: "India", github: "https://github.com/asha", portfolio: "https://asha.dev", currentCompany: "Initech",
  currentTitle: "Data Analyst", school: "IIT Jodhpur", degree: "Master's Degree", discipline: "Computer Science", graduationYear: "2026",
  experienceYears: "2", preferredLocations: "Bangalore, Remote",
  facts: { workCountries: "India", noticePeriod: "30 days", currentCtc: "6 LPA", expectedCtc: "20 LPA", relocate: "Yes", heardFrom: "LinkedIn",
    gender: "Female", hispanic: "No", race: "Decline", veteran: "No", disability: "No" },
};

const QUICK: Record<string, string> = {
  "work authorization": "work_authorization", sponsorship: "sponsorship", "notice period": "notice_period", "current CTC": "salary_current",
  "expected CTC": "salary_expected", relocation: "relocation", "how you heard": "heard_about", gender: "gender", "Hispanic/Latino": "hispanic",
  "race/ethnicity": "race", "veteran status": "veteran", disability: "disability",
};
const WORK: Record<string, string> = { title: "currentTitle", company: "currentCompany", location: "location", start: "work_dates", end: "work_dates" };

/** The kind of value a decision would put on the form (undefined: nothing is filled). */
function filledAs(d: Decision): string | undefined {
  if (d.kind === "profile") return d.key === "preferredLocations" ? "location" : d.key;
  if (d.kind === "resume") return "resume";
  if (d.kind === "work") return WORK[d.part] ?? d.part;
  if (d.kind === "answer") return d.question.startsWith("Quick answers › ") ? QUICK[d.question.slice(16)] ?? "?" : "saved answer";
  return undefined;
}

const LABELS = process.env.POLICY_LABELS ?? "reports/labels.json";
const READINGS = process.env.POLICY_READINGS ?? "reports/oof.json";
const OUT = LABELS === "reports/labels.json" ? "reports/policy-eval.txt" : LABELS.replace(/labels-?/, "policy-eval-").replace(/\.json$/, ".txt");
const ready = existsSync(LABELS) && existsSync(READINGS);

describe.skipIf(!process.env.POLICY_EVAL || !ready)("decision logic on real questions", () => {
  it("rules only vs rules + model", () => {
    const labels = JSON.parse(readFileSync(LABELS, "utf8")) as Array<{ label: string; control: FieldDescriptor["control"]; intent: string; options?: string[] }>;
    const oof = new Map((JSON.parse(readFileSync(READINGS, "utf8")) as Array<{ text: string; guess: string; confidence: number }>)
      .map((o) => [o.text, { intent: o.guess, confidence: o.confidence }]));
    const page = { jobCountries: ["United States"] };
    const tally = { rules: { filled: 0, wrong: [] as string[] }, combined: { filled: 0, wrong: [] as string[] }, gained: [] as string[], doubted: [] as string[] };
    for (const l of labels) {
      const field: FieldDescriptor = {
        key: "k", label: l.label, control: l.control, required: true, options: l.options ?? [], name: "", autocomplete: "", placeholder: "",
      };
      const r = filledAs(decide(field, FULL, [], page));
      const c = filledAs(decideWithMeaning(field, FULL, [], page, oof.get(l.label)));
      const ok = (as: string) => as === l.intent || (as === "fullName" && l.intent === "firstName" && /preferred/i.test(l.label));
      if (r) {
        tally.rules.filled++;
        if (!ok(r)) tally.rules.wrong.push(`${r} ≠ ${l.intent}: ${l.label.slice(0, 90)}`);
      }
      if (c) {
        tally.combined.filled++;
        if (!ok(c)) tally.combined.wrong.push(`${c} ≠ ${l.intent}: ${l.label.slice(0, 90)}`);
      }
      if (c && !r) tally.gained.push(`${c}: ${l.label.slice(0, 90)}`);
      if (r && !c) tally.doubted.push(`${r} (truly ${l.intent}): ${l.label.slice(0, 90)}`);
    }
    const report = [
      `Real questions: ${labels.length}`,
      `Rules only:      fills ${tally.rules.filled}, wrong ${tally.rules.wrong.length}`,
      `Rules + model:   fills ${tally.combined.filled}, wrong ${tally.combined.wrong.length}`,
      "", "Newly filled by the model:", ...tally.gained.map((x) => `  + ${x}`),
      "", "No longer filled (doubted):", ...tally.doubted.map((x) => `  - ${x}`),
      "", "Wrong with rules only:", ...tally.rules.wrong.map((x) => `  ✗ ${x}`),
      "", "Wrong with rules + model:", ...tally.combined.wrong.map((x) => `  ✗ ${x}`),
    ].join("\n");
    writeFileSync(OUT, report);
    console.log(report);
    expect(tally.combined.wrong.length).toBeLessThanOrEqual(tally.rules.wrong.length);
  });
});

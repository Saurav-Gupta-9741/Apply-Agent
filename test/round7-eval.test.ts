/** Round 7: the worldwide check. Real questions from Greenhouse job boards in many countries and languages, with the
 * options the forms really offer, each labelled by hand (reports/round7/labels.json). The extension's own decision
 * pipeline runs on them, as an applicant in the US, India, the UK and Germany. Any fill whose meaning differs from the
 * label is a wrong fill, and there must be none. Writes reports/round7/eval.json. */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { decideWithMeaning } from "../src/content/meaning";
import type { FieldDescriptor } from "../src/shared/types";
import { FULL, HUMAN_ONLY_INTENTS, filledAs, rightFill } from "./eval-common";

interface Question { label: string; control: FieldDescriptor["control"]; options: string[]; required: boolean; boards: string[]; languages: string[] }

const HAVE = existsSync("reports/round7/labels.json") && existsSync("reports/round7/questions.json");

describe.skipIf(!HAVE)("round 7: worldwide Greenhouse questions", () => {
  it("fills only what it understands, with 0 wrong fills in every country", () => {
    const labels = JSON.parse(readFileSync("reports/round7/labels.json", "utf8")) as Record<string, string>;
    const questions = (JSON.parse(readFileSync("reports/round7/questions.json", "utf8")) as Question[])
      .filter((q) => labels[`${q.label}|${q.control}`]);
    const readings = existsSync("reports/round7/readings.json")
      ? new Map((JSON.parse(readFileSync("reports/round7/readings.json", "utf8")) as Array<{ text: string; guess: string; confidence: number }>)
        .map((r) => [r.text, { intent: r.guess, confidence: r.confidence }]))
      : new Map();
    const COUNTRIES = { US: ["United States"], IN: ["India"], GB: ["United Kingdom"], DE: ["Germany"] } as const;
    const out: Record<string, { auto: number; ask: number; humanOnly: number; wrong: string[] }> = {};
    const byIntent: Record<string, { total: number; auto: number }> = {};
    const filledUS: string[] = [];
    const holdout = existsSync("reports/round7/holdout.json")
      ? new Set((JSON.parse(readFileSync("reports/round7/holdout.json", "utf8")) as { testQuestions: string[] }).testQuestions)
      : new Set<string>();
    const held = { questions: 0, auto: 0, wrong: 0 };
    for (const [code, jobCountries] of Object.entries(COUNTRIES)) {
      const tally = { auto: 0, ask: 0, humanOnly: 0, wrong: [] as string[] };
      for (const q of questions) {
        const intent = labels[`${q.label}|${q.control}`]!;
        const field: FieldDescriptor = { key: "k", label: q.label, control: q.control, required: q.required, options: q.options,
          name: "", autocomplete: "", placeholder: "" };
        const d = decideWithMeaning(field, FULL, [], { jobCountries: [...jobCountries], url: "https://job-boards.greenhouse.io/acme/jobs/1" }, readings.get(q.label));
        const as = filledAs(d);
        const isHeld = code === "US" && holdout.has(`${q.label}|${q.control}`);
        if (isHeld) {
          held.questions++;
          if (as) rightFill(as, intent, q.label) ? held.auto++ : held.wrong++;
        }
        if (code === "US") {
          byIntent[intent] ??= { total: 0, auto: 0 };
          byIntent[intent]!.total++;
        }
        if (as) {
          if (rightFill(as, intent, q.label)) {
            tally.auto++;
            if (code === "US") filledUS.push(`${intent}: ${q.label.slice(0, 100)} → ${"value" in d ? d.value : ""}`);
            if (code === "US") byIntent[intent]!.auto++;
          } else tally.wrong.push(`${as} ≠ ${intent}: ${q.label.slice(0, 120)} → ${"value" in d ? d.value : ""}`);
        } else if (HUMAN_ONLY_INTENTS.has(intent)) tally.humanOnly++;
        else tally.ask++;
      }
      out[code] = tally;
    }
    const report = {
      questions: questions.length,
      languages: [...new Set(questions.flatMap((q) => q.languages))],
      boards: new Set(questions.flatMap((q) => q.boards)).size,
      perCountry: Object.fromEntries(Object.entries(out).map(([c, t]) => [c, { auto: t.auto, autoShare: `${((t.auto / questions.length) * 100).toFixed(1)}%`, ask: t.ask, humanOnly: t.humanOnly, wrong: t.wrong.length }])),
      byIntent: Object.fromEntries(Object.entries(byIntent).sort((a, b) => b[1].total - a[1].total)),
      wrong: Object.fromEntries(Object.entries(out).map(([c, t]) => [c, t.wrong])),
      filledUS,
      heldOut: { ...held, autoShare: `${((held.auto / Math.max(1, held.questions)) * 100).toFixed(1)}%`, note: "questions only asked by the 74 boards never used for training (US applicant)" },
    };
    writeFileSync("reports/round7/eval.json", JSON.stringify(report, null, 1));
    console.log("ROUND7", JSON.stringify(report.perCountry), "HELD-OUT", JSON.stringify(report.heldOut));
    for (const t of Object.values(out)) expect(t.wrong).toEqual([]);
  });
});

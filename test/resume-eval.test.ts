/** Accuracy of the resume reader on a labelled set of made-up resumes (text, PDF and DOCX files).
 * Prints a per-field precision / recall table. The bar: never a wrong value (precision 100%), and recall high. */

import { describe, expect, it } from "vitest";
import { parseResume, type ParsedResume } from "../src/shared/resume-parse";
import { parseResumeFromBuffer } from "../src/sidepanel/resume-import";
import { CASES } from "./resume-eval/cases";
import { ALL_FIELDS, precision, recall, scoreCase, sum, table, type CaseResult } from "./resume-eval/score";

async function read(c: (typeof CASES)[number]): Promise<ParsedResume> {
  if (c.kind === "text") return parseResume(c.text!, new Date("2026-11-05"));
  return parseResumeFromBuffer(c.kind === "pdf" ? "resume.pdf" : "resume.docx", c.bytes!());
}

describe("resume reader accuracy (evaluation set)", () => {
  it("never suggests a wrong value and finds most values", async () => {
    const results: CaseResult[] = [];
    const report: string[] = [];
    for (const c of CASES) {
      const r = scoreCase(await read(c), c.expect);
      results.push(r);
      if (r.problems.length) report.push(`${c.id}\n  ${r.problems.join("\n  ")}`);
    }
    const total = sum(results);
    console.log(`${report.join("\n")}\n\n${table(total)}`);

    const wrong = report.filter((r) => r.includes("WRONG"));
    expect(wrong, "wrong values").toEqual([]);
    for (const f of ALL_FIELDS) expect(precision(total[f]), `precision of ${f}`).toBe(1);
    const all = Object.values(total).reduce((a, t) => ({ tp: a.tp + t.tp, fp: a.fp + t.fp, fn: a.fn + t.fn }), { tp: 0, fp: 0, fn: 0 });
    expect(recall(all), "overall recall").toBeGreaterThanOrEqual(0.95);
  }, 60_000);
});

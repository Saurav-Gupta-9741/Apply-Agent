/** Per-field precision and recall of the resume reader on the evaluation set. */

import type { ParsedResume } from "../../src/shared/resume-parse";
import type { Accept, Expected } from "./cases";

export interface Tally {
  tp: number;
  fp: number;
  fn: number;
}

export const SCALAR_FIELDS = [
  "firstName", "lastName", "email", "phone", "location", "linkedin", "github", "portfolio",
  "currentTitle", "currentCompany", "school", "degree", "discipline", "graduationYear", "educationStatus",
] as const;
export const ALL_FIELDS = [...SCALAR_FIELDS, "work", "skills", "languages"] as const;
export type EvalField = (typeof ALL_FIELDS)[number];

const URL_FIELDS = new Set(["linkedin", "github", "portfolio"]);

function norm(field: string, v: string): string {
  if (URL_FIELDS.has(field)) return v.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/+$/, "");
  if (field === "phone") return v.replace(/\D/g, "");
  if (field === "degree") return v.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (field === "educationStatus") return /pursuing/i.test(v) ? "pursuing" : v.toLowerCase();
  return v.toLowerCase().replace(/\s+/g, " ").replace(/[\s.,]+$/, "").trim();
}

const accepts = (field: string, a: Accept | undefined, v: string) => a !== undefined && (Array.isArray(a) ? a : [a]).some((x) => norm(field, x) === norm(field, v));

export interface CaseResult {
  tallies: Record<EvalField, Tally>;
  /** Readable lines for every wrong or missing value. */
  problems: string[];
}

export function scoreCase(parsed: ParsedResume, exp: Expected): CaseResult {
  const tallies = Object.fromEntries(ALL_FIELDS.map((f) => [f, { tp: 0, fp: 0, fn: 0 }])) as Record<EvalField, Tally>;
  const problems: string[] = [];
  for (const field of SCALAR_FIELDS) {
    const got = parsed.suggestions.find((s) => s.field === field)?.value;
    const want = exp[field];
    const t = tallies[field];
    if (got !== undefined && accepts(field, want, got)) t.tp++;
    else {
      if (got !== undefined) {
        t.fp++;
        problems.push(`WRONG ${field}: got "${got}", want ${want === undefined ? "nothing" : JSON.stringify(want)}`);
      }
      if (want !== undefined) {
        t.fn++;
        if (got === undefined) problems.push(`MISSING ${field}: want ${JSON.stringify(want)}`);
      }
    }
  }

  // Work history: an entry is right only if title, company, start and end all are.
  const jobs = parsed.suggestions.filter((s) => s.field === "workHistory" && s.work).map((s) => s.work!);
  const wanted = [...(exp.work ?? [])];
  for (const j of jobs) {
    const i = wanted.findIndex((w) => norm("x", w.title) === norm("x", j.title) && norm("x", w.company) === norm("x", j.company) && w.start === j.start
      && (w.end === "present" ? j.current : !j.current && w.end === j.end));
    if (i >= 0) {
      tallies.work.tp++;
      wanted.splice(i, 1);
    } else {
      tallies.work.fp++;
      problems.push(`WRONG job: ${JSON.stringify({ title: j.title, company: j.company, start: j.start, end: j.current ? "present" : j.end })}`);
    }
  }
  tallies.work.fn += wanted.length;
  for (const w of wanted) problems.push(`MISSING job: ${JSON.stringify(w)}`);

  const lc = (xs: string[] | undefined) => (xs ?? []).map((x) => x.toLowerCase());
  const setScore = (field: "skills" | "languages", got: string[], want: string[], ok: string[] = []) => {
    const t = tallies[field];
    const w = lc(want);
    const o = lc(ok);
    for (const g of got) {
      if (w.includes(g.toLowerCase())) t.tp++;
      else if (!o.includes(g.toLowerCase())) {
        t.fp++;
        problems.push(`WRONG ${field}: "${g}"`);
      }
    }
    const missing = want.filter((x) => !got.some((g) => g.toLowerCase() === x.toLowerCase()));
    t.fn += missing.length;
    if (missing.length) problems.push(`MISSING ${field}: ${missing.join(", ")}`);
  };
  setScore("skills", parsed.skills, exp.skills ?? [], exp.skillsAlsoOk);
  setScore("languages", parsed.suggestions.filter((s) => s.field === "languages").map((s) => s.language?.language ?? s.value), exp.languages ?? []);
  return { tallies, problems };
}

export function sum(results: CaseResult[]): Record<EvalField, Tally> {
  const total = Object.fromEntries(ALL_FIELDS.map((f) => [f, { tp: 0, fp: 0, fn: 0 }])) as Record<EvalField, Tally>;
  for (const r of results) for (const f of ALL_FIELDS) {
    total[f].tp += r.tallies[f].tp;
    total[f].fp += r.tallies[f].fp;
    total[f].fn += r.tallies[f].fn;
  }
  return total;
}

export const precision = (t: Tally) => (t.tp + t.fp ? t.tp / (t.tp + t.fp) : 1);
export const recall = (t: Tally) => (t.tp + t.fn ? t.tp / (t.tp + t.fn) : 1);

export function table(total: Record<EvalField, Tally>): string {
  const pct = (x: number) => `${(x * 100).toFixed(0)}%`.padStart(5);
  const rows = ALL_FIELDS.map((f) => `${f.padEnd(16)} ${pct(precision(total[f]))} ${pct(recall(total[f]))}   tp=${total[f].tp} fp=${total[f].fp} fn=${total[f].fn}`);
  const all = Object.values(total).reduce((a, t) => ({ tp: a.tp + t.tp, fp: a.fp + t.fp, fn: a.fn + t.fn }), { tp: 0, fp: 0, fn: 0 });
  return [`${"field".padEnd(16)}  prec  recall`, ...rows, `${"ALL".padEnd(16)} ${pct(precision(all))} ${pct(recall(all))}   tp=${all.tp} fp=${all.fp} fn=${all.fn}`].join("\n");
}

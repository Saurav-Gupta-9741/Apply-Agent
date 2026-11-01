/** VALUE-LEVEL benchmark on real form snapshots (test/corpus), scored against HUMAN labels.
 *
 * Two modes:
 *  - BUILD_VALUE_BENCHMARK=1 (run by `node scripts/build-value-benchmark.mjs`): mounts every real snapshot in jsdom,
 *    reads it with the extension's own extractFields() and jobCountries(), and writes
 *    reports/value-benchmark/fields.json (+ fields.csv, personas.json). Nothing is scored.
 *  - default: runs decide() AND decideWithMeaning() for every field x persona with the page's real job country.
 *      * labels-human.json missing: prints "awaiting human labels" and runs only crash / safety checks.
 *        It does NOT report accuracy.
 *      * labels-human.json present: exact normalized value equality against the human's answer, wrong fills split
 *        by kind, and a 95% one-sided Clopper-Pearson upper bound on the wrong rate.
 *
 * The extension's answers are written to reports/value-benchmark/predictions.json so the labelling page can show
 * them AFTER the human has answered (disagreement review). */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { decide, isSecretField, sensitiveTopic } from "../src/content/classify";
import { extractFields } from "../src/content/extract";
import { jobCountries } from "../src/content/joblocation";
import { decideWithMeaning, type Meaning } from "../src/content/meaning";
import { bestOption, normalize } from "../src/shared/text";
import type { Decision, FieldDescriptor, Profile } from "../src/shared/types";
import { mount } from "./fixtures";
import { PERSONA_A, PERSONA_B, PERSONA_C, PERSONA_D } from "./personas";

const OUT = "reports/value-benchmark";
const CORPUS = "test/corpus";
const BUILD = process.env.BUILD_VALUE_BENCHMARK === "1";
const REPORT_ONLY = process.env.VALUE_BENCH_REPORT_ONLY === "1";

export const PERSONAS: Record<string, { name: string; summary: string; profile: Profile }> = {
  A: { name: "Persona A", summary: "Fresher data analyst, Pune, India. Works only in India. Lists NOT complete. Salary in INR (LPA).", profile: PERSONA_A },
  B: { name: "Persona B", summary: "Senior software engineer, Bangalore, India. Remote only. Salary in INR (LPA).", profile: PERSONA_B },
  C: { name: "Persona C", summary: "Marketing manager, Mumbai, India. Onsite, 50% travel. All lists complete. Salary in INR (LPA).", profile: PERSONA_C },
  D: { name: "Persona D", summary: "US citizen, product designer, Austin TX. Hybrid. Salary in USD. Declines race, disability, orientation.", profile: PERSONA_D },
};

export interface BenchField {
  id: string;
  source: string;
  ats: string;
  url: string;
  jobTitle: string;
  jobCountries: string[];
  jobLocation: string;
  index: number;
  descriptor: FieldDescriptor;
}

interface FieldsFile {
  format: string;
  generatedAt: string;
  note: string;
  fingerprint: string;
  sources: Array<{ file: string; ats: string; url: string; jobTitle: string; jobCountries: string[]; jobLocation: string; fields: number }>;
  excluded: Array<{ file: string; reason: string }>;
  fields: BenchField[];
}

/** One human answer. answer: an option / typed value, "ASK" (the extension must ask the user) or "BLANK"
 * (correct is to leave it empty). alts: other values a human accepts as equally correct. */
interface HumanLabel { answer: string; alts?: string[]; note?: string }
interface LabelsFile {
  format: string; labeller?: string; savedAt?: string; fingerprint?: string;
  /** The job's country per source page, as the human read it from the posting (snapshots keep only the form). */
  pageCountries?: Record<string, string[]>;
  labels: Record<string, Record<string, HumanLabel>>;
}

const FILL_KINDS = new Set(["profile", "answer", "work", "draft", "resume"]);

/** What the extension would put on the page, or undefined when it leaves the field to the user. Drafts are shown to
 * the user for approval and are NOT counted as fills. For choice controls the value is passed through the same
 * bestOption() matcher fill.ts uses, so the score is about the option that actually gets selected. */
export function landedValue(d: Decision, f: FieldDescriptor): { value?: string; unmatched?: boolean } {
  if (d.kind === "resume") return { value: "<RESUME>" };
  if (d.kind !== "profile" && d.kind !== "answer" && d.kind !== "work") return {};
  const raw = String(d.value ?? "").trim();
  if (!raw) return {};
  if (f.control === "checkbox") return { value: /^(yes|true|on|1|checked|agree|i agree)\b/i.test(raw) ? "Yes" : "No" };
  if (f.control === "checkbox_group" && f.options.length) {
    const picks = raw.split(/[,;|]/).map((w) => w.trim()).filter(Boolean).map((w) => bestOption(f.options, w));
    if (!picks.length || picks.some((p) => !p)) return { unmatched: true };
    return { value: [...new Set(picks as string[])].sort().join("; ") };
  }
  if ((f.control === "select" || f.control === "radio" || f.control === "dropdown" || f.control === "combobox") && f.options.length) {
    const m = bestOption(f.options, raw);
    return m ? { value: m } : { unmatched: true };
  }
  return { value: raw };
}

function describe_(d: Decision): string {
  switch (d.kind) {
    case "profile": return `profile:${d.key}=${d.value}`;
    case "answer": return `answer=${d.value}`;
    case "work": return `work:${d.part}=${d.value}`;
    case "resume": return "resume";
    case "draft": return `draft=${d.value.slice(0, 80)}`;
    case "ask": return `ask:${d.topic ?? d.reason}`;
    case "skip": return `skip:${d.reason}`;
  }
}

// ---------- statistics ----------

function logChoose(n: number, k: number): number {
  let s = 0;
  for (let i = 1; i <= k; i++) s += Math.log(n - k + i) - Math.log(i);
  return s;
}
function binomCdf(k: number, n: number, p: number): number {
  if (p <= 0) return 1;
  if (p >= 1) return k >= n ? 1 : 0;
  let s = 0;
  for (let i = 0; i <= k; i++) s += Math.exp(logChoose(n, i) + i * Math.log(p) + (n - i) * Math.log(1 - p));
  return Math.min(1, s);
}

/** One-sided 95% Clopper-Pearson upper bound on a rate with k events in n trials (k = 0 gives ~3/n, the rule of three). */
export function upper95(k: number, n: number): number {
  if (n === 0) return 1;
  if (k >= n) return 1;
  let lo = k / n;
  let hi = 1;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (binomCdf(k, n, mid) > 0.05) lo = mid;
    else hi = mid;
  }
  return hi;
}

// ---------- wrong-fill kinds ----------

const YES = /^(yes|y|true|i do|i am|i have|i will|i can|ja|oui|si|sim)\b/;
const NO = /^(no|n|false|i do not|i dont|i am not|i have not|i will not|nein|non|nao)\b/;
const polarity = (s: string) => (YES.test(s) ? "yes" : NO.test(s) ? "no" : undefined);
const CURRENCY = /(usd|\$|inr|rs\.?|₹|lpa|lakh|crore|eur|€|gbp|£|cad|aud|sgd|chf|per annum|per year|per month|per hour|\/yr|\/hr|\/month)/gi;
const UNIT = /\b(days?|weeks?|months?|years?|hours?|hrs?|%|percent)\b/gi;
const tokensOf = (s: string, re: RegExp) => [...new Set((s.match(re) ?? []).map((t) => t.toLowerCase().replace(/s$/, "")))].sort().join(",");

export type WrongKind = "filled_when_ask" | "filled_when_blank" | "yes_no_flip" | "wrong_unit_currency" | "wrong_option" | "wrong_value";

export function wrongKind(got: string, label: HumanLabel, f: FieldDescriptor): WrongKind | undefined {
  if (label.answer === "ASK") return "filled_when_ask";
  if (label.answer === "BLANK") return "filled_when_blank";
  const g = normalize(got);
  const accepted = [label.answer, ...(label.alts ?? [])].map((a) => normalize(a));
  if (accepted.includes(g)) return undefined;
  const want = accepted[0]!;
  const pg = polarity(g);
  const pw = polarity(want);
  if (pg && pw && pg !== pw) return "yes_no_flip";
  if (/\d/.test(g) && /\d/.test(label.answer)) {
    const cg = tokensOf(got, CURRENCY);
    const cw = tokensOf(label.answer, CURRENCY);
    const ug = tokensOf(got, UNIT);
    const uw = tokensOf(label.answer, UNIT);
    if (cg !== cw || ug !== uw) return "wrong_unit_currency";
  }
  if (f.options.length) return "wrong_option";
  return "wrong_value";
}

// ---------- BUILD mode: extract real fields ----------

function corpusFiles(): string[] {
  try {
    return readdirSync(CORPUS).filter((f) => f.endsWith(".html")).sort();
  } catch {
    return [];
  }
}

/** Files in test/corpus that are NOT real: marked with SYNTHETIC comment or generated from scripts/forms-*.mjs. */
function syntheticFiles(): Map<string, string> {
  const map = new Map<string, string>();
  for (const f of readdirSync("scripts").filter((n) => /^forms-.*\.mjs$/.test(n))) {
    for (const m of readFileSync(`scripts/${f}`, "utf8").matchAll(/"([a-z0-9-]+\.html)"\s*:/g)) map.set(m[1]!, `scripts/${f}`);
  }
  for (const file of corpusFiles()) {
    try {
      const top = readFileSync(`${CORPUS}/${file}`, "utf8").slice(0, 80);
      if (top.includes("<!-- SYNTHETIC")) map.set(file, "marked SYNTHETIC");
    } catch {}
  }
  return map;
}

function sourceUrls(): Map<string, string> {
  const map = new Map<string, string>();
  for (const f of readdirSync("reports").filter((n) => /^coverage-.*\.json$/.test(n))) {
    try {
      const j = JSON.parse(readFileSync(`reports/${f}`, "utf8")) as { rows?: Array<{ platform?: string; company?: string; url?: string }> };
      for (const r of j.rows ?? []) {
        if (!r.platform || !r.company || !r.url) continue;
        const name = `${r.platform}-${r.company.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30)}`;
        if (!map.has(name)) map.set(name, r.url);
      }
    } catch {
      // not a coverage report
    }
  }
  return map;
}

/** The location line the page shows (for the human labeller only; the job country itself comes from jobCountries()). */
const LOCATION_LINE = ".job__location, .location, .posting-categories .location, [class*='job-location' i], [class*='jobLocation'], [data-testid*='location' i], [data-automation-id='locations']";

describe.runIf(BUILD)("build reports/value-benchmark/fields.json from real snapshots", () => {
  it("extracts every field with its real options, control, required flag and job country", () => {
    const urls = sourceUrls();
    const synthetic = syntheticFiles();
    const fields: BenchField[] = [];
    const sources: FieldsFile["sources"] = [];
    const excluded: Array<{ file: string; reason: string }> = [];
    for (const file of corpusFiles()) {
      if (synthetic.has(file)) {
        excluded.push({ file: `${CORPUS}/${file}`, reason: `synthetic: generated from ${synthetic.get(file)} by scripts/generate-all.mjs` });
        continue;
      }
      const html = readFileSync(`${CORPUS}/${file}`, "utf8").replace(/^<!--.*?-->\s*/s, "");
      mount(html);
      const base = file.replace(/\.html$/, "");
      const ats = base.split("-")[0]!;
      const countries = jobCountries(document);
      const jobLocation = (document.querySelector(LOCATION_LINE)?.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 200);
      const jobTitle = (document.querySelector("h1")?.textContent ?? "").trim();
      const url = urls.get(base) ?? "";
      const seen = new Map<string, number>();
      const extracted = extractFields(document.body);
      extracted.forEach((x, index) => {
        const d = x.descriptor;
        const sig = [d.name, d.label, d.control, d.section ?? "", d.workBlock ?? ""].join("|");
        const h = createHash("sha1").update(sig).digest("hex").slice(0, 8);
        const n = (seen.get(h) ?? 0) + 1;
        seen.set(h, n);
        fields.push({
          id: `${base}::${h}${n > 1 ? `~${n}` : ""}`,
          source: `${CORPUS}/${file}`, ats, url, jobTitle, jobCountries: countries, jobLocation, index,
          descriptor: { ...d, key: `${base}::${h}${n > 1 ? `~${n}` : ""}` },
        });
      });
      sources.push({ file: `${CORPUS}/${file}`, ats, url, jobTitle, jobCountries: countries, jobLocation, fields: extracted.length });
    }
    const fingerprint = createHash("sha1").update(fields.map((f) => f.id).join("\n")).digest("hex").slice(0, 12);
    const out: FieldsFile = {
      format: "applyagent-value-fields/1",
      generatedAt: new Date().toISOString(),
      note: "Fields as the extension's extractFields() reads the saved real forms in test/corpus. Options are the real ones on the page. jobCountries comes from jobCountries() on the snapshot (empty = unknown).",
      fingerprint, sources, excluded, fields,
    };
    mkdirSync(OUT, { recursive: true });
    writeFileSync(`${OUT}/fields.json`, JSON.stringify(out, null, 1));
    const csvCell = (s: string) => `"${s.replace(/"/g, '""')}"`;
    writeFileSync(`${OUT}/fields.csv`, ["id,ats,source,jobCountries,control,required,label,options",
      ...fields.map((f) => [f.id, f.ats, f.source, f.jobCountries.join("|"), f.descriptor.control, f.descriptor.required ? "yes" : "no",
        f.descriptor.label, f.descriptor.options.join(" | ")].map((c) => csvCell(String(c))).join(","))].join("\n") + "\n");
    writeFileSync(`${OUT}/personas.json`, JSON.stringify({
      format: "applyagent-personas/1",
      note: "Frozen personas from test/personas/*.ts. Label the value THIS person would truthfully give.",
      personas: Object.fromEntries(Object.entries(PERSONAS).map(([id, p]) => [id, { name: p.name, summary: p.summary, profile: p.profile }])),
    }, null, 1));
    const byAts: Record<string, number> = {};
    for (const f of fields) byAts[f.ats] = (byAts[f.ats] ?? 0) + 1;
    console.log(`value benchmark: ${fields.length} fields from ${sources.length} real snapshots (${excluded.length} synthetic excluded)`, byAts,
      `job country known on ${sources.filter((s) => s.jobCountries.length).length}/${sources.length} pages`);
    expect(fields.length).toBeGreaterThan(0);
  });
});

// ---------- default mode: run the extension and score ----------

describe.skipIf(BUILD)("value benchmark (real fields x 4 frozen personas, human labels)", () => {
  const fieldsPath = `${OUT}/fields.json`;
  const labelsPath = `${OUT}/labels-human.json`;

  it("has fields.json (run: node scripts/build-value-benchmark.mjs)", () => {
    expect(existsSync(fieldsPath), `${fieldsPath} missing: run node scripts/build-value-benchmark.mjs`).toBe(true);
  });
  if (!existsSync(fieldsPath)) return;

  const bench = JSON.parse(readFileSync(fieldsPath, "utf8")) as FieldsFile;
  const haveLabels = existsSync(labelsPath);
  const labels = haveLabels ? (JSON.parse(readFileSync(labelsPath, "utf8")) as LabelsFile) : undefined;
  /** The page's job country: the human's reading of the posting when given, else what jobCountries() found on the
   * snapshot (usually nothing, because the saved snapshot keeps only the form). */
  const countriesOf = (f: BenchField) => labels?.pageCountries?.[f.source] ?? f.jobCountries;
  const oof = new Map(
    (JSON.parse(readFileSync("reports/oof.json", "utf8")) as Array<{ text: string; guess: string; confidence: number }>)
      .map((o) => [o.text, { intent: o.guess, confidence: o.confidence } as Meaning]),
  );
  const engines = {
    decide: (f: BenchField, p: Profile) => decide(f.descriptor, p, [], { jobCountries: countriesOf(f), url: f.url }),
    // decideWithMeaning(field, profile, answers, page, meaning): page facts 4th, the model's reading 5th.
    decideWithMeaning: (f: BenchField, p: Profile) =>
      decideWithMeaning(f.descriptor, p, [], { jobCountries: countriesOf(f), url: f.url }, oof.get(f.descriptor.label)),
  };

  // Run everything once; crashes are recorded, not thrown, so one bad field does not hide the rest.
  const runs: Record<string, Record<string, Record<string, { d?: Decision; error?: string }>>> = {};
  for (const f of bench.fields) {
    runs[f.id] = {};
    for (const [pid, p] of Object.entries(PERSONAS)) {
      runs[f.id]![pid] = {};
      for (const [ename, run] of Object.entries(engines)) {
        try {
          runs[f.id]![pid]![ename] = { d: run(f, p.profile) };
        } catch (e) {
          runs[f.id]![pid]![ename] = { error: String((e as Error)?.stack ?? e) };
        }
      }
    }
  }

  // Predictions for the labelling page's after-answer review.
  const predictions: Record<string, Record<string, Record<string, string>>> = {};
  for (const f of bench.fields) {
    predictions[f.id] = {};
    for (const pid of Object.keys(PERSONAS)) {
      predictions[f.id]![pid] = {};
      for (const ename of Object.keys(engines)) {
        const r = runs[f.id]![pid]![ename]!;
        const lv = r.d ? landedValue(r.d, f.descriptor) : {};
        predictions[f.id]![pid]![ename] = r.error ? "CRASH" : lv.value ?? (lv.unmatched ? `ASK (no option matched: ${describe_(r.d!)})` : `ASK (${describe_(r.d!)})`);
      }
    }
  }
  mkdirSync(OUT, { recursive: true });
  writeFileSync(`${OUT}/predictions.json`, JSON.stringify({ format: "applyagent-predictions/1", fingerprint: bench.fingerprint, predictions }, null, 1));

  it("never crashes on a real field", () => {
    const crashes = bench.fields.flatMap((f) => Object.entries(runs[f.id]!).flatMap(([pid, e]) =>
      Object.entries(e).filter(([, r]) => r.error).map(([ename, r]) => `${f.id} ${pid} ${ename}: ${r.error!.split("\n")[0]}`)));
    expect(crashes).toEqual([]);
  });

  it("never fills an identity, secret or signature field", () => {
    const bad: string[] = [];
    for (const f of bench.fields) {
      const topic = sensitiveTopic(f.descriptor);
      if (!(isSecretField(f.descriptor) || topic === "identity" || topic === "signature")) continue;
      for (const [pid, e] of Object.entries(runs[f.id]!)) {
        for (const [ename, r] of Object.entries(e)) if (r.d && FILL_KINDS.has(r.d.kind) && r.d.kind !== "resume") bad.push(`${f.id} ${pid} ${ename}: ${describe_(r.d)} :: ${f.descriptor.label}`);
      }
    }
    expect(bad).toEqual([]);
  });

  const files = corpusFiles();
  it.skipIf(!files.length)("hidden fields and spam traps planted on every real page are never read as fields", () => {
    const TRAPS = `<div hidden><input type="text" name="vb_trap_hidden_attr" aria-label="Email"></div>
      <input type="hidden" name="vb_trap_type_hidden" value="">
      <div aria-hidden="true"><input type="text" name="vb_trap_aria" aria-label="Phone"></div>
      <label for="vb_trap_words">Leave this field blank</label><input type="text" id="vb_trap_words" name="vb_trap_words">
      <input type="text" name="website_hp" aria-label="Website" style="display:none">
      <div style="opacity:0"><input type="text" name="vb_trap_opacity" aria-label="First name"></div>`;
    const leaked: string[] = [];
    for (const file of files) {
      const html = readFileSync(`${CORPUS}/${file}`, "utf8").replace(/^<!--.*?-->\s*/s, "");
      mount(html.replace(/<\/form>/i, `${TRAPS}</form>`) + (/<\/form>/i.test(html) ? "" : TRAPS));
      for (const x of extractFields(document.body)) if (/vb_trap|website_hp/.test(x.descriptor.name)) leaked.push(`${file}: ${x.descriptor.name}`);
    }
    expect(leaked).toEqual([]);
  });

  if (!labels) {
    it("awaiting human labels", () => {
      console.log(`[value-benchmark] awaiting human labels: ${labelsPath} not found. Only crash/safety checks ran; ` +
        `NO accuracy is claimed. Label with scripts/label-values.html (see reports/BENCHMARK.md). ` +
        `${bench.fields.length} fields x ${Object.keys(PERSONAS).length} personas.`);
    });
    return;
  }

  for (const ename of Object.keys(engines)) {
    it(`${ename}: value-level score against human labels`, () => {
      const t = { labelled: 0, filled: 0, correct: 0, ask: 0, unmatchedOption: 0, draft: 0, wrong: 0 };
      const kinds: Record<WrongKind, number> = { filled_when_ask: 0, filled_when_blank: 0, yes_no_flip: 0, wrong_unit_currency: 0, wrong_option: 0, wrong_value: 0 };
      const wrongList: string[] = [];
      const byAts: Record<string, { labelled: number; filled: number; wrong: number }> = {};
      const fillable = { labelled: 0, filled: 0 };
      for (const f of bench.fields) {
        for (const pid of Object.keys(PERSONAS)) {
          const label = labels.labels[f.id]?.[pid];
          if (!label) continue;
          const d = runs[f.id]![pid]![ename]!.d!;
          t.labelled++;
          const a = (byAts[f.ats] ??= { labelled: 0, filled: 0, wrong: 0 });
          a.labelled++;
          if (label.answer !== "ASK" && label.answer !== "BLANK") fillable.labelled++;
          const lv = landedValue(d, f.descriptor);
          if (lv.value === undefined) {
            if (d.kind === "draft") t.draft++;
            else if (lv.unmatched) t.unmatchedOption++;
            else t.ask++;
            continue;
          }
          t.filled++;
          a.filled++;
          const k = wrongKind(lv.value, label, f.descriptor);
          if (!k) {
            t.correct++;
            if (label.answer !== "ASK" && label.answer !== "BLANK") fillable.filled++;
            continue;
          }
          t.wrong++;
          a.wrong++;
          kinds[k]++;
          wrongList.push(`[${k}] ${pid} ${f.id}: got "${lv.value}" want "${label.answer}" :: ${f.descriptor.label}`);
        }
      }
      const ub = upper95(t.wrong, t.filled);
      const result = {
        engine: ename,
        fieldsFingerprint: bench.fingerprint,
        labelsFingerprint: labels.fingerprint,
        labelled: t.labelled,
        filled: t.filled,
        correct: t.correct,
        askedUser: t.ask + t.unmatchedOption + t.draft,
        askBreakdown: { ask: t.ask, noOptionMatched: t.unmatchedOption, draftForApproval: t.draft },
        wrong: t.wrong,
        wrongByKind: kinds,
        wrongRate: t.filled ? t.wrong / t.filled : 0,
        wrongRateUpper95: ub,
        automationOfAnswerable: fillable.labelled ? fillable.filled / fillable.labelled : 0,
        byAts,
        wrongList,
      };
      writeFileSync(`${OUT}/results-${ename}.json`, JSON.stringify(result, null, 1));
      console.log(`[value-benchmark ${ename}] labelled ${t.labelled}, filled ${t.filled}, correct ${t.correct}, asked ${result.askedUser}, ` +
        `WRONG ${t.wrong} (95% upper bound on wrong rate ${(ub * 100).toFixed(2)}%)`, kinds);
      if (wrongList.length) console.error(wrongList.slice(0, 30).join("\n"));
      if (labels.fingerprint && labels.fingerprint !== bench.fingerprint) {
        console.warn(`[value-benchmark] labels were made against fields fingerprint ${labels.fingerprint}, fields.json is ${bench.fingerprint}: unmatched ids are ignored.`);
      }
      if (!REPORT_ONLY) expect(wrongList, "value-level wrong fills").toEqual([]);
    });
  }
});

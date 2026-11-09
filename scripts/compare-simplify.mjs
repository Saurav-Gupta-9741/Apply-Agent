// ApplyAgent vs Simplify on the SAME live application forms (reports/compare/jobs-60.json).
// ApplyAgent: its live-run rows (reports/live1000/results-*.jsonl). Simplify: reports/compare/simplify-60.jsonl.
// Both runs: employer pages may only read; nothing submitted. Writes reports/compare/COMPARE.md.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
const rows = (f) => (existsSync(f) ? readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);
const last = (list) => { const m = new Map(); for (const r of list) m.set(r.url, r); return m; };
const jobs = JSON.parse(readFileSync("reports/compare/jobs-60.json", "utf8"));
// The newest run of each form wins: round 6 re-ran every Breezy form after the work-history change.
const aa = last([...rows("reports/live1000/results-a.jsonl"), ...rows("reports/live1000/results-b.jsonl"),
  ...rows("reports/live1000/round6/results-r6-a.jsonl"), ...rows("reports/live1000/round6/results-r6-b.jsonl")]);
const sp = last(rows("reports/compare/simplify-60.jsonl"));
const SENSITIVE = [
  ["work authorization", /authori[sz]ed to work|right to work|eligible to work|legally (authorized|able)/i],
  ["sponsorship", /sponsor|visa/i],
  ["salary", /salary|compensation|ctc|pay expectation/i],
  ["EEO (gender/race/veteran/disability)", /\bgender\b|\brace\b|ethnic|hispanic|veteran|disabilit/i],
  ["consent / attestation", /\b(i (agree|acknowledge|consent|certify|confirm)|privacy|terms|attest)/i],
];
const ESSAY = /why|describe|tell us|explain|cover letter|additional information|anything else/i;
const filledSp = (f) => !!f.value && !f.before;
const tally = { forms: 0, both: 0, aa: { filled: 0, reqLeft: 0, req: 0, time: [] }, sp: { filled: 0, reqLeft: 0, req: 0, time: [] }, sens: {}, essays: { aa: 0, sp: 0 } };
const perForm = [];
for (const j of jobs) {
  const a = aa.get(j.url), s = sp.get(j.url);
  tally.forms++;
  if (a?.outcome !== "filled" || s?.outcome !== "filled") { perForm.push(`| ${j.platform}:${j.company} | ${a?.outcome ?? "not run yet"} | ${s?.outcome ?? "not run yet"} | | | | |`); continue; }
  tally.both++;
  const af = a.fields ?? [], sf = s.fields ?? [];
  const aFilled = af.filter((f) => f.status === "filled").length;
  const aReq = af.filter((f) => f.required), aReqLeft = aReq.filter((f) => f.status !== "filled").length;
  const sFilled = sf.filter(filledSp).length;
  const sReq = sf.filter((f) => f.required && f.type !== "radio" && f.type !== "checkbox"), sReqLeft = sReq.filter((f) => !f.value).length;
  tally.aa.filled += aFilled; tally.aa.req += aReq.length; tally.aa.reqLeft += aReqLeft; tally.aa.time.push(a.seconds ?? 0);
  tally.sp.filled += sFilled; tally.sp.req += sReq.length; tally.sp.reqLeft += sReqLeft; tally.sp.time.push(s.fillSeconds ?? 0);
  for (const [name, re] of SENSITIVE) {
    const t = (tally.sens[name] ??= { asked: 0, aaFilled: 0, spFilled: 0, aaAsked: 0 });
    const aHit = af.filter((f) => re.test(f.label)); const sHit = sf.filter((f) => re.test(f.label));
    t.asked += Math.max(aHit.length, sHit.length);
    t.aaFilled += aHit.filter((f) => f.status === "filled").length;
    t.aaAsked += aHit.filter((f) => f.status !== "filled").length;
    t.spFilled += sHit.filter(filledSp).length;
  }
  tally.essays.aa += af.filter((f) => f.control === "textarea" && ESSAY.test(f.label) && f.status === "filled").length;
  tally.essays.sp += sf.filter((f) => f.tag === "textarea" && ESSAY.test(f.label) && filledSp(f)).length;
  perForm.push(`| ${j.platform}:${j.company} | ${aFilled} filled, ${aReqLeft}/${aReq.length} required left | ${sFilled} filled, ${sReqLeft}/${sReq.length} required left | ${a.seconds ?? "?"} s | ${s.fillSeconds ?? "?"} s | | |`);
}
const med = (x) => { const v = [...x].sort((p, q) => p - q); return v.length ? v[Math.floor(v.length / 2)] : 0; };
const pct = (n, d) => (d ? `${((n / d) * 100).toFixed(1)}%` : "–");
const md = ["# ApplyAgent vs Simplify on the same live application forms", "",
  `Forms: ${tally.forms} chosen (10 per portal); compared where both reached the form: **${tally.both}**. Employer pages could only read; nothing was submitted. ApplyAgent: fictional candidate with Quick answers. Simplify: the user's own Simplify profile (50% complete).`, "",
  "| | ApplyAgent | Simplify |", "|---|---|---|",
  `| Fields filled (total) | ${tally.aa.filled} | ${tally.sp.filled} |`,
  `| Required fields left empty | ${tally.aa.reqLeft} of ${tally.aa.req} (${pct(tally.aa.reqLeft, tally.aa.req)}) | ${tally.sp.reqLeft} of ${tally.sp.req} (${pct(tally.sp.reqLeft, tally.sp.req)}) |`,
  `| Median time per form | ${med(tally.aa.time)} s (open + fill) | ${med(tally.sp.time)} s (fill only) |`,
  `| Essay boxes filled | ${tally.essays.aa} (only with the user's click; never on its own) | ${tally.essays.sp} (cloud AI) |`, "",
  "## Sensitive questions", "", "| Question kind | Seen | ApplyAgent filled | ApplyAgent left for the user | Simplify filled |", "|---|---|---|---|---|",
  ...Object.entries(tally.sens).map(([k, t]) => `| ${k} | ${t.asked} | ${t.aaFilled} | ${t.aaAsked} | ${t.spFilled} |`), "",
  "## Per form", "", "| Form | ApplyAgent | Simplify | ApplyAgent time | Simplify fill time | | |", "|---|---|---|---|---|---|---|", ...perForm];
writeFileSync("reports/compare/COMPARE.md", md.join("\n") + "\n");
console.log(md.slice(0, 22).join("\n"));

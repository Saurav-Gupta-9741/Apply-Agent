// Per-form behaviour log of a live read-only coverage run: what ApplyAgent filled, what it asks, which boxes get an AI
// draft, the employer's AI rule, planted AI tests and length limits. Usage:
//   npx tsx scripts/live-forms-log.mts reports/coverage-<list>.json   → reports/live-forms-log.md
import { readFileSync, writeFileSync } from "node:fs";
import { aiPolicyOfForm, aiTrapOf, draftsForbidden } from "../src/shared/ai-policy.ts";
import { lengthLimit } from "../src/shared/length-limit.ts";
import { isDraftableField } from "../src/sidepanel/drafts.ts";

type F = { label: string; hint?: string; control: string; required: boolean; options: number; decision: string; status: string };
type Row = { company: string; url: string; outcome: string; untouched?: boolean; changed?: string[]; fields?: F[]; error?: string };
const file = process.argv[2] ?? "reports/coverage-coverage-essay-round-jobs.json";
const { rows } = JSON.parse(readFileSync(file, "utf8")) as { rows: Row[] };
const lines: string[] = [`# Live forms behaviour log`, ``, `Source: \`${file}\` (read-only: nothing typed, uploaded or submitted).`, ``,
  `| Company | Outcome | Fields | Would fill | Asks user | Essay boxes (draft offered) | AI rule | AI traps | Length limits | Page untouched |`,
  `|---|---|---|---|---|---|---|---|---|---|`];
const totals = { forms: 0, fields: 0, fill: 0, ask: 0, essays: 0, drafts: 0, touched: 0 };
const notes: string[] = [];
for (const r of rows) {
  if (r.outcome !== "form" || !r.fields) { lines.push(`| ${r.company} | ${r.outcome}${r.error ? `: ${r.error.slice(0, 60)}` : ""} | | | | | | | | |`); continue; }
  const fs = r.fields;
  const rule = aiPolicyOfForm(fs.map((f) => `${f.label} ${f.hint ?? ""}`));
  const essays = fs.filter((f) => isDraftableField({ control: f.control, label: f.label, options: f.options ? ["x"] : [] }));
  const traps = essays.filter((f) => aiTrapOf(`${f.label} ${f.hint ?? ""}`));
  const drafts = draftsForbidden(rule) ? [] : essays.filter((f) => !traps.includes(f));
  const limits = essays.map((f) => lengthLimit(`${f.label} ${f.hint ?? ""}`)).filter(Boolean).length;
  const fill = fs.filter((f) => /^(profile|work|answer|resume)/.test(f.decision)).length;
  const ask = fs.filter((f) => /^ask/.test(f.decision)).length;
  totals.forms++; totals.fields += fs.length; totals.fill += fill; totals.ask += ask; totals.essays += essays.length; totals.drafts += drafts.length;
  if (!r.untouched) { totals.touched++; notes.push(`- ${r.company}: fields changed while reading: ${r.changed?.join(", ")}`); }
  for (const f of essays) notes.push(`- ${r.company}: essay "${f.label.slice(0, 90)}"${traps.includes(f) ? " — AI TRAP, no draft" : draftsForbidden(rule) ? " — employer bans AI, no draft" : " — draft offered"}`);
  lines.push(`| ${r.company} | form | ${fs.length} | ${fill} | ${ask} | ${essays.length} (${drafts.length}) | ${rule ? rule.kind : "–"} | ${traps.length || "–"} | ${limits || "–"} | ${r.untouched ? "yes" : "**NO**"} |`);
}
lines.push(``, `**Totals:** ${totals.forms} forms read, ${totals.fields} fields, ${totals.fill} would be filled, ${totals.ask} asked to the user, ${totals.essays} essay boxes, ${totals.drafts} with an AI draft offered, ${totals.touched} pages changed while reading (must be 0).`, ``, `## Details`, ...notes);
writeFileSync("reports/live-forms-log.md", lines.join("\n") + "\n");
console.log(lines.slice(4).join("\n"));

// Merges every reports/coverage-*.json (written by e2e/coverage.spec.ts) into reports/coverage.md.
//   node scripts/coverage-report.mjs
import { readdirSync, readFileSync, writeFileSync } from "node:fs";

const rows = readdirSync("reports").filter((f) => /^coverage-.+\.json$/.test(f))
  .flatMap((f) => JSON.parse(readFileSync(`reports/${f}`, "utf8")).rows);

const forms = rows.filter((r) => r.outcome === "form");
const fields = forms.flatMap((r) => r.fields.map((f) => ({ ...f, platform: r.platform })));
const auto = (d) => /^(profile|work|answer|resume)/.test(d);
const pct = (n, of) => (of ? `${Math.round((100 * n) / of)}%` : "–");
const count = (items) => [...items.reduce((m, k) => m.set(k, (m.get(k) ?? 0) + 1), new Map())].sort((a, b) => b[1] - a[1]);

const lines = [
  `# Real-form coverage (${new Date().toISOString().slice(0, 10)})`, "",
  `Read-only scan of ${rows.length} real job pages, one per company. Nothing was typed, uploaded or submitted, and a check`,
  `confirmed no field on any page changed${rows.some((r) => r.untouched === false) ? " — EXCEPT the pages listed below" : ""}.`, "",
  "| Platform | Pages | Forms read | Closed | Robot check | No form / error | Fields | Filled automatically | Asked (required) | Left blank (optional) |",
  "|---|---|---|---|---|---|---|---|---|---|",
];
const platforms = [...new Set(rows.map((r) => r.platform))];
for (const platform of [...platforms, "all"]) {
  const rs = platform === "all" ? rows : rows.filter((r) => r.platform === platform);
  const fs = platform === "all" ? fields : fields.filter((f) => f.platform === platform);
  const label = platform === "all" ? "**All**" : platform;
  lines.push(`| ${label} | ${rs.length} | ${rs.filter((r) => r.outcome === "form").length} | ${rs.filter((r) => r.outcome === "closed").length} | ${rs.filter((r) => r.outcome === "robot_check").length} | ${rs.filter((r) => r.outcome === "no_form" || r.outcome === "error").length} | ${fs.length} | ${pct(fs.filter((f) => auto(f.decision)).length, fs.length)} | ${pct(fs.filter((f) => f.decision.startsWith("ask")).length, fs.length)} | ${pct(fs.filter((f) => f.decision.startsWith("skip")).length, fs.length)} |`);
}
const changed = rows.filter((r) => r.untouched === false);
if (changed.length) lines.push("", "## Pages where a field changed during the scan (must be none)", "", ...changed.map((r) => `- ${r.url}`));
lines.push("", "## Questions asked most often (required, not in the profile)", "");
for (const [k, n] of count(fields.filter((f) => f.decision.startsWith("ask")).map((f) => `${f.label} — ${f.decision}`)).slice(0, 60)) lines.push(`- ${n}× ${k}`);
lines.push("", "## Every profile and work-history mapping (check for wrong ones)", "");
for (const [k, n] of count(fields.filter((f) => /^(profile|work)/.test(f.decision)).map((f) => `${f.decision} ← "${f.label}"${f.section ? ` [${f.section}]` : ""}`))) lines.push(`- ${n}× ${k}`);
lines.push("", "## Controls seen", "");
for (const [k, n] of count(fields.map((f) => f.control))) lines.push(`- ${n}× ${k}`);
lines.push("", "## Forms without a recognised email or name", "");
for (const r of forms) {
  const ds = r.fields.map((f) => f.decision);
  if (!ds.includes("profile:email") || !ds.some((d) => d === "profile:firstName" || d === "profile:fullName")) lines.push(`- ${r.platform} · ${r.company} · ${r.url}`);
}
lines.push("", "## Pages without a form", "");
for (const r of rows.filter((x) => x.outcome !== "form")) lines.push(`- ${r.outcome} · ${r.platform} · ${r.company} · ${r.url}${r.error ? ` · ${r.error}` : ""}`);
lines.push("", "## Unlabelled fields", "");
for (const r of forms) for (const f of r.fields.filter((x) => !x.label)) lines.push(`- ${r.platform} · ${r.company}: ${f.control}${f.required ? " (required)" : ""}`);
writeFileSync("reports/coverage.md", `${lines.join("\n")}\n`);
console.log(`reports/coverage.md: ${rows.length} pages, ${forms.length} forms, ${fields.length} fields`);

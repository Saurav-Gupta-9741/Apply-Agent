// Round 7: turns reports/round7/gh-raw.jsonl (Greenhouse public API) into unique questions to label, with their real
// options, how many jobs and boards ask them, and the job languages. Questions labelled in earlier rounds are left out.
//   node scripts/round7-extract.mjs        → reports/round7/questions.json
import { readFileSync, readdirSync, writeFileSync } from "node:fs";

const CONTROL = {
  input_text: "text", textarea: "textarea", multi_value_single_select: "select", multi_value_multi_select: "checkbox_group",
  input_file: "file", boolean: "select",
};
const known = new Set(readdirSync("reports").filter((f) => /^labels(-[\w-]+)?\.json$/.test(f))
  .flatMap((f) => JSON.parse(readFileSync(`reports/${f}`, "utf8")).map((l) => l.label.trim().toLowerCase())));

const byKey = new Map();
for (const line of readFileSync("reports/round7/gh-raw.jsonl", "utf8").split("\n")) {
  if (!line.trim()) continue;
  const row = JSON.parse(line);
  if (row.missing) continue;
  for (const job of row.jobs) {
    for (const q of job.questions) {
      const field = q.fields.find((f) => f.type !== "input_hidden");
      if (!field || !q.label) continue;
      const control = CONTROL[field.type] ?? "text";
      const options = field.options ?? [];
      const label = q.label.replace(/\s+/g, " ").trim();
      // The same wording with the same kind of answer is one question; options may differ a little between jobs.
      const key = `${label.toLowerCase()}|${control}`;
      let item = byKey.get(key);
      if (!item) {
        item = { label, description: q.description, control, options, required: q.required, group: q.group, fieldName: field.name,
          jobs: 0, boards: new Set(), languages: new Set(), locations: new Set(), known: known.has(label.toLowerCase()) };
        byKey.set(key, item);
      }
      item.jobs++;
      item.boards.add(row.board);
      if (job.language) item.languages.add(job.language);
      if (job.location) item.locations.add(job.location);
      if (options.length > item.options.length) item.options = options;
    }
  }
}
const all = [...byKey.values()].map((q) => ({ ...q, boards: [...q.boards], languages: [...q.languages], locations: [...q.locations].slice(0, 5) }));
const fresh = all.filter((q) => !q.known).sort((a, b) => b.boards.length - a.boards.length || a.label.localeCompare(b.label));
fresh.forEach((q, i) => (q.i = i));
writeFileSync("reports/round7/questions.json", JSON.stringify(fresh, null, 1));
const langs = {};
for (const q of all) for (const l of q.languages) langs[l] = (langs[l] ?? 0) + 1;
console.log(`${all.length} unique questions, ${all.length - fresh.length} already labelled, ${fresh.length} new → reports/round7/questions.json`);
console.log("languages:", JSON.stringify(langs));

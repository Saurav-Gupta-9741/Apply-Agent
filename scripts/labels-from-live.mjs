// Labels from the live runs: every filled field the audit judged correct (rules or a hand judgment) says what its question
// means. Only wordings not yet in reports/labels*.json, only meanings the model already knows.
//   node scripts/labels-from-live.mjs <audit dirs...>   -> reports/labels-live.json
import { readdirSync, readFileSync, writeFileSync } from "node:fs";

const dirs = process.argv.slice(2);
const known = new Map();
for (const f of readdirSync("reports").filter((f) => /^labels(-[\w-]+)?\.json$/.test(f) && f !== "labels-live.json")) {
  for (const l of JSON.parse(readFileSync(`reports/${f}`, "utf8"))) known.set(l.label.trim().toLowerCase(), l.intent);
}
const intents = new Set(known.values());
const PROFILE = { firstName: "firstName", lastName: "lastName", fullName: "fullName", email: "email", phone: "phone", location: "location",
  country: "country", linkedin: "linkedin", github: "github", portfolio: "portfolio", currentCompany: "currentCompany", currentTitle: "currentTitle",
  school: "school", degree: "degree", discipline: "discipline", graduationYear: "graduationYear", experienceYears: "experienceYears",
  state: "state", postalCode: "postal_code", address: "address", addressLine1: "address" };
const ANSWER = [[/work authorization/, "work_authorization"], [/sponsorship/, "sponsorship"], [/notice period|start immediately/, "notice_period"],
  [/relocation/, "relocation"], [/how you heard/, "heard_about"], [/expected (ctc|salary)|salary abroad/, "salary_expected"], [/current ctc/, "salary_current"],
  [/previous employer/, "previous_employee"], [/onsite/, "onsite"], [/travel/, "travel"], [/over 18/, "age"], [/accommodation/, "accommodation"],
  [/gender/, "gender"], [/race/, "race"], [/hispanic/, "hispanic"], [/veteran/, "veteran"], [/disability/, "disability"]];
const out = new Map();
for (const dir of dirs) {
  const a = JSON.parse(readFileSync(`${dir}/audit.json`, "utf8"));
  const rows = Array.isArray(a) ? a : Object.values(a).find(Array.isArray);
  for (const r of rows) {
    if (r.verdict !== "correct" || !r.label || r.label.length > 300) continue;
    let intent;
    if (r.decision === "profile") intent = PROFILE[r.key];
    else if (r.decision === "answer") intent = ANSWER.find(([re]) => re.test(String(r.matched ?? "").toLowerCase()))?.[1];
    if (!intent || !intents.has(intent)) continue;
    const k = r.label.trim().toLowerCase();
    if (known.has(k) || out.has(k)) continue;
    out.set(k, { label: r.label.trim(), control: r.control, rule: `live:${r.decision}`, intent, source: dir.split("/").pop() });
  }
}
const list = [...out.values()];
writeFileSync("reports/labels-live.json", JSON.stringify(list, null, 1));
const by = {};
for (const l of list) by[l.intent] = (by[l.intent] ?? 0) + 1;
console.log(`${list.length} new labelled wordings`, by);

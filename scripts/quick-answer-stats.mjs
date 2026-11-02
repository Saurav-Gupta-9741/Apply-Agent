#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

const coverageFiles = [
  "coverage-extra-jobs.json",
  "coverage-round2-jobs.json",
  "coverage-round3-jobs.json",
  "coverage-round4-jobs.json",
  "coverage-round5-jobs.json",
];

const labelFiles = [
  "labels.json",
  "labels-round2.json",
  "labels-round3.json",
  "labels-round4.json",
  "labels-round5.json",
];

const labelMap = new Map();
for (const f of labelFiles) {
  const filePath = path.join(root, "reports", f);
  if (!fs.existsSync(filePath)) continue;
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  for (const item of data) {
    if (item.label && item.intent) {
      labelMap.set(item.label.trim().toLowerCase(), item.intent);
    }
  }
}

let totalJobs = 0;
const intentJobCount = {};

for (const cf of coverageFiles) {
  const filePath = path.join(root, "reports", cf);
  if (!fs.existsSync(filePath)) continue;
  const cov = JSON.parse(fs.readFileSync(filePath, "utf8"));
  for (const row of cov.rows || []) {
    totalJobs++;
    const formIntents = new Set();
    for (const fld of row.fields || []) {
      const intent = labelMap.get((fld.label || "").trim().toLowerCase());
      if (intent) formIntents.add(intent);
    }
    for (const it of formIntents) {
      intentJobCount[it] = (intentJobCount[it] || 0) + 1;
    }
  }
}

const idToIntent = {
  workCountries: "work_authorization",
  needsFutureSponsorship: "sponsorship",
  noticePeriod: "notice_period",
  expectedCtc: "salary_expected",
  over18: "age",
  heardFrom: "heard_about",
  topSkills: "skills_experience",
  linkedin: "linkedin",
  portfolio: "portfolio",
  github: "github",
  gender: "gender",
  veteran: "veteran",
  hispanic: "hispanic",
  race: "race",
  disability: "disability",
  pronouns: "pronouns",
  relocate: "relocation",
  preferredLocations: "location",
  workMode: "onsite",
  travel: "travel",
  highestDegree: "education_level",
  graduationYear: "graduationYear",
  experienceYears: "experienceYears",
  languages: "language_proficiency",
  currentCtc: "salary_current",
};

const result = {
  totalForms: totalJobs,
  generatedAt: new Date().toISOString(),
  travelPercentOptions: ["0%", "10%", "25%", "50%", "75%+"],
  byIntent: {},
  stats: {},
};

for (const [it, count] of Object.entries(intentJobCount)) {
  result.byIntent[it] = {
    count,
    percent: Math.round((count / totalJobs) * 100),
    share: count / totalJobs,
  };
}

for (const [id, intent] of Object.entries(idToIntent)) {
  const data = result.byIntent[intent] || { count: 0, percent: 0, share: 0 };
  result.stats[id] = {
    intent,
    count: data.count,
    percent: data.percent,
    why: data.percent > 0 ? `Asked on ${data.percent}% of ${totalJobs} real forms we checked` : "Most forms ask this",
  };
}

const outPath = path.join(root, "src", "shared", "quick-answer-stats.json");
fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + "\n", "utf8");
console.log(`Generated quick-answer-stats.json across ${totalJobs} real forms.`);

import { readFileSync, writeFileSync, existsSync } from "node:fs";

const coveragePath = "reports/coverage-round5-jobs.json";
if (!existsSync(coveragePath)) {
  console.error("Coverage file not found:", coveragePath);
  process.exit(1);
}

const coverage = JSON.parse(readFileSync(coveragePath, "utf8"));

// Collect existing labels from earlier rounds
const prevLabels = new Set();
for (const f of ["reports/labels.json", "reports/labels-round2.json", "reports/labels-round3.json", "reports/labels-round4.json"]) {
  if (existsSync(f)) {
    const list = JSON.parse(readFileSync(f, "utf8"));
    for (const item of list) {
      if (item.label) prevLabels.add(item.label.trim().toLowerCase());
    }
  }
}

console.log(`Found ${prevLabels.size} unique previously-labeled questions across rounds 1-4.`);

const questions = [];
const seenInRound5 = new Set();

for (const row of coverage.rows) {
  if (row.outcome !== "form" || !row.fields) continue;
  for (const f of row.fields) {
    const rawLabel = (f.label ?? "").trim();
    if (!rawLabel) continue;
    const lower = rawLabel.toLowerCase();
    if (prevLabels.has(lower)) continue;
    if (seenInRound5.has(lower)) continue;
    seenInRound5.add(lower);

    questions.push({
      i: questions.length,
      label: rawLabel,
      control: f.control,
      rule: f.decision ?? "ask:unknown",
      platform: row.platform,
      intent: "" // to be hand-labeled
    });
  }
}

console.log(`Extracted ${questions.length} new unseen questions from round 5.`);
writeFileSync("reports/labels-round5-extracted.json", JSON.stringify(questions, null, 2), "utf8");

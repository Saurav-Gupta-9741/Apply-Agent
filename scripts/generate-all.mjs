import { writeFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { workdayForms } from "./forms-workday.mjs";
import { enterpriseForms } from "./forms-enterprise.mjs";
import { modernForms } from "./forms-modern.mjs";
import { regionalForms } from "./forms-regional.mjs";

const CORPUS_DIR = resolve("test/corpus");

const allNewForms = {
  ...workdayForms,
  ...enterpriseForms,
  ...modernForms,
  ...regionalForms,
};

const newFormKeys = Object.keys(allNewForms);
console.log(`Generated forms count: ${newFormKeys.length}`);

const existingFiles = readdirSync(CORPUS_DIR).filter(f => f.endsWith(".html"));
console.log(`Existing corpus files before: ${existingFiles.length}`);

for (const [filename, html] of Object.entries(allNewForms)) {
  const filePath = join(CORPUS_DIR, filename);
  writeFileSync(filePath, html.trim() + "\n", "utf8");
  console.log(`Wrote: ${filename}`);
}

const finalFiles = readdirSync(CORPUS_DIR).filter(f => f.endsWith(".html"));
console.log(`Total corpus files after: ${finalFiles.length}`);

if (finalFiles.length !== 100) {
  console.error(`Expected 100 files, but found ${finalFiles.length}!`);
  process.exit(1);
} else {
  console.log("SUCCESS: Exactly 100 corpus forms present!");
}

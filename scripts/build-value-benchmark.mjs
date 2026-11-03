/** Builds reports/value-benchmark/fields.json (+ fields.csv, personas.json) from the real form snapshots in
 * test/corpus/*.html. The extraction itself runs inside vitest + jsdom using the extension's own extractFields() and
 * jobCountries() (test/value-benchmark.test.ts in BUILD mode), so nothing is re-implemented here.
 * Then runs the benchmark once to write predictions.json for the labelling page.
 *
 *   node scripts/build-value-benchmark.mjs
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

function vitest(env) {
  const r = spawnSync("npx", ["vitest", "run", "test/value-benchmark.test.ts"], {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, ...env },
  });
  return r.status ?? 1;
}

const old = existsSync("reports/value-benchmark/fields.json")
  ? JSON.parse(readFileSync("reports/value-benchmark/fields.json", "utf8")).fingerprint
  : undefined;

if (vitest({ BUILD_VALUE_BENCHMARK: "1" }) !== 0) process.exit(1);

const fields = JSON.parse(readFileSync("reports/value-benchmark/fields.json", "utf8"));
if (old && old !== fields.fingerprint) {
  console.warn(`\nWARNING: field ids changed (${old} -> ${fields.fingerprint}). Existing human labels for removed ids are ignored.`);
}

// Predictions for the after-answer review in scripts/label-values.html (report-only so missing labels never fail).
vitest({ VALUE_BENCH_REPORT_ONLY: "1" });
console.log(`\nfields.json: ${fields.fields.length} fields from ${fields.sources.length} real snapshots (fingerprint ${fields.fingerprint}).`);
console.log("Next: open scripts/label-values.html in a browser and load reports/value-benchmark/fields.json + personas.json.");

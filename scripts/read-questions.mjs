// Reads questions with the trained model exactly as the extension does (same model, same head), for evaluating it on
// questions it was never trained on.
//   node scripts/read-questions.mjs reports/labels-round2.json reports/readings-round2.json
// Input: [{label, …}]. Output: [{text, guess, confidence}] (the format of reports/oof.json).

import { env, pipeline } from "@huggingface/transformers";
import { readFileSync, writeFileSync } from "node:fs";

env.localModelPath = "models/";
env.allowRemoteModels = false;

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error("usage: node scripts/read-questions.mjs <labels.json> <readings.json>");
  process.exit(1);
}
const head = JSON.parse(readFileSync("static/intent/model.json", "utf8"));
const texts = [...new Set(JSON.parse(readFileSync(input, "utf8")).map((l) => l.label))];
const embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", { dtype: "q8" });

const out = [];
for (let i = 0; i < texts.length; i += 16) {
  const batch = texts.slice(i, i + 16);
  const vectors = (await embedder(batch.map((t) => t.slice(0, 300)), { pooling: "mean", normalize: true })).tolist();
  vectors.forEach((v, j) => {
    const z = head.W.map((w, c) => head.scale * w.reduce((s, x, d) => s + x * v[d], head.b[c]));
    const max = Math.max(...z);
    const e = z.map((x) => Math.exp(x - max));
    const sum = e.reduce((a, b) => a + b, 0);
    const best = e.indexOf(Math.max(...e));
    out.push({ text: batch[j], guess: head.classes[best], confidence: e[best] / sum });
  });
}
writeFileSync(output, JSON.stringify(out, null, 0));
console.log(`${out.length} questions read → ${output}`);

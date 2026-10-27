// Trains ApplyAgent's local question-understanding model and measures it honestly.
//   node scripts/train-intents.mjs            evaluate on held-out real questions (5 folds), then train on everything
// Inputs: reports/labels*.json (real questions, hand-checked meanings; one file per collection round) + src/content/intent-examples.json (written examples).
// Model: the small offline sentence model (all-MiniLM-L6-v2, 384 numbers per question) + a trained softmax layer.
// Output: static/intent/model.json (the trained layer; the sentence model itself ships in static/intent/).
import { env, pipeline } from "@huggingface/transformers";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";

env.localModelPath = "models/";
env.allowRemoteModels = false;

/** Meanings ApplyAgent may act on (a profile fact, a quick answer, or the resume). Everything else is only asked. */
export const ACTIONABLE = new Set(["firstName", "lastName", "fullName", "email", "phone", "location", "country", "linkedin", "github",
  "portfolio", "currentCompany", "currentTitle", "school", "degree", "discipline", "graduationYear", "experienceYears", "notice_period",
  "salary_current", "salary_expected", "work_authorization", "sponsorship", "relocation", "heard_about", "gender", "race", "hispanic",
  "veteran", "disability", "resume"]);

// Each question once (the same wording on two forms is one example), from every labelled round.
const labelled = [...new Map(readdirSync("reports").filter((f) => /^labels(-[\w-]+)?\.json$/.test(f)).sort()
  .flatMap((f) => JSON.parse(readFileSync(`reports/${f}`, "utf8"))).map((l) => [l.label, l])).values()];
console.log(`${labelled.length} labelled real questions`);
const real = labelled.map((l) => ({ text: l.label, intent: l.intent }));
const written = Object.entries(JSON.parse(readFileSync("src/content/intent-examples.json", "utf8")))
  .flatMap(([intent, texts]) => texts.map((text) => ({ text, intent })));
const classes = [...new Set([...written, ...real].map((x) => x.intent))].sort();
const index = new Map(classes.map((c, i) => [c, i]));

const embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", { dtype: "q8" });
async function embed(texts) {
  const out = [];
  for (let i = 0; i < texts.length; i += 16) {
    out.push(...(await embedder(texts.slice(i, i + 16).map((t) => t.slice(0, 300)), { pooling: "mean", normalize: true })).tolist());
  }
  return out;
}
const realVecs = await embed(real.map((x) => x.text));
const writtenVecs = await embed(written.map((x) => x.text));
const D = realVecs[0].length;
const C = classes.length;

/** Softmax regression, full-batch gradient descent with L2. */
function train(xs, ys, epochs = 400, lr = 2.0, l2 = 1e-4) {
  const W = Array.from({ length: C }, () => new Float64Array(D));
  const b = new Float64Array(C);
  for (let e = 0; e < epochs; e++) {
    const gW = Array.from({ length: C }, () => new Float64Array(D));
    const gb = new Float64Array(C);
    for (let n = 0; n < xs.length; n++) {
      const p = probs(W, b, xs[n]);
      p[ys[n]] -= 1;
      for (let c = 0; c < C; c++) {
        if (Math.abs(p[c]) < 1e-6) continue;
        gb[c] += p[c];
        const g = gW[c];
        const x = xs[n];
        for (let d = 0; d < D; d++) g[d] += p[c] * x[d];
      }
    }
    for (let c = 0; c < C; c++) {
      b[c] -= (lr * gb[c]) / xs.length;
      for (let d = 0; d < D; d++) W[c][d] -= lr * (gW[c][d] / xs.length + l2 * W[c][d]);
    }
  }
  return { W, b };
}

function probs(W, b, x) {
  const z = new Float64Array(C);
  let max = -Infinity;
  for (let c = 0; c < C; c++) {
    let s = b[c];
    const w = W[c];
    for (let d = 0; d < D; d++) s += w[d] * x[d];
    z[c] = s * 10; // sentence vectors are unit length: scale so the softmax can be confident
    if (z[c] > max) max = z[c];
  }
  let sum = 0;
  for (let c = 0; c < C; c++) sum += (z[c] = Math.exp(z[c] - max));
  for (let c = 0; c < C; c++) z[c] /= sum;
  return z;
}

// --- honest evaluation: 5 folds over the REAL questions; written examples always in training -----------------------
const order = real.map((_, i) => i).sort((a, b) => ((a * 2654435761) % 1000) - ((b * 2654435761) % 1000));
const results = [];
for (let fold = 0; fold < 5; fold++) {
  const test = new Set(order.filter((_, k) => k % 5 === fold));
  const xs = [...writtenVecs, ...realVecs.filter((_, i) => !test.has(i))];
  const ys = [...written.map((x) => index.get(x.intent)), ...real.filter((_, i) => !test.has(i)).map((x) => index.get(x.intent))];
  const model = train(xs, ys);
  for (const i of test) {
    const p = probs(model.W, model.b, realVecs[i]);
    let best = 0;
    for (let c = 1; c < C; c++) if (p[c] > p[best]) best = c;
    results.push({ text: real[i].text, truth: real[i].intent, guess: classes[best], confidence: p[best] });
  }
  process.stdout.write(`fold ${fold + 1}/5 done\n`);
}

// Out-of-fold predictions: what the model says about each real question when it never saw it (for the policy check).
const controls = labelled.map((l) => l.control);
writeFileSync("reports/oof.json", JSON.stringify(results.map((r) => ({ ...r, control: controls[real.findIndex((x) => x.text === r.text)] })), null, 0));
const correct = results.filter((r) => r.guess === r.truth).length;
console.log(`\nAll meanings: ${correct}/${results.length} correct (${((100 * correct) / results.length).toFixed(1)}%) on real questions never seen in training`);
console.log("\nWhen it would ACT (meaning is actionable and confidence ≥ threshold):");
console.log("threshold  acts  correct  precision  | actionable questions it handles (coverage)");
const actionableTruth = results.filter((r) => ACTIONABLE.has(r.truth)).length;
for (const t of [0.5, 0.6, 0.7, 0.8, 0.85, 0.9, 0.95]) {
  const acts = results.filter((r) => ACTIONABLE.has(r.guess) && r.confidence >= t);
  const ok = acts.filter((r) => r.guess === r.truth).length;
  console.log(`  ${t.toFixed(2)}     ${String(acts.length).padStart(4)}   ${String(ok).padStart(5)}    ${((100 * ok) / Math.max(1, acts.length)).toFixed(1).padStart(5)}%   | ${ok}/${actionableTruth} (${((100 * ok) / actionableTruth).toFixed(0)}%)`);
}
const threshold = Number(process.env.SHOW_THRESHOLD ?? 0.8);
console.log(`\nMistakes it would ACT on at ${threshold}:`);
for (const r of results.filter((x) => ACTIONABLE.has(x.guess) && x.confidence >= threshold && x.guess !== x.truth)) {
  console.log(`  ${r.confidence.toFixed(2)} guessed ${r.guess} (truly ${r.truth}): ${r.text.slice(0, 100)}`);
}

// --- final model on everything ---------------------------------------------------------------------------------
const finalModel = train([...writtenVecs, ...realVecs], [...written.map((x) => index.get(x.intent)), ...real.map((x) => index.get(x.intent))]);
mkdirSync("static/intent", { recursive: true });
writeFileSync("static/intent/model.json", JSON.stringify({
  model: "Xenova/all-MiniLM-L6-v2", scale: 10, classes,
  W: finalModel.W.map((w) => Array.from(w, (v) => Number(v.toFixed(5)))), b: Array.from(finalModel.b, (v) => Number(v.toFixed(5))),
}));
console.log(`\nSaved static/intent/model.json (${classes.length} meanings, trained on ${real.length} real + ${written.length} written questions)`);

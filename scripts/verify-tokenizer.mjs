// Checks src/shared/wordpiece.ts against the reference tokenizer (transformers.js) on every real question, token by
// token, and that the sentence vectors match.   node scripts/verify-tokenizer.mjs
import { AutoTokenizer, env, pipeline } from "@huggingface/transformers";
import { build } from "esbuild";
import { readFileSync } from "node:fs";
import * as ort from "onnxruntime-node";

env.localModelPath = "models/";
env.allowRemoteModels = false;

await build({ entryPoints: ["src/shared/wordpiece.ts"], bundle: true, format: "esm", platform: "node", outfile: "node_modules/.cache/wordpiece.mjs", logLevel: "warning" });
const { encode, vocabFrom } = await import("../node_modules/.cache/wordpiece.mjs");

const json = JSON.parse(readFileSync("models/Xenova/all-MiniLM-L6-v2/tokenizer.json", "utf8"));
const vocab = vocabFrom(json);
const reference = await AutoTokenizer.from_pretrained("Xenova/all-MiniLM-L6-v2");
const texts = [
  ...JSON.parse(readFileSync("reports/labels.json", "utf8")).map((l) => l.label.slice(0, 300)),
  "Prénom", "Straße", "Wie heißt du?", "简历上传", "naïve café — résumé", "C++/C#, Node.js & React", "e-mail: a@b.co", "  tabs\tand\nnewlines  ",
];
let same = 0;
const diffs = [];
for (const t of texts) {
  const mine = encode(t, vocab);
  const theirs = Array.from(reference(t, { truncation: true, max_length: 128 }).input_ids.data, Number);
  if (mine.length === theirs.length && mine.every((v, i) => v === theirs[i])) same++;
  else diffs.push({ t, mine: mine.slice(0, 20), theirs: theirs.slice(0, 20) });
}
console.log(`tokens identical on ${same}/${texts.length} texts`);
for (const d of diffs.slice(0, 5)) console.log(JSON.stringify(d));

// Sentence vectors: my tokens + the ONNX model + mean pooling vs the reference pipeline.
const session = await ort.InferenceSession.create("models/Xenova/all-MiniLM-L6-v2/onnx/model_quantized.onnx");
const pipe = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", { dtype: "q8" });
let worst = 1;
for (const t of texts.slice(0, 120)) {
  const ids = encode(t, vocab);
  const n = ids.length;
  const feeds = {
    input_ids: new ort.Tensor("int64", BigInt64Array.from(ids.map(BigInt)), [1, n]),
    attention_mask: new ort.Tensor("int64", BigInt64Array.from(ids.map(() => 1n)), [1, n]),
    token_type_ids: new ort.Tensor("int64", new BigInt64Array(n), [1, n]),
  };
  const out = (await session.run(feeds)).last_hidden_state.data;
  const dim = out.length / n;
  const v = new Float32Array(dim);
  for (let i = 0; i < n; i++) for (let d = 0; d < dim; d++) v[d] += out[i * dim + d] / n;
  const norm = Math.hypot(...v);
  const ref = (await pipe(t, { pooling: "mean", normalize: true })).tolist()[0];
  const cos = v.reduce((s, x, d) => s + (x / norm) * ref[d], 0);
  worst = Math.min(worst, cos);
}
console.log(`sentence vectors: worst cosine similarity to the reference = ${worst.toFixed(6)}`);

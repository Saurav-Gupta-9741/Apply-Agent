/** The trained layer of the local question model: sentence vector → meaning + confidence. Pure, so it is tested. */

export interface IntentHead {
  model: string;
  scale: number;
  classes: string[];
  W: number[][];
  b: number[];
}

export interface Reading {
  intent: string;
  confidence: number;
}

/** Mean of the token vectors where the mask is 1, then unit length (sentence-transformers pooling). */
export function meanPool(hidden: Float32Array, tokens: number, dim: number, mask?: ArrayLike<number>): Float32Array {
  const v = new Float32Array(dim);
  let count = 0;
  for (let t = 0; t < tokens; t++) {
    if (mask && !mask[t]) continue;
    count++;
    for (let d = 0; d < dim; d++) v[d]! += hidden[t * dim + d]!;
  }
  let norm = 0;
  for (let d = 0; d < dim; d++) {
    v[d]! /= Math.max(count, 1);
    norm += v[d]! * v[d]!;
  }
  norm = Math.sqrt(norm) || 1;
  for (let d = 0; d < dim; d++) v[d]! /= norm;
  return v;
}

/** The most likely meaning of a sentence vector, with its probability. */
export function readIntent(vector: ArrayLike<number>, head: IntentHead): Reading {
  const z = head.W.map((w, c) => {
    let s = head.b[c]!;
    for (let d = 0; d < w.length; d++) s += w[d]! * vector[d]!;
    return s * head.scale;
  });
  const max = Math.max(...z);
  const exps = z.map((x) => Math.exp(x - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  let best = 0;
  for (let c = 1; c < exps.length; c++) if (exps[c]! > exps[best]!) best = c;
  return { intent: head.classes[best]!, confidence: exps[best]! / sum };
}

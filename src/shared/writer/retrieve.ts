/** Picks the resume lines most related to a question, so a small model with a short memory sees only what matters.
 * A BM25-style word score over Intl.Segmenter words: works in any language, no model needed, instant. */

import { contentWords } from "./words";

/** Resume text as lines worth retrieving: bullets and sentences of a reasonable length (headings and contact lines are
 * too short to help). Long paragraphs are split at sentence ends. */
export function resumeLines(text: string): string[] {
  const out: string[] = [];
  for (const raw of (text ?? "").split(/\n+/)) {
    const line = raw.replace(/^[\s•\-*·▪●◦]+/, "").replace(/\s+/g, " ").trim();
    if (line.length < 25) continue;
    if (line.length <= 320) {
      out.push(line);
      continue;
    }
    let cur = "";
    for (const s of line.split(/(?<=[.!?。！？])\s+/)) {
      if ((cur + " " + s).length > 320 && cur) {
        out.push(cur.trim());
        cur = "";
      }
      cur += ` ${s}`;
    }
    if (cur.trim().length >= 25) out.push(cur.trim());
  }
  return [...new Set(out)];
}

/** The `k` lines that best match the question (and the job, with less weight), in their resume order. When nothing
 * matches, the first lines (usually the latest role) are used. */
export function topLines(question: string, lines: string[], k = 4, jobText = ""): string[] {
  if (lines.length <= k) return lines;
  const docs = lines.map((l) => contentWords(l));
  const avg = docs.reduce((n, d) => n + d.length, 0) / docs.length || 1;
  const df = new Map<string, number>();
  for (const d of docs) for (const w of new Set(d)) df.set(w, (df.get(w) ?? 0) + 1);
  const idf = (w: string) => Math.log(1 + (docs.length - (df.get(w) ?? 0) + 0.5) / ((df.get(w) ?? 0) + 0.5));
  const query = new Map<string, number>();
  for (const w of contentWords(question)) query.set(w, (query.get(w) ?? 0) + 1);
  for (const w of contentWords(jobText)) if (!query.has(w)) query.set(w, 0.3);
  const k1 = 1.2, b = 0.75;
  const scored = docs.map((d, i) => {
    const tf = new Map<string, number>();
    for (const w of d) tf.set(w, (tf.get(w) ?? 0) + 1);
    let score = 0;
    for (const [w, qw] of query) {
      const f = tf.get(w);
      if (f) score += qw * idf(w) * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * d.length) / avg)));
    }
    return { i, score };
  });
  const best = scored.filter((s) => s.score > 0).sort((a, b2) => b2.score - a.score || a.i - b2.i).slice(0, k);
  // Fill with the first lines when few match.
  for (let i = 0; best.length < k && i < lines.length; i++) if (!best.some((s) => s.i === i)) best.push({ i, score: 0 });
  return best.sort((a, b2) => a.i - b2.i).map((s) => lines[s.i]!);
}

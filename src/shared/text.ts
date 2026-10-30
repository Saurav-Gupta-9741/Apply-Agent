/** Small text helpers used for matching questions, labels and options. */

/** Escape a value for use inside a double-quoted CSS attribute selector. */
export function cssAttr(value: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") return CSS.escape(value);
  return value.replace(/["\\]/g, "\\$&");
}

const CLEAN_LABEL_CACHE_MAX = 2048;
const cleanLabelCache = new Map<string, string>();

export function cleanLabel(text: string): string {
  if (!text) return "";
  const cached = cleanLabelCache.get(text);
  if (cached !== undefined) return cached;

  const result = text
    .replace(/\s+/g, " ")
    .replace(/\(\s*(required|optional|erforderlich|pflichtfeld|obligatoire|facultatif|obligatorio|opcional|obrigat[oó]rio|obbligatorio|facoltativo|verplicht|optioneel)\s*\)/gi, "")
    .replace(/[*✱]+/g, "")
    .trim();

  if (cleanLabelCache.size >= CLEAN_LABEL_CACHE_MAX) {
    const it = cleanLabelCache.keys();
    for (let i = 0; i < CLEAN_LABEL_CACHE_MAX / 4; i++) {
      const k = it.next().value;
      if (k !== undefined) cleanLabelCache.delete(k);
    }
  }
  cleanLabelCache.set(text, result);
  return result;
}

const NORMALIZE_CACHE_MAX = 2048;
const normalizeCache = new Map<string, string>();

/** Lower-case words without accents ("Prénom" → "prenom", "Straße" → "strasse"). Letters of every script are kept,
 * so a Hindi or Japanese label is not reduced to nothing. */
export function normalize(text: string): string {
  if (!text) return "";
  const cached = normalizeCache.get(text);
  if (cached !== undefined) return cached;

  const result = text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/(\p{Script=Latin})\p{M}+/gu, "$1") // accents (Latin only: in Hindi and other scripts the marks are letters' vowels)
    .replace(/ß/g, "ss")
    .replace(/['’]/g, "") // "Master's" and "Masters" are the same word
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, " ")
    .trim();

  if (normalizeCache.size >= NORMALIZE_CACHE_MAX) {
    const it = normalizeCache.keys();
    for (let i = 0; i < NORMALIZE_CACHE_MAX / 4; i++) {
      const k = it.next().value;
      if (k !== undefined) normalizeCache.delete(k);
    }
  }
  normalizeCache.set(text, result);
  return result;
}

export function clearTextCaches(): void {
  cleanLabelCache.clear();
  normalizeCache.clear();
}

const STOPWORDS = new Set(["the", "a", "an", "you", "your", "are", "is", "do", "of", "to", "in", "for", "and", "or", "what", "please"]);

export function tokens(text: string): Set<string> {
  return new Set(normalize(text).split(" ").filter((t) => t && !STOPWORDS.has(t)));
}

/** Meaningful words in singular form ("years" → "year"), for comparing two wordings of one question. */
function stems(text: string): Set<string> {
  return new Set([...tokens(text)].map((t) => (t.length > 3 && t.endsWith("s") && !t.endsWith("ss") ? t.slice(0, -1) : t)));
}

/** How alike two wordings of a question are (0..1), for reusing a saved answer. Two wordings count as the same
 * question only when one merely adds words to the other; when EACH has a word the other lacks, they ask different
 * things however many words they share: "years of experience with Python" is not "… with Java". */
export function sameQuestionScore(a: string, b: string): number {
  const x = stems(a);
  const y = stems(b);
  if (!x.size || !y.size) return 0;
  const onlyInX = [...x].some((t) => !y.has(t));
  const onlyInY = [...y].some((t) => !x.has(t));
  if (onlyInX && onlyInY) return 0;
  let shared = 0;
  for (const t of x) if (y.has(t)) shared++;
  return shared / (x.size + y.size - shared);
}

/** Jaccard similarity of meaningful words (0..1). */
export function similarity(a: string, b: string): number {
  const x = tokens(a);
  const y = tokens(b);
  if (!x.size || !y.size) return 0;
  let shared = 0;
  for (const t of x) if (y.has(t)) shared++;
  return shared / (x.size + y.size - shared);
}

/** Best option for a wanted value: exact (case-insensitive), then prefix, then word overlap. */
export function bestOption(options: string[], wanted: string, minScore = 0.6): string | undefined {
  const w = normalize(wanted);
  if (!w) return undefined;
  const exact = options.find((o) => normalize(o) === w);
  if (exact) return exact;
  // Whole-word prefixes only: "No" must match "No, I do not" but never "None".
  const prefix = options.find((o) => {
    const n = normalize(o);
    return n.startsWith(w + " ") || (n.length >= 3 && w.startsWith(n + " "));
  });
  if (prefix) return prefix;
  let best: string | undefined;
  let bestScore = 0;
  for (const o of options) {
    const s = similarity(o, wanted);
    if (s > bestScore) {
      bestScore = s;
      best = o;
    }
  }
  return bestScore >= minScore ? best : undefined;
}

/** Match a Yes or No answer to choice options (e.g. ["Yes", "No"], ["Yes, I do", "No, I do not"], ["I agree", "I disagree"]). */
export function yesNoOption(options: string[], wanted: string): string | undefined {
  const match = bestOption(options, wanted);
  if (match) return match;
  const isYes = /^(yes|y|true|agree|ja|oui|si|sim)\b/i.test(wanted.trim());
  const isNo = /^(no|n|false|disagree|nein|non|nao|nee)\b/i.test(wanted.trim());
  if (isYes) {
    return options.find((o) => /^(yes|y|true|agree|i agree|ja|oui|si|sim)\b/i.test(normalize(o)));
  }
  if (isNo) {
    return options.find((o) => /^(no|n|false|disagree|i disagree|nein|non|nao|nee)\b/i.test(normalize(o)));
  }
  return undefined;
}

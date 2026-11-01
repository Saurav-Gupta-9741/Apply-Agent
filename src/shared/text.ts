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
 * so a Hindi or Japanese label is not reduced to nothing. Zero-width characters are DELETED (never turned into a word
 * break), so "Fe\u200Bmale" is "female", not "fe male". */
export function normalize(text: string): string {
  if (!text) return "";
  const cached = normalizeCache.get(text);
  if (cached !== undefined) return cached;

  const result = text
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, "")
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

import { bestOption as matchBestOption } from "./option-matcher";

/** Best option for a wanted value: multi-stage fuzzy, semantic, and anti-overfitting matching. */
export function bestOption(options: string[], wanted: string, minScore = 0.6): string | undefined {
  return matchBestOption(options, wanted, minScore);
}

const YES_START = /^(yes|true|agree|i agree|ja|oui|si|sim)\b/;
const NO_START = /^(no|false|disagree|i disagree|nein|nao|nee)\b/;
/** Words that turn "Yes, …" into a different, qualified answer ("Yes, but I will need sponsorship"). */
const YES_QUALIFIER = /\b(but|however|except|unless|although|though|need|require|requires|sponsorship|not|dont|never)\b/;
const NO_QUALIFIER = /\b(but|however|except|unless|although|though)\b/;

/** Match a Yes or No answer to choice options (e.g. ["Yes", "No"], ["Yes, I do", "No, I do not"], ["I agree", "I disagree"]).
 * The fallback only fires when exactly ONE option has the wanted polarity: two different "I agree …" options are
 * ambiguous and stay for the user. "N/A" is never "No" and "Yes, but …" is never a plain "Yes". */
export function yesNoOption(options: string[], wanted: string): string | undefined {
  const match = bestOption(options, wanted);
  if (match) return match;
  const w = normalize(wanted);
  const isYes = w === "y" || /^(yes|true|agree|ja|oui|si|sim)\b/.test(w);
  const isNo = w === "n" || /^(no|false|disagree|nein|non|nao|nee)\b/.test(w);
  const unique = (list: string[]): string | undefined => (list.length === 1 ? list[0] : undefined);
  if (isYes) {
    return unique(
      options.filter((o) => {
        const n = normalize(o);
        if (n === "y") return true;
        if (!YES_START.test(n)) return false;
        return !YES_QUALIFIER.test(n.replace(YES_START, ""));
      }),
    );
  }
  if (isNo) {
    return unique(
      options.filter((o) => {
        const n = normalize(o);
        if (n === "n") return true;
        return NO_START.test(n) && !NO_QUALIFIER.test(n);
      }),
    );
  }
  return undefined;
}

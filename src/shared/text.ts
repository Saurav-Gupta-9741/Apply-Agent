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
// "No, and not willing to relocate" adds a second claim (Abridge, live round 9: picked for a user who would relocate).
const NO_QUALIFIER = /\b(but|however|except|unless|although|though|willing|unwilling|relocat\w*|open to)\b/;

/** Match a Yes or No answer to choice options (e.g. ["Yes", "No"], ["Yes, I do", "No, I do not"], ["I agree", "I disagree"]).
 * The fallback only fires when exactly ONE option has the wanted polarity: two different "I agree …" options are
 * ambiguous and stay for the user. "N/A" is never "No" and "Yes, but …" is never a plain "Yes". */
export function yesNoOption(options: string[], wanted: string, hint: YesNoHint = {}): string | undefined {
  const w = normalize(wanted);
  const match = bestOption(options, wanted);
  // A plain No never lands on "No, and not willing to relocate" (a second claim), even when it reads closest.
  const qualifiedNo = (o: string) => { const n = normalize(o); return NO_START.test(n) && NO_QUALIFIER.test(n); };
  if (match && !(/^(no|n)$/.test(w) && qualifiedNo(match))) return match;
  const isYes = w === "y" || /^(yes|true|agree|ja|oui|si|sim)\b/.test(w);
  const isNo = w === "n" || /^(no|false|disagree|nein|non|nao|nee)\b/.test(w);
  const unique = (list: string[]): string | undefined => (list.length === 1 ? list[0] : undefined);
  if (isYes) {
    const yeses = options.filter((o) => {
      const n = normalize(o);
      if (n === "y") return true;
      if (!YES_START.test(n)) return false;
      const rest = n.replace(YES_START, "");
      // On a sponsorship question "Yes, I will require sponsorship" IS the plain yes (Airbnb, live round 8).
      if (hint.topic === "sponsorship") return !/\b(but|however|except|unless|although|though|not|dont|never)\b/.test(rest);
      return !YES_QUALIFIER.test(rest);
    });
    return unique(yeses) ?? sponsorshipTiming(yeses, hint);
  }
  if (isNo) {
    const noes = options.filter((o) => {
      const n = normalize(o);
      if (n === "n") return true;
      return NO_START.test(n) && !NO_QUALIFIER.test(n);
    });
    if (noes.length) return unique(noes);
    // No option starts with "No": the one option that says no in its own words ("Never been a contractor or an
    // employee", "I do not have a valid work permit and would need visa sponsorship…": Lucid and Mentimeter, round 8).
    const negatives = options.filter((o) => {
      const n = normalize(o);
      return NEGATIVE_STATEMENT.test(n) && !YES_START.test(n) && !NO_START.test(n) && !NOT_A_NO.test(n);
    });
    return negatives.length === 1 && options.length > 1 ? negatives[0] : undefined;
  }
  return undefined;
}

/** What helps pick between several options of the same polarity. */
export interface YesNoHint {
  /** The question's topic (a "Yes, I will require sponsorship" is a plain yes on a sponsorship question). */
  topic?: string;
  /** Whether the user may work in the job's country today without sponsorship (from their own Quick answers). */
  authorizedHere?: boolean;
}

/** A no said in the option's own first words: "I do not…", "Never been…", "I am not…", "I have not…". */
const NEGATIVE_STATEMENT = /^(?:\S+ ){0,3}?(do not|dont|does not|doesnt|did not|didnt|have not|havent|has not|hasnt|am not|are not|is not|was not|were not|will not|wont|cannot|cant|never|not)\b/;
/** Options that start with a negation but are not a "No": "Not applicable", "I prefer not to say", "Not sure". */
const NOT_A_NO = /\b(not applicable|prefer not|not to (say|answer|disclose|specify)|wish|decline|not sure|unsure|not specified|not listed|not yet decided|undecided)\b|^n a$/;

/** Two "Yes, I will require sponsorship" options that differ only by when: "now" for a user who cannot work in the
 * job's country today, "in the future" for one who can (their permit ends). Unknown → left for the user. */
function sponsorshipTiming(yeses: string[], hint: YesNoHint): string | undefined {
  if (hint.topic !== "sponsorship" || hint.authorizedHere === undefined || yeses.length !== 2) return undefined;
  const now = yeses.filter((o) => /\bnow\b|\bcurrently\b|\bimmediately\b/.test(normalize(o)) && !/\bfuture\b/.test(normalize(o)));
  const later = yeses.filter((o) => /\bfuture\b|\blater\b/.test(normalize(o)) && !/\bnow\b/.test(normalize(o)));
  if (now.length !== 1 || later.length !== 1) return undefined;
  return hint.authorizedHere ? later[0] : now[0];
}

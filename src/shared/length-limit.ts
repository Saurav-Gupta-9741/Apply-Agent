/** Length limits of free-text answers, from the question's own words ("in 200 words or less", "max. 500 Zeichen",
 * "2-3 sentences", "400字以内") and the box's character cap (maxlength). Pure, so it is tested; used by AI drafts
 * (told the limit, then cut at a sentence end), the fill (never types an answer over the limit) and the panel (a live
 * counter). Lists and number questions ("3+ years") are not limits: only a count of words, characters, sentences or
 * paragraphs is. */

export interface LengthLimit {
  maxWords?: number;
  minWords?: number;
  maxChars?: number;
  minChars?: number;
  maxSentences?: number;
  maxParagraphs?: number;
  /** The limit was stated as a rough size ("about 200 words"): a little over is fine, so it is not enforced. */
  approximate?: boolean;
}

const WORD = String.raw`(?:words?|wörtern|wörter|worte|mots?|palabras?|palavras?|parole|parola|woorden|woord|ord|słów|slov|kelimeyi|kelime|단어|単語|语|詞|词)`;
const CHAR = String.raw`(?:characters?|chars?|zeichen|caract[eè]res?|caracteres?|caratteri|tekens|tecken|tegn|merkkiä|znaków|karakter|文字|字符|字|자)`;
const SENTENCE = String.raw`(?:sentences?|sätzen|sätze|satz|phrases?|frases?|oraciones|oración|zinnen|zin)`;
const PARAGRAPH = String.raw`(?:paragraphs?|absätzen|absätze|absatz|paragraphes?|párrafos?|parágrafos?|paragrafi|alinea's)`;
const UNITS: Array<[RegExp, "words" | "chars" | "sentences" | "paragraphs"]> = [
  [new RegExp(WORD, "i"), "words"], [new RegExp(CHAR, "i"), "chars"], [new RegExp(SENTENCE, "i"), "sentences"], [new RegExp(PARAGRAPH, "i"), "paragraphs"],
];
const UNIT = `(${WORD}|${CHAR}|${SENTENCE}|${PARAGRAPH})`;
/** 1,000 / 1.000 / 1 000 / 1000 / one…ten. */
const NUM = String.raw`(\d{1,3}(?:[,.\s]\d{3})+|\d+|one|two|three|four|five|six|seven|eight|nine|ten|a|an|a single|single|a few|few|a couple of|couple of)`;
const WORDS_FOR: Record<string, number> = { one: 1, a: 1, an: 1, "a single": 1, single: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10, "a few": 3, few: 3, "a couple of": 2, "couple of": 2 };

const MAX_BEFORE = String.raw`(?:max(?:imum)?\.?(?:\s+of)?|up\s+to|upto|under|below|(?<!\bno\s)(?<!\bnot\s)less\s+than|(?<!\bno\s)fewer\s+than|no\s+more\s+than|not\s+(?:to\s+)?(?:exceed|more\s+than)(?:ing)?|not\s+exceeding|within|limit(?:ed)?\s+(?:to|of)|at\s+most|höchstens|maximal|bis\s+zu|nicht\s+mehr\s+als|jusqu'?à|pas\s+plus\s+de|au\s+maximum|máximo(?:\s+de)?|hasta|como\s+máximo|até|no\s+máximo|massimo|al\s+massimo|fino\s+a|≤|<=|<)`;
const MAX_AFTER = String.raw`(?:max(?:imum)?\.?|or\s+less|or\s+fewer|limit|max\.|maximal|maximum|máximo|massimo|at\s+most|以内|以下|까지|이내)`;
const MIN_BEFORE = String.raw`(?:at\s+least|min(?:imum)?\.?(?:\s+of)?|no\s+less\s+than|no\s+fewer\s+than|(?<!\bno\s)(?<!\bnot\s)more\s+than|mindestens|au\s+moins|al\s+menos|como\s+mínimo|pelo\s+menos|no\s+mínimo|almeno|≥|>=)`;
const MIN_AFTER = String.raw`(?:or\s+more|minimum|mínimo|以上|이상)`;
const ABOUT = String.raw`(?:about|around|approximately|approx\.?|roughly|~|circa|ca\.|environ|aproximadamente|ungefähr|etwa|circa|cerca\s+de|indicativamente)`;

function num(raw: string): number | undefined {
  const t = raw.trim().toLowerCase();
  if (t in WORDS_FOR) return WORDS_FOR[t];
  const n = Number(t.replace(/[,.\s]/g, ""));
  return Number.isFinite(n) && n > 0 && n < 100_000 ? n : undefined;
}

function unitOf(raw: string): "words" | "chars" | "sentences" | "paragraphs" | undefined {
  return UNITS.find(([re]) => re.test(raw))?.[1];
}

/** A number in words is a limit only for sentences and paragraphs ("in a few sentences", "one paragraph") and for
 * "one word": "a few words about yourself" is not 3 words, "describe a character" is not 1 character. */
function counts(raw: string, unit: string): boolean {
  if (/\d/.test(raw)) return true;
  if (unit === "sentences" || unit === "paragraphs") return true;
  return unit === "words" && /^(one|single|a single)$/i.test(raw.trim());
}

function set(limit: LengthLimit, unit: string, kind: "max" | "min", n: number): void {
  if (unit === "words") kind === "max" ? (limit.maxWords = Math.min(limit.maxWords ?? Infinity, n)) : (limit.minWords = Math.max(limit.minWords ?? 0, n));
  else if (unit === "chars") kind === "max" ? (limit.maxChars = Math.min(limit.maxChars ?? Infinity, n)) : (limit.minChars = Math.max(limit.minChars ?? 0, n));
  else if (unit === "sentences" && kind === "max") limit.maxSentences = Math.min(limit.maxSentences ?? Infinity, n);
  else if (unit === "paragraphs" && kind === "max") limit.maxParagraphs = Math.min(limit.maxParagraphs ?? Infinity, n);
}

/** The length limit stated in a question (label, help text, placeholder) and set by the box (maxlength). */
export function lengthLimit(text: string, maxLength?: number): LengthLimit | undefined {
  const limit: LengthLimit = {};
  const t = ` ${(text ?? "").replace(/\s+/g, " ")} `;
  const re = (s: string) => new RegExp(s, "gi");
  let matched = false;
  // Ranges: "150-250 words", "2 to 3 sentences", "zwischen 100 und 200 Wörtern", "100～200字".
  for (const m of t.matchAll(re(String.raw`${NUM}\s*(?:-|–|—|~|～|to|and|bis|und|à|a|et|y|e)\s*${NUM}[\s-]*${UNIT}`))) {
    const lo = num(m[1]!), hi = num(m[2]!), unit = unitOf(m[3]!);
    if (lo && hi && unit && lo <= hi && counts(m[1]!, unit) && counts(m[2]!, unit)) {
      set(limit, unit, "max", hi);
      set(limit, unit, "min", lo);
      matched = true;
    }
  }
  if (!matched) {
    // "max 200 words", "no more than 500 characters", "max. 1.000 Zeichen", "up to 3 sentences".
    for (const m of t.matchAll(re(String.raw`${MAX_BEFORE}\s*${NUM}[\s-]*${UNIT}`))) {
      const n = num(m[1]!), unit = unitOf(m[2]!);
      if (n && unit && counts(m[1]!, unit)) { set(limit, unit, "max", n); matched = true; }
    }
    // "200 words max", "500 characters or less", "400字以内", "200 Wörter maximal".
    for (const m of t.matchAll(re(String.raw`${NUM}[\s-]*${UNIT}\s*\)?\s*${MAX_AFTER}`))) {
      const n = num(m[1]!), unit = unitOf(m[2]!);
      if (n && unit && counts(m[1]!, unit)) { set(limit, unit, "max", n); matched = true; }
    }
    // "Word limit: 300", "Character limit 500", "Max words: 250", "Zeichenbegrenzung: 1000".
    for (const m of t.matchAll(re(String.raw`${UNIT}\s*(?:limit|count|maximum|max\.?|begrenzung|limite|límite)\s*[:=]?\s*${NUM}`))) {
      const n = num(m[2]!), unit = unitOf(m[1]!);
      if (n && unit) { set(limit, unit, "max", n); matched = true; }
    }
    for (const m of t.matchAll(re(String.raw`(?:max(?:imum)?\.?|limit)\s+(?:number\s+of\s+)?${UNIT}\s*[:=]?\s*${NUM}`))) {
      const n = num(m[2]!), unit = unitOf(m[1]!);
      if (n && unit) { set(limit, unit, "max", n); matched = true; }
    }
    // "about 200 words", "a 300-word essay", "in 100 words", "(150 words)", "in one sentence", "in a few sentences".
    for (const m of t.matchAll(re(String.raw`${ABOUT}\s*${NUM}[\s-]*${UNIT}(?![a-z])(?!\s*(?:or less|or fewer|max(?:imum)?))`))) {
      const n = num(m[1]!), unit = unitOf(m[2]!);
      if (n && unit && counts(m[1]!, unit)) { set(limit, unit, "max", Math.round(n * 1.1)); limit.approximate = true; matched = true; }
    }
    if (!matched) {
      for (const m of t.matchAll(re(String.raw`(?:\bin\s+|\(\s*|\ba\s+|\bone\s+|\b)${NUM}[\s-]+${UNIT}\s*(?:\)|essay|answer|response|statement|summary|description|or\s+so|\.|,|;|$|\s|[぀-ヿ㐀-鿿가-힯])`))) {
        const n = num(m[1]!), unit = unitOf(m[2]!);
        if (!n || !unit || !counts(m[1]!, unit)) continue;
        // "at least 100 words" is a minimum, read below.
        if (new RegExp(String.raw`${MIN_BEFORE}\s*$`, "i").test(t.slice(Math.max(0, m.index! - 30), m.index! + m[0]!.indexOf(m[1]!)))) continue;
        // "Name 3 words that describe you" asks for a list, which is still a word count; "in one sentence" is a cap.
        set(limit, unit, "max", n);
        if (unit === "words" || unit === "chars") limit.approximate = /\ba\s+$|\bone\s+$/.test(m[0]!.slice(0, m[0]!.indexOf(m[1]!))) || limit.approximate;
        matched = true;
      }
    }
  }
  // "at least 100 words", "300 characters or more", "mindestens 50 Wörter".
  for (const m of t.matchAll(re(String.raw`${MIN_BEFORE}\s*${NUM}[\s-]*${UNIT}`))) {
    const n = num(m[1]!), unit = unitOf(m[2]!);
    if (n && unit && counts(m[1]!, unit) && !(unit === "words" && limit.maxWords !== undefined && n >= limit.maxWords)) { set(limit, unit, "min", n); matched = true; }
  }
  for (const m of t.matchAll(re(String.raw`${NUM}[\s-]*${UNIT}\s*${MIN_AFTER}`))) {
    const n = num(m[1]!), unit = unitOf(m[2]!);
    if (n && unit && counts(m[1]!, unit)) { set(limit, unit, "min", n); matched = true; }
  }
  // A counter shown under the box ("0 / 500", "0/1000 characters").
  const counter = /\b0\s*\/\s*(\d{2,5})\b/.exec(t);
  if (counter && /\b(characters?|chars?|zeichen|caract|0\s*\/\s*\d+\s*$)/i.test(t.slice(counter.index, counter.index + 40) + " ") && !limit.maxChars) {
    limit.maxChars = Number(counter[1]);
    matched = true;
  }
  if (maxLength && maxLength > 0 && maxLength < 100_000) {
    limit.maxChars = Math.min(limit.maxChars ?? Infinity, maxLength);
    matched = true;
  }
  if (!matched) return undefined;
  for (const k of ["maxWords", "maxChars", "maxSentences", "maxParagraphs"] as const) if (limit[k] === Infinity) delete limit[k];
  return Object.keys(limit).filter((k) => k !== "approximate").length ? limit : undefined;
}

/** Scripts written without spaces between words, where a dictionary is needed to find word ends: Thai, Lao, Khmer
 * and Myanmar. Chinese and Japanese are counted per character instead (the way their limits are stated). */
const UNSPACED = /[฀-໿က-႟ក-៿᧠-᧿]/;
const UNSPACED_RUN = /[฀-໿က-႟ក-៿᧠-᧿]+/g;
let wordSegmenter: Intl.Segmenter | null | undefined;
function unspacedWords(run: string): number {
  if (wordSegmenter === undefined) {
    try { wordSegmenter = typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter("und", { granularity: "word" }) : null; } catch { wordSegmenter = null; }
  }
  if (!wordSegmenter) return Math.max(1, Math.round(run.length / 5)); // about 5 characters per Thai/Khmer word
  let n = 0;
  for (const seg of wordSegmenter.segment(run)) if (seg.isWordLike) n++;
  return n;
}

/** Words as a reader counts them. Chinese and Japanese text, written without spaces, counts each character; Thai,
 * Lao, Khmer and Myanmar text is split into dictionary words. */
export function countWords(text: string): number {
  const cjk = (text.match(/[぀-ヿ㐀-鿿豈-﫿]/g) ?? []).length;
  let unspaced = 0;
  let rest = text.replace(/[぀-ヿ㐀-鿿豈-﫿]/g, " ");
  if (UNSPACED.test(rest)) {
    rest = rest.replace(UNSPACED_RUN, (run) => { unspaced += unspacedWords(run); return " "; });
  }
  const spaced = rest.trim().split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
  return cjk + unspaced + spaced;
}

/** Sentence ends in every script: Latin, CJK (。！？｡), Hindi/Bengali danda (। ॥), Arabic/Urdu question mark and full
 * stop (؟ ۔), Armenian (։), Ethiopic (። ፧) and Myanmar (။). */
const ENDS = ".!?。！？｡।॥؟۔։።፧။";
const SENTENCE_END = new RegExp(String.raw`[^${ENDS}]+(?:[${ENDS}]+["'”’»)\]]*|$)`, "g");
export function sentences(text: string): string[] {
  return (text.match(SENTENCE_END) ?? []).map((s) => s.trim()).filter(Boolean);
}
const paragraphs = (text: string) => text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

export interface LengthCheck {
  ok: boolean;
  words: number;
  chars: number;
  /** "260 words; this question allows 200". */
  problem?: string;
}

/** Whether an answer fits. A rough size ("about 200 words") is never a reason to refuse. */
export function checkLength(text: string, limit: LengthLimit | undefined): LengthCheck {
  const words = countWords(text);
  const chars = text.length;
  if (!limit) return { ok: true, words, chars };
  if (limit.maxChars !== undefined && chars > limit.maxChars) return { ok: false, words, chars, problem: `${chars} characters; this question allows ${limit.maxChars}` };
  if (!limit.approximate && limit.maxWords !== undefined && words > limit.maxWords) return { ok: false, words, chars, problem: `${words} words; this question allows ${limit.maxWords}` };
  if (!limit.approximate && limit.maxSentences !== undefined && sentences(text).length > limit.maxSentences) {
    return { ok: false, words, chars, problem: `${sentences(text).length} sentences; this question asks for at most ${limit.maxSentences}` };
  }
  if (limit.maxParagraphs !== undefined && paragraphs(text).length > limit.maxParagraphs) {
    return { ok: false, words, chars, problem: `${paragraphs(text).length} paragraphs; this question asks for at most ${limit.maxParagraphs}` };
  }
  return { ok: true, words, chars };
}

/** A draft cut to the limit at the end of a whole sentence (never mid-sentence, nothing added), or undefined when not
 * even its first sentence fits (then the draft is not offered). Text that already fits is returned unchanged. */
export function fitToLimit(text: string, limit: LengthLimit | undefined): string | undefined {
  const clean = text.trim();
  if (!limit || checkLength(clean, { ...limit, approximate: false }).ok) return clean;
  const strict: LengthLimit = { ...limit, approximate: false };
  const paras = limit.maxParagraphs !== undefined ? paragraphs(clean).slice(0, limit.maxParagraphs) : [clean];
  let best: string | undefined;
  const kept: string[] = [];
  for (const p of paras) {
    for (const s of sentences(p)) {
      if (!checkLength([...kept, s].join(" "), strict).ok) return best;
      kept.push(s);
      best = kept.join(" ");
    }
  }
  return best;
}

/** One line for the AI: the exact limit in words. */
export function limitInstruction(limit: LengthLimit | undefined): string | undefined {
  if (!limit) return undefined;
  const parts: string[] = [];
  if (limit.minWords && limit.maxWords) parts.push(`between ${limit.minWords} and ${limit.maxWords} words`);
  else if (limit.maxWords) parts.push(`${limit.approximate ? "about" : "at most"} ${limit.approximate ? Math.round(limit.maxWords / 1.1) : limit.maxWords} words`);
  else if (limit.minWords) parts.push(`at least ${limit.minWords} words`);
  if (limit.maxChars) parts.push(`at most ${limit.maxChars} characters including spaces`);
  if (limit.maxSentences) parts.push(`at most ${limit.maxSentences} sentence${limit.maxSentences > 1 ? "s" : ""}`);
  if (limit.maxParagraphs) parts.push(`at most ${limit.maxParagraphs} paragraph${limit.maxParagraphs > 1 ? "s" : ""}`);
  return parts.length ? `Length: ${parts.join(", ")}. This is a hard limit.` : undefined;
}

/** "143 / 200 words" for the panel. */
export function lengthCounter(text: string, limit: LengthLimit | undefined): string | undefined {
  if (!limit) return undefined;
  const { words, chars } = checkLength(text, limit);
  if (limit.maxWords) return `${words} / ${limit.approximate ? `about ${Math.round(limit.maxWords / 1.1)}` : limit.maxWords} words`;
  if (limit.maxChars) return `${chars} / ${limit.maxChars} characters`;
  if (limit.maxSentences) return `${sentences(text).length} / ${limit.maxSentences} sentences`;
  if (limit.minWords) return `${words} words (at least ${limit.minWords})`;
  return undefined;
}

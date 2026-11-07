/** Word helpers for the on-device writer: language-agnostic words (Intl.Segmenter, so Chinese and Japanese split into
 * words too), a light stemmer, stop words and a sentence splitter that keeps decimals ("3.5") and abbreviations
 * ("e.g.") whole. Pure, so they are unit-tested. */

type Segmenter = { segment(text: string): Iterable<{ segment: string; isWordLike?: boolean }> };
const SEG: Segmenter | undefined = (() => {
  try {
    const I = Intl as unknown as { Segmenter?: new (locale?: string, o?: { granularity: string }) => Segmenter };
    return I.Segmenter ? new I.Segmenter(undefined, { granularity: "word" }) : undefined;
  } catch {
    return undefined;
  }
})();

/** Lower-cased words of a text, in order. */
export function words(text: string): string[] {
  const t = (text ?? "").toLowerCase();
  if (SEG) {
    const out: string[] = [];
    for (const s of SEG.segment(t)) if (s.isWordLike) out.push(s.segment);
    return out;
  }
  return t.match(/[\p{L}\p{N}][\p{L}\p{N}'+#.-]*/gu) ?? [];
}

/** "pipelines" → "pipelin", "queries" → "query", "migrated" → "migrat": enough to match word forms. Other scripts:
 * long words are cut to their first 6 letters (a rough stem for Spanish, German, French…); CJK words stay whole. */
export function stem(w: string): string {
  if (/^[a-z]+$/.test(w)) {
    if (w.length > 4 && w.endsWith("ies")) return `${w.slice(0, -3)}y`;
    for (const suffix of ["ing", "ed", "es", "s", "ly", "e"]) {
      if (w.length - suffix.length >= 3 && w.endsWith(suffix)) return w.slice(0, -suffix.length);
    }
    return w;
  }
  if (/^\p{Script=Latin}+$/u.test(w) && w.length > 6) return w.slice(0, 6);
  return w;
}

const STOP_LIST = `a an the and or but nor so yet if then than that this these those there here of in on at to for from by with
without about into onto over under after before during since until while as per via up down out off again further
is are was were be been being am do does did doing have has had having will would shall should can could may might must
it its it's they them their theirs he him his she her hers we us our ours you your yours i me my mine myself i'm i've
i'd i'll we're we've you're who whom whose which what when where why how all any both each few more most other some
such no not only own same too very just also well really much many lot lots one ones etc e.g i.e eg ie able
el la los las un una unos unas de del y o en con por para que es son fue mi mis yo me se lo le su sus al como más
der die das ein eine einen und oder in im mit für von zu ist sind war ich mein meine mir mich auf an bei als auch
le la les un une des et ou en avec pour par que est sont je j mon ma mes du au aux
o a os as um uma e ou em com para por que é eu meu minha
il lo gli una e o con per che è io mio mia`;
export const STOP = new Set(STOP_LIST.split(/\s+/).filter(Boolean));

/** Content words (stemmed): words that carry meaning, without stop words or bare numbers. */
export function contentWords(text: string): string[] {
  return words(text)
    .filter((w) => !STOP.has(w) && !/^\d+([.,]\d+)?$/.test(w) && (w.length > 1 || /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(w)))
    .map(stem);
}

/** How English a text looks (share of English function words among its words); 0 for other languages. */
export function englishShare(text: string): number {
  const ws = words(text);
  if (!ws.length) return 0;
  const EN = /^(the|and|of|to|in|a|an|is|was|i|my|with|for|on|that|this|it|at|as|by|have|has|be|are|from|we|our|which|when|at)$/;
  return ws.filter((w) => EN.test(w)).length / ws.length;
}
export const isEnglish = (text: string): boolean => englishShare(text) >= 0.12;

const ABBREVIATIONS = /(?:^|[\s(])(?:e\.g|i\.e|etc|vs|mr|mrs|ms|dr|prof|inc|ltd|co|corp|jr|sr|st|approx|no|nr|ca|cf|incl|dept|univ|u\.s|u\.k|b\.tech|m\.tech|b\.sc|m\.sc|b\.e|m\.e|b\.a|m\.a|ph\.d)$/i;

/** Sentences of one paragraph or line: ends at . ! ? 。！？ (and at line breaks), never inside "3.5", "e.g." or "Node.js". */
export function splitSentences(text: string): string[] {
  const out: string[] = [];
  for (const line of (text ?? "").split(/\n+/)) {
    let start = 0;
    for (let i = 0; i < line.length; i++) {
      const c = line[i]!;
      if ("。！？".includes(c)) {
        out.push(line.slice(start, i + 1));
        start = i + 1;
        continue;
      }
      if (!".!?".includes(c)) continue;
      // Run of closing punctuation and quotes after the mark.
      let j = i + 1;
      while (j < line.length && /[.!?"')\]”’»]/.test(line[j]!)) j++;
      if (j < line.length && !/\s/.test(line[j]!)) continue; // "3.5", "Node.js", "U.S.A"
      if (c === "." && ABBREVIATIONS.test(line.slice(Math.max(start, i - 12), i))) continue;
      out.push(line.slice(start, j));
      start = j;
      i = j - 1;
    }
    out.push(line.slice(start));
  }
  return out.map((s) => s.trim()).filter((s) => /[\p{L}\p{N}]/u.test(s));
}

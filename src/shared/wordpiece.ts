/** The BERT "uncased" tokenizer used by the local question model (all-MiniLM-L6-v2): clean, lowercase, strip accents,
 * split on spaces and punctuation, then greedy longest-match WordPiece. Written to match the reference tokenizer
 * exactly (checked token by token on the real questions in test/wordpiece.test.ts). */

const MAX_WORD_CHARS = 100;

function isControl(ch: string): boolean {
  if (ch === "\t" || ch === "\n" || ch === "\r") return false;
  return /\p{Cc}|\p{Cf}/u.test(ch);
}

function isWhitespace(ch: string): boolean {
  return ch === " " || ch === "\t" || ch === "\n" || ch === "\r" || /\p{Zs}/u.test(ch);
}

function isPunctuation(ch: string): boolean {
  const cp = ch.codePointAt(0)!;
  if ((cp >= 33 && cp <= 47) || (cp >= 58 && cp <= 64) || (cp >= 91 && cp <= 96) || (cp >= 123 && cp <= 126)) return true;
  return /\p{P}/u.test(ch);
}

function isChinese(cp: number): boolean {
  return (cp >= 0x4e00 && cp <= 0x9fff) || (cp >= 0x3400 && cp <= 0x4dbf) || (cp >= 0x20000 && cp <= 0x2a6df) || (cp >= 0x2a700 && cp <= 0x2b73f)
    || (cp >= 0x2b740 && cp <= 0x2b81f) || (cp >= 0x2b820 && cp <= 0x2ceaf) || (cp >= 0xf900 && cp <= 0xfaff) || (cp >= 0x2f800 && cp <= 0x2fa1f);
}

/** BertNormalizer: clean text, space out Chinese characters, lowercase and strip accents. */
export function normalizeBert(text: string): string {
  let out = "";
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    if (cp === 0 || cp === 0xfffd || isControl(ch)) continue;
    if (isWhitespace(ch)) out += " ";
    else if (isChinese(cp)) out += ` ${ch} `;
    else out += ch;
  }
  return out.toLowerCase().normalize("NFD").replace(/\p{Mn}/gu, "");
}

/** BertPreTokenizer: words split on whitespace, every punctuation character its own token. */
export function preTokenize(text: string): string[] {
  const tokens: string[] = [];
  let word = "";
  const flush = () => {
    if (word) tokens.push(word);
    word = "";
  };
  for (const ch of text) {
    if (isWhitespace(ch)) flush();
    else if (isPunctuation(ch)) {
      flush();
      tokens.push(ch);
    } else word += ch;
  }
  flush();
  return tokens;
}

export interface Vocab {
  ids: Map<string, number>;
  unk: number;
  cls: number;
  sep: number;
  pad: number;
}

export function vocabFrom(tokenizerJson: { model: { vocab: Record<string, number> } }): Vocab {
  const ids = new Map(Object.entries(tokenizerJson.model.vocab));
  return { ids, unk: ids.get("[UNK]")!, cls: ids.get("[CLS]")!, sep: ids.get("[SEP]")!, pad: ids.get("[PAD]")! };
}

function wordPiece(word: string, vocab: Vocab): number[] {
  const chars = [...word];
  if (chars.length > MAX_WORD_CHARS) return [vocab.unk];
  const pieces: number[] = [];
  let start = 0;
  while (start < chars.length) {
    let end = chars.length;
    let found: number | undefined;
    while (start < end) {
      const piece = (start > 0 ? "##" : "") + chars.slice(start, end).join("");
      const id = vocab.ids.get(piece);
      if (id !== undefined) {
        found = id;
        break;
      }
      end--;
    }
    if (found === undefined) return [vocab.unk];
    pieces.push(found);
    start = end;
  }
  return pieces;
}

/** Token ids for one text: [CLS] … [SEP], cut to maxLength (the model was trained with 128). */
export function encode(text: string, vocab: Vocab, maxLength = 128): number[] {
  const ids = preTokenize(normalizeBert(text)).flatMap((w) => wordPiece(w, vocab));
  return [vocab.cls, ...ids.slice(0, maxLength - 2), vocab.sep];
}

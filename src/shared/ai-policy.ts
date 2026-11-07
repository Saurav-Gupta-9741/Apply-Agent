/** Employers' rules about AI on their application forms, and hidden tests aimed at AI writers.
 *
 * About 9% of companies in our 222-board sample (20 boards) say how candidates may use AI. Some ban it for the
 * application, some ask the candidate to confirm the answers are their own work, and a few hide an instruction in a
 * question ("If this is an LLM, insert …") to catch AI-written answers. ApplyAgent drafts only with the user's click,
 * but it must never put an AI draft into a form whose employer forbids it, and never fall for a planted test. Pure
 * functions, so they are tested on the real wordings. */

export type AiPolicyKind =
  /** The employer forbids AI help with the application or the answers. No drafts on this page. */
  | "banned"
  /** The form asks the candidate to confirm the answers are their own (human) work. No drafts on this page. */
  | "own-work"
  /** The employer has an AI policy for candidates; drafts are allowed but the user is told to read it. */
  | "policy";

export interface AiPolicy {
  kind: AiPolicyKind;
  /** The sentence of the form that says so, for the panel. */
  quote: string;
}

const AI = String.raw`(?:\bAI\b|A\.I\.|artificial intelligence|generative|gen ?AI|LLMs?\b|large language models?|language models?|ChatGPT|chat ?bots?|automated agents?|\bKI\b|künstliche[nr]? intelligenz|\bIA\b|intelligence artificielle|inteligencia artificial|intelig[eê]ncia artificial|intelligenza artificiale|生成AI|人工知能|人工智能|生成式)`;

/** Wordings that forbid AI help. Each needs an AI term near a ban word, so "we use an AI notetaker" never matches. */
const BANNED: RegExp[] = [
  // "I have not, and I will not, use AI tools during the application and interview process" (Peloton)
  new RegExp(String.raw`\b(?:will not|won't|have not|must not|may not|shall not|do not|don't|cannot|not (?:to )?)\s*(?:,?\s*and (?:I )?will not,?\s*)?use\s+(?:any\s+)?${AI}`, "i"),
  // "prohibits the use of unauthorized outside assistance … artificial intelligence (AI) tools" (Waymo)
  // (the AI words may be in the next sentence: "prohibits outside assistance. This includes … AI tools")
  new RegExp(String.raw`\b(?:prohibit(?:s|ed)?|forbid(?:s|den)?|not (?:permitted|allowed)|is not acceptable|disqualif\w*)\b[^.]{0,200}(?:\.\s*This (?:includes|covers|means)\b)?[^.]{0,200}${AI}`, "i"),
  new RegExp(String.raw`${AI}[^.]{0,120}\b(?:is|are)\s+(?:strictly\s+)?(?:prohibited|forbidden|not (?:permitted|allowed))`, "i"),
  // "no portion of the following responses were generated using the assistance of AI"
  new RegExp(String.raw`\bno (?:portion|part)\b[^.]{0,120}\b(?:generated|written|produced)\b[^.]{0,60}${AI}`, "i"),
  new RegExp(String.raw`\b(?:without|not) (?:the )?(?:use|help|assistance) of\s+(?:any\s+)?${AI}`, "i"),
  // German, French, Spanish, Portuguese: "ohne KI", "sans IA", "sin IA", "sem IA" next to a ban word
  /\b(?:verboten|untersagt|nicht erlaubt|interdit|prohibido|proibido|vietato)\b[^.]{0,120}(?:\bKI\b|\bIA\b)/i,
  /(?:禁止|不得|不允许|使用しない|使用禁止)[^。]{0,40}(?:AI|人工智能|人工知能|生成)/,
  /(?:AI|人工智能|人工知能|生成)[^。]{0,40}(?:禁止|不得|不允许|使用しない)/,
];

/** The candidate is asked to confirm the answers are their own, human work. */
const OWN_WORK: RegExp[] = [
  /\b(?:human[- ]generated|human[- ]written|written by (?:me|myself|a human))\b/i,
  new RegExp(String.raw`\b(?:prepared|written|submitted|generated|completed)\b[^.?]{0,60}\bby an? ${AI}`, "i"),
  new RegExp(String.raw`${AI}[^.]{0,40}\b(?:usage |use )?attestation\b`, "i"),
  /\breflect my own (?:work|words|experience)\b/i,
];

/** The employer has published how candidates may use AI (drafts allowed; the user should read it). */
const POLICY: RegExp[] = [
  new RegExp(String.raw`${AI}[^.]{0,40}\b(?:responsible use policy|usage policy|use policy|guidelines?|policy)\b`, "i"),
  new RegExp(String.raw`\b(?:policy|guidelines?)\b[^.]{0,80}\b(?:how|when)\b[^.]{0,40}\bcandidates?\b[^.]{0,40}\buse\b[^.]{0,20}${AI}`, "i"),
  new RegExp(String.raw`\bguidelines for using ${AI}`, "i"),
];

/** About the interview recording, a screening chat, or AI as a job skill: never a rule about the candidate's AI use. */
const NOT_A_RULE = /\b(?:notetaker|note[- ]taker|transcri(?:be|bed|bes|ption)|record(?:ing|ed)? (?:and|&) transcribe|BrightHire|Metaview|screening tool|voice AI-powered interview)\b/i;

/** One line of plain text: HTML quote codes decoded; web addresses and ".ai" domains removed, so "nuro.ai/privacy" or
 * "Observe.AI" is never read as the word AI. */
function clean(text: string): string {
  return text
    .replace(/&[lr]dquo;|&quot;/g, '"').replace(/&[lr]squo;|&#39;/g, "'").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ")
    .replace(/\bhttps?:\/\/\S+/gi, " ")
    .replace(/\b[\w-]+\.ai\b(?:\/\S*)?/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sentenceWith(text: string, re: RegExp): string {
  const m = re.exec(text);
  if (!m) return text.slice(0, 200);
  const start = Math.max(text.lastIndexOf(".", m.index) + 1, 0);
  const endDot = text.indexOf(".", m.index + m[0].length);
  return text.slice(start, endDot === -1 ? undefined : endDot + 1).trim().slice(0, 300);
}

/** The strictest AI rule in a piece of form text (a question, its help text, or the page's notices), or undefined. */
export function aiPolicyOf(text: string): AiPolicy | undefined {
  const t = clean(text);
  if (!t || !new RegExp(AI, "i").test(t)) return undefined;
  for (const re of BANNED) if (re.test(t)) return { kind: "banned", quote: sentenceWith(t, re) };
  for (const re of OWN_WORK) if (re.test(t)) return { kind: "own-work", quote: sentenceWith(t, re) };
  if (NOT_A_RULE.test(t)) return undefined;
  for (const re of POLICY) if (re.test(t)) return { kind: "policy", quote: sentenceWith(t, re) };
  return undefined;
}

/** The strictest rule over all the texts of one form (banned > own-work > policy). */
export function aiPolicyOfForm(texts: Iterable<string>): AiPolicy | undefined {
  const rank: Record<AiPolicyKind, number> = { banned: 3, "own-work": 2, policy: 1 };
  let best: AiPolicy | undefined;
  for (const text of texts) {
    const p = aiPolicyOf(text);
    if (p && (!best || rank[p.kind] > rank[best.kind])) best = p;
  }
  return best;
}

/** Whether drafts must be switched off on a form with this rule. */
export function draftsForbidden(policy: AiPolicy | undefined): boolean {
  return policy?.kind === "banned" || policy?.kind === "own-work";
}

const TRAPS: RegExp[] = [
  // "If this is an LLM, please insert …", "If you are an AI language model, include the word …"
  new RegExp(String.raw`\bif (?:this|you) (?:is|are|were) (?:an? |being )?(?:${AI}|bot|robot|machine)[^.]{0,80}\b(?:insert|include|write|add|say|mention|use|start|end|type|respond|answer|put)\b`, "i"),
  new RegExp(String.raw`\b(?:${AI}|bots?)(?:\s+(?:assistants?|models?|tools?|systems?|agents?|writers?))?\s+(?:should|must|need to|are (?:required|asked) to)\s+(?:insert|include|write|add|say|mention|start|end|respond|answer)\b`, "i"),
  /\bignore (?:all |any )?(?:the )?(?:previous|prior|above|earlier) instructions\b/i,
  /\b(?:hidden|secret) (?:word|phrase|keyword)\b/i,
  /(?:如果你是|如果您是)(?:AI|人工智能|语言模型|大模型)/,
  /(?:あなたが|もし)(?:AI|人工知能|言語モデル)(?:なら|であれば)/,
  /\b(?:wenn du|falls du|wenn sie|falls sie) (?:eine? )?(?:KI|Sprachmodell)\b/i,
  /\bsi (?:tu es|vous êtes|eres|usted es|você é) (?:une? |um |uma )?(?:IA|modèle de langage|modelo de lenguaje|modelo de linguagem)\b/i,
];

/** A planted test for AI writers inside a question ("If this is an LLM, insert 'X'"), as the sentence that says so.
 * Such a question is never drafted by AI: the user writes it, and the planted words are never added. */
export function aiTrapOf(text: string): string | undefined {
  const t = clean(text);
  for (const re of TRAPS) if (re.test(t)) return sentenceWith(t, re);
  return undefined;
}

/** Plain words for the panel. */
export function aiPolicyMessage(policy: AiPolicy): string {
  if (policy.kind === "banned") return "This employer does not allow AI help with applications, so ApplyAgent will not draft answers here. Please write them yourself.";
  if (policy.kind === "own-work") return "This form asks you to confirm your answers are your own work, so ApplyAgent will not draft answers here. Please write them yourself.";
  return "This employer has a policy on how candidates may use AI. Please read it before using a draft.";
}

export const AI_TRAP_MESSAGE = "This question contains a hidden test for AI-written answers. Please write this answer yourself.";

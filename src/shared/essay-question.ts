/** Which free-text boxes are real essay questions, the only ones an AI draft is offered for.
 *
 * A multi-line box is not enough: real forms (round 7, 222 Greenhouse boards) use text areas for salary, visa
 * sponsorship, start dates, portfolio links, pronouns, "How did you hear about us?" and yes/no questions. An AI draft
 * there would be invented (a salary, a visa status, a referrer), so those are left to the user's own facts. And a
 * one-line box can still be an essay ("Please share 3-5 sentences explaining your interest …"). Pure, so tested on the
 * real wordings. */

/** Facts about the candidate that only the candidate knows, or links: never written by AI. */
const FACTUAL = new RegExp(
  [
    String.raw`\b(?:links?|urls?|linkedin|github|gitlab|website|web ?site|portfolio|blog|behance|dribbble)\b`,
    String.raw`\bhow did (?:you|your|u) (?:first )?(?:hear|learn|find out|come across)\b|\bwhere did (?:you|your) (?:first )?(?:hear|see|find)\b|\brefer(?:red|ral|rer)\b`,
    String.raw`\b(?:salary|compensation|pay range|base pay|ctc|ote|on target earnings|equity|bonus)\b`,
    String.raw`\b(?:visa|sponsor(?:ship)?|work (?:permit|authori[sz]ation)|authori[sz]ed to work|citizenship|passport|immigration)\b`,
    String.raw`\b(?:start date|earliest (?:possible )?(?:start|date)|notice period|available to start|availability)\b`,
    String.raw`\bpronouns?\b|\bhow (?:would|should) (?:you|we) (?:like to )?(?:be )?address`,
    String.raw`\b(?:family members?|relatives?|friends?|significant others?|spouse|partner)\b[^.?]{0,60}\b(?:work|employ)`,
    String.raw`\bconflicts? of interest\b|\bnon[- ]?compete\b|\bagreements? with (?:a |your )?(?:current|former)\b`,
    String.raw`\b(?:current|most recent|present) (?:job )?(?:title|employer|company|location|city|address)\b|\bwhich is your current\b|\bwhat is your current location\b`,
    String.raw`\bat which (?:organi[sz]ations?|compan(?:y|ies)|employers?)\b|\bwhich compan(?:y|ies)\b`,
    String.raw`\b(?:mm\/dd|dd\/mm|yyyy)\b`,
    String.raw`\b(?:offsites?|onsite|on-site|in[- ]person|office|relocat\w*|commute)\b`,
  ].join("|"),
  "i",
);

/** Words that ask for an account of the candidate's own experience or motivation. */
const ESSAY_ASK = /\b(?:describe|tell (?:us|me)|explain|walk (?:us|me) through|share (?:an?|one|your|with us (?:an?|your))\s+(?:\w+\s+){0,2}(?:example|experience|story|project|approach|thoughts?|interest|reasons?|motivation)|give (?:us )?an example|what (?:excites|interests|motivates|attracts|drew|draws) you|why (?:do|are|would) you|why (?:this|our|us)|what makes you|how (?:do|did|would) you (?:approach|handle|solve|design|prioriti[sz]e|measure|build|lead|manage)|proud|accomplishment|achievement|challenge|cover letter|statement of interest|summary of qualifications|key strengths|additional information|anything else)\b/i;

/** The same asks in the other languages of real forms (Spanish, Portuguese, French, German, Italian, Dutch, Chinese,
 * Japanese, Korean). CJK has no word breaks, so no \b there. */
const ESSAY_ASK_WORLD = /(?:\b(?:cu[eé]ntanos|cu[eé]ntame|descr[ií]be(?:nos)?|expl[ií]ca(?:nos)?|motivaci[oó]n|retos|descreva|conte-nos|explique|motiva[cç][aã]o|d[eé]crivez|parlez-nous|expliquez|beschreib\w*|erz[aä]hl\w*|erkl[aä]r\w*|descrivi|raccontaci|spiega|beschrijf|vertel)\b|¿\s*por qu[eé]|\bpor que\b|\bpourquoi\b|\bwarum\b|\bperch[eé]\b|\bwaarom\b|為什麼|为什么|請分享|请分享|告訴我們|告诉我们|描述|例子|動機|动机|想和我們分享|想和我们分享|補充|补充|なぜ|理由|志望動機|教えてください|自己PR|補足|경험|지원 동기|설명해|왜)/i;

/** Factual asks in other languages: video uploads, shift schedules, accessibility needs, pay. */
const FACTUAL_WORLD = /(?:影片|视频|視頻|動画|\bv[ií]deo\b|排班|シフト|ajuste razonable|acessibilidade|adapta[cç][aã]o|am[eé]nagement|salari|remunera|\bGehalt|薪資|薪资|給与|年収|연봉|\bsueldo\b|\brenta\b|pretens[aã]o|restri[cç][aã]o|目前所任職|目前任職|目前的職稱|職稱|职称|現職|现职|公司名稱|現在の(?:会社|勤務先|職種)|현재 (?:회사|직함))/i;

/** "3-5 sentences", "in two sentences", "in 150 words": a length for prose is itself a sign of an essay. */
const PROSE_LENGTH = /\b\d+\s*(?:-|–|to)\s*\d+\s+sentences\b|\bin (?:a few|one|two|three|four|five|\d+) (?:sentences|words)\b|\b\d+\s*words?\b|\b(?:max(?:imum)?|up to|under|no more than)\s+\d+\s+(?:words|characters)\b/i;

/** Questions that start like a yes/no question ("Are you …", "Do you have 5+ years …"). */
const YES_NO_START = /^\s*(?:are|is|will|would|do|does|did|can|could|have|has|were|was)\s+(?:you|there|your)\b/i;

/** A bare follow-up ("If yes, please describe:", "If (f) Other, please explain:"): no subject to write about. */
const BARE_FOLLOW_UP = /^\s*(?:if\b[^.?:]{0,50}[,:]?\s*(?:please\s+)?(?:describe|explain|specify|elaborate|list|tell us|provide (?:details|more information))\b[^a-z]*$|if (?:yes|no|not|so|other)\b)/i;

/** A follow-up that leans on another question ("If you answered Yes to the above question, …"): the AI cannot see what
 * that question was, so any draft would be invented. */
const REFERS_TO_OTHER_QUESTION = /\b(?:above|previous|prior|preceding|earlier) question\b|\bquestion above\b|\bif you answered\b|\bpregunta anterior\b|\bpergunta anterior\b|\bquestion pr[eé]c[eé]dente\b|\bvorherige[nr]? frage\b|上一題|上一题|前の質問/i;

/** Whether an AI draft may be offered for this question. `multiLine` is true for a text area. */
export function isEssayQuestion(label: string, multiLine: boolean): boolean {
  const text = label.replace(/\s+/g, " ").trim();
  if (text.length < (/[぀-ヿ㐀-鿿가-힯]/.test(text) ? 4 : 12)) return false;
  if (FACTUAL.test(text) || FACTUAL_WORLD.test(text)) return false;
  if (BARE_FOLLOW_UP.test(text) || REFERS_TO_OTHER_QUESTION.test(text)) return false;
  const asks = ESSAY_ASK.test(text) || ESSAY_ASK_WORLD.test(text) || PROSE_LENGTH.test(text) || /\d+\s*字/.test(text);
  // "Are you able to attend … ? If not, please elaborate" is a fact about the candidate, not an essay; "Have you led a
  // team? If yes, describe your experience" asks for an account, so it stays.
  if (YES_NO_START.test(text) && !asks) return false;
  if (asks) return true;
  // Other multi-line questions ("What does great customer success look like to you?") are open questions; a one-line
  // box without an essay ask is a short fact.
  return multiLine && /[?？¿]|\b(?:what|how|which)\b/i.test(text);
}

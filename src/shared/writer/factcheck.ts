/** The fact checker for AI drafts (on-device models and Chrome's built-in model alike). Small models invent facts
 * ("led a team of 4", Kubernetes experience copied from the job description), so every draft passes through here
 * before the user sees it. Pure, so it is heavily unit-tested.
 *
 * For each sentence of the draft:
 *  - numbers: every number must appear in the profile facts or the resume (or in the question itself);
 *  - job-only skills: a first-person claim of a tool or skill that only the job description (or the question) names
 *    is an invention. A negation ("I haven't used Kubernetes yet, but…") or a wish ("I'd love to learn Kafka") is fine;
 *  - strong verbs (led, managed, founded, built, launched, mentored…) need the same kind of verb in a related resume
 *    line;
 *  - grounding: a first-person statement of fact needs enough shared content words with some resume line or profile
 *    fact.
 * A sentence that fails any check is removed (the panel says how many and why). When too little is left, the result
 * is "insufficient" and the panel says there are not enough facts. Finally the text is cut to the question's length
 * limit at a whole sentence.
 *
 * Limits: the verb and grounding checks read English only; drafts in other languages get the number and skill checks
 * (which work in any language) and the user's review. */

import { countWords, fitToLimit, type LengthLimit } from "../length-limit";
import { extractTechTerms } from "../techterms";
import { contentWords, isEnglish, splitSentences, stem, STOP, words } from "./words";

export const INSUFFICIENT = "INSUFFICIENT";

export interface FactSources {
  /** Profile facts, one per line ("Skills: Python, SQL"). */
  profileFacts: string[];
  /** The text of the user's resume. */
  resumeText: string;
  /** The question being answered: its own numbers ("in the last 12 months") may be repeated. */
  question: string;
  job: { title: string; company: string; description?: string };
}

export type RemovalReason = "number" | "skill" | "strong-verb" | "unsupported" | "placeholder";

export interface Removed {
  sentence: string;
  reason: RemovalReason;
  /** "4", "Kubernetes", "led". */
  detail: string;
}

export interface FactCheckResult {
  status: "ok" | "insufficient" | "too-long";
  /** The checked text (status "ok" only). */
  text?: string;
  removed: Removed[];
  /** Cut to the length limit at a whole sentence. */
  shortened: boolean;
}

// ---------------------------------------------------------------------------------------------------------------
// Cleaning the raw model output

const CHATTER_LINE = /^(?:sure|certainly|of course|okay|ok|absolutely|great|here(?:'s| is| are)|below is|the following is)\b[^\n]*:\s*$/i;
const LABEL_PREFIX = /^(?:answer|draft|response|final answer|respuesta|antwort|réponse|resposta|回答|答案)\s*[:：]\s*/i;
const TAIL_LINE = /^(?:\(?\s*(?:word count|words?\s*:|note\s*:|p\.?s\.?)|\(?\d+\s+words?\)?\.?$|let me know|i hope this|feel free|hope this helps|would you like)/i;

/** The answer part of a model's output: thinking text, "Sure, here is…" lines, labels, word counts, markdown marks and
 * wrapping quotes removed. */
export function cleanModelOutput(raw: string): string {
  let t = (raw ?? "").replace(/\r\n?/g, "\n");
  t = t.replace(/<think>[\s\S]*?<\/think>/gi, "");
  if (/<\/think>/i.test(t)) t = t.slice(t.toLowerCase().lastIndexOf("</think>") + 8);
  const open = t.toLowerCase().indexOf("<think>");
  if (open >= 0) t = t.slice(0, open); // still thinking when it stopped: nothing after it is an answer
  t = t.replace(/<\|[^|>]*\|>/g, ""); // stray special tokens
  const lines = t.split("\n").map((l) => l.trim());
  while (lines.length && (!lines[0] || CHATTER_LINE.test(lines[0]!))) lines.shift();
  while (lines.length && (!lines[lines.length - 1] || TAIL_LINE.test(lines[lines.length - 1]!))) lines.pop();
  t = lines
    .map((l) => l.replace(/^#{1,6}\s+/, "").replace(/\*\*|__/g, "").replace(/^[-*•]\s+/, "").replace(/^\d+[.)]\s+(?=\p{L})/u, ""))
    .join("\n");
  t = t.replace(LABEL_PREFIX, "");
  t = t.replace(/\n{3,}/g, "\n\n").trim();
  if (/^["“][\s\S]*["”]$/.test(t) && !/["“”]/.test(t.slice(1, -1))) t = t.slice(1, -1).trim();
  return t;
}

// ---------------------------------------------------------------------------------------------------------------
// Numbers

const NUMBER_WORDS: Record<string, number> = {
  two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
  thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, dozen: 12,
  dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
  zwei: 2, drei: 3, vier: 4, fünf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10,
  deux: 2, trois: 3, quatre: 4, cinq: 5, huit: 8, neuf: 9, dix: 10,
};
/** Common expressions with digits that are not facts. */
const IDIOMS = /\b24\s*[/x]\s*7\b|\b1\s*:\s*1\b|\b1-on-1\b|\b360[- ]degree\b|\bweb\s?[23](?:\.0)?\b|\b[23]D\b|\bB2[BC]\b|\bP2P\b/gi;

/** The numbers in a text, normalized ("1,200" → "1200", "35%" → "35", "four" → "4"). Digits inside names ("EC2",
 * "GPT-4", "Python3", "S3") are not numbers. */
export function numbersIn(text: string): string[] {
  const t = (text ?? "").replace(IDIOMS, " ");
  const out: string[] = [];
  const re = /(?<![\p{L}\p{N}_.,/])(?<!\p{L}-)(\d+(?:[.,]\d+)*)(?=%|\+|x\b|k\b|m\b|bn\b|b\b|s\b|th\b|st\b|nd\b|rd\b|[^\p{L}]|$)/giu;
  for (const m of t.matchAll(re)) {
    let n = m[1]!;
    if (/^\d{1,3}(?:[,.]\d{3})+$/.test(n)) n = n.replace(/[.,]/g, "");
    else n = n.replace(",", ".");
    n = n.replace(/^0+(?=\d)/, "");
    out.push(n);
  }
  for (const w of words(t)) if (w in NUMBER_WORDS) out.push(String(NUMBER_WORDS[w]));
  // Chinese and Japanese numerals for small counts ("四个", "三年").
  for (const m of t.matchAll(/([二三四五六七八九十]+)(?=[个個名人年位项項])/g)) {
    const v = cjkNumber(m[1]!);
    if (v) out.push(String(v));
  }
  return out;
}

function cjkNumber(s: string): number | undefined {
  const d: Record<string, number> = { 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
  if (s === "十") return 10;
  if (s.length === 1) return d[s];
  if (s.length === 2 && s[0] === "十") return 10 + (d[s[1]!] ?? 0);
  if (s.length === 2 && s[1] === "十") return (d[s[0]!] ?? 0) * 10;
  if (s.length === 3 && s[1] === "十") return (d[s[0]!] ?? 0) * 10 + (d[s[2]!] ?? 0);
  return undefined;
}

// ---------------------------------------------------------------------------------------------------------------
// Claims, negations and wishes

const FIRST_PERSON = /\b(?:i|i'm|i've|i'd|i'll|me|my|mine|myself|we|we've|we're|our|yo|mi|mis|tengo|ich|mein|meine|meinen|mir|mich|habe|je|mon|ma|mes|moi|eu|meu|minha|tenho|io|mio|mia|ho|ik|mijn|heb)\b|\bj'|我|私|僕|저는|제가|나는/i;
/** "not", "haven't", "no experience with"… (a bare "no" is not one: "with no downtime" is still a claim). */
const NEGATION = /\b(?:not|never|haven't|hasn't|hadn't|don't|didn't|doesn't|isn't|aren't|wasn't|without|lack|lacking|yet to|new to|limited|unfamiliar|no (?:experience|prior|direct|professional|hands-on|production|real|formal)|nunca|todavía no|aún no|sin|noch nicht|nicht|kein|keine|keinen|pas|jamais|ainda não|não|non|mai)\b|n't\b|没有|沒有|未曾|尚未|还没|還沒|ありません|ない/i;
const WISH = /\b(?:learn|learning|eager|keen|excited|look(?:ing)? forward|would (?:love|like|enjoy)|i'd (?:love|like|enjoy)|want to|wish|hope|hoping|interested in|opportunity to|curious|explore|exploring|grow|growing|aspire|aim to|plan to|ready to|motivat\w*|aprender|lernen|apprendre|imparare)\b/i;
const THIRD_PARTY = /\b(?:you|your|the team|the role|this role|the position|this position|the company|they|their|it|which|that uses?|the job|the stack|the platform)\b/i;
/** First-person claims of having done or knowing something (any tense, any language we can read). */
const CLAIM = /\b(?:i|we)\s+(?:have\s+|had\s+|'ve\s+|also\s+|recently\s+|successfully\s+|personally\s+|then\s+|regularly\s+|daily\s+)?(?:used|use|built|build|worked|work|developed|deployed|ran|run|managed|implemented|designed|wrote|created|maintained|operated|migrated|configured|shipped|led|optimi[sz]ed|automated|administered|know|knew|master(?:ed)?|delivered)\b|\b(?:i|we)(?:'ve| have| had)\b|\b(?:i'm|i am)\s+(?:skilled|proficient|experienced|an expert|expert|familiar|certified|fluent|comfortable|confident|strong|well[- ]versed)\b|\bmy\b|\bour\b|\bexperience\s+(?:with|in|using|of|on)\b|\bexpertise\b|\bproficien\w*|\bhands-on\b|\b(?:having|after|while|by)\s+(?:used|using|built|building|worked|working|deployed|deploying|run|running|managed|managing|developed|developing)\b|\btengo\b|\bhe (?:usado|trabajado|utilizado|desarrollado)\b|\bexperiencia\b|\berfahrung\b|\bhabe\b|\bj'ai\b|\bexpérience\b|\btenho\b|\bexperiência\b|\bho (?:usato|lavorato)\b|\besperienza\b|经验|經驗|使用过|使用過|用过|用過|経験/i;
/** English first-person statements of fact about past work, a title or years of experience: these need a source. */
const FACT_CLAIM = /\b(?:i|we)\s+(?:have\s+|had\s+|'ve\s+|also\s+|recently\s+|successfully\s+|then\s+|personally\s+|previously\s+|once\s+)?(?:[a-z]+ed|built|ran|led|wrote|made|drove|grew|took|won|set up|shipped|taught|brought|kept|spent|got|did|began|cut|rewrote|sped|caught|found)\b|\b(?:i|we)(?:'ve| have| had)\s+(?:been|worked|used|built|led|[a-z]+ed)\b|\bmy (?:current |previous |last |recent )?(?:experience|work|role at|time at|background|projects?|contributions?|job at|position at)\b|\b(?:i'm|i am) (?:a|an|the|currently|skilled|proficient|experienced|an expert|familiar|certified|fluent)\b|\bi (?:have|hold) (?:a|an|about|over|nearly|more than|\d)|\byears? of (?:experience|work)\b/i;

/** Tool names that are also everyday words ("go", "rest", "excel at", "spark"): matched only as written. */
const AMBIGUOUS = new Set(`go rust ruby swift shell r c spark hive presto excel oracle transformers node node.js express spring rails
phoenix gin echo fiber rest less remix chroma apex assembly julia dart chef puppet helm jest mocha flutter ionic apache koa polars
babel rollup gatsby bootstrap lua perl elixir`.split(/\s+/));

export interface JobTerm {
  term: string;
  /** Only matched with this exact capitalization. */
  exact: boolean;
}

function mentions(text: string, t: JobTerm): boolean {
  const esc = t.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (new RegExp(`(?<![\\p{L}\\p{N}])${esc}(?![\\p{L}\\p{N}+#])`, t.exact ? "u" : "iu").test(text)) return true;
  return !t.exact && extractTechTerms(text).includes(t.term);
}

function clauses(sentence: string): string[] {
  return sentence.split(/[,;:()—–]|\s-\s|\b(?:but|although|though|while|whereas|however|and then|so that|because)\b/i).map((c) => c.trim()).filter(Boolean);
}

/** Whether a sentence claims a skill or tool as the candidate's own. `english`: the draft is in English. */
export function claimsTerm(sentence: string, term: JobTerm | string, company = "", english = true): boolean {
  const t: JobTerm = typeof term === "string" ? { term, exact: false } : term;
  const clause = clauses(sentence).find((c) => mentions(c, t)) ?? sentence;
  if (NEGATION.test(clause)) return false;
  if (CLAIM.test(clause)) return true;
  if (WISH.test(clause)) return false;
  const first = company.trim().split(/\s+/)[0] ?? "";
  const companyHere = first.length > 1 && new RegExp(`\\b${first.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(clause);
  if ((companyHere || THIRD_PARTY.test(clause)) && !FIRST_PERSON.test(clause)) return false;
  if (FIRST_PERSON.test(sentence)) return true;
  // Another language without a pronoun ("Construí pipelines con Kafka"): a plain mention counts as a claim.
  return !english;
}

// ---------------------------------------------------------------------------------------------------------------
// Job-only terms

const COMMON_CAPITALIZED = new Set(`company team role position job candidate candidates experience requirements responsibilities
qualifications benefits remote hybrid onsite office monday tuesday wednesday thursday friday saturday sunday january february
march april may june july august september october november december senior junior lead staff principal engineer engineers
developer developers manager managers analyst analysts scientist designer intern internship head director data software
product customer customers business strong excellent great good plus bonus nice must join apply equal opportunity employer
ability skills skill knowledge degree bachelor bachelors master masters phd years year english responsibility perks salary`.split(/\s+/));

/** The employer's own name, which a draft may always say ("I want to join Northwind Data"): it is not a skill.
 * The panel knows the company only from the web address ("northwinddata", "riotgames"), so the name is also found
 * (1) as capitalized words whose letters make up that address name, and (2) after "join", "work at", "interested
 * in"… in the question itself ("Why are you interested in joining Northwind Data?"). Lower-case words. */
export function employerNameWords(sources: FactSources): string[] {
  const out = new Set<string>();
  const text = `${sources.question}\n${sources.job.description ?? ""}`;
  const slug = sources.job.company.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  if (slug.length >= 3) {
    for (const tok of text.match(/\b[\p{Lu}][\p{L}\p{N}]*/gu) ?? []) {
      const lower = tok.toLowerCase();
      if (lower.length >= 3 && slug.includes(lower)) out.add(lower);
    }
  }
  // Only phrases that name an employer: never "about" or "with" ("Tell us about Kubernetes" names a skill, not the
  // employer, and must stay checked).
  const named = /\b(?:[Jj]oin(?:ing)?|[Ww]ork(?:ing)? (?:at|for)|interested in joining|[Aa]pply(?:ing)? (?:to|at)|excites? you about|appeals to you about|drew you to|[Ww]hy)\s+((?:[\p{Lu}][\p{L}\p{N}&.'’-]*\s?){1,4})(?=[?.!,]|\s*$)/gu;
  for (const m of sources.question.matchAll(named)) for (const w of m[1]!.trim().split(/\s+/)) out.add(w.toLowerCase().replace(/[’'.]+$/, ""));
  return [...out];
}

/** Tools, skills and other names in the job description and the question that appear nowhere in the profile or resume. */
export function jobOnlyTerms(sources: FactSources): JobTerm[] {
  const own = `${sources.profileFacts.join("\n")}\n${sources.resumeText}`;
  const ownTerms = new Set(extractTechTerms(own));
  const ownWords = new Set(words(own));
  const jobText = `${sources.job.description ?? ""}\n${sources.question}`;
  const out = new Map<string, JobTerm>();
  for (const t of extractTechTerms(jobText)) {
    if (!ownTerms.has(t) && !ownWords.has(t.toLowerCase())) out.set(t.toLowerCase(), { term: t, exact: AMBIGUOUS.has(t.toLowerCase()) });
  }
  // Names the vocabulary does not know: capitalized mid-sentence words (English job texts only, since German
  // capitalizes every noun; Title Case headings skipped), CamelCase, ALL-CAPS and names with digits or + / #.
  const nameWords = new Set([...words(`${sources.job.company} ${sources.job.title}`), ...employerNameWords(sources)]);
  const english = isEnglish(jobText);
  for (const sentence of splitSentences(jobText)) {
    const tokens = sentence.match(/[\p{L}][\p{L}\p{N}+#.]*[\p{L}\p{N}+#]|[\p{Lu}]/gu) ?? [];
    const titleCase = tokens.length > 1 && tokens.filter((x) => /^\p{Lu}/u.test(x)).length >= tokens.length * 0.6;
    tokens.forEach((tok, i) => {
      const lower = tok.toLowerCase();
      if (tok.length < 2 || out.has(lower) || COMMON_CAPITALIZED.has(lower) || STOP.has(lower) || nameWords.has(lower) || ownWords.has(lower)) return;
      const camel = /^[\p{Lu}]?[\p{Ll}]+[\p{Lu}][\p{L}]*$/u.test(tok);
      const caps = /^[\p{Lu}]{2,6}s?$/u.test(tok);
      const special = /[\p{N}+#]/u.test(tok) && /\p{L}/u.test(tok);
      const capital = english && !titleCase && i > 0 && /^[\p{Lu}][\p{Ll}]/u.test(tok);
      if (camel || caps || special || capital) out.set(lower, { term: tok, exact: true });
    });
  }
  return [...out.values()];
}

// ---------------------------------------------------------------------------------------------------------------
// Strong verbs

/** Each strong verb with the resume words that support it. */
const STRONG_VERBS: Array<{ forms: RegExp; support: RegExp }> = [
  // Leading or managing PEOPLE is a bigger claim than leading a piece of work: "led the migration" in a resume does
  // not back "led a team in migrating" (seen in the real-model e2e, 2026-11-07). Checked first, with its own proof.
  { forms: /\b(?:led|lead(?:ing)?|managed|manag(?:e|ing)|headed|ran|built|grew|hired)\s+(?:a|an|the|my|our)?\s*(?:\w+\s+){0,2}(?:team|squad|group|engineers|people|reports)\b|\bteam (?:lead|leader|manager)\b|\bmanag(?:ed|ing) (?:\d+|several|multiple|a few) (?:people|engineers|developers|reports)\b|\bdirect reports?\b/i,
    support: /\b(?:led|lead(?:s|ing)?|managed|manag(?:e|ing)|headed|ran|built|grew|hired)\s+(?:a|an|the|my|our)?\s*(?:\w+\s+){0,2}(?:team|squad|group|engineers|people|reports)\b|\bteam (?:lead|leader|manager)\b|\b(?:engineering|team|people) manager\b|\bdirect reports?\b|\bmanag(?:ed|ing) (?:\d+|several|multiple|a few)\b/i },
  { forms: /\b(?:led|lead(?:ing)?|headed|spearhead(?:ed|ing)?|directed|drove|helmed)\b/i, support: /\b(?:led|lead(?:s|ing|er|ers|ership)?|head(?:ed)?|head of|spearhead(?:ed)?|direct(?:ed|or)|drove|ran)\b/i },
  { forms: /\b(?:managed|manag(?:e|ing)|supervised|oversaw|overseen|oversee(?:ing)?)\b/i, support: /\b(?:manag(?:ed|e|er|ers|ing|ement)|supervis(?:ed|or|ing)|oversaw|overs(?:ee|aw|een))\b/i },
  { forms: /\b(?:founded|co-?founded|started (?:a|my own) (?:company|startup|business))\b/i, support: /\b(?:found(?:ed|er|ers|ing)|co-?found(?:ed|er))\b/i },
  { forms: /\b(?:built|build(?:ing)?|architected|engineered|developed|created|designed)\b/i, support: /\b(?:buil[dt]\w*|develop\w*|creat\w*|design\w*|implement\w*|architect\w*|engineer\w*|wr[io]te\w*|made|program\w*|cod(?:ed|ing)|rewr[io]te\w*|add(?:ed)?)\b/i },
  { forms: /\b(?:launched|launch(?:ing)?|shipped|rolled out|released)\b/i, support: /\b(?:launch\w*|ship\w*|roll\w* out|releas\w*|deliver\w*|go-live|went live)\b/i },
  { forms: /\b(?:owned|took ownership|end-to-end ownership)\b/i, support: /\b(?:own(?:ed|er|ership)?|responsib\w*|end-to-end)\b/i },
  { forms: /\b(?:mentored|mentor(?:ing)?|coached|coaching|taught|onboarded|trained (?:new|junior|\d+|the|our|interns|engineers|colleagues|staff|team))\b/i, support: /\b(?:mentor\w*|coach\w*|train(?:ed|ing|er)|taught|teach\w*|onboard\w*|tutor\w*|guid(?:ed|ing))\b/i },
  { forms: /\b(?:pioneered|instituted|initiated)\b/i, support: /\b(?:pioneer\w*|establish\w*|institut\w*|initiat\w*|introduc\w*|start(?:ed)?|found\w*)\b/i },
  { forms: /\b(?:scaled|doubled|tripled|grew (?:the|our|a|revenue|users|traffic|sales))\b/i, support: /\b(?:scal\w*|gr[eo]w\w*|doubl\w*|tripl\w*|increas\w*)\b/i },
];
const VERB_NEGATED = /\b(?:not|never|haven't|hasn't|didn't|don't)\s+(?:\w+\s+)?$|n't\s+(?:\w+\s+)?$/i;
// A wish ("eager to lead", "I would lead"), not "my ability to lead" or "I can lead", which are claims.
const VERB_WISHED = /\b(?:(?:eager|keen|excited|hope|hoping|want|wanting|wish|love|like|ready|plan|planning|aim|aiming|forward|aspire|happy|thrilled|glad|chance|opportunity|learn|learning|grow|growing)\s+to|will|would|could|might|should)\s+(?:\w+\s+)?$/i;

// ---------------------------------------------------------------------------------------------------------------
// The check

interface Unit {
  text: string;
  stems: Set<string>;
}

function unitsOf(sources: FactSources): Unit[] {
  const pieces: string[] = [...sources.profileFacts];
  for (const line of (sources.resumeText ?? "").split(/\n+/)) {
    const ss = splitSentences(line);
    pieces.push(...(ss.length > 1 ? [line, ...ss] : [line]));
  }
  return pieces.map((t) => t.trim()).filter((t) => t.length > 2).map((text) => ({ text, stems: new Set(contentWords(text)) }));
}

/** Words that say nothing about what was done: they never count as support. */
const WEAK = new Set(["work", "worked", "experienc", "experience", "team", "project", "role", "skill", "company", "year", "time", "help", "use", "make", "made", "also", "well", "many", "new", "first"].map(stem));

/** The sentence's content words, without weak words and the employer's own name. */
function claimStems(sentence: string, sources: FactSources): string[] {
  const drop = new Set(contentWords(sources.job.company));
  return [...new Set(contentWords(sentence))].filter((w) => !drop.has(w) && !WEAK.has(w));
}

function bestOverlap(stems: string[], units: Unit[]): number {
  let best = 0;
  for (const u of units) {
    let n = 0;
    for (const s of stems) if (u.stems.has(s)) n++;
    best = Math.max(best, n);
  }
  return best;
}

/** The shortest answer worth offering for this question, in words. */
function minimumWords(limit: LengthLimit | undefined): number {
  if (!limit) return 15;
  const target = limit.maxWords ?? (limit.maxChars ? limit.maxChars / 6 : undefined) ?? (limit.maxSentences ? limit.maxSentences * 12 : 60);
  return Math.max(6, Math.min(25, Math.round(Math.min(target, limit.minWords ?? Infinity) * 0.25)));
}

/** Checks a draft against the user's own facts. See the file comment for the rules. */
export function factCheck(raw: string, sources: FactSources, limit?: LengthLimit): FactCheckResult {
  const removed: Removed[] = [];
  let text = cleanModelOutput(raw);
  if (text.includes(INSUFFICIENT)) {
    // A plain refusal is honest; an answer that also says INSUFFICIENT is kept only if what is left passes.
    text = text.replace(new RegExp(`[ \\t]*\\b${INSUFFICIENT}\\b[.!:]*`, "g"), " ").replace(/[ \t]{2,}/g, " ").trim();
  }
  if (!text || !/\p{L}/u.test(text)) return { status: "insufficient", removed, shortened: false };

  const own = `${sources.profileFacts.join("\n")}\n${sources.resumeText}`;
  const allowed = new Set([...numbersIn(own), ...numbersIn(sources.question), ...numbersIn(`${sources.job.title} ${sources.job.company}`)]);
  const jobNumbers = new Set(numbersIn(sources.job.description ?? ""));
  const jobOnly = jobOnlyTerms(sources);
  const units = unitsOf(sources);
  const english = isEnglish(text);

  const checkSentence = (s: string): Removed | undefined => {
    const blank = s.match(/\[[^\]]{2,40}\]|\{\{?[^}]{2,40}\}\}?|<[A-Z][^>]{1,30}>/);
    if (blank) return { sentence: s, reason: "placeholder", detail: blank[0] };
    const firstPerson = FIRST_PERSON.test(s);
    for (const n of numbersIn(s)) {
      if (allowed.has(n)) continue;
      if (jobNumbers.has(n) && !firstPerson) continue; // "Northwind serves 300 customers": the company's own number
      return { sentence: s, reason: "number", detail: n };
    }
    for (const term of jobOnly) {
      if (mentions(s, term) && claimsTerm(s, term, sources.job.company, english)) return { sentence: s, reason: "skill", detail: term.term };
    }
    if (!english) return undefined; // the verb and grounding checks below read English
    const stems = claimStems(s, sources);
    for (const v of STRONG_VERBS) {
      const m = s.match(v.forms);
      if (!m) continue;
      const before = s.slice(0, m.index);
      if (VERB_NEGATED.test(before) || VERB_WISHED.test(before)) continue; // "I have not led…", "I'd love to lead…"
      if (!firstPerson && !/^\s*(?:\w+\s+){0,3}$/.test(before)) continue; // about someone else ("the team built…")
      const verbStem = stem(m[0]!.toLowerCase().split(/\s+/)[0]!);
      const others = stems.filter((w) => w !== verbStem);
      const supported = units.some((u) => v.support.test(u.text) && others.some((w) => u.stems.has(w)));
      if (!supported) return { sentence: s, reason: "strong-verb", detail: m[0]! };
    }
    if (firstPerson && FACT_CLAIM.test(s)) {
      const count = bestOverlap(stems, units);
      const need = stems.length <= 3 ? 1 : stems.length <= 8 ? 2 : 3;
      if (count < need) return { sentence: s, reason: "unsupported", detail: `${count} of ${stems.length} words found in your resume` };
    }
    return undefined;
  };

  const keptParas: string[] = [];
  let totalWords = 0;
  for (const para of text.split(/\n\s*\n/)) {
    const kept: string[] = [];
    for (const line of para.split("\n")) {
      const keptLine: string[] = [];
      for (const s of splitSentences(line)) {
        totalWords += countWords(s);
        const fail = checkSentence(s);
        if (fail) removed.push(fail);
        else keptLine.push(s);
      }
      if (keptLine.length) kept.push(keptLine.join(" "));
    }
    if (kept.length) keptParas.push(kept.join("\n"));
  }
  // A removed opening sentence can leave "I have also…" or "Additionally, …" at the start: drop that leftover link word.
  const joined = keptParas.join("\n\n").trim();
  const checked = removed.length
    ? joined
      .replace(/^(?:Also|Additionally|Moreover|Furthermore|In addition|Besides),\s*(\p{L})/u, (_, c: string) => c.toUpperCase())
      .replace(/^(I|We)( have| had|'ve)? also\b\s*/, (_, who: string, aux = "") => `${who}${aux} `)
    : joined;
  const left = countWords(checked);
  if (!checked || left < minimumWords(limit) || (removed.length && left < totalWords * 0.4)) {
    return { status: "insufficient", removed, shortened: false };
  }
  const fitted = fitToLimit(checked, limit);
  if (!fitted) return { status: "too-long", removed, shortened: false };
  return { status: "ok", text: fitted, removed, shortened: fitted !== checked };
}

/** One plain line for the panel about what was removed. */
export function removedSummary(removed: Removed[]): string | undefined {
  if (!removed.length) return undefined;
  const why = (r: Removed) =>
    r.reason === "number" ? `the number ${r.detail} is not in your profile or resume`
      : r.reason === "skill" ? `${r.detail} is named in the job, not in your profile or resume`
        : r.reason === "strong-verb" ? `"${r.detail}" is not backed by your resume`
          : r.reason === "placeholder" ? "it had a blank to fill in"
            : "it is not backed by your resume";
  const n = removed.length;
  return `We took out ${n} sentence${n > 1 ? "s" : ""} because ${n > 1 ? "they" : "it"} said something your profile and resume do not show (${removed.slice(0, 3).map(why).join("; ")}${n > 3 ? "; …" : ""}).`;
}

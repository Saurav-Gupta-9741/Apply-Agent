/** Understanding by meaning: the local model says what a question asks ("Joining timeline?" → notice period), the
 * rules and safety checks decide whether ApplyAgent may act on it. The model alone never puts a value on a form:
 *  - the user's own saved answers and the rules come first; the model fills gaps the rules could not name, and
 *    only when it is confident and every safety check for that kind of answer passes (the same checks the rules use)
 *  - when the rules would act but the model is very sure the question means something else, ApplyAgent asks
 *  - two keys: the question must also say something of that meaning in plain words. A confident model can still be
 *    confidently wrong ("Do you have a valid driver's license?" read as a disability question); a loose word alone
 *    would be far too loose. Both together are neither. */

import type { Decision, FieldDescriptor, Profile, ProfileKey, SensitiveTopic } from "../shared/types";
import { decide, notAProfileFact, profileValue } from "./classify";
import { factDecision, YES_NO_QUESTION, type PageFacts } from "./facts";
import { normalize } from "../shared/text";

/** What the model read in a question. */
export interface Meaning {
  intent: string;
  confidence: number;
}

/** Act on the model's reading from this confidence (98.6% right on real questions it had never seen). */
export const ACT_CONFIDENCE = 0.85;
/** Safe profile facts where wrong is impossible or harmless: names, email, phone, links, location. */
export const SAFE_ACT_CONFIDENCE = 0.80;
export const SAFE_PROFILE_INTENTS = new Set<string>([
  "firstName", "lastName", "fullName", "email", "phone", "linkedin", "github", "portfolio", "resumeUrl",
]);

/** Required confidence to act on a model reading. */
export function actThreshold(intent: string): number {
  return SAFE_PROFILE_INTENTS.has(intent) ? SAFE_ACT_CONFIDENCE : ACT_CONFIDENCE;
}

/** Doubt the rules from this confidence. */
export const DOUBT_CONFIDENCE = 0.95;

const PROFILE_INTENTS = new Set<string>([
  "firstName", "lastName", "fullName", "email", "phone", "location", "country", "linkedin", "github", "portfolio", "resumeUrl", "currentCompany",
  "currentTitle", "school", "degree", "discipline", "graduationYear", "experienceYears",
]);
const TOPIC_OF: Record<string, SensitiveTopic> = {
  notice_period: "notice_period", salary_current: "salary", salary_expected: "salary", work_authorization: "work_authorization",
  sponsorship: "sponsorship", relocation: "relocation", gender: "gender", race: "race", hispanic: "race", veteran: "veteran",
  disability: "disability",
};
/** Meanings that are someone else's or the user's own judgement: never filled from the profile. */
const NEVER_FROM_PROFILE = new Set(["other_person", "consent", "legal_declaration", "previous_employee", "open_question", "identity",
  "skills_experience", "language_proficiency", "accommodation", "pronouns", "transgender", "age", "sexual_orientation"]);

const SALARY = /salary|\bctc\b|compensation|\bpay\b|package|earn|remuneration|wage|income|lpa\b|per annum/;

/** The plain words a question of each meaning contains (on the normalized label). A meaning missing here never acts. */
const EVIDENCE: Record<string, RegExp> = {
  firstName: /\bname\b|\bfirst\b|\bgiven\b|forename/,
  lastName: /\bname\b|\blast\b|surname|\bfamily\b/,
  fullName: /\bname\b/,
  email: /e ?mail/,
  phone: /phone|mobile|\bcell\b|telephone|whats ?app|contact (number|no)/,
  location: /\b(city|town|locat\w*|based|live|living|reside\w*|residence|address|where are you)\b/,
  country: /countr|nation|reside|residence|based|\blive\b/,
  linkedin: /linked ?in/,
  github: /git ?hub|git ?lab|bitbucket|\bcode\b|repositor/,
  portfolio: /portfolio|website|web site|personal (site|page)|\burl\b|\blink\b|behance|dribbble/,
  resumeUrl: /resume|cv|curriculum\s*vitae|drive|link|url/,
  currentCompany: /compan|employer|organi[sz]ation|\bfirm\b|where do you (currently )?work/,
  currentTitle: /title|\brole\b|position|designation|\bjob\b/,
  school: /school|universit|college|institut|alma mater|stud(y|ied)|educat/,
  degree: /degree|qualification|diploma|bachelor|master|educat/,
  discipline: /\bmajor\b|discipline|field of stud|speciali[sz]|subject|stream|concentration|branch/,
  graduationYear: /graduat|passing|pass out|passed out|completion|class of/,
  experienceYears: /\byears?\b|\byoe\b/,
  notice_period: /notice|\bstart\b|\bjoin|availab|commence|\bbegin/,
  salary_current: SALARY,
  salary_expected: SALARY,
  work_authorization: /authori[sz]|legally|right to work|work permit|permitted to work|entitled to work|eligib\w* to work|eligib\w* for employment/,
  sponsorship: /sponsor|\bvisa\b|h ?1 ?b|immigration/,
  relocation: /relocat|\bmove\b|moving/,
  gender: /gender|\bsex\b|\bmale\b|female|wom[ae]n|\bm[ae]n\b/,
  race: /\brace\b|racial|ethnic/,
  hispanic: /hispanic|latin/,
  veteran: /veteran/,
  disability: /disab|impair|handicap/,
  heard_about: /\bhear\b|\bheard\b|learn\w* (about|of)|find out|found (out|this|us|the)|\bsource\b|referr|discover|come across|came across|how did you/,
  resume: /resume|\bcv\b|curriculum/,
};

/** "Years of experience WITH React": a number of years about one skill is not the profile's total. */
const SPECIFIC_EXPERIENCE = /\b(with|in|using|on|of)\s+(?!(total|overall|professional|work|relevant work|industry|the industry|full time|paid)\b)\w/;

/** The question says something of the model's reading in plain words. */
function hasEvidence(label: string, intent: string): boolean {
  const text = normalize(label);
  const words = EVIDENCE[intent];
  if (!words || !words.test(text)) return false;
  if (intent === "experienceYears" && SPECIFIC_EXPERIENCE.test(text.replace(/\byears? of (professional |work )?experience\b/, ""))) return false;
  return true;
}

/** Yes/No choices: never a place for a name, a company or a link. */
function yesNoChoices(field: FieldDescriptor): boolean {
  const real = field.options.map((o) => normalize(o)).filter((o) => o && !/^(select|choose|please select|none|n a)\b/.test(o));
  return real.length > 0 && real.every((o) => /^(yes|no|y|n|true|false|maybe|prefer not|decline|i don t know)\b/.test(o));
}

/** The meaning a rule decision acted on, to compare with the model's reading. */
function actedMeaning(d: Decision): string | undefined {
  if (d.kind === "profile") return d.key;
  if (d.kind === "resume") return "resume";
  return undefined;
}

/** A value for the model's reading, through the same safety checks the rules use. */
function fromMeaning(field: FieldDescriptor, profile: Profile, meaning: Meaning, page?: PageFacts): Decision | undefined {
  const { intent } = meaning;
  if (!hasEvidence(field.label, intent)) return undefined;
  if (PROFILE_INTENTS.has(intent)) {
    // Choices and tick boxes are never answered with profile text; neither are yes/no questions or questions the
    // guards reject.
    if (["radio", "checkbox", "checkbox_group", "file"].includes(field.control) || notAProfileFact(field)) return undefined;
    if (yesNoChoices(field) || YES_NO_QUESTION.test(normalize(field.label))) return undefined;
    const value = profileValue(profile, intent as ProfileKey | "fullName");
    if (value) return { kind: "profile", key: intent as ProfileKey | "fullName", value };
    return field.required ? { kind: "ask", reason: "missing_profile_value" } : undefined;
  }
  if (TOPIC_OF[intent]) return factDecision({ ...field, label: hispanicHint(field.label, intent) }, profile, TOPIC_OF[intent], page);
  if (intent === "heard_about") {
    const heard = profile.facts?.heardFrom.trim();
    return heard && field.control !== "textarea" && field.control !== "checkbox" ? { kind: "answer", value: heard, question: "Quick answers › how you heard" } : undefined;
  }
  if (intent === "resume" && field.control === "file") return profile.resume ? { kind: "resume" } : undefined;
  return undefined;
}

/** The Hispanic/Latino rule looks for those words; the model may have recognised the question without them. */
function hispanicHint(label: string, intent: string): string {
  return intent === "hispanic" && !/hispanic|latin/i.test(label) ? `${label} (Hispanic or Latino)` : label;
}

/** The decision for a field, with the model's reading of it when there is one. */
export function decideWithMeaning(field: FieldDescriptor, profile: Profile, answers: Parameters<typeof decide>[2], page?: PageFacts,
  meaning?: Meaning): Decision {
  const rule = decide(field, profile, answers, page);
  if (!meaning) return rule;

  // Doubt: the rules would fill a profile fact, but the model is very sure the question is about something else
  // ("Preferred Last Name" read as a first name, someone else's details, a consent…). Asking is the safe side.
  const acted = actedMeaning(rule);
  // The model reads English: it may doubt the rules only on English questions ("Prénom" is not "other").
  if (acted && meaning.confidence >= DOUBT_CONFIDENCE && readsAsEnglish(field.label) && meaning.intent !== acted && !sameFamily(acted, meaning.intent)) {
    return field.required ? { kind: "ask", reason: "unknown" } : { kind: "skip", reason: `unsure: reads like ${meaning.intent.replace(/_/g, " ")}` };
  }

  // Gaps: the rules did not know the question; the model does, confidently.
  const ruleGaveUp = rule.kind === "ask" && rule.reason !== "sensitive" || rule.kind === "skip" && /not in profile|optional choice/.test(rule.reason)
    || rule.kind === "ask" && rule.reason === "sensitive" && !rule.topic;
  const sensitiveGap = rule.kind === "ask" && rule.reason === "sensitive" && rule.topic && TOPIC_OF[meaning.intent] === rule.topic;
  if ((ruleGaveUp || sensitiveGap) && meaning.confidence >= actThreshold(meaning.intent) && !NEVER_FROM_PROFILE.has(meaning.intent)) {
    const decision = fromMeaning(field, profile, meaning, page);
    if (decision) return decision;
  }
  return rule;
}

const ENGLISH = /\b(the|your|you|what|which|where|when|how|please|name|of|to|in|for|are|is|do|a|an|and|or|with|link|url|number|address|email|phone|profile|preferred|current|last|first|full|website|portfolio|company|title|city|country)\b/;

function readsAsEnglish(label: string): boolean {
  return ENGLISH.test(normalize(label));
}

/** Readings close enough not to doubt each other (a full name where the rules saw a first name, a city vs country…). */
function sameFamily(a: string, b: string): boolean {
  const families = [["firstName", "fullName", "lastName"], ["location", "country", "state", "address"], ["linkedin", "github", "portfolio", "other_links", "resumeUrl", "resume"],
    ["degree", "education_level", "discipline"], ["currentTitle", "currentCompany"]];
  return families.some((f) => f.includes(a) && f.includes(b)) && !(a === "firstName" && b === "lastName") && !(a === "lastName" && b === "firstName");
}

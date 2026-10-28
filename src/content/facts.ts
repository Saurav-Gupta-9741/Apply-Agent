/** Quick answers: one answer per question that most forms ask in their own words (Answers → Quick answers). Each rule
 * answers only when the question clearly is that question; anything unclear is left to the user:
 *  - work authorization / sponsorship: only when the question names a country (or "your country of residence");
 *    "the country where this job is located" is asked
 *  - salary: current vs expected must be clear, and a question in another currency than the answer is asked
 *  - relocation: only the general question "Are you willing to relocate?"
 *  - diversity questions: only where the form offers choices, and only a choice that clearly matches */

import type { ApplicationRecord, Decision, FieldDescriptor, Profile, QuickFacts, SensitiveTopic } from "../shared/types";
import { canonicalCountries, canWorkIn, countriesIn } from "../shared/countries";
import { bestOption, normalize, yesNoOption } from "../shared/text";
import { hasExceptionClause, isCompanyOrPlaceSpecific } from "../shared/screening";

/** "How did you hear about this job?" in its many wordings. */
export const HEARD_ABOUT = /how did you (hear|learn|find out|come across)|where did you (hear|learn|find)|how did you find (out about )?(us|this)|where have you (learned|heard) about|how you heard about|source of (your )?application|referral source/;

const answer = (value: string, what: string): Decision => ({ kind: "answer", value, question: `Quick answers › ${what}` });

/** A question answered with yes or no: a yes/no list, a choice, or a short text box (never a long explanation). */
/** "If you have a visa, please share all relevant details (visa type, expirations…)" wants details, not yes or no
 * (seen on a real form, where a bare "No" was about to be typed). */
const WANTS_DETAILS = /^if (you|your|so|yes|applicable)\b|\b(share|describe|provide|list|explain|specify|elaborate)\b|\bdetails?\b|\bwhich (visa|permit)\b|\bwhat (type|kind) of\b|\bif so\b|\bwhen does your\b/;

/** Questions that open with a question word ask for something, never for yes or no ("In what countries do you have
 * the right to work?", "What is the source of your right to work?"; both seen on real forms). */
const WH_QUESTION = /^(in |from |for |to )?(what|which|where|when|how|who|whom|whose|why|qual|quais|quel|quelle|cual|cuales|welche[rs]?|wie|wo|wann)\b/;
/** A question asked with a verb first: answered yes or no ("Are you subject to a notice period?"). */
export const YES_NO_QUESTION = /^(are|is|do|does|did|have|has|had|will|would|can|could|should|were|was|may|might|shall)\b/;
/** Long statements with a tick box (legal notices, consent texts) are declarations, not questions to answer for the user. */
const MAX_ANSWERABLE_WORDS = 35;

export function answerableLength(label: string): boolean {
  return normalize(label).split(" ").length <= MAX_ANSWERABLE_WORDS;
}

function yesNoField(field: FieldDescriptor): boolean {
  if (field.control === "textarea" || field.control === "checkbox_group" || field.control === "file") return false;
  const q = normalize(field.label);
  if (WANTS_DETAILS.test(q) || WH_QUESTION.test(q) || !answerableLength(field.label)) return false;
  // A text box takes "Yes"/"No" only when it asks a yes/no question: "Visa situation" or "Please confirm type of
  // right to work document" want words. Lists that open on click show their choices only then.
  if (!field.options.length) {
    return ["combobox", "dropdown", "select", "radio"].includes(field.control) || YES_NO_QUESTION.test(q) || /\?\s*$/.test(field.label);
  }
  const options = field.options.map(normalize);
  return options.some((o) => /^(yes|oui|ja|si|sim)\b/.test(o)) && options.some((o) => /^(no|non|nein|nao)\b/.test(o));
}

/** What the page says about the job (read once per page). */
export interface PageFacts {
  /** Countries the job is in, from its structured data or location line (empty when unknown). */
  jobCountries: string[];
  /** URL of the application page, to identify the company and check application history. */
  url?: string;
  /** Confirmed application history from the tracker. */
  applications?: ApplicationRecord[];
}

/** The question itself: brackets and statements around it ("This role is not eligible for visa sponsorship.") are
 * context. Several questions in one label ("Are you authorized…? If not, will you need sponsorship?") have no single
 * yes or no: undefined. */
function theQuestion(label: string): string | undefined {
  const sentences = label.replace(/\([^)]*\)|\[[^\]]*\]/g, " ").split(/(?<=[.?!])\s+/).map((x) => x.trim()).filter(Boolean);
  const asked = sentences.filter((x) => /\?\s*$/.test(x));
  if (asked.length > 1) return undefined;
  return normalize(asked[0] ?? sentences[sentences.length - 1] ?? "");
}

/** What a yes/no about working there means: the user's right to work, or their need for a visa. */
const ABOUT_WORKING = /authori[sz]|eligib|entitled|right to work|permitted|legally|sponsor|visa|immigration|work permit|permission to work|droit de travailler|droit au travail|derecho a trabajar|direito de trabalhar|arbeitsberechtigung|berechtigt|arbeitserlaubnis|arbeitsgenehmigung|visum|autoris|permis de travail|autoriz|permiso de trabajo|werkvergunning|permesso|parrainage|patrocinio/;
/** "Do you still wish to proceed?", "Is your right to work tied to another employer?", "…in any country other than
 * India?", "Are you NOT authorized…?": another question, or one turned round in a way a rule must not guess. */
const NOT_A_PLAIN_ASK = /\b(not|never|neither|nor|except|apart from|besides|other than|wish|proceed|acknowledge|understand|agree|tied|restricted|restriction|type of|kind of)\b|n t\b/;
/** Asking whether the user NEEDS something (a visa, sponsorship, a permit), in the languages the rules read. */
const NEEDS = /\b(require|requires|required|need|needs|needed|benotig\w*|brauch\w*|besoin|necesit\w*|precis\w*|nodig|richied\w*|bisogno|necessit\w*)\b/;

function workAnswer(field: FieldDescriptor, profile: Profile, facts: QuickFacts, page?: PageFacts): Decision | undefined {
  const allowed = canonicalCountries(facts.workCountries);
  if (!allowed.length || !yesNoField(field)) return undefined;
  const q = theQuestion(field.label);
  // What follows "without" is what the user would not need ("…without the need for a visa", "…without restriction"):
  // it neither makes the question another one nor turns it round.
  const asked = q?.replace(/\bwithout\b.*$/, "") ?? "";
  if (!q || !ABOUT_WORKING.test(normalize(field.label)) || NOT_A_PLAIN_ASK.test(asked)) return undefined;
  let places = countriesIn(field.label);
  if (!places.length && /country (of residence|where you (currently )?(live|reside))|where you (currently )?(live|reside)|your (current )?country/.test(q)) {
    places = countriesIn(profile.country);
  }
  // No country in the question ("…require sponsorship to work at Cloudflare?"): it is about this job, so the job's own
  // country decides, when the page names exactly that. A choice made earlier on the form is the user's to recall.
  if (!places.length && page?.jobCountries.length && !/you selected|previous (response|question|answer)|above/.test(q)) places = page.jobCountries;
  if (!places.length) return undefined; // the job's country is not known: the user decides
  const can = places.map((c) => canWorkIn(c, allowed));
  if (!can.every((x) => x === can[0])) return undefined; // "the US or Canada" with a yes for one and a no for the other
  // Polarity from the question's own words ("…the right to work in Poland without the need for a visa?" asks about the
  // right to work).
  const needs = NEEDS.test(asked) || /sponsor/.test(asked);
  const yes = needs ? !can[0] : can[0];
  return answer(yes ? "Yes" : "No", needs ? "sponsorship" : "work authorization");
}

const CURRENCY: Array<[string, RegExp]> = [
  ["INR", /₹|\brs\b|\binr\b|rupees?|\blpa\b|lakhs?|lacs?|crores?/],
  ["USD", /\$|\busd\b|dollars?/],
  ["EUR", /€|\beur\b|euros?/],
  ["GBP", /£|\bgbp\b|\bpounds?\b/],
  ["OTHER", /¥|₩|₪|₺|\b(chf|sgd|aud|cad|nzd|hkd|jpy|cny|rmb|aed|sar|qar|sek|nok|dkk|pln|czk|huf|zar|myr|idr|php|thb|vnd|brl|mxn|krw|ils|try|ron|bgn)\b|francs?|dirhams?|riyals?|\byen\b|yuan/],
];
const PERIOD: Array<[string, RegExp]> = [
  ["month", /\bmonth(ly)?\b|per month|\bp ?m\b|a month|in hand/],
  ["hour", /\bhour(ly)?\b|per hour|\bhr\b|\bp ?h\b/],
  ["week", /\bweek(ly)?\b|per week/],
  ["day", /\bdaily\b|per day/],
  ["year", /\bannual(ly)?\b|per annum|\byearly\b|per year|\bp ?a\b|\blpa\b|\bctc\b|a year/],
];
const kindOf = (text: string, kinds: Array<[string, RegExp]>) => kinds.find(([, re]) => re.test(text.toLowerCase()))?.[0];

/** Salary from the quick answers, only when the question asks for exactly that value in the same currency and over
 * the same period (never converted), as one answer (not "current and expected"), and not as a yes/no question. */
function salaryAnswer(field: FieldDescriptor, facts: QuickFacts): Decision | undefined {
  const q = normalize(field.label);
  // "Is your current salary negotiable?" asks yes or no. "Could you please share your expectations?" asks for the amount.
  const politeAsk = /^(could|can|would) you (please )?(let us know|tell|share|specify|provide|give|indicate|state)\b/.test(q);
  if (YES_NO_QUESTION.test(q) && !politeAsk && field.control !== "number") return undefined;
  const asksExpected = /expect|desired|requirement|range|asking|looking for|anticipated|expectativa|pretens|esperad|souhait|gewunscht|erwart|vorstellung/.test(q);
  const asksCurrent = /\b(current|present|existing|last drawn|now|today|atual|actual|aktuell\w*|actuel\w*|attuale|huidig\w*)\b/.test(q);
  if (asksExpected && asksCurrent) return undefined; // two values in one box
  const value = (asksExpected ? facts.expectedCtc?.trim() : asksCurrent ? facts.currentCtc?.trim() : "") ?? "";
  if (!value) return undefined;
  const what = asksExpected ? "expected CTC" : "current CTC";
  const asked = `${field.label} ${field.placeholder}`;
  const askedCurrency = kindOf(asked, CURRENCY);
  const valueCurrency = kindOf(value, CURRENCY);
  // Asked in a currency: the saved value must say the same one (a bare number is only taken as rupees).
  if (askedCurrency && askedCurrency !== (valueCurrency ?? "INR")) return undefined;
  // "Please specify Monthly/Annually": the form takes either, so it names no period.
  const periods = PERIOD.filter(([, re]) => re.test(asked.toLowerCase())).length;
  const askedPeriod = periods > 1 ? "year" : kindOf(asked, PERIOD) ?? "year";
  const valuePeriod = kindOf(value, PERIOD) ?? "year"; // a CTC is yearly unless it says otherwise
  if (askedPeriod !== valuePeriod) return undefined;
  if (field.control === "number") {
    // A number box takes a plain amount: "18 LPA" is 18 only where the box itself is in lakhs.
    const inLakhs = /\blakhs?\b|\blacs?\b|\blpa\b/;
    const n = /\d+(\.\d+)?/.exec(value.replace(/,/g, ""))?.[0];
    if (!n) return undefined;
    if (inLakhs.test(value.toLowerCase())) return inLakhs.test(q) ? answer(n, what) : undefined;
    if (/\d\s*(k|m|cr|crores?)\b/i.test(value)) return undefined;
    return answer(n, what);
  }
  return answer(value, what);
}

const DECLINE = /decline|don ?t (wish|want)|do not (wish|want)|prefer not|choose not|not to (say|answer|disclose|self identify)|rather not/;

/** The form's choice that clearly means the user's answer, or (for search-as-you-type lists whose choices are not
 * known yet) the words to type that find it. */
function choice(field: FieldDescriptor, wanted: string, patterns: Record<string, RegExp>, typed: Record<string, string>): string | undefined {
  if (field.control === "text" || field.control === "textarea") return undefined; // never as free text
  if (!field.options.length) return field.control === "combobox" || field.control === "dropdown" ? typed[wanted] : undefined;
  const pattern = patterns[wanted];
  if (!pattern) return undefined;
  const matches = field.options.filter((o) => pattern.test(normalize(o)));
  return matches.length === 1 ? matches[0] : undefined; // none, or several that fit: the user picks
}

function diversityAnswer(field: FieldDescriptor, facts: QuickFacts, topic: SensitiveTopic): Decision | undefined {
  const q = normalize(field.label);
  if (/hispanic|latin/.test(q) && facts.hispanic) {
    const v = choice(field, facts.hispanic, { Yes: /^(yes|hispanic or latin)/, No: /^no\b|not hispanic/, Decline: DECLINE },
      { Yes: "Yes", No: "No", Decline: "Decline" });
    return v ? answer(v, "Hispanic/Latino") : undefined;
  }
  if (topic === "gender" && facts.gender && !/transgender|pronoun|sexual|same as|assigned at birth/.test(q)) {
    const v = choice(field, facts.gender, { Male: /^(male|man|men)\b/, Female: /^(female|woman|women)\b/, "Non-binary": /non ?binary|genderqueer/, Decline: DECLINE },
      { Male: "Male", Female: "Female", "Non-binary": "Non-binary", Decline: "Decline" });
    return v ? answer(v, "gender") : undefined;
  }
  // US veteran status: asked with that word in the question or its choices. "Served in the armed forces of another
  // country?" is a different question.
  if (topic === "veteran" && facts.veteran && /veteran/.test(`${q} ${field.options.join(" ").toLowerCase()}`)
    && !/another country|foreign|other countr/.test(q)) {
    const v = choice(field, facts.veteran, {
      Yes: /^(?!.*\b(not|decline|don ?t|prefer)\b).*(veteran|^yes\b)/, No: /\b(not a|am not|non) ?(protected )?veteran|^no\b/, Decline: DECLINE,
    }, { Yes: "I identify as", No: "I am not", Decline: "I don't wish" });
    return v ? answer(v, "veteran status") : undefined;
  }
  if (topic === "disability" && facts.disability) {
    const v = choice(field, facts.disability, { Yes: /^yes\b|^i have a disability/, No: /^no\b|do not have a disability|don ?t have a disability/, Decline: DECLINE },
      { Yes: "Yes", No: "No", Decline: "I do not want" });
    return v ? answer(v, "disability") : undefined;
  }
  if (topic === "race" && facts.race) {
    if (facts.race === "Decline") {
      const v = choice(field, "Decline", { Decline: DECLINE }, { Decline: "Decline" });
      return v ? answer(v, "race/ethnicity") : undefined;
    }
    if (!field.options.length || field.control === "text") return undefined;
    // Exactly one choice that is the saved answer, or starts with it as a whole word ("Asian (Not Hispanic or Latino)").
    // Several sub-groups that all start with it ("Asian or Asian British - Indian / - Pakistani…") are the user's pick.
    const saved = normalize(facts.race);
    const fits = field.options.filter((o) => normalize(o) === saved || normalize(o).startsWith(`${saved} `));
    return fits.length === 1 ? answer(fits[0]!, "race/ethnicity") : undefined;
  }
  return undefined;
}

/** Determine the company domain or identifier from a job application URL. */
export function companyDomain(url: string): string {
  try {
    const u = new URL(url);
    // Company in the path: boards.greenhouse.io/acme, jobs.lever.co/acme, apply.workable.com/acme, …
    if (/(greenhouse\.io|lever\.co|ashbyhq\.com|workable\.com|smartrecruiters\.com)$/i.test(u.hostname)) {
      return (u.searchParams.get("for") ?? u.pathname.split("/").filter(Boolean)[0] ?? "").toLowerCase();
    }
    // Company in the subdomain: acme.bamboohr.com, acme.teamtailor.com, acme.breezy.hr, acme.jobs.personio.de
    const sub = /^([^.]+)\.(?:jobs\.)?(?:bamboohr\.com|teamtailor\.com|breezy\.hr|personio\.(?:de|com))$/i.exec(u.hostname);
    if (sub) return sub[1]!.toLowerCase();
    return u.hostname.replace(/^(www|careers|jobs)\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

/** Check if the tracker has a confirmed application to the same company domain. */
export function hasConfirmedApplication(page?: PageFacts): boolean {
  if (!page?.url || !page?.applications?.length) return false;
  const current = companyDomain(page.url);
  if (!current) return false;
  return page.applications.some((app) => app.status === "applied_confirmed" && companyDomain(app.url) === current);
}

/** Recognises "Can you start immediately?" in its affirmative yes/no wordings. */
export function isStartImmediatelyQuestion(label: string): boolean {
  if (!answerableLength(label)) return false;
  if (isCompanyOrPlaceSpecific(label)) return false;
  if (hasExceptionClause(label)) return false;
  const q = normalize(label);
  if (WANTS_DETAILS.test(q) || WH_QUESTION.test(q)) return false;
  if (/\b(not|unable|cannot|can t|cant|wont|won t)\b/.test(q)) return false;
  if (/\b(january|february|march|april|may|june|july|august|september|october|november|december|monday|tuesday|wednesday|thursday|friday|saturday|sunday|am|pm|o clock)\b/.test(q)) return false;
  if (/\b\d{1,4}[\/\.-]\d{1,2}[\/\.-]\d{1,4}\b/.test(label)) return false;
  return /^(can you|are you (able|available) to|could you|would you be able to)\s+(start(\s+work(ing)?)?|begin|commence)\s+(immediately|right away)$/.test(q)
    || /^(available|able)\s+to\s+(start(\s+work(ing)?)?|begin|commence)\s+(immediately|right away)$/.test(q)
    || /^start\s+(immediately|right away)$/.test(q);
}

/** "Immediately"/"0 days" -> Yes; a number of days or weeks > 0 -> No; anything else asks. */
export function startImmediatelyValue(notice: string): "Yes" | "No" | undefined {
  const norm = normalize(notice);
  if (!norm) return undefined;
  if (/^(immediate(ly)?|0(\s*(days?|weeks?|months?))?|none|no notice)$/.test(norm)) {
    return "Yes";
  }
  if (/^([1-9]\d*)\s*(days?|weeks?|months?)$/.test(norm)) {
    return "No";
  }
  return undefined;
}

/** Recognises "Have you applied here before?" in its yes/no forms. */
export function isAppliedBeforeQuestion(label: string): boolean {
  if (!answerableLength(label)) return false;
  const q = normalize(label);
  if (WANTS_DETAILS.test(q) || WH_QUESTION.test(q)) return false;
  if (/\b(visa|permit|authoriz|other compan|where else|interview|work(ed)?|working|employ(ed|ee|er)?)\b/.test(q)) return false;
  const hasApply = /\bappl(ied|y|ying)\b/.test(q);
  const hasPrior = /\b(before|previously|prior|past|earlier|already)\b/.test(q);
  if (!hasApply || !hasPrior) return false;
  return /^(have you|did you|were you|are you)\s+(ever\s+|previously\s+)?appl(ied|y)\b|\b(previously|already)\s+appl(ied|y)\b|\bappl(ied|y)\s+(here|before|previously|in the past|to us|with us)\b/.test(q)
    || /^(have you|did you)\s+.*appl(ied|y)\b.*\b(before|previously|in the past|prior)\b/.test(q);
}

/** The quick answer for this question, if the user gave one and the question clearly is that question. */
export function factDecision(field: FieldDescriptor, profile: Profile, topic: SensitiveTopic | undefined, page?: PageFacts): Decision | undefined {
  const facts = profile.facts;
  if (!facts) return undefined;
  const q = normalize(field.label);
  if (!answerableLength(field.label)) return undefined; // a declaration to read, not a question to answer for the user
  if (topic === "work_authorization" || topic === "sponsorship") return facts.workCountries ? workAnswer(field, profile, facts, page) : undefined;
  if (topic === "salary") return salaryAnswer(field, facts);
  if (topic === "notice_period") {
    if (isStartImmediatelyQuestion(field.label)) {
      if (!yesNoField(field)) return undefined;
      const notice = facts.noticePeriod?.trim() ?? "";
      const val = startImmediatelyValue(notice);
      if (!val) return undefined;
      let ans: string = val;
      if (field.options.length) {
        const match = yesNoOption(field.options, ans) ?? bestOption(field.options, ans);
        if (!match) return undefined;
        ans = match;
      }
      return answer(ans, "start immediately");
    }
    // A date picker or a "month"/"year" box needs a date, not "30 days".
    // "Are you subject to a notice period?" is a yes/no question: "30 days" is not its answer.
    const notice = facts.noticePeriod?.trim() ?? "";
    if (!notice || field.control === "date" || YES_NO_QUESTION.test(q)) return undefined;
    // A date ("Start date", a DD/MM/YYYY mask in the label or placeholder) needs a date, not "30 days".
    const shape = normalize(`${field.label} ${field.placeholder}`);
    if (/\b(dd|mm|yyyy|jjjj|aaaa)\b/.test(shape) || /\b(month|year)\b$/.test(q) || /last (working )?day/.test(q)) return undefined;
    // A box in a unit ("Notice period (months)", "in days") or a number box takes a number in the saved unit, or nothing.
    const unit = /\b(days?|weeks?|months?)\b/.exec(shape)?.[1]?.replace(/s$/, "");
    const saved = /^(\d+)\s*(day|week|month)s?$/i.exec(notice);
    if (unit || field.control === "number") {
      if (!saved || (unit && saved[2]!.toLowerCase() !== unit)) return undefined;
      return answer(field.control === "number" ? saved[1]! : notice, "notice period");
    }
    // "Please list specific dates of availability, start and end date", "Additional information about a start date".
    if (/additional information|\bend date\b|\blist (the |your |specific )?dates\b|^optional\b/.test(q)) return undefined;
    return answer(notice, "notice period");
  }
  if (topic === "relocation") {
    if (!facts.relocate || !/^(are you |would you be |will you be )?(willing|open|able|ready) to relocate( if (needed|required|necessary))?$/.test(q)) return undefined;
    return yesNoField(field) ? answer(facts.relocate, "relocation") : undefined;
  }
  if (topic && ["gender", "race", "veteran", "disability"].includes(topic)) return diversityAnswer(field, facts, topic);
  if (!topic && facts.heardFrom?.trim() && HEARD_ABOUT.test(q) && field.control !== "textarea") return answer(facts.heardFrom.trim(), "how you heard");
  return undefined;
}

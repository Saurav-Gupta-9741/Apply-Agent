/** Quick answers: one answer per question that most forms ask in their own words (Answers → Quick answers). Each rule
 * answers only when the question clearly is that question; anything unclear is left to the user:
 *  - work authorization / sponsorship: only when the question names a country (or "your country of residence");
 *    "the country where this job is located" is asked
 *  - salary: current vs expected must be clear, and a question in another currency than the answer is asked
 *  - relocation: only the general question "Are you willing to relocate?"
 *  - diversity questions: only where the form offers choices, and only a choice that clearly matches */

import type { ApplicationRecord, Decision, FieldDescriptor, Profile, QuickFacts, SensitiveTopic } from "../shared/types";
import { canonicalCountries, canWorkIn, countriesIn, extractPlacesInText } from "../shared/countries";
import { bestOption, normalize, yesNoOption } from "../shared/text";
import { hasExceptionClause, isCompanyOrPlaceSpecific } from "../shared/screening";
import { parseRequirement } from "../shared/requirements";
import { extractTechTerms } from "../shared/techterms";

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
  if (label.length > 500) return false;
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
  if (!q || !ABOUT_WORKING.test(q) || NOT_A_PLAIN_ASK.test(asked)) return undefined;
  const asksAuth = /authori[sz]|right to work|eligib|entitled|legally|permit|permis/.test(asked);
  const asksSponsor = (/sponsor|visa|immigration/.test(asked)) && (NEEDS.test(asked) || /require|need/.test(asked));
  if (asksAuth && asksSponsor && /\b(?:and|\&)\b\s*(?:(?:do|will|would|can)\s+you\s+)?(?:require|need)\b/i.test(asked)) {
    return undefined;
  }
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
  let asksExpected = /expect|desired|requirement|range|asking|looking for|anticipated|expectativa|pretens|esperad|souhait|gewunscht|erwart|vorstellung|\b(?:hourly|daily|contract(?:or)?|consulting|billing|pay)\s+rate\b/.test(q);
  let asksCurrent = /\b(current|present|existing|last drawn|now|today|atual|actual|aktuell\w*|actuel\w*|attuale|huidig\w*)\b/.test(q);
  if ((asksExpected && asksCurrent) || (!asksExpected && !asksCurrent)) {
    const hint = normalize(`${field.placeholder} ${field.name}`);
    const hintExpected = /expect|desired|requirement|range|asking|looking for|\b(?:hourly|daily|contract(?:or)?|consulting|billing|pay)\s+rate\b/.test(hint);
    const hintCurrent = /\b(current|present|existing|last drawn)\b/.test(hint);
    if (hintCurrent && !hintExpected) {
      asksCurrent = true;
      asksExpected = false;
    } else if (hintExpected && !hintCurrent) {
      asksExpected = true;
      asksCurrent = false;
    } else {
      return undefined; // two values in one box, or neither specified
    }
  }
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
  return /^(can you|are you (able|available) to|could you|would you be able to)\s+(start(\s+work(ing)?)?|begin|commence|join)\s+(immediately|right away)$/.test(q)
    || /^(available|able)\s+to\s+(start(\s+work(ing)?)?|begin|commence|join)\s+(immediately|right away)$/.test(q)
    || /^(start|join)\s+(immediately|right away)$/.test(q);
}

/** "Immediately"/"0 days" -> Yes; a number of days or weeks > 0 -> No; anything else asks. */
export function startImmediatelyValue(notice: string): "Yes" | "No" | undefined {
  const norm = normalize(notice);
  if (!norm) return undefined;
  if (/^(immediate(ly)?|0(\s*(days?|weeks?|months?))?|none|no notice|available immediately)$/.test(norm)) {
    return "Yes";
  }
  if (/^([1-9]\d*)\s*(days?|weeks?|months?)$/.test(norm)) {
    return "No";
  }
  return undefined;
}

export function parseNoticeDays(notice: string): number | undefined {
  const norm = normalize(notice);
  if (!norm) return undefined;
  if (/^(immediate(ly)?|0(\s*(days?|weeks?|months?))?|none|no notice|available immediately)$/.test(norm)) {
    return 0;
  }
  const m = norm.match(/\b(\d+)\s*(days?|weeks?|months?)\b/);
  if (!m || !m[1]) return undefined;
  const num = parseInt(m[1], 10);
  const unit = (m[2] ?? "").toLowerCase();
  if (unit.startsWith("month")) return num * 30;
  if (unit.startsWith("week")) return num * 7;
  return num;
}

export function matchNoticeOption(notice: string, options: string[]): string | undefined {
  if (!notice || !options.length) return undefined;
  const direct = bestOption(options, notice);
  if (direct) {
    const normDirect = normalize(direct);
    const normNotice = normalize(notice);
    if (normDirect === normNotice || normDirect.startsWith(normNotice + " ")) {
      return direct;
    }
  }

  const candidateDays = parseNoticeDays(notice);
  if (candidateDays === undefined) return direct;

  if (candidateDays === 0) {
    return options.find((o) =>
      /^(immediate(ly)?|0\s*days?|no notice|none|available immediately)\b/i.test(normalize(o)) ||
      /immediate|right away/i.test(o)
    );
  }

  for (const o of options) {
    const optDays = parseNoticeDays(o);
    if (optDays !== undefined && optDays === candidateDays) return o;
  }

  if (candidateDays === 90) {
    const m = options.find((o) => /\b(?:3\s*months?|90\s*days?)\b/i.test(o));
    if (m) return m;
  }
  if (candidateDays === 60) {
    const m = options.find((o) => /\b(?:2\s*months?|60\s*days?)\b/i.test(o));
    if (m) return m;
  }
  if (candidateDays === 30) {
    const m = options.find((o) => /\b(?:1\s*month|30\s*days?|4\s*weeks?)\b/i.test(o));
    if (m) return m;
  }
  if (candidateDays === 14) {
    const m = options.find((o) => /\b(?:2\s*weeks?|14\s*days?)\b/i.test(o));
    if (m) return m;
  }
  if (candidateDays === 7) {
    const m = options.find((o) => /\b(?:1\s*week|7\s*days?)\b/i.test(o));
    if (m) return m;
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
      if (notice && field.options.length) {
        const candidateDays = parseNoticeDays(notice);
        if (candidateDays !== undefined && candidateDays > 0) {
          const tiered = matchNoticeOption(notice, field.options);
          if (tiered) return answer(tiered, "notice period");
        }
      }
      const val = startImmediatelyValue(notice);
      if (!val) return undefined;
      let ans: string = val;
      if (field.options.length) {
        if (ans === "Yes") {
          const immediateOpt = field.options.find((o) =>
            /immediate|right away/i.test(o) && !/^(no\b|not)/i.test(normalize(o))
          );
          if (immediateOpt) {
            ans = immediateOpt;
          } else {
            const match = yesNoOption(field.options, ans) ?? bestOption(field.options, ans);
            if (!match) return undefined;
            ans = match;
          }
        } else {
          const notImmediateOpt = field.options.find((o) =>
            /^(no\b|not available|cannot|can t)/i.test(normalize(o)) && !/available immediately/i.test(o)
          );
          if (notImmediateOpt) {
            ans = notImmediateOpt;
          } else {
            const match = yesNoOption(field.options, ans) ?? bestOption(field.options, ans);
            if (!match) return undefined;
            ans = match;
          }
        }
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
    const candidateDays = parseNoticeDays(notice);
    const unit = /\b(days?|weeks?|months?)\b/.exec(shape)?.[1]?.replace(/s$/, "");
    const saved = /^(\d+)\s*(day|week|month)s?$/i.exec(notice);
    if (unit || field.control === "number") {
      if (unit === "month" && candidateDays !== undefined) {
        if (candidateDays % 30 === 0) {
          const months = String(candidateDays / 30);
          return answer(field.control === "number" ? months : (saved && saved[2] === "month" ? notice : months), "notice period");
        }
        return undefined;
      }
      if (unit === "week" && candidateDays !== undefined) {
        if (candidateDays % 7 === 0) {
          const weeks = String(candidateDays / 7);
          return answer(field.control === "number" ? weeks : (saved && saved[2] === "week" ? notice : weeks), "notice period");
        }
        return undefined;
      }
      if (unit === "day" && candidateDays !== undefined) {
        const days = String(candidateDays);
        return answer(field.control === "number" ? days : (saved && saved[2] === "day" ? notice : days), "notice period");
      }
      if (field.control === "number") {
        if (saved) return answer(saved[1]!, "notice period");
        if (candidateDays !== undefined) return answer(String(candidateDays), "notice period");
      }
      if (!saved || (unit && saved[2]!.toLowerCase() !== unit)) return undefined;
      return answer(field.control === "number" ? saved[1]! : notice, "notice period");
    }
    // "Please list specific dates of availability, start and end date", "Additional information about a start date".
    if (/additional information|\bend date\b|\blist (the |your |specific )?dates\b|^optional\b/.test(q)) return undefined;
    if (field.options.length) {
      const opt = matchNoticeOption(notice, field.options);
      return opt ? answer(opt, "notice period") : undefined;
    }
    return answer(notice, "notice period");
  }
  if (topic === "relocation") {
    if (!facts.relocate || !/^(are you |would you be |will you be )?(willing|open|able|ready) to relocate( if (needed|required|necessary))?$/.test(q)) return undefined;
    return yesNoField(field) ? answer(facts.relocate, "relocation") : undefined;
  }
  if (topic && ["gender", "race", "veteran", "disability"].includes(topic)) return diversityAnswer(field, facts, topic);
  if ((topic === "age" || /\b(?:18 years (?:of age )?or older|at least 18|over 18|18 or older)\b/i.test(q)) && facts.over18 && yesNoField(field)) {
    if (/^(are you |do you confirm you are |confirm you are )?(at least 18|18 years (?:of age )?or older|18 or older|over the age of 18)/i.test(q)) {
      const match = field.options.length ? (yesNoOption(field.options, facts.over18) ?? facts.over18) : facts.over18;
      return answer(match, "over 18");
    }
  }
  if (!topic && facts.heardFrom?.trim() && HEARD_ABOUT.test(q) && field.control !== "textarea") return answer(facts.heardFrom.trim(), "how you heard");
  return undefined;
}

export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function mentions(text: string, term: string): boolean {
  if (!text || !term) return false;
  const raw = text;
  const cleanTerm = term.trim();
  const lowerTerm = cleanTerm.toLowerCase();

  // Alias table & special term handling:
  if (lowerTerm === "go" || lowerTerm === "golang") {
    // Matches standalone 'go' or 'golang', never 'google', 'algorithm', 'good', etc.
    return /\b(?:go|golang)\b/i.test(raw) && !/\bgoogle\b/i.test(raw);
  }
  if (lowerTerm === "java") {
    // Standalone java, but NOT javascript
    return /\bjava\b/i.test(raw) && !/\bjavascript\b/i.test(raw);
  }
  if (lowerTerm === "javascript" || lowerTerm === "js") {
    return /\b(?:javascript|js)\b/i.test(raw);
  }
  if (lowerTerm === "typescript" || lowerTerm === "ts") {
    return /\b(?:typescript|ts)\b/i.test(raw);
  }
  if (lowerTerm === "react" || lowerTerm === "reactjs" || lowerTerm === "react.js") {
    return /\breact(?:\.js|js)?\b/i.test(raw);
  }
  if (cleanTerm === "R" || lowerTerm === "r") {
    // Standalone 'R' programming language: e.g. " R ", " R,", "R/Python", "Python and R", "R programming"
    return /\b(?:the\s+)?R(?:\s+programming|\s+language)?\b/.test(raw) && !/\b(?:react|ruby|rust)\b/i.test(raw);
  }
  if (cleanTerm === "C" || lowerTerm === "c") {
    return /\bC(?:\s+programming|\s+language)?\b/.test(raw) && !/\b(?:c\+\+|c#)\b/i.test(raw);
  }
  if (lowerTerm === "c++" || lowerTerm === "cpp") {
    return /\b(?:c\+\+|cpp)\b/i.test(raw);
  }
  if (lowerTerm === "c#" || lowerTerm === "csharp") {
    return /\b(?:c\#|csharp)\b/i.test(raw);
  }
  if (lowerTerm === "ai") {
    // Must be uppercase AI or "artificial intelligence", never inside retail, paid, email, etc.
    return /\bAI\b/.test(raw) || /\bartificial intelligence\b/i.test(raw);
  }
  if (lowerTerm === "ml") {
    return /\bML\b/.test(raw) || /\bmachine learning\b/i.test(raw);
  }
  if (lowerTerm === "power bi" || lowerTerm === "powerbi") {
    return /\bpower\s*bi\b/i.test(raw);
  }
  if (lowerTerm === "google cloud" || lowerTerm === "gcp") {
    return /\b(?:google cloud|gcp)\b/i.test(raw);
  }

  // General term whole-word matching:
  const escaped = escapeRegex(cleanTerm);
  const regex = new RegExp(`\\b${escaped}\\b`, "i");
  return regex.test(raw);
}

export function isPreviousEmployeeQuestion(field: FieldDescriptor): boolean {
  if (!answerableLength(field.label)) return false;
  const q = normalize(field.label);
  if (/\b(relative|family|referred|referral|friend|spouse|partner|anyone who|alguem)\b/.test(q)) return false;
  if (/^(i |why |tell us |please |describe )/.test(q)) return false;
  if (/\b(non-?compete|non-?solicitation|restrict|government|armed forces|remotely|relocate|notice period|last working day|hours per week|days a week|timeline|b2b)\b/.test(q)) return false;
  if (/\b(appl(ied|y|ying))\b/.test(q) && !/\b(employ(ed|ee|er)?|work(ed|ing)?|contractor|intern)\b/.test(q)) return false;
  if (/\b(visa|sponsorship|right to work|authori[sz]|permit)\b/.test(q)) return false;
  if (/\b(subsidiaries, affiliates, or acquired companies)\b/i.test(field.label)) return false;
  if (/\bworked (on|with)\b/.test(q)) return false;
  
  return /^(have you (ever |previously )?been employed|have you (ever |previously )?worked (for|at)|are you currently a\b|are you a (current or )?former|do you now or have you in the past worked|history with|voce trabalha atualmente|are you (currently|now) or have you (ever|previously) (worked|been employed)|have you ever or are you currently working at|are you a current employee (with|of)|are you currently or have you previously worked for)/.test(q)
    || (/\b(employed|worked (for|at))\b/.test(q) && /\b(before|in the past|previously)\b/.test(q) && /^(have you|were you|did you)\b/.test(q))
    || /\brejected for this role\b/.test(q);
}

export function previousEmployerAnswer(field: FieldDescriptor, profile: Profile, page?: PageFacts): Decision | undefined {
  if (!yesNoField(field)) return undefined;

  const currentHost = page?.url ? companyDomain(page.url) : "";
  const label = field.label;

  const companies: string[] = [];
  if (profile.currentCompany?.trim()) {
    companies.push(profile.currentCompany.trim());
  }
  if (profile.workHistory?.length) {
    for (const w of profile.workHistory) {
      if (w.company?.trim()) companies.push(w.company.trim());
    }
  }

  // An empty work history without workHistoryComplete must never answer "No" from missing data!
  if (!companies.length && !profile.workHistoryComplete) {
    return undefined;
  }

  const workedHere = companies.some((c) => {
    if (currentHost && currentHost.toLowerCase() === c.toLowerCase()) return true;
    return mentions(label, c);
  });

  if (workedHere) {
    const val = "Yes";
    const match = field.options.length ? (yesNoOption(field.options, val) ?? bestOption(field.options, val)) : val;
    return match ? answer(match, "previous employer") : undefined;
  }

  // If not matched, only answer "No" if candidate explicitly confirmed history is complete:
  if (profile.workHistoryComplete) {
    const val = "No";
    const match = field.options.length ? (yesNoOption(field.options, val) ?? bestOption(field.options, val)) : val;
    return match ? answer(match, "previous employer") : undefined;
  }

  return undefined;
}

export function isWorkModeQuestion(field: FieldDescriptor): boolean {
  if (!answerableLength(field.label)) return false;
  const q = normalize(field.label).replace(/[-‑–—]/g, "");
  if (/^(i |please |describe )/.test(q)) return false;
  if (/\b(interview|facial id|third party contractor)\b/.test(q)) return false;
  if (/are you currently based in this location/.test(q)) return false;
  return /\b(onsite|hybrid|hybride|inoffice|inperson|commute|commuting distance|office attendance|\bwork from (the|our)?\s*office\b|\bjoin us in the office\b|\bdays (in|from) the office\b|\bdays (a|per) week\b|come to office|office based|work arrangement|sur place)\b/i.test(q);
}

export function workModeAnswer(field: FieldDescriptor, profile: Profile): Decision | undefined {
  const facts = profile.facts;
  if (!facts?.workMode || !yesNoField(field)) return undefined;

  const q = normalize(field.label);

  // Check if a specific city/place is named in the question:
  const places = extractPlacesInText(field.label);
  if (places.length > 0) {
    const userLocs = `${profile.location} ${profile.preferredLocations || ""}`.toLowerCase();
    const matched = places.some((place) => new RegExp(`\\b${place}\\b`, "i").test(userLocs));
    if (!matched) {
      return undefined; // Role requires a specific place the candidate is not in / did not prefer -> ASK
    }
  }

  // Check required office days per week via shared requirements parser:
  const req = parseRequirement(field.label);
  const requiredDays = req?.unit === "days" ? req.min : undefined;
  const maxDays = facts.maxOfficeDays !== undefined && facts.maxOfficeDays !== ""
    ? Number(facts.maxOfficeDays)
    : (facts.workMode === "remote" ? 0 : facts.workMode === "onsite" ? 5 : 3);

  if (requiredDays !== undefined && requiredDays > maxDays) {
    const match = field.options.length ? (yesNoOption(field.options, "No") ?? "No") : "No";
    return answer(match, "onsite");
  }

  const isFullyOnsiteQuestion = /\b(?:fully onsite|100% onsite|5 days (?:a|per) week in (?:the|our)? office)\b/i.test(q);
  if (isFullyOnsiteQuestion && facts.workMode !== "onsite" && facts.workMode !== "any") {
    const match = field.options.length ? (yesNoOption(field.options, "No") ?? "No") : "No";
    return answer(match, "onsite");
  }

  if (facts.workMode === "remote") {
    // If candidate is remote only, but question asks for hybrid or onsite:
    if (/\b(?:onsite|hybrid|in-?office|in person|commute|office attendance)\b/i.test(q)) {
      const match = field.options.length ? (yesNoOption(field.options, "No") ?? "No") : "No";
      return answer(match, "onsite");
    }
  }

  const isRemoteQuestion = /\b(?:remote|work from home|wfh)\b/i.test(q) && !/\b(?:onsite|hybrid|in-?office)\b/i.test(q);
  if (isRemoteQuestion) {
    if (facts.workMode === "remote" || facts.workMode === "any" || profile.preferredLocations?.toLowerCase().includes("remote")) {
      const match = field.options.length ? (yesNoOption(field.options, "Yes") ?? "Yes") : "Yes";
      return answer(match, "onsite");
    }
    return undefined;
  }

  if (facts.workMode === "any" || facts.workMode === "onsite" || facts.workMode === "hybrid") {
    const match = field.options.length ? (yesNoOption(field.options, "Yes") ?? "Yes") : "Yes";
    return answer(match, "onsite");
  }

  return undefined;
}

export function isTravelQuestion(field: FieldDescriptor): boolean {
  if (!answerableLength(field.label)) return false;
  const q = normalize(field.label);
  if (/^(i |why |tell us |please |describe )/.test(q)) return false;
  return /\b(travel up to|travel as necessary|willing to travel|comfortable with traveling|often are you willing to travel)\b/i.test(q);
}

export function travelAnswer(field: FieldDescriptor, facts?: QuickFacts): Decision | undefined {
  if (!facts?.travel || !yesNoField(field)) return undefined;

  const q = normalize(field.label);
  const req = parseRequirement(field.label);

  if (req?.unit === "percent") {
    const requiredPercent = req.max ?? req.min;
    if (requiredPercent !== undefined) {
      const userPercentStr = facts.travelPercent?.replace(/[^0-9]/g, "");
      if (!userPercentStr) return undefined;
      const userPercent = parseInt(userPercentStr, 10);

      if (requiredPercent <= userPercent) {
        const match = field.options.length ? (yesNoOption(field.options, "Yes") ?? "Yes") : "Yes";
        return answer(match, "travel");
      } else {
        const match = field.options.length ? (yesNoOption(field.options, "No") ?? "No") : "No";
        return answer(match, "travel");
      }
    }
  }

  if (/willing to travel|travel as necessary|comfortable with traveling/i.test(q)) {
    const match = field.options.length ? (yesNoOption(field.options, facts.travel) ?? facts.travel) : facts.travel;
    return answer(match, "travel");
  }

  return undefined;
}

export function isLanguageQuestion(field: FieldDescriptor): string[] {
  if (!answerableLength(field.label)) return [];
  const q = normalize(field.label);
  if (!/\b(language|proficiency|proficient|fluency|fluent|speak|idioma|lingua|langue|sprache|bilingual)\b/i.test(q)) return [];
  const langs = ["english", "french", "german", "spanish", "portuguese", "italian", "mandarin", "japanese", "hindi", "kannada", "marathi"];
  return langs.filter((lang) => mentions(q, lang));
}

const LEVEL_RANK: Record<string, number> = {
  native: 5,
  fluent: 4,
  professional: 3,
  conversational: 2,
  basic: 1,
};

function askedLanguageLevel(q: string): number {
  if (/\b(?:native|mother\s+tongue|first\s+language|bilingual)\b/i.test(q)) return 5;
  if (/\b(?:fluent|fluently|fließend|courant)\b/i.test(q)) return 4;
  if (/\b(?:professional|business|working\s+proficiency|work\s+proficiency)\b/i.test(q)) return 3;
  if (/\b(?:conversational)\b/i.test(q)) return 2;
  if (/\b(?:basic|elementary)\b/i.test(q)) return 1;
  return 1;
}

export function languageAnswer(field: FieldDescriptor, profile: Profile): Decision | undefined {
  if (!answerableLength(field.label)) return undefined;
  const langs = isLanguageQuestion(field);
  if (!langs.length) return undefined;

  const profileLangs = profile.languages ?? [];

  // Check if any mentioned language is missing from candidate's inventory:
  const missing = langs.filter((l) => !profileLangs.some((p) => p.language.toLowerCase() === l));
  if (missing.length > 0) {
    if (yesNoField(field)) {
      if (profile.languagesComplete) {
        const match = field.options.length ? (yesNoOption(field.options, "No") ?? "No") : "No";
        return answer(match, "language");
      }
      return undefined; // Language missing and list not marked complete -> ASK
    }
    return undefined;
  }

  // All mentioned languages are present in candidate's inventory:
  const primaryLang = langs[0]!;
  const entry = profileLangs.find((l) => l.language.toLowerCase() === primaryLang);
  if (!entry) return undefined;

  if (yesNoField(field)) {
    const userLevel = LEVEL_RANK[entry.proficiency.toLowerCase()] ?? 3;
    const requiredLevel = askedLanguageLevel(field.label);
    const val = userLevel >= requiredLevel ? "Yes" : "No";
    const match = field.options.length ? (yesNoOption(field.options, val) ?? val) : val;
    return answer(match, "language");
  }

  if (field.options.length) {
    const match = bestOption(field.options, entry.proficiency, 0.6) ?? field.options.find((o) => /fluent|proficient|native|c1|c2|advanced/i.test(o));
    if (match) return answer(match, "language");
  }
  return answer(entry.proficiency, "language");
}

export function skillsExperienceAnswer(field: FieldDescriptor, profile: Profile): Decision | undefined {
  if (!answerableLength(field.label)) return undefined;
  const q = normalize(field.label);
  if (/^(i |why |tell us |describe |none\b)/.test(q)) return undefined;

  // Domain qualifiers that require human judgement or context -> ASK
  if (/\b(?:managing|leading|closing|selling|director|head of|b2b sales|retail accounts|fmcg|cpg|digital advertising|paid media|campaigns|financial services|healthcare accounts|quota)\b/i.test(q)) {
    return undefined;
  }

  if (!/\b(years? of (?:[a-z0-9+#.\s]+ )?experience|experience (with|in|using|managing|designing|overseeing|partnering)|proficien(t|cy)|knowledge of|familiar with|rate your proficiency|tools or software have you used|have you (used|designed|built|configured|actively used|been the maintainer))\b/i.test(q)) {
    return undefined;
  }

  // Exclude general overall experience and language questions:
  if (/\btotal (years? of )?(work|professional )?experience\b/.test(q)) return undefined;
  if (/^how many years of experience do you have\??$/i.test(q)) return undefined;
  if (/\b(english|french|german|spanish|twitch)\b/i.test(q)) return undefined;

  const inv = profile.skillsInventory ?? [];
  const req = parseRequirement(field.label);
  const threshold = req?.unit === "years" ? req.min : undefined;

  // Extract all technology terms mentioned in the question:
  const termsInQuestion = extractTechTerms(field.label);
  const hasOr = /\b(?:or|either)\b/i.test(field.label);

  if (termsInQuestion.length > 0) {
    // Map terms to inventory entries
    const matchedEntries = termsInQuestion.map((term) => inv.find((s) => mentions(s.name, term) || mentions(term, s.name)));
    const missingTerms = termsInQuestion.filter((term, idx) => !matchedEntries[idx]);

    if (hasOr) {
      // Any one term is sufficient
      const anyMatch = matchedEntries.find((e) => !!e);
      if (anyMatch) {
        if (yesNoField(field)) {
          if (threshold !== undefined) {
            const val = anyMatch.years >= threshold ? "Yes" : "No";
            const match = field.options.length ? (yesNoOption(field.options, val) ?? val) : val;
            return match ? answer(match, "skills") : undefined;
          }
          const match = field.options.length ? (yesNoOption(field.options, "Yes") ?? "Yes") : "Yes";
          return match ? answer(match, "skills") : undefined;
        }
      } else if (profile.skillsComplete && yesNoField(field)) {
        const match = field.options.length ? (yesNoOption(field.options, "No") ?? "No") : "No";
        return match ? answer(match, "skills") : undefined;
      }
      return undefined;
    }

    // All terms required ("and", or listed together without "or")
    if (missingTerms.length > 0) {
      if (profile.skillsComplete && yesNoField(field)) {
        const match = field.options.length ? (yesNoOption(field.options, "No") ?? "No") : "No";
        return match ? answer(match, "skills") : undefined;
      }
      return undefined; // At least one skill missing and list not marked complete -> ASK
    }

    // All terms are present in inventory!
    const validEntries = matchedEntries.filter((e): e is NonNullable<typeof e> => !!e);
    const primary = validEntries[0]!;

    if (yesNoField(field)) {
      if (threshold !== undefined) {
        // True statement: Yes if min years across matched skills >= threshold, else No
        const minCandidateYears = Math.min(...validEntries.map((e) => e.years));
        const val = minCandidateYears >= threshold ? "Yes" : "No";
        const match = field.options.length ? (yesNoOption(field.options, val) ?? val) : val;
        return match ? answer(match, "skills") : undefined;
      }
      const match = field.options.length ? (yesNoOption(field.options, "Yes") ?? "Yes") : "Yes";
      return match ? answer(match, "skills") : undefined;
    }

    if (/\b(how many years|years of experience)\b/i.test(q)) {
      if (typeof primary.years === "number") {
        const yearsStr = String(primary.years);
        if (field.control === "number" || field.control === "text") return answer(yearsStr, "skills");
        if (field.options.length) {
          const match = bestOption(field.options, yearsStr, 0.7) ?? field.options.find((o) => o.includes(yearsStr));
          if (match) return answer(match, "skills");
        }
      }
      return undefined; // Never invent years!
    }

    if (/\brate your proficiency\b/i.test(q) && field.options.length) {
      if (primary.level) {
        const match = bestOption(field.options, primary.level, 0.7);
        if (match) return answer(match, "skills");
      }
      return undefined; // Never invent level!
    }
  }

  // Fallback for non-catalog skills that directly match profile.skillsInventory
  const directMatches = inv.filter((s) => mentions(field.label, s.name));
  if (directMatches.length > 0) {
    const primary = directMatches[0]!;
    if (yesNoField(field)) {
      if (threshold !== undefined) {
        const val = primary.years >= threshold ? "Yes" : "No";
        const match = field.options.length ? (yesNoOption(field.options, val) ?? val) : val;
        return match ? answer(match, "skills") : undefined;
      }
      const match = field.options.length ? (yesNoOption(field.options, "Yes") ?? "Yes") : "Yes";
      return match ? answer(match, "skills") : undefined;
    }
    if (/\b(how many years|years of experience)\b/i.test(q) && typeof primary.years === "number") {
      const yearsStr = String(primary.years);
      if (field.control === "number" || field.control === "text") return answer(yearsStr, "skills");
    }
  }

  // Question did not match any inventory skills:
  if (profile.skillsComplete && yesNoField(field)) {
    const match = field.options.length ? (yesNoOption(field.options, "No") ?? "No") : "No";
    return match ? answer(match, "skills") : undefined;
  }

  return undefined;
}


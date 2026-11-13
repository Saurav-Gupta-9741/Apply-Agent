/** Quick answers: one answer per question that most forms ask in their own words (Answers → Quick answers). Each rule
 * answers only when the question clearly is that question; anything unclear is left to the user:
 *  - work authorization / sponsorship: only when the question names a country (or "your country of residence");
 *    "the country where this job is located" is asked
 *  - salary: current vs expected must be clear, and a question in another currency than the answer is asked
 *  - relocation: only the general question "Are you willing to relocate?"
 *  - diversity questions: only where the form offers choices, and only a choice that clearly matches */

import { evaluateEeoPolicy } from "../shared/locale/country-rules";
import type { ApplicationRecord, Decision, FieldDescriptor, Profile, QuickFacts, SensitiveTopic } from "../shared/types";
import { canonicalCountries, canWorkIn, countriesIn, countriesInLocation, extractPlacesInText } from "../shared/countries";
import { bestOption, normalize, yesNoOption } from "../shared/text";
import { hasExceptionClause, isCompanyOrPlaceSpecific } from "../shared/screening";
import { parseRequirement } from "../shared/requirements";
import { extractTechTerms } from "../shared/techterms";

/** "How did you hear about this job?" in its many wordings. */
// Live run: "How did you first hear about Cockroach Labs?", "How did you first learn about Affirm as an employer?",
// "Where did you see or hear about this job?", "How did your hear about this position?" were left for the user.
export const HEARD_ABOUT = /how did you(r)? (first |initially |originally )?(hear|learn|find out|come across)|where did you (first |initially |originally )?(see or hear|hear|learn|find)|how did you find (out about )?(us|this)|where have you (learned|heard) about|how you heard about|source of (your )?application|referral source/;

const answer = (value: string, what: string): Decision => ({ kind: "answer", value, question: `Quick answers › ${what}` });

/** A question answered with yes or no: a yes/no list, a choice, or a short text box (never a long explanation). */
/** "If you have a visa, please share all relevant details (visa type, expirations…)" wants details, not yes or no
 * (seen on a real form, where a bare "No" was about to be typed). */
// "…and able to provide documentation of work authorization upon hire?" still asks yes or no (live round 8).
const WANTS_DETAILS = /^if (you|your|so|yes|applicable)\b|\b(share|describe|provide(?! (proof|documentation|evidence|documents?)\b)|list|explain|specify|elaborate)\b|\bdetails?\b|\bwhich (visa|permit)\b|\bwhat (type|kind) of\b|\bif so\b|\bwhen does your\b/;

/** Questions that open with a question word ask for something, never for yes or no ("In what countries do you have
 * the right to work?", "What is the source of your right to work?"; both seen on real forms). */
const WH_QUESTION = /^(in |from |for |to )?(what|which|where|when|how|who|whom|whose|why|qual|quais|quel|quelle|cual|cuales|welche[rs]?|wie|wo|wann)\b/;
/** A question asked with a verb first: answered yes or no ("Are you subject to a notice period?"). */
export const YES_NO_QUESTION = /^(are|is|do|does|did|have|has|had|will|would|can|could|should|were|was|may|might|shall|sind|haben|hast|bist|konnen|kann|wurden|etes|avez|pouvez|seriez|esta|estas|tiene|tienes|puede|eres|voce|tem|hai|ha|hanno|siete|sei|bent|heeft|hebben|kunt)\b/;
/** Long statements with a tick box (legal notices, consent texts) are declarations, not questions to answer for the user. */
const MAX_ANSWERABLE_WORDS = 35;

export function answerableLength(label: string): boolean {
  if (label.length > 500) return false;
  return normalize(label).split(" ").length <= MAX_ANSWERABLE_WORDS;
}

/** A one-line preface before a short question about working: "Your response is mandatory when applying for a
 * U.S.-based position. Do you need … any immigration related support or sponsorship from Twitch …?" (live run 7: over
 * the word limit for declarations, so it was left for the user). The preface must ask nothing and agree to nothing. */
export function prefacedWorkQuestion(label: string): boolean {
  if (label.length > 500) return false;
  const sentences = splitSentences(label);
  const asked = sentences.filter((x) => /\?\s*$/.test(x));
  if (asked.length !== 1 || asked[0] !== sentences[sentences.length - 1] || sentences.length > 3) return false;
  const preface = normalize(sentences.slice(0, -1).join(" "));
  if (/\b(certify|agree|acknowledge|understand|attest|confirm|declare|consent|accept|i am|i have|i will)\b/.test(preface)) return false;
  return answerableLength(asked[0]!) && normalize(label).split(" ").length <= 60;
}

export function yesNoField(field: FieldDescriptor, allowPreface = false): boolean {
  if (field.control === "textarea" || field.control === "checkbox_group" || field.control === "file") return false;
  const q = normalize(field.label);
  if (WANTS_DETAILS.test(q) || WH_QUESTION.test(q) || !(answerableLength(field.label) || (allowPreface && prefacedWorkQuestion(field.label)))) return false;
  // A text box takes "Yes"/"No" only when it asks a yes/no question: "Visa situation" or "Please confirm type of
  // right to work document" want words. Lists that open on click show their choices only then.
  if (!field.options.length) {
    return ["combobox", "dropdown", "select", "radio"].includes(field.control) || YES_NO_QUESTION.test(q) || /\?\s*$/.test(field.label);
  }
  const options = field.options.map(normalize);
  return options.some((o) => /^(yes|oui|ja|si|sim)\b/.test(o)) && options.some((o) => /^(no|non|nein|nao|nee)\b/.test(o));
}

/** What the page says about the job (read once per page). */
export interface PageFacts {
  /** Countries the job is in, from its structured data or location line (empty when unknown). */
  jobCountries: string[];
  /** URL of the application page, to identify the company and check application history. */
  url?: string;
  /** Company name for the job, if known. */
  company?: string;
  /** Confirmed application history from the tracker. */
  applications?: ApplicationRecord[];
}

/** The question itself: brackets and statements around it ("This role is not eligible for visa sponsorship.") are
 * context. Several questions in one label ("Are you authorized…? If not, will you need sponsorship?") have no single
 * yes or no: undefined. */
/** Sentences of a label; "U.S." / "U.K." / "e.g." do not end one ("…authorized to work for any U.S. employer?" was
 * read as the question "employer?", live run 7). */
function splitSentences(label: string): string[] {
  return label.replace(/\([^)]*\)|\[[^\]]*\]/g, " ").split(/(?<=[.?!])(?<!\b[A-Za-z]\.)(?<!\be\.g\.|\bi\.e\.)\s+/).map((x) => x.trim()).filter(Boolean);
}

function theQuestion(label: string): string | undefined {
  const sentences = splitSentences(label);
  const asked = sentences.filter((x) => /\?\s*$/.test(x));
  if (asked.length > 1) return undefined;
  return normalize(asked[0] ?? sentences[sentences.length - 1] ?? "");
}

/** The question without its examples: "(e.g. U.S. F-1, H-1B, TN…)" names visa types, not the job's country (New Relic,
 * a job in Tokyo, live round 10: answered for the US). */
export const withoutExamples = (label: string): string => label.replace(/\((?:e\.?\s?g\.?|i\.?\s?e\.?|for example|for instance|such as|including|like)[\s.:,][^)]*\)/gi, " ");

/** What a yes/no about working there means: the user's right to work, or their need for a visa. */
const ABOUT_WORKING = /authori[sz]|eligib|entitled|right to work|permitted|legally|sponsor|visa|immigration|work permit|permission to work|droit de travailler|droit au travail|derecho a trabajar|direito de trabalhar|arbeitsberechtigung|berechtigt|arbeitserlaubnis|arbeitsvisum|arbeitsgenehmigung|visum|autoris|permis de travail|autoriz|permiso de trabajo|autorizacao de trabalho|visto de trabalho|permissao de trabalho|werkvergunning|gerechtigd|permesso|parrainage|patrocinio/;
/** "Do you still wish to proceed?", "Is your right to work tied to another employer?", "…in any country other than
 * India?", "Are you NOT authorized…?": another question, or one turned round in a way a rule must not guess. */
const NOT_A_PLAIN_ASK = /\b(not|never|neither|nor|except|apart from|besides|other than|wish|proceed|acknowledge|understand|agree|tied|restricted|restriction|type of|kind of)\b|n t\b/;
/** Asking whether the user NEEDS something (a visa, sponsorship, a permit), in the languages the rules read. */
const NEEDS = /\b(require|requires|required|need|needs|needed|benotig\w*|brauch\w*|besoin|necesit\w*|precis\w*|nodig|richied\w*|bisogno|necessit\w*)\b/;

function workAnswer(field: FieldDescriptor, profile: Profile, facts: QuickFacts, page?: PageFacts): Decision | undefined {
  const allowed = canonicalCountries(facts.workCountries);
  const tempAllowed = canonicalCountries(facts.temporaryWorkCountries ?? "");
  const unauth = canonicalCountries(facts.unauthorizedCountries ?? "");
  const allAllowed = [...new Set([...allowed, ...tempAllowed])];
  if (!allAllowed.length || !yesNoField(field, true)) return undefined;
  const q = theQuestion(field.label);
  // What follows "without" is what the user would not need ("…without the need for a visa", "…without restriction"):
  // it neither makes the question another one nor turns it round.
  const asked = q?.replace(/\bwithout\b.*$/, "") ?? "";
  if (!q || !ABOUT_WORKING.test(q) || NOT_A_PLAIN_ASK.test(asked)) return undefined;
  const asksAuth = /authori[sz]|right to work|eligib|entitled|legally|permit|permis|arbeitserlaubnis|arbeitsgenehmigung|berechtigt|droit de travailler|droit au travail|derecho a trabajar|direito de trabalhar|autorizacao (?:de|para)?\s*trabalh\w*|autorizacion (?:de|para)?\s*trabaj\w*|autorisation (?:de|pour)?\s*travail\w*|werkvergunning|gerechtigd|permesso/.test(asked);
  const asksSponsor = (/sponsor|visa|visum|immigration|parrainage|patrocinio/.test(asked)) && (NEEDS.test(asked) || /require|need/.test(asked));
  if (asksAuth && asksSponsor && /\b(?:and|\&)\b\s*(?:(?:do|will|would|can)\s+you\s+)?(?:require|need)\b/i.test(asked)) {
    return undefined;
  }
  let places = countriesIn(withoutExamples(field.label));
  // "…in the country you currently reside in?", "Your authorization to work in the country where you live. Please
  // choose…", "…at your current location of residence?" (Appier), "…in the location in which you currently reside?"
  // (Hopper): the country of residence is the profile's country (read on the whole label: the asked sentence may be
  // the instruction after it).
  const whole = normalize(field.label);
  // "…in the country from which you plan to perform this work?" (xAI, a remote international job, live run 5: answered
  // No for the US office): where the user plans to work is theirs to say.
  if (/\b(country|location|place) (from which|where|in which|that) you (plan|intend|will|would|are going) to\b/.test(whole)) return undefined;
  const RESIDENCE =/(country|location|place) (of (your )?(current )?residence|(where|that|which|in which) you (currently )?(live|reside)|you (currently )?(live|reside) in)|where you (currently )?(live|reside)|your (current |home )?country(?! of application)/;
  if (!places.length && (RESIDENCE.test(q) || RESIDENCE.test(whole))) {
    places = countriesIn(profile.country);
    if (!places.length) return undefined; // where the user lives is not known
  }
  // "…in your country of application?", "…the country for which you applied?": the job's country, and only a yes when
  // that is known and one the user may work in (a no could be about another country than the page shows).
  if (!places.length && /country (of application|for which you (have )?appl|you (are )?(?:applying|apply)|you (have )?applied)/.test(whole)) {
    const job = page?.jobCountries ?? [];
    if (job.length && (job.every((c) => canWorkIn(c, allowed)) || job.every((c) => canWorkIn(c, unauth)))) {
      places = job;
    } else {
      return undefined;
    }
  }
  // No country in the question ("…require sponsorship to work at Cloudflare?"): it is about this job, so the job's own
  // country decides, when the page names exactly that. A choice made earlier on the form is the user's to recall.
  if (!places.length && page?.jobCountries.length && !/you selected|previous (response|question|answer)|above/.test(q)) places = page.jobCountries;
  if (!places.length) return undefined; // the job's country is not known: the user decides
  const can = places.map((c) => canWorkIn(c, allAllowed));
  const isExplicitlyUnauth = places.map((c) => canWorkIn(c, unauth));
  if (!can.every((x) => x === can[0])) return undefined; // "the US or Canada" with a yes for one and a no for the other
  // Polarity from the question's own words ("…the right to work in Poland without the need for a visa?" asks about the
  // right to work).
  const needs = NEEDS.test(asked) || /sponsor|parrainage|patrocinio/.test(asked);
  let yes: boolean;
  if (needs) {
    // "Will you need sponsorship in the future?" in Quick answers is about the countries the user may work in now
    // (on a temporary permit, or permanently): it never answers for a country the user may not work in at all. Live
    // run 3 (Affirm, a US job, a user allowed to work in India only): it answered "No" to "Do you require immigration
    // sponsorship to work … in the United States?". Such a country gets Yes when the user listed it as one they cannot
    // work in, and is asked otherwise.
    const inAllowed = canWorkIn(places[0]!, allowed);
    const inTemp = canWorkIn(places[0]!, tempAllowed);
    // A user who declined to say is asked: the old code turned a "Decline" into "No".
    if ((inAllowed || inTemp) && facts.needsFutureSponsorship === "Decline") return undefined;
    if ((inAllowed || inTemp) && facts.needsFutureSponsorship) {
      yes = facts.needsFutureSponsorship === "Yes";
    } else if (inAllowed) {
      yes = false;
    } else if (inTemp || isExplicitlyUnauth[0] || facts.otherCountries === "sponsorship") {
      // "For jobs in any other country: I would need visa sponsorship there" (Quick answers) covers every unlisted one.
      yes = true;
    } else {
      // Unlisted country: the user may hold a visa there that needs no sponsorship. ASK, same as authorization.
      return undefined;
    }
  } else {
    if (can[0]) {
      yes = true;
    } else if (isExplicitlyUnauth[0] || facts.otherCountries === "sponsorship") {
      yes = false;
    } else {
      // Unlisted country and not explicitly unauthorized: ASK! Never guess "No".
      return undefined;
    }
  }
  const raw = yes ? "Yes" : "No";
  const val = field.options.length ? (yesNoOption(field.options, raw) ?? bestOption(field.options, raw) ?? raw) : raw;
  return answer(val, needs ? "sponsorship" : "work authorization");
}

/** A saved answer about ONE country ("Will you … require visa sponsorship to work in the United States?" → Yes, saved
 * with topic and country) answers the same plain question about that same country in other words: "Will you now or in
 * the future require sponsorship for employment visa status?" on a job in the US (live run: 71 sponsorship and 56
 * work-authorization questions were left for a user who had saved exactly these). The question must be one plain
 * yes/no about working (no "not", no second question, no details wanted), about exactly that one country: named in
 * it, or (when it names none) the job's only country. Anything else stays for the user. */
export function countryAnswer(field: FieldDescriptor, profile: Profile, answers: Array<{ question: string; answer: string; topic?: SensitiveTopic; country?: string }>, topic: SensitiveTopic, page?: PageFacts): Decision | undefined {
  if (topic !== "sponsorship" && topic !== "work_authorization") return undefined;
  const saved = answers.filter((a) => a.topic === topic && a.country && countriesIn(a.country).length === 1 && /^(yes|no)$/i.test(a.answer.trim()));
  if (!saved.length || !yesNoField(field, true)) return undefined;
  const q = theQuestion(field.label);
  const asked = q?.replace(/\bwithout\b.*$/, "") ?? "";
  // A yes/no asked with a verb first ("Will you…", "Do you…"): "Your authorization to work in the country where you
  // live. Please choose the option that describes it." wants a status, not a Yes.
  if (!q || !YES_NO_QUESTION.test(q) || !ABOUT_WORKING.test(q) || NOT_A_PLAIN_ASK.test(asked) || /\bif (yes|no|so|not)\b/.test(normalize(field.label))) return undefined;
  const sponsorWords = /sponsor|visa|visum|immigration|parrainage|patrocinio/.test(asked);
  const authWords = /authori[sz]|right to work|eligib|entitled|legally|lawfully|permit|permis|arbeitserlaubnis|berechtigt/.test(asked);
  if (sponsorWords && authWords && /\b(and|&)\b/.test(asked)) return undefined; // two questions in one
  if (topic === "sponsorship" ? !(sponsorWords && NEEDS.test(asked)) : !(authWords && !sponsorWords)) return undefined;
  let places = countriesIn(withoutExamples(field.label));
  const whole = normalize(field.label);
  // "…in your country of residence?", "…a visa to remain in your current location?" (GitLab, a US job): where the user
  // lives, never the job's country. "…in that country?" points at an earlier answer: the user's to recall.
  if (!places.length && /(country|location|place) (of (your )?(current )?residence|(where|that|which|in which) you (currently )?(live|reside)|you (currently )?(live|reside) in)|where you (currently )?(live|reside)|your (current |home )?(country|location)|current(ly)? (location|based)/.test(whole)) {
    places = countriesIn(profile.country);
  } else if (!places.length && /\b(that|this|same) (country|location|place)\b|you selected|previous (response|question|answer)|above/.test(whole)) {
    return undefined;
  }
  // No country named ("…for employment visa status?", "…in the country where this job is located?"): the job's
  // country, only when the page names exactly one.
  if (!places.length && page?.jobCountries.length === 1) places = page.jobCountries;
  if (places.length !== 1) return undefined;
  const entry = saved.find((a) => countriesIn(a.country!)[0] === places[0]);
  if (!entry) return undefined;
  const raw = /^yes$/i.test(entry.answer.trim()) ? "Yes" : "No";
  // "Yes, I will require sponsorship now" vs "…in the future": now when the user cannot work there today.
  const auth = answers.find((a) => a.topic === "work_authorization" && a.country && countriesIn(a.country).length === 1
    && countriesIn(a.country)[0] === places[0] && /^(yes|no)$/i.test(a.answer.trim()));
  const hint = { topic, authorizedHere: auth ? /^yes$/i.test(auth.answer.trim()) : undefined };
  const val = field.options.length ? yesNoOption(field.options, raw, hint) : raw;
  return val ? { kind: "answer", value: val, question: entry.question, reused: true } : undefined;
}

const CURRENCY: Array<[string, RegExp]> = [
  ["INR", /₹|\brs\.?\b|\binr\b|rupees?|\blpa\b|lakhs?|lacs?|crores?|\bctc\b/i],
  ["EUR", /€|\beur\b|euros?/i],
  ["GBP", /£|\bgbp\b|\bpounds?\b/i],
  ["JPY", /¥|\bjpy\b|\byen\b|万円|円/i],
  ["CAD", /\bcad\b|c\$|canadian dollars?/i],
  ["AUD", /\baud\b|a\$|australian dollars?/i],
  ["SGD", /\bsgd\b|s\$|singapore dollars?/i],
  ["BRL", /\bbrl\b|r\$|reais|real\b/i],
  ["MXN", /\bmxn\b|mex\$|mexican pesos?/i],
  ["CHF", /\bchf\b|francs?|swiss francs?/i],
  ["USD", /\$|\busd\b|u\.?s\.?\s*dollars?|dollars?/i],
  ["OTHER", /₩|₪|₺|\b(nzd|hkd|cny|rmb|aed|sar|qar|sek|nok|dkk|pln|czk|huf|zar|myr|idr|php|thb|vnd|krw|ils|try|ron|bgn)\b|dirhams?|riyals?|yuan/i],
];
const PERIOD: Array<[string, RegExp]> = [
  ["month", /\bmonth(ly)?\b|per month|\bp ?m\b|a month|in hand|pro monat|monatlich|par mois|mensuel|por mes|mensal|月給|\bmois\b|\bmonat\b|\bmes\b/i],
  ["hour", /\bhour(ly)?\b|per hour|\bhr\b|\bp ?h\b|pro stunde|stundensatz|par heure|horaire|por hora|時給/i],
  ["week", /\bweek(ly)?\b|per week|pro woche|par semaine|por semana/i],
  ["day", /\bdaily\b|per day|pro tag|par jour|por dia|diario|tagessatz/i],
  ["year", /\bannual(ly)?\b|per annum|\byearly\b|per year|\bp ?a\b|\blpa\b|\bctc\b|a year|pro jahr|jahr|jahres|jahrlich|annuel(le)?|par an|\ban\b|anual|por ano|年収|年額|\bannee\b/i],
];
const kindOf = (text: string, kinds: Array<[string, RegExp]>) => kinds.find(([, re]) => re.test(text.toLowerCase()))?.[0];

/** Salary from the quick answers, only when the question asks for exactly that value in the same currency and over
 * the same period (never converted), as one answer (not "current and expected"), and not as a yes/no question. */
/** The currency a job's country pays in (for a salary question that names none). */
const COUNTRY_CURRENCY: Record<string, string> = {
  India: "INR", "United States": "USD", "United Kingdom": "GBP", Canada: "CAD", Australia: "AUD", Singapore: "SGD", Japan: "JPY",
  Brazil: "BRL", Mexico: "MXN", Switzerland: "CHF", Germany: "EUR", France: "EUR", Spain: "EUR", Italy: "EUR", Netherlands: "EUR",
  Ireland: "EUR", Portugal: "EUR", Belgium: "EUR", Austria: "EUR", Finland: "EUR", Greece: "EUR", Luxembourg: "EUR", Estonia: "EUR",
  Latvia: "EUR", Lithuania: "EUR", Slovakia: "EUR", Slovenia: "EUR", Croatia: "EUR", Malta: "EUR", Cyprus: "EUR",
};

/** How currency lists name each currency ("US Dollar ($)", "Canadian Dollar ($)", "Euro (€)" on Breezy). */
const CURRENCY_OPTION: Record<string, RegExp> = {
  USD: /^(us|u\.s\.|united states) dollars?\b|^usd\b|\(usd\)/i, CAD: /^canadian dollars?\b|^cad\b|\(cad\)/i, EUR: /^euros?\b|^eur\b|\(eur\)/i,
  GBP: /^(british pounds?|pounds? sterling)\b|^gbp\b|\(gbp\)/i, INR: /^indian rupees?\b|^inr\b|\(inr\)/i, AUD: /^australian dollars?\b|^aud\b|\(aud\)/i,
  SGD: /^singapore dollars?\b|^sgd\b|\(sgd\)/i, JPY: /^japanese yen\b|^jpy\b|\(jpy\)/i, BRL: /^brazilian real\b|^brl\b|\(brl\)/i,
  MXN: /^mexican pesos?\b|^mxn\b|\(mxn\)/i, CHF: /^swiss francs?\b|^chf\b|\(chf\)/i,
};

/** The currency list next to a salary box (Breezy "Desired Salary" + "salaryCurrency", live run 7: it stayed on its
 * default "US Dollar" beside a "CAD 140,000" typed for a Canadian job). Picked only when the salary box itself would be
 * filled: the job's one currency, and a saved figure in that currency. */
function salaryCurrencyAnswer(field: FieldDescriptor, facts: QuickFacts, page: PageFacts | undefined, homeCountry?: string): Decision | undefined {
  if (!field.options.length || !/\bcurrency\b|currency$/i.test(`${field.label} ${field.name}`) || /\bpreferred\b.*\bpaid\b/i.test(field.label)) return undefined;
  const home = COUNTRY_CURRENCY[canonicalCountries(homeCountry ?? "")[0] ?? ""] ?? "INR";
  const job = [...new Set((page?.jobCountries ?? []).map((c) => COUNTRY_CURRENCY[c] ?? "OTHER"))];
  if (job.length !== 1 || job[0] === "OTHER") return undefined;
  const wanted = job[0]!;
  const saved = facts.expectedCtc?.trim() ?? "";
  const savedCurrency = saved ? kindOf(saved, CURRENCY) ?? home : undefined;
  const abroad = (facts.expectedSalaryAbroad ?? "").split(/[;\n]|,\s*(?=[A-Z]{3}\b|[$€£¥₹])/).map((x) => x.trim()).some((x) => x && kindOf(x, CURRENCY) === wanted);
  if (savedCurrency !== wanted && !abroad) return undefined;
  const re = CURRENCY_OPTION[wanted];
  const hits = re ? field.options.filter((o) => re.test(o.trim())) : [];
  return hits.length === 1 ? answer(hits[0]!, "salary currency") : undefined;
}

function salaryAnswer(field: FieldDescriptor, facts: QuickFacts, page?: PageFacts, homeCountry?: string): Decision | undefined {
  // A figure saved without a currency ("120000") is in the money of the country the user lives in (rupees when none is
  // saved): a US user's "120000" is dollars, not rupees (live run 7, a US-based candidate).
  const home = COUNTRY_CURRENCY[canonicalCountries(homeCountry ?? "")[0] ?? ""] ?? "INR";
  const q = normalize(field.label);
  // Not a request for the figure itself (live run 3): "If there's anything else you'd like to mention regarding expected
  // salary…", "Salary growth expectations", "…fixed/variable compensation breakdown", "Of this amount, how much…".
  if (/\b(anything else|growth|breakdown|split|of this amount|how much (of|do you expect for))\b/.test(q)) return undefined;
  // Only part of the pay: "expected annual variable compensation (ex. commission)?" (live round 10), bonus, equity.
  if (/\b(variable|commission|commissions|bonus|incentive|equity|stock|rsu|rsus|sign on|signing)\b/.test(q) && !/\b(base|total|overall|ote|on target)\b/.test(q)) return undefined;
  // "Is your current salary negotiable?" asks yes or no. "Could you please share your expectations?" asks for the amount.
  const politeAsk = /^(could|can|would) you (please )?(let us know|tell|share|specify|provide|give|indicate|state)\b/.test(q);
  if (YES_NO_QUESTION.test(q) && !politeAsk && field.control !== "number") return undefined;

  // CTC split / Fixed vs Variable: Never guess individual split components from total CTC
  if (/\b(?:fixed\s*(?:pay|salary|ctc|component)|variable\s*(?:pay|salary|ctc|component)|bonus|incentive|in[- ]?hand|take[- ]?home)\b/i.test(q) &&
      !/\b(?:total|overall|fixed\s*\+\s*variable|all[- ]inclusive)\b/i.test(q)) {
    return undefined;
  }

  let asksExpected = /expect|desired|requirement|range|asking|looking for|anticipated|target|expectativa|preten[st]|esperad|desejad|souhait|gewunscht|erwart|vorstellung|ziel|gehaltsvorstellung|zielgehalt|希望|\b(?:hourly|daily|contract(?:or)?|consulting|billing|pay)\s+rate\b/.test(q);
  let asksCurrent = /\b(current|present|existing|last drawn|now|today|atual|actual|aktuell\w*|derzeitig\w*|actuel\w*|dernier|attuale|huidig\w*|現在|現)\b/.test(q);
  if ((asksExpected && asksCurrent) || (!asksExpected && !asksCurrent)) {
    const hint = normalize(`${field.placeholder} ${field.name}`);
    const hintExpected = /expect|desired|requirement|range|asking|looking for|target|expectativa|preten[st]|esperad|desejad|souhait|gewunscht|erwart|vorstellung|ziel|gehaltsvorstellung|zielgehalt|希望|\b(?:hourly|daily|contract(?:or)?|consulting|billing|pay)\s+rate\b/.test(hint);
    const hintCurrent = /\b(current|present|existing|last drawn|atual|actual|aktuell\w*|derzeitig\w*|actuel\w*|dernier|attuale|huidig\w*|現在|現)\b/.test(hint);
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
  let value = (asksExpected ? facts.expectedCtc?.trim() : asksCurrent ? facts.currentCtc?.trim() : "") ?? "";
  let what = asksExpected ? "expected CTC" : "current CTC";
  const asked = `${field.label} ${field.placeholder}`;
  // The currency the question names. Several named ("…no commas, i.e. $50000, £50000" on a US/Canada job, live run 5:
  // pounds were typed) are only format examples: the job's country decides. "C$" / "A$" also read as "$".
  const named = new Set(CURRENCY.filter(([, re]) => re.test(asked.toLowerCase())).map(([k]) => k));
  if (named.has("USD") && ["CAD", "AUD", "SGD", "BRL", "MXN"].some((k) => named.has(k))) named.delete("USD");
  const askedCurrency = named.size === 1 ? [...named][0] : undefined;
  // The currency this form wants: the one it names, or the one every country of the job pays in.
  const jobCurrencyList = [...new Set((page?.jobCountries ?? []).map((c) => COUNTRY_CURRENCY[c] ?? "OTHER"))];
  const wanted = askedCurrency ?? (jobCurrencyList.length === 1 && jobCurrencyList[0] !== "OTHER" ? jobCurrencyList[0] : undefined);
  // Expected salary for a job paid in another currency: the user's figure in THAT currency, when they gave one
  // ("USD 70000, EUR 60000"; Quick answers). A current salary is never converted or swapped.
  if (asksExpected && wanted && wanted !== (kindOf(value, CURRENCY) ?? home) && facts.expectedSalaryAbroad) {
    // Entries split at ";", a new line, or a comma before the next currency ("USD 70,000, EUR 60,000").
    const abroad = facts.expectedSalaryAbroad.split(/[;\n]|,\s*(?=[A-Z]{3}\b|[$€£¥₹])/).map((x) => x.trim()).find((x) => x && kindOf(x, CURRENCY) === wanted);
    if (abroad) {
      value = abroad;
      what = "expected salary abroad";
    }
  }
  if (!value) return undefined;
  const valueCurrency = kindOf(value, CURRENCY);
  // Asked in a currency: the saved value must say the same one (a bare number is only taken as rupees).
  if (askedCurrency && askedCurrency !== (valueCurrency ?? home)) return undefined;
  // No currency named: filled only for a job whose country is known to pay in the saved figure's currency ("18 LPA"
  // means nothing to a US, German or Brazilian form; live run 3 typed it on all three, and live run 4 on 29 forms whose
  // page said only "Remote", "Seoul" or "Amsterdam"). An unknown job country is asked. "CTC" in the question is the
  // Indian word for a salary and counts as asking in rupees (CURRENCY above).
  if (!askedCurrency) {
    const jobCurrencies = (page?.jobCountries ?? []).map((c) => COUNTRY_CURRENCY[c] ?? "OTHER");
    if (!jobCurrencies.length || jobCurrencies.some((c) => c !== (valueCurrency ?? home))) return undefined;
  }
  // "Please specify Monthly/Annually": the form takes either, so it names no period.
  const periods = PERIOD.filter(([, re]) => re.test(asked.toLowerCase())).length;
  const askedPeriod = periods > 1 ? "year" : kindOf(asked, PERIOD) ?? "year";
  const valuePeriod = kindOf(value, PERIOD) ?? "year"; // a CTC is yearly unless it says otherwise
  if (askedPeriod !== valuePeriod) return undefined;
  if (field.control === "number") {
    // A number box takes a plain amount: "18 LPA" is 18 only where the box itself is in lakhs.
    const inLakhs = /\blakhs?\b|\blacs?\b|\blpa\b/;
    const inManYen = /万円|万/;
    const inThousands = /\b(?:k€|k\$|k£|k(?:eur|usd|gbp)?|thousands?)\b|(?:\b\d+\s*k\b)/i;
    const qInThousands = /\b(?:k€|k\$|k£|k(?:eur|usd|gbp)?|thousands?)\b|\bk\b/i;

    let cleanVal = value.replace(/,/g, "");
    // Normalize European thousands dot separator (e.g. 65.000 or 120.000)
    if (/^\D*\d{1,3}\.\d{3}(?!\d)/.test(value) && !/\.\d{1,2}$/.test(value)) {
      cleanVal = value.replace(/\./g, "").replace(/,/g, "");
    }
    const n = /\d+(\.\d+)?/.exec(cleanVal)?.[0];
    if (!n) return undefined;
    if (inLakhs.test(value.toLowerCase())) return inLakhs.test(q) ? answer(n, what) : undefined;
    if (inManYen.test(value)) return inManYen.test(q) ? answer(n, what) : undefined;
    if (inThousands.test(value.toLowerCase())) return qInThousands.test(q) ? answer(n, what) : undefined;
    if (/\d\s*(?:k|cr|crores?)\b/i.test(value) || /\b\d+\s*m\b/i.test(value)) return undefined;
    return answer(n, what);
  }
  // "Please format with no commas" (1Password): "USD 70,000" becomes "USD 70000".
  if (/\b(no|without) (commas?|thousands? separators?)\b/.test(q)) return answer(value.replace(/(\d),(?=\d{3}\b)/g, "$1"), what);
  return answer(value, what);
}

// Also the declines of Spanish, Portuguese, French, German, Italian, Dutch, Japanese and Chinese forms (live run 2:
// "Prefiero no responder" on Cabify and "Prefiro não responder" on C6 Bank were missed). Matched on normalized text.
const DECLINE = /decline|don ?t (wish|want)|do not (wish|want)|prefer not|choose not|not to (say|answer|disclose|self identify)|rather not|prefier[oe] no (responder|decir|contestar|indicar|especificar)|prefiro nao (responder|informar|dizer|declarar)|prefere ne pas|ne (souhaite|veux) pas (repondre|le dire|le preciser)|keine angabe|mochte (ich )?(das |es )?nicht angeben|nicht angeben|preferisco non (rispondere|dirlo|specificare)|liever niet|wil ik niet zeggen|回答しない|答えたくない|回答を控え|不愿透露|不想回答|不愿回答|不願透露|不想回答/;
/** An answer (or a listed choice) that declines to say ("Decline to self identify", "I don't wish to answer"). */
export const isDeclineAnswer = (text: string): boolean => DECLINE.test(normalize(text));

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
    }, {}); // a list whose choices are not known: "I am not" is a fragment, not an answer
    return v ? answer(v, "veteran status") : undefined;
  }
  if (topic === "disability" && facts.disability) {
    const v = choice(field, facts.disability, { Yes: /^yes\b|^i have a disability/, No: /^no\b|do not have a disability|don ?t have a disability/, Decline: DECLINE },
      { Yes: "Yes", No: "No", Decline: "Decline" });
    return v ? answer(v, "disability") : undefined;
  }
  if (topic === "race" && facts.race) {
    if (facts.race === "Decline") {
      const v = choice(field, "Decline", { Decline: DECLINE }, { Decline: "Decline" });
      return v ? answer(v, "race/ethnicity") : undefined;
    }
    const saved = normalize(facts.race);
    const v = choice(field, facts.race, {
      Asian: /^asian\b/,
      Black: /^black|african american/,
      White: /^white/,
      Hispanic: /^hispanic|latino/,
      Decline: DECLINE,
    }, { Asian: "Asian", Black: "Black", White: "White", Hispanic: "Hispanic", Decline: "Decline" });
    if (v) return answer(v, "race/ethnicity");
    if (field.options.length) {
      const fits = field.options.filter((o) => normalize(o) === saved || normalize(o).startsWith(`${saved} `));
      if (fits.length === 1) return answer(fits[0]!, "race/ethnicity");
    }
  }
  if (topic === "veteran" && facts.veteran && !/another country|foreign|other countr/.test(q)) {
    const v = choice(field, facts.veteran, {
      Yes: /^(?!.*\b(not|decline|don ?t|prefer)\b).*(veteran|^yes\b)/, No: /\b(not a|am not|non) ?(protected )?veteran|^no\b/, Decline: DECLINE,
    }, { Yes: "Yes", No: "No", Decline: "Decline" });
    return v ? answer(v, "veteran status") : undefined;
  }
  if (topic === "pronouns" && facts.pronouns) {
    if (/\bif\s+["']?other["']?\s+is\s+selected\b/i.test(q)) return undefined;
    // The box for pronouns NOT in the list ("If your personal pronoun is not listed above, how would you like to be
    // addressed?", "Self describe - I prefer to use the following pronouns:"): only for someone the list leaves out.
    if (/\b(not listed|isn ?t listed|self[- ]?describ\w*|if (other|not|none)|otherwise)\b/i.test(q)) return undefined;
    if (field.control === "text") return answer(facts.pronouns, "pronouns");
    const v = choice(field, facts.pronouns, {
      "she/her": /she\/her|she \/ her|she\/hers|female/i,
      "he/him": /he\/him|he \/ him|he\/his|male/i,
      "they/them": /they\/them|they \/ them/i,
      Decline: DECLINE,
    }, { "she/her": "she/her", "he/him": "he/him", "they/them": "they/them", Decline: "Decline" });
    return v ? answer(v, "pronouns") : undefined;
  }
  if (topic === "sexual_orientation" && facts.sexualOrientation) {
    const v = choice(field, facts.sexualOrientation, {
      Heterosexual: /straight|heterosexual/,
      Decline: DECLINE,
    }, { Heterosexual: "Heterosexual", Decline: "I prefer not to say" });
    return v ? answer(v, "sexual orientation") : undefined;
  }
  if (topic === "transgender" && facts.transgender) {
    // "Is your gender identity the same as the sex you were assigned at birth?" asks the reverse of "Are you
    // transgender?": Yes and No swap, a Decline stays a Decline. (Live run 3: a saved Decline became "No", which says
    // the user IS transgender, on GoCardless and Gymshark.)
    const reversed = /\b(same as|assigned at birth)\b/i.test(q);
    const target = !reversed || facts.transgender === "Decline" ? facts.transgender : facts.transgender === "No" ? "Yes" : "No";
    const v = choice(field, target, { Yes: /^yes\b/, No: /^no\b/, Decline: DECLINE }, { Yes: "Yes", No: "No", Decline: "Decline" });
    return v ? answer(v, "transgender") : undefined;
  }
  if (topic === "accommodation" && facts.needsAccommodation) {
    if (field.control === "text" || field.control === "textarea") {
      if (facts.needsAccommodation === "No") return answer("None", "accommodation");
    }
    const v = choice(field, facts.needsAccommodation, { Yes: /^yes\b/, No: /^no\b/, Decline: DECLINE }, { Yes: "Yes", No: "No", Decline: "Decline" });
    return v ? answer(v, "accommodation") : undefined;
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

/** The job posting a URL is for, without the apply step or query ("…/jobs/123/application?src=x" → "…/jobs/123"). */
function jobKey(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/(apply|application|applications|submit|thank[-_]?you|confirmation)(\/.*)?$/i, "").replace(/\/+$/, "");
    return `${u.hostname.replace(/^www\./i, "").toLowerCase()}${path.toLowerCase()}`;
  } catch {
    return "";
  }
}

/** "…in the past 12 months?", "…within the last year?": the window in days, when the question names one. */
function askedWindowDays(q: string): number | undefined {
  const m = /\b(?:past|last|previous|within)\s+(?:the\s+)?(?:(\d+|one|two|three|six|twelve|eighteen|twenty four)\s+)?(days?|weeks?|months?|years?)\b/.exec(q);
  if (!m) return undefined;
  const words: Record<string, number> = { one: 1, two: 2, three: 3, six: 6, twelve: 12, eighteen: 18, "twenty four": 24 };
  const n = m[1] ? (words[m[1]] ?? Number(m[1])) : 1;
  const unit = m[2]!.replace(/s$/, "");
  return n * (unit === "year" ? 365 : unit === "month" ? 31 : unit === "week" ? 7 : 1);
}

/** Check if the tracker has a confirmed application that answers this question: to the same company; for "this
 * position/role/job" to the same posting; for "in the past 12 months" one submitted inside that window. A question
 * naming another company ("…applied to Amazon…?" on another company's page) is not answered from the tracker. */
export function hasConfirmedApplication(page?: PageFacts, label?: string): boolean {
  if (!page?.url || !page?.applications?.length) return false;
  const current = companyDomain(page.url);
  if (!current) return false;
  let matches = page.applications.filter((app) => app.status === "applied_confirmed" && companyDomain(app.url) === current);
  if (!matches.length || label === undefined) return matches.length > 0;
  const q = normalize(label);
  // A company named in the question must be this one.
  const named = /\bappl(?:ied|y)\s+(?:to|with|at|for)\s+([A-Z][\w&.-]*(?:\s+[A-Z][\w&.-]*)*)/.exec(label)?.[1];
  if (named && !/^(This|The|Our|Us|Any|A|An)$/.test(named.split(/\s+/)[0]!)) {
    const slug = named.toLowerCase().replace(/[^a-z0-9]/g, "");
    const host = current.replace(/[^a-z0-9]/g, "");
    if (!slug || !(host === slug || host.startsWith(slug))) return false;
  }
  if (/\b(this|the same|that) (position|role|job|opening|posting|vacancy|requisition|opportunity)\b/.test(q)) {
    const key = jobKey(page.url);
    matches = matches.filter((app) => key && jobKey(app.url) === key);
  }
  const days = askedWindowDays(q);
  if (days !== undefined) {
    const now = Date.now();
    matches = matches.filter((app) => {
      const at = app.submittedAt ? Date.parse(app.submittedAt) : NaN;
      return Number.isFinite(at) && now - at <= days * 86_400_000;
    });
  }
  return matches.length > 0;
}

/** Recognises "Can you start immediately?" in its affirmative yes/no wordings. */
export function isStartImmediatelyQuestion(label: string): boolean {
  if (!answerableLength(label)) return false;
  if (isCompanyOrPlaceSpecific(label)) return false;
  if (hasExceptionClause(label)) return false;
  const q = normalize(label);
  if (WANTS_DETAILS.test(q) || WH_QUESTION.test(q)) return false;
  if (/\b(not|unable|cannot|can t|cant|wont|won t)\b/.test(q) && !/\b(ab sofort|sofort|per direct)\b/.test(q)) return false;
  if (/\b(january|february|march|april|may|june|july|august|september|october|november|december|monday|tuesday|wednesday|thursday|friday|saturday|sunday|am|pm|o clock)\b/.test(q)) return false;
  if (/\b\d{1,4}[\/\.-]\d{1,2}[\/\.-]\d{1,4}\b/.test(label)) return false;
  return /^(can you|are you (able|available) to|could you|would you be able to)\s+(start(\s+work(ing)?)?|begin|commence|join)\s+(immediately|right away)$/.test(q)
    || /^(available|able)\s+to\s+(start(\s+work(ing)?)?|begin|commence|join)\s+(immediately|right away)$/.test(q)
    || /^(start|join)\s+(immediately|right away)$/.test(q)
    || /^(konnen sie |kannst du |sind sie in der lage )?(ab sofort|sofort) (anfangen|beginnen|starten|eintreten)$/.test(q)
    || /^(ab sofort|sofort) (verfugbar|bereit|startklar|eintreten)$/.test(q)
    || /^(pouvez vous |est ce que vous pouvez |etes vous (en mesure|disponible) pour )?(commencer|debuter) immediatement$/.test(q)
    || /^disponible immediatement$/.test(q)
    || /^(puede|puedes|esta|estas) (incorporarse|empezar|comenzar) (de inmediato|inmediatamente)$/.test(q)
    || /^(tiene |cuenta con )?disponibilidad inmediata$/.test(q)
    || /^(pode|voce pode) (comecar|iniciar) (de imediato|imediatamente)$/.test(q)
    || /^disponibilidade imediata$/.test(q)
    || /^(puoi|e in grado di) iniziare (subito|immediatamente)$/.test(q)
    || /^disponibilita immediata$/.test(q)
    || /^(kunt u |kun je )?per direct (beginnen|starten)$/.test(q)
    || /^(per direct|direct) beschikbaar$/.test(q);
}

/** "Immediately"/"0 days" -> Yes; a number of days or weeks > 0 -> No; anything else asks. */
export function startImmediatelyValue(notice: string): "Yes" | "No" | undefined {
  const norm = normalize(notice);
  if (!norm) return undefined;
  if (/^(immediate(ly)?|0(\s*(days?|weeks?|months?))?|none|no notice|available immediately|sofort|ab sofort|immediat(e)?|immediatement|sans preavis|inmediat[oa]|de inmediato|inmediatamente|sin preaviso|imediat[oa]|imediatamente|sem aviso previo|subito|per direct|direct beschikbaar)$/.test(norm)) {
    return "Yes";
  }
  if (/^([1-9]\d*)\s*(days?|weeks?|months?|tage?n?|wochen?|monate?n?|jours?|semaines?|mois|dias?|semanas?|mes(?:es)?|giorni|settimane|mesi|weken?|maanden?)$/.test(norm)) {
    return "No";
  }
  return undefined;
}

export function parseNoticeDays(notice: string): number | undefined {
  const norm = normalize(notice);
  if (!norm) return undefined;
  if (/^(immediate(ly)?|0(\s*(days?|weeks?|months?))?|none|no notice|available immediately|sofort|ab sofort|immediat(e)?|immediatement|sans preavis|inmediat[oa]|de inmediato|inmediatamente|sin preaviso|imediat[oa]|imediatamente|sem aviso previo|subito|per direct|direct beschikbaar)$/.test(norm)) {
    return 0;
  }
  const bareNum = norm.match(/^(\d+)$/);
  if (bareNum && bareNum[1]) return parseInt(bareNum[1], 10);
  const m = norm.match(/\b(\d+)\s*(days?|weeks?|months?|tage?n?|wochen?|monate?n?|jours?|semaines?|mois|dias?|semanas?|mes(?:es)?|giorn[io]|settiman[ae]|mesi|mese|dag(?:en)?|week|weken|maand(?:en)?)\b/);
  if (!m || !m[1]) return undefined;
  const num = parseInt(m[1], 10);
  const unit = (m[2] ?? "").toLowerCase();
  if (/^(month|monat|mois|mes|mese|maand)/.test(unit)) return num * 30;
  if (/^(week|woche|semaine|semana|settimana|wek)/.test(unit)) return num * 7;
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
      /^(immediate(ly)?|0\s*days?|no notice|none|available immediately|sofort|ab sofort|immediat(ement)?|de inmediato|inmediatamente|imediatamente|subito|per direct)\b/i.test(normalize(o)) ||
      /immediate|right away|sofort|ab sofort|immediat|inmediat|subito|per direct/i.test(normalize(o))
    );
  }

  for (const o of options) {
    const optDays = parseNoticeDays(o);
    if (optDays !== undefined && optDays === candidateDays) return o;
  }

  if (candidateDays === 180) {
    const m = options.find((o) => /\b(?:6\s*(?:months?|monate?n?|mois|mes(?:es)?|mesi|maand(?:en)?)|180\s*(?:days?|tage?n?|jours?|dias?|giorni))\b/i.test(normalize(o)));
    if (m) return m;
  }
  if (candidateDays === 90) {
    const m = options.find((o) => /\b(?:3\s*(?:months?|monate?n?|mois|mes(?:es)?|mesi|maand(?:en)?)|90\s*(?:days?|tage?n?|jours?|dias?|giorni))\b/i.test(normalize(o)));
    if (m) return m;
  }
  if (candidateDays === 60) {
    const m = options.find((o) => /\b(?:2\s*(?:\+|\s*or\s*more)?\s*(?:months?|monate?n?|mois|mes(?:es)?|mesi|maand(?:en)?)|60\s*(?:\+|\s*or\s*more)?\s*(?:days?|tage?n?|jours?|dias?|giorni))\b/i.test(normalize(o)));
    if (m) return m;
  }
  if (candidateDays === 30) {
    const m = options.find((o) => /\b(?:1\s*(?:month|monat|mois|mes(?:es)?|mese|maand)|30\s*(?:days?|tage?n?|jours?|dias?|giorni)|4\s*(?:weeks?|wochen?|semaines?|semanas?|settimane|weken?))\b/i.test(normalize(o)));
    if (m) return m;
  }
  if (candidateDays === 14 || candidateDays === 15) {
    const m = options.find((o) => /\b(?:2\s*(?:weeks?|wochen?|semaines?|semanas?|settimane|weken?)|1[45]\s*(?:days?|tage?n?|jours?|dias?|giorni))\b/i.test(normalize(o)));
    if (m) return m;
  }
  if (candidateDays === 7) {
    const m = options.find((o) => /\b(?:1\s*(?:week|woche|semaine|semana|settimana|week)|7\s*(?:days?|tage?n?|jours?|dias?|giorni))\b/i.test(normalize(o)));
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

/** "Zip Code (Non-U.S. based candidates, please enter "00000")": the form tells candidates outside the US what to
 * type. It is never ignored: a candidate outside the US gets the form's value in a postal code box (anything else is
 * asked); where the user lives is not known: asked; a US candidate: the normal rules. */
export function nonUsInstruction(field: FieldDescriptor, profile: Profile): Decision | undefined {
  const m = /\b(?:non[-\s]?(?:u\.?s\.?|united states|us)(?:[-\s]based)?|outside (?:of )?(?:the )?(?:u\.?s\.?a?|united states))\b[^"“”']*["“']([^"“”']{1,20})["”']/i.exec(field.label);
  if (!m) return undefined;
  const home = countriesIn(profile.country);
  if (home.includes("United States")) return undefined;
  if (!home.length) return { kind: "ask", reason: "unknown" };
  const value = m[1]!.trim();
  if (/\b(zip|postal|post code|postcode|pin ?code)\b/i.test(field.label) && value) return { kind: "profile", key: "postalCode", value };
  return { kind: "ask", reason: "unknown" };
}

/** "Which U.S. State or Canadian Province do you reside in?": a state of another country than the user's is not an
 * answer ("Maharashtra" is not a U.S. state). Asked, unless the user lives in one of the countries named. */
export function foreignSubdivision(field: FieldDescriptor, profile: Profile): Decision | undefined {
  const m = /\b(u\.?s\.?a?|united states|american|canadian|canada|australian|uk|british)\s+(states?|provinces?|territor(?:y|ies)|count(?:y|ies)|zip)\b/i.exec(field.label);
  if (!m) return undefined;
  const named = countriesIn(field.label.replace(/\bcanadian\b/gi, "Canada").replace(/\baustralian\b/gi, "Australia").replace(/\bbritish\b/gi, "United Kingdom"));
  const home = countriesIn(profile.country);
  if (home.length && named.some((c) => home.includes(c))) return undefined;
  return { kind: "ask", reason: "unknown" };
}

/** The quick answer for this question, if the user gave one and the question clearly is that question. */
const COUNTRY_ALPHA2: Record<string, string> = { germany: "DE", france: "FR", "united kingdom": "GB", "united states": "US" };

export function factDecision(field: FieldDescriptor, profile: Profile, topic: SensitiveTopic | undefined, page?: PageFacts): Decision | undefined {
  if (!topic) {
    const instructed = nonUsInstruction(field, profile) ?? foreignSubdivision(field, profile);
    if (instructed) return instructed;
  }
  const facts = profile.facts;
  if (!facts) return undefined;
  const q = normalize(field.label);
  // A declaration to read, not a question to answer for the user (a short preface before a work question is fine).
  if (!answerableLength(field.label) && !((topic === "work_authorization" || topic === "sponsorship") && prefacedWorkQuestion(field.label))) return undefined;
  if (topic === "work_authorization" || topic === "sponsorship") return facts.workCountries ? workAnswer(field, profile, facts, page) : undefined;
  if (topic === "salary") return salaryCurrencyAnswer(field, facts, page, profile.country) ?? salaryAnswer(field, facts, page, profile.country);
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
            /immediate|right away|sofort|ab sofort|immediat|inmediat|subito|per direct/i.test(o) && !/^(no\b|not|non|nein|nao|nee)/i.test(normalize(o))
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
            /^(no\b|not available|cannot|can t|nein|non|nao|nee|nicht sofort)/i.test(normalize(o)) && !/available immediately|ab sofort|sofort/i.test(o)
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
    if (!notice) return undefined;
    const candidateDays = parseNoticeDays(notice);
    // "What is your earliest possible start date?" in a date box (live round 8): today plus the saved notice period.
    if (field.control === "date") {
      if (candidateDays === undefined || !/\b(earliest|soonest)\b.*\bstart|\bstart date\b|\bdate available\b|\bavailab\w* (start )?date\b/.test(q) || /\b(end|last|leave|finish)\b/.test(q)) return undefined;
      const day = new Date(Date.now() + candidateDays * 86_400_000);
      return answer(day.toISOString().slice(0, 10), "notice period");
    }
    // "Do you have a notice period at your current job before being able to start a new role?": yes when it is longer
    // than nothing.
    // ("Are you subject to a notice period…?" stays the user's: the labelled set of 1,539 real questions keeps it so.)
    // One question only: "Do you currently have a notice period? When would you be available to start?" wants both
    // (Watershed, live round 9: a bare "Yes" left the second unanswered).
    if (/^do you (currently )?have( a| any)? notice period\b/.test(q) && (field.label.match(/\?/g) ?? []).length <= 1 && yesNoField(field) && candidateDays !== undefined) {
      const raw = candidateDays > 0 ? "Yes" : "No";
      const val = field.options.length ? yesNoOption(field.options, raw) : raw;
      return val ? answer(val, "notice period") : undefined;
    }
    // "If offered this position, how soon are you available to start?": the condition is the application itself.
    const plain = q.replace(/^if (you are |you re |you were )?(offered|selected for|hired for) (this|the) (position|role|job|opportunity) /, "");

    if (isCompanyOrPlaceSpecific(field.label) || hasExceptionClause(field.label) || /^if\b/i.test(plain)) return undefined;
    const withinMatch = q.match(/^(?:can you|are you (?:able|available) to|could you|would you be able to)?\s*(?:start|join|commence|begin|available|commencer|incorporarse|iniciar)\s+(?:within|in|dans|en|em)\s+(\d+)\s*(days?|weeks?|months?|tage?n?|wochen?|monate?n?|jours?|semaines?|mois|dias?|semanas?|meses?)\??$/i);
    if (withinMatch && withinMatch[1]) {
      const allowedNum = parseInt(withinMatch[1], 10);
      const unit = withinMatch[2]?.toLowerCase() ?? "day";
      const thresholdDays = /month|monat|mois|mes/i.test(unit) ? allowedNum * 30 : /week|woche|semaine|semana/i.test(unit) ? allowedNum * 7 : allowedNum;
      if (candidateDays !== undefined) {
        const canJoin = candidateDays <= thresholdDays;
        const raw = canJoin ? "Yes" : "No";
        const val = field.options.length ? (yesNoOption(field.options, raw) ?? bestOption(field.options, raw) ?? raw) : raw;
        return answer(val, "notice period");
      }
    }

    if (YES_NO_QUESTION.test(q)) return undefined;
    // A date ("Start date", a DD/MM/YYYY mask in the label or placeholder) needs a date, not "30 days".
    const shape = normalize(`${field.label} ${field.placeholder}`);
    if (/\b(dd|mm|yyyy|jjjj|aaaa)\b/.test(shape) || /\b(month|year)\b$/.test(q) || /last (working )?day/.test(q)) return undefined;
    // "Start date", "Date Available", "Availability date": a date, and a notice period ("30 days") is not one.
    const savedIsDate = /\b(19|20)\d{2}\b|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b|\d{1,2}[\/.-]\d{1,2}/.test(notice.toLowerCase());
    if (/\b(date|datum|fecha|data)\b/.test(q) && !savedIsDate) return undefined;
    const rawUnit = /\b(days?|weeks?|months?|tage?n?|wochen?|monate?n?|jours?|semaines?|mois|dias?|semanas?|meses?|giorni|settimane|mesi|weken?|maanden?)\b/.exec(shape)?.[1]?.toLowerCase();
    const unit = rawUnit ? (/^(month|monat|mois|mes|mese|maand)/.test(rawUnit) ? "month" : /^(week|woche|semaine|semana|settimana|wek)/.test(rawUnit) ? "week" : "day") : undefined;
    const saved = /^(\d+)(?:\s*(day|week|month)s?)?$/i.exec(notice);
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
    const isBareNumber = /^\d+$/.test(notice.trim());
    return answer(isBareNumber ? `${candidateDays} days` : notice, "notice period");
  }
  if (topic === "relocation") {
    const moved = relocationFact(field, profile, facts, page);
    if (moved) return moved;
    if (!facts.relocate) return undefined;
    if (field.control === "textarea" || field.control === "text") return undefined;
    if (!/\b(relocat|open to (?:relocation|relocating)|willing to relocate)\b/i.test(q)) return undefined;
    // "Are you currently located in, or open to relocating to, one of BILL's remote-eligible states?" (live run 3):
    // where the user lives AND relocation in one question, with a "Yes, I currently reside in…" choice. The Quick
    // answer is only for the plain "Are you willing to relocate?": a question that also asks where the user is goes
    // to the user.
    if (/\b(located|based|reside|resident|residing|live|living|currently in|are you in|already in)\b/i.test(normalize(field.label))) return undefined;
    if (yesNoField(field)) {
      const match = field.options.length ? (yesNoOption(field.options, facts.relocate) ?? facts.relocate) : facts.relocate;
      return answer(match, "relocation");
    }
    return undefined;
  }
  if (topic && ["gender", "race", "veteran", "disability", "pronouns", "sexual_orientation", "transgender", "accommodation"].includes(topic)) {
    // Country rules: Germany and France restrict collecting race/ethnicity, so on a job there the user answers it.
    // Gender (Anrede/civilité) is asked on nearly every German and French form and stays the user's saved answer.
    const jobs = page?.jobCountries ?? [];
    const alpha2 = jobs.length === 1 ? COUNTRY_ALPHA2[jobs[0]!.toLowerCase()] : undefined;
    if (topic === "race" && evaluateEeoPolicy(topic, alpha2) === "prohibited_or_skip") return undefined;
    return diversityAnswer(field, facts, topic);
  }
  if ((topic === "age" || /\b(?:18 years (?:of age )?or older|at least 18|over 18|18 or older)\b/i.test(q)) && facts.over18 && yesNoField(field)) {
    if (/^(are you |do you confirm you are |confirm you are )?(at least 18|18 years (?:of age )?or older|18 or older|over the age of 18)/i.test(q)) {
      const match = field.options.length ? (yesNoOption(field.options, facts.over18) ?? facts.over18) : facts.over18;
      return answer(match, "over 18");
    }
  }
  if (!topic && facts.heardFrom?.trim() && HEARD_ABOUT.test(q) && field.control !== "textarea") return answer(facts.heardFrom.trim(), "how you heard");
  return undefined;
}

/** Relocation questions the plain Quick answer does not cover, answered from where the user lives (live round 8):
 * - "Would you need to relocate to work regularly from this office?": Yes when the job is in other countries only.
 * - "If you live outside of the Detroit area, are you open to relocation?": the saved answer, for a user who does not
 *   live there.
 * - "Are you currently located in, or open to relocating to, one of BILL's remote-eligible states?" (US states) for a
 *   user abroad: "No, but I am open to relocating…" or "No, I am not open to relocation".
 * Anything else stays with the rules below or the user. */
function relocationFact(field: FieldDescriptor, profile: Profile, facts: QuickFacts, page?: PageFacts): Decision | undefined {
  if (field.control === "textarea" || field.control === "text") return undefined;
  const q = normalize(field.label);
  const home = canonicalCountries(profile.country ?? "")[0];
  const jobs = page?.jobCountries ?? [];
  const pick = (raw: string) => (field.options.length ? yesNoOption(field.options, raw) : raw);
  // Only about the job's own place: "…from one of these offices?" may list one in the user's city (Graphcore lists
  // Austin, round 9 review), so a list of offices is the user's.
  if (/^would you (need|have) to relocate\b|^would you require relocation\b|^will you (need|have) to relocate\b/.test(q) && yesNoField(field)
    && !/\b(one of|any of|these|those|our) (offices|locations|sites|hubs)\b|\boffices\b/.test(q)) {
    if (!home || !jobs.length || jobs.includes(home)) return undefined; // same country: another city or not is theirs
    const val = pick("Yes");
    return val ? answer(val, "relocation") : undefined;
  }
  const outside = /^if you (?:currently )?(?:live|are based|reside|are located) outside (?:of )?(?:the )?(.+?)(?: (?:metro(?:politan)? )?(?:area|region))?,? (?:are|would) you (?:be )?(?:open|willing) to relocat/.exec(q);
  // ("If you…" reads as a follow-up to yesNoField; here it is the whole question, so the options decide.)
  const yesAndNo = field.options.length ? !!yesNoOption(field.options, "Yes") && !!yesNoOption(field.options, "No") : ["combobox", "select", "dropdown", "radio"].includes(field.control);
  if (outside && facts.relocate && yesAndNo) {
    const place = outside[1]!;
    if (new RegExp(`\\b${escapeRegex(place)}\\b`).test(normalize(profile.location ?? ""))) return undefined; // they live there
    const val = pick(facts.relocate);
    return val ? answer(val, "relocation") : undefined;
  }
  if (/\blocated in,? or open to relocating to\b/.test(q) && /\bstates?\b/.test(q) && home && home !== "United States" && facts.relocate && field.options.length) {
    const opts = field.options.map((o) => [o, normalize(o)] as const);
    const want = facts.relocate === "Yes"
      ? opts.filter(([, n]) => /^no\b/.test(n) && /\bopen to relocat/.test(n) && !/\bnot open\b/.test(n))
      : opts.filter(([, n]) => /^no\b/.test(n) && /\bnot open to relocat/.test(n));
    return want.length === 1 ? answer(want[0]![0], "relocation") : undefined;
  }
  return undefined;
}

/** "Are you currently enrolled / a student?" (any studies, no place or programme named). */
const ENROLLED_QUESTION = /^(are you )?(currently )?(enrolled|an? (current |full time |part time )?(student|enrolled student)|studying|pursuing (a |your )?(degree|studies|education))( (in|at) (a |an )?(degree|degree program|program|programme|college|university|school|course))?( currently| at the moment| right now)?$/;
/** "Have you completed your degree / studies?" (yours, not a named degree). */
const COMPLETED_QUESTION = /^(have you )?(completed|finished) (your )?(degree|studies|education|graduation)( yet)?$|^(have you|did you) graduate(d)?$|^are you a graduate$/;

/** Education status answers (Profile.educationStatus). Completion is answered only for someone who finished:
 * a student may well have completed an earlier degree, so for them the form asks. */
export function educationStatusAnswer(field: FieldDescriptor, profile: Profile): Decision | undefined {
  const status = profile.educationStatus;
  if (!status || !yesNoField(field) || !answerableLength(field.label)) return undefined;
  const q = normalize(field.label).replace(/\?$/, "").trim();
  let value: "Yes" | "No" | undefined;
  if (ENROLLED_QUESTION.test(q)) value = status === "pursuing" ? "Yes" : "No";
  else if (COMPLETED_QUESTION.test(q) && status === "completed") value = "Yes";
  if (!value) return undefined;
  const match = field.options.length ? yesNoOption(field.options, value) : value;
  return match ? answer(match, "education status") : undefined;
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
  if (lowerTerm === "open source" || lowerTerm === "open-source") {
    return /\bopen[- ]source\b/i.test(raw);
  }

  // General term whole-word matching:
  const escaped = escapeRegex(cleanTerm).replace(/\s+/g, "[- ]");
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
  // "Have you been rejected for this role at Samsara…?" is about past applications, not past employment.
  if (/\b(rejected|declined|turned down|not selected)\b/.test(q)) return false;
  // "…employed or refused employment by Couples Negril?" (live round 10): being refused is no part of a work history.
  if (/\b(refused|denied|dismissed|terminated|fired|let go)\b/.test(q)) return false;

  return /^(have you (ever |previously )?been employed|have you (ever |previously )?worked (for|at)|are you currently a\b|are you a (current or )?former|do you now or have you in the past worked|history with|voce trabalha atualmente|are you (currently|now) or have you (ever|previously) (worked|been employed)|have you ever or are you currently working at|are you a current employee (with|of)|are you currently or have you previously worked for)/.test(q)
    || (/\b(employed|worked (for|at))\b/.test(q) && /\b(before|in the past|previously)\b/.test(q) && /^(have you|were you|did you)\b/.test(q));
}

/** "…or one of its clients?": the user's history cannot tell who the company's clients, partners or affiliates are. */
/** Capitalised words that are not a company's name. */
const NOT_A_NAME = /^(i|you|your|us|we|our|the|this|that|a|an|any|company|companies|organi[sz]ations?|firm|employer|employee|employees|business|group|team|inc|llc|ltd|have|has|are|were|did|do|history|with|for|at|by|of|or|and|in|the past|yes|no|previous|current|former|intern|contractor)$/i;

/** The question names the company in its own words ("…employed by Stripe?", "HISTORY WITH ANDURIL", "Are you a
 * current Twitch employee?"): a capitalised word that is not a sentence's first word and not one of the words above. */
function namesACompany(label: string): boolean {
  const asked = label.replace(/\([^)]*\)/g, " ");
  for (const sentence of asked.split(/(?<=[.?!:])\s+/)) {
    const words = sentence.split(/\s+/).map((w) => w.replace(/^[^\w]+|[^\w&]+$/g, "")).filter(Boolean);
    if (words.slice(1).some((w) => /^[A-Z]/.test(w) && !NOT_A_NAME.test(w))) return true;
  }
  return false;
}

const ITS_RELATIONS = /\b(clients?|customers?|partners?|vendors?|suppliers?|affiliates?|affiliated|subsidiar\w*|parent company|sister compan\w*|competitors?|portfolio compan\w*)\b/;

export function previousEmployerAnswer(field: FieldDescriptor, profile: Profile, page?: PageFacts): Decision | undefined {
  if (!yesNoField(field)) return undefined;
  if (ITS_RELATIONS.test(normalize(field.label))) return undefined;
  // Here too, for the question model's path (live round 10 re-check: it still answered "…or refused employment by…").
  if (/\b(refused|denied|rejected|dismissed|terminated|fired|let go|turned down)\b/.test(normalize(field.label))) return undefined;

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

  // If not matched, only answer "No" if candidate explicitly confirmed history is complete, and the question names
  // the company in its own words: "Have you worked for us?" knows the company only from the page address, whose
  // slug ("acme-corp-careers") need not read like the employer's name in the history.
  if (!namesACompany(label)) return undefined;
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
  // "100% on-site in Pleasanton, CA" reads "on site" once normalised (live round 8).
  return /\b(onsite|on site|hybrid|hybride|inoffice|in office|inperson|commute|commuting distance|office attendance|\bwork from (the|our)?\s*office\b|\bjoin us in the office\b|\bdays (in|from) the office\b|\bdays (a|per) week\b|come to office|office based|work arrangement|sur place)\b/i.test(q);
}

const US_STATES = /\b(alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|new mexico|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|west virginia|wisconsin|wyoming)\b/;
/** Capitalised words after "in/at/to" that are not a place. */
const NOT_A_PLACE = /^(our|the|this|that|your|a|an|any|all|least|person|office|offices|onsite|on|hybrid|remote|order|addition|accordance|english|monday|tuesday|wednesday|thursday|friday|saturday|sunday|ist|est|pst|cet|gmt|utc)$/i;
const PLACE_SUFFIX = /\s+(office|offices|headquarters|hq|campus|hub|site|location|branch|studio|lab|labs|centre|center)$/i;

/** The question names a place the rules cannot compare with the user's: a postcode, a US state, "City, ST", or a
 * capitalised name after "in/at/to/near" that is not a city the rules know ("commute to Alameda", "in Wayzata"). */
export function namesUnknownPlace(label: string): boolean {
  if (/\b[A-Z]{1,2}\d[A-Z\d]?\s+\d[A-Z]{2}\b/.test(label)) return true; // UK postcode
  if (/\b\d{5}(?:-\d{4})?\b/.test(label) || /\b\d{6}\b/.test(label)) return true; // ZIP / PIN code
  if (US_STATES.test(normalize(label)) || /\b[A-Z][a-z]+,\s*(?:[A-Z]{2})\b/.test(label)) return true;
  const after = /\b(?:in|at|to|near|around|from)\s+(?:the\s+)?([A-Z][A-Za-z.'-]*(?:\s+[A-Z][A-Za-z.'-]*)*)/g;
  for (const m of label.matchAll(after)) {
    let phrase = m[1]!.trim();
    while (PLACE_SUFFIX.test(phrase)) phrase = phrase.replace(PLACE_SUFFIX, "");
    const words = phrase.split(/\s+/).filter((w) => !NOT_A_PLACE.test(w));
    if (!words.length) continue;
    if (extractPlacesInText(words.join(" ")).length) continue; // a place the rules know: compared by the caller
    return true;
  }
  return false;
}

export function workModeAnswer(field: FieldDescriptor, profile: Profile, page?: PageFacts): Decision | undefined {
  const facts = profile.facts;
  if (!facts?.workMode || !yesNoField(field)) return undefined;

  const q = normalize(field.label);

  // The place the question is about. Yes only where it is the user's own city or one they prefer; a place the rules do
  // not know ("Alameda", "Wayzata, Minnesota", a postcode such as "PO15 5TT") or another place: the user decides.
  const userLocs = normalize(`${profile.location} ${profile.preferredLocations || ""}`);
  const places = extractPlacesInText(field.label);
  const unknownPlace = namesUnknownPlace(field.label);
  const placeMatched = places.length > 0 && places.some((place) => new RegExp(`\\b${escapeRegex(normalize(place))}\\b`).test(userLocs))
    && places.every((place) => new RegExp(`\\b${escapeRegex(normalize(place))}\\b`).test(`${userLocs} ${normalize(profile.country)}`));
  // "Are you able to work hybrid in our NYC office 3 days a week?", "100% on-site in Pleasanton, CA. Are you able to meet
  // this requirement?" (live round 8, a user in Austin): another city is no obstacle for a user willing to relocate, in a
  // country they may work in without a visa (the job's countries and any the question names, all known and allowed).
  const placeCountries = [...new Set([...countriesInLocation(field.label), ...(page?.jobCountries ?? [])])];
  const allowed = canonicalCountries(facts.workCountries ?? "");
  const willMove = facts.relocate === "Yes" && placeCountries.length > 0 && placeCountries.every((c) => canWorkIn(c, allowed));
  // "Are you local / within commuting distance to this job?", "…able to commute daily to …?": a fact about where the
  // user lives, answerable only against a named place that is theirs.
  if (/\b(commut\w*|local|nearby|within \d+ (miles?|km|kilometers?|kilometres?)|live within|based within|located within|reside within|proximity|based in|located in|live in|reside in)\b/.test(q) && !placeMatched) {
    return undefined;
  }
  if (unknownPlace && !willMove) return undefined;
  if (places.length > 0 && !placeMatched && !willMove) return undefined;

  // Check required office days per week via shared requirements parser:
  const req = parseRequirement(field.label);
  const requiredDays = req?.unit === "days" ? req.min : undefined;
  // Without a saved maximum: remote takes no office days, onsite or "any" every day; hybrid fewer than five (a fourth
  // day is not known).
  const savedMax = facts.maxOfficeDays !== undefined && facts.maxOfficeDays !== "" ? Number(facts.maxOfficeDays) : undefined;
  const maxDays = savedMax ?? (facts.workMode === "remote" ? 0 : facts.workMode === "hybrid" ? 3 : 5);
  if (savedMax === undefined && facts.workMode === "hybrid" && requiredDays === 4) return undefined;

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
  if (!/\b(language|proficiency|proficient|fluency|fluent|speak|idioma|lingua|langue|sprache|bilingual|level|levels|skills?|knowledge|nivel|niveau|nivel|livello)\b/i.test(q)) return [];
  // "A degree in English literature", "English teacher": a subject, not the user's command of a language.
  if (/\b(degree|literature|major|minor|teacher|teaching|tutor|course|class|studies|translation|translator|grade)\b/.test(q)) return [];
  const langs = ["english", "french", "german", "spanish", "portuguese", "italian", "mandarin", "japanese", "hindi", "kannada", "marathi",
    "tamil", "telugu", "bengali", "gujarati", "punjabi", "malayalam", "urdu", "arabic", "dutch", "polish", "korean", "chinese", "cantonese",
    "russian", "turkish", "swedish", "norwegian", "danish", "finnish", "greek", "hebrew", "indonesian", "malay", "thai", "vietnamese",
    "czech", "romanian", "hungarian", "ukrainian"];
  return langs.filter((lang) => mentions(q, lang));
}

const LEVEL_RANK: Record<string, number> = {
  native: 5,
  fluent: 4,
  professional: 3,
  conversational: 2,
  basic: 1,
};

/** The level an option of a proficiency list stands for, on the profile's scale (5 native … 1 basic), from many
 * scales: Beginner/Intermediate/Advanced, CEFR (A1…C2), LinkedIn's (Elementary … Native or bilingual), Spanish and
 * Portuguese wordings. Undefined when the option is no level. */
function optionLevel(option: string): number | undefined {
  const o = normalize(option);
  if (/\b(native|mother tongue|bilingual|c2|nativo|nativa|muttersprache|langue maternelle)\b/.test(o)) return 5;
  if (/\b(upper intermediate|intermedio alto|b2|professional working|business)\b/.test(o)) return 3;
  if (/\b(fluent|advanced?|proficient|full professional|c1|expert|avanzado|avancado|fluente|fluido|courant)\b/.test(o)) return 4;
  if (/\b(intermediate|intermedio|intermediario|conversational|limited working|b1)\b/.test(o)) return 2;
  if (/\b(beginner|basic|elementary|a1|a2|principiante|basico|iniciante|no proficiency)\b/.test(o)) return 1;
  return undefined;
}

/** The one option at the user's level, or nothing (none, or two at that level: asked). Never a higher level. */
function levelOption(options: string[], level: number | undefined): string | undefined {
  if (!level) return undefined;
  const at = options.filter((o) => optionLevel(o) === level);
  return at.length === 1 ? at[0] : undefined;
}

function askedLanguageLevel(q: string): number {
  if (/\b(?:native|mother\s+tongue|first\s+language|bilingual)\b/i.test(q)) return 5;
  if (/\b(?:fluent|fluently|fließend|courant|fluido|fluente|vloeiend)\b/i.test(q)) return 4;
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
    // No fallback to a "fluent" option: a Basic or Conversational speaker must never be filled as Fluent (round 4).
    const match = bestOption(field.options, entry.proficiency, 0.6) ?? levelOption(field.options, LEVEL_RANK[entry.proficiency.toLowerCase()]);
    if (match) return answer(match, "language");
    return undefined; // a list without the user's level: asked
  }
  return answer(entry.proficiency, "language");
}

/** Words around a skill that leave it the same skill ("strong SQL skills", "experience with Python"). */
const SKILL_LEFT_OK = /^(with|in|using|use|of|on|and|or|the|a|an|your|any|about|experience|experienced|knowledge|strong|solid|good|advanced|basic|working|hands|expert|expertise|proficient|proficiency|familiar|familiarity|writing|write|used|built|build|building|e g|eg|as|like|including|for|to|at|have|has|do|you|microsoft|ms|is|are|g|primary|main)$/;
const SKILL_RIGHT_OK = /^(databases?|queries|query|programming|language|languages|development|skills?|scripting|scripts?|experience|and|or|for|in|with|to|at|on|e g|eg|etc|knowledge|proficiency|as)$/;

/** The question uses an inventory skill inside a narrower one: "Distributed SQL Databases", "generative AI",
 * "AI agents", "AI-powered content creation". Knowing SQL or AI does not say the user has that experience. */
export function narrowerSkill(label: string, skill: string, others: string[] = []): boolean {
  const term = skill.trim();
  if (!term) return false;
  // Short acronyms that are also words ("AI", "ML", "R", "C") count only as written in capitals, as in mentions().
  const exactCase = /^(ai|ml|r|c)$/i.test(term);
  const re = new RegExp(`(?<![A-Za-z0-9+#])${escapeRegex(term)}(?![A-Za-z0-9+#])`, exactCase ? "g" : "gi");
  for (const m of label.matchAll(re)) {
    const left = normalize(label.slice(0, m.index)).split(" ").filter(Boolean).pop() ?? "";
    const rest = label.slice(m.index! + m[0].length);
    const right = /^\s*([,.;:?!)/]|$)/.test(rest) ? "" : normalize(rest).split(" ").filter(Boolean)[0] ?? "";
    // A neighbour that is part of another skill the user has ("B2B SaaS Product Design") is two skills, not a narrower one.
    const ownWord = (w: string) => others.some((o) => normalize(o).split(" ").includes(w));
    if ((left && !SKILL_LEFT_OK.test(left) && !ownWord(left)) || (right && !SKILL_RIGHT_OK.test(right) && !ownWord(right))) return true;
  }
  return false;
}

function matchYearsOption(options: string[], years: number): string | undefined {
  for (const opt of options) {
    const req = parseRequirement(opt);
    if (req && req.unit === "years") {
      if (req.min !== undefined && req.max !== undefined) {
        if (years >= req.min && years <= req.max) return opt;
      } else if (req.min !== undefined) {
        if (years >= req.min) return opt;
      } else if (req.max !== undefined) {
        if (years <= req.max) return opt;
      }
    }
  }
  return undefined;
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
  // A skill named only inside a narrower one ("Distributed SQL Databases" for a user who knows SQL): the user decides.
  const named = inv.filter((s) => mentions(field.label, s.name)).map((s) => s.name);
  if (named.some((s) => narrowerSkill(field.label, s, named.filter((o) => o !== s)))) return undefined;
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
          const match = bestOption(field.options, yearsStr, 0.7)
            ?? matchYearsOption(field.options, primary.years)
            ?? field.options.find((o) => o.includes(yearsStr));
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
      if (field.options.length) {
        const match = bestOption(field.options, yearsStr, 0.7)
          ?? matchYearsOption(field.options, primary.years)
          ?? field.options.find((o) => o.includes(yearsStr));
        if (match) return answer(match, "skills");
      }
    }
  }

  // Question did not match any inventory skills:
  if (profile.skillsComplete && yesNoField(field)) {
    const match = field.options.length ? (yesNoOption(field.options, "No") ?? "No") : "No";
    return match ? answer(match, "skills") : undefined;
  }

  return undefined;
}


// ------------------------------------------------------------------------------------------------------------------
// Self-declarations from Quick answers (live run 2026-11-08: ~100 required asks on 1,198 forms). Each answers only a
// plain yes/no question about the user, never a follow-up that wants details or names.

const DETAIL_FOLLOW_UP = /\b(if (yes|so|applicable)|please (describe|explain|list|provide|specify|share|name|tell)|details?|who|whom|which|their (name|names|position))\b/;
const yesNo = (field: FieldDescriptor, raw: "Yes" | "No"): string | undefined =>
  field.options.length ? yesNoOption(field.options, raw) : raw;

/** "Are you bound by a non-compete or non-solicitation agreement?", "Do you have any relatives employed by X?", "Do
 * you hold an active security clearance?" from the user's one-time declarations. */
export function selfDeclarationAnswer(field: FieldDescriptor, profile: Profile): Decision | undefined {
  const facts = profile.facts;
  if (!facts || !yesNoField(field)) return undefined;
  const q = normalize(field.label);
  if (DETAIL_FOLLOW_UP.test(q) || /\bnot\b/.test(q) || !/^(are|do|does|have|has|is|were|did)\b/.test(q)) return undefined;
  if (facts.nonCompete && /\bnon ?-?compete|non ?-?solicit\w*|restrictive covenant/.test(q) && !/\bour\b/.test(q)) {
    const v = yesNo(field, facts.nonCompete);
    return v ? answer(v, "non-compete") : undefined;
  }
  if (facts.relativesAtCompanies === "No" && /\b(relatives?|family members?|related to|spouse|partner|siblings?|immediate family|household)\b/.test(q)
    && /\b(work|works|working|employ\w*|currently at)\b/.test(q)) {
    const v = yesNo(field, "No");
    return v ? answer(v, "relatives at the company") : undefined;
  }
  // "Do you have / hold an active security clearance?" (never "Are you able / willing to obtain one?").
  if (facts.securityClearance === "None" && /security clearance|clearance (level|status)|\b(ts\/sci|top secret|secret) clearance/.test(q)
    && !/\b(able|willing|eligible|obtain|get|apply|maintain)\b/.test(q)) {
    const v = yesNo(field, "No");
    return v ? answer(v, "security clearance") : undefined;
  }
  return undefined;
}

/** "Start date month" / "Start date year" (and "Earliest start month/year") from the notice period, counted from
 * today. Only a list of months or years, so a typed date is never invented. */
export function startMonthYearAnswer(field: FieldDescriptor, profile: Profile, today = new Date()): Decision | undefined {
  const notice = profile.facts?.noticePeriod?.trim();
  if (!notice || !field.options.length) return undefined;
  const q = normalize(field.label);
  const asksMonth = /\b(start|joining|availability|available)\b[\s\S]{0,30}\bmonth\b|\bmonth\b[\s\S]{0,30}\b(start|join)/.test(q);
  const asksYear = /\b(start|joining|availability|available)\b[\s\S]{0,30}\byear\b|\byear\b[\s\S]{0,30}\b(start|join)/.test(q);
  if (asksMonth === asksYear) return undefined;
  const days = parseNoticeDays(notice);
  if (days === undefined) return undefined;
  const start = new Date(today.getTime() + days * 86_400_000);
  if (asksYear) {
    const y = String(start.getFullYear());
    const opt = field.options.find((o) => o.trim() === y);
    return opt ? answer(opt, "notice period (start year)") : undefined;
  }
  const names = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
  const m = start.getMonth();
  const opt = field.options.find((o) => { const n = normalize(o); return n === names[m] || n === names[m]!.slice(0, 3) || n === String(m + 1) || n === String(m + 1).padStart(2, "0"); });
  return opt ? answer(opt, "notice period (start month)") : undefined;
}

/** A US-state or ZIP list that offers "I am not in the US" / "Outside the US", for a user who lives elsewhere. */
export function outsideUsAnswer(field: FieldDescriptor, profile: Profile): Decision | undefined {
  if (!field.options.length || !profile.country?.trim() || /united states|^usa?$/i.test(profile.country.trim())) return undefined;
  const q = normalize(field.label);
  if (!/\b(state|states|zip|u ?s resident|which us)\b/.test(q) || /\bcountry\b/.test(q)) return undefined;
  const outside = field.options.filter((o) => /\b(not (currently )?(in|based in|located in|living in|residing in) (the )?(us|u ?s ?a?|united states)|outside (of )?(the )?(us|u ?s ?a?|united states)|non ?-?us\b|international|i do not live in the us)\b/i.test(normalize(o)));
  return outside.length === 1 ? answer(outside[0]!, "where you live (outside the US)") : undefined;
}

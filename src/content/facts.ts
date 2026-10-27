/** Quick answers: one answer per question that most forms ask in their own words (Answers → Quick answers). Each rule
 * answers only when the question clearly is that question; anything unclear is left to the user:
 *  - work authorization / sponsorship: only when the question names a country (or "your country of residence");
 *    "the country where this job is located" is asked
 *  - salary: current vs expected must be clear, and a question in another currency than the answer is asked
 *  - relocation: only the general question "Are you willing to relocate?"
 *  - diversity questions: only where the form offers choices, and only a choice that clearly matches */

import type { Decision, FieldDescriptor, Profile, QuickFacts, SensitiveTopic } from "../shared/types";
import { canonicalCountries, canWorkIn, countriesIn } from "../shared/countries";
import { bestOption, normalize } from "../shared/text";

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
}

function workAnswer(field: FieldDescriptor, profile: Profile, facts: QuickFacts, page?: PageFacts): Decision | undefined {
  const allowed = canonicalCountries(facts.workCountries);
  if (!allowed.length || !yesNoField(field)) return undefined;
  const q = normalize(field.label);
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
  // Polarity from the words: "Will you require sponsorship?" is answered the other way round from "Are you authorized?".
  // "…the right to work in Poland without the need for employer support (a visa or work permit)?" asks about the right
  // to work: what follows "without" is what the user would NOT need, so it does not turn the question round.
  const asked = q.replace(/\bwithout\b.*$/, "");
  const needs = /\b(require|requires|required|need|needs|needed)\b/.test(asked) || /sponsor/.test(asked);
  const yes = needs ? !can[0] : can[0];
  return answer(yes ? "Yes" : "No", needs ? "sponsorship" : "work authorization");
}

function salaryAnswer(field: FieldDescriptor, facts: QuickFacts): Decision | undefined {
  const q = normalize(field.label);
  const expected = /expect|desired|requirement|range|asking|looking for|anticipated/.test(q);
  const current = !expected && /\b(current|present|existing|last drawn|now|today)\b/.test(q);
  const value = expected ? facts.expectedCtc.trim() : current ? facts.currentCtc.trim() : "";
  if (!value) return undefined;
  const currency = /[$€£]|\b(usd|eur|gbp|dollars?|euros?|pounds?)\b/i;
  if (currency.test(field.label) && !currency.test(value)) return undefined; // asked in dollars, answered in lakhs
  if (field.control === "number") {
    const n = /\d+(\.\d+)?/.exec(value.replace(/,/g, ""))?.[0];
    return n ? answer(n, expected ? "expected CTC" : "current CTC") : undefined;
  }
  return answer(value, expected ? "expected CTC" : "current CTC");
}

const DECLINE = /decline|don ?t wish|do not wish|prefer not|choose not|not to (say|answer|disclose|self identify)|rather not/;

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
    const v = bestOption(field.options, facts.race, 0.75);
    return v ? answer(v, "race/ethnicity") : undefined;
  }
  return undefined;
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
    // A date picker or a "month"/"year" box needs a date, not "30 days".
    // "Are you subject to a notice period?" is a yes/no question: "30 days" is not its answer.
    if (!facts.noticePeriod.trim() || field.control === "date" || /\b(month|year|day)\b$/.test(q) || YES_NO_QUESTION.test(q)) return undefined;
    // "Please list specific dates of availability, start and end date", "Additional information about a start date".
    if (/additional information|\bend date\b|\blist (the |your |specific )?dates\b|^optional\b/.test(q)) return undefined;
    return answer(facts.noticePeriod.trim(), "notice period");
  }
  if (topic === "relocation") {
    if (!facts.relocate || !/^(are you |would you be |will you be )?(willing|open|able|ready) to relocate( if (needed|required|necessary))?$/.test(q)) return undefined;
    return yesNoField(field) ? answer(facts.relocate, "relocation") : undefined;
  }
  if (topic && ["gender", "race", "veteran", "disability"].includes(topic)) return diversityAnswer(field, facts, topic);
  if (!topic && facts.heardFrom.trim() && HEARD_ABOUT.test(q) && field.control !== "textarea") return answer(facts.heardFrom.trim(), "how you heard");
  return undefined;
}

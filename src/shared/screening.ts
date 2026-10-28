/** Common screening questions that can be pre-answered once and reused strictly for general questions.
 * Company- or place-specific questions and questions with negated polarity or exception clauses
 * must NEVER match a saved screening answer.
 */

import { normalize } from "./text";

export interface ScreeningQuestionDef {
  key: string;
  question: string;
  pattern: RegExp;
}

export const COMMON_SCREENING_QUESTIONS: ScreeningQuestionDef[] = [
  { key: "drivers_license", question: "Do you have a valid driver's license?", pattern: /\b(driver'?s? licen[sc]e|driving licen[sc]e)\b/i },
  { key: "age_18", question: "Are you at least 18 years of age or older?", pattern: /\b(18 years (of age )?or older|at least 18( years of age)?|18 or older|legal age to work)\b/i },
  { key: "background_check", question: "Are you willing to undergo a background check?", pattern: /\bbackground (check|investigation|screening)\b/i },
  { key: "drug_test", question: "Are you willing to take a drug test?", pattern: /\bdrug (test|screen|screening)\b/i },
  { key: "weekends_shifts", question: "Are you willing to work weekends or flexible shifts?", pattern: /\b(weekends?|shifts?|shift work|irregular hours)\b/i },
  { key: "travel", question: "Are you willing to travel for work?", pattern: /\b(travel for (work|business|the job)|business travel|willing to travel|open to (business )?travel)\b/i },
  { key: "onsite", question: "Are you comfortable working on site?", pattern: /\b(comfortable|willing to) (work(ing)?|work) (on ?site|in person|in the office)|work(ing)? (on ?site|in person)\b/i },
  { key: "non_compete", question: "Are you bound by a non-compete agreement?", pattern: /\bnon ?compete\b/i },
  { key: "overtime", question: "Are you willing to work overtime if required?", pattern: /\b(work|working) overtime\b/i },
  { key: "transportation", question: "Do you have reliable transportation to get to work?", pattern: /\breliable (transportation|transport|vehicle)\b/i },
  { key: "work_authorization", question: "Are you legally authorized to work in the country of this job?", pattern: /\blegally (authorized|eligible|permitted) to work\b/i },
  { key: "remote_workspace", question: "Do you have a dedicated workspace for remote work?", pattern: /\b(dedicated|quiet) (workspace|home office|work area)\b/i },
  { key: "internet", question: "Do you have reliable high-speed internet access?", pattern: /\b(high ?speed|reliable) internet\b/i },
  { key: "essential_functions", question: "Are you able to perform the essential functions of the job with or without reasonable accommodation?", pattern: /\bessential (functions|duties) of (the|this) (job|role|position)\b/i },
  { key: "night_shifts", question: "Are you willing to work night shifts?", pattern: /\b(night|graveyard|third) shift\b/i },
  { key: "education_ged", question: "Have you completed high school or equivalent (GED)?", pattern: /\b(high school (diploma|equivalent)|ged)\b/i },
  { key: "degree_bachelor", question: "Do you have a bachelor's degree or higher?", pattern: /\b(bachelor'?s?( degree)?|undergraduate degree)\b/i },
  { key: "relocate", question: "Are you willing to relocate for this role?", pattern: /\b(willing to )?relocate\b/i },
  { key: "hybrid", question: "Are you willing to work in a hybrid schedule?", pattern: /\bhybrid (schedule|work|model)\b/i },
  { key: "employed", question: "Are you currently employed?", pattern: /\bcurrently employed\b/i },
];

/** Company- or place-specific questions that must NEVER match a general saved answer. */
const COMPANY_SPECIFIC_PATTERNS = [
  /\b(worked|employed|contractor|interned|internship)\b.*\b(this company|our company|the company|this organization|our organization|here|for us|with us)\b/i,
  /\b(previously|formerly|prior|ever)\b.*\b(employed|worked)\b/i,
  /\bformer employee\b/i,
  /\bworked (at|for|with) [A-Z]/,
  /\bemployed (at|by|with) [A-Z]/,
  /\bhave you (ever )?worked (here|for us|at|before)\b/i,
  /\b(relative|related|family member|friend|connection)\b.*\b(employee|staff|team|worker|colleague|working here|employed here)\b/i,
  /\brelated to (an? )?(employee|worker|staff)\b/i,
  /\b(relatives?|family members?|friends?)\b.*\b(employed|working)\b/i,
  /\bknow anyone (who works|working)\b/i,
];

const PLACE_SPECIFIC_PATTERNS = [
  /\bcommute to\b/i,
  /\brelocate to\b/i,
  /\b(office|facility|site|location|branch|campus) in\b/i,
  /\b(live|living|reside|residing|located|based) in\b/i,
  /\b(work|working|travel) (in|to|at) [A-Z][a-z]+/,
  /\bon ?site in [A-Z][a-z]+/,
];

export function isCompanyOrPlaceSpecific(text: string): boolean {
  return COMPANY_SPECIFIC_PATTERNS.some((p) => p.test(text)) || PLACE_SPECIFIC_PATTERNS.some((p) => p.test(text));
}

/** Words indicating an exception, restriction or condition. A general saved answer must not match. */
const EXCEPTION_CLAUSES = /\b(unless|other than|except( for| when| where| that)?|with the exception of|excluding)\b/i;

export function hasExceptionClause(text: string): boolean {
  return EXCEPTION_CLAUSES.test(text);
}

export function questionPolarity(text: string): "negative" | "positive" {
  const norm = normalize(text);
  const isNeg = /\b(not|never|unwilling|unable|disagree|without)\b|\bn['’]t\b|\bno\b(?!\s+(?:compete|disclosure|solicit))/i.test(norm);
  return isNeg ? "negative" : "positive";
}

/** Check if two questions match the same common screening question concept. */
export function sameScreeningQuestion(a: string, b: string): boolean {
  const normA = normalize(a);
  const normB = normalize(b);
  return COMMON_SCREENING_QUESTIONS.some((q) => q.pattern.test(normA) && q.pattern.test(normB));
}

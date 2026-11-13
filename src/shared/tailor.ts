/** Tailoring the resume to one job, on this computer, from the job description on the page and the user's own
 * resume and profile. Advice only: ApplyAgent never edits the resume file, and never suggests a skill the user has not
 * told it about (a skill the job asks for and the user does not list is shown as missing, "only if you have it").
 *
 * - Add to your resume: skills the job asks for that the user's Profile lists but the resume file never mentions
 *   (screeners and applicant-tracking keyword searches read the resume, not the Profile).
 * - Lead with: the resume lines that say most about what this job asks for.
 * - Missing: skills the job asks for that neither the resume nor the Profile mentions. */

import { canonicalizeSkill, extractCandidateSkills, extractSkillsFromText } from "../content/fit";
import { resumeLines, terms } from "./evidence";
import { normalize } from "./text";
import type { Profile } from "./types";

export interface TailorTips {
  /** Skills the job asks for, the Profile lists, and the resume never mentions (required ones first). */
  addToResume: string[];
  /** Up to three resume lines most about this job, best first. */
  leadWith: string[];
  /** Skills the job asks for that the user mentions nowhere (required ones first). */
  missing: string[];
  /** How many of the job's skills the resume itself mentions. */
  resumeCovers: { matched: number; total: number };
}

const named = (text: string, skill: string): boolean => {
  const n = ` ${normalize(text)} `;
  return n.includes(` ${normalize(skill)} `);
};

export function tailorTips(jobText: string, resumeText: string, profile: Profile): TailorTips {
  const wanted = extractSkillsFromText(jobText).sort((a, b) => Number(b.required) - Number(a.required) || b.count - a.count);
  const inResume = new Set(extractSkillsFromText(resumeText).map((s) => s.canonical));
  const inProfile = extractCandidateSkills(profile);
  const addToResume: string[] = [];
  const missing: string[] = [];
  let covered = 0;
  for (const skill of wanted) {
    const c = skill.canonical || canonicalizeSkill(skill.name);
    const resumeHas = inResume.has(c) || named(resumeText, c);
    if (resumeHas) covered++;
    else if (inProfile.has(c)) addToResume.push(c);
    else missing.push(c);
  }
  // The job's own words (its skills count double): the resume lines that share most of them lead.
  const jobTerms = new Set(terms(jobText));
  const skillTerms = new Set(wanted.flatMap((s) => terms(s.canonical)));
  const scored = resumeLines(resumeText).map((line) => {
    const t = terms(line);
    const score = t.filter((x) => jobTerms.has(x)).length + t.filter((x) => skillTerms.has(x)).length;
    return { line, score };
  }).filter((x) => x.score >= 3).sort((a, b) => b.score - a.score);
  const leadWith = [...new Set(scored.map((x) => x.line))].slice(0, 3);
  return { addToResume: [...new Set(addToResume)], leadWith, missing: [...new Set(missing)], resumeCovers: { matched: covered, total: wanted.length } };
}

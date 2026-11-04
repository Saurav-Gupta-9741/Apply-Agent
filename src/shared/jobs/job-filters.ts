/** Discover filters: experience level, fresher roles, job type, remote. Read from the posting's own title, type and
 * description; a posting that says nothing about a filter is kept only where that is the safe reading. */

import type { JobPosting } from "./types";

export type JobLevel = "internship" | "entry" | "mid" | "senior";
export type JobType = "full_time" | "part_time" | "contract" | "internship" | "temporary";
export type ExperienceFilter = "" | "fresher" | "junior" | "mid" | "senior";

export interface DiscoverFilters {
  experience: ExperienceFilter;
  type: "" | JobType;
  remoteOnly: boolean;
}

export const NO_FILTERS: DiscoverFilters = { experience: "", type: "", remoteOnly: false };

const INTERN = /\b(intern|interns|internship|trainee|apprentice(ship)?|co-?op|working student|werkstudent|stagiaire|praktikum)\b/i;
const ENTRY = /\b(graduate|new grad|fresher|freshers|entry[- ]level|junior|jr\.?|campus|early career|associate(?! (director|vice|principal|partner)))\b/i;
const SENIOR = /\b(senior|sr\.?|staff|principal|lead|head|director|manager|vp|vice president|architect|chief|tl|stl|team lead|sse|sde[- ]?(?:iii|3|iv|4))\b/i;

/** The level a posting's title names (internship, entry, senior); "mid" when it names none. */
export function jobLevel(job: Pick<JobPosting, "title">): JobLevel {
  const t = job.title;
  if (INTERN.test(t)) return "internship";
  if (SENIOR.test(t)) return "senior";
  if (ENTRY.test(t)) return "entry";
  return "mid";
}

/** The type of employment, from the board's own field first, then the title. Undefined when neither says. */
export function jobType(job: Pick<JobPosting, "title" | "employmentType">): JobType | undefined {
  const raw = (job.employmentType ?? "").toLowerCase().replace(/[\s_-]+/g, "");
  if (raw) {
    if (/intern/.test(raw)) return "internship";
    if (/parttime/.test(raw)) return "part_time";
    if (/contract|freelance|consult/.test(raw)) return "contract";
    if (/temp/.test(raw)) return "temporary";
    if (/fulltime|permanent|regular/.test(raw)) return "full_time";
  }
  const t = job.title;
  if (INTERN.test(t)) return "internship";
  if (/\bpart[- ]time\b/i.test(t)) return "part_time";
  if (/\b(contract|contractor|freelance)\b/i.test(t)) return "contract";
  if (/\b(temporary|temp|fixed[- ]term)\b/i.test(t)) return "temporary";
  if (/\bfull[- ]time\b/i.test(t)) return "full_time";
  return undefined;
}

/** The minimum years a posting asks for ("3+ years", "at least 5 years of experience", "2-4 years"), if it says. */
export function requiredYears(job: Pick<JobPosting, "descriptionSnippet" | "requirements" | "description"> & { title?: string }): number | undefined {
  const title = (job.title ?? "").toLowerCase();
  const text = [job.description ?? job.descriptionSnippet ?? "", ...(job.requirements ?? [])].join(" ").toLowerCase();
  // "3+ years of experience", "at least 5 years' relevant experience"
  const yearsThenExp = /\b(?:minimum (?:of )?|at least |min\.? )?(\d{1,2})(?:\s*(?:-|–|to)\s*\d{1,2})?\s*\+?\s*(?:years?|yrs?)(?:'|’)?\s*(?:of\s+)?(?:\w+\s+){0,3}?(?:experience|exp\b)/;
  // "Experience: 5-7 yrs", "Exp - 1 to 3 Yrs" (Indian boards often put this in the title)
  const expThenYears = /\b(?:experience|exp)\.?\s*[:\-–(]?\s*(?:of\s+)?(\d{1,2})\s*(?:\+|(?:-|–|to)\s*\d{1,2})?\s*\+?\s*(?:years?|yrs?)\b/;
  // In a title only: "(2-4 yrs)", "| 3+ Years"
  const bareInTitle = /(?:^|[\s(|,-])(\d{1,2})\s*(?:\+|(?:-|–|to)\s*\d{1,2})?\s*\+?\s*(?:years?|yrs?)\b/;
  const m = expThenYears.exec(title) ?? yearsThenExp.exec(title) ?? bareInTitle.exec(title) ?? yearsThenExp.exec(text) ?? expThenYears.exec(text);
  if (!m) return undefined;
  const n = Number(m[1]);
  return Number.isFinite(n) && n <= 30 ? n : undefined;
}

/** Whether a posting fits the chosen filters. */
export function passesFilters(job: JobPosting, f: DiscoverFilters): boolean {
  if (f.remoteOnly && !job.isRemote) return false;
  if (f.type) {
    const type = jobType(job);
    // Most postings that state no type are full-time; any other type must be stated.
    if (f.type === "full_time" ? type !== undefined && type !== "full_time" : type !== f.type) return false;
  }
  if (f.experience) {
    const level = jobLevel(job);
    const years = requiredYears(job);
    switch (f.experience) {
      case "fresher":
        if (level === "senior" || (level === "mid" && years === undefined)) return false;
        if (years !== undefined && years > 1) return false;
        break;
      case "junior":
        if (level === "senior" || level === "internship") return false;
        if (years !== undefined && years > 3) return false;
        break;
      case "mid":
        if (level === "internship" || level === "entry") return false;
        if (years !== undefined && (years < 2 || years > 7)) return false;
        break;
      case "senior":
        if (level !== "senior" && (years === undefined || years < 5)) return false;
        break;
    }
  }
  return true;
}

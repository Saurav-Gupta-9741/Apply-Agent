export type SupportedATS =
  | "greenhouse"
  | "lever"
  | "ashby"
  | "smartrecruiters"
  | "recruitee"
  | "personio"
  | "workable";

export interface CompanyListing {
  slug: string;
  name: string;
  ats: SupportedATS;
  country: string;
  industry: string;
  feedUrl?: string;
}

export interface JobPosting {
  id: string;
  companySlug: string;
  companyName: string;
  ats: SupportedATS;
  title: string;
  location: string;
  country?: string;
  isRemote: boolean;
  department?: string;
  url?: string;
  publishedAt?: string;
  descriptionSnippet?: string;
  /** The job description as plain text (first few thousand characters), used only to match skills on this computer. */
  description?: string;
  requirements?: string[];
  /** The board's own employment type ("Full-time", "Intern", "Contract"), when it gives one. */
  employmentType?: string;
  salary?: {
    currency?: string;
    min?: number;
    max?: number;
    period?: "year" | "month" | "hour";
  };
}

/** One part of a match score, shown to the user as "Role 36 of 40: Matches "Backend Engineer"". */
export interface MatchPart {
  key: "role" | "skills" | "experience" | "location";
  label: string;
  points: number;
  max: number;
  text: string;
}

export interface JobMatchResult {
  job: JobPosting;
  score: number; // 0 to 100
  matchedSkills: string[];
  /** Skills the job names that the user's profile does not list (a hint, never a reason to hide the job). */
  missingSkills: string[];
  why: string; // <= 8 words explanation
  isEligibleWorkCountry: boolean;
  /** How the score was made, part by part (adds up to `score`). */
  parts: MatchPart[];
  /** Why this job is not shown to the user, if it is not (wrong field, far more experience, …). */
  excluded?: string;
}

export interface JobFilterOptions {
  roleQuery?: string;
  country?: string;
  remoteOnly?: boolean;
  minScore?: number;
  limit?: number;
}

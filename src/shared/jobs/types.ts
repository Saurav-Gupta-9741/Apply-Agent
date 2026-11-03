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

export interface JobMatchResult {
  job: JobPosting;
  score: number; // 0 to 100
  matchedSkills: string[];
  why: string; // <= 8 words explanation
  isEligibleWorkCountry: boolean;
}

export interface JobFilterOptions {
  roleQuery?: string;
  country?: string;
  remoteOnly?: boolean;
  minScore?: number;
  limit?: number;
}

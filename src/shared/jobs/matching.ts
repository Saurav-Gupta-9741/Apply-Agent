import type { Profile } from "../types";
import type { JobFilterOptions, JobMatchResult, JobPosting } from "./types";
import { canonicalCountries } from "../countries";

/** Normalize string into lowercase tokens */
function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9+#.]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 1)
  );
}

/** Check if two role titles overlap substantially */
function roleOverlapScore(jobTitle: string, targetRoles: string, currentTitle: string): number {
  const jobTokens = tokenize(jobTitle);
  const targetTokens = tokenize(`${targetRoles} ${currentTitle}`);
  let matchCount = 0;

  for (const token of jobTokens) {
    if (["senior", "lead", "junior", "staff", "principal", "manager", "director", "intern"].includes(token)) {
      continue;
    }
    if (targetTokens.has(token)) {
      matchCount++;
    }
  }

  if (matchCount >= 2) return 40;
  if (matchCount === 1) return 25;
  return 0;
}

/** Compute matched skills between profile and job */
function findMatchedSkills(jobText: string, skillsStr: string): string[] {
  if (!skillsStr) return [];
  const skillsList = skillsStr
    .split(/[,;\n|]/)
    .map((s) => s.trim())
    .filter(Boolean);

  const matched: string[] = [];
  const lowerJob = jobText.toLowerCase();

  for (const skill of skillsList) {
    const sLower = skill.toLowerCase();
    const pattern = new RegExp(`\\b${sLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (pattern.test(lowerJob)) {
      matched.push(skill);
    }
  }

  return matched;
}

/** Score location match */
function locationScore(
  job: JobPosting,
  profile: Profile
): { score: number; isRemoteMatch: boolean; isLocMatch: boolean } {
  const prefWorkMode = profile.facts?.workMode?.toLowerCase() || "";
  const wantsRemote = prefWorkMode === "remote" || prefWorkMode === "any" || !prefWorkMode;

  if (job.isRemote && wantsRemote) {
    return { score: 20, isRemoteMatch: true, isLocMatch: false };
  }

  const userLocs = `${profile.location || ""} ${profile.preferredLocations || ""}`.toLowerCase();
  const jobLoc = (job.location || "").toLowerCase();

  if (jobLoc && userLocs) {
    const userCities = userLocs.split(/[,;\n|]/).map((c) => c.trim().toLowerCase()).filter(Boolean);
    for (const city of userCities) {
      if (city.length > 2 && jobLoc.includes(city)) {
        return { score: 20, isRemoteMatch: false, isLocMatch: true };
      }
    }
  }

  if (job.isRemote) {
    return { score: 15, isRemoteMatch: true, isLocMatch: false };
  }

  return { score: 5, isRemoteMatch: false, isLocMatch: false };
}

/** Match candidate profile to a single job posting */
export function matchJob(job: JobPosting, profile: Profile): JobMatchResult {
  let score = 0;
  const reasons: string[] = [];

  // 1. Role match (up to 40)
  const roleScore = roleOverlapScore(
    job.title,
    profile.targetRoles || "",
    profile.currentTitle || ""
  );
  score += roleScore;
  if (roleScore >= 25) {
    reasons.push("Role matches title");
  }

  // 2. Skills match (up to 30)
  const fullJobText = `${job.title} ${job.descriptionSnippet || ""} ${job.department || ""}`;
  const matchedSkills = findMatchedSkills(fullJobText, profile.skills || "");
  const skillScore = Math.min(30, matchedSkills.length * 10);
  score += skillScore;
  if (matchedSkills.length > 0) {
    reasons.push(`${matchedSkills.slice(0, 2).join(", ")} skills`);
  }

  // 3. Location / Remote (up to 20)
  const loc = locationScore(job, profile);
  score += loc.score;
  if (loc.isRemoteMatch) {
    reasons.push("Remote option");
  } else if (loc.isLocMatch) {
    reasons.push("Location matched");
  }

  // 4. Experience & Eligibility (up to 10)
  const allowed = canonicalCountries(profile.facts?.workCountries || profile.country || "");
  let isEligible = true;
  if (job.country && allowed.length > 0) {
    isEligible = allowed.some((c) => c.toLowerCase() === job.country?.toLowerCase());
  }

  if (isEligible) {
    score += 10;
  }

  // Build concise explanation in <= 8 words
  let why = reasons.join(", ");
  if (!why) why = "General profile alignment";
  const words = why.split(/\s+/);
  if (words.length > 8) {
    why = words.slice(0, 8).join(" ");
  }

  return {
    job,
    score: Math.min(100, Math.max(0, score)),
    matchedSkills,
    why,
    isEligibleWorkCountry: isEligible,
  };
}

/** Rank and filter a list of job postings */
export function rankJobs(
  jobs: JobPosting[],
  profile: Profile,
  options: JobFilterOptions = {}
): JobMatchResult[] {
  let results = jobs.map((j) => matchJob(j, profile));

  if (options.roleQuery) {
    const q = options.roleQuery.toLowerCase();
    results = results.filter((r) => r.job.title.toLowerCase().includes(q));
  }

  if (options.country) {
    const c = options.country.toLowerCase();
    results = results.filter((r) => (r.job.country || r.job.location || "").toLowerCase().includes(c));
  }

  if (options.remoteOnly) {
    results = results.filter((r) => r.job.isRemote);
  }

  if (options.minScore !== undefined) {
    results = results.filter((r) => r.score >= options.minScore!);
  }

  // Sort descending by match score
  results.sort((a, b) => b.score - a.score);

  if (options.limit && options.limit > 0) {
    results = results.slice(0, options.limit);
  }

  return results;
}

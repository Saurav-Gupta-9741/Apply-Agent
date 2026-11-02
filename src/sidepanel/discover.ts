import type { Profile } from "../shared/types";
import type { CompanyListing, JobFilterOptions, JobMatchResult, JobPosting } from "../shared/jobs/types";
import { rankJobs } from "../shared/jobs/matching";
import { fetchATSFeed } from "../shared/jobs/feeds";
import { defaultLimiter } from "../shared/jobs/rate-limiter";

export const FREE_DAILY_MATCH_LIMIT = 20;

export interface DiscoveryState {
  matches: JobMatchResult[];
  savedSearches: string[];
  lastFetchedAt?: string;
  dailyViewCount: number;
  lastViewDate: string; // YYYY-MM-DD
}

export function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Check if user can view more matches today on Free tier */
export function canViewMoreMatches(dailyCount: number, isPro: boolean): boolean {
  if (isPro) return true;
  return dailyCount < FREE_DAILY_MATCH_LIMIT;
}

/** Filter and match jobs against user profile */
export function discoverJobs(
  jobs: JobPosting[],
  profile: Profile,
  options: JobFilterOptions = {},
  isPro: boolean = false,
  currentDailyCount: number = 0
): { results: JobMatchResult[]; reachedLimit: boolean } {
  const ranked = rankJobs(jobs, profile, options);

  if (isPro) {
    return { results: ranked, reachedLimit: false };
  }

  const remaining = Math.max(0, FREE_DAILY_MATCH_LIMIT - currentDailyCount);
  const allowed = ranked.slice(0, remaining);
  const reachedLimit = ranked.length > remaining;

  return { results: allowed, reachedLimit };
}

/** Create HTML card for a matched job */
export function renderJobCard(match: JobMatchResult): string {
  const { job, score, why, isEligibleWorkCountry } = match;
  const badgeClass = score >= 75 ? "badge-high" : score >= 50 ? "badge-mid" : "badge-low";
  const remoteTag = job.isRemote ? '<span class="tag tag-remote">Remote</span>' : "";
  const countryWarning = !isEligibleWorkCountry
    ? '<span class="tag tag-warning" title="Country not listed in your work authorization">Visa Needed</span>'
    : "";

  return `
<div class="job-card" data-job-id="${escapeHtml(job.id)}">
  <div class="job-card-header">
    <div>
      <h4 class="job-title">${escapeHtml(job.title)}</h4>
      <div class="job-company">${escapeHtml(job.companyName)} · <span class="job-loc">${escapeHtml(job.location || "Location unlisted")}</span></div>
    </div>
    <div class="job-score ${badgeClass}">${score}%</div>
  </div>
  <div class="job-card-body">
    <div class="job-tags">
      ${remoteTag}
      ${countryWarning}
      <span class="tag tag-ats">${escapeHtml(job.ats)}</span>
    </div>
    <p class="job-why"><strong>Fit:</strong> ${escapeHtml(why)}</p>
  </div>
  <div class="job-card-actions">
    <button class="btn btn-sm btn-primary btn-open-fill" data-url="${escapeHtml(job.url)}" data-title="${escapeHtml(job.title)}" data-company="${escapeHtml(job.companyName)}">
      Open &amp; Fill
    </button>
    <button class="btn btn-sm btn-secondary btn-save-tracker" data-job-id="${escapeHtml(job.id)}">
      Save
    </button>
  </div>
</div>`.trim();
}

function escapeHtml(str?: string): string {
  return (str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

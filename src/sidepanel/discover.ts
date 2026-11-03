import type { Profile } from "../shared/types";
import type { CompanyListing, JobFilterOptions, JobMatchResult, JobPosting } from "../shared/jobs/types";
import { rankJobs } from "../shared/jobs/matching";
import { fetchATSFeed } from "../shared/jobs/feeds";
import { defaultLimiter } from "../shared/jobs/rate-limiter";
import type { SupportedATS } from "../shared/jobs/types";
import { currentLicense, isPro } from "../shared/license";
import { loadProfile } from "../shared/storage";
import { saveJobFromTab } from "./tracker";

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

// --- Panel wiring -------------------------------------------------------------------------------------------------

/** The only hosts Discover may call: each ATS's public job-board API. Asked for at first use (optional permission). */
export const FEED_ORIGINS: Record<SupportedATS, string> = {
  greenhouse: "https://boards-api.greenhouse.io/*",
  lever: "https://api.lever.co/*",
  ashby: "https://api.ashbyhq.com/*",
  smartrecruiters: "https://api.smartrecruiters.com/*",
  recruitee: "https://*.recruitee.com/*",
  personio: "https://*.jobs.personio.de/*",
  workable: "https://apply.workable.com/*",
};

/** Companies checked per click: with one request every 2 s per host this stays polite and quick. */
export const MAX_COMPANIES_PER_RUN = 12;

interface ListedCompany extends CompanyListing { unverified?: boolean }

/** Companies whose feed was verified first, then the user's own country first. */
export function pickCompanies(all: ListedCompany[], country: string, max = MAX_COMPANIES_PER_RUN): ListedCompany[] {
  const c = country.trim().toLowerCase();
  const rank = (x: ListedCompany): number => (x.unverified ? 2 : 0) + (c && x.country.toLowerCase() === c ? 0 : 1);
  return [...all].filter((x) => x.ats in FEED_ORIGINS).sort((a, b) => rank(a) - rank(b)).slice(0, max);
}

interface DailyCount { day: string; count: number }

export function initDiscover(ui: { toast: (text: string, tone?: "ok" | "warn" | "bad" | "") => void }): void {
  const run = document.getElementById("discover-run") as HTMLButtonElement | null;
  const status = document.getElementById("discover-status");
  const list = document.getElementById("discover-list");
  if (!run || !status || !list) return;
  run.addEventListener("click", async () => {
    // Ask first, inside the click: Chrome only shows the permission prompt during the user's gesture.
    const granted = await chrome.permissions.request({ origins: Object.values(FEED_ORIGINS) }).catch(() => false);
    if (!granted) {
      status.textContent = "Discover needs permission to read companies' public job boards. Nothing about you is sent.";
      return;
    }
    run.disabled = true;
    try {
      const [profile, license, companies, stored] = await Promise.all([
        loadProfile(),
        currentLicense(),
        fetch(chrome.runtime.getURL("companies.json")).then((r) => r.json() as Promise<ListedCompany[]>),
        chrome.storage.local.get("discoverDaily"),
      ]);
      const today = getTodayKey();
      const daily = (stored.discoverDaily as DailyCount | undefined)?.day === today ? (stored.discoverDaily as DailyCount).count : 0;
      const pro = isPro(license);
      if (!canViewMoreMatches(daily, pro)) {
        status.textContent = `You have seen today's ${FREE_DAILY_MATCH_LIMIT} free matches. Pro shows every match.`;
        return;
      }
      const picked = pickCompanies(companies, profile.country ?? "");
      const jobs: JobPosting[] = [];
      let failed = 0;
      for (const [i, co] of picked.entries()) {
        status.textContent = `Checking ${co.name}'s job board (${i + 1} of ${picked.length})…`;
        try {
          jobs.push(...(await fetchATSFeed(co.ats, co.slug, co.name, (u) => fetch(u, { credentials: "omit" }), defaultLimiter)));
        } catch {
          failed++;
        }
      }
      const { results, reachedLimit } = discoverJobs(jobs, profile, {}, pro, daily);
      await chrome.storage.local.set({ discoverDaily: { day: today, count: daily + results.length } satisfies DailyCount });
      list.replaceChildren(...results.map(buildJobCard));
      status.textContent = `${results.length} matches from ${picked.length - failed} job boards${failed ? ` (${failed} did not answer)` : ""}.`
        + (reachedLimit ? ` Free plan: ${FREE_DAILY_MATCH_LIMIT} matches a day; Pro shows all.` : "");
      list.querySelectorAll<HTMLButtonElement>(".btn-open-fill").forEach((b) => {
        b.addEventListener("click", () => { if (b.dataset.url) void chrome.tabs.create({ url: b.dataset.url }); });
      });
      list.querySelectorAll<HTMLButtonElement>(".btn-save-tracker").forEach((b) => {
        const open = b.parentElement?.querySelector<HTMLButtonElement>(".btn-open-fill");
        b.addEventListener("click", async () => {
          const r = await saveJobFromTab({ url: open?.dataset.url, title: `${open?.dataset.title ?? ""} - ${open?.dataset.company ?? ""}` });
          ui.toast(r === "saved" ? "Saved to the tracker" : r === "exists" ? "Already in the tracker" : "Could not save this job");
        });
      });
    } catch {
      status.textContent = "Could not load jobs right now. Try again later.";
    } finally {
      run.disabled = false;
    }
  });
}

/** Builds an element with text children only (never parses HTML). */
function h(tag: string, attrs: Record<string, string> = {}, ...children: Array<Node | string>): HTMLElement {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  for (const c of children) node.append(c);
  return node;
}

/** A job card as DOM nodes, same structure and classes as renderJobCard. */
export function buildJobCard(match: JobMatchResult): HTMLElement {
  const { job, score, why, isEligibleWorkCountry } = match;
  const badge = score >= 75 ? "badge-high" : score >= 50 ? "badge-mid" : "badge-low";
  const tags = h("div", { class: "job-tags" });
  if (job.isRemote) tags.append(h("span", { class: "tag tag-remote" }, "Remote"));
  if (!isEligibleWorkCountry) tags.append(h("span", { class: "tag tag-warning", title: "Country not listed in your work authorization" }, "Visa Needed"));
  tags.append(h("span", { class: "tag tag-ats" }, job.ats));
  return h("div", { class: "job-card", "data-job-id": job.id },
    h("div", { class: "job-card-header" },
      h("div", {},
        h("h4", { class: "job-title" }, job.title),
        h("div", { class: "job-company" }, `${job.companyName} · `, h("span", { class: "job-loc" }, job.location || "Location unlisted"))),
      h("div", { class: `job-score ${badge}` }, `${score}%`)),
    h("div", { class: "job-card-body" }, tags, h("p", { class: "job-why" }, h("strong", {}, "Fit: "), why)),
    h("div", { class: "job-card-actions" },
      h("button", { class: "btn btn-sm btn-primary btn-open-fill", type: "button", "data-url": job.url ?? "", "data-title": job.title, "data-company": job.companyName }, "Open & Fill"),
      h("button", { class: "btn btn-sm btn-secondary btn-save-tracker", type: "button", "data-job-id": job.id }, "Save")));
}

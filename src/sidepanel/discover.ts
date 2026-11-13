/** Discover: jobs from companies' own public job boards, matched to the user's profile on this computer.
 *
 * Privacy: the only requests are plain GETs of public job boards (and, when the user adds a company, that company's
 * careers page once, after checking its robots.txt). No cookies, nothing about the user in any request. Matching,
 * choosing companies and every score are worked out here, in the browser. */

import type { Profile } from "../shared/types";
import type { JobFilterOptions, JobMatchResult, JobPosting, SupportedATS } from "../shared/jobs/types";
import { matchJob, postedDaysAgo, rankJobs, searchProfile, type SearchProfile } from "../shared/jobs/matching";
import { fetchATSFeed } from "../shared/jobs/feeds";
import { defaultLimiter } from "../shared/jobs/rate-limiter";
import {
  boardsIn, companyReason, MAX_MY_COMPANIES, MY_COMPANIES_KEY, rankCompanies, readCareersLink, robotsAllows, sameBoard,
  type BoardRef, type ListedCompany, type MyCompany,
} from "../shared/jobs/companies";
import { currentLicense, isPro } from "../shared/license";
import { loadProfile } from "../shared/storage";
import { isHandsOff, platformFor } from "../shared/platforms";
import { saveJobFromTab } from "./tracker";
import { ALERTS_KEY, alertStateOf, type AlertState } from "../shared/jobs/alerts";
import { jobLevel, NO_FILTERS, passesFilters, type DiscoverFilters } from "../shared/jobs/job-filters";

export const FREE_DAILY_MATCH_LIMIT = 20;

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
  if (isPro) return { results: ranked, reachedLimit: false };
  const remaining = Math.max(0, FREE_DAILY_MATCH_LIMIT - currentDailyCount);
  return { results: ranked.slice(0, remaining), reachedLimit: ranked.length > remaining };
}

function escapeHtml(str?: string): string {
  return (str ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

const badgeFor = (score: number): string => (score >= 75 ? "badge-high" : score >= 50 ? "badge-mid" : "badge-low");

/** The small labels on a card: remote, new, level, visa. */
function cardTags(match: JobMatchResult, now = Date.now()): Array<{ cls: string; text: string; title?: string }> {
  const { job } = match;
  const tags: Array<{ cls: string; text: string; title?: string }> = [];
  if (job.isRemote) tags.push({ cls: "tag-remote", text: "Remote" });
  const days = postedDaysAgo(job, now);
  if (days !== undefined && days <= 3) tags.push({ cls: "tag-new", text: days === 0 ? "New today" : `New · ${days}d` });
  const level = jobLevel(job);
  if (level === "internship") tags.push({ cls: "tag-level", text: "Internship" });
  else if (level === "entry") tags.push({ cls: "tag-level", text: "Entry level" });
  if (!match.isEligibleWorkCountry) tags.push({ cls: "tag-warning", text: "Visa needed", title: "Not in a country you listed as able to work in (Answers → Work authorization)" });
  if (job.salary?.min && job.salary.currency) {
    const fmt = (n: number) => n.toLocaleString("en", { notation: "compact", maximumFractionDigits: 1 });
    tags.push({ cls: "tag-salary", text: `${job.salary.currency} ${fmt(job.salary.min)}${job.salary.max ? `–${fmt(job.salary.max)}` : "+"}` });
  }
  return tags;
}

/** Create HTML card for a matched job (text only, every value escaped). */
export function renderJobCard(match: JobMatchResult): string {
  const { job, score, why } = match;
  const tags = cardTags(match).map((t) => `<span class="tag ${t.cls}"${t.title ? ` title="${escapeHtml(t.title)}"` : ""}>${escapeHtml(t.text)}</span>`).join("");
  return `
<div class="job-card" data-job-id="${escapeHtml(job.id)}">
  <div class="job-card-header">
    <div>
      <h4 class="job-title">${escapeHtml(job.title)}</h4>
      <div class="job-company">${escapeHtml(job.companyName)} · <span class="job-loc">${escapeHtml(job.location || "Location unlisted")}</span></div>
    </div>
    <div class="job-score ${badgeFor(score)}">${score}%</div>
  </div>
  <div class="job-card-body">
    <div class="job-tags">${tags}<span class="tag tag-ats">${escapeHtml(job.ats)}</span></div>
    <p class="job-why"><strong>Fit:</strong> ${escapeHtml(why)}</p>
  </div>
  <div class="job-card-actions">
    <button class="btn btn-sm btn-primary btn-open-fill" data-url="${escapeHtml(job.url)}" data-title="${escapeHtml(job.title)}" data-company="${escapeHtml(job.companyName)}">Open &amp; Fill</button>
    <button class="btn btn-sm btn-secondary btn-save-tracker" data-job-id="${escapeHtml(job.id)}">Save</button>
  </div>
</div>`.trim();
}

/** Builds an element with text children only (never parses HTML). */
function h(tag: string, attrs: Record<string, string> = {}, ...children: Array<Node | string>): HTMLElement {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  for (const c of children) node.append(c);
  return node;
}

/** A job card as DOM nodes: the score, why, and a "Why 82%?" breakdown of every point. */
export function buildJobCard(match: JobMatchResult): HTMLElement {
  const { job, score, why } = match;
  const tags = h("div", { class: "job-tags" });
  for (const t of cardTags(match)) tags.append(h("span", { class: `tag ${t.cls}`, ...(t.title ? { title: t.title } : {}) }, t.text));
  tags.append(h("span", { class: "tag tag-ats" }, job.ats));
  const rows = h("ul", { class: "match-parts" });
  for (const p of match.parts) {
    const bar = h("span", { class: "match-bar", "aria-hidden": "true" }, h("span", { style: `width:${Math.round((100 * p.points) / Math.max(1, p.max))}%` }));
    rows.append(h("li", {}, h("span", { class: "match-label" }, p.label), h("span", { class: "match-points" }, `${p.points}/${p.max}`), bar, h("span", { class: "match-text" }, p.text)));
  }
  if (match.missingSkills.length) {
    rows.append(h("li", { class: "match-missing" }, h("span", { class: "match-text" },
      `The job also names: ${match.missingSkills.join(", ")}. If you have them, add them in Profile → Skills.`)));
  }
  const breakdown = h("details", { class: "match-breakdown" }, h("summary", {}, `Why ${score}%?`), rows);
  return h("div", { class: "job-card", "data-job-id": job.id },
    h("div", { class: "job-card-header" },
      h("div", {},
        h("h4", { class: "job-title" }, job.title),
        h("div", { class: "job-company" }, `${job.companyName} · `, h("span", { class: "job-loc" }, job.location || "Location unlisted"))),
      h("div", { class: `job-score ${badgeFor(score)}`, title: "How well this job matches your profile" }, `${score}%`)),
    h("div", { class: "job-card-body" }, tags, h("p", { class: "job-why" }, h("strong", {}, "Fit: "), why), breakdown),
    h("div", { class: "job-card-actions" },
      h("button", { class: "btn btn-sm btn-primary btn-open-fill", type: "button", "data-url": job.url ?? "", "data-title": job.title, "data-company": job.companyName }, "Open & Fill"),
      h("button", { class: "btn btn-sm btn-secondary btn-save-tracker", type: "button", "data-job-id": job.id }, "Save")));
}

// --- what Discover is matching on --------------------------------------------------------------------------------

const ROLE_SOURCE: Record<SearchProfile["rolesFrom"], string> = {
  target: "your Target roles",
  title: "your current job title. Set Target roles in Profile to choose exactly",
  history: "your work history. Set Target roles in Profile to choose exactly",
  education: "a guess from your field of study. Set Target roles in Profile to choose exactly",
  none: "",
};

/** One plain line per thing Discover uses, so the user sees exactly what the matches are based on. */
export function describeSearch(sp: SearchProfile): Array<{ label: string; value: string; missing?: boolean }> {
  const lines: Array<{ label: string; value: string; missing?: boolean }> = [];
  lines.push(sp.roles.length
    ? { label: "Roles", value: `${sp.roles.join(", ")} (from ${ROLE_SOURCE[sp.rolesFrom]})` }
    : { label: "Roles", value: "Not set. Add Target roles in Profile, or import your resume", missing: true });
  lines.push(sp.years === undefined
    ? { label: "Experience", value: "Not set. Add your years of experience in Profile", missing: true }
    : { label: "Experience", value: sp.student && sp.years === 0 ? "Still studying: internships and fresher roles" : `${sp.years} year${sp.years === 1 ? "" : "s"}` });
  const where = [...sp.placeNames, ...(sp.wantsRemote ? ["Remote"] : [])];
  const may = sp.workCountries.length ? ` · can work in ${sp.workCountries.join(", ")}` : "";
  lines.push(sp.placeNames.length
    ? { label: "Where", value: `${where.join(", ")}${may}` }
    : { label: "Where", value: `${sp.wantsRemote ? "Remote, or any city" : "Any city"}${may}. Add your city or Preferred locations in Profile`, missing: true });
  lines.push(sp.skills.length
    ? { label: "Skills", value: `${sp.skills.slice(0, 6).join(", ")}${sp.skills.length > 6 ? ` +${sp.skills.length - 6} more` : ""}` }
    : { label: "Skills", value: "None yet. Add skills in Profile to see which jobs use them", missing: true });
  return lines;
}

// --- panel wiring -------------------------------------------------------------------------------------------------

/** The only hosts Discover may call: each ATS's public job-board API. Asked for at first use (optional permission). */
export { FEED_ORIGINS } from "../shared/jobs/feeds";
import { FEED_ORIGINS } from "../shared/jobs/feeds";

/** Companies checked per click. Their boards are on different hosts, each asked at most once every 2 s. */
export const COMPANIES_PER_RUN = 24;
/** Results shown at first; "Show more" adds this many. */
const PAGE = 40;
const FILTERS_KEY = "applyagent.discoverFilters";
const LAST_KEY = "discoverLast";

interface UiFilters extends DiscoverFilters { canWork: boolean; sort: "best" | "new" }

interface DailyCount { day: string; count: number }

interface SavedRun {
  at: string;
  jobs: JobPosting[];
  checked: string[];
  failed: number;
}

const boardKey = (b: BoardRef): string => `${b.ats}:${b.slug.toLowerCase()}`;
const omitCookies = (u: string) => fetch(u, { credentials: "omit" });

export async function loadMyCompanies(): Promise<MyCompany[]> {
  const v = (await chrome.storage.local.get(MY_COMPANIES_KEY))[MY_COMPANIES_KEY];
  return Array.isArray(v) ? (v as MyCompany[]).filter((c) => c && typeof c.slug === "string" && c.ats in FEED_ORIGINS) : [];
}

export function initDiscover(ui: { toast: (text: string, tone?: "ok" | "warn" | "bad" | "") => void; openProfile?: () => void }): void {
  const run = document.getElementById("discover-run") as HTMLButtonElement | null;
  const more = document.getElementById("discover-more") as HTMLButtonElement | null;
  const status = document.getElementById("discover-status");
  const list = document.getElementById("discover-list");
  const forBox = document.getElementById("discover-for");
  if (!run || !status || !list) return;

  const $in = <T extends HTMLElement>(id: string) => document.getElementById(id) as T | null;
  const readFilters = (): UiFilters => ({
    ...NO_FILTERS,
    experience: (($in<HTMLSelectElement>("discover-experience")?.value ?? "") as DiscoverFilters["experience"]),
    type: (($in<HTMLSelectElement>("discover-type")?.value ?? "") as DiscoverFilters["type"]),
    remoteOnly: $in<HTMLInputElement>("discover-remote")?.checked ?? false,
    canWork: $in<HTMLInputElement>("discover-canwork")?.checked ?? true,
    sort: ($in<HTMLSelectElement>("discover-sort")?.value === "new" ? "new" : "best"),
  });
  try {
    const saved = JSON.parse(localStorage.getItem(FILTERS_KEY) ?? "null") as Partial<UiFilters> | null;
    if (saved) {
      const set = (id: string, v: unknown) => { const el = $in<HTMLSelectElement>(id); if (el && typeof v === "string") el.value = v; };
      set("discover-experience", saved.experience);
      set("discover-type", saved.type);
      set("discover-sort", saved.sort);
      const remote = $in<HTMLInputElement>("discover-remote");
      if (remote) remote.checked = saved.remoteOnly === true;
      const canWork = $in<HTMLInputElement>("discover-canwork");
      if (canWork) canWork.checked = saved.canWork !== false;
    }
  } catch { /* no saved filters */ }

  let profile: Profile | undefined;
  let sp: SearchProfile | undefined;
  let pro = true;
  let daily = 0;
  let directory: ListedCompany[] | undefined;
  let queue: ListedCompany[] = [];
  let next = 0;
  const jobs = new Map<string, JobPosting>();
  const checked = new Set<string>();
  let failed = 0;
  let shownLimit = PAGE;
  let busy = false;
  let savedAt: string | undefined;
  let profileChanged = false;
  /** Scores, worked out once per job (and again only when the profile changes). */
  const cache = new Map<string, JobMatchResult>();
  const scored = (j: JobPosting): JobMatchResult => {
    let r = cache.get(j.id);
    if (!r) {
      r = matchJob(j, profile!, sp);
      cache.set(j.id, r);
    }
    return r;
  };

  const renderFor = (): void => {
    if (!forBox || !sp) return;
    const rows = describeSearch(sp).map((l) => h("li", { class: l.missing ? "missing" : "" }, h("strong", {}, `${l.label}: `), l.value));
    const edit = h("button", { class: "btn btn-ghost btn-sm", type: "button", id: "discover-edit-profile" }, "Change in Profile");
    edit.addEventListener("click", () => ui.openProfile?.());
    forBox.replaceChildren(h("p", { class: "discover-for-title" }, "Matching jobs to:"), h("ul", {}, ...rows), edit);
  };

  const loadContext = async (): Promise<void> => {
    profile = await loadProfile();
    sp = searchProfile(profile);
    cache.clear();
    renderFor();
  };

  const results = (): { shown: JobMatchResult[]; all: number; hidden: number; reachedLimit: boolean } => {
    if (!profile || !sp) return { shown: [], all: 0, hidden: 0, reachedLimit: false };
    const f = readFilters();
    const all = [...jobs.values()];
    const kept = all.filter((j) => passesFilters(j, f));
    let ranked = kept.map(scored).filter((r) => !r.excluded);
    const hiddenByPlace = f.canWork ? ranked.filter((r) => !r.isEligibleWorkCountry).length : 0;
    if (f.canWork) ranked = ranked.filter((r) => r.isEligibleWorkCountry);
    const now = Date.now();
    ranked.sort(f.sort === "new"
      ? (a, b) => (postedDaysAgo(a.job, now) ?? 999) - (postedDaysAgo(b.job, now) ?? 999) || b.score - a.score
      : (a, b) => b.score - a.score || (postedDaysAgo(a.job, now) ?? 999) - (postedDaysAgo(b.job, now) ?? 999));
    let reachedLimit = false;
    if (!pro) {
      const remaining = Math.max(0, FREE_DAILY_MATCH_LIMIT - daily);
      reachedLimit = ranked.length > remaining;
      ranked = ranked.slice(0, remaining);
    }
    return { shown: ranked, all: all.length, hidden: all.length - kept.length + hiddenByPlace, reachedLimit };
  };

  let renderTimer: ReturnType<typeof setTimeout> | undefined;
  const render = (immediate = false): void => {
    if (!immediate) {
      renderTimer ??= setTimeout(() => { renderTimer = undefined; render(true); }, 300);
      return;
    }
    const { shown, all, hidden, reachedLimit } = results();
    const cards = shown.slice(0, shownLimit).map(buildJobCard);
    if (shown.length > shownLimit) {
      const showMore = h("button", { class: "btn btn-secondary btn-sm", type: "button", id: "discover-show-more" }, `Show ${Math.min(PAGE, shown.length - shownLimit)} more`);
      showMore.addEventListener("click", () => { shownLimit += PAGE; render(true); });
      cards.push(showMore);
    }
    list.replaceChildren(...cards);
    if (busy) return; // the progress line stays until the run ends
    const boards = checked.size;
    if (!boards && !all) {
      status.textContent = `Press Find matching jobs: ApplyAgent reads about ${COMPANIES_PER_RUN} companies' job boards, chosen for you (about a minute), and shows the best matches as they come in.`;
      return;
    }
    const counts: Record<string, number> = {};
    if (profile) {
      for (const j of jobs.values()) {
        const why = scored(j).excluded;
        if (why) {
          const key = why.startsWith("different field") ? "different field" : why;
          counts[key] = (counts[key] ?? 0) + 1;
        }
      }
    }
    const left = Object.entries(counts).map(([why, n]) => `${n} ${why === "different field" ? "in other fields" : why === "needs more experience" ? "needing more experience" : why}`);
    if (hidden) left.push(`${hidden} hidden by your filters`);
    const when = savedAt ? ` Checked ${timeAgo(savedAt)}.` : "";
    status.textContent = `${shown.length} ${shown.length === 1 ? "match" : "matches"} from ${boards} ${boards === 1 ? "company" : "companies"}${failed ? ` (${failed} did not answer)` : ""}.`
      + (left.length ? ` Not shown: ${left.join(", ")}.` : "")
      + when
      + (profileChanged ? " Your profile changed: scores are updated; press Find matching jobs again to look for new roles too." : "")
      + (reachedLimit ? ` Free plan: ${FREE_DAILY_MATCH_LIMIT} matches a day; Pro shows all.` : "")
      + (!shown.length && all ? " Try other filters, or widen Target roles in Profile." : "");
    if (more) {
      more.hidden = next >= queue.length || !queue.length;
      more.textContent = `Check ${Math.min(COMPANIES_PER_RUN, queue.length - next)} more companies`;
    }
  };

  const persist = async (): Promise<void> => {
    // The jobs that can be shown (best 400), with their descriptions, so reopening the panel shows the same scores.
    const slim = [...jobs.values()]
      .map((j) => ({ j, r: profile ? scored(j) : undefined }))
      .filter((x) => !x.r?.excluded)
      .sort((a, b) => (b.r?.score ?? 0) - (a.r?.score ?? 0))
      .slice(0, 400)
      .map((x) => x.j);
    savedAt = new Date().toISOString();
    const saved: SavedRun = { at: savedAt, jobs: slim, checked: [...checked], failed };
    await chrome.storage.local.set({ [LAST_KEY]: saved }).catch(() => undefined);
  };

  // Daily alerts: a switch, and the new matches the daily check found (the number on the icon).
  const alertSwitch = $in<HTMLInputElement>("discover-alerts");
  const freshBox = $in<HTMLDivElement>("discover-fresh");
  const showFresh = (state: AlertState): void => {
    if (alertSwitch) alertSwitch.checked = state.on;
    if (!freshBox) return;
    freshBox.replaceChildren();
    freshBox.hidden = !state.on;
    if (!state.on) return;
    if (!state.fresh.length) {
      const note = document.createElement("p");
      note.className = "hint";
      note.textContent = state.lastRun
        ? `Last checked ${new Date(state.lastRun).toLocaleString()}: no new matches since then.`
        : "The first check runs in about a minute. From then on, new matches are counted on the ApplyAgent icon.";
      freshBox.append(note);
      return;
    }
    const head = document.createElement("p");
    head.className = "hint";
    head.textContent = `${state.fresh.length} new matching job${state.fresh.length === 1 ? "" : "s"} since you last looked:`;
    const ul = document.createElement("ul");
    ul.className = "fresh-list";
    for (const j of state.fresh) {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = j.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = `${j.title} · ${j.company}`;
      const meta = document.createElement("span");
      meta.className = "muted";
      meta.textContent = ` ${j.location ? `${j.location} · ` : ""}match ${j.score}`;
      li.append(a, meta);
      ul.append(li);
    }
    const clear = document.createElement("button");
    clear.type = "button";
    clear.className = "btn btn-ghost btn-sm";
    clear.textContent = "Mark as seen";
    clear.addEventListener("click", async () => {
      const now = alertStateOf((await chrome.storage.local.get(ALERTS_KEY))[ALERTS_KEY]);
      await chrome.storage.local.set({ [ALERTS_KEY]: { ...now, fresh: [] } });
    });
    freshBox.append(head, ul, clear);
  };
  void chrome.storage.local.get(ALERTS_KEY).then((v) => showFresh(alertStateOf(v[ALERTS_KEY]))).catch(() => undefined);
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes[ALERTS_KEY]) showFresh(alertStateOf(changes[ALERTS_KEY].newValue));
  });
  alertSwitch?.addEventListener("change", async () => {
    const on = alertSwitch.checked;
    // Ask inside the click (Chrome shows the prompt only during the user's gesture): the same boards as Discover.
    if (on && !(await chrome.permissions.request({ origins: Object.values(FEED_ORIGINS) }).catch(() => false))) {
      alertSwitch.checked = false;
      status.textContent = "Daily checks need permission to read companies' public job boards. Nothing about you is sent.";
      return;
    }
    const now = alertStateOf((await chrome.storage.local.get(ALERTS_KEY))[ALERTS_KEY]);
    await chrome.storage.local.set({ [ALERTS_KEY]: on ? { ...now, on: true } : { ...now, on: false, fresh: [] } });
    ui.toast(on ? "Daily job check is on" : "Daily job check is off", "ok");
  });

  const checkBatch = async (fresh: boolean): Promise<void> => {
    if (busy) return;
    // Ask first, inside the click: Chrome only shows the permission prompt during the user's gesture.
    const granted = await chrome.permissions.request({ origins: Object.values(FEED_ORIGINS) }).catch(() => false);
    if (!granted) {
      status.textContent = "Discover needs permission to read companies' public job boards. Nothing about you is sent.";
      return;
    }
    busy = true;
    run.disabled = true;
    if (more) more.disabled = true;
    try {
      const [, license, stored, mine] = await Promise.all([
        loadContext(),
        currentLicense(),
        chrome.storage.local.get("discoverDaily"),
        loadMyCompanies(),
      ]);
      directory ??= await fetch(chrome.runtime.getURL("companies.json")).then((r) => r.json() as Promise<ListedCompany[]>);
      pro = isPro(license);
      const today = getTodayKey();
      daily = (stored.discoverDaily as DailyCount | undefined)?.day === today ? (stored.discoverDaily as DailyCount).count : 0;
      if (!canViewMoreMatches(daily, pro)) {
        status.textContent = `You have seen today's ${FREE_DAILY_MATCH_LIMIT} free matches. Pro shows every match.`;
        return;
      }
      if (fresh) {
        jobs.clear();
        checked.clear();
        failed = 0;
        next = 0;
        shownLimit = PAGE;
        profileChanged = false;
        queue = rankCompanies((directory ?? []).filter((c) => c.ats in FEED_ORIGINS), mine, sp!);
      }
      const batch = queue.slice(next, next + COMPANIES_PER_RUN + (next === 0 ? mine.length : 0));
      next += batch.length;
      let done = 0;
      const progress = () => {
        status.textContent = `Checking companies' job boards: ${done} of ${batch.length} done, ${jobs.size} jobs read so far…`;
      };
      progress();
      // All at once: the rate limiter spaces requests to the same host 2 s apart, and different hosts run side by side.
      await Promise.all(batch.map(async (co) => {
        try {
          const found = await fetchATSFeed(co.ats, co.slug, co.name, omitCookies, defaultLimiter);
          for (const j of found) jobs.set(j.id, j);
          checked.add(boardKey(co));
        } catch {
          failed++;
          checked.add(boardKey(co));
        }
        done++;
        progress();
        render();
      }));
      const shown = results().shown.length;
      await chrome.storage.local.set({ discoverDaily: { day: today, count: daily + shown } satisfies DailyCount });
      await persist();
    } catch {
      status.textContent = "Could not load jobs right now. Check your internet connection and try again.";
    } finally {
      busy = false;
      run.disabled = false;
      run.textContent = "Find matching jobs again";
      if (more) more.disabled = false;
      render(true);
    }
  };

  run.addEventListener("click", () => void checkBatch(true));
  more?.addEventListener("click", () => void checkBatch(false));

  for (const id of ["discover-experience", "discover-type", "discover-remote", "discover-canwork", "discover-sort"]) {
    $in(id)?.addEventListener("change", () => {
      try { localStorage.setItem(FILTERS_KEY, JSON.stringify(readFilters())); } catch { /* storage unavailable */ }
      shownLimit = PAGE;
      render(true);
    });
  }

  list.addEventListener("click", async (e) => {
    const button = (e.target as HTMLElement).closest<HTMLButtonElement>("button");
    if (!button) return;
    if (button.classList.contains("btn-open-fill") && button.dataset.url) {
      void chrome.tabs.create({ url: button.dataset.url });
    } else if (button.classList.contains("btn-save-tracker")) {
      const open = button.parentElement?.querySelector<HTMLButtonElement>(".btn-open-fill");
      const r = await saveJobFromTab({ url: open?.dataset.url, title: `${open?.dataset.title ?? ""} - ${open?.dataset.company ?? ""}` });
      ui.toast(r === "saved" ? "Saved to the tracker" : r === "exists" ? "Already in the tracker" : "Could not save this job");
    }
  });

  // The profile changes while the panel is open: the "Matching jobs to" box follows; scores follow on the next run.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes.profile) {
      void loadContext().then(() => {
        if (jobs.size) { profileChanged = true; render(true); }
      });
    }
    if (changes[MY_COMPANIES_KEY]) void renderMyCompanies();
  });

  // --- the user's own companies -----------------------------------------------------------------------------
  const companyInput = $in<HTMLInputElement>("company-url");
  const companyAdd = $in<HTMLButtonElement>("company-add");
  const companyStatus = $in("company-status");
  const companyList = $in("company-list");

  const renderMyCompanies = async (): Promise<void> => {
    if (!companyList) return;
    const mine = await loadMyCompanies();
    const count = $in("company-count");
    if (count) count.textContent = mine.length ? `${mine.length} added` : "";
    companyList.replaceChildren(...mine.map((c) => {
      const remove = h("button", { class: "btn btn-ghost btn-sm", type: "button", "aria-label": `Remove ${c.name}` }, "Remove");
      remove.addEventListener("click", async () => {
        const left = (await loadMyCompanies()).filter((x) => !sameBoard(x, c));
        await chrome.storage.local.set({ [MY_COMPANIES_KEY]: left });
        ui.toast(`Removed ${c.name}`);
      });
      const jobsText = c.jobCount === undefined ? "" : c.jobCount === 0 ? " · no open jobs right now" : ` · ${c.jobCount} open job${c.jobCount === 1 ? "" : "s"}`;
      return h("li", { class: "company-item" }, h("span", {}, h("strong", {}, c.name), h("span", { class: "muted" }, ` (${c.ats})${jobsText}`)), remove);
    }));
  };

  const say = (text: string, tone: "" | "ok" | "warn" | "bad" = ""): void => {
    if (!companyStatus) return;
    companyStatus.textContent = text;
    companyStatus.className = `hint field-note ${tone === "bad" ? "bad" : tone === "warn" ? "warn" : ""}`.trim();
  };

  const addCompany = async (): Promise<void> => {
    if (!companyInput || !companyAdd) return;
    const raw = companyInput.value;
    const reading = readCareersLink(raw);
    if (reading.kind === "invalid") return say(reading.message, "bad");
    if (reading.kind === "workday") {
      return say("This company uses Workday, whose job lists Discover can't read yet. You can still open its jobs and ApplyAgent fills the application.", "warn");
    }
    const pageUrl = reading.kind === "page" ? reading.url : undefined;
    if (pageUrl && (isHandsOff(pageUrl.href) || defaultLimiter.isHandsOff(pageUrl.hostname))) {
      return say(`${platformFor(pageUrl.href).name || pageUrl.hostname} is a job site, not a company's own careers page. Paste the company's careers page instead.`, "bad");
    }
    // Permission first, while the click still counts as the user's own action.
    const origins = [...Object.values(FEED_ORIGINS), ...(pageUrl ? [`${pageUrl.origin}/*`] : [])];
    const granted = await chrome.permissions.request({ origins }).catch(() => false);
    if (!granted) return say("ApplyAgent needs your permission to read that page once. Nothing about you is sent.", "warn");
    companyAdd.disabled = true;
    try {
      let board: BoardRef | undefined = reading.kind === "board" ? reading.board : undefined;
      if (pageUrl) {
        say(`Looking for the job board on ${pageUrl.hostname}…`);
        const robots = await (async () => {
          try {
            await defaultLimiter.acquire(`${pageUrl.origin}/robots.txt`);
            const r = await fetch(`${pageUrl.origin}/robots.txt`, { credentials: "omit" });
            return r.ok ? await r.text() : "";
          } catch { return ""; }
        })();
        if (!robotsAllows(robots, pageUrl.pathname)) {
          return say("This site asks tools not to read that page, so ApplyAgent won't. Open the page, click its \"open positions\" link, and paste that link here.", "warn");
        }
        await defaultLimiter.acquire(pageUrl.href);
        const res = await fetch(pageUrl.href, { credentials: "omit", redirect: "follow" });
        const html = res.ok ? (await res.text()).slice(0, 3_000_000) : "";
        board = boardsIn(res.url)[0] ?? boardsIn(html)[0];
        if (!board) {
          return say("No job board that Discover can read was found on that page. Open the page, click its \"open positions\" link, and paste that link here (for example jobs.lever.co/company).", "warn");
        }
      }
      if (!board) return;
      const mine = await loadMyCompanies();
      if (mine.some((c) => sameBoard(c, board!))) return say("That company is already in your list.", "ok");
      if (mine.length >= MAX_MY_COMPANIES) return say(`You can add up to ${MAX_MY_COMPANIES} companies. Remove one first.`, "warn");
      say("Reading its job board…");
      let found: JobPosting[];
      try {
        found = await fetchATSFeed(board.ats, board.slug, "", omitCookies, defaultLimiter);
      } catch {
        return say("That job board did not answer. Check the link and try again.", "bad");
      }
      const name = found[0]?.companyName ?? board.slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      const entry: MyCompany = { ats: board.ats, slug: board.slug, name, addedAt: new Date().toISOString(), source: raw.trim().slice(0, 500), jobCount: found.length };
      await chrome.storage.local.set({ [MY_COMPANIES_KEY]: [...(await loadMyCompanies()).filter((c) => !sameBoard(c, entry)), entry] });
      for (const j of found) jobs.set(j.id, j);
      checked.add(boardKey(board));
      companyInput.value = "";
      say(found.length
        ? `Added ${name}: ${found.length} open job${found.length === 1 ? "" : "s"}. It is checked first in every search.`
        : `Added ${name}. It has no open jobs right now; Discover checks it first in every search.`, "ok");
      if (profile || jobs.size) { await loadContext(); render(true); }
    } catch {
      say("Could not read that page right now. Check your internet connection and try again.", "bad");
    } finally {
      companyAdd.disabled = false;
    }
  };
  companyAdd?.addEventListener("click", () => void addCompany());
  companyInput?.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); void addCompany(); } });

  // --- start: show what Discover matches on, and the last results ---------------------------------------
  void (async () => {
    await loadContext();
    await renderMyCompanies();
    const last = (await chrome.storage.local.get(LAST_KEY))[LAST_KEY] as SavedRun | undefined;
    if (last && Array.isArray(last.jobs) && jobs.size === 0 && !busy) {
      for (const j of last.jobs) if (j && typeof j.id === "string" && typeof j.title === "string") jobs.set(j.id, j);
      for (const k of last.checked ?? []) checked.add(k);
      failed = last.failed ?? 0;
      savedAt = last.at;
      pro = isPro(await currentLicense());
      run.textContent = "Find matching jobs again";
    }
    if (!busy) render(true);
  })();
}

function timeAgo(iso: string): string {
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (!Number.isFinite(mins) || mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  return hours < 24 ? `${hours} h ago` : `${Math.round(hours / 24)} days ago`;
}

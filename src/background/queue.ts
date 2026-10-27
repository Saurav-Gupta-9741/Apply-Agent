/** Pure scheduling rules for the application queue (no Chrome APIs, so they are unit-tested). */

import type { ApplicationRecord, QueueItem, Settings } from "../shared/types";

export const DEFAULT_SETTINGS: Settings = { mode: "review", maxParallel: 3, perHostMax: 2, dailyCap: 25, cooldownDays: 30, detection: "job_sites", understanding: true };
export const MAX_PARALLEL = 5;

/** Statuses that occupy a browser tab the agent (or the user) is working in. */
const OPEN_STATUSES = new Set(["running", "needs_user", "ready"]);
/** At most this many tabs left open waiting for the user, so the browser does not fill up. */
export const MAX_OPEN_TABS = 10;

const ATS_HOSTS = /(^|\.)(greenhouse\.io|lever\.co|ashbyhq\.com|workable\.com|smartrecruiters\.com|recruitee\.com)$/;

export function clampSettings(s: Partial<Settings>): Settings {
  const merged = { ...DEFAULT_SETTINGS, ...s };
  return {
    mode: merged.mode === "auto" ? "auto" : "review",
    maxParallel: Math.min(Math.max(Math.round(merged.maxParallel), 1), MAX_PARALLEL),
    perHostMax: Math.min(Math.max(Math.round(merged.perHostMax), 1), 2),
    dailyCap: Math.min(Math.max(Math.round(merged.dailyCap), 1), 100),
    cooldownDays: Math.min(Math.max(Math.round(merged.cooldownDays), 0), 365),
    detection: merged.detection === "off" || merged.detection === "allowed_sites" ? merged.detection : "job_sites",
    understanding: merged.understanding !== false,
  };
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

/** The employer behind a URL: on shared job-board hosts it is the first path segment (boards.greenhouse.io/acme). */
export function companyKey(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    if (ATS_HOSTS.test(host)) {
      // Embedded Greenhouse forms name the company in ?for=acme.
      const segment = u.searchParams.get("for")
        ?? u.pathname.split("/").filter(Boolean).find((s) => s !== "embed" && s !== "job_app") ?? "";
      return `${host}/${segment.toLowerCase()}`;
    }
    return host;
  } catch {
    return "";
  }
}

/** Lever and Ashby show the description first; the form lives on a sub-page. Go straight to it. */
export function applicationUrl(url: string): string {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    if (/(^|\.)lever\.co$/.test(u.hostname) && parts.length === 2) u.pathname = `/${parts.join("/")}/apply`;
    if (/(^|\.)ashbyhq\.com$/.test(u.hostname) && parts.length === 2) u.pathname = `/${parts.join("/")}/application`;
    return u.toString();
  } catch {
    return url;
  }
}

export function isValidJobUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function submittedToday(applications: ApplicationRecord[], now: Date): number {
  return applications.filter((a) => a.status !== "in_progress" && sameDay(new Date(a.createdAt), now)).length;
}

export function recentlyApplied(url: string, applications: ApplicationRecord[], now: Date, cooldownDays: number): boolean {
  if (cooldownDays <= 0) return false;
  const key = companyKey(url);
  const cutoff = now.getTime() - cooldownDays * 86_400_000;
  return applications.some(
    (a) => a.status === "applied_confirmed" && companyKey(a.url) === key && new Date(a.createdAt).getTime() >= cutoff,
  );
}

export interface Plan {
  start: QueueItem[];
  skip: Array<{ item: QueueItem; note: string }>;
}

/** Which queued items to start now, and which to skip, given every limit. */
export function planNext(queue: QueueItem[], applications: ApplicationRecord[], settings: Settings, now: Date): Plan {
  const plan: Plan = { start: [], skip: [] };
  const running = queue.filter((q) => q.status === "running");
  const open = queue.filter((q) => OPEN_STATUSES.has(q.status)).length;
  const perHost = new Map<string, number>();
  for (const q of queue.filter((x) => OPEN_STATUSES.has(x.status))) perHost.set(hostOf(q.url), (perHost.get(hostOf(q.url)) ?? 0) + 1);
  const startedCompanies = new Set(queue.filter((q) => OPEN_STATUSES.has(q.status) || q.status === "applied").map((q) => companyKey(q.url)));

  let slots = Math.min(settings.maxParallel - running.length, MAX_OPEN_TABS - open);
  let budget = settings.dailyCap - submittedToday(applications, now) - running.length;

  for (const item of queue.filter((q) => q.status === "queued")) {
    if (slots <= 0 || budget <= 0) break;
    const key = companyKey(item.url);
    if (recentlyApplied(item.url, applications, now, settings.cooldownDays)) {
      plan.skip.push({ item, note: `Applied to this company in the last ${settings.cooldownDays} days` });
      continue;
    }
    if (startedCompanies.has(key)) {
      plan.skip.push({ item, note: "Another application to this company is already in this run" });
      continue;
    }
    const host = hostOf(item.url);
    if ((perHost.get(host) ?? 0) >= settings.perHostMax) continue; // wait for a slot on this site
    plan.start.push(item);
    perHost.set(host, (perHost.get(host) ?? 0) + 1);
    startedCompanies.add(key);
    slots--;
    budget--;
  }
  return plan;
}

export const LOST_TAB_AFTER_MS = 90_000;
export const STUCK_AFTER_MS = 120_000;

/** Repair items left "running" when Chrome stopped the background worker mid-application.
 * Never re-runs automatically where a submission may already have happened (no duplicate applications):
 *  - tab gone, and a submission was recorded for this job → "needs check"
 *  - tab gone, nothing submitted → back to the queue
 *  - tab still open but silent → "needs you" (the user looks at the form; nothing is resubmitted) */
export function reconcileQueue(
  queue: QueueItem[], liveTabIds: Set<number>, applications: ApplicationRecord[], now: number,
): QueueItem[] {
  return queue.map((q) => {
    if (q.status !== "running") return q;
    const age = now - Date.parse(q.updatedAt);
    const tabAlive = q.tabId !== undefined && liveTabIds.has(q.tabId);
    const stamp = new Date(now).toISOString();
    if (!tabAlive && age > LOST_TAB_AFTER_MS) {
      const target = applicationUrl(q.url);
      const submitted = applications.some(
        (a) => (a.url === q.url || a.url === target || a.url.startsWith(target)) && Date.parse(a.createdAt) >= Date.parse(q.addedAt),
      );
      return submitted
        ? { ...q, status: "needs_check", tabId: undefined, note: "Interrupted after submitting. Check the site or your email.", updatedAt: stamp }
        : { ...q, status: "queued", tabId: undefined, note: "Restarted after an interruption", updatedAt: stamp };
    }
    if (tabAlive && age > STUCK_AFTER_MS) {
      return { ...q, status: "needs_user", note: "Interrupted. Open the tab, check the form, then press Fill or Submit.", updatedAt: stamp };
    }
    return q;
  });
}

/** Parse pasted text or a CSV export (one URL per line, or a CSV with url/title/company columns). */
export function parseJobList(text: string): Array<Pick<QueueItem, "url" | "title" | "company">> {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return [];
  const header = splitCsv(lines[0]!).map((h) => h.toLowerCase());
  const urlCol = header.indexOf("url");
  const out: Array<Pick<QueueItem, "url" | "title" | "company">> = [];
  const seen = new Set<string>();
  const rows = urlCol >= 0 ? lines.slice(1) : lines;
  for (const line of rows) {
    const cells = urlCol >= 0 ? splitCsv(line) : [line];
    const url = (urlCol >= 0 ? cells[urlCol] : cells[0])?.trim() ?? "";
    if (!isValidJobUrl(url) || seen.has(url)) continue;
    seen.add(url);
    out.push({
      url,
      title: urlCol >= 0 ? cells[header.indexOf("title")] ?? "" : "",
      company: urlCol >= 0 ? cells[header.indexOf("company")] ?? "" : "",
    });
  }
  return out;
}

/** Minimal CSV splitting with quoted fields ("a, b" stays one cell). */
export function splitCsv(line: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      cells.push(cur);
      cur = "";
    } else cur += ch;
  }
  cells.push(cur);
  return cells.map((c) => c.trim());
}

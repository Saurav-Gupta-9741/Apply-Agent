/** Daily job alerts: once a day, the same check Discover makes when the user presses "Find matching jobs" (the
 * companies' public job boards, read without cookies, 2 s apart per site), and the good matches that were not there
 * last time. They are counted on the ApplyAgent icon and listed in Discover. Nothing about the user is sent anywhere:
 * the boards are read and the matching is done on this computer. Off until the user switches it on. */

import { rankCompanies, type ListedCompany, type MyCompany } from "./companies";
import { rankJobs, searchProfile } from "./matching";
import type { JobPosting } from "./types";
import type { Profile } from "../types";

export const ALERTS_KEY = "jobAlerts";
export const ALERT_ALARM = "job-alerts";
/** Boards read per daily check: the same number as one press of "Find matching jobs". */
export const ALERT_COMPANIES = 24;
/** Only good matches are worth a number on the icon. */
export const MIN_ALERT_SCORE = 60;
const MAX_SEEN = 3000;
const MAX_FRESH = 30;

export interface AlertJob { id: string; title: string; company: string; url: string; location: string; score: number; why: string }
export interface AlertState {
  on: boolean;
  /** When the last check ran (ISO); none before the first. */
  lastRun?: string;
  /** Jobs already seen (shown or not): never announced again. */
  seen: string[];
  /** New good matches since the user last looked. */
  fresh: AlertJob[];
}
export const EMPTY_ALERTS: AlertState = { on: false, seen: [], fresh: [] };

export function alertStateOf(raw: unknown): AlertState {
  const v = raw as Partial<AlertState> | undefined;
  if (!v || typeof v !== "object") return { ...EMPTY_ALERTS };
  return {
    on: v.on === true,
    lastRun: typeof v.lastRun === "string" ? v.lastRun : undefined,
    seen: Array.isArray(v.seen) ? v.seen.filter((x) => typeof x === "string").slice(-MAX_SEEN) : [],
    fresh: Array.isArray(v.fresh) ? v.fresh.filter((x) => x && typeof x.id === "string" && typeof x.url === "string").slice(0, MAX_FRESH) : [],
  };
}

/** One daily check. The first one only learns what is there today (a list of everything open would not be news). */
export async function checkNewMatches(
  profile: Profile,
  directory: ListedCompany[],
  mine: MyCompany[],
  readBoard: (company: { ats: ListedCompany["ats"]; slug: string; name: string }) => Promise<JobPosting[]>,
  state: AlertState,
  now = Date.now(),
): Promise<AlertState> {
  const queue = rankCompanies(directory, mine, searchProfile(profile)).slice(0, ALERT_COMPANIES + mine.length);
  const jobs = new Map<string, JobPosting>();
  await Promise.all(queue.map(async (co) => {
    try {
      for (const j of await readBoard(co)) jobs.set(j.id, j);
    } catch {
      // A board that does not answer today is read again tomorrow.
    }
  }));
  const good = rankJobs([...jobs.values()], profile, { minScore: MIN_ALERT_SCORE });
  const seen = new Set(state.seen);
  const isNew = good.filter((m) => !seen.has(m.job.id) && !!m.job.url);
  for (const m of good) seen.add(m.job.id);
  const found: AlertJob[] = isNew.map((m) => ({
    id: m.job.id, title: m.job.title, company: m.job.companyName, url: m.job.url!, location: m.job.location, score: m.score, why: m.why,
  }));
  const fresh = state.lastRun ? [...found, ...state.fresh.filter((f) => !found.some((x) => x.id === f.id))].slice(0, MAX_FRESH) : [];
  return { on: state.on, lastRun: new Date(now).toISOString(), seen: [...seen].slice(-MAX_SEEN), fresh };
}

/** What the icon shows: the number of new matches, or nothing. */
export const badgeText = (state: AlertState): string => (state.on && state.fresh.length ? String(Math.min(state.fresh.length, 99)) : "");

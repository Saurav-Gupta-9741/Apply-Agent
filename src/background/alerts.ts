/** The daily job-alert check (see src/shared/jobs/alerts.ts). Runs only when the user switched alerts on in Discover
 * and has given Discover its permission to read the job boards; otherwise it does nothing. */

import { ALERT_ALARM, ALERTS_KEY, alertStateOf, badgeText, checkNewMatches, type AlertState } from "../shared/jobs/alerts";
import { MY_COMPANIES_KEY, type ListedCompany, type MyCompany } from "../shared/jobs/companies";
import { FEED_ORIGINS, fetchATSFeed } from "../shared/jobs/feeds";
import { defaultLimiter } from "../shared/jobs/rate-limiter";
import { loadProfile } from "../shared/storage";

const omitCookies = (u: string) => fetch(u, { credentials: "omit" });

export async function showAlertBadge(state: AlertState): Promise<void> {
  const text = badgeText(state);
  await chrome.action.setBadgeText({ text }).catch(() => undefined);
  if (text) await chrome.action.setBadgeBackgroundColor({ color: "#2563eb" }).catch(() => undefined);
}

/** Keep the daily alarm in step with the switch: on → once a day (first check in a minute), off → none. */
export async function syncAlertAlarm(on: boolean): Promise<void> {
  if (!chrome.alarms?.create) return;
  if (!on) {
    await chrome.alarms.clear(ALERT_ALARM).catch(() => undefined);
    return;
  }
  const existing = await chrome.alarms.get(ALERT_ALARM).catch(() => undefined);
  if (!existing) await chrome.alarms.create(ALERT_ALARM, { delayInMinutes: 1, periodInMinutes: 24 * 60 });
}

export async function runJobAlerts(): Promise<void> {
  const state = alertStateOf((await chrome.storage.local.get(ALERTS_KEY))[ALERTS_KEY]);
  if (!state.on) return;
  const origins = Object.values(FEED_ORIGINS);
  if (!(await chrome.permissions.contains({ origins }).catch(() => false))) return;
  const [profile, stored, directory] = await Promise.all([
    loadProfile(),
    chrome.storage.local.get(MY_COMPANIES_KEY),
    fetch(chrome.runtime.getURL("companies.json")).then((r) => r.json() as Promise<ListedCompany[]>),
  ]);
  const mine = (Array.isArray(stored[MY_COMPANIES_KEY]) ? stored[MY_COMPANIES_KEY] as MyCompany[] : []).filter((c) => c && c.ats in FEED_ORIGINS);
  const next = await checkNewMatches(profile, directory.filter((c) => c.ats in FEED_ORIGINS), mine,
    (co) => fetchATSFeed(co.ats, co.slug, co.name, omitCookies, defaultLimiter), state);
  // The user may have switched alerts off while the boards were read.
  const now = alertStateOf((await chrome.storage.local.get(ALERTS_KEY))[ALERTS_KEY]);
  if (!now.on) return;
  await chrome.storage.local.set({ [ALERTS_KEY]: next });
  await showAlertBadge(next);
}

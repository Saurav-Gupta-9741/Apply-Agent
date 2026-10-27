/** ApplyAgent's page script is registered on the sites the user allowed (never on hands-off platforms), in every
 * frame, so it can also be reached inside an allowed form embedded in a page whose own site is not allowed (Chrome
 * refuses on-demand injection there). Whether it silently detects forms is decided in the page, by the user's
 * setting (see shouldDetect). What it finds is kept per tab (session storage) and shown on the toolbar badge. */

import type { Detection } from "../shared/types";
import { HANDS_OFF_MATCHES, JOB_SITE_MATCHES } from "../shared/platforms";

const SCRIPT_ID = "detector";
const ALL_SITES = new Set(["<all_urls>", "*://*/*", "https://*/*", "http://*/*"]);

/** Where the page script is registered. Every site the user allowed one by one; when the user granted access to
 * all sites, only job sites unless they chose detection on every allowed site. Pure, so it is unit-tested. */
export function detectorMatches(granted: string[], detection: "off" | "job_sites" | "allowed_sites"): string[] {
  const out = new Set<string>();
  for (const origin of granted) {
    if (ALL_SITES.has(origin)) {
      for (const m of detection === "allowed_sites" ? [origin] : JOB_SITE_MATCHES) out.add(m);
      continue;
    }
    if (/^(?:\*|https?):\/\/[^/]+\//.test(origin)) out.add(origin);
  }
  return [...out];
}

function sameSet(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((x) => b.includes(x));
}

let syncChain: Promise<unknown> = Promise.resolve();

/** Re-register the detector after a settings or permission change (serialised: changes can arrive together). */
export function syncDetector(detection: "off" | "job_sites" | "allowed_sites"): Promise<void> {
  const next = syncChain.then(async () => {
    const { origins = [] } = await chrome.permissions.getAll();
    const matches = detectorMatches(origins, detection);
    const [existing] = await chrome.scripting.getRegisteredContentScripts({ ids: [SCRIPT_ID] });
    if (!matches.length) {
      if (existing) await chrome.scripting.unregisterContentScripts({ ids: [SCRIPT_ID] });
      return;
    }
    // Same sites: leave the registration alone. Different sites: update it in place. Unregistering first would
    // leave a gap in which a page loading at that moment gets no script at all.
    if (existing && sameSet(existing.matches ?? [], matches)) return;
    const script = { id: SCRIPT_ID, js: ["content.js"], matches, excludeMatches: HANDS_OFF_MATCHES, allFrames: true, runAt: "document_idle" as const };
    if (existing) await chrome.scripting.updateContentScripts([script]);
    else await chrome.scripting.registerContentScripts([script]);
  });
  syncChain = next.catch(() => undefined);
  return next;
}

const RANK: Record<Detection["kind"], number> = { other: 0, job_page: 1, login_wall: 2, application_form: 3 };

interface Stored {
  detection: Detection;
  frameId: number;
}

/** A page and its embedded frames report separately; the most useful finding wins (an embedded form beats the
 * job description around it), and a frame always replaces its own earlier report. */
export function mergeDetection(current: Stored | undefined, next: Stored): Stored {
  if (!current || current.frameId === next.frameId || RANK[next.detection.kind] >= RANK[current.detection.kind]) return next;
  return current;
}

export function badgeFor(d: Detection): { text: string; color: string; title: string } {
  if (d.kind === "application_form") {
    const ask = d.ask ?? 0;
    return ask === 0
      ? { text: "✓", color: "#3ecf8e", title: `Application form: ApplyAgent can fill ${d.fill ?? 0} fields` }
      : { text: String(Math.min(ask, 99)), color: "#f5b84b", title: `Application form: ${d.fill ?? 0} fields ready, ${ask} question${ask === 1 ? "" : "s"} for you` };
  }
  if (d.kind === "other") return { text: "", color: "#8b8cff", title: "Nothing to apply to on this page" };
  if (d.kind === "login_wall") return { text: "!", color: "#f5b84b", title: `Sign in to ${d.platform} to see the application` };
  return { text: "•", color: "#8b8cff", title: "Job page: open the side panel to start the application" };
}

const key = (tabId: number) => `detect:${tabId}`;

let detectChain: Promise<unknown> = Promise.resolve();

export function recordDetection(tabId: number, frameId: number, detection: Detection): Promise<void> {
  const next = detectChain.then(async () => {
    const current = (await chrome.storage.session.get(key(tabId)))[key(tabId)] as Stored | undefined;
    const merged = mergeDetection(current, { detection, frameId });
    await chrome.storage.session.set({ [key(tabId)]: merged });
    const badge = badgeFor(merged.detection);
    await chrome.action.setBadgeText({ tabId, text: badge.text });
    await chrome.action.setBadgeBackgroundColor({ tabId, color: badge.color });
    await chrome.action.setTitle({ tabId, title: `ApplyAgent: ${badge.title}` });
  });
  detectChain = next.catch(() => undefined);
  return next;
}

/** Forget a tab's finding when it moves to another address (unless the new page already reported itself). */
export function clearDetection(tabId: number, newUrl?: string): Promise<void> {
  const next = detectChain.then(async () => {
    const current = (await chrome.storage.session.get(key(tabId)))[key(tabId)] as Stored | undefined;
    if (!current) return;
    if (newUrl && current.detection.url === newUrl) return;
    await chrome.storage.session.remove(key(tabId));
    await chrome.action.setBadgeText({ tabId, text: "" }).catch(() => undefined); // the tab may be gone
    await chrome.action.setTitle({ tabId, title: "ApplyAgent" }).catch(() => undefined);
  });
  detectChain = next.catch(() => undefined);
  return next;
}

export async function loadDetection(tabId: number): Promise<Detection | undefined> {
  return ((await chrome.storage.session.get(key(tabId)))[key(tabId)] as Stored | undefined)?.detection;
}

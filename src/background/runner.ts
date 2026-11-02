/** Runs the queue: opens each job in a background tab, lets the agent fill it, and records the outcome.
 * All state is in chrome.storage so the run survives the service worker being stopped. */

import { NEVER_REMEMBER, type Message, type PendingQuestion, type QueueItem, type QueueStatus, type RunReport } from "../shared/types";
import {
  isQueueRunning, loadApplications, loadQueue, loadSettings, saveQueue, setQueueRunning,
} from "../shared/storage";
import { applicationUrl, planNext, reconcileQueue, submittedToday } from "./queue";
import { canUseFeature, currentLicense, remainingSubmissions } from "../shared/license";
import { pendingSubmission, sendToApplication } from "../shared/frames";
import {
  checkStart, clockTime, loadPacing, loadPacingState, prune, recordChallenge, siteKey, tryStart, waitNote, type PaceDecision,
} from "../shared/pacing";

/** The one-shot alarm that resumes the queue when the earliest waiting item may start. */
export const PACE_ALARM = "queue-pace";

const PAGE_LOAD_TIMEOUT_MS = 30_000;
const FORM_RETRIES = 3; // single-page apps often render the form a moment after "load"

// --- serialised queue updates (avoids lost writes when several tabs report at once) ------------------
let chain: Promise<unknown> = Promise.resolve();

export function updateQueue(change: (queue: QueueItem[]) => QueueItem[] | void): Promise<QueueItem[]> {
  const next = chain.then(async () => {
    const queue = await loadQueue();
    const result = change(queue) ?? queue;
    await saveQueue(result);
    return result;
  });
  chain = next.catch(() => undefined);
  return next;
}

function setItem(id: string, patch: Partial<QueueItem>): Promise<QueueItem[]> {
  return updateQueue((queue) =>
    queue.map((q) => (q.id === id ? { ...q, ...patch, updatedAt: new Date().toISOString() } : q)),
  );
}

// --- mapping agent reports to queue statuses ---------------------------------------------------------
/** Questions from a report that the user can answer in the inbox (not ID numbers, signatures or uploads). */
export function pendingQuestions(report: RunReport | undefined): PendingQuestion[] | undefined {
  if (report?.status !== "needs_user") return undefined;
  const questions = report.fields
    .filter((f) => f.status === "needs_user" && f.decision.kind === "ask" && f.field.label && f.field.control !== "file"
      && !(f.decision.topic && NEVER_REMEMBER.has(f.decision.topic)))
    .map((f): PendingQuestion => ({
      label: f.field.label, section: f.field.section, control: f.field.control, options: f.field.options, required: f.field.required,
      topic: f.decision.kind === "ask" ? f.decision.topic : undefined, maxLength: f.field.maxLength,
    }));
  return questions.length ? questions : undefined;
}

/** What the user reads when a site showed a robot check (the backoff times are added by the runner). */
export function challengeNote(detail: string): string {
  return `Stopped: the site showed ${detail}. ApplyAgent never solves or bypasses these. Solve it in the tab yourself if you want, then press Retry.`;
}

export function queueStatusFor(report: RunReport | undefined): { status: QueueStatus; note: string } {
  if (!report) return { status: "failed", note: "No application form found on this page" };
  if (report.challenge) return { status: "needs_user", note: challengeNote(report.challenge) };
  switch (report.status) {
    case "submitted_confirmed":
      return { status: "applied", note: report.confirmationText ?? "Confirmed by the employer's site" };
    case "submitted_unconfirmed":
      return { status: "needs_check", note: "Submitted, but the site showed no confirmation. Please check the tab." };
    case "ready_to_submit":
      return {
        status: "ready",
        note: `${report.steps ? `Went through ${report.steps} steps. ` : ""}Filled. Review the tab, then press Submit.`,
      };
    case "needs_user": {
      const asks = report.fields.filter((f) => f.status === "needs_user").length;
      const parts = [
        report.captcha ? "Solve the CAPTCHA" : "",
        asks ? `${asks} question(s) need your answer` : "",
        report.errors.length ? report.errors.join("; ") : "",
      ].filter(Boolean);
      return { status: "needs_user", note: parts.join(" · ") || "Needs your attention" };
    }
    default:
      return { status: "failed", note: "No application form found on this page" };
  }
}

// --- tab helpers -------------------------------------------------------------------------------------
function waitForLoad(tabId: number): Promise<boolean> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => finish(false), PAGE_LOAD_TIMEOUT_MS);
    function finish(ok: boolean) {
      clearTimeout(timer);
      chrome.tabs.onUpdated.removeListener(listener);
      resolve(ok);
    }
    function listener(id: number, info: { status?: string }) {
      if (id === tabId && info.status === "complete") finish(true);
    }
    chrome.tabs.onUpdated.addListener(listener);
    chrome.tabs.get(tabId).then((t) => t.status === "complete" && finish(true)).catch(() => finish(false));
  });
}

export const MAX_PAGE_STEPS = 6;

/** Wait until the tab has finished loading (status is reported without any extra permission). */
async function loaded(tabId: number, timeoutMs = 15_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if ((await chrome.tabs.get(tabId).catch(() => undefined))?.status !== "loading") return;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
}

/** After Submit, the page that loads is the site's answer: it is never filled. Its confirmation (or not) is recorded by
 * the tab's own report; meanwhile the item waits for the user to check. */
function awaitingConfirmation(): RunReport {
  return {
    status: "submitted_unconfirmed", platform: "", url: "", jobTitle: "", fields: [], captcha: false,
    errors: ["Submitted. Waiting for the site's confirmation: check the tab or your email."],
  };
}

/** Run the agent in a tab and return its report. Only the frame holding the application gets the message. A form that
 * renders late gets a few retries; a multi-step application that loads a new page per step (which ends the agent on
 * the old page) continues on the new page, up to MAX_PAGE_STEPS pages, unless the agent pressed Submit: the page
 * after a Submit is never filled. A Submit is never repeated. */
export async function runInTab(tabId: number, message: Message): Promise<RunReport | undefined> {
  const before = await pendingSubmission(tabId);
  let loads = 0;
  const onLoad = (id: number, info: chrome.tabs.TabChangeInfo) => {
    if (id === tabId && info.status === "loading") loads++;
  };
  chrome.tabs.onUpdated.addListener(onLoad);
  try {
    // Never retry a Submit: if the page navigated away mid-request, a retry could submit a second time.
    const retries = message.type === "SUBMIT" ? 1 : FORM_RETRIES;
    let misses = 0;
    let pages = 0;
    let seenLoads = 0;
    while (misses < retries && pages <= MAX_PAGE_STEPS) {
      const step: Message = message.type === "RUN" && pages > 0 ? { ...message, continuing: true } : message;
      const report = await sendToApplication(tabId, step);
      if (report) return report;
      if (message.type === "SUBMIT") return undefined;
      await new Promise((resolve) => setTimeout(resolve, 2500));
      if (loads !== seenLoads) {
        const submitted = await pendingSubmission(tabId);
        if (submitted && submitted.id !== before?.id) return awaitingConfirmation(); // the new page answers a Submit
        // The page moved on (the next step of the application): continue there, without spending a retry.
        seenLoads = loads;
        pages++;
        await loaded(tabId);
      } else misses++;
    }
    return undefined;
  } finally {
    chrome.tabs.onUpdated.removeListener(onLoad);
  }
}

function originPattern(url: string): string | null {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}/*`;
  } catch {
    return null;
  }
}

/** A queued link that shows the job description: open its application with the page's own "Apply" (a link in this
 * tab, or a button for forms on the same page), as a person would. */
async function openApplication(tabId: number): Promise<boolean> {
  const result = (await chrome.tabs.sendMessage(tabId, { type: "OPEN_APPLICATION" } satisfies Message).catch(() => undefined)) as
    { href?: string; clicked?: boolean } | undefined;
  if (result?.href) {
    await chrome.tabs.update(tabId, { url: result.href });
    await new Promise((resolve) => setTimeout(resolve, 500)); // let the old page start unloading first
    await waitForLoad(tabId);
  } else if (!result?.clicked) {
    return false;
  }
  await new Promise((resolve) => setTimeout(resolve, 1500));
  return true;
}

// --- running one item ----------------------------------------------------------------------------------
/** Items this worker is working on right now. A long application (many steps, slow pages) is not "stuck": only
 * items the worker lost (it was stopped, or the browser restarted) are repaired by reconcileQueue. */
const active = new Set<string>();

/** Run fn for a queue item, marked as actively worked on meanwhile. */
export async function working<T>(id: string, fn: () => Promise<T>): Promise<T> {
  active.add(id);
  try {
    return await fn();
  } finally {
    active.delete(id);
  }
}

async function startItem(item: QueueItem): Promise<void> {
  return working(item.id, () => runItem(item));
}

async function runItem(item: QueueItem): Promise<void> {
  const url = applicationUrl(item.url);
  const pattern = originPattern(url);
  if (!pattern || !(await chrome.permissions.contains({ origins: [pattern] }))) {
    await setItem(item.id, { status: "needs_user", note: "Allow this site first (Queue tab → Allow job sites)" });
    return;
  }
  const settings = await loadSettings();
  const tab = await chrome.tabs.create({ url, active: false });
  if (tab.id === undefined) {
    await setItem(item.id, { status: "failed", note: "Could not open a tab" });
    return;
  }
  await setItem(item.id, { tabId: tab.id, note: "Opening…" });
  if (!(await waitForLoad(tab.id))) {
    await setItem(item.id, { status: "failed", note: "The page did not load" });
    await chrome.tabs.remove(tab.id).catch(() => undefined);
    return;
  }
  // Some job links redirect to the employer's own site: the user decides whether to allow it.
  // Chrome only shows the address of a tab on a site the user allowed: no address means it landed elsewhere.
  const landed = (await chrome.tabs.get(tab.id).catch(() => undefined))?.url;
  const landedPattern = landed ? originPattern(landed) : null;
  if (!landedPattern || (landedPattern !== pattern && !(await chrome.permissions.contains({ origins: [landedPattern] })))) {
    await setItem(item.id, {
      status: "needs_user",
      note: landed
        ? `This job opens on ${new URL(landed).host}. Go to the tab, click the ApplyAgent icon, press "Allow", then Retry.`
        : `This job opens on another site. Go to the tab, click the ApplyAgent icon, press "Allow", then Retry.`,
    });
    return;
  }
  // A job description (or its job-alert form) answers "not a form": open the application first, as a person would.
  let report = await runInTab(tab.id, { type: "RUN", mode: settings.mode });
  if ((!report || report.status === "not_a_form") && (await openApplication(tab.id))) {
    report = await runInTab(tab.id, { type: "RUN", mode: settings.mode, continuing: true }); // the application we opened
  }
  let { status, note } = queueStatusFor(report);
  if (report?.challenge) note = await backOff(report.url || url, report.challenge, note);
  await setItem(item.id, { status, note, title: item.title || report?.jobTitle || "", questions: pendingQuestions(report) });
  // Finished tabs close; tabs that need the user stay open for them.
  if (status === "applied" || status === "failed") {
    setTimeout(() => void chrome.tabs.remove(tab.id!).catch(() => undefined), 3000);
  }
}

/** A site showed a robot check: pause that site for 30 minutes and the whole queue for 10, and say so. */
export async function backOff(url: string, detail: string, note = challengeNote(detail)): Promise<string> {
  const state = await recordChallenge(url, detail);
  const site = state.sitePausedUntil[siteKey(url)];
  await scheduleResume(state.queuePausedUntil);
  return `${note} This site is paused until ${site ? clockTime(site) : "later"} and the queue until ${clockTime(state.queuePausedUntil)}.`;
}

/** Wake the queue when the earliest waiting item may start (the 1-minute pump alarm also keeps checking). */
async function scheduleResume(at: number | undefined): Promise<void> {
  if (!at || typeof chrome === "undefined" || !chrome.alarms?.create) return;
  const existing = await chrome.alarms.get(PACE_ALARM).catch(() => undefined);
  if (existing && existing.scheduledTime <= at && existing.scheduledTime > Date.now()) return;
  await chrome.alarms.create(PACE_ALARM, { when: Math.max(at, Date.now() + 1000) });
}

// --- the pump --------------------------------------------------------------------------------------------
let pumping = false;

/** Start as many queued items as the limits allow. Safe to call any time (alarm, message, item finished). */
export async function pump(): Promise<void> {
  if (pumping) return;
  pumping = true;
  try {
    if (!(await isQueueRunning())) return;
    await reconcile();
    const [queue, applications, settings, license, pacing, paceState] = await Promise.all([
      loadQueue(), loadApplications(), loadSettings(), currentLicense(), loadPacing(), loadPacingState(),
    ]);
    const now = new Date();
    // Safe pacing: items a limit holds back now are left out of this round (they wait, with the reason shown).
    const state = prune(paceState, now.getTime());
    const waits = new Map<string, Exclude<PaceDecision, { ok: true }>>();
    for (const q of queue) {
      if (q.status !== "queued") continue;
      const decision = checkStart(state, pacing, siteKey(applicationUrl(q.url)), now.getTime());
      if (!decision.ok) waits.set(q.id, decision);
    }
    // Free plan: queue is blocked without Pro
    if (!canUseFeature(license, "queue") && queue.some((q) => q.status === "queued")) {
      const note = "Bulk apply and background queue require Pro. Upgrade to Pro in Profile & plan.";
      await updateQueue((q) => q.map((x) => (x.status === "queued" && x.note !== note ? { ...x, note } : x)));
      await setQueueRunning(false);
      return;
    }
    const left = remainingSubmissions(license, applications, now);
    const effectiveCap = Math.min(settings.dailyCap, submittedToday(applications, now) + left);
    const plan = planNext(queue, applications, { ...settings, dailyCap: effectiveCap }, now, (q) => !waits.has(q.id));
    if (!plan.start.length && !plan.skip.length && !queue.some((q) => q.status === "queued" || q.status === "running")) {
      await setQueueRunning(false); // nothing left to do
      return;
    }
    // Every start is checked and counted in one locked step, so starts at the same moment never pass a limit together.
    const starting: QueueItem[] = [];
    for (const item of plan.start) {
      const decision = await tryStart(applicationUrl(item.url), now.getTime());
      if (decision.ok) starting.push(item);
      else waits.set(item.id, decision);
    }
    await updateQueue((q) => q.map((x) => {
      const skipped = plan.skip.find((s) => s.item.id === x.id);
      if (skipped) return { ...x, status: "skipped" as const, note: skipped.note, updatedAt: new Date().toISOString() };
      if (starting.some((s) => s.id === x.id)) {
        return { ...x, status: "running" as const, note: "Starting…", waitUntil: undefined, updatedAt: new Date().toISOString() };
      }
      const wait = x.status === "queued" ? waits.get(x.id) : undefined;
      if (wait) {
        const note = waitNote(wait, pacing, now.getTime());
        return x.note === note && x.waitUntil === wait.nextAt ? x : { ...x, note, waitUntil: wait.nextAt, updatedAt: new Date().toISOString() };
      }
      if (x.status === "queued" && x.waitUntil !== undefined) return { ...x, note: undefined, waitUntil: undefined };
      return x;
    }));
    const nextWake = Math.min(...[...waits.values()].map((w) => w.nextAt));
    if (Number.isFinite(nextWake)) await scheduleResume(nextWake);
    for (const item of starting) {
      void startItem(item)
        .catch(async (e: unknown) => setItem(item.id, { status: "failed", note: e instanceof Error ? e.message : "Unexpected error" }))
        .finally(() => void pump());
    }
  } finally {
    pumping = false;
  }
}

/** Repair items stranded by a stopped worker or browser restart (see reconcileQueue for the rules). */
async function reconcile(): Promise<void> {
  const liveTabs = new Set((await chrome.tabs.query({})).map((t) => t.id).filter((id): id is number => id !== undefined));
  const applications = await loadApplications();
  await updateQueue((queue) => reconcileQueue(queue, liveTabs, applications, Date.now(), active));
}

/** A page in a queued item's tab reported. "Applied" only counts where ApplyAgent submitted in that tab (submitted). */
export async function onTabReport(tabId: number, report: RunReport, submitted: boolean): Promise<void> {
  let { status, note } = queueStatusFor(report);
  if (status === "applied" && !submitted) return;
  // A robot check, in a queued tab or in a tab the user filled from the panel: the queue backs off either way.
  if (report.challenge && report.url) note = await backOff(report.url, report.challenge, note);
  await updateQueue((queue) => queue.map((q) =>
    q.tabId === tabId && q.status !== "applied"
      ? { ...q, status, note, questions: pendingQuestions(report), updatedAt: new Date().toISOString() }
      : q,
  ));
  if (status === "applied") void pump();
}

export async function onTabClosed(tabId: number): Promise<void> {
  await updateQueue((queue) => queue.map((q) =>
    q.tabId === tabId && ["running", "needs_user", "ready"].includes(q.status)
      ? { ...q, status: "skipped" as const, note: "Tab was closed before submitting", tabId: undefined, updatedAt: new Date().toISOString() }
      : q,
  ));
  void pump();
}

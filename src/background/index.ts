/** Background service worker: application tracker, proof screenshots, and the parallel queue.
 * State lives in chrome.storage, never in memory, because the worker is stopped when idle. */

import type { ApplicationRecord, ApplicationStatus, Message, RunReport } from "../shared/types";
import { loadApplications, loadQueue, loadSettings, saveApplications, setQueueRunning } from "../shared/storage";
import { isHandsOff } from "../shared/platforms";
import { clearDetection, recordDetection, syncDetector } from "./detector";
import { setWorking } from "./icon";
import { modelFits, understand } from "./understand";
import { isValidJobUrl } from "./queue";
import { onTabClosed, onTabReport, pendingQuestions, pump, queueStatusFor, runInTab, updateQueue } from "./runner";

const PUMP_ALARM = "queue-pump";

const resyncDetector = () => void loadSettings().then((s) => syncDetector(s.detection)).catch(() => undefined);

const FILL_MENU = "applyagent-fill";

chrome.runtime.onInstalled.addListener(() => {
  // The icon click is handled below (it opens the panel and tells it to re-read the page).
  chrome.sidePanel?.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => undefined);
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: FILL_MENU, title: "Fill this application with ApplyAgent", contexts: ["page", "editable", "frame"] });
  });
  resyncDetector();
});

/** Opens the panel beside this tab. Browsers without Chrome's side panel (Opera, some Edge builds) get the same panel
 * in a small window of its own, tied to this tab. Called synchronously from the user's action: Chrome opens the side
 * panel only while that action is still current. */
function openPanel(tab: chrome.tabs.Tab): void {
  if (tab.id === undefined) return;
  if (typeof chrome.sidePanel?.open !== "function") {
    void openPanelWindow(tab);
    return;
  }
  chrome.sidePanel.open({ tabId: tab.id }).catch(() => void openPanelWindow(tab));
}

async function openPanelWindow(tab: chrome.tabs.Tab): Promise<void> {
  const around = tab.windowId !== undefined ? await chrome.windows.get(tab.windowId).catch(() => undefined) : undefined;
  const width = 420;
  await chrome.windows.create({
    url: chrome.runtime.getURL(`sidepanel.html?tabId=${tab.id}`), type: "popup", width, height: Math.min(around?.height ?? 820, 900),
    left: around ? (around.left ?? 0) + Math.max(0, (around.width ?? 1200) - width) : undefined, top: around?.top,
  }).catch(() => undefined);
}

/** Keyboard shortcut (Alt+Shift+F) and right-click menu: open the panel on this tab and let it run Fill there,
 * so the user sees every question and result. Both count as the user's own action, which also gives one-time
 * access to this page (activeTab) even before the site is allowed for good. */
function fillFromShortcut(tab: chrome.tabs.Tab | undefined): void {
  if (tab?.id === undefined) return;
  // Opened first and synchronously: Chrome only lets the panel open while the user's action is still current.
  openPanel(tab);
  // An open panel hears this change; a panel that is still loading reads it when it starts.
  void chrome.storage.session.set({ panelRun: { tabId: tab.id, at: Date.now() } });
}

/** The toolbar icon (and Alt+Shift+A) gives one-time access to this page. Without the "tabs" permission the panel
 * would not otherwise know, so it is told to re-read the page. */
chrome.action.onClicked.addListener((tab) => {
  openPanel(tab);
  chrome.runtime.sendMessage({ type: "PANEL_REFRESH" } satisfies Message).catch(() => undefined); // no panel open yet: fine
});

chrome.commands.onCommand.addListener((command, tab) => {
  if (command === "fill-application") fillFromShortcut(tab);
});
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === FILL_MENU) fillFromShortcut(tab);
});
chrome.runtime.onStartup.addListener(() => {
  resyncDetector();
  void pump();
});
// The detector follows the user's choices: which sites are allowed, and whether detection is on.
chrome.permissions.onAdded.addListener(resyncDetector);
chrome.permissions.onRemoved.addListener(resyncDetector);
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.settings) resyncDetector();
});
chrome.alarms.onAlarm.addListener((alarm) => alarm.name === PUMP_ALARM && void pump());

// --- tracker (serialised writes: several tabs can report at the same moment) ---------------------------
let trackerChain: Promise<unknown> = Promise.resolve();

function updateApplications(change: (records: ApplicationRecord[]) => ApplicationRecord[]): Promise<void> {
  const next = trackerChain.then(async () => saveApplications(change(await loadApplications())));
  trackerChain = next.catch(() => undefined);
  return next;
}

/** Tabs where the agent pressed (or the user approved) Submit: only these may record an application. */
async function pendingTabs(): Promise<Record<string, string>> {
  const data = await chrome.storage.session.get("pending");
  return (data.pending as Record<string, string> | undefined) ?? {};
}

let pendingChain: Promise<unknown> = Promise.resolve();

function setPending(tabId: number, applicationId: string | null): Promise<void> {
  const next = pendingChain.then(async () => {
    const pending = await pendingTabs();
    if (applicationId) pending[String(tabId)] = applicationId;
    else delete pending[String(tabId)];
    await chrome.storage.session.set({ pending });
  });
  pendingChain = next.catch(() => undefined);
  return next;
}

function statusFor(report: RunReport): ApplicationStatus | null {
  if (report.status === "submitted_confirmed") return "applied_confirmed";
  if (report.status === "submitted_unconfirmed") return "needs_check";
  return null;
}

/** Screenshot only when the confirmed tab is the one on screen; otherwise it would capture another page. */
async function screenshot(tab: chrome.tabs.Tab, id: string): Promise<string | undefined> {
  if (!tab.active) return undefined;
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
    const key = `proof:${id}`;
    await chrome.storage.local.set({ [key]: dataUrl });
    return key;
  } catch {
    return undefined; // no permission for this page: the confirmation text is the proof
  }
}

async function recordResult(report: RunReport, tab: chrome.tabs.Tab): Promise<void> {
  if (tab.id === undefined) return;
  const id = (await pendingTabs())[String(tab.id)];
  if (!id) return; // a confirmation page the agent did not submit: not ours to record
  if (report.status === "needs_user") {
    // The site rejected the submission (error, CAPTCHA, validation): nothing was applied, so drop the placeholder.
    await updateApplications((records) => records.filter((r) => !(r.id === id && r.status === "in_progress")));
    await setPending(tab.id, null);
    return;
  }
  const status = statusFor(report);
  if (!status) return;

  const screenshotKey = status === "applied_confirmed" ? await screenshot(tab, id) : undefined;
  await updateApplications((records) => {
    const existing = records.find((r) => r.id === id);
    const record: ApplicationRecord = {
      id,
      url: existing?.url ?? report.url,
      platform: report.platform || existing?.platform || "",
      jobTitle: existing?.jobTitle || report.jobTitle,
      status,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      confirmationText: report.confirmationText ?? existing?.confirmationText,
      screenshotKey: screenshotKey ?? existing?.screenshotKey,
    };
    return [record, ...records.filter((r) => r.id !== id)];
  });
  if (status === "applied_confirmed") await setPending(tab.id, null);
}

// After Submit, many sites load a new "thank you" page. Inject the agent there so it can report the confirmation.
// This only works where the user already allowed the site; otherwise the record stays "needs check".
chrome.tabs.onUpdated.addListener((tabId, info) => {
  // A new page: the old finding no longer applies. (The address is only known on allowed sites; "loading" always is.)
  if (info.url || info.status === "loading") void clearDetection(tabId, info.url);
  if (info.status === "loading") void setWorking(tabId, false); // a new page: the agent there starts afresh
  if (info.status !== "complete") return;
  (async () => {
    if (!(await pendingTabs())[String(tabId)]) return;
    await chrome.scripting.executeScript({ target: { tabId, allFrames: true }, files: ["content.js"] });
  })().catch(() => undefined);
});

chrome.tabs.onRemoved.addListener((tabId) => {
  void setPending(tabId, null);
  void onTabClosed(tabId);
  void chrome.storage.session.remove(`detect:${tabId}`);
  void setWorking(tabId, false);
});

chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse: (result: unknown) => void) => {
  switch (message.type) {
    case "MARK_SUBMITTING": {
      const tabId = sender.tab?.id;
      if (tabId === undefined) return false;
      (async () => {
        const id = crypto.randomUUID();
        await setPending(tabId, id);
        await updateApplications((records) => [{
          id, url: message.url, platform: message.platform, jobTitle: message.jobTitle, status: "in_progress",
          createdAt: new Date().toISOString(),
        }, ...records]);
        sendResponse(true); // the content script waits for this before clicking Submit
      })();
      return true;
    }
    case "RUN_RESULT":
      if (sender.tab?.id !== undefined) {
        void recordResult(message.report, sender.tab).catch(() => undefined);
        void onTabReport(sender.tab.id, message.report);
      }
      return false;
    case "DETECTED":
      if (sender.tab?.id !== undefined && !isHandsOff(message.detection.url)) {
        void recordDetection(sender.tab.id, sender.frameId ?? 0, message.detection).catch(() => undefined);
      }
      return false;
    case "UNDERSTAND":
      // Switched off in Profile & plan: no readings, and the model is not even loaded.
      loadSettings().then((s) => (s.understanding && modelFits() ? understand(message.texts) : null)).then(sendResponse, () => sendResponse(null));
      return true;
    case "AGENT_BUSY":
      if (sender.tab?.id !== undefined) void setWorking(sender.tab.id, message.busy);
      return false;
    case "DETECTION_SYNC":
      (async () => {
        await syncDetector((await loadSettings()).detection).catch(() => undefined);
        sendResponse(true);
      })();
      return true;
    case "QUEUE_START":
      (async () => {
        await setQueueRunning(true);
        await chrome.alarms.create(PUMP_ALARM, { periodInMinutes: 1 });
        await pump();
        sendResponse(true);
      })();
      return true;
    case "QUEUE_PAUSE":
      (async () => {
        await setQueueRunning(false);
        await chrome.alarms.clear(PUMP_ALARM);
        sendResponse(true);
      })();
      return true;
    case "QUEUE_PUMP":
      void pump();
      return false;
    case "QUEUE_ADD":
      (async () => {
        let added = 0;
        await updateQueue((queue) => {
          const known = new Set(queue.map((q) => q.url));
          const now = new Date().toISOString();
          // Hands-off platforms (LinkedIn, Naukri, …) are never queued: their terms forbid automated applications.
          const fresh = message.jobs.filter((j) => isValidJobUrl(j.url) && !isHandsOff(j.url) && !known.has(j.url)).map((j) => ({
            id: crypto.randomUUID(), url: j.url, title: j.title, company: j.company, status: "queued" as const, addedAt: now, updatedAt: now,
          }));
          added = fresh.length;
          return [...queue, ...fresh];
        });
        sendResponse(added);
        void pump();
      })();
      return true;
    case "QUEUE_RERUN":
      (async () => {
        const item = (await loadQueue()).find((q) => q.id === message.id);
        const tab = item?.tabId !== undefined ? await chrome.tabs.get(item.tabId).catch(() => undefined) : undefined;
        if (!item || tab?.id === undefined) {
          // The tab is gone: start over in a fresh tab.
          await updateQueue((queue) => queue.map((q) => (q.id === message.id
            ? { ...q, status: "queued" as const, note: undefined, tabId: undefined, questions: undefined, updatedAt: new Date().toISOString() }
            : q)));
          void pump();
          return sendResponse(true);
        }
        const settings = await loadSettings();
        await updateQueue((queue) => queue.map((q) => (q.id === item.id ? { ...q, status: "running" as const, note: "Filling your new answers…", updatedAt: new Date().toISOString() } : q)));
        const report = await runInTab(tab.id, { type: "RUN", mode: settings.mode });
        const { status, note } = queueStatusFor(report);
        await updateQueue((queue) => queue.map((q) => (q.id === item.id
          ? { ...q, status, note, questions: pendingQuestions(report), updatedAt: new Date().toISOString() } : q)));
        if (status === "applied") setTimeout(() => void chrome.tabs.remove(tab.id!).catch(() => undefined), 3000);
        sendResponse(true);
      })();
      return true;
    case "QUEUE_RETRY":
      void updateQueue((queue) => queue.map((q) => (q.id === message.id
        ? { ...q, status: "queued" as const, note: undefined, tabId: undefined, questions: undefined, updatedAt: new Date().toISOString() }
        : q))).then(() => pump());
      return false;
    case "QUEUE_REMOVE":
      void updateQueue((queue) => queue.filter((q) => q.id !== message.id));
      return false;
    case "QUEUE_CLEAR_FINISHED":
      void updateQueue((queue) => queue.filter((q) => !["applied", "failed", "skipped"].includes(q.status)));
      return false;
    case "QUEUE_SUBMIT":
      (async () => {
        const item = (await loadQueue()).find((q) => q.id === message.id);
        if (item?.tabId === undefined) return sendResponse(false);
        const report = await runInTab(item.tabId, { type: "SUBMIT" });
        const { status, note } = queueStatusFor(report);
        await updateQueue((queue) => queue.map((q) => (q.id === item.id
          ? { ...q, status, note, questions: pendingQuestions(report), updatedAt: new Date().toISOString() } : q)));
        sendResponse(true);
        void pump();
      })();
      return true;
    default:
      return false;
  }
});

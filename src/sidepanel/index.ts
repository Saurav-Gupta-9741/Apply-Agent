/** Side panel UI. Page-derived text (labels, titles) is always inserted as text, never as HTML. */

import { initDiscover } from "./discover";
import type {
  AnswerEntry, ApplicationRecord, Detection, FeedJob, FieldResult, FitResult, Message, Mode, Profile, ProfileKey, QueueItem,
  QueueStatus, QuickFacts, RunReport, Settings, WorkEntry, UserCorrection, SkillEntry, LanguageEntry,
} from "../shared/types";
import {
  EMPTY_PROFILE, isQueueRunning, loadAnswers, loadApplications, loadCandidateProfiles, loadProfile, loadQueue, loadSettings, saveAnswers,
  saveProfile, saveSettings, switchProfile, updateAnswers, updateApplications, upsertAnswer,
  loadCorrections,
} from "../shared/storage";
import { pendingSubmission, sendToApplication } from "../shared/frames";
import { isValidJobUrl, parseJobList } from "../background/queue";
import { GOOD_MATCH, parseFeed, rankFeed } from "../shared/fit";
import { aiStatus, checkDraft, draftAnswer } from "../shared/ai";
import { activate, BETA_ALL_FREE, buyUrl, canUseFeature, currentLicense, isLifetimeLicense, licensingConfigured, remainingSubmissions, submittedThisMonth } from "../shared/license";
import { FREE_MONTHLY_SUBMISSIONS, SUPPORT_EMAIL } from "../shared/config";
import { hydrateIcons, icon } from "./icons";
import { NEVER_REMEMBER, type PendingQuestion } from "../shared/types";
import { findAnswer, questionKey } from "../content/classify";
import { isAppliedBeforeQuestion } from "../content/facts";
import { HANDS_OFF_MESSAGE, isHandsOff, platformFor } from "../shared/platforms";
import { makeBackup, mergeAnswers, mergeApplications, mergeCompanies, readBackup } from "../shared/backup";
import { loadMyCompanies } from "./discover";
import { MY_COMPANIES_KEY } from "../shared/jobs/companies";
import { COMMON_SCREENING_QUESTIONS } from "../shared/screening";
import { findSuggestedCorrection } from "../shared/corrections";
import { linkPlaces, mountPlaces, refreshPlaceLists } from "./profile-places";
import { AUTO_BACKUP_FILE, loadAutoBackup, setAutoBackup } from "../shared/auto-backup";
import { diversityFactFromAnswer, EDUCATION_STATUS_OPTIONS } from "../shared/quick-answers";
import { allCountryNames, normalizeProfileValue, timezoneChoices, validateProfile, type FieldIssue, type ProfileValues } from "../shared/profile-validate";
import { extractTechTerms } from "../shared/techterms";
import { buildDiagnostic, saveDiagnosticFile } from "../shared/diagnostic";
import { clockTime, loadPacing, loadPacingState, PACING_BOUNDS, savePacing, statusLine, type PacingSettings } from "../shared/pacing";
import type { ConsentBox, ConsentList, TickResult } from "../shared/consent-review";
import { initTracker, renderTrackerCrm, type TrackerUi } from "./tracker";
import { initUsageMeter, renderUsageMeter } from "./usage-meter";
import { renderFitCard } from "./fit-card";
import { applyResumeTabClosed, applyResumeTabMoved, initApplyResume, renderApplyResume, sendWithResume } from "./apply-resume";
// >>> L3 form structure
import { mountFormStructureButton } from "./form-structure";
// <<< L3
import { headline, rowState, summarize, type LiveField } from "./checklist";
// >>> L4 ai drafts
import { createDraftWidget, isDraftableField, limitCounter, limitOfField } from "./drafts";
import { checkLength } from "../shared/length-limit";
import { factHints, focusQuickAnswer } from "./fact-hints";
// <<< L4

let cachedCorrections: UserCorrection[] = [];
void loadCorrections().then((c) => { cachedCorrections = c; });

// --- DOM helpers ----------------------------------------------------------------------------------
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

type Child = Node | string | null | undefined | false;

/** Tiny element builder: h("div", { class: "x" }, "text", child). Strings become text nodes (never HTML). */
function h<K extends keyof HTMLElementTagNameMap>(
  tag: K, attrs: Record<string, string | boolean | undefined> = {}, ...children: Child[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) continue;
    if (key === "class") node.className = String(value);
    else node.setAttribute(key, value === true ? "" : String(value));
  }
  for (const child of children) if (child) node.append(child);
  return node;
}

function button(label: string, opts: { variant?: string; icon?: string; size?: string; title?: string } = {}): HTMLButtonElement {
  const b = h("button", { class: `btn btn-${opts.variant ?? "secondary"}${opts.size ? ` btn-${opts.size}` : ""}`, title: opts.title, type: "button" });
  if (opts.icon) b.append(icon(opts.icon, 16));
  b.append(h("span", {}, label));
  return b;
}

function iconButton(name: string, label: string, danger = false): HTMLButtonElement {
  const b = h("button", { class: `icon-btn${danger ? " danger" : ""}`, "aria-label": label, title: label, type: "button" });
  b.append(icon(name, 16));
  return b;
}

function chip(text: string, tone = ""): HTMLSpanElement {
  return h("span", { class: `chip ${tone}` }, text);
}

function empty(iconName: string, title: string, hint: string): HTMLLIElement {
  const wrap = h("span", { class: "icon-wrap" });
  wrap.append(icon(iconName, 20));
  return h("li", { class: "empty" }, wrap, h("strong", {}, title), h("span", {}, hint));
}

function toast(text: string, tone: "ok" | "warn" | "bad" | "" = "ok"): void {
  const t = h("div", { class: `toast ${tone}`, role: "status" });
  t.append(icon(tone === "bad" ? "alert" : tone === "warn" ? "info" : "check", 16), h("span", {}, text));
  $("toasts").append(t);
  setTimeout(() => {
    t.classList.add("leaving");
    setTimeout(() => t.remove(), 220);
  }, 2600);
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
}

function companyFromUrl(url: string): string {
  try {
    const u = new URL(url);
    // Job boards host many employers: the company is the first path segment (boards.greenhouse.io/acme).
    if (/(greenhouse\.io|lever\.co|ashbyhq\.com|workable\.com|smartrecruiters\.com)$/.test(u.hostname)) {
      return u.searchParams.get("for") ?? u.pathname.split("/").filter(Boolean)[0] ?? "";
    }
    return u.hostname.replace(/^(www|careers|jobs)\./, "").split(".")[0] ?? "";
  } catch {
    return "";
  }
}

function relativeDate(iso: string): string {
  const ms = Date.now() - Date.parse(iso);
  if (!Number.isFinite(ms)) return "";
  const mins = Math.round(ms / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days < 7 ? `${days} d ago` : new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

// --- navigation ----------------------------------------------------------------------------------------
type Section = "jobs" | "apply" | "queue" | "tracker" | "answers" | "profile";
const drawer = $("drawer");
const wide = window.matchMedia("(min-width: 640px)");

function setDrawer(open: boolean): void {
  drawer.classList.toggle("open", open);
  $("scrim").hidden = !open || wide.matches;
  $("nav-toggle").setAttribute("aria-expanded", String(open));
  ($("main") as HTMLElement & { inert: boolean }).inert = open && !wide.matches;
  if (open) drawer.querySelector<HTMLButtonElement>("[aria-current='page']")?.focus();
}

function showSection(name: Section): void {
  const current = document.querySelector<HTMLElement>(".nav-item[aria-current='page']")?.dataset.section;
  if (current === "profile" && name !== "profile" && profileDirty) {
    setDrawer(false);
    confirmLeaveProfile(name);
    return;
  }
  document.querySelectorAll<HTMLElement>(".section").forEach((s) => (s.hidden = s.id !== `sec-${name}`));
  document.querySelectorAll<HTMLButtonElement>(".nav-item").forEach((b) => {
    if (b.dataset.section === name) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });
  $("section-title").textContent = $(`sec-${name}`).dataset.title ?? "";
  setDrawer(false);
  if (name === "answers") void renderAnswers();
  if (name === "tracker") void renderTracker();
  try {
    sessionStorage.setItem("section", name);
  } catch {
    // storage unavailable: the panel simply opens on Apply next time
  }
}

drawer.querySelectorAll<HTMLButtonElement>(".nav-item").forEach((b) => b.addEventListener("click", () => showSection(b.dataset.section as Section)));
$("nav-toggle").addEventListener("click", () => setDrawer(!drawer.classList.contains("open")));
$("nav-close").addEventListener("click", () => {
  setDrawer(false);
  $("nav-toggle").focus();
});
$("scrim").addEventListener("click", () => setDrawer(false));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && drawer.classList.contains("open") && !wide.matches) {
    setDrawer(false);
    $("nav-toggle").focus();
  }
});
wide.addEventListener("change", () => setDrawer(false));

function setCount(name: string, value: number, attention = false): void {
  const badge = document.querySelector<HTMLElement>(`[data-count='${name}']`);
  if (!badge) return;
  badge.textContent = value > 0 ? String(value) : "";
  badge.classList.toggle("attention", attention && value > 0);
}

// --- Apply: current page & site permission -----------------------------------------------------------
/** The tab the panel acts on: the active tab, or (when opened as a page, e.g. in tests) ?tabId=<id>. */
const pageParams = new URLSearchParams(location.search);
const pinnedTabId = Number(pageParams.get("tabId")) || undefined;
/** Tests: follow the active tab of this window, the way the side panel follows the active tab of its own window. */
const followWindowId = Number(pageParams.get("window")) || undefined;
/** The window this panel belongs to: switching tabs in another window never changes what it shows. */
let panelWindowId: number | undefined = followWindowId;
if (followWindowId === undefined && pinnedTabId === undefined) {
  void chrome.windows.getCurrent().then((w) => (panelWindowId = w.id)).catch(() => undefined);
}

/** The keyboard shortcuts as this user has them (they can change them, and a Mac shows ⌥⇧F). */
const keys = { fill: "Alt+Shift+F", open: "Alt+Shift+A" };
const MAC = /Mac/i.test(navigator.platform || navigator.userAgent);
const keyLabel = (shortcut: string) => (MAC ? shortcut.replace(/Alt\+?|Option\+?/g, "⌥").replace(/Shift\+?/g, "⇧").replace(/(Command|⌘)\+?/g, "⌘").replace(/(Ctrl|MacCtrl)\+?/g, "⌃") : shortcut);
async function loadShortcuts(): Promise<void> {
  const commands = await chrome.commands.getAll().catch(() => []);
  const fill = commands.find((c) => c.name === "fill-application")?.shortcut ?? "";
  const open = commands.find((c) => c.name === "_execute_action")?.shortcut ?? "";
  keys.fill = fill ? keyLabel(fill) : "";
  keys.open = open ? keyLabel(open) : "";
  const hint = $("fill-shortcut");
  hint.textContent = keys.fill || "a shortcut (set one at chrome://extensions/shortcuts)";
}

/** ApplyAgent's bundled practice form (static/demo-form.html). */
export function isPracticeForm(url: string): boolean {
  try {
    return !!url && url.split(/[?#]/)[0] === chrome.runtime.getURL("demo-form.html");
  } catch {
    return false;
  }
}

async function activeTab(): Promise<chrome.tabs.Tab | undefined> {
  if (pinnedTabId !== undefined) return chrome.tabs.get(pinnedTabId).catch(() => undefined);
  const [tab] = await chrome.tabs.query(followWindowId !== undefined ? { active: true, windowId: followWindowId } : { active: true, currentWindow: true });
  return tab;
}

function originPattern(url: string): string | null {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? `${u.protocol}//${u.host}/*` : null;
  } catch {
    return null;
  }
}

/** Clicking the toolbar icon, the shortcut or the right-click menu gives one-time access to the current page
 * (activeTab), even on a site that is not allowed for good. A harmless probe tells whether we have it. */
async function hasOneTimeAccess(tabId: number): Promise<boolean> {
  try {
    await chrome.scripting.executeScript({ target: { tabId }, func: () => true });
    return true;
  } catch {
    return false;
  }
}

interface FramePing {
  form: boolean;
  url: string;
  platform: string;
  handsOff: boolean;
}

/** Ask the tab's frames whether one of them holds an application form. ApplyAgent's page script runs in frames of
 * allowed sites even when the page around them is not allowed (e.g. a Greenhouse form embedded in a company page). */
async function pingFrames(tabId: number): Promise<FramePing | undefined> {
  try {
    return (await chrome.tabs.sendMessage(tabId, { type: "PING" } satisfies Message)) as FramePing | undefined;
  } catch {
    return undefined; // no frame holds a form, or no page script here
  }
}

/** Without the "tabs" permission Chrome shows a tab's address only on allowed sites, or after the user opened
 * ApplyAgent on that page (icon, shortcut or right-click). Everything below works from what is known. */
let pageCheck = 0;
async function refreshPage(): Promise<void> {
  const mine = ++pageCheck;
  const tab = await activeTab();
  if (tab?.id !== undefined && tab.id !== shownTabId && pinnedTabId === undefined) showTab(tab.id, tab.url ?? "");
  const url = tab?.url ?? "";
  const pattern = url ? originPattern(url) : null;
  const allowed = pattern ? await chrome.permissions.contains({ origins: [pattern] }) : false;
  const oneTime = !allowed && !!pattern && tab?.id !== undefined && (await hasOneTimeAccess(tab.id));
  const embedded = !allowed && !oneTime && tab?.id !== undefined ? await pingFrames(tab.id) : undefined;
  const unknownPage = !url && !!tab?.id && !embedded;
  // ApplyAgent's own practice form loads the page script itself (Chrome lets no extension script into its pages).
  const practice = isPracticeForm(url) && !!embedded;
  const handsOff = (!!pattern && isHandsOff(url)) || !!embedded?.handsOff;
  const canFill = (allowed || oneTime || !!embedded) && !handsOff;
  if (mine !== pageCheck) return; // the user moved to another tab meanwhile: that tab's check paints the panel

  $("page-host").textContent = practice ? "ApplyAgent practice form" : pattern ? hostOf(url) : embedded ? `Form from ${hostOf(embedded.url)}` : unknownPage ? "This page" : "No web page";
  // An address stays on one line; a message ("Click the ApplyAgent icon…") wraps so it can be read in full.
  $("page-url").classList.toggle("truncate", !!pattern);
  $("page-url").textContent = practice ? "A safe practice form inside ApplyAgent. Nothing you submit here is sent anywhere."
    : pattern ? url
    : embedded ? "The application form embedded in this page is on a site you allowed."
    : unknownPage ? `Click the ApplyAgent icon${keys.open ? ` (or press ${keys.open})` : ""} while on this page to use ApplyAgent here.`
    : "Open a job application in this window.";
  const access = $("page-access");
  access.textContent = handsOff ? "Hands-off" : practice ? "Practice" : allowed ? "Allowed" : oneTime ? "This visit" : embedded ? "Form allowed" : pattern ? "Not allowed" : "";
  access.className = `chip ${handsOff ? "bad" : allowed || embedded ? "ok" : oneTime ? "info" : "warn"}`;
  access.title = oneTime ? "You opened ApplyAgent on this page, so it may work here until you leave it. Allow the site to use it every time." : "";
  $("permission-box").hidden = allowed || !pattern || handsOff;
  // One fill at a time: while one runs in another tab, this tab's Fill waits for it.
  ($("run") as HTMLButtonElement).disabled = !canFill || agentRunning;
  ($("preview") as HTMLButtonElement).disabled = !canFill || agentRunning;
  void renderUsageMeter({ toast: (m, t) => toast(m, t ?? ""), showPlan: () => showSection("profile") });
  void renderFitCard(tab?.id, canFill, () => showSection("profile"));
  void renderApplyResume(tab?.id, url, canFill);
  await renderDetection(tab, handsOff, embedded, () => mine === pageCheck);
}

/** What the silent detector found on this tab, or why ApplyAgent stays out of it. */
async function renderDetection(tab: chrome.tabs.Tab | undefined, handsOff: boolean, embedded?: FramePing, current: () => boolean = () => true): Promise<void> {
  const box = $("detect-box");
  const openButton = $("open-application") as HTMLButtonElement;
  openButton.hidden = true;
  const show = (tone: "ok" | "warn" | "blocked" | "", iconName: string, title: string, text: string) => {
    box.className = `detect ${tone}`;
    $("detect-icon").replaceChildren(icon(iconName, 18));
    $("detect-title").textContent = title;
    $("detect-text").textContent = text;
    box.hidden = false;
  };
  if (handsOff) {
    const name = embedded?.handsOff ? embedded.platform : platformFor(tab?.url ?? "").name;
    return show("blocked", "shield", `${name} is hands-off`, HANDS_OFF_MESSAGE(name));
  }
  const key = tab?.id !== undefined ? `detect:${tab.id}` : "";
  const stored = key ? ((await chrome.storage.session.get(key))[key] as { detection?: Detection } | undefined) : undefined;
  const d = stored?.detection;
  if (!current()) return;
  if (!d || d.kind === "other") {
    box.hidden = true;
    return;
  }
  if (d.kind === "application_form") {
    const ask = d.ask ?? 0;
    const fill = d.fill ?? 0;
    const text = `ApplyAgent can fill ${fill} of ${d.total ?? fill} fields` +
      (ask ? ` and will ask you ${ask} question${ask === 1 ? "" : "s"}.` : ".") + " Nothing is typed until you press Fill.";
    return show(ask ? "warn" : "ok", ask ? "alert" : "check", "Application form detected", text);
  }
  if (d.kind === "login_wall") {
    return show("warn", "lock", `Sign in to ${d.platform || "this site"} first`,
      "This site asks you to sign in before applying. Sign in yourself (ApplyAgent never handles passwords), then press Fill.");
  }
  show("", "info", d.jobTitle ? `Job page: ${d.jobTitle}` : "Job page",
    d.hasApplyButton ? "The application form isn't open yet. Open it, then press Fill." : "The application form isn't open yet. Find its Apply link on the page.");
  openButton.hidden = !d.hasApplyButton;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitUntilLoaded(tabId: number): Promise<void> {
  await sleep(400);
  for (let i = 0; i < 50; i++) {
    if ((await chrome.tabs.get(tabId).catch(() => undefined))?.status !== "loading") return;
    await sleep(300);
  }
}

/** On a job description page, open its application form the way the user would: the page's own "Apply" link is
 * opened in this tab, or its "Apply" button is pressed (forms that open on the same page). Never "Apply with
 * LinkedIn" and the like, and never a cookie banner: those choices are the user's. */
async function openApplicationForm(): Promise<boolean> {
  const tab = runTabId !== undefined ? await chrome.tabs.get(runTabId).catch(() => undefined) : await activeTab();
  if (tab?.id === undefined) return false;
  const result = (await send({ type: "OPEN_APPLICATION" })) as unknown as { href?: string; clicked?: boolean } | undefined;
  if (result?.href) {
    await chrome.tabs.update(tab.id, { url: result.href });
    await waitUntilLoaded(tab.id);
  } else if (!result?.clicked) {
    return false;
  }
  await sleep(1200); // the form renders a moment after
  return true;
}

/** Ask again a few times: a form opened a moment ago may still be rendering. */
async function sendUntilForm(message: Message, tries = 4): Promise<RunReport | undefined> {
  for (let i = 0; i < tries; i++) {
    const report = await send(message);
    if (report?.fields.length || (report && report.status !== "not_a_form")) return report;
    await sleep(1200);
  }
  return undefined;
}

/** No form on this page: if it is a job description with an Apply button, open the application and try there. */
async function viaApplicationPage(message: Message, report: RunReport | undefined): Promise<RunReport | undefined> {
  if (report && (report.fields.length || report.status !== "not_a_form")) return report;
  runStatus("This is the job description. Opening the application form…", "info");
  // The page we open is the application: no second guess about it (its own "Apply" button may still show).
  return (await openApplicationForm()) ? sendUntilForm(message.type === "RUN" ? { ...message, continuing: true } : message) : report;
}

$("open-application").addEventListener("click", async () => {
  const tab = await activeTab();
  if (tab?.id === undefined) return;
  const result = (await send({ type: "OPEN_APPLICATION" })) as unknown as { href?: string; clicked?: boolean } | undefined;
  if (result?.href) await chrome.tabs.update(tab.id, { url: result.href });
  else if (!result?.clicked) toast("Couldn't find the Apply button. Click it on the page.", "warn");
});
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "session") return;
  void activeTab().then((tab) => {
    if (tab?.id !== undefined && changes[`detect:${tab.id}`]) void refreshPage();
  });
});

$("allow-site").addEventListener("click", async () => {
  const tab = await activeTab();
  const pattern = tab?.url ? originPattern(tab.url) : null;
  if (pattern && (await chrome.permissions.request({ origins: [pattern] }))) {
    toast("Site allowed");
    await refreshPage();
  }
});
/** True while Fill, Preview or Submit runs: a multi-step application may load new pages meanwhile. */
let agentRunning = false;

/** Each tab's last result (round 5: several applications open at once). Switching tabs shows that tab's own
 * fields and questions, never another application's; a tab that loads a new page loses its result. */
type TabResult = { report: RunReport | undefined; url: string; preview?: boolean; live?: LiveField[] };
const tabResults = new Map<number, TabResult>();
/** The tab whose page and results the panel shows now. */
let shownTabId: number | undefined = pinnedTabId;

/** The same page, ignoring the part after # (an address Chrome hides is taken as the same). */
function samePage(a: string, b: string): boolean {
  return !a || !b || a.split("#")[0] === b.split("#")[0];
}

/** A status line from a Fill, Preview or Submit: shown only while the panel shows that run's tab. */
function runStatus(text: string, tone: Tone = "info"): void {
  if (runTabId === undefined || runTabId === shownTabId) setStatus(text, tone);
}

/** Show this tab in the panel: its own last result if its page is still the same, else nothing yet. */
function showTab(tabId: number, url: string): void {
  shownTabId = tabId;
  clearReport();
  const saved = tabResults.get(tabId);
  if (saved && !samePage(saved.url, url)) tabResults.delete(tabId);
  else if (saved) {
    showReport(saved.report, tabId, saved.preview);
    if (!saved.preview && wantsConsent(saved.report)) void loadConsent(tabId);
    void refreshLive(tabId); // the user may have answered fields on the page while another tab was shown
  }
  if (agentRunning && runTabId !== undefined && runTabId !== tabId && !tabResults.has(tabId)) {
    setStatus("ApplyAgent is filling an application in another tab. Press Fill here when it has finished (a few seconds).", "info");
  }
}

/** The page lost its result (it loaded a new page or closed): forget it, and clear the panel if it shows it. */
function forgetTab(tabId: number): void {
  tabResults.delete(tabId);
  if (tabId === shownTabId) clearReport();
}

/** Consent boxes are listed after a fill that did not end the application. */
function wantsConsent(report: RunReport | undefined): boolean {
  return !!report && !report.challenge && report.status !== "submitted_confirmed" && report.status !== "submitted_unconfirmed" && report.status !== "not_a_form";
}

/** Only one Fill, Preview or Submit at a time, so no step can ever land on another application. */
function oneAtATime(): boolean {
  if (!agentRunning) return true;
  toast("Wait a moment: ApplyAgent is still filling another tab.", "warn");
  return false;
}

/** A result belongs to the page it was made on. When the user moves to another tab or page, it is cleared, so the
 * panel never shows one job's answers on another job, and Submit can never act on a page that was not reviewed. */
function clearReport(): void {
  setStatus("");
  $("questions").replaceChildren();
  ($("submit") as HTMLButtonElement).hidden = true;
  $("fields").replaceChildren();
  $("fields-box").hidden = true;
  $("report-problem").hidden = true;
  const exportDiagBtn = document.getElementById("export-diagnostics");
  if (exportDiagBtn) exportDiagBtn.hidden = true;
  lastReport = undefined;
  clearConsent();
}

chrome.tabs.onActivated.addListener((info) => {
  if (panelWindowId !== undefined && info.windowId !== panelWindowId) return; // a tab in another window
  if (pinnedTabId === undefined) showTab(info.tabId, "");
  void refreshPage();
});
chrome.tabs.onRemoved.addListener((id) => {
  tabResults.delete(id);
  applyResumeTabClosed(id); // a resume chosen for this tab's application only
});
/** Page loads per tab ("loading" is reported even where the address is not), to notice a step that loaded a new page. */
const navigations = new Map<number, number>();
chrome.tabs.onUpdated.addListener((id, info) => {
  if (info.status === "loading") {
    navigations.set(id, (navigations.get(id) ?? 0) + 1);
    // A step of a running Fill may load a new page in its own tab: that result is still coming.
    if (!(agentRunning && id === runTabId)) forgetTab(id);
  } else if (info.url && !(agentRunning && id === runTabId)) {
    // The address changed without a page load (one-page sites): a different page is a different form.
    const saved = tabResults.get(id);
    if (saved && !samePage(saved.url, info.url)) forgetTab(id);
  }
  if (info.url && !(agentRunning && id === runTabId)) applyResumeTabMoved(id, info.url); // another job: Profile resume again
  if ((info.url || info.status === "complete") && (id === shownTabId || shownTabId === undefined)) void refreshPage();
});
chrome.runtime.onMessage.addListener((message: Message, sender) => {
  if (message.type === "PANEL_REFRESH") void refreshPage();
  // The user filled something on the application shown: tick it off in the checklist.
  if (message.type === "PAGE_FIELDS_CHANGED" && sender.tab?.id !== undefined && sender.tab.id === shownTabId) void refreshLive(sender.tab.id);
  return false;
});

/** Read the fields of this tab's application again and update its checklist (never while a fill runs). */
async function refreshLive(tabId: number): Promise<void> {
  const saved = tabResults.get(tabId);
  if (agentRunning || !saved?.report?.fields.length || saved.preview) return;
  const result = (await sendToApplication(tabId, { type: "FIELD_STATE" })) as unknown as { fields?: LiveField[] } | undefined;
  if (!Array.isArray(result?.fields) || agentRunning || tabResults.get(tabId) !== saved || tabId !== shownTabId) return;
  saved.live = result.fields;
  renderFields(saved.report, saved.live);
  pruneAnswered(saved.report, saved.live);
}

/** Questions the user has since answered on the page leave "Needs your answer"; when no required field is left,
 * the status says so. */
function pruneAnswered(report: RunReport, live: LiveField[]): void {
  const box = $("questions");
  for (const card of Array.from(box.querySelectorAll<HTMLElement>(".question[data-key]"))) {
    const r = report.fields.find((f) => f.field.key === card.dataset.key && f.field.label === card.dataset.label);
    if (r && rowState(r, live).byYou) card.remove();
  }
  const left = box.querySelectorAll(".question").length;
  const title = box.querySelector(".section-label");
  if (title) {
    if (left) title.textContent = `Needs your answer · ${left}`;
    else title.remove();
  }
  if (report.status === "needs_user" && !report.challenge && !report.captcha && summarize(report.fields, live).left === 0) {
    setStatus("Every required field is filled now. Check the page, then press Next or Submit on it yourself.", "ok");
  }
}
// The profile saved from anywhere (Quick Answers setup, onboarding, a resume) redraws the forms showing it, unless
// the user is typing there: then their Save merges into the stored profile instead (beta 1 wrote an old copy back,
// so gender and the resume "reverted").
let profileRedraw: ReturnType<typeof setTimeout> | undefined;
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes.profile) return;
  clearTimeout(profileRedraw);
  profileRedraw = setTimeout(() => {
    if (!profileDirty && document.getElementById("profile-form")?.childElementCount) void renderProfile();
    if (!quickDirty && document.getElementById("quick-card")?.childElementCount) void renderQuick();
  }, 150);
});

// --- The animated logo ------------------------------------------------------------------------------
type MarkState = "idle" | "working" | "celebrate";
const MARK_SRC: Record<MarkState, string> = {
  idle: "brand/mark.svg", working: "brand/mark-working.svg", celebrate: "brand/mark-celebrate.svg",
};
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
let celebrateUntil = 0;

/** The logo in the header and drawer: it works while the agent works, and celebrates a confirmed application.
 * Still when the system asks for reduced motion. */
function markState(state: MarkState): void {
  if (state === "idle" && Date.now() < celebrateUntil) return; // let the celebration finish
  if (state === "celebrate") {
    celebrateUntil = Date.now() + 1400;
    setTimeout(() => markState("idle"), 1450);
  }
  const src = reducedMotion.matches ? MARK_SRC.idle : MARK_SRC[state];
  document.querySelectorAll<HTMLImageElement>("img.brand-mark").forEach((img) => {
    if (!img.src.endsWith(src)) img.src = src;
  });
}

// The background animates the toolbar icon while a tab is being filled; it follows the same preference.
void chrome.storage.local.set({ reduceMotion: reducedMotion.matches }).catch(() => undefined);
if (reducedMotion.matches) markState("idle");

// --- Apply: running the agent ----------------------------------------------------------------------
function mode(): Mode {
  return (document.querySelector<HTMLInputElement>("input[name='mode']:checked")?.value as Mode) ?? "review";
}

/** The tab a Fill, Preview or Submit started on: every later step of it goes there, even if the user switches tabs
 * meanwhile (a step or a Submit must never land on another application). */
let runTabId: number | undefined;

async function send(message: Message): Promise<RunReport | undefined> {
  const tabId = runTabId ?? (await activeTab())?.id;
  if (tabId === undefined) return undefined;
  if (message.type === "OPEN_APPLICATION") {
    // The job description's Apply button may be in any frame: the first frame that finds one answers.
    await chrome.scripting.executeScript({ target: { tabId, allFrames: true }, files: ["content.js"] }).catch(() => undefined);
    return (await chrome.tabs.sendMessage(tabId, message).catch(() => undefined)) as RunReport | undefined;
  }
  // Only the frame holding the application acts (never a search box on the page around an embedded form).
  // A Fill carries the resume chosen for this tab's application, if any.
  return sendWithResume(tabId, message, (m) => sendToApplication(tabId, m));
}

type Tone = "ok" | "warn" | "bad" | "info";
const TONE_ICON: Record<Tone, string> = { ok: "check", warn: "alert", bad: "alert", info: "info" };

function setStatus(text: string, tone: Tone = "info"): void {
  const box = $("status");
  box.replaceChildren(icon(TONE_ICON[tone], 18), h("span", {}, text));
  box.className = `banner ${tone}`;
  box.hidden = !text;
}

/** The line under a field in the field list: the value it gets (so the user can check it), what the site already
 * put there, or why it was not filled. */
function fieldNote(r: FieldResult): string {
  const value = r.decision.kind === "profile" || r.decision.kind === "answer" || r.decision.kind === "work" || r.decision.kind === "draft" ? r.decision.value
    : r.decision.kind === "resume" ? (r.detail && r.detail !== "would fill" ? r.detail : "your resume file") : "";
  const short = (text: string) => (text.length > 80 ? `${text.slice(0, 79)}…` : text);
  if (r.review) return r.detail ?? "";
  // A value the fact sheet found says where it came from ("from your work history: Acme").
  const source = (r.decision.kind === "profile" || r.decision.kind === "answer") && r.decision.source ? ` (${r.decision.source})` : "";
  if (r.status === "filled" && value) return `→ ${short(value)}${source}`;
  if (r.status === "already_filled") return r.detail ? `Kept what was there: ${short(r.detail)}` : "";
  return r.detail && r.detail !== "would fill" ? r.detail : "";
}

/** Every field of the page, required first, each with its state: click one to go to it on the page (round 5). */
function renderFields(report: RunReport, live?: LiveField[]): void {
  const list = $("fields");
  list.replaceChildren();
  const s = summarize(report.fields, live);
  const group = (title: string, rows: FieldResult[], done: number, folded = false) => {
    if (!rows.length) return;
    const head = h("li", { class: "field-group" }, h("span", {}, title), h("span", { class: "muted" }, `${done} of ${rows.length} filled`));
    list.append(head);
    const items = rows.map((r) => fieldRow(r, live));
    list.append(...items);
    if (!folded) return;
    // Optional fields fold away under the required ones (the list stays short); one click shows them.
    const toggle = h("button", { class: "btn btn-ghost btn-sm field-toggle", type: "button", "aria-expanded": "false" }, `Show ${rows.length} optional`);
    const set = (open: boolean) => {
      for (const item of items) item.hidden = !open;
      toggle.setAttribute("aria-expanded", String(open));
      toggle.textContent = open ? "Hide optional" : `Show ${rows.length} optional`;
      optionalOpen = open;
    };
    toggle.addEventListener("click", () => set(!optionalOpen));
    head.append(toggle);
    set(optionalOpen);
  };
  group("Required", report.fields.filter((r) => r.field.required), s.requiredDone);
  group(s.required ? "Optional" : "Fields", report.fields.filter((r) => !r.field.required), s.optionalDone, s.required > 0);
  $("fields-summary").textContent = headline(s);
  const aiCount = report.fields.filter((r) => (r.understood || r.tag === "drafted") && r.status === "filled").length;
  $("fields-hint").textContent = aiCount
    ? `Click a field to go to it on the page. ${aiCount} marked AI ${aiCount === 1 ? "was" : "were"} answered with the on-device AI: give ${aiCount === 1 ? "it" : "them"} a quick check.`
    : "Click a field to go to it on the page.";
  const bar = $("fields-progress");
  const total = s.required || s.optional;
  const done = s.required ? s.requiredDone : s.optionalDone;
  bar.hidden = !total;
  (bar.firstElementChild as HTMLElement).style.width = `${total ? Math.round((done / total) * 100) : 0}%`;
  bar.classList.toggle("complete", !!total && done === total);
  $("fields-box").hidden = report.fields.length === 0;
}

/** Whether the optional fields are shown (remembered while the panel is open). */
let optionalOpen = false;

const ROW_ICON: Record<string, string> = { ok: "check", info: "check", warn: "alert", bad: "alert", "": "circle" };

function fieldRow(r: FieldResult, live?: LiveField[]): HTMLLIElement {
  const state = rowState(r, live);
  const displayLabel = r.field.originalLabel ? `${r.field.originalLabel} (${r.field.label})` : (r.field.label || "(unlabelled field)");
  const label = h("span", { class: "label" }, displayLabel);
  if (r.field.required) label.append(h("span", { class: "req", "aria-label": "required" }, " *"));
  // ✨ the on-device AI was involved: the question model read an unfamiliar wording, or the answer is an AI draft.
  if ((r.understood || r.tag === "drafted") && !state.byYou) {
    const ai = h("span", { class: "tag ai", title: r.tag === "drafted" ? "Drafted by the on-device AI and approved by you" : "An unfamiliar wording, understood by the on-device AI and answered from your saved data: worth a quick check" });
    ai.append(icon("sparkle", 12), h("span", {}, "AI"));
    label.append(ai);
  }
  if (r.tag === "reused" || (r.decision.kind === "answer" && r.decision.reused)) {
    label.append(h("span", { class: "tag reused", style: "margin-left: 6px; font-size: 10px; color: var(--info); background: var(--info-soft);" }, "reused"));
  }
  const note = state.byYou ? "You filled this on the page." : state.chip === "Empty now" ? "It was filled, but it is empty on the page now." : fieldNote(r);
  if (note) label.append(h("span", { class: "detail" }, note));
  const mark = h("span", { class: `row-mark ${state.tone || "plain"}` });
  mark.append(icon(ROW_ICON[state.tone] ?? "circle", 14));
  // The list item stays a list item (screen readers keep the list); the row inside it is the button.
  const row = h("div", {
    class: `field-row clickable${state.done ? "" : " open"}`, role: "button", tabindex: "0",
    title: "Show this field on the page", "data-key": r.field.key,
  }, mark, label, chip(state.chip, state.tone));
  const go = () => void showField(r);
  row.addEventListener("click", go);
  row.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      go();
    }
  });
  return h("li", { class: "field-item" }, row);
}

/** Go to a field: scroll the page to it, outline it and put the cursor in it; its question card (if any) is shown too. */
async function showField(r: FieldResult): Promise<void> {
  const card = Array.from($("questions").querySelectorAll<HTMLElement>(".question[data-key]"))
    .find((c) => c.dataset.key === r.field.key && c.dataset.label === r.field.label);
  if (card) {
    card.scrollIntoView({ behavior: "smooth", block: "center" });
    card.classList.remove("flash");
    void card.offsetWidth; // restart the animation
    card.classList.add("flash");
  }
  const found = await send({ type: "HIGHLIGHT", label: r.field.label, key: r.field.key }) as unknown as boolean | undefined;
  if (found === false || found === undefined) toast("This field is not on the page any more (the form may have changed).", "warn");
}

function answerInput(r: FieldResult): HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement {
  if (r.field.options.length) {
    const select = h("select", { class: "input", "aria-label": r.field.label });
    if (r.field.control === "checkbox_group") {
      select.multiple = true; // "select all that apply"
      select.size = Math.min(r.field.options.length, 6);
    } else select.append(h("option", { value: "" }, "Choose…"));
    for (const o of r.field.options) select.append(h("option", { value: o }, o));
    return select;
  }
  if (r.field.control === "textarea") return h("textarea", { class: "input", rows: "5", "aria-label": r.field.label });
  return h("input", { class: "input", type: "text", "aria-label": r.field.label });
}

interface CardContext {
  job: { title: string; company: string };
  corrections?: UserCorrection[];
  /** After an answer is saved (re-run the form, or retry waiting queue jobs). */
  onSaved: () => Promise<void>;
  /** Scroll to the field on the page, when the page is open. */
  showOnPage?: () => void;
}

const NEVER_TEXT: Record<string, string> = {
  identity: "never stores or types ID numbers",
  signature: "never signs for you",
};

function questionCard(r: FieldResult, ctx: CardContext): HTMLDivElement {
  const topic = r.decision.kind === "ask" ? r.decision.topic : undefined;
  const sensitive = r.decision.kind === "ask" && r.decision.reason === "sensitive";
  const youOnly = topic !== undefined && NEVER_REMEMBER.has(topic);
  const upload = r.field.control === "file";
  const appliedBefore = isAppliedBeforeQuestion(r.field.label);
  const onPageOnly = youOnly || upload || appliedBefore;
  const why = youOnly ? NEVER_TEXT[topic!]!
    : upload ? "Attach this file yourself on page."
      : appliedBefore ? "Company-specific: answer on the page."
        : sensitive ? "Sensitive question: only you answer this."
          : r.decision.kind === "ask" && r.decision.reason === "missing_profile_value" ? "Missing from your saved profile."
            : r.status === "failed"
              ? (/^the list shows/.test(r.detail ?? "") ? `${r.detail!.replace(/^the list/, "The list on the page")}: choose the right one there.` : "Could not fill on page: please choose it there.")
              : "New question: saved for future forms.";
  const whyRow = h("span", { class: "question-why" });
  whyRow.append(icon(youOnly ? "lock" : appliedBefore ? "lock" : sensitive ? "shield" : upload ? "upload" : "info", 14), h("span", {}, why));
  const card = h("div", { class: `question${sensitive || youOnly || appliedBefore ? " sensitive" : ""}`, "data-key": r.field.key, "data-label": r.field.label },
    h("div", { class: "question-title" }, (r.field.label && questionKey(r.field)) || "(unlabelled field)"), whyRow);
  const foot = h("div", { class: "question-foot" });
  const left = h("div", { class: "button-row" });
  if (ctx.showOnPage) {
    const show = button("Show on page", { variant: "ghost", icon: "external", size: "sm" });
    show.addEventListener("click", ctx.showOnPage);
    left.append(show);
  }
  if (onPageOnly) {
    // Nothing to type here: the user acts on the page itself.
    foot.append(left);
    card.append(foot);
    return card;
  }

  const input = answerInput(r);
  if (r.field.maxLength && !(input instanceof HTMLSelectElement)) input.maxLength = r.field.maxLength;
  card.append(input);
  const limit = input instanceof HTMLSelectElement ? undefined : limitOfField(r.field);
  const counter = input instanceof HTMLSelectElement ? undefined : limitCounter(input, limit);
  if (counter) card.append(counter);
  card.append(...factHints(r, profile, input, (key) => void openQuickAnswer(key)));
  const suggested = findSuggestedCorrection(ctx.corrections ?? [], r.field.label);
  if (suggested && suggested.count === 1 && !onPageOnly) {
    const chipBtn = button(`Use previous correction: "${suggested.answer}"`, {
      variant: "ghost",
      size: "sm",
      icon: "wand",
    });
    chipBtn.style.marginTop = "4px";
    chipBtn.style.marginBottom = "4px";
    chipBtn.addEventListener("click", () => {
      input.value = suggested.answer;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    card.append(chipBtn);
  }
  // >>> L4 ai drafts
  if (isDraftableField(r.field) && r.decision.kind === "ask" && !onPageOnly) {
    const draftWidget = createDraftWidget({
      question: r.field.label,
      field: r.field,
      profile,
      job: ctx.job,
      onUse: async (draftText) => {
        input.value = draftText;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
        r.tag = "drafted";
        save.click();
      },
      toast,
    });
    card.append(draftWidget);
  }
  // <<< L4
  const save = button("Save answer", { variant: "primary", size: "sm", icon: "check" });
  save.addEventListener("click", async () => {
    const value = input instanceof HTMLSelectElement && input.multiple
      ? Array.from(input.selectedOptions, (o) => o.value).join(", ")
      : input.value.trim();
    if (!value) {
      input.focus();
      return;
    }
    if (r.field.maxLength && value.length > r.field.maxLength) {
      toast(`Too long: this field allows ${r.field.maxLength} characters`, "warn");
      input.focus();
      return;
    }
    const fit = checkLength(value, limit);
    if (!fit.ok) {
      toast(`Too long: ${fit.problem}`, "warn");
      input.focus();
      return;
    }
    const entry: AnswerEntry = { question: questionKey(r.field), answer: value, topic, updatedAt: new Date().toISOString() };
    busy(save, true);
    // An answer to a question ApplyAgent asked goes straight to the answer bank; only edits of filled fields are corrections.
    await updateAnswers((answers) => upsertAnswer(answers, entry));
    // A gender, veteran or disability answer also becomes the quick answer (when none is set), so the same question
    // in other words is answered next time instead of asked again.
    const fact = diversityFactFromAnswer(topic, value);
    if (fact) {
      const current = await loadProfile();
      if (!current.facts?.[fact.key]) {
        const facts = { ...EMPTY_FACTS, ...(current.facts ?? {}), [fact.key]: fact.value };
        await saveProfile({ ...current, facts });
      }
    }

    // When the user answers an unknown skill question, add the skill to skillsInventory for future forms:
    const skillTerms = extractTechTerms(r.field.label);
    if (skillTerms.length > 0) {
      const isYes = /^(yes|true|y)\b/i.test(value);
      const yearsNum = parseFloat((value.match(/\b\d+(?:\.\d+)?\b/) || [])[0] ?? "");
      if (isYes || !Number.isNaN(yearsNum)) {
        const prof = await loadProfile();
        const inv = [...(prof.skillsInventory ?? [])];
        for (const term of skillTerms) {
          const existing = inv.find((s) => s.name.toLowerCase() === term.toLowerCase());
          const y = !Number.isNaN(yearsNum) ? yearsNum : 2;
          if (existing) {
            if (!Number.isNaN(yearsNum)) existing.years = yearsNum;
          } else {
            inv.push({ name: term, years: y, level: y >= 5 ? "Advanced" : "Intermediate" });
          }
        }
        await saveProfile({ ...prof, skillsInventory: inv });
        profile = { ...profile, skillsInventory: inv };
      }
    }

    await ctx.onSaved();
    busy(save, false);
  });
  foot.append(left, save);
  card.append(foot);
  return card;
}

/** "Open Quick answers" on a question card: the Answers section, scrolled to that Quick answer. */
async function openQuickAnswer(key: string): Promise<void> {
  showSection("answers");
  if (!focusQuickAnswer(key)) {
    await renderQuick();
    focusQuickAnswer(key);
  }
}

function renderQuestions(report: RunReport): void {
  const box = $("questions");
  box.replaceChildren();
  // Every field that could not be filled is shown, required or not: a dropdown that ended on another option shows a
  // wrong answer on the page until the user fixes it (round 4).
  const pending = report.fields.filter((f) => f.status === "needs_user" || f.status === "failed");
  if (!pending.length) return;
  box.append(h("p", { class: "section-label" }, `Needs your answer · ${pending.length}`));
  const corrections = cachedCorrections;

  const job = { title: report.jobTitle, company: companyFromUrl(report.url) };
  for (const r of pending) {
    box.append(questionCard(r, {
      job,
      corrections,
      onSaved: async () => {
        toast("Answer saved");
        await run(); // re-run: the new answer is filled, nothing else is overwritten
      },
      showOnPage: () => void send({ type: "HIGHLIGHT", label: r.field.label, key: r.field.key }),
    }));
  }
}

/** The last run on this page, for "Report a problem". */
let lastReport: { report: RunReport | undefined; url: string; tabId?: number } | undefined;

function showReport(report: RunReport | undefined, tabId: number | undefined, preview = false): void {
  const before = tabId !== undefined ? tabResults.get(tabId) : undefined;
  const live = before && before.report === report ? before.live : undefined; // the same result shown again keeps its live state
  if (tabId !== undefined) tabResults.set(tabId, { report, url: report?.url ?? before?.url ?? "", preview, live });
  if (tabId !== undefined && shownTabId !== undefined && tabId !== shownTabId) return; // another tab: kept for when it is shown
  lastReport = { report, url: report?.url ?? "", tabId };
  $("report-problem").hidden = false;
  const exportDiagBtn = document.getElementById("export-diagnostics");
  if (exportDiagBtn) exportDiagBtn.hidden = false;
  ($("submit") as HTMLButtonElement).hidden = true;
  $("questions").replaceChildren();
  if (!report) {
    $("fields").replaceChildren();
    $("fields-box").hidden = true;
    setStatus("No application form found on this page. Open the job's application form and try again.", "warn");
    return;
  }
  renderFields(report, live);
  renderQuestions(report);
  if (live) pruneAnswered(report, live);
  // The checklist is the main result: open after a fill, so every field and its state is in view.
  ($("fields-box") as HTMLDetailsElement).open = true;
  switch (report.status) {
    case "submitted_confirmed":
      markState("celebrate");
      setStatus(`Applied. ${report.confirmationText ?? "The employer's site confirmed your application."}`, "ok");
      break;
    case "submitted_unconfirmed":
      setStatus("Submitted, but the site showed no confirmation. Check the page; the tracker marks it 'needs check'.", "warn");
      break;
    case "ready_to_submit":
      if (report.nextStep) {
        setStatus("This page is filled. Check it, press Next (or Continue) on the page yourself, then press Fill again for the next page. ApplyAgent never moves the form on or sends it.", "ok");
        break;
      }
      setStatus(`${report.steps ? `Completed ${report.steps - 1} step${report.steps === 2 ? "" : "s"} and reached the last one. ` : ""}Every required field is filled. Review the form on the page, then submit.`, "ok");
      ($("submit") as HTMLButtonElement).hidden = false;
      break;
    case "needs_user": {
      const parts = [];
      if (report.challenge) {
        parts.push(`ApplyAgent stopped: the site is showing ${report.challenge}. It never solves or gets past these checks. If you want to go on, solve it on the page yourself, then press Fill again.`);
      } else if (report.captcha) parts.push("Solve the CAPTCHA on the page, then press Fill again.");
      if (report.errors.length) parts.push(`The site reported: ${report.errors.join("; ")}`);
      if (report.fields.some((f) => f.status === "needs_user")) parts.push("Answer the questions below, or click a field marked \"Needs you\" to go to it on the page.");
      setStatus(parts.join(" ") || "Some required fields could not be filled.", "warn");
      break;
    }
    default:
      setStatus("No application form found on this page.", "warn");
  }
  if (preview) {
    ($("submit") as HTMLButtonElement).hidden = true; // a preview never leads straight to submitting
    $("questions").replaceChildren();
    const fill = report.fields.filter((f) => f.status === "filled").length;
    const ask = report.fields.filter((f) => f.status === "needs_user").length;
    setStatus(`Preview: would fill ${fill} field${fill === 1 ? "" : "s"} and ask you ${ask} question${ask === 1 ? "" : "s"}. Nothing was typed or uploaded. Each field is listed below.`, "info");
    ($("fields-box") as HTMLDetailsElement).open = true;
    return;
  }
  const reviews = report.fields.filter((f) => f.review).length;
  if (reviews && report.status !== "submitted_confirmed") {
    setStatus(`${$("status").textContent ?? ""} ${reviews} value${reviews === 1 ? "" : "s"} pre-filled by the site differ${reviews === 1 ? "s" : ""} from your profile: check ${reviews === 1 ? "it" : "them"} in the list below before submitting.`, "warn");
    ($("fields-box") as HTMLDetailsElement).open = true;
  }
}

$("back-to-jobs").addEventListener("click", () => showSection("jobs"));

function busy(b: HTMLButtonElement, on: boolean): void {
  b.disabled = on;
  b.classList.toggle("loading", on);
}

const MAX_PAGE_STEPS = 6;


async function run(): Promise<void> {
  if (!oneAtATime()) return;
  // Over the free allowance, still fill (useful) but never auto-submit.
  const runMode = mode() === "auto" && !(await canSubmit()) ? "review" : mode();
  busy($("run"), true);
  ($("submit") as HTMLButtonElement).hidden = true; // no Submit while a fill is under way
  markState("working");
  agentRunning = true;
  const tabId = (await activeTab())?.id ?? -1;
  runTabId = tabId;
  runStatus("Reading the form and filling what it knows…", "info");
  const submittedBefore = (await pendingSubmission(tabId))?.id;
  try {
    // One-time access ends when the page changes: a next step on a site that is not allowed is out of reach.
    const oneTimeOnly = $("page-access").textContent === "This visit";
    let loads = navigations.get(tabId) ?? 0;
    let moved = false;
    // fillOnly: this page only. The panel never presses Next for the user (round 4 report: the form moved on / closed).
    let report = await send({ type: "RUN", mode: runMode, fillOnly: true });
    // No form, and the page did not move on by itself (a "Next" that loads a new page is handled below):
    // it may be the job description, so open the application first. Opening it is not a step of it.
    // Chrome reports a page load a moment after the old page stops answering: wait for it before deciding.
    if (!report) await sleep(900);
    if (!report && (navigations.get(tabId) ?? 0) === loads) {
      report = await viaApplicationPage({ type: "RUN", mode: runMode, fillOnly: true }, report);
      loads = navigations.get(tabId) ?? 0;
    }
    // Some multi-step applications load a whole new page per step, which ends the agent on the old page:
    // carry on with the new page (a few times at most) instead of saying "no form found".
    for (let hop = 0; !report && hop < MAX_PAGE_STEPS; hop++) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const now = navigations.get(tabId) ?? 0;
      if (now === loads) break; // the page did not move on: there really is no form here
      loads = now;
      moved = true;
      // The agent pressed Submit (auto mode) and the site's answer loaded: never fill that page.
      const submitted = await pendingSubmission(tabId);
      if (submitted && submitted.id !== submittedBefore) {
        runStatus("Submitted. Waiting for the employer's confirmation: check the tab or your email.", "info");
        return;
      }
      runStatus("Moved to the next step. Filling it…", "info");
      report = await send({ type: "RUN", mode: runMode, continuing: true, fillOnly: true });
    }
    if (!report && moved && oneTimeOnly) {
      runStatus(`The next step opened on a new page. Click the ApplyAgent icon there${keys.fill ? ` (or press ${keys.fill})` : ""} to continue, or allow the site so it continues by itself.`, "warn");
      return;
    }
    showReport(report, tabId);
    // After a fill: the consent boxes on the page, for the user to read and decide one by one.
    if (tabId === shownTabId && wantsConsent(report)) await loadConsent(tabId);
  } finally {
    agentRunning = false;
    runTabId = undefined;
    busy($("run"), false);
    markState("idle");
    afterRunElsewhere(tabId);
    await refreshPage();
  }
}

/** A run finished in a tab the user left: say so, and redraw the tab they are on (its own result, if any). */
function afterRunElsewhere(tabId: number): void {
  if (shownTabId === undefined || tabId === shownTabId) return;
  void chrome.tabs.get(tabId).then((t) => {
    const where = hostOf(t.url ?? tabResults.get(tabId)?.url ?? "") || "the other tab";
    toast(`Finished on ${where}. Switch back to that tab to see what was filled.`);
  }).catch(() => undefined);
  // The tab on show had only the "filling another tab" line: clear it (its own result, if any, stays as it is).
  if (!tabResults.has(shownTabId)) setStatus("");
}

$("run").addEventListener("click", () => void run());

/** The shortcut (Alt+Shift+F) or the right-click menu asked to fill this tab: do it once, here, where the
 * user sees the questions and the result. Old requests (the panel was closed) are ignored. */
async function runRequested(): Promise<void> {
  const { panelRun } = await chrome.storage.session.get("panelRun");
  const request = panelRun as { tabId: number; at: number } | undefined;
  if (!request) return;
  const tab = await activeTab();
  if (tab?.id !== request.tabId) return;
  await chrome.storage.session.remove("panelRun");
  if (Date.now() - request.at > 15_000) return;
  showSection("apply");
  await refreshPage();
  if (($("run") as HTMLButtonElement).disabled) {
    setStatus(tab.url && isHandsOff(tab.url) ? HANDS_OFF_MESSAGE(platformFor(tab.url).name) : "ApplyAgent can't work on this page.", "warn");
    return;
  }
  await run();
}
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "session" && changes.panelRun?.newValue) void runRequested();
});
$("preview").addEventListener("click", async () => {
  if (!oneAtATime()) return;
  busy($("preview"), true);
  markState("working");
  agentRunning = true;
  const tabId = (await activeTab())?.id;
  runTabId = tabId;
  try {
    const report = await viaApplicationPage({ type: "SCAN" }, await send({ type: "SCAN" }));
    showReport(report, tabId, !!report);
  } finally {
    agentRunning = false;
    runTabId = undefined;
    busy($("preview"), false);
    markState("idle");
    if (tabId !== undefined) afterRunElsewhere(tabId);
    await refreshPage();
  }
});
$("submit").addEventListener("click", async () => {
  if (!oneAtATime()) return;
  if (!(await canSubmit())) return;
  // Submit only the application that was filled and reviewed, in its own tab.
  const filledTab = lastReport?.tabId;
  if (filledTab === undefined || filledTab !== (await activeTab())?.id) {
    setStatus("Go back to the tab you filled to submit it (or press Fill on this one first).", "warn");
    return;
  }
  runTabId = filledTab;
  busy($("submit"), true);
  markState("working");
  setStatus("Submitting and waiting for the employer's confirmation…", "info");
  agentRunning = true;
  try {
    showReport(await send({ type: "SUBMIT" }), filledTab);
  } finally {
    agentRunning = false;
    runTabId = undefined;
    busy($("submit"), false);
    markState("idle");
    afterRunElsewhere(filledTab);
    await refreshPage();
  }
});

// --- Consent review ----------------------------------------------------------------------------------
/** The tab and frame the listed consent boxes belong to: "Tick this box" acts there only. */
let consentTab: number | undefined;
let consentFrameUrl = "";

const CONSENT_TAG: Record<ConsentBox["tag"], [string, string]> = {
  legal: ["Legal — read carefully", "warn"], marketing: ["Marketing", "plain"], consent: ["Consent", "info"],
};

function clearConsent(): void {
  consentTab = undefined;
  consentFrameUrl = "";
  $("consent-list").replaceChildren();
  $("consent-box").hidden = true;
}

function consentMessage(tabId: number, message: Message): Promise<unknown> {
  // The same frame targeting as Fill: only the frame holding the application answers.
  return sendToApplication(tabId, message) as Promise<unknown>;
}

async function loadConsent(tabId: number): Promise<void> {
  const result = (await consentMessage(tabId, { type: "CONSENT_LIST" })) as Partial<ConsentList> & Partial<RunReport> | undefined;
  if (!result || !Array.isArray(result.boxes)) {
    clearConsent();
    return;
  }
  consentTab = tabId;
  consentFrameUrl = result.frameUrl ?? "";
  renderConsent(result.boxes);
}

function renderConsent(boxes: ConsentBox[]): void {
  const list = $("consent-list");
  list.replaceChildren();
  $("consent-box").hidden = boxes.length === 0;
  const open = boxes.filter((b) => !b.checked).length;
  $("consent-summary").textContent = `${boxes.length} found · ${open} not ticked`;
  for (const box of boxes) list.append(consentItem(box));
}

function consentItem(box: ConsentBox): HTMLLIElement {
  const [tagText, tagTone] = CONSENT_TAG[box.tag];
  const textEl = h("p", { class: "consent-text" }, box.label);
  const long = box.label.length > 180;
  if (long) textEl.classList.add("clamped");
  const chips = h("div", { class: "chips" },
    chip(box.required ? "Required by form" : "Optional", box.required ? "warn" : "plain"),
    chip(tagText, tagTone),
    chip(box.checked ? "Ticked" : "Not ticked", box.checked ? "ok" : ""));
  const item = h("li", { class: `consent-item ${box.tag}${box.checked ? " ticked" : ""}`, "data-consent": box.id }, chips, textEl);
  if (box.optOut) item.append(h("span", { class: "consent-note" }, "This box says no: ticking it refuses or opts out."));
  const row = h("div", { class: "button-row" });
  if (long) {
    const more = button("Show full text", { variant: "ghost", size: "sm" });
    more.setAttribute("aria-expanded", "false");
    more.addEventListener("click", () => {
      const clamped = textEl.classList.toggle("clamped");
      more.setAttribute("aria-expanded", String(!clamped));
      more.querySelector("span")!.textContent = clamped ? "Show full text" : "Show less";
    });
    row.append(more);
  }
  const show = button("Show on page", { variant: "ghost", icon: "external", size: "sm" });
  show.addEventListener("click", () => {
    if (consentTab !== undefined) void consentMessage(consentTab, { type: "CONSENT_SHOW", id: box.id });
  });
  row.append(show);
  if (!box.checked) {
    const tick = button("Tick this box", { variant: "secondary", icon: "check", size: "sm", title: "Ticks this one box on the page, nothing else" });
    tick.addEventListener("click", async () => {
      if (consentTab === undefined) return;
      busy(tick, true);
      const result = (await consentMessage(consentTab, {
        type: "CONSENT_TICK", id: box.id, label: box.label, frameUrl: consentFrameUrl,
      })) as Partial<TickResult> & Partial<RunReport> | undefined;
      busy(tick, false);
      if (result?.ok) {
        toast(result.already ? "That box was already ticked" : box.required ? "Ticked that one box. Press Fill again to continue." : "Ticked that one box");
        await loadConsent(consentTab);
        return;
      }
      const reason = result?.reason ?? result?.errors?.[0] ?? "Could not reach the page. Nothing was ticked.";
      toast(reason, "warn");
      setStatus(reason, "warn");
    });
    row.append(tick);
  }
  item.append(row);
  return item;
}

// --- Report a problem --------------------------------------------------------------------------------
$("report-problem").addEventListener("click", async () => {
  const brands = (navigator as Navigator & { userAgentData?: { brands: Array<{ brand: string; version: string }> } }).userAgentData?.brands;
  const browser = brands?.filter((b) => !/not.?a.?brand/i.test(b.brand)).map((b) => `${b.brand} ${b.version}`).join(", ")
    || (/Chrome\/[\d.]+/.exec(navigator.userAgent)?.[0] ?? "unknown");
  const text = buildDiagnostic(lastReport?.report, {
    version: chrome.runtime.getManifest().version, browser, when: new Date().toISOString(), url: lastReport?.url,
  }, await loadProfile());
  let copied = false;
  try {
    await navigator.clipboard.writeText(text);
    copied = true;
  } catch {
    // no clipboard access: save it as a file instead
    const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    const link = h("a", { href: url, download: "applyagent-problem-report.json" });
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
  if (SUPPORT_EMAIL) {
    const host = hostOf(lastReport?.url ?? "") || "a page";
    window.open(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`ApplyAgent problem on ${host}`)}&body=${encodeURIComponent("Paste the copied report here, and tell us what went wrong:\n\n")}`);
  }
  toast(copied
    ? "Report copied. Paste it into your message to the ApplyAgent team. It has the questions and decisions, never your answers."
    : "Report saved as a file. Send it to the ApplyAgent team. It has the questions and decisions, never your answers.");
});

const exportDiagBtnEl = document.getElementById("export-diagnostics");
if (exportDiagBtnEl) {
  exportDiagBtnEl.addEventListener("click", async () => {
    const brands = (navigator as Navigator & { userAgentData?: { brands: Array<{ brand: string; version: string }> } }).userAgentData?.brands;
    const browser = brands?.filter((b) => !/not.?a.?brand/i.test(b.brand)).map((b) => `${b.brand} ${b.version}`).join(", ")
      || (/Chrome\/[\d.]+/.exec(navigator.userAgent)?.[0] ?? "unknown");
    const text = buildDiagnostic(lastReport?.report, {
      version: chrome.runtime.getManifest().version, browser, when: new Date().toISOString(), url: lastReport?.url,
    }, await loadProfile());
    saveDiagnosticFile(text, document);
    toast("Diagnostics exported to local file. Contains questions and decisions only, zero personal data.");
  });
}

// >>> L3 form structure
const formStructBtn = document.getElementById("save-form-structure") as HTMLElement | null;
if (formStructBtn) {
  const problemBtn = $("report-problem");
  if (problemBtn) {
    const observer = new MutationObserver(() => {
      formStructBtn.hidden = problemBtn.hidden;
    });
    observer.observe(problemBtn, { attributes: true, attributeFilter: ["hidden"] });
  }
  mountFormStructureButton(formStructBtn, async () => {
    try {
      const tab = await activeTab();
      if (tab?.id !== undefined) {
        const resp = await chrome.tabs.sendMessage(tab.id, { type: "GET_FORM_STRUCTURE" } satisfies Message);
        if (resp && !("error" in resp) && resp.fields) return resp;
      }
    } catch {}
    if (lastReport?.report) {
      const urlStr = lastReport.url || "https://example.com";
      let domain = "unknown";
      let path = "";
      try {
        const u = new URL(urlStr);
        domain = u.hostname;
        path = u.pathname;
      } catch {}
      return {
        version: 1,
        savedAt: new Date().toISOString(),
        platform: lastReport.report.platform,
        domain,
        path,
        jobTitle: lastReport.report.jobTitle,
        actionText: undefined,
        fieldCount: lastReport.report.fields.length,
        fields: lastReport.report.fields.map((f) => ({
          label: f.field.label,
          originalLabel: f.field.originalLabel,
          control: f.field.control,
          required: !!f.field.required,
          name: f.field.name,
          options: f.field.options,
          section: f.field.section,
          workBlock: f.field.workBlock,
        })),
      };
    }
    return null;
  }, toast);
}
// <<< L3

// --- Profile -----------------------------------------------------------------------------------------
const PROFILE_GROUPS: Array<{ title: string; fields: Array<[ProfileKey, string, string, boolean?]> }> = [
  { title: "Personal", fields: [
    ["firstName", "First name", "text"], ["lastName", "Last name", "text"], ["email", "Email", "email"],
    ["phone", "Phone", "tel"], ["country", "Country", "text"], ["state", "State / Province", "text"], ["location", "City", "text"],
  ] },
  { title: "Address & Location", fields: [
    ["addressLine1", "Address line 1", "text", true],
    ["addressLine2", "Address line 2 (apt, suite)", "text", true],
    ["postalCode", "Postal / ZIP code", "text"],
    ["timezone", "Timezone (e.g. IST, UTC)", "text"],
  ] },
  { title: "Links", fields: [
    ["linkedin", "LinkedIn URL", "url", true], ["github", "GitHub URL", "url"], ["portfolio", "Portfolio / website", "url"],
    ["resumeUrl", "Resume Drive / Cloud link", "url", true],
  ] },
  { title: "Experience & education", fields: [
    ["currentTitle", "Current title", "text"], ["currentCompany", "Current company", "text"],
    ["experienceYears", "Total years of experience", "text"], ["graduationYear", "Graduation year", "text"],
    ["school", "School / university", "text", true], ["degree", "Degree", "text"],
    ["educationLevel", "Education level (e.g. Bachelor's, Master's)", "text"],
    ["discipline", "Field of study", "text"],
  ] },
  { title: "Job preferences", fields: [
    ["targetRoles", "Target roles (comma-separated)", "text", true],
    ["preferredLocations", "Preferred locations (e.g. Bangalore, Remote)", "text", true],
    ["skills", "Key skills (comma-separated)", "text", true],
  ] },
];
const PROFILE_KEYS = PROFILE_GROUPS.flatMap((g) => g.fields.map(([key]) => key));

/** What each field looks like (placeholder) and which form questions it answers, so nothing is a guess. */
const FIELD_HELP: Partial<Record<ProfileKey, [example: string, answers: string]>> = {
  firstName: ["e.g. Priya", "First name / Given name"],
  lastName: ["e.g. Sharma", "Last name / Surname / Family name"],
  email: ["e.g. priya.sharma@gmail.com", "Email; the employer writes to it"],
  phone: ["e.g. +91 98765 43210", "Phone / Mobile, with your country code"],
  location: ["e.g. Bengaluru", "City / \"Where are you based?\" / Current location"],
  country: ["e.g. India", "Country of residence; choose from the list"],
  addressLine1: ["e.g. 12, 4th Cross, Indiranagar", "Street address (only forms that ask for an address)"],
  addressLine2: ["e.g. Flat 302, Green Residency", "Apartment / suite (optional)"],
  state: ["e.g. Karnataka", "State / Province / Region"],
  postalCode: ["e.g. 560038", "PIN / ZIP / Postal code"],
  timezone: ["e.g. IST or Asia/Kolkata", "Time zone questions (mostly remote roles)"],
  linkedin: ["e.g. linkedin.com/in/priya-sharma", "LinkedIn profile URL"],
  github: ["e.g. github.com/priyasharma", "GitHub URL (your profile, not a repository)"],
  portfolio: ["e.g. priyasharma.dev", "Website / Portfolio / Personal site"],
  resumeUrl: ["e.g. https://drive.google.com/file/d/…/view", "\"Link to your resume\" (set sharing to anyone with the link)"],
  currentTitle: ["e.g. Software Engineer (or leave empty if a student)", "Current job title"],
  currentCompany: ["e.g. Infosys", "Current employer / company"],
  experienceYears: ["e.g. 0 (fresher) or 2.5", "Total years of experience, and year brackets like \"0-1\" or \"3-5\""],
  graduationYear: ["e.g. 2026 (expected year if still studying)", "Graduation year / Year of passing"],
  school: ["e.g. IIT Jodhpur", "School / College / University"],
  degree: ["e.g. M.Tech", "Degree"],
  educationLevel: ["e.g. Bachelor's (highest COMPLETED)", "Highest level of education"],
  discipline: ["e.g. Computer Science", "Field of study / Major / Branch"],
  targetRoles: ["e.g. Software Engineer, ML Engineer", "Used by Jobs to find and rank roles (not filled into forms)"],
  preferredLocations: ["e.g. Bengaluru, Hyderabad, Remote", "Used by Jobs to find roles (not filled into forms)"],
  skills: ["e.g. Python, SQL, PyTorch", "Skills questions and job matching"],
};
let profile: Profile = { ...EMPTY_PROFILE };
const MAX_RESUME_BYTES = 5 * 1024 * 1024;

function showResume(text: string, hasFile: boolean): void {
  $("resume-name").textContent = text;
  $("resume").closest(".dropzone")?.classList.toggle("has-file", hasFile);
  $("read-resume-btn").hidden = !hasFile;
}

/** Asks before the resume is read for profile details. Unsaved Profile edits are saved first (an import redraws the
 * form). Resolves true when the user said yes and nothing is left unsaved. */
function askToReadResume(fileName: string): Promise<boolean> {
  const dialog = $("resume-review-dialog") as HTMLDialogElement;
  return new Promise((resolve) => {
    const yes = button("Yes, show me what it found", { variant: "primary", size: "sm" });
    const no = button("No thanks", { variant: "ghost", size: "sm" });
    yes.id = "resume-read-yes";
    no.id = "resume-read-no";
    dialog.replaceChildren(h("div", { class: "dialog-body stack", style: "padding: 16px;" },
      h("h3", {}, "Fill your profile from your resume?"),
      h("p", { class: "hint" }, `Resume saved: ${fileName}. ApplyAgent can read it on this device and suggest details for your profile. Nothing is imported until you tick it.`),
      ...(profileDirty ? [h("p", { class: "hint warn" }, "Your unsaved Profile changes will be saved first, so nothing you typed is lost.")] : []),
      h("div", { class: "button-row" }, yes, no)));
    let answered = false;
    const done = (v: boolean) => {
      answered = true;
      dialog.close();
      resolve(v);
    };
    yes.addEventListener("click", async () => {
      if (profileDirty && !(await saveProfileForm())) {
        done(false);
        toast("Fix the marked Profile fields and save, then press \"Suggest details from my resume\".", "bad");
        return;
      }
      done(true);
    });
    no.addEventListener("click", () => done(false));
    dialog.addEventListener("close", () => { if (!answered) resolve(false); }, { once: true });
    dialog.showModal();
  });
}

/** The import review: nothing ticked, every value with its resume line; saves only what the user ticks. */
async function openResumeReview(parsed: import("../shared/resume-parse").ParsedResume): Promise<void> {
  const { createResumeReviewElement } = await import("./resume-import");
  const dialog = $("resume-review-dialog") as HTMLDialogElement;
  const before = await loadProfile();
  dialog.replaceChildren(createResumeReviewElement(parsed, before, async (updated) => {
    const changed = JSON.stringify(updated) !== JSON.stringify(before);
    if (changed) {
      // Merged onto the stored profile: anything saved while the review was open is kept.
      const latest = await loadProfile();
      const merged = { ...latest } as Record<string, unknown>;
      for (const [k, v] of Object.entries(updated)) if (JSON.stringify(v) !== JSON.stringify((before as unknown as Record<string, unknown>)[k])) merged[k] = v;
      profile = merged as unknown as Profile;
      await saveProfile(profile);
    }
    dialog.close();
    await renderProfile();
    toast(changed ? "Imported the values you ticked. Check them in Profile." : "Nothing was imported", changed ? "ok" : "warn");
  }, () => dialog.close()));
  dialog.showModal();
}

async function readStoredResume(): Promise<void> {
  const stored = (await loadProfile()).resume;
  if (!stored) return;
  if (!(await askToReadResume(stored.name))) return;
  try {
    const { parseResumeFromBuffer } = await import("./resume-import");
    const bytes = Uint8Array.from(atob(stored.dataBase64), (c) => c.charCodeAt(0));
    const parsed = await parseResumeFromBuffer(stored.name, bytes);
    await openResumeReview(parsed);
  } catch (err) {
    console.error("Resume parse error:", err);
    toast("Could not read details from this resume", "warn");
  }
}
$("read-resume-btn").addEventListener("click", () => void readStoredResume());

/** True while the user has typed in the Profile form and not saved: a change saved elsewhere (Quick Answers, the
 * resume) then does not redraw the form under them. */
let profileDirty = false;
const FIELD_LISTS: Partial<Record<ProfileKey, string>> = { location: "city-suggestions", country: "country-list", state: "state-list", timezone: "timezone-list" };
/** Fields whose note is shown: ones with a value when the form was drawn, ones the user has left, and all of them
 * after a Save. A half-typed email is not flagged while the user is still typing it. */
const touchedKeys = new Set<string>();

function ensureDatalist(id: string, values: readonly string[]): HTMLElement {
  let list = document.getElementById(id);
  if (!list) {
    list = h("datalist", { id });
    document.body.append(list);
  }
  if (list.childElementCount !== values.length) list.replaceChildren(...values.map((v) => h("option", { value: v })));
  return list;
}

/** The Profile form's values, as the checks read them. */
function profileFormValues(): ProfileValues {
  const values: ProfileValues = {};
  for (const key of PROFILE_KEYS) values[key] = document.querySelector<HTMLInputElement>(`#profile-form input[name='${key}']`)?.value ?? "";
  values.educationStatus = document.querySelector<HTMLSelectElement>("#education-status")?.value ?? "";
  return values;
}

/** Shows each field's problem under it; returns every problem (shown or not). */
function refreshFieldNotes(showAll = false): FieldIssue[] {
  const issues = validateProfile(profileFormValues());
  document.querySelectorAll<HTMLElement>("#profile-form [data-note-for]").forEach((note) => {
    const key = note.dataset.noteFor!;
    const input = document.querySelector<HTMLInputElement>(`#profile-form input[name='${key}']`);
    const issue = issues.find((i) => i.key === key && i.level === "error") ?? issues.find((i) => i.key === key);
    const show = !!issue && (showAll || touchedKeys.has(key));
    note.textContent = show ? issue!.text : "";
    note.classList.toggle("bad", show && issue!.level === "error");
    note.classList.toggle("warn", show && issue!.level === "warn");
    if (show && issue!.level === "error") input?.setAttribute("aria-invalid", "true");
    else input?.removeAttribute("aria-invalid");
  });
  return issues;
}

async function renderProfile(): Promise<void> {
  profile = await loadProfile();
  profileDirty = false;
  const form = $("profile-form");
  form.replaceChildren();

  const candidateProfiles = await loadCandidateProfiles();
  if (candidateProfiles.length > 1) {
    const select = h("select", { class: "input" });
    for (const cp of candidateProfiles) {
      const opt = h("option", { value: cp.id }, `${cp.name}${cp.targetRole ? ` · ${cp.targetRole}` : ""}`);
      if (cp.profile.email === profile.email && cp.profile.targetRoles === profile.targetRoles) opt.selected = true;
      select.append(opt);
    }
    select.addEventListener("change", async () => {
      await switchProfile((select as HTMLSelectElement).value);
      toast("Persona switched");
      await renderProfile();
    });
    form.append(h("div", { class: "card profile-switch-card" },
      h("div", { class: "card-head" }, h("h2", {}, "Active Persona"), h("span", { class: "chip accent" }, "Pro")),
      h("label", { class: "field-label" }, "Switch Candidate Profile", select),
    ));
  }

  for (const group of PROFILE_GROUPS) {
    const grid = h("div", { class: "form-grid" });
    for (const [key, label, type, full] of group.fields) {
      // Links are typed as text: the browser's own URL check would reject "linkedin.com/in/x"; ApplyAgent checks them.
      // Typed as text: the browser's own checks (email, url) are replaced by ApplyAgent's, which explain the problem.
      const input = h("input", { class: "input", type: type === "tel" ? "tel" : "text", name: key, autocomplete: "off" }) as HTMLInputElement;
      input.value = profile[key] ?? "";
      const list = FIELD_LISTS[key];
      if (list) input.setAttribute("list", list);
      if (key === "graduationYear" || key === "experienceYears") input.inputMode = "decimal";
      const help = FIELD_HELP[key];
      if (help) input.placeholder = help[0];
      const wrap = h("label", { class: `field-label${full ? " span-2" : ""}` }, label, input,
        ...(help ? [h("span", { class: "field-help muted" }, `Answers: ${help[1]}`)] : []));
      // One note per field: what is wrong (red, blocks saving) or worth a second look (amber).
      wrap.append(h("span", { class: "field-note", "data-note-for": key, role: "status", ...(key === "location" ? { id: "city-note" } : {}) }));
      grid.append(wrap);
    }
    if (group.title === "Experience & education") {
      const status = h("select", { class: "input", id: "education-status", name: "educationStatus" },
        h("option", { value: "" }, "Not set (forms will ask)"),
        h("option", { value: "completed" }, EDUCATION_STATUS_OPTIONS.completed),
        h("option", { value: "pursuing" }, EDUCATION_STATUS_OPTIONS.pursuing)) as HTMLSelectElement;
      status.value = profile.educationStatus ?? "";
      grid.append(h("label", { class: "field-label span-2" }, "Are you still studying?", status,
        h("span", { class: "muted" }, "Answers \"Are you currently enrolled?\" and \"Have you completed your degree?\". Education level above = highest level you have COMPLETED.")));
    }
    form.append(h("div", { class: "card" }, h("div", { class: "card-head" }, h("h2", {}, group.title)), grid));
  }
  ensureDatalist("country-list", allCountryNames());
  ensureDatalist("timezone-list", timezoneChoices());
  mountPlaces(); // Country → State → City suggestion lists (src/sidepanel/profile-places.ts)
  // Saved values are checked straight away, so a bad value saved before (or imported) shows its note.
  touchedKeys.clear();
  for (const key of PROFILE_KEYS) if ((profile[key] ?? "").trim()) touchedKeys.add(key);
  refreshFieldNotes();
  form.append(skillsCard(profile.skillsInventory ?? [], profile.skillsComplete ?? false));
  form.append(languagesCard(profile.languages ?? [], profile.languagesComplete ?? false));
  form.append(workCard(profile.workHistory ?? []));
  showResume(profile.resume ? profile.resume.name : "Upload your resume (PDF or DOCX, max 5 MB)", !!profile.resume);
}

// --- Work history (for repeating "My Experience" sections) ------------------------------------------------
const MAX_JOBS = 6;

function workRow(entry: WorkEntry, index: number): HTMLElement {
  const field = (name: keyof WorkEntry, label: string, type = "text", full = false) => {
    const input = h("input", { class: "input", type, "data-work": name, autocomplete: "off" }) as HTMLInputElement;
    input.value = String(entry[name] ?? "");
    return h("label", { class: `field-label${full ? " span-2" : ""}` }, label, input);
  };
  const current = h("input", { type: "checkbox", "data-work": "current" }) as HTMLInputElement;
  current.checked = entry.current;
  const summary = h("textarea", { class: "input", rows: "2", "data-work": "summary", "aria-label": "What you did (optional)" }) as HTMLTextAreaElement;
  summary.value = entry.summary;
  const remove = iconButton("trash", `Remove job ${index + 1}`, true);
  const row = h("div", { class: "work-row", "data-work-row": String(index) },
    h("div", { class: "item-top" }, h("strong", {}, index === 0 ? "Most recent job" : `Job ${index + 1}`), remove),
    h("div", { class: "form-grid" },
      field("title", "Job title"), field("company", "Company"), field("location", "Location", "text", true),
      field("start", "From", "month"), field("end", "To", "month"),
      h("label", { class: "check-label span-2" }, current, "I currently work here"),
      h("label", { class: "field-label span-2" }, "What you did (optional)", summary)));
  const end = row.querySelector<HTMLInputElement>("[data-work='end']")!;
  const sync = () => (end.disabled = current.checked);
  current.addEventListener("change", sync);
  sync();
  remove.addEventListener("click", () => {
    const card = row.closest(".card")!;
    row.remove();
    renumberWork(card);
  });
  return row;
}

function renumberWork(card: Element): void {
  card.querySelectorAll<HTMLElement>(".work-row").forEach((row, i) => {
    row.dataset.workRow = String(i);
    row.querySelector(".item-top strong")!.textContent = i === 0 ? "Most recent job" : `Job ${i + 1}`;
  });
  (card.querySelector("#add-job") as HTMLButtonElement).disabled = card.querySelectorAll(".work-row").length >= MAX_JOBS;
}

function workCard(entries: WorkEntry[]): HTMLElement {
  const list = h("div", { class: "stack", id: "work-list" });
  entries.forEach((e, i) => list.append(workRow(e, i)));
  const add = button("Add a job", { variant: "ghost", icon: "plus", size: "sm" });
  add.id = "add-job";
  const completeCheck = h("input", { type: "checkbox", id: "work-history-complete" }) as HTMLInputElement;
  completeCheck.checked = !!profile.workHistoryComplete;
  const card = h("div", { class: "card" },
    h("div", { class: "card-head" }, h("h2", {}, "Work history"), h("span", { class: "muted" }, "Newest first")),
    h("p", { class: "hint" }, "Used for \"Work experience\" sections that ask for each job. Without it, your current job above is used."),
    list, add,
    h("label", { class: "check-label span-2", style: "margin-top: 10px; display: flex; align-items: center; gap: 8px;" },
      completeCheck, "My work history is complete (answer \"No\" to previous employer checks)"));
  add.addEventListener("click", () => {
    list.append(workRow({ title: "", company: "", location: "", start: "", end: "", current: false, summary: "" }, list.children.length));
    renumberWork(card);
    list.lastElementChild?.querySelector<HTMLInputElement>("input")?.focus();
  });
  queueMicrotask(() => renumberWork(card));
  return card;
}

function skillsCard(entries: SkillEntry[] = [], isComplete = false): HTMLElement {
  const list = h("div", { class: "stack", id: "skills-list" });
  const row = (name = "", years: number | "" = "", level = "") => {
    const nameInput = h("input", { class: "input", type: "text", "data-skill": "name", placeholder: "Skill name (e.g. Python)", autocomplete: "off" }) as HTMLInputElement;
    nameInput.value = name;
    const yearsInput = h("input", { class: "input", type: "number", min: "0", max: "50", step: "0.5", "data-skill": "years", placeholder: "Years" }) as HTMLInputElement;
    yearsInput.value = String(years);
    const levelSelect = h("select", { class: "input", "data-skill": "level" },
      h("option", { value: "" }, "Not set"),
      h("option", { value: "Beginner" }, "Beginner"),
      h("option", { value: "Intermediate" }, "Intermediate"),
      h("option", { value: "Advanced" }, "Advanced"),
      h("option", { value: "Expert" }, "Expert"),
    ) as HTMLSelectElement;
    levelSelect.value = level;
    const remove = iconButton("trash", "Remove skill", true);
    const wrap = h("div", { class: "work-row skill-row", style: "display: grid; grid-template-columns: 2fr 1fr 1.5fr auto; gap: 8px; align-items: end;" },
      h("label", { class: "field-label" }, "Skill", nameInput),
      h("label", { class: "field-label" }, "Years", yearsInput),
      h("label", { class: "field-label" }, "Proficiency", levelSelect),
      remove,
    );
    remove.addEventListener("click", () => wrap.remove());
    return wrap;
  };
  entries.forEach((s) => list.append(row(s.name, s.years, ["Beginner", "Intermediate", "Advanced", "Expert"].includes(s.level ?? "") ? s.level : "")));

  const add = button("Add skill", { variant: "ghost", icon: "plus", size: "sm" });
  add.id = "add-skill";
  add.addEventListener("click", () => {
    const newRow = row();
    list.append(newRow);
    newRow.querySelector<HTMLInputElement>("input")?.focus();
  });

  const completeCheck = h("input", { type: "checkbox", id: "skills-complete" }) as HTMLInputElement;
  completeCheck.checked = isComplete;

  return h("div", { class: "card" },
    h("div", { class: "card-head" }, h("h2", {}, "Skills inventory"), h("span", { class: "muted" }, "Technical skills")),
    h("p", { class: "hint" }, "Exact skills and years. Used to answer technical knockout and experience questions honestly."),
    list,
    h("div", { class: "button-row" }, add),
    h("label", { class: "check-label span-2", style: "margin-top: 10px; display: flex; align-items: center; gap: 8px;" },
      completeCheck, "My skills list is complete (answer \"No\" to unlisted skills)"),
  );
}

function languagesCard(entries: LanguageEntry[] = [], isComplete = false): HTMLElement {
  const list = h("div", { class: "stack", id: "languages-list" });
  const row = (language = "", proficiency = "") => {
    const langInput = h("input", { class: "input", type: "text", "data-lang": "name", placeholder: "Language (e.g. English)", autocomplete: "off" }) as HTMLInputElement;
    langInput.value = language;
    const profSelect = h("select", { class: "input", "data-lang": "proficiency" },
      h("option", { value: "" }, "Choose level…"),
      h("option", { value: "Native" }, "Native"),
      h("option", { value: "Fluent" }, "Fluent"),
      h("option", { value: "Professional" }, "Advanced (professional)"),
      h("option", { value: "Conversational" }, "Intermediate (conversational)"),
      h("option", { value: "Basic" }, "Beginner (basic)"),
    ) as HTMLSelectElement;
    profSelect.value = proficiency;
    const remove = iconButton("trash", "Remove language", true);
    const wrap = h("div", { class: "work-row lang-row", style: "display: grid; grid-template-columns: 2fr 2fr auto; gap: 8px; align-items: end;" },
      h("label", { class: "field-label" }, "Language", langInput),
      h("label", { class: "field-label" }, "Proficiency", profSelect),
      remove,
    );
    remove.addEventListener("click", () => wrap.remove());
    return wrap;
  };
  entries.forEach((l) => list.append(row(l.language, l.proficiency)));

  const add = button("Add language", { variant: "ghost", icon: "plus", size: "sm" });
  add.id = "add-language";
  add.addEventListener("click", () => {
    const newRow = row();
    list.append(newRow);
    newRow.querySelector<HTMLInputElement>("input")?.focus();
  });

  const completeCheck = h("input", { type: "checkbox", id: "languages-complete" }) as HTMLInputElement;
  completeCheck.checked = isComplete;

  return h("div", { class: "card" },
    h("div", { class: "card-head" }, h("h2", {}, "Languages"), h("span", { class: "muted" }, "Languages you speak")),
    list,
    h("div", { class: "button-row" }, add),
    h("label", { class: "check-label span-2", style: "margin-top: 10px; display: flex; align-items: center; gap: 8px;" },
      completeCheck, "My languages list is complete (answer \"No\" to unlisted languages)"),
  );
}

function readSkillsInventoryFromUI(): SkillEntry[] {
  return Array.from(document.querySelectorAll<HTMLElement>("#skills-list .skill-row")).map((row) => {
    const name = row.querySelector<HTMLInputElement>("[data-skill='name']")?.value.trim() ?? "";
    const years = parseFloat(row.querySelector<HTMLInputElement>("[data-skill='years']")?.value ?? "") || 0;
    const level = row.querySelector<HTMLSelectElement>("[data-skill='level']")?.value ?? "";
    return level ? { name, years, level } : { name, years };
  }).filter((s) => s.name);
}

function readLanguagesFromUI(): LanguageEntry[] {
  return Array.from(document.querySelectorAll<HTMLElement>("#languages-list .lang-row")).map((row) => {
    const language = row.querySelector<HTMLInputElement>("[data-lang='name']")?.value.trim() ?? "";
    const proficiency = (row.querySelector<HTMLSelectElement>("[data-lang='proficiency']")?.value ?? "") as LanguageEntry["proficiency"];
    return { language, proficiency };
  }).filter((l) => l.language && l.proficiency);
}

function readWorkHistory(): WorkEntry[] {
  return Array.from(document.querySelectorAll<HTMLElement>("#work-list .work-row")).map((row) => {
    const value = (name: string) => row.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[data-work='${name}']`)?.value.trim() ?? "";
    const current = row.querySelector<HTMLInputElement>("[data-work='current']")?.checked ?? false;
    return { title: value("title"), company: value("company"), location: value("location"), start: value("start"),
      end: current ? "" : value("end"), current, summary: value("summary") };
  }).filter((w) => w.title || w.company);
}

$("profile-form").addEventListener("submit", (e) => e.preventDefault());
$("resume").addEventListener("change", async (event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  if (file.size > MAX_RESUME_BYTES) {
    toast("That file is larger than 5 MB", "bad");
    return;
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  const resume = { name: file.name, type: file.type || "application/octet-stream", dataBase64: btoa(binary) };
  // Saved now: a resume shown in the panel is always the one forms get (beta 1 kept it unsaved until "Save profile").
  await saveProfile({ ...(await loadProfile()), resume });
  profile.resume = resume;
  showResume(file.name, true);
  toast("Resume saved");
  // Reading it for profile details is a separate choice (asked, never assumed).
  await readStoredResume();
});

const pasteDialog = $("paste-resume-dialog") as HTMLDialogElement | null;
const pasteBtn = $("paste-resume-btn");
if (pasteBtn && pasteDialog) {
  pasteBtn.addEventListener("click", () => {
    const ta = $("paste-resume-text") as HTMLTextAreaElement | null;
    if (ta) ta.value = "";
    pasteDialog.showModal();
  });
  $("paste-resume-close")?.addEventListener("click", () => pasteDialog.close());
  $("paste-resume-cancel")?.addEventListener("click", () => pasteDialog.close());
  $("paste-resume-parse")?.addEventListener("click", async () => {
    const raw = ($("paste-resume-text") as HTMLTextAreaElement)?.value?.trim() ?? "";
    if (!raw) {
      toast("Please paste resume text first", "warn");
      return;
    }
    pasteDialog.close();
    try {
      // Pasting is the request to read it; unsaved Profile edits are saved first, as for an upload.
      if (profileDirty && !(await saveProfileForm())) return;
      const { parseResume } = await import("../shared/resume-parse");
      await openResumeReview(parseResume(raw));
    } catch (err) {
      console.error("Resume parse error:", err);
      toast("Could not parse resume text", "warn");
    }
  });
}

/** What stops the Profile form from being saved: a link that isn't one, a skill without years, a language without
 * a level (ApplyAgent never fills a guessed value). Marks each problem on the form. */
function profileProblems(): Array<{ text: string; el: HTMLElement }> {
  const problems: Array<{ text: string; el: HTMLElement }> = [];
  for (const issue of refreshFieldNotes(true)) {
    if (issue.level !== "error") continue;
    const input = document.querySelector<HTMLInputElement>(`#profile-form input[name='${issue.key}']`);
    if (input) problems.push({ text: issue.text, el: input });
  }
  document.querySelectorAll<HTMLElement>("#skills-list .skill-row").forEach((row) => {
    const name = row.querySelector<HTMLInputElement>("[data-skill='name']")?.value.trim() ?? "";
    const years = row.querySelector<HTMLInputElement>("[data-skill='years']");
    if (name && years && !years.value.trim()) problems.push({ text: `Add your years of ${name} (0 is fine), or remove it.`, el: years });
  });
  document.querySelectorAll<HTMLElement>("#languages-list .lang-row").forEach((row) => {
    const name = row.querySelector<HTMLInputElement>("[data-lang='name']")?.value.trim() ?? "";
    const level = row.querySelector<HTMLSelectElement>("[data-lang='proficiency']");
    if (name && level && !level.value) problems.push({ text: `Choose how well you speak ${name}.`, el: level });
  });
  return problems;
}

$("profile-form").addEventListener("input", (e) => {
  profileDirty = true;
  const name = (e.target as HTMLInputElement).name;
  if (name === "country" || name === "state") refreshPlaceLists();
  // While typing, a shown note updates or goes away; a new problem waits until the field is left.
  if (name) refreshFieldNotes();
});
$("profile-form").addEventListener("change", (e) => {
  profileDirty = true;
  const name = (e.target as HTMLInputElement).name;
  if (name) touchedKeys.add(name);
  // A new country or state clears a state / city that belongs elsewhere (with a note under City).
  if (name === "country" || name === "state") linkPlaces(name);
  if (name === "country" || name === "educationStatus") {
    const values = profileFormValues();
    for (const k of ["state", "postalCode", "phone", "location", "graduationYear"]) if (values[k]) touchedKeys.add(k);
  }
  refreshFieldNotes();
});

/** Saves the Profile form. False when a problem stops it (the first one is shown and focused). */
async function saveProfileForm(): Promise<boolean> {
  const problems = profileProblems();
  if (problems.length) {
    toast(problems.length > 1 ? `${problems[0]!.text} (and ${problems.length - 1} more to fix)` : problems[0]!.text, "bad");
    problems[0]!.el.focus();
    return false;
  }
  // The stored profile, not the copy loaded when the panel opened: answers saved since (Quick Answers setup, the
  // resume, diversity answers) are kept, and only what this form shows is replaced.
  profile = await loadProfile();
  const values = profileFormValues();
  for (const key of PROFILE_KEYS) profile[key] = normalizeProfileValue(key, values[key] ?? "", values);
  const status = document.querySelector<HTMLSelectElement>("#education-status")?.value ?? "";
  profile.educationStatus = status === "completed" || status === "pursuing" ? status : "";
  const work = readWorkHistory();
  if (work.length) profile.workHistory = work;
  else delete profile.workHistory;
  profile.workHistoryComplete = (document.querySelector<HTMLInputElement>("#work-history-complete"))?.checked ?? false;

  const skills = readSkillsInventoryFromUI();
  const keySkills = (profile.skills ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  for (const sk of skills) if (!keySkills.some((k) => k.toLowerCase() === sk.name.toLowerCase())) keySkills.push(sk.name);
  profile.skills = keySkills.join(", ");
  if (skills.length) profile.skillsInventory = skills;
  else delete profile.skillsInventory;
  profile.skillsComplete = (document.querySelector<HTMLInputElement>("#skills-complete"))?.checked ?? false;

  const languages = readLanguagesFromUI();
  if (languages.length) profile.languages = languages;
  else delete profile.languages;
  profile.languagesComplete = (document.querySelector<HTMLInputElement>("#languages-complete"))?.checked ?? false;

  await saveProfile(profile);
  profileDirty = false;
  showResume(profile.resume ? profile.resume.name : "Upload your resume (PDF or DOCX, max 5 MB)", !!profile.resume);
  const warnings = validateProfile(profileFormValues()).filter((i) => i.level === "warn").length;
  toast(warnings ? `Profile saved. ${warnings} thing${warnings === 1 ? "" : "s"} worth checking (amber notes).` : "Profile saved", warnings ? "warn" : "ok");
  if (feedJobs.length) await renderFeed(); // preferences changed: re-rank the jobs
  return true;
}
$("save-profile").addEventListener("click", () => void saveProfileForm());

/** Leaving Profile with unsaved edits: save them, throw them away, or stay. */
function confirmLeaveProfile(next: Section): void {
  let dialog = document.getElementById("unsaved-dialog") as HTMLDialogElement | null;
  if (!dialog) {
    dialog = h("dialog", { id: "unsaved-dialog", class: "dialog", "aria-labelledby": "unsaved-title" }) as HTMLDialogElement;
    document.body.append(dialog);
  }
  const save = button("Save changes", { variant: "primary", size: "sm" });
  const discard = button("Discard changes", { variant: "ghost", size: "sm" });
  const stay = button("Keep editing", { variant: "ghost", size: "sm" });
  save.id = "unsaved-save";
  discard.id = "unsaved-discard";
  stay.id = "unsaved-stay";
  dialog.replaceChildren(h("div", { class: "dialog-body stack", style: "padding: 16px;" },
    h("h3", { id: "unsaved-title" }, "You have unsaved changes"),
    h("p", { class: "hint" }, "Your Profile edits are not saved yet. Forms only get what is saved."),
    h("div", { class: "button-row" }, save, discard, stay)));
  const d = dialog;
  save.addEventListener("click", async () => {
    d.close();
    if (await saveProfileForm()) showSection(next);
  });
  discard.addEventListener("click", async () => {
    d.close();
    profileDirty = false;
    await renderProfile();
    showSection(next);
  });
  stay.addEventListener("click", () => d.close());
  dialog.showModal();
}

// --- Quick answers -------------------------------------------------------------------------------------
const EMPTY_FACTS: QuickFacts = {
  workCountries: "", noticePeriod: "", currentCtc: "", expectedCtc: "", relocate: "", heardFrom: "",
  gender: "", hispanic: "", race: "", veteran: "", disability: "",
  workMode: "", maxOfficeDays: "", travel: "", travelPercent: "", needsAccommodation: "", pronouns: "", over18: "",
};

type QuickField = { key: keyof QuickFacts; label: string; hint?: string; placeholder?: string; choices?: Array<[string, string]> };

const ASK_ME: [string, string] = ["", "Ask me on each form"];
const QUICK_MAIN: QuickField[] = [
  { key: "workCountries", label: "Countries where you can work without a visa", placeholder: "e.g. India", hint: "e.g. India, or India, EU. Answers \"Are you authorized to work in …?\" and \"Will you need sponsorship …?\" for any country named." },
  { key: "noticePeriod", label: "Notice period / when you can join", placeholder: "e.g. Immediate, 30 days, or June 2027" },
  { key: "currentCtc", label: "Current CTC", placeholder: "e.g. 0 if you're a fresher, or 6 LPA" },
  { key: "expectedCtc", label: "Expected CTC", placeholder: "e.g. 20 LPA" },
  { key: "relocate", label: "Willing to relocate?", choices: [ASK_ME, ["Yes", "Yes"], ["No", "No"]] },
  { key: "heardFrom", label: "How did you hear about the job?", placeholder: "e.g. LinkedIn" },
  { key: "workMode", label: "Work mode preference", choices: [ASK_ME, ["any", "Flexible / Any"], ["hybrid", "Hybrid"], ["onsite", "Onsite"], ["remote", "Remote"]] },
  { key: "maxOfficeDays", label: "Max in-office days per week (for hybrid)", placeholder: "e.g. 3" },
  { key: "travel", label: "Willing to travel for work?", choices: [ASK_ME, ["Yes", "Yes"], ["No", "No"]] },
  { key: "travelPercent", label: "Max travel percentage", placeholder: "e.g. 10% or 25%" },
  { key: "over18", label: "Are you 18 or older?", choices: [ASK_ME, ["Yes", "Yes"], ["No", "No"]] },
  { key: "pronouns", label: "Pronouns (optional)", placeholder: "e.g. she/her or he/him" },
  { key: "needsAccommodation", label: "Disability / accessibility accommodation needed?", choices: [ASK_ME, ["No", "No"], ["Yes", "Yes"]] },
];
const QUICK_DIVERSITY: QuickField[] = [
  { key: "gender", label: "Gender", choices: [ASK_ME, ["Male", "Male"], ["Female", "Female"], ["Non-binary", "Non-binary"], ["Decline", "Prefer not to say"]] },
  { key: "hispanic", label: "Hispanic or Latino?", choices: [ASK_ME, ["No", "No"], ["Yes", "Yes"], ["Decline", "Prefer not to say"]] },
  { key: "race", label: "Race / ethnicity", choices: [ASK_ME, ["Decline", "Prefer not to say"], ["Asian", "Asian"], ["Black or African American", "Black or African American"],
    ["White", "White"], ["Two or more races", "Two or more races"], ["Native Hawaiian or Other Pacific Islander", "Native Hawaiian or Pacific Islander"],
    ["American Indian or Alaska Native", "American Indian or Alaska Native"]] },
  { key: "veteran", label: "Veteran", choices: [ASK_ME, ["No", "I am not a veteran"], ["Yes", "I am a veteran"], ["Decline", "Prefer not to say"]] },
  { key: "disability", label: "Disability", choices: [ASK_ME, ["No", "No"], ["Yes", "Yes"], ["Decline", "Prefer not to say"]] },
];

function quickInput(field: QuickField, facts: QuickFacts): HTMLElement {
  let control: HTMLInputElement | HTMLSelectElement;
  if (field.choices) {
    control = h("select", { class: "input", "data-fact": field.key }) as HTMLSelectElement;
    for (const [value, text] of field.choices) control.append(h("option", { value }, text));
  } else {
    control = h("input", { class: "input", type: "text", "data-fact": field.key, placeholder: field.placeholder ?? "", autocomplete: "off" }) as HTMLInputElement;
  }
  control.value = String(facts[field.key] ?? "");
  const label = h("label", { class: "field-label span-2" }, field.label, control);
  if (field.hint) label.append(h("span", { class: "muted" }, field.hint));
  return label;
}

/** Like profileDirty, for the Quick answers card. */
let quickDirty = false;

/** The Quick answers setup wizard is on screen (it lives in the Quick answers card). */
function quickWizardOpen(): boolean {
  return !!document.querySelector("#quick-card .quick-wizard-card");
}

/** Draw the Quick answers card. Never over the setup wizard: each wizard step saves the profile, and a redraw then
 * replaced the wizard with this form mid-setup (round 5). The wizard redraws it itself when it is done (`force`). */
async function renderQuick(force = false): Promise<void> {
  const facts = { ...EMPTY_FACTS, ...((await loadProfile()).facts ?? {}) };
  if (!force && quickWizardOpen()) return;
  quickDirty = false;
  const save = button("Save quick answers", { variant: "primary", size: "sm" });
  save.id = "save-quick";
  const declineDiversity = button("Answer all diversity questions with 'Prefer not to say'", { variant: "ghost", size: "sm" });
  declineDiversity.id = "decline-diversity";
  declineDiversity.type = "button";
  const card = h("form", { class: "card quick", id: "quick-form", novalidate: true },
    h("div", { class: "card-head" }, h("h2", {}, "Quick answers"), h("span", { class: "muted" }, "Answer once, used on every form")),
    h("p", { class: "hint" }, "Most forms ask these in their own words. ApplyAgent uses an answer only where the question clearly matches it; anything unclear is still asked. Leave a box empty to be asked on each form."),
    h("div", { class: "form-grid" }, ...QUICK_MAIN.map((f) => quickInput(f, facts))),
    h("details", { class: "details-inline" }, h("summary", {}, "Diversity questions (mostly US forms, optional)"),
      h("p", { class: "hint" }, "Used only where a form lists choices and one clearly matches; never typed as text."),
      h("div", { class: "button-row" }, declineDiversity),
      h("div", { class: "form-grid" }, ...QUICK_DIVERSITY.map((f) => quickInput(f, facts)))),
    h("div", { class: "button-row" }, save));
  card.addEventListener("submit", (e) => e.preventDefault());
  card.addEventListener("input", () => (quickDirty = true));
  card.addEventListener("change", () => (quickDirty = true));
  declineDiversity.addEventListener("click", async () => {
    for (const key of ["gender", "hispanic", "race", "veteran", "disability"]) {
      const select = card.querySelector<HTMLSelectElement>(`[data-fact="${key}"]`);
      if (select) select.value = "Decline";
    }
    // Facts this card doesn't show (sponsorship, temporary permits, countries you can't work in) are kept.
    const current = await loadProfile();
    const next = { ...EMPTY_FACTS, ...(current.facts ?? {}) };
    card.querySelectorAll<HTMLInputElement | HTMLSelectElement>("[data-fact]").forEach((el) => {
      (next as Record<string, string>)[el.dataset.fact!] = el.value.trim();
    });
    quickDirty = false;
    await saveProfile({ ...current, facts: next });
    profile = { ...profile, facts: next };
    toast("Diversity answers set to 'Prefer not to say'");
  });
  save.addEventListener("click", async () => {
    // Facts this card doesn't show (sponsorship, temporary permits, countries you can't work in) are kept.
    const current = await loadProfile();
    const next = { ...EMPTY_FACTS, ...(current.facts ?? {}) };
    card.querySelectorAll<HTMLInputElement | HTMLSelectElement>("[data-fact]").forEach((el) => {
      (next as Record<string, string>)[el.dataset.fact!] = el.value.trim();
    });
    quickDirty = false;
    await saveProfile({ ...current, facts: next });
    profile = { ...profile, facts: next };
    toast("Quick answers saved");
  });
  $("quick-card").replaceChildren(card);
}


async function renderScreening(): Promise<void> {
  const container = $("screening-card");
  if (!container) return;
  const answers = await loadAnswers();
  const byQ = new Map(answers.map((a) => [a.question.trim().toLowerCase(), a.answer]));

  const save = button("Save screening answers", { variant: "primary", size: "sm" });
  save.id = "save-screening";

  const selects = new Map<string, HTMLSelectElement>();
  const formRows = COMMON_SCREENING_QUESTIONS.map((q) => {
    const select = h("select", { class: "input", "data-screening": q.question, "aria-label": q.question }) as HTMLSelectElement;
    select.append(h("option", { value: "" }, "Ask me on each form"));
    select.append(h("option", { value: "Yes" }, "Yes"));
    select.append(h("option", { value: "No" }, "No"));
    const current = byQ.get(q.question.trim().toLowerCase());
    if (current === "Yes" || current === "No") select.value = current;
    selects.set(q.question, select);
    const label = h("label", { class: "field-label span-2" }, q.question, select);
    return label;
  });

  const card = h("form", { class: "card quick", id: "screening-form", novalidate: true },
    h("div", { class: "card-head" }, h("h2", {}, "Common screening questions"), h("span", { class: "muted" }, "Pre-answer yes/no questions")),
    h("p", { class: "hint" }, "Pre-answer general yes/no questions commonly asked across job applications. Unanswered questions will be asked on each form."),
    h("details", { class: "details-inline" },
      h("summary", {}, `Screening questions (${COMMON_SCREENING_QUESTIONS.length})`),
      h("div", { class: "form-grid" }, ...formRows),
      h("div", { class: "button-row" }, save)));

  card.addEventListener("submit", (e) => e.preventDefault());
  save.addEventListener("click", async () => {
    let currentAnswers = await loadAnswers();
    for (const q of COMMON_SCREENING_QUESTIONS) {
      const select = selects.get(q.question);
      if (!select) continue;
      const val = select.value.trim();
      if (val === "Yes" || val === "No") {
        currentAnswers = upsertAnswer(currentAnswers, {
          question: q.question,
          answer: val,
          updatedAt: new Date().toISOString(),
        });
      } else {
        currentAnswers = currentAnswers.filter((a) => a.question.trim().toLowerCase() !== q.question.trim().toLowerCase());
      }
    }
    await saveAnswers(currentAnswers);
    toast("Screening answers saved");
    await renderAnswers();
  });

  container.replaceChildren(card);
}

// --- Answers -----------------------------------------------------------------------------------------
async function renderAnswers(): Promise<void> {
  void renderScreening();
  const answers = await loadAnswers();
  setCount("answers", answers.length);
  const list = $("answer-list");
  list.replaceChildren();
  if (!answers.length) {
    list.append(empty("answers", "No saved answers yet", "When the agent asks you a question, your answer is saved here and reused for the same question."));
    return;
  }
  for (const a of [...answers].sort((x, y) => y.updatedAt.localeCompare(x.updatedAt))) {
    const remove = iconButton("trash", "Delete answer", true);
    remove.addEventListener("click", async () => {
      await updateAnswers((answers) => answers.filter((x) => x.question !== a.question));
      toast("Answer deleted");
      await renderAnswers();
    });
    const edit = iconButton("pencil", "Edit answer");
    const top = h("div", { class: "item-top" }, h("span", { class: "item-title" }, a.question), h("span", { class: "item-actions" }, edit, remove));
    const meta = h("div", { class: "chips" });
    if (a.topic) meta.append(h("span", { class: "tag" }, a.topic.replace(/_/g, " ")));
    meta.append(h("span", { class: "tag" }, relativeDate(a.updatedAt)));
    const note = h("div", { class: "item-note" }, a.answer);
    const body = h("div", { class: "item-body" }, top, note, meta);
    edit.addEventListener("click", () => {
      if (body.querySelector(".answer-edit")) return;
      const box = h("textarea", { class: "input", rows: "3", "aria-label": `Answer to: ${a.question}` }) as HTMLTextAreaElement;
      box.value = a.answer;
      const save = button("Save", { variant: "primary", size: "sm" });
      const cancel = button("Cancel", { variant: "ghost", size: "sm" });
      const editor = h("div", { class: "answer-edit" }, box, h("div", { class: "button-row" }, save, cancel));
      note.replaceWith(editor);
      box.focus();
      cancel.addEventListener("click", () => editor.replaceWith(note));
      save.addEventListener("click", async () => {
        const value = box.value.trim();
        if (!value) {
          toast("An answer can't be empty. Delete it instead.", "warn");
          return;
        }
        await updateAnswers((answers) => upsertAnswer(answers, { ...a, answer: value, updatedAt: new Date().toISOString() }));
        toast("Answer updated");
        await renderAnswers();
      });
    });
    list.append(h("li", { class: "item" }, body));
  }
}

// --- Tracker -----------------------------------------------------------------------------------------
const RECORD_CHIP: Record<ApplicationRecord["status"], [string, string]> = {
  applied_confirmed: ["Applied", "ok"], needs_check: ["Needs check", "warn"], in_progress: ["Submitting", "info"],
};

async function openProofModal(key: string): Promise<void> {
  const data = await chrome.storage.local.get(key);
  ($("proof") as HTMLImageElement).src = data[key] as string;
  ($("proof-dialog") as HTMLDialogElement).showModal();
}

const trackerUi: TrackerUi = {
  toast: (msg, tone) => toast(msg, tone ?? ""),
  showProof: (key) => void openProofModal(key),
};

async function renderTracker(): Promise<void> {
  const records = await loadApplications();
  const applied = records.filter((r) => r.status === "applied_confirmed").length;
  setCount("tracker", applied);
  await renderTrackerCrm(trackerUi);
}

$("proof-close").addEventListener("click", () => ($("proof-dialog") as HTMLDialogElement).close());
$("proof-dialog").addEventListener("click", (e) => {
  if (e.target === e.currentTarget) ($("proof-dialog") as HTMLDialogElement).close(); // click outside the image
});

// --- Queue ---------------------------------------------------------------------------------------------
const ATS_ORIGINS = [
  "https://*.greenhouse.io/*", "https://*.lever.co/*", "https://*.ashbyhq.com/*",
  "https://*.workable.com/*", "https://*.smartrecruiters.com/*", "https://*.recruitee.com/*",
  "https://*.bamboohr.com/*", "https://*.teamtailor.com/*", "https://*.breezy.hr/*", "https://*.personio.com/*", "https://*.personio.de/*",
];
const QUEUE_CHIP: Record<QueueStatus, [string, string]> = {
  queued: ["Queued", ""], running: ["Working", "info live"], needs_user: ["Needs you", "warn"], ready: ["Ready to submit", "accent"],
  applied: ["Applied", "ok"], needs_check: ["Needs check", "warn"], failed: ["Failed", "bad"], skipped: ["Skipped", ""],
};

/** Queue edits go through the background worker, the queue's only writer. */
function queueMessage(message: Message): Promise<unknown> {
  return chrome.runtime.sendMessage(message).catch(() => undefined);
}

async function addJobs(jobs: Array<Pick<QueueItem, "url" | "title" | "company">>): Promise<number> {
  const blocked = jobs.filter((j) => isHandsOff(j.url));
  if (blocked.length) {
    const names = [...new Set(blocked.map((j) => platformFor(j.url).name))].join(", ");
    toast(`Skipped ${blocked.length} ${names} link${blocked.length === 1 ? "" : "s"}: ${names} doesn't allow automated applications. Use the job's "Apply on company site" link instead.`, "warn");
  }
  const allowed = jobs.filter((j) => !isHandsOff(j.url));
  if (!allowed.length) return 0;
  return Number(await queueMessage({ type: "QUEUE_ADD", jobs: allowed })) || 0;
}

function asFieldResult(q: PendingQuestion): FieldResult {
  return {
    field: {
      key: "inbox", label: q.label, section: q.section, control: q.control, required: q.required, options: q.options,
      name: "", autocomplete: "", placeholder: "", maxLength: q.maxLength,
    },
    decision: { kind: "ask", reason: q.topic ? "sensitive" : "unknown", topic: q.topic },
    status: "needs_user",
  };
}

/** Questions inbox: every unanswered question across waiting jobs, asked once. Answering re-runs each job whose
 * questions are now all answered, in its existing tab. */
async function renderInbox(queue: QueueItem[]): Promise<void> {
  const answers = await loadAnswers();
  const answered = (q: PendingQuestion) => !!findAnswer(asFieldResult(q).field, answers, q.topic);
  const waiting = queue.filter((item) => item.status === "needs_user" && item.questions?.length);
  const unique = new Map<string, { question: PendingQuestion; jobs: QueueItem[] }>();
  for (const item of waiting) {
    for (const q of item.questions!) {
      if (answered(q)) continue;
      const key = `${q.topic ?? ""}|${questionKey(q).trim().toLowerCase()}`;
      const entry = unique.get(key) ?? { question: q, jobs: [] };
      entry.jobs.push(item);
      unique.set(key, entry);
    }
  }
  const box = $("inbox");
  box.replaceChildren();
  box.hidden = unique.size === 0;
  if (!unique.size) return;
  const jobCount = new Set([...unique.values()].flatMap((e) => e.jobs.map((j) => j.id))).size;
  box.append(h("p", { class: "section-label" }, `Questions inbox · ${unique.size} for ${jobCount} job${jobCount === 1 ? "" : "s"}`));
  for (const { question, jobs } of unique.values()) {
    const card = questionCard(asFieldResult(question), {
      job: { title: jobs[0]?.title ?? "", company: jobs[0]?.company ?? "" },
      onSaved: async () => {
        // Re-run every waiting job whose questions are now all answered.
        const nowAnswers = await loadAnswers();
        const ready = waiting.filter((item) => item.questions!.every((q) => !!findAnswer(asFieldResult(q).field, nowAnswers, q.topic)));
        for (const item of ready) void queueMessage({ type: "QUEUE_RERUN", id: item.id });
        toast(ready.length ? `Answer saved · ${ready.length} job${ready.length === 1 ? "" : "s"} continuing` : "Answer saved");
        await renderQueue();
      },
    });
    card.querySelector(".question-why")?.append(h("span", { class: "tag" }, `${jobs.length} job${jobs.length === 1 ? "" : "s"}`));
    box.append(card);
  }
}

async function renderQueue(): Promise<void> {
  const [queue, settings, running, atsAllowed] = await Promise.all([
    loadQueue(), loadSettings(), isQueueRunning(), chrome.permissions.contains({ origins: ATS_ORIGINS }),
  ]);
  ($("set-parallel") as HTMLSelectElement).value = String(settings.maxParallel);
  if (document.activeElement !== $("set-cap")) ($("set-cap") as HTMLInputElement).value = String(settings.dailyCap);
  ($("set-mode") as HTMLSelectElement).value = settings.mode;
  $("ats-callout").hidden = atsAllowed;
  ($("queue-start") as HTMLButtonElement).hidden = running;
  ($("queue-pause") as HTMLButtonElement).hidden = !running;

  const state = $("queue-state");
  state.textContent = running ? "Running" : "Paused";
  state.className = `chip ${running ? "ok live" : ""}`;
  const counts = queue.reduce<Partial<Record<QueueStatus, number>>>((acc, q) => ({ ...acc, [q.status]: (acc[q.status] ?? 0) + 1 }), {});
  const summary = $("queue-summary");
  summary.replaceChildren(chip(`${queue.length} jobs`, "plain"));
  for (const [status, n] of Object.entries(counts) as Array<[QueueStatus, number]>) {
    const [text, tone] = QUEUE_CHIP[status];
    summary.append(chip(`${n} ${text.toLowerCase()}`, tone.replace(" live", "")));
  }
  setCount("queue", (counts.needs_user ?? 0) + (counts.ready ?? 0), true);
  await renderPacing();
  await renderInbox(queue);

  const list = $("queue-list");
  list.replaceChildren();
  if (!queue.length) {
    list.append(empty("queue", "Your queue is empty", "Add job links above, or pick great fits from the Jobs section."));
    return;
  }
  for (const q of queue) {
    const waiting = q.status === "queued" && q.waitUntil !== undefined && q.waitUntil > Date.now();
    const [text, tone] = waiting ? ["Waiting", "info"] : QUEUE_CHIP[q.status];
    const body = h("div", { class: "item-body" },
      h("div", { class: "item-top" }, h("span", { class: "item-title" }, q.title || q.company || hostOf(q.url)), chip(text, tone)),
      h("div", { class: "item-sub truncate" }, [q.company, hostOf(q.url)].filter(Boolean).join(" · ")));
    if (q.note) body.append(h("div", { class: "item-note" }, q.note));
    const actions = h("div", { class: "item-actions" });
    if (q.status === "ready") {
      const submit = button("Submit", { variant: "primary", icon: "send", size: "sm" });
      submit.addEventListener("click", () => {
        busy(submit, true);
        void queueMessage({ type: "QUEUE_SUBMIT", id: q.id });
      });
      actions.append(submit);
    }
    const open = button(q.tabId !== undefined ? "Go to tab" : "Open", { variant: "ghost", icon: "external", size: "sm" });
    open.addEventListener("click", async () => {
      const tab = q.tabId !== undefined ? await chrome.tabs.get(q.tabId).catch(() => undefined) : undefined;
      if (tab?.id !== undefined) await chrome.tabs.update(tab.id, { active: true });
      else await chrome.tabs.create({ url: q.url });
    });
    actions.append(open);
    if (["failed", "skipped", "needs_user", "needs_check"].includes(q.status)) {
      const retry = button("Retry", { variant: "ghost", icon: "retry", size: "sm" });
      // A job waiting on the user still has its tab: re-run there instead of opening a second tab.
      retry.addEventListener("click", () => void queueMessage({ type: q.status === "needs_user" ? "QUEUE_RERUN" : "QUEUE_RETRY", id: q.id }));
      actions.append(retry);
    }
    const remove = iconButton("trash", "Remove from queue", true);
    remove.addEventListener("click", () => void queueMessage({ type: "QUEUE_REMOVE", id: q.id }));
    actions.append(remove);
    body.append(actions);
    list.append(h("li", { class: "item" }, body));
  }
}

$("allow-ats").addEventListener("click", async () => {
  const granted = await chrome.permissions.request({ origins: ATS_ORIGINS });
  toast(granted ? "Job sites allowed" : "Permission not granted", granted ? "ok" : "warn");
  await renderQueue();
});
$("add-current").addEventListener("click", async () => {
  const tab = await activeTab();
  if (!tab?.url) {
    toast("Click the ApplyAgent icon while on this page first, then add it.", "warn");
    return;
  }
  if (!isValidJobUrl(tab.url)) {
    toast("This page can't be added", "warn");
    return;
  }
  if (isHandsOff(tab.url)) {
    void addJobs([{ url: tab.url, title: "", company: "" }]); // explains why it is skipped
    return;
  }
  const added = await addJobs([{ url: tab.url, title: tab.title ?? "", company: "" }]);
  toast(added ? "Page added to the queue" : "Already in the queue", added ? "ok" : "warn");
});
$("add-pasted").addEventListener("click", async () => {
  const box = $("paste-urls") as HTMLTextAreaElement;
  const jobs = parseJobList(box.value);
  const added = await addJobs(jobs);
  box.value = "";
  if (added || jobs.every((j) => !isHandsOff(j.url))) {
    toast(added ? `${added} job${added === 1 ? "" : "s"} added` : "No new valid links found", added ? "ok" : "warn");
  }
});
$("import-csv").addEventListener("change", async (event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const added = await addJobs(parseJobList(await file.text()));
  input.value = "";
  toast(`${added} job${added === 1 ? "" : "s"} imported`, added ? "ok" : "warn");
});
for (const id of ["set-parallel", "set-cap", "set-mode"]) {
  $(id).addEventListener("change", async () => {
    await saveSettings({
      ...(await loadSettings()),
      maxParallel: Number(($("set-parallel") as HTMLSelectElement).value),
      dailyCap: Number(($("set-cap") as HTMLInputElement).value) || 25,
      mode: ($("set-mode") as HTMLSelectElement).value as Mode,
    });
    toast("Queue settings saved");
  });
}
// --- Safe pacing ------------------------------------------------------------------------------------------
const PACE_INPUTS: Array<[string, "maxPerHour" | "maxPerDay" | "perSiteCooldownMinutes"]> = [
  ["pace-hour", "maxPerHour"], ["pace-day", "maxPerDay"], ["pace-gap", "perSiteCooldownMinutes"],
];

async function renderPacing(): Promise<void> {
  const [pacing, state] = await Promise.all([loadPacing(), loadPacingState()]);
  for (const [id, key] of PACE_INPUTS) {
    if (document.activeElement !== $(id)) ($(id) as HTMLInputElement).value = String(pacing[key]);
  }
  const now = Date.now();
  $("pacing-status").textContent = statusLine(state, pacing, now);
  const pause = $("pacing-pause");
  const paused = state.queuePausedUntil > now;
  pause.hidden = !paused;
  pause.textContent = paused ? `A site showed a robot check, so the queue is paused until ${clockTime(state.queuePausedUntil)}.` : "";
}

for (const [id, key] of PACE_INPUTS) {
  $(id).addEventListener("change", async () => {
    const input = $(id) as HTMLInputElement;
    const [min, max] = PACING_BOUNDS[key];
    const wanted = Number(input.value);
    const valid = Number.isFinite(wanted) && input.value.trim() !== "";
    const saved: PacingSettings = await savePacing(valid ? { [key]: wanted } : {});
    input.value = String(saved[key]);
    toast(saved[key] === wanted ? "Safe pacing saved" : `Saved as ${saved[key]} (allowed: ${min}–${max})`, saved[key] === wanted ? "ok" : "warn");
    await renderPacing();
  });
}
// The status line counts down by itself ("next at 14:05" goes away when that time comes).
setInterval(() => {
  if (!$("sec-queue").hidden) void renderPacing();
}, 30_000);

$("queue-start").addEventListener("click", async () => {
  const lic = await currentLicense();
  if (!canUseFeature(lic, "queue")) {
    setStatus("Bulk apply and background queue require Pro. Upgrade to Pro in Profile & plan.", "warn");
    showSection("profile");
    return;
  }
  void queueMessage({ type: "QUEUE_START" });
});
$("queue-pause").addEventListener("click", () => void queueMessage({ type: "QUEUE_PAUSE" }));
$("queue-clear").addEventListener("click", () => void queueMessage({ type: "QUEUE_CLEAR_FINISHED" }));

// Live updates while the queue runs in the background.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.corrections?.newValue) cachedCorrections = changes.corrections.newValue as UserCorrection[];
  if (changes.queue || changes.queueRunning || changes.settings) void renderQueue();
  else if (changes.pacing || changes.pacingState) void renderPacing();
  if (changes.applications) void renderTracker();
  if (changes.answers) {
    void renderAnswers();
    void renderQueue(); // the inbox hides questions that now have answers
  }
  if (changes.license || changes.applications) void renderPlan();
  if (changes.profile) void renderSetup();
});

// --- Jobs feed -------------------------------------------------------------------------------------------
const FEED_SHOW = 100;
let feedJobs: FeedJob[] = [];
let ranked: FitResult[] = [];
const selected = new Set<string>();

async function useFeed(data: unknown, source: string): Promise<void> {
  try {
    feedJobs = parseFeed(data);
  } catch (e) {
    toast(e instanceof Error ? e.message : "Could not read the feed", "bad");
    return;
  }
  await chrome.storage.local.set({ feedSource: source, feedCache: { jobs: feedJobs } });
  toast(`${feedJobs.length.toLocaleString()} jobs loaded`);
  await renderFeed();
}

function updateFeedActions(): void {
  const good = ranked.filter((m) => m.score >= GOOD_MATCH).length;
  ($("feed-add-good") as HTMLButtonElement).replaceChildren(h("span", {}, `Add great fits (${good})`));
  ($("feed-add-good") as HTMLButtonElement).disabled = good === 0;
  ($("feed-add-selected") as HTMLButtonElement).replaceChildren(h("span", {}, `Add selected (${selected.size})`));
  ($("feed-add-selected") as HTMLButtonElement).disabled = selected.size === 0;
  $("feed-actions").hidden = ranked.length === 0;
}

async function renderFeed(): Promise<void> {
  const { matches, excluded } = rankFeed(feedJobs, await loadProfile(), new Date());
  ranked = matches;
  const good = matches.filter((m) => m.score >= GOOD_MATCH).length;
  const stats: Record<string, number> = { jobs: feedJobs.length, matches: matches.length, good, filtered: excluded };
  for (const [key, value] of Object.entries(stats)) document.querySelector(`[data-stat='${key}']`)!.textContent = value.toLocaleString();
  $("feed-stats").hidden = feedJobs.length === 0;
  setCount("jobs", good);
  $("feed-summary").hidden = feedJobs.length === 0;
  if (feedJobs.length) ($("feed-box") as HTMLDetailsElement).open = true;
  $("feed-summary").textContent = !feedJobs.length
    ? "Load a feed, then set your target roles and locations in Profile to rank the jobs."
    : matches.length
      ? `Best matches first${matches.length > FEED_SHOW ? ` · showing top ${FEED_SHOW}` : ""}. Wrong roles, places and experience levels are filtered out.`
      : "No jobs match your profile yet. Widen your target roles or locations in Profile.";

  const list = $("feed-list");
  list.replaceChildren();
  for (const m of matches.slice(0, FEED_SHOW)) {
    const score = h("div", { class: `score ${m.score >= GOOD_MATCH ? "great" : m.score >= 50 ? "" : "fair"}`, style: `--p:${m.score}`, title: `Fit score ${m.score}/100` },
      h("span", {}, String(m.score)));
    const pick = h("input", { type: "checkbox", class: "check", "aria-label": `Select ${m.job.title}` });
    pick.checked = selected.has(m.job.id);
    const reasons = h("div", { class: "chips" }, ...m.reasons.slice(0, 3).map((r) => h("span", { class: "tag" }, r)));
    const body = h("div", { class: "item-body" },
      h("div", { class: "item-top" }, h("span", { class: "item-title" }, m.job.title), pick),
      h("div", { class: "item-sub" }, `${m.job.company} · ${m.job.location || "Location not stated"}`), reasons);
    const li = h("li", { class: `item${pick.checked ? " selected" : ""}` }, score, body);
    pick.addEventListener("change", () => {
      if (pick.checked) selected.add(m.job.id);
      else selected.delete(m.job.id);
      li.classList.toggle("selected", pick.checked);
      updateFeedActions();
    });
    list.append(li);
  }
  updateFeedActions();
}

function toQueueJobs(results: FitResult[]): Array<Pick<QueueItem, "url" | "title" | "company">> {
  return results.map((r) => ({ url: r.job.apply_url ?? r.job.url, title: r.job.title, company: r.job.company }));
}

$("feed-load").addEventListener("click", async () => {
  const url = ($("feed-url") as HTMLInputElement).value.trim();
  if (!/^https:\/\//.test(url)) {
    toast("Enter an https:// feed URL", "warn");
    return;
  }
  const origin = `${new URL(url).origin}/*`;
  if (!(await chrome.permissions.request({ origins: [origin] }))) return;
  busy($("feed-load"), true);
  try {
    const response = await fetch(url, { cache: "no-store" });
    await useFeed(await response.json(), url);
  } catch {
    toast("Could not download the feed", "bad");
  } finally {
    busy($("feed-load"), false);
  }
});
$("feed-file").addEventListener("change", async (event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  try {
    await useFeed(JSON.parse(await file.text()), file.name);
  } catch {
    toast("That file is not valid JSON", "bad");
  }
  input.value = "";
});
$("feed-add-good").addEventListener("click", async () => {
  const added = await addJobs(toQueueJobs(ranked.filter((m) => m.score >= GOOD_MATCH)));
  toast(`${added} great fit${added === 1 ? "" : "s"} added to the queue`);
});
$("feed-add-selected").addEventListener("click", async () => {
  const added = await addJobs(toQueueJobs(ranked.filter((m) => selected.has(m.job.id))));
  selected.clear();
  toast(`${added} job${added === 1 ? "" : "s"} added to the queue`);
  await renderFeed();
});

// --- Setup checklist (first run) -------------------------------------------------------------------------
async function renderSetup(): Promise<void> {
  const current = await loadProfile();
  const sitesAllowed = await chrome.permissions.contains({ origins: ATS_ORIGINS });
  const steps: Array<{ done: boolean; title: string; hint: string; action: string; go: () => void }> = [
    {
      done: !!(current.firstName && current.lastName && current.email && current.phone),
      title: "Add your name, email and phone", hint: "The facts ApplyAgent types for you.", action: "Profile",
      go: () => showSection("profile"),
    },
    {
      done: !!current.resume, title: "Upload your resume", hint: "Attached to every application.", action: "Upload",
      go: () => {
        showSection("profile");
        $("resume").closest(".card")?.scrollIntoView({ behavior: "smooth", block: "center" });
      },
    },
    {
      done: !!(current.facts?.workCountries && current.facts.noticePeriod && current.facts.expectedCtc),
      title: "Answer the quick questions", hint: "Work permit, notice period, CTC: answered once for every form.", action: "Answer",
      go: () => showSection("answers"),
    },
    {
      done: sitesAllowed, title: "Allow the job sites", hint: "Greenhouse, Lever, Ashby and more, in one click.", action: "Allow",
      go: () => void (async () => {
        const granted = await chrome.permissions.request({ origins: ATS_ORIGINS });
        toast(granted ? "Job sites allowed" : "Permission not granted", granted ? "ok" : "warn");
        await renderSetup();
        await refreshPage();
      })(),
    },
  ];
  const done = steps.filter((s) => s.done).length;
  $("setup-card").hidden = done === steps.length;
  $("setup-progress").textContent = `${done} of ${steps.length} done`;
  $("setup-steps").replaceChildren(...steps.map((s) => {
    const item = h("li", { class: `setup-step${s.done ? " done" : ""}` }, icon(s.done ? "check" : "circle", 18),
      h("div", { class: "setup-text" }, h("strong", {}, s.title), h("span", { class: "muted" }, s.hint)));
    if (!s.done) {
      const go = button(s.action, { variant: "secondary", size: "sm" });
      go.addEventListener("click", s.go);
      item.append(go);
    }
    return item;
  }));
}

// --- Backup & move ---------------------------------------------------------------------------------------
/** The automatic backup switch and when it last ran. */
async function renderAutoBackup(): Promise<void> {
  const state = await loadAutoBackup();
  ($("auto-backup") as HTMLInputElement).checked = state.enabled;
  const status = $("auto-backup-status");
  const where = `Downloads → ${AUTO_BACKUP_FILE.replace("/", " → ")}`;
  if (!state.enabled) status.textContent = `Off. When on, ApplyAgent saves ${where} a couple of minutes after you change something (at most once an hour). Nothing is uploaded anywhere. If you ever reinstall, choose "Restore from file" and pick it.`;
  else if (state.lastError) status.textContent = `On, but the last backup failed: ${state.lastError}. Use "Export backup" meanwhile.`;
  else status.textContent = `On. ${state.lastAt ? `Last backup ${new Date(state.lastAt).toLocaleString()}` : "First backup after your next change"}: ${where}. Nothing is uploaded anywhere.`;
}
$("auto-backup").addEventListener("change", async () => {
  const on = ($("auto-backup") as HTMLInputElement).checked;
  const state = await setAutoBackup(on);
  await renderAutoBackup();
  if (on && !state.enabled) toast("Automatic backup is off: Chrome's permission to save files was not given.", "warn");
  else toast(on ? "Automatic backup is on" : "Automatic backup is off");
});
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.autoBackup) void renderAutoBackup();
});
void renderAutoBackup();

$("export-backup").addEventListener("click", async () => {
  const backup = makeBackup({
    profile: await loadProfile(), answers: await loadAnswers(), applications: await loadApplications(), settings: await loadSettings(),
    companies: await loadMyCompanies(),
  });
  const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }));
  const link = h("a", { href: url, download: `applyagent-backup-${backup.exportedAt.slice(0, 10)}.json` });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  toast("Backup saved. Keep the file private: it holds your personal details.");
});

$("import-backup").addEventListener("change", async (event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;
  let raw: unknown;
  try {
    raw = file.size > 20 * 1024 * 1024 ? null : JSON.parse(await file.text());
  } catch {
    raw = null;
  }
  const backup = readBackup(raw);
  if (typeof backup === "string") {
    toast(backup, "bad");
    return;
  }
  const current = await loadProfile();
  const replacing = !!(current.firstName || current.email);
  if (replacing && !confirm(`Replace your current profile with the one in this backup (from ${backup.exportedAt.slice(0, 10) || "an unknown date"})? Answers and history are merged, not replaced.`)) return;
  await saveProfile(backup.profile);
  await updateAnswers((answers) => mergeAnswers(answers, backup.answers));
  await updateApplications((records) => mergeApplications(records, backup.applications));
  await saveSettings(backup.settings);
  if (backup.companies?.length) await chrome.storage.local.set({ [MY_COMPANIES_KEY]: mergeCompanies(await loadMyCompanies(), backup.companies) });
  await renderProfile();
  await renderSetup();
  toast(`Restored: profile, ${backup.answers.length} answers, ${backup.applications.length} applications`);
  // A restore on a fresh install is the setup: no welcome steps after it.
  await chrome.storage.local.set({ onboarding_done: true });
  document.getElementById("onboarding-container")?.remove();
});

// --- Silent detection setting ---------------------------------------------------------------------------
async function renderDetectionSetting(): Promise<void> {
  const settings = await loadSettings();
  ($("set-detection") as HTMLSelectElement).value = settings.detection;
  ($("set-understanding") as HTMLInputElement).checked = settings.understanding;
}

$("set-understanding").addEventListener("change", async () => {
  const understanding = ($("set-understanding") as HTMLInputElement).checked;
  await saveSettings({ ...(await loadSettings()), understanding });
  toast(understanding ? "Question understanding is on" : "Question understanding is off: rules only");
});

$("set-detection").addEventListener("change", async () => {
  const detection = ($("set-detection") as HTMLSelectElement).value as Settings["detection"];
  await saveSettings({ ...(await loadSettings()), detection });
  await queueMessage({ type: "DETECTION_SYNC" });
  toast(detection === "off" ? "Silent detection is off" : "Silent detection is on for the sites you allowed");
});

// --- Plan & licence -------------------------------------------------------------------------------------
async function remaining(): Promise<number> {
  return remainingSubmissions(await currentLicense(), await loadApplications(), new Date());
}

async function renderPlan(): Promise<void> {
  const license = await currentLicense();
  const left = await remaining();
  const pill = $("plan-pill");
  const badge = $("plan-badge");
  const meter = $("plan-meter");
  // The licence key box and the payment line only appear when there is something to buy and activate. In the beta
  // (and any build without a licence server) a key box that cannot work would only confuse people.
  const canBuy = licensingConfigured();
  $("plan-payment-hint").hidden = !canBuy;
  $("license-row").hidden = !canBuy;

  if (BETA_ALL_FREE) {
    $("plan-status").textContent = "Beta · every feature is free while we test. There is nothing to buy or activate. Thank you for helping!";
    pill.textContent = "Beta";
    pill.className = "plan-pill";
    badge.textContent = "Beta";
    badge.className = "chip";
    meter.style.width = "100%";
    $("buy-row").hidden = true;
    return;
  }

  if (license) {
    const isLife = isLifetimeLicense(license);
    const until = new Date(license.exp * 1000).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
    $("plan-status").textContent = isLife ? `Founder · unlimited applications until ${until}` : `Pro · unlimited applications until ${until}`;
    pill.textContent = isLife ? "Founder" : "Pro";
    pill.className = "plan-pill pro";
    badge.textContent = isLife ? "Founder" : "Pro";
    badge.className = "chip accent";
    meter.style.width = "100%";
    meter.parentElement!.classList.remove("low");
  } else {
    $("plan-status").textContent = "Free · Unlimited single-form autofill";
    pill.textContent = "Free";
    pill.className = "plan-pill";
    badge.textContent = "Free";
    badge.className = "chip";
    meter.style.width = "100%";
    meter.parentElement!.classList.remove("low");
  }
  $("buy-row").hidden = !canBuy;
  const { licenseKey } = await chrome.storage.local.get("licenseKey");
  if (typeof licenseKey === "string") ($("license-key") as HTMLInputElement).value = licenseKey;
}

async function openBuy(currency: "INR" | "USD", tier: "monthly" | "lifetime" = "monthly"): Promise<void> {
  const { licenseKey } = await chrome.storage.local.get("licenseKey");
  await chrome.tabs.create({ url: buyUrl(currency, tier, typeof licenseKey === "string" ? licenseKey : undefined) });
}

$("buy-inr").addEventListener("click", () => void openBuy("INR", "monthly"));
$("buy-usd").addEventListener("click", () => void openBuy("USD", "monthly"));
$("buy-founder")?.addEventListener("click", () => void openBuy("USD", "lifetime"));
$("activate").addEventListener("click", async () => {
  busy($("activate"), true);
  const error = await activate(($("license-key") as HTMLInputElement).value);
  busy($("activate"), false);
  if (error) toast(error, "bad");
  else {
    toast("Pro activated");
    await renderPlan();
  }
});

/** Free-plan guard before any submission started from the panel (unlimited on single forms). */
async function canSubmit(): Promise<boolean> {
  return true;
}

// --- start ----------------------------------------------------------------------------------------------
hydrateIcons();
let initial: Section = "apply";
try {
  initial = (sessionStorage.getItem("section") as Section | null) ?? "apply";
} catch {
  // default section
}
showSection(initial);
void refreshPage();
void renderProfile();
void renderQueue();
void renderPlan();
void renderSetup();
void renderQuick();
void runRequested();
void renderDetectionSetting();
void loadShortcuts();
void renderAnswers();
void renderTracker();
initTracker(trackerUi, () => void renderTrackerCrm(trackerUi));
// >>> arena-fix discover
initDiscover({ ...trackerUi, openProfile: () => showSection("profile") });
// <<< arena-fix
initUsageMeter({ toast: (m, t) => toast(m, t ?? ""), showPlan: () => showSection("profile") });
initApplyResume({ toast: (m, t) => toast(m, t ?? "ok"), showProfile: () => showSection("profile") });
void (async () => {
  const cached = await chrome.storage.local.get(["feedCache", "feedSource"]);
  if (cached.feedCache) {
    feedJobs = parseFeed(cached.feedCache);
    if (typeof cached.feedSource === "string" && cached.feedSource.startsWith("https://")) {
      ($("feed-url") as HTMLInputElement).value = cached.feedSource;
    }
    await renderFeed();
  }
})();

// >>> L2 Quick Answers Wizard
export async function launchQuickAnswersWizard(container?: HTMLElement): Promise<void> {
  const { mountQuickAnswers } = await import("./quick-answers");
  const target = container ?? document.getElementById("quick-card") ?? document.body;
  await mountQuickAnswers(target, async () => {
    profile = await loadProfile();
    await renderQuick(true);
    await renderSetup();
    toast("Quick answers saved");
  });
}

const setupWizardBtn = document.createElement("button");
setupWizardBtn.id = "launch-quick-wizard";
setupWizardBtn.className = "btn btn-secondary btn-sm";
setupWizardBtn.textContent = "Setup wizard (2 min)";
setupWizardBtn.type = "button";
setupWizardBtn.style.cssText = "margin-bottom: 12px;";
setupWizardBtn.addEventListener("click", () => {
  const card = document.getElementById("quick-card");
  if (card) void launchQuickAnswersWizard(card);
});
const quickHost = document.getElementById("quick-card");
if (quickHost && quickHost.parentElement) {
  quickHost.parentElement.insertBefore(setupWizardBtn, quickHost);
}
// <<< L2

// >>> L5 onboarding
import { createOnboardingElement, isFirstRun } from "./onboarding";

async function checkAndMountOnboarding(): Promise<void> {
  if (await isFirstRun()) {
    const secApply = document.getElementById("sec-apply");
    if (secApply) {
      const el = createOnboardingElement({
        onResumeSaved: async () => {
          showResume((await loadProfile()).resume?.name ?? "", true);
          await readStoredResume();
        },
        onPasteResume: async (text) => {
          const { parseResume } = await import("../shared/resume-parse");
          await openResumeReview(parseResume(text));
        },
        onRestore: () => ($("import-backup") as HTMLInputElement).click(),
        onDone: async () => {
          await renderProfile();
          await renderSetup();
          toast("Setup complete! You are ready to apply.", "ok");
        },
      });
      secApply.insertBefore(el, secApply.firstChild);
    }
  }
}
void checkAndMountOnboarding();
// <<< L5

/** Once after updating from beta 1: its setup could save example answers (e.g. "3 years") for skipped questions. */
async function showReviewNotice(): Promise<void> {
  const { reviewQuickAnswersNotice } = await chrome.storage.local.get("reviewQuickAnswersNotice");
  if (!reviewQuickAnswersNotice) return;
  const review = button("Review my answers", { variant: "primary", size: "sm" });
  const dismiss = button("They're correct", { variant: "ghost", size: "sm" });
  const card = h("div", { class: "card banner warn", id: "review-notice", role: "status" },
    h("strong", {}, "Please check your saved answers"),
    h("p", { class: "hint" }, "The first beta could save the setup's example answers (such as 3 years of experience, graduation 2024 or English: Fluent) when a question was skipped. Check Answers → Quick answers and your Profile, and clear anything that isn't yours."),
    h("div", { class: "button-row" }, review, dismiss));
  const done = async () => {
    card.remove();
    await chrome.storage.local.remove("reviewQuickAnswersNotice");
  };
  review.addEventListener("click", () => {
    showSection("answers");
    void done();
  });
  dismiss.addEventListener("click", () => void done());
  document.getElementById("sec-apply")?.prepend(card);
}
void showReviewNotice();


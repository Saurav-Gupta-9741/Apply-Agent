/** Side panel UI. Page-derived text (labels, titles) is always inserted as text, never as HTML. */

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
import { activate, buyUrl, currentLicense, isLifetimeLicense, licensingConfigured, remainingSubmissions, submittedThisMonth } from "../shared/license";
import { FREE_MONTHLY_SUBMISSIONS, SUPPORT_EMAIL } from "../shared/config";
import { hydrateIcons, icon } from "./icons";
import { NEVER_REMEMBER, type PendingQuestion } from "../shared/types";
import { findAnswer, questionKey } from "../content/classify";
import { isAppliedBeforeQuestion } from "../content/facts";
import { HANDS_OFF_MESSAGE, isHandsOff, platformFor } from "../shared/platforms";
import { makeBackup, mergeAnswers, mergeApplications, readBackup } from "../shared/backup";
import { COMMON_SCREENING_QUESTIONS } from "../shared/screening";
import { isPrivacyConsentCheckbox } from "../shared/consent";
import { findSuggestedCorrection } from "../shared/corrections";
import { buildDiagnostic } from "../shared/diagnostic";

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
const pinnedTabId = Number(new URLSearchParams(location.search).get("tabId")) || undefined;

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

async function activeTab(): Promise<chrome.tabs.Tab | undefined> {
  if (pinnedTabId !== undefined) return chrome.tabs.get(pinnedTabId).catch(() => undefined);
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
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
async function refreshPage(): Promise<void> {
  const tab = await activeTab();
  const url = tab?.url ?? "";
  const pattern = url ? originPattern(url) : null;
  const allowed = pattern ? await chrome.permissions.contains({ origins: [pattern] }) : false;
  const oneTime = !allowed && !!pattern && tab?.id !== undefined && (await hasOneTimeAccess(tab.id));
  const embedded = !allowed && !oneTime && tab?.id !== undefined ? await pingFrames(tab.id) : undefined;
  const unknownPage = !url && !!tab?.id && !embedded;
  const handsOff = (!!pattern && isHandsOff(url)) || !!embedded?.handsOff;
  const canFill = (allowed || oneTime || !!embedded) && !handsOff;

  $("page-host").textContent = pattern ? hostOf(url) : embedded ? `Form from ${hostOf(embedded.url)}` : unknownPage ? "This page" : "No web page";
  // An address stays on one line; a message ("Click the ApplyAgent icon…") wraps so it can be read in full.
  $("page-url").classList.toggle("truncate", !!pattern);
  $("page-url").textContent = pattern ? url
    : embedded ? "The application form embedded in this page is on a site you allowed."
    : unknownPage ? `Click the ApplyAgent icon${keys.open ? ` (or press ${keys.open})` : ""} while on this page to use ApplyAgent here.`
    : "Open a job application in this window.";
  const access = $("page-access");
  access.textContent = handsOff ? "Hands-off" : allowed ? "Allowed" : oneTime ? "This visit" : embedded ? "Form allowed" : pattern ? "Not allowed" : "";
  access.className = `chip ${handsOff ? "bad" : allowed || embedded ? "ok" : oneTime ? "info" : "warn"}`;
  access.title = oneTime ? "You opened ApplyAgent on this page, so it may work here until you leave it. Allow the site to use it every time." : "";
  $("permission-box").hidden = allowed || !pattern || handsOff;
  ($("run") as HTMLButtonElement).disabled = !canFill;
  ($("preview") as HTMLButtonElement).disabled = !canFill;
  await renderDetection(tab, handsOff, embedded);
}

/** What the silent detector found on this tab, or why ApplyAgent stays out of it. */
async function renderDetection(tab: chrome.tabs.Tab | undefined, handsOff: boolean, embedded?: FramePing): Promise<void> {
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
  setStatus("This is the job description. Opening the application form…", "info");
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

/** A result belongs to the page it was made on. When the user moves to another tab or page, it is cleared, so the
 * panel never shows one job's answers on another job, and Submit can never act on a page that was not reviewed. */
function clearReport(): void {
  setStatus("");
  $("questions").replaceChildren();
  ($("submit") as HTMLButtonElement).hidden = true;
  $("fields").replaceChildren();
  $("fields-box").hidden = true;
  $("report-problem").hidden = true;
  lastReport = undefined;
}

chrome.tabs.onActivated.addListener(() => {
  if (pinnedTabId === undefined && !agentRunning) clearReport();
  void refreshPage();
});
/** Page loads per tab ("loading" is reported even where the address is not), to notice a step that loaded a new page. */
const navigations = new Map<number, number>();
chrome.tabs.onUpdated.addListener((id, info) => {
  if (info.status === "loading") {
    navigations.set(id, (navigations.get(id) ?? 0) + 1);
    if (!agentRunning) void activeTab().then((tab) => tab?.id === id && clearReport());
  }
  if (info.url || info.status === "complete") void refreshPage();
});
chrome.runtime.onMessage.addListener((message: Message) => {
  if (message.type === "PANEL_REFRESH") void refreshPage();
  return false;
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
  return sendToApplication(tabId, message);
}

type Tone = "ok" | "warn" | "bad" | "info";
const TONE_ICON: Record<Tone, string> = { ok: "check", warn: "alert", bad: "alert", info: "info" };

function setStatus(text: string, tone: Tone = "info"): void {
  const box = $("status");
  box.replaceChildren(icon(TONE_ICON[tone], 18), h("span", {}, text));
  box.className = `banner ${tone}`;
  box.hidden = !text;
}

const FIELD_CHIP: Record<FieldResult["status"], [string, string]> = {
  filled: ["Filled", "ok"],
  already_filled: ["Kept yours", "info"],
  failed: ["Failed", "bad"],
  needs_user: ["Needs you", "warn"],
  skipped: ["Left blank", ""],
};

/** The line under a field in "Field details": the value it gets (so the user can check it), what the site already
 * put there, or why it was not filled. */
function fieldNote(r: FieldResult): string {
  const value = r.decision.kind === "profile" || r.decision.kind === "answer" || r.decision.kind === "work" || r.decision.kind === "draft" ? r.decision.value
    : r.decision.kind === "resume" ? "your resume file" : "";
  const short = (text: string) => (text.length > 80 ? `${text.slice(0, 79)}…` : text);
  if (r.review) return r.detail ?? "";
  if (r.status === "filled" && value) return `→ ${short(value)}`;
  if (r.status === "already_filled") return r.detail ? `Kept what was there: ${short(r.detail)}` : "";
  return r.detail && r.detail !== "would fill" ? r.detail : "";
}

function renderFields(report: RunReport): void {
  const list = $("fields");
  list.replaceChildren();
  const counts = { filled: 0, needs: 0, blank: 0 };
  for (const r of report.fields) {
    const [text, tone] = r.review ? ["Check this", "warn"] : FIELD_CHIP[r.status];
    if (r.status === "filled" || r.status === "already_filled") counts.filled++;
    else if (r.status === "needs_user" || r.status === "failed") counts.needs++;
    else counts.blank++;
    const label = h("span", { class: "label" }, r.field.label || "(unlabelled field)");
    const note = fieldNote(r);
    if (note) label.append(h("span", { class: "detail" }, note));
    list.append(h("li", { class: "field-row" }, label, chip(text, tone)));
  }
  $("fields-summary").textContent = `${counts.filled} filled · ${counts.needs} need you · ${counts.blank} blank`;
  $("fields-box").hidden = report.fields.length === 0;
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
  identity: "For your safety, ApplyAgent never stores or types ID numbers or bank details. Enter it yourself on the page. Genuine employers rarely ask for these before an offer, so make sure this site is real.",
  signature: "Signing is a legal act, so ApplyAgent never signs for you. Type your signature on the page yourself.",
};

function questionCard(r: FieldResult, ctx: CardContext): HTMLDivElement {
  const topic = r.decision.kind === "ask" ? r.decision.topic : undefined;
  const sensitive = r.decision.kind === "ask" && r.decision.reason === "sensitive";
  const youOnly = topic !== undefined && NEVER_REMEMBER.has(topic);
  const upload = r.field.control === "file";
  const appliedBefore = isAppliedBeforeQuestion(r.field.label);
  const onPageOnly = youOnly || upload || appliedBefore;
  const why = youOnly ? NEVER_TEXT[topic!]!
    : upload ? "Attach this file yourself on the page. ApplyAgent only attaches your resume."
      : appliedBefore ? "Company-specific: answer it on the page."
        : sensitive ? "Sensitive: only you answer this. Saved for this topic."
          : r.decision.kind === "ask" && r.decision.reason === "missing_profile_value" ? "Missing from your profile."
            : r.status === "failed" ? `Could not fill: ${r.detail ?? "unknown reason"}` : "New question: answer once, reused next time.";
  const whyRow = h("span", { class: "question-why" });
  whyRow.append(icon(youOnly ? "lock" : appliedBefore ? "lock" : sensitive ? "shield" : upload ? "upload" : "info", 14), h("span", {}, why));
  const card = h("div", { class: `question${sensitive || youOnly || appliedBefore ? " sensitive" : ""}` },
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
  // AI drafts only for new free-text questions, never for sensitive ones, and always for review.
  const textual = !r.field.options.length && ["text", "textarea"].includes(r.field.control);
  if (textual && r.decision.kind === "ask" && r.decision.reason === "unknown") {
    const note = h("span", { class: "ai-note" });
    const draft = button("Draft with on-device AI", { variant: "ghost", icon: "wand", size: "sm" });
    draft.addEventListener("click", async () => {
      busy(draft, true);
      note.textContent = "Drafting on your laptop…";
      const profileNow = await loadProfile();
      const text = await draftAnswer(r.field.label, profileNow, ctx.job).catch(() => null);
      busy(draft, false);
      if (!text) {
        note.textContent = (await aiStatus()) === "unavailable"
          ? "On-device AI isn't available in this Chrome. Please write it yourself."
          : "Not enough facts in your profile to answer honestly. Please write it yourself.";
        return;
      }
      input.value = text;
      const warnings = checkDraft(text, profileNow, ctx.job);
      if (r.field.maxLength && text.length > r.field.maxLength) {
        warnings.push(`It is ${text.length} characters; this field allows ${r.field.maxLength}. Shorten it.`);
      }
      note.className = `ai-note${warnings.length ? " warn" : ""}`;
      note.textContent = ["Review before saving. AI can be wrong.", ...warnings].join(" ");
    });
    left.append(draft, note);
  }
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
    const entry: AnswerEntry = { question: questionKey(r.field), answer: value, topic, updatedAt: new Date().toISOString() };
    busy(save, true);
    // An answer to a question ApplyAgent asked goes straight to the answer bank; only edits of filled fields are corrections.
    await updateAnswers((answers) => upsertAnswer(answers, entry));
    await ctx.onSaved();
    busy(save, false);
  });
  foot.append(left, save);
  card.append(foot);
  return card;
}

function renderQuestions(report: RunReport): void {
  const box = $("questions");
  box.replaceChildren();
  const pending = report.fields.filter((f) => f.status === "needs_user" || (f.status === "failed" && f.field.required));
  if (!pending.length) return;
  box.append(h("p", { class: "section-label" }, `Needs your answer · ${pending.length}`));
  const corrections = cachedCorrections;

  const hasConsent = pending.some((f) => f.field.control === "checkbox" && isPrivacyConsentCheckbox(f.field.label));
  if (hasConsent) {
    const consentBtn = button("Tick the privacy/data-processing consent boxes on this page", {
      variant: "secondary",
      icon: "check",
    });
    consentBtn.id = "tick-consent";
    consentBtn.style.marginBottom = "8px";
    consentBtn.style.width = "100%";
    consentBtn.addEventListener("click", async () => {
      busy(consentBtn, true);
      const res = (await send({ type: "TICK_CONSENT" })) as { count?: number } | undefined;
      const count = res?.count ?? 0;
      toast(count > 0 ? `Ticked ${count} privacy consent box${count === 1 ? "" : "es"}` : "No privacy consent boxes found to tick");
      await run();
      busy(consentBtn, false);
    });
    box.append(consentBtn);
  }
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

function showReport(report: RunReport | undefined): void {
  const tabId = runTabId;
  void activeTab().then((tab) => (lastReport = { report, url: report?.url ?? tab?.url ?? "", tabId: tabId ?? tab?.id }));
  $("report-problem").hidden = false;
  ($("submit") as HTMLButtonElement).hidden = true;
  $("questions").replaceChildren();
  if (!report) {
    $("fields").replaceChildren();
    $("fields-box").hidden = true;
    setStatus("No application form found on this page. Open the job's application form and try again.", "warn");
    return;
  }
  renderFields(report);
  renderQuestions(report);
  switch (report.status) {
    case "submitted_confirmed":
      markState("celebrate");
      setStatus(`Applied. ${report.confirmationText ?? "The employer's site confirmed your application."}`, "ok");
      break;
    case "submitted_unconfirmed":
      setStatus("Submitted, but the site showed no confirmation. Check the page; the tracker marks it 'needs check'.", "warn");
      break;
    case "ready_to_submit":
      setStatus(`${report.steps ? `Completed ${report.steps - 1} step${report.steps === 2 ? "" : "s"} and reached the last one. ` : ""}Every required field is filled. Review the form on the page, then submit.`, "ok");
      ($("submit") as HTMLButtonElement).hidden = false;
      break;
    case "needs_user": {
      const parts = [];
      if (report.captcha) parts.push("Solve the CAPTCHA on the page, then press Fill again.");
      if (report.errors.length) parts.push(`The site reported: ${report.errors.join("; ")}`);
      if (report.fields.some((f) => f.status === "needs_user")) parts.push("Answer the questions below.");
      setStatus(parts.join(" ") || "Some required fields could not be filled.", "warn");
      break;
    }
    default:
      setStatus("No application form found on this page.", "warn");
  }
  const reviews = report.fields.filter((f) => f.review).length;
  if (reviews && report.status !== "submitted_confirmed") {
    setStatus(`${$("status").textContent ?? ""} ${reviews} value${reviews === 1 ? "" : "s"} pre-filled by the site differ${reviews === 1 ? "s" : ""} from your profile: check ${reviews === 1 ? "it" : "them"} in Field details before submitting.`, "warn");
    ($("fields-box") as HTMLDetailsElement).open = true;
  }
}

function busy(b: HTMLButtonElement, on: boolean): void {
  b.disabled = on;
  b.classList.toggle("loading", on);
}

const MAX_PAGE_STEPS = 6;


async function run(): Promise<void> {
  // Over the free allowance, still fill (useful) but never auto-submit.
  const runMode = mode() === "auto" && !(await canSubmit()) ? "review" : mode();
  busy($("run"), true);
  ($("submit") as HTMLButtonElement).hidden = true; // no Submit while a fill is under way
  markState("working");
  setStatus("Reading the form and filling what it knows…", "info");
  agentRunning = true;
  const tabId = (await activeTab())?.id ?? -1;
  runTabId = tabId;
  const submittedBefore = (await pendingSubmission(tabId))?.id;
  try {
    // One-time access ends when the page changes: a next step on a site that is not allowed is out of reach.
    const oneTimeOnly = $("page-access").textContent === "This visit";
    let loads = navigations.get(tabId) ?? 0;
    let moved = false;
    let report = await send({ type: "RUN", mode: runMode });
    // No form, and the page did not move on by itself (a "Next" that loads a new page is handled below):
    // it may be the job description, so open the application first. Opening it is not a step of it.
    // Chrome reports a page load a moment after the old page stops answering: wait for it before deciding.
    if (!report) await sleep(900);
    if (!report && (navigations.get(tabId) ?? 0) === loads) {
      report = await viaApplicationPage({ type: "RUN", mode: runMode }, report);
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
        setStatus("Submitted. Waiting for the employer's confirmation: check the tab or your email.", "info");
        return;
      }
      setStatus("Moved to the next step. Filling it…", "info");
      report = await send({ type: "RUN", mode: runMode, continuing: true });
    }
    if (!report && moved && oneTimeOnly) {
      setStatus(`The next step opened on a new page. Click the ApplyAgent icon there${keys.fill ? ` (or press ${keys.fill})` : ""} to continue, or allow the site so it continues by itself.`, "warn");
      return;
    }
    showReport(report);
  } finally {
    agentRunning = false;
    runTabId = undefined;
    busy($("run"), false);
    markState("idle");
    await refreshPage();
  }
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
  busy($("preview"), true);
  markState("working");
  agentRunning = true;
  runTabId = (await activeTab())?.id;
  try {
    const report = await viaApplicationPage({ type: "SCAN" }, await send({ type: "SCAN" }));
    showReport(report);
    ($("submit") as HTMLButtonElement).hidden = true; // a preview never leads straight to submitting
    $("questions").replaceChildren();
    if (report) {
      const fill = report.fields.filter((f) => f.status === "filled").length;
      const ask = report.fields.filter((f) => f.status === "needs_user").length;
      setStatus(`Preview: would fill ${fill} field${fill === 1 ? "" : "s"} and ask you ${ask} question${ask === 1 ? "" : "s"}. Nothing was typed or uploaded. Open "Field details" to see each one.`, "info");
      ($("fields-box") as HTMLDetailsElement).open = true;
    }
  } finally {
    agentRunning = false;
    runTabId = undefined;
    busy($("preview"), false);
    markState("idle");
  }
});
$("submit").addEventListener("click", async () => {
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
    showReport(await send({ type: "SUBMIT" }));
  } finally {
    agentRunning = false;
    runTabId = undefined;
    busy($("submit"), false);
    markState("idle");
  }
});

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

// --- Profile -----------------------------------------------------------------------------------------
const PROFILE_GROUPS: Array<{ title: string; fields: Array<[ProfileKey, string, string, boolean?]> }> = [
  { title: "Personal", fields: [
    ["firstName", "First name", "text"], ["lastName", "Last name", "text"], ["email", "Email", "email"],
    ["phone", "Phone", "tel"], ["location", "City", "text"], ["country", "Country", "text"],
  ] },
  { title: "Address & Location", fields: [
    ["addressLine1", "Address line 1", "text", true],
    ["addressLine2", "Address line 2 (apt, suite)", "text", true],
    ["state", "State / Province", "text"],
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
let profile: Profile = { ...EMPTY_PROFILE };
const MAX_RESUME_BYTES = 5 * 1024 * 1024;

function showResume(text: string, hasFile: boolean): void {
  $("resume-name").textContent = text;
  $("resume").closest(".dropzone")?.classList.toggle("has-file", hasFile);
}

async function renderProfile(): Promise<void> {
  profile = await loadProfile();
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
      const input = h("input", { class: "input", type, name: key, autocomplete: "off" });
      input.value = profile[key] ?? "";
      grid.append(h("label", { class: `field-label${full ? " span-2" : ""}` }, label, input));
    }
    form.append(h("div", { class: "card" }, h("div", { class: "card-head" }, h("h2", {}, group.title)), grid));
  }
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
  const row = (name = "", years = 1, level = "Intermediate") => {
    const nameInput = h("input", { class: "input", type: "text", "data-skill": "name", placeholder: "Skill name (e.g. Python)", autocomplete: "off" }) as HTMLInputElement;
    nameInput.value = name;
    const yearsInput = h("input", { class: "input", type: "number", min: "0", max: "50", "data-skill": "years", placeholder: "Years" }) as HTMLInputElement;
    yearsInput.value = String(years);
    const levelSelect = h("select", { class: "input", "data-skill": "level" },
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
  entries.forEach((s) => list.append(row(s.name, s.years, s.level || "Intermediate")));

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
  const row = (language = "", proficiency = "Fluent") => {
    const langInput = h("input", { class: "input", type: "text", "data-lang": "name", placeholder: "Language (e.g. English)", autocomplete: "off" }) as HTMLInputElement;
    langInput.value = language;
    const profSelect = h("select", { class: "input", "data-lang": "proficiency" },
      h("option", { value: "Basic" }, "Basic"),
      h("option", { value: "Conversational" }, "Conversational"),
      h("option", { value: "Professional" }, "Professional"),
      h("option", { value: "Fluent" }, "Fluent"),
      h("option", { value: "Native" }, "Native"),
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
    const years = parseInt(row.querySelector<HTMLInputElement>("[data-skill='years']")?.value ?? "0", 10) || 0;
    const level = row.querySelector<HTMLSelectElement>("[data-skill='level']")?.value ?? "Intermediate";
    return { name, years, level };
  }).filter((s) => s.name);
}

function readLanguagesFromUI(): LanguageEntry[] {
  return Array.from(document.querySelectorAll<HTMLElement>("#languages-list .lang-row")).map((row) => {
    const language = row.querySelector<HTMLInputElement>("[data-lang='name']")?.value.trim() ?? "";
    const proficiency = (row.querySelector<HTMLSelectElement>("[data-lang='proficiency']")?.value ?? "Fluent") as any;
    return { language, proficiency };
  }).filter((l) => l.language);
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
  profile.resume = { name: file.name, type: file.type || "application/octet-stream", dataBase64: btoa(binary) };
  showResume(`${file.name} · not saved yet`, true);
});

$("save-profile").addEventListener("click", async () => {
  for (const key of PROFILE_KEYS) {
    const input = document.querySelector<HTMLInputElement>(`#profile-form input[name='${key}']`);
    profile[key] = input?.value.trim() ?? "";
  }
  const work = readWorkHistory();
  if (work.length) profile.workHistory = work;
  else delete profile.workHistory;
  profile.workHistoryComplete = (document.querySelector<HTMLInputElement>("#work-history-complete"))?.checked ?? false;

  const skills = readSkillsInventoryFromUI();
  if (skills.length) profile.skillsInventory = skills;
  else delete profile.skillsInventory;
  profile.skillsComplete = (document.querySelector<HTMLInputElement>("#skills-complete"))?.checked ?? false;

  const languages = readLanguagesFromUI();
  if (languages.length) profile.languages = languages;
  else delete profile.languages;
  profile.languagesComplete = (document.querySelector<HTMLInputElement>("#languages-complete"))?.checked ?? false;

  await saveProfile(profile);
  showResume(profile.resume ? profile.resume.name : "Upload your resume (PDF or DOCX, max 5 MB)", !!profile.resume);
  toast("Profile saved");
  if (feedJobs.length) await renderFeed(); // preferences changed: re-rank the jobs
});

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

async function renderQuick(): Promise<void> {
  const facts = { ...EMPTY_FACTS, ...((await loadProfile()).facts ?? {}) };
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
  declineDiversity.addEventListener("click", async () => {
    for (const key of ["gender", "hispanic", "race", "veteran", "disability"]) {
      const select = card.querySelector<HTMLSelectElement>(`[data-fact="${key}"]`);
      if (select) select.value = "Decline";
    }
    const next = { ...EMPTY_FACTS };
    card.querySelectorAll<HTMLInputElement | HTMLSelectElement>("[data-fact]").forEach((el) => {
      (next as Record<string, string>)[el.dataset.fact!] = el.value.trim();
    });
    const current = await loadProfile();
    await saveProfile({ ...current, facts: next });
    profile = { ...profile, facts: next };
    toast("Diversity answers set to 'Prefer not to say'");
  });
  save.addEventListener("click", async () => {
    const next = { ...EMPTY_FACTS };
    card.querySelectorAll<HTMLInputElement | HTMLSelectElement>("[data-fact]").forEach((el) => {
      (next as Record<string, string>)[el.dataset.fact!] = el.value.trim();
    });
    const current = await loadProfile();
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

async function renderTracker(): Promise<void> {
  const records = await loadApplications();
  const now = new Date();
  const applied = records.filter((r) => r.status === "applied_confirmed").length;
  document.querySelector("[data-stat='applied']")!.textContent = String(applied);
  document.querySelector("[data-stat='check']")!.textContent = String(records.filter((r) => r.status === "needs_check").length);
  document.querySelector("[data-stat='month']")!.textContent = String(submittedThisMonth(records, now));
  setCount("tracker", applied);
  const list = $("tracker-list");
  list.replaceChildren();
  if (!records.length) {
    list.append(empty("tracker", "No applications yet", "Every application appears here, marked Applied only when the employer's site confirms it."));
    return;
  }
  for (const r of records) {
    const [text, tone] = RECORD_CHIP[r.status];
    const body = h("div", { class: "item-body" },
      h("div", { class: "item-top" }, h("span", { class: "item-title" }, r.jobTitle || hostOf(r.url) || "Application"), chip(text, tone)),
      h("div", { class: "item-sub" }, [hostOf(r.url), r.platform, relativeDate(r.createdAt)].filter(Boolean).join(" · ")));
    if (r.confirmationText) body.append(h("div", { class: "item-quote" }, r.confirmationText));
    const actions = h("div", { class: "item-actions" });
    if (r.screenshotKey) {
      const view = button("View proof", { variant: "ghost", icon: "image", size: "sm" });
      view.addEventListener("click", async () => {
        const data = await chrome.storage.local.get(r.screenshotKey!);
        ($("proof") as HTMLImageElement).src = data[r.screenshotKey!] as string;
        ($("proof-dialog") as HTMLDialogElement).showModal();
      });
      actions.append(view);
    }
    const open = button("Open", { variant: "ghost", icon: "external", size: "sm" });
    open.addEventListener("click", () => void chrome.tabs.create({ url: r.url }));
    actions.append(open);
    body.append(actions);
    list.append(h("li", { class: "item" }, body));
  }
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
  await renderInbox(queue);

  const list = $("queue-list");
  list.replaceChildren();
  if (!queue.length) {
    list.append(empty("queue", "Your queue is empty", "Add job links above, or pick great fits from the Jobs section."));
    return;
  }
  for (const q of queue) {
    const [text, tone] = QUEUE_CHIP[q.status];
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
$("queue-start").addEventListener("click", () => void queueMessage({ type: "QUEUE_START" }));
$("queue-pause").addEventListener("click", () => void queueMessage({ type: "QUEUE_PAUSE" }));
$("queue-clear").addEventListener("click", () => void queueMessage({ type: "QUEUE_CLEAR_FINISHED" }));

// Live updates while the queue runs in the background.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.corrections?.newValue) cachedCorrections = changes.corrections.newValue as UserCorrection[];
  if (changes.queue || changes.queueRunning || changes.settings) void renderQueue();
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
$("export-backup").addEventListener("click", async () => {
  const backup = makeBackup({
    profile: await loadProfile(), answers: await loadAnswers(), applications: await loadApplications(), settings: await loadSettings(),
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
  await renderProfile();
  await renderSetup();
  toast(`Restored: profile, ${backup.answers.length} answers, ${backup.applications.length} applications`);
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
  const { accountEmail } = await chrome.storage.local.get("accountEmail");
  const accStatus = document.getElementById("account-status");

  if (license) {
    const isLife = isLifetimeLicense(license);
    const until = new Date(license.exp * 1000).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
    $("plan-status").textContent = isLife ? "Founder · Lifetime Pass active" : `Pro · unlimited applications until ${until}`;
    pill.textContent = isLife ? "Founder" : "Pro";
    pill.className = "plan-pill pro";
    badge.textContent = isLife ? "Founder" : "Pro";
    badge.className = "chip accent";
    meter.style.width = "100%";
    meter.parentElement!.classList.remove("low");
    if (accStatus) {
      accStatus.textContent = typeof accountEmail === "string" && accountEmail
        ? `Account: ${accountEmail} (${isLife ? "Founder Pass" : "Pro Plan"})`
        : `Account: ${isLife ? "Founder Pass Active" : "Pro Active"}`;
    }
  } else {
    $("plan-status").textContent = `Free · ${left} of ${FREE_MONTHLY_SUBMISSIONS} applications left this month`;
    pill.textContent = `Free · ${left} left`;
    pill.className = "plan-pill";
    badge.textContent = left ? "Free" : "Limit reached";
    badge.className = `chip ${left ? "" : "warn"}`;
    meter.style.width = `${(left / FREE_MONTHLY_SUBMISSIONS) * 100}%`;
    meter.parentElement!.classList.toggle("low", left <= 5);
    if (accStatus) {
      accStatus.textContent = typeof accountEmail === "string" && accountEmail
        ? `Account: ${accountEmail} (Free Plan)`
        : "Account: Guest (Community Free)";
    }
  }
  $("buy-row").hidden = !licensingConfigured();
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
$("account-portal-btn")?.addEventListener("click", () => {
  void chrome.tabs.create({ url: "https://saurav-gupta-9741.github.io/Apply-Agent/login.html" });
});
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

/** Free-plan guard before any submission started from the panel. */
async function canSubmit(): Promise<boolean> {
  if ((await remaining()) > 0) return true;
  setStatus(`You've used all ${FREE_MONTHLY_SUBMISSIONS} free applications this month. Upgrade to Pro in Profile & plan.`, "warn");
  return false;
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

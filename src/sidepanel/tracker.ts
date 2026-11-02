/** Tracker as a light CRM, all on this computer: stages, notes, follow-up dates, filters, CSV export and a small
 * analytics card. Submitted applications (recorded by the agent) and jobs saved from any page ("Save this job") are
 * shown together, but saved jobs are stored apart, so they never count as submissions.
 *
 * The pure helpers at the top have no DOM access (the background worker imports them for follow-up reminders). */

import type { ApplicationRecord, SavedJob, TrackerStage } from "../shared/types";
import { applicationKey } from "../shared/license";
import { loadApplications, loadSavedJobs, updateApplications, updateSavedJobs } from "../shared/storage";
import { icon } from "./icons";
// >>> L4 competitor import
import { importCompetitorCsv } from "../shared/import-competitors";
// <<< L4

export const STAGES: TrackerStage[] = ["Saved", "Applied", "Assessment", "Interview", "Offer", "Rejected", "Withdrawn"];
/** The employer answered: these count towards the response rate. */
export const RESPONSE_STAGES: ReadonlySet<TrackerStage> = new Set<TrackerStage>(["Assessment", "Interview", "Offer"]);
/** Finished: no follow-up is due any more. */
export const CLOSED_STAGES: ReadonlySet<TrackerStage> = new Set<TrackerStage>(["Offer", "Rejected", "Withdrawn"]);

export interface TrackerEntry {
  kind: "application" | "saved";
  id: string;
  url: string;
  title: string;
  company: string;
  stage: TrackerStage;
  notes: string;
  followUpAt: string;
  createdAt: string;
  appliedAt?: string;
  respondedAt?: string;
  record?: ApplicationRecord;
}

/** "YYYY-MM-DD" in local time. */
export function localDay(date: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

export function companyFromUrl(url: string): string {
  try {
    const u = new URL(url);
    if (/(greenhouse\.io|lever\.co|ashbyhq\.com|workable\.com|smartrecruiters\.com)$/.test(u.hostname)) {
      return u.searchParams.get("for") ?? u.pathname.split("/").filter(Boolean)[0] ?? "";
    }
    return u.hostname.replace(/^(www|careers|jobs|in|uk)\./, "").split(".")[0] ?? "";
  } catch {
    return "";
  }
}

/** All tracker rows, newest first. A saved job that was later applied for through ApplyAgent shows once, as the
 * application. */
export function trackerEntries(records: ApplicationRecord[], saved: SavedJob[]): TrackerEntry[] {
  const applied = new Set(records.map((r) => applicationKey(r.url)));
  const fromRecords = records.map((r): TrackerEntry => ({
    kind: "application", id: r.id, url: r.url, title: r.jobTitle, company: r.company || companyFromUrl(r.url),
    stage: r.stage ?? "Applied", notes: r.notes ?? "", followUpAt: r.followUpAt ?? "", createdAt: r.createdAt,
    appliedAt: r.submittedAt ?? r.createdAt, respondedAt: r.respondedAt, record: r,
  }));
  const fromSaved = saved.filter((s) => !applied.has(applicationKey(s.url))).map((s): TrackerEntry => ({
    kind: "saved", id: s.id, url: s.url, title: s.title, company: s.company, stage: s.stage, notes: s.notes ?? "",
    followUpAt: s.followUpAt ?? "", createdAt: s.createdAt, appliedAt: s.appliedAt, respondedAt: s.respondedAt,
  }));
  return [...fromRecords, ...fromSaved].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

interface StageFields {
  stage?: TrackerStage;
  appliedAt?: string;
  respondedAt?: string;
  stageChangedAt?: string;
}

/** Move to a stage, keeping when the user applied and when the employer first responded (for the analytics). */
export function withStage<T extends StageFields>(item: T, stage: TrackerStage, now: Date, tracksApplied: boolean): T {
  const at = now.toISOString();
  const next: T = { ...item, stage, stageChangedAt: at };
  if (tracksApplied && !next.appliedAt && stage !== "Saved" && stage !== "Withdrawn") next.appliedAt = at;
  if (RESPONSE_STAGES.has(stage) && !next.respondedAt) next.respondedAt = at;
  return next;
}

export function followUpsDue(entries: TrackerEntry[], today: string): TrackerEntry[] {
  return entries.filter((e) => e.followUpAt && e.followUpAt <= today && !CLOSED_STAGES.has(e.stage));
}

/** The next follow-up day still to come (for the reminder alarm), or undefined. */
export function nextFollowUp(entries: TrackerEntry[], today: string): string | undefined {
  return entries.filter((e) => e.followUpAt > today && !CLOSED_STAGES.has(e.stage)).map((e) => e.followUpAt).sort()[0];
}

export interface AtsBreakdown {
  ats: string;
  applied: number;
  responded: number;
  responseRate: number | null;
}

export interface CountryBreakdown {
  country: string;
  applied: number;
  responded: number;
  responseRate: number | null;
}

export interface TrackerAnalytics {
  /** Applications in each of the last 8 weeks (Monday to Sunday), oldest first. */
  weeks: Array<{ start: string; count: number }>;
  applied: number;
  responded: number;
  /** Assessment + Interview + Offer over Applied, 0–100; null before the first application. */
  responseRate: number | null;
  medianDaysToResponse: number | null;
  meanDaysToResponse: number | null;
  byAts: AtsBreakdown[];
  byCountry: CountryBreakdown[];
}

function detectAtsFromUrl(url: string): string {
  const lower = url.toLowerCase();
  if (lower.includes("greenhouse.io")) return "Greenhouse";
  if (lower.includes("lever.co")) return "Lever";
  if (lower.includes("ashbyhq.com")) return "Ashby";
  if (lower.includes("workable.com")) return "Workable";
  if (lower.includes("smartrecruiters.com")) return "SmartRecruiters";
  if (lower.includes("personio.de") || lower.includes("personio.com")) return "Personio";
  if (lower.includes("recruitee.com")) return "Recruitee";
  return "Other";
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

export function trackerAnalytics(entries: TrackerEntry[], now: Date): TrackerAnalytics {
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const start = new Date(monday);
    start.setDate(monday.getDate() - 7 * (7 - i));
    return { start, count: 0 };
  });
  const end = new Date(monday);
  end.setDate(monday.getDate() + 7);
  const applied = entries.filter((e) => e.appliedAt && Number.isFinite(Date.parse(e.appliedAt)));
  for (const e of applied) {
    const t = Date.parse(e.appliedAt!);
    if (t < weeks[0]!.start.getTime() || t >= end.getTime()) continue;
    for (let i = weeks.length - 1; i >= 0; i--) {
      if (t >= weeks[i]!.start.getTime()) {
        weeks[i]!.count++;
        break;
      }
    }
  }
  const responded = applied.filter((e) => e.respondedAt && Number.isFinite(Date.parse(e.respondedAt)));
  const days = responded.map((e) => (Date.parse(e.respondedAt!) - Date.parse(e.appliedAt!)) / 86_400_000).filter((d) => d >= 0);
  const med = median(days);
  const meanDays = days.length ? Math.round((days.reduce((a, b) => a + b, 0) / days.length) * 10) / 10 : null;

  // By ATS
  const atsMap = new Map<string, { applied: number; responded: number }>();
  for (const e of applied) {
    const ats = detectAtsFromUrl(e.url);
    const curr = atsMap.get(ats) ?? { applied: 0, responded: 0 };
    curr.applied++;
    if (e.respondedAt) curr.responded++;
    atsMap.set(ats, curr);
  }
  const byAts: AtsBreakdown[] = Array.from(atsMap.entries()).map(([ats, data]) => ({
    ats,
    applied: data.applied,
    responded: data.responded,
    responseRate: data.applied ? Math.round((data.responded / data.applied) * 100) : null,
  })).sort((a, b) => b.applied - a.applied);

  // By Country
  const countryMap = new Map<string, { applied: number; responded: number }>();
  for (const e of applied) {
    const c = e.record?.location?.split(",").pop()?.trim() || "Unspecified";
    const curr = countryMap.get(c) ?? { applied: 0, responded: 0 };
    curr.applied++;
    if (e.respondedAt) curr.responded++;
    countryMap.set(c, curr);
  }
  const byCountry: CountryBreakdown[] = Array.from(countryMap.entries()).map(([country, data]) => ({
    country,
    applied: data.applied,
    responded: data.responded,
    responseRate: data.applied ? Math.round((data.responded / data.applied) * 100) : null,
  })).sort((a, b) => b.applied - a.applied);

  return {
    weeks: weeks.map((w) => ({ start: localDay(w.start), count: w.count })),
    applied: applied.length,
    responded: responded.length,
    responseRate: applied.length ? Math.round((responded.length / applied.length) * 100) : null,
    medianDaysToResponse: med === null ? null : Math.round(med * 10) / 10,
    meanDaysToResponse: meanDays,
    byAts,
    byCountry,
  };
}

/** One CSV cell. Cells that a spreadsheet would run as a formula (=, +, -, @) are made plain text. */
export function csvCell(value: string): string {
  let v = value.replace(/\r?\n/g, " ");
  if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`;
  return /[",]/.test(v) || v !== v.trim() ? `"${v.replace(/"/g, '""')}"` : v;
}

/** The tracker as CSV. Its url, title and company columns are the ones the Queue's CSV import reads. */
export function trackerCsv(entries: TrackerEntry[]): string {
  const header = ["url", "title", "company", "stage", "status", "applied", "responded", "follow_up", "notes", "created"];
  const rows = entries.map((e) => [
    e.url, e.title, e.company, e.stage,
    e.kind === "saved" ? "saved" : e.record?.status ?? "",
    e.appliedAt?.slice(0, 10) ?? "", e.respondedAt?.slice(0, 10) ?? "", e.followUpAt, e.notes, e.createdAt.slice(0, 10),
  ].map(csvCell).join(","));
  return [header.join(","), ...rows].join("\r\n") + "\r\n";
}

const SITE_SUFFIX = /\s*[|·–—-]\s*(LinkedIn|Indeed(\.com)?|Naukri(\.com)?|Glassdoor|foundit|Monster|Wellfound|Instahyre|Internshala|Cutshort|ZipRecruiter|Dice|Shine(\.com)?|apna|Lever|Greenhouse|Ashby|Workable|[\w .]*Careers?|Jobs?)\s*$/i;

/** Job title and company from a tab's title ("Backend Engineer - Acme | LinkedIn", "Acme hiring Backend Engineer in
 * Pune | LinkedIn", "Backend Engineer - Job at Acme in Pune - Naukri.com"). Only the tab's title and address are read:
 * nothing on the page itself. */
export function parseTabTitle(rawTitle: string, url: string): { title: string; company: string } {
  let t = (rawTitle || "").replace(/^\(\d+\+?\)\s*/, "").trim(); // "(3) " unread-count prefix
  for (let i = 0; i < 2; i++) t = t.replace(SITE_SUFFIX, "").trim();
  let m = /^(.+?)\s+hiring\s+(.+?)(?:\s+in\s+.+)?$/i.exec(t);
  if (m) return { title: m[2]!.trim(), company: m[1]!.trim() };
  m = /^(.+?)\s*-\s*Job at\s+(.+?)(?:\s+in\s+.+)?$/i.exec(t);
  if (m) return { title: m[1]!.trim(), company: m[2]!.trim() };
  m = /^(.+?)\s+at\s+(.+)$/i.exec(t);
  if (m && m[2]!.split(/\s+/).length <= 5) return { title: m[1]!.trim(), company: m[2]!.replace(/\s*[|–—-].*$/, "").trim() };
  const parts = t.split(/\s+[|–—-]\s+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) return { title: parts[0]!, company: parts[1]! };
  return { title: t || companyFromUrl(url) || "Saved job", company: companyFromUrl(url) };
}

export type SaveResult = "saved" | "exists" | "no_page";

/** Save a job from the tab's own title and address (any site, LinkedIn and Naukri included: no page script runs). */
export async function saveJobFromTab(tab: { url?: string; title?: string } | undefined, now = new Date()): Promise<SaveResult> {
  const url = tab?.url ?? "";
  if (!/^https?:\/\//i.test(url)) return "no_page";
  const key = applicationKey(url);
  if ((await loadApplications()).some((r) => applicationKey(r.url) === key)) return "exists";
  let result: SaveResult = "saved";
  await updateSavedJobs((jobs) => {
    if (jobs.some((j) => applicationKey(j.url) === key)) {
      result = "exists";
      return jobs;
    }
    const { title, company } = parseTabTitle(tab?.title ?? "", url);
    const at = now.toISOString();
    return [{ id: crypto.randomUUID(), url, title, company, createdAt: at, stage: "Saved", stageChangedAt: at }, ...jobs];
  });
  return result;
}

/** Change one row (stage, notes or follow-up), wherever it is stored. */
export async function editEntry(entry: Pick<TrackerEntry, "kind" | "id">, change: { stage?: TrackerStage; notes?: string; followUpAt?: string }, now = new Date()): Promise<void> {
  const apply = <T extends StageFields & { notes?: string; followUpAt?: string }>(item: T, tracksApplied: boolean): T => {
    let next = { ...item };
    if (change.stage && change.stage !== (item.stage ?? (tracksApplied ? "Saved" : "Applied"))) next = withStage(next, change.stage, now, tracksApplied);
    if (change.notes !== undefined) next.notes = change.notes.slice(0, 5000);
    if (change.followUpAt !== undefined) next.followUpAt = /^\d{4}-\d{2}-\d{2}$/.test(change.followUpAt) ? change.followUpAt : undefined;
    return next;
  };
  if (entry.kind === "saved") await updateSavedJobs((jobs) => jobs.map((j) => (j.id === entry.id ? apply(j, true) : j)));
  else await updateApplications((records) => records.map((r) => (r.id === entry.id ? apply(r, false) : r)));
}

export async function removeSavedJob(id: string): Promise<void> {
  await updateSavedJobs((jobs) => jobs.filter((j) => j.id !== id));
}

// --- panel UI (DOM) --------------------------------------------------------------------------------------
type Child = Node | string | null | undefined | false;

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string | boolean | undefined> = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) continue;
    if (key === "class") node.className = String(value);
    else node.setAttribute(key, value === true ? "" : String(value));
  }
  for (const child of children) if (child) node.append(child);
  return node;
}

function smallButton(label: string, iconName?: string, variant = "ghost"): HTMLButtonElement {
  const b = el("button", { class: `btn btn-${variant} btn-sm`, type: "button" });
  if (iconName) b.append(icon(iconName, 16));
  b.append(el("span", {}, label));
  return b;
}

const STAGE_TONE: Record<TrackerStage, string> = {
  Saved: "", Applied: "info", Assessment: "accent", Interview: "accent", Offer: "ok", Rejected: "bad", Withdrawn: "",
};

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
}

function shortDate(iso: string): string {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "";
}

export interface TrackerUi {
  toast: (text: string, tone?: "ok" | "warn" | "bad" | "") => void;
  showProof: (screenshotKey: string) => void;
}

let stageFilter: TrackerStage | "" = "";

function renderAnalytics(entries: TrackerEntry[], now: Date): void {
  const box = document.getElementById("tracker-analytics");
  if (!box) return;
  const a = trackerAnalytics(entries, now);
  box.hidden = entries.length === 0;
  const max = Math.max(1, ...a.weeks.map((w) => w.count));
  const bars = el("div", { class: "week-bars", role: "img", "aria-label": `Applications per week, last 8 weeks: ${a.weeks.map((w) => w.count).join(", ")}` });
  for (const w of a.weeks) {
    const bar = el("span", { class: "week-bar", title: `Week of ${shortDate(w.start)}: ${w.count}` });
    bar.style.setProperty("--h", `${Math.round((w.count / max) * 100)}%`);
    bars.append(el("span", { class: "week-col" }, bar, el("span", { class: "week-n" }, String(w.count))));
  }
  box.replaceChildren(
    el("div", { class: "card-head" }, el("h2", {}, "Your search"), el("span", { class: "muted" }, "Last 8 weeks")),
    bars,
    el("div", { class: "stats stats-3 analytics-stats" },
      el("div", { class: "stat" }, el("span", { class: "stat-value", "data-stat": "response-rate" }, a.responseRate === null ? "–" : `${a.responseRate}%`), el("span", { class: "stat-label" }, "Response rate")),
      el("div", { class: "stat" }, el("span", { class: "stat-value", "data-stat": "median-days" }, a.medianDaysToResponse === null ? "–" : String(a.medianDaysToResponse)), el("span", { class: "stat-label" }, "Median days to reply")),
      el("div", { class: "stat" }, el("span", { class: "stat-value", "data-stat": "responses" }, `${a.responded}/${a.applied}`), el("span", { class: "stat-label" }, "Replies / applied"))),
  );
}

function renderFilter(entries: TrackerEntry[]): void {
  const select = document.getElementById("tracker-filter") as HTMLSelectElement | null;
  if (!select) return;
  const counts = new Map<TrackerStage, number>();
  for (const e of entries) counts.set(e.stage, (counts.get(e.stage) ?? 0) + 1);
  select.replaceChildren(el("option", { value: "" }, `All stages (${entries.length})`),
    ...STAGES.map((s) => el("option", { value: s }, `${s} (${counts.get(s) ?? 0})`)));
  select.value = stageFilter;
}

function entryItem(e: TrackerEntry, today: string, ui: TrackerUi): HTMLLIElement {
  const due = !!e.followUpAt && e.followUpAt <= today && !CLOSED_STAGES.has(e.stage);
  const top = el("div", { class: "item-top" }, el("span", { class: "item-title" }, e.title || hostOf(e.url) || "Application"),
    el("span", { class: `chip ${STAGE_TONE[e.stage]}`, "data-stage": e.stage }, e.stage));
  if (e.record?.status === "needs_check") top.append(el("span", { class: "chip warn" }, "Needs check"));
  if (e.record?.status === "in_progress") top.append(el("span", { class: "chip info" }, "Submitting"));
  if (due) top.append(el("span", { class: "chip warn", "data-due": "" }, "Follow up"));
  const body = el("div", { class: "item-body" }, top,
    el("div", { class: "item-sub" }, [e.company, hostOf(e.url), shortDate(e.createdAt)].filter(Boolean).join(" · ")));
  if (e.record?.confirmationText) body.append(el("div", { class: "item-quote" }, e.record.confirmationText));

  const stage = el("select", { class: "input crm-stage", "aria-label": `Stage of ${e.title || "this application"}` },
    ...STAGES.map((s) => el("option", { value: s }, s)));
  stage.value = e.stage;
  stage.addEventListener("change", () => void editEntry(e, { stage: stage.value as TrackerStage }).then(() => ui.toast(`Moved to ${stage.value}`)));
  const follow = el("input", { class: "input crm-follow", type: "date", value: e.followUpAt, "aria-label": `Follow-up date for ${e.title || "this application"}` });
  follow.addEventListener("change", () => void editEntry(e, { followUpAt: follow.value }).then(() => ui.toast(follow.value ? `Follow-up set for ${shortDate(follow.value)}` : "Follow-up cleared")));
  const notes = el("textarea", { class: "input crm-notes", rows: "3", placeholder: "Recruiter, salary range, next steps…", "aria-label": `Notes for ${e.title || "this application"}` });
  notes.value = e.notes;
  notes.addEventListener("change", () => void editEntry(e, { notes: notes.value }).then(() => ui.toast("Notes saved")));
  const details = el("details", { class: "crm-details" }, el("summary", {}, e.notes ? "Notes" : "Add notes"), notes);
  body.append(el("div", { class: "crm-row" },
    el("label", { class: "crm-field" }, el("span", { class: "muted" }, "Stage"), stage),
    el("label", { class: "crm-field" }, el("span", { class: "muted" }, "Follow up on"), follow)), details);

  const actions = el("div", { class: "item-actions" });
  if (e.record?.screenshotKey) {
    const view = smallButton("View proof", "image");
    view.addEventListener("click", () => ui.showProof(e.record!.screenshotKey!));
    actions.append(view);
  }
  const open = smallButton("Open", "external");
  open.addEventListener("click", () => void chrome.tabs.create({ url: e.url }));
  actions.append(open);
  if (e.kind === "saved") {
    const remove = smallButton("Remove", "trash");
    remove.addEventListener("click", () => void removeSavedJob(e.id).then(() => ui.toast("Removed from the tracker")));
    actions.append(remove);
  }
  body.append(actions);
  return el("li", { class: "item", "data-kind": e.kind, "data-entry": e.id }, body);
}

/** Renders the tracker list, filter, follow-up banner and analytics. Returns the number of follow-ups due. */
export async function renderTrackerCrm(ui: TrackerUi, now = new Date()): Promise<number> {
  const [records, saved] = await Promise.all([loadApplications(), loadSavedJobs()]);
  const entries = trackerEntries(records, saved);
  const today = localDay(now);
  const due = followUpsDue(entries, today);
  renderFilter(entries);
  renderAnalytics(entries, now);

  const banner = document.getElementById("tracker-due");
  if (banner) {
    banner.hidden = !due.length;
    banner.textContent = due.length
      ? `${due.length} follow-up${due.length === 1 ? "" : "s"} due: ${due.slice(0, 3).map((e) => e.company || e.title).filter(Boolean).join(", ")}${due.length > 3 ? "…" : ""}`
      : "";
  }
  const navDue = document.querySelector<HTMLElement>("[data-due-count='tracker']");
  if (navDue) {
    navDue.textContent = due.length ? `${due.length} due` : "";
    navDue.hidden = !due.length;
  }
  const countBadge = document.querySelector<HTMLElement>("[data-count='tracker']");
  if (countBadge) {
    const applied = records.filter((r) => r.status === "applied_confirmed").length;
    countBadge.textContent = applied > 0 ? String(applied) : "";
  }

  // >>> L4 competitor import card toggle
  const importCard = document.getElementById("competitor-import-card");
  if (importCard) {
    importCard.hidden = records.length > 0;
  }
  // <<< L4

  const list = document.getElementById("tracker-list");
  if (!list) return due.length;
  list.replaceChildren();
  const shown = stageFilter ? entries.filter((e) => e.stage === stageFilter) : entries;
  if (!shown.length) {
    const wrap = el("span", { class: "icon-wrap" });
    wrap.append(icon("tracker", 20));
    list.append(el("li", { class: "empty" }, wrap,
      el("strong", {}, entries.length ? `Nothing in ${stageFilter}` : "No applications yet"),
      el("span", {}, entries.length ? "Choose another stage above." : "Every application appears here, marked Applied only when the employer's site confirms it. Use \"Save this job\" on any job page to keep it here too.")));
    return due.length;
  }
  for (const e of shown) list.append(entryItem(e, today, ui));
  return due.length;
}

/** Wire the tracker's own controls once (filter, export) and re-render on changes to saved jobs. */
export function initTracker(ui: TrackerUi, rerender: () => void): void {
  const select = document.getElementById("tracker-filter") as HTMLSelectElement | null;
  select?.addEventListener("change", () => {
    stageFilter = select.value as TrackerStage | "";
    rerender();
  });
  document.getElementById("tracker-export")?.addEventListener("click", async () => {
    const [records, saved] = await Promise.all([loadApplications(), loadSavedJobs()]);
    const csv = trackerCsv(trackerEntries(records, saved));
    const url = URL.createObjectURL(new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" }));
    const link = el("a", { href: url, download: `applyagent-tracker-${localDay(new Date())}.csv` });
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    ui.toast("Tracker exported as CSV");
  });
  document.getElementById("save-job-btn")?.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const res = await saveJobFromTab(tab);
    if (res === "saved") ui.toast("Job saved to Tracker", "ok");
    else if (res === "exists") ui.toast("This job is already in your Tracker", "warn");
    else ui.toast("No web page to save", "bad");
    rerender();
  });
  // >>> L4 competitor import
  const handleImportFile = async (file: File) => {
    try {
      const text = await file.text();
      const imported = importCompetitorCsv(text);
      if (!imported.length) {
        ui.toast("No valid applications found in that CSV file", "warn");
        return;
      }
      await updateApplications((existing) => [...imported, ...existing]);
      ui.toast(`${imported.length} applications imported from CSV!`, "ok");
      rerender();
    } catch (e) {
      ui.toast(`Failed to import CSV: ${String(e)}`, "bad");
    }
  };

  const importInput = document.getElementById("tracker-import-file") as HTMLInputElement | null;
  importInput?.addEventListener("change", async () => {
    const file = importInput.files?.[0];
    if (file) await handleImportFile(file);
    importInput.value = "";
  });

  const importBtnInput = document.getElementById("tracker-import-file-btn") as HTMLInputElement | null;
  importBtnInput?.addEventListener("change", async () => {
    const file = importBtnInput.files?.[0];
    if (file) await handleImportFile(file);
    importBtnInput.value = "";
  });
  // <<< L4
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && (changes.savedJobs || changes.applications)) rerender();
  });
}

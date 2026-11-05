/** A resume for one application only (Apply panel → "Use a different resume").
 *
 * The file is kept per tab in chrome.storage.session (cleared when the browser closes), never in
 * chrome.storage.local, and never in the Profile: the Profile's resume stays as it is. The panel sends it with the
 * RUN message of a Fill in that tab; the page script then attaches it instead of the Profile's resume. The queue
 * (background runner) never sends one, so queued applications always get the Profile's resume. */

import type { Message, Profile, ResumeFile, RunReport } from "./types";

/** The same limits as the Profile upload. */
export const MAX_RESUME_BYTES = 5 * 1024 * 1024;
export const RESUME_EXTENSIONS = [".pdf", ".doc", ".docx", ".txt"] as const;
export const RESUME_ACCEPT = RESUME_EXTENSIONS.join(",");
/** Base64 of a 5 MB file, plus padding. */
const MAX_BASE64_CHARS = Math.ceil(MAX_RESUME_BYTES / 3) * 4 + 4;

export interface ResumeOverride {
  resume: ResumeFile;
  /** The page it was chosen on: it is used on that application only. */
  url: string;
  chosenAt: number;
}

const PREFIX = "resumeOverride:";
export const overrideKey = (tabId: number): string => `${PREFIX}${tabId}`;

/** Why this file cannot be used, or null when it can. */
export function checkResumeFile(file: { name: string; size: number }): string | null {
  const name = file.name.toLowerCase();
  if (!RESUME_EXTENSIONS.some((ext) => name.endsWith(ext))) return "Choose a PDF, DOC, DOCX or TXT file";
  if (file.size > MAX_RESUME_BYTES) return "That file is larger than 5 MB";
  if (file.size === 0) return "That file is empty";
  return null;
}

/** The file as stored and sent (the same shape as the Profile's resume). */
export async function fileToResume(file: File): Promise<ResumeFile> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return { name: file.name, type: file.type || "application/octet-stream", dataBase64: btoa(binary) };
}

export function isResumeFile(value: unknown): value is ResumeFile {
  const r = value as ResumeFile | null | undefined;
  return !!r && typeof r === "object" && typeof r.name === "string" && !!r.name.trim() && typeof r.type === "string"
    && typeof r.dataBase64 === "string" && r.dataBase64.length > 0 && r.dataBase64.length <= MAX_BASE64_CHARS;
}

/** The profile a run uses: the user's own, with this application's resume in place of the saved one. A copy: the
 * stored Profile is never changed. Anything that is not a valid resume is ignored. */
export function withResumeOverride(profile: Profile, override: unknown): Profile {
  return isResumeFile(override) ? { ...profile, resume: override } : profile;
}

/** Tracking parameters that do not make a different job. */
const TRACKING = /^(utm_.*|gh_src|source|src|ref|referrer|lever-source.*|lever-origin)$/i;

function parse(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

function query(u: URL): string {
  const kept = Array.from(u.searchParams.entries()).filter(([k]) => !TRACKING.test(k)).sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify(kept);
}

/** Is `url` still the application the resume was chosen for? The same page (the part after # and tracking
 * parameters aside), or a page that continues it on the same site: a job page and its "/apply" page
 * (jobs.example.com/acme/123 → /acme/123/apply). Another job on the same site (/acme/124) is not. An address the
 * browser does not show (empty) is taken as the same, as elsewhere in the panel. */
export function sameApplication(anchor: string, url: string): boolean {
  if (!anchor || !url) return true;
  const a = parse(anchor);
  const b = parse(url);
  if (!a || !b) return anchor.split("#")[0] === url.split("#")[0];
  if (a.host !== b.host) return false;
  const pa = a.pathname.split("/").filter(Boolean);
  const pb = b.pathname.split("/").filter(Boolean);
  if (pa.join("/") === pb.join("/")) return query(a) === query(b);
  const [short, long] = pa.length < pb.length ? [pa, pb] : [pb, pa];
  if (!short.length || short.length === long.length) return false; // a site's home page is not a job
  return short.every((part, i) => long[i] === part);
}

// --- storage (chrome.storage.session, per tab) ----------------------------------------------------------------

export async function loadResumeOverride(tabId: number): Promise<ResumeOverride | undefined> {
  const key = overrideKey(tabId);
  const stored = (await chrome.storage.session.get(key))[key] as ResumeOverride | undefined;
  return stored && isResumeFile(stored.resume) ? stored : undefined;
}

export async function saveResumeOverride(tabId: number, resume: ResumeFile, url: string, now = Date.now()): Promise<ResumeOverride> {
  const override: ResumeOverride = { resume, url, chosenAt: now };
  await chrome.storage.session.set({ [overrideKey(tabId)]: override });
  return override;
}

export async function clearResumeOverride(tabId: number): Promise<void> {
  await chrome.storage.session.remove(overrideKey(tabId));
}

/** Forget the resumes of tabs that are no longer open (closed while the panel was closed). */
export async function pruneResumeOverrides(openTabIds: number[]): Promise<void> {
  const open = new Set(openTabIds.map(String));
  const all = await chrome.storage.session.get(null);
  const gone = Object.keys(all).filter((k) => k.startsWith(PREFIX) && !open.has(k.slice(PREFIX.length)));
  if (gone.length) await chrome.storage.session.remove(gone);
}

/** The tab moved to `url`: forget its resume when that is another application. True when it was forgotten. */
export async function forgetIfMovedOn(tabId: number, url: string | undefined): Promise<boolean> {
  if (!url) return false;
  const override = await loadResumeOverride(tabId);
  if (!override || sameApplication(override.url, url)) return false;
  await clearResumeOverride(tabId);
  return true;
}

/** The RUN message for this tab, with its own resume when it has one. A first step is checked against the page the
 * resume was chosen on (a later step of a run under way may be on a new page of the same application). */
export async function withTabResume(message: Message, tabId: number, tabUrl: string | undefined): Promise<{ message: Message; override?: ResumeOverride }> {
  if (message.type !== "RUN") return { message };
  if (!message.continuing && (await forgetIfMovedOn(tabId, tabUrl))) return { message };
  const override = await loadResumeOverride(tabId);
  return override ? { message: { ...message, resume: override.resume }, override } : { message };
}

/** The checklist line of a resume field that was attached says which file it got. */
export function noteResumeFields(report: RunReport | undefined, fileName: string, thisApplicationOnly: boolean): RunReport | undefined {
  if (!report || !fileName) return report;
  const detail = thisApplicationOnly ? `${fileName} (this application only)` : fileName;
  return {
    ...report,
    fields: report.fields.map((f) => (f.decision.kind === "resume" && f.status === "filled" ? { ...f, detail } : f)),
  };
}

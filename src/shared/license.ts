/** Plans and licences. A licence is a token signed by our server ("payload.signature", ECDSA P-256),
 * verified offline by the extension with the public key, so no login or tracking is needed. */

import type { ApplicationRecord } from "./types";
import { FREE_MONTHLY_SUBMISSIONS, LICENSE_PUBLIC_JWK, LICENSE_SERVER } from "./config";

export interface LicensePayload {
  key: string;
  plan: "pro" | "founder";
  /** Expiry, seconds since epoch. */
  exp: number;
  lifetime?: boolean;
  email?: string;
  /** The one-time 7-day trial (local, unsigned): never a paid licence. */
  trial?: boolean;
}

export type Feature =
  | "single_fill"
  | "answer_bank"
  | "quick_answers"
  | "basic_tracker"
  | "save_form_structure"
  | "queue"
  | "resume_import"
  | "ai_drafts"
  | "tracker_analytics"
  | "enterprise_multistep";

export function isPro(license: LicensePayload | null): boolean {
  if (!license) return false;
  return license.plan === "pro" || license.plan === "founder" || license.trial === true;
}

/** Check if a feature is available on the current license (Free vs Pro). */
export function canUseFeature(license: LicensePayload | null, feature: Feature): boolean {
  switch (feature) {
    case "single_fill":
    case "answer_bank":
    case "quick_answers":
    case "basic_tracker":
    case "save_form_structure":
      return true;
    case "queue":
    case "resume_import":
    case "ai_drafts":
    case "tracker_analytics":
    case "enterprise_multistep":
      return isPro(license);
  }
}

const ECDSA = { name: "ECDSA", namedCurve: "P-256" } as const;
const SIGN = { name: "ECDSA", hash: "SHA-256" } as const;

export function base64urlEncode(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function base64urlDecode(text: string): Uint8Array<ArrayBuffer> {
  const padded = text.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((text.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Returns the payload if the token is genuine and unexpired, else null. Never throws on bad input. */
export async function verifyLicense(token: string, publicJwk: JsonWebKey | null, now: Date): Promise<LicensePayload | null> {
  if (!publicJwk || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, signature] = parts;
  if (!body || !signature) return null;
  try {
    const key = await crypto.subtle.importKey("jwk", publicJwk, ECDSA, false, ["verify"]);
    const sigBytes = base64urlDecode(signature);
    if (sigBytes.byteLength !== 64) return null;
    const ok = await crypto.subtle.verify(SIGN, key, sigBytes, new TextEncoder().encode(body));
    if (!ok) return null;
    const payload = JSON.parse(new TextDecoder().decode(base64urlDecode(body))) as LicensePayload;
    if (
      (payload.plan !== "pro" && payload.plan !== "founder") ||
      typeof payload.exp !== "number" ||
      !Number.isFinite(payload.exp) ||
      payload.exp * 1000 <= now.getTime()
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

/** The application an address belongs to: host and path, without the query, hash or trailing slash, so a rerun of
 * the same application (a reload, a tracking parameter, a second Fill) is the same application. */
export function applicationKey(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname.toLowerCase().replace(/^www\./, "")}${u.pathname.replace(/\/+$/, "").toLowerCase()}`;
  } catch {
    return url.trim().toLowerCase();
  }
}

/** Submissions this month, each application once: submitting the same application again (a rerun, a retry after a
 * site error) never uses a second free fill. */
export function submittedThisMonth(applications: ApplicationRecord[], now: Date): number {
  const seen = new Set<string>();
  for (const a of applications) {
    const d = new Date(a.createdAt);
    if (a.status === "in_progress" || d.getFullYear() !== now.getFullYear() || d.getMonth() !== now.getMonth()) continue;
    seen.add(applicationKey(a.url) || a.id);
  }
  return seen.size;
}

/** Submissions still allowed this month: unlimited on single forms for all users (Free and Pro). */
export function remainingSubmissions(_pro: LicensePayload | null, _applications: ApplicationRecord[], _now: Date): number {
  return Number.POSITIVE_INFINITY;
}

// --- free usage & the one-time Pro trial ---------------------------------------------------------------
/** Upgrade prompts appear at these counts of free fills used this month. */
export const UPGRADE_NUDGE_AT = 15;
export const TRIAL_DAYS = 7;
/** Saving this many answers unlocks the one-time trial (the user has invested in ApplyAgent). */
export const TRIAL_UNLOCK_ANSWERS = 10;

/** The one-time trial, stored only in this browser. Limitation: removing and reinstalling the extension clears
 * chrome.storage.local, so the trial could be unlocked again; there is deliberately no server or ID to stop that. */
export interface ProTrial {
  startedAt: string;
  endsAt: string;
}

export function trialActive(trial: ProTrial | null | undefined, now: Date): boolean {
  return !!trial && Date.parse(trial.endsAt) > now.getTime();
}

/** The trial to start, if this many saved answers unlocks it and it was never used. Null otherwise. */
export function trialToUnlock(existing: ProTrial | null | undefined, answerCount: number, now: Date): ProTrial | null {
  if (existing || answerCount < TRIAL_UNLOCK_ANSWERS) return null;
  return { startedAt: now.toISOString(), endsAt: new Date(now.getTime() + TRIAL_DAYS * 86_400_000).toISOString() };
}

export type UsageLevel = "ok" | "nudge" | "limit";

export interface UsageState {
  used: number;
  limit: number;
  level: UsageLevel;
}

export function usageState(applications: ApplicationRecord[], now: Date): UsageState {
  const used = Math.min(FREE_MONTHLY_SUBMISSIONS, submittedThisMonth(applications, now));
  const level: UsageLevel = used >= FREE_MONTHLY_SUBMISSIONS ? "limit" : used >= UPGRADE_NUDGE_AT ? "nudge" : "ok";
  return { used, limit: FREE_MONTHLY_SUBMISSIONS, level };
}

export async function loadTrial(): Promise<ProTrial | null> {
  const { proTrial } = await chrome.storage.local.get("proTrial");
  const t = proTrial as ProTrial | undefined;
  return t && typeof t.endsAt === "string" && typeof t.startedAt === "string" ? t : null;
}

/** Start the trial once the user saved enough answers (never twice). Returns the trial when it just started. */
export async function maybeUnlockTrial(now = new Date()): Promise<ProTrial | null> {
  const [existing, { answers }] = await Promise.all([loadTrial(), chrome.storage.local.get("answers")]);
  const trial = trialToUnlock(existing, Array.isArray(answers) ? answers.length : 0, now);
  if (trial) await chrome.storage.local.set({ proTrial: trial });
  return trial;
}

// --- storage & server -------------------------------------------------------------------------------
export async function currentLicense(now = new Date()): Promise<LicensePayload | null> {
  const { license, proTrial } = await chrome.storage.local.get(["license", "proTrial"]);
  const paid = typeof license === "string" ? await verifyLicense(license, LICENSE_PUBLIC_JWK, now) : null;
  if (paid) return paid;
  // The one-time 7-day trial counts as Pro while it lasts.
  const trial = proTrial as ProTrial | undefined;
  if (trial && typeof trial.endsAt === "string" && trialActive(trial, now)) {
    return { key: "TRIAL", plan: "pro", exp: Math.floor(Date.parse(trial.endsAt) / 1000), trial: true };
  }
  return null;
}

export function licensingConfigured(): boolean {
  return !!LICENSE_SERVER && !!LICENSE_PUBLIC_JWK;
}

export function isLifetimeLicense(license: LicensePayload | null): boolean {
  if (!license || license.trial) return false;
  return license.lifetime === true || license.plan === "founder" || (license.exp - Date.now() / 1000) > 365 * 86_400 * 3;
}

export function buyUrl(currency: "INR" | "USD", tier: "monthly" | "lifetime" = "monthly", existingKey?: string): string {
  const url = new URL("/buy", LICENSE_SERVER);
  url.searchParams.set("currency", currency);
  if (tier !== "monthly") url.searchParams.set("tier", tier);
  if (existingKey) url.searchParams.set("key", existingKey);
  return url.toString();
}

/** Exchange a licence key for a signed token. Returns an error message, or null on success. */
export async function activate(key: string): Promise<string | null> {
  if (!licensingConfigured()) return "Licensing is not set up in this build.";
  try {
    const response = await fetch(new URL("/activate", LICENSE_SERVER), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: key.trim().toUpperCase() }),
    });
    const data = (await response.json()) as { token?: string; error?: string };
    if (!response.ok || !data.token) return data.error ?? "Activation failed.";
    if (!(await verifyLicense(data.token, LICENSE_PUBLIC_JWK, new Date()))) return "The server returned an invalid licence.";
    await chrome.storage.local.set({ license: data.token, licenseKey: key.trim().toUpperCase() });
    return null;
  } catch {
    return "Could not reach the licence server.";
  }
}

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
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  try {
    const key = await crypto.subtle.importKey("jwk", publicJwk, ECDSA, false, ["verify"]);
    const ok = await crypto.subtle.verify(SIGN, key, base64urlDecode(signature), new TextEncoder().encode(body));
    if (!ok) return null;
    const payload = JSON.parse(new TextDecoder().decode(base64urlDecode(body))) as LicensePayload;
    if ((payload.plan !== "pro" && payload.plan !== "founder") || typeof payload.exp !== "number" || payload.exp * 1000 <= now.getTime()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function submittedThisMonth(applications: ApplicationRecord[], now: Date): number {
  return applications.filter((a) => {
    const d = new Date(a.createdAt);
    return a.status !== "in_progress" && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;
}

/** Submissions still allowed this month: unlimited with a valid Pro licence. */
export function remainingSubmissions(pro: LicensePayload | null, applications: ApplicationRecord[], now: Date): number {
  if (pro) return Number.POSITIVE_INFINITY;
  return Math.max(0, FREE_MONTHLY_SUBMISSIONS - submittedThisMonth(applications, now));
}

// --- storage & server -------------------------------------------------------------------------------
export async function currentLicense(now = new Date()): Promise<LicensePayload | null> {
  const { license } = await chrome.storage.local.get("license");
  return typeof license === "string" ? verifyLicense(license, LICENSE_PUBLIC_JWK, now) : null;
}

export function licensingConfigured(): boolean {
  return !!LICENSE_SERVER && !!LICENSE_PUBLIC_JWK;
}

export function isLifetimeLicense(license: LicensePayload | null): boolean {
  if (!license) return false;
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

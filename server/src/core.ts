/** Security-critical helpers for the licence server (WebCrypto only: runs in Cloudflare Workers and Node). */

import { base64urlEncode, type LicensePayload } from "../../src/shared/license";

const encoder = new TextEncoder();

export async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(message)));
  return Array.from(mac, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time comparison, so signature checks do not leak timing. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export interface PaymentLinkCallback {
  razorpay_payment_id: string;
  razorpay_payment_link_id: string;
  razorpay_payment_link_reference_id: string;
  razorpay_payment_link_status: string;
  razorpay_signature: string;
}

/** Razorpay signs the redirect after a Payment Link is paid:
 * HMAC_SHA256(link_id|reference_id|status|payment_id, key_secret). */
export async function verifyPaymentLinkCallback(p: PaymentLinkCallback, keySecret: string): Promise<boolean> {
  if (!p.razorpay_signature || !p.razorpay_payment_id || !p.razorpay_payment_link_id) return false;
  const expected = await hmacSha256Hex(
    keySecret,
    `${p.razorpay_payment_link_id}|${p.razorpay_payment_link_reference_id}|${p.razorpay_payment_link_status}|${p.razorpay_payment_id}`,
  );
  return safeEqual(expected, p.razorpay_signature);
}

/** Razorpay webhooks: HMAC_SHA256(raw body, webhook secret) in the X-Razorpay-Signature header. */
export async function verifyWebhook(rawBody: string, signature: string | null, webhookSecret: string): Promise<boolean> {
  if (!signature || !webhookSecret) return false;
  return safeEqual(await hmacSha256Hex(webhookSecret, rawBody), signature);
}

const ECDSA = { name: "ECDSA", namedCurve: "P-256" } as const;

export async function signLicense(payload: LicensePayload, privateJwk: JsonWebKey): Promise<string> {
  const key = await crypto.subtle.importKey("jwk", privateJwk, ECDSA, false, ["sign"]);
  const body = base64urlEncode(encoder.encode(JSON.stringify(payload)));
  const signature = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, encoder.encode(body)));
  return `${body}.${base64urlEncode(signature)}`;
}

/** Human-friendly licence key: 4 groups of 5 characters from an alphabet without look-alikes (100 bits). */
function keyFrom(bytes: Uint8Array): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 32 symbols, no I/O/0/1
  const chars = Array.from(bytes.slice(0, 20), (b) => alphabet[b % 32]);
  return [0, 5, 10, 15].map((i) => chars.slice(i, i + 5).join("")).join("-");
}

export function newLicenseKey(): string {
  return keyFrom(crypto.getRandomValues(new Uint8Array(20)));
}

/** The key for a new purchase, derived from its payment: the payment page's redirect and Razorpay's webhook can arrive
 * at the same moment (and the store may not show one's write to the other yet); both then issue the same key. */
export async function licenseKeyForPayment(secret: string, paymentId: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return keyFrom(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`license:${paymentId}`))));
}

export const LICENSE_KEY_FORMAT = /^[A-HJ-NP-Z2-9]{5}(-[A-HJ-NP-Z2-9]{5}){3}$/;

const DAY_MS = 86_400_000;
export const PASS_DAYS = 30;

/** New expiry when a 30-day pass is bought: stacks on top of time still remaining. */
export function extendedUntil(currentPaidUntil: number | undefined, now: number): number {
  return Math.max(currentPaidUntil ?? 0, now) + PASS_DAYS * DAY_MS;
}

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

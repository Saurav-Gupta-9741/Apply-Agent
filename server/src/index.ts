/** ApplyAgent licence server (Cloudflare Worker).
 *
 *  GET  /buy?currency=INR|USD[&key=EXISTING]  create a Razorpay Payment Link for a 30-day Pro pass, redirect to it
 *  GET  /thanks?razorpay_...                   Razorpay redirects here after payment: verify, issue/extend, show key
 *  POST /activate {key}                        exchange a paid licence key for a signed token
 *  POST /webhook                               backup: Razorpay "payment_link.paid" if the user closed the tab
 *  GET  /recover?payment_id=pay_...            show the key for a payment (from the Razorpay receipt email)
 *
 * No subscriptions and no auto-renewal: each pass is a one-time payment.
 */

import {
  escapeHtml, extendedUntil, LICENSE_KEY_FORMAT, licenseKeyForPayment, signLicense, verifyPaymentLinkCallback, verifyWebhook,
  type PaymentLinkCallback,
} from "./core";

interface KV {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

export interface Env {
  LICENSES: KV;
  RAZORPAY_KEY_ID: string;
  RAZORPAY_KEY_SECRET: string;
  RAZORPAY_WEBHOOK_SECRET: string;
  LICENSE_PRIVATE_JWK: string;
  PUBLIC_BASE_URL: string;
  PRICE_INR_PAISE: string;
  PRICE_USD_CENTS: string;
}

interface LicenseRecord {
  paidUntil: number;
  payments: string[];
  createdAt: number;
}

interface PendingRef {
  currency: "INR" | "USD";
  amount: number;
  key?: string; // renewing an existing licence
  used?: boolean;
  issuedKey?: string;
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" },
  });

const page = (title: string, body: string, status = 200) =>
  new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(title)}</title>` +
      `<body style="font:16px system-ui;max-width:560px;margin:48px auto;padding:0 16px">${body}</body>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );

async function getJson<T>(kv: KV, key: string): Promise<T | null> {
  const raw = await kv.get(key);
  return raw ? (JSON.parse(raw) as T) : null;
}

/** Issue a new key or extend an existing one, exactly once per payment. */
async function fulfil(env: Env, refId: string, paymentId: string): Promise<string | null> {
  const done = await env.LICENSES.get(`pay:${paymentId}`);
  if (done) return done; // this payment was already turned into a pass
  const ref = await getJson<PendingRef>(env.LICENSES, `ref:${refId}`);
  if (!ref) return null;
  if (ref.used && ref.issuedKey) return ref.issuedKey; // redirect and webhook both arrived: idempotent
  const key = ref.key && LICENSE_KEY_FORMAT.test(ref.key) ? ref.key : await licenseKeyForPayment(env.RAZORPAY_WEBHOOK_SECRET, paymentId);
  const existing = await getJson<LicenseRecord>(env.LICENSES, `lic:${key}`);
  if (existing?.payments.includes(paymentId)) return key; // already counted: never extend twice for one payment
  const now = Date.now();
  const record: LicenseRecord = {
    paidUntil: extendedUntil(existing?.paidUntil, now),
    payments: [...(existing?.payments ?? []), paymentId],
    createdAt: existing?.createdAt ?? now,
  };
  await env.LICENSES.put(`lic:${key}`, JSON.stringify(record));
  await env.LICENSES.put(`ref:${refId}`, JSON.stringify({ ...ref, used: true, issuedKey: key }));
  await env.LICENSES.put(`pay:${paymentId}`, key);
  return key;
}

const LINK_HOURS = 24;

async function buy(url: URL, env: Env): Promise<Response> {
  const currency = url.searchParams.get("currency") === "USD" ? "USD" : "INR";
  const amount = Number(currency === "USD" ? env.PRICE_USD_CENTS : env.PRICE_INR_PAISE);
  const renewKey = url.searchParams.get("key")?.toUpperCase();
  const refId = crypto.randomUUID().replace(/-/g, "").slice(0, 20);
  const pending: PendingRef = { currency, amount, key: renewKey && LICENSE_KEY_FORMAT.test(renewKey) ? renewKey : undefined };
  await env.LICENSES.put(`ref:${refId}`, JSON.stringify(pending), { expirationTtl: 7 * 86_400 });

  const response = await fetch("https://api.razorpay.com/v1/payment_links", {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`)}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount,
      currency,
      accept_partial: false,
      reference_id: refId,
      description: "ApplyAgent Pro - 30-day pass (one-time, no auto-renewal)",
      callback_url: `${env.PUBLIC_BASE_URL}/thanks`,
      callback_method: "get",
      // The link closes long before its reference is forgotten (7 days), so every payment can be fulfilled.
      expire_by: Math.floor(Date.now() / 1000) + LINK_HOURS * 3600,
    }),
  });
  const link = (await response.json()) as { short_url?: string };
  if (!response.ok || !link.short_url) return page("Payment unavailable", "<p>Could not start the payment. Please try again later.</p>", 502);
  return Response.redirect(link.short_url, 302);
}

async function thanks(url: URL, env: Env): Promise<Response> {
  const p = Object.fromEntries(url.searchParams) as unknown as PaymentLinkCallback;
  if (p.razorpay_payment_link_status !== "paid" || !(await verifyPaymentLinkCallback(p, env.RAZORPAY_KEY_SECRET))) {
    return page("Payment not confirmed", "<p>We could not confirm this payment. If you were charged, use the payment ID from your Razorpay receipt at <code>/recover</code>.</p>", 400);
  }
  const key = await fulfil(env, p.razorpay_payment_link_reference_id, p.razorpay_payment_id);
  if (!key) return page("Unknown payment", "<p>This payment link was not created by ApplyAgent.</p>", 400);
  return page("Your ApplyAgent licence", `<h1>Thank you!</h1><p>Your licence key:</p>
    <p style="font:24px monospace;padding:12px;border:1px solid #ccc;border-radius:8px">${escapeHtml(key)}</p>
    <p>Open ApplyAgent → Profile → Plan, paste the key and press Activate. Keep it safe: use the same key to renew.</p>
    <p>This pass lasts 30 days and does not renew automatically.</p>`);
}

async function activate(request: Request, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as { key?: string };
  const key = String(body.key ?? "").trim().toUpperCase();
  if (!LICENSE_KEY_FORMAT.test(key)) return json({ error: "That is not a valid licence key." }, 400);
  const record = await getJson<LicenseRecord>(env.LICENSES, `lic:${key}`);
  if (!record) return json({ error: "Licence key not found." }, 404);
  if (record.paidUntil <= Date.now()) return json({ error: "This pass has expired. Buy a new 30-day pass with the same key." }, 402);
  const token = await signLicense({ key, plan: "pro", exp: Math.floor(record.paidUntil / 1000) }, JSON.parse(env.LICENSE_PRIVATE_JWK));
  return json({ token, paidUntil: record.paidUntil });
}

async function webhook(request: Request, env: Env): Promise<Response> {
  const raw = await request.text();
  if (!(await verifyWebhook(raw, request.headers.get("X-Razorpay-Signature"), env.RAZORPAY_WEBHOOK_SECRET))) {
    return json({ error: "bad signature" }, 400);
  }
  const event = JSON.parse(raw) as {
    event?: string;
    payload?: { payment_link?: { entity?: { reference_id?: string } }; payment?: { entity?: { id?: string } } };
  };
  if (event.event === "payment_link.paid") {
    const refId = event.payload?.payment_link?.entity?.reference_id;
    const paymentId = event.payload?.payment?.entity?.id;
    if (refId && paymentId) await fulfil(env, refId, paymentId);
  }
  return json({ ok: true });
}

async function recover(url: URL, env: Env): Promise<Response> {
  const paymentId = url.searchParams.get("payment_id") ?? "";
  const key = /^pay_[A-Za-z0-9]{8,30}$/.test(paymentId) ? await env.LICENSES.get(`pay:${paymentId}`) : null;
  return key
    ? page("Your licence key", `<p>Licence key for ${escapeHtml(paymentId)}:</p><p style="font:24px monospace">${escapeHtml(key)}</p>`)
    : page("Not found", "<p>No licence for that payment ID yet. If you just paid, wait a minute and try again.</p>", 404);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return json({});
    try {
      if (request.method === "GET" && url.pathname === "/buy") return await buy(url, env);
      if (request.method === "GET" && url.pathname === "/thanks") return await thanks(url, env);
      if (request.method === "POST" && url.pathname === "/activate") return await activate(request, env);
      if (request.method === "POST" && url.pathname === "/webhook") return await webhook(request, env);
      if (request.method === "GET" && url.pathname === "/recover") return await recover(url, env);
      return json({ error: "not found" }, 404);
    } catch {
      return json({ error: "server error" }, 500);
    }
  },
};

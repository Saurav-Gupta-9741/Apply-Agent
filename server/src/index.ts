/** ApplyAgent licence server (Cloudflare Worker).
 *
 *  GET  /plans                                the plans on sale and their prices (from the [vars] config)
 *  GET  /buy?currency=INR|USD[&tier=founder][&key=EXISTING]
 *                                              create a Razorpay Payment Link for a 30-day Pro pass (or the
 *                                              10-year Founder plan while FOUNDER_ENABLED="true"), redirect to it
 *  GET  /thanks?razorpay_...                   Razorpay redirects here after payment: verify, issue/extend, show key
 *  POST /activate {key}                        exchange a paid licence key for a signed token
 *  POST /webhook                               backup: Razorpay "payment_link.paid" if the user closed the tab
 *  GET  /recover?payment_id=pay_...            show the key for a payment (from the Razorpay receipt email)
 *
 * No subscriptions and no auto-renewal: each pass is a one-time payment.
 */

import {
  escapeHtml, LICENSE_KEY_FORMAT, LIFETIME_DAYS, PASS_DAYS, licenseKeyForPayment, paidUntilAfter, signLicense, verifyPaymentLinkCallback, verifyWebhook,
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
  PRICE_LIFETIME_INR_PAISE?: string;
  PRICE_LIFETIME_USD_CENTS?: string;
  /** "true" puts the limited Founder plan on sale; anything else hides it and refuses its checkout. */
  FOUNDER_ENABLED?: string;
}

export interface Plan {
  id: "pro" | "founder";
  name: string;
  inr: number;
  usd: number;
  days: number;
  renews: false;
  limited?: true;
  perks: string[];
}

/** Only features the extension really has. */
const PERKS = [
  "Unlimited fills",
  "Application queue",
  "Screening answers saved once and reused",
  "On-device question model (works offline)",
  "Every supported careers site and ATS",
];

const founderEnabled = (env: Env) => env.FOUNDER_ENABLED === "true";
const priceInMinor = (env: Env, currency: "INR" | "USD", tier: "monthly" | "lifetime") =>
  tier === "lifetime"
    ? Number(currency === "USD" ? (env.PRICE_LIFETIME_USD_CENTS || "4900") : (env.PRICE_LIFETIME_INR_PAISE || "299900"))
    : Number(currency === "USD" ? env.PRICE_USD_CENTS : env.PRICE_INR_PAISE);

/** The plans on sale, built only from the configured prices. */
export function plansFor(env: Env): Plan[] {
  const plans: Plan[] = [{
    id: "pro", name: "Pro · 30 days", inr: priceInMinor(env, "INR", "monthly") / 100, usd: priceInMinor(env, "USD", "monthly") / 100,
    days: PASS_DAYS, renews: false, perks: PERKS,
  }];
  if (founderEnabled(env)) {
    plans.push({
      id: "founder", name: "Founder · 10 years", inr: priceInMinor(env, "INR", "lifetime") / 100, usd: priceInMinor(env, "USD", "lifetime") / 100,
      days: LIFETIME_DAYS, renews: false, limited: true, perks: PERKS,
    });
  }
  return plans;
}

interface LicenseRecord {
  paidUntil: number;
  payments: string[];
  createdAt: number;
  lifetime?: boolean;
}

interface PendingRef {
  currency: "INR" | "USD";
  amount: number;
  tier?: "monthly" | "lifetime";
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
  // The plan bought decides the length, never the key's current plan: Pro on a Founder key adds 30 days, not 10 years.
  const next = paidUntilAfter(existing, now, ref.tier === "lifetime" ? "lifetime" : "monthly");
  const record: LicenseRecord = {
    paidUntil: next.paidUntil,
    payments: [...(existing?.payments ?? []), paymentId],
    createdAt: existing?.createdAt ?? now,
    lifetime: next.lifetime,
  };
  await env.LICENSES.put(`lic:${key}`, JSON.stringify(record));
  await env.LICENSES.put(`ref:${refId}`, JSON.stringify({ ...ref, used: true, issuedKey: key }));
  await env.LICENSES.put(`pay:${paymentId}`, key);
  return key;
}

const LINK_HOURS = 24;

async function buy(url: URL, env: Env): Promise<Response> {
  const currency = url.searchParams.get("currency") === "USD" ? "USD" : "INR";
  const tierParam = url.searchParams.get("tier");
  const tier = tierParam === "founder" || tierParam === "lifetime" ? "lifetime" : "monthly";
  if (tier === "lifetime" && !founderEnabled(env)) {
    return page("Founder plan unavailable", "<p>The Founder plan is not on sale at the moment. The 30-day Pro pass is.</p>", 410);
  }
  const amount = priceInMinor(env, currency, tier);
  const rawKey = url.searchParams.get("key")?.toUpperCase();
  const renewKey = rawKey && LICENSE_KEY_FORMAT.test(rawKey) ? rawKey : undefined;
  if (renewKey) {
    const current = await getJson<LicenseRecord>(env.LICENSES, `lic:${renewKey}`);
    if (current?.lifetime && current.paidUntil > Date.now()) {
      const until = new Date(current.paidUntil).toISOString().slice(0, 10);
      return page("Already on the Founder plan", `<p>This key is on the Founder plan until ${escapeHtml(until)}. There is nothing to buy.</p>`, 409);
    }
  }
  const refId = crypto.randomUUID().replace(/-/g, "").slice(0, 20);
  const pending: PendingRef = { currency, amount, tier, key: renewKey };
  await env.LICENSES.put(`ref:${refId}`, JSON.stringify(pending), { expirationTtl: 7 * 86_400 });

  const desc = tier === "lifetime" ? "ApplyAgent Founder - 10 years (one-time, no auto-renewal)" : "ApplyAgent Pro - 30-day pass (one-time, no auto-renewal)";
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
      description: desc,
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
  const existing = await getJson<LicenseRecord>(env.LICENSES, `lic:${key}`);
  const isLifetime = existing?.lifetime;
  const until = existing ? new Date(existing.paidUntil).toISOString().slice(0, 10) : "";
  return page("Your ApplyAgent licence", `<h1>Thank you!</h1><p>Your ${isLifetime ? "Founder (10 years)" : "Pro"} licence key:</p>
    <p style="font:24px monospace;padding:12px;border:1px solid #ccc;border-radius:8px">${escapeHtml(key)}</p>
    <p>Open ApplyAgent → Profile → Plan, paste the key and press Activate. Keep it safe: use the same key to renew.</p>
    <p>${isLifetime ? "The Founder plan lasts 10 years" : "A Pro pass lasts 30 days"} and does not renew automatically.
    This key is valid until ${escapeHtml(until)}.</p>`);
}

async function activate(request: Request, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as { key?: string };
  const key = String(body.key ?? "").trim().toUpperCase();
  if (!LICENSE_KEY_FORMAT.test(key)) return json({ error: "That is not a valid licence key." }, 400);
  const record = await getJson<LicenseRecord>(env.LICENSES, `lic:${key}`);
  if (!record) return json({ error: "Licence key not found." }, 404);
  if (record.paidUntil <= Date.now()) return json({ error: "This pass has expired. Buy a new 30-day pass with the same key." }, 402);
  const isLifetime = record.lifetime || (record.paidUntil - Date.now()) > 365 * 86_400_000 * 3;
  const token = await signLicense(
    { key, plan: isLifetime ? "founder" : "pro", exp: Math.floor(record.paidUntil / 1000), lifetime: isLifetime || undefined },
    JSON.parse(env.LICENSE_PRIVATE_JWK),
  );
  return json({ token, paidUntil: record.paidUntil, plan: isLifetime ? "founder" : "pro" });
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
      if (request.method === "GET" && url.pathname === "/plans") return json(plansFor(env));
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

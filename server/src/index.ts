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
  escapeHtml, extendedUntil, generateSalt, hashPassword, LICENSE_KEY_FORMAT, LIFETIME_DAYS, PASS_DAYS, licenseKeyForPayment, signAccountToken, signLicense, verifyAccountToken, verifyPassword, verifyPaymentLinkCallback, verifyWebhook,
  type PaymentLinkCallback, type UserAccount,
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
  const isLifetime = ref.tier === "lifetime" || existing?.lifetime;
  const days = isLifetime ? LIFETIME_DAYS : PASS_DAYS;
  const record: LicenseRecord = {
    paidUntil: extendedUntil(existing?.paidUntil, now, days),
    payments: [...(existing?.payments ?? []), paymentId],
    createdAt: existing?.createdAt ?? now,
    lifetime: isLifetime,
  };
  await env.LICENSES.put(`lic:${key}`, JSON.stringify(record));
  await env.LICENSES.put(`ref:${refId}`, JSON.stringify({ ...ref, used: true, issuedKey: key }));
  await env.LICENSES.put(`pay:${paymentId}`, key);
  return key;
}

const LINK_HOURS = 24;

async function buy(url: URL, env: Env): Promise<Response> {
  const currency = url.searchParams.get("currency") === "USD" ? "USD" : "INR";
  const tier = url.searchParams.get("tier") === "lifetime" ? "lifetime" : "monthly";
  let amount = 0;
  if (tier === "lifetime") {
    amount = Number(currency === "USD" ? (env.PRICE_LIFETIME_USD_CENTS || "4900") : (env.PRICE_LIFETIME_INR_PAISE || "299900"));
  } else {
    amount = Number(currency === "USD" ? env.PRICE_USD_CENTS : env.PRICE_INR_PAISE);
  }
  const renewKey = url.searchParams.get("key")?.toUpperCase();
  const refId = crypto.randomUUID().replace(/-/g, "").slice(0, 20);
  const pending: PendingRef = { currency, amount, tier, key: renewKey && LICENSE_KEY_FORMAT.test(renewKey) ? renewKey : undefined };
  await env.LICENSES.put(`ref:${refId}`, JSON.stringify(pending), { expirationTtl: 7 * 86_400 });

  const desc = tier === "lifetime" ? "ApplyAgent Founder Pass - Lifetime Access (one-time, no auto-renewal)" : "ApplyAgent Pro - 30-day pass (one-time, no auto-renewal)";
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
  return page("Your ApplyAgent licence", `<h1>Thank you!</h1><p>Your ${isLifetime ? "Founder Lifetime" : "Pro"} licence key:</p>
    <p style="font:24px monospace;padding:12px;border:1px solid #ccc;border-radius:8px">${escapeHtml(key)}</p>
    <p>Open ApplyAgent → Profile → Plan, paste the key and press Activate. Keep it safe: use the same key to renew.</p>
    <p>${isLifetime ? "This is a permanent Founder Lifetime Pass." : "This pass lasts 30 days and does not renew automatically."}</p>`);
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

function plans(env: Env): Response {
  const proUsd = Number(env.PRICE_USD_CENTS || "900") / 100;
  const proInr = Number(env.PRICE_INR_PAISE || "49900") / 100;
  const lifeUsd = Number(env.PRICE_LIFETIME_USD_CENTS || "4900") / 100;
  const lifeInr = Number(env.PRICE_LIFETIME_INR_PAISE || "299900") / 100;
  return json({
    tiers: [
      {
        id: "free",
        name: "Community Core",
        price: { usd: "$0", inr: "₹0" },
        cadence: "forever free",
        badge: "Open Source",
        features: [
          "100% Client-side zero-knowledge privacy",
          "Unlimited assisted form autofill on single tabs",
          "1 active candidate persona profile",
          "100% offline local AI matching",
          "BYOK or local Ollama model support",
        ],
      },
      {
        id: "pro",
        name: "Pro 30-Day Pass",
        price: { usd: `$${proUsd}`, inr: `₹${proInr}` },
        cadence: "per 30 days (no auto-renewal trap)",
        badge: "Popular",
        features: [
          "Everything in Community Free Core",
          "Unlimited monthly submissions & multi-tabs",
          "Multi-profile hot-swapping (SWE, Data Science, PM)",
          "Autonomous background queue runner with multi-step support",
          "Verified submission proof screenshot capture & ISO receipts",
        ],
      },
      {
        id: "founder",
        name: "Founder Lifetime Pass",
        price: { usd: `$${lifeUsd}`, inr: `₹${lifeInr}` },
        cadence: "one-time payment",
        badge: "Best Value",
        features: [
          "Lifetime access to all current and future Pro features",
          "Unlimited profiles & unlimited queue submissions",
          "Priority ATS adapters & 0-day patch updates",
          "Tamper-proof encrypted submission vault",
          "Direct founder support & VIP community badge",
        ],
      },
    ],
  });
}

async function checkRateLimit(kv: KV, ip: string, action: string, limit: number, windowSec = 60): Promise<boolean> {
  const key = `rl:${action}:${ip}`;
  const count = Number((await kv.get(key)) || "0");
  if (count >= limit) return false;
  await kv.put(key, String(count + 1), { expirationTtl: windowSec });
  return true;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function registerAccount(request: Request, env: Env): Promise<Response> {
  const ip = request.headers.get("CF-Connecting-IP") || "127.0.0.1";
  if (!(await checkRateLimit(env.LICENSES, ip, "register", 5, 60))) {
    return json({ error: "Too many registration attempts. Please wait a minute." }, 429);
  }
  const body = (await request.json().catch(() => ({}))) as { email?: string; password?: string; licenseKey?: string };
  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";
  if (!EMAIL_RE.test(email)) return json({ error: "Invalid email address format" }, 400);
  if (password.length < 8) return json({ error: "Password must be at least 8 characters long" }, 400);

  const existing = await getJson<UserAccount>(env.LICENSES, `acc:${email}`);
  if (existing) return json({ error: "An account with this email already exists" }, 409);

  let tier: "free" | "pro" | "founder" = "free";
  let paidUntil: number | undefined;
  let isLifetime = false;
  let activeKey: string | undefined;

  if (body.licenseKey && LICENSE_KEY_FORMAT.test(body.licenseKey)) {
    const lic = await getJson<LicenseRecord>(env.LICENSES, `lic:${body.licenseKey}`);
    if (lic && (lic.lifetime || lic.paidUntil > Date.now())) {
      tier = lic.lifetime ? "founder" : "pro";
      paidUntil = lic.paidUntil;
      isLifetime = !!lic.lifetime;
      activeKey = body.licenseKey;
    }
  }

  const salt = generateSalt();
  const passwordHash = await hashPassword(password, salt);
  const now = Date.now();
  const account: UserAccount = {
    email,
    passwordHash,
    salt,
    tier,
    paidUntil,
    lifetime: isLifetime,
    createdAt: now,
    lastLoginAt: now,
    activeKey,
  };

  await env.LICENSES.put(`acc:${email}`, JSON.stringify(account));

  const sessionExp = Math.floor(now / 1000) + 30 * 86_400;
  const sessionToken = await signAccountToken({ email, tier, exp: sessionExp }, env.RAZORPAY_WEBHOOK_SECRET);

  let licenseToken: string | undefined;
  if (tier !== "free" && activeKey) {
    const exp = isLifetime ? Math.floor(now / 1000) + LIFETIME_DAYS * 86_400 : Math.floor((paidUntil ?? now) / 1000);
    licenseToken = await signLicense(
      { key: activeKey, plan: tier, exp, lifetime: isLifetime, email },
      JSON.parse(env.LICENSE_PRIVATE_JWK) as JsonWebKey,
    );
  }

  return json({
    ok: true,
    user: { email, tier, paidUntil, lifetime: isLifetime },
    sessionToken,
    token: licenseToken,
  });
}

async function loginAccount(request: Request, env: Env): Promise<Response> {
  const ip = request.headers.get("CF-Connecting-IP") || "127.0.0.1";
  if (!(await checkRateLimit(env.LICENSES, ip, "login", 10, 60))) {
    return json({ error: "Too many login attempts. Please wait a minute." }, 429);
  }
  const body = (await request.json().catch(() => ({}))) as { email?: string; password?: string };
  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";
  if (!email || !password) return json({ error: "Email and password required" }, 400);

  const account = await getJson<UserAccount>(env.LICENSES, `acc:${email}`);
  if (!account) return json({ error: "Invalid email or password" }, 401);

  const ok = await verifyPassword(password, account.salt, account.passwordHash);
  if (!ok) return json({ error: "Invalid email or password" }, 401);

  const now = Date.now();
  account.lastLoginAt = now;

  if (account.activeKey) {
    const lic = await getJson<LicenseRecord>(env.LICENSES, `lic:${account.activeKey}`);
    if (lic) {
      account.lifetime = lic.lifetime;
      account.paidUntil = lic.paidUntil;
      if (lic.lifetime || lic.paidUntil > now) {
        account.tier = lic.lifetime ? "founder" : "pro";
      } else {
        account.tier = "free";
      }
    }
  } else if (!account.lifetime && account.paidUntil && account.paidUntil <= now) {
    account.tier = "free";
  }

  await env.LICENSES.put(`acc:${email}`, JSON.stringify(account));

  const sessionExp = Math.floor(now / 1000) + 30 * 86_400;
  const sessionToken = await signAccountToken({ email, tier: account.tier, exp: sessionExp }, env.RAZORPAY_WEBHOOK_SECRET);

  let licenseToken: string | undefined;
  if (account.tier !== "free" && account.activeKey) {
    const exp = account.lifetime ? Math.floor(now / 1000) + LIFETIME_DAYS * 86_400 : Math.floor((account.paidUntil ?? now) / 1000);
    licenseToken = await signLicense(
      { key: account.activeKey, plan: account.tier, exp, lifetime: account.lifetime, email },
      JSON.parse(env.LICENSE_PRIVATE_JWK) as JsonWebKey,
    );
  }

  return json({
    ok: true,
    user: { email, tier: account.tier, paidUntil: account.paidUntil, lifetime: account.lifetime },
    sessionToken,
    token: licenseToken,
  });
}

async function meAccount(request: Request, url: URL, env: Env): Promise<Response> {
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "") || url.searchParams.get("token") || "";
  if (!token) return json({ error: "Unauthorized" }, 401);

  const nowSec = Math.floor(Date.now() / 1000);
  const session = await verifyAccountToken(token, env.RAZORPAY_WEBHOOK_SECRET, nowSec);
  if (!session) return json({ error: "Invalid or expired session" }, 401);

  const account = await getJson<UserAccount>(env.LICENSES, `acc:${session.email.toLowerCase()}`);
  if (!account) return json({ error: "Account not found" }, 404);

  return json({
    ok: true,
    user: {
      email: account.email,
      tier: account.tier,
      paidUntil: account.paidUntil,
      lifetime: account.lifetime,
      createdAt: account.createdAt,
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return json({});
    try {
      if (request.method === "POST" && url.pathname === "/auth/register") return await registerAccount(request, env);
      if (request.method === "POST" && url.pathname === "/auth/login") return await loginAccount(request, env);
      if (request.method === "GET" && url.pathname === "/auth/me") return await meAccount(request, url, env);
      if (request.method === "GET" && (url.pathname === "/plans" || url.pathname === "/pricing")) return plans(env);
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

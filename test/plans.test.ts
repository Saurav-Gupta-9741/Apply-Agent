// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { hmacSha256Hex, LIFETIME_DAYS, paidUntilAfter, PASS_DAYS } from "../server/src/core";
import worker, { plansFor, type Env } from "../server/src/index";

const DAY = 86_400_000;
const KEY = "AAAAA-BBBBB-CCCCC-DDDDD";

async function makeEnv(extra: Partial<Env> = {}) {
  const store = new Map<string, string>();
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const env: Env = {
    LICENSES: { get: async (k) => store.get(k) ?? null, put: async (k, v) => void store.set(k, v) },
    RAZORPAY_KEY_ID: "rzp_test", RAZORPAY_KEY_SECRET: "secret", RAZORPAY_WEBHOOK_SECRET: "wh",
    LICENSE_PRIVATE_JWK: JSON.stringify(await crypto.subtle.exportKey("jwk", pair.privateKey)),
    PUBLIC_BASE_URL: "https://lic.example.com",
    PRICE_INR_PAISE: "14900", PRICE_USD_CENTS: "900",
    PRICE_LIFETIME_INR_PAISE: "299900", PRICE_LIFETIME_USD_CENTS: "4900", FOUNDER_ENABLED: "true",
    ...extra,
  };
  return { env, store };
}

async function pay(env: Env, ref: string, paymentId: string) {
  const sig = await hmacSha256Hex("secret", `plink_1|${ref}|paid|${paymentId}`);
  const qs = new URLSearchParams({
    razorpay_payment_id: paymentId, razorpay_payment_link_id: "plink_1", razorpay_payment_link_reference_id: ref,
    razorpay_payment_link_status: "paid", razorpay_signature: sig,
  });
  return worker.fetch(new Request(`https://lic.example.com/thanks?${qs}`), env);
}

const record = (store: Map<string, string>, key = KEY) => JSON.parse(store.get(`lic:${key}`)!) as { paidUntil: number; lifetime?: boolean };

afterEach(() => vi.unstubAllGlobals());

describe("GET /plans", () => {
  it("lists Pro and Founder with the configured prices and nothing else", async () => {
    const { env } = await makeEnv();
    const res = await worker.fetch(new Request("https://lic.example.com/plans"), env);
    expect(res.status).toBe(200);
    const plans = await res.json();
    expect(plans).toEqual(plansFor(env));
    expect(plans).toMatchObject([
      { id: "pro", name: "Pro · 30 days", inr: 149, usd: 9, days: 30, renews: false },
      { id: "founder", name: "Founder · 10 years", inr: 2999, usd: 49, days: 3650, renews: false, limited: true },
    ]);
    expect(plans[0].limited).toBeUndefined();
  });

  it("follows the config instead of hard-coded prices", async () => {
    const { env } = await makeEnv({ PRICE_INR_PAISE: "19900", PRICE_USD_CENTS: "1200", PRICE_LIFETIME_INR_PAISE: "349900" });
    expect(plansFor(env)).toMatchObject([{ inr: 199, usd: 12 }, { inr: 3499, usd: 49 }]);
  });

  it("omits Founder unless FOUNDER_ENABLED is exactly \"true\"", async () => {
    for (const flag of [undefined, "false", "TRUE", "1", ""]) {
      const { env } = await makeEnv({ FOUNDER_ENABLED: flag });
      expect(plansFor(env).map((p) => p.id)).toEqual(["pro"]);
    }
  });

  it("lists only real features as perks", async () => {
    const { env } = await makeEnv();
    const text = plansFor(env).flatMap((p) => p.perks).join(" ").toLowerCase();
    for (const real of ["unlimited fills", "queue", "screening answers", "on-device", "ats"]) expect(text).toContain(real);
    for (const fake of ["vip", "vault", "tamper", "0-day", "zero-day", "guarantee", "priority", "lifetime", "forever", "100%"]) {
      expect(text).not.toContain(fake);
    }
  });
});

describe("GET /buy", () => {
  function stubRazorpay() {
    const calls: { amount: number; currency: string; description: string }[] = [];
    vi.stubGlobal("fetch", async (_url: string, init: { body: string }) => {
      calls.push(JSON.parse(init.body));
      return new Response(JSON.stringify({ short_url: "https://rzp.io/l/x" }), { status: 200 });
    });
    return calls;
  }

  it("charges the configured Founder price, and refuses Founder checkout when it is off sale", async () => {
    const calls = stubRazorpay();
    const { env } = await makeEnv();
    expect((await worker.fetch(new Request("https://lic.example.com/buy?currency=INR&tier=founder"), env)).status).toBe(302);
    expect((await worker.fetch(new Request("https://lic.example.com/buy?currency=USD&tier=lifetime"), env)).status).toBe(302);
    expect(calls.map((c) => [c.amount, c.currency])).toEqual([[299900, "INR"], [4900, "USD"]]);

    const off = (await makeEnv({ FOUNDER_ENABLED: "false" })).env;
    for (const tier of ["founder", "lifetime"]) {
      const res = await worker.fetch(new Request(`https://lic.example.com/buy?currency=INR&tier=${tier}`), off);
      expect(res.status).toBe(410);
    }
    expect(calls).toHaveLength(2); // no payment link was created while it is off sale
    expect((await worker.fetch(new Request("https://lic.example.com/buy?currency=INR"), off)).status).toBe(302);
    expect(calls[2]).toMatchObject({ amount: 14900, currency: "INR" });
  });

  it("does not sell anything more to an active Founder key", async () => {
    const calls = stubRazorpay();
    const { env, store } = await makeEnv();
    store.set(`lic:${KEY}`, JSON.stringify({ paidUntil: Date.now() + 3000 * DAY, payments: ["pay_X"], createdAt: 0, lifetime: true }));
    for (const qs of ["currency=INR", "currency=USD&tier=founder"]) {
      expect((await worker.fetch(new Request(`https://lic.example.com/buy?${qs}&key=${KEY}`), env)).status).toBe(409);
    }
    expect(calls).toHaveLength(0);
  });
});

describe("plan changes on an existing key", () => {
  const now = Date.UTC(2026, 10, 1);

  it("paidUntilAfter: Pro stacks 30 days; Founder is max(current, now + 10 years)", () => {
    expect(paidUntilAfter(undefined, now, "monthly")).toEqual({ paidUntil: now + PASS_DAYS * DAY, lifetime: false });
    expect(paidUntilAfter(undefined, now, "lifetime")).toEqual({ paidUntil: now + LIFETIME_DAYS * DAY, lifetime: true });
    // Pro → Founder upgrade
    expect(paidUntilAfter({ paidUntil: now + 10 * DAY }, now, "lifetime")).toEqual({ paidUntil: now + LIFETIME_DAYS * DAY, lifetime: true });
    // A Pro key stacked past 10 years is never shortened by the upgrade
    const far = now + (LIFETIME_DAYS + 50) * DAY;
    expect(paidUntilAfter({ paidUntil: far }, now, "lifetime").paidUntil).toBe(far);
    // Founder bought again: no second decade
    const founder = { paidUntil: now + 3000 * DAY, lifetime: true };
    expect(paidUntilAfter(founder, now, "lifetime")).toEqual({ paidUntil: now + LIFETIME_DAYS * DAY, lifetime: true });
    // Pro on a Founder key: stays Founder, adds only 30 days, never 10 years, never shorter
    const pro = paidUntilAfter(founder, now, "monthly");
    expect(pro).toEqual({ paidUntil: founder.paidUntil + PASS_DAYS * DAY, lifetime: true });
  });

  it("paying Pro on a Founder key neither adds 10 years nor shortens it (end to end)", async () => {
    const { env, store } = await makeEnv();
    const before = Date.now() + 3000 * DAY;
    store.set(`lic:${KEY}`, JSON.stringify({ paidUntil: before, payments: ["pay_FOUNDER0001"], createdAt: 0, lifetime: true }));
    store.set("ref:r_pro", JSON.stringify({ currency: "INR", amount: 14900, tier: "monthly", key: KEY }));
    expect((await pay(env, "r_pro", "pay_PRO0000001")).status).toBe(200);
    const after = record(store);
    expect(after.lifetime).toBe(true);
    expect(after.paidUntil).toBeGreaterThanOrEqual(before);
    expect(after.paidUntil).toBeLessThanOrEqual(before + PASS_DAYS * DAY);
  });

  it("buying Founder on a Pro key upgrades it to max(current, now + 10 years)", async () => {
    const { env, store } = await makeEnv();
    store.set(`lic:${KEY}`, JSON.stringify({ paidUntil: Date.now() + 20 * DAY, payments: ["pay_PRO0000002"], createdAt: 0 }));
    store.set("ref:r_up", JSON.stringify({ currency: "USD", amount: 4900, tier: "lifetime", key: KEY }));
    const start = Date.now();
    const page = await (await pay(env, "r_up", "pay_UPGRADE001")).text();
    const after = record(store);
    expect(after.lifetime).toBe(true);
    expect(after.paidUntil).toBeGreaterThanOrEqual(start + LIFETIME_DAYS * DAY);
    expect(after.paidUntil).toBeLessThanOrEqual(Date.now() + LIFETIME_DAYS * DAY);
    expect(page).toContain("10 years");

    const activated = await worker.fetch(new Request("https://lic.example.com/activate", { method: "POST", body: JSON.stringify({ key: KEY }) }), env);
    expect(await activated.json()).toMatchObject({ plan: "founder" });

    // The same payment arriving again (webhook) changes nothing.
    await pay(env, "r_up", "pay_UPGRADE001");
    expect(record(store).paidUntil).toBe(after.paidUntil);
  });

  it("a Pro renewal on a Pro key still stacks 30 days and stays Pro", async () => {
    const { env, store } = await makeEnv();
    const before = Date.now() + 5 * DAY;
    store.set(`lic:${KEY}`, JSON.stringify({ paidUntil: before, payments: ["pay_PRO0000003"], createdAt: 0 }));
    store.set("ref:r_re", JSON.stringify({ currency: "INR", amount: 14900, tier: "monthly", key: KEY }));
    await pay(env, "r_re", "pay_PRO0000004");
    expect(record(store)).toMatchObject({ paidUntil: before + PASS_DAYS * DAY, lifetime: false });
  });
});

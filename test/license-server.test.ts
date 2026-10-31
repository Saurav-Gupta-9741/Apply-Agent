// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  escapeHtml, extendedUntil, hmacSha256Hex, LICENSE_KEY_FORMAT, newLicenseKey, safeEqual, signLicense,
  verifyPaymentLinkCallback, verifyWebhook,
} from "../server/src/core";
import worker, { type Env } from "../server/src/index";
import { isLifetimeLicense, remainingSubmissions, verifyLicense } from "../src/shared/license";
import type { ApplicationRecord } from "../src/shared/types";

async function keyPair() {
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  return {
    privateJwk: await crypto.subtle.exportKey("jwk", pair.privateKey),
    publicJwk: await crypto.subtle.exportKey("jwk", pair.publicKey),
  };
}

const NOW = new Date("2026-10-25T10:00:00Z");
const future = Math.floor(NOW.getTime() / 1000) + 86_400;

describe("licence tokens", () => {
  it("verifies a genuine token and rejects tampering, expiry and the wrong key", async () => {
    const { privateJwk, publicJwk } = await keyPair();
    const token = await signLicense({ key: "AAAAA-BBBBB-CCCCC-DDDDD", plan: "pro", exp: future }, privateJwk);
    expect(await verifyLicense(token, publicJwk, NOW)).toMatchObject({ plan: "pro" });

    const [body, sig] = token.split(".");
    const forged = btoa(JSON.stringify({ key: "X", plan: "pro", exp: future + 9_999_999 })).replace(/=+$/, "");
    expect(await verifyLicense(`${forged}.${sig}`, publicJwk, NOW)).toBeNull();
    expect(await verifyLicense(`${body}.${sig}x`, publicJwk, NOW)).toBeNull();
    expect(await verifyLicense(token, publicJwk, new Date((future + 1) * 1000))).toBeNull();
    expect(await verifyLicense(token, (await keyPair()).publicJwk, NOW)).toBeNull();
    expect(await verifyLicense("garbage", publicJwk, NOW)).toBeNull();
    expect(await verifyLicense(token, null, NOW)).toBeNull();
  });

  it("limits free users to 20 submissions a month and lifts it for Pro", () => {
    const apps: ApplicationRecord[] = Array.from({ length: 20 }, (_, i) => ({
      id: String(i), url: "", platform: "", jobTitle: "", status: "applied_confirmed", createdAt: "2026-10-03T00:00:00Z",
    }));
    expect(remainingSubmissions(null, apps, NOW)).toBe(0);
    expect(remainingSubmissions(null, apps.slice(0, 5), NOW)).toBe(15);
    expect(remainingSubmissions(null, apps, new Date("2026-11-02T00:00:00Z"))).toBe(20); // new month
    expect(remainingSubmissions({ key: "k", plan: "pro", exp: future }, apps, NOW)).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("Razorpay signatures", () => {
  it("accepts a correctly signed payment-link redirect and rejects a forged one", async () => {
    const secret = "test_secret";
    const p = {
      razorpay_payment_id: "pay_ABC123456789", razorpay_payment_link_id: "plink_XYZ",
      razorpay_payment_link_reference_id: "ref1", razorpay_payment_link_status: "paid", razorpay_signature: "",
    };
    p.razorpay_signature = await hmacSha256Hex(secret, "plink_XYZ|ref1|paid|pay_ABC123456789");
    expect(await verifyPaymentLinkCallback(p, secret)).toBe(true);
    expect(await verifyPaymentLinkCallback({ ...p, razorpay_payment_link_reference_id: "ref2" }, secret)).toBe(false);
    expect(await verifyPaymentLinkCallback(p, "other_secret")).toBe(false);
  });

  it("verifies webhooks against the raw body", async () => {
    const body = '{"event":"payment_link.paid"}';
    const sig = await hmacSha256Hex("wh", body);
    expect(await verifyWebhook(body, sig, "wh")).toBe(true);
    expect(await verifyWebhook(body + " ", sig, "wh")).toBe(false);
    expect(await verifyWebhook(body, null, "wh")).toBe(false);
    expect(await verifyWebhook(body, sig, "")).toBe(false);
  });
});

describe("helpers", () => {
  it("makes readable, well-formed keys", () => {
    const keys = new Set(Array.from({ length: 200 }, newLicenseKey));
    expect(keys.size).toBe(200);
    for (const k of keys) expect(k).toMatch(LICENSE_KEY_FORMAT);
  });

  it("stacks a renewal on top of remaining time", () => {
    const now = NOW.getTime();
    expect(extendedUntil(undefined, now)).toBe(now + 30 * 86_400_000);
    expect(extendedUntil(now + 5 * 86_400_000, now)).toBe(now + 35 * 86_400_000);
    expect(extendedUntil(now - 86_400_000, now)).toBe(now + 30 * 86_400_000);
  });

  it("escapes HTML and compares in constant time", () => {
    expect(escapeHtml(`<script>"x"</script>`)).toBe("&lt;script&gt;&quot;x&quot;&lt;/script&gt;");
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
  });
});

describe("worker end to end (fake KV, no network)", () => {
  async function makeEnv() {
    const store = new Map<string, string>();
    const { privateJwk, publicJwk } = await keyPair();
    const env: Env = {
      LICENSES: { get: async (k) => store.get(k) ?? null, put: async (k, v) => void store.set(k, v) },
      RAZORPAY_KEY_ID: "rzp_test", RAZORPAY_KEY_SECRET: "secret", RAZORPAY_WEBHOOK_SECRET: "wh",
      LICENSE_PRIVATE_JWK: JSON.stringify(privateJwk), PUBLIC_BASE_URL: "https://lic.example.com",
      PRICE_INR_PAISE: "14900", PRICE_USD_CENTS: "900",
    };
    return { env, store, publicJwk };
  }

  async function paidRedirect(env: Env, ref: string, paymentId: string) {
    const sig = await hmacSha256Hex("secret", `plink_1|${ref}|paid|${paymentId}`);
    const qs = new URLSearchParams({
      razorpay_payment_id: paymentId, razorpay_payment_link_id: "plink_1", razorpay_payment_link_reference_id: ref,
      razorpay_payment_link_status: "paid", razorpay_signature: sig,
    });
    return worker.fetch(new Request(`https://lic.example.com/thanks?${qs}`), env);
  }

  it("issues a key once per payment, activates it, and refuses forged redirects", async () => {
    const { env, store, publicJwk } = await makeEnv();
    store.set("ref:r1", JSON.stringify({ currency: "INR", amount: 14900 }));

    const page = await paidRedirect(env, "r1", "pay_AAAAAAAAAA");
    const html = await page.text();
    const key = html.match(/[A-HJ-NP-Z2-9]{5}(-[A-HJ-NP-Z2-9]{5}){3}/)?.[0];
    expect(page.status).toBe(200);
    expect(key).toBeDefined();

    // The same payment redirected again (refresh, or webhook) never creates a second licence.
    const again = await (await paidRedirect(env, "r1", "pay_AAAAAAAAAA")).text();
    expect(again).toContain(key!);
    expect([...store.keys()].filter((k) => k.startsWith("lic:"))).toHaveLength(1);

    const activated = await worker.fetch(new Request("https://lic.example.com/activate", {
      method: "POST", body: JSON.stringify({ key }),
    }), env);
    const { token } = (await activated.json()) as { token: string };
    expect(await verifyLicense(token, publicJwk, new Date())).toMatchObject({ key, plan: "pro" });

    const forged = new URLSearchParams({
      razorpay_payment_id: "pay_BBBBBBBBBB", razorpay_payment_link_id: "plink_1", razorpay_payment_link_reference_id: "r1",
      razorpay_payment_link_status: "paid", razorpay_signature: "00",
    });
    expect((await worker.fetch(new Request(`https://lic.example.com/thanks?${forged}`), env)).status).toBe(400);
  });

  it("rejects unknown and malformed keys", async () => {
    const { env } = await makeEnv();
    const post = (key: string) => worker.fetch(new Request("https://lic.example.com/activate", { method: "POST", body: JSON.stringify({ key }) }), env);
    expect((await post("nope")).status).toBe(400);
    expect((await post("AAAAA-BBBBB-CCCCC-DDDDD")).status).toBe(404);
  });

  it("serves plans and pricing endpoint with free, pro, and founder tiers", async () => {
    const { env } = await makeEnv();
    const res = await worker.fetch(new Request("https://lic.example.com/plans"), env);
    expect(res.status).toBe(200);
    const data = (await res.json()) as { tiers: Array<{ id: string; name: string; price: { usd: string; inr: string } }> };
    expect(data.tiers).toHaveLength(3);
    expect(data.tiers.map((t) => t.id)).toEqual(["free", "pro", "founder"]);
    expect(data.tiers[0]!.price.usd).toBe("$0");
  });

  it("handles lifetime founder passes and isLifetimeLicense recognition", async () => {
    const { env, publicJwk, store } = await makeEnv();
    // Simulate payment fulfilment for lifetime tier
    await env.LICENSES.put("ref:life1", JSON.stringify({ currency: "USD", amount: 4900, tier: "lifetime" }));
    const sig = await hmacSha256Hex(env.RAZORPAY_KEY_SECRET, "plink_life|life1|paid|pay_LIFETIME999");
    const p = new URLSearchParams({
      razorpay_payment_id: "pay_LIFETIME999", razorpay_payment_link_id: "plink_life", razorpay_payment_link_reference_id: "life1",
      razorpay_payment_link_status: "paid", razorpay_signature: sig,
    });
    const thanksRes = await worker.fetch(new Request(`https://lic.example.com/thanks?${p}`), env);
    expect(thanksRes.status).toBe(200);
    const body = await thanksRes.text();
    expect(body).toContain("Founder Lifetime");

    const key = (await env.LICENSES.get("pay:pay_LIFETIME999"))!;
    expect(key).toBeDefined();

    const activated = await worker.fetch(new Request("https://lic.example.com/activate", {
      method: "POST", body: JSON.stringify({ key }),
    }), env);
    const { token, plan } = (await activated.json()) as { token: string; plan: string };
    expect(plan).toBe("founder");
    const verified = await verifyLicense(token, publicJwk, new Date());
    expect(verified).toMatchObject({ key, plan: "founder", lifetime: true });
    expect(isLifetimeLicense(verified)).toBe(true);
  });
});

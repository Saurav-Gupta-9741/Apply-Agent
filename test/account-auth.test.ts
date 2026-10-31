// @vitest-environment node
import { describe, expect, it } from "vitest";
import worker, { type Env } from "../server/src/index";
import {
  generateSalt, hashPassword, verifyPassword, signAccountToken, verifyAccountToken, newLicenseKey,
} from "../server/src/core";
import { verifyLicense } from "../src/shared/license";

async function keyPair() {
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  return {
    privateJwk: await crypto.subtle.exportKey("jwk", pair.privateKey),
    publicJwk: await crypto.subtle.exportKey("jwk", pair.publicKey),
  };
}

function mockKv(): Env["LICENSES"] {
  const store = new Map<string, string>();
  return {
    async get(k: string) {
      return store.get(k) ?? null;
    },
    async put(k: string, v: string) {
      store.set(k, v);
    },
  };
}

describe("Account Auth & Anti-Tampering Engine", () => {
  it("hashes passwords securely with unique salts and verifies correctly", async () => {
    const salt1 = generateSalt();
    const salt2 = generateSalt();
    expect(salt1).not.toBe(salt2);

    const hash1 = await hashPassword("SecurePass123!", salt1);
    const hash2 = await hashPassword("SecurePass123!", salt2);
    expect(hash1).not.toBe(hash2);

    expect(await verifyPassword("SecurePass123!", salt1, hash1)).toBe(true);
    expect(await verifyPassword("WrongPassword!", salt1, hash1)).toBe(false);
  });

  it("signs and verifies HMAC session tokens with expiration checking", async () => {
    const secret = "test-webhook-secret-12345";
    const nowSec = 1700000000;
    const token = await signAccountToken({ email: "user@example.com", tier: "pro", exp: nowSec + 3600 }, secret);
    expect(token).toContain(".");

    const verified = await verifyAccountToken(token, secret, nowSec);
    expect(verified).toMatchObject({ email: "user@example.com", tier: "pro" });

    // Expired token is rejected
    const expired = await verifyAccountToken(token, secret, nowSec + 4000);
    expect(expired).toBeNull();

    // Tampered token is rejected
    const tampered = "X" + token.slice(1);
    expect(await verifyAccountToken(tampered, secret, nowSec)).toBeNull();
  });

  it("registers a free user account and logs in cleanly", async () => {
    const { privateJwk, publicJwk } = await keyPair();
    const kv = mockKv();
    const env: Env = {
      LICENSES: kv,
      RAZORPAY_KEY_ID: "rzp_test",
      RAZORPAY_KEY_SECRET: "sec",
      RAZORPAY_WEBHOOK_SECRET: "whsec",
      LICENSE_PRIVATE_JWK: JSON.stringify(privateJwk),
      PUBLIC_BASE_URL: "https://applyagent.test",
      PRICE_INR_PAISE: "49900",
      PRICE_USD_CENTS: "900",
    };

    // 1. Invalid email
    const badEmail = await worker.fetch(new Request("https://applyagent.test/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "notanemail", password: "password123" }),
    }), env);
    expect(badEmail.status).toBe(400);

    // 2. Short password
    const shortPwd = await worker.fetch(new Request("https://applyagent.test/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "valid@example.com", password: "short" }),
    }), env);
    expect(shortPwd.status).toBe(400);

    // 3. Successful register
    const regRes = await worker.fetch(new Request("https://applyagent.test/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json", "CF-Connecting-IP": "1.2.3.4" },
      body: JSON.stringify({ email: "candidate@gmail.com", password: "SuperSecretPassword123!" }),
    }), env);
    expect(regRes.status).toBe(200);
    const regData = (await regRes.json()) as any;
    expect(regData.ok).toBe(true);
    expect(regData.user.tier).toBe("free");
    expect(regData.sessionToken).toBeTruthy();

    // 4. Duplicate register
    const dupRes = await worker.fetch(new Request("https://applyagent.test/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json", "CF-Connecting-IP": "1.2.3.4" },
      body: JSON.stringify({ email: "candidate@gmail.com", password: "SuperSecretPassword123!" }),
    }), env);
    expect(dupRes.status).toBe(409);

    // 5. Successful login
    const loginRes = await worker.fetch(new Request("https://applyagent.test/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", "CF-Connecting-IP": "1.2.3.4" },
      body: JSON.stringify({ email: "candidate@gmail.com", password: "SuperSecretPassword123!" }),
    }), env);
    expect(loginRes.status).toBe(200);
    const loginData = (await loginRes.json()) as any;
    expect(loginData.ok).toBe(true);
    expect(loginData.user.email).toBe("candidate@gmail.com");

    // 6. /auth/me verification
    const meRes = await worker.fetch(new Request("https://applyagent.test/auth/me", {
      headers: { Authorization: `Bearer ${loginData.sessionToken}` },
    }), env);
    expect(meRes.status).toBe(200);
    const meData = (await meRes.json()) as any;
    expect(meData.user.email).toBe("candidate@gmail.com");
    expect(meData.user.tier).toBe("free");
  });

  it("registers with a pre-existing license key and issues valid signed token", async () => {
    const { privateJwk, publicJwk } = await keyPair();
    const kv = mockKv();
    const key = newLicenseKey();
    const future = Date.now() + 30 * 86_400_000;
    await kv.put(`lic:${key}`, JSON.stringify({ paidUntil: future, lifetime: true, payments: ["pay_123"] }));

    const env: Env = {
      LICENSES: kv,
      RAZORPAY_KEY_ID: "rzp_test",
      RAZORPAY_KEY_SECRET: "sec",
      RAZORPAY_WEBHOOK_SECRET: "whsec",
      LICENSE_PRIVATE_JWK: JSON.stringify(privateJwk),
      PUBLIC_BASE_URL: "https://applyagent.test",
      PRICE_INR_PAISE: "49900",
      PRICE_USD_CENTS: "900",
    };

    const res = await worker.fetch(new Request("https://applyagent.test/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json", "CF-Connecting-IP": "5.6.7.8" },
      body: JSON.stringify({ email: "founder@domain.com", password: "Password12345!", licenseKey: key }),
    }), env);

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.user.tier).toBe("founder");
    expect(data.user.lifetime).toBe(true);
    expect(data.token).toBeTruthy();

    // Verify ECDSA signature of issued license token
    const verifiedLicense = await verifyLicense(data.token, publicJwk, new Date());
    expect(verifiedLicense).toMatchObject({
      key,
      plan: "founder",
      lifetime: true,
      email: "founder@domain.com",
    });
  });
});

// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  applyReferralCredit,
  newLicenseKey,
  PASS_DAYS,
  extendedUntil,
} from "../server/src/core";

describe("Lane 8: Referral System & Anti-Abuse", () => {
  const DAY_MS = 86_400_000;
  const now = 1730000000000;

  it("grants +30 days of Pro to both referrer and referee upon successful referral", () => {
    const referrerKey = newLicenseKey();
    const refereeKey = newLicenseKey();

    const referrerInitial = { paidUntil: now + 10 * DAY_MS };
    const refereeInitial = { paidUntil: now + 30 * DAY_MS };
    const claimed = new Set<string>();

    const res = applyReferralCredit(
      referrerKey,
      refereeKey,
      referrerInitial,
      refereeInitial,
      claimed,
      now
    );

    expect(res.success).toBe(true);
    // Referrer: 10 days remaining + 30 days = 40 days
    expect(res.referrerPaidUntil).toBe(now + 40 * DAY_MS);
    // Referee: 30 days remaining + 30 days = 60 days
    expect(res.refereePaidUntil).toBe(now + 60 * DAY_MS);
  });

  it("strictly prevents self-referral abuse", () => {
    const key = newLicenseKey();
    const current = { paidUntil: now + 5 * DAY_MS };
    const claimed = new Set<string>();

    const res = applyReferralCredit(key, key, current, current, claimed, now);
    expect(res.success).toBe(false);
    expect(res.error).toBe("self_referral");
  });

  it("strictly prevents duplicate referral claims for the same referee", () => {
    const referrerKey1 = newLicenseKey();
    const referrerKey2 = newLicenseKey();
    const refereeKey = newLicenseKey();

    const initial = { paidUntil: now };
    const claimed = new Set<string>();

    const res1 = applyReferralCredit(
      referrerKey1,
      refereeKey,
      initial,
      initial,
      claimed,
      now
    );
    expect(res1.success).toBe(true);

    // Second claim with another referrer or same referrer must fail
    const res2 = applyReferralCredit(
      referrerKey2,
      refereeKey,
      initial,
      initial,
      claimed,
      now
    );
    expect(res2.success).toBe(false);
    expect(res2.error).toBe("already_claimed");
  });

  it("rejects invalid key formats", () => {
    const validKey = newLicenseKey();
    const invalidKey = "invalid-key-123";
    const initial = { paidUntil: now };
    const claimed = new Set<string>();

    const res = applyReferralCredit(
      validKey,
      invalidKey,
      initial,
      initial,
      claimed,
      now
    );
    expect(res.success).toBe(false);
    expect(res.error).toBe("invalid_key");
  });
});

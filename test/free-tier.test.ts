// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from "vitest";
import { canUseFeature, isPro, remainingSubmissions, type Feature, type LicensePayload } from "../src/shared/license";
import type { ApplicationRecord, QueueItem } from "../src/shared/types";
import { pump } from "../src/background/runner";

// Mock chrome storage
const mockStorage: Record<string, unknown> = {};

vi.stubGlobal("chrome", {
  storage: {
    local: {
      get: vi.fn(async (keys: string | string[]) => {
        if (typeof keys === "string") return { [keys]: mockStorage[keys] };
        const res: Record<string, unknown> = {};
        for (const k of keys) res[k] = mockStorage[k];
        return res;
      }),
      set: vi.fn(async (obj: Record<string, unknown>) => {
        Object.assign(mockStorage, obj);
      }),
    },
  },
  alarms: {
    create: vi.fn(),
    clear: vi.fn(),
  },
  tabs: {
    query: vi.fn(async () => []),
    create: vi.fn(),
    remove: vi.fn(),
  },
});

describe("Free tier redesign (Step 8)", () => {
  beforeEach(() => {
    for (const key of Object.keys(mockStorage)) delete mockStorage[key];
    vi.clearAllMocks();
  });

  it("permits free features to free users and gates Pro features", () => {
    const freeFeatures: Feature[] = [
      "single_fill",
      "answer_bank",
      "quick_answers",
      "basic_tracker",
      "save_form_structure",
    ];
    const proFeatures: Feature[] = [
      "queue",
      "resume_import",
      "ai_drafts",
      "tracker_analytics",
      "enterprise_multistep",
    ];

    for (const f of freeFeatures) {
      expect(canUseFeature(null, f), `Free user should have access to ${f}`).toBe(true);
    }
    for (const f of proFeatures) {
      expect(canUseFeature(null, f), `Free user should NOT have access to ${f}`).toBe(false);
    }

    const proLicense: LicensePayload = { key: "KEY-123", plan: "pro", exp: 9999999999 };
    for (const f of [...freeFeatures, ...proFeatures]) {
      expect(canUseFeature(proLicense, f), `Pro user should have access to ${f}`).toBe(true);
    }

    const trialLicense: LicensePayload = { key: "TRIAL", plan: "pro", exp: 9999999999, trial: true };
    for (const f of [...freeFeatures, ...proFeatures]) {
      expect(canUseFeature(trialLicense, f), `Trial user should have access to ${f}`).toBe(true);
    }
  });

  it("allows free user to fill unlimited single forms", () => {
    const now = new Date("2026-11-01T12:00:00Z");
    const apps: ApplicationRecord[] = Array.from({ length: 150 }, (_, i) => ({
      id: `app-${i}`,
      url: `https://example.com/job-${i}`,
      platform: "greenhouse",
      jobTitle: `Software Engineer ${i}`,
      status: "applied_confirmed",
      createdAt: now.toISOString(),
    }));

    // Free user has unlimited single form submissions
    expect(remainingSubmissions(null, apps, now)).toBe(Number.POSITIVE_INFINITY);
    expect(remainingSubmissions(null, [], now)).toBe(Number.POSITIVE_INFINITY);
  });

  it("blocks queue without Pro with clear upgrade message", async () => {
    const now = new Date().toISOString();
    const queuedItems: QueueItem[] = [
      { id: "q1", url: "https://job1.com/apply", title: "Job 1", company: "Co 1", status: "queued", addedAt: now, updatedAt: now },
      { id: "q2", url: "https://job2.com/apply", title: "Job 2", company: "Co 2", status: "queued", addedAt: now, updatedAt: now },
    ];
    mockStorage["queue"] = queuedItems;
    mockStorage["queueRunning"] = true;
    mockStorage["applications"] = [];
    mockStorage["settings"] = { dailyCap: 20, maxParallel: 2, perHostMax: 1, mode: "review" };
    mockStorage["license"] = null; // free user

    await pump();

    const finalQueue = mockStorage["queue"] as QueueItem[];
    expect(finalQueue.every((q) => q.note === "Bulk apply and background queue require Pro. Upgrade to Pro in Profile & plan.")).toBe(true);
    expect(mockStorage["queueRunning"]).toBe(false);
  });
});

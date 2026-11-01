/** Safe pacing: limits, cooldowns and robot-check backoff (honest limits, never evasion), storage concurrency, and the
 * challenge pages that stop a run. */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyChallenge, CHALLENGE_QUEUE_PAUSE_MS, CHALLENGE_SITE_PAUSE_MS, checkStart, clampPacing, DEFAULT_PACING, EMPTY_PACING_STATE,
  loadPacingState, prune, recordStart, siteKey, statusLine, tryStart, waitNote, type PacingState,
} from "../src/shared/pacing";
import { detectChallenge } from "../src/content/detect";
import { fillForm } from "../src/content/agent";
import { planNext, DEFAULT_SETTINGS } from "../src/background/queue";
import { queueStatusFor } from "../src/background/runner";
import type { QueueItem } from "../src/shared/types";
import { dropResumeRequirement, mount, PROFILE, SENSITIVE_ANSWERS } from "./fixtures";

const MIN = 60_000;
const HOUR = 60 * MIN;
// A fixed local time: 2026-11-01 14:00.
const NOW = new Date(2026, 10, 1, 14, 0, 0).getTime();
const S = { ...DEFAULT_PACING };

function started(times: number[], site = (i: number) => `site${i}`): PacingState {
  return { ...EMPTY_PACING_STATE, starts: times.map((at, i) => ({ at, site: site(i) })) };
}

describe("settings", () => {
  it("defaults: 8 an hour, 40 a day, 3 minutes per site, 150 ms between fields, stop on challenge", () => {
    expect(clampPacing(undefined)).toEqual({ maxPerHour: 8, maxPerDay: 40, perSiteCooldownMinutes: 3, pauseBetweenFieldsMs: 150, stopOnChallenge: true });
  });

  it("keeps limits within sane bounds (per hour 1–20, per day 1–100, cooldown 0–30 min)", () => {
    expect(clampPacing({ maxPerHour: 500, maxPerDay: 0, perSiteCooldownMinutes: 99 })).toMatchObject({ maxPerHour: 20, maxPerDay: 1, perSiteCooldownMinutes: 30 });
    expect(clampPacing({ maxPerHour: -3, maxPerDay: 1000, perSiteCooldownMinutes: -1 })).toMatchObject({ maxPerHour: 1, maxPerDay: 100, perSiteCooldownMinutes: 0 });
    expect(clampPacing({ maxPerHour: Number.NaN, maxPerDay: "12" as unknown as number })).toMatchObject({ maxPerHour: 8, maxPerDay: 12 });
    expect(clampPacing({ stopOnChallenge: false }).stopOnChallenge).toBe(false);
  });
});

describe("limits", () => {
  it("allows a start under every limit", () => {
    expect(checkStart(EMPTY_PACING_STATE, S, "a.com", NOW)).toEqual({ ok: true });
  });

  it("hourly: the 9th start in an hour waits until the oldest start leaves the hour", () => {
    const state = started(Array.from({ length: 8 }, (_, i) => NOW - 50 * MIN + i * 5 * MIN));
    expect(checkStart(state, S, "new.com", NOW)).toEqual({ ok: false, reason: "hour", nextAt: NOW - 50 * MIN + HOUR });
    // Ten minutes later the oldest one is out of the window.
    expect(checkStart(state, S, "new.com", NOW + 10 * MIN)).toEqual({ ok: true });
  });

  it("hourly: starts older than an hour do not count", () => {
    const state = started(Array.from({ length: 8 }, (_, i) => NOW - HOUR - (i + 1) * MIN));
    expect(checkStart(state, S, "new.com", NOW)).toEqual({ ok: true });
  });

  it("daily: counts today's starts (local calendar day) and waits until midnight", () => {
    const today = new Date(NOW);
    today.setHours(0, 30, 0, 0);
    const state = started(Array.from({ length: 40 }, (_, i) => today.getTime() + i * 15 * MIN));
    const midnight = new Date(NOW);
    midnight.setHours(24, 0, 0, 0);
    expect(checkStart(state, { ...S, maxPerHour: 20 }, "new.com", NOW + 2 * HOUR)).toEqual({ ok: false, reason: "day", nextAt: midnight.getTime() });
    // Yesterday's starts do not count today.
    const yesterday = started(Array.from({ length: 40 }, (_, i) => today.getTime() - HOUR - i * MIN));
    expect(checkStart(yesterday, S, "new.com", NOW)).toEqual({ ok: true });
  });

  it("per-site cooldown: 3 minutes between two starts on the same site; other sites are not held back", () => {
    const state = started([NOW - MIN], () => "boards.greenhouse.io/acme");
    expect(checkStart(state, S, "boards.greenhouse.io/acme", NOW)).toEqual({ ok: false, reason: "site_cooldown", nextAt: NOW + 2 * MIN });
    expect(checkStart(state, S, "boards.greenhouse.io/globex", NOW)).toEqual({ ok: true });
    expect(checkStart(state, S, "boards.greenhouse.io/acme", NOW + 2 * MIN)).toEqual({ ok: true });
    expect(checkStart(state, { ...S, perSiteCooldownMinutes: 0 }, "boards.greenhouse.io/acme", NOW)).toEqual({ ok: true });
  });

  it("the site of a URL: the employer on a shared ATS host, else the host", () => {
    expect(siteKey("https://boards.greenhouse.io/acme/jobs/1")).toBe("boards.greenhouse.io/acme");
    expect(siteKey("https://boards.greenhouse.io/globex/jobs/2")).toBe("boards.greenhouse.io/globex");
    expect(siteKey("https://careers.example.com/jobs/1")).toBe("careers.example.com");
  });

  it("recordStart counts a start; prune forgets only what no limit looks at", () => {
    const state = recordStart(started([NOW - 2 * 24 * HOUR]), "a.com", NOW);
    expect(state.starts).toHaveLength(2);
    expect(prune(state, NOW).starts).toEqual([{ at: NOW, site: "a.com" }]);
  });
});

describe("robot-check backoff", () => {
  it("pauses that site for 30 minutes and the whole queue for 10", () => {
    const state = applyChallenge(EMPTY_PACING_STATE, "jobs.lever.co/acme", NOW, "a CAPTCHA");
    expect(state.sitePausedUntil["jobs.lever.co/acme"]).toBe(NOW + CHALLENGE_SITE_PAUSE_MS);
    expect(state.queuePausedUntil).toBe(NOW + CHALLENGE_QUEUE_PAUSE_MS);
    expect(CHALLENGE_SITE_PAUSE_MS).toBe(30 * MIN);
    expect(CHALLENGE_QUEUE_PAUSE_MS).toBe(10 * MIN);
    expect(checkStart(state, S, "other.com", NOW + 5 * MIN)).toEqual({ ok: false, reason: "queue_paused", nextAt: NOW + 10 * MIN });
    expect(checkStart(state, S, "other.com", NOW + 11 * MIN)).toEqual({ ok: true });
    expect(checkStart(state, S, "jobs.lever.co/acme", NOW + 11 * MIN)).toEqual({ ok: false, reason: "site_paused", nextAt: NOW + 30 * MIN });
    expect(checkStart(state, S, "jobs.lever.co/acme", NOW + 31 * MIN)).toEqual({ ok: true });
  });

  it("a second challenge never shortens a pause", () => {
    const first = applyChallenge(EMPTY_PACING_STATE, "a.com", NOW);
    const second = applyChallenge({ ...first, queuePausedUntil: NOW + HOUR }, "a.com", NOW + MIN);
    expect(second.queuePausedUntil).toBe(NOW + HOUR);
    expect(second.sitePausedUntil["a.com"]).toBe(NOW + MIN + CHALLENGE_SITE_PAUSE_MS);
  });

  it("a challenge report puts the queue item on 'needs you' with a plain note", () => {
    const report = { status: "needs_user" as const, platform: "", url: "", jobTitle: "", fields: [], captcha: true, errors: [], challenge: "a CAPTCHA" };
    const { status, note } = queueStatusFor(report);
    expect(status).toBe("needs_user");
    expect(note).toMatch(/showed a CAPTCHA/);
    expect(note).toMatch(/never solves or bypasses/);
  });
});

describe("status line and notes", () => {
  it("'3 of 8 this hour · 12 of 40 today', with the next time only while something waits", () => {
    const today = new Date(NOW);
    today.setHours(8, 0, 0, 0);
    const morning = Array.from({ length: 9 }, (_, i) => today.getTime() + i * MIN);
    const lastHour = [NOW - 30 * MIN, NOW - 20 * MIN, NOW - 10 * MIN];
    const state = started([...morning, ...lastHour]);
    expect(statusLine(state, S, NOW)).toBe("3 of 8 this hour · 12 of 40 today");
    const full = started(Array.from({ length: 8 }, (_, i) => NOW - 55 * MIN + i * MIN));
    expect(statusLine(full, S, NOW)).toBe("8 of 8 this hour · 8 of 40 today · next at 14:05");
  });

  it("explains every wait in plain words", () => {
    expect(waitNote({ ok: false, reason: "hour", nextAt: NOW + 5 * MIN }, S, NOW)).toBe("Waiting: 8 started this hour (your safe pace). Next at 14:05.");
    expect(waitNote({ ok: false, reason: "site_cooldown", nextAt: NOW + 2 * MIN }, S, NOW)).toMatch(/3 min between applications on this site\. Next at 14:02/);
    expect(waitNote({ ok: false, reason: "queue_paused", nextAt: NOW + 10 * MIN }, S, NOW)).toMatch(/robot check.*14:10/);
  });
});

describe("the queue plan leaves out what pacing holds back", () => {
  const item = (id: string, url: string): QueueItem => ({ id, url, title: "", company: "", status: "queued", addedAt: "", updatedAt: "" });

  it("an item that must wait takes no slot; the next one starts instead", () => {
    const queue = [item("a", "https://a.example.com/1"), item("b", "https://b.example.com/1")];
    const plan = planNext(queue, [], { ...DEFAULT_SETTINGS, maxParallel: 1 }, new Date(NOW), (q) => q.id !== "a");
    expect(plan.start.map((q) => q.id)).toEqual(["b"]);
  });
});

// --- storage: one locked read-modify-write per start ------------------------------------------------------
describe("tryStart under concurrency", () => {
  let store: Record<string, unknown>;
  beforeEach(() => {
    store = {};
    // Asynchronous like the real chrome.storage: reads and writes interleave unless they are locked.
    const later = <T>(value: T) => new Promise<T>((resolve) => setTimeout(() => resolve(value), Math.random() * 5));
    vi.stubGlobal("chrome", {
      storage: {
        local: {
          get: (key: string) => later({ [key]: structuredClone(store[key]) }),
          set: (values: Record<string, unknown>) => later(undefined).then(() => void Object.assign(store, structuredClone(values))),
        },
      },
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("20 starts at the same moment on 20 sites: exactly maxPerHour (8) are allowed and counted", async () => {
    const results = await Promise.all(Array.from({ length: 20 }, (_, i) => tryStart(`https://site${i}.example.com/job`, NOW)));
    expect(results.filter((r) => r.ok)).toHaveLength(8);
    expect(results.filter((r) => !r.ok).every((r) => !r.ok && r.reason === "hour")).toBe(true);
    expect((await loadPacingState()).starts).toHaveLength(8);
  });

  it("20 starts on one site: exactly one passes the per-site cooldown", async () => {
    const results = await Promise.all(Array.from({ length: 20 }, () => tryStart("https://jobs.lever.co/acme/1", NOW)));
    expect(results.filter((r) => r.ok)).toHaveLength(1);
  });

  it("honours the user's own limits from storage", async () => {
    store.pacing = { maxPerHour: 3 };
    const results = await Promise.all(Array.from({ length: 10 }, (_, i) => tryStart(`https://s${i}.example.com/`, NOW)));
    expect(results.filter((r) => r.ok)).toHaveLength(3);
  });
});

// --- challenge pages --------------------------------------------------------------------------------------
describe("challenge detection", () => {
  function page(html: string, title = "Careers"): Document {
    document.title = title;
    document.body.innerHTML = html;
    return document;
  }

  it.each([
    ["<h1>Unusual activity detected</h1><p>Please try again later.</p>", "Careers"],
    ["<p>Too many requests. Please slow down.</p>", "Error"],
    ["<h2>Are you a robot?</h2>", "Careers"],
    ["<div role='alert'>Please verify you are human to continue</div>", "Careers"],
    ["<p>Rate limit exceeded</p>", "Careers"],
    ["<h1>Access Denied</h1><p>You don't have permission to access this server.</p>", "Access Denied"],
    ["<h1>429</h1><p>Slow down</p>", "429 Too Many Requests"],
    ["<p>Checking your browser before accessing the site.</p>", "Just a moment..."],
    ["<iframe src='https://www.google.com/recaptcha/api2/bframe?k=x'></iframe>", "Careers"],
    ["<div class='h-captcha'></div>", "Careers"],
    ["<div class='cf-turnstile'></div>", "Careers"],
  ])("stops for %s", (html, title) => {
    expect(detectChallenge(page(html, title))).not.toBeNull();
  });

  it.each([
    "<h1>Robotics Engineer</h1><p>Build robots and robotics software for warehouses.</p>",
    "<h1>Backend Engineer</h1><p>You get access to benefits from day one, and access to learning budgets.</p>",
    "<h1>Platform Engineer</h1><p>Experience with rate limiting, caching and API gateways.</p>",
    "<h1>Security Analyst</h1><p>Investigate unusual login patterns and manage access controls.</p>",
    "<h1>Human Resources Partner</h1><p>Are you a people person? Join our human resources team.</p>",
  ])("does not stop for a job description: %s", (html) => {
    expect(detectChallenge(page(html))).toBeNull();
  });

  it("a long job description that only mentions such words deep in the text is not a challenge", () => {
    const long = `<h1>SRE</h1><p>${"Keep systems reliable. ".repeat(100)} We handle 'too many requests' errors gracefully.</p>`;
    expect(detectChallenge(page(long))).toBeNull();
  });

  it("a fill stops at once on a challenge page, before typing anything", async () => {
    mount();
    dropResumeRequirement();
    document.body.insertAdjacentHTML("afterbegin", "<iframe src='https://www.google.com/recaptcha/api2/bframe'></iframe>");
    const report = await fillForm(document, { profile: { ...PROFILE, resume: undefined }, answers: SENSITIVE_ANSWERS, mode: "auto" });
    expect(report.status).toBe("needs_user");
    expect(report.challenge).toBe("a CAPTCHA");
    expect((document.getElementById("first_name") as HTMLInputElement).value).toBe("");
  });

  it("with stopOnChallenge off, the old behaviour stays: fill, then wait for the user to solve it", async () => {
    mount();
    dropResumeRequirement();
    document.body.insertAdjacentHTML("beforeend", "<div class='h-captcha'></div>");
    const report = await fillForm(document, { profile: { ...PROFILE, resume: undefined }, answers: SENSITIVE_ANSWERS, mode: "auto", stopOnChallenge: false });
    expect(report.captcha).toBe(true);
    expect(report.challenge).toBeUndefined();
    expect((document.getElementById("first_name") as HTMLInputElement).value).toBe("Asha");
  });
});

describe("fill pacing", () => {
  it("waits the same fixed pause after each field it fills (never a random one)", async () => {
    mount();
    dropResumeRequirement();
    const waits: number[] = [];
    const real = globalThis.setTimeout;
    const spy = vi.spyOn(globalThis, "setTimeout").mockImplementation(((fn: () => void, ms?: number) => {
      if (ms === 40) waits.push(ms);
      return real(fn, ms === 40 ? 0 : ms);
    }) as typeof setTimeout);
    try {
      const report = await fillForm(document, { profile: { ...PROFILE, resume: undefined }, answers: SENSITIVE_ANSWERS, mode: "review", pauseBetweenFieldsMs: 40 });
      // After each non-file field it typed into or chose, except the last field of the form (nothing follows it).
      const acted = report.fields.filter((f, i) => f.field.control !== "file" && i < report.fields.length - 1 && (f.status === "filled" || f.status === "failed")).length;
      expect(acted).toBeGreaterThan(3);
      expect(waits).toHaveLength(acted);
      expect(new Set(waits)).toEqual(new Set([40])); // always the same pause
    } finally {
      spy.mockRestore();
    }
  });
});

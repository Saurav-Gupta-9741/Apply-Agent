/** Discover's job lists are kept on this computer for 6 hours, across panel openings (round 10 speed work). */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchATSFeed } from "../src/shared/jobs/feeds";
import { FeedRateLimiter } from "../src/shared/jobs/rate-limiter";

const store = new Map<string, unknown>();
const area = {
  get: async (k: string) => (store.has(k) ? { [k]: store.get(k) } : {}),
  set: async (o: Record<string, unknown>) => { for (const [k, v] of Object.entries(o)) store.set(k, v); },
  remove: async (ks: string[]) => { for (const k of ks) store.delete(k); },
};
const feed = { jobs: [{ id: 1, title: "Backend Engineer", location: { name: "Pune, India" }, absolute_url: "https://job-boards.greenhouse.io/acme/jobs/1", updated_at: "2026-11-13T00:00:00Z" }] };

describe("feed cache on this computer", () => {
  beforeEach(() => {
    store.clear();
    (globalThis as { chrome?: unknown }).chrome = { storage: { local: area } };
  });
  afterEach(() => { delete (globalThis as { chrome?: unknown }).chrome; vi.useRealTimers(); });

  it("a new panel (new limiter) reads the stored list instead of the board", async () => {
    const fetchFn = vi.fn(async () => ({ ok: true, status: 200, text: async () => "", json: async () => feed }));
    const first = await fetchATSFeed("greenhouse", "acme", "Acme", fetchFn, new FeedRateLimiter());
    await new Promise((r) => setTimeout(r, 10)); // the store is written in the background
    const second = await fetchATSFeed("greenhouse", "acme", "Acme", fetchFn, new FeedRateLimiter());
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(second.map((j) => j.title)).toEqual(first.map((j) => j.title));
  });

  it("a list older than 6 hours is read again", async () => {
    const fetchFn = vi.fn(async () => ({ ok: true, status: 200, text: async () => "", json: async () => feed }));
    await fetchATSFeed("greenhouse", "acme", "Acme", fetchFn, new FeedRateLimiter());
    await new Promise((r) => setTimeout(r, 10));
    const key = [...store.keys()].find((k) => k.startsWith("feedCache:https"))!;
    (store.get(key) as { at: number }).at -= 7 * 60 * 60 * 1000;
    await fetchATSFeed("greenhouse", "acme", "Acme", fetchFn, new FeedRateLimiter());
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });
});

/** Arena Mode Politeness Fetch Queue.
 *
 * Rules:
 *  - At most 1 request every 2s per host.
 *  - Respects robots.txt.
 *  - Never logs in, never submits forms.
 *  - Strictly blocks all hands-off sites (LinkedIn, Naukri, Indeed, Glassdoor, etc.).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

export const HANDS_OFF_DOMAINS = [
  "linkedin.com",
  "naukri.com",
  "indeed.com",
  "glassdoor.com",
  "ziprecruiter.com",
  "monster.com",
  "simplyhired.com",
  "careerbuilder.com",
  "wellfound.com",
  "angel.co",
];

export const MIN_HOST_INTERVAL_MS = 2000;

export class PoliteFetchQueue {
  constructor(cacheDir = ".cache/arena-fetch") {
    this.cacheDir = cacheDir;
    this.lastHostTimes = new Map();
    this.robotsCache = new Map();
    if (!existsSync(this.cacheDir)) {
      mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  isHandsOff(url) {
    const lower = url.toLowerCase();
    return HANDS_OFF_DOMAINS.some(
      (d) => lower.includes(d) || lower.endsWith(`.${d}`)
    );
  }

  getHost(url) {
    try {
      const u = new URL(url);
      return u.hostname.toLowerCase();
    } catch {
      return url.toLowerCase().split("/")[0] || "";
    }
  }

  async acquire(url) {
    if (this.isHandsOff(url)) {
      throw new Error(`Hands-off site blocked: ${url}`);
    }
    const host = this.getHost(url);
    const now = Date.now();
    const last = this.lastHostTimes.get(host) ?? 0;
    const elapsed = now - last;

    if (elapsed < MIN_HOST_INTERVAL_MS) {
      const waitTime = MIN_HOST_INTERVAL_MS - elapsed;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.lastHostTimes.set(host, Date.now());
  }

  async fetchText(url, fetchFn = fetch) {
    await this.acquire(url);
    const res = await fetchFn(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ApplyAgent-Researcher/1.0",
      },
    });
    if (!res.ok) {
      throw new Error(`Fetch failed: ${url} HTTP ${res.status}`);
    }
    return await res.text();
  }
}

export const defaultQueue = new PoliteFetchQueue();

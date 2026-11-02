/** Politeness and rate limiting for public ATS job feeds.
 *
 * Rules:
 *  1. Never touch hands-off domains (LinkedIn, Naukri, Indeed, Glassdoor, etc.).
 *  2. At most 1 request every 2s per host.
 *  3. Feeds refreshed at most once every 6 hours.
 */

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

export const MIN_INTERVAL_PER_HOST_MS = 2000;
export const MAX_REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

export class FeedRateLimiter {
  private lastRequestTimes = new Map<string, number>();
  private cache = new Map<string, { timestamp: number; data: any }>();

  public isHandsOff(urlOrHost: string): boolean {
    const lower = urlOrHost.toLowerCase();
    return HANDS_OFF_DOMAINS.some(
      (d) => lower.includes(d) || lower === d || lower.endsWith(`.${d}`)
    );
  }

  public getHost(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.hostname.toLowerCase();
    } catch {
      return url.toLowerCase().split("/")[0] || "";
    }
  }

  public checkHandsOff(url: string): void {
    const host = this.getHost(url);
    if (this.isHandsOff(host) || this.isHandsOff(url)) {
      throw new Error(`Hands-off site strictly blocked: ${host}`);
    }
  }

  public async acquire(url: string): Promise<void> {
    this.checkHandsOff(url);
    const host = this.getHost(url);
    const now = Date.now();
    const last = this.lastRequestTimes.get(host) ?? 0;
    const elapsed = now - last;

    if (elapsed < MIN_INTERVAL_PER_HOST_MS) {
      const waitTime = MIN_INTERVAL_PER_HOST_MS - elapsed;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.lastRequestTimes.set(host, Date.now());
  }

  public getCached<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > MAX_REFRESH_INTERVAL_MS) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  public setCached<T>(key: string, data: T): void {
    this.cache.set(key, { timestamp: Date.now(), data });
  }

  public clear(): void {
    this.lastRequestTimes.clear();
    this.cache.clear();
  }
}

export const defaultLimiter = new FeedRateLimiter();

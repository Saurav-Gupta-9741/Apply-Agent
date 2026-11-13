import type { JobPosting, SupportedATS } from "./types";
import { FeedRateLimiter, defaultLimiter } from "./rate-limiter";

/** Construct the public feed URL for a given ATS and company slug */
/** The sites Discover and the daily alerts read (the optional permission the user grants once). */
export const FEED_ORIGINS: Record<SupportedATS, string> = {
  greenhouse: "https://boards-api.greenhouse.io/*",
  lever: "https://api.lever.co/*",
  ashby: "https://api.ashbyhq.com/*",
  smartrecruiters: "https://api.smartrecruiters.com/*",
  recruitee: "https://*.recruitee.com/*",
  personio: "https://*.jobs.personio.de/*",
  workable: "https://apply.workable.com/*",
};

export function getFeedUrl(ats: SupportedATS, slug: string): string {
  switch (ats) {
    case "greenhouse":
      return `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(slug)}/jobs?content=true`;
    case "lever":
      return `https://api.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json`;
    case "ashby":
      return `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(slug)}`;
    case "smartrecruiters":
      return `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(slug)}/postings`;
    case "recruitee":
      return `https://${encodeURIComponent(slug)}.recruitee.com/api/offers`;
    case "personio":
      return `https://${encodeURIComponent(slug)}.jobs.personio.de/xml`;
    case "workable":
      return `https://apply.workable.com/api/v1/widget/accounts/${encodeURIComponent(slug)}`;
    default:
      throw new Error(`Unsupported ATS feed: ${ats}`);
  }
}

const DESCRIPTION_MAX = 6000;

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", bull: "•", hellip: "…" };
function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1] === "x" || e[1] === "X" ? Number.parseInt(e.slice(2), 16) : Number.parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

/** A job description (HTML, sometimes HTML-escaped as Greenhouse sends it) as plain text for matching. Never
 * inserted into the page: it is only searched for skills and years. */
export function htmlToText(html: string | undefined, max = DESCRIPTION_MAX): string {
  if (!html || typeof html !== "string") return "";
  let t = html;
  if (/&lt;\/?[a-z]/i.test(t)) t = decodeEntities(t); // escaped HTML: unescape once to get the tags back
  t = t.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/(p|div|li|h\d|tr|ul|ol)>|<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n• ")
    .replace(/<[^>]+>/g, " ");
  return decodeEntities(t).replace(/[ \t\f\v\u00a0]+/g, " ").replace(/\s*\n\s*/g, "\n").trim().slice(0, max);
}

function snippet(text: string): string | undefined {
  const t = text.replace(/\s+/g, " ").trim();
  return t ? t.slice(0, 300) : undefined;
}

const prettySlug = (slug: string): string => slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/** Check if a location string indicates remote work */
export function isRemoteLocation(loc: string, title?: string): boolean {
  const norm = `${loc} ${title ?? ""}`.toLowerCase();
  return /\b(remote|anywhere|telecommute|wfh|work from home|home-based|distributed)\b/i.test(norm);
}

/** Parse Greenhouse JSON response */
export function parseGreenhouseFeed(json: any, slug: string, companyName: string): JobPosting[] {
  const jobs = json?.jobs;
  if (!Array.isArray(jobs)) return [];

  return jobs.map((j: any) => {
    const locName = j.location?.name ?? "";
    const isRemote = isRemoteLocation(locName, j.title);
    const description = htmlToText(j.content);
    return {
      id: `gh-${j.id}`,
      companySlug: slug,
      companyName: companyName || (typeof j.company_name === "string" && j.company_name.trim()) || prettySlug(slug),
      ats: "greenhouse",
      title: j.title || "Untitled Role",
      location: locName,
      isRemote,
      department: j.departments?.[0]?.name,
      url: j.absolute_url || `https://boards.greenhouse.io/${slug}/jobs/${j.id}`,
      publishedAt: j.first_published || j.updated_at,
      descriptionSnippet: snippet(description),
      description: description || undefined,
    };
  });
}

/** Parse Lever JSON response */
export function parseLeverFeed(json: any, slug: string, companyName: string): JobPosting[] {
  if (!Array.isArray(json)) return [];

  return json.map((j: any) => {
    const locName = j.categories?.location ?? "";
    const workplaceType = j.workplaceType || "";
    const isRemote = workplaceType.toLowerCase() === "remote" || isRemoteLocation(locName, j.text);
    const lists = Array.isArray(j.lists) ? j.lists.map((l: any) => `${l?.text ?? ""}\n${htmlToText(l?.content)}`).join("\n") : "";
    const description = [typeof j.descriptionPlain === "string" ? j.descriptionPlain : htmlToText(j.description), lists, typeof j.additionalPlain === "string" ? j.additionalPlain : ""]
      .filter(Boolean).join("\n").slice(0, DESCRIPTION_MAX);
    return {
      id: `lever-${j.id}`,
      companySlug: slug,
      companyName: companyName || prettySlug(slug),
      ats: "lever",
      title: j.text || "Untitled Role",
      location: locName,
      isRemote,
      department: j.categories?.department || j.categories?.team,
      employmentType: j.categories?.commitment || undefined,
      url: j.hostedUrl || `https://jobs.lever.co/${slug}/${j.id}`,
      publishedAt: j.createdAt ? new Date(j.createdAt).toISOString() : undefined,
      descriptionSnippet: snippet(description),
      description: description || undefined,
      salary: j.salaryRange
        ? {
            currency: j.salaryRange.currency,
            min: j.salaryRange.min,
            max: j.salaryRange.max,
            period: j.salaryRange.interval === "per-year-salary" ? "year" : undefined,
          }
        : undefined,
    };
  });
}

/** Parse Ashby JSON response */
export function parseAshbyFeed(json: any, slug: string, companyName: string): JobPosting[] {
  const jobs = json?.jobs;
  if (!Array.isArray(jobs)) return [];

  return jobs.map((j: any) => {
    const locName = j.location || j.address?.postalAddress?.addressLocality || "";
    const isRemote = j.isRemote || isRemoteLocation(locName, j.title);
    const description = (typeof j.descriptionPlain === "string" ? j.descriptionPlain : htmlToText(j.descriptionHtml)).slice(0, DESCRIPTION_MAX);
    return {
      id: `ashby-${j.id}`,
      companySlug: slug,
      companyName: companyName || prettySlug(slug),
      ats: "ashby",
      title: j.title || "Untitled Role",
      location: locName,
      isRemote,
      department: j.department,
      employmentType: j.employmentType || undefined,
      url: j.jobUrl || `https://jobs.ashbyhq.com/${slug}/${j.id}`,
      publishedAt: j.publishedAt,
      descriptionSnippet: snippet(description),
      description: description || undefined,
      salary: j.compensationTier
        ? {
            currency: j.compensationTier.currencyCode,
            min: j.compensationTier.min,
            max: j.compensationTier.max,
            period: "year",
          }
        : undefined,
    };
  });
}

/** Parse SmartRecruiters JSON response */
export function parseSmartRecruitersFeed(json: any, slug: string, companyName: string): JobPosting[] {
  const content = json?.content;
  if (!Array.isArray(content)) return [];

  return content.map((j: any) => {
    const city = j.location?.city || "";
    const country = j.location?.country || "";
    const locName = city && country ? `${city}, ${country}` : city || country || "";
    const isRemote = j.location?.remote || isRemoteLocation(locName, j.name);
    return {
      id: `sr-${j.id}`,
      companySlug: slug,
      companyName: companyName || (typeof j.company?.name === "string" && j.company.name.trim()) || prettySlug(slug),
      ats: "smartrecruiters",
      title: j.name || "Untitled Role",
      location: locName,
      country: j.location?.country,
      isRemote,
      department: j.department?.label,
      employmentType: j.typeOfEmployment?.label || undefined,
      url: `https://jobs.smartrecruiters.com/${slug}/${j.id}`,
      publishedAt: j.releasedDate,
    };
  });
}

/** Parse Recruitee JSON response */
export function parseRecruiteeFeed(json: any, slug: string, companyName: string): JobPosting[] {
  const offers = json?.offers;
  if (!Array.isArray(offers)) return [];

  return offers.map((j: any) => {
    const locName = j.location || (j.city ? `${j.city}, ${j.country}` : "");
    const isRemote = j.remote || isRemoteLocation(locName, j.title);
    const description = `${htmlToText(j.description)}\n${htmlToText(j.requirements)}`.trim().slice(0, DESCRIPTION_MAX);
    return {
      id: `recruitee-${j.id}`,
      companySlug: slug,
      companyName: companyName || (typeof j.company_name === "string" && j.company_name.trim()) || prettySlug(slug),
      ats: "recruitee",
      title: j.title || "Untitled Role",
      location: locName,
      country: j.country,
      isRemote,
      department: j.department,
      employmentType: j.employment_type_code || undefined,
      url: j.careers_url || `https://${slug}.recruitee.com/o/${j.slug}`,
      publishedAt: j.created_at,
      descriptionSnippet: snippet(description),
      description: description || undefined,
    };
  });
}

/** Parse Workable JSON response */
export function parseWorkableFeed(json: any, slug: string, companyName: string): JobPosting[] {
  const jobs = json?.jobs;
  if (!Array.isArray(jobs)) return [];

  return jobs.map((j: any) => {
    const city = j.city || "";
    const country = j.country || "";
    const locName = city && country ? `${city}, ${country}` : city || country;
    const isRemote = j.telecommuting || isRemoteLocation(locName, j.title);
    return {
      id: `workable-${j.shortcode || j.id}`,
      companySlug: slug,
      companyName: companyName || (typeof json?.name === "string" && json.name.trim()) || prettySlug(slug),
      ats: "workable",
      title: j.title || "Untitled Role",
      location: locName,
      country: j.country,
      isRemote,
      department: j.department,
      url: j.url || `https://apply.workable.com/${slug}/j/${j.shortcode}/`,
      publishedAt: j.published_on,
    };
  });
}

/** Parse Personio XML string */
export function parsePersonioXml(xmlText: string, slug: string, companyName: string): JobPosting[] {
  const postings: JobPosting[] = [];
  const positionMatches = xmlText.matchAll(/<position>([\s\S]*?)<\/position>/gi);

  for (const match of positionMatches) {
    const block = match[1] ?? "";
    const id = block.match(/<id>([\s\S]*?)<\/id>/i)?.[1]?.trim() ?? Math.random().toString(36).slice(2);
    const name = block.match(/<name>([\s\S]*?)<\/name>/i)?.[1]?.trim() ?? "Untitled Role";
    const office = block.match(/<office>([\s\S]*?)<\/office>/i)?.[1]?.trim() ?? "";
    const dept = block.match(/<department>([\s\S]*?)<\/department>/i)?.[1]?.trim();
    const isRemote = isRemoteLocation(office, name);
    const description = htmlToText([...block.matchAll(/<value>([\s\S]*?)<\/value>/gi)].map((m) => (m[1] ?? "").replace(/^\s*<!\[CDATA\[|\]\]>\s*$/g, "")).join("\n"));

    postings.push({
      id: `personio-${id}`,
      companySlug: slug,
      companyName: companyName || prettySlug(slug),
      ats: "personio",
      title: name,
      location: office,
      isRemote,
      department: dept,
      url: `https://${slug}.jobs.personio.de/job/${id}`,
      descriptionSnippet: snippet(description),
      description: description || undefined,
    });
  }

  return postings;
}

/** Fetch and parse an ATS feed with rate-limiting and caching */
export async function fetchATSFeed(
  ats: SupportedATS,
  slug: string,
  companyName: string,
  fetchFn: (url: string) => Promise<{ ok: boolean; status: number; text: () => Promise<string>; json: () => Promise<any> }> = fetch as any,
  limiter: FeedRateLimiter = defaultLimiter
): Promise<JobPosting[]> {
  const feedUrl = getFeedUrl(ats, slug);
  const cached = limiter.getCached<JobPosting[]>(feedUrl);
  if (cached) return cached;
  // Kept on this computer for 6 hours, across panel openings (round 10: every search read every board again).
  const stored = await readStoredFeed(feedUrl);
  if (stored) {
    limiter.setCached(feedUrl, stored);
    return stored;
  }

  await limiter.acquire(feedUrl);
  const res = await fetchFn(feedUrl);
  if (!res.ok) {
    throw new Error(`Feed fetch failed for ${ats}/${slug}: HTTP ${res.status}`);
  }

  let postings: JobPosting[] = [];
  if (ats === "personio") {
    const xml = await res.text();
    postings = parsePersonioXml(xml, slug, companyName);
  } else {
    const json = await res.json();
    switch (ats) {
      case "greenhouse":
        postings = parseGreenhouseFeed(json, slug, companyName);
        break;
      case "lever":
        postings = parseLeverFeed(json, slug, companyName);
        break;
      case "ashby":
        postings = parseAshbyFeed(json, slug, companyName);
        break;
      case "smartrecruiters":
        postings = parseSmartRecruitersFeed(json, slug, companyName);
        break;
      case "recruitee":
        postings = parseRecruiteeFeed(json, slug, companyName);
        break;
      case "workable":
        postings = parseWorkableFeed(json, slug, companyName);
        break;
    }
  }

  limiter.setCached(feedUrl, postings);
  void storeFeed(feedUrl, postings);
  return postings;
}

// ---------------------------------------------------------------------------------------------------------------
// The feed cache on this computer: public job lists only (nothing about the user), 6 hours, pruned as it is written.

const FEED_KEY = (url: string) => `feedCache:${url}`;
const FEED_INDEX = "feedCacheIndex";
const FEED_TTL_MS = 6 * 60 * 60 * 1000;
const local = (): chrome.storage.LocalStorageArea | undefined =>
  typeof chrome !== "undefined" && chrome.storage?.local ? chrome.storage.local : undefined;

async function readStoredFeed(url: string): Promise<JobPosting[] | undefined> {
  const area = local();
  if (!area) return undefined;
  try {
    const entry = (await area.get(FEED_KEY(url)))[FEED_KEY(url)] as { at: number; jobs: JobPosting[] } | undefined;
    if (!entry || !Array.isArray(entry.jobs) || Date.now() - entry.at > FEED_TTL_MS) return undefined;
    return entry.jobs;
  } catch {
    return undefined;
  }
}

async function storeFeed(url: string, jobs: JobPosting[]): Promise<void> {
  const area = local();
  if (!area) return;
  try {
    const now = Date.now();
    const index = ((await area.get(FEED_INDEX))[FEED_INDEX] ?? {}) as Record<string, number>;
    const expired = Object.entries(index).filter(([, at]) => now - at > FEED_TTL_MS).map(([u]) => u);
    for (const u of expired) delete index[u];
    index[url] = now;
    if (expired.length) await area.remove(expired.map(FEED_KEY));
    await area.set({ [FEED_KEY(url)]: { at: now, jobs }, [FEED_INDEX]: index });
  } catch {
    // Storage full or unavailable: the in-memory cache still serves this session.
  }
}

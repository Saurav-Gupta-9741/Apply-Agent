/** Where the job is, read from the page: the JobPosting structured data most career sites publish, or the location
 * line next to the job title. Used to answer "Will you require sponsorship to work at Cloudflare?" from the user's
 * quick answers. Several countries, or none found: the question is left to the user. */

import { countriesInLocation, countryFromCode } from "../shared/countries";
import { deepQueryAll } from "./dom";

type Json = Record<string, unknown>;

function jobPostings(doc: Document): Json[] {
  const out: Json[] = [];
  for (const script of Array.from(doc.querySelectorAll("script[type='application/ld+json']"))) {
    try {
      const data = JSON.parse(script.textContent ?? "") as unknown;
      const nodes = Array.isArray(data) ? data : [data, ...(((data as { "@graph"?: unknown[] })?.["@graph"]) ?? [])];
      for (const n of nodes) {
        const type = (n as Json)?.["@type"];
        if (type === "JobPosting" || (Array.isArray(type) && type.includes("JobPosting"))) out.push(n as Json);
      }
    } catch {
      // malformed structured data
    }
  }
  return out;
}

const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : v ? [v] : []);

function fromStructuredData(doc: Document): string[] {
  const countries: string[] = [];
  for (const posting of jobPostings(doc)) {
    for (const place of [...list(posting.jobLocation), ...list(posting.applicantLocationRequirements)]) {
      const address = ((place as Json)?.address ?? place) as Json;
      const country = address?.addressCountry;
      const name = typeof country === "string" ? country : typeof (country as Json)?.name === "string" ? (country as Json).name as string : "";
      const resolved = name ? countryFromCode(name) : undefined;
      if (resolved) countries.push(resolved);
      else if (typeof address?.addressLocality === "string") countries.push(...countriesInLocation(address.addressLocality));
      else if (typeof (place as Json)?.name === "string") countries.push(...countriesInLocation((place as Json).name as string));
    }
  }
  return countries;
}

// Greenhouse's current job boards name the line with a generated class ("_location_1xewh_43", live run 7: the job's
// country was never read there, so "…in the country where this position is based?" went to the user on 26 US forms).
const LOCATION_LINE = "[class^='_location_'], [class*=' _location_'], .job__location, .location, .posting-categories .location, [class*='job-location' i], [class*='jobLocation'], [data-testid*='location' i], [data-automation-id='locations']";

/** Breezy's apply page shows the location only from the position's data in an inline script
 * ("location":{"country":{"name":"United States","id":"US"},…}): live run 7, Breezy's standard "Desired Salary" box
 * was left for the user on every form because the job's country was unknown. */
function fromBreezyData(doc: Document): string[] {
  let host = "";
  try { host = new URL(doc.location?.href ?? "").hostname; } catch { return []; }
  if (!/(^|\.)breezy\.hr$/.test(host)) return [];
  const out: string[] = [];
  for (const script of Array.from(doc.querySelectorAll("script:not([src])"))) {
    const text = script.textContent ?? "";
    if (!text.includes("\"friendly_id\"")) continue;
    for (const m of text.matchAll(/"location":\{"country":\{"name":"([^"]{2,60})"/g)) out.push(...countriesInLocation(m[1]!));
  }
  return out;
}

/** The countries the job is in (usually one). */
export function jobCountries(doc: Document): string[] {
  const found = fromStructuredData(doc);
  if (!found.length) found.push(...fromBreezyData(doc));
  if (!found.length) {
    // The first line that names a place: a bare "Locations" heading (CircleCI) is passed over.
    for (const el of deepQueryAll<HTMLElement>(doc, LOCATION_LINE)) {
      const line = (el.textContent ?? "").replace(/\s+/g, " ").trim();
      if (!line || line.length >= 200) continue;
      const here = countriesInLocation(line);
      if (here.length) { found.push(...here); break; }
    }
  }
  if (!found.length) {
    // Last: a "Locations: Austin, US" line in the description (seen on Cloudflare, whose location line says "Hybrid").
    const text = (doc.body as HTMLElement | null)?.innerText ?? doc.body?.textContent ?? "";
    // A word start, or a capital right after a lowercase letter ("HybridLocations" when blocks are joined without a break).
    for (const m of text.matchAll(/(?:\b|(?<=[a-z]))(?:[Aa]vailable |[Oo]ffice |[Jj]ob |[Ww]ork )?(?:[Ll]ocations?|LOCATIONS?)\s*[:\n]\s*([^\n]{2,120})/g)) {
      found.push(...countriesInLocation(m[1]!));
    }
  }
  return [...new Set(found)];
}

/** The job's countries, also for a Greenhouse form embedded on the company's own careers page
 * (job-boards.greenhouse.io/embed/job_app?for=datadog&token=8257324): that frame shows no location, and most Greenhouse
 * job links now lead there (live run 7: block.xyz, careers.datadoghq.com, circleci.com…, so "…in the country where
 * this job is based?" went to the user on 19 US forms). Greenhouse's public job API names it: one read-only GET about
 * the job, open to every site, sending nothing about the user. */
export async function jobCountriesWithApi(doc: Document, fetcher: typeof fetch = fetch): Promise<string[]> {
  const found = jobCountries(doc);
  // BambooHR writes "Milano, MI": the province of Milan, read as Michigan (live round 8: a dollar salary went into an
  // Italian job). Its own public job data names the country; it wins over the page's location line.
  const bamboo = await bambooCountries(doc, fetcher);
  if (bamboo) return bamboo;
  if (found.length) return found;
  try {
    const url = new URL(doc.location?.href ?? "");
    if (url.hostname !== "job-boards.greenhouse.io" && url.hostname !== "boards.greenhouse.io") return found;
    if (!/^\/embed\/job_app\b/.test(url.pathname)) return found;
    const board = url.searchParams.get("for") ?? "";
    const id = url.searchParams.get("token") ?? url.searchParams.get("gh_jid") ?? "";
    if (!/^[\w-]{1,80}$/.test(board) || !/^\d{1,20}$/.test(id)) return found;
    const stop = new AbortController();
    const timer = setTimeout(() => stop.abort(), 4000);
    try {
      const res = await fetcher(`https://boards-api.greenhouse.io/v1/boards/${board}/jobs/${id}`, { signal: stop.signal, credentials: "omit" });
      if (!res.ok) return found;
      const job = (await res.json()) as { location?: { name?: string } };
      return [...new Set(countriesInLocation(job.location?.name ?? ""))];
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return found; // offline, blocked or slow: the user answers
  }
}

/** A BambooHR job's country from the site's own public job data (/careers/<id>/detail, the same site, no cookies, no
 * user data). Undefined when the page is not a BambooHR job or the data does not answer; [] when it names a country
 * ApplyAgent does not know (the user answers then, never a guess from "Milano, MI"). */
async function bambooCountries(doc: Document, fetcher: typeof fetch): Promise<string[] | undefined> {
  try {
    const url = new URL(doc.location?.href ?? "");
    if (!/^[\w-]{1,80}\.bamboohr\.com$/.test(url.hostname)) return undefined;
    const id = /^\/careers\/(\d{1,12})\b/.exec(url.pathname)?.[1];
    if (!id) return undefined;
    const stop = new AbortController();
    const timer = setTimeout(() => stop.abort(), 4000);
    try {
      const res = await fetcher(`https://${url.hostname}/careers/${id}/detail`, { signal: stop.signal, credentials: "omit", headers: { accept: "application/json" } });
      if (!res.ok) return undefined;
      const data = (await res.json()) as { result?: { jobOpening?: { atsLocation?: { country?: string | null }; location?: { addressCountry?: string | null } } } };
      const job = data.result?.jobOpening;
      const country = job?.atsLocation?.country ?? job?.location?.addressCountry ?? "";
      if (!country) return undefined;
      return countriesInLocation(country).slice(0, 1);
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return undefined;
  }
}

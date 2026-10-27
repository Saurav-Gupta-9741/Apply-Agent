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

const LOCATION_LINE = ".job__location, .location, .posting-categories .location, [class*='job-location' i], [class*='jobLocation'], [data-testid*='location' i], [data-automation-id='locations']";

/** The countries the job is in (usually one). */
export function jobCountries(doc: Document): string[] {
  const found = fromStructuredData(doc);
  if (!found.length) {
    const line = deepQueryAll<HTMLElement>(doc, LOCATION_LINE).map((el) => (el.textContent ?? "").replace(/\s+/g, " ").trim()).find((t) => t && t.length < 200);
    if (line) found.push(...countriesInLocation(line));
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

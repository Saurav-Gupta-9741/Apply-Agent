/** Live run 7 (a US-based candidate on 225 real forms): "Are you authorized to work in the country where this job is
 * based?" and "Will you require sponsorship?" went to the user on 26 US Greenhouse forms because the job's country was
 * never read: (1) Greenhouse's job boards now name the location line with a generated class ("_location_1xewh_43");
 * (2) a bare "Locations" heading came first and ended the search; (3) most Greenhouse job links lead to the company's
 * own careers page, whose embedded form (embed/job_app?for=datadog&token=8257324) shows no location at all. */

import { describe, expect, it, vi } from "vitest";
import { jobCountries, jobCountriesWithApi } from "../src/content/joblocation";
import { decide } from "../src/content/classify";
import type { PageFacts } from "../src/content/facts";
import type { FieldDescriptor } from "../src/shared/types";
import { PROFILE } from "./fixtures";

const facts = { workCountries: "United States", needsFutureSponsorship: "No" as const, noticePeriod: "", currentCtc: "", expectedCtc: "", relocate: "" as const, heardFrom: "", gender: "" as const, hispanic: "" as const, race: "", veteran: "" as const, disability: "" as const, otherCountries: "sponsorship" as const };
const US_USER = { ...PROFILE, country: "United States", location: "Austin, TX", facts };
const INDIA_USER = { ...PROFILE, country: "India", location: "Pune", facts: { ...facts, workCountries: "India" } };
const list = (label: string) => ({ id: "q", name: "q", label, control: "combobox", required: true, options: [], placeholder: "", hint: "" }) as unknown as FieldDescriptor;
const inUS = { jobCountries: ["United States"], url: "https://job-boards.greenhouse.io/x/jobs/1" } as PageFacts;

describe("live run 7: work questions the rules misread", () => {
  it("'…for any U.S. employer?' is one question (the 'U.S.' does not end a sentence)", () => {
    const q = list("Are you legally authorized to work for any U.S. employer?");
    expect(decide(q, US_USER, [], inUS)).toMatchObject({ kind: "answer", value: "Yes" });
    expect(decide(q, INDIA_USER, [], inUS)).toMatchObject({ kind: "answer", value: "No" });
  });
  it("a one-line preface before the sponsorship question (Twitch) is read past", () => {
    const q = list("Your response is mandatory when applying for a U.S.-based position. Do you need, or will you need in the future, any immigration related support or sponsorship from Twitch in order to begin or continue employment?");
    expect(decide(q, US_USER, [], inUS)).toMatchObject({ kind: "answer", value: "No" });
    expect(decide(q, INDIA_USER, [], inUS)).toMatchObject({ kind: "answer", value: "Yes" });
  });
  it("a preface that agrees to something, or a long declaration, still goes to the user", () => {
    const agree = list("I certify that the information I provide is true and complete and I understand that false statements may lead to my application being rejected. Will you require sponsorship?");
    expect(decide(agree, US_USER, [], inUS)).not.toMatchObject({ kind: "answer" });
    const two = list("Are you authorized to work in the US? Will you require sponsorship now or in the future in order to work for the company in the United States of America?");
    expect(decide(two, US_USER, [], inUS)).not.toMatchObject({ kind: "answer" });
  });
});

const doc = (html: string, href = "https://example.com/"): Document => {
  const d = new DOMParser().parseFromString(`<!doctype html><html><body>${html}</body></html>`, "text/html");
  // A parsed document's location cannot be set: answer it through a proxy (methods bound to the real document).
  return new Proxy(d, {
    get: (target, key) => {
      if (key === "location") return { href };
      const value = Reflect.get(target, key, target) as unknown;
      return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(target) : value;
    },
  });
};

describe("live run 7: the job's country on Greenhouse pages", () => {
  it("reads Greenhouse's generated location class (Klaviyo: Miami, FL)", () => {
    const d = doc(`<div class="_departmentAndLocation_1xewh_28"><p>Sales</p><div class="p2 semibold _location_1xewh_43"><svg></svg><span>Miami, FL</span></div></div>`);
    expect(jobCountries(d)).toEqual(["United States"]);
  });

  it("Breezy: the position's data script names the country (and only on breezy.hr)", () => {
    const html = `<script>var position = {"department":"Engineering","friendly_id":"cd390cdcd5ca-core-architect","location":{"country":{"name":"United States","id":"US"},"state":{"id":"NY","name":"New York"},"city":"New York"}};</script><form><input name="cName"></form>`;
    expect(jobCountries(doc(html, "https://zero-hash.breezy.hr/p/cd390cdcd5ca-core-architect/apply"))).toEqual(["United States"]);
    expect(jobCountries(doc(html, "https://example.com/p/x"))).toEqual([]);
  });

  it("passes over a bare 'Locations' heading to the line that names a place", () => {
    const d = doc(`<h3 class="locations-title location">Locations</h3><div class="job__location">Remote - US</div>`);
    expect(jobCountries(d)).toEqual(["United States"]);
  });

  it("an embedded Greenhouse form asks Greenhouse's public job API (no user data, no cookies)", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ location: { name: "New York, New York, USA" } }), { status: 200 }));
    const d = doc(`<form id="application-form"><input name="first_name"></form>`, "https://job-boards.greenhouse.io/embed/job_app?for=datadog&validityToken=abc&token=8257324");
    expect(await jobCountriesWithApi(d, fetcher as unknown as typeof fetch)).toEqual(["United States"]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://boards-api.greenhouse.io/v1/boards/datadog/jobs/8257324");
    expect(init.credentials).toBe("omit");
  });

  it("asks nothing when the page already shows the location, or is not a Greenhouse embed", async () => {
    const fetcher = vi.fn();
    expect(await jobCountriesWithApi(doc(`<div class="job__location">Austin, TX</div>`, "https://job-boards.greenhouse.io/embed/job_app?for=x&token=1"), fetcher as unknown as typeof fetch)).toEqual(["United States"]);
    expect(await jobCountriesWithApi(doc(`<form></form>`, "https://evil.example/embed/job_app?for=x&token=1"), fetcher as unknown as typeof fetch)).toEqual([]);
    expect(await jobCountriesWithApi(doc(`<form></form>`, "https://job-boards.greenhouse.io/embed/job_app?for=x&token=../../etc"), fetcher as unknown as typeof fetch)).toEqual([]);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("an API failure or a location naming no country leaves the question to the user", async () => {
    const href = "https://job-boards.greenhouse.io/embed/job_app?for=x&token=12";
    expect(await jobCountriesWithApi(doc(`<form></form>`, href), (async () => { throw new Error("offline"); }) as unknown as typeof fetch)).toEqual([]);
    expect(await jobCountriesWithApi(doc(`<form></form>`, href), (async () => new Response("{}", { status: 404 })) as unknown as typeof fetch)).toEqual([]);
    expect(await jobCountriesWithApi(doc(`<form></form>`, href), (async () => new Response(JSON.stringify({ location: { name: "Remote" } }))) as unknown as typeof fetch)).toEqual([]);
  });
});

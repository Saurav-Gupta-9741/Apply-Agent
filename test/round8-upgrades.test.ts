/** Round 8 upgrades, on the real wordings of live run 7 (225 forms, a US-based candidate). */

import { describe, expect, it, vi } from "vitest";
import { decide } from "../src/content/classify";
import { leadingStateQuestion } from "../src/content/classify";
import { fillText } from "../src/content/fill";
import { cityOf, pickPlace, placeOption, placeQueries } from "../src/shared/place-pick";
import type { FieldDescriptor, Profile } from "../src/shared/types";
import type { PageFacts } from "../src/content/facts";
import { PROFILE } from "./fixtures";

const facts = { workCountries: "United States", needsFutureSponsorship: "No" as const, noticePeriod: "", currentCtc: "", expectedCtc: "", relocate: "" as const, heardFrom: "", gender: "" as const, hispanic: "" as const, race: "", veteran: "" as const, disability: "" as const, otherCountries: "sponsorship" as const };
const US: Profile = { ...PROFILE, country: "United States", location: "Austin, TX", state: "Texas", facts: { ...facts, citizenship: "United States" } };
const IN: Profile = { ...PROFILE, country: "India", location: "Pune, Maharashtra", state: "Maharashtra", facts: { ...facts, workCountries: "India", citizenship: "India" } };
const GC: Profile = { ...US, facts: { ...facts, citizenship: "India", permanentResidence: "United States" } };
const field = (label: string, control = "select", options: string[] = [], extra: Partial<FieldDescriptor> = {}) =>
  ({ id: "q", key: "q", name: "", label, control, required: true, options, placeholder: "", hint: "", autocomplete: "", ...extra }) as unknown as FieldDescriptor;
const usJob = { jobCountries: ["United States"], url: "https://job-boards.greenhouse.io/x/jobs/1" } as PageFacts;

describe("location type-ahead: the user's own city only", () => {
  const home = { location: "Austin, TX", state: "Texas", country: "United States" };
  it("takes the same city in the list's own wording", () => {
    expect(pickPlace(["Austin, Minnesota, United States", "Austin, Texas, United States"], home)).toBe("Austin, Texas, United States");
    expect(pickPlace(["Austin, TX, USA", "Austin, MN, USA"], home)).toBe("Austin, TX, USA");
    expect(pickPlace(["Austin (TX)"], home)).toBe("Austin (TX)");
  });
  it("never takes another Austin, or a state-less one when the user has a state", () => {
    expect(pickPlace(["Austin, Minnesota, United States", "Austin, Manitoba, Canada"], home)).toBeUndefined();
    expect(pickPlace(["Austin, United States"], home)).toBeUndefined();
    expect(placeOption(["Austin, Minnesota, United States"], home, () => "Austin, Minnesota, United States")).toBeUndefined();
  });
  it("other countries: city with region or country", () => {
    const pune = { location: "Pune, Maharashtra", state: "Maharashtra", country: "India" };
    expect(pickPlace(["Pune, Maharashtra, India", "Pune, Bihar, India"], pune)).toBe("Pune, Maharashtra, India");
    const london = { location: "London", country: "United Kingdom" };
    expect(pickPlace(["London, Ontario, Canada", "London, UK"], london)).toBe("London, UK");
    expect(pickPlace(["London, Ontario, Canada"], london)).toBeUndefined();
  });
  it("office lists without the city still get the ordinary match", () => {
    expect(placeOption(["Remote - US", "New York"], home, () => "Remote - US")).toBe("Remote - US");
  });
  it("searches the city with its state's name, then the city", () => {
    expect(cityOf("Austin, TX")).toBe("Austin");
    expect(placeQueries(home)).toEqual(["Austin, Texas", "Austin", "United States"]);
  });
  it("a list of countries only gets the user's country (Ashby 'Location' on Paddle, live round 8)", () => {
    expect(placeOption(["Czech Republic", "Chad", "United States", "United Kingdom"], home, () => undefined)).toBe("United States");
    expect(placeOption(["Czech Republic", "Chad"], home, () => undefined)).toBeUndefined();
    expect(placeOption(["United States", "US Virgin Islands", "United States Minor Outlying Islands", "Palestine"], home, () => undefined)).toBe("United States");
    expect(placeOption(["US Virgin Islands", "United States Minor Outlying Islands"], home, () => undefined)).toBeUndefined();
  });
});

describe("long state questions with a note", () => {
  const sprout = "In which state do you currently reside? Note: We're able to accommodate employment in most U.S. States but not all. If your state is not included in the dropdown, please select 'Other'.";
  const notInUs = "Please select your current state of residence. Select “Not in the US” if you reside outside the United States. This information helps us understand where our applicants are located.";
  it("reads the first sentence as the state question", () => {
    expect(leadingStateQuestion(sprout)).toBe(true);
    expect(leadingStateQuestion(notInUs)).toBe(true);
    expect(decide(field(notInUs, "select", ["Alabama", "Texas", "Not in the US"]), US, [], usJob)).toMatchObject({ value: "Texas" });
    expect(decide(field(notInUs, "select", ["Alabama", "Texas", "Not in the US"]), IN, [], usJob)).toMatchObject({ kind: "answer", value: "Not in the US" });
  });
  it("a second question or a declaration stays with the user", () => {
    expect(leadingStateQuestion("In which state do you currently reside? Are you willing to relocate?")).toBe(false);
    expect(leadingStateQuestion("Which state do you live in? I certify that this is true.")).toBe(false);
    expect(leadingStateQuestion("Do you reside in the state of Maine?")).toBe(false);
  });
});

describe("Breezy boxes", () => {
  it("'Address' named cAddress is the address", () => {
    const me = { ...US, address: "100 Congress Ave, Austin, TX 78701" };
    expect(decide(field("Address", "text", [], { name: "cAddress" }), me, [], usJob)).toMatchObject({ kind: "profile", key: "address" });
  });
  it("a number-only salary box keeping '140000' of 'CAD 140,000' is filled, not failed", () => {
    const box = document.createElement("input");
    box.addEventListener("input", () => { box.value = box.value.replace(/\D/g, ""); });
    // The page's own script strips letters as they are typed (Breezy's cSalary).
    expect(fillText(box, "CAD 140,000")).toMatchObject({ ok: true });
    expect(fillText(box, "Senior engineer")).toMatchObject({ ok: false });
  });
  it("'Experience Summary' (cSummary) takes the saved summary; a job's own Summary does not", () => {
    const me = { ...US, summary: "Data engineer with 4 years of batch and streaming pipelines." };
    expect(decide(field("cSummary", "textarea", [], { name: "cSummary", section: "Experience Summary" }), me, [], usJob)).toMatchObject({ kind: "profile", key: "summary", value: me.summary });
    expect(decide(field("Professional Summary", "textarea"), me, [], usJob)).toMatchObject({ kind: "profile", key: "summary" });
    expect(decide(field("Summary", "textarea", [], { section: "Education" }), me, [], usJob)).not.toMatchObject({ key: "summary" });
    expect(decide(field("Summary of your experience with Kafka", "textarea"), me, [], usJob)).not.toMatchObject({ key: "summary" });
  });
});

describe("citizenship from the saved citizenship only", () => {
  const yn = ["Yes", "No"];
  it("US citizen / green card / neither", () => {
    const q = field("Are you a US citizen or lawful permanent resident?", "select", yn);
    expect(decide(q, US, [], usJob)).toMatchObject({ kind: "answer", value: "Yes" });
    expect(decide(q, GC, [], usJob)).toMatchObject({ kind: "answer", value: "Yes" });
    expect(decide(q, IN, [], usJob)).toMatchObject({ kind: "answer", value: "No" });
    expect(decide(field("Are you a U.S. citizen?", "select", yn), GC, [], usJob)).toMatchObject({ kind: "answer", value: "No" });
  });
  it("country of citizenship and nationality lists", () => {
    expect(decide(field("In which country/region do you have citizenship?", "select", ["Canada", "India", "United States"]), IN, [], usJob)).toMatchObject({ value: "India" });
    expect(decide(field("Nationality", "select", ["American", "British", "Indian"]), IN, [], usJob)).toMatchObject({ value: "Indian" });
  });
  it("status lists", () => {
    const opts = ["U.S. Citizen", "U.S. Permanent Resident", "Visa holder", "Other"];
    expect(decide(field("Citizenship Status", "select", opts), US, [], usJob)).toMatchObject({ value: "U.S. Citizen" });
    expect(decide(field("Citizenship Status", "select", opts), GC, [], usJob)).toMatchObject({ value: "U.S. Permanent Resident" });
    expect(decide(field("Citizenship Status", "select", opts), IN, [], usJob)).not.toMatchObject({ kind: "answer" });
  });
  it("named countries the parser does not know: No only when the user's own country is not named", () => {
    const q = field("Are you a current citizen of Russia, Syria, Iran, or North Korea?", "select", yn);
    expect(decide(q, US, [], usJob)).toMatchObject({ kind: "answer", value: "No" });
    expect(decide(q, { ...US, facts: { ...facts, citizenship: "Russia" } }, [], usJob)).toMatchObject({ kind: "answer", value: "Yes" });
  });
  it("U.S. person: Yes for citizens and green-card holders; No only without US work rights", () => {
    const q = field("Please indicate whether you are a “U.S. person”. U.S. person is defined as a (i) U.S. citizen or national; (ii) U.S. lawful permanent resident; (iii) refugee or asylee.", "select", ["I am a U.S. person", "I am not a U.S. person"]);
    expect(decide(q, US, [], usJob)).toMatchObject({ value: "I am a U.S. person" });
    expect(decide(q, IN, [], usJob)).toMatchObject({ value: "I am not a U.S. person" });
    const monzo = { ...field("🇺🇸 Are you a US Person?", "select", ["Yes", "No"]), hint: "A US Person is defined as someone who: was born in the United States (US), has at least 1 parent who was born in the US, is a naturalised citizen of the US…" } as FieldDescriptor;
    expect(decide(monzo, US, [], usJob)).toMatchObject({ kind: "answer", value: "Yes" });
    expect(decide(monzo, IN, [], usJob)).not.toMatchObject({ kind: "answer" });
    const opt = { ...IN, facts: { ...IN.facts!, workCountries: "India, United States" } };
    expect(decide(q, opt, [], usJob)).not.toMatchObject({ kind: "answer" });
  });
  it("follow-ups, histories and unsaved citizenship stay with the user", () => {
    expect(decide(field("If Citizenship Status Other, please explain:", "text"), US, [], usJob)).not.toMatchObject({ kind: "answer" });
    expect(decide(field("Since obtaining your most recent citizenship, did you afterwards become a permanent resident in any other country/region?", "select", yn), US, [], usJob)).not.toMatchObject({ kind: "answer" });
    const none = { ...US, facts: { ...facts } };
    expect(decide(field("Are you a U.S. citizen?", "select", yn), none, [], usJob)).not.toMatchObject({ kind: "answer", question: "Quick answers › citizenship" });
  });
});

describe("live round 8: salary on non-US jobs", () => {
  const docAt = (href: string, html = "<div class='location'>Milano, MI</div>"): Document => {
    const d = new DOMParser().parseFromString(`<!doctype html><html><body>${html}</body></html>`, "text/html");
    return new Proxy(d, { get: (t, k) => (k === "location" ? { href } : (typeof Reflect.get(t, k, t) === "function" ? (Reflect.get(t, k, t) as (...a: unknown[]) => unknown).bind(t) : Reflect.get(t, k, t))) });
  };
  it("BambooHR 'Milano, MI' is Italy by the site's own job data, not Michigan", async () => {
    const { jobCountriesWithApi } = await import("../src/content/joblocation");
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ result: { jobOpening: { atsLocation: { country: "Italy", state: "MI", city: "Milano" } } } })));
    expect(await jobCountriesWithApi(docAt("https://corcym.bamboohr.com/careers/136"), fetcher as unknown as typeof fetch)).toEqual(["Italy"]);
    expect((fetcher.mock.calls[0] as unknown as [string, RequestInit])[0]).toBe("https://corcym.bamboohr.com/careers/136/detail");
    expect((fetcher.mock.calls[0] as unknown as [string, RequestInit])[1].credentials).toBe("omit");
    // Other sites are not asked.
    const none = vi.fn();
    await jobCountriesWithApi(docAt("https://example.com/careers/136"), none as unknown as typeof fetch);
    expect(none).not.toHaveBeenCalled();
  });
});

describe("live round 8: Breezy's currency list starts on 'US Dollar'", () => {
  it("the currency of the typed salary replaces the page's default; a user's own choice is never replaced", async () => {
    const { fillForm } = await import("../src/content/agent");
    const form = (chosen = "") => {
      document.body.innerHTML = `<form><h3>Desired Salary</h3><input name="cSalary" aria-label="Desired Salary">
        <select name="salaryCurrency" aria-label="salaryCurrency"><option value="USD">US Dollar ($)</option><option value="EUR"${chosen === "EUR" ? "" : ""}>Euro (€)</option><option value="GBP">British Pound Sterling (£)</option></select>
        <button type="submit">Submit</button></form>`;
      if (chosen) (document.querySelector("select") as HTMLSelectElement).value = chosen;
    };
    const me = { ...US, facts: { ...US.facts!, expectedCtc: "120000", expectedSalaryAbroad: "EUR 95,000; GBP 85,000" } };
    const page = { jobCountries: ["Ireland"], url: "https://bear-robotics.breezy.hr/p/1/apply" } as PageFacts;
    form();
    await fillForm(document, { profile: me, answers: [], mode: "review", page });
    expect((document.querySelector("select") as HTMLSelectElement).value).toBe("EUR");
    // The user already picked pounds: kept.
    form("GBP");
    await fillForm(document, { profile: me, answers: [], mode: "review", page });
    expect((document.querySelector("select") as HTMLSelectElement).value).toBe("GBP");
  });
});

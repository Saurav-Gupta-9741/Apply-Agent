/** The job's country, read from the page, answers sponsorship questions that name no country ("…to work at
 * Cloudflare?"). Unknown, or several countries with different answers: still asked. */

import { describe, expect, it } from "vitest";
import { decide } from "../src/content/classify";
import { jobCountries } from "../src/content/joblocation";
import { countriesInLocation } from "../src/shared/countries";
import type { Decision, FieldDescriptor, Profile } from "../src/shared/types";
import { mount, PROFILE } from "./fixtures";

const ME: Profile = {
  ...PROFILE, country: "India",
  facts: { workCountries: "India", noticePeriod: "", currentCtc: "", expectedCtc: "", relocate: "", heardFrom: "", gender: "", hispanic: "", race: "", veteran: "", disability: "" },
};
const yesNo = (label: string, control: FieldDescriptor["control"] = "select"): FieldDescriptor => ({
  key: "k", label, control, required: true, options: control === "select" ? ["Yes", "No"] : [], name: "", autocomplete: "", placeholder: "",
});
const value = (d: Decision) => (d.kind === "answer" ? d.value : d.kind);
const SPONSOR = "Do you now or will you in the future require immigration sponsorship to work at Cloudflare?";

describe("reading where the job is", () => {
  it("from JobPosting structured data (country code, country object, or city)", () => {
    mount(`<script type="application/ld+json">{"@type":"JobPosting","jobLocation":{"@type":"Place","address":{"addressCountry":"IN"}}}</script>`);
    expect(jobCountries(document)).toEqual(["India"]);
    mount(`<script type="application/ld+json">{"@graph":[{"@type":"JobPosting","jobLocation":[{"address":{"addressCountry":{"name":"United States"}}}]}]}</script>`);
    expect(jobCountries(document)).toEqual(["United States"]);
    mount(`<script type="application/ld+json">{"@type":"JobPosting","jobLocation":{"address":{"addressLocality":"London"}}}</script>`);
    expect(jobCountries(document)).toEqual(["United Kingdom"]);
  });
  it("from the location line next to the title", () => {
    mount(`<h1>Engineer</h1><div class="job__location">Bengaluru, Karnataka</div>`);
    expect(jobCountries(document)).toEqual(["India"]);
    expect(countriesInLocation("Austin, TX")).toEqual(["United States"]);
    expect(countriesInLocation("Remote - US or Canada").sort()).toEqual(["Canada", "United States"]);
  });
});

describe("sponsorship and work authorization for this job", () => {
  it("an India job → no sponsorship needed; a US job → sponsorship needed", () => {
    expect(value(decide(yesNo(SPONSOR), ME, [], { jobCountries: ["India"] }))).toBe("No");
    expect(value(decide(yesNo(SPONSOR), ME, [], { jobCountries: ["United States"] }))).toBe("Yes");
    expect(value(decide(yesNo("Are you legally authorized to work in the country where this job is located?"), ME, [], { jobCountries: ["India"] }))).toBe("Yes");
  });
  it("still asks when the job's country is unknown, or the countries need different answers, or it depends on an earlier choice", () => {
    expect(decide(yesNo(SPONSOR), ME, [], { jobCountries: [] }).kind).toBe("ask");
    expect(decide(yesNo(SPONSOR), ME, [], { jobCountries: ["India", "United States"] }).kind).toBe("ask");
    expect(decide(yesNo("Are you authorized to work in the location(s) you selected in your previous response?"), ME, [], { jobCountries: ["India"] }).kind).toBe("ask");
  });
  it("a country named in the question wins over the job's country", () => {
    expect(value(decide(yesNo("Are you legally permitted to work in the UK?"), ME, [], { jobCountries: ["India"] }))).toBe("No");
  });
});

describe("link invitations", () => {
  it("'Would you like to include your LinkedIn profile, personal website or blog?' gets the LinkedIn link", () => {
    expect(decide(yesNo("Would you like to include your LinkedIn profile, personal website or blog?", "text"), PROFILE, []))
      .toMatchObject({ kind: "profile", key: "linkedin" });
  });
  it("but a yes/no choice with that wording is not given a link", () => {
    expect(decide(yesNo("Would you like to include your LinkedIn profile?", "select"), PROFILE, []).kind).not.toBe("profile");
  });
});

describe("location in the description", () => {
  it("'Locations: Austin, US' in the text, when the location line only says 'Hybrid'", () => {
    mount(`<h1>Manager</h1><div class="job__location">Hybrid</div><p>Locations
Austin, US</p>
<form><label>Location (City)*<input></label></form>`);
    expect(jobCountries(document)).toEqual(["United States"]);
  });
});

describe("seen on Nscale's real form", () => {
  it("'If you have a visa, please share all relevant details…' is not answered with a bare yes or no", () => {
    expect(decide(yesNo("If you have a visa, please share all relevant details (visa type, expirations, deadlines, etc)", "text"), ME, [], { jobCountries: ["United States"] }).kind)
      .not.toBe("answer");
  });
  it("the yes/no questions on the same form are still answered", () => {
    expect(value(decide(yesNo("Are you currently legally authorized to work in the country where this role is based?"), ME, [], { jobCountries: ["United States"] }))).toBe("No");
    expect(value(decide(yesNo("Will you now or in the future require Nscale to sponsor or support an immigration application for you to be authorized to work in the role's country?"), ME, [], { jobCountries: ["United States"] }))).toBe("Yes");
  });
  it("'What is your preferred name?' gets the first name", () => {
    expect(decide(yesNo("What is your preferred name?", "text"), PROFILE, [])).toMatchObject({ kind: "profile", key: "firstName" });
  });
});

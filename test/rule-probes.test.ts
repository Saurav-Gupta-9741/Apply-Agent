/** Regression probes based on audit edge cases: ensures salary never gets city,
 * country vs location disambiguates cleanly, and open link lists are not guessed. */

import { describe, expect, it } from "vitest";
import { decide } from "../src/content/classify";
import { PROFILE } from "./fixtures";
import type { FieldDescriptor, Profile } from "../src/shared/types";

const FULL: Profile = {
  ...PROFILE,
  location: "Pune",
  country: "India",
  github: "https://github.com/asha",
  portfolio: "https://asha.dev",
  facts: {
    workCountries: "India",
    noticePeriod: "30 days",
    currentCtc: "6 LPA",
    expectedCtc: "20 LPA",
    relocate: "Yes",
    heardFrom: "LinkedIn",
    gender: "Female",
    hispanic: "No",
    race: "Asian",
    veteran: "No",
    disability: "No",
  },
};

describe("rule probes from audit", () => {
  function testField(label: string, control: FieldDescriptor["control"] = "text") {
    return decide(
      { key: "k", label, control, required: true, options: [], name: "", autocomplete: "", placeholder: "" },
      FULL,
      [],
      { jobCountries: ["United States"] }
    );
  }

  it("never fills city into salary questions", () => {
    const s1 = testField("What is your expected salary in your city of residence?");
    expect(s1).toEqual({ kind: "answer", question: "Quick answers › expected CTC", value: "20 LPA" });

    const s2 = testField("Expected compensation (city and state cost-of-living adjusted)");
    expect(s2).toEqual({ kind: "answer", question: "Quick answers › expected CTC", value: "20 LPA" });

    const s3 = testField("Current salary in your city of residence");
    expect(s3).toEqual({ kind: "answer", question: "Quick answers › current CTC", value: "6 LPA" });

    const s4 = testField("Desired annual salary for the city and state you will work in");
    expect(s4).toEqual({ kind: "answer", question: "Quick answers › expected CTC", value: "20 LPA" });
  });

  it("handles country vs location cleanly", () => {
    const c1 = testField("Country");
    expect(c1).toEqual({ kind: "profile", key: "country", value: "India" });

    const c2 = testField("Which country is the city you live in located in?");
    expect(c2).toEqual({ kind: "profile", key: "country", value: "India" });

    const l1 = testField("City");
    expect(l1).toEqual({ kind: "profile", key: "location", value: "Pune" });

    const l2 = testField("Where are you currently based (City, Country)?");
    expect(l2).toEqual({ kind: "profile", key: "location", value: "Pune" });

    const l3 = testField("In which country and city are you currently located?");
    expect(l3).toEqual({ kind: "profile", key: "location", value: "Pune" });

    const l4 = testField(
      "Please provide the city and state of your current permanent residence. This information is used solely for compensation and employment compliance purposes."
    );
    expect(l4).toEqual({ kind: "profile", key: "location", value: "Pune" });
  });

  it("handles link options and does not guess on open link lists", () => {
    const g1 = testField("Link to your GitHub projects (portfolio optional)", "url");
    expect(g1).toEqual({ kind: "profile", key: "github", value: "https://github.com/asha" });

    const g2 = testField("Share a link to your GitHub with your best projects; a portfolio is optional", "url");
    expect(g2).toEqual({ kind: "profile", key: "github", value: "https://github.com/asha" });

    const open1 = testField("Share links that showcase your craft (GitHub, portfolio, writing samples, projects, etc.)", "url");
    expect(open1.kind).toBe("ask");

    const open2 = testField("Where are you most active online? Share a link to your X, LinkedIn, Reddit, YouTube, etc.", "url");
    expect(open2.kind).toBe("ask");

    const open3 = testField("Website Link (github, portfolio, other..)", "url");
    expect(open3.kind).toBe("ask");
  });

  it("handles name rules correctly", () => {
    const ref = testField("First Last Name of your referrer");
    expect(ref.kind).toBe("ask");

    const first = testField("Preferred first name");
    expect(first).toEqual({ kind: "profile", key: "firstName", value: "Asha" });

    const full1 = testField("Legal First / Last Name");
    expect(full1).toEqual({ kind: "profile", key: "fullName", value: "Asha Verma" });

    const full2 = testField("Please share your first and last name as on passport");
    expect(full2).toEqual({ kind: "profile", key: "fullName", value: "Asha Verma" });

    const prefFull = testField("Preferred First & Last Name");
    expect(prefFull).toEqual({ kind: "profile", key: "fullName", value: "Asha Verma" });
  });
});

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

  it("passes all deep audit probes for safe fact automation", () => {
    const real: any = {
      ...PROFILE,
      location: "Pune",
      country: "India",
      currentCompany: "Ola",
      skills: "Java, SQL, Go, R",
      experienceYears: "",
      facts: { workCountries: "India", workMode: "hybrid", travel: "Yes", travelPercent: "25%", maxOfficeDays: 3 },
    };
    const full: any = {
      ...real,
      skillsInventory: [{ name: "Python", years: 3 }],
      address: "12 MG Road, Pune 411038",
      addressLine1: "12 MG Road",
      addressLine2: "",
      postalCode: "411038",
      state: "Maharashtra",
      educationLevel: "Master's Degree",
    };
    const YN = ["Yes", "No"];
    const page = (u = "https://boards.greenhouse.io/acme/jobs/1") => ({ jobCountries: ["United States"], url: u } as any);

    // 1. skills (+inventory): years unknown -> ASK
    const p1 = decide({ key: "k", label: "How many years of experience do you have with Java?", control: "text", required: true, options: [], name: "", autocomplete: "", placeholder: "" }, full, [], page());
    expect(p1.kind).toBe("ask");

    // 2. skills: Java != JavaScript -> ASK
    const p2 = decide({ key: "k", label: "Do you have experience with JavaScript?", control: "radio", required: true, options: YN, name: "", autocomplete: "", placeholder: "" }, full, [], page());
    expect(p2.kind).toBe("ask");

    // 3. skills: Go != Google Cloud -> ASK
    const p3 = decide({ key: "k", label: "Do you have experience with Google Cloud?", control: "radio", required: true, options: YN, name: "", autocomplete: "", placeholder: "" }, full, [], page());
    expect(p3.kind).toBe("ask");

    // 4. skills: React not listed -> ASK
    const p4 = decide({ key: "k", label: "Have you used React in production?", control: "radio", required: true, options: YN, name: "", autocomplete: "", placeholder: "" }, full, [], page());
    expect(p4.kind).toBe("ask");

    // 5. skills: level not given -> ASK
    const p5 = decide({ key: "k", label: "Rate your proficiency with Python", control: "select", required: true, options: ["Beginner", "Intermediate", "Advanced", "Expert"], name: "", autocomplete: "", placeholder: "" }, full, [], page());
    expect(p5.kind).toBe("ask");

    // 6. previous employer: Motorola with 'Ola' -> No or ASK (never Yes)
    const p6 = decide({ key: "k", label: "Have you previously worked for Motorola?", control: "radio", required: true, options: YN, name: "", autocomplete: "", placeholder: "" }, real, [], page("https://jobs.lever.co/motorola/1"));
    expect(p6).toEqual({ kind: "answer", question: "Quick answers › previous employer", value: "No" });

    // 7. work mode: hybrid != 5 days onsite Munich -> ASK
    const p7 = decide({ key: "k", label: "This role is fully onsite, 5 days a week in our Munich office. Are you able to commit?", control: "radio", required: true, options: YN, name: "", autocomplete: "", placeholder: "" }, real, [], page());
    expect(p7.kind).toBe("ask");

    // 8. work mode: named city San Francisco -> ASK
    const p8 = decide({ key: "k", label: "Are you able to commute to our office in San Francisco 3 days a week?", control: "radio", required: true, options: YN, name: "", autocomplete: "", placeholder: "" }, real, [], page());
    expect(p8.kind).toBe("ask");

    // 9. travel: 25% user vs 75% question -> No
    const p9 = decide({ key: "k", label: "Are you willing to travel up to 75% of the time?", control: "radio", required: true, options: YN, name: "", autocomplete: "", placeholder: "" }, real, [], page());
    expect(p9).toEqual({ kind: "answer", question: "Quick answers › travel", value: "No" });

    // 10. address line 2 -> ASK or skip, never full address
    const p10 = decide({ key: "k", label: "Address line 2", control: "text", required: true, options: [], name: "", autocomplete: "address-line2", placeholder: "" }, full, [], page());
    expect(p10.kind).toBe("ask");

    // 11. languages: unlisted language with languagesComplete false -> ASK
    const p11 = decide({ key: "k", label: "Do you speak German fluently?", control: "radio", required: true, options: YN, name: "", autocomplete: "", placeholder: "" }, { ...full, languages: [{ language: "English", proficiency: "Fluent" }], languagesComplete: false }, [], page());
    expect(p11.kind).toBe("ask");

    // 12. previous employer: empty work history with workHistoryComplete false -> ASK
    const p12 = decide({ key: "k", label: "Have you worked for Acme in the past?", control: "radio", required: true, options: YN, name: "", autocomplete: "", placeholder: "" }, { ...full, currentCompany: "", workHistory: [], workHistoryComplete: false }, [], page());
    expect(p12.kind).toBe("ask");

    // 13. skills threshold: Python 2y vs 5+ years -> No
    const p13 = decide({ key: "k", label: "Do you have 5+ years of experience with Python?", control: "radio", required: true, options: YN, name: "", autocomplete: "", placeholder: "" }, { ...full, skillsInventory: [{ name: "Python", years: 2 }] }, [], page());
    expect(p13).toEqual({ kind: "answer", question: "Quick answers › skills", value: "No" });

    // 14. skills threshold: Python 2y vs at least 10 years -> No
    const p14 = decide({ key: "k", label: "Do you have at least 10 years of Python experience?", control: "radio", required: true, options: YN, name: "", autocomplete: "", placeholder: "" }, { ...full, skillsInventory: [{ name: "Python", years: 2 }] }, [], page());
    expect(p14).toEqual({ kind: "answer", question: "Quick answers › skills", value: "No" });

    // 15. age / over18 fact
    const p15 = decide({ key: "k", label: "Are you at least 18 years of age?", control: "radio", required: true, options: YN, name: "", autocomplete: "", placeholder: "" }, { ...full, facts: { ...real.facts, over18: "Yes" } }, [], page());
    expect(p15).toEqual({ kind: "answer", question: "Quick answers › over 18", value: "Yes" });
  });
});

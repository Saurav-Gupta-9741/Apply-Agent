/** Regression probes based on audit edge cases: ensures salary never gets city,
 * country vs location disambiguates cleanly, and open link lists are not guessed. */

import { describe, expect, it } from "vitest";
import { decide } from "../src/content/classify";
import { PROFILE } from "./fixtures";
import type { FieldDescriptor, Profile } from "../src/shared/types";
import { PERSONA_A, PERSONA_B, PERSONA_C } from "./personas";

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

  it("fills resume link for resume and cv URL questions", () => {
    const r1 = testField("Resume link", "url");
    expect(r1).toEqual({ kind: "profile", key: "resumeUrl", value: "https://drive.google.com/file/d/1_L5NAIAgNgMUZYuyqM25RNu02NELLGwp/view?usp=drive_link" });

    const r2 = testField("Link to your resume", "text");
    expect(r2).toEqual({ kind: "profile", key: "resumeUrl", value: "https://drive.google.com/file/d/1_L5NAIAgNgMUZYuyqM25RNu02NELLGwp/view?usp=drive_link" });

    const r3 = testField("Google Drive link to resume", "text");
    expect(r3).toEqual({ kind: "profile", key: "resumeUrl", value: "https://drive.google.com/file/d/1_L5NAIAgNgMUZYuyqM25RNu02NELLGwp/view?usp=drive_link" });

    const r4 = testField("CV URL", "url");
    expect(r4).toEqual({ kind: "profile", key: "resumeUrl", value: "https://drive.google.com/file/d/1_L5NAIAgNgMUZYuyqM25RNu02NELLGwp/view?usp=drive_link" });
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

    // 6. previous employer: Motorola with 'Ola', history not complete -> ASK (never Yes)
    const p6 = decide({ key: "k", label: "Have you previously worked for Motorola?", control: "radio", required: true, options: YN, name: "", autocomplete: "", placeholder: "" }, real, [], page("https://jobs.lever.co/motorola/1"));
    expect(p6.kind).toBe("ask");

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

  describe("33 comprehensive probes from Claude review (round 4)", () => {
    const YN = ["Yes", "No"];
    const pg = (u = "https://boards.greenhouse.io/acme/jobs/1") => ({ jobCountries: ["India", "United States"], url: u });
    type C_ = [any, string, string, string, string[], string[], string?, string?];
    const partial: any = { ...PERSONA_A, currentCompany: "Initech", workHistory: [], workHistoryComplete: false };
    const noPct: any = { ...PERSONA_A, facts: { ...PERSONA_A.facts, travelPercent: "" } };
    const basicHindi: any = { ...PERSONA_A, languages: [{ language: "Hindi", proficiency: "Basic" }] };

    const cases: C_[] = [
      // skills thresholds in other wordings
      [PERSONA_A, "A", "Do you have at least 3 years of experience with Python?", "radio", YN, ["No"]],
      [PERSONA_A, "A", "Do you have a minimum of three years of Python experience?", "radio", YN, ["No", "ASK"]],
      [PERSONA_A, "A", "Do you have 3 or more years of SQL experience?", "radio", YN, ["No", "ASK"]],
      [PERSONA_A, "A", "Do you have 1+ years of experience with Python?", "radio", YN, ["Yes"]],
      [PERSONA_A, "A", "Do you have experience with Python and Spark?", "radio", YN, ["ASK"]],
      [PERSONA_A, "A", "Do you have experience with SQL in a financial services environment?", "radio", YN, ["ASK"]],
      [PERSONA_A, "A", "How many years of experience do you have with Python?", "text", [], ["2"]],
      [PERSONA_A, "A", "Do you have experience with Microsoft Excel?", "radio", YN, ["Yes", "ASK"]],
      [PERSONA_B, "B", "Do you have 10+ years of experience with Java?", "radio", YN, ["No"]],
      [PERSONA_B, "B", "Do you have experience with JavaScript?", "radio", YN, ["ASK"]],
      [PERSONA_B, "B", "Do you have experience with Golang?", "radio", YN, ["Yes", "ASK"]],
      [PERSONA_C, "C", "Do you have experience with Python?", "radio", YN, ["No"]],
      // previous employer
      [partial, "A+Initech, not complete", "Have you worked for Acme in the past?", "radio", YN, ["ASK"]],
      [PERSONA_B, "B", "Have you previously worked for Flipkart?", "radio", YN, ["Yes"]],
      [PERSONA_B, "B", "Are you currently employed by Infosys?", "radio", YN, ["No", "ASK"]],
      [PERSONA_B, "B", "Have you previously worked for us?", "radio", YN, ["Yes", "ASK"], "https://jobs.lever.co/flipkart/1"],
      [PERSONA_C, "C (Acme Media)", "Have you previously worked for Acme Corporation?", "radio", YN, ["No", "ASK"], "https://boards.greenhouse.io/acmecorp/jobs/1"],
      // work mode
      [PERSONA_A, "A hybrid≤3 Pune", "Are you able to work from our Pune office 3 days a week?", "radio", YN, ["Yes"]],
      [PERSONA_A, "A hybrid≤3 Pune", "Can you work from our Hyderabad office 2 days a week?", "radio", YN, ["ASK"]],
      [PERSONA_A, "A hybrid≤3 Pune", "Can you work from our Chennai office 3 days a week?", "radio", YN, ["ASK"]],
      [PERSONA_A, "A hybrid≤3 Pune", "This role requires being in the office four days a week. Are you OK with that?", "radio", YN, ["No", "ASK"]],
      [PERSONA_A, "A hybrid≤3 Pune", "Are you able to work onsite 5 days a week?", "radio", YN, ["No", "ASK"]],
      [PERSONA_B, "B remote", "Are you comfortable working in a hybrid model from our Bangalore office?", "radio", YN, ["No", "ASK"]],
      [PERSONA_B, "B remote", "Are you able to work onsite?", "radio", YN, ["No", "ASK"]],
      // travel
      [PERSONA_A, "A 10%", "Are you willing to travel up to 25% of the time?", "radio", YN, ["No"]],
      [noPct, "A, travel=Yes, no %", "Are you willing to travel up to 50% of the time?", "radio", YN, ["ASK"]],
      [PERSONA_A, "A 10%", "Are you willing to travel up to twenty-five percent?", "radio", YN, ["No", "ASK"]],
      // languages
      [PERSONA_A, "A Eng=Fluent", "Are you a native English speaker?", "radio", YN, ["No", "ASK"]],
      [basicHindi, "Hindi=Basic", "Are you fluent in Hindi?", "radio", YN, ["No", "ASK"]],
      [PERSONA_C, "C complete", "Do you speak German?", "radio", YN, ["No"]],
      // address
      [PERSONA_A, "A", "Street address", "text", [], ["12 MG Road"]],
      [PERSONA_A, "A (line2 empty)", "Apartment, suite, etc.", "text", [], ["ASK", "SKIP"]],
      [PERSONA_B, "B", "Address line 2", "text", [], ["Tower B, Apt 304"]],
    ];

    for (const [p, name, label, control, options, want, url, ac] of cases) {
      it(`evaluates probe: ${name} -> ${label.slice(0, 50)}`, () => {
        const d: any = decide({ key: "k", label, control, required: true, options, name: "", autocomplete: ac ?? "", placeholder: "" } as any, p, [], pg(url) as any);
        const got = d.kind === "ask" ? "ASK" : d.kind === "skip" ? "SKIP" : String(d.value);
        expect(want, `expected ${want.join("|")} but got ${got} for "${label}"`).toContain(got);
      });
    }
  });
});

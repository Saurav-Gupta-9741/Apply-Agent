/** Found by the read-only scan of real application forms (reports/coverage.md). Each question below is copied from
 * a real form; before the fix, the first group got one of the user's profile values. */

import { describe, expect, it } from "vitest";
import { decide, findAnswer } from "../src/content/classify";
import { hasCaptcha } from "../src/content/detect";
import { extractFields } from "../src/content/extract";
import type { FieldDescriptor } from "../src/shared/types";
import { mount, PROFILE } from "./fixtures";

const field = (label: string, control: FieldDescriptor["control"] = "select"): FieldDescriptor => ({
  key: "k", label, control, required: true, options: ["Yes", "No"], name: "", autocomplete: "", placeholder: "",
});

describe("yes/no and 'which' questions never get a profile fact", () => {
  const profile = { ...PROFILE, country: "India", location: "Pune", currentCompany: "Initech", school: "IIT Jodhpur" };
  for (const label of [
    "Have you independently managed full outbound prospecting sequences (calls, email, and social) in a tech sales role?",
    "Are you subject to any employment agreements and/or post-employment restrictions with your current employer or a past employer?",
    "Is your most recent country of citizenship one of the following countries: Cuba, Iran, North Korea (DPRK), or Syria?",
    "Are you comfortable commuting to and working onsite at our New York City office location?",
    "Which location are you applying for?",
    "Which Celonis campus event or university career fair did you attend?",
  ]) {
    it(label.slice(0, 70), () => expect(decide(field(label), profile, []).kind).toBe("ask"));
  }

  it("real profile questions are still recognised", () => {
    for (const [label, key] of [
      ["Please select the country where you currently reside.", "country"], ["What is your current location?", "location"],
      ["Please list your most recent Employer here.", "currentCompany"], ["Most Recent Job Title", "currentTitle"],
      ["Linkedin Profile URL", "linkedin"], ["Preferred First Name", "firstName"],
    ] as const) {
      expect(decide(field(label, "text"), { ...profile, currentTitle: "Data Analyst" }, []), label).toMatchObject({ kind: "profile", key });
    }
  });
});

describe("decoration is not a question", () => {
  it("a line of underscores above a field is skipped; the real label is used", () => {
    mount(`<form><div><p>___________________________________</p><label for="w">Why do you want to join us? *</label><textarea id="w" required></textarea></div>
      <div><p>_______________________________</p><input id="x" aria-label="__________" placeholder="Your website"></div></form>`);
    const labels = extractFields(document.body).map((f) => f.descriptor.label);
    expect(labels).toEqual(["Why do you want to join us?", "Your website"]);
  });
});

describe("'How did you hear about us?' is answered once", () => {
  const saved = [{ question: "How did you hear about this job?", answer: "LinkedIn", updatedAt: "2026-10-26" }];
  it("in all its real wordings", () => {
    for (const label of ["How did you hear about this opportunity?", "How did you hear about this opportunity at Grafana?",
      "Where have you learned about Samsara? Select all that apply."]) {
      expect(findAnswer(field(label), saved)?.answer, label).toBe("LinkedIn");
    }
  });
  it("but never for a different question", () => {
    expect(findAnswer(field("Have you previously worked at Samsara?"), saved)).toBeUndefined();
  });
});

describe("robot checks shown instead of the page", () => {
  it("DataDome (seen on SmartRecruiters), PerimeterX and Arkose count as CAPTCHAs", () => {
    for (const html of [
      `<iframe src="https://geo.captcha-delivery.com/captcha/?initialCid=x"></iframe>`,
      `<div id="px-captcha"></div>`,
      `<iframe src="https://client-api.arkoselabs.com/fc/gc/?token=x"></iframe>`,
    ]) {
      mount(html);
      expect(hasCaptcha(document), html).toBe(true);
    }
  });
});

// --- second pass (77 more companies) -------------------------------------------------------------------------
describe("second pass: more questions that must not get a profile fact", () => {
  const profile = { ...PROFILE, location: "Pune", school: "IIT Jodhpur", degree: "Master's Degree", graduationYear: "2026" };
  for (const label of [
    "This role requires at least 3 days a week in the office, are you able to easily commute to the location the role is based in?",
    "Se sim para pergunta anterior, qual é o nome completo do colaborador?",
    "Legal Name (if different than above)",
    "Share 2–3 links to technical content you created and are proud of (e.g., tutorials, blog posts, talks, videos, sample apps, docs). Add your main public profile (GitHub, LinkedIn, X…) if relevant.",
  ]) {
    it(label.slice(0, 70), () => expect(decide(field(label, "text"), profile, []).kind).not.toBe("profile"));
  }
  it("a French graduation-year question gets the year, not the degree", () => {
    expect(decide(field("En quelle année as-tu/vas-tu recevoir ton diplôme ?", "text"), profile, []))
      .toMatchObject({ kind: "profile", key: "graduationYear" });
  });
  it("questions that open with a question word still get their fact", () => {
    for (const [label, key] of [["Where are you located/working from?", "location"], ["What city do you live in?", "location"],
      ["Which institution do you attend?", "school"]] as const) {
      expect(decide(field(label, "text"), profile, []), label).toMatchObject({ kind: "profile", key });
    }
  });
});

describe("second pass: the application form, not the demographic survey next to it", () => {
  it("picks the form with the email and resume even when the survey has more fields", async () => {
    const { pickAdapter, generic } = await import("../src/content/adapters");
    mount(`<form id="survey"><h3>U.S. Standard Demographic Questions</h3>
      ${Array.from({ length: 14 }, (_, i) => `<label><input type="checkbox" name="s${i}"> Option ${i}</label>`).join("")}</form>
      <form id="application"><label for="n">Name *</label><input id="n" required><label for="e">Email *</label><input id="e" type="email" required>
      <label for="r">Resume *</label><input id="r" type="file" required><button type="submit">Submit Application</button></form>`);
    const root = pickAdapter(document, "https://jobs.ashbyhq.com/acme/1/application").formRoot(document) ?? generic.formRoot(document);
    expect(root?.id).toBe("application");
  });
});

describe("second pass: diversity answers are reused across wordings, safely", () => {
  const answers = [
    { question: "Gender", answer: "Decline to self identify", topic: "gender" as const, updatedAt: "2026-10-26T01:00:00Z" },
    { question: "Do you identify as transgender?", answer: "No", topic: "gender" as const, updatedAt: "2026-10-26T02:00:00Z" },
  ];
  const choice = (label: string, options: string[]): FieldDescriptor => ({ ...field(label), options });
  it("reused where the form lists the same answer as a choice", () => {
    expect(findAnswer(choice("What is your gender identity?", ["Man", "Woman", "Non-binary", "Decline to self identify"]), answers, "gender")?.answer)
      .toBe("Decline to self identify");
  });
  it("never as free text, never when no choice matches, never a bare yes/no", () => {
    expect(findAnswer({ ...field("How do you describe your gender?", "text"), options: [] }, answers, "gender")).toBeUndefined();
    expect(findAnswer(choice("What is your gender identity?", ["Man", "Woman"]), answers, "gender")).toBeUndefined();
    expect(findAnswer(choice("Is your gender identity the same as the one you were assigned at birth?", ["Yes", "No"]), answers, "gender")).toBeUndefined();
  });
});

describe("uploads: the resume goes only where the resume is asked for", () => {
  const upload = (label: string, required = true): FieldDescriptor => ({ ...field(label, "file"), options: [], required });
  it("a portfolio upload that mentions the resume does not get the resume (seen on Esri's real form)", () => {
    expect(decide(upload("This position requires a portfolio submission. Please attach your portfolio if it is not linked in your resume or cover letter."), PROFILE, []).kind).toBe("ask");
    expect(decide(upload("Transcript (attach with your resume)", false), PROFILE, []).kind).toBe("skip");
  });
  it("resume uploads still get the resume", () => {
    for (const label of ["Resume/CV", "Resume", "Upload your CV", "Resume (please also mention your portfolio link in it)", "Lebenslauf"]) {
      expect(decide(upload(label), PROFILE, []).kind, label).toBe("resume");
    }
  });
});

describe("found while labelling the real questions", () => {
  it("'design' is not an e-signature (a whole class of design questions was being skipped)", () => {
    expect(decide(field("How many years of experience do you have in B2B SaaS Product Design?", "text"), PROFILE, []).kind).not.toBe("skip");
    expect(decide(field("Please e-sign below", "text"), PROFILE, [])).toMatchObject({ kind: "ask", topic: "signature" });
  });
  it("more wordings of location, start date and total experience", () => {
    const profile = { ...PROFILE, location: "Pune", experienceYears: "2" };
    expect(decide(field("Where are you currently located?", "text"), profile, [])).toMatchObject({ kind: "profile", key: "location" });
    expect(decide(field("Total year of experience?", "text"), profile, [])).toMatchObject({ kind: "profile", key: "experienceYears" });
    for (const label of ["When would you be available to start?", "When are you available for employment?", "Date Available"]) {
      expect(decide(field(label, "text"), profile, []), label).toMatchObject({ kind: "ask", topic: "notice_period" });
    }
  });
});

/** Round 2: fresh forms from nine ATSs (BambooHR, Teamtailor, Breezy, Recruitee, Personio…), never seen before. */
describe("round 2 real findings", () => {
  const facts = { workCountries: "India", noticePeriod: "30 days", currentCtc: "6 LPA", expectedCtc: "20 LPA", relocate: "Yes" as const,
    heardFrom: "LinkedIn", gender: "Female" as const, hispanic: "No" as const, race: "Decline", veteran: "No" as const, disability: "No" as const };
  const profile = { ...PROFILE, location: "Pune", country: "India", github: "https://github.com/asha", facts };
  const text = (label: string): FieldDescriptor => ({ ...field(label, "text"), options: [] });
  const page = { jobCountries: ["United States"] };
  const filled = (label: string, control: FieldDescriptor["control"] = "text") => {
    const d = decide({ ...text(label), control }, profile, [], page);
    return d.kind === "profile" || d.kind === "answer" ? d.value : undefined;
  };

  it("one box for first and last name gets the full name", () => {
    expect(filled("First Name and Last Name")).toBe("Asha Verma");
  });

  for (const label of [
    "If you have previously worked at Success Academy, please list your work email address.",
    "Email address without domain",
    "If you selected international, what location(s)?",
    "What is your experience with AI-assisted development tools (e.g., GitHub Copilot, Cursor, Claude Code)?",
    "Please confirm type of right to work document",
    "Visa situation",
  ]) {
    it(`nothing from the profile or quick answers: ${label}`, () => expect(filled(label)).toBeUndefined());
  }

  for (const label of [
    "Optional: Additional information may be added in reference to a start date.",
    "Please list specific dates of internship availability- Include start date and end date.",
  ]) {
    it(`notice period is not the answer: ${label}`, () => expect(filled(label, "textarea")).toBeUndefined());
  }

  it("still answers the plain questions", () => {
    expect(filled("What is your official notice period?", "textarea")).toBe("30 days");
    expect(decide({ ...text("Are you legally authorized to work in the United States?"), control: "select", options: ["Yes", "No"] }, profile, [], page))
      .toMatchObject({ kind: "answer", value: "No" });
  });

  it("BambooHR's upload labelled only by a <p> above it (its input says aria-label=\"file-input\") is the resume", () => {
    mount(`<form id="f"><div><p>Resume*</p><div><button type="button"><span>Choose File*</span></button><p>No file selected</p></div>
      <input type="file" aria-label="file-input" required tabindex="-1"></div></form>`);
    const [upload] = extractFields(document.getElementById("f")!);
    expect(upload?.descriptor.label).toBe("Resume");
    expect(decide(upload!.descriptor, profile, [])).toMatchObject({ kind: "resume" });
  });
});

/** Round 3: 52 fresh forms from companies never scanned before, measured before any change. */
describe("round 3 real findings", () => {
  const facts = { workCountries: "India", noticePeriod: "30 days", currentCtc: "6 LPA", expectedCtc: "20 LPA", relocate: "Yes" as const,
    heardFrom: "LinkedIn", gender: "Female" as const, hispanic: "No" as const, race: "Decline", veteran: "No" as const, disability: "No" as const };
  const profile = { ...PROFILE, location: "Pune", country: "India", degree: "Master's Degree", facts };
  const ask = (label: string, control: FieldDescriptor["control"] = "text", options: string[] = []) =>
    decide({ ...field(label, control), options }, profile, [], { jobCountries: [] });

  it("'right to work … without the need for a visa or work permit' asks about the right to work: No for a user who has none there", () => {
    const label = "Do you currently have, and will you continue to have, the legal right to work in Poland where this role is based without the need for employer support (such as a visa or work permit)?";
    expect(ask(label, "select", ["Yes", "No"])).toMatchObject({ kind: "answer", value: "No" });
    expect(ask("Are you authorized to work in India without requiring sponsorship?", "select", ["Yes", "No"])).toMatchObject({ value: "Yes" });
    expect(ask("Will you require visa sponsorship to work in Poland?", "select", ["Yes", "No"])).toMatchObject({ value: "Yes" });
  });

  for (const [label, control] of [
    ["Do you require Visa sponsorship to work in your selected location? If so, which one? And when does your Visa expire?", "text"],
    ["Describe any training, experience, or qualifications that might be of interest to Waycrosse", "textarea"],
    ["What is your full street address? (Street, City, State, Zip)", "text"],
  ] as const) {
    it(`left for the user: ${label}`, () => expect(["profile", "answer"]).not.toContain(ask(label, control).kind));
  }
});

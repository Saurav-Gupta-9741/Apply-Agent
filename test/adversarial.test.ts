/** Adversarial but realistic application-form questions, decided offline. Every expectation is written from the
 * user's point of view (what a careful person filling the form for themselves would do), not from what the code does
 * today. Failing tests are left in on purpose: each one documents a real problem.
 *
 * Expectation notation used in the tables below:
 *   "Yes" / "No" / "<value>"  the agent must fill exactly this
 *   null                      the agent must not fill anything (ask the user or leave it blank)
 *   { oneOf: [...] }          any of these is acceptable (null = no fill)
 *   { not: [...] }            anything except these values is acceptable (null = no fill is always acceptable) */

import { describe, expect, it } from "vitest";
import { decide } from "../src/content/classify";
import { decideWithMeaning } from "../src/content/meaning";
import { extractFields } from "../src/content/extract";
import { runOnce } from "../src/content/agent";
import type { PageFacts } from "../src/content/facts";
import type { Decision, FieldDescriptor, Profile } from "../src/shared/types";
import { mount, PROFILE } from "./fixtures";
import head from "../static/intent/model.json";

const FULL: Profile = {
  ...PROFILE, location: "Pune, India", country: "India", github: "https://github.com/asha", portfolio: "https://asha.dev",
  currentCompany: "Initech", currentTitle: "Software Engineer", school: "IIT Jodhpur", discipline: "Computer Science",
  graduationYear: "2026", experienceYears: "3", targetRoles: "Backend Engineer", preferredLocations: "Bengaluru", skills: "Python, Java",
  facts: {
    workCountries: "India", noticePeriod: "30 days", currentCtc: "12 LPA", expectedCtc: "18 LPA", relocate: "Yes", heardFrom: "LinkedIn",
    gender: "Female", hispanic: "No", race: "Asian", veteran: "No", disability: "No",
  },
};

const US: PageFacts = { jobCountries: ["United States"] };
const UK: PageFacts = { jobCountries: ["United Kingdom"] };
const DE: PageFacts = { jobCountries: ["Germany"] };
const IN: PageFacts = { jobCountries: ["India"] };
const CA: PageFacts = { jobCountries: ["Canada"] };

type Control = FieldDescriptor["control"];
const field = (label: string, control: Control = "select", options: string[] = ["Yes", "No"], extra: Partial<FieldDescriptor> = {}): FieldDescriptor => ({
  key: "k", label, control, required: true, options, name: "", autocomplete: "", placeholder: "", ...extra,
});
const text = (label: string, extra: Partial<FieldDescriptor> = {}) => field(label, "text", [], extra);

/** The value the agent would put on the form, or null when it fills nothing. */
function filled(d: Decision): string | null {
  if (d.kind === "profile" || d.kind === "answer" || d.kind === "work") return d.value;
  if (d.kind === "resume") return "<resume>";
  return null;
}

type Want = string | null | { oneOf: Array<string | null> } | { not: string[] };
function expectWant(got: string | null, want: Want, msg: string): void {
  if (want === null || typeof want === "string") expect(got, msg).toBe(want);
  else if ("oneOf" in want) expect(want.oneOf, `${msg} (got ${JSON.stringify(got)})`).toContain(got);
  else expect(got !== null && want.not.includes(got), `${msg} (got ${JSON.stringify(got)})`).toBe(false);
}

/** Every value the agent could fill: by the rules, and by the model reading the question as any meaning at 99%. */
function everyFill(f: FieldDescriptor, page?: PageFacts, profile: Profile = FULL): string[] {
  const out: string[] = [];
  for (const intent of [undefined, ...head.classes]) {
    const d = decideWithMeaning(f, profile, [], page, intent ? { intent, confidence: 0.99 } : undefined);
    const v = filled(d);
    if (v !== null) out.push(`${intent ?? "(rules)"} → ${v}`);
  }
  return out;
}

// =================================================================================================================
// a) Work authorization / sponsorship polarity
// =================================================================================================================
describe("a) work authorization and sponsorship polarity (user can work only in India)", () => {
  const cases: Array<[string, PageFacts | undefined, Want, string[]?]> = [
    // plain, certain answers
    ["Are you legally authorized to work in the United States?", US, "No"],
    ["Will you now or in the future require sponsorship for employment visa status (e.g., H-1B)?", US, "Yes"],
    ["Are you authorized to work in the U.S.?", undefined, "No"],
    ["Are you authorised to work in America?", undefined, "No"],
    ["Are you authorized to work for any employer in the US?", undefined, "No"],
    ["Are you authorized to work in India?", US, "Yes"],
    ["Do you require sponsorship to work in India?", US, "No"],
    ["Do you have the right to work in the UK?", US, "No"],
    ["Are you eligible to work in the EU?", undefined, "No"],
    ["Do you hold a valid work permit for the Netherlands?", undefined, "No"],
    ["Would you need sponsorship now or in the future to work in Canada?", undefined, "Yes"],
    ["Will you require employer sponsorship to work in the United States in the future, for example after OPT or STEM OPT expires?", undefined, "Yes"],
    ["Would you require sponsorship to work in the US, UK or Canada?", undefined, "Yes"],
    ["Are you legally entitled to work in Ireland, Germany or France?", undefined, "No"],
    // "without"
    ["Can you work in the US without requiring visa sponsorship?", undefined, "No"],
    ["Are you authorized to work in the US without sponsorship?", undefined, "No"],
    ["Will you be able to work in the US without needing sponsorship now or in the future?", undefined, "No"],
    // country only on the page
    ["Are you authorized to work in the country where this job is located?", US, "No"],
    ["Are you authorized to work in the country where this job is located?", undefined, null],
    ["Do you have the right to work in this country?", UK, "No"],
    ["Will you require visa sponsorship to work for us?", IN, "No"],
    ["Will you require visa sponsorship to work for us?", CA, "Yes"],
    ["Do you need a visa to work in this role?", DE, "Yes"],
    ["Do you require sponsorship?", undefined, null],
    ["Do you need sponsorship for this role?", { jobCountries: ["United States", "India"] }, null],
    ["Do you need sponsorship to work in the location you selected above?", US, null],
    ["Are you authorized to work in your country of residence?", US, "Yes"],
    // several countries with different answers
    ["Are you authorized to work in the US or India?", undefined, null],
    ["Are you authorized to work in India and the US?", undefined, null],
    ["Do you need sponsorship to work in India or the United Kingdom?", undefined, null],
    // conditional / details wanted
    ["If you need sponsorship, which visa?", US, null],
    ["If yes, what type of visa will you require?", US, null],
    ["Which visa do you currently hold?", US, null],
    ["What is your current visa status?", US, null],
    // double negatives, "not", "unless", "other than"
    ["Are you NOT authorized to work in the US?", undefined, { oneOf: ["Yes", null] }],
    ["Will you not require sponsorship to work in the US?", undefined, { oneOf: ["No", null] }],
    ["Is sponsorship not required for you to work in the US?", undefined, { oneOf: ["No", null] }],
    ["Are you authorized to work in any country other than India?", undefined, { oneOf: ["No", null] }],
    ["Unless you are a US citizen, will you require sponsorship?", undefined, { oneOf: ["Yes", null] }],
    ["Please confirm you do not require sponsorship to work in the US", undefined, { oneOf: ["No", null] }],
    // statements of company policy around the question
    ["This role is not eligible for visa sponsorship. Are you authorized to work in the US without sponsorship?", undefined, { oneOf: ["No", null] }],
    ["Are you authorized to work in the US? (We are unable to sponsor visas for this position)", undefined, { oneOf: ["No", null] }],
    ["No sponsorship is available for this role. Do you still wish to proceed?", US, null],
    ["Are you authorized to work in the US? If not, will you need sponsorship?", undefined, null],
    // visa-worded questions that are really about authorization
    ["Do you hold a visa that permits you to work in the US?", undefined, "No"],
    ["Do you have unrestricted work authorization in the US (i.e., not on a visa)?", undefined, "No"],
    // text boxes
    ["Sponsorship required?", US, "Yes", []],
    ["Visa status", US, null, []],
  ];
  for (const [label, page, want, options] of cases) {
    it(`${label}  [page: ${page?.jobCountries.join("+") ?? "none"}]`, () => {
      const f = options ? field(label, "text", options) : field(label);
      expectWant(filled(decide(f, FULL, [], page)), want, label);
    });
  }

  it("EU right: 'Are you authorized to work in Germany?' with workCountries 'India, EU' → Yes", () => {
    const p = { ...FULL, facts: { ...FULL.facts!, workCountries: "India, EU" } };
    expect(filled(decide(field("Are you authorized to work in Germany?"), p, [], US))).toBe("Yes");
  });
  it("EU right: 'Will you require sponsorship to work in Switzerland?' with 'India, EU' → Yes (Switzerland is not EU)", () => {
    const p = { ...FULL, facts: { ...FULL.facts!, workCountries: "India, EU" } };
    expect(filled(decide(field("Will you require sponsorship to work in Switzerland?"), p, [], US))).toBe("Yes");
  });

  // other languages: the need is said with a verb the English rule does not know
  const foreign: Array<[string, PageFacts | undefined, Want]> = [
    ["Benötigen Sie ein Visum, um in Deutschland zu arbeiten?", DE, { oneOf: ["Yes", null] }],
    ["Benötigen Sie eine Arbeitserlaubnis für Deutschland?", DE, { oneOf: ["Yes", null] }],
    ["Haben Sie eine Arbeitserlaubnis für Deutschland?", DE, "No"],
    ["Avez-vous besoin d'un parrainage de visa pour travailler en France ?", undefined, { oneOf: ["Yes", null] }],
    ["¿Necesita patrocinio de visa para trabajar en España?", undefined, { oneOf: ["Yes", null] }],
    ["¿Necesita permiso de trabajo para trabajar en España?", undefined, { oneOf: ["Yes", null] }],
    ["Precisa de autorização de trabalho para trabalhar em Portugal?", undefined, { oneOf: ["Yes", null] }],
    ["Heeft u een werkvergunning nodig voor Nederland?", undefined, { oneOf: ["Yes", null] }],
  ];
  for (const [label, page, want] of foreign) {
    it(`(other language) ${label}`, () => expectWant(filled(decide(field(label), FULL, [], page)), want, label));
  }
});

// =================================================================================================================
// b) Someone else's details
// =================================================================================================================
describe("b) someone else's details never get the user's name, email or phone (rules and any model reading)", () => {
  const own = [FULL.firstName, FULL.lastName, `${FULL.firstName} ${FULL.lastName}`, FULL.email, FULL.phone, FULL.linkedin, FULL.currentCompany];
  const cases: Array<[string, Control, string?]> = [
    ["Referrer's name", "text"],
    ["Name of the person who referred you", "text"],
    ["Referred by (employee name)", "text"],
    ["Email address of your referrer", "email"],
    ["Emergency contact phone", "tel"],
    ["Emergency contact – full name", "text"],
    ["Reference 1 – Email", "email"],
    ["Hiring manager's name (if known)", "text"],
    ["Your manager's email", "email"],
    ["Recruiter name", "text"],
    ["Name of your current supervisor", "text"],
    ["Father's name", "text"],
    ["Mother's maiden name", "text"],
    ["Husband's phone number", "tel"],
    ["Wife's email address", "email"],
    ["Guardian's phone number", "tel"],
    ["Next of kin mobile", "tel"],
    ["Point of contact email (at our company)", "email"],
    ["Academic advisor's email", "email"],
    ["Thesis supervisor name", "text"],
    ["HR contact email", "email"],
    ["Team lead's phone number", "tel"],
    ["Who referred you to this role?", "text"],
    ["Name", "text", "References"],
    ["Email", "email", "Professional References"],
    ["Phone", "tel", "Emergency Contact Information"],
    ["Full name", "text", "Referee details"],
    ["Email", "email", "Supervisor Information"],
    ["Phone number", "tel", "Spouse / Partner details"],
    ["First name", "text", "Who referred you?"],
  ];
  for (const [label, control, section] of cases) {
    it(`${label}${section ? `  [section: ${section}]` : ""} (${control})`, () => {
      const f = field(label, control, [], section ? { section } : {});
      const bad = everyFill(f, US).filter((s) => own.some((v) => s.endsWith(`→ ${v}`)));
      expect(bad).toEqual([]);
    });
  }
});

// =================================================================================================================
// c) Signatures, declarations, consents
// =================================================================================================================
describe("c) signatures, declarations and consents are the user's own act", () => {
  const cases: Array<[string, Control]> = [
    ["Signature", "text"],
    ["Full name (as signature)", "text"],
    ["Legal name (this serves as your electronic signature)", "text"],
    ["Name (typed signature)", "text"],
    ["Signed (full name)", "text"],
    ["Declaration: Full name", "text"],
    ["Acknowledgement: type your name", "text"],
    ["By entering my name below I certify that the above is accurate", "text"],
    ["I certify that the information provided is true and complete", "checkbox"],
    ["I agree to the terms and conditions", "checkbox"],
    ["Applicant initials", "text"],
    ["Please initial here to confirm you have read the above", "text"],
    ["Date of signature", "date"],
    ["Date of signature", "text"],
    ["I consent to my data being stored for future openings", "checkbox"],
    ["I hereby declare that the details furnished above are true. Name of the candidate:", "text"],
  ];
  for (const [label, control] of cases) {
    it(`${label} (${control})`, () => {
      const f = field(label, control, []);
      expect(everyFill(f, US)).toEqual([]);
    });
  }
});

// =================================================================================================================
// d) Salary traps (user saved current 12 LPA, expected 18 LPA)
// =================================================================================================================
describe("d) salary: currency, period, current vs expected", () => {
  const cases: Array<[string, Control, Want, string[]?]> = [
    ["Expected CTC (in INR)", "text", "18 LPA"],
    ["Current CTC", "text", "12 LPA"],
    ["Desired salary", "text", "18 LPA"],
    ["Expected salary (₹)", "text", "18 LPA"],
    ["Expectativa salarial", "text", "18 LPA"],
    ["Expected salary (in lakhs per annum)", "number", "18"],
    ["Current CTC (in LPA)", "number", "12"],
    // currency mismatch
    ["Expected salary (USD)", "text", null],
    ["Desired annual salary in $", "text", null],
    ["Expected salary in EUR", "text", null],
    ["Gehaltsvorstellung (EUR brutto/Jahr)", "text", null],
    ["Salary expectations in CHF", "text", null],
    ["Expected salary (SGD)", "text", null],
    ["Expected annual compensation (AUD)", "text", null],
    ["Expected salary in Canadian dollars", "text", null],
    // number box asking for the full rupee amount: "18" would mean 18 rupees
    ["Expected annual salary (INR)", "number", { not: ["18"] }],
    ["Current annual CTC in rupees", "number", { not: ["12"] }],
    // period mismatch (the saved values are per year)
    ["Expected monthly salary", "text", null],
    ["What is your expected salary per hour?", "text", null],
    ["Current monthly in-hand salary", "text", null],
    ["Expected salary (per month)", "number", null],
    // yes/no questions that mention salary
    ["Are you comfortable with the salary range of 15–20 LPA for this role?", "select", null, ["Yes", "No"]],
    ["Is your current salary negotiable?", "select", null, ["Yes", "No"]],
    ["Are you comfortable with the salary range of $120k–$150k?", "select", null, ["Yes", "No"]],
    // ambiguous
    ["Current base salary and expected salary", "text", null],
    ["What was your salary at your previous job?", "text", { oneOf: [null, "12 LPA"] }],
  ];
  for (const [label, control, want, options] of cases) {
    it(`${label} (${control})`, () => {
      expectWant(filled(decide(field(label, control, options ?? []), FULL, [], IN)), want, label);
    });
  }
});

// =================================================================================================================
// e) Notice period vs dates vs yes/no (user saved "30 days")
// =================================================================================================================
describe("e) notice period, start dates and yes/no availability", () => {
  const cases: Array<[string, Control, Want, Partial<FieldDescriptor>?]> = [
    ["Notice period", "text", "30 days"],
    ["What is your notice period?", "text", "30 days"],
    ["When can you join?", "text", "30 days"],
    ["Kündigungsfrist", "text", "30 days"],
    ["Préavis", "text", "30 days"],
    ["Opzegtermijn", "text", "30 days"],
    ["Notice period", "select", "30 days", { options: ["Immediate", "15 days", "30 days", "60 days", "90 days"] }],
    ["Notice period", "select", { oneOf: ["16-30 days", "30 days", null] /* "30 days" is matched to "16-30 days" when filled (bestOption) */ }, { options: ["0-15 days", "16-30 days", "31-60 days", "More than 60 days"] }],
    ["Notice period (in days)", "number", { oneOf: ["30", null] }],
    ["Notice period (months)", "text", { not: ["30 days"] }],
    ["Notice period in months", "number", { not: ["30 days", "30"] }],
    ["Earliest start date", "date", null],
    ["Available start date", "text", null, { placeholder: "MM/DD/YYYY" }],
    ["Start date (DD/MM/YYYY)", "text", null],
    ["Date available to start", "text", null, { placeholder: "dd/mm/yyyy" }],
    ["Start date - Month", "select", null, { options: ["January", "February", "March"] }],
    ["Availability – Year", "select", null, { options: ["2026", "2027"] }],
    ["Can you start immediately?", "select", { oneOf: ["No", null] }, { options: ["Yes", "No"] }],
    ["Are you currently serving your notice period?", "select", null, { options: ["Yes", "No"] }],
    ["Is your notice period negotiable?", "select", null, { options: ["Yes", "No"] }],
    ["Can you join within 15 days?", "select", null, { options: ["Yes", "No"] }],
    ["How soon can you join us? (in days)", "number", { oneOf: ["30", null] }],
  ];
  for (const [label, control, want, extra] of cases) {
    it(`${label} (${control})`, () => {
      const f = { ...field(label, control, []), ...extra };
      expectWant(filled(decide(f, FULL, [], IN)), want, label);
    });
  }
});

// =================================================================================================================
// f) Near-misses
// =================================================================================================================
describe("f) near-misses: same words, different fact", () => {
  const cases: Array<[string, Want]> = [
    ["Preferred name", "Asha"],
    ["Preferred last name", "Verma"],
    ["Name as on passport", { oneOf: ["Asha Verma", null] }],
    ["Father's name", null],
    ["Middle name", null],
    ["Maiden name", null],
    ["Company you are applying to", null],
    ["Name of the company you're applying to", null],
    ["Previous employer", { not: ["Initech"] }],
    ["Former employer name", { not: ["Initech"] }],
    ["Most recent employer", "Initech"],
    ["University you studied at", "IIT Jodhpur"],
    ["Which university did you attend?", "IIT Jodhpur"],
    ["University you want to attend", null],
    ["Preferred university for the master's program", null],
    ["Target school", null],
    ["GPA", null],
    ["Cumulative GPA", null],
    ["Expected graduation date", "2026"],
    ["High school graduation year", null],
    ["Year of graduation (10th standard)", null],
    ["Years of experience", "3"],
    ["Total experience (years)", "3"],
    ["Years of experience with Python", null],
    ["Total years of experience in Java", null],
    ["Years of experience in this field", null],
    ["Job title", "Software Engineer"],
    ["Desired job title", null],
    ["Job title of the position you are applying for", null],
    ["Country of citizenship", null],
    ["Country of birth", null],
    ["Country code", { not: ["India"] }],
    ["City of birth", null],
    ["Place of birth", null],
    ["Preferred work location", "Bengaluru"],
    ["Confirm email", "asha@example.com"],
  ];
  for (const [label, want] of cases) {
    it(label, () => expectWant(filled(decide(text(label), FULL, [], US)), want, label));
  }
});

// =================================================================================================================
// g) Other languages: name / email / phone / notice / salary
// =================================================================================================================
describe("g) other languages", () => {
  const cases: Array<[string, Want]> = [
    ["Vorname", "Asha"], ["Nachname", "Verma"], ["E-Mail-Adresse", "asha@example.com"], ["Telefonnummer", FULL.phone],
    ["Handynummer", FULL.phone],
    ["Prénom", "Asha"], ["Nom", "Verma"], ["Adresse e-mail", "asha@example.com"], ["Numéro de téléphone", FULL.phone],
    ["Nombre", "Asha"], ["Apellidos", "Verma"], ["Correo electrónico", "asha@example.com"], ["Teléfono", FULL.phone],
    ["Nome completo", "Asha Verma"], ["Sobrenome", "Verma"], ["Telefone celular", FULL.phone],
    ["Voornaam", "Asha"], ["Achternaam", "Verma"], ["E-mailadres", "asha@example.com"], ["Telefoonnummer", FULL.phone],
    ["メールアドレス", "asha@example.com"], ["電話番号", FULL.phone], ["氏名", { oneOf: ["Asha Verma", null] }],
    ["ईमेल", "asha@example.com"], ["फ़ोन नंबर", FULL.phone], ["नोटिस अवधि", { oneOf: ["30 days", null] }],
    ["Plazo de preaviso", "30 days"],
    // Someone else in another language
    ["Name des Ansprechpartners", null], ["Nom de la personne à contacter en cas d'urgence", null], ["पिता का नाम", null],
  ];
  for (const [label, want] of cases) {
    it(label, () => expectWant(filled(decide(text(label), FULL, [], US)), want, label));
  }
});

// =================================================================================================================
// h) Diversity questions with realistic option lists (Female, not Hispanic, Asian, not a veteran, no disability)
// =================================================================================================================
describe("h) diversity: the right option or none", () => {
  const cases: Array<[string, string[], Want]> = [
    ["Gender", ["Male", "Female", "Non-binary", "Decline to self-identify"], "Female"],
    ["Gender", ["Man", "Woman", "Non-binary", "I prefer not to say"], "Woman"],
    ["Gender identity", ["Female", "Male", "Prefer not to say"], "Female"],
    ["Gender", ["Woman", "Man", "Transgender woman", "Transgender man", "Non-binary"], "Woman"],
    ["Gender", ["M", "F", "X"], { oneOf: ["F", null] }],
    ["Gender", ["Cisgender man", "Cisgender woman", "Non-binary"], null],
    ["Sex assigned at birth", ["Male", "Female"], null],
    ["Pronouns", ["She/her", "He/him", "They/them"], null],
    ["Are you Hispanic or Latino?", ["Yes", "No", "Decline to self-identify"], "No"],
    ["Hispanic/Latino", ["Hispanic or Latino", "Not Hispanic or Latino", "Decline to self identify"], "Not Hispanic or Latino"],
    ["Race", ["American Indian or Alaska Native", "Asian", "Black or African American", "Native Hawaiian or Other Pacific Islander", "White", "Two or More Races", "Decline to self-identify"], "Asian"],
    ["Race/Ethnicity", ["Asian (Not Hispanic or Latino)", "White (Not Hispanic or Latino)", "Hispanic or Latino", "Decline to self-identify"], "Asian (Not Hispanic or Latino)"],
    ["Ethnicity", ["Asian or Asian British - Indian", "Asian or Asian British - Pakistani", "Asian or Asian British - Chinese", "White - British"], null],
    ["Ethnicity", ["East Asian", "South Asian", "Southeast Asian", "White", "Black"], null],
    ["Veteran status", ["I am not a protected veteran", "I identify as one or more of the classifications of protected veteran", "I don't wish to answer"], "I am not a protected veteran"],
    ["Are you a protected veteran?", ["Yes", "No", "Prefer not to say"], "No"],
    ["Disability status", ["Yes, I have a disability (or previously had a disability)", "No, I do not have a disability and have not had one in the past", "I do not want to answer"], "No, I do not have a disability and have not had one in the past"],
    ["Do you have a disability?", ["Yes", "No", "Decline"], "No"],
    ["Do you need any reasonable accommodation for the interview?", ["Yes", "No"], null],
    ["Do you identify as LGBTQ+?", ["Yes", "No", "Prefer not to say"], null],
    ["Is your spouse a veteran?", ["Yes", "No"], null],
    ["Have you served in the armed forces of another country?", ["Yes", "No"], null],
  ];
  for (const [label, options, want] of cases) {
    it(`${label}: ${options.slice(0, 3).join(" | ")}…`, () => expectWant(filled(decide(field(label, "select", options), FULL, [], US)), want, label));
  }
  it("free-text gender box is never filled", () => expect(filled(decide(text("What is your gender?"), FULL, [], US))).toBeNull());
});

// =================================================================================================================
// i) Form-reading extremes (jsdom)
// =================================================================================================================
const SUBMIT = `<button type="submit">Submit application</button>`;
const val = (id: string) => (document.getElementById(id) as HTMLInputElement).value;
const run = () => runOnce(document, { profile: FULL, answers: [], mode: "review", page: US });

describe("i) form reading extremes", () => {
  it("aria-labelledby with two ids reads both parts and fills the phone", async () => {
    mount(`<form id="f"><span id="q1">Phone</span><span id="q2">(mobile)</span><input id="p" aria-labelledby="q1 q2">${SUBMIT}</form>`);
    expect(extractFields(document.getElementById("f")!)[0]!.descriptor.label).toBe("Phone (mobile)");
    await run();
    expect(val("p")).toBe(FULL.phone);
  });

  it("placeholder-only boxes are understood", async () => {
    mount(`<form id="f"><input id="a" placeholder="First name"><input id="b" placeholder="Email address">${SUBMIT}</form>`);
    await run();
    expect([val("a"), val("b")]).toEqual(["Asha", FULL.email]);
  });

  it("duplicate labels: the second 'Full name' / 'Phone' under 'Emergency contact' stay empty", async () => {
    mount(`<form id="f"><h3>Your details</h3><label for="a">Full name</label><input id="a"><label for="b">Phone</label><input id="b" type="tel">
      <h3>Emergency contact</h3><label for="c">Full name</label><input id="c"><label for="d">Phone</label><input id="d" type="tel">${SUBMIT}</form>`);
    await run();
    expect([val("a"), val("c"), val("d")]).toEqual(["Asha Verma", "", ""]);
  });

  it("label (with for) after the input is still the input's label", async () => {
    mount(`<form id="f"><div><input id="x"><label for="x">Last name</label></div>${SUBMIT}</form>`);
    await run();
    expect(val("x")).toBe("Verma");
  });

  it("label without for, placed right after the input, names it", () => {
    mount(`<form id="f"><div class="q"><input id="x" name="field_7"><label>Email</label></div>${SUBMIT}</form>`);
    expect(extractFields(document.getElementById("f")!)[0]!.descriptor.label).toBe("Email");
  });

  it("honeypot: clip-path / 1px visually-hidden box is not filled", async () => {
    mount(`<form id="f"><label for="fn">First name</label><input id="fn">
      <div style="position:absolute; clip-path: inset(50%); clip: rect(0 0 0 0); width:1px; height:1px; overflow:hidden">
        <label for="h1">Website</label><input id="h1" name="website" tabindex="-1" autocomplete="off"></div>${SUBMIT}</form>`);
    await run();
    expect(val("fn")).toBe("Asha");
    expect(val("h1")).toBe("");
  });

  it("honeypot: a 1px-wide email box is not filled", async () => {
    mount(`<form id="f"><label for="em">Email</label><input id="em" type="email">
      <input id="h2" type="email" aria-label="Email" tabindex="-1" style="width:1px; height:1px; border:0; padding:0; margin:0">${SUBMIT}</form>`);
    await run();
    expect(val("em")).toBe(FULL.email);
    expect(val("h2")).toBe("");
  });

  it("honeypot: tabindex=-1 off-screen with transform / em units is not filled", async () => {
    mount(`<form id="f"><label for="em">Email</label><input id="em" type="email">
      <div style="position:absolute; transform: translateX(-10000px)"><label for="h3">Email</label><input id="h3" type="email" tabindex="-1"></div>
      <div style="position:absolute; left:-999em"><label for="h4">Phone</label><input id="h4" type="tel" tabindex="-1"></div>${SUBMIT}</form>`);
    await run();
    expect(val("em")).toBe(FULL.email);
    expect([val("h3"), val("h4")]).toEqual(["", ""]);
  });

  it("honeypot: tabindex=-1 off-screen with left:-10000px is not filled", async () => {
    mount(`<form id="f"><label for="em">Email</label><input id="em" type="email">
      <div style="position:absolute; left:-10000px"><label for="h5">Email</label><input id="h5" type="email" tabindex="-1"></div>${SUBMIT}</form>`);
    await run();
    expect(val("h5")).toBe("");
  });

  it("honeypot: a hidden 'url' field and a small-offset 'url' trap stay empty", async () => {
    mount(`<form id="f"><label for="em">Email</label><input id="em" type="email">
      <p style="display:none"><input id="u1" name="url"></p>
      <input id="u2" name="url" tabindex="-1" autocomplete="off" style="position:absolute; left:-200px">${SUBMIT}</form>`);
    await run();
    expect([val("u1"), val("u2")]).toEqual(["", ""]);
  });

  it("read-only and disabled pre-filled fields are left alone", async () => {
    mount(`<form id="f"><label for="r">Email</label><input id="r" type="email" readonly value="old@corp.com">
      <label for="d">First name</label><input id="d" disabled value="ASHA X">${SUBMIT}</form>`);
    await run();
    expect([val("r"), val("d")]).toEqual(["old@corp.com", "ASHA X"]);
  });

  it("radio buttons without a name in one fieldset are one question with two options", () => {
    mount(`<form id="f"><fieldset><legend>Are you willing to relocate?</legend>
      <label><input type="radio" value="Yes"> Yes</label><label><input type="radio" value="No"> No</label></fieldset>${SUBMIT}</form>`);
    const fields = extractFields(document.getElementById("f")!).map((f) => f.descriptor);
    expect(fields.map((f) => [f.label, f.options])).toEqual([["Are you willing to relocate?", ["Yes", "No"]]]);
  });

  it("unnamed radios: a run never ticks both Yes and No", async () => {
    mount(`<form id="f"><fieldset><legend>Are you willing to relocate?</legend>
      <label><input id="y" type="radio" value="Yes"> Yes</label><label><input id="n" type="radio" value="No"> No</label></fieldset>${SUBMIT}</form>`);
    await run();
    const y = (document.getElementById("y") as HTMLInputElement).checked;
    const n = (document.getElementById("n") as HTMLInputElement).checked;
    expect(y && n).toBe(false);
  });

  it("a select with only a placeholder option: no crash, nothing claimed as filled", async () => {
    mount(`<form id="f"><label for="s">Country</label><select id="s" required><option value="">Select...</option></select>${SUBMIT}</form>`);
    expect(extractFields(document.getElementById("f")!)[0]!.descriptor.options).toEqual([]);
    const report = await run();
    expect(report.fields.find((r) => r.field.label === "Country")?.status).not.toBe("filled");
  });

  it("a 2,000-character declaration label: read quickly, not filled", async () => {
    const long = `${"I confirm that the information I have provided is accurate and complete to the best of my knowledge. ".repeat(20)}Full name`.slice(-2000);
    mount(`<form id="f"><label for="z">${long}</label><input id="z">${SUBMIT}</form>`);
    const t0 = performance.now();
    await run();
    expect(performance.now() - t0).toBeLessThan(2000);
    expect(val("z")).toBe("");
  });
});

describe("i) catastrophic backtracking: decide() stays fast on hostile labels", () => {
  const hostile: Array<[string, string]> = [
    ["2,000-char prose", "Please tell us about yourself and your experience with the role ".repeat(32).slice(0, 2000)],
    ["50 repeated words 'name'", Array(50).fill("name").join(" ")],
    ["50 repeated 'if you'", Array(50).fill("if you").join(" ")],
    ["50 repeated 'experience with'", Array(50).fill("experience with").join(" ")],
    ["50 repeated 'years of'", Array(50).fill("years of").join(" ")],
    ["50 repeated 'without'", `Are you authorized to work in the US ${Array(50).fill("without").join(" ")}`],
    ["5,000 spaces then name", `${" ".repeat(5000)}Full name`],
    ["4,000 underscores", "_".repeat(4000)],
    ["2,000 'a' chars no spaces", "a".repeat(2000)],
    ["long almost-match first name and", `${"first name and ".repeat(130)}x`],
  ];
  for (const [what, label] of hostile) {
    it(what, () => {
      const t0 = performance.now();
      for (const control of ["text", "select", "email"] as const) {
        decide(field(label, control), FULL, [], US);
        for (const intent of head.classes) decideWithMeaning(field(label, control), FULL, [], US, { intent, confidence: 0.99 });
      }
      expect(performance.now() - t0).toBeLessThan(500);
    });
  }
});

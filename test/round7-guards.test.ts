// Round 7: the wrong fills the worldwide check found on real Greenhouse forms, each kept as a test. The last check on
// every decision asks instead of forcing a saved fact where it does not fit.
import { describe, expect, it } from "vitest";
import { decideWithMeaning } from "../src/content/meaning";
import type { FieldDescriptor } from "../src/shared/types";
import { FULL } from "./eval-common";

const field = (label: string, extra: Partial<FieldDescriptor> = {}): FieldDescriptor =>
  ({ key: "k", label, control: "text", required: true, options: [], name: "", autocomplete: "", placeholder: "", ...extra }) as FieldDescriptor;
const yn = { control: "select" as const, options: ["Yes", "No"] };
const decide = (f: FieldDescriptor) => decideWithMeaning(f, FULL, [], { jobCountries: ["India"], url: "https://job-boards.greenhouse.io/acme/jobs/1" });
const filled = (f: FieldDescriptor) => {
  const d = decide(f);
  return "value" in d ? d.value : undefined;
};

describe("wrong fills found worldwide, now asked", () => {
  it.each([
    field("Alternative Email"),
    field("Secondary email address"),
    field("Do you have caregiving responsibilities* such as childcare, eldercare or disability care?", yn),
    field("Are you happy and comfortable being out in the field 3 days a week?", yn),
    field("Email me about other job openings within the Booking Holding’s entities and recruitment-related newsletters", yn),
    field("For pre-college applicants, please specify your grade level and school name"),
    field("How many clients do you manage in your portfolio?", { control: "select", options: ["0-50", "50-100", "100-500"] }),
    field("If you're less than 3 years out of school, what is your undergraduate GPA?"),
    field("Location Cost Tier", { control: "select", options: ["High Cost", "Mid Cost", "Low Cost", "Unknown"] }),
    field("Which country in the United Kingdom do you reside in?", { control: "select", options: ["England", "Scotland", "Wales", "Northern Ireland"] }),
    field("Which University are you graduating from?", { control: "select", options: ["Habib University", "LUMS", "NUST"] }),
  ])("$label", (f) => {
    expect(filled(f)).toBeUndefined();
  });
});

describe("still filled", () => {
  it("a courtesy 'if you're happy to' is not a condition", () => {
    expect(filled(field("If you're happy, please share a link to your GitHub profile"))).toBe("https://github.com/asha");
    expect(filled(field("If applicable, please share your portfolio"))).toBe("https://asha.dev");
  });
  it("the email box and a listed country are unchanged", () => {
    expect(filled(field("Email", { control: "email" }))).toBe(FULL.email);
    expect(filled(field("Country", { control: "select", options: ["Germany", "India", "United States"] }))).toBe("India");
  });
});

describe("language level on the form's own scale", () => {
  it("fluent English is 'Advanced' on a three-step list, and never a level the user does not have", () => {
    expect(filled(field("What is your proficiency in English speaking?", { control: "select", options: ["Beginner", "Intermediate", "Advance"] }))).toBe("Advance");
    expect(filled(field("What is your proficiency in Hindi?", { control: "select", options: ["Beginner", "Intermediate", "Advance"] }))).toBeUndefined(); // native: not on this list
    expect(filled(field("What is your level of English?", { control: "select", options: ["A1 – Principiante", "A2 – Básico", "B1 – Intermedio", "B2 – Intermedio alto", "C1 – Avanzado", "C2 – Nativo"] }))).toBe("C1 – Avanzado");
  });
});

describe("more of the user's own facts, found worldwide", () => {
  const US_STATES = ["Alabama", "Alaska", "Arizona", "California", "Not in the US"];
  it("the option for people outside a country, only when the Profile country is clearly another", () => {
    expect(filled(field("Please select your current state of residence. Select “Not in the US” if you reside outside the United States.", { control: "select", options: US_STATES }))).toBe("Not in the US");
    expect(filled(field("Please select your current province of residence. Select “Not in Canada” if you reside outside of Canada.", { control: "select", options: ["Alberta", "Ontario", "Not in Canada"] }))).toBe("Not in Canada");
    expect(filled(field("Please select your current city of residence. Select “Not in England” if you reside outside of England.", { control: "select", options: ["Bath", "Leeds", "Not in England"] }))).toBe("Not in England");
    const inUk = decideWithMeaning(field("Please select your current city of residence. Select “Not in England” if you reside outside of England.", { control: "select", options: ["Bath", "Leeds", "Not in England"] }), { ...FULL, country: "United Kingdom", location: "Edinburgh" }, []);
    expect("value" in inUk ? inUk.value : undefined).toBeUndefined(); // may live in England or not: asked
    expect(filled(field("Which office would you like to work from?", { control: "select", options: ["Denver", "Not in the US"] }))).toBeUndefined();
  });
  it("state in other words, and highest completed education", () => {
    expect(filled(field("Province/State"))).toBe(FULL.state);
    expect(filled(field("What state are you currently located in?"))).toBe(FULL.state);
    expect(filled(field("What state do you currently reside in?", { control: "select", options: ["Alabama", "Alaska"] }))).toBeUndefined();
    expect(filled(field("What is your highest level of completed education?", { control: "select", options: ["Associate's Degree", "Bachelor’s Degree", "Master’s Degree", "Doctoral Degree"] }))).toBe("Master’s Degree");
  });
});

describe("more wrong fills found on 222 boards worldwide, now asked", () => {
  it.each([
    field("Are you comfortable using Python to control lab equipment (e.g., oscilloscopes, spectrum analyzers) via PyVISA or SCPI?", yn),
    field("This role requires working from our London office four days a week. Can you accommodate this hybrid schedule?", yn),
    field("Can you perform all of the essential functions of this role with or without reasonable accommodations?", yn),
    field("Are you currently, or have you ever been employed by the U.S. Government in either a civilian or military capacity?", yn),
    field("Em qual empresa você está trabalhando atualmente? (por favor, insira o nome completo da empresa)"),
    field("Full Legal Name in Native Language (e.g. Chinese Characters, Cyrillic, Farsi etc)"),
    field("What is your current Cost to Company?"),
    field("Highest qualification and year of passing"),
    field("What month/year did you graduate with your bachelor's degree?"),
    field("Qual é o seu endereço completo com CEP?"),
    field("Where are you located? (State/Province & Country)"),
    field("Please use this space to note any questions regarding the compensation range for this role."),
    field("Were you familiar with NiCE before applying for this role? If so, how did you hear about NiCE, and what did you know about the company?"),
  ])("$label", (f) => {
    expect(filled(f)).toBeUndefined();
  });
  it("other-language questions about permits and accessibility are still answered", () => {
    expect(filled(field("As-tu déjà le droit de travailler en Inde (citoyenneté, résidence permanente ou permis de travail)?", yn))).toBeDefined();
  });
});

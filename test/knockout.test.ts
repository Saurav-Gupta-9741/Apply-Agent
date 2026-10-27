/** Knockout and screening questions that employers put on application forms (licences, clearances, background checks,
 * shifts, minimum experience…), gathered from ATS documentation and recruiting guides. Only the applicant knows these
 * answers: whatever the local model reads into them — even a wrong reading at 99% confidence — nothing from the
 * profile or the quick answers may be filled. */

import { describe, expect, it } from "vitest";
import { decideWithMeaning } from "../src/content/meaning";
import type { FieldDescriptor, Profile } from "../src/shared/types";
import { PROFILE } from "./fixtures";
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

export const KNOCKOUT = [
  "Do you have a valid driver's license?",
  "Do you currently hold a commercial driver's license (CDL)?",
  "Do you have access to reliable transportation?",
  "Do you own a vehicle?",
  "Are you able to work weekends and holidays?",
  "Are you available to work night shifts?",
  "Are you available to work 12-hour rotating shifts?",
  "Can you lift up to 50 pounds?",
  "Are you able to stand for 8 hours a day?",
  "Are you at least 18 years of age?",
  "Are you 21 years of age or older?",
  "Have you ever been convicted of a felony?",
  "Have you been convicted of a crime in the last seven years?",
  "Are you willing to undergo a background check?",
  "Are you willing to submit to a pre-employment drug screening?",
  "Do you hold an active Secret or Top Secret security clearance?",
  "Are you eligible to obtain a government security clearance?",
  "Are you a U.S. citizen?",
  "Do you have at least 5 years of experience with Kubernetes?",
  "Do you have experience with Salesforce CPQ?",
  "How many years of experience do you have with React?",
  "Rate your proficiency in SQL from 1 to 5",
  "Do you hold an active CPA license?",
  "Are you a licensed Professional Engineer (PE)?",
  "Do you hold a valid nursing license in the state of Texas?",
  "Do you have a current AWS certification?",
  "Are you fluent in German?",
  "Can you read and write Japanese at a business level?",
  "Are you related to anyone currently employed by the company?",
  "Do you have any relatives working at this company? If yes, please name them.",
  "Are you bound by a non-compete or non-solicitation agreement?",
  "Have you ever been terminated or asked to resign from a job?",
  "Have you applied to this company in the past 12 months?",
  "Have you ever worked for a government entity?",
  "Are you currently a member of a union?",
  "What is your cumulative GPA?",
  "What was your SAT score?",
  "Can you start within two weeks?",
  "Are you comfortable working in a fast-paced startup environment?",
  "Are you comfortable with a role that is 100% commission based?",
  "Are you willing to work from our office five days a week?",
  "Do you currently reside within 50 miles of Austin, TX?",
  "Is your current employer aware of your application?",
  "Do you have a passport valid for international travel?",
  "Have you ever served in the armed forces of another country?",
  "Do you have a home office with a stable internet connection of at least 50 Mbps?",
  "Are you able to provide three professional references?",
  "Are you currently enrolled in a degree program?",
  "Will you be graduating before June 2027?",
  "Please explain any gaps in your employment history.",
];

const asChoice = (label: string): FieldDescriptor => ({
  key: "k", label, control: "select", required: true, options: ["Yes", "No"], name: "", autocomplete: "", placeholder: "",
});
const asText = (label: string): FieldDescriptor => ({ ...asChoice(label), control: "text", options: [] });

describe("knockout questions are the applicant's to answer, whatever the model reads", () => {
  for (const label of KNOCKOUT) {
    it(label, () => {
      const wrong: string[] = [];
      for (const field of [asChoice(label), asText(label)]) {
        for (const intent of [undefined, ...head.classes]) {
          const decision = decideWithMeaning(field, FULL, [], { jobCountries: ["United States"] }, intent ? { intent, confidence: 0.99 } : undefined);
          if (decision.kind === "profile" || decision.kind === "answer" || decision.kind === "work") {
            wrong.push(`${field.control} as ${intent ?? "(rules)"} → ${decision.value}`);
          }
        }
      }
      expect(wrong).toEqual([]);
    });
  }
});

/** Declarations that ask for a typed name are a signature: the applicant types it, never the agent. */
const DECLARATIONS = [
  "By typing your full name below, you certify that the information provided in this application is true and complete.",
  "Electronic signature (type your full legal name)",
  "I hereby declare that all statements made in this application are true. Please type your name to confirm.",
  "Type your name and today's date to acknowledge the Applicant Privacy Notice.",
  "Digital Signature",
  "Signature: please enter your full name as it appears on official documents",
  "Applicant's typed name serves as signature",
];

describe("signatures: a typed-name declaration is never filled, whatever the model reads", () => {
  for (const label of DECLARATIONS) {
    it(label, () => {
      const filled: string[] = [];
      for (const intent of [undefined, ...head.classes]) {
        const decision = decideWithMeaning(asText(label), FULL, [], undefined, intent ? { intent, confidence: 0.99 } : undefined);
        if (decision.kind === "profile" || decision.kind === "answer" || decision.kind === "work") filled.push(`${intent ?? "(rules)"} → ${decision.value}`);
      }
      expect(filled).toEqual([]);
    });
  }
});

/** The model reads English. On questions in other languages it may only ever agree with the rules (which cover seven
 * languages) or make ApplyAgent ask: never fill something the rules did not. */
const OTHER_LANGUAGES = [
  "Vorname", "Nachname", "E-Mail-Adresse", "Wie haben Sie von uns erfahren?", "Kündigungsfrist", "Gehaltsvorstellung",
  "Prénom", "Nom de famille", "Comment avez-vous entendu parler de nous ?", "Prétentions salariales", "Disponibilité",
  "Nombre", "Apellidos", "¿Cómo te enteraste de esta vacante?", "Expectativa salarial", "Nome", "Cognome",
  "Hoe heb je over deze vacature gehoord?", "आपका नाम", "お名前", "Führerschein Klasse B vorhanden?", "Permis de conduire ?",
];

describe("other languages: the model never adds a fill the rules would not make", () => {
  for (const label of OTHER_LANGUAGES) {
    it(label, () => {
      for (const field of [asText(label), asChoice(label)]) {
        const rule = decideWithMeaning(field, FULL, [], undefined);
        const ruleFilled = rule.kind === "profile" || rule.kind === "answer";
        for (const intent of head.classes) {
          const d = decideWithMeaning(field, FULL, [], undefined, { intent, confidence: 0.99 });
          if (d.kind === "profile" || d.kind === "answer") {
            expect(ruleFilled, `${field.control} as ${intent} → ${d.value}`).toBe(true);
            expect(d.value).toBe((rule as { value: string }).value);
          }
        }
      }
    });
  }
});

describe("labels with nothing to read", () => {
  for (const label of ["", " ", "*", "—", "1.", "Question 7", "Field_23", "undefined", "null", "Please select", "Other", "Additional information"]) {
    it(JSON.stringify(label), () => {
      for (const intent of head.classes) {
        const d = decideWithMeaning(asText(label), FULL, [], undefined, { intent, confidence: 0.99 });
        expect(["profile", "answer", "work"].includes(d.kind), `${intent} → ${"value" in d ? d.value : ""}`).toBe(false);
      }
    });
  }
});

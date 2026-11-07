// Which boxes get an AI draft: only real essay questions. Wordings from real Greenhouse forms (round 7).
import { describe, expect, it } from "vitest";
import { isDraftableField } from "../src/sidepanel/drafts";

const ta = (label: string) => isDraftableField({ control: "textarea", label });
const tx = (label: string) => isDraftableField({ control: "text", label });

describe("AI drafts only for essay questions", () => {
  it.each([
    "Why do you want to work at Northwind?",
    "Tell us about a project you are proud of. (~100 words or less)",
    "Describe a time you had to make a decision with incomplete data.",
    "Briefly describe your experience designing quasi-experimental studies in school or program settings.",
    "Have you spent a min of 2 years working in CS or Sales in a SaaS environment? If yes, please briefly describe your experience.",
    "What excites you about this role? Answer in 2-3 sentences.",
    "Please share what you believe to be your key strengths and specific skills that would be valuable to a future employer?",
    "What does great customer success look like to you?",
    "Cover letter",
    "¿Por qué quieres trabajar en Northwind?",
  ])("essay box: %s", (label) => expect(ta(label)).toBe(true));

  it.each([
    "Please share 3-5 sentences explaining your interest in the Blockchain/Web3 industry.",
    "Why do you want to join Acme?",
    "Tell us about a time you led a project.",
  ])("one-line essay: %s", (label) => expect(tx(label)).toBe(true));

  it.each([
    "What annual base salary and/or range (USD) are you targeting for your next role?",
    "Will you now or in the future require sponsorship of an employment visa?",
    "Are you legally authorized to work for any employer in this country?",
    "If yes, what type of visa/work permit/passport do you currently hold to allow you to work and live in Brazil?",
    "What is your earliest possible start date/notice period?",
    "What is your earliest start date?(mm/dd/yyyy)",
    "Please share the direct link to your portfolio.",
    "LinkedIn Profile / Website",
    "Website/Portfolio/Github etc:",
    "How did you hear about Lattice?",
    "If you'd like to share, what are your pronouns?",
    "Do you have any family members currently working at VTEX? If so, please list their names and their positions.",
    "Are you comfortable working onsite in either our New York City office (preferred) or our San Mateo office?",
    "Are you able to attend in-person company offsites twice a year? If not, please elaborate on why.",
    "Do you have 5+ years of experience in Customer Success or Account Management?",
    "Do you have any SaaS or software sales experience? If so, how many years and in which company?",
    "Current Job Title",
    "Which is your current location?",
    "If yes, please describe:",
    "If (f) Other, please explain:",
    "Please use this space to note any questions regarding the compensation range for this role.",
  ])("not an essay: %s", (label) => expect(ta(label)).toBe(false));

  it.each(["Please share your current location", "Please share your LinkedIn profile URL", "Please share your expected salary for this position", "First name"])(
    "one-line fact: %s", (label) => expect(tx(label)).toBe(false));

  it("never for choices, secrets or uploads", () => {
    expect(isDraftableField({ control: "select", label: "Why do you want to join?", options: ["A", "B"] })).toBe(false);
    expect(isDraftableField({ control: "file", label: "Cover letter" })).toBe(false);
    expect(isDraftableField({ control: "textarea", label: "Why us?", name: "email" })).toBe(false);
  });
});

/** Shared by the automation evaluations: the full test profile and how a decision is scored. */
import type { Decision, Profile } from "../src/shared/types";
import { PROFILE } from "./fixtures";

export const FULL: Profile = {
  ...PROFILE,
  location: "Pune",
  country: "India",
  address: "123 Main St, Apt 4B",
  postalCode: "411001",
  state: "Maharashtra",
  educationLevel: "Master's Degree",
  timezone: "IST",
  github: "https://github.com/asha",
  portfolio: "https://asha.dev",
  currentCompany: "Initech",
  currentTitle: "Data Analyst",
  school: "IIT Jodhpur",
  degree: "Master's Degree",
  discipline: "Computer Science",
  graduationYear: "2026",
  experienceYears: "2",
  workHistoryComplete: true,
  preferredLocations: "Bangalore, Remote, Pune",
  skills: "Python, SQL, Machine Learning, Power BI, Excel, Product Design, CRM, B2B SaaS",
  skillsInventory: [
    { name: "Python", years: 2, level: "Advanced" },
    { name: "SQL", years: 2, level: "Advanced" },
    { name: "Excel", years: 2, level: "Advanced" },
    { name: "Power BI", years: 2, level: "Intermediate" },
    { name: "CRM", years: 2, level: "Intermediate" },
    { name: "Product Design", years: 2, level: "Intermediate" },
    { name: "B2B SaaS", years: 2, level: "Intermediate" },
    { name: "Salesforce", years: 2, level: "Intermediate" },
    { name: "Jira", years: 2, level: "Intermediate" },
    { name: "AI", years: 2, level: "Advanced" },
    { name: "Customer Success", years: 2, level: "Intermediate" },
    { name: "Open Source", years: 2, level: "Intermediate" },
  ],
  languages: [
    { language: "English", proficiency: "Fluent" },
    { language: "Hindi", proficiency: "Native" },
  ],
  facts: {
    workCountries: "India",
    unauthorizedCountries: "United States, United Kingdom, Germany, Canada",
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
    workMode: "any",
    travel: "Yes",
    needsAccommodation: "No",
    pronouns: "she/her",
    sexualOrientation: "Decline",
    transgender: "No",
    over18: "Yes",
    age: "24",
  },
};

export const QUICK: Record<string, string> = {
  "work authorization": "work_authorization",
  sponsorship: "sponsorship",
  "notice period": "notice_period",
  "current CTC": "salary_current",
  "expected CTC": "salary_expected",
  relocation: "relocation",
  "how you heard": "heard_about",
  gender: "gender",
  "Hispanic/Latino": "hispanic",
  "race/ethnicity": "race",
  "veteran status": "veteran",
  disability: "disability",
  "previous employer": "previous_employee",
  onsite: "onsite",
  pronouns: "pronouns",
  "sexual orientation": "sexual_orientation",
  transgender: "transgender",
  age: "age",
  "over 18": "age",
  accommodation: "accommodation",
  travel: "travel",
  language: "language_proficiency",
  skills: "skills_experience",
  "where you live": "residence",
  // Live run 2026-11-08 additions.
  "where you live (outside the US)": "residence",
  "notice period (start year)": "notice_period",
  "notice period (start month)": "notice_period",
  "expected salary abroad": "salary_expected",
};
const WORK: Record<string, string> = {
  title: "currentTitle",
  company: "currentCompany",
  location: "location",
  start: "work_dates",
  end: "work_dates",
};

export function filledAs(d: Decision): string | undefined {
  if (d.kind === "profile") {
    if (d.key === "preferredLocations") return "location";
    if (d.key === "postalCode") return "postal_code";
    if (d.key === "educationLevel") return "education_level";
    if (d.key === "addressLine1" || d.key === "addressLine2") return "address";
    return d.key;
  }
  if (d.kind === "resume") return "resume";
  if (d.kind === "work") return WORK[d.part] ?? d.part;
  if (d.kind === "answer") return d.question.startsWith("Quick answers › ") ? QUICK[d.question.slice(16)] ?? "?" : "saved answer";
  return undefined;
}

export const HUMAN_ONLY_INTENTS = new Set(["consent", "legal_declaration", "signature", "identity"]);

/** A fill is right when it answers the labelled meaning. The labels have no "where do you live?" class: those
 * questions carry "other" or "location" (their values are checked one by one in test/factsheet.test.ts). */
export function rightFill(as: string, intent: string, label: string): boolean {
  return as === intent || (as === "fullName" && intent === "firstName" && /preferred/i.test(label))
    || (as === "residence" && ["other", "location", "state", "country"].includes(intent))
    || (as === "degree" && intent === "education_level") || (as === "education_level" && intent === "degree")
    // "Within commuting distance or willing to relocate?": the user's relocation answer is a right answer.
    || (as === "relocation" && ["onsite", "other"].includes(intent) && /relocat/i.test(label))
    // "Website / GitHub", "Additional profiles (e.g. GitHub, Stack Overflow)": a link the question names is a right answer.
    || (["github", "linkedin", "portfolio"].includes(as) && (intent === "portfolio" || intent === "other_links" || intent === "github")
      && new RegExp(as === "portfolio" ? "website|portfolio" : as === "github" ? "git ?hub" : "linked ?in", "i").test(label));
}

import type { Profile } from "../../src/shared/types";
import { EMPTY_PROFILE } from "../../src/shared/storage";

/**
 * Persona A: Fresher Data Analyst in Pune
 * - Skills: Python 2y, SQL 2y, Excel 2y, Power BI 1y.
 * - Hybrid, travel 10%, max office days: 3.
 * - English (Fluent), Hindi (Native).
 * - Empty work history.
 * - Lists are NOT marked complete (skillsComplete: false, languagesComplete: false, workHistoryComplete: false).
 */
export const PERSONA_A: Profile = {
  ...EMPTY_PROFILE,
  firstName: "Asha",
  lastName: "Verma",
  email: "asha@example.com",
  phone: "+91 90000 00000",
  location: "Pune",
  country: "India",
  preferredLocations: "Pune, Bangalore, Remote",
  address: "12 MG Road, Pune 411001",
  addressLine1: "12 MG Road",
  addressLine2: "",
  postalCode: "411001",
  state: "Maharashtra",
  educationLevel: "Bachelor's Degree",
  degree: "Bachelor of Technology",
  school: "Pune University",
  discipline: "Computer Science",
  graduationYear: "2024",
  experienceYears: "2",
  skills: "Python, SQL, Excel, Power BI",
  skillsInventory: [
    { name: "Python", years: 2, level: "Intermediate" },
    { name: "SQL", years: 2, level: "Intermediate" },
    { name: "Excel", years: 2, level: "Advanced" },
    { name: "Power BI", years: 1, level: "Intermediate" },
  ],
  skillsComplete: false,
  languages: [
    { language: "English", proficiency: "Fluent" },
    { language: "Hindi", proficiency: "Native" },
  ],
  languagesComplete: false,
  workHistory: [],
  workHistoryComplete: false,
  currentCompany: "",
  currentTitle: "",
  facts: {
    workCountries: "India",
    noticePeriod: "Immediate",
    currentCtc: "",
    expectedCtc: "8 LPA",
    relocate: "No",
    heardFrom: "LinkedIn",
    gender: "Female",
    hispanic: "No",
    race: "Asian",
    veteran: "No",
    disability: "No",
    workMode: "hybrid",
    maxOfficeDays: 3,
    travel: "Yes",
    travelPercent: "10%",
    needsAccommodation: "No",
    pronouns: "She/Her",
    over18: "Yes",
    age: "22",
  },
};

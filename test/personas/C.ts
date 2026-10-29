import type { Profile } from "../../src/shared/types";
import { EMPTY_PROFILE } from "../../src/shared/storage";

/**
 * Persona C: Marketing Manager in Mumbai
 * - 8 years experience.
 * - Skills: Marketing 8y, SEO 6y, Content Strategy 5y.
 * - Onsite only, travel 50%, max office days: 5.
 * - English (Fluent).
 * - Complete work history: Acme Media.
 * - ALL lists marked complete (skillsComplete: true, languagesComplete: true, workHistoryComplete: true).
 */
export const PERSONA_C: Profile = {
  ...EMPTY_PROFILE,
  firstName: "Priya",
  lastName: "Nair",
  email: "priya@example.com",
  phone: "+91 97777 77777",
  location: "Mumbai",
  country: "India",
  preferredLocations: "Mumbai",
  address: "78 Marine Drive, Churchgate",
  addressLine1: "78 Marine Drive",
  addressLine2: "",
  postalCode: "400020",
  state: "Maharashtra",
  educationLevel: "Bachelor's Degree",
  degree: "Bachelor of Arts",
  school: "Mumbai University",
  discipline: "Mass Communication",
  graduationYear: "2016",
  experienceYears: "8",
  skills: "Marketing, SEO, Content Strategy",
  skillsInventory: [
    { name: "Marketing", years: 8, level: "Expert" },
    { name: "SEO", years: 6, level: "Advanced" },
    { name: "Content Strategy", years: 5, level: "Advanced" },
  ],
  skillsComplete: true,
  languages: [
    { language: "English", proficiency: "Fluent" },
  ],
  languagesComplete: true,
  workHistory: [
    {
      title: "Marketing Manager",
      company: "Acme Media",
      location: "Mumbai",
      start: "2018-04",
      end: "Present",
      current: true,
      summary: "Brand campaigns, SEO, and content marketing.",
    },
  ],
  workHistoryComplete: true,
  currentCompany: "Acme Media",
  currentTitle: "Marketing Manager",
  facts: {
    workCountries: "India",
    noticePeriod: "60 days",
    currentCtc: "18 LPA",
    expectedCtc: "24 LPA",
    relocate: "No",
    heardFrom: "Company website",
    gender: "Female",
    hispanic: "No",
    race: "Asian",
    veteran: "No",
    disability: "No",
    workMode: "onsite",
    maxOfficeDays: 5,
    travel: "Yes",
    travelPercent: "50%",
    needsAccommodation: "No",
    pronouns: "She/Her",
    over18: "Yes",
    age: "30",
  },
};

import type { Profile } from "../../src/shared/types";
import { EMPTY_PROFILE } from "../../src/shared/storage";

/**
 * Persona B: Senior Software Engineer in Bangalore
 * - 5 years experience, needs US sponsorship.
 * - Skills: Java 5y, Go 3y, React 2y.
 * - Remote only, travel 0%, max office days: 0.
 * - English (Fluent), Kannada (Native).
 * - Complete work history: Infosys, Flipkart (workHistoryComplete: true).
 * - Skills & languages are NOT marked complete.
 */
export const PERSONA_B: Profile = {
  ...EMPTY_PROFILE,
  firstName: "Rohan",
  lastName: "Sharma",
  email: "rohan@example.com",
  phone: "+91 98888 88888",
  location: "Bangalore",
  country: "India",
  preferredLocations: "Bangalore, Remote",
  address: "456 Tech Park Road, Whitefield",
  addressLine1: "456 Tech Park Road",
  addressLine2: "Tower B, Apt 304",
  postalCode: "560100",
  state: "Karnataka",
  educationLevel: "Master's Degree",
  degree: "Master of Technology",
  school: "IISc Bangalore",
  discipline: "Computer Science",
  graduationYear: "2019",
  experienceYears: "5",
  skills: "Java, Go, React",
  skillsInventory: [
    { name: "Java", years: 5, level: "Advanced" },
    { name: "Go", years: 3, level: "Advanced" },
    { name: "React", years: 2, level: "Intermediate" },
  ],
  skillsComplete: false,
  languages: [
    { language: "English", proficiency: "Fluent" },
    { language: "Kannada", proficiency: "Native" },
  ],
  languagesComplete: false,
  workHistory: [
    {
      title: "Senior Software Engineer",
      company: "Flipkart",
      location: "Bangalore",
      start: "2023-01",
      end: "Present",
      current: true,
      summary: "Distributed backend systems in Go and Java.",
    },
    {
      title: "Software Engineer",
      company: "Infosys",
      location: "Bangalore",
      start: "2019-07",
      end: "2022-12",
      current: false,
      summary: "Full stack web development with Java and React.",
    },
  ],
  workHistoryComplete: true,
  currentCompany: "Flipkart",
  currentTitle: "Senior Software Engineer",
  facts: {
    workCountries: "India",
    noticePeriod: "30 days",
    currentCtc: "25 LPA",
    expectedCtc: "35 LPA",
    relocate: "Yes",
    heardFrom: "LinkedIn",
    gender: "Male",
    hispanic: "No",
    race: "Asian",
    veteran: "No",
    disability: "No",
    workMode: "remote",
    maxOfficeDays: 0,
    travel: "No",
    travelPercent: "0%",
    needsAccommodation: "No",
    pronouns: "He/Him",
    over18: "Yes",
    age: "27",
  },
};

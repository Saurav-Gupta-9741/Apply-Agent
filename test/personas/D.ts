import type { Profile } from "../../src/shared/types";
import { EMPTY_PROFILE } from "../../src/shared/storage";

/**
 * Persona D: US-based citizen, Product Designer in Austin, Texas. FROZEN for the value benchmark
 * (reports/value-benchmark): changing any value here invalidates human labels for this persona.
 * - US citizen: may work in the United States without sponsorship, now and in future.
 * - 6 years experience. Skills: Figma 6y, User Research 5y, Prototyping 6y, HTML/CSS 3y.
 * - Hybrid, max office days 2, travel 10%.
 * - English (Native), Spanish (Conversational).
 * - Notice 2 weeks. Salary in USD.
 * - EEO: declines race/ethnicity, sexual orientation and disability; answers gender, Hispanic, veteran.
 * - Lists marked complete.
 */
export const PERSONA_D: Profile = {
  ...EMPTY_PROFILE,
  firstName: "Jordan",
  lastName: "Miller",
  email: "jordan.miller@example.com",
  phone: "+1 512 555 0142",
  location: "Austin, TX",
  country: "United States",
  preferredLocations: "Austin, Remote",
  address: "500 Congress Ave, Apt 12, Austin, TX 78701",
  addressLine1: "500 Congress Ave",
  addressLine2: "Apt 12",
  postalCode: "78701",
  state: "Texas",
  timezone: "CST",
  linkedin: "https://www.linkedin.com/in/jordan-miller-design",
  github: "",
  portfolio: "https://jordanmiller.design",
  educationLevel: "Bachelor's Degree",
  degree: "Bachelor of Fine Arts",
  school: "University of Texas at Austin",
  discipline: "Design",
  graduationYear: "2018",
  experienceYears: "6",
  targetRoles: "Product Designer, UX Designer",
  skills: "Figma, User Research, Prototyping, HTML, CSS",
  skillsInventory: [
    { name: "Figma", years: 6, level: "Expert" },
    { name: "User Research", years: 5, level: "Advanced" },
    { name: "Prototyping", years: 6, level: "Advanced" },
    { name: "HTML", years: 3, level: "Intermediate" },
    { name: "CSS", years: 3, level: "Intermediate" },
  ],
  skillsComplete: true,
  languages: [
    { language: "English", proficiency: "Native" },
    { language: "Spanish", proficiency: "Conversational" },
  ],
  languagesComplete: true,
  workHistory: [
    {
      title: "Senior Product Designer",
      company: "Lone Star Health",
      location: "Austin, TX",
      start: "2021-06",
      end: "Present",
      current: true,
      summary: "Design system and patient app.",
    },
    {
      title: "Product Designer",
      company: "Bluebonnet Labs",
      location: "Austin, TX",
      start: "2018-07",
      end: "2021-05",
      current: false,
      summary: "B2B dashboards.",
    },
  ],
  workHistoryComplete: true,
  currentCompany: "Lone Star Health",
  currentTitle: "Senior Product Designer",
  facts: {
    workCountries: "United States",
    needsFutureSponsorship: "No",
    noticePeriod: "2 weeks",
    currentCtc: "USD 135,000",
    expectedCtc: "USD 150,000",
    relocate: "No",
    heardFrom: "LinkedIn",
    gender: "Male",
    hispanic: "No",
    race: "Decline",
    veteran: "No",
    disability: "Decline",
    workMode: "hybrid",
    maxOfficeDays: 2,
    travel: "Yes",
    travelPercent: "10%",
    needsAccommodation: "No",
    pronouns: "He/Him",
    sexualOrientation: "Decline",
    transgender: "No",
    over18: "Yes",
    age: "30",
  },
};

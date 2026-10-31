/** Comprehensive evaluation across 7 diverse personas and tricky adversarial traps.
 * 
 * Personas:
 * 1. US Tech Worker (needs H1B transfer, USD salary in $k, W2 preference)
 * 2. Senior Engineering Lead in India (90 days notice, INR LPA CTC split, immediate buyout discussion)
 * 3. UK/EU Designer (GBP/EUR salary, 3 month notice period, right to work in UK)
 * 4. Early Career Intern / Fresher (0 YOE, Graduation year 2025/2026, 0 days notice)
 * 5. Remote Contractor (Timezone GMT+5:30 / UTC, B2B contractor rate)
 * 6. Career Transitioner (Gap year explanation, bootcamp graduate)
 * 7. Executive / Director (Board references, equity questions)
 * 
 * Traps:
 * - Questions with both "Current" and "Expected" in label or parent container
 * - Ambiguous options: "Yes, currently employed" vs "Yes, available immediately"
 * - Notice period conversions (90 days <-> 3 months, 14 days <-> 2 weeks)
 * - Honeypot spam traps (hidden, opacity 0, "leave this field empty")
 * - Legal authorization vs sponsorship radio / checkbox questions
 */

import { describe, expect, it } from "vitest";
import { decide, profileKeyFor, sensitiveTopic } from "../src/content/classify";
import { decideWithMeaning } from "../src/content/meaning";
import { extractFields } from "../src/content/extract";
import { factDecision, matchNoticeOption, parseNoticeDays } from "../src/content/facts";
import { mount } from "./fixtures";
import type { FieldDescriptor, Profile } from "../src/shared/types";
import { EMPTY_PROFILE } from "../src/shared/storage";

// ============================================================================
// 1. PERSONA DEFINITIONS
// ============================================================================

export const PERSONA_US_TECH: Profile = {
  ...EMPTY_PROFILE,
  firstName: "Alex",
  lastName: "Chen",
  email: "alex.chen@example.com",
  phone: "+1 415-555-0192",
  location: "San Francisco",
  state: "California",
  country: "United States",
  address: "100 Market St, San Francisco, CA 94105",
  addressLine1: "100 Market St",
  postalCode: "94105",
  currentCompany: "Stripe",
  currentTitle: "Senior Software Engineer",
  experienceYears: "6",
  skills: "TypeScript, Python, Distributed Systems, AWS",
  skillsInventory: [
    { name: "TypeScript", years: 6, level: "Advanced" },
    { name: "Python", years: 5, level: "Advanced" },
    { name: "AWS", years: 4, level: "Intermediate" },
  ],
  educationLevel: "Master's Degree",
  degree: "Master of Science",
  school: "Stanford University",
  discipline: "Computer Science",
  graduationYear: "2018",
  facts: {
    workCountries: "India", // H1B worker in US, legally authorized in India
    noticePeriod: "2 weeks",
    currentCtc: "$160k",
    expectedCtc: "$190k",
    relocate: "No",
    heardFrom: "LinkedIn",
    gender: "Male",
    hispanic: "No",
    race: "Asian",
    veteran: "No",
    disability: "No",
    workMode: "hybrid",
    maxOfficeDays: 3,
    travel: "No",
    pronouns: "He/Him",
    over18: "Yes",
    age: "29",
  },
};

export const PERSONA_INDIA_LEAD: Profile = {
  ...EMPTY_PROFILE,
  firstName: "Vikram",
  lastName: "Rao",
  email: "vikram.rao@example.com",
  phone: "+91 98450 12345",
  location: "Bangalore",
  state: "Karnataka",
  country: "India",
  address: "74 Indiranagar, Bangalore 560038",
  addressLine1: "74 Indiranagar",
  postalCode: "560038",
  currentCompany: "Swiggy",
  currentTitle: "Engineering Manager",
  experienceYears: "10",
  skills: "System Design, Microservices, Java, Kubernetes, Team Leadership",
  skillsInventory: [
    { name: "Java", years: 10, level: "Expert" },
    { name: "System Design", years: 8, level: "Expert" },
  ],
  educationLevel: "Bachelor's Degree",
  degree: "Bachelor of Engineering",
  school: "BMS College of Engineering",
  discipline: "Information Science",
  graduationYear: "2014",
  workHistory: [
    {
      company: "Swiggy",
      title: "Engineering Manager",
      location: "Bangalore",
      start: "2021-03",
      end: "Present",
      current: true,
      summary: "Leading backend platform engineering teams.",
    },
    {
      company: "Ola",
      title: "Tech Lead",
      location: "Bangalore",
      start: "2017-06",
      end: "2021-02",
      current: false,
      summary: "Architected real-time driver allocation services.",
    },
  ],
  workHistoryComplete: true,
  facts: {
    workCountries: "India",
    noticePeriod: "90 days",
    currentCtc: "45 LPA",
    expectedCtc: "60 LPA",
    relocate: "No",
    heardFrom: "Referral",
    gender: "Male",
    hispanic: "No",
    race: "Asian",
    veteran: "No",
    disability: "No",
    workMode: "hybrid",
    maxOfficeDays: 2,
    travel: "Yes",
    travelPercent: "20%",
    pronouns: "He/Him",
    over18: "Yes",
    age: "32",
  },
};

export const PERSONA_UK_DESIGNER: Profile = {
  ...EMPTY_PROFILE,
  firstName: "Emma",
  lastName: "Watson",
  email: "emma.watson.design@example.com",
  phone: "+44 20 7946 0958",
  location: "London",
  country: "United Kingdom",
  address: "22 Baker Street, London NW1 6XE",
  addressLine1: "22 Baker Street",
  postalCode: "NW1 6XE",
  currentCompany: "Monzo Bank",
  currentTitle: "Lead Product Designer",
  experienceYears: "7",
  portfolio: "https://emmawatsondesign.co.uk",
  skills: "Figma, Design Systems, UX Research, Interaction Design",
  skillsInventory: [
    { name: "Figma", years: 7, level: "Expert" },
    { name: "Design Systems", years: 5, level: "Advanced" },
  ],
  educationLevel: "Bachelor's Degree",
  degree: "Bachelor of Arts",
  school: "University of the Arts London",
  discipline: "Graphic and Media Design",
  graduationYear: "2017",
  facts: {
    workCountries: "United Kingdom, EU",
    noticePeriod: "3 months",
    currentCtc: "£65,000",
    expectedCtc: "£85,000",
    relocate: "No",
    heardFrom: "LinkedIn",
    gender: "Female",
    hispanic: "No",
    race: "White",
    veteran: "No",
    disability: "No",
    workMode: "hybrid",
    maxOfficeDays: 2,
    travel: "No",
    pronouns: "She/Her",
    over18: "Yes",
    age: "28",
  },
};

export const PERSONA_FRESHER_INTERN: Profile = {
  ...EMPTY_PROFILE,
  firstName: "Rahul",
  lastName: "Deshmukh",
  email: "rahul.deshmukh2025@example.com",
  phone: "+91 91234 56789",
  location: "Pune",
  state: "Maharashtra",
  country: "India",
  address: "Hostel Block 4, COEP Campus, Shivajinagar",
  addressLine1: "Hostel Block 4, COEP Campus",
  postalCode: "411005",
  currentCompany: "",
  currentTitle: "",
  experienceYears: "0",
  graduationYear: "2025",
  degree: "Bachelor of Technology",
  school: "College of Engineering, Pune",
  discipline: "Computer Science",
  educationLevel: "Bachelor's Degree",
  skills: "Python, C++, Data Structures, Algorithms",
  skillsInventory: [
    { name: "Python", years: 1, level: "Intermediate" },
    { name: "C++", years: 2, level: "Intermediate" },
  ],
  workHistory: [],
  workHistoryComplete: false,
  facts: {
    workCountries: "India",
    noticePeriod: "Immediate",
    currentCtc: "",
    expectedCtc: "12 LPA",
    relocate: "Yes",
    heardFrom: "Campus placement",
    gender: "Male",
    hispanic: "No",
    race: "Asian",
    veteran: "No",
    disability: "No",
    workMode: "any",
    maxOfficeDays: 5,
    travel: "Yes",
    travelPercent: "20%",
    pronouns: "He/Him",
    over18: "Yes",
    age: "21",
  },
};

export const PERSONA_REMOTE_CONTRACTOR: Profile = {
  ...EMPTY_PROFILE,
  firstName: "Elena",
  lastName: "Rostova",
  email: "elena.contractor@example.com",
  phone: "+1 312-555-0188",
  location: "Lisbon",
  country: "Portugal",
  timezone: "UTC",
  currentCompany: "Rostova Consulting",
  currentTitle: "Lead Cloud Architect",
  experienceYears: "9",
  skills: "AWS, Terraform, Kubernetes, FinOps",
  skillsInventory: [
    { name: "AWS", years: 9, level: "Expert" },
    { name: "Terraform", years: 6, level: "Advanced" },
  ],
  educationLevel: "Master's Degree",
  degree: "Master of Science",
  school: "Instituto Superior Técnico",
  discipline: "Computer Engineering",
  graduationYear: "2015",
  facts: {
    workCountries: "EU",
    noticePeriod: "14 days",
    currentCtc: "$60/hr",
    expectedCtc: "$75/hr",
    relocate: "No",
    heardFrom: "Upwork",
    gender: "Female",
    hispanic: "No",
    race: "White",
    veteran: "No",
    disability: "No",
    workMode: "remote",
    maxOfficeDays: 0,
    travel: "No",
    pronouns: "She/Her",
    over18: "Yes",
    age: "31",
  },
};

export const PERSONA_CAREER_TRANSITIONER: Profile = {
  ...EMPTY_PROFILE,
  firstName: "Marcus",
  lastName: "Vance",
  email: "marcus.vance@example.com",
  phone: "+1 206-555-0144",
  location: "Seattle",
  state: "Washington",
  country: "United States",
  address: "500 Pine Street, Seattle, WA 98101",
  addressLine1: "500 Pine Street",
  postalCode: "98101",
  currentCompany: "",
  currentTitle: "Junior Software Engineer",
  experienceYears: "1",
  degree: "Software Engineering Certificate",
  school: "General Assembly",
  discipline: "Software Engineering Immersive",
  educationLevel: "Associate Degree",
  graduationYear: "2024",
  skills: "JavaScript, React, Node.js, Express, MongoDB",
  skillsInventory: [
    { name: "JavaScript", years: 1, level: "Intermediate" },
    { name: "React", years: 1, level: "Intermediate" },
  ],
  workHistory: [
    {
      company: "Previous Retail Corp",
      title: "Store General Manager",
      location: "Seattle",
      start: "2018-01",
      end: "2022-12",
      current: false,
      summary: "Managed store operations, staff of 25, inventory and P&L.",
    },
  ],
  workHistoryComplete: true,
  facts: {
    workCountries: "United States",
    noticePeriod: "Immediate",
    currentCtc: "$45,000",
    expectedCtc: "$75,000",
    relocate: "No",
    heardFrom: "Bootcamp career network",
    gender: "Male",
    hispanic: "No",
    race: "Black or African American",
    veteran: "No",
    disability: "No",
    workMode: "remote",
    maxOfficeDays: 0,
    travel: "No",
    pronouns: "He/Him",
    over18: "Yes",
    age: "33",
  },
};

export const PERSONA_EXECUTIVE_DIRECTOR: Profile = {
  ...EMPTY_PROFILE,
  firstName: "Catherine",
  lastName: "Blackwood",
  email: "catherine.blackwood@example.com",
  phone: "+1 212-555-0177",
  location: "New York",
  state: "New York",
  country: "United States",
  address: "740 Park Avenue, New York, NY 10021",
  addressLine1: "740 Park Avenue",
  postalCode: "10021",
  currentCompany: "Horizon FinTech",
  currentTitle: "VP of Engineering",
  experienceYears: "16",
  skills: "Executive Leadership, Engineering Management, Cloud Scale, M&A Diligence",
  skillsInventory: [
    { name: "Engineering Management", years: 10, level: "Expert" },
  ],
  educationLevel: "Master's Degree",
  degree: "Master of Business Administration",
  school: "Columbia Business School",
  discipline: "Executive Management",
  graduationYear: "2012",
  facts: {
    workCountries: "United States",
    noticePeriod: "60 days",
    currentCtc: "$280k",
    expectedCtc: "$350k",
    relocate: "No",
    heardFrom: "Executive search firm",
    gender: "Female",
    hispanic: "No",
    race: "White",
    veteran: "No",
    disability: "No",
    workMode: "hybrid",
    maxOfficeDays: 2,
    travel: "Yes",
    travelPercent: "30%",
    pronouns: "She/Her",
    over18: "Yes",
    age: "42",
  },
};

// ============================================================================
// HELPER
// ============================================================================

function makeField(partial: Partial<FieldDescriptor> & { label: string }): FieldDescriptor {
  return {
    key: "f_test",
    name: "",
    autocomplete: "",
    placeholder: "",
    control: "text",
    required: true,
    options: [],
    ...partial,
  };
}

// ============================================================================
// 2. SUITE 1: PERSONA EVALUATION & EDGE CASES
// ============================================================================

describe("Arena Persona Diversity Suite", () => {
  describe("Persona 1: US Tech Worker (H1B transfer, USD salary in $k, W2)", () => {
    const p = PERSONA_US_TECH;
    const usPage = { jobCountries: ["United States"], url: "https://boards.greenhouse.io/uscorp/jobs/1" };
    const indiaPage = { jobCountries: ["India"], url: "https://boards.greenhouse.io/indiacorp/jobs/2" };

    it("requires sponsorship and lacks work auth in US", () => {
      const qAuth = makeField({ label: "Are you legally authorized to work in the United States?", control: "radio", options: ["Yes", "No"] });
      const dAuth = decide(qAuth, p, [], usPage);
      expect(dAuth).toEqual({ kind: "answer", value: "No", question: "Quick answers › work authorization" });

      const qSponsor = makeField({ label: "Will you now or in the future require visa sponsorship to work in the United States?", control: "radio", options: ["Yes", "No"] });
      const dSponsor = decide(qSponsor, p, [], usPage);
      expect(dSponsor).toEqual({ kind: "answer", value: "Yes", question: "Quick answers › sponsorship" });
    });

    it("has work auth and needs no sponsorship in India", () => {
      const qAuth = makeField({ label: "Are you legally authorized to work in India?", control: "radio", options: ["Yes", "No"] });
      const dAuth = decide(qAuth, p, [], indiaPage);
      expect(dAuth).toEqual({ kind: "answer", value: "Yes", question: "Quick answers › work authorization" });

      const qSponsor = makeField({ label: "Will you require visa sponsorship to work in India?", control: "radio", options: ["Yes", "No"] });
      const dSponsor = decide(qSponsor, p, [], indiaPage);
      expect(dSponsor).toEqual({ kind: "answer", value: "No", question: "Quick answers › sponsorship" });
    });

    it("handles USD salary in $k safely (text fills expected, number field with $k asks)", () => {
      const qText = makeField({ label: "Expected Salary ($)", placeholder: "$ USD" });
      const dText = decide(qText, p, []);
      expect(dText).toEqual({ kind: "answer", value: "$190k", question: "Quick answers › expected CTC" });

      // Number field asking for raw amount with '$k' saved value asks to avoid typing '190' for $190,000
      const qNum = makeField({ label: "Expected Salary ($)", control: "number" });
      const dNum = decide(qNum, p, []);
      expect(dNum.kind).toBe("ask");
    });

    it("never guesses W2 vs C2C preference", () => {
      const qW2 = makeField({ label: "Are you applying as a W2 employee or C2C contractor?", control: "select", options: ["W2", "C2C", "1099"] });
      const dW2 = decide(qW2, p, []);
      expect(dW2.kind).toBe("ask");
    });
  });

  describe("Persona 2: Senior Engineering Lead in India (90 days notice, INR LPA, buyout)", () => {
    const p = PERSONA_INDIA_LEAD;

    it("converts 90 days notice to 3 months in dropdown options", () => {
      const qSelect = makeField({
        label: "Notice Period",
        control: "select",
        options: ["Immediate", "15 days", "30 days", "60 days", "3 months"],
      });
      const dSelect = decide(qSelect, p, []);
      expect(dSelect).toEqual({ kind: "answer", value: "3 months", question: "Quick answers › notice period" });
    });

    it("fills 90 for days unit and 3 for months unit in text/number fields", () => {
      const qDays = makeField({ label: "Notice period (in days)", control: "number" });
      const dDays = decide(qDays, p, []);
      expect(dDays).toEqual({ kind: "answer", value: "90", question: "Quick answers › notice period" });

      const qMonths = makeField({ label: "Notice period (in months)", control: "number" });
      const dMonths = decide(qMonths, p, []);
      expect(dMonths).toEqual({ kind: "answer", value: "3", question: "Quick answers › notice period" });
    });

    it("answers No to can start immediately", () => {
      const qStart = makeField({ label: "Can you start immediately?", control: "radio", options: ["Yes", "No"] });
      const dStart = decide(qStart, p, []);
      expect(dStart).toEqual({ kind: "answer", value: "No", question: "Quick answers › start immediately" });
    });

    it("asks user on immediate buyout discussion (not a standard start immediately)", () => {
      const qBuyout = makeField({ label: "Can you start immediately through notice buyout?", control: "radio", options: ["Yes", "No"] });
      const dBuyout = decide(qBuyout, p, []);
      expect(dBuyout.kind).toBe("ask");
    });

    it("fills INR LPA for split current and expected CTC", () => {
      const qCurr = makeField({ label: "Compensation Details", placeholder: "Current CTC", name: "currentCtc" });
      const dCurr = decide(qCurr, p, []);
      expect(dCurr).toEqual({ kind: "answer", value: "45 LPA", question: "Quick answers › current CTC" });

      const qExp = makeField({ label: "Compensation Details", placeholder: "Expected CTC", name: "expectedCtc" });
      const dExp = decide(qExp, p, []);
      expect(dExp).toEqual({ kind: "answer", value: "60 LPA", question: "Quick answers › expected CTC" });
    });
  });

  describe("Persona 3: UK/EU Designer (GBP/EUR salary, 3 month notice, UK right to work)", () => {
    const p = PERSONA_UK_DESIGNER;
    const ukPage = { jobCountries: ["United Kingdom"], url: "https://boards.greenhouse.io/ukcorp/jobs/3" };
    const usPage = { jobCountries: ["United States"], url: "https://boards.greenhouse.io/uscorp/jobs/4" };

    it("has right to work in UK and EU without sponsorship", () => {
      const qUK = makeField({ label: "Do you have the right to work in the UK?", control: "radio", options: ["Yes", "No"] });
      expect(decide(qUK, p, [], ukPage)).toEqual({ kind: "answer", value: "Yes", question: "Quick answers › work authorization" });

      const qSponsorUK = makeField({ label: "Will you require sponsorship to work in the United Kingdom?", control: "radio", options: ["Yes", "No"] });
      expect(decide(qSponsorUK, p, [], ukPage)).toEqual({ kind: "answer", value: "No", question: "Quick answers › sponsorship" });

      const qUS = makeField({ label: "Will you require visa sponsorship to work in the United States?", control: "radio", options: ["Yes", "No"] });
      expect(decide(qUS, p, [], usPage)).toEqual({ kind: "answer", value: "Yes", question: "Quick answers › sponsorship" });
    });

    it("converts 3 months notice to 90 days in dropdown options", () => {
      const qNotice = makeField({
        label: "Notice Period",
        control: "select",
        options: ["Immediate", "30 days", "60 days", "90 days"],
      });
      expect(decide(qNotice, p, [])).toEqual({ kind: "answer", value: "90 days", question: "Quick answers › notice period" });
    });

    it("matches GBP salary and asks when currency differs (EUR or USD)", () => {
      const qGbp = makeField({ label: "Expected Annual Salary (£ GBP)" });
      expect(decide(qGbp, p, [])).toEqual({ kind: "answer", value: "£85,000", question: "Quick answers › expected CTC" });

      // Asking in EUR or USD when candidate's CTC is in GBP must ask!
      const qEur = makeField({ label: "Expected Annual Salary (€ EUR)" });
      expect(decide(qEur, p, []).kind).toBe("ask");

      const qUsd = makeField({ label: "Expected Annual Salary ($ USD)" });
      expect(decide(qUsd, p, []).kind).toBe("ask");
    });
  });

  describe("Persona 4: Early Career Intern / Fresher (0 YOE, Class of 2025, 0 days notice)", () => {
    const p = PERSONA_FRESHER_INTERN;

    it("fills 0 for experienceYears and 2025 for graduationYear", () => {
      const qYoe = makeField({ label: "Total years of experience" });
      expect(decide(qYoe, p, [])).toEqual({ kind: "profile", key: "experienceYears", value: "0" });

      const qGrad = makeField({ label: "Year of graduation" });
      expect(decide(qGrad, p, [])).toEqual({ kind: "profile", key: "graduationYear", value: "2025" });
    });

    it("answers Yes to start immediately and picks 'Yes, available immediately' over ambiguous options", () => {
      const qImmediate = makeField({
        label: "Can you start immediately?",
        control: "radio",
        options: ["Yes, currently employed", "Yes, available immediately", "No, currently studying"],
      });
      const d = decide(qImmediate, p, []);
      expect(d).toEqual({ kind: "answer", value: "Yes, available immediately", question: "Quick answers › start immediately" });
    });

    it("never falsely answers No to past company questions when work history is empty & incomplete", () => {
      const qPrev = makeField({ label: "Have you ever worked for Google?", control: "radio", options: ["Yes", "No"] });
      // Incomplete history must ask, never falsely guess 'No'
      expect(decide(qPrev, p, []).kind).toBe("ask");
    });
  });

  describe("Persona 5: Remote Contractor (Timezone GMT+5:30 / UTC, B2B rate)", () => {
    const p = PERSONA_REMOTE_CONTRACTOR;

    it("fills timezone from profile", () => {
      const qTz = makeField({ label: "What is your Timezone?" });
      expect(decide(qTz, p, [])).toEqual({ kind: "profile", key: "timezone", value: "UTC" });
    });

    it("answers No to onsite hybrid attendance when candidate is remote only", () => {
      const qOnsite = makeField({ label: "Are you willing to work from our Lisbon office 3 days a week?", control: "radio", options: ["Yes", "No"] });
      expect(decide(qOnsite, p, [])).toEqual({ kind: "answer", value: "No", question: "Quick answers › onsite" });
    });

    it("matches hourly contractor rate and asks when annual salary is requested", () => {
      const qHourly = makeField({ label: "Expected Hourly Rate ($/hr)" });
      expect(decide(qHourly, p, [])).toEqual({ kind: "answer", value: "$75/hr", question: "Quick answers › expected CTC" });

      const qAnnual = makeField({ label: "Expected Annual Salary ($ USD)" });
      expect(decide(qAnnual, p, []).kind).toBe("ask");
    });

    it("converts 14 days notice to 2 weeks in select options", () => {
      const qNotice = makeField({
        label: "Notice Period",
        control: "select",
        options: ["Immediate", "2 weeks", "1 month", "2 months"],
      });
      expect(decide(qNotice, p, [])).toEqual({ kind: "answer", value: "2 weeks", question: "Quick answers › notice period" });
    });
  });

  describe("Persona 6: Career Transitioner (Bootcamp grad, career gap explanation)", () => {
    const p = PERSONA_CAREER_TRANSITIONER;

    it("fills bootcamp degree and school accurately", () => {
      const qDegree = makeField({ label: "Degree" });
      expect(decide(qDegree, p, [])).toEqual({ kind: "profile", key: "degree", value: "Software Engineering Certificate" });

      const qSchool = makeField({ label: "School or University" });
      expect(decide(qSchool, p, [])).toEqual({ kind: "profile", key: "school", value: "General Assembly" });
    });

    it("asks user on career gap and transition explanation essay questions", () => {
      const qGap = makeField({ label: "Please explain any gap in your employment history", control: "textarea" });
      expect(decide(qGap, p, []).kind).toBe("ask");

      const qSwitch = makeField({ label: "Why did you transition into software engineering?", control: "textarea" });
      expect(decide(qSwitch, p, []).kind).toBe("ask");
    });
  });

  describe("Persona 7: Executive / Director (Board references, equity, executive titles)", () => {
    const p = PERSONA_EXECUTIVE_DIRECTOR;

    it("fills executive title and overall experience", () => {
      const qTitle = makeField({ label: "Current Title" });
      expect(decide(qTitle, p, [])).toEqual({ kind: "profile", key: "currentTitle", value: "VP of Engineering" });

      const qExp = makeField({ label: "Total years of experience" });
      expect(decide(qExp, p, [])).toEqual({ kind: "profile", key: "experienceYears", value: "16" });
    });

    it("asks for role-specific leadership experience rather than filling total years", () => {
      const qLead = makeField({ label: "Years of executive leadership experience" });
      expect(decide(qLead, p, []).kind).toBe("ask");
    });

    it("never puts the executive's own name, email, or phone into references fields", () => {
      const qRefName = makeField({ label: "Reference 1 Full Name", section: "Professional References" });
      expect(decide(qRefName, p, []).kind).toBe("ask");

      const qRefEmail = makeField({ label: "Reference 1 Email", section: "Professional References", control: "email" });
      expect(decide(qRefEmail, p, []).kind).toBe("ask");

      const qRefPhone = makeField({ label: "Reference 1 Phone", section: "Professional References", control: "tel" });
      expect(decide(qRefPhone, p, []).kind).toBe("ask");
    });

    it("asks user on equity and stock option questions without guessing", () => {
      const qEquity = makeField({ label: "What are your equity or stock option expectations?" });
      expect(decide(qEquity, p, []).kind).toBe("ask");

      const qBonus = makeField({ label: "What is your target annual bonus percentage?" });
      expect(decide(qBonus, p, []).kind).toBe("ask");
    });
  });
});

// ============================================================================
// 3. SUITE 2: TRICKY ADVERSARIAL TRAPS
// ============================================================================

describe("Tricky Adversarial Traps", () => {
  describe("Trap 1: Questions with both 'Current' and 'Expected' in label or container", () => {
    it("asks user when a single box asks for both current and expected salary", () => {
      const qBoth = makeField({ label: "What is your current and expected salary?" });
      const d = decide(qBoth, PERSONA_INDIA_LEAD, []);
      expect(d.kind).toBe("ask");
    });

    it("disambiguates Current vs Expected CTC inside compound container when placeholders/names indicate which is which", () => {
      mount(`<form id="f">
        <div class="ctc-container">
          <label>Current and Expected Compensation</label>
          <input id="curr" name="currentCtc" placeholder="Current CTC">
          <input id="exp" name="expectedCtc" placeholder="Expected CTC">
        </div>
      </form>`);

      const fields = extractFields(document.getElementById("f")!);
      expect(fields.length).toBe(2);

      const dCurr = decide(fields[0]!.descriptor, PERSONA_INDIA_LEAD, []);
      expect(dCurr).toEqual({ kind: "answer", value: "45 LPA", question: "Quick answers › current CTC" });

      const dExp = decide(fields[1]!.descriptor, PERSONA_INDIA_LEAD, []);
      expect(dExp).toEqual({ kind: "answer", value: "60 LPA", question: "Quick answers › expected CTC" });
    });

    it("asks user when compound container inputs lack disambiguating hints", () => {
      mount(`<form id="f">
        <fieldset class="ctc-container">
          <legend>Current and Expected Compensation</legend>
          <input id="amt1" name="amount1" required>
          <input id="amt2" name="amount2" required>
        </fieldset>
      </form>`);

      const fields = extractFields(document.getElementById("f")!);
      expect(fields.length).toBe(2);

      const d1 = decide(fields[0]!.descriptor, PERSONA_INDIA_LEAD, []);
      expect(d1.kind).toBe("ask");

      const d2 = decide(fields[1]!.descriptor, PERSONA_INDIA_LEAD, []);
      expect(d2.kind).toBe("ask");
    });
  });

  describe("Trap 2: Ambiguous options: 'Yes, currently employed' vs 'Yes, available immediately'", () => {
    it("picks 'Yes, available immediately' when candidate is available immediately, regardless of option order", () => {
      const q1 = makeField({
        label: "Can you start immediately?",
        control: "radio",
        options: ["Yes, currently employed", "Yes, available immediately", "No"],
      });
      expect(decide(q1, PERSONA_FRESHER_INTERN, [])).toEqual({
        kind: "answer",
        value: "Yes, available immediately",
        question: "Quick answers › start immediately",
      });

      const q2 = makeField({
        label: "Can you start immediately?",
        control: "radio",
        options: ["Yes, available immediately", "Yes, currently employed", "No"],
      });
      expect(decide(q2, PERSONA_FRESHER_INTERN, [])).toEqual({
        kind: "answer",
        value: "Yes, available immediately",
        question: "Quick answers › start immediately",
      });
    });

    it("picks 'No' when candidate has notice period", () => {
      const q = makeField({
        label: "Can you start immediately?",
        control: "radio",
        options: ["Yes, currently employed", "Yes, available immediately", "No, I have a notice period"],
      });
      expect(decide(q, PERSONA_INDIA_LEAD, [])).toEqual({
        kind: "answer",
        value: "No, I have a notice period",
        question: "Quick answers › start immediately",
      });
    });

    it("picks 'Yes, currently employed' when answering an employment status question from saved answers", () => {
      const qEmployed = makeField({
        label: "Are you currently employed?",
        control: "radio",
        options: ["Yes, currently employed", "Yes, available immediately", "No, currently unemployed"],
      });
      const answers = [{ question: "Are you currently employed?", answer: "Yes, currently employed", updatedAt: "2026-10-30T00:00:00Z" }];
      const d = decide(qEmployed, PERSONA_INDIA_LEAD, answers);
      expect(d).toEqual({ kind: "answer", value: "Yes, currently employed", question: "Are you currently employed?" });
    });
  });

  describe("Trap 3: Notice period conversions across units", () => {
    it("parses notice days accurately", () => {
      expect(parseNoticeDays("Immediate")).toBe(0);
      expect(parseNoticeDays("0 days")).toBe(0);
      expect(parseNoticeDays("1 week")).toBe(7);
      expect(parseNoticeDays("2 weeks")).toBe(14);
      expect(parseNoticeDays("30 days")).toBe(30);
      expect(parseNoticeDays("1 month")).toBe(30);
      expect(parseNoticeDays("60 days")).toBe(60);
      expect(parseNoticeDays("2 months")).toBe(60);
      expect(parseNoticeDays("90 days")).toBe(90);
      expect(parseNoticeDays("3 months")).toBe(90);
    });

    it("matches 90 days to 3 months and vice versa", () => {
      const optionsMonths = ["Immediate", "15 days", "1 month", "2 months", "3 months"];
      expect(matchNoticeOption("90 days", optionsMonths)).toBe("3 months");

      const optionsDays = ["Immediate", "30 days", "60 days", "90 days"];
      expect(matchNoticeOption("3 months", optionsDays)).toBe("90 days");
    });

    it("matches 2 weeks to 14 days and vice versa", () => {
      const optionsDays = ["Immediate", "14 days", "30 days", "60 days"];
      expect(matchNoticeOption("2 weeks", optionsDays)).toBe("14 days");

      const optionsWeeks = ["Immediate", "2 weeks", "1 month"];
      expect(matchNoticeOption("14 days", optionsWeeks)).toBe("2 weeks");
    });

    it("converts units for number inputs", () => {
      const qMonths = makeField({ label: "Notice period (in months)", control: "number" });
      expect(decide(qMonths, PERSONA_INDIA_LEAD, [])).toEqual({
        kind: "answer",
        value: "3",
        question: "Quick answers › notice period",
      });

      const qDays = makeField({ label: "Notice period (in days)", control: "number" });
      expect(decide(qDays, PERSONA_UK_DESIGNER, [])).toEqual({
        kind: "answer",
        value: "90",
        question: "Quick answers › notice period",
      });

      const qWeeks = makeField({ label: "Notice period (in weeks)", control: "number" });
      expect(decide(qWeeks, PERSONA_REMOTE_CONTRACTOR, [])).toEqual({
        kind: "answer",
        value: "2",
        question: "Quick answers › notice period",
      });
    });
  });

  describe("Trap 4: Honeypot spam traps", () => {
    it("completely skips hidden, styled opacity:0, and 'leave empty' spam traps", () => {
      mount(`<form id="f">
        <label for="first">First name</label><input id="first">
        <label for="last">Last name</label><input id="last">
        <label for="email">Email</label><input id="email" type="email">

        <!-- Trap 1: style display:none -->
        <div style="display:none">
          <label for="hp1">Phone</label><input id="hp1">
        </div>

        <!-- Trap 2: style opacity: 0 -->
        <label for="hp2">City</label><input id="hp2" style="opacity: 0">

        <!-- Trap 3: text 'Leave this field empty' -->
        <label for="hp3">Leave this field empty</label><input id="hp3">

        <!-- Trap 4: aria-labelledby with honeypot text -->
        <span id="hp4_label">Leave this field blank</span>
        <input id="hp4" aria-labelledby="hp4_label">

        <!-- Trap 5: bot trap name -->
        <input id="hp5" name="honeypot" placeholder="Your website">

        <!-- Trap 6: off-screen -->
        <div style="position:absolute; left:-5000px">
          <label for="hp6">Job Title</label><input id="hp6">
        </div>

        <!-- Valid styled radio with opacity:0 should NOT be skipped -->
        <fieldset><legend>Are you 18 or older?</legend>
          <label><input type="radio" name="over18" value="Yes" style="opacity:0">Yes</label>
          <label><input type="radio" name="over18" value="No" style="opacity:0">No</label>
        </fieldset>

        <!-- Valid field with 'leave blank if none' in label should NOT be skipped -->
        <label for="other_name">Other Name (leave blank if none)</label><input id="other_name">
      </form>`);

      const fields = extractFields(document.getElementById("f")!);
      const labels = fields.map((f) => f.descriptor.label);

      expect(labels).toContain("First name");
      expect(labels).toContain("Last name");
      expect(labels).toContain("Email");
      expect(labels).toContain("Are you 18 or older?");
      expect(labels).toContain("Other Name (leave blank if none)");

      // Honeypots MUST be excluded:
      expect(labels).not.toContain("Leave this field empty");
      expect(labels).not.toContain("Leave this field blank");
      expect(fields.some((f) => f.descriptor.name === "honeypot")).toBe(false);
      expect(fields.some((f) => f.elements[0]?.id === "hp1")).toBe(false);
      expect(fields.some((f) => f.elements[0]?.id === "hp2")).toBe(false);
      expect(fields.some((f) => f.elements[0]?.id === "hp6")).toBe(false);
    });
  });

  describe("Trap 5: Radio / Checkbox questions for legal authorization vs sponsorship", () => {
    const page = { jobCountries: ["United States"], url: "https://boards.greenhouse.io/uscompany/jobs/5" };

    it("answers distinct radio questions correctly on the same form for US Tech Worker", () => {
      const qAuth = makeField({
        label: "Are you legally authorized to work in the United States?",
        control: "radio",
        options: ["Yes", "No"],
      });
      const dAuth = decide(qAuth, PERSONA_US_TECH, [], page);
      expect(dAuth).toEqual({ kind: "answer", value: "No", question: "Quick answers › work authorization" });

      const qSponsor = makeField({
        label: "Will you now or in the future require sponsorship for employment visa status?",
        control: "radio",
        options: ["Yes", "No"],
      });
      const dSponsor = decide(qSponsor, PERSONA_US_TECH, [], page);
      expect(dSponsor).toEqual({ kind: "answer", value: "Yes", question: "Quick answers › sponsorship" });
    });

    it("asks user when authorization and sponsorship are ambiguously conjoined in one question", () => {
      const qConjoined = makeField({
        label: "Are you authorized to work in the United States and do you require visa sponsorship?",
        control: "radio",
        options: ["Yes", "No"],
      });
      const d = decide(qConjoined, PERSONA_US_TECH, [], page);
      expect(d.kind).toBe("ask");
    });

    it("safely answers 'authorized without the need for sponsorship'", () => {
      const qWithout = makeField({
        label: "Are you authorized to work in the United States without the need for visa sponsorship?",
        control: "radio",
        options: ["Yes", "No"],
      });
      // US Tech Worker cannot work without sponsorship -> No
      const dAlex = decide(qWithout, PERSONA_US_TECH, [], page);
      expect(dAlex).toEqual({ kind: "answer", value: "No", question: "Quick answers › work authorization" });

      // US Citizen / Authorized Executive can work without sponsorship -> Yes
      const dCat = decide(qWithout, PERSONA_EXECUTIVE_DIRECTOR, [], page);
      expect(dCat).toEqual({ kind: "answer", value: "Yes", question: "Quick answers › work authorization" });
    });
  });

  describe("Cross-Persona Engine Invariance (decide & decideWithMeaning zero value errors)", () => {
    const personas = [
      { name: "US Tech Worker", profile: PERSONA_US_TECH, check: { key: "firstName", val: "Alex" } },
      { name: "Senior Eng Lead India", profile: PERSONA_INDIA_LEAD, check: { key: "currentCompany", val: "Swiggy" } },
      { name: "UK/EU Designer", profile: PERSONA_UK_DESIGNER, check: { key: "portfolio", val: "https://emmawatsondesign.co.uk" } },
      { name: "Early Career Intern", profile: PERSONA_FRESHER_INTERN, check: { key: "graduationYear", val: "2025" } },
      { name: "Remote Contractor", profile: PERSONA_REMOTE_CONTRACTOR, check: { key: "timezone", val: "UTC" } },
      { name: "Career Transitioner", profile: PERSONA_CAREER_TRANSITIONER, check: { key: "degree", val: "Software Engineering Certificate" } },
      { name: "Executive Director", profile: PERSONA_EXECUTIVE_DIRECTOR, check: { key: "currentTitle", val: "VP of Engineering" } },
    ];

    for (const { name, profile, check } of personas) {
      it(`evaluates ${name} with decide and decideWithMeaning consistently`, () => {
        const field = makeField({
          label: check.key === "currentCompany" ? "Current Employer" :
                 check.key === "currentTitle" ? "Current Job Title" :
                 check.key === "portfolio" ? "Portfolio Website" :
                 check.key === "graduationYear" ? "Year of Graduation" :
                 check.key === "timezone" ? "Timezone" :
                 check.key === "degree" ? "Degree" : "First Name",
        });

        const dDecide = decide(field, profile, []);
        const dMeaning = decideWithMeaning(field, profile, []);

        expect(dDecide).toEqual({ kind: "profile", key: check.key, value: check.val });
        expect(dMeaning).toEqual({ kind: "profile", key: check.key, value: check.val });
      });
    }
  });
});

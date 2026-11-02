/**
 * Quick Answers schema and profile mapping.
 * Provides the ~25 questions asked on job forms to turn them into automatic fills
 * on the first application and throughout steady-state.
 */

import quickAnswerStats from "./quick-answer-stats.json";
import type { LanguageEntry, Profile, QuickFacts, SkillEntry } from "./types";

export interface QuickQuestion {
  id: string;
  factKey: string;
  prompt: string;
  why: string;
  kind: "yesno" | "choice" | "multi" | "number" | "text" | "date";
  options?: string[];
  defaultAnswer?: string;
  placeholder?: string;
}

const stats = (quickAnswerStats.stats || {}) as Record<string, { why: string; percent: number }>;
const statWhy = (id: string, fallback: string): string => stats[id]?.why ?? fallback;

export const QUICK_QUESTIONS: QuickQuestion[] = [
  {
    id: "workCountries",
    factKey: "facts.workCountries",
    prompt: "In which countries can you work without employer sponsorship?",
    why: statWhy("workCountries", "Forms ask work authorization on many applications"),
    kind: "multi",
    options: ["India", "United States", "United Kingdom", "Germany", "Canada", "European Union"],
    defaultAnswer: "India",
  },
  {
    id: "temporaryWorkCountries",
    factKey: "facts.temporaryWorkCountries",
    prompt: "Countries where you have temporary authorization (OPT, STEM OPT, PGWP)?",
    why: "Prevents auto-fill confusion with permanent authorization",
    kind: "text",
    defaultAnswer: "",
  },
  {
    id: "unauthorizedCountries",
    factKey: "facts.unauthorizedCountries",
    prompt: "Countries where you are NOT authorized to work at all (optional):",
    why: "Prevents auto-filling authorization questions for countries where you cannot work",
    kind: "multi",
    options: ["United States", "United Kingdom", "Germany", "Canada", "European Union", "India", "Australia"],
    defaultAnswer: "",
  },
  {
    id: "needsFutureSponsorship",
    factKey: "facts.needsFutureSponsorship",
    prompt: "Will you require visa sponsorship now or in the future?",
    why: statWhy("needsFutureSponsorship", "Asked in technical applications"),
    kind: "choice",
    options: ["No", "Yes", "Decline"],
    defaultAnswer: "No",
  },
  {
    id: "relocate",
    factKey: "facts.relocate",
    prompt: "Are you willing to relocate for this position?",
    why: "Standard relocation question across all ATS platforms",
    kind: "choice",
    options: ["Yes", "No"],
    defaultAnswer: "Yes",
  },
  {
    id: "preferredLocations",
    factKey: "preferredLocations",
    prompt: "Preferred work locations / cities (comma-separated):",
    why: "Prevents wrong yes/no fills when a specific city is requested",
    kind: "text",
    defaultAnswer: "Bangalore, Pune, Remote",
  },
  {
    id: "noticePeriod",
    factKey: "facts.noticePeriod",
    prompt: "What is your official notice period?",
    why: statWhy("noticePeriod", "Asked on application forms"),
    kind: "choice",
    options: ["Immediate", "15 days", "30 days", "60 days", "90 days"],
    defaultAnswer: "30 days",
  },
  {
    id: "currentCtc",
    factKey: "facts.currentCtc",
    prompt: "Current annual compensation (e.g. 12 LPA or $100,000):",
    why: "Ensures currency and frequency match the job posting",
    kind: "text",
    defaultAnswer: "",
  },
  {
    id: "expectedCtc",
    factKey: "facts.expectedCtc",
    prompt: "Expected annual compensation (e.g. 15 LPA or $120,000):",
    why: statWhy("expectedCtc", "Ensures truthful salary expectations without misquoting"),
    kind: "text",
    defaultAnswer: "",
  },
  {
    id: "workMode",
    factKey: "facts.workMode",
    prompt: "Preferred work mode:",
    why: "Filters onsite, hybrid, or remote requirements",
    kind: "choice",
    options: ["remote", "hybrid", "onsite", "any"],
    defaultAnswer: "hybrid",
  },
  {
    id: "maxOfficeDays",
    factKey: "facts.maxOfficeDays",
    prompt: "Maximum days per week willing to work in office:",
    why: "Answers hybrid scheduling questions accurately",
    kind: "number",
    defaultAnswer: "3",
  },
  {
    id: "travel",
    factKey: "facts.travel",
    prompt: "Willing to travel for work?",
    why: "Standard travel requirement question",
    kind: "choice",
    options: ["Yes", "No", "Decline"],
    defaultAnswer: "Yes",
  },
  {
    id: "travelPercent",
    factKey: "facts.travelPercent",
    prompt: "Maximum travel percentage willing to undertake:",
    why: "Ensures travel scope matches job specification",
    kind: "choice",
    options: [...quickAnswerStats.travelPercentOptions],
    defaultAnswer: quickAnswerStats.travelPercentOptions[1]!,
  },
  {
    id: "over18",
    factKey: "facts.over18",
    prompt: "Are you at least 18 years of age or older?",
    why: statWhy("over18", "Legal minimum age requirement asked on many forms"),
    kind: "choice",
    options: ["Yes", "No"],
    defaultAnswer: "Yes",
  },
  {
    id: "highestDegree",
    factKey: "educationLevel",
    prompt: "Highest completed education level:",
    why: "Autofills educational qualification fields",
    kind: "choice",
    options: ["Bachelor's Degree", "Master's Degree", "Doctorate (PhD)", "Diploma / Associate", "High School"],
    defaultAnswer: "Bachelor's Degree",
  },
  {
    id: "graduationYear",
    factKey: "graduationYear",
    prompt: "Year of graduation:",
    why: "Required in academic background sections",
    kind: "text",
    defaultAnswer: "2024",
  },
  {
    id: "experienceYears",
    factKey: "experienceYears",
    prompt: "Total years of relevant professional experience:",
    why: "Answers 'How many years of experience do you have?'",
    kind: "number",
    defaultAnswer: "3",
  },
  {
    id: "languages",
    factKey: "languages",
    prompt: "Languages and proficiency (e.g. English: Fluent, Hindi: Native):",
    why: "Populates multi-language competency questions",
    kind: "text",
    defaultAnswer: "English: Fluent",
  },
  {
    id: "gender",
    factKey: "facts.gender",
    prompt: "Gender identification:",
    why: "EEO diversity reporting (defaults to Prefer not to say)",
    kind: "choice",
    options: ["Decline", "Female", "Male", "Non-binary"],
    defaultAnswer: "Decline",
  },
  {
    id: "hispanic",
    factKey: "facts.hispanic",
    prompt: "Are you Hispanic or Latino?",
    why: "US EEO-1 standard question",
    kind: "choice",
    options: ["Decline", "No", "Yes"],
    defaultAnswer: "Decline",
  },
  {
    id: "race",
    factKey: "facts.race",
    prompt: "Race / Ethnicity category:",
    why: "US EEO-1 standard question",
    kind: "choice",
    options: ["Decline", "Asian", "White", "Black or African American", "Two or More Races"],
    defaultAnswer: "Decline",
  },
  {
    id: "veteran",
    factKey: "facts.veteran",
    prompt: "Veteran status:",
    why: "VETS-4212 voluntary disclosure",
    kind: "choice",
    options: ["Decline", "No", "Yes"],
    defaultAnswer: "Decline",
  },
  {
    id: "disability",
    factKey: "facts.disability",
    prompt: "Disability status:",
    why: "Form CC-305 voluntary self-identification",
    kind: "choice",
    options: ["Decline", "No", "Yes"],
    defaultAnswer: "Decline",
  },
  {
    id: "pronouns",
    factKey: "facts.pronouns",
    prompt: "Preferred pronouns (optional):",
    why: "Modern recruitment identity field",
    kind: "choice",
    options: ["he/him", "she/her", "they/them", "Prefer not to say"],
    defaultAnswer: "Prefer not to say",
  },
  {
    id: "heardFrom",
    factKey: "facts.heardFrom",
    prompt: "How did you hear about this opportunity?",
    why: statWhy("heardFrom", "Asked in application forms"),
    kind: "text",
    defaultAnswer: "Job board / company website",
  },
  {
    id: "linkedin",
    factKey: "linkedin",
    prompt: "LinkedIn profile URL:",
    why: "Primary social/professional profile requested",
    kind: "text",
    defaultAnswer: "",
  },
  {
    id: "github",
    factKey: "github",
    prompt: "GitHub profile URL:",
    why: "Technical portfolio link",
    kind: "text",
    defaultAnswer: "",
  },
  {
    id: "portfolio",
    factKey: "portfolio",
    prompt: "Portfolio / personal website URL:",
    why: "Showcase of projects and past work",
    kind: "text",
    defaultAnswer: "",
  },
  {
    id: "topSkills",
    factKey: "skillsInventory",
    prompt: "What are your core technical and professional skills?",
    why: statWhy("topSkills", "Forms ask about specific tools, languages and skills"),
    kind: "text",
    placeholder: "e.g. Python (4 yrs), React (3 yrs), SQL (4 yrs), AWS (2 yrs)",
    defaultAnswer: "",
  },
];

/** Parses a free-text skills list (e.g. "Python (4 yrs), React (3 yrs)") into SkillEntry objects. */
export function parseSkillsInput(input: string | string[]): SkillEntry[] {
  const items = Array.isArray(input) ? input : String(input).split(/[,;\n]+/);
  const result: SkillEntry[] = [];
  for (const item of items) {
    const trimmed = item.trim();
    if (!trimmed) continue;
    const m = trimmed.match(/^([^(:\-–]+)(?:(?:\(|\s*[:\-–]\s*)\s*(\d+(?:\.\d+)?)\s*(?:yrs?|years?)?\s*\)?)?/i);
    if (m) {
      const name = m[1]!.trim();
      const years = m[2] ? parseFloat(m[2]) : 3;
      if (name) {
        result.push({
          name,
          years,
          level: years >= 5 ? "Advanced" : years >= 2 ? "Intermediate" : "Beginner",
        });
      }
    }
  }
  return result;
}

/**
 * Pure function applying Quick Answers answers map to a Profile object.
 * Reuses existing Profile and QuickFacts keys without inventing new schema.
 */
export function applyQuickAnswers(profile: Profile, answers: Record<string, string | string[]>): Profile {
  const next: Profile = {
    ...profile,
    facts: {
      ...(profile.facts ?? ({} as QuickFacts)),
    },
  };

  const getStr = (key: string): string => {
    const val = answers[key];
    if (val === undefined || val === null) return "";
    return Array.isArray(val) ? val.join(", ") : String(val);
  };

  if ("workCountries" in answers) next.facts!.workCountries = getStr("workCountries");
  if ("temporaryWorkCountries" in answers) next.facts!.temporaryWorkCountries = getStr("temporaryWorkCountries");
  if ("unauthorizedCountries" in answers) next.facts!.unauthorizedCountries = getStr("unauthorizedCountries");
  if ("needsFutureSponsorship" in answers) {
    const v = getStr("needsFutureSponsorship");
    next.facts!.needsFutureSponsorship = (v === "Yes" || v === "No" || v === "Decline") ? v : "";
  }
  if ("relocate" in answers) {
    const v = getStr("relocate");
    next.facts!.relocate = (v === "Yes" || v === "No") ? v : "";
  }
  if ("preferredLocations" in answers) next.preferredLocations = getStr("preferredLocations");
  if ("noticePeriod" in answers) next.facts!.noticePeriod = getStr("noticePeriod");
  if ("currentCtc" in answers) next.facts!.currentCtc = getStr("currentCtc");
  if ("expectedCtc" in answers) next.facts!.expectedCtc = getStr("expectedCtc");
  if ("workMode" in answers) {
    const v = getStr("workMode");
    next.facts!.workMode = (v === "onsite" || v === "hybrid" || v === "remote" || v === "any") ? v : "";
  }
  if ("maxOfficeDays" in answers) next.facts!.maxOfficeDays = getStr("maxOfficeDays");
  if ("travel" in answers) {
    const v = getStr("travel");
    next.facts!.travel = (v === "Yes" || v === "No" || v === "Decline") ? v : "";
  }
  if ("travelPercent" in answers) next.facts!.travelPercent = getStr("travelPercent");
  if ("over18" in answers) {
    const v = getStr("over18");
    next.facts!.over18 = (v === "Yes" || v === "No") ? v : "";
  }
  if ("highestDegree" in answers) {
    const v = getStr("highestDegree");
    next.educationLevel = v;
    if (!next.degree) next.degree = v;
  }
  if ("graduationYear" in answers) next.graduationYear = getStr("graduationYear");
  if ("experienceYears" in answers) next.experienceYears = getStr("experienceYears");
  if ("languages" in answers) {
    const langStr = getStr("languages");
    if (langStr) {
      const validProf = ["Native", "Fluent", "Professional", "Conversational", "Basic"];
      const entries: LanguageEntry[] = langStr.split(",").map((part) => {
        const [lang, prof] = part.split(":").map((s) => s.trim());
        const p = (prof && validProf.includes(prof))
          ? (prof as LanguageEntry["proficiency"])
          : "Fluent";
        return { language: lang || part.trim(), proficiency: p };
      }).filter((e) => e.language);
      if (entries.length) {
        next.languages = entries;
      }
    }
  }
  if ("gender" in answers) {
    const v = getStr("gender");
    next.facts!.gender = (v === "Male" || v === "Female" || v === "Non-binary" || v === "Decline") ? v : "";
  }
  if ("hispanic" in answers) {
    const v = getStr("hispanic");
    next.facts!.hispanic = (v === "Yes" || v === "No" || v === "Decline") ? v : "";
  }
  if ("race" in answers) next.facts!.race = getStr("race");
  if ("veteran" in answers) {
    const v = getStr("veteran");
    next.facts!.veteran = (v === "Yes" || v === "No" || v === "Decline") ? v : "";
  }
  if ("disability" in answers) {
    const v = getStr("disability");
    next.facts!.disability = (v === "Yes" || v === "No" || v === "Decline") ? v : "";
  }
  if ("pronouns" in answers) next.facts!.pronouns = getStr("pronouns");
  if ("heardFrom" in answers) next.facts!.heardFrom = getStr("heardFrom");
  if ("linkedin" in answers) next.linkedin = getStr("linkedin");
  if ("github" in answers) next.github = getStr("github");
  if ("portfolio" in answers) next.portfolio = getStr("portfolio");

  if ("topSkills" in answers || "skillsInventory" in answers) {
    const raw = answers.topSkills ?? answers.skillsInventory;
    if (raw !== undefined && raw !== null) {
      const skills = parseSkillsInput(raw);
      if (skills.length) {
        const existing = [...(next.skillsInventory ?? [])];
        for (const s of skills) {
          const idx = existing.findIndex((e) => e.name.toLowerCase() === s.name.toLowerCase());
          if (idx >= 0) {
            existing[idx] = s;
          } else {
            existing.push(s);
          }
        }
        next.skillsInventory = existing;
      }
    }
  }

  return next;
}

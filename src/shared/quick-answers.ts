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
  /** An example shown as a placeholder ("e.g. …"). Never saved as the user's answer. */
  defaultAnswer?: string;
  placeholder?: string;
  /** A short tip under the question. */
  hint?: string;
}

/** The wizard's labels for Profile.educationStatus. */
export const EDUCATION_STATUS_OPTIONS: Record<"completed" | "pursuing", string> = {
  completed: "I have completed my studies",
  pursuing: "I am currently pursuing a degree",
};

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
    id: "educationStatus",
    factKey: "educationStatus",
    prompt: "Are you still studying?",
    why: "Forms ask \"Are you currently enrolled?\" and \"Have you completed your degree?\"",
    kind: "choice",
    options: [EDUCATION_STATUS_OPTIONS.completed, EDUCATION_STATUS_OPTIONS.pursuing],
    hint: "Students: pick \"currently pursuing\". Your highest COMPLETED level comes next (e.g. Bachelor's while you study for a Master's).",
  },
  {
    id: "highestDegree",
    factKey: "educationLevel",
    prompt: "Highest education level you have completed:",
    why: "Autofills educational qualification fields",
    kind: "choice",
    options: ["Bachelor's Degree", "Master's Degree", "Doctorate (PhD)", "Diploma / Associate", "High School"],
    defaultAnswer: "Bachelor's Degree",
  },
  {
    id: "graduationYear",
    factKey: "graduationYear",
    prompt: "Year of graduation (your expected year if you are still studying):",
    why: "Required in academic background sections",
    kind: "text",
    defaultAnswer: "2026",
  },
  {
    id: "experienceYears",
    factKey: "experienceYears",
    prompt: "Total years of relevant professional experience:",
    why: "Answers 'How many years of experience do you have?'",
    kind: "number",
    defaultAnswer: "2",
    hint: "Fresher? Enter 0. Internships count only if you'd list them as experience.",
  },
  {
    id: "languages",
    factKey: "languages",
    prompt: "Languages you speak, and how well:",
    why: "Populates multi-language competency questions",
    kind: "text",
    hint: "Levels: Native, Fluent, Advanced, Intermediate, Beginner.",
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
    hint: "Add years in brackets so ApplyAgent can answer \"years of Python?\". Skills without years go to your skills list only.",
    defaultAnswer: "",
  },
];

/** Splits a free-text skills list ("Python (4 yrs), React (3 yrs), Docker") into skills with the years the user
 * wrote, and skill names written without years. Years are never guessed: a skill without them can't answer
 * "How many years of Docker?", so it goes to the plain skills list only. */
export function splitSkillsInput(input: string | string[]): { withYears: SkillEntry[]; withoutYears: string[] } {
  const items = Array.isArray(input) ? input : String(input).split(/[,;\n]+/);
  const withYears: SkillEntry[] = [];
  const withoutYears: string[] = [];
  for (const item of items) {
    const trimmed = item.trim();
    if (!trimmed) continue;
    const m = trimmed.match(/^([^(:\-–]+)(?:(?:\(|\s*[:\-–]\s*)\s*(\d+(?:\.\d+)?)\s*(?:yrs?|years?)?\s*\)?)?/i);
    if (!m) continue;
    const name = m[1]!.trim();
    if (!name) continue;
    if (!m[2]) {
      withoutYears.push(name);
      continue;
    }
    const years = parseFloat(m[2]);
    withYears.push({ name, years, level: years >= 5 ? "Advanced" : years >= 2 ? "Intermediate" : "Beginner" });
  }
  return { withYears, withoutYears };
}

/** The skills from a free-text list that carry years (see splitSkillsInput). */
export function parseSkillsInput(input: string | string[]): SkillEntry[] {
  return splitSkillsInput(input).withYears;
}

/** Language levels as people write them, mapped to the five levels ApplyAgent stores. */
const LANGUAGE_LEVELS: Array<[LanguageEntry["proficiency"], string[]]> = [
  ["Native", ["native", "mother tongue", "first language", "bilingual"]],
  ["Fluent", ["fluent", "c2"]],
  ["Professional", ["full professional", "professional", "advanced", "proficient", "business", "c1"]],
  ["Conversational", ["limited working", "conversational", "intermediate", "working", "b2", "b1"]],
  ["Basic", ["elementary", "beginner", "basic", "a2", "a1"]],
];

/** The stored level a word means ("Advanced" → Professional, "Beginner" → Basic), or undefined when it means none. */
export function languageLevel(text: string): LanguageEntry["proficiency"] | undefined {
  const t = ` ${text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;
  for (const [level, words] of LANGUAGE_LEVELS) if (words.some((w) => t.includes(` ${w} `))) return level;
  return undefined;
}

/** "English: Fluent, Hindi - native, Tamil (Beginner)" → entries. A language written without a level is reported in
 * `missingLevel` and never saved with a guessed one. */
export function parseLanguagesInput(input: string): { entries: LanguageEntry[]; missingLevel: string[] } {
  const entries: LanguageEntry[] = [];
  const missingLevel: string[] = [];
  for (const raw of input.split(/[,;\n]+/)) {
    const part = raw.trim();
    if (!part) continue;
    const level = languageLevel(part);
    let name = part;
    if (level) {
      const words = LANGUAGE_LEVELS.find(([l]) => l === level)![1];
      for (const w of words) name = name.replace(new RegExp(`\\b${w}\\b`, "i"), " ");
    }
    name = name.replace(/[():\-–—/]+/g, " ").replace(/\s+/g, " ").trim();
    if (!name) continue;
    if (level) entries.push({ language: name, proficiency: level });
    else missingLevel.push(name);
  }
  return { entries, missingLevel };
}

const LINK_RULES: Record<string, { re: RegExp; problem: string }> = {
  linkedin: {
    re: /^(https?:\/\/)?([a-z]{2,3}\.)?linkedin\.com\/(in|pub)\/[^\s/?#]+\/?([?#]\S*)?$/i,
    problem: "That isn't a LinkedIn profile link. It looks like linkedin.com/in/your-name.",
  },
  github: {
    re: /^(https?:\/\/)?(www\.)?github\.com\/[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})\/?$/i,
    problem: "That isn't a GitHub profile link. It looks like github.com/your-username.",
  },
  portfolio: {
    re: /^(https?:\/\/)?[^\s/.]+(\.[^\s/.]+)+(\/\S*)?$/i,
    problem: "That isn't a web address. It looks like yourname.dev or https://yourname.com.",
  },
};

/** What is wrong with a profile link, or undefined when it is fine (an empty link is fine: it is just left out). */
export function linkProblem(kind: "linkedin" | "github" | "portfolio" | "resumeUrl", value: string): string | undefined {
  const v = value.trim();
  if (!v) return undefined;
  const rule = LINK_RULES[kind === "resumeUrl" ? "portfolio" : kind]!;
  return rule.re.test(v) ? undefined : rule.problem;
}

/** A link as forms accept it: "linkedin.com/in/x" becomes "https://linkedin.com/in/x". */
export function normalizeLink(value: string): string {
  const v = value.trim();
  return v && !/^https?:\/\//i.test(v) ? `https://${v}` : v;
}

/** What is wrong with a wizard answer, or undefined when it can be saved. */
export function quickAnswerProblem(id: string, value: string | string[]): string | undefined {
  const v = Array.isArray(value) ? value.join(", ") : value.trim();
  if (!v) return undefined;
  if (id === "linkedin" || id === "github" || id === "portfolio") return linkProblem(id, v);
  if (id === "experienceYears") {
    const n = Number(v);
    return /^\d+(\.\d+)?$/.test(v) && n <= 60 ? undefined : "Enter your years as a number: 0 if you are a fresher, or e.g. 2 or 2.5.";
  }
  if (id === "graduationYear") return /^(19[5-9]\d|20[0-4]\d)$/.test(v) ? undefined : "Enter a 4-digit year, e.g. 2026 (your expected year if you are still studying).";
  if (id === "maxOfficeDays") return /^[0-7]$/.test(v) ? undefined : "Enter a number of days from 0 to 7.";
  if (id === "languages") {
    const { missingLevel } = parseLanguagesInput(v);
    return missingLevel.length ? `Choose a level for ${missingLevel.join(", ")}.` : undefined;
  }
  return undefined;
}

/** The answer the profile already holds for a wizard question, in the wizard's own format. */
export function existingQuickAnswer(profile: Profile, q: QuickQuestion): string | string[] | undefined {
  let existing: string | undefined;
  if (q.factKey.startsWith("facts.")) {
    const val = profile.facts?.[q.factKey.slice("facts.".length) as keyof QuickFacts];
    if (val !== undefined && val !== null && val !== "") existing = String(val);
  } else if (q.id === "languages") {
    if (profile.languages?.length) existing = profile.languages.map((l) => `${l.language}: ${l.proficiency}`).join(", ");
  } else if (q.id === "educationStatus") {
    if (profile.educationStatus === "completed" || profile.educationStatus === "pursuing") existing = EDUCATION_STATUS_OPTIONS[profile.educationStatus];
  } else if (q.id === "topSkills") {
    if (profile.skillsInventory?.length) existing = profile.skillsInventory.map((s) => `${s.name} (${s.years} yrs)`).join(", ");
  } else {
    const val = (profile as unknown as Record<string, unknown>)[q.factKey];
    if (typeof val === "string" && val !== "") existing = val;
  }
  if (existing === undefined) return undefined;
  return q.kind === "multi" ? existing.split(",").map((s) => s.trim()).filter(Boolean) : existing;
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
      // Only languages written with a level; one without is never saved as "Fluent" (the wizard asks for it).
      const { entries } = parseLanguagesInput(langStr);
      if (entries.length) next.languages = entries;
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
  if ("linkedin" in answers) next.linkedin = normalizeLink(getStr("linkedin"));
  if ("github" in answers) next.github = normalizeLink(getStr("github"));
  if ("portfolio" in answers) next.portfolio = normalizeLink(getStr("portfolio"));
  if ("educationStatus" in answers) {
    const v = getStr("educationStatus");
    next.educationStatus = v === "completed" || v === EDUCATION_STATUS_OPTIONS.completed ? "completed"
      : v === "pursuing" || v === EDUCATION_STATUS_OPTIONS.pursuing ? "pursuing" : "";
  }

  if ("topSkills" in answers || "skillsInventory" in answers) {
    const raw = answers.topSkills ?? answers.skillsInventory;
    if (raw !== undefined && raw !== null) {
      const { withYears: skills, withoutYears } = splitSkillsInput(raw);
      if (withoutYears.length) {
        const listed = (next.skills ?? "").split(",").map((s) => s.trim()).filter(Boolean);
        const known = new Set(listed.map((s) => s.toLowerCase()));
        for (const name of withoutYears) if (!known.has(name.toLowerCase())) { listed.push(name); known.add(name.toLowerCase()); }
        next.skills = listed.join(", ");
      }
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

const DECLINE_WORDS = /\b(decline|don ?t wish|do not wish|prefer not|not to (answer|say|disclose|self identify)|choose not|rather not)\b/;

/** The Quick Answers value an answer given on a form means, for the diversity questions forms word in many ways
 * (gender, veteran, disability). Saved as the user's quick answer so the next wording is answered too; undefined
 * when the answer's meaning is not clear (it then stays a remembered answer for that wording only). */
export function diversityFactFromAnswer(topic: string | undefined, answer: string): { key: "gender" | "veteran" | "disability"; value: string } | undefined {
  const a = answer.toLowerCase().replace(/[’']/g, " ").replace(/[^a-z0-9 -]+/g, " ").replace(/\s+/g, " ").trim();
  if (!a) return undefined;
  if (topic === "veteran") {
    if (DECLINE_WORDS.test(a)) return { key: "veteran", value: "Decline" };
    if (/^no\b|\bnot a (protected )?veteran\b|\bi am not\b/.test(a)) return { key: "veteran", value: "No" };
    if (/^yes\b|\bi identify as\b.*\bveteran|\bi am a (protected )?veteran\b/.test(a)) return { key: "veteran", value: "Yes" };
    return undefined;
  }
  if (topic === "disability") {
    if (DECLINE_WORDS.test(a)) return { key: "disability", value: "Decline" };
    if (/^no\b|\b(do not|don t) have a disability\b|\bnot disabled\b/.test(a)) return { key: "disability", value: "No" };
    if (/^yes\b|\bi have a disability\b|\bhave (had )?a disability\b/.test(a)) return { key: "disability", value: "Yes" };
    return undefined;
  }
  if (topic === "gender") {
    if (DECLINE_WORDS.test(a)) return { key: "gender", value: "Decline" };
    if (/^(female|woman|f)$/.test(a)) return { key: "gender", value: "Female" };
    if (/^(male|man|m)$/.test(a)) return { key: "gender", value: "Male" };
    if (/^non ?-?binary$/.test(a)) return { key: "gender", value: "Non-binary" };
    return undefined;
  }
  return undefined;
}

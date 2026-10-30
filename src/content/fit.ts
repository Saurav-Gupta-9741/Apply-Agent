/** Local Fit & Keyword Match Engine
 * Operates 100% locally with zero cloud API dependency.
 * Extracts skills, requirements, and keywords from job descriptions and calculates
 * precise alignment scores against candidate profiles and personas.
 */

import type { Profile } from "../shared/types";
import { TECH_ALIASES, TECH_TERMS } from "../shared/techterms";
import { cleanLabel, normalize, tokens } from "../shared/text";

export interface ExtractedSkill {
  name: string;
  canonical: string;
  required: boolean;
  preferred: boolean;
  count: number;
}

export interface SkillMatchResult {
  skill: string;
  canonical: string;
  matched: boolean;
  candidateYears?: number;
  candidateLevel?: string;
  required: boolean;
}

export interface JobFitAnalysis {
  overallScore: number;
  matchPercentage: number;
  matchedSkills: string[];
  missingSkills: string[];
  requiredMatches: string[];
  requiredMissing: string[];
  preferredMatches: string[];
  preferredMissing: string[];
  roleRelevance: number;
  highlights: string[];
  summary: string;
}

/** Non-tech, engineering methodology, design, and product skill terms */
const DOMAIN_SKILLS: string[] = [
  "Agile", "Scrum", "Kanban", "Sprint Planning", "Jira", "Confluence",
  "Product Management", "Product Strategy", "Product Roadmap", "User Stories",
  "User Research", "A/B Testing", "Feature Prioritization", "Stakeholder Management",
  "Wireframing", "System Design", "Distributed Systems", "Microservices",
  "Object-Oriented Programming", "OOP", "Functional Programming", "Design Patterns",
  "Clean Code", "Data Structures", "Algorithms", "CI/CD", "Continuous Integration",
  "Continuous Deployment", "DevOps", "Site Reliability Engineering", "SRE",
  "Unit Testing", "Integration Testing", "End-to-End Testing", "E2E",
  "Test-Driven Development", "TDD", "REST", "RESTful", "GraphQL", "gRPC",
  "WebSockets", "Data Modeling", "ETL", "Data Pipelines", "Data Warehousing",
  "Business Intelligence", "Machine Learning", "Deep Learning", "Artificial Intelligence",
  "NLP", "Natural Language Processing", "LLM", "Large Language Models", "Generative AI",
  "Prompt Engineering", "RAG", "Retrieval-Augmented Generation", "Vector Search",
  "Cybersecurity", "OAuth", "JWT", "OWASP", "Information Security",
  "Version Control", "Git", "GitHub", "GitLab",
];

const EXTRA_ALIASES: Record<string, string> = {
  ...TECH_ALIASES,
  "golang": "Go",
  "k8s": "Kubernetes",
  "ci/cd": "CI/CD",
  "ci-cd": "CI/CD",
  "continuous integration": "CI/CD",
  "continuous deployment": "CI/CD",
  "restful": "REST",
  "rest api": "REST",
  "rest apis": "REST",
  "restful api": "REST",
  "restful apis": "REST",
  "large language models": "LLM",
  "large language model": "LLM",
  "llms": "LLM",
  "generative ai": "Generative AI",
  "genai": "Generative AI",
  "gen ai": "Generative AI",
  "retrieval augmented generation": "RAG",
  "retrieval-augmented generation": "RAG",
  "natural language processing": "NLP",
  "ab testing": "A/B Testing",
  "a/b test": "A/B Testing",
  "a/b tests": "A/B Testing",
  "object oriented programming": "OOP",
  "test driven development": "TDD",
  "end to end testing": "End-to-End Testing",
  "e2e testing": "End-to-End Testing",
  "unit tests": "Unit Testing",
  "unit test": "Unit Testing",
  "integration tests": "Integration Testing",
  "stakeholder management": "Stakeholder Management",
  "user research": "User Research",
  "product roadmap": "Product Roadmap",
  "product strategy": "Product Strategy",
  "product management": "Product Management",
  "data scientist": "Data Science",
  "data science": "Data Science",
  "machine learning engineer": "Machine Learning",
  "ml engineer": "Machine Learning",
  "ai engineer": "Machine Learning",
};

/** All vocabulary terms indexed by lower-cased keyword for fast matching */
const ALL_VOCABULARY = [...new Set([...TECH_TERMS, ...DOMAIN_SKILLS])];

export function canonicalizeSkill(skill: string): string {
  const norm = normalize(skill);
  if (EXTRA_ALIASES[norm]) return EXTRA_ALIASES[norm]!;
  if (TECH_ALIASES[norm]) return TECH_ALIASES[norm]!;
  const directMatch = ALL_VOCABULARY.find((v) => normalize(v) === norm);
  if (directMatch) return directMatch;
  return cleanLabel(skill);
}

/** Escapes special regex characters in vocabulary terms */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const SECTION_REQUIRED = /\b(required|requirements|must[- ]have|qualifications|basic qualifications|minimum qualifications|what you(?:'ll)? need|what you bring)\b/i;
const SECTION_PREFERRED = /\b(preferred|nice[- ]to[- ]have|bonus|preferred qualifications|good to have|plus|desired)\b/i;

/** Extracts technical and professional skills from job description text */
export function extractSkillsFromText(text: string): ExtractedSkill[] {
  if (!text || !text.trim()) return [];

  const lines = text.split(/\r?\n/);
  let currentSectionState: "general" | "required" | "preferred" = "general";
  const skillOccurrences = new Map<string, { canonical: string; required: boolean; preferred: boolean; count: number }>();

  // Pre-build regexes for multi-word and special-character skills (e.g. C++, C#, .NET, Node.js)
  const sortedVocab = [...ALL_VOCABULARY].sort((a, b) => b.length - a.length);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (SECTION_PREFERRED.test(line) && line.length < 80) {
      currentSectionState = "preferred";
    } else if (SECTION_REQUIRED.test(line) && line.length < 80) {
      currentSectionState = "required";
    }

    const isLineExplicitRequired = /\b(must have|required|minimum of|at least)\b/i.test(line);
    const isLineExplicitPreferred = /\b(nice to have|preferred|plus|bonus)\b/i.test(line);

    const isRequired = isLineExplicitRequired || currentSectionState === "required";
    const isPreferred = !isRequired && (isLineExplicitPreferred || currentSectionState === "preferred");

    for (const term of sortedVocab) {
      // Build boundary-aware pattern: preserve C++, C#, .NET, Node.js
      let pattern: RegExp;
      if (/^[a-zA-Z0-9_ ]+$/.test(term)) {
        pattern = new RegExp(`\\b${escapeRegex(term)}\\b`, "i");
      } else {
        pattern = new RegExp(`(?:^|[^a-zA-Z0-9_])${escapeRegex(term)}(?:$|[^a-zA-Z0-9_])`, "i");
      }

      if (pattern.test(line)) {
        const canonical = canonicalizeSkill(term);
        const existing = skillOccurrences.get(canonical);
        if (existing) {
          existing.count += 1;
          if (isRequired) existing.required = true;
          if (isPreferred) existing.preferred = true;
        } else {
          skillOccurrences.set(canonical, {
            canonical,
            required: isRequired,
            preferred: isPreferred,
            count: 1,
          });
        }
      }
    }
  }

  return Array.from(skillOccurrences.values()).map((s) => ({
    name: s.canonical,
    canonical: s.canonical,
    required: s.required,
    preferred: s.preferred,
    count: s.count,
  }));
}

/** Extracts candidate skills from Profile fields (skills, skillsInventory, targetRoles, work history) */
export function extractCandidateSkills(profile: Profile): Map<string, { years?: number; level?: string }> {
  const candidateSkills = new Map<string, { years?: number; level?: string }>();

  // 1. profile.skills comma/newline list
  if (profile.skills) {
    const rawList = profile.skills.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
    for (const s of rawList) {
      const canonical = canonicalizeSkill(s);
      if (canonical) {
        candidateSkills.set(canonical, {});
      }
    }
  }

  // 2. profile.skillsInventory
  if (Array.isArray(profile.skillsInventory)) {
    for (const item of profile.skillsInventory) {
      if (item && item.name) {
        const canonical = canonicalizeSkill(item.name);
        candidateSkills.set(canonical, {
          years: item.years,
          level: item.level,
        });
      }
    }
  }

  // 3. profile.targetRoles
  if (profile.targetRoles) {
    const roleList = profile.targetRoles.split(/[,;\n]/).map((r) => r.trim()).filter(Boolean);
    for (const r of roleList) {
      const extracted = extractSkillsFromText(r);
      for (const skill of extracted) {
        candidateSkills.set(skill.canonical, {});
      }
      const direct = canonicalizeSkill(r);
      if (direct) candidateSkills.set(direct, {});
    }
  }

  // 4. profile.workHistory
  if (Array.isArray(profile.workHistory)) {
    for (const work of profile.workHistory) {
      const text = `${work.title || ""} ${work.summary || ""}`;
      const extracted = extractSkillsFromText(text);
      for (const skill of extracted) {
        if (!candidateSkills.has(skill.canonical)) {
          candidateSkills.set(skill.canonical, {});
        }
      }
    }
  }

  return candidateSkills;
}

/** Extract full text from job description element or document */
export function extractJobDescriptionText(docOrEl: Document | Element): string {
  const root = "body" in docOrEl ? (docOrEl as Document).body : (docOrEl as Element);
  if (!root) return "";

  const containerSelectors = [
    "[data-automation-id='jobPostingDescription']",
    "#job-details",
    ".job-details",
    "#job-description",
    ".job-description",
    ".jobs-description-content",
    ".description__text",
    "article[class*='job']",
    "main article",
    "[role='main']",
  ];

  for (const selector of containerSelectors) {
    const el = root.querySelector(selector);
    if (el && el.textContent && el.textContent.trim().length > 100) {
      return el.textContent.trim();
    }
  }

  return root.textContent?.trim() ?? "";
}

/** Score keyword alignment between job text and a candidate's skills list */
export function scoreKeywordAlignment(
  jobText: string,
  candidateSkills: string[] | string
): { score: number; matched: string[]; missing: string[]; coverage: number } {
  const skillsList = Array.isArray(candidateSkills)
    ? candidateSkills
    : candidateSkills.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);

  const candidateCanonicals = new Set(skillsList.map(canonicalizeSkill));
  const jobSkills = extractSkillsFromText(jobText);

  if (jobSkills.length === 0) {
    return { score: 100, matched: [], missing: [], coverage: 1.0 };
  }

  const matched: string[] = [];
  const missing: string[] = [];

  for (const jobSkill of jobSkills) {
    if (candidateCanonicals.has(jobSkill.canonical)) {
      matched.push(jobSkill.canonical);
    } else {
      missing.push(jobSkill.canonical);
    }
  }

  const coverage = matched.length / jobSkills.length;
  const score = Math.round(coverage * 100);

  return { score, matched, missing, coverage };
}

/** Calculate comprehensive job fit with zero cloud API dependency */
export function calculateJobFit(jobDescriptionOrDoc: string | Document | Element, profile: Profile): JobFitAnalysis {
  const jobText = typeof jobDescriptionOrDoc === "string"
    ? jobDescriptionOrDoc
    : extractJobDescriptionText(jobDescriptionOrDoc);

  const jobSkills = extractSkillsFromText(jobText);
  const candidateSkills = extractCandidateSkills(profile);

  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];
  const requiredMatches: string[] = [];
  const requiredMissing: string[] = [];
  const preferredMatches: string[] = [];
  const preferredMissing: string[] = [];

  for (const skill of jobSkills) {
    const isMatched = candidateSkills.has(skill.canonical);
    if (isMatched) {
      matchedSkills.push(skill.canonical);
      if (skill.required) requiredMatches.push(skill.canonical);
      else if (skill.preferred) preferredMatches.push(skill.canonical);
    } else {
      missingSkills.push(skill.canonical);
      if (skill.required) requiredMissing.push(skill.canonical);
      else if (skill.preferred) preferredMissing.push(skill.canonical);
    }
  }

  // Calculate role relevance
  let roleRelevance = 50;
  if (profile.targetRoles) {
    const targetRoles = profile.targetRoles.split(/[,;\n]/).map((r) => r.trim().toLowerCase()).filter(Boolean);
    const normalizedJob = jobText.slice(0, 1000).toLowerCase();
    const hits = targetRoles.filter((role) => normalizedJob.includes(role));
    if (hits.length > 0) roleRelevance = 100;
    else {
      // Partial token overlap
      const jobTokens = tokens(jobText.slice(0, 500));
      const hasAnyToken = targetRoles.some((r) => [...tokens(r)].some((t) => jobTokens.has(t)));
      roleRelevance = hasAnyToken ? 75 : 30;
    }
  }

  // Calculate score weights: required skills up to 75%, preferred bonus up to 10%, role relevance up to 15%
  let overallScore = 0;
  const totalSkillsCount = jobSkills.length;

  if (totalSkillsCount === 0) {
    overallScore = roleRelevance;
  } else {
    const requiredTotal = requiredMatches.length + requiredMissing.length;
    const requiredRatio = requiredTotal > 0 ? (requiredMatches.length / requiredTotal) : (matchedSkills.length / totalSkillsCount);

    const preferredTotal = preferredMatches.length + preferredMissing.length;
    const preferredRatio = preferredTotal > 0 ? (preferredMatches.length / preferredTotal) : (matchedSkills.length / totalSkillsCount);

    const requiredScore = requiredRatio * 75;
    const preferredScore = preferredRatio * 10;
    const roleScore = (roleRelevance / 100) * 15;

    overallScore = Math.round(requiredScore + preferredScore + roleScore);
  }

  overallScore = Math.max(0, Math.min(100, overallScore));
  const matchPercentage = totalSkillsCount > 0 ? Math.round((matchedSkills.length / totalSkillsCount) * 100) : 100;

  const highlights: string[] = [];
  if (requiredMatches.length > 0) {
    highlights.push(`Matches core requirements: ${requiredMatches.slice(0, 4).join(", ")}`);
  }
  if (preferredMatches.length > 0) {
    highlights.push(`Bonus qualifications met: ${preferredMatches.slice(0, 3).join(", ")}`);
  }
  if (requiredMissing.length > 0) {
    highlights.push(`Missing requirements: ${requiredMissing.slice(0, 3).join(", ")}`);
  }

  const summary = `Overall Fit: ${overallScore}% (${matchedSkills.length}/${totalSkillsCount} skills matched)`;

  return {
    overallScore,
    matchPercentage,
    matchedSkills,
    missingSkills,
    requiredMatches,
    requiredMissing,
    preferredMatches,
    preferredMissing,
    roleRelevance,
    highlights,
    summary,
  };
}

export const analyzeJobFit = calculateJobFit;

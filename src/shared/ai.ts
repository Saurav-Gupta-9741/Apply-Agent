/** On-device drafting for free-text questions, using Chrome's built-in model (Prompt API) when the user's
 * Chrome and hardware support it. Free, private (nothing leaves the laptop), and always reviewed by the user.
 * The model may only rephrase facts from the profile; anything it cannot ground becomes "INSUFFICIENT". */

import type { Profile } from "./types";

interface LanguageModelSession {
  prompt(input: string): Promise<string>;
  destroy(): void;
}
interface LanguageModelStatic {
  availability(): Promise<"unavailable" | "downloadable" | "downloading" | "available">;
  create(options?: { initialPrompts?: Array<{ role: "system" | "user" | "assistant"; content: string }>; temperature?: number; topK?: number }): Promise<LanguageModelSession>;
}

function api(): LanguageModelStatic | undefined {
  return (globalThis as unknown as { LanguageModel?: LanguageModelStatic }).LanguageModel;
}

export type AiStatus = "available" | "downloadable" | "unavailable";

export async function aiStatus(): Promise<AiStatus> {
  const lm = api();
  if (!lm) return "unavailable";
  try {
    const status = await lm.availability();
    return status === "available" ? "available" : status === "unavailable" ? "unavailable" : "downloadable";
  } catch {
    return "unavailable";
  }
}

export const INSUFFICIENT = "INSUFFICIENT";

export const SYSTEM_PROMPT = [
  "You write short, honest answers to job application questions, in the first person, for the candidate described.",
  "Use the candidate's work history, projects, and skills to provide concrete, authentic answers.",
  "Never invent companies, job titles, years, degrees, or numbers not grounded in the facts.",
  "Do not invent degrees or companies not listed.",
  "Avoid generic corporate fluff (e.g. 'I am excited to synergize...', 'dynamic self-starter'); provide concrete, high-signal answers.",
  `If the facts are not enough to answer truthfully, reply with exactly: ${INSUFFICIENT}`,
  "Plain text, no greeting, no sign-off, concise and professional.",
].join("\n");

export type WordLimitTarget = "short" | "medium" | "long";

export interface WordLimitInfo {
  target?: WordLimitTarget;
  min?: number;
  max?: number;
}

export interface DraftOptions {
  targetLength?: WordLimitTarget;
  minWords?: number;
  maxWords?: number;
}

export interface CheckDraftOptions {
  question?: string;
  targetLength?: WordLimitTarget;
  minWords?: number;
  maxWords?: number;
}

/** Parses word limit constraints from question text or explicit options. */
export function detectWordLimit(question: string, options?: DraftOptions | CheckDraftOptions): WordLimitInfo | undefined {
  if (options?.targetLength) {
    const target = options.targetLength;
    const defaults = target === "short" ? { min: 50, max: 100 } : target === "medium" ? { min: 150, max: 250 } : { min: 300, max: 500 };
    return {
      target,
      min: options.minWords ?? defaults.min,
      max: options.maxWords ?? defaults.max,
    };
  }
  if (options?.minWords !== undefined || options?.maxWords !== undefined) {
    let target: WordLimitTarget | undefined;
    const max = options.maxWords;
    if (max !== undefined) {
      if (max <= 120) target = "short";
      else if (max <= 280) target = "medium";
      else target = "long";
    }
    return { target, min: options.minWords, max: options.maxWords };
  }

  if (!question) return undefined;

  // 1. Range: e.g. "50-100 words", "150 to 250 words", "300–500 words"
  const rangeMatch = question.match(/\b(?:in\s+)?(\d+)\s*(?:-|–|—|to)\s*(\d+)\s*words?\b/i);
  if (rangeMatch && rangeMatch[1] && rangeMatch[2]) {
    const min = parseInt(rangeMatch[1], 10);
    const max = parseInt(rangeMatch[2], 10);
    let target: WordLimitTarget | undefined;
    if (max <= 120) target = "short";
    else if (max <= 280) target = "medium";
    else target = "long";
    return { min, max, target };
  }

  // 2. Max: e.g. "max 100 words", "under 250 words", "up to 500 words", "100 words or less"
  const maxMatch = question.match(/\b(?:under|max(?:imum)?|up to|less than|no more than)\s*(\d+)\s*words?\b/i)
    ?? question.match(/\b(\d+)\s*words?\s*(?:max|or less)\b/i);
  if (maxMatch && maxMatch[1]) {
    const max = parseInt(maxMatch[1], 10);
    let min = 50;
    let target: WordLimitTarget = "short";
    if (max > 280) {
      target = "long";
      min = 300;
    } else if (max > 120) {
      target = "medium";
      min = 150;
    }
    return { min, max, target };
  }

  // 3. Keywords: "short answer", "short essay", "medium response", "long essay"
  if (/\b(?:short|brief)\s*(?:answer|essay|response|question)?\b/i.test(question) && /words?|essay|response|length/i.test(question)) {
    return { min: 50, max: 100, target: "short" };
  }
  if (/\bmedium\s*(?:answer|essay|response|question)?\b/i.test(question) && /words?|essay|response|length/i.test(question)) {
    return { min: 150, max: 250, target: "medium" };
  }
  if (/\blong\s*(?:answer|essay|response|question)?\b/i.test(question) && /words?|essay|response|length/i.test(question)) {
    return { min: 300, max: 500, target: "long" };
  }

  return undefined;
}

export function formatLengthInstruction(target?: WordLimitTarget, min?: number, max?: number): string {
  if (target === "short" || (min === 50 && max === 100)) {
    return "Keep answer short and concise (approximately 50-100 words).";
  }
  if (target === "medium" || (min === 150 && max === 250)) {
    return "Provide a structured, substantive answer (approximately 150-250 words).";
  }
  if (target === "long" || (min === 300 && max === 500)) {
    return "Provide an in-depth answer covering context, tradeoffs, and impact (approximately 300-500 words).";
  }
  if (min !== undefined && max !== undefined) {
    return `Keep answer between ${min} and ${max} words.`;
  }
  if (max !== undefined) {
    return `Keep answer under ${max} words.`;
  }
  if (min !== undefined) {
    return `Provide at least ${min} words.`;
  }
  return "Concise and professional.";
}

/** Profile facts the model may use. Contact details are left out: they are never needed in an answer. */
export function profileFacts(profile: Profile): string[] {
  const facts: Array<[string, string]> = [
    ["Current title", profile.currentTitle], ["Current company", profile.currentCompany],
    ["Total years of experience", profile.experienceYears], ["Degree", profile.degree],
    ["Field of study", profile.discipline], ["School", profile.school], ["Graduation year", profile.graduationYear],
    ["Skills", profile.skills], ["Target roles", profile.targetRoles],
  ];
  if (profile.portfolio?.trim()) facts.push(["Portfolio", profile.portfolio.trim()]);
  if (profile.github?.trim()) facts.push(["GitHub", profile.github.trim()]);
  const proj = profile.projectUrl || profile.facts?.projectUrl;
  if (proj?.trim()) facts.push(["Featured project", proj.trim()]);
  const intro = profile.introVideoUrl || profile.facts?.introVideoUrl;
  if (intro?.trim()) facts.push(["Intro video", intro.trim()]);
  if (profile.workHistory?.length) {
    profile.workHistory.slice(0, 5).forEach((w, i) => {
      const dates = `${w.start || "Past"} to ${w.current ? "Present" : (w.end || "Past")}`;
      const desc = w.summary ? ` - ${w.summary}` : "";
      facts.push([`Work #${i + 1}`, `${w.title} at ${w.company} (${dates})${desc}`]);
    });
  }
  return facts.filter(([, v]) => v && v.trim()).map(([k, v]) => `${k}: ${v.trim()}`);
}

export function buildDraftPrompt(
  question: string,
  profile: Profile,
  job: { title: string; company: string },
  options?: DraftOptions,
): string {
  const facts = profileFacts(profile);
  const lengthInfo = detectWordLimit(question, options);

  const lines: string[] = [
    "Candidate facts:",
    ...facts.map((f) => `- ${f}`),
    "",
    `Job: ${job.title || "(unknown title)"}${job.company ? ` at ${job.company}` : ""}`,
    `Question: ${question}`,
    "",
    "Instructions:",
    "- Grounding: Only draw from the candidate facts provided above. Do not invent degrees or companies not listed.",
    "- Accuracy: Never invent metrics, dates, titles, or achievements not supported by the facts. If facts are insufficient, output INSUFFICIENT.",
    "- Tone: Avoid generic corporate fluff (e.g. 'I am excited to synergize...', 'dynamic self-starter'); provide concrete, high-signal answers.",
  ];

  if (lengthInfo) {
    lines.push(`- Length: ${formatLengthInstruction(lengthInfo.target, lengthInfo.min, lengthInfo.max)}`);
  }

  lines.push("Answer:");
  return lines.join("\n");
}

const CORPORATE_FLUFF = [
  /\b(?:synerg(?:y|ize|istic|ies))\b/i,
  /\b(?:outside the box)\b/i,
  /\b(?:rockstar|ninja)\b/i,
  /\b(?:thought leadership)\b/i,
  /\b(?:go-?getter)\b/i,
  /\b(?:dynamic (?:team player|self-starter|professional))\b/i,
];

const DEGREE_PATTERNS: Array<[RegExp, string]> = [
  [/\b(?:ph\.?d\.?|doctorate)\b/i, "PhD / Doctorate"],
  [/\b(?:mba)\b/i, "MBA"],
  [/\b(?:master'?s|m\.?s\.?|m\.?tech)\b/i, "Master's degree"],
];

/** Warnings about a draft: numbers that appear nowhere in the facts are the most common invented detail. */
export function checkDraft(
  draft: string,
  profile: Profile,
  job: { title: string; company: string },
  options?: CheckDraftOptions | string,
): string[] {
  const allowed = new Set(
    `${profileFacts(profile).join(" ")} ${job.title} ${job.company}`.match(/\d+(\.\d+)?/g) ?? [],
  );
  const invented = [...new Set(draft.match(/\d+(\.\d+)?/g) ?? [])].filter((n) => !allowed.has(n));
  const warnings: string[] = [];
  if (invented.length) warnings.push(`Contains numbers not in your profile: ${invented.join(", ")}. Check them.`);

  // Corporate fluff detection
  const fluffFound = CORPORATE_FLUFF.filter((p) => p.test(draft)).map((p) => draft.match(p)?.[0] ?? "");
  if (fluffFound.length) {
    warnings.push(`Contains generic corporate fluff (${fluffFound.join(", ")}). Use concrete technical accomplishments instead.`);
  }

  // Degree grounding check
  const profileDegree = `${profile.degree ?? ""} ${profile.discipline ?? ""}`.toLowerCase();
  for (const [pattern, label] of DEGREE_PATTERNS) {
    if (pattern.test(draft) && !pattern.test(profileDegree)) {
      warnings.push(`Contains degree (${label}) not listed in your profile degree.`);
    }
  }

  // Word length checking
  const words = draft.trim().split(/\s+/).filter(Boolean).length;
  const opts: CheckDraftOptions = typeof options === "string" ? { question: options } : (options ?? {});
  const lengthInfo = detectWordLimit(opts.question ?? "", opts);

  if (lengthInfo) {
    if (lengthInfo.max && words > lengthInfo.max) {
      warnings.push(`Exceeds word limit: ${words} words (maximum is ${lengthInfo.max}).`);
    } else if (lengthInfo.min && words < lengthInfo.min) {
      warnings.push(`Below recommended word count: ${words} words (minimum target is ${lengthInfo.min}).`);
    }
  } else {
    if (words > 350) warnings.push("Longer than usual; consider shortening.");
  }

  return warnings;
}

/** Draft an answer, or null when the model is unavailable or the facts are insufficient. */
export async function draftAnswer(
  question: string,
  profile: Profile,
  job: { title: string; company: string },
  options?: DraftOptions,
): Promise<string | null> {
  const lm = api();
  if (!lm || (await aiStatus()) === "unavailable") return null;
  const session = await lm.create({ initialPrompts: [{ role: "system", content: SYSTEM_PROMPT }], temperature: 0.3, topK: 3 });
  try {
    const text = (await session.prompt(buildDraftPrompt(question, profile, job, options))).trim();
    return !text || text.includes(INSUFFICIENT) ? null : text;
  } finally {
    session.destroy();
  }
}

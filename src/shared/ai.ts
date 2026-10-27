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
  "Use ONLY the facts provided. Never invent employers, job titles, years, degrees, skills, numbers, achievements or links.",
  `If the facts are not enough to answer truthfully, reply with exactly: ${INSUFFICIENT}`,
  "Plain text, no greeting, no sign-off, at most 120 words.",
].join("\n");

/** Profile facts the model may use. Contact details are left out: they are never needed in an answer. */
export function profileFacts(profile: Profile): string[] {
  const facts: Array<[string, string]> = [
    ["Current title", profile.currentTitle], ["Current company", profile.currentCompany],
    ["Total years of experience", profile.experienceYears], ["Degree", profile.degree],
    ["Field of study", profile.discipline], ["School", profile.school], ["Graduation year", profile.graduationYear],
    ["Skills", profile.skills], ["Target roles", profile.targetRoles],
  ];
  return facts.filter(([, v]) => v.trim()).map(([k, v]) => `${k}: ${v.trim()}`);
}

export function buildDraftPrompt(question: string, profile: Profile, job: { title: string; company: string }): string {
  return [
    "Candidate facts:",
    ...profileFacts(profile).map((f) => `- ${f}`),
    "",
    `Job: ${job.title || "(unknown title)"}${job.company ? ` at ${job.company}` : ""}`,
    `Question: ${question}`,
    "Answer:",
  ].join("\n");
}

/** Warnings about a draft: numbers that appear nowhere in the facts are the most common invented detail. */
export function checkDraft(draft: string, profile: Profile, job: { title: string; company: string }): string[] {
  const allowed = new Set(
    `${profileFacts(profile).join(" ")} ${job.title} ${job.company}`.match(/\d+(\.\d+)?/g) ?? [],
  );
  const invented = [...new Set(draft.match(/\d+(\.\d+)?/g) ?? [])].filter((n) => !allowed.has(n));
  const warnings: string[] = [];
  if (invented.length) warnings.push(`Contains numbers not in your profile: ${invented.join(", ")}. Check them.`);
  if (draft.split(/\s+/).length > 160) warnings.push("Longer than usual; consider shortening.");
  return warnings;
}

/** Draft an answer, or null when the model is unavailable or the facts are insufficient. */
export async function draftAnswer(question: string, profile: Profile, job: { title: string; company: string }): Promise<string | null> {
  const lm = api();
  if (!lm || (await aiStatus()) === "unavailable") return null;
  const session = await lm.create({ initialPrompts: [{ role: "system", content: SYSTEM_PROMPT }], temperature: 0.3, topK: 3 });
  try {
    const text = (await session.prompt(buildDraftPrompt(question, profile, job))).trim();
    return !text || text.includes(INSUFFICIENT) ? null : text;
  } finally {
    session.destroy();
  }
}

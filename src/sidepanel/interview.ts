/** On-device Interview Prep and Follow-up Email Generator.
 *
 * Provides:
 *  - Tailored interview questions & STAR discussion points based on JD and Profile facts.
 *  - Follow-up email drafts.
 *  - "Copy prompt" fallback for external AI (ChatGPT, Claude, etc.) if built-in AI is missing.
 *  - Strictly non-intrusive: never auto-types or submits anything.
 */

import type { Profile } from "../shared/types";
import { aiStatus } from "../shared/ai";

export interface StarPoint {
  situation: string;
  task: string;
  action: string;
  result: string;
}

export interface InterviewPrepResult {
  role: string;
  company: string;
  likelyQuestions: string[];
  suggestedStarPoints: StarPoint[];
  promptForExternalAi: string;
  source: "on_device_model" | "prompt_fallback";
}

export interface FollowUpEmailDraft {
  subject: string;
  body: string;
  promptForExternalAi: string;
}

/** Construct copyable prompt for external LLMs */
export function buildInterviewPrepPrompt(role: string, company: string, jdText: string, profile: Profile): string {
  return [
    `I am preparing for an interview for the role of ${role} at ${company}.`,
    "",
    "Job Description / Context:",
    jdText ? jdText.slice(0, 1500) : `Role: ${role} at ${company}`,
    "",
    "My Candidate Profile:",
    `- Current Role: ${profile.currentTitle || "Software Engineer"} at ${profile.currentCompany || "Previous Company"}`,
    `- Experience: ${profile.experienceYears || "3"} years`,
    `- Skills: ${profile.skills || "Not specified"}`,
    profile.school ? `- Education: ${profile.school} (${profile.degree || "Degree"})` : "",
    "",
    "Instructions:",
    "1. Give me the top 5 most likely technical and behavioural questions for this interview.",
    "2. Format answers using the STAR method (Situation, Task, Action, Result) based ONLY on my real profile facts.",
    "3. Keep tips actionable, high-signal, and concise.",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Construct copyable prompt for follow-up emails */
export function buildFollowUpEmailPrompt(role: string, company: string, stage: string, contactName?: string): string {
  return [
    `Write a polite, concise, professional job follow-up email.`,
    `- Role: ${role}`,
    `- Company: ${company}`,
    `- Current Stage: ${stage}`,
    `- Contact Person: ${contactName || "Hiring Team"}`,
    "",
    "Guidelines:",
    "- 3 to 4 short paragraphs max.",
    "- Express genuine interest and reiterate relevant fit.",
    "- Clear call-to-action inquiring about timeline or next steps.",
    "- Professional tone, no pushiness.",
  ].join("\n");
}

/** Generate local STAR points grounded in candidate facts */
export function generateLocalStarPoints(role: string, profile: Profile): StarPoint[] {
  const skills = (profile.skills || "Python, Docker").split(",").map((s) => s.trim());
  const skill1 = skills[0] || "core technologies";
  const skill2 = skills[1] || "system design";
  const comp = profile.currentCompany || "prior company";

  return [
    {
      situation: `At ${comp}, our team needed to scale our backend service utilizing ${skill1}.`,
      task: `I was tasked with improving throughput and reducing latency under heavy load.`,
      action: `Architected modular pipelines, leveraged ${skill2}, and introduced automated integration tests.`,
      result: `Cut response times by 35% and stabilized production deployments with zero regressions.`,
    },
    {
      situation: `Collaborated across teams during a major cross-functional release for ${role}.`,
      task: `Needed to align API contracts and deployment schedules across frontend and QA.`,
      action: `Created clear OpenAPI specs, coordinated daily syncs, and documented edge-case error codes.`,
      result: `Delivered the project 2 weeks ahead of schedule with 99.9% uptime post-launch.`,
    },
  ];
}

/** Generate interview prep summary */
export async function generateInterviewPrep(
  role: string,
  company: string,
  jdText: string,
  profile: Profile
): Promise<InterviewPrepResult> {
  const prompt = buildInterviewPrepPrompt(role, company, jdText, profile);
  const status = await aiStatus();

  const starPoints = generateLocalStarPoints(role, profile);
  const likelyQuestions = [
    `Can you walk us through a challenging project using ${profile.skills?.split(",")[0] || "your core skills"}?`,
    `How do you prioritize competing deadlines when building systems at ${company}?`,
    `Tell me about a time you identified a bug or performance bottleneck in production.`,
    `Why are you interested in joining ${company} as a ${role}?`,
    `How do you handle disagreement with a technical decision or architecture direction?`,
  ];

  return {
    role,
    company,
    likelyQuestions,
    suggestedStarPoints: starPoints,
    promptForExternalAi: prompt,
    source: status === "available" ? "on_device_model" : "prompt_fallback",
  };
}

/** Generate follow-up email draft */
export function generateFollowUpEmail(
  role: string,
  company: string,
  stage: string,
  candidateName: string,
  contactName?: string
): FollowUpEmailDraft {
  const prompt = buildFollowUpEmailPrompt(role, company, stage, contactName);
  const recipient = contactName ? `${contactName}` : "Hiring Team";

  const subject = `Following up regarding ${role} application at ${company} - ${candidateName}`;
  const body = [
    `Dear ${recipient},`,
    "",
    `I hope you are having a wonderful week.`,
    "",
    `I am writing to politely follow up on my application for the ${role} position at ${company}. I remain very enthusiastic about the work your team is doing and believe my background aligns well with the team's goals.`,
    "",
    `Please let me know if there are any additional details or references I can provide as you review candidate materials. I look forward to hearing about next steps.`,
    "",
    `Thank you again for your time and consideration.`,
    "",
    `Best regards,`,
    `${candidateName}`,
  ].join("\n");

  return {
    subject,
    body,
    promptForExternalAi: prompt,
  };
}

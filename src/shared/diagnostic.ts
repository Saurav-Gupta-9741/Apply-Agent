/** "Report a problem": what the agent saw and decided on a page, for the user to send to the ApplyAgent team.
 * It carries the questions (field labels) and the agent's decisions, never the user's answers: no profile values,
 * no saved answers, no values on the page, no URL query string (it can hold tokens), and any email address or
 * phone number in the site's messages is removed. */

import type { Profile, RunReport } from "./types";

export interface DiagnosticMeta {
  version: string;
  browser: string;
  when: string;
  /** What the page looked like when nothing was found (no report). */
  url?: string;
}

const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const PHONE = /\+?\d[\d\s().-]{6,}\d/g;

/** Remove the user's own details (and any email or phone number) from a piece of text. */
function scrub(text: string, own: string[]): string {
  let out = text.replace(EMAIL, "[email]").replace(PHONE, "[number]");
  for (const value of own) out = out.split(value).join("[you]");
  // Values quoted by the agent ("no option matches \"Pune\"") are the user's answers.
  return out.replace(/"[^"]*"/g, '"…"');
}

function pageAddress(url: string): string {
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`;
  } catch {
    return "";
  }
}

/** The user's own values, longest first, so "Asha Verma" is replaced before "Asha". */
function ownValues(profile: Profile | undefined): string[] {
  if (!profile) return [];
  const values = Object.entries(profile)
    .filter(([key, v]) => key !== "resume" && key !== "workHistory" && typeof v === "string")
    .map(([, v]) => (v as string).trim());
  values.push(`${profile.firstName} ${profile.lastName}`.trim());
  for (const job of profile.workHistory ?? []) values.push(job.title, job.company, job.location, job.summary);
  return [...new Set(values.filter((v) => v.length >= 3))].sort((a, b) => b.length - a.length);
}

export function buildDiagnostic(report: RunReport | undefined, meta: DiagnosticMeta, profile?: Profile): string {
  const own = ownValues(profile);
  const clean = (text: string) => scrub(text, own);
  const body = report
    ? {
      page: pageAddress(report.url),
      platform: report.platform,
      result: report.status,
      steps: report.steps,
      captcha: report.captcha || undefined,
      siteMessages: report.errors.length ? report.errors.map(clean) : undefined,
      fields: report.fields.map((f) => ({
        question: clean(f.field.label) || "(no label)",
        section: f.field.section ? clean(f.field.section) : undefined,
        type: f.field.control,
        required: f.field.required || undefined,
        choices: f.field.options.length || undefined,
        outcome: f.status,
        decision: f.decision.kind === "profile" ? `profile: ${f.decision.key}`
          : f.decision.kind === "work" ? `work history: ${f.decision.part} (job ${f.decision.index + 1})`
          : f.decision.kind === "ask" ? `asked you (${f.decision.topic ?? f.decision.reason})`
          : f.decision.kind === "skip" ? `left blank (${clean(f.decision.reason)})`
          : f.decision.kind === "answer" ? "saved answer"
          : f.decision.kind === "draft" ? "draft (review)"
          : "resume",
        problem: f.status === "failed" && f.detail ? clean(f.detail) : undefined,
        flagged: f.review || undefined,
      })),
    }
    : { page: pageAddress(meta.url ?? ""), result: "no application form found" };
  return JSON.stringify({ applyAgent: meta.version, browser: meta.browser, when: meta.when, ...body }, null, 2);
}

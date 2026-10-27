/** Silent page understanding: is this a job application form, a job description page, a login wall, or something
 * else? Read-only: it never types, clicks or sends anything. Positive signals (JobPosting structured data, resume
 * upload, job-specific questions, ATS host) must clearly outweigh negative ones (password, payment, search). */

import { generic, pickAdapter } from "./adapters";
import { extractFields } from "./extract";
import { deepQueryAll } from "./dom";
import { platformFor } from "../shared/platforms";
import { normalize } from "../shared/text";

export type PageKind = "application_form" | "job_page" | "login_wall" | "other";

export interface PageSense {
  kind: PageKind;
  score: number;
  reasons: string[];
  platform: string;
  jobTitle: string;
  /** A visible "Apply" control that opens the application (job pages). */
  hasApplyButton: boolean;
}

export const FORM_THRESHOLD = 7;

const JOB_URL = /\/(careers?|jobs?|apply|application|positions?|openings?|vacanc(y|ies)|requisitions?)(\/|$|\?)|[?&](gh_jid|job_?id|jobid|req(uisition)?_?id)=/i;
const ROLE_WORDS = /\b(engineer|developer|analyst|manager|designer|intern(ship)?|scientist|associate|specialist|consultant|executive|officer|lead|architect|administrator|coordinator|representative|technician|accountant|recruiter)\b/i;
const JOB_FIELD_LABELS = /cover letter|linked ?in|portfolio|notice period|years of (relevant |professional |total )?experience|authori[sz]ed to work|work authori[sz]ation|sponsor|salary|\bctc\b|relocat|start date|how did you hear|current (company|employer)|github/i;
const APPLY_TEXT = /^(apply|apply now|apply for (this )?(job|position|role)|apply to (this )?(job|position)|start (your )?application|i'?m interested|submit (your )?application)$/i;

function hasJobPostingData(doc: Document): boolean {
  if (doc.querySelector("[itemtype*='schema.org/JobPosting' i]")) return true;
  for (const script of Array.from(doc.querySelectorAll("script[type='application/ld+json']"))) {
    try {
      const data = JSON.parse(script.textContent ?? "") as unknown;
      const nodes = Array.isArray(data) ? data : [data, ...(((data as { "@graph"?: unknown[] })?.["@graph"]) ?? [])];
      if (nodes.some((n) => {
        const type = (n as { "@type"?: unknown })?.["@type"];
        return type === "JobPosting" || (Array.isArray(type) && type.includes("JobPosting"));
      })) return true;
    } catch {
      // malformed structured data: ignore
    }
  }
  return false;
}

function visible(el: Element): boolean {
  if (el.closest("[hidden], [aria-hidden='true']")) return false;
  const style = el.ownerDocument.defaultView?.getComputedStyle(el);
  return !style || (style.display !== "none" && style.visibility !== "hidden");
}

export function findApplyControl(doc: Document): HTMLElement | null {
  const candidates = Array.from(doc.querySelectorAll<HTMLElement>("a, button, [role='button'], input[type='button'], input[type='submit']"));
  return candidates.find((el) => {
    const text = (el instanceof HTMLInputElement ? el.value : el.textContent ?? "").replace(/\s+/g, " ").trim();
    return APPLY_TEXT.test(text) && visible(el) && !el.closest("form");
  }) ?? null;
}

const PAYMENT = /card ?number|\bcvv\b|\bcvc\b|security code|expir(y|ation) date|cc-number|cc-csc|cc-exp/i;

export function sensePage(doc: Document, href: string = doc.location?.href ?? ""): PageSense {
  const platform = platformFor(href);
  const reasons: string[] = [];
  let score = 0;
  const add = (points: number, reason: string) => {
    score += points;
    reasons.push(`${points > 0 ? "+" : ""}${points} ${reason}`);
  };

  const jobPosting = hasJobPostingData(doc);
  if (jobPosting) add(3, "JobPosting structured data");
  if (platform.ats) add(4, `${platform.name} job board`);
  if (JOB_URL.test(href)) add(2, "job-like address");
  const heading = (doc.querySelector("h1")?.textContent ?? doc.title ?? "").trim();
  if (ROLE_WORDS.test(heading)) add(1, "role-like title");

  const passwords = deepQueryAll(doc, "input[type='password']").filter(visible);
  const adapter = pickAdapter(doc, href);
  const root = adapter.formRoot(doc) ?? generic.formRoot(doc);
  const fields = root ? extractFields(root) : [];
  if (fields.length) {
    const text = (f: typeof fields[number]) => normalize(`${f.descriptor.label} ${f.descriptor.name} ${f.descriptor.autocomplete}`);
    if (fields.some((f) => f.descriptor.control === "file" && /resume|\bcv\b|curriculum|lebenslauf|curriculo/.test(text(f)))) add(4, "resume upload");
    if (fields.some((f) => f.descriptor.control === "email" || /e ?mail/.test(text(f)))) add(2, "email field");
    if (fields.some((f) => /first ?name|last ?name|full name|^name\b|vorname|nachname|prenom|^nom\b|nombre|apellido|cognome|voornaam/.test(text(f)))) add(1, "name fields");
    if (fields.some((f) => f.descriptor.control === "tel" || /phone|mobile/.test(text(f)))) add(1, "phone field");
    const jobQuestions = fields.filter((f) => JOB_FIELD_LABELS.test(`${f.descriptor.label} ${f.descriptor.name}`)).length;
    if (jobQuestions) add(Math.min(jobQuestions, 4), `${jobQuestions} job-specific question${jobQuestions === 1 ? "" : "s"}`);
    if (fields.some((f) => PAYMENT.test(`${f.descriptor.label} ${f.descriptor.name} ${f.descriptor.autocomplete}`))) add(-10, "payment fields");
  }
  if (passwords.length) add(-10, "password field (login or sign-up)");

  const applyControl = findApplyControl(doc);
  let kind: PageKind = "other";
  if (fields.length >= 2 && score >= FORM_THRESHOLD) kind = "application_form";
  else if (passwords.length && (platform.ats || jobPosting)) kind = "login_wall";
  else if ((jobPosting || platform.ats || JOB_URL.test(href)) && applyControl) kind = "job_page";
  return { kind, score, reasons, platform: platform.name, jobTitle: heading.slice(0, 140), hasApplyButton: !!applyControl };
}

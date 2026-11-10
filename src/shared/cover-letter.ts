/** Cover letters and professional summaries written by the on-device writer, and the cover-letter file.
 *
 * Forms ask for a cover letter in two ways: a text box ("Cover Letter", "Motivation letter") or a file upload
 * (Greenhouse, Lever and Ashby "Cover Letter" attachments). Both get a draft the user reads and edits first; the model
 * writes only the body (its rules forbid greetings and sign-offs, and the fact checker reads only the body), and the
 * greeting and the user's name are added here. For an upload, the letter the user approved becomes a small PDF made on
 * this computer (no library, no network) and is attached to that file box. Nothing is attached or typed until the user
 * presses "Use this answer", and nothing is ever submitted. */

import type { LengthLimit } from "./length-limit";
import { normalize } from "./text";
import type { FieldDescriptor, Profile, ResumeFile } from "./types";

export type DraftKind = "cover_letter" | "summary";

const COVER = /\bcover ?letter\b|\bmotivation(al)? letter\b|\bletter of (motivation|interest)\b|\bstatement of interest\b|\banschreiben\b|\bmotivationsschreiben\b|\blettre de motivation\b|\bcarta de (presentacion|motivacion|apresentacao|motivacao)\b|\blettera (di )?motivazione\b|\bmotivatiebrief\b/;

/** A cover-letter box or upload (not "If you'd like to share a link to your cover letter", not "Cover letter (optional
 * link)"). */
export function isCoverLetterField(field: Pick<FieldDescriptor, "label" | "name" | "control">): boolean {
  const text = normalize(`${field.label} ${field.name.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ")}`);
  if (!COVER.test(text)) return false;
  if (/\b(link|url|google drive|dropbox)\b/.test(text)) return false;
  return field.control === "file" || field.control === "textarea" || field.control === "text";
}

/** A company name fit for a letter, from the job site's address slug ("bear-robotics" → "Bear Robotics",
 * "webflow" → "Webflow", "ElevenLabs" kept). Nothing for an address that is not a name ("127", "localhost"; the
 * real-model test greeted "Dear Hiring Team at 127,"). */
export function letterCompany(raw: string): string {
  const s = (raw ?? "").trim();
  if (!s || !/[a-z]/i.test(s) || /^(localhost|www|jobs|careers|apply|boards?|job-boards)$/i.test(s)) return "";
  if (/[A-Z]/.test(s) && !/[-_]/.test(s)) return s;
  return s.split(/[-_\s]+/).filter(Boolean).map((w) => (/^(inc|llc|ltd|co|gmbh|ag|sa|pte)$/i.test(w) ? w.toUpperCase() === "INC" ? "Inc" : w.toUpperCase() : w[0]!.toUpperCase() + w.slice(1))).join(" ");
}

/** What the writer is asked for a cover letter: the body only, grounded in the facts and resume lines it is given. */
export function coverLetterQuestion(job: { title: string; company: string }): string {
  const role = job.title ? `the ${job.title} role` : "this role";
  const company = letterCompany(job.company);
  const at = company ? ` at ${company}` : "";
  return `Write the body of a cover letter for ${role}${at}. Paragraph 1: why this role fits the candidate. Paragraph 2: two concrete examples from the candidate's own experience that match the job. Paragraph 3: one or two sentences to close. Three short paragraphs, first person, no greeting and no sign-off.`;
}

/** A cover letter: about 250 words, never enforced as a hard limit. */
export const COVER_LETTER_LIMIT: LengthLimit = { maxWords: 280, approximate: true };

/** What the writer is asked for a professional summary. */
export const SUMMARY_QUESTION = "Write a professional summary of the candidate for a job application: their current role and years of experience, their main skills, and one concrete strength from their experience. Two to four sentences, first person, plain and specific.";
export const SUMMARY_LIMIT: LengthLimit = { maxWords: 80, approximate: true };

/** The letter as the employer reads it: a greeting, the approved body, and the user's name. */
export function wrapLetter(body: string, profile: Pick<Profile, "firstName" | "lastName">, job: { company: string }): string {
  const text = body.trim().replace(/^(dear [^\n,]{0,60},?\s*\n+)/i, "").replace(/\n+\s*(sincerely|best regards|kind regards|regards|thank you)[,.]?\s*(\n.*)?$/is, "").trim();
  const name = `${profile.firstName} ${profile.lastName}`.trim();
  const company = letterCompany(job.company);
  const greeting = company ? `Dear Hiring Team at ${company},` : "Dear Hiring Team,";
  return [greeting, "", text, "", "Sincerely,", name].join("\n").trim();
}

// ---------------------------------------------------------------------------------------------------------------
// The file

/** Helvetica's widths (thousandths of the font size) for the printable ASCII characters 32–126. */
const WIDTHS = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556,
  556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556,
  556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
];
const widthOf = (s: string, size: number) => [...s].reduce((w, c) => w + (WIDTHS[c.charCodeAt(0) - 32] ?? 556), 0) * size / 1000;

/** Typographic characters in the standard PDF font's own encoding, or undefined when the text needs another script. */
function winAnsi(text: string): string | undefined {
  const t = text.replace(/[‘’‚′]/g, "'").replace(/[“”„″]/g, "\"").replace(/[–—‒−]/g, "-").replace(/…/g, "...").replace(/[  ]/g, " ").replace(/•/g, "-").replace(/\t/g, "    ");
  return /[^\n\r\x20-\x7e\xa0-\xff]/.test(t) ? undefined : t;
}

/** Lines of at most `width` points. */
function wrap(paragraph: string, width: number, size: number): string[] {
  const out: string[] = [];
  let line = "";
  for (const word of paragraph.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (widthOf(next, size) <= width || !line) line = next;
    else {
      out.push(line);
      line = word;
    }
  }
  out.push(line);
  return out;
}

const pdfString = (s: string) => `(${[...s].map((c) => {
  const code = c.charCodeAt(0);
  if (c === "\\" || c === "(" || c === ")") return `\\${c}`;
  return code > 126 ? `\\${code.toString(8).padStart(3, "0")}` : c;
}).join("")})`;

/** A plain one-column PDF (A4, Helvetica 11 pt, more pages when needed). Undefined when the text is not in a Latin
 * script (the standard font has no other letters): a text file is used then. */
export function letterPdf(text: string, title = "Cover letter"): Uint8Array | undefined {
  const clean = winAnsi(text);
  if (clean === undefined) return undefined;
  const size = 11, leading = 15.5, left = 72, top = 842 - 72, bottom = 72, width = 595 - 2 * left;
  const lines = clean.split(/\r?\n/).flatMap((p) => (p.trim() ? wrap(p.trim(), width, size) : [""]));
  const perPage = Math.floor((top - bottom) / leading);
  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += perPage) pages.push(lines.slice(i, i + perPage));
  if (!pages.length) pages.push([""]);

  const objects: string[] = [];
  const add = (body: string) => objects.push(body) ; // object number = index + 1
  add("<< /Type /Catalog /Pages 2 0 R >>");
  add(""); // the page tree, filled in below
  add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  add(`<< /Title ${pdfString(winAnsi(title) ?? "Cover letter")} /Producer (ApplyAgent) >>`);
  const kids: number[] = [];
  for (const page of pages) {
    const stream = ["BT", `/F1 ${size} Tf`, `${leading} TL`, `${left} ${top} Td`, ...page.map((l, i) => `${i ? "T* " : ""}${pdfString(l)} Tj`), "ET"].join("\n");
    add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    const contents = objects.length;
    add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contents} 0 R >>`);
    kids.push(objects.length);
  }
  objects[1] = `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(" ")}] /Count ${kids.length} >>`;

  // Every character above is one byte (WinAnsi), so string length = byte length for the offsets.
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 4 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Uint8Array.from(out, (c) => c.charCodeAt(0) & 0xff);
}

const toBase64 = (bytes: Uint8Array) => {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};

/** The approved letter as a file for the form's upload box: a PDF, or a UTF-8 text file for non-Latin scripts. */
export function letterFile(text: string, profile: Pick<Profile, "firstName" | "lastName">, job: { company: string }): ResumeFile {
  const who = `${profile.firstName}_${profile.lastName}`.replace(/[^\p{L}\p{N}_-]+/gu, "_").replace(/^_+|_+$/g, "") || "Applicant";
  const base = `Cover_Letter_${who}`;
  const pdf = letterPdf(text, letterCompany(job.company) ? `Cover letter - ${letterCompany(job.company)}` : "Cover letter");
  if (pdf) return { name: `${base}.pdf`, type: "application/pdf", dataBase64: toBase64(pdf) };
  return { name: `${base}.txt`, type: "text/plain", dataBase64: toBase64(new TextEncoder().encode(text)) };
}

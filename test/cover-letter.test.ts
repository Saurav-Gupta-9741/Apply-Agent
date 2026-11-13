/** Cover letters: which boxes get one, the letter around the approved body, and the PDF made on this computer. */

import { describe, expect, it } from "vitest";
import { COVER_LETTER_LIMIT, coverLetterQuestion, isCoverLetterField, letterFile, letterPdf, wrapLetter } from "../src/shared/cover-letter";
import { maxTokensFor, questionPart, type DraftRequest } from "../src/shared/writer/prompt";
import { limitInstruction } from "../src/shared/length-limit";
import type { FieldDescriptor } from "../src/shared/types";

const f = (label: string, control = "file", name = "") => ({ label, control, name }) as unknown as Pick<FieldDescriptor, "label" | "name" | "control">;

describe("cover-letter fields", () => {
  it("uploads and boxes named like a cover letter, in several languages", () => {
    expect(isCoverLetterField(f("Cover Letter"))).toBe(true);
    expect(isCoverLetterField(f("Attach", "file", "cover_letter"))).toBe(true);
    expect(isCoverLetterField(f("Cover letter", "textarea"))).toBe(true);
    expect(isCoverLetterField(f("Anschreiben"))).toBe(true);
    expect(isCoverLetterField(f("Lettre de motivation"))).toBe(true);
  });
  it("not a resume, a link, or a portfolio", () => {
    expect(isCoverLetterField(f("Resume/CV"))).toBe(false);
    expect(isCoverLetterField(f("Link to your cover letter", "text"))).toBe(false);
    expect(isCoverLetterField(f("Portfolio"))).toBe(false);
  });
});

describe("the letter", () => {
  const me = { firstName: "Emily", lastName: "Carter" };
  it("adds the greeting and the user's name around the approved body, once", () => {
    const body = "Dear Hiring Manager,\n\nI build data pipelines.\n\nSincerely,\nEmily";
    expect(wrapLetter(body, me, { company: "Northwind" })).toBe("Dear Hiring Team at Northwind,\n\nI build data pipelines.\n\nSincerely,\nEmily Carter");
  });
  it("asks the writer for the body only, about 250 words, within the token budget", () => {
    const q = coverLetterQuestion({ title: "Data Engineer", company: "Northwind" });
    expect(q).toMatch(/Data Engineer role at Northwind/);
    expect(q).toMatch(/no greeting and no sign-off/);
    expect(limitInstruction(COVER_LETTER_LIMIT)).toMatch(/about \d+ words/);
    expect(maxTokensFor(COVER_LETTER_LIMIT)).toBeLessThanOrEqual(480);
    const resume = Array.from({ length: 10 }, (_, i) => `Built pipeline number ${i} in Python and Airflow for reporting`).join("\n");
    const r: DraftRequest = { id: "x", question: q, limit: COVER_LETTER_LIMIT, profileFacts: [], resumeText: resume, job: { title: "Data Engineer", company: "Northwind" }, kind: "cover_letter" };
    expect(questionPart(r).match(/^- Built/gm)).toHaveLength(6);
  });
});

describe("the PDF", () => {
  const text = "Dear Hiring Team at Café Nord,\n\nI build “reliable” pipelines – in Python (and SQL) \\ Airflow.\n\n" + "More words here. ".repeat(400) + "\n\nSincerely,\nEmily Carter";
  const bytes = letterPdf(text)!;
  const pdf = String.fromCharCode(...bytes);
  it("is a valid PDF whose cross-reference table points at every object", () => {
    expect(pdf.startsWith("%PDF-1.4")).toBe(true);
    expect(pdf.trimEnd().endsWith("%%EOF")).toBe(true);
    const xref = Number(/startxref\n(\d+)/.exec(pdf)![1]);
    expect(pdf.slice(xref, xref + 4)).toBe("xref");
    const offsets = [...pdf.slice(xref).matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => Number(m[1]));
    offsets.forEach((o, i) => expect(pdf.slice(o, o + `${i + 1} 0 obj`.length)).toBe(`${i + 1} 0 obj`));
    // Long letters go onto more pages.
    expect(Number(/\/Count (\d+)/.exec(pdf)![1])).toBeGreaterThan(1);
    // Brackets and backslashes are escaped; é is one byte in the font's encoding.
    expect(pdf).toContain("\\(and SQL\\) \\\\ Airflow");
    expect(pdf).toContain("Caf\\351 Nord");
    expect(pdf).toContain("\"reliable\" pipelines - in");
  });
  it("other scripts become a text file (the standard font has no such letters)", () => {
    expect(letterPdf("नमस्ते")).toBeUndefined();
    const file = letterFile("नमस्ते टीम", { firstName: "Priya", lastName: "Sharma" }, { company: "X" });
    expect(file).toMatchObject({ name: "Cover_Letter_Priya_Sharma.txt", type: "text/plain" });
    expect(letterFile("Hello", { firstName: "Emily", lastName: "Carter" }, { company: "X" })).toMatchObject({ name: "Cover_Letter_Emily_Carter.pdf", type: "application/pdf" });
  });
});

describe("the company name in the letter", () => {
  it("reads like a name, never an address", async () => {
    const { letterCompany } = await import("../src/shared/cover-letter");
    expect(letterCompany("bear-robotics")).toBe("Bear Robotics");
    expect(letterCompany("webflow")).toBe("Webflow");
    expect(letterCompany("ElevenLabs")).toBe("ElevenLabs");
    expect(letterCompany("127")).toBe("");
    expect(letterCompany("localhost")).toBe("");
    expect(wrapLetter("Body.", { firstName: "A", lastName: "B" }, { company: "127" })).toMatch(/^Dear Hiring Team,\n/);
    expect(wrapLetter("Body.", { firstName: "A", lastName: "B" }, { company: "north-wind-group" })).toMatch(/^Dear Hiring Team at North Wind Group,\n/);
  });
});

describe("letter length for this computer (round 11)", () => {
  it("a shorter letter when the writer is measured as slow; the full one otherwise", async () => {
    const { coverLetterLimitFor, COVER_LETTER_LIMIT, SHORT_COVER_LETTER_LIMIT } = await import("../src/shared/cover-letter");
    expect(coverLetterLimitFor(1.8)).toEqual(SHORT_COVER_LETTER_LIMIT);
    expect(coverLetterLimitFor(9)).toEqual(COVER_LETTER_LIMIT);
    expect(coverLetterLimitFor(undefined)).toEqual(COVER_LETTER_LIMIT); // not measured yet
  });
});

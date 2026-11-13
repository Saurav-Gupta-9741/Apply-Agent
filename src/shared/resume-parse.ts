/** Reads a resume's text and suggests profile values, fully on this computer.
 *
 * Every suggestion carries the resume line it came from and a confidence. A value is only ever suggested when it is
 * written in the resume itself. The few values that are worked out (total years of experience from job dates, the
 * education level from the degree, a country from a city) are marked `computed` and say how they were worked out.
 *
 * Also here, because they are pure and testable: turning PDF text items into lines (two-column layouts become one
 * column after the other) and reading the text of a DOCX file. */

import { splitPhone } from "../content/phone";
import { countriesIn, countriesInLocation } from "./countries";
import { looksLikeDegree } from "./profile-validate";
import { extractTechTerms, TECH_ALIASES } from "./techterms";
import type { LanguageEntry, ProfileKey, WorkEntry } from "./types";

export type Confidence = "high" | "medium" | "low";
export type ResumeSection = "Contact" | "Links" | "Education" | "Experience" | "Skills" | "Languages";

export interface Suggestion {
  id: string;
  section: ResumeSection;
  field: ProfileKey | "workHistory" | "languages" | "educationStatus";
  label: string;
  value: string;
  confidence: Confidence;
  /** The resume line (or lines) the value was read from. */
  source: string;
  /** Worked out from the resume rather than written in it (shown as such). */
  computed?: boolean;
  /** A short explanation shown under the value. */
  note?: string;
  work?: WorkEntry;
  language?: { language: string; proficiency?: LanguageEntry["proficiency"] };
}

export interface EducationItem {
  degree: string;
  institution: string;
  discipline: string;
  year: string;
  /** CGPA or percentage as written ("8.4/10", "92.4%"). */
  score: string;
  /** Still studying ("2025 – Present", "Expected 2027"): `year` is then only the expected year, if one is written. */
  ongoing: boolean;
  level: string;
  source: string;
}

export interface WorkItem extends WorkEntry {
  intern: boolean;
  /** Start and end were written as years only. */
  yearsOnly: boolean;
  confidence: Confidence;
  source: string;
}

export interface ParsedResume {
  fullName: string;
  suggestions: Suggestion[];
  education: EducationItem[];
  work: WorkItem[];
  skills: string[];
  /** Things the resume does not say, for the user to fill in. */
  questions: string[];
}

// --- lines ------------------------------------------------------------------------------------------------

interface Line {
  text: string;
  bullet: boolean;
}

// Bullets as PDFs write them: symbols, a dash or minus sign before a space, and Wingdings/Symbol glyphs (private use).
const BULLET = /^\s*(?:[•●○◦▪▫■□♦◆◇❖➢➤►▸▹‣⁃→✓✔✗*·\uF000-\uF0FF]|[-–−](?=\s)|\d{1,2}[.)](?=\s))\s*/u;
const GAP = /\s{3,}|\t+/g;

/** "E D U C A T I O N" or "W O R K   E X P E R I E N C E" → "EDUCATION", "WORK EXPERIENCE". */
function unspace(line: string): string {
  const t = line.trim();
  if (t.replace(/\s/g, "").length < 4) return line;
  const words = t.split(/\s{2,}/);
  if (!words.every((w) => /^(?:\S )+\S$/.test(w))) return line;
  return words.map((w) => w.replace(/ /g, "")).join(" ");
}

const DATE_ONLY = /^[\s(]*(?:[A-Za-z]{3,9}\.?\s*'?\d{2,4}|\d{1,2}[/.-]\d{4}|\d{4})?\s*(?:-|–|—|to)?\s*(?:[A-Za-z]{3,9}\.?\s*'?\d{2,4}|\d{1,2}[/.-]\d{4}|\d{4}|present|current|now)?[\s)]*$/i;

/** Text copied from a two-column PDF keeps both columns on each line, far apart. Puts the left column first and the
 * right column after it. Lines with right-aligned dates ("Google        Jan 2020 – Present") are not columns. */
export function splitColumns(raw: string[]): string[] {
  const lines = raw.map((l) => l.replace(/\t/g, "    "));
  const nonEmpty = lines.filter((l) => l.trim()).length;
  const ends = new Map<number, number>();
  const bump = (col: number) => ends.set(col, (ends.get(col) ?? 0) + 1);
  for (const l of lines) {
    const lead = /^ */.exec(l)![0].length;
    if (!l.trim()) continue;
    if (lead >= 16) bump(lead);
    for (const m of l.matchAll(/ {3,}(?=\S)/g)) if (m.index! > 0) bump(m.index! + m[0].length);
  }
  // The column start: the most common place text resumes after a wide gap (within 2 characters).
  let best = -1;
  let bestCount = 0;
  for (const col of ends.keys()) {
    let count = 0;
    for (const [c, n] of ends) if (Math.abs(c - col) <= 2) count += n;
    if (count > bestCount) [best, bestCount] = [col, count];
  }
  if (best < 16 || bestCount < 5) return raw;
  const near = (c: number) => Math.abs(c - best) <= 3;
  let rightOnly = 0;
  let rightText = 0;
  let crossing = 0;
  const parts = lines.map((l) => {
    if (!l.trim()) return { left: "", right: "" };
    const lead = /^ */.exec(l)![0].length;
    if (near(lead) || lead > best) {
      rightOnly++;
      if (!DATE_ONLY.test(l)) rightText++;
      return { left: "", right: l.trim() };
    }
    for (const m of l.matchAll(/ {3,}(?=\S)/g)) {
      const end = m.index! + m[0].length;
      if (m.index! > 0 && near(end)) {
        const right = l.slice(end).trim();
        if (!DATE_ONLY.test(right)) rightText++;
        return { left: l.slice(0, m.index!).trim(), right };
      }
    }
    if (l.length > best + 3) crossing++;
    return { left: l.trim(), right: "" };
  });
  if (rightOnly < 2 || rightText < 4 || crossing > nonEmpty * 0.2) return raw;
  return [...parts.map((p) => p.left), "", ...parts.map((p) => p.right)];
}

function prepare(text: string): Line[] {
  const raw = text.replace(/\r\n?/g, "\n").replace(/[      ]/g, " ").replace(/[​‌‍﻿]/g, "").split("\n");
  const out: Line[] = [];
  for (const r of splitColumns(raw.map(unspace))) {
    const bullet = BULLET.test(r) && !/^\s*\d{1,2}[.)]\s*\d/.test(r);
    const text = (bullet ? r.replace(BULLET, "") : r).replace(GAP, " | ").replace(/\s+/g, " ").replace(/^\s*\|\s*|\s*\|\s*$/g, "").trim();
    if (text) out.push({ text, bullet });
  }
  return out;
}

// --- sections ---------------------------------------------------------------------------------------------

type Kind = "education" | "experience" | "skills" | "languages" | "projects" | "summary" | "contact" | "references" | "other";

const HEADINGS: Array<[Kind, RegExp]> = [
  ["education", /^(education( (and|&) [a-z ]+)?|educational (background|qualifications?|details)|academic (background|qualifications?|details|profile|record)|academics|qualifications?|scholastic (record|profile)|ausbildung)$/],
  ["experience", /^((work|professional|industry|relevant|industrial|research|teaching|job) experience|experience|work history|employment( history| details)?|career history|internships?( experience)?|(work )?experience (and|&) internships|internships? (and|&) (work )?experience|professional background|berufserfahrung)$/],
  ["skills", /^((technical|key|core|relevant|it|computer|top) skills|skills( (and|&) [a-z ]+)?|technologies|tech stack|core competencies|competencies|technical expertise|expertise|tools( (and|&) technologies)?)$/],
  ["languages", /^(languages( known| spoken)?|language (proficiency|skills)|spoken languages|sprachen)$/],
  ["projects", /^(((academic|personal|key|selected|major|technical|other|notable|relevant|side|course) )?projects( (and|&) [a-z ]+)?|open source( contributions| projects| work)?|[a-z ]+ (and|&) projects)$/],
  ["summary", /^(summary|professional summary|career summary|profile|professional profile|objective|career objective|about( me)?|resume headline)$/],
  ["contact", /^(contact|contact (details|information|info)|personal (details|information|info)|contact info)$/],
  ["references", /^(references|referees|professional references|personal references)$/],
  ["other", /^((certifications?|achievements|awards|publications|honou?rs|activities|accomplishments|trainings?|workshops) (and|&) [a-z ]+|certifications?|licenses (and|&) certifications|courses|coursework|relevant coursework|achievements|awards|honou?rs( (and|&) awards)?|awards (and|&) achievements|accomplishments|publications|interests|hobbies|extra ?curricular( activities)?|positions of responsibility|volunteer(ing| experience)?|declaration|activities|leadership|co ?curricular activities)$/],
];

function headingKind(text: string): Kind | undefined {
  const key = text.replace(/[:：]\s*$/, "").replace(/[^\p{L}& ]/gu, " ").replace(/\s+/g, " ").trim().toLowerCase();
  if (!key || key.split(" ").length > 5) return undefined;
  return HEADINGS.find(([, re]) => re.test(key))?.[0];
}

interface Sections {
  header: Line[];
  by: Map<Kind, Line[][]>;
}

function sectionize(lines: Line[]): Sections {
  const header: Line[] = [];
  const by = new Map<Kind, Line[][]>();
  let current: Line[] | undefined;
  for (const line of lines) {
    const kind = line.bullet ? undefined : headingKind(line.text);
    if (kind) {
      current = [];
      by.set(kind, [...(by.get(kind) ?? []), current]);
    } else (current ?? header).push(line);
  }
  return { header, by };
}

const linesOf = (s: Sections, kind: Kind): Line[] => (s.by.get(kind) ?? []).flat();

// --- helpers ----------------------------------------------------------------------------------------------

const EMAIL = /[A-Za-z0-9](?:[A-Za-z0-9._%+-]*[A-Za-z0-9_+-])?@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/;
const LINKEDIN = /(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/in\/[A-Za-z0-9_%-]+\/?/i;
/** github.com/<user>, not followed by "/<repo>"; GitHub's own pages are not users. */
const GITHUB_PROFILE = /(?:https?:\/\/)?(?:www\.)?github\.com\/(?!(?:orgs|topics|features|about|sponsors|marketplace|settings|apps)\b)([A-Za-z0-9-]+)(?![A-Za-z0-9-]|\/[A-Za-z0-9_.-])/i;
const PORTFOLIO_WORD = /^(portfolio|my portfolio|website|web ?site|personal (site|website)|my (site|website)|homepage|home page|blog|web)$/i;

/** A link in the resume file, with the words it sits on ("GitHub", the name, "[View Credential]"). */
export interface ResumeLink {
  anchor: string;
  url: string;
}

/** The PDF and Word readers append the file's links after this mark, one "anchor<TAB>url" per line, so they are read
 * apart from the text (a link list must never become skills or a job). */
export const LINK_MARK = "\n\u0000LINKS\u0000\n";

export function withLinks(text: string, links: ResumeLink[]): string {
  const seen = new Set<string>();
  const rows = links.filter((l) => l.url && !seen.has(l.url) && seen.add(l.url))
    .map((l) => `${l.anchor.replace(/[\t\n\u0000]+/g, " ").trim()}\t${l.url.trim()}`);
  return rows.length ? `${text}${LINK_MARK}${rows.join("\n")}` : text;
}

function splitLinks(raw: string): { body: string; links: ResumeLink[] } {
  const at = raw.indexOf(LINK_MARK);
  if (at < 0) return { body: raw, links: [] };
  const links = raw.slice(at + LINK_MARK.length).split("\n").map((row) => {
    const [anchor = "", url = ""] = row.split("\t");
    return { anchor, url: url.trim() };
  }).filter((l) => /^(https?:\/\/|mailto:|tel:)/i.test(l.url));
  return { body: raw.slice(0, at), links };
}

const linkSource = (l: ResumeLink) => (l.anchor ? `Link on "${l.anchor}": ${l.url}` : `Link: ${l.url}`);

const URLISH = /(?:https?:\/\/)?(?:www\.)?[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.(?:com|dev|io|me|in|org|net|app|co|ai|xyz|tech|site|page|info|blog|de|uk|eu|fr|nl)(?:\/[^\s|,;()]*)?/gi;
const SEP = /\s*(?:\||•|·|▪|●|◆|♦|✉|☎|📞|📧)\s*/;

const withScheme = (url: string) => (/^https?:\/\//i.test(url) ? url : `https://${url}`).replace(/[.)]+$/, "");
const titleCase = (s: string) => (s === s.toUpperCase() ? s.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase()) : s);
const clean = (s: string) => s.replace(/^[\s,;:|–—-]+|[\s,;:|–—-]+$/g, "").replace(/^\((.*)\)$/, "$1").trim();

// --- dates ------------------------------------------------------------------------------------------------

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MONTH = "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";
const DATE = `(?:(?:${MONTH})\\.?,?\\s*(?:'\\d{2}|(?:19|20)\\d{2})|(?:0?[1-9]|1[0-2])\\s*[/.]\\s*(?:19|20)\\d{2}|(?:19|20)\\d{2}[/.-](?:0[1-9]|1[0-2])(?!\\d)|(?:19|20)\\d{2})`;
const NOW = "present|current(?:ly)?|now|till date|to date|today|ongoing|heute";
const RANGE = new RegExp(`(?:since\\s+(${DATE}))|(${DATE})\\s*(?:-|–|—|to|till|until|→|~)\\s*(${DATE}|${NOW})`, "i");

interface When {
  year: number;
  month?: number;
}

function parseDate(raw: string): When | undefined {
  const s = raw.trim().toLowerCase();
  let m = new RegExp(`^(${MONTH})\\.?,?\\s*(?:'(\\d{2})|((?:19|20)\\d{2}))$`).exec(s);
  if (m) return { year: m[2] ? 2000 + Number(m[2]) : Number(m[3]), month: MONTHS.indexOf(m[1]!.slice(0, 3)) + 1 };
  m = /^(\d{1,2})\s*[/.]\s*(\d{4})$/.exec(s);
  if (m) return { year: Number(m[2]), month: Number(m[1]) };
  m = /^(\d{4})[/.-](\d{2})$/.exec(s);
  if (m) return { year: Number(m[1]), month: Number(m[2]) };
  m = /^(\d{4})$/.exec(s);
  return m ? { year: Number(m[1]) } : undefined;
}

const ym = (w: When) => (w.month ? `${w.year}-${String(w.month).padStart(2, "0")}` : String(w.year));

// --- name and contact -------------------------------------------------------------------------------------

const NAME = /^\p{Lu}[\p{L}.'’-]*(?:\s+\p{L}[\p{L}.'’-]*){1,3}$/u;
const NOT_NAME = /\b(resume|résumé|curriculum|vitae|cv|profile|engineer|developer|student|manager|analyst|scientist|intern|designer|consultant|address|email|phone|mobile|india|university|institute|college)\b/i;

// Only titles that are never a given name ("Sri" and "Shri" often are, so they stay).
const HONORIFIC = /^(?:(?:dr|mr|mrs|ms|miss|mx|prof|smt)\.?|er\.)\s+(?=\p{L})/iu;

function findName(lines: Line[]): { first: string; last: string; full: string; source: string; confidence: Confidence } | undefined {
  const labelled = lines.find((l) => /^name\s*[:\-]\s*\S/i.test(l.text));
  const candidates = (labelled ? [{ text: labelled.text.replace(/^name\s*[:\-]\s*/i, ""), source: labelled.text, at: 0 }]
    : lines.slice(0, 6).map((l, at) => ({ text: l.text.replace(/^[^\p{L}]+/u, "").split(SEP)[0]!.trim(), source: l.text, at })))
    // "👤 Karan Mehta", "Dr. Elena Petrova": an icon or a title is not part of the name.
    .map((c) => ({ ...c, text: c.text.replace(/^[^\p{L}]+/u, "").replace(HONORIFIC, "") }));
  for (const c of candidates) {
    if (!NAME.test(c.text) || NOT_NAME.test(c.text) || headingKind(c.text)) continue;
    const words = titleCase(c.text).split(/\s+/);
    // Middle names and initials are not part of the last name ("Emily J. Carter" → Emily, Carter).
    return { first: words[0]!, last: words[words.length - 1]!, full: words.join(" "), source: c.source, confidence: c.at <= 2 && words.length <= 3 ? "high" : "medium" };
  }
  return undefined;
}

const PHONE = /(?:\+\s?\d{1,3}[\s.-]?)?(?:\(\d{1,5}\)[\s.-]?)?\d[\d\s.-]{6,16}\d/g;
const PHONE_LABEL = /\b(phone|mobile|mob|tel|telephone|cell|contact( no| number)?|ph)\b\.?\s*[:\-]?/i;

function findPhone(header: Line[], all: Line[]): { value: string; source: string; confidence: Confidence } | undefined {
  const look = (lines: Line[], strict: boolean) => {
    for (const line of lines) {
      if (line.bullet) continue;
      if (strict && !PHONE_LABEL.test(line.text) && !/\+\d/.test(line.text)) continue;
      const text = line.text.replace(EMAIL, " ").replace(URLISH, " ");
      for (const m of text.matchAll(PHONE)) {
        const value = m[0].trim();
        const digits = value.replace(/\D/g, "").length;
        if (digits < 10 || digits > 15) continue;
        if (RANGE.test(value) || /^(19|20)\d{2}\s*[-–]\s*(19|20)\d{2}$/.test(value)) continue;
        return { value, source: line.text };
      }
    }
    return undefined;
  };
  const top = look(header, false);
  if (top) return { ...top, confidence: "high" };
  const labelled = look(all, true);
  return labelled ? { ...labelled, confidence: PHONE_LABEL.test(labelled.source) ? "high" : "medium" } : undefined;
}

const INDIAN_STATES = /\b(andhra pradesh|arunachal pradesh|assam|bihar|chhattisgarh|goa|gujarat|haryana|himachal pradesh|jharkhand|karnataka|kerala|madhya pradesh|maharashtra|manipur|meghalaya|mizoram|nagaland|odisha|orissa|punjab|rajasthan|sikkim|tamil nadu|telangana|tripura|uttar pradesh|uttarakhand|west bengal|delhi|jammu (and|&) kashmir)\b/i;
const US_STATE = /^(A[LKZR]|C[AOT]|D[EC]|FL|GA|HI|I[ADLN]|K[SY]|LA|M[ADEINOST]|N[CDEHJMVY]|O[HKR]|PA|RI|S[CD]|T[NX]|UT|V[AT]|W[AIVY])$/;

const STATE_ONLY = new RegExp(`^(?:${INDIAN_STATES.source.slice(3, -3)})$`, "i");
// Countries the shared list does not name, for reading where a person lives ("Dhaka, Bangladesh").
const OTHER_COUNTRY = /\b(bangladesh|pakistan|sri lanka|nepal|bhutan|maldives|afghanistan|nigeria|kenya|ghana|egypt|ethiopia|uganda|tanzania|rwanda|morocco|tunisia|china|hong kong|taiwan|south korea|korea|indonesia|vietnam|thailand|myanmar|cambodia|turkey|türkiye|iran|iraq|qatar|kuwait|oman|bahrain|jordan|lebanon|russia|ukraine|belarus|norway|iceland|luxembourg|estonia|latvia|lithuania|bulgaria|croatia|serbia|slovenia|cyprus|malta|argentina|chile|colombia|peru|ecuador|uruguay|venezuela|costa rica|jamaica)\b/i;

interface Place {
  city?: string;
  state?: string;
  postal?: string;
  country?: string;
  countryLiteral: boolean;
  source: string;
  labelled: boolean;
}

function findPlace(lines: Line[]): Place | undefined {
  for (const line of lines) {
    for (const rawSeg of line.text.split(SEP)) {
      const labelled = /^(location|address|based in|city|current location|lives in)\s*[:\-]?\s*/i.test(rawSeg);
      const seg = rawSeg.replace(/^[^\p{L}\d]+/u, "").replace(/^(location|address|based in|city|current location|lives in)\s*[:\-]?\s*/i, "").trim();
      if (!seg || EMAIL.test(seg) || /https?:|www\.|linkedin|github/i.test(seg) || seg.length > 70) continue;
      if (/\d{7,}/.test(seg.replace(/[\s-]/g, "")) && !labelled) continue; // a phone number
      const parts = seg.split(",").map((p) => p.trim()).filter(Boolean);
      if (!parts.length || parts.length > 5) continue;
      // "Postdoctoral Researcher, Department of Physics, University of Toronto": a job line, not where the person lives.
      if (!labelled && parts.some((p) => ROLE.test(p) || INSTITUTION.test(p) || COMPANYISH.test(p) || /\b(department|faculty|dept)\b/i.test(p))) continue;
      const known = countriesInLocation(seg).length > 0 || INDIAN_STATES.test(seg) || parts.some((p) => US_STATE.test(p)) || OTHER_COUNTRY.test(parts[parts.length - 1]!);
      if (!known && !labelled) continue;
      if (parts.some((p) => p.split(/\s+/).length > 4)) continue;
      const place: Place = { countryLiteral: false, source: line.text, labelled };
      const last = parts[parts.length - 1]!;
      const lastCountry = countriesIn(last)[0];
      let rest = parts;
      const otherCountry = OTHER_COUNTRY.exec(last);
      if (lastCountry && countriesIn(last).length === 1 && !INDIAN_STATES.test(last)) {
        place.country = lastCountry;
        place.countryLiteral = last.toLowerCase().includes(lastCountry.toLowerCase());
        rest = parts.slice(0, -1);
      } else if (otherCountry && otherCountry[0].length === last.length) {
        place.country = titleCase(last);
        place.countryLiteral = true;
        rest = parts.slice(0, -1);
      }
      const postal = /^(.*?)[\s-]*\b(\d{6}|\d{5})$/.exec(rest[rest.length - 1] ?? "");
      if (postal) {
        place.postal = postal[2];
        rest = [...rest.slice(0, -1), postal[1]!].filter(Boolean);
      }
      // "Flat 12, Shanti Nagar, Nagpur, Maharashtra": the city is the part before the state, not the street.
      if (rest.length >= 3) {
        if (STATE_ONLY.test(rest[rest.length - 1]!) || US_STATE.test(rest[rest.length - 1]!)) {
          place.state = rest[rest.length - 1];
          place.city = rest[rest.length - 2];
        } else place.city = rest[rest.length - 1];
      } else {
        if (rest.length >= 2) place.state = rest[rest.length - 1];
        if (rest.length >= 1) place.city = rest[0];
      }
      if (place.city && (/\d/.test(place.city) || ROLE.test(place.city) || INSTITUTION.test(place.city))) delete place.city;
      if (place.city && (countriesIn(place.city).length && place.city.toLowerCase() === countriesIn(place.city)[0]!.toLowerCase())) delete place.city;
      if (!place.country) {
        const derived = place.state && US_STATE.test(place.state) ? "United States" : INDIAN_STATES.test(seg) ? "India" : countriesInLocation(seg)[0];
        if (derived) place.country = derived;
      }
      if (place.city || place.country) return place;
    }
  }
  return undefined;
}

// --- education --------------------------------------------------------------------------------------------

/** "tech" → "[Tt][Ee][Cc][Hh]": a word in any letter case ("M.TECH", "B.Tech") inside a pattern that is otherwise
 * case-sensitive (so "BE" and "MS" still need capitals and the words "be" and "ms" are not degrees). */
const ci = (w: string) => w.replace(/\p{L}/gu, (c) => `[${c.toUpperCase()}${c.toLowerCase()}]`).replace(/ /g, "\\s+");
const OF_FIELD = `(?:\\s+${ci("of")}\\s+(?:${ci("business administration")}|${ci("computer applications")}|${ci("fine arts")}|\\p{Lu}\\p{L}+))?`;
const DEGREE = new RegExp(`(?<![\\p{L}])(${[
  `${ci("ph")}\\.?\\s?${ci("d")}\\.?(?![\\p{L}])`,
  `${ci("doctor of")}\\s+\\p{Lu}\\p{L}+`,
  `${ci("integrated")}\\s+M\\.?\\s?${ci("tech")}\\.?`,
  ci("dual degree"),
  `[MB]\\.?\\s?${ci("tech")}\\.?(?![\\p{L}])`,
  `[MB]\\.\\s?E\\.?(?![\\p{L}])`,
  "\\bBE\\b", "\\bME\\b",
  `[MB]\\.?\\s?${ci("sc")}\\.?(?![\\p{L}])`,
  "[MB]\\.S\\.", "\\bBS\\b", "\\bMS\\b", "[MB]\\.A\\.",
  "\\bBCA\\b", "\\bMCA\\b", "\\bMBA\\b", "\\bBBA\\b", "\\bMBBS\\b", "\\bBDS\\b", "\\bLL\\.?[BM]\\b\\.?", "B\\.\\s?Ed\\.?(?![\\p{L}])",
  `[MB]\\.?\\s?${ci("com")}\\.?(?![\\p{L}])`,
  `[MB]\\.?\\s?${ci("arch")}\\.?(?![\\p{L}])`,
  `[MB]\\.?\\s?${ci("pharm")}\\.?(?![\\p{L}])`,
  `${ci("bachelor")}(?:'s|’s|s|S)?${OF_FIELD}(?:\\s+${ci("degree")})?`,
  `${ci("master")}(?:'s|’s|s|S)?${OF_FIELD}(?:\\s+${ci("degree")})?`,
  ci("diploma"),
  `${ci("associate")}(?:'s)?\\s+${ci("degree")}`,
  `${ci("class")}\\s+(?:XII|X|12|10)(?:th)?(?![\\p{L}\\d])`,
  "(?:12|10)th(?![\\p{L}])",
  "\\bHSC\\b", "\\bSSC\\b", "\\bSSLC\\b", "\\bAISSCE?\\b",
  ci("senior secondary"), ci("higher secondary"), ci("secondary school certificate"), "Abitur",
].join("|")})`, "u");
const INSTITUTION = /\b(universit\w*|universidad\w*|universidade|institute|college|school|academy|polytechnic|vidyalaya|vidyapeeth|vidyapith|hochschule|[ée]cole|IIT|IIIT|NIT|BITS|IIM|IISc|IISER|MIT|UCLA|TU|ETH|EPFL|KTH|NUS|NTU|TUM|UCL|LSE|CMU|Caltech)\b/i;

/** Rows like "Degree | Institution | CGPA/Percentage | Year": the head of an education table, not an entry. */
const TABLE_HEAD = /^(degrees?|qualifications?|course|programme|program|exam(ination)?|class|standard|certificate|institute|institution|college|school|university|board|years?|dates?|duration|passing year|year of passing|cgpa|gpa|cpi|percentage|marks|score|grades?|results?|speciali[sz]ation|stream|branch|discipline|major|name of (the )?(institute|institution|college|school|university))$/i;
const isTableHead = (text: string) => {
  const cells = text.split(/\s*[|/]\s*/).map((c) => c.replace(/[:.]$/, "").trim()).filter(Boolean);
  return cells.length >= 2 && cells.every((c) => TABLE_HEAD.test(c));
};

const SMALL_WORDS = new Set(["and", "of", "in", "for", "the", "at", "on", "de", "da", "di", "del", "la", "le", "&"]);
const ACRONYM = /^(IIIT|IIITD|IIITB|IIITH|BITS|KIIT|NSIT|NSUT|IIEST|IISER|NIIT|SVNIT|MNIT|VNIT|MANIT|NITK|RVCE|BMSCE|MSRIT|COEP|VJTI|SPIT|UCLA|EPFL|BRAC|KJSCE)$/;

/** "INDIAN INSTITUTE OF TECHNOLOGY JODHPUR" → "Indian Institute of Technology Jodhpur". Short words in capitals
 * ("IIT", "CSE") and known abbreviations stay as written. Text that already has small letters is left alone. */
function niceCase(s: string): string {
  if (/\p{Ll}/u.test(s) || !/\p{Lu}{2}/u.test(s)) return s;
  return s.split(/(\s+)/).map((w, i) => {
    if (!w.trim()) return w;
    const letters = w.replace(/[^\p{L}]/gu, "");
    if (i > 0 && SMALL_WORDS.has(w.toLowerCase())) return w.toLowerCase();
    if (letters.length <= 3 || w.includes(".") || ACRONYM.test(letters)) return w;
    return w.toLowerCase().replace(/(^|[-/(])(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase());
  }).join("");
}

const DEGREE_SPELLING: Record<string, string> = { btech: "B.Tech", mtech: "M.Tech", be: "B.E.", me: "M.E.", bsc: "B.Sc", msc: "M.Sc", bcom: "B.Com", mcom: "M.Com",
  barch: "B.Arch", march: "M.Arch", bpharm: "B.Pharm", mpharm: "M.Pharm", phd: "Ph.D." };
/** A degree written in capitals in its usual spelling ("M.TECH" → "M.Tech", "B.E" → "B.E."). */
const degreeSpelling = (raw: string) => (/\p{Ll}/u.test(raw) ? raw : DEGREE_SPELLING[raw.toLowerCase().replace(/[^a-z]/g, "")] ?? niceCase(raw));
const YEAR = /\b(19[6-9]\d|20[0-4]\d)\b/g;
const SCORE = /\b(?:CGPA|CPI|GPA|SGPA|OGPA)\b\s*[:\-–]?\s*(\d{1,2}(?:\.\d{1,2})?(?:\s*(?:\/|out of)\s*\d{1,2}(?:\.\d{1,2})?)?)|(\d{1,2}\.\d{1,2}\s*\/\s*(?:10|4(?:\.0)?|5(?:\.0)?))(?:\s*(?:CGPA|CPI|GPA))?|\b(?:percentage|aggregate|marks)\b\s*[:\-–]?\s*(\d{1,2}(?:\.\d{1,2})?\s*%?)|\b(\d{2}(?:\.\d{1,2})?\s?%)/i;

function levelOf(degree: string): string {
  const d = degree.toLowerCase().replace(/[.\s’']/g, "");
  if (/^(phd|doctor)/.test(d)) return "Doctorate";
  if (/^(mbbs|bds|llb)/.test(d)) return "Bachelor's";
  if (/^(integratedm|dualdegree|m|master|mba|mca|llm)/.test(d)) return "Master's";
  if (/^(b|bachelor|bca|bba)/.test(d)) return "Bachelor's";
  if (d.startsWith("diploma")) return "Diploma";
  if (d.startsWith("associate")) return "Associate";
  if (/xii|12|hsc|seniorsecondary|highersecondary|abitur|aissce/.test(d)) return "High School";
  return "Secondary School";
}
const LEVEL_RANK: Record<string, number> = { Doctorate: 6, "Master's": 5, "Bachelor's": 4, Associate: 3, Diploma: 3, "High School": 2, "Secondary School": 1 };

function stripDatesAndScores(s: string): string {
  return clean(s.replace(new RegExp(RANGE.source, "gi"), " ").replace(new RegExp(SCORE.source, "gi"), " ").replace(/\b(expected|graduat\w*|batch( of)?|class of)\b\s*:?\s*/gi, " ")
    .replace(new RegExp(`\\b(?:${MONTH})\\.?\\s*(?:19|20)\\d{2}\\b`, "gi"), " ").replace(YEAR, " ").replace(/\(\s*\)/g, " ").replace(/\s+/g, " "));
}

function parseEducation(lines: Line[]): EducationItem[] {
  type Raw = { lines: string[]; degree?: string; degreeLine?: string; institution?: string };
  const entries: Raw[] = [];
  let cur: Raw | undefined;
  for (const line of lines) {
    if (isTableHead(line.text)) continue;
    const hasDegree = DEGREE.test(line.text);
    const segs = line.text.split(/\s*(?:\||•|·|\s[–—-]\s)\s*/);
    const inst = segs.map((s) => s.trim()).find((s) => INSTITUTION.test(s) && !DEGREE.test(s));
    if (!cur || (hasDegree && cur.degree) || (inst && cur.institution && !hasDegree && cur.degree)) {
      if (!hasDegree && !inst && cur) { cur.lines.push(line.text); continue; }
      cur = { lines: [] };
      entries.push(cur);
    }
    cur.lines.push(line.text);
    if (hasDegree && !cur.degree) {
      cur.degreeLine = line.text;
      cur.degree = DEGREE.exec(line.text)![0];
    }
    if (inst && !cur.institution) cur.institution = stripDatesAndScores(inst);
  }
  return entries.filter((e) => e.degree || e.institution).map((e) => {
    const all = e.lines.join(" | ");
    let discipline = "";
    let institution = e.institution ?? "";
    if (e.degree && e.degreeLine) {
      const segs = e.degreeLine.split(/\s*(?:\||•|·|\s[–—]\s)\s*/);
      const at = Math.max(0, segs.findIndex((s) => s.includes(e.degree!)));
      const seg = segs[at] ?? e.degreeLine;
      let after = seg.slice(seg.indexOf(e.degree) + e.degree.length);
      // "M.Tech | (Computer Science)": the field in the next cell.
      if (!after.trim() && /^\([^)]+\)$/.test(segs[at + 1]?.trim() ?? "")) after = segs[at + 1]!;
      const m = /^\s*(?:\(\s*([^)]+)\)|(?:(?:in|of)\b|-|–|,|:|\s)\s*(.+))/i.exec(after);
      const rest = m ? (m[1] ?? m[2] ?? "") : "";
      const parts = rest.split(",").map((p) => p.trim());
      const instAt = parts.findIndex((p) => INSTITUTION.test(p));
      const disc = instAt >= 0 ? parts.slice(0, instAt) : parts;
      discipline = stripDatesAndScores(disc.join(", ").split(/\s[–—-]\s/)[0] ?? "");
      if (!institution && instAt >= 0) institution = stripDatesAndScores(parts.slice(instAt).join(", "));
      // "B.E. (Electronics), R. V. College of Engineering, Bengaluru": the school after the bracketed field.
      if (!institution && m?.[1]) {
        const tail = after.slice(m[0].length).split(",").map((p) => p.trim());
        const at = tail.findIndex((p) => INSTITUTION.test(p));
        if (at >= 0) institution = stripDatesAndScores(tail.slice(at).join(", ").split(/\s[–—-]\s/)[0] ?? "");
      }
      if (DEGREE.test(discipline) || /^(hons?|honours)\.?$/i.test(discipline) || /school/i.test(levelOf(e.degree))) discipline = "";
    }
    const years = [...all.matchAll(YEAR)].map((m) => Number(m[1]));
    const score = SCORE.exec(all);
    const degree = degreeSpelling((e.degree ?? "").trim());
    institution = niceCase(institution);
    discipline = niceCase(discipline);
    // "2025 – Present" is a start year, not a graduation year; "Expected 2027" / "2025 – 2027 (expected)" is the expected year.
    const expected = /\b(?:expected|exp\.?|anticipated|graduating|due)\b[^0-9]{0,12}(19[6-9]\d|20[0-4]\d)|(19[6-9]\d|20[0-4]\d)\s*\(?\s*(?:expected|exp\.?|anticipated)\b/i.exec(all);
    const ongoing = !!expected || new RegExp(`(?:-|–|—|to)\\s*(?:${NOW})\\b|\\b(?:pursuing|currently enrolled|in progress)\\b`, "i").test(all);
    const year = expected ? (expected[1] ?? expected[2]!) : ongoing ? "" : years.length ? String(Math.max(...years)) : "";
    return {
      degree, institution, discipline, ongoing,
      year,
      score: score ? (score[1] ?? score[2] ?? score[3] ?? score[4] ?? "").trim() : "",
      level: degree ? levelOf(degree) : "",
      source: e.lines.join(" / "),
    };
  });
}

// --- work history -----------------------------------------------------------------------------------------

const ROLE = /\b(engineer(ing manager)?|developer|intern|internship|manager|analyst|scientist|lead|architect|consultant|designer|associate|specialist|director|administrator|officer|head|researcher|assistant|programmer|sde(?: ?i{1,3}| ?\d)?|swe|tester|qa|devops|sre|executive|trainee|fellow|founder|co-founder|cto|ceo|cfo|vp|vice president|president|member of technical staff|technician|coordinator|representative|strategist|accountant|teacher|professor|lecturer|tutor|writer|editor|product owner|scrum master|principal|werkstudent|entwickler|co-?op|apprentice|freelancer?|postdoc(toral)?( fellow| researcher)?)\b/i;
const COMPANYISH = /\b(inc|ltd|llc|llp|pvt|private limited|limited|technologies|technology|labs?|systems|solutions|software|corp(oration)?|company|gmbh|ag|bv|group|services|consulting|ventures|studios?|networks|analytics|bank)\b\.?/i;

function isLocation(seg: string): boolean {
  // "University of Toronto", "Initech Technologies Pune": an employer that names its city is still the employer.
  if (INSTITUTION.test(seg) || COMPANYISH.test(seg)) return false;
  return /^(remote|hybrid|on-?site)$/i.test(seg) || countriesInLocation(seg).length > 0 || INDIAN_STATES.test(seg) || US_STATE.test(seg.trim()) || /, [A-Z]{2}$/.test(seg) && US_STATE.test(seg.slice(-2));
}

function parseWork(lines: Line[]): WorkItem[] {
  type Raw = { header: string[]; body: number; range?: RegExpExecArray };
  const entries: Raw[] = [];
  let cur: Raw | undefined;
  // "• Software Engineer | Apr 2024 – Present": some resumes put a bullet before each job's heading line. When the
  // section starts that way, a short bullet with a date range is a heading, and the other bullets are its details.
  const bulletHeads = !!lines[0]?.bullet && RANGE.test(lines[0].text);
  for (const line of lines) {
    const range = RANGE.exec(line.text) ?? undefined;
    const words = line.text.split(" ").length;
    const long = line.text.length > 110 || (/[.!]$/.test(line.text) && words > 6);
    const datedHeading = bulletHeads && line.bullet && !!range && !long && words <= 14;
    // A detail that wrapped onto the next line ("time, cutting triage effort.") continues the bullet above it.
    const continuation = !!cur && cur.body > 0 && !range && (/^[\p{Ll},;)]/u.test(line.text) || (/[.;]$/.test(line.text) && !ROLE.test(line.text)));
    const body = (line.bullet && !datedHeading) || long || continuation
      || (!!cur && !!cur.range && cur.header.length >= 2 && !range && !ROLE.test(line.text) && cur.body === 0 && words > 6);
    if (body) {
      if (cur) cur.body++;
      continue;
    }
    if (!cur || cur.body > 0 || (range && cur.range) || cur.header.length >= 3) {
      cur = { header: [], body: 0 };
      entries.push(cur);
    }
    cur.header.push(line.text);
    if (range && !cur.range) cur.range = range;
  }
  const out: WorkItem[] = [];
  for (const e of entries) {
    const joined = e.header.join(" | ");
    const withoutRange = e.range ? joined.replace(e.range[0], " | ") : joined;
    const segs = withoutRange.split(/\s*(?:\||•|·|▪|\s[–—-]\s|,\s|\s@\s|\sat\s)\s*/).map(clean)
      .filter((s) => s && !/^(\(|\))$/.test(s) && !DATE_ONLY.test(s) && s.length <= 70)
      // Never a title or a company: a sentence ("...performance standards."), or a heading of another section.
      .filter((s) => !/^\p{Ll}/u.test(s) && !(/[.!]$/.test(s) && s.split(" ").length > 3 && !COMPANYISH.test(s)) && !headingKind(s));
    // "McLean, VA": a town followed by a US state code is one place.
    for (let i = segs.length - 2; i >= 0; i--) if (US_STATE.test(segs[i + 1]!) && !ROLE.test(segs[i]!)) segs.splice(i, 2, `${segs[i]}, ${segs[i + 1]}`);
    const titleSeg = segs.find((s) => ROLE.test(s));
    const locs = segs.filter((s) => s !== titleSeg && isLocation(s));
    const others = segs.filter((s) => s !== titleSeg && !locs.includes(s));
    let title = titleSeg ?? "";
    const companyish = others.filter((s) => COMPANYISH.test(s));
    let company = companyish[0] ?? (title ? others[0] : undefined) ?? "";
    let confidence: Confidence = titleSeg && company ? "high" : "medium";
    // No job title word: which part is the title and which the company is a guess, so only when the company is
    // clearly a company ("... Pvt Ltd") and exactly one other part is left.
    if (!title && others.length === 2 && companyish.length === 1) {
      title = others.find((s) => s !== company)!;
      confidence = "low";
    }
    if (!title && !COMPANYISH.test(company)) continue;
    if (!company && out.length && e.range) {
      company = out[out.length - 1]!.company; // several roles under one company heading
      confidence = "medium";
    }
    // Without dates, only a clear "title, company" pair is a job.
    if (!e.range && !(title && company)) continue;
    if (!title && !company) continue;
    const startRaw = e.range ? (e.range[1] ?? e.range[2])! : "";
    const endRaw = e.range ? (e.range[1] ? "present" : e.range[3]!) : "";
    const start = startRaw ? parseDate(startRaw) : undefined;
    const current = !!e.range && new RegExp(`^(${NOW})$`, "i").test(endRaw.trim());
    const end = current || !endRaw ? undefined : parseDate(endRaw);
    if (e.range && (!start || (!current && !end))) confidence = "medium";
    out.push({
      title, company, location: locs.join(", "),
      start: start ? ym(start) : "", end: end ? ym(end) : "", current, summary: "",
      intern: /\bintern(ship)?\b|werkstudent/i.test(title),
      yearsOnly: !!start && (!start.month || (!!end && !end.month)),
      confidence, source: e.header.join(" / "),
    });
  }
  return out;
}

/** Months worked, overlapping jobs counted once. Undefined when a job has no start date. */
function monthsWorked(jobs: WorkItem[], today: Date): number | undefined {
  if (!jobs.length || jobs.some((j) => !j.start || (!j.current && !j.end))) return undefined;
  const idx = (s: string, isEnd: boolean) => {
    const [y, m] = s.split("-").map(Number);
    return y! * 12 + (m ? m - 1 : isEnd ? 0 : 0);
  };
  const now = today.getFullYear() * 12 + today.getMonth();
  const spans = jobs.map((j) => [idx(j.start, false), j.current ? now : idx(j.end, true) + (j.end.includes("-") ? 1 : 0)] as [number, number])
    .filter(([a, b]) => b > a).sort((a, b) => a[0] - b[0]);
  let total = 0;
  let [s, e] = spans[0] ?? [0, 0];
  for (const [a, b] of spans.slice(1)) {
    if (a <= e) e = Math.max(e, b);
    else {
      total += e - s;
      [s, e] = [a, b];
    }
  }
  return total + (e - s);
}

// --- skills and languages ---------------------------------------------------------------------------------

const SKILL_LINE = /^(technical skills|skills|key skills|technologies|tools|tech stack|programming languages|languages|frameworks|libraries|databases|cloud|devops|platforms|software|frontend|backend|others?)\s*(?:&[\w ]+)?\s*[:\-–]/i;

const HUMAN_LANGUAGES = ["English", "Hindi", "Bengali", "Bangla", "Marathi", "Telugu", "Tamil", "Gujarati", "Urdu", "Kannada", "Odia", "Malayalam", "Punjabi", "Assamese", "Sanskrit", "Konkani", "Nepali", "Sindhi", "Rajasthani", "French", "German", "Spanish", "Italian", "Portuguese", "Dutch", "Polish", "Swedish", "Norwegian", "Danish", "Finnish", "Greek", "Czech", "Hungarian", "Romanian", "Russian", "Ukrainian", "Turkish", "Arabic", "Hebrew", "Persian", "Farsi", "Mandarin", "Chinese", "Cantonese", "Japanese", "Korean", "Vietnamese", "Thai", "Indonesian", "Malay", "Tagalog", "Filipino", "Swahili"];
const LANGUAGE = new RegExp(`\\b(${HUMAN_LANGUAGES.join("|")})\\b`, "i");
const PROFICIENCY: Array<[LanguageEntry["proficiency"], RegExp]> = [
  ["Native", /\b(native|mother ?tongue|first language|muttersprache|bilingual)\b/i],
  ["Fluent", /\b(fluent|fluency|c2|c1|advanced|full professional)\b/i],
  ["Professional", /\b(professional|working proficiency|proficient|business)\b/i],
  ["Conversational", /\b(conversational|intermediate|b2|b1|limited working)\b/i],
  ["Basic", /\b(basic|elementary|beginner|a2|a1|read only)\b/i],
];

function parseLanguages(lines: Line[]): Array<{ language: string; proficiency?: LanguageEntry["proficiency"]; source: string }> {
  const out: Array<{ language: string; proficiency?: LanguageEntry["proficiency"]; source: string }> = [];
  for (const line of lines) {
    const text = line.text.replace(/^(spoken |known )?languages?( known| spoken)?\s*[:\-–]\s*/i, "");
    for (const item of text.split(/\s*(?:,|;|\||•|·|\band\b)\s*(?![^(]*\))/)) {
      const m = LANGUAGE.exec(item);
      if (!m) continue;
      const language = HUMAN_LANGUAGES.find((l) => l.toLowerCase() === m[1]!.toLowerCase())!;
      if (out.some((o) => o.language === language)) continue;
      const proficiency = PROFICIENCY.find(([, re]) => re.test(item))?.[0];
      out.push({ language, proficiency, source: line.text });
    }
  }
  return out;
}

// --- main -------------------------------------------------------------------------------------------------

/** Reads a resume's text. `today` is used only to count the months of a current job. */
export function parseResume(rawText: string, today: Date = new Date()): ParsedResume {
  const { body: text, links } = splitLinks(rawText);
  const lines = prepare(text);
  const sections = sectionize(lines);
  const refLines = linesOf(sections, "references");
  const nonReferenceLines = lines.filter((l) => !refLines.includes(l));
  const expLines = linesOf(sections, "experience");
  const projLines = linesOf(sections, "projects");
  const top = [...sections.header, ...linesOf(sections, "contact")];
  const suggestions: Suggestion[] = [];
  const questions: string[] = [];
  let n = 0;
  const add = (s: Omit<Suggestion, "id">) => {
    if (s.value.trim()) suggestions.push({ ...s, value: s.value.trim(), id: `${s.field}-${n++}` });
  };

  // Contact
  const name = findName(nonReferenceLines);
  if (name) {
    add({ section: "Contact", field: "firstName", label: "First name", value: name.first, confidence: name.confidence, source: name.source });
    if (name.last) add({ section: "Contact", field: "lastName", label: "Last name", value: name.last, confidence: name.confidence, source: name.source });
  }
  const OBFUSCATED_EMAIL = /\b([A-Za-z0-9](?:[A-Za-z0-9._%+-]*[A-Za-z0-9_+-])?)\s*(?:\[at\]|\(at\)|\bat\b)\s*([A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)\s*(?:\[dot\]|\(dot\)|\bdot\b|\.)\s*([A-Za-z]{2,})\b/i;
  const emailLine = nonReferenceLines.find((l) => EMAIL.test(l.text));
  if (emailLine) {
    add({ section: "Contact", field: "email", label: "Email", value: EMAIL.exec(emailLine.text)![0], confidence: "high", source: emailLine.text });
  } else {
    const obfLine = nonReferenceLines.find((l) => OBFUSCATED_EMAIL.test(l.text));
    if (obfLine) {
      const m = OBFUSCATED_EMAIL.exec(obfLine.text)!;
      const deobfuscated = `${m[1]}@${m[2]}.${m[3]}`.toLowerCase();
      add({ section: "Contact", field: "email", label: "Email", value: deobfuscated, confidence: "medium", source: obfLine.text, note: "Obfuscated in resume" });
    }
  }
  const phoneCandidates = nonReferenceLines.filter((l) => !expLines.includes(l) && !projLines.includes(l));
  const phone = findPhone(top, phoneCandidates);
  if (phone) {
    const split = splitPhone(phone.value);
    add({ section: "Contact", field: "phone", label: "Phone", value: phone.value, confidence: phone.confidence, source: phone.source,
      note: split.code ? `Country code +${split.code}, number ${split.national}` : "No country code in the resume" });
  }
  const labelledPlace = nonReferenceLines.filter((l) => /^(location|address|based in|current location)\s*[:\-]/i.test(l.text));
  const place = findPlace([...top, ...labelledPlace]);
  if (place) {
    if (place.city) add({ section: "Contact", field: "location", label: "City", value: place.city, confidence: "high", source: place.source });
    if (place.state) add({ section: "Contact", field: "state", label: "State / Province", value: place.state, confidence: "medium", source: place.source });
    if (place.postal) add({ section: "Contact", field: "postalCode", label: "Postal / ZIP code", value: place.postal, confidence: "medium", source: place.source });
    if (place.country) add({ section: "Contact", field: "country", label: "Country", value: place.country, confidence: place.countryLiteral ? "high" : "medium", source: place.source,
      ...(place.countryLiteral ? {} : { computed: true, note: "Worked out from the place in your resume" }) });
  }

  // Links
  const allText = nonReferenceLines.map((l) => l.text).join("\n");
  // Links written as text first; then links behind a word ("LinkedIn", the name), read from the PDF or Word file.
  const linkedin = LINKEDIN.exec(allText);
  const linkedLinkedin = links.find((l) => LINKEDIN.test(l.url));
  if (linkedin) add({ section: "Links", field: "linkedin", label: "LinkedIn", value: withScheme(linkedin[0]).replace(/\/$/, ""), confidence: "high", source: lines.find((l) => l.text.includes(linkedin[0]))!.text });
  else if (linkedLinkedin) add({ section: "Links", field: "linkedin", label: "LinkedIn", value: withScheme(LINKEDIN.exec(linkedLinkedin.url)![0]).replace(/\/$/, ""), confidence: "high", source: linkSource(linkedLinkedin) });
  // A profile is github.com/<user>. A repository ("github.com/<user>/<repo>") or a pull request is a project, never the profile.
  const github = GITHUB_PROFILE.exec(allText);
  const linkedGithub = links.find((l) => GITHUB_PROFILE.test(l.url));
  if (github) add({ section: "Links", field: "github", label: "GitHub", value: withScheme(github[0]), confidence: "high", source: lines.find((l) => l.text.includes(github[0]))!.text });
  else if (linkedGithub) add({ section: "Links", field: "github", label: "GitHub", value: withScheme(GITHUB_PROFILE.exec(linkedGithub.url)![0]), confidence: "high", source: linkSource(linkedGithub) });
  const portfolioLines = [...top, ...nonReferenceLines.filter((l) => /^(portfolio|website|web|blog|personal site)\s*[:\-]/i.test(l.text))];
  for (const line of portfolioLines) {
    const urls = [...line.text.replace(new RegExp(EMAIL.source, "g"), " ").matchAll(URLISH)].map((m) => m[0])
      .filter((u) => !/linkedin\.com|github\.com\/?$|github\.com\/|mailto:/i.test(u))
      // "M.Tech", "B.Sc": degrees, not websites. A bare address in capitals ("IIT.AC") is not a link either.
      .filter((u) => !looksLikeDegree(u) && (/^(https?:\/\/|www\.)/i.test(u) || u !== u.toUpperCase()));
    if (urls[0]) {
      add({ section: "Links", field: "portfolio", label: "Portfolio / website", value: withScheme(urls[0]), confidence: "high", source: line.text });
      break;
    }
  }
  // A link behind the word "Portfolio", "Website", "Blog"…: never a certificate, a demo or a repository behind another word.
  if (!suggestions.some((x) => x.field === "portfolio")) {
    const site = links.find((l) => PORTFOLIO_WORD.test(l.anchor.trim()) && /^https?:\/\//i.test(l.url) && !/linkedin\.com|github\.com/i.test(l.url));
    if (site) add({ section: "Links", field: "portfolio", label: "Portfolio / website", value: site.url.replace(/\/$/, ""), confidence: "high", source: linkSource(site) });
  }

  // Education
  const education = parseEducation(linesOf(sections, "education"));
  const primary = [...education].filter((e) => e.degree).sort((a, b) => (LEVEL_RANK[b.level] ?? 0) - (LEVEL_RANK[a.level] ?? 0) || Number(b.year) - Number(a.year))[0];
  if (primary) {
    add({ section: "Education", field: "school", label: "School / university", value: primary.institution, confidence: primary.institution ? "high" : "low", source: primary.source });
    add({ section: "Education", field: "degree", label: "Degree", value: primary.degree, confidence: "high", source: primary.source });
    add({ section: "Education", field: "discipline", label: "Field of study", value: primary.discipline, confidence: "high", source: primary.source });
    if (primary.ongoing) {
      add({ section: "Education", field: "educationStatus", label: "Are you still studying?", value: "I am currently pursuing a degree", confidence: "high",
        source: primary.source, computed: true, note: `Your ${primary.degree} has no end date yet` });
      if (primary.year) add({ section: "Education", field: "graduationYear", label: "Graduation year (expected)", value: primary.year, confidence: "high", source: primary.source });
      // Education level is the highest level COMPLETED: the degree being studied for is not it.
      const done = [...education].filter((e) => e.degree && !e.ongoing).sort((a, b) => (LEVEL_RANK[b.level] ?? 0) - (LEVEL_RANK[a.level] ?? 0))[0];
      if (done?.level) add({ section: "Education", field: "educationLevel", label: "Education level (completed)", value: done.level, confidence: "medium",
        source: done.source, computed: true, note: `Worked out from "${done.degree}", the highest degree you have finished` });
    } else {
      add({ section: "Education", field: "graduationYear", label: "Graduation year", value: primary.year, confidence: "high", source: primary.source });
      add({ section: "Education", field: "educationLevel", label: "Education level", value: primary.level, confidence: "medium", source: primary.source,
        computed: true, note: `Worked out from "${primary.degree}"` });
    }
  }

  // Experience
  const work = parseWork(linesOf(sections, "experience")).slice(0, 6);
  for (const job of work) {
    const { intern: _i, yearsOnly, confidence, source, ...entry } = job;
    const when = job.start ? `${job.start} – ${job.current ? "now" : job.end || "?"}` : "no dates";
    add({ section: "Experience", field: "workHistory", label: "Job", value: [job.title, job.company].filter(Boolean).join(" · "), confidence, source, work: entry,
      note: yearsOnly ? `${when} (years only: add the months if you know them)` : when });
  }
  const current = work.find((j) => j.current);
  if (current) {
    if (current.title) add({ section: "Experience", field: "currentTitle", label: "Current title", value: current.title, confidence: current.confidence, source: current.source });
    if (current.company) add({ section: "Experience", field: "currentCompany", label: "Current company", value: current.company, confidence: current.confidence, source: current.source });
  }
  const jobs = work.filter((j) => !j.intern);
  if (jobs.length) {
    const months = monthsWorked(jobs, today);
    if (months === undefined) questions.push("Some jobs have no dates, so your total years of experience were not worked out. Please type them in yourself.");
    else {
      const yearsOnly = jobs.some((j) => j.yearsOnly);
      add({ section: "Experience", field: "experienceYears", label: "Total years of experience", value: String(Math.floor(months / 12)),
        confidence: yearsOnly ? "medium" : "high", source: jobs.map((j) => j.source).join(" + "), computed: true,
        note: `Worked out from your job dates: ${Math.floor(months / 12)} years ${months % 12} months${work.length > jobs.length ? ", internships not counted" : ""}` });
    }
  } else if (work.length) questions.push("Only internships were found, so total years of experience were not worked out.");
  else if (!sections.by.has("experience")) questions.push("No work experience section was found.");

  // Skills
  const skillLines = [...linesOf(sections, "skills"), ...lines.filter((l) => SKILL_LINE.test(l.text) && !linesOf(sections, "skills").includes(l))];
  const fromSection = skillLines.length > 0;
  const skillSource = fromSection ? skillLines : lines;
  const skills = extractTechTerms(skillSource.map((l) => l.text.replace(/^(spoken )?languages?\s*[:\-–].*$/i, (m) => (LANGUAGE.test(m) && !/python|java|c\+\+/i.test(m) ? "" : m))).join("\n"));
  if (skills.length) add({ section: "Skills", field: "skills", label: "Key skills", value: skills.join(", "), confidence: fromSection ? "high" : "medium",
    source: fromSection ? skillLines.map((l) => l.text).join(" / ").slice(0, 300) : "Found across your resume" });

  // Languages
  const languageLines = [...linesOf(sections, "languages"), ...lines.filter((l) => /^(spoken |known )?languages( known| spoken)?\s*[:\-–]/i.test(l.text) && LANGUAGE.test(l.text))];
  for (const lang of parseLanguages(languageLines)) {
    add({ section: "Languages", field: "languages", label: "Language", value: lang.proficiency ? `${lang.language} (${lang.proficiency})` : lang.language,
      confidence: lang.proficiency ? "high" : "medium", source: lang.source, language: { language: lang.language, proficiency: lang.proficiency },
      ...(lang.proficiency ? {} : { note: "Level not in the resume: choose one" }) });
  }

  if (!name) questions.push("Your name was not found. Please check it.");
  if (!emailLine && !suggestions.some((s) => s.field === "email")) questions.push("No email address was found.");
  return { fullName: name?.full ?? "", suggestions, education, work, skills, questions };
}

/** Whether a skill name (or one of its aliases) is written in the text. Used by tests to check nothing is invented. */
export function skillInText(skill: string, text: string): boolean {
  const t = text.toLowerCase();
  if (t.includes(skill.toLowerCase())) return true;
  return Object.entries(TECH_ALIASES).some(([alias, canonical]) => canonical === skill && t.includes(alias));
}

// --- PDF text layout --------------------------------------------------------------------------------------

export interface PdfItem {
  str: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Segment { x0: number; x1: number; text: string }

/** Turns the positioned text of each PDF page into lines, reading two-column pages one column at a time. */
export function pdfPagesToText(pages: Array<{ width: number; items: PdfItem[] }>): string {
  return pages.map((page) => {
    const items = page.items.filter((i) => i.str.trim()).sort((a, b) => b.y - a.y || a.x - b.x);
    const rows: PdfItem[][] = [];
    for (const item of items) {
      const row = rows[rows.length - 1];
      if (row && Math.abs(row[0]!.y - item.y) <= Math.max(2, item.h * 0.4)) row.push(item);
      else rows.push([item]);
    }
    const lines: Segment[][] = rows.map((row) => {
      const segs: Segment[] = [];
      for (const item of row.sort((a, b) => a.x - b.x)) {
        const seg = segs[segs.length - 1];
        const gap = seg ? item.x - seg.x1 : Infinity;
        const h = item.h || 10;
        if (seg && gap <= Math.max(12, h * 1.5)) {
          seg.text += (gap > h * 0.12 && !seg.text.endsWith(" ") && !item.str.startsWith(" ") ? " " : "") + item.str;
          seg.x1 = Math.max(seg.x1, item.x + item.w);
        } else segs.push({ x0: item.x, x1: item.x + item.w, text: item.str });
      }
      return segs.map((s) => ({ ...s, text: s.text.replace(/\s+/g, " ").trim() }));
    });
    // A gutter: an x that no text crosses, with real text (not just dates) on both sides.
    const valid: number[] = [];
    for (let g = page.width * 0.25; g <= page.width * 0.72; g += 2) {
      const crossing = lines.filter((segs) => segs.some((s) => s.x0 < g - 2 && s.x1 > g + 2)).length;
      const left = lines.filter((segs) => segs.some((s) => s.x1 <= g)).length;
      const right = lines.filter((segs) => segs.some((s) => s.x0 >= g && !DATE_ONLY.test(s.text))).length;
      const rightOnly = lines.filter((segs) => segs.every((s) => s.x0 >= g)).length;
      if (crossing <= Math.max(4, lines.length * 0.25) && left >= 3 && right >= 3 && rightOnly >= 1) valid.push(g);
    }
    const join = (segs: Segment[]) => segs.map((s) => s.text).filter(Boolean).join(" | ");
    if (!valid.length) return lines.map(join).join("\n");
    const g = valid[Math.floor(valid.length / 2)]!;
    const full: string[] = [];
    const leftCol: string[] = [];
    const rightCol: string[] = [];
    for (const segs of lines) {
      if (segs.some((s) => s.x0 < g - 2 && s.x1 > g + 2)) {
        full.push(join(segs));
        continue;
      }
      const l = join(segs.filter((s) => s.x1 <= g + 2));
      const r = join(segs.filter((s) => s.x0 >= g - 2));
      if (l) leftCol.push(l);
      if (r) rightCol.push(r);
    }
    return [...full, ...leftCol, ...rightCol].join("\n");
  }).join("\n");
}

/** The words under a link. A PDF often stores a whole line ("Email | LinkedIn | GitHub | Portfolio") as one text
 * item, each word its own link: the item is cut at its separators, and the piece that overlaps the link most is the
 * link's word (positions are estimated per character, so only a whole piece is ever taken, never part of a word). */
function linkWord(items: PdfItem[], rect: number[]): string {
  const [x0, y0, x1, y1] = rect as [number, number, number, number];
  const lo = Math.min(x0, x1), hi = Math.max(x0, x1);
  const words: string[] = [];
  for (const t of items) {
    const my = t.y + t.h / 3;
    if (my < Math.min(y0, y1) - 2 || my > Math.max(y0, y1) + 2 || t.x > hi || t.x + t.w < lo || !t.str.length) continue;
    const per = t.w / t.str.length;
    let best = "";
    let bestOverlap = 0;
    for (const m of t.str.matchAll(/[^|•·,;]+/g)) {
      const piece = m[0].trim();
      if (!piece) continue;
      const from = t.x + (m.index! + m[0].indexOf(piece)) * per;
      const to = from + piece.length * per;
      const overlap = Math.min(to, hi) - Math.max(from, lo);
      if (overlap > bestOverlap) {
        bestOverlap = overlap;
        best = piece;
      }
    }
    if (best) words.push(best);
  }
  return words.join(" ").replace(/\s+/g, " ").trim();
}

/** Extracts positioned text from a PDF byte buffer and turns it into readable lines. */
export async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const isNode = typeof window === "undefined" && typeof process !== "undefined" && process.versions?.node;
  // The legacy build is for Node (tests) only: a path the bundler cannot see keeps it out of the extension (round 10:
  // it shipped as a second 790 KB copy of the PDF reader).
  const nodeBuild = ["pdfjs-dist", "legacy", "build", "pdf.mjs"].join("/");
  const pdfjs: any = isNode ? await import(/* @vite-ignore */ nodeBuild) : await import("pdfjs-dist");
  if (typeof chrome !== "undefined" && chrome.runtime?.getURL) {
    pdfjs.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL("pdf.worker.mjs");
  }
  const loadingTask = pdfjs.getDocument({
    data: bytes,
    isEvalSupported: false,
    useSystemFonts: true,
  });
  const doc = await loadingTask.promise;
  const pages: Array<{ width: number; items: PdfItem[] }> = [];
  const links: ResumeLink[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 1.0 });
    const textContent = await page.getTextContent();
    const items: PdfItem[] = textContent.items
      .filter((item: any) => typeof item.str === "string")
      .map((item: any) => ({
        str: item.str,
        x: item.transform[4],
        y: item.transform[5],
        w: item.width,
        h: item.height || Math.abs(item.transform[3]) || 10,
      }));
    pages.push({ width: viewport.width, items });
    const annotations: any[] = await page.getAnnotations().catch(() => []);
    for (const a of annotations) {
      const url = a?.subtype === "Link" ? String(a.url ?? a.unsafeUrl ?? "") : "";
      if (!url || !Array.isArray(a.rect)) continue;
      links.push({ anchor: linkWord(items, a.rect as number[]), url });
    }
  }
  return withLinks(pdfPagesToText(pages), links);
}

// --- DOCX -------------------------------------------------------------------------------------------------

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new ReadableStream<Uint8Array>({ start(c) { c.enqueue(data); c.close(); } }).pipeThrough(new DecompressionStream("deflate-raw") as unknown as ReadableWritablePair<Uint8Array, Uint8Array>);
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.length;
  }
  const out = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}

/** One file from a ZIP archive (read through the central directory), or undefined. */
export async function unzipFile(zip: Uint8Array, name: string): Promise<Uint8Array | undefined> {
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  let eocd = -1;
  for (let i = zip.length - 22; i >= Math.max(0, zip.length - 65_557); i--) if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) return undefined;
  const count = view.getUint16(eocd + 10, true);
  let p = view.getUint32(eocd + 16, true);
  const decoder = new TextDecoder();
  for (let i = 0; i < count && p + 46 <= zip.length; i++) {
    if (view.getUint32(p, true) !== 0x02014b50) return undefined;
    const method = view.getUint16(p + 10, true);
    const compressed = view.getUint32(p + 20, true);
    const nameLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const commentLen = view.getUint16(p + 32, true);
    const local = view.getUint32(p + 42, true);
    const entry = decoder.decode(zip.subarray(p + 46, p + 46 + nameLen));
    if (entry === name) {
      const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
      const data = zip.subarray(start, start + compressed);
      if (method === 0) return data;
      if (method === 8) return inflateRaw(data);
      return undefined;
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  return undefined;
}

const XML_ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const unescapeXml = (s: string) => s.replace(/&(#x?[0-9a-f]+|amp|lt|gt|quot|apos);/gi, (_, e: string) =>
  e[0] === "#" ? String.fromCodePoint(e[1]?.toLowerCase() === "x" ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : XML_ENTITIES[e.toLowerCase()]!);

/** The text of a Word document's body: one line per paragraph, table cells separated by " | ". */
export function docxXmlToText(xml: string): string {
  const body = xml.replace(/<w:(?:instrText|delText)[^>]*>[\s\S]*?<\/w:(?:instrText|delText)>/g, "");
  return body
    .replace(/<\/w:p>\s*<\/w:tc>/g, "</w:tc>")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<\/w:tc>/g, " | ")
    .replace(/<w:tab\/>|<w:tab [^>]*\/>/g, "   ")
    .replace(/<w:br\/>|<w:br [^>]*\/>|<w:cr\/>/g, "\n")
    .replace(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g, (_, t: string) => `\u0000${t}\u0001`)
    .replace(/<[^>]+>/g, "")
    .replace(/\u0000([^\u0001]*)\u0001/g, (_, t: string) => unescapeXml(t))
    .split("\n").map((l) => l.replace(/\s*\|\s*$/, "").trimEnd()).join("\n");
}

/** The text of a .docx file, or undefined if it is not one. */
export async function docxToText(bytes: Uint8Array): Promise<string | undefined> {
  const xml = await unzipFile(bytes, "word/document.xml");
  if (!xml) return undefined;
  const doc = new TextDecoder().decode(xml);
  const rels = await unzipFile(bytes, "word/_rels/document.xml.rels").catch(() => undefined);
  return withLinks(docxXmlToText(doc), docxLinks(doc, rels ? new TextDecoder().decode(rels) : ""));
}

/** The links of a Word file with their words: <w:hyperlink r:id> (target in the relationships file) and
 * HYPERLINK field codes (the words between "separate" and "end"). */
export function docxLinks(xml: string, relsXml: string): ResumeLink[] {
  const targets = new Map<string, string>();
  for (const m of relsXml.matchAll(/<Relationship\b[^>]*>/g)) {
    const tag = m[0];
    const id = /\bId="([^"]+)"/.exec(tag)?.[1];
    const target = /\bTarget="([^"]+)"/.exec(tag)?.[1];
    if (id && target && /TargetMode="External"/.test(tag)) targets.set(id, unescapeXml(target));
  }
  const words = (fragment: string) => [...fragment.matchAll(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g)].map((t) => unescapeXml(t[1]!)).join("").trim();
  const links: ResumeLink[] = [];
  for (const m of xml.matchAll(/<w:hyperlink\b([^>]*)>([\s\S]*?)<\/w:hyperlink>/g)) {
    const id = /\br:id="([^"]+)"/.exec(m[1]!)?.[1];
    const url = id ? targets.get(id) : undefined;
    if (url) links.push({ anchor: words(m[2]!), url });
  }
  for (const m of xml.matchAll(/<w:instrText[^>]*>\s*HYPERLINK\s+"([^"]+)"[^<]*<\/w:instrText>([\s\S]*?)<w:fldChar w:fldCharType="end"\/>/g)) {
    const shown = m[2]!.split(/<w:fldChar w:fldCharType="separate"\/>/)[1] ?? "";
    links.push({ anchor: words(shown), url: unescapeXml(m[1]!) });
  }
  return links;
}

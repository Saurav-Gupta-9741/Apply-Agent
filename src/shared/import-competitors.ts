/** Competitor import module: switch from Simplify, Huntr, and Teal in 2 minutes.
 *
 * Imports CSV job trackers exported by competitors, mapping their columns:
 * company, title, URL, stage, date -> ApplyAgent tracker stages.
 * Unknown columns are safely preserved as notes.
 * Pure and 100% on-device: zero data leaves the browser.
 */

import type { ApplicationRecord, TrackerStage } from "./types";

export type CompetitorSource = "simplify" | "huntr" | "teal" | "generic";

/** Normalizes raw competitor stage / status names to standard ApplyAgent TrackerStage. */
export function mapCompetitorStage(rawStage: string): TrackerStage {
  const s = (rawStage || "").trim().toLowerCase();
  if (/offer|accepted|hired/i.test(s)) return "Offer";
  if (/interview|phone screen|technical|onsite|first round|recruiter|screen/i.test(s)) return "Interview";
  if (/assessment|take.?home|test|coding challenge|assignment/i.test(s)) return "Assessment";
  if (/applied|submitted|in review|under review|pending|active/i.test(s)) return "Applied";
  if (/reject|archive|declined|not selected|closed|passed/i.test(s)) return "Rejected";
  if (/withdraw|canceled|cancelled|opted out/i.test(s)) return "Withdrawn";
  if (/wishlist|saved|bookmark|interested|to apply|backlog|queue/i.test(s)) return "Saved";
  return "Applied";
}

/** Parses standard RFC-4180 CSV with quotes, newlines inside cells, and escaped quotes. */
export function parseCsvRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;
  let i = 0;

  const text = csvText.replace(/^\uFEFF/, ""); // strip BOM

  while (i < text.length) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          currentCell += '"';
          i += 2;
          continue;
        } else {
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        currentCell += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      } else if (char === ",") {
        currentRow.push(currentCell.trim());
        currentCell = "";
        i++;
        continue;
      } else if (char === "\r") {
        if (i + 1 < text.length && text[i + 1] === "\n") i++;
        currentRow.push(currentCell.trim());
        if (currentRow.some((c) => c.length > 0)) rows.push(currentRow);
        currentRow = [];
        currentCell = "";
        i++;
        continue;
      } else if (char === "\n") {
        currentRow.push(currentCell.trim());
        if (currentRow.some((c) => c.length > 0)) rows.push(currentRow);
        currentRow = [];
        currentCell = "";
        i++;
        continue;
      } else {
        currentCell += char;
        i++;
        continue;
      }
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((c) => c.length > 0)) rows.push(currentRow);
  }

  return rows;
}

/** Detects whether the CSV comes from Simplify, Huntr, Teal, or generic format. */
export function detectCompetitorSource(headers: string[]): CompetitorSource {
  const lower = headers.map((h) => h.toLowerCase().trim());
  if (lower.some((h) => h === "list" || h.includes("list name"))) return "huntr";
  if (lower.some((h) => h.includes("job post url") || h.includes("date saved") || h.includes("excitement"))) return "teal";
  if (lower.some((h) => h.includes("simplify") || h === "job url" || h === "date applied")) return "simplify";
  return "generic";
}

/** Parses flexible date formats (ISO, MM/DD/YYYY, DD-MM-YYYY, Month D, YYYY) into ISO string. */
export function parseDateToIso(rawDate: string): string {
  if (!rawDate || !rawDate.trim()) return new Date().toISOString();
  const d = new Date(rawDate.trim());
  if (!Number.isNaN(d.getTime())) return d.toISOString();

  // Try matching MM/DD/YYYY or DD/MM/YYYY
  const parts = rawDate.trim().split(/[/.-]/);
  if (parts.length === 3) {
    const p0 = parseInt(parts[0]!, 10);
    const p1 = parseInt(parts[1]!, 10);
    const p2 = parseInt(parts[2]!, 10);
    const year = p2 > 1000 ? p2 : p0 > 1000 ? p0 : 2000 + p2;
    const month = p0 > 1000 ? p1 : p0;
    const day = p0 > 1000 ? p2 : p1;
    const constructed = new Date(Date.UTC(year, month - 1, day));
    if (!Number.isNaN(constructed.getTime())) return constructed.toISOString();
  }

  return new Date().toISOString();
}

/** Import competitor CSV text into ApplyAgent ApplicationRecord[]. */
export function importCompetitorCsv(csvText: string, defaultPlatform = "import"): ApplicationRecord[] {
  const rows = parseCsvRows(csvText);
  if (rows.length < 2) return [];

  const headers = rows[0]!;
  const source = detectCompetitorSource(headers);

  // Map header index to standard properties
  let companyIdx = -1;
  let titleIdx = -1;
  let urlIdx = -1;
  let stageIdx = -1;
  let dateIdx = -1;
  let notesIdx = -1;

  headers.forEach((h, idx) => {
    const norm = h.toLowerCase().trim();
    if (companyIdx === -1 && /^(company|company name|employer|organization)$/.test(norm)) companyIdx = idx;
    else if (titleIdx === -1 && /^(job title|title|role|position)$/.test(norm)) titleIdx = idx;
    else if (urlIdx === -1 && /^(job url|job post url|url|link|posting url|application url)$/.test(norm)) urlIdx = idx;
    else if (stageIdx === -1 && /^(stage|status|list|state|column)$/.test(norm)) stageIdx = idx;
    else if (dateIdx === -1 && /^(date applied|date|applied date|created at|created_at|date saved)$/.test(norm)) dateIdx = idx;
    else if (notesIdx === -1 && /^(notes|note|comment|comments|description)$/.test(norm)) notesIdx = idx;
  });

  // Fallbacks if exact headers were not found
  if (companyIdx === -1) companyIdx = headers.findIndex((h) => /company/i.test(h));
  if (titleIdx === -1) titleIdx = headers.findIndex((h) => /title|role|position/i.test(h));
  if (urlIdx === -1) urlIdx = headers.findIndex((h) => /url|link/i.test(h));
  if (stageIdx === -1) stageIdx = headers.findIndex((h) => /stage|status|list/i.test(h));
  if (dateIdx === -1) dateIdx = headers.findIndex((h) => /date|created/i.test(h));

  const records: ApplicationRecord[] = [];
  const knownIndices = new Set([companyIdx, titleIdx, urlIdx, stageIdx, dateIdx, notesIdx].filter((i) => i >= 0));

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]!;
    const company = companyIdx >= 0 ? (row[companyIdx] || "").trim() : "";
    const jobTitle = titleIdx >= 0 ? (row[titleIdx] || "").trim() : "";
    const rawUrl = urlIdx >= 0 ? (row[urlIdx] || "").trim() : "";
    const rawStage = stageIdx >= 0 ? (row[stageIdx] || "").trim() : "";
    const rawDate = dateIdx >= 0 ? (row[dateIdx] || "").trim() : "";
    const rawNotes = notesIdx >= 0 ? (row[notesIdx] || "").trim() : "";

    if (!company && !jobTitle) continue; // skip blank rows

    const stage = mapCompetitorStage(rawStage);
    const dateIso = parseDateToIso(rawDate);

    // Collect all unknown extra columns as notes
    const extraParts: string[] = [];
    if (rawNotes) extraParts.push(rawNotes);

    headers.forEach((h, idx) => {
      if (!knownIndices.has(idx)) {
        const val = (row[idx] || "").trim();
        if (val) extraParts.push(`${h}: ${val}`);
      }
    });

    const safeCompanySlug = (company || "job").toLowerCase().replace(/[^a-z0-9]/g, "-");
    const validUrl = rawUrl && /^https?:\/\//i.test(rawUrl)
      ? rawUrl
      : `https://${safeCompanySlug}.careers/apply/${r}`;

    const id = `import_${source}_${Date.now()}_${r}_${Math.random().toString(36).slice(2, 6)}`;

    records.push({
      id,
      url: validUrl,
      platform: `${source}_import`,
      jobTitle: jobTitle || "Untitled Position",
      company: company || "Unknown Employer",
      stage,
      status: stage === "Saved" ? "in_progress" : "applied_confirmed",
      createdAt: dateIso,
      submittedAt: stage !== "Saved" ? dateIso : undefined,
      notes: extraParts.length ? extraParts.join("\n") : undefined,
    });
  }

  return records;
}

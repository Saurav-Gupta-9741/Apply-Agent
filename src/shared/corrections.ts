/** Learning from user corrections:
 * When the user edits a field ApplyAgent filled, record the correction.
 * After 2 identical corrections, save it to the answer bank (normal AnswerEntry) for automatic reuse.
 * On the first correction, only suggest it in the panel.
 * Safety:
 * - NEVER learn for fields ApplyAgent asked about.
 * - NEVER learn passwords, numbers, legal declarations, or someone else's details.
 */

import type { AnswerEntry, UserCorrection } from "./types";

/** Patterns that must NEVER be learned as user corrections. */
const FORBIDDEN_PATTERNS: RegExp[] = [
  // Passwords / PINs
  /\b(password|passcode|pin|secret|token)\b/i,
  // Someone else's details (referrers, references, relatives, emergency contacts)
  /\b(referr\w*|reference\w*|emergency\s*contact|spouse|manager|supervisor|relative|parent|guardian|next\s*of\s*kin)\b/i,
  // Identity numbers & financial numbers
  /\b(ssn|social\s*security|passport\s*(no|number|#)|tax\s*(id|no|number)|driver'?s?\s*licen[sc]e\s*(no|number|#)|national\s*id|identity\s*number|card\s*number|account\s*number|routing\s*number)\b/i,
  // Legal declarations, attestations, signatures, consents
  /\b(certif\w*|attest\w*|signature|signed|declaration|non-?compete|\bnda\b|perjury|criminal|agree\s*to|consent|terms\s*of|privacy\s*policy)\b/i,
];

/** Check if a field question is safe and eligible to learn corrections from. */
export function isLearnableCorrection(question: string, control?: string): boolean {
  if (!question || !question.trim()) return false;
  if (control === "password" || control === "file") return false;
  const q = question.trim();
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(q)) return false;
  }
  return true;
}

export interface CorrectionResult {
  updatedCorrections: UserCorrection[];
  promotedToAnswerBank: boolean;
  promotedEntry?: AnswerEntry;
}

/** Record a correction:
 * - If identical correction seen before: count increases. When count >= 2, promotes to AnswerEntry.
 * - If new correction: count starts at 1 (suggested in panel only).
 */
export function applyCorrection(
  existingCorrections: UserCorrection[],
  question: string,
  answer: string
): CorrectionResult {
  const normQ = question.trim().toLowerCase();
  const trimmedAns = answer.trim();

  const existingIndex = existingCorrections.findIndex(
    (c) => c.question.trim().toLowerCase() === normQ && c.answer.trim().toLowerCase() === trimmedAns.toLowerCase()
  );

  const updated = [...existingCorrections];
  let promotedToAnswerBank = false;
  let promotedEntry: AnswerEntry | undefined;

  if (existingIndex >= 0) {
    const prev = existingCorrections[existingIndex]!;
    const newCount = prev.count + 1;
    const item: UserCorrection = {
      question: prev.question, // preserve original casing
      answer: trimmedAns,
      count: newCount,
      lastUpdated: new Date().toISOString(),
    };
    updated[existingIndex] = item;

    if (newCount >= 2) {
      promotedToAnswerBank = true;
      promotedEntry = {
        question: prev.question,
        answer: trimmedAns,
        updatedAt: item.lastUpdated,
      };
    }
  } else {
    const item: UserCorrection = {
      question: question.trim(),
      answer: trimmedAns,
      count: 1,
      lastUpdated: new Date().toISOString(),
    };
    updated.push(item);
  }

  return { updatedCorrections: updated, promotedToAnswerBank, promotedEntry };
}

/** Find a suggested correction for a question (count === 1). */
export function findSuggestedCorrection(
  corrections: UserCorrection[],
  question: string
): UserCorrection | undefined {
  if (!question || !question.trim()) return undefined;
  const normQ = question.trim().toLowerCase();
  return corrections.find((c) => c.question.trim().toLowerCase() === normQ);
}

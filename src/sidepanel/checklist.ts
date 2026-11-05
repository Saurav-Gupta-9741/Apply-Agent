/** The field checklist after a fill (round 5): every field of the page, required first, with a clear state, and live
 * updates as the user fills the rest on the page. Pure, so it is tested. */

import type { FieldResult } from "../shared/types";

/** What a field holds on the page now (read by the page script; the value stays in the browser). */
export interface LiveField {
  key: string;
  label: string;
  /** null: cannot be told from the page (a file chosen through a styled button). */
  filled: boolean | null;
  value?: string;
}

export type RowTone = "ok" | "warn" | "bad" | "info" | "";

export interface RowState {
  /** Counts as answered: filled by ApplyAgent, kept from the site, or filled by the user afterwards. */
  done: boolean;
  chip: string;
  tone: RowTone;
  /** The user filled it on the page after the fill. */
  byYou?: boolean;
}

const BASE: Record<FieldResult["status"], [string, RowTone]> = {
  filled: ["Filled", "ok"],
  already_filled: ["Kept yours", "info"],
  failed: ["Fix on page", "bad"],
  needs_user: ["Needs you", "warn"],
  skipped: ["Left blank", ""],
};

/** The same field in the latest page reading: by key and label, else by label (keys move when a form grows). */
export function liveFor(r: FieldResult, live?: LiveField[]): LiveField | undefined {
  if (!live) return undefined;
  return live.find((l) => l.key === r.field.key && l.label === r.field.label) ?? live.find((l) => l.label === r.field.label);
}

/** The wrong option a dropdown ended on ("the list shows "X", not "Y""), if that is why it failed. */
function wrongShown(r: FieldResult): string | undefined {
  return /^the list shows "(.*)", not "/.exec(r.detail ?? "")?.[1];
}

export function rowState(r: FieldResult, live?: LiveField[]): RowState {
  const [chip, tone] = r.review ? ["Check this", "warn" as RowTone] : BASE[r.status];
  const done = r.status === "filled" || r.status === "already_filled";
  const now = liveFor(r, live);
  if (!now || now.filled === null) return { done, chip, tone };
  if (!done && now.filled) {
    // A dropdown that showed a wrong option still shows it: only another choice counts as fixed.
    const wrong = wrongShown(r);
    if (wrong !== undefined && (now.value ?? "").trim() === wrong.trim()) return { done, chip, tone };
    return { done: true, chip: "Filled by you", tone: "ok", byYou: true };
  }
  if (done && !now.filled && r.field.required && r.field.control !== "file") return { done: false, chip: "Empty now", tone: "warn" };
  return { done, chip, tone };
}

export interface ChecklistSummary {
  required: number;
  requiredDone: number;
  optional: number;
  optionalDone: number;
  /** Required fields still to answer. */
  left: number;
}

export function summarize(fields: FieldResult[], live?: LiveField[]): ChecklistSummary {
  const s: ChecklistSummary = { required: 0, requiredDone: 0, optional: 0, optionalDone: 0, left: 0 };
  for (const r of fields) {
    const { done } = rowState(r, live);
    if (r.field.required) {
      s.required++;
      if (done) s.requiredDone++;
    } else {
      s.optional++;
      if (done) s.optionalDone++;
    }
  }
  s.left = s.required - s.requiredDone;
  return s;
}

/** The headline over the list: "9 of 14 required fields filled · 5 left". */
export function headline(s: ChecklistSummary): string {
  if (!s.required) return `${s.optionalDone} of ${s.optional} field${s.optional === 1 ? "" : "s"} filled`;
  if (!s.left) return `All ${s.required} required field${s.required === 1 ? "" : "s"} filled`;
  return `${s.requiredDone} of ${s.required} required filled · ${s.left} left`;
}

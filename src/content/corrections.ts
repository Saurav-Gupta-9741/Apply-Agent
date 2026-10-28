/** Tracks fields filled by ApplyAgent and records user corrections when the user edits them.
 * Rules:
 * - NEVER learn for fields ApplyAgent asked about.
 * - NEVER learn passwords, numbers, legal declarations, or someone else's details.
 * - Save only on blur / change, or when Next / Submit is pressed.
 * - Compare against what the field showed right after filling (a phone box holds only the national number, a radio
 *   button's value can be a code), so a reformatted fill or tabbing through is never mistaken for a correction.
 */

import type { Message } from "../shared/types";
import type { ExtractedField } from "./extract";
import { currentValue } from "./fill";
import { isLearnableCorrection } from "../shared/corrections";

interface Tracked {
  field: ExtractedField;
  question: string;
  /** The field's value as last seen: right after the fill, then after each recorded correction. */
  last: string;
}

const tracked = new WeakMap<Element, Tracked>();

function flush(state: Tracked): void {
  const current = currentValue(state.field).trim();
  if (!current || current.toLowerCase() === state.last.toLowerCase()) return;
  state.last = current;
  if (typeof chrome !== "undefined" && chrome?.runtime?.sendMessage) {
    chrome.runtime.sendMessage({
      type: "RECORD_CORRECTION",
      question: state.question,
      answer: current,
    } satisfies Message).catch?.(() => undefined);
  }
}

/** Track a field ApplyAgent just filled, so user edits are recorded as corrections. */
export function trackCorrection(doc: Document, field: ExtractedField): void {
  const question = field.descriptor.label?.trim();
  if (!question || !isLearnableCorrection(question, field.descriptor.control)) return;

  const known = field.elements.find((el) => tracked.has(el));
  if (known) {
    // Filled again (e.g. after the user saved an answer): what it shows now is the new starting point.
    const state = tracked.get(known)!;
    state.field = field;
    state.last = currentValue(field).trim();
    return;
  }
  const state: Tracked = { field, question, last: currentValue(field).trim() };
  const handler = () => flush(state);
  for (const el of field.elements) {
    if (!(el instanceof HTMLElement)) continue;
    tracked.set(el, state);
    el.addEventListener("blur", handler);
    el.addEventListener("change", handler);
  }
}

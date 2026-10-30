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
const trackedListeners = new Map<HTMLElement, { blur: () => void; change: () => void }>();

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

/** Remove event listeners from elements that have been removed from the DOM (e.g. during SPA step navigation) */
export function pruneDisconnectedCorrections(): number {
  let count = 0;
  for (const [el, handlers] of trackedListeners) {
    if (!el.isConnected) {
      el.removeEventListener("blur", handlers.blur);
      el.removeEventListener("change", handlers.change);
      trackedListeners.delete(el);
      count++;
    }
  }
  return count;
}

/** Explicitly unhook and clean up all correction event listeners */
export function untrackCorrections(root?: Element | Document): void {
  if (!root) {
    for (const [el, handlers] of trackedListeners) {
      el.removeEventListener("blur", handlers.blur);
      el.removeEventListener("change", handlers.change);
    }
    trackedListeners.clear();
    return;
  }
  for (const [el, handlers] of trackedListeners) {
    if (root.contains(el)) {
      el.removeEventListener("blur", handlers.blur);
      el.removeEventListener("change", handlers.change);
      trackedListeners.delete(el);
    }
  }
}

/** Number of actively tracked elements with attached event listeners */
export function getActiveTrackedCount(): number {
  pruneDisconnectedCorrections();
  return trackedListeners.size;
}

/** Track a field ApplyAgent just filled, so user edits are recorded as corrections. */
export function trackCorrection(doc: Document, field: ExtractedField): void {
  pruneDisconnectedCorrections();
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
    trackedListeners.set(el, { blur: handler, change: handler });
  }
}

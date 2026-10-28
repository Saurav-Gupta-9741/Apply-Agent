/** Tracks fields filled by ApplyAgent and records user corrections when the user edits them.
 * Rules:
 * - NEVER learn for fields ApplyAgent asked about.
 * - NEVER learn passwords, numbers, legal declarations, or someone else's details.
 * - Save only on blur / change, or when Next / Submit is pressed.
 */

import type { Message } from "../shared/types";
import type { ExtractedField } from "./extract";
import { isLearnableCorrection } from "../shared/corrections";

const filledValues = new WeakMap<Element, string>();
const trackedElements = new Set<HTMLElement>();

function getElementValue(el: HTMLElement): string {
  if (el instanceof HTMLInputElement) {
    if (el.type === "checkbox") return el.checked ? "Yes" : "No";
    if (el.type === "radio") return el.checked ? el.value : "";
    return el.value;
  }
  if (el instanceof HTMLTextAreaElement) return el.value;
  if (el instanceof HTMLSelectElement) {
    if (el.multiple) return Array.from(el.selectedOptions, (o) => o.text || o.value).join(", ");
    return el.options[el.selectedIndex]?.text || el.value;
  }
  return "";
}

function flushElementCorrection(el: HTMLElement, question: string): void {
  const initial = filledValues.get(el);
  if (initial === undefined) return;
  const current = getElementValue(el).trim();
  if (current && current.toLowerCase() !== initial.trim().toLowerCase()) {
    filledValues.set(el, current);
    if (typeof chrome !== "undefined" && chrome?.runtime?.sendMessage) {
      chrome.runtime.sendMessage({
        type: "RECORD_CORRECTION",
        question,
        answer: current,
      } satisfies Message).catch?.(() => undefined);
    }
  }
}

/** Track a filled field so user edits are recorded as corrections. */
export function trackCorrection(doc: Document, field: ExtractedField, filledValue: string): void {
  const question = field.descriptor.label?.trim();
  if (!question || !isLearnableCorrection(question, field.descriptor.control)) return;

  for (const el of field.elements) {
    if (!(el instanceof HTMLElement)) continue;
    filledValues.set(el, filledValue.trim());
    if (trackedElements.has(el)) continue;
    trackedElements.add(el);

    const handler = () => flushElementCorrection(el, question);
    el.addEventListener("blur", handler);
    el.addEventListener("change", handler);
  }

  // Also flush on form submit
  doc.addEventListener("submit", () => {
    for (const el of field.elements) {
      if (el instanceof HTMLElement) flushElementCorrection(el, question);
    }
  }, { capture: true, once: true });
}

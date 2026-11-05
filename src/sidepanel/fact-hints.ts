/** Help on a question card for a question that stays asked (the fact sheet, src/content/factsheet.ts):
 *  - a suggestion from the user's own saved data, put in the answer box for the user to check and save (never filled
 *    on the page by itself): "After graduating in May 2027"
 *  - for a question a Quick answer would settle on every form ("Are you eligible to work in India?"), a pointer to
 *    that Quick answer while it is empty. */

import { answerSuggestion, missingQuickAnswer } from "../content/factsheet";
import type { FieldResult, Profile } from "../shared/types";

type AnswerBox = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text) node.textContent = text;
  return node;
}

/** The hints for one question card (an empty list when there is nothing to add). */
export function factHints(r: FieldResult, profile: Profile, input: AnswerBox, openQuickAnswer: (key: string) => void): HTMLElement[] {
  const out: HTMLElement[] = [];
  const suggestion = r.decision.kind === "ask" && !(input instanceof HTMLSelectElement) ? answerSuggestion(r.field, profile) : undefined;
  if (suggestion && !input.value) {
    input.value = suggestion.value;
    out.push(el("p", "hint fact-suggestion", `Suggested from ${suggestion.from}. Check it, then save.`));
  }
  const quick = missingQuickAnswer(r.decision, profile);
  if (quick) {
    const row = el("div", "fact-quick");
    row.append(el("p", "hint", "Answer once in Quick answers and it is used on every form."));
    const open = el("button", "btn btn-ghost btn-sm", `Open Quick answers: ${quick.label}`);
    open.type = "button";
    open.dataset.quickFact = quick.key;
    open.addEventListener("click", () => openQuickAnswer(quick.key));
    row.append(open);
    out.push(row);
  }
  return out;
}

/** Scroll to one Quick answer box and put the cursor in it (the Answers section must be showing). */
export function focusQuickAnswer(key: string): boolean {
  const box = document.querySelector<HTMLElement>(`#quick-card [data-fact="${CSS.escape(key)}"]`);
  if (!box) return false;
  box.scrollIntoView({ behavior: "smooth", block: "center" });
  box.focus();
  return true;
}

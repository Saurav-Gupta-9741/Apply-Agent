/**
 * Quick Answers Setup Wizard (Step 2).
 * A 2-minute step-by-step setup screen that walks through the common questions forms ask, saving them into profile
 * facts so they become automatic from the first application.
 *
 * Rules (beta tester report, Nov 2026):
 * - Nothing is pre-selected. An example answer is only a placeholder; Skip leaves the question to be asked on forms.
 * - Every Next / Skip saves what is answered so far, and the wizard reopens where the user left it.
 * - Links, years and languages are checked before they are saved.
 */

import { existingQuickAnswer, languageLevel, QUICK_QUESTIONS, applyQuickAnswers, quickAnswerProblem } from "../shared/quick-answers";
import { loadProfile, saveProfile } from "../shared/storage";
import type { LanguageEntry } from "../shared/types";

export interface QuickAnswersWizardOptions {
  onDone?: (answers: Record<string, string | string[]>) => void;
  onCancel?: () => void;
}

/** Where the wizard was left (chrome.storage.local), so a closed panel resumes there. */
export const WIZARD_STEP_KEY = "quickWizardStep";

const LEVEL_CHOICES: Array<[LanguageEntry["proficiency"], string]> = [
  ["Native", "Native"],
  ["Fluent", "Fluent"],
  ["Professional", "Advanced (professional)"],
  ["Conversational", "Intermediate (conversational)"],
  ["Basic", "Beginner (basic)"],
];

async function readStep(): Promise<number> {
  try {
    const got = await chrome.storage.local.get(WIZARD_STEP_KEY);
    const n = Number(got[WIZARD_STEP_KEY]);
    return Number.isInteger(n) && n > 0 && n < QUICK_QUESTIONS.length ? n : 0;
  } catch {
    return 0;
  }
}

async function writeStep(step: number | null): Promise<void> {
  try {
    if (step === null) await chrome.storage.local.remove(WIZARD_STEP_KEY);
    else await chrome.storage.local.set({ [WIZARD_STEP_KEY]: step });
  } catch {
    /* storage unavailable: the wizard still works, it just starts at question 1 next time */
  }
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = "", text = ""): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

/**
 * Mounts the Quick Answers setup wizard into the given DOM container.
 */
export async function mountQuickAnswers(
  container: HTMLElement,
  optionsOrDone?: ((answers: Record<string, string | string[]>) => void) | QuickAnswersWizardOptions
): Promise<void> {
  const options: QuickAnswersWizardOptions =
    typeof optionsOrDone === "function" ? { onDone: optionsOrDone } : optionsOrDone ?? {};

  const profile = await loadProfile();
  // Only what the user already saved: no example answer ever becomes theirs.
  const answers: Record<string, string | string[]> = {};
  for (const q of QUICK_QUESTIONS) {
    const existing = existingQuickAnswer(profile, q);
    if (existing !== undefined) answers[q.id] = existing;
  }

  const total = QUICK_QUESTIONS.length;
  let currentIndex = await readStep();
  const resumed = currentIndex > 0;

  /** Saves are chained, so a quick Next-Next-Finish never writes an older state over a newer one. */
  let saving: Promise<void> = Promise.resolve();
  function persist(step: number | null): Promise<void> {
    const snapshot = { ...answers };
    saving = saving.then(async () => {
      const current = await loadProfile();
      await saveProfile(applyQuickAnswers(current, snapshot));
      await writeStep(step);
    }).catch(() => undefined);
    return saving;
  }

  async function persistAndFinish(): Promise<void> {
    await persist(null);
    options.onDone?.(answers);
  }

  function render(): void {
    container.replaceChildren();

    const q = QUICK_QUESTIONS[currentIndex];
    if (!q) return;

    const card = el("div", "card quick-wizard-card");
    card.setAttribute("role", "region");
    card.setAttribute("aria-label", `Quick Answers setup step ${currentIndex + 1} of ${total}`);

    // Header
    const head = el("div", "card-head");
    const titleBox = el("div");
    titleBox.append(el("h2", "", "Quick Answers Setup"), el("span", "muted wizard-step-counter", `Question ${currentIndex + 1} of ${total}`));

    const exitBtn = el("button", "btn btn-ghost btn-sm wizard-save-exit", "Save & Exit");
    exitBtn.type = "button";
    exitBtn.title = "Save answers entered so far and return";
    exitBtn.addEventListener("click", async () => {
      if (!keepCurrent()) return;
      await persist(currentIndex);
      options.onDone?.(answers);
    });
    head.append(titleBox, exitBtn);

    // Progress bar
    const progressTrack = el("div", "wizard-progress-track");
    progressTrack.style.cssText = "background: var(--surface-3, #2a2e39); height: 5px; border-radius: 3px; overflow: hidden; margin: 10px 0 16px 0;";
    const progressFill = el("div", "wizard-progress-fill");
    const percent = Math.round(((currentIndex + 1) / total) * 100);
    progressFill.style.cssText = `background: var(--accent, #7c7ffb); height: 100%; width: ${percent}%; transition: width 0.25s ease;`;
    progressTrack.append(progressFill);

    // Question content
    const body = el("div", "wizard-body");
    if (resumed && currentIndex > 0 && !container.dataset.resumeShown) {
      container.dataset.resumeShown = "1";
      body.append(el("p", "hint wizard-resumed", "Picked up where you left off. Your earlier answers are saved."));
    }
    const promptEl = el("h3", "wizard-prompt", q.prompt);
    promptEl.style.cssText = "font-size: 14.5px; font-weight: 600; margin-bottom: 6px; line-height: 1.4;";
    const whyEl = el("p", "hint wizard-why");
    whyEl.style.cssText = "font-size: 12px; color: var(--text-2, #94a3b8); margin-bottom: 10px;";
    const whyBadge = el("span", "badge", "Why we ask");
    whyBadge.style.cssText = "background: var(--surface-3, #2a2e39); padding: 2px 6px; border-radius: 4px; font-weight: 500; margin-right: 6px; color: var(--text, #f1f5f9);";
    whyEl.append(whyBadge, document.createTextNode(q.why));
    body.append(promptEl, whyEl);
    if (q.hint) body.append(el("p", "hint wizard-hint", q.hint));

    const controlContainer = el("div", "wizard-control-container");
    controlContainer.style.cssText = "margin-bottom: 12px;";
    const errorEl = el("p", "wizard-error");
    errorEl.setAttribute("role", "alert");
    errorEl.style.cssText = "color: var(--bad, #ef4444); font-size: 12.5px; margin: 6px 0 0 0;";
    errorEl.hidden = true;

    // The value shown now; undefined = the user has not answered (Next then behaves like Skip).
    let getCurrentValue: () => string | string[] | undefined = () => undefined;

    if (q.kind === "choice" || q.kind === "yesno") {
      const opts = q.options ?? (q.kind === "yesno" ? ["Yes", "No"] : []);
      const btnGroup = el("div", "wizard-choices-group");
      btnGroup.style.cssText = "display: flex; flex-direction: column; gap: 8px;";
      let currentSelected: string | undefined = typeof answers[q.id] === "string" ? (answers[q.id] as string) : undefined;
      const mark = () => btnGroup.querySelectorAll<HTMLElement>(".wizard-choice-btn").forEach((b) => {
        const on = b.dataset.value === currentSelected;
        b.classList.toggle("active-choice", on);
        b.setAttribute("aria-pressed", String(on));
        b.style.borderColor = on ? "var(--accent, #7c7ffb)" : "";
        b.style.background = on ? "var(--accent-soft, rgba(124, 127, 251, 0.15))" : "";
      });
      const choices: Array<[string, string]> = opts.map((o) => [o, o]);
      // A saved answer can be taken back: forms then ask again.
      if (currentSelected) choices.push(["", "Ask me on each form"]);
      for (const [value, text] of choices) {
        const optBtn = el("button", `btn btn-secondary wizard-choice-btn${value === "" ? " wizard-ask-me" : ""}`, text);
        optBtn.type = "button";
        optBtn.dataset.value = value;
        optBtn.style.cssText = "justify-content: flex-start; text-align: left; padding: 10px 14px; font-size: 13px;";
        optBtn.addEventListener("click", () => {
          currentSelected = value;
          answers[q.id] = value;
          mark();
        });
        btnGroup.append(optBtn);
      }
      mark();
      getCurrentValue = () => currentSelected;
      controlContainer.append(btnGroup);
    } else if (q.kind === "multi") {
      const opts = q.options ?? [];
      const multiBox = el("div", "wizard-multi-group");
      multiBox.style.cssText = "display: flex; flex-wrap: wrap; gap: 8px;";
      const saved = answers[q.id];
      const currentSelected = new Set<string>(Array.isArray(saved) ? saved : typeof saved === "string" && saved.trim() ? saved.split(",").map((s) => s.trim()) : []);
      let touched = false;
      for (const opt of opts) {
        const pill = el("button", `btn btn-sm ${currentSelected.has(opt) ? "btn-primary active-pill" : "btn-secondary"}`, opt);
        pill.type = "button";
        pill.addEventListener("click", () => {
          touched = true;
          if (currentSelected.has(opt)) {
            currentSelected.delete(opt);
            pill.className = "btn btn-sm btn-secondary";
          } else {
            currentSelected.add(opt);
            pill.className = "btn btn-sm btn-primary active-pill";
          }
          answers[q.id] = Array.from(currentSelected);
        });
        multiBox.append(pill);
      }
      getCurrentValue = () => (touched || saved !== undefined ? Array.from(currentSelected) : undefined);
      controlContainer.append(multiBox);
    } else if (q.id === "languages") {
      // One row per language: the name typed, the level picked (never guessed).
      const rows = el("div", "wizard-lang-rows stack");
      const addRow = (language = "", level: LanguageEntry["proficiency"] | "" = "") => {
        const row = el("div", "wizard-lang-row");
        row.style.cssText = "display: grid; grid-template-columns: 1.4fr 1.6fr auto; gap: 8px; align-items: center; margin-bottom: 6px;";
        const name = el("input", "input wizard-lang-name");
        name.type = "text";
        name.placeholder = "Language (e.g. Hindi)";
        name.setAttribute("aria-label", "Language");
        name.value = language;
        const select = el("select", "input wizard-lang-level");
        select.setAttribute("aria-label", "Level");
        const none = el("option", "", "Choose level…");
        none.value = "";
        select.append(none);
        for (const [value, text] of LEVEL_CHOICES) {
          const o = el("option", "", text);
          o.value = value;
          select.append(o);
        }
        select.value = level;
        const remove = el("button", "btn btn-ghost btn-sm wizard-lang-remove", "Remove");
        remove.type = "button";
        remove.addEventListener("click", () => row.remove());
        row.append(name, select, remove);
        rows.append(row);
        return name;
      };
      const saved = typeof answers[q.id] === "string" ? (answers[q.id] as string) : "";
      for (const part of saved.split(",").map((s) => s.trim()).filter(Boolean)) {
        const [language, level] = part.split(":").map((s) => s.trim());
        addRow(language ?? "", (level && languageLevel(level)) || "");
      }
      if (!rows.children.length) addRow();
      const add = el("button", "btn btn-ghost btn-sm wizard-lang-add", "+ Add language");
      add.type = "button";
      add.addEventListener("click", () => addRow().focus());
      getCurrentValue = () => {
        const parts = Array.from(rows.querySelectorAll<HTMLElement>(".wizard-lang-row")).map((row) => {
          const name = row.querySelector<HTMLInputElement>(".wizard-lang-name")!.value.trim();
          const level = row.querySelector<HTMLSelectElement>(".wizard-lang-level")!.value;
          return name ? (level ? `${name}: ${level}` : name) : "";
        }).filter(Boolean);
        return parts.length ? parts.join(", ") : undefined;
      };
      controlContainer.append(rows, add);
    } else {
      // number, text, date
      const input = el("input", "input wizard-input");
      input.type = q.kind === "number" ? "number" : "text";
      if (q.kind === "number") {
        input.min = "0";
        input.step = "0.5";
      }
      input.style.cssText = "width: 100%; box-sizing: border-box; font-size: 13.5px; padding: 8px 12px;";
      input.placeholder = q.placeholder ?? (q.defaultAnswer ? `e.g. ${q.defaultAnswer}` : "Type your answer, or Skip");
      const existingVal = answers[q.id];
      if (existingVal !== undefined && existingVal !== null) input.value = Array.isArray(existingVal) ? existingVal.join(", ") : String(existingVal);
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          void advance();
        }
      });
      input.addEventListener("input", () => (errorEl.hidden = true));
      getCurrentValue = () => {
        const v = input.value.trim();
        // An emptied box clears a saved answer; an untouched empty box is just unanswered.
        return v || existingVal !== undefined ? v : undefined;
      };
      controlContainer.append(input);
      setTimeout(() => input.focus(), 50);
    }

    if (q.kind !== "number" && q.kind !== "text" && q.id !== "languages") {
      body.append(el("p", "hint wizard-skip-hint", "Not sure? Press Skip and ApplyAgent will ask you on each form."));
    }
    body.append(controlContainer, errorEl);

    /** Checks the value on screen and keeps it in `answers`. False when it can't be saved (the reason is shown). */
    function keepCurrent(): boolean {
      const val = getCurrentValue();
      if (val === undefined) return true;
      const problem = quickAnswerProblem(q!.id, val);
      if (problem) {
        errorEl.textContent = problem;
        errorEl.hidden = false;
        return false;
      }
      answers[q!.id] = val;
      return true;
    }

    // Footer actions
    const foot = el("div", "wizard-actions");
    foot.style.cssText = "display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-top: 12px;";

    const backBtn = el("button", "btn btn-secondary btn-sm wizard-back", "Back");
    backBtn.type = "button";
    backBtn.disabled = currentIndex === 0;
    backBtn.addEventListener("click", () => {
      if (currentIndex > 0) {
        currentIndex--;
        render();
        void writeStep(currentIndex);
      }
    });

    const rightActions = el("div");
    rightActions.style.cssText = "display: flex; gap: 8px;";

    const skipBtn = el("button", "btn btn-ghost btn-sm wizard-skip", "Skip");
    skipBtn.type = "button";
    skipBtn.title = "Leave this one: forms will ask you";
    skipBtn.addEventListener("click", async () => {
      // Skip changes nothing: an answer saved earlier stays, an unanswered question stays unanswered.
      if (currentIndex < total - 1) {
        currentIndex++;
        render();
        void persist(currentIndex);
      } else {
        await persistAndFinish();
      }
    });

    const isLast = currentIndex === total - 1;
    const nextBtn = el("button", "btn btn-primary btn-sm wizard-next", isLast ? "Finish" : "Next");
    nextBtn.type = "button";

    async function advance(): Promise<void> {
      if (!keepCurrent()) return;
      if (isLast) {
        nextBtn.disabled = true;
        nextBtn.textContent = "Saving...";
        await persistAndFinish();
      } else {
        currentIndex++;
        render();
        void persist(currentIndex);
      }
    }
    nextBtn.addEventListener("click", () => void advance());

    rightActions.append(skipBtn, nextBtn);
    foot.append(backBtn, rightActions);

    card.append(head, progressTrack, body, foot);
    container.append(card);
  }

  render();
}

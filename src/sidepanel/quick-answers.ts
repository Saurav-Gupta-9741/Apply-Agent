/**
 * Quick Answers Setup Wizard (Step 2).
 * A 2-minute step-by-step setup screen that walks through the ~25 common questions
 * forms ask, saving them into profile facts so they become automatic from the first application.
 */

import { QUICK_QUESTIONS, applyQuickAnswers, type QuickQuestion } from "../shared/quick-answers";
import { loadProfile, saveProfile } from "../shared/storage";
import type { Profile } from "../shared/types";

export interface QuickAnswersWizardOptions {
  onDone?: (answers: Record<string, string | string[]>) => void;
  onCancel?: () => void;
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

  let profile: Profile = await loadProfile();
  const answers: Record<string, string | string[]> = {};

  // Extract initial values from profile
  for (const q of QUICK_QUESTIONS) {
    let existing: string | string[] | undefined;
    if (q.factKey.startsWith("facts.")) {
      const subKey = q.factKey.replace("facts.", "") as keyof NonNullable<Profile["facts"]>;
      const val = profile.facts?.[subKey];
      if (val !== undefined && val !== null && val !== "") {
        existing = String(val);
      }
    } else if (q.id === "languages") {
      if (profile.languages?.length) {
        existing = profile.languages.map((l) => `${l.language}: ${l.proficiency}`).join(", ");
      }
    } else {
      const val = (profile as unknown as Record<string, unknown>)[q.factKey];
      if (val !== undefined && val !== null && val !== "") {
        existing = String(val);
      }
    }

    if (existing !== undefined) {
      if (q.kind === "multi") {
        answers[q.id] = typeof existing === "string" ? existing.split(",").map((s) => s.trim()).filter(Boolean) : existing;
      } else {
        answers[q.id] = existing;
      }
    } else if (q.defaultAnswer !== undefined) {
      if (q.kind === "multi") {
        answers[q.id] = q.defaultAnswer ? [q.defaultAnswer] : [];
      } else {
        answers[q.id] = q.defaultAnswer;
      }
    }
  }

  let currentIndex = 0;
  const total = QUICK_QUESTIONS.length;

  async function persistAndFinish(): Promise<void> {
    const current = await loadProfile();
    const updated = applyQuickAnswers(current, answers);
    await saveProfile(updated);
    if (options.onDone) {
      options.onDone(answers);
    }
  }

  function render(): void {
    container.replaceChildren();

    const q = QUICK_QUESTIONS[currentIndex];
    if (!q) return;

    const card = document.createElement("div");
    card.className = "card quick-wizard-card";
    card.setAttribute("role", "region");
    card.setAttribute("aria-label", `Quick Answers setup step ${currentIndex + 1} of ${total}`);

    // Header
    const head = document.createElement("div");
    head.className = "card-head";

    const titleBox = document.createElement("div");
    const h2 = document.createElement("h2");
    h2.textContent = "Quick Answers Setup";
    titleBox.append(h2);

    const stepLabel = document.createElement("span");
    stepLabel.className = "muted wizard-step-counter";
    stepLabel.textContent = `Question ${currentIndex + 1} of ${total}`;
    titleBox.append(stepLabel);

    const exitBtn = document.createElement("button");
    exitBtn.type = "button";
    exitBtn.className = "btn btn-ghost btn-sm wizard-save-exit";
    exitBtn.textContent = "Save & Exit";
    exitBtn.title = "Save answers entered so far and return";
    exitBtn.addEventListener("click", async () => {
      await persistAndFinish();
    });

    head.append(titleBox, exitBtn);

    // Progress bar
    const progressTrack = document.createElement("div");
    progressTrack.className = "wizard-progress-track";
    progressTrack.style.cssText = "background: var(--surface-3, #2a2e39); height: 5px; border-radius: 3px; overflow: hidden; margin: 10px 0 16px 0;";

    const progressFill = document.createElement("div");
    progressFill.className = "wizard-progress-fill";
    const percent = Math.round(((currentIndex + 1) / total) * 100);
    progressFill.style.cssText = `background: var(--accent, #7c7ffb); height: 100%; width: ${percent}%; transition: width 0.25s ease;`;
    progressTrack.append(progressFill);

    // Question content
    const body = document.createElement("div");
    body.className = "wizard-body";

    const promptEl = document.createElement("h3");
    promptEl.className = "wizard-prompt";
    promptEl.style.cssText = "font-size: 14.5px; font-weight: 600; margin-bottom: 6px; line-height: 1.4;";
    promptEl.textContent = q.prompt;

    const whyEl = document.createElement("p");
    whyEl.className = "hint wizard-why";
    whyEl.style.cssText = "font-size: 12px; color: var(--text-2, #94a3b8); margin-bottom: 16px;";
    const whyBadge = document.createElement("span");
    whyBadge.className = "badge";
    whyBadge.style.cssText = "background: var(--surface-3, #2a2e39); padding: 2px 6px; border-radius: 4px; font-weight: 500; margin-right: 6px; color: var(--text, #f1f5f9);";
    whyBadge.textContent = "Why we ask";
    whyEl.append(whyBadge, document.createTextNode(q.why));

    body.append(promptEl, whyEl);

    // Input control depending on question kind
    const controlContainer = document.createElement("div");
    controlContainer.className = "wizard-control-container";
    controlContainer.style.cssText = "margin-bottom: 20px;";

    let getCurrentValue: () => string | string[] = () => "";

    if (q.kind === "choice" || q.kind === "yesno") {
      const opts = q.options ?? (q.kind === "yesno" ? ["Yes", "No"] : []);
      const btnGroup = document.createElement("div");
      btnGroup.className = "wizard-choices-group";
      btnGroup.style.cssText = "display: flex; flex-direction: column; gap: 8px;";

      let currentSelected = typeof answers[q.id] === "string" ? (answers[q.id] as string) : "";

      opts.forEach((opt) => {
        const optBtn = document.createElement("button");
        optBtn.type = "button";
        optBtn.className = `btn btn-secondary wizard-choice-btn${currentSelected === opt ? " active-choice" : ""}`;
        optBtn.style.cssText = "justify-content: flex-start; text-align: left; padding: 10px 14px; font-size: 13px;";
        if (currentSelected === opt) {
          optBtn.style.borderColor = "var(--accent, #7c7ffb)";
          optBtn.style.background = "var(--accent-soft, rgba(124, 127, 251, 0.15))";
        }
        optBtn.textContent = opt;

        optBtn.addEventListener("click", () => {
          currentSelected = opt;
          answers[q.id] = opt;
          btnGroup.querySelectorAll(".wizard-choice-btn").forEach((b) => {
            const eb = b as HTMLElement;
            eb.classList.remove("active-choice");
            eb.style.borderColor = "";
            eb.style.background = "";
          });
          optBtn.classList.add("active-choice");
          optBtn.style.borderColor = "var(--accent, #7c7ffb)";
          optBtn.style.background = "var(--accent-soft, rgba(124, 127, 251, 0.15))";
        });
        btnGroup.append(optBtn);
      });

      getCurrentValue = () => currentSelected;
      controlContainer.append(btnGroup);
    } else if (q.kind === "multi") {
      const opts = q.options ?? [];
      const multiBox = document.createElement("div");
      multiBox.className = "wizard-multi-group";
      multiBox.style.cssText = "display: flex; flex-wrap: wrap; gap: 8px;";

      const currentSelected = new Set<string>(
        Array.isArray(answers[q.id])
          ? (answers[q.id] as string[])
          : typeof answers[q.id] === "string" && (answers[q.id] as string).trim()
          ? (answers[q.id] as string).split(",").map((s) => s.trim())
          : []
      );

      opts.forEach((opt) => {
        const pill = document.createElement("button");
        pill.type = "button";
        const isSelected = currentSelected.has(opt);
        pill.className = `btn btn-sm ${isSelected ? "btn-primary active-pill" : "btn-secondary"}`;
        pill.textContent = opt;
        pill.addEventListener("click", () => {
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
      });

      getCurrentValue = () => Array.from(currentSelected);
      controlContainer.append(multiBox);
    } else {
      // number, text, date
      const input = document.createElement("input");
      input.type = q.kind === "number" ? "number" : "text";
      input.className = "input wizard-input";
      input.style.cssText = "width: 100%; box-sizing: border-box; font-size: 13.5px; padding: 8px 12px;";
      input.placeholder = q.defaultAnswer ? `e.g. ${q.defaultAnswer}` : "Enter answer...";
      const existingVal = answers[q.id];
      if (existingVal !== undefined && existingVal !== null) {
        input.value = Array.isArray(existingVal) ? existingVal.join(", ") : String(existingVal);
      }

      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          advance();
        }
      });

      getCurrentValue = () => input.value.trim();
      controlContainer.append(input);
      setTimeout(() => input.focus(), 50);
    }

    body.append(controlContainer);

    // Footer actions
    const foot = document.createElement("div");
    foot.className = "wizard-actions";
    foot.style.cssText = "display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-top: 12px;";

    const backBtn = document.createElement("button");
    backBtn.type = "button";
    backBtn.className = "btn btn-secondary btn-sm wizard-back";
    backBtn.textContent = "Back";
    backBtn.disabled = currentIndex === 0;
    backBtn.addEventListener("click", () => {
      if (currentIndex > 0) {
        currentIndex--;
        render();
      }
    });

    const rightActions = document.createElement("div");
    rightActions.style.cssText = "display: flex; gap: 8px;";

    const skipBtn = document.createElement("button");
    skipBtn.type = "button";
    skipBtn.className = "btn btn-ghost btn-sm wizard-skip";
    skipBtn.textContent = "Skip";
    skipBtn.addEventListener("click", async () => {
      if (currentIndex < total - 1) {
        currentIndex++;
        render();
      } else {
        await persistAndFinish();
      }
    });

    const isLast = currentIndex === total - 1;
    const nextBtn = document.createElement("button");
    nextBtn.type = "button";
    nextBtn.className = "btn btn-primary btn-sm wizard-next";
    nextBtn.textContent = isLast ? "Finish" : "Next";

    async function advance(): Promise<void> {
      const currentQ = QUICK_QUESTIONS[currentIndex];
      if (!currentQ) return;
      const val = getCurrentValue();
      if (val !== undefined && val !== "" && (!Array.isArray(val) || val.length > 0)) {
        answers[currentQ.id] = val;
      }
      if (isLast) {
        nextBtn.disabled = true;
        nextBtn.textContent = "Saving...";
        await persistAndFinish();
      } else {
        currentIndex++;
        render();
      }
    }

    nextBtn.addEventListener("click", () => {
      void advance();
    });

    rightActions.append(skipBtn, nextBtn);
    foot.append(backBtn, rightActions);

    card.append(head, progressTrack, body, foot);
    container.append(card);
  }

  render();
}

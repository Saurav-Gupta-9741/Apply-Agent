/** On-device AI drafts for free-text application questions.
 *
 * Uses Chrome's built-in model (Prompt API via Gemini Nano).
 * 1-click flow: "Draft answer → [Use] [Edit] [Skip]"
 *
 * Hard Rules:
 *  - 100% on-device: zero cloud calls, no external networks.
 *  - Strictly grounded in profile + JD. If facts are insufficient, outputs INSUFFICIENT.
 *  - Never typed into the page until the user clicks [Use].
 */

import { aiStatus, buildDraftPrompt, checkDraft, draftAnswer, INSUFFICIENT, type DraftOptions } from "../shared/ai";
import { isNeverRemembered, isSecretField } from "../content/classify";
import type { FieldDescriptor, Profile } from "../shared/types";

export interface DraftContext {
  question: string;
  field: FieldDescriptor;
  profile: Profile;
  job: { title: string; company: string };
  onUse: (draftText: string) => Promise<void> | void;
  onSkip?: () => void;
  toast?: (message: string, kind?: "ok" | "warn" | "bad") => void;
}

const DRAFTABLE_QUESTION_PATTERNS = [
  /why (do you want|are you interested|work here|apply|join|salesforce|walmart|adobe|this company)/i,
  /tell (us|me) about (yourself|a time|a project|an accomplishment|a challenge)/i,
  /describe (your|a|how you|an experience)/i,
  /what (makes you|motivates you|interests you|is your experience|are your strengths)/i,
  /cover letter|statement of interest|additional (information|notes)|summary of qualifications/i,
  /how (did you|would you|do you approach)/i,
];

const NOT_DRAFTABLE_NAMES = /^(first_?name|last_?name|full_?name|email|phone|mobile|tel|address|street|city|state|zip|postal|country|url|linkedin|github|website|salary|ctc|notice|gender|race|veteran|disability|signature)$/i;

/** Determines whether a form field is an open-ended question suitable for AI drafting. */
export function isDraftableField(field: { control: string; label: string; name?: string; options?: string[] }): boolean {
  if (field.options && field.options.length > 0) return false;
  if (isSecretField({ label: field.label, name: field.name ?? "" })) return false;
  if (field.name && NOT_DRAFTABLE_NAMES.test(field.name)) return false;
  if (isNeverRemembered(field.label)) return false;

  // Textarea controls are designed for open-ended essay answers
  if (field.control === "textarea") return true;

  // Text controls matching descriptive prompts
  if (field.control === "text") {
    return DRAFTABLE_QUESTION_PATTERNS.some((pat) => pat.test(field.label));
  }

  return false;
}

/** Status message and guidance when built-in AI is missing or downloadable. */
export function getAiStatusInfo(status: "available" | "downloadable" | "unavailable"): {
  ready: boolean;
  title: string;
  detail: string;
  flagUrl?: string;
} {
  if (status === "available") {
    return {
      ready: true,
      title: "Chrome Built-in AI ready",
      detail: "Runs 100% on-device (Gemini Nano via Chrome Prompt API). Zero cloud calls.",
    };
  }

  return {
    ready: false,
    title: "Drafts need Chrome's built-in AI",
    detail: "Enable Chrome's built-in model (Gemini Nano) in chrome://flags/#prompt-api-for-gemini-nano. ApplyAgent runs drafts 100% locally with zero cloud calls.",
    flagUrl: "chrome://flags/#prompt-api-for-gemini-nano",
  };
}

/** Creates the 1-click draft container UI. */
export function createDraftWidget(ctx: DraftContext): HTMLElement {
  const container = document.createElement("div");
  container.className = "draft-widget";

  const draftBtn = document.createElement("button");
  draftBtn.type = "button";
  draftBtn.className = "btn btn-ghost btn-sm draft-trigger";
  draftBtn.textContent = "Draft answer with Chrome AI";
  container.append(draftBtn);

  const previewBox = document.createElement("div");
  previewBox.className = "draft-preview-box";
  previewBox.style.display = "none";
  container.append(previewBox);

  draftBtn.addEventListener("click", async () => {
    draftBtn.disabled = true;
    draftBtn.textContent = "Checking on-device model...";

    const status = await aiStatus();
    if (status !== "available") {
      const info = getAiStatusInfo(status);
      previewBox.replaceChildren();

      const alert = document.createElement("div");
      alert.className = "draft-alert";
      const heading = document.createElement("strong");
      heading.textContent = info.title;
      const desc = document.createElement("p");
      desc.textContent = info.detail;
      alert.append(heading, desc);

      const closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.className = "btn btn-secondary btn-sm";
      closeBtn.textContent = "Dismiss";
      closeBtn.addEventListener("click", () => {
        previewBox.style.display = "none";
        draftBtn.disabled = false;
        draftBtn.textContent = "Draft answer with Chrome AI";
      });
      alert.append(closeBtn);
      previewBox.append(alert);
      previewBox.style.display = "block";
      return;
    }

    draftBtn.textContent = "Drafting answer (on-device)...";

    try {
      const text = await draftAnswer(ctx.question, ctx.profile, ctx.job);
      if (!text || text.includes(INSUFFICIENT)) {
        previewBox.replaceChildren();
        const insufficientCard = document.createElement("div");
        insufficientCard.className = "draft-insufficient";
        insufficientCard.textContent = "INSUFFICIENT facts in your profile to draft an accurate answer. ApplyAgent never invents experience or facts.";
        const dismissBtn = document.createElement("button");
        dismissBtn.type = "button";
        dismissBtn.className = "btn btn-ghost btn-sm";
        dismissBtn.textContent = "Write answer manually";
        dismissBtn.addEventListener("click", () => {
          previewBox.style.display = "none";
          draftBtn.disabled = false;
          draftBtn.textContent = "Draft answer with Chrome AI";
        });
        insufficientCard.append(dismissBtn);
        previewBox.append(insufficientCard);
        previewBox.style.display = "block";
        return;
      }

      // Check draft for numbers, fluff, word counts
      const warnings = checkDraft(text, ctx.profile, ctx.job, ctx.question);

      previewBox.replaceChildren();
      const textarea = document.createElement("textarea");
      textarea.className = "input draft-textarea";
      textarea.rows = 4;
      textarea.value = text;
      previewBox.append(textarea);

      if (warnings.length) {
        const warnList = document.createElement("ul");
        warnList.className = "draft-warnings";
        for (const w of warnings) {
          const li = document.createElement("li");
          li.textContent = w;
          warnList.append(li);
        }
        previewBox.append(warnList);
      }

      // 1-Click action row: [Use] [Edit] [Skip]
      const actionRow = document.createElement("div");
      actionRow.className = "button-row draft-actions";

      const useBtn = document.createElement("button");
      useBtn.type = "button";
      useBtn.className = "btn btn-primary btn-sm";
      useBtn.textContent = "Use";
      useBtn.title = "Accept this draft and fill it on the page";

      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "btn btn-secondary btn-sm";
      editBtn.textContent = "Edit";
      editBtn.title = "Focus text area to edit before using";

      const skipBtn = document.createElement("button");
      skipBtn.type = "button";
      skipBtn.className = "btn btn-ghost btn-sm";
      skipBtn.textContent = "Skip";
      skipBtn.title = "Discard this draft";

      useBtn.addEventListener("click", async () => {
        useBtn.disabled = true;
        const finalDraft = textarea.value.trim();
        await ctx.onUse(finalDraft);
        previewBox.style.display = "none";
        draftBtn.textContent = "Draft accepted (assisted)";
        draftBtn.disabled = true;
      });

      editBtn.addEventListener("click", () => {
        textarea.focus();
        textarea.select();
      });

      skipBtn.addEventListener("click", () => {
        previewBox.style.display = "none";
        draftBtn.disabled = false;
        draftBtn.textContent = "Draft answer with Chrome AI";
        ctx.onSkip?.();
      });

      actionRow.append(useBtn, editBtn, skipBtn);
      previewBox.append(actionRow);
      previewBox.style.display = "block";
      draftBtn.textContent = "Regenerate draft";
      draftBtn.disabled = false;
    } catch (err) {
      previewBox.replaceChildren();
      const errDiv = document.createElement("div");
      errDiv.className = "draft-error";
      errDiv.textContent = `Drafting failed: ${String(err)}`;
      previewBox.append(errDiv);
      previewBox.style.display = "block";
      draftBtn.disabled = false;
      draftBtn.textContent = "Draft answer with Chrome AI";
    }
  });

  return container;
}

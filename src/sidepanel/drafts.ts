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
import { docxToText, extractPdfText } from "../shared/resume-parse";
import { isNeverRemembered, isSecretField, questionTopic } from "../content/classify";
import { isEssayQuestion } from "../shared/essay-question";
import type { FieldDescriptor, Profile } from "../shared/types";
import { checkLength, fitToLimit, lengthCounter, lengthLimit, type LengthLimit } from "../shared/length-limit";

/** The length limit of a question: its words, help text and placeholder, and the box's maxlength. */
export function limitOfField(field: FieldDescriptor): LengthLimit | undefined {
  return lengthLimit(`${field.label} ${field.hint ?? ""} ${field.placeholder ?? ""}`, field.maxLength);
}

/** A live "143 / 200 words" line under a text box; red when over a hard limit. Nothing when there is no limit. */
export function limitCounter(input: HTMLInputElement | HTMLTextAreaElement, limit: LengthLimit | undefined): HTMLElement | undefined {
  if (!limit) return undefined;
  const line = document.createElement("p");
  line.className = "length-counter";
  line.setAttribute("aria-live", "polite");
  const update = () => {
    line.textContent = lengthCounter(input.value, limit) ?? "";
    const fit = checkLength(input.value, limit);
    line.classList.toggle("over", !fit.ok);
    line.title = fit.problem ?? "";
  };
  input.addEventListener("input", update);
  update();
  return line;
}

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

  // Salary, visa, consent and the other sensitive topics are the user's own facts, never an AI draft.
  if (questionTopic(field.label)) return false;
  if (field.control !== "textarea" && field.control !== "text") return false;
  // Only real essay questions: not links, start dates, "How did you hear about us?" or yes/no facts in a big box.
  return isEssayQuestion(field.label, field.control === "textarea")
    || (field.control === "text" && DRAFTABLE_QUESTION_PATTERNS.some((pat) => pat.test(field.label)) && isEssayQuestion(field.label, true));
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

/** The text of the saved resume file (PDF, Word or plain text), read once per file: the drafts' second source of
 * facts. Read on this device only; an unreadable file gives "" (the profile alone is used). */
let resumeCache: { id: string; text: Promise<string> } | undefined;
export function resumeTextOf(profile: Profile): Promise<string> {
  const file = profile.resume;
  if (!file?.dataBase64) return Promise.resolve("");
  const id = `${file.name}:${file.dataBase64.length}`;
  if (resumeCache?.id !== id) {
    const text = (async () => {
      const bytes = Uint8Array.from(atob(file.dataBase64), (c) => c.charCodeAt(0));
      const name = file.name.toLowerCase();
      if (name.endsWith(".pdf") || file.type === "application/pdf") return extractPdfText(bytes);
      if (name.endsWith(".docx")) return (await docxToText(bytes)) ?? "";
      if (name.endsWith(".txt") || file.type.startsWith("text/")) return new TextDecoder("utf-8").decode(bytes);
      return "";
    })().catch(() => "");
    resumeCache = { id, text };
  }
  return resumeCache.text;
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
      const resumeText = await resumeTextOf(ctx.profile);
      const limit = limitOfField(ctx.field);
      const raw = await draftAnswer(ctx.question, ctx.profile, ctx.job, { resumeText, limit });
      // Cut to the question's limit at a whole sentence; a draft whose first sentence is already too long is not offered.
      const text = raw && !raw.includes(INSUFFICIENT) ? fitToLimit(raw, limit) : raw;
      const shortened = !!raw && !!text && text !== raw.trim();
      if (raw && !raw.includes(INSUFFICIENT) && !text) {
        previewBox.replaceChildren();
        const tooLong = document.createElement("div");
        tooLong.className = "draft-insufficient";
        tooLong.textContent = `The draft did not fit this question's limit (${lengthCounter("", limit)?.replace(/^0 \/ /, "") ?? "length"}). Please write a short answer yourself.`;
        previewBox.append(tooLong);
        previewBox.style.display = "block";
        draftBtn.disabled = false;
        draftBtn.textContent = "Draft answer with Chrome AI";
        return;
      }
      if (!text || text.includes(INSUFFICIENT)) {
        previewBox.replaceChildren();
        const insufficientCard = document.createElement("div");
        insufficientCard.className = "draft-insufficient";
        insufficientCard.textContent = "Not enough facts in your profile or resume to draft an accurate answer. ApplyAgent never invents experience or facts.";
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
      const warnings = checkDraft(text, ctx.profile, ctx.job, { question: ctx.question, reference: resumeText });

      previewBox.replaceChildren();
      const textarea = document.createElement("textarea");
      textarea.className = "input draft-textarea";
      textarea.rows = 4;
      textarea.value = text;
      previewBox.append(textarea);
      const counter = limitCounter(textarea, limit);
      if (counter) previewBox.append(counter);
      if (shortened) {
        const note = document.createElement("p");
        note.className = "draft-note";
        note.textContent = "Shortened at a whole sentence to fit this question's limit.";
        previewBox.append(note);
      }

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
        const finalDraft = textarea.value.trim();
        const fit = checkLength(finalDraft, limit);
        if (!fit.ok) {
          ctx.toast?.(`Too long: ${fit.problem}`, "warn");
          textarea.focus();
          return;
        }
        useBtn.disabled = true;
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

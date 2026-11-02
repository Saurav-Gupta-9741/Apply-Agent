/**
 * First-run onboarding flow (3 screens):
 * 1. Import resume (upload or paste text)
 * 2. Quick Answers wizard (notice period, work permit, salary)
 * 3. Try it on built-in demo form (in 5 seconds)
 */

import { loadProfile, saveProfile } from "../shared/storage";
import { parseResumeFromBuffer } from "./resume-import";
import { mountQuickAnswers } from "./quick-answers";
import type { Profile } from "../shared/types";

export interface OnboardingOptions {
  onDone: () => void | Promise<void>;
  onOpenDemo?: () => void;
}

export async function isFirstRun(): Promise<boolean> {
  const { onboarding_done } = await chrome.storage.local.get("onboarding_done");
  if (onboarding_done) return false;
  const profile = await loadProfile();
  return !profile.firstName && !profile.email && !profile.resume;
}

export function createOnboardingElement(options: OnboardingOptions): HTMLElement {
  const root = document.createElement("div");
  root.id = "onboarding-container";
  root.className = "card onboarding-card";
  root.setAttribute("role", "region");
  root.setAttribute("aria-label", "Welcome setup wizard");

  let currentStep = 1;

  function renderStep(): void {
    root.replaceChildren();

    // Step indicator
    const header = document.createElement("div");
    header.className = "card-head";
    const title = document.createElement("h2");
    title.id = "onboarding-title";
    const stepBadge = document.createElement("span");
    stepBadge.className = "chip";
    stepBadge.textContent = `Step ${currentStep} of 3`;
    header.append(title, stepBadge);
    root.append(header);

    const body = document.createElement("div");
    body.className = "stack";
    body.style.marginTop = "12px";
    root.append(body);

    if (currentStep === 1) {
      title.textContent = "1. Add your resume";
      const desc = document.createElement("p");
      desc.className = "hint";
      desc.textContent = "Import your resume to auto-fill your contact info and experience. Everything stays on this device.";
      body.append(desc);

      // File upload dropzone
      const dropzone = document.createElement("label");
      dropzone.className = "dropzone";
      dropzone.style.display = "flex";
      dropzone.style.flexDirection = "column";
      dropzone.style.alignItems = "center";
      dropzone.style.padding = "20px";
      dropzone.style.border = "2px dashed var(--border, #cbd5e1)";
      dropzone.style.borderRadius = "8px";
      dropzone.style.cursor = "pointer";

      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.id = "onboarding-file-input";
      fileInput.accept = ".pdf,.doc,.docx,.txt";
      fileInput.style.display = "none";

      const dropText = document.createElement("span");
      dropText.id = "onboarding-file-label";
      dropText.textContent = "Click to upload resume (PDF or DOCX)";
      dropzone.append(fileInput, dropText);
      body.append(dropzone);

      fileInput.addEventListener("change", async () => {
        const file = fileInput.files?.[0];
        if (!file) return;
        dropText.textContent = `Reading ${file.name}...`;
        try {
          const buffer = await file.arrayBuffer();
          const bytes = new Uint8Array(buffer);
          let binary = "";
          for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
          const profile = await loadProfile();
          profile.resume = { name: file.name, type: file.type || "application/octet-stream", dataBase64: btoa(binary) };
          const parsed = await parseResumeFromBuffer(file.name, bytes);
          if (parsed.fullName) {
            const parts = parsed.fullName.trim().split(/\s+/);
            profile.firstName = parts[0] || "";
            profile.lastName = parts.slice(1).join(" ") || "";
          }
          const emailSugg = parsed.suggestions.find((s) => s.field === "email");
          if (emailSugg) profile.email = emailSugg.value;
          const phoneSugg = parsed.suggestions.find((s) => s.field === "phone");
          if (phoneSugg) profile.phone = phoneSugg.value;
          await saveProfile(profile);
          dropText.textContent = `Attached: ${file.name}`;
          nextBtn.textContent = "Continue to Quick Answers →";
        } catch {
          dropText.textContent = `Attached: ${file.name}`;
        }
      });

      // Or paste text
      const pasteDetails = document.createElement("details");
      pasteDetails.className = "details";
      const pasteSummary = document.createElement("summary");
      pasteSummary.textContent = "Or paste resume text directly";
      const pasteTextarea = document.createElement("textarea");
      pasteTextarea.id = "onboarding-paste-textarea";
      pasteTextarea.className = "input";
      pasteTextarea.rows = 4;
      pasteTextarea.placeholder = "Paste resume text here...";
      pasteTextarea.style.marginTop = "8px";

      const savePasteBtn = document.createElement("button");
      savePasteBtn.type = "button";
      savePasteBtn.className = "btn btn-secondary btn-sm";
      savePasteBtn.style.marginTop = "6px";
      savePasteBtn.textContent = "Save text";
      savePasteBtn.addEventListener("click", async () => {
        const txt = pasteTextarea.value.trim();
        if (!txt) return;
        const profile = await loadProfile();
        const encoder = new TextEncoder();
        const bytes = encoder.encode(txt);
        const parsed = await parseResumeFromBuffer("resume.txt", bytes);
        if (parsed.fullName) {
          const parts = parsed.fullName.trim().split(/\s+/);
          profile.firstName = parts[0] || "";
          profile.lastName = parts.slice(1).join(" ") || "";
        }
        const emailSugg = parsed.suggestions.find((s) => s.field === "email");
        if (emailSugg) profile.email = emailSugg.value;
        const phoneSugg = parsed.suggestions.find((s) => s.field === "phone");
        if (phoneSugg) profile.phone = phoneSugg.value;
        await saveProfile(profile);
        savePasteBtn.textContent = "Saved ✓";
        nextBtn.textContent = "Continue to Quick Answers →";
      });

      pasteDetails.append(pasteSummary, pasteTextarea, savePasteBtn);
      body.append(pasteDetails);

      // Buttons
      const foot = document.createElement("div");
      foot.className = "button-row";
      foot.style.marginTop = "16px";
      foot.style.display = "flex";
      foot.style.justifyContent = "space-between";

      const skipBtn = document.createElement("button");
      skipBtn.type = "button";
      skipBtn.id = "onboarding-skip-1";
      skipBtn.className = "btn btn-ghost btn-sm";
      skipBtn.textContent = "Skip for now";
      skipBtn.addEventListener("click", () => {
        currentStep = 2;
        renderStep();
      });

      const nextBtn = document.createElement("button");
      nextBtn.type = "button";
      nextBtn.id = "onboarding-next-1";
      nextBtn.className = "btn btn-primary btn-sm";
      nextBtn.textContent = "Next: Quick Answers →";
      nextBtn.addEventListener("click", () => {
        currentStep = 2;
        renderStep();
      });

      foot.append(skipBtn, nextBtn);
      body.append(foot);

    } else if (currentStep === 2) {
      title.textContent = "2. Quick Answers";
      const desc = document.createElement("p");
      desc.className = "hint";
      desc.textContent = "Answer common screening questions once (notice period, visa, expected salary). ApplyAgent reuses them safely.";
      body.append(desc);

      const qaMount = document.createElement("div");
      qaMount.id = "onboarding-qa-mount";
      body.append(qaMount);

      void mountQuickAnswers(qaMount, () => {
        currentStep = 3;
        renderStep();
      });

      const foot = document.createElement("div");
      foot.className = "button-row";
      foot.style.marginTop = "16px";
      foot.style.display = "flex";
      foot.style.justifyContent = "space-between";

      const backBtn = document.createElement("button");
      backBtn.type = "button";
      backBtn.className = "btn btn-ghost btn-sm";
      backBtn.textContent = "← Back";
      backBtn.addEventListener("click", () => {
        currentStep = 1;
        renderStep();
      });

      const nextBtn = document.createElement("button");
      nextBtn.type = "button";
      nextBtn.id = "onboarding-next-2";
      nextBtn.className = "btn btn-primary btn-sm";
      nextBtn.textContent = "Next: Try Practice Form →";
      nextBtn.addEventListener("click", () => {
        currentStep = 3;
        renderStep();
      });

      foot.append(backBtn, nextBtn);
      body.append(foot);

    } else if (currentStep === 3) {
      title.textContent = "3. Try it in 5 seconds";
      const desc = document.createElement("p");
      desc.className = "hint";
      desc.textContent = "You're all set! Open our bundled practice form in a new tab, then click 'Fill' (or Alt+Shift+F) to see it fill instantly.";
      body.append(desc);

      const demoCard = document.createElement("div");
      demoCard.style.padding = "16px";
      demoCard.style.background = "var(--bg-subtle, #f8fafc)";
      demoCard.style.border = "1px solid var(--border, #e2e8f0)";
      demoCard.style.borderRadius = "8px";
      demoCard.style.textAlign = "center";

      const demoTitle = document.createElement("strong");
      demoTitle.style.display = "block";
      demoTitle.style.marginBottom = "6px";
      demoTitle.textContent = "Senior Software Engineer · Acme Demo Corp";

      const demoBtn = document.createElement("button");
      demoBtn.type = "button";
      demoBtn.id = "onboarding-open-demo";
      demoBtn.className = "btn btn-secondary";
      demoBtn.style.marginTop = "8px";
      demoBtn.textContent = "Open Practice Form in New Tab";
      demoBtn.addEventListener("click", async () => {
        const url = chrome.runtime.getURL("demo-form.html");
        await chrome.tabs.create({ url });
        if (options.onOpenDemo) options.onOpenDemo();
      });

      demoCard.append(demoTitle, demoBtn);
      body.append(demoCard);

      const foot = document.createElement("div");
      foot.className = "button-row";
      foot.style.marginTop = "20px";
      foot.style.display = "flex";
      foot.style.justifyContent = "flex-end";

      const finishBtn = document.createElement("button");
      finishBtn.type = "button";
      finishBtn.id = "onboarding-finish";
      finishBtn.className = "btn btn-primary btn-block";
      finishBtn.textContent = "Finish Setup & Start Applying";
      finishBtn.addEventListener("click", async () => {
        await chrome.storage.local.set({ onboarding_done: true });
        root.remove();
        await options.onDone();
      });

      foot.append(finishBtn);
      body.append(foot);
    }
  }

  renderStep();
  return root;
}

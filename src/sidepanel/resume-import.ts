import type { LanguageEntry, Profile, ProfileKey, WorkEntry } from "../shared/types";
import {
  docxToText,
  extractPdfText,
  parseResume,
  type Confidence,
  type ParsedResume,
  type Suggestion,
} from "../shared/resume-parse";

export interface ReviewItem {
  suggestion: Suggestion;
  hasExistingValue: boolean;
  currentValue: string;
  preChecked: boolean;
  checked: boolean;
}

export async function parseResumeFromBuffer(
  name: string,
  buffer: ArrayBuffer | Uint8Array
): Promise<ParsedResume> {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const lower = name.toLowerCase();

  let text: string | undefined;
  if (lower.endsWith(".pdf")) {
    text = await extractPdfText(bytes);
  } else if (lower.endsWith(".docx")) {
    text = await docxToText(bytes);
  } else {
    text = new TextDecoder("utf-8").decode(bytes);
  }

  return parseResume(text || "");
}

export function buildReviewItems(parsed: ParsedResume, profile: Profile): ReviewItem[] {
  return parsed.suggestions.map((suggestion) => {
    let currentValue = "";
    let hasExistingValue = false;

    if (suggestion.field === "workHistory") {
      const match = profile.workHistory?.find(
        (w) => w.company.toLowerCase() === suggestion.work?.company.toLowerCase()
      );
      if (match) {
        hasExistingValue = true;
        currentValue = `${match.title} at ${match.company}`;
      }
    } else if (suggestion.field === "languages") {
      const match = profile.languages?.find(
        (l) => l.language.toLowerCase() === suggestion.language?.language.toLowerCase()
      );
      if (match) {
        hasExistingValue = true;
        currentValue = match.language + (match.proficiency ? ` (${match.proficiency})` : "");
      }
    } else {
      const val = profile[suggestion.field as ProfileKey];
      if (val !== undefined && String(val).trim().length > 0) {
        hasExistingValue = true;
        currentValue = String(val).trim();
      }
    }

    // Pre-ticked: confidence === "high" AND current profile field is empty.
    // Unticked: confidence === "medium" / "low" OR current profile field already has a value.
    const preChecked = suggestion.confidence === "high" && !hasExistingValue;

    return {
      suggestion,
      hasExistingValue,
      currentValue,
      preChecked,
      checked: preChecked,
    };
  });
}

export function applyReviewItemsToProfile(
  profile: Profile,
  reviewItems: ReviewItem[],
  customAnswers?: { experienceYears?: string }
): Profile {
  const updated: Profile = JSON.parse(JSON.stringify(profile));

  for (const item of reviewItems) {
    if (!item.checked) continue;
    const { suggestion } = item;

    if (suggestion.field === "workHistory" && suggestion.work) {
      if (!updated.workHistory) updated.workHistory = [];
      const idx = updated.workHistory.findIndex(
        (w) => w.company.toLowerCase() === suggestion.work!.company.toLowerCase()
      );
      if (idx >= 0) {
        updated.workHistory[idx] = { ...suggestion.work };
      } else {
        updated.workHistory.push({ ...suggestion.work });
      }
    } else if (suggestion.field === "languages" && suggestion.language) {
      if (!updated.languages) updated.languages = [];
      const idx = updated.languages.findIndex(
        (l) => l.language.toLowerCase() === suggestion.language!.language.toLowerCase()
      );
      const entry: LanguageEntry = {
        language: suggestion.language.language,
        proficiency: suggestion.language.proficiency || "Conversational",
      };
      if (idx >= 0) {
        updated.languages[idx] = entry;
      } else {
        updated.languages.push(entry);
      }
    } else if (suggestion.field === "skills") {
      updated.skills = suggestion.value;
      const skillsArray = suggestion.value.split(",").map((s) => s.trim()).filter(Boolean);
      if (!updated.skillsInventory) updated.skillsInventory = [];
      for (const sk of skillsArray) {
        if (!updated.skillsInventory.some((inv) => inv.name.toLowerCase() === sk.toLowerCase())) {
          updated.skillsInventory.push({ name: sk, years: 1, level: "proficient" });
        }
      }
    } else {
      (updated as any)[suggestion.field] = suggestion.value;
    }
  }

  if (customAnswers?.experienceYears && !updated.experienceYears) {
    updated.experienceYears = customAnswers.experienceYears;
  }

  return updated;
}

export function createResumeReviewElement(
  parsed: ParsedResume,
  profile: Profile,
  onSave: (updated: Profile) => Promise<void> | void,
  onCancel: () => void
): HTMLElement {
  const reviewItems = buildReviewItems(parsed, profile);

  const container = document.createElement("div");
  container.className = "resume-review-container stack";

  const head = document.createElement("div");
  head.className = "dialog-head";
  const title = document.createElement("h3");
  title.textContent = "Review suggestions from resume";
  head.append(title);
  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "icon-btn";
  closeBtn.setAttribute("aria-label", "Close");
  closeBtn.textContent = "✕";
  closeBtn.onclick = onCancel;
  head.append(closeBtn);
  container.append(head);

  const body = document.createElement("div");
  body.className = "dialog-body stack";
  body.style.padding = "16px";
  body.style.maxHeight = "70vh";
  body.style.overflowY = "auto";

  let expYearsInput: HTMLInputElement | null = null;
  if (parsed.questions.length > 0) {
    const qBox = document.createElement("div");
    qBox.className = "card warn";
    qBox.style.padding = "12px";
    qBox.style.marginBottom = "12px";
    for (const q of parsed.questions) {
      const p = document.createElement("p");
      p.className = "hint";
      p.textContent = q;
      qBox.append(p);
    }
    const label = document.createElement("label");
    label.className = "form-row";
    label.textContent = "Total experience years:";
    expYearsInput = document.createElement("input");
    expYearsInput.type = "text";
    expYearsInput.className = "input";
    expYearsInput.placeholder = "e.g. 3";
    label.append(expYearsInput);
    qBox.append(label);
    body.append(qBox);
  }

  // Group items by section
  const sections = new Map<string, ReviewItem[]>();
  for (const item of reviewItems) {
    const sec = item.suggestion.section || "Other";
    if (!sections.has(sec)) sections.set(sec, []);
    sections.get(sec)!.push(item);
  }

  for (const [sectionName, items] of sections) {
    const secCard = document.createElement("div");
    secCard.className = "card";
    secCard.style.padding = "12px";
    secCard.style.marginBottom = "8px";

    const secTitle = document.createElement("h4");
    secTitle.style.margin = "0 0 8px 0";
    secTitle.textContent = sectionName;
    secCard.append(secTitle);

    for (const item of items) {
      const row = document.createElement("div");
      row.className = "resume-review-item";
      row.style.display = "flex";
      row.style.alignItems = "flex-start";
      row.style.gap = "10px";
      row.style.padding = "6px 0";
      row.style.borderBottom = "1px solid var(--line)";

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = item.checked;
      cb.onchange = () => {
        item.checked = cb.checked;
      };

      const info = document.createElement("div");
      info.style.flex = "1";

      const top = document.createElement("div");
      top.style.display = "flex";
      top.style.alignItems = "center";
      top.style.gap = "8px";

      const label = document.createElement("strong");
      label.textContent = item.suggestion.label;
      top.append(label);

      const badge = document.createElement("span");
      badge.className = `chip ${item.suggestion.confidence === "high" ? "ok" : item.suggestion.confidence === "medium" ? "warn" : "bad"}`;
      badge.style.fontSize = "10px";
      badge.textContent = item.suggestion.confidence === "high" ? "Sure" : "Not sure";
      top.append(badge);

      if (item.suggestion.computed) {
        const compBadge = document.createElement("span");
        compBadge.className = "chip";
        compBadge.style.fontSize = "10px";
        compBadge.textContent = "computed";
        top.append(compBadge);
      }

      info.append(top);

      const val = document.createElement("div");
      val.className = "value";
      val.style.fontSize = "12px";
      val.style.marginTop = "2px";
      val.textContent = item.suggestion.value;
      info.append(val);

      if (item.hasExistingValue) {
        const warn = document.createElement("div");
        warn.className = "hint warn";
        warn.style.fontSize = "11px";
        warn.style.marginTop = "4px";
        warn.style.color = "var(--warn, #f5b84b)";
        warn.textContent = `⚠️ Overwrites existing value: Current: "${item.currentValue}" → New: "${item.suggestion.value}"`;
        info.append(warn);
      } else if (item.suggestion.note) {
        const note = document.createElement("div");
        note.className = "hint";
        note.style.fontSize = "11px";
        note.style.marginTop = "2px";
        note.textContent = item.suggestion.note;
        info.append(note);
      }

      row.append(cb);
      row.append(info);
      secCard.append(row);
    }

    body.append(secCard);
  }

  container.append(body);

  const foot = document.createElement("div");
  foot.className = "dialog-foot button-row";
  foot.style.display = "flex";
  foot.style.justifyContent = "flex-end";
  foot.style.gap = "8px";
  foot.style.padding = "12px 16px";
  foot.style.borderTop = "1px solid var(--line)";

  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.className = "btn btn-ghost btn-sm";
  cancelBtn.textContent = "Cancel";
  cancelBtn.onclick = onCancel;

  const saveBtn = document.createElement("button");
  saveBtn.type = "button";
  saveBtn.className = "btn btn-primary btn-sm";
  saveBtn.textContent = "Save selected";
  saveBtn.onclick = async () => {
    saveBtn.disabled = true;
    const customAns = expYearsInput?.value?.trim()
      ? { experienceYears: expYearsInput.value.trim() }
      : undefined;
    const updated = applyReviewItemsToProfile(profile, reviewItems, customAns);
    await onSave(updated);
  };

  foot.append(cancelBtn);
  foot.append(saveBtn);
  container.append(foot);

  return container;
}

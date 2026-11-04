import type { LanguageEntry, Profile, ProfileKey, WorkEntry } from "../shared/types";
import { validateProfile } from "../shared/profile-validate";
import { EDUCATION_STATUS_OPTIONS } from "../shared/quick-answers";
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

/** A suggestion that fails the same checks as typed input ("https://M.TECH", a state not in the country): never offered. */
export function suggestionProblem(suggestion: Suggestion, parsed: ParsedResume, profile: Profile): string | undefined {
  if (suggestion.field === "workHistory" || suggestion.field === "languages" || suggestion.field === "educationStatus") return undefined;
  const country = parsed.suggestions.find((s) => s.field === "country")?.value ?? profile.country ?? "";
  const issues = validateProfile({ country, [suggestion.field]: suggestion.value });
  return issues.find((i) => i.key === suggestion.field && i.level === "error")?.text;
}

/** What the resume suggests, minus values that fail the Profile checks and values the profile already has. Nothing
 * is ticked: the user picks every value that goes into the profile. */
export function buildReviewItems(parsed: ParsedResume, profile: Profile): ReviewItem[] {
  return parsed.suggestions.filter((suggestion) => !suggestionProblem(suggestion, parsed, profile)).map((suggestion) => {
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
    } else if (suggestion.field === "educationStatus") {
      const status = profile.educationStatus;
      if (status) {
        hasExistingValue = true;
        currentValue = EDUCATION_STATUS_OPTIONS[status];
      }
    } else {
      const val = profile[suggestion.field as ProfileKey];
      if (val !== undefined && String(val).trim().length > 0) {
        hasExistingValue = true;
        currentValue = String(val).trim();
      }
    }

    // Nothing is pre-ticked (beta 1 ticked confident values for empty fields, which imported them on one click).
    const preChecked = false;

    return {
      suggestion,
      hasExistingValue,
      currentValue,
      preChecked,
      checked: preChecked,
    };
  }).filter((item) => !(item.hasExistingValue && item.currentValue.trim().toLowerCase() === item.suggestion.value.trim().toLowerCase()));
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
      // A language is imported only with a level the resume states or the user chose in the review (never a guess).
      if (!suggestion.language.proficiency) continue;
      const entry: LanguageEntry = {
        language: suggestion.language.language,
        proficiency: suggestion.language.proficiency,
      };
      if (idx >= 0) {
        updated.languages[idx] = entry;
      } else {
        updated.languages.push(entry);
      }
    } else if (suggestion.field === "skills") {
      // Added to Key skills (names only). Years are never guessed: the Skills inventory is the user's to fill.
      const have = (updated.skills ?? "").split(",").map((x) => x.trim()).filter(Boolean);
      for (const sk of suggestion.value.split(",").map((x) => x.trim()).filter(Boolean)) {
        if (!have.some((h) => h.toLowerCase() === sk.toLowerCase())) have.push(sk);
      }
      updated.skills = have.join(", ");
    } else if (suggestion.field === "educationStatus") {
      updated.educationStatus = /pursuing/i.test(suggestion.value) ? "pursuing" : /completed/i.test(suggestion.value) ? "completed" : updated.educationStatus;
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
  title.textContent = "Choose what to import from your resume";
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

  const intro = document.createElement("p");
  intro.className = "hint";
  intro.textContent = reviewItems.length
    ? "Nothing is imported until you tick it. Each value shows the resume line it came from. Values that failed ApplyAgent's checks (for example a degree read as a website) are left out."
    : "Your resume has nothing new for your profile: every value it has is already there, or did not pass ApplyAgent's checks.";
  body.append(intro);
  const tickAll = document.createElement("button");
  tickAll.type = "button";
  tickAll.className = "btn btn-ghost btn-sm";
  tickAll.id = "resume-tick-empty";
  tickAll.textContent = "Tick everything for empty fields";
  const boxes: Array<{ item: ReviewItem; cb: HTMLInputElement }> = [];
  tickAll.onclick = () => {
    for (const { item, cb } of boxes) if (!item.hasExistingValue && !cb.disabled) { cb.checked = true; item.checked = true; }
  };
  if (reviewItems.some((i) => !i.hasExistingValue)) body.append(tickAll);

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
      cb.setAttribute("aria-label", `Import ${item.suggestion.label}`);
      cb.onchange = () => {
        item.checked = cb.checked;
      };
      boxes.push({ item, cb });

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

      if (item.suggestion.source) {
        const from = document.createElement("div");
        from.className = "hint resume-source";
        from.style.fontSize = "11px";
        from.style.marginTop = "2px";
        from.textContent = `From your resume: "${item.suggestion.source.slice(0, 160)}${item.suggestion.source.length > 160 ? "…" : ""}"`;
        info.append(from);
      }

      // A language without a level in the resume: the user picks one, or it is not imported.
      const lang = item.suggestion.field === "languages" ? item.suggestion.language : undefined;
      if (lang && !lang.proficiency) {
        const pick = document.createElement("select");
        pick.className = "input resume-lang-level";
        pick.setAttribute("aria-label", `How well you speak ${lang.language}`);
        for (const [value, text] of [["", "Choose level to import…"], ["Native", "Native"], ["Fluent", "Fluent"], ["Professional", "Advanced (professional)"],
          ["Conversational", "Intermediate (conversational)"], ["Basic", "Beginner (basic)"]] as const) {
          const o = document.createElement("option");
          o.value = value;
          o.textContent = text;
          pick.append(o);
        }
        cb.disabled = true;
        pick.onchange = () => {
          lang.proficiency = (pick.value || undefined) as LanguageEntry["proficiency"] | undefined;
          cb.disabled = !pick.value;
          if (!pick.value) { cb.checked = false; item.checked = false; }
        };
        info.append(pick);
      }

      if (item.hasExistingValue) {
        const warn = document.createElement("div");
        warn.className = "hint warn";
        warn.style.fontSize = "11px";
        warn.style.marginTop = "4px";
        warn.style.color = "var(--warn, #f5b84b)";
        warn.textContent = `Replaces what you have now: "${item.currentValue}"`;
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
  saveBtn.textContent = "Import ticked values";
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

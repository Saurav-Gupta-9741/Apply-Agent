import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  buildReviewItems,
  applyReviewItemsToProfile,
  createResumeReviewElement,
  type ReviewItem,
} from "../src/sidepanel/resume-import";
import { parseResume, type ParsedResume } from "../src/shared/resume-parse";
import { EMPTY_PROFILE } from "../src/shared/storage";
import type { Profile } from "../src/shared/types";

describe("Resume Import Component & Review Flow", () => {
  let sampleProfile: Profile;

  beforeEach(() => {
    sampleProfile = {
      ...EMPTY_PROFILE,
      firstName: "ExistingFirst",
      lastName: "ExistingLast",
      phone: "+1 555-0199",
      location: "San Francisco",
    };
    document.body.innerHTML = "";
  });

  it("ticks nothing (the user picks every value) and marks values the profile already has", () => {
    const rawResume = `
Jane Doe
jane.doe@example.com
(555) 234-5678
Seattle, WA

EXPERIENCE
Senior Software Engineer | Google | Seattle, WA
Jan 2021 - Present
• Built cloud services

SKILLS
Python, TypeScript, Docker
    `.trim();

    const parsed = parseResume(rawResume);
    const items = buildReviewItems(parsed, sampleProfile);

    // email: profile has empty email, confidence is high -> still not ticked (tester report 2: import needs consent)
    const emailItem = items.find((i) => i.suggestion.field === "email");
    expect(emailItem).toBeDefined();
    expect(emailItem!.hasExistingValue).toBe(false);
    expect(emailItem!.suggestion.confidence).toBe("high");
    expect(emailItem!.preChecked).toBe(false);
    expect(emailItem!.checked).toBe(false);

    // phone: profile already has "+1 555-0199" -> must NOT be pre-ticked
    const phoneItem = items.find((i) => i.suggestion.field === "phone");
    expect(phoneItem).toBeDefined();
    expect(phoneItem!.hasExistingValue).toBe(true);
    expect(phoneItem!.currentValue).toBe("+1 555-0199");
    expect(phoneItem!.preChecked).toBe(false);
    expect(phoneItem!.checked).toBe(false);

    // firstName: profile has "ExistingFirst" -> must NOT be pre-ticked
    const firstNameItem = items.find((i) => i.suggestion.field === "firstName");
    expect(firstNameItem).toBeDefined();
    expect(firstNameItem!.hasExistingValue).toBe(true);
    expect(firstNameItem!.preChecked).toBe(false);
    expect(firstNameItem!.checked).toBe(false);
  });

  it("applies accepted suggestions without overwriting existing unticked values", () => {
    const rawResume = `
Jane Doe
jane.doe@example.com
(555) 234-5678
Seattle, WA

EXPERIENCE
Senior Software Engineer | Google | Seattle, WA
Jan 2021 - Present
• Built cloud services

SKILLS
Python, TypeScript, Docker
    `.trim();

    const parsed = parseResume(rawResume);
    const items = buildReviewItems(parsed, sampleProfile);

    // User accepts exactly 3 fields: email, currentCompany, skills
    // and explicitly leaves firstName, lastName, phone, location UNCHECKED
    for (const item of items) {
      if (
        item.suggestion.field === "email" ||
        item.suggestion.field === "currentCompany" ||
        item.suggestion.field === "skills"
      ) {
        item.checked = true;
      } else {
        item.checked = false;
      }
    }

    const updated = applyReviewItemsToProfile(sampleProfile, items);

    // 3 accepted fields are updated
    expect(updated.email).toBe("jane.doe@example.com");
    expect(updated.currentCompany).toBe("Google");
    expect(updated.skills).toContain("Python");

    // Existing fields were NOT overwritten
    expect(updated.firstName).toBe("ExistingFirst");
    expect(updated.lastName).toBe("ExistingLast");
    expect(updated.phone).toBe("+1 555-0199");
    expect(updated.location).toBe("San Francisco");
  });

  it("overwrites existing value only when user explicitly checks the box", () => {
    const rawResume = `
Jane Doe
jane.doe@example.com
(555) 234-5678
Seattle, WA
    `.trim();

    const parsed = parseResume(rawResume);
    const items = buildReviewItems(parsed, sampleProfile);

    const phoneItem = items.find((i) => i.suggestion.field === "phone")!;
    expect(phoneItem).toBeDefined();
    expect(phoneItem.checked).toBe(false);

    // User explicitly checks the phone overwrite box
    phoneItem.checked = true;

    const updated = applyReviewItemsToProfile(sampleProfile, items);
    expect(updated.phone).toBe("(555) 234-5678");
    expect(updated.firstName).toBe("ExistingFirst");
  });

  it("renders review UI with overwrite warnings and saves selected changes via callback", async () => {
    const rawResume = `
Jane Doe
jane.doe@example.com
(555) 234-5678
Seattle, WA

EXPERIENCE
Senior Software Engineer | Google | Seattle, WA
Jan 2021 - Present
• Built cloud services
    `.trim();

    const parsed = parseResume(rawResume);
    const onSave = vi.fn();
    const onCancel = vi.fn();

    const element = createResumeReviewElement(parsed, sampleProfile, onSave, onCancel);
    document.body.append(element);

    // Overwrite warnings should be rendered for existing profile fields (phone, name, location)
    const warnings = element.querySelectorAll(".hint.warn");
    expect(warnings.length).toBeGreaterThan(0);
    const phoneWarn = Array.from(warnings).find((w) => w.textContent?.includes("+1 555-0199"));
    expect(phoneWarn).toBeDefined();

    // Nothing is ticked until the user asks; "Tick everything for empty fields" ticks only empty ones
    const checkboxes = element.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    expect(checkboxes.length).toBeGreaterThan(0);
    expect(Array.from(checkboxes).some((c) => c.checked)).toBe(false);
    element.querySelector<HTMLButtonElement>("#resume-tick-empty")!.click();

    const saveBtn = Array.from(element.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Import ticked values"
    );
    expect(saveBtn).toBeDefined();
    saveBtn!.click();

    expect(onSave).toHaveBeenCalledTimes(1);
    const savedProfile: Profile = onSave.mock.calls[0]![0];

    // High confidence empty field was saved
    expect(savedProfile.email).toBe("jane.doe@example.com");

    // Existing phone field was NOT overwritten because it was unchecked
    expect(savedProfile.phone).toBe("+1 555-0199");
  });
});

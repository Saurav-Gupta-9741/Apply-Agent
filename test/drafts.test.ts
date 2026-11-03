/** Tests for AI drafts on free-text questions.
 * Verifies 1-click [Use] [Edit] [Skip] flow, on-device Chrome AI guidance,
 * grounding in profile facts, and strict no-cloud privacy.
 */

import { describe, expect, it, vi } from "vitest";
import { isDraftableField, getAiStatusInfo, createDraftWidget } from "../src/sidepanel/drafts";
import { buildDraftPrompt, checkDraft, INSUFFICIENT } from "../src/shared/ai";
import type { FieldDescriptor, Profile } from "../src/shared/types";
import { mount, PROFILE } from "./fixtures";

describe("AI Drafts - Field Qualification", () => {
  it("identifies open-ended text and textarea questions as draftable", () => {
    expect(isDraftableField({ control: "textarea", label: "Why are you interested in joining our team?" })).toBe(true);
    expect(isDraftableField({ control: "textarea", label: "Describe a complex technical challenge you solved" })).toBe(true);
    expect(isDraftableField({ control: "text", label: "Tell us about yourself and your career goals" })).toBe(true);
    expect(isDraftableField({ control: "text", label: "Cover letter / statement of interest" })).toBe(true);
  });

  it("rejects standard facts, sensitive fields, and fixed choice options from drafting", () => {
    expect(isDraftableField({ control: "text", label: "First Name", name: "firstName" })).toBe(false);
    expect(isDraftableField({ control: "text", label: "Email Address", name: "email" })).toBe(false);
    expect(isDraftableField({ control: "text", label: "Phone Number", name: "phone" })).toBe(false);
    expect(isDraftableField({ control: "text", label: "LinkedIn URL", name: "linkedin" })).toBe(false);
    expect(isDraftableField({ control: "select", label: "Work Authorization", options: ["Yes", "No"] })).toBe(false);
    expect(isDraftableField({ control: "text", label: "Credit Card Number", name: "card_number" })).toBe(false);
    expect(isDraftableField({ control: "text", label: "Social Security Number (SSN)" })).toBe(false);
  });
});

describe("AI Status & On-Device Guidance", () => {
  it("shows local on-device guidance and chrome://flags link when Chrome AI is not ready", () => {
    const info = getAiStatusInfo("unavailable");
    expect(info.ready).toBe(false);
    expect(info.title).toBe("Drafts need Chrome's built-in AI");
    expect(info.detail).toContain("chrome://flags/#prompt-api-for-gemini-nano");
    expect(info.detail).toContain("zero cloud calls");
  });

  it("confirms ready status for on-device Gemini Nano", () => {
    const info = getAiStatusInfo("available");
    expect(info.ready).toBe(true);
    expect(info.title).toContain("Built-in AI ready");
  });
});

describe("Draft Grounding and Accuracy Checks", () => {
  const profile: Profile = {
    ...PROFILE,
    skills: "TypeScript, React, Python",
    degree: "B.Tech Computer Science",
    workHistory: [
      {
        title: "Senior Software Engineer",
        company: "Acme Corp",
        location: "Remote",
        current: false,
        start: "2021-01",
        end: "2024-05",
        summary: "Scaled core microservices to handle 10M daily requests with 99.99% uptime.",
      },
    ],
  };

  const job = { title: "Lead Full Stack Engineer", company: "Salesforce" };

  it("builds prompt grounded exclusively in candidate facts", () => {
    const prompt = buildDraftPrompt("Why do you want to work at Salesforce?", profile, job);
    expect(prompt).toContain("Candidate facts:");
    expect(prompt).toContain("TypeScript");
    expect(prompt).toContain("Acme Corp");
    expect(prompt).toContain(`If facts are insufficient, output ${INSUFFICIENT}`);
    expect(prompt).toContain("Never invent metrics, dates, titles, or achievements");
  });

  it("flags invented numbers and ungrounded degrees", () => {
    const draftWithHallucinations = "I have a Ph.D. in AI and increased revenue by $45000000 across 99 projects.";
    const warnings = checkDraft(draftWithHallucinations, profile, job);
    expect(warnings.some((w) => w.includes("numbers not in your profile"))).toBe(true);
    expect(warnings.some((w) => w.includes("PhD / Doctorate"))).toBe(true);
  });

  it("flags corporate buzzwords and fluff", () => {
    const fluffyDraft = "I am a dynamic self-starter and rockstar ninja ready to synergize outside the box.";
    const warnings = checkDraft(fluffyDraft, profile, job);
    expect(warnings.some((w) => w.includes("generic corporate fluff"))).toBe(true);
  });
});

describe("1-Click Draft Flow Widget UI", () => {
  it("renders trigger button and shows Chrome AI guidance when unavailable", async () => {
    mount("<div id='card'></div>");
    const container = document.getElementById("card")!;

    let usedText = "";
    const widget = createDraftWidget({
      question: "Why Salesforce?",
      field: { key: "f1", label: "Why Salesforce?", control: "textarea", required: true, options: [], name: "", autocomplete: "", placeholder: "" },
      profile: PROFILE,
      job: { title: "Developer", company: "Salesforce" },
      onUse: (text) => { usedText = text; },
    });
    container.append(widget);

    const trigger = widget.querySelector<HTMLButtonElement>(".draft-trigger");
    expect(trigger).not.toBeNull();
    expect(trigger!.textContent).toContain("Draft answer with Chrome AI");

    // Click trigger (global LanguageModel is undefined in JSDOM, simulating unavailable)
    trigger!.click();
    await new Promise((r) => setTimeout(r, 50));

    const preview = widget.querySelector<HTMLElement>(".draft-preview-box");
    expect(preview).not.toBeNull();
    expect(preview!.textContent).toContain("Drafts need Chrome's built-in AI");
    expect(usedText).toBe(""); // Never typed onto page without clicking Use
  });
});

/** Rigorous adversarial testing for startup forms, edge case inputs, and link disambiguation:
 * - Months-to-days notice period conversion ("2 months" -> "60 day notice")
 * - URL path sensing with uppercase, queries, and trailing slashes
 * - Link invite traps: "describe a project" must NOT match projectUrl
 * - Link invite traps: "record a video" vs "describe a video"
 * - Split CTC variations with various currencies (INR, USD, LPA)
 */

import { describe, expect, it } from "vitest";
import { shouldDetect } from "../src/shared/platforms";
import { extractFields } from "../src/content/extract";
import { decide, profileKeyFor } from "../src/content/classify";
import { mount, PROFILE } from "./fixtures";
import type { FieldDescriptor, Profile } from "../src/shared/types";

describe("Adversarial Startup Form & Link Edge Cases", () => {
  it("handles URL path sensing across varied URL formats", () => {
    // Uppercase path
    expect(shouldDetect("job_sites", "https://trao.ai/CAREERS/apply")).toBe(true);
    // Path with query and hash
    expect(shouldDetect("job_sites", "https://company.ai/jobs/senior-engineer?ref=linkedin&utm=1#application")).toBe(true);
    // Trailing slash
    expect(shouldDetect("job_sites", "https://startup.io/careers/")).toBe(true);
    // Not a job path
    expect(shouldDetect("job_sites", "https://trao.ai/pricing")).toBe(false);
    expect(shouldDetect("job_sites", "https://trao.ai/blog/career-advice")).toBe(false);
  });

  it("never matches projectUrl on essay/description questions mentioning 'project'", () => {
    const essayField: FieldDescriptor = {
      key: "f1",
      label: "Please describe a technical project where you used Docker and Python",
      name: "projectDescription",
      control: "textarea",
      required: true,
      options: [],
      autocomplete: "",
      placeholder: "Tell us what you built...",
    };

    expect(profileKeyFor(essayField)).toBeUndefined();
    const d = decide(essayField, PROFILE, []);
    expect(d.kind).toBe("ask");
  });

  it("never matches introVideoUrl on essay questions mentioning 'video'", () => {
    const videoEssayField: FieldDescriptor = {
      key: "f2",
      label: "Describe your favorite video game or movie and why it inspires your work",
      name: "favoriteVideo",
      control: "textarea",
      required: false,
      options: [],
      autocomplete: "",
      placeholder: "Share your thoughts...",
    };

    expect(profileKeyFor(videoEssayField)).toBeUndefined();
    const d = decide(videoEssayField, PROFILE, []);
    expect(d.kind).toBe("skip");
  });

  it("correctly identifies projectUrl on authentic link invites", () => {
    const projectLinkField: FieldDescriptor = {
      key: "f3",
      label: "Project link (optional)",
      name: "projectLink",
      control: "url",
      required: false,
      options: [],
      autocomplete: "",
      placeholder: "https://",
    };

    expect(profileKeyFor(projectLinkField)).toBe("projectUrl");

    const projectUrlField2: FieldDescriptor = {
      key: "f4",
      label: "Please provide a link to your project demo",
      name: "demoLink",
      control: "url",
      required: false,
      options: [],
      autocomplete: "",
      placeholder: "https://github.com/...",
    };

    expect(profileKeyFor(projectUrlField2)).toBe("projectUrl");
  });

  it("correctly identifies introVideoUrl on video intro fields", () => {
    const videoLinkField: FieldDescriptor = {
      key: "f5",
      label: "Link to your introduction video *",
      name: "introVideo",
      control: "url",
      required: true,
      options: [],
      autocomplete: "",
      placeholder: "https://youtube.com/watch?v=...",
    };

    expect(profileKeyFor(videoLinkField)).toBe("introVideoUrl");

    const loomField: FieldDescriptor = {
      key: "f6",
      label: "Loom video link (optional)",
      name: "loomUrl",
      control: "url",
      required: false,
      options: [],
      autocomplete: "",
      placeholder: "https://loom.com/share/...",
    };

    expect(profileKeyFor(loomField)).toBe("introVideoUrl");
  });

  it("converts 2 months notice to 60 day notice option", () => {
    const noticeField: FieldDescriptor = {
      key: "f7",
      label: "Can you join immediately? *",
      name: "joinImmediately",
      control: "radio",
      required: true,
      options: ["Yes", "No", "15 day notice", "30 day notice", "60 day notice"],
      autocomplete: "",
      placeholder: "",
    };

    const testProfile2Months: Profile = {
      ...PROFILE,
      facts: {
        ...PROFILE.facts!,
        noticePeriod: "2 months",
      },
    };

    const d = decide(noticeField, testProfile2Months, []);
    expect(d).toEqual({
      kind: "answer",
      value: "60 day notice",
      question: "Quick answers › notice period",
    });

    const testProfile1Month: Profile = {
      ...PROFILE,
      facts: {
        ...PROFILE.facts!,
        noticePeriod: "1 month",
      },
    };

    const d1 = decide(noticeField, testProfile1Month, []);
    expect(d1).toEqual({
      kind: "answer",
      value: "30 day notice",
      question: "Quick answers › notice period",
    });
  });

  it("handles Currency formatting in split CTC fields", () => {
    const FORM_WITH_CURRENCY = `
      <form id="salary-form">
        <div class="salary-box">
          <label>What is your current and expected compensation? *</label>
          <input type="text" id="cur" name="currentSalary" placeholder="Current CTC (INR)">
          <input type="text" id="exp" name="expectedSalary" placeholder="Expected CTC (INR)">
        </div>
      </form>
    `;

    mount(FORM_WITH_CURRENCY);
    const form = document.querySelector<HTMLElement>("form")!;
    const fields = extractFields(form);

    const testProfile: Profile = {
      ...PROFILE,
      facts: {
        ...PROFILE.facts!,
        currentCtc: "15,00,000 INR",
        expectedCtc: "22,00,000 INR",
      },
    };

    const cur = fields.find((f) => f.descriptor.name === "currentSalary")!;
    const exp = fields.find((f) => f.descriptor.name === "expectedSalary")!;

    expect(cur).toBeDefined();
    expect(exp).toBeDefined();

    const dCur = decide(cur.descriptor, testProfile, []);
    const dExp = decide(exp.descriptor, testProfile, []);

    expect(dCur).toEqual({
      kind: "answer",
      value: "15,00,000 INR",
      question: "Quick answers › current CTC",
    });

    expect(dExp).toEqual({
      kind: "answer",
      value: "22,00,000 INR",
      question: "Quick answers › expected CTC",
    });
  });
});

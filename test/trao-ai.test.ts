/** Tests Trao.ai application form support:
 * - shouldDetect recognition of trao.ai/careers/... path
 * - extractFields: handles composite section headings and disambiguates Current CTC vs Expected CTC by placeholder
 * - decide: auto-fills Current CTC and Expected CTC with profile facts
 * - decide: handles tiered notice period ("15 day notice") and "join immediately"
 * - decide: auto-fills introVideoUrl and projectUrl
 * - buildDraftPrompt: provides rich candidate context (work history, project, portfolio) for essay questions
 */

import { describe, expect, it } from "vitest";
import { shouldDetect } from "../src/shared/platforms";
import { extractFields } from "../src/content/extract";
import { decide } from "../src/content/classify";
import { buildDraftPrompt } from "../src/shared/ai";
import { mount, PROFILE } from "./fixtures";
import type { Profile } from "../src/shared/types";

const TRAO_FORM_HTML = `
<div class="application-form-container">
  <h1>Software Engineer Application</h1>
  <form id="application-form" action="/careers/software-engineer/apply" method="POST">
    <!-- Section: How you think -->
    <div class="form-section" id="section-how-you-think">
      <h2>How you think</h2>
      <p class="section-desc">Help us understand what drives you.</p>

      <div class="form-group">
        <label for="proud-project">What's the project you're most proud of, and why? (Please attach or link it) *</label>
        <span class="word-count">0/300 words</span>
        <textarea id="proud-project" name="proudProject" required placeholder="Tell us what you built, your role, and what made the project meaningful to you."></textarea>
      </div>

      <div class="form-group">
        <label for="project-link">Project link (optional)</label>
        <input type="url" id="project-link" name="projectLink" placeholder="https://">
      </div>

      <div class="form-group">
        <label for="free-time-learning">What do you spend your free time learning or thinking about? *</label>
        <span class="word-count">0/200 words</span>
        <textarea id="free-time-learning" name="freeTimeLearning" required placeholder="Tell us what you're curious about outside of your day-to-day work."></textarea>
      </div>

      <div class="form-group">
        <label for="admire-entity">Who is a person or company you deeply admire, and why? *</label>
        <span class="word-count">0/200 words</span>
        <textarea id="admire-entity" name="admireEntity" required placeholder="Tell us who they are and what you admire about them."></textarea>
      </div>

      <div class="form-group">
        <label for="world-class">If you could become world-class at one thing, what would it be? *</label>
        <span class="word-count">0/200 words</span>
        <textarea id="world-class" name="worldClass" required placeholder="One thing. Tell us why."></textarea>
      </div>

      <div class="form-group">
        <label for="controversial-opinion">What's your most controversial opinion? *</label>
        <span class="word-count">0/200 words</span>
        <textarea id="controversial-opinion" name="controversialOpinion" required placeholder="Share an opinion you hold strongly..."></textarea>
      </div>
    </div>

    <!-- Section: The practical stuff -->
    <div class="form-section" id="section-practical">
      <h2>The practical stuff</h2>
      <p class="section-desc">A few details to help us move forward.</p>

      <!-- Compound CTC Question -->
      <div class="form-group ctc-group">
        <div class="question-header">What is your current and expected CTC? *</div>
        <div class="subtext">Annual CTC in INR</div>
        <div class="ctc-inputs-row">
          <input type="text" id="current-ctc" name="currentCtc" placeholder="Current CTC" required>
          <input type="text" id="expected-ctc" name="expectedCtc" placeholder="Expected CTC" required>
        </div>
      </div>

      <!-- Schedule Question -->
      <div class="form-group schedule-group">
        <div class="question-header">Are you comfortable with 6 days/week, 9 hrs/day, full remote role? *</div>
        <div class="radio-options">
          <label><input type="radio" name="scheduleComfort" value="Yes"> Yes</label>
          <label><input type="radio" name="scheduleComfort" value="No"> No</label>
          <label><input type="radio" name="scheduleComfort" value="Maybe"> Maybe</label>
        </div>
      </div>

      <!-- Immediate Joining Question with Tiered Options -->
      <div class="form-group joining-group">
        <div class="question-header">Can you join immediately? *</div>
        <div class="radio-options">
          <label><input type="radio" name="joinImmediately" value="Yes"> Yes</label>
          <label><input type="radio" name="joinImmediately" value="No"> No</label>
          <label><input type="radio" name="joinImmediately" value="7 day notice"> 7 day notice</label>
          <label><input type="radio" name="joinImmediately" value="15 day notice"> 15 day notice</label>
          <label><input type="radio" name="joinImmediately" value="30 day notice"> 30 day notice</label>
        </div>
      </div>
    </div>

    <!-- Section: Introduction video -->
    <div class="form-section" id="section-video">
      <h2>Introduction video</h2>
      <p class="section-desc">We would rather hear from you than read another cover letter.</p>
      <div class="form-group">
        <label for="intro-video">Link to your introduction video *</label>
        <input type="url" id="intro-video" name="introVideo" placeholder="https://youtube.com/watch?v=..." required>
        <span class="field-hint">Record a 2-3 minute introduction. YouTube (unlisted) or Google Drive both work.</span>
      </div>
    </div>

    <button type="submit" id="submit-btn" class="btn-submit">Submit Application</button>
  </form>
</div>
`;

describe("Trao.ai and modern startup forms support", () => {
  it("recognises trao.ai/careers/... URL path in job sites detection mode", () => {
    expect(shouldDetect("job_sites", "https://trao.ai/careers/software-engineer/apply")).toBe(true);
    expect(shouldDetect("job_sites", "https://startup.io/jobs/senior-engineer")).toBe(true);
    expect(shouldDetect("job_sites", "https://www.example.com/about")).toBe(false);
  });

  it("extracts and disambiguates Current CTC and Expected CTC inputs", () => {
    mount(TRAO_FORM_HTML);
    const form = document.querySelector<HTMLElement>("form")!;
    const fields = extractFields(form);

    const currentCtcField = fields.find((f) => f.descriptor.name === "currentCtc");
    const expectedCtcField = fields.find((f) => f.descriptor.name === "expectedCtc");

    expect(currentCtcField).toBeDefined();
    expect(expectedCtcField).toBeDefined();

    expect(currentCtcField!.descriptor.placeholder).toBe("Current CTC");
    expect(expectedCtcField!.descriptor.placeholder).toBe("Expected CTC");

    // Check that label contains placeholder disambiguation
    expect(currentCtcField!.descriptor.label).toMatch(/Current CTC/i);
    expect(expectedCtcField!.descriptor.label).toMatch(/Expected CTC/i);
  });

  it("auto-fills Current CTC and Expected CTC with 0 errors", () => {
    mount(TRAO_FORM_HTML);
    const form = document.querySelector<HTMLElement>("form")!;
    const fields = extractFields(form);

    const testProfile: Profile = {
      ...PROFILE,
      facts: {
        ...PROFILE.facts!,
        currentCtc: "18 LPA",
        expectedCtc: "25 LPA",
      },
    };

    const currentCtcField = fields.find((f) => f.descriptor.name === "currentCtc")!;
    const expectedCtcField = fields.find((f) => f.descriptor.name === "expectedCtc")!;

    const dCurrent = decide(currentCtcField.descriptor, testProfile, []);
    const dExpected = decide(expectedCtcField.descriptor, testProfile, []);

    expect(dCurrent).toEqual({
      kind: "answer",
      value: "18 LPA",
      question: "Quick answers › current CTC",
    });

    expect(dExpected).toEqual({
      kind: "answer",
      value: "25 LPA",
      question: "Quick answers › expected CTC",
    });
  });

  it("handles tiered notice period selection when candidate has 15 days notice", () => {
    mount(TRAO_FORM_HTML);
    const form = document.querySelector<HTMLElement>("form")!;
    const fields = extractFields(form);

    const joinField = fields.find((f) => f.descriptor.name === "joinImmediately")!;
    expect(joinField).toBeDefined();

    const testProfile15Days: Profile = {
      ...PROFILE,
      facts: {
        ...PROFILE.facts!,
        noticePeriod: "15 days",
      },
    };

    const decision15 = decide(joinField.descriptor, testProfile15Days, []);
    expect(decision15).toEqual({
      kind: "answer",
      value: "15 day notice",
      question: "Quick answers › notice period",
    });

    const testProfileImmediate: Profile = {
      ...PROFILE,
      facts: {
        ...PROFILE.facts!,
        noticePeriod: "Immediate",
      },
    };

    const decisionImmediate = decide(joinField.descriptor, testProfileImmediate, []);
    expect(decisionImmediate).toEqual({
      kind: "answer",
      value: "Yes",
      question: "Quick answers › start immediately",
    });
  });

  it("auto-fills introVideoUrl and projectUrl from profile", () => {
    mount(TRAO_FORM_HTML);
    const form = document.querySelector<HTMLElement>("form")!;
    const fields = extractFields(form);

    const testProfile: Profile = {
      ...PROFILE,
      introVideoUrl: "https://youtube.com/watch?v=my-pitch-video",
      projectUrl: "https://github.com/testuser/awesome-project",
    };

    const videoField = fields.find((f) => f.descriptor.name === "introVideo")!;
    const projectField = fields.find((f) => f.descriptor.name === "projectLink")!;

    expect(videoField).toBeDefined();
    expect(projectField).toBeDefined();

    const dVideo = decide(videoField.descriptor, testProfile, []);
    const dProject = decide(projectField.descriptor, testProfile, []);

    expect(dVideo).toEqual({
      kind: "profile",
      key: "introVideoUrl",
      value: "https://youtube.com/watch?v=my-pitch-video",
    });

    expect(dProject).toEqual({
      kind: "profile",
      key: "projectUrl",
      value: "https://github.com/testuser/awesome-project",
    });
  });

  it("buildDraftPrompt includes rich candidate work history and projects for essay questions", () => {
    const testProfile: Profile = {
      ...PROFILE,
      portfolio: "https://alex.dev",
      projectUrl: "https://github.com/alex/ai-agent",
      workHistory: [
        {
          title: "Staff Software Engineer",
          company: "CloudScale Inc",
          location: "Bengaluru",
          start: "2023-01",
          end: "",
          current: true,
          summary: "Architected distributed event-driven engine processing 50M daily events with 99.99% uptime.",
        },
      ],
    };

    const prompt = buildDraftPrompt(
      "What's the project you're most proud of, and why?",
      testProfile,
      { title: "Senior Software Engineer", company: "Trao.ai" },
    );

    expect(prompt).toContain("Staff Software Engineer at CloudScale Inc");
    expect(prompt).toContain("Architected distributed event-driven engine processing 50M daily events");
    expect(prompt).toContain("Portfolio: https://alex.dev");
    expect(prompt).toContain("Featured project: https://github.com/alex/ai-agent");
  });
});

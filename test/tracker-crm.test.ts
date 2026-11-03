// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  followUpsDue,
  nextFollowUp,
  trackerAnalytics,
  trackerEntries,
  withStage,
  type TrackerEntry,
} from "../src/sidepanel/tracker";
import {
  getAdjacentStage,
  groupEntriesByStage,
  handleKanbanKeyboard,
  renderKanbanBoard,
  renderKanbanCard,
} from "../src/sidepanel/kanban";
import {
  buildFollowUpEmailPrompt,
  buildInterviewPrepPrompt,
  generateFollowUpEmail,
  generateInterviewPrep,
  generateLocalStarPoints,
} from "../src/sidepanel/interview";
import type { ApplicationRecord, SavedJob } from "../src/shared/types";
import { PROFILE } from "./fixtures";

describe("Lane 6: Tracker CRM & Offline AI", () => {
  const MOCK_RECORDS: ApplicationRecord[] = [
    {
      id: "rec-1",
      url: "https://boards.greenhouse.io/figma/jobs/101",
      platform: "greenhouse",
      jobTitle: "Senior Systems Engineer",
      company: "Figma",
      status: "applied_confirmed",
      stage: "Applied",
      createdAt: "2026-10-01T10:00:00Z",
      submittedAt: "2026-10-01T10:00:00Z",
      followUpAt: "2026-10-08",
      location: "San Francisco, United States",
    },
    {
      id: "rec-2",
      url: "https://jobs.lever.co/spotify/202",
      platform: "lever",
      jobTitle: "Backend Engineer",
      company: "Spotify",
      status: "applied_confirmed",
      stage: "Interview",
      createdAt: "2026-10-05T12:00:00Z",
      submittedAt: "2026-10-05T12:00:00Z",
      respondedAt: "2026-10-10T12:00:00Z", // 5 days to response
      location: "Stockholm, Sweden",
    },
    {
      id: "rec-3",
      url: "https://jobs.ashbyhq.com/linear/303",
      platform: "ashby",
      jobTitle: "Product Engineer",
      company: "Linear",
      status: "applied_confirmed",
      stage: "Offer",
      createdAt: "2026-10-10T14:00:00Z",
      submittedAt: "2026-10-10T14:00:00Z",
      respondedAt: "2026-10-18T14:00:00Z", // 8 days to response
      location: "Remote, United States",
    },
  ];

  const MOCK_SAVED: SavedJob[] = [
    {
      id: "sav-1",
      url: "https://apply.workable.com/monzo/404",
      title: "Core Banking Engineer",
      company: "Monzo Bank",
      stage: "Saved",
      createdAt: "2026-10-12T09:00:00Z",
      followUpAt: "2026-10-15",
    },
  ];

  describe("1. Kanban Board & Accessibility", () => {
    it("groups applications and saved jobs into pipeline stages", () => {
      const entries = trackerEntries(MOCK_RECORDS, MOCK_SAVED);
      const grouped = groupEntriesByStage(entries);

      expect(grouped.Saved).toHaveLength(1);
      expect(grouped.Applied).toHaveLength(1);
      expect(grouped.Interview).toHaveLength(1);
      expect(grouped.Offer).toHaveLength(1);
      expect(grouped.Rejected).toHaveLength(0);
    });

    it("renders board with semantic ARIA roles and accessibility labels", () => {
      const entries = trackerEntries(MOCK_RECORDS, MOCK_SAVED);
      const html = renderKanbanBoard(entries);

      expect(html).toContain('role="application"');
      expect(html).toContain('role="region"');
      expect(html).toContain('role="list"');
      expect(html).toContain('role="listitem"');
      expect(html).toContain('aria-label="Job Application Pipeline"');
      expect(html).toContain("Figma");
      expect(html).toContain("Spotify");
    });

    it("handles keyboard navigation across adjacent stages", () => {
      expect(getAdjacentStage("Saved", "next")).toBe("Applied");
      expect(getAdjacentStage("Applied", "next")).toBe("Interview");
      expect(getAdjacentStage("Interview", "prev")).toBe("Applied");
      expect(getAdjacentStage("Saved", "prev")).toBeNull();
      expect(getAdjacentStage("Rejected", "next")).toBeNull();

      let prevented = false;
      const fakeEventLeft = {
        key: "ArrowLeft",
        preventDefault: () => {
          prevented = true;
        },
      };
      const prev = handleKanbanKeyboard(fakeEventLeft, "Interview");
      expect(prev).toBe("Applied");
      expect(prevented).toBe(true);
    });
  });

  describe("2. Reminders & Follow-Ups", () => {
    it("detects overdue and pending follow-ups correctly", () => {
      const entries = trackerEntries(MOCK_RECORDS, MOCK_SAVED);

      const dueOnOct10 = followUpsDue(entries, "2026-10-10");
      // rec-1 followUpAt is 2026-10-08 <= 2026-10-10 (due)
      // sav-1 followUpAt is 2026-10-15 > 2026-10-10 (not due yet)
      expect(dueOnOct10.some((e) => e.id === "rec-1")).toBe(true);
      expect(dueOnOct10.some((e) => e.id === "sav-1")).toBe(false);

      const next = nextFollowUp(entries, "2026-10-10");
      expect(next).toBe("2026-10-15");
    });
  });

  describe("3. Analytics Mathematics on Fixed Sample", () => {
    it("calculates response rate, time-to-reply, and breakdowns by ATS & country", () => {
      const entries = trackerEntries(MOCK_RECORDS, MOCK_SAVED);
      const fixedDate = new Date("2026-10-25T00:00:00Z");
      const stats = trackerAnalytics(entries, fixedDate);

      expect(stats.applied).toBe(3); // rec-1, rec-2, rec-3 (saved is not applied)
      expect(stats.responded).toBe(2); // rec-2 and rec-3
      expect(stats.responseRate).toBe(67); // 2 / 3 = 66.6% -> 67%
      expect(stats.medianDaysToResponse).toBe(6.5); // (5 + 8) / 2 = 6.5
      expect(stats.meanDaysToResponse).toBe(6.5);

      // ATS Breakdown
      expect(stats.byAts.length).toBeGreaterThanOrEqual(3);
      const gh = stats.byAts.find((a) => a.ats === "Greenhouse");
      expect(gh?.applied).toBe(1);
      expect(gh?.responded).toBe(0);

      const lever = stats.byAts.find((a) => a.ats === "Lever");
      expect(lever?.applied).toBe(1);
      expect(lever?.responded).toBe(1);
      expect(lever?.responseRate).toBe(100);

      // Country Breakdown
      const us = stats.byCountry.find((c) => c.country.includes("United States"));
      expect(us?.applied).toBe(2);
    });
  });

  describe("4. AI Interview Prep & Follow-Up Email", () => {
    const profile = {
      ...PROFILE,
      skills: "Python, Docker, Distributed Systems",
      currentCompany: "Acme Cloud",
      experienceYears: "5",
    };

    it("generates interview questions and STAR points grounded in candidate facts", async () => {
      const prep = await generateInterviewPrep(
        "Staff Backend Engineer",
        "Linear",
        "We need a backend engineer to design scalable web services.",
        profile
      );

      expect(prep.role).toBe("Staff Backend Engineer");
      expect(prep.company).toBe("Linear");
      expect(prep.likelyQuestions).toHaveLength(5);
      expect(prep.suggestedStarPoints).toHaveLength(2);
      expect(prep.suggestedStarPoints[0]!.situation).toContain("Acme Cloud");
      expect(prep.suggestedStarPoints[0]!.result).toContain("response times");
      expect(prep.promptForExternalAi).toContain("Linear");
    });

    it("generates follow-up email draft with external AI fallback prompt", () => {
      const draft = generateFollowUpEmail(
        "Senior Infrastructure Engineer",
        "Figma",
        "Interview",
        "Asha Sharma",
        "Sarah Jenkins"
      );

      expect(draft.subject).toContain("Figma");
      expect(draft.subject).toContain("Asha Sharma");
      expect(draft.body).toContain("Dear Sarah Jenkins,");
      expect(draft.body).toContain("Senior Infrastructure Engineer");
      expect(draft.promptForExternalAi).toContain("Guidelines:");
    });
  });
});

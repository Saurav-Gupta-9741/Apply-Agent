import { describe, expect, it } from "vitest";
import {
  STAGES, RESPONSE_STAGES, CLOSED_STAGES, localDay, companyFromUrl, trackerEntries, withStage,
  followUpsDue, nextFollowUp, trackerAnalytics, trackerCsv, parseTabTitle,
  type TrackerEntry,
} from "../src/sidepanel/tracker";
import {
  applicationKey, submittedThisMonth, usageState, trialToUnlock,
  UPGRADE_NUDGE_AT, TRIAL_DAYS, TRIAL_UNLOCK_ANSWERS,
} from "../src/shared/license";
import { meterView } from "../src/sidepanel/usage-meter";
import type { ApplicationRecord, SavedJob } from "../src/shared/types";

describe("Tracker CRM & Analytics", () => {
  it("includes all 7 standard stages in the CRM lifecycle", () => {
    expect(STAGES).toEqual(["Saved", "Applied", "Assessment", "Interview", "Offer", "Rejected", "Withdrawn"]);
    expect(RESPONSE_STAGES.has("Assessment")).toBe(true);
    expect(RESPONSE_STAGES.has("Interview")).toBe(true);
    expect(RESPONSE_STAGES.has("Offer")).toBe(true);
    expect(CLOSED_STAGES.has("Offer")).toBe(true);
    expect(CLOSED_STAGES.has("Rejected")).toBe(true);
    expect(CLOSED_STAGES.has("Withdrawn")).toBe(true);
  });

  it("handles backwards-compatible ApplicationRecord loading without optional CRM fields", () => {
    const legacyRecord: ApplicationRecord = {
      id: "legacy-123",
      url: "https://boards.greenhouse.io/acme/jobs/456",
      platform: "greenhouse",
      jobTitle: "Data Analyst",
      status: "applied_confirmed",
      createdAt: "2026-10-01T10:00:00.000Z",
    };

    const entries = trackerEntries([legacyRecord], []);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.kind).toBe("application");
    expect(entries[0]!.company).toBe("acme");
    expect(entries[0]!.stage).toBe("Applied");
    expect(entries[0]!.notes).toBe("");
    expect(entries[0]!.followUpAt).toBe("");
  });

  it("transitions stages and tracks response timestamps correctly", () => {
    const now = new Date("2026-10-15T12:00:00.000Z");
    const initial: SavedJob = {
      id: "job-1",
      url: "https://jobs.lever.co/stripe/dev",
      title: "Backend Engineer",
      company: "Stripe",
      createdAt: "2026-10-10T10:00:00.000Z",
      stage: "Saved",
    };

    const applied = withStage(initial, "Applied", now, true);
    expect(applied.stage).toBe("Applied");
    expect(applied.appliedAt).toBe(now.toISOString());
    expect(applied.stageChangedAt).toBe(now.toISOString());

    const interviewDate = new Date("2026-10-20T14:00:00.000Z");
    const interviewed = withStage(applied, "Interview", interviewDate, false);
    expect(interviewed.stage).toBe("Interview");
    expect(interviewed.respondedAt).toBe(interviewDate.toISOString());
  });

  it("identifies follow-ups due today or earlier for open stages, ignoring closed stages", () => {
    const entries: TrackerEntry[] = [
      {
        kind: "application",
        id: "1",
        url: "https://jobs.lever.co/acme/1",
        title: "SWE",
        company: "Acme",
        stage: "Applied",
        notes: "",
        followUpAt: "2026-10-15",
        createdAt: "2026-10-01T00:00:00Z",
      },
      {
        kind: "application",
        id: "2",
        url: "https://jobs.lever.co/beta/2",
        title: "Product Manager",
        company: "Beta",
        stage: "Rejected", // Closed: should not flag follow-up even if date passed
        notes: "",
        followUpAt: "2026-10-10",
        createdAt: "2026-10-01T00:00:00Z",
      },
      {
        kind: "saved",
        id: "3",
        url: "https://jobs.lever.co/gamma/3",
        title: "Designer",
        company: "Gamma",
        stage: "Saved",
        notes: "",
        followUpAt: "2026-10-25", // Future
        createdAt: "2026-10-01T00:00:00Z",
      },
    ];

    const due = followUpsDue(entries, "2026-10-15");
    expect(due).toHaveLength(1);
    expect(due[0]!.id).toBe("1");

    const next = nextFollowUp(entries, "2026-10-15");
    expect(next).toBe("2026-10-25");
  });

  it("calculates accurate tracker analytics across weekly buckets and response metrics", () => {
    const now = new Date("2026-11-01T12:00:00.000Z");
    const entries: TrackerEntry[] = [
      {
        kind: "application",
        id: "app-1",
        url: "https://greenhouse.io/co1/job",
        title: "Role 1",
        company: "Co1",
        stage: "Interview",
        notes: "",
        followUpAt: "",
        createdAt: "2026-10-20T10:00:00.000Z",
        appliedAt: "2026-10-20T10:00:00.000Z",
        respondedAt: "2026-10-25T10:00:00.000Z", // 5 days
      },
      {
        kind: "application",
        id: "app-2",
        url: "https://greenhouse.io/co2/job",
        title: "Role 2",
        company: "Co2",
        stage: "Applied",
        notes: "",
        followUpAt: "",
        createdAt: "2026-10-28T10:00:00.000Z",
        appliedAt: "2026-10-28T10:00:00.000Z",
      },
    ];

    const analytics = trackerAnalytics(entries, now);
    expect(analytics.weeks).toHaveLength(8);
    expect(analytics.applied).toBe(2);
    expect(analytics.responded).toBe(1);
    expect(analytics.responseRate).toBe(50);
    expect(analytics.medianDaysToResponse).toBe(5);
  });

  it("exports properly escaped CSV with all core metadata", () => {
    const entries: TrackerEntry[] = [
      {
        kind: "application",
        id: "1",
        url: "https://example.com/job",
        title: "Senior SWE, Infrastructure",
        company: "Acme, Inc.",
        stage: "Applied",
        notes: "Met recruiter at conference.\nScheduled follow-up.",
        followUpAt: "2026-11-05",
        createdAt: "2026-11-01T00:00:00.000Z",
        appliedAt: "2026-11-01T00:00:00.000Z",
      },
    ];

    const csv = trackerCsv(entries);
    expect(csv).toContain("url,title,company,stage,status,applied,responded,follow_up,notes,created");
    expect(csv).toContain('"Acme, Inc."');
    expect(csv).toContain('"Senior SWE, Infrastructure"');
    expect(csv).toContain("Applied");
    expect(csv).toContain("2026-11-05");
  });

  it("parses tab titles cleanly from external sites without scraping page contents", () => {
    // LinkedIn format
    const li = parseTabTitle("(2) Stripe hiring Staff Software Engineer in San Francisco, CA | LinkedIn", "https://linkedin.com/jobs/view/123");
    expect(li.company).toBe("Stripe");
    expect(li.title).toBe("Staff Software Engineer");

    // Standard "Job at Company" format
    const lev = parseTabTitle("Senior Backend Engineer - Job at Figma | Lever", "https://jobs.lever.co/figma/abc");
    expect(lev.company).toBe("Figma");
    expect(lev.title).toBe("Senior Backend Engineer");

    // "Title at Company" format
    const gh = parseTabTitle("Product Designer at Datadog", "https://boards.greenhouse.io/datadog/xyz");
    expect(gh.company).toBe("Datadog");
    expect(gh.title).toBe("Product Designer");
  });
});

describe("Free Tier Usage Meter & Pro Trial", () => {
  it("does not charge a second fill when rerunning or resubmitting the same application", () => {
    const now = new Date("2026-11-01T15:00:00.000Z");
    const applications: ApplicationRecord[] = [
      {
        id: "app-1",
        url: "https://boards.greenhouse.io/airbnb/jobs/100?gh_src=feed",
        platform: "greenhouse",
        jobTitle: "Software Engineer",
        status: "applied_confirmed",
        createdAt: "2026-11-01T10:00:00.000Z",
      },
      {
        id: "app-2",
        // Same application URL with different tracking query or trailing slash
        url: "https://boards.greenhouse.io/airbnb/jobs/100/",
        platform: "greenhouse",
        jobTitle: "Software Engineer",
        status: "applied_confirmed",
        createdAt: "2026-11-01T12:00:00.000Z",
      },
      {
        id: "app-3",
        url: "https://jobs.lever.co/stripe/200",
        platform: "lever",
        jobTitle: "Data Scientist",
        status: "applied_confirmed",
        createdAt: "2026-11-01T14:00:00.000Z",
      },
    ];

    expect(submittedThisMonth(applications, now)).toBe(2);
  });

  it("transitions usage states between ok, nudge (at 15), and limit (at 20)", () => {
    const now = new Date("2026-11-01T15:00:00.000Z");
    const makeApps = (count: number): ApplicationRecord[] =>
      Array.from({ length: count }, (_, i) => ({
        id: `app-${i}`,
        url: `https://company${i}.com/job`,
        platform: "custom",
        jobTitle: `Role ${i}`,
        status: "applied_confirmed",
        createdAt: now.toISOString(),
      }));

    expect(usageState(makeApps(5), now).level).toBe("ok");
    expect(usageState(makeApps(UPGRADE_NUDGE_AT), now).level).toBe("nudge");
    expect(usageState(makeApps(20), now).level).toBe("limit");
  });

  it("unlocks a one-time 7-day Pro trial when 10 saved answers are reached", () => {
    const now = new Date("2026-11-01T12:00:00.000Z");

    // Under 10 answers -> no trial unlock
    expect(trialToUnlock(null, 9, now)).toBeNull();

    // 10 answers reached -> unlocks 7-day trial
    const trial = trialToUnlock(null, TRIAL_UNLOCK_ANSWERS, now);
    expect(trial).not.toBeNull();
    expect(trial!.startedAt).toBe(now.toISOString());
    const expectedEnd = new Date(now.getTime() + TRIAL_DAYS * 86_400_000).toISOString();
    expect(trial!.endsAt).toBe(expectedEnd);

    // Existing trial -> never unlocks twice
    expect(trialToUnlock(trial, 15, now)).toBeNull();
  });

  it("renders truthful meter views with correct prompts and limits", () => {
    const now = new Date("2026-11-01T12:00:00.000Z");
    const apps: ApplicationRecord[] = Array.from({ length: 15 }, (_, i) => ({
      id: `app-${i}`,
      url: `https://test${i}.com/job`,
      platform: "test",
      jobTitle: `Job ${i}`,
      status: "applied_confirmed",
      createdAt: now.toISOString(),
    }));

    const view = meterView(null, apps, null, 5, now);
    expect(view.hidden).toBe(false);
    expect(view.text).toBe("15 of 20 free fills used this month");
    expect(view.level).toBe("nudge");
    expect(view.prompt).toContain("Only 5 free fills left this month");
    expect(view.trialHint).toBe("Save 5 more answers to unlock a free 7-day Pro trial (once).");
  });
});

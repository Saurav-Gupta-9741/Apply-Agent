// @vitest-environment node
import { describe, expect, it } from "vitest";
import { migrateStorage } from "../src/shared/migration";

describe("L7: Storage Upgrades & Backward-Compatibility", () => {
  it("migrates v1.0 (main) legacy storage format without data loss", () => {
    const v1Data = {
      profile: {
        firstName: "Asha",
        lastName: "Verma",
        email: "asha@example.com",
        phone: "+91 98765 43210",
        location: "Pune, India",
        targetRoles: "Data Analyst, BI Engineer",
        skills: "SQL, Python, Tableau",
      },
      answers: [
        { question: "What is your notice period?", answer: "30 days" },
        { question: "Are you willing to relocate?", value: "No" },
      ],
      applications: [
        {
          company: "Acme Corp",
          jobTitle: "Data Analyst",
          url: "https://acme.com/jobs/1",
          status: "applied",
          appliedAt: "2026-05-10T12:00:00Z",
        },
      ],
      settings: {
        autoOpen: true,
      },
      licenceKey: "PRO-12345-VALID",
    };

    const { migrated, version, upgradedKeys } = migrateStorage(v1Data);

    expect(version).toBe("v1.0");
    expect(upgradedKeys).toContain("candidateProfiles");
    expect(upgradedKeys).toContain("profile");
    expect(upgradedKeys).toContain("answers");
    expect(upgradedKeys).toContain("applications");

    // Profile checks
    expect(migrated.profile?.firstName).toBe("Asha");
    expect(migrated.profile?.lastName).toBe("Verma");
    expect(migrated.profile?.email).toBe("asha@example.com");
    expect(migrated.profile?.skillsComplete).toBe(false);
    expect(migrated.candidateProfiles).toHaveLength(1);
    expect(migrated.candidateProfiles![0]!.name).toBe("Data Analyst");

    // Answers checks
    expect(migrated.answers).toHaveLength(2);
    expect(migrated.answers![0]!.question).toBe("What is your notice period?");
    expect(migrated.answers![0]!.answer).toBe("30 days");
    expect(migrated.answers![1]!.answer).toBe("No"); // converted from legacy .value

    // Applications checks
    expect(migrated.applications).toHaveLength(1);
    expect(migrated.applications![0]!.company).toBe("Acme Corp");
    expect(migrated.applications![0]!.stage).toBe("Applied");
    expect(migrated.applications![0]!.notes).toBe("");

    // Settings & licence check
    expect(migrated.licenceKey).toBe("PRO-12345-VALID");
    expect(migrated.pacing?.safePacing).toBe(true);
  });

  it("migrates Phase 3 storage format cleanly without data loss", () => {
    const phase3Data = {
      candidateProfiles: [
        {
          id: "p_1",
          name: "Senior SWE",
          targetRole: "Full Stack Engineer",
          profile: {
            firstName: "Rajesh",
            lastName: "Kumar",
            email: "rajesh@example.com",
            location: "Bangalore",
          },
          createdAt: "2026-10-20T10:00:00Z",
          updatedAt: "2026-10-20T10:00:00Z",
        },
      ],
      activeProfileId: "p_1",
      profile: {
        firstName: "Rajesh",
        lastName: "Kumar",
        email: "rajesh@example.com",
      },
      answers: [
        { question: "Notice period", answer: "60 days", topic: "notice_period" },
      ],
      applications: [
        {
          id: "app_101",
          company: "Stripe",
          jobTitle: "Staff Engineer",
          url: "https://stripe.com/jobs/101",
          status: "applied",
          appliedAt: "2026-10-22T14:30:00Z",
        },
      ],
      settings: {
        autoOpen: true,
        dailyApplyCap: 30,
      },
    };

    const { migrated, version } = migrateStorage(phase3Data as any);

    expect(version).toBe("phase3");
    expect(migrated.candidateProfiles).toHaveLength(1);
    expect(migrated.candidateProfiles![0]!.name).toBe("Senior SWE");
    expect(migrated.profile?.firstName).toBe("Rajesh");
    expect(migrated.answers![0]!.topic).toBe("notice_period");
    expect(migrated.applications![0]!.stage).toBe("Applied");
    expect(migrated.pacing?.safePacing).toBe(true);
    expect(migrated.pacing?.dailyApplyCap).toBe(30);
  });
});

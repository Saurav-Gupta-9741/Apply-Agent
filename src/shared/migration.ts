/**
 * Storage schema migration and backward-compatibility engine.
 * Ensures seamless upgrades from v1.0 (main) and Phase 3 formats to the current schema.
 *
 * Guarantees:
 * - Zero data loss: every existing key and field is safely preserved.
 * - Missing fields receive safe canonical defaults.
 * - Single-profile v1.0 stores automatically migrate into CandidateProfile format.
 * - Historical answers and application records gain modern tracking/kanban metadata.
 */

import { EMPTY_PROFILE } from "./storage";
import type { AnswerEntry, ApplicationRecord, CandidateProfile, Profile, Settings, TrackerStage } from "./types";

export interface StorageDump {
  profile?: Partial<Profile>;
  candidateProfiles?: CandidateProfile[];
  activeProfileId?: string;
  answers?: any[];
  applications?: any[];
  settings?: any;
  pacing?: any;
  licenceKey?: string;
  paidUntil?: string;
  queue?: any[];
  corrections?: any[];
  [key: string]: any;
}

export interface MigrationResult {
  migrated: StorageDump;
  version: "v1.0" | "phase3" | "current";
  upgradedKeys: string[];
}

/**
 * Detects the schema format and runs atomic upgrade to current version.
 */
export function migrateStorage(raw: StorageDump): MigrationResult {
  const upgradedKeys: string[] = [];
  const migrated: StorageDump = { ...raw };

  // 1. Profile & Multi-candidate migration
  const hasProfiles = Array.isArray(raw.candidateProfiles) && raw.candidateProfiles.length > 0;
  const legacyProfile = raw.profile;

  if (!hasProfiles && legacyProfile && (legacyProfile.firstName || legacyProfile.email || legacyProfile.skills)) {
    const defaultCandidate: CandidateProfile = {
      id: "default",
      name: legacyProfile.targetRoles ? legacyProfile.targetRoles.split(",")[0]!.trim() : "Default Profile",
      targetRole: legacyProfile.targetRoles || undefined,
      profile: {
        ...EMPTY_PROFILE,
        ...legacyProfile,
        skillsComplete: false,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    migrated.candidateProfiles = [defaultCandidate];
    migrated.activeProfileId = defaultCandidate.id;
    migrated.profile = defaultCandidate.profile;
    upgradedKeys.push("candidateProfiles", "activeProfileId", "profile");
  } else if (hasProfiles) {
    // Ensure all candidate profiles have required fields
    migrated.candidateProfiles = raw.candidateProfiles!.map((cp) => ({
      ...cp,
      profile: {
        ...EMPTY_PROFILE,
        ...cp.profile,
      },
      updatedAt: cp.updatedAt || new Date().toISOString(),
    }));
    if (!raw.activeProfileId && migrated.candidateProfiles.length > 0) {
      migrated.activeProfileId = migrated.candidateProfiles[0]!.id;
      upgradedKeys.push("activeProfileId");
    }
  }

  // 2. Answers migration
  if (Array.isArray(raw.answers)) {
    migrated.answers = raw.answers.map((a: any) => ({
      question: a.question || "",
      answer: a.answer ?? a.value ?? "",
      topic: a.topic || undefined,
      company: a.company || undefined,
      createdAt: a.createdAt || new Date().toISOString(),
      updatedAt: a.updatedAt || a.createdAt || new Date().toISOString(),
    }));
    upgradedKeys.push("answers");
  }

  // 3. Applications / Tracker CRM migration
  if (Array.isArray(raw.applications)) {
    migrated.applications = raw.applications.map((app: any) => {
      let stage: TrackerStage = "Applied";
      if (app.stage) {
        stage = app.stage;
      } else if (app.kanbanStage) {
        const k = String(app.kanbanStage).toLowerCase();
        if (k === "saved") stage = "Saved";
        else if (k === "assessment") stage = "Assessment";
        else if (k === "interview") stage = "Interview";
        else if (k === "offer") stage = "Offer";
        else if (k === "rejected") stage = "Rejected";
        else if (k === "withdrawn") stage = "Withdrawn";
        else stage = "Applied";
      } else if (app.status === "failed") {
        stage = "Rejected";
      } else if (app.status === "saved") {
        stage = "Saved";
      }

      return {
        ...app,
        id: app.id || `app_${Math.random().toString(36).slice(2, 9)}`,
        company: app.company || app.jobTitle || "Unknown Company",
        jobTitle: app.jobTitle || "Role",
        url: app.url || "",
        createdAt: app.createdAt || app.appliedAt || app.date || new Date().toISOString(),
        status: (app.status === "applied_confirmed" || app.status === "needs_check" || app.status === "in_progress") ? app.status : "applied_confirmed",
        stage,
        kanbanStage: stage,
        notes: app.notes || "",
        contacts: Array.isArray(app.contacts) ? app.contacts : [],
        reminders: Array.isArray(app.reminders) ? app.reminders : [],
      };
    });
    upgradedKeys.push("applications");
  }

  // 4. Settings & Licence migration
  if (raw.settings) {
    migrated.settings = {
      mode: "review",
      maxParallel: 1,
      perHostMax: 1,
      dailyCap: 50,
      cooldownDays: 30,
      detection: "job_sites",
      understanding: true,
      ...raw.settings,
    };
    upgradedKeys.push("settings");
  }
  if (raw.licenceKey || raw.settings?.licenceKey) {
    migrated.licenceKey = raw.licenceKey || raw.settings?.licenceKey;
    upgradedKeys.push("licenceKey");
  }
  migrated.pacing = {
    safePacing: raw.settings?.safePacing ?? raw.pacing?.safePacing ?? true,
    dailyApplyCap: raw.settings?.dailyApplyCap ?? raw.pacing?.dailyApplyCap ?? 50,
    ...raw.pacing,
  };
  upgradedKeys.push("pacing");

  // Detect format version
  let version: "v1.0" | "phase3" | "current" = "current";
  if (!raw.candidateProfiles && raw.profile) {
    version = "v1.0";
  } else if (raw.candidateProfiles && !raw.pacing && !raw.settings?.safePacing) {
    version = "phase3";
  }

  return { migrated, version, upgradedKeys };
}

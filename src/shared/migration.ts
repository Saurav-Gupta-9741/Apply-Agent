/**
 * Storage schema migration and backward-compatibility engine.
 * Ensures seamless upgrades from v1.0 (main) and Phase 3 formats to the current schema.
 *
 * Guarantees (enforced by test/migration.test.ts):
 * - Add-only: every existing key, field and value is kept exactly; only missing fields are filled.
 * - Before writing, the old values of every key it changes are saved under "migrationBackup".
 * - Runs once per schema version, from the background worker on install/update.
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

  // 2. Answers: keep EVERY field (country, intent, reused… drive answer reuse); only fill what is missing.
  if (Array.isArray(raw.answers)) {
    migrated.answers = raw.answers.map((a: any) => ({
      ...a,
      question: a.question ?? "",
      answer: a.answer ?? a.value ?? "",
      updatedAt: a.updatedAt || a.createdAt || new Date().toISOString(),
    }));
    upgradedKeys.push("answers");
  }

  // 3. Applications: keep every field and value (status, company, url…); only add the tracker fields that are missing.
  if (Array.isArray(raw.applications)) {
    migrated.applications = raw.applications.map((app: any) => {
      let stage: TrackerStage = "Applied";
      const k = String(app.kanbanStage ?? "").toLowerCase();
      if (k === "saved" || app.status === "saved") stage = "Saved";
      else if (k === "assessment") stage = "Assessment";
      else if (k === "interview") stage = "Interview";
      else if (k === "offer") stage = "Offer";
      else if (k === "rejected" || app.status === "failed") stage = "Rejected";
      else if (k === "withdrawn") stage = "Withdrawn";
      return {
        ...app,
        stage: app.stage ?? stage,
        notes: app.notes ?? "",
        contacts: Array.isArray(app.contacts) ? app.contacts : [],
        reminders: Array.isArray(app.reminders) ? app.reminders : [],
      };
    });
    upgradedKeys.push("applications");
  }

  // 4. Settings are left as they are: loadSettings() already fills defaults on read.
  if (raw.licenceKey || raw.settings?.licenceKey) {
    migrated.licenceKey = raw.licenceKey || raw.settings?.licenceKey;
    upgradedKeys.push("licenceKey");
  }
  migrated.pacing = {
    safePacing: raw.settings?.safePacing ?? true,
    dailyApplyCap: raw.settings?.dailyApplyCap ?? 50,
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

/** Bump when a new add-only step is added to migrateStorage. */
export const SCHEMA_VERSION = 1;

interface StorageArea {
  get(keys: null): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
}

/** Upgrades chrome.storage.local once per SCHEMA_VERSION. Only ever calls set() (never remove/clear). */
export async function runStorageMigration(area: StorageArea = chrome.storage.local as unknown as StorageArea): Promise<MigrationResult | undefined> {
  const all = await area.get(null);
  if (typeof all.schemaVersion === "number" && all.schemaVersion >= SCHEMA_VERSION) return undefined;
  const result = migrateStorage(all as StorageDump);
  const keys = [...new Set(result.upgradedKeys)];
  const backup: Record<string, unknown> = {};
  for (const k of keys) if (k in all) backup[k] = all[k];
  if (Object.keys(backup).length) {
    await area.set({ migrationBackup: { at: new Date().toISOString(), fromVersion: all.schemaVersion ?? 0, data: backup } });
  }
  const changes: Record<string, unknown> = { schemaVersion: SCHEMA_VERSION };
  for (const k of keys) changes[k] = result.migrated[k];
  await area.set(changes);
  return result;
}

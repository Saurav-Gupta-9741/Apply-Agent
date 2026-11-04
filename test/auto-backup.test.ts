// Round 3: automatic backup timing, and the fixed beta extension ID.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { nextBackupTime } from "../src/shared/auto-backup";

describe("automatic backup", () => {
  const now = Date.parse("2026-11-04T12:00:00Z");
  test("runs a couple of minutes after a change", () => {
    expect(nextBackupTime(undefined, now)).toBe(now + 2 * 60_000);
  });
  test("never more than once an hour", () => {
    expect(nextBackupTime("2026-11-04T11:30:00Z", now)).toBe(Date.parse("2026-11-04T12:30:00Z"));
    expect(nextBackupTime("2026-11-04T09:00:00Z", now)).toBe(now + 2 * 60_000);
  });
  test("a broken timestamp does not block backups", () => {
    expect(nextBackupTime("not a date", now)).toBe(now + 2 * 60_000);
  });
});

test("beta builds share one fixed extension ID (testers keep their data across updates and folders)", () => {
  const der = Buffer.from(readFileSync("scripts/beta-extension-key.txt", "utf8").trim(), "base64");
  const id = [...createHash("sha256").update(der).digest("hex").slice(0, 32)].map((c) => String.fromCharCode(97 + parseInt(c, 16))).join("");
  expect(id).toBe("iicpdaijbfjiffjmmoagdaiiochhnmic");
  expect(readFileSync("build.mjs", "utf8")).toContain("manifest.key = readFileSync(\"scripts/beta-extension-key.txt\"");
});

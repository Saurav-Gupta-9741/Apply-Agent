/** Round 3: data survives a reinstall (automatic backup file + restore on first run), first-run resume upload asks
 * before reading, and every Profile field shows an example. Nothing is uploaded anywhere. */
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Profile } from "../src/shared/types";
import { expect, getStorage, goTo, PROFILE, setStorage, test } from "./fixtures";

test("first-run resume upload saves the file and asks; it never fills the profile by itself", async ({ ext }) => {
  await setStorage(ext, { profile: {}, onboarding_done: false });
  await ext.reload();
  const container = ext.locator("#onboarding-container");
  await expect(container).toBeVisible();
  const file = join(mkdtempSync(join(tmpdir(), "aa-onb-")), "Neha_Resume.txt");
  writeFileSync(file, "Neha Patel\nneha.patel@example.com\n+91 98765 43210\n");
  await container.locator("#onboarding-file-input").setInputFiles(file);
  await expect(ext.locator("#resume-review-dialog")).toContainText("Fill your profile from your resume?");
  await ext.locator("#resume-read-no").click();
  const p = await getStorage<Profile>(ext, "profile");
  expect(p?.resume?.name).toBe("Neha_Resume.txt");
  expect(p?.firstName ?? "").toBe("");
  expect(p?.email ?? "").toBe("");
});

test("a backup restored on first run brings everything back and ends the welcome steps", async ({ ext }) => {
  await setStorage(ext, { profile: {}, onboarding_done: false });
  await ext.reload();
  await expect(ext.locator("#onboarding-restore")).toBeVisible();
  const backup = {
    format: "applyagent-backup", version: 1, exportedAt: "2026-11-04T10:00:00.000Z",
    profile: { ...PROFILE, firstName: "Restored" }, answers: [], applications: [], settings: {},
  };
  const file = join(mkdtempSync(join(tmpdir(), "aa-restore-")), "applyagent-backup.json");
  writeFileSync(file, JSON.stringify(backup));
  await ext.locator("#import-backup").setInputFiles(file);
  await expect.poll(async () => (await getStorage<Profile>(ext, "profile"))?.firstName).toBe("Restored");
  await expect(ext.locator("#onboarding-container")).toHaveCount(0);
  expect((await ext.evaluate(() => chrome.storage.local.get("onboarding_done"))).onboarding_done).toBe(true);
});

test("automatic backup writes a file on this PC when turned on", async ({ ext }) => {
  await setStorage(ext, { profile: PROFILE }); // an empty profile is not backed up (nothing to keep yet)
  await ext.reload();
  await goTo(ext, "profile");
  await ext.locator("#auto-backup").check();
  await expect(ext.locator("#auto-backup-status")).toContainText("Last backup");
  // (The test browser stores downloads under random names, so the download list is searched, not the file name.)
  const items = await ext.evaluate(async () => (await chrome.downloads.search({})).map((d) => d.url.slice(0, 40)));
  expect(items.some((u) => u.startsWith("data:application/json"))).toBe(true); // made in the browser, sent nowhere
  await ext.locator("#auto-backup").uncheck();
  await expect(ext.locator("#auto-backup-status")).toContainText("Off.");
});

test("every Profile field shows an example and what it answers", async ({ ext }) => {
  await goTo(ext, "profile");
  await expect(ext.locator("#profile-form input[name='phone']")).toHaveAttribute("placeholder", /\+91/);
  await expect(ext.locator("#profile-form input[name='linkedin']")).toHaveAttribute("placeholder", /linkedin\.com\/in\//);
  const inputs = ext.locator("#profile-form .card input[name], #profile-form .card textarea[name]");
  const help = ext.locator("#profile-form .field-help");
  expect(await help.count()).toBe(await inputs.count());
});

/** Beta 2: the side panel never writes an old copy of the profile back (gender and the resume "reverted" in beta 1),
 * saves a resume the moment it is chosen, checks links, and has a way back to the job list. */
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Profile } from "../src/shared/types";
import { expect, getStorage, goTo, PROFILE, setStorage, test } from "./fixtures";

test("Save profile keeps a gender saved elsewhere meanwhile (Quick Answers setup)", async ({ ext }) => {
  await setStorage(ext, { profile: { ...PROFILE, facts: undefined } });
  await ext.reload();
  await goTo(ext, "profile");
  await ext.locator("#profile-form input[name='firstName']").fill("Ravi");
  // While the form is open, the wizard saves gender = Male.
  await ext.evaluate(async () => {
    const { profile } = await chrome.storage.local.get("profile");
    await chrome.storage.local.set({ profile: { ...profile, facts: { ...(profile.facts ?? {}), gender: "Male" } } });
  });
  await ext.locator("#save-profile").click();
  await expect.poll(async () => (await getStorage<Profile>(ext, "profile"))?.firstName).toBe("Ravi");
  expect((await getStorage<Profile>(ext, "profile"))?.facts?.gender).toBe("Male");
});

test("a chosen resume is saved at once, without pressing Save profile", async ({ ext }) => {
  await setStorage(ext, { profile: { ...PROFILE, resume: undefined } });
  await ext.reload();
  await goTo(ext, "profile");
  const file = join(mkdtempSync(join(tmpdir(), "aa-resume-")), "Ravi_Resume.pdf");
  writeFileSync(file, "%PDF-1.4\n%test\n");
  await ext.locator("#resume").setInputFiles(file);
  await expect.poll(async () => (await getStorage<Profile>(ext, "profile"))?.resume?.name).toBe("Ravi_Resume.pdf");
  await expect(ext.locator("#resume-name")).toHaveText("Ravi_Resume.pdf");
});

test("a LinkedIn link that isn't one is not saved; a bare one is completed", async ({ ext }) => {
  await goTo(ext, "profile");
  const linkedin = ext.locator("#profile-form input[name='linkedin']");
  await linkedin.fill("my linkedin");
  await ext.locator("#save-profile").click();
  await expect(ext.locator("[data-note-for='linkedin']")).toContainText("linkedin.com/in/");
  expect((await getStorage<Profile>(ext, "profile"))?.linkedin ?? "").not.toBe("my linkedin");
  await linkedin.fill("linkedin.com/in/ravi-k");
  await ext.locator("#save-profile").click();
  await expect.poll(async () => (await getStorage<Profile>(ext, "profile"))?.linkedin).toBe("https://linkedin.com/in/ravi-k");
});

test("city typo gets a suggestion; Back to jobs; Discover filters are there", async ({ ext }) => {
  await goTo(ext, "profile");
  await ext.locator("#profile-form input[name='location']").fill("Banglore");
  await ext.locator("#profile-form input[name='location']").press("Tab");
  await expect(ext.locator("#city-note")).toContainText("Did you mean");
  // Leaving Profile with an unsaved edit asks first (tester report 2).
  if (await ext.locator("#nav-toggle").isVisible()) await ext.locator("#nav-toggle").click();
  await ext.locator("#drawer [data-section='apply']").click();
  await expect(ext.locator("#unsaved-dialog")).toBeVisible();
  await ext.locator("#unsaved-discard").click();
  await expect(ext.locator("#sec-apply")).toBeVisible();
  await ext.locator("#back-to-jobs").click();
  await expect(ext.locator("#sec-jobs")).toBeVisible();
  await expect(ext.locator("#discover-experience option")).toHaveCount(5);
  await expect(ext.locator("#discover-type option[value='internship']")).toHaveCount(1);
});

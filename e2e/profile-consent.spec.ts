/** Tester report 2: a resume is read for profile details only when the user says so, nothing is ticked, typed edits
 * are never lost, the import invents nothing, and every Profile field is checked. */
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Profile } from "../src/shared/types";
import { expect, getStorage, goTo, PROFILE, setStorage, test } from "./fixtures";

const RESUME = `Asha Verma
M.TECH CSE | IIT Jodhpur | asha.verma@example.com | +91 98765 43210

EDUCATION
M.Tech in Computer Science, Indian Institute of Technology Jodhpur  2025 – Present
B.Tech in Electronics, ABC Institute of Technology  2019 – 2023

SKILLS
Python, Java, PyTorch
`;

function resumeFile(): string {
  const file = join(mkdtempSync(join(tmpdir(), "aa-consent-")), "Asha_Resume.txt");
  writeFileSync(file, RESUME);
  return file;
}

test("uploading asks before reading; 'No thanks' changes nothing", async ({ ext }) => {
  await setStorage(ext, { profile: { ...PROFILE, firstName: "", portfolio: "", graduationYear: "", resume: undefined } });
  await ext.reload();
  await goTo(ext, "profile");
  await ext.locator("#resume").setInputFiles(resumeFile());
  await expect(ext.locator("#resume-review-dialog")).toContainText("Fill your profile from your resume?");
  await ext.locator("#resume-read-no").click();
  const p = await getStorage<Profile>(ext, "profile");
  expect(p?.resume?.name).toBe("Asha_Resume.txt");
  expect(p?.firstName).toBe("");
  expect(p?.portfolio).toBe("");
  await expect(ext.locator("#read-resume-btn")).toBeVisible();
});

test("saying yes keeps unsaved typing, ticks nothing, offers no made-up link or year", async ({ ext }) => {
  await setStorage(ext, { profile: { ...PROFILE, firstName: "", location: "", portfolio: "", graduationYear: "", resume: undefined } });
  await ext.reload();
  await goTo(ext, "profile");
  // Typed but not saved: must survive the import (beta 2 wiped it).
  await ext.locator("#profile-form input[name='location']").fill("Jodhpur");
  await ext.locator("#resume").setInputFiles(resumeFile());
  const dialog = ext.locator("#resume-review-dialog");
  await expect(dialog).toContainText("unsaved Profile changes will be saved first");
  await ext.locator("#resume-read-yes").click();
  await expect(dialog).toContainText("Choose what to import from your resume");
  await expect.poll(async () => (await getStorage<Profile>(ext, "profile"))?.location).toBe("Jodhpur");

  const boxes = dialog.locator(".resume-review-item input[type='checkbox']");
  expect(await boxes.count()).toBeGreaterThan(0);
  for (const box of await boxes.all()) await expect(box).not.toBeChecked();
  await expect(dialog).not.toContainText("M.TECH\"");
  await expect(dialog.locator(".resume-review-item", { hasText: "Portfolio" })).toHaveCount(0);
  await expect(dialog.locator(".resume-review-item", { hasText: "Graduation year" })).toHaveCount(0);
  await expect(dialog).toContainText("From your resume:");

  await dialog.locator(".resume-review-item", { hasText: "First name" }).locator("input[type='checkbox']").check();
  await dialog.getByRole("button", { name: "Import ticked values" }).click();
  await expect.poll(async () => (await getStorage<Profile>(ext, "profile"))?.firstName).toBe("Asha");
  const p = await getStorage<Profile>(ext, "profile");
  expect(p?.location).toBe("Jodhpur");
  expect(p?.skillsInventory ?? []).toEqual(PROFILE.skillsInventory ?? []); // no skill was given made-up years
  await expect(ext.locator("#profile-form input[name='location']")).toHaveValue("Jodhpur");
});

test("a country that does not exist, a state from another country and a bad PIN block saving", async ({ ext }) => {
  await goTo(ext, "profile");
  const field = (name: string) => ext.locator(`#profile-form input[name='${name}']`);
  await field("country").fill("Wakanda");
  await ext.locator("#save-profile").click();
  await expect(ext.locator("[data-note-for='country']")).toContainText("isn't a country");
  expect((await getStorage<Profile>(ext, "profile"))?.country).not.toBe("Wakanda");

  await field("country").fill("india");
  await field("state").fill("California");
  await field("postalCode").fill("5600");
  await ext.locator("#save-profile").click();
  await expect(ext.locator("[data-note-for='state']")).toContainText("isn't a state of India");
  await expect(ext.locator("[data-note-for='postalCode']")).toContainText("560001");

  await field("state").fill("ka");
  await field("postalCode").fill("560 001");
  await ext.locator("#save-profile").click();
  await expect.poll(async () => (await getStorage<Profile>(ext, "profile"))?.country).toBe("India");
  const p = await getStorage<Profile>(ext, "profile");
  expect(p?.state).toBe("Karnataka");
  expect(p?.postalCode).toBe("560001");
});

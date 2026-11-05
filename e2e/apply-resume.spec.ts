/** "Resume for this application" on the Apply screen: the Profile's resume is shown, another file can be used for
 * this application only, the Fill attaches that file, and the Profile's resume never changes. */

import type { Page } from "@playwright/test";
import { ANSWERS, BASE, expect, getStorage, goTo, PROFILE, setStorage, test } from "./fixtures";
import type { Profile } from "../src/shared/types";

const OTHER_NAME = "Asha_Verma_Resume_backend.pdf";

async function tabOf(ext: Page, url: string): Promise<{ id: number; windowId: number }> {
  return ext.evaluate(async (u) => {
    const t = (await chrome.tabs.query({})).find((x) => x.url === u)!;
    return { id: t.id!, windowId: t.windowId };
  }, url);
}

const activate = (ext: Page, id: number) => ext.evaluate((tabId) => chrome.tabs.update(tabId, { active: true }).then(() => undefined), id);
const sessionKeys = (ext: Page) => ext.evaluate(async () => Object.keys(await chrome.storage.session.get(null)).filter((k) => k.startsWith("resumeOverride:")));

test("a different resume for this application only: attached on the page, the Profile's resume unchanged", async ({ ext, context }) => {
  await setStorage(ext, { profile: PROFILE, answers: ANSWERS });
  const a = await context.newPage();
  await a.goto(`${BASE}/apply.html`);
  const b = await context.newPage();
  await b.goto(`${BASE}/autofill.html`);
  const tabA = await tabOf(ext, a.url());
  const tabB = await tabOf(ext, b.url());
  await ext.goto(`${ext.url().split("?")[0]}?window=${tabA.windowId}`);
  await goTo(ext, "apply");
  await activate(ext, tabA.id);
  await expect(ext.locator("#page-url")).toHaveText(a.url());

  // The Profile's resume is shown.
  const row = ext.locator("#apply-resume");
  await expect(row).toBeVisible();
  await expect(row).toContainText("Resume for this application");
  await expect(ext.locator("#apply-resume-name")).toHaveText(PROFILE.resume!.name);
  await expect(row).toContainText("From your Profile");
  await expect(ext.locator("#apply-resume-remove")).toHaveCount(0);

  // A file of the wrong kind is refused.
  await ext.locator("#apply-resume-file").setInputFiles({ name: "photo.png", mimeType: "image/png", buffer: Buffer.from("png") });
  await expect(ext.locator(".toast").last()).toContainText("PDF, DOC, DOCX or TXT");
  await expect(ext.locator("#apply-resume-name")).toHaveText(PROFILE.resume!.name);

  // Swap to another file for this application.
  await ext.locator("#apply-resume-file").setInputFiles({ name: OTHER_NAME, mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n%other test resume\n") });
  await expect(ext.locator("#apply-resume-name")).toHaveText(OTHER_NAME);
  await expect(row).toContainText("This application only");
  await expect(ext.locator("#apply-resume-remove")).toHaveText("Remove (use my Profile resume again)");
  expect(await sessionKeys(ext)).toEqual([`resumeOverride:${tabA.id}`]);
  // Kept in the session, never in the extension's local storage, and the Profile's resume is unchanged.
  expect(Object.keys(await ext.evaluate(() => chrome.storage.local.get(null))).some((k) => k.startsWith("resumeOverride"))).toBe(false);
  expect((await getStorage<Profile>(ext, "profile")).resume).toEqual(PROFILE.resume);

  // Another tab has its own resume (the Profile's); coming back shows this tab's choice again.
  await activate(ext, tabB.id);
  await expect(ext.locator("#page-url")).toHaveText(b.url());
  await expect(ext.locator("#apply-resume-name")).toHaveText(PROFILE.resume!.name);
  await activate(ext, tabA.id);
  await expect(ext.locator("#page-url")).toHaveText(a.url());
  await expect(ext.locator("#apply-resume-name")).toHaveText(OTHER_NAME);

  // Fill: the page's file input gets the chosen file, and the checklist says so.
  await ext.locator("#run").click();
  await expect(ext.locator("#fields-box")).toBeVisible({ timeout: 20_000 });
  await expect(ext.locator("#fields")).toContainText(`→ ${OTHER_NAME} (this application only)`);
  expect(await a.evaluate(() => (document.getElementById("upload") as HTMLInputElement).files?.[0]?.name)).toBe(OTHER_NAME);
  await expect(a.locator("#file-name")).toHaveText(OTHER_NAME);
  expect((await getStorage<Profile>(ext, "profile")).resume).toEqual(PROFILE.resume);

  // Remove: back to the Profile's resume.
  await ext.locator("#apply-resume-remove").click();
  await expect(ext.locator("#apply-resume-name")).toHaveText(PROFILE.resume!.name);
  await expect(row).toContainText("From your Profile");
  expect(await sessionKeys(ext)).toEqual([]);
});

test("the chosen resume is forgotten when the tab moves to another job or closes", async ({ ext, context }) => {
  await setStorage(ext, { profile: PROFILE, answers: ANSWERS });
  const a = await context.newPage();
  await a.goto(`${BASE}/apply.html`);
  const tabA = await tabOf(ext, a.url());
  await ext.goto(`${ext.url().split("?")[0]}?window=${tabA.windowId}`);
  await goTo(ext, "apply");
  await activate(ext, tabA.id);
  await expect(ext.locator("#page-url")).toHaveText(a.url());
  const pick = () => ext.locator("#apply-resume-file").setInputFiles({ name: OTHER_NAME, mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n") });

  await pick();
  await expect(ext.locator("#apply-resume-name")).toHaveText(OTHER_NAME);
  await a.goto(`${BASE}/autofill.html`); // another page on the site: another job
  await expect.poll(() => sessionKeys(ext)).toEqual([]);
  await expect(ext.locator("#apply-resume-name")).toHaveText(PROFILE.resume!.name);

  await a.goto(`${BASE}/apply.html`);
  await expect(ext.locator("#page-url")).toHaveText(a.url());
  await pick();
  await expect(ext.locator("#apply-resume-name")).toHaveText(OTHER_NAME);
  await a.close();
  await expect.poll(() => sessionKeys(ext)).toEqual([]);
});

test("no resume in the Profile: the row says so and links to Profile", async ({ ext, context }) => {
  const { resume: _drop, ...noResume } = PROFILE;
  await setStorage(ext, { profile: noResume, answers: ANSWERS });
  const a = await context.newPage();
  await a.goto(`${BASE}/apply.html`);
  const tabA = await tabOf(ext, a.url());
  await ext.goto(`${ext.url().split("?")[0]}?window=${tabA.windowId}`);
  await goTo(ext, "apply");
  await activate(ext, tabA.id);
  await expect(ext.locator("#apply-resume")).toContainText("No resume saved in your Profile.");
  await ext.locator("#apply-resume-profile").click();
  await expect(ext.locator("#sec-profile")).toBeVisible();
});

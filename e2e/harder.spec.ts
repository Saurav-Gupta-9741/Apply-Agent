/** One step harder, in real Chromium: multi-step applications (in one page, and one page per step), Fill started
 * from the keyboard shortcut / right-click menu, editable answers, backup and restore, and the setup checklist. */

import type { Page } from "@playwright/test";
import type { AnswerEntry, Profile } from "../src/shared/types";
import { ANSWERS, BASE, expect, getStorage, goTo, PROFILE, setStorage, test } from "./fixtures";

async function pinPanel(ext: Page, page: Page): Promise<number> {
  const tabId = await ext.evaluate(async (url) => (await chrome.tabs.query({})).find((t) => t.url === url)!.id!, page.url());
  await ext.goto(`${ext.url().split("?")[0]}?tabId=${tabId}`);
  await goTo(ext, "apply");
  return tabId;
}

test("multi-step application in one page: every step filled, Next pressed, stops before the final Submit", async ({ ext, context }) => {
  await setStorage(ext, { profile: PROFILE, answers: ANSWERS });
  const page = await context.newPage();
  await page.goto(`${BASE}/wizard.html`);
  await pinPanel(ext, page);

  await ext.locator("#run").click();
  await expect(ext.locator("#status")).toContainText("Completed 2 steps", { timeout: 20_000 });
  await expect(page.locator("#step-no")).toHaveText("3");
  await expect(page.locator("#ct")).toHaveValue("Pune");
  expect(await page.evaluate(() => sessionStorage.getItem("wizardSubmits"))).toBeNull(); // review mode: not sent

  await ext.locator("#submit").click();
  await expect(ext.locator("#status")).toContainText("Applied");
  expect(await page.evaluate(() => sessionStorage.getItem("wizardSubmits"))).toBe("1");
  await expect(ext.locator("[data-count='tracker']")).toHaveText("1");
});

test("multi-step application with a new page per step: the panel carries on to the next page", async ({ ext, context }) => {
  await setStorage(ext, { profile: PROFILE, answers: ANSWERS });
  const page = await context.newPage();
  await page.goto(`${BASE}/step1.html`);
  await pinPanel(ext, page);

  await ext.locator("#run").click();
  await page.waitForURL(/step2\.html/);
  await expect(ext.locator("#status")).toContainText("Every required field is filled", { timeout: 20_000 });
  await expect(page.locator("#ct")).toHaveValue("Pune");
  expect(page.url()).toContain("fn=Asha"); // step 1 really was filled before moving on
});

test("Fill started from the shortcut or right-click menu runs in the panel for that tab", async ({ ext, context }) => {
  await setStorage(ext, { profile: PROFILE, answers: ANSWERS });
  const page = await context.newPage();
  await page.goto(`${BASE}/apply.html`);
  const tabId = await pinPanel(ext, page);

  // What the background does on Alt+Shift+F / the menu (after opening the panel).
  await ext.evaluate((id) => chrome.storage.session.set({ panelRun: { tabId: id, at: Date.now() } }), tabId);
  await expect(page.locator("#first_name")).toHaveValue("Asha");
  await expect(ext.locator("#status")).toBeVisible();
  expect(await ext.evaluate(() => chrome.storage.session.get("panelRun"))).toEqual({}); // used once

  // A stale request (panel was closed long ago) does nothing.
  await page.reload();
  await ext.evaluate((id) => chrome.storage.session.set({ panelRun: { tabId: id, at: Date.now() - 60_000 } }), tabId);
  await page.waitForTimeout(800);
  await expect(page.locator("#first_name")).toHaveValue("");
});

test("answers can be edited in place", async ({ ext }) => {
  await setStorage(ext, { answers: ANSWERS });
  await goTo(ext, "answers");
  const item = ext.locator("#answer-list li", { hasText: "What is your notice period?" });
  await item.getByRole("button", { name: "Edit answer" }).click();
  await item.locator("textarea").fill("60 days");
  await item.getByRole("button", { name: "Save" }).click();
  await expect.poll(async () => (await getStorage<AnswerEntry[]>(ext, "answers")).find((a) => a.question === "What is your notice period?")?.answer)
    .toBe("60 days");
  await expect(ext.locator("#answer-list")).toContainText("60 days");
});

test("backup: export to a file, restore into an empty browser profile", async ({ ext }) => {
  await setStorage(ext, { profile: PROFILE, answers: ANSWERS });
  await ext.reload();
  await goTo(ext, "profile");
  const [download] = await Promise.all([ext.waitForEvent("download"), ext.locator("#export-backup").click()]);
  expect(download.suggestedFilename()).toMatch(/^applyagent-backup-\d{4}-\d{2}-\d{2}\.json$/);
  const file = await download.path();

  await ext.evaluate(() => chrome.storage.local.clear());
  await ext.reload();
  await goTo(ext, "profile");
  await ext.locator("#import-backup").setInputFiles(file);
  await expect(ext.locator("#toasts")).toContainText("Restored");
  expect((await getStorage<Profile>(ext, "profile")).resume?.name).toBe(PROFILE.resume!.name);
  expect(await getStorage<AnswerEntry[]>(ext, "answers")).toHaveLength(ANSWERS.length);
  await expect(ext.locator("#profile-form input[name='firstName']")).toHaveValue("Asha");
});

test("the setup checklist guides a new user and disappears step by step", async ({ ext }) => {
  await goTo(ext, "apply");
  await expect(ext.locator("#setup-card")).toBeVisible();
  await expect(ext.locator("#setup-progress")).toHaveText(/^(0|1) of 4/);
  await setStorage(ext, { profile: PROFILE });
  await expect(ext.locator(".setup-step.done", { hasText: "Add your name" })).toHaveCount(1);
  await expect(ext.locator(".setup-step.done", { hasText: "Upload your resume" })).toHaveCount(1);
  await expect(ext.locator(".setup-step.done", { hasText: "Answer the quick questions" })).toHaveCount(0);
  await ext.locator(".setup-step", { hasText: "Add your name" }).getByRole("button").count().then((n) => expect(n).toBe(0));
});

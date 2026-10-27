/** Fill or Preview pressed on a job DESCRIPTION page: ApplyAgent opens the application with the page's own Apply,
 * then fills it. Both kinds: a link to another page, and a button that opens the form on the same page. */

import type { Page } from "@playwright/test";
import type { QueueItem } from "../src/shared/types";
import { ANSWERS, BASE, expect, getStorage, goTo, PROFILE, setStorage, test } from "./fixtures";

async function pinTo(ext: Page, page: Page): Promise<void> {
  const tabId = await ext.evaluate(async (url) => (await chrome.tabs.query({})).find((t) => t.url === url)!.id!, page.url());
  await ext.goto(`${ext.url().split("?")[0]}?tabId=${tabId}`);
  await goTo(ext, "apply");
}

test("Fill on a job description with an Apply link: opens the application page and fills it", async ({ ext, context }) => {
  await setStorage(ext, { profile: PROFILE, answers: ANSWERS });
  const page = await context.newPage();
  await page.goto(`${BASE}/job.html`);
  await pinTo(ext, page);
  await ext.locator("#run").click();
  await page.waitForURL(`${BASE}/apply.html`);
  await expect(page.locator("#first_name")).toHaveValue("Asha", { timeout: 20_000 });
  await expect(ext.locator("#status")).not.toContainText("No application form");
});

test("Preview on a job description whose Apply button opens the form on the same page", async ({ ext, context }) => {
  await setStorage(ext, { profile: PROFILE, answers: ANSWERS });
  const page = await context.newPage();
  await page.goto(`${BASE}/job.html?inline=1`);
  await pinTo(ext, page);
  await ext.locator("#preview").click();
  await expect(page.locator("#application-form")).toBeVisible();
  await expect(ext.locator("#status")).toContainText("Nothing was typed or uploaded", { timeout: 20_000 });
  await expect(page.locator("#first_name")).toHaveValue(""); // a preview types nothing
});

test("the queue opens the application from a job description link", async ({ ext }) => {
  await setStorage(ext, {
    profile: PROFILE, answers: ANSWERS, settings: { mode: "review", maxParallel: 1, perHostMax: 1, dailyCap: 25, cooldownDays: 30 },
  });
  await ext.evaluate((url) => chrome.runtime.sendMessage({ type: "QUEUE_ADD", jobs: [{ url, title: "Data Engineer", company: "Acme" }] }), `${BASE}/job.html`);
  await ext.evaluate(() => chrome.runtime.sendMessage({ type: "QUEUE_START" }));
  await expect.poll(async () => ((await getStorage<QueueItem[]>(ext, "queue")) ?? [])[0]?.status, { timeout: 60_000 }).toBe("ready");
});

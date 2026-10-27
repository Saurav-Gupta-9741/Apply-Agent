/** A result belongs to its page: when the page changes, the panel clears it, and Submit can't act on an unreviewed page. */

import { ANSWERS, BASE, expect, goTo, PROFILE, setStorage, test } from "./fixtures";

test("results and Submit are cleared when the page changes", async ({ ext, context }) => {
  await setStorage(ext, { profile: PROFILE, answers: ANSWERS });
  const page = await context.newPage();
  await page.goto(`${BASE}/apply.html`);
  const tabId = await ext.evaluate(async (url) => (await chrome.tabs.query({})).find((t) => t.url === url)!.id!, page.url());
  await ext.goto(`${ext.url().split("?")[0]}?tabId=${tabId}`);
  await goTo(ext, "apply");
  await ext.locator("#run").click();
  await expect(ext.locator("#submit")).toBeVisible(); // filled, ready to submit
  await expect(ext.locator("#fields-box")).toBeVisible();

  await page.goto(`${BASE}/extreme.html`); // the user moves on to another job in the same tab
  await expect(ext.locator("#submit")).toBeHidden();
  await expect(ext.locator("#fields-box")).toBeHidden();
  await expect(ext.locator("#status")).toBeHidden();
  await expect(ext.locator("#report-problem")).toBeHidden();
});

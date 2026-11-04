/** Several applications open at once (round 5 report): the panel shows the tab in front, with that tab's own
 * fields. Switching tabs never shows another application's fields, coming back shows its own again, and a Fill
 * started in one tab finishes there even if the user switches away meanwhile. */

import type { Page } from "@playwright/test";
import { ANSWERS, BASE, expect, goTo, PROFILE, setStorage, test } from "./fixtures";

async function tabOf(ext: Page, url: string): Promise<{ id: number; windowId: number }> {
  return ext.evaluate(async (u) => {
    const t = (await chrome.tabs.query({})).find((x) => x.url === u)!;
    return { id: t.id!, windowId: t.windowId };
  }, url);
}

const activate = (ext: Page, id: number) => ext.evaluate((tabId) => chrome.tabs.update(tabId, { active: true }).then(() => undefined), id);

test("each tab shows its own application; switching never shows another tab's fields", async ({ ext, context }) => {
  await setStorage(ext, { profile: PROFILE, answers: ANSWERS });
  const a = await context.newPage();
  await a.goto(`${BASE}/apply.html`); // has the Python question
  const b = await context.newPage();
  await b.goto(`${BASE}/autofill.html`); // a different form, no Python question
  const tabA = await tabOf(ext, a.url());
  const tabB = await tabOf(ext, b.url());
  // The panel follows the active tab of the window, as the real side panel does.
  await ext.goto(`${ext.url().split("?")[0]}?window=${tabA.windowId}`);
  await goTo(ext, "apply");
  const fields = ext.locator("#fields");

  await activate(ext, tabA.id);
  await expect(ext.locator("#page-url")).toHaveText(a.url());
  await ext.locator("#run").click();
  await expect(ext.locator("#fields-box")).toBeVisible();
  await expect(fields).toContainText("Python");

  // Switch to B: nothing from A is shown.
  await activate(ext, tabB.id);
  await expect(ext.locator("#page-url")).toHaveText(b.url());
  await expect(ext.locator("#fields-box")).toBeHidden();
  await expect(ext.locator("#submit")).toBeHidden();
  await expect(ext.locator("#questions")).toBeEmpty();

  // Fill B: B's own fields.
  await ext.locator("#run").click();
  await expect(ext.locator("#fields-box")).toBeVisible();
  await expect(fields).not.toContainText("Python");

  // Back to A: A's own result is shown again, without filling again.
  await activate(ext, tabA.id);
  await expect(ext.locator("#page-url")).toHaveText(a.url());
  await expect(fields).toContainText("Python");
  await expect(ext.locator("#fields-box")).toBeVisible();

  // A moves on to another page: its old result is gone.
  await a.goto(`${BASE}/long.html`);
  await expect(ext.locator("#fields-box")).toBeHidden();
  await activate(ext, tabB.id);
  await expect(fields).not.toContainText("Python");
  await activate(ext, tabA.id);
  await expect(ext.locator("#fields-box")).toBeHidden(); // long.html was never filled
});

test("a Fill started in one tab ends there, even when the user switches tabs meanwhile", async ({ ext, context }) => {
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

  await ext.locator("#run").click();
  await activate(ext, tabB.id); // straight away, while A is being filled
  await expect(ext.locator("#page-url")).toHaveText(b.url());
  await expect(ext.locator("#run")).toBeEnabled({ timeout: 15_000 }); // A's fill has finished
  await expect(ext.locator("#fields-box")).toBeHidden(); // A's fields never appear on B
  await expect(ext.locator("#submit")).toBeHidden();
  // A's form was filled in A, and B's form was not touched.
  await expect(a.locator("#first_name")).toHaveValue(PROFILE.firstName);
  expect(await b.locator("input").evaluateAll((els) => els.filter((e) => (e as HTMLInputElement).value).length)).toBe(0);

  await activate(ext, tabA.id);
  await expect(ext.locator("#fields")).toContainText("Python");
});

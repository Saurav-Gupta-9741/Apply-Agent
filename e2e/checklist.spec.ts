/** Round 5: the field checklist. After a fill the panel lists every field, required first; clicking one goes to it on
 * the page; filling it on the page ticks it off and takes its question away. */

import { ANSWERS, BASE, expect, goTo, PROFILE, setStorage, test } from "./fixtures";

test("checklist: click a field to go to it, fill it on the page and it is ticked off", async ({ ext, context }) => {
  // No saved answer for the Python question: it is left for the user.
  await setStorage(ext, { profile: PROFILE, answers: ANSWERS.filter((a) => !/Python/.test(a.question)) });
  const page = await context.newPage();
  await page.goto(`${BASE}/apply.html`);
  const tabId = await ext.evaluate(async (url) => (await chrome.tabs.query({})).find((t) => t.url === url)!.id!, page.url());
  await ext.goto(`${ext.url().split("?")[0]}?tabId=${tabId}`);
  await goTo(ext, "apply");
  await ext.locator("#run").click();

  const box = ext.locator("#fields-box");
  await expect(box).toBeVisible({ timeout: 20_000 });
  await expect(box).toHaveAttribute("open", "");
  await expect(ext.locator("#fields .field-group").first()).toContainText("Required");
  await expect(ext.locator("#fields-summary")).toContainText(/required filled · 1 left/);
  const row = ext.locator("#fields .field-row", { hasText: "Python" });
  await expect(row).toContainText("Needs you");
  await expect(ext.locator("#questions .question", { hasText: "Python" })).toBeVisible();

  // Click: the page scrolls to the field and the cursor is put in it.
  await row.click();
  await expect(page.locator("#python")).toBeFocused();

  // The user answers it on the page: the panel ticks it off and the question goes away.
  await page.locator("#python").fill("3");
  await expect(row).toContainText("Filled by you");
  await expect(ext.locator("#fields-summary")).toContainText(/All \d+ required fields filled/);
  await expect(ext.locator("#questions .question", { hasText: "Python" })).toHaveCount(0);
  await expect(ext.locator("#fields-progress")).toHaveClass(/complete/);
});

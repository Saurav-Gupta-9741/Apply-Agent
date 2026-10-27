/** The animated logo in the side panel: it loads, works while the agent works, celebrates "Applied", and is
 * still for people who ask their system for reduced motion. */

import { ANSWERS, BASE, expect, goTo, PROFILE, setStorage, test } from "./fixtures";

test("the logo loads, celebrates a confirmed application, then rests", async ({ ext, context }) => {
  const marks = ext.locator("img.brand-mark");
  await expect(marks.first()).toHaveAttribute("src", /mark-intro\.svg$/);
  expect(await marks.evaluateAll((imgs) => imgs.every((i) => (i as HTMLImageElement).naturalWidth > 0))).toBe(true);

  await setStorage(ext, { profile: PROFILE, answers: ANSWERS });
  const page = await context.newPage();
  await page.goto(`${BASE}/apply.html`);
  const tabId = await ext.evaluate(async (url) => (await chrome.tabs.query({})).find((t) => t.url === url)!.id!, page.url());
  await ext.goto(`${ext.url().split("?")[0]}?tabId=${tabId}`);
  await goTo(ext, "apply");
  await ext.locator("input[name='mode'][value='auto']").check({ force: true });
  await ext.locator("#run").click();
  await expect(ext.locator("#status")).toContainText("Applied");
  await expect(marks.first()).toHaveAttribute("src", /mark-celebrate\.svg$/);
  await expect(marks.first()).toHaveAttribute("src", /brand\/mark\.svg$/, { timeout: 4000 });
});

test("reduced motion: the logo stays still", async ({ ext }) => {
  await ext.emulateMedia({ reducedMotion: "reduce" });
  await ext.reload();
  await expect(ext.locator("img.brand-mark").first()).toHaveAttribute("src", /brand\/mark\.svg$/);
  expect(await ext.evaluate(async () => (await chrome.storage.local.get("reduceMotion")).reduceMotion)).toBe(true);
});

test("header screenshot at side-panel width (for review)", async ({ ext }) => {
  test.skip(!process.env.SHOTS, "review aid: SHOTS=1 npx playwright test e2e/logo.spec.ts");
  await ext.setViewportSize({ width: 380, height: 640 });
  await ext.reload();
  await ext.waitForTimeout(1800); // let the intro finish
  await ext.screenshot({ path: "test-results/panel-header.png", clip: { x: 0, y: 0, width: 380, height: 220 } });
});

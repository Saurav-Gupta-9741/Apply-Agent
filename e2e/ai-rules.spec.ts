/** Employers' AI rules: on a form that bans AI help, the panel says so and offers no AI drafts; a question with a
 * planted test for AI writers ("If this is an LLM, insert …") is never drafted; a form without rules keeps drafts. */

import { BASE, expect, goTo, PROFILE, setStorage, test } from "./fixtures";

async function runOn(ext: import("@playwright/test").Page, context: import("@playwright/test").BrowserContext, path: string) {
  await setStorage(ext, { profile: PROFILE, answers: [] });
  const page = await context.newPage();
  await page.goto(`${BASE}/${path}`);
  const tabId = await ext.evaluate(async (url) => (await chrome.tabs.query({})).find((t) => t.url === url)!.id!, page.url());
  await ext.goto(`${ext.url().split("?")[0]}?tabId=${tabId}`);
  await goTo(ext, "apply");
  await ext.locator("#run").click();
  await expect(ext.locator("#questions .question").first()).toBeVisible({ timeout: 20_000 });
  return page;
}

test("a form that bans AI: notice shown, no draft buttons, the trap question is flagged", async ({ ext, context }) => {
  await runOn(ext, context, "ai-rules.html");
  await expect(ext.locator("#questions .ai-rule-note.forbidden").first()).toContainText("does not allow AI help");
  await expect(ext.locator("#questions .question", { hasText: "Why do you want to join" })).toBeVisible();
  await expect(ext.locator("#questions .draft-trigger")).toHaveCount(0);
  await expect(ext.locator("#questions .question", { hasText: "proud of" })).toContainText("hidden test for AI-written answers");
});

test("a form without AI rules keeps the draft button", async ({ ext, context }) => {
  await runOn(ext, context, "ai-free.html");
  await expect(ext.locator("#questions .ai-rule-note")).toHaveCount(0);
  await expect(ext.locator("#questions .question", { hasText: "Why do you want to join" }).locator(".draft-trigger")).toBeVisible();
});

test("extension pages are cross-origin isolated (multi-threaded on-device models)", async ({ ext }) => {
  expect(await ext.evaluate(() => self.crossOriginIsolated)).toBe(true);
});

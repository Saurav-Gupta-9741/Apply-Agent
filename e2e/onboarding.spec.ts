/** Onboarding E2E test: 3-step first-run wizard in real Chromium */

import { expect, setStorage, test } from "./fixtures";

test("first-run onboarding displays 3 screens and completes setup", async ({ ext }) => {
  // Clear profile and onboarding flag
  await setStorage(ext, { profile: {}, onboarding_done: false });
  await ext.reload();

  // Screen 1: Resume import
  const container = ext.locator("#onboarding-container");
  await expect(container).toBeVisible();
  await expect(container.locator("#onboarding-title")).toContainText("1. Add your resume");

  // Advance to Screen 2: Quick Answers
  await container.locator("#onboarding-next-1").click();
  await expect(container.locator("#onboarding-title")).toContainText("2. Quick Answers");

  // Advance to Screen 3: Practice Form
  await container.locator("#onboarding-next-2").click();
  await expect(container.locator("#onboarding-title")).toContainText("3. Try it in 5 seconds");
  await expect(container.locator("#onboarding-open-demo")).toBeVisible();

  // Complete onboarding
  await container.locator("#onboarding-finish").click();
  await expect(container).not.toBeVisible();

  // Verify stored flag
  const stored = await ext.evaluate(() => chrome.storage.local.get("onboarding_done"));
  expect(stored.onboarding_done).toBe(true);
});

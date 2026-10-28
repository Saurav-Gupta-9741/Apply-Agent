/** Quick answers in real Chromium: answered once in the panel, then used on a form in its own wording. */

import { BASE, expect, goTo, PROFILE, setStorage, test } from "./fixtures";

test("quick answers are saved in the panel and used on the form", async ({ ext, context }) => {
  await setStorage(ext, { profile: PROFILE, answers: [] });
  await ext.reload();
  await goTo(ext, "answers");
  const form = ext.locator("#quick-form");
  await form.locator("[data-fact='workCountries']").fill("India");
  await form.locator("[data-fact='noticePeriod']").fill("30 days");
  await form.locator("[data-fact='expectedCtc']").fill("20 LPA");
  await form.locator("summary").click(); // diversity questions are folded away
  await form.locator("[data-fact='gender']").selectOption("Decline");
  await form.locator("#save-quick").click();
  await expect(ext.locator("#toasts")).toContainText("Quick answers saved");
  await expect.poll(async () => (await ext.evaluate(() => chrome.storage.local.get("profile"))).profile?.facts?.workCountries).toBe("India");

  const page = await context.newPage();
  await page.goto(`${BASE}/apply.html`);
  const tabId = await ext.evaluate(async (url) => (await chrome.tabs.query({})).find((t) => t.url === url)!.id!, page.url());
  await ext.goto(`${ext.url().split("?")[0]}?tabId=${tabId}`);
  await goTo(ext, "apply");
  await ext.locator("#run").click();
  await expect(ext.locator("#status")).toBeVisible();
  // "Are you legally authorized to work in India?" → Yes, from "I can work in India"; the notice period from the card.
  await expect(page.locator("input[name='auth'][value='yes']")).toBeChecked();
  await expect(page.locator("#notice")).toHaveValue("30 days");
  // Only questions with no quick answer are asked.
  await expect(ext.locator(".question", { hasText: "authorized to work" })).toHaveCount(0);
  await expect(ext.locator(".question", { hasText: "Why do you want to join" })).toHaveCount(1);
});

test("one-click prefer not to say sets all diversity quick answers to Decline", async ({ ext }) => {
  await setStorage(ext, { profile: PROFILE, answers: [] });
  await ext.reload();
  await goTo(ext, "answers");
  const form = ext.locator("#quick-form");
  await form.locator("summary").click();
  await form.locator("#decline-diversity").click();
  await expect(ext.locator("#toasts")).toContainText("Diversity answers set to 'Prefer not to say'");
  const stored = await ext.evaluate(() => chrome.storage.local.get("profile"));
  expect(stored.profile?.facts?.gender).toBe("Decline");
  expect(stored.profile?.facts?.hispanic).toBe("Decline");
  expect(stored.profile?.facts?.race).toBe("Decline");
  expect(stored.profile?.facts?.veteran).toBe("Decline");
  expect(stored.profile?.facts?.disability).toBe("Decline");
});

test("screening pre-answers are saved in the panel and written to answers bank", async ({ ext }) => {
  await setStorage(ext, { profile: PROFILE, answers: [] });
  await ext.reload();
  await goTo(ext, "answers");
  const form = ext.locator("#screening-form");
  await form.locator("summary").click();
  await form.locator('select[data-screening="Do you have a valid driver\'s license?"]').selectOption("Yes");
  await form.locator('select[data-screening="Are you bound by a non-compete agreement?"]').selectOption("No");
  await form.locator("#save-screening").click();
  await expect(ext.locator("#toasts")).toContainText("Screening answers saved");
  const stored = await ext.evaluate(() => chrome.storage.local.get("answers"));
  expect(stored.answers).toHaveLength(2);
  expect(stored.answers.find((a: any) => a.question === "Do you have a valid driver's license?").answer).toBe("Yes");
  expect(stored.answers.find((a: any) => a.question === "Are you bound by a non-compete agreement?").answer).toBe("No");
});

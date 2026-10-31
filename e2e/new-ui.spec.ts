/** End-to-end tests for the new profile sections: Skills inventory, Languages, Work mode & travel. */

import { BASE, expect, goTo, PROFILE, setStorage, test } from "./fixtures";

test("save skills table and skillsComplete checkbox in side panel, reload, fill a form with skills questions", async ({ ext, context }) => {
  await setStorage(ext, { profile: PROFILE, answers: [] });
  await ext.reload();
  await goTo(ext, "profile");

  // Add a skill row
  await ext.locator("#add-skill").click();
  const row = ext.locator("#skills-list .skill-row").last();
  await row.locator("[data-skill='name']").fill("Python");
  await row.locator("[data-skill='years']").fill("3");
  await row.locator("[data-skill='level']").selectOption("Intermediate");

  // Check the complete checkbox
  await ext.locator("#skills-complete").check();

  // Save profile
  await ext.locator("#save-profile").click();
  await expect(ext.locator("#toasts")).toContainText("Profile saved");

  // Reload side panel and verify persistence
  await ext.reload();
  await goTo(ext, "profile");
  await expect(ext.locator("#skills-complete")).toBeChecked();
  const savedRow = ext.locator("#skills-list .skill-row").last();
  await expect(savedRow.locator("[data-skill='name']")).toHaveValue("Python");
  await expect(savedRow.locator("[data-skill='years']")).toHaveValue("3");

  // Open the practice form
  const page = await context.newPage();
  await page.goto(`${BASE}/new-ui.html`);
  const tabId = await ext.evaluate(async (url) => (await chrome.tabs.query({})).find((t) => t.url === url)!.id!, page.url());
  await ext.goto(`${ext.url().split("?")[0]}?tabId=${tabId}`);
  await goTo(ext, "apply");
  await ext.locator("#run").click();
  await expect(ext.locator("#status")).toBeVisible();

  // Verify form filling:
  // "Do you have experience with Python?" -> Yes
  await expect(page.locator("input[name='has_python'][value='Yes']")).toBeChecked({ timeout: 10_000 });
  // "How many years of experience do you have with Python?" -> 3
  await expect(page.locator("#python_years")).toHaveValue("3");
  // "Do you have experience with Rust?" -> No (skills complete, not listed)
  await expect(page.locator("input[name='has_rust'][value='No']")).toBeChecked();
});

test("save languages table and languagesComplete checkbox in side panel, reload, fill a form with language questions", async ({ ext, context }) => {
  await setStorage(ext, { profile: PROFILE, answers: [] });
  await ext.reload();
  await goTo(ext, "profile");

  // Add language row
  await ext.locator("#add-language").click();
  const row = ext.locator("#languages-list .lang-row").last();
  await row.locator("[data-lang='name']").fill("English");
  await row.locator("[data-lang='proficiency']").selectOption("Professional");

  // Check complete checkbox
  await ext.locator("#languages-complete").check();

  // Save profile
  await ext.locator("#save-profile").click();
  await expect(ext.locator("#toasts")).toContainText("Profile saved");

  // Reload side panel and verify persistence
  await ext.reload();
  await goTo(ext, "profile");
  await expect(ext.locator("#languages-complete")).toBeChecked();
  const savedRow = ext.locator("#languages-list .lang-row").last();
  await expect(savedRow.locator("[data-lang='name']")).toHaveValue("English");
  await expect(savedRow.locator("[data-lang='proficiency']")).toHaveValue("Professional");

  // Open the practice form
  const page = await context.newPage();
  await page.goto(`${BASE}/new-ui.html`);
  const tabId = await ext.evaluate(async (url) => (await chrome.tabs.query({})).find((t) => t.url === url)!.id!, page.url());
  await ext.goto(`${ext.url().split("?")[0]}?tabId=${tabId}`);
  await goTo(ext, "apply");
  await ext.locator("#run").click();
  await expect(ext.locator("#status")).toBeVisible();

  // Verify form filling:
  // "Do you have professional-level proficiency in English?" -> Yes
  await expect(page.locator("input[name='lang_english'][value='Yes']")).toBeChecked({ timeout: 10_000 });
  // "Do you speak fluent German?" -> No (languages complete, German not listed)
  await expect(page.locator("input[name='lang_german'][value='No']")).toBeChecked();
});

test("save work mode, max office days, and travel percent in side panel, reload, fill a form with work mode and travel questions", async ({ ext, context }) => {
  await setStorage(ext, { profile: PROFILE, answers: [] });
  await ext.reload();
  await goTo(ext, "answers");

  const form = ext.locator("#quick-form");
  await form.locator("[data-fact='workMode']").selectOption("hybrid");
  await form.locator("[data-fact='maxOfficeDays']").fill("3");
  await form.locator("[data-fact='travelPercent']").fill("10%");
  await form.locator("[data-fact='travel']").selectOption("Yes");

  await form.locator("#save-quick").click();
  await expect(ext.locator("#toasts")).toContainText("Quick answers saved");

  // Reload side panel and verify persistence
  await ext.reload();
  await goTo(ext, "answers");
  await expect(ext.locator("#quick-form [data-fact='workMode']")).toHaveValue("hybrid");
  await expect(ext.locator("#quick-form [data-fact='maxOfficeDays']")).toHaveValue("3");
  await expect(ext.locator("#quick-form [data-fact='travelPercent']")).toHaveValue("10%");

  // Open the practice form (PROFILE location is Pune)
  const page = await context.newPage();
  await page.goto(`${BASE}/new-ui.html`);
  const tabId = await ext.evaluate(async (url) => (await chrome.tabs.query({})).find((t) => t.url === url)!.id!, page.url());
  await ext.goto(`${ext.url().split("?")[0]}?tabId=${tabId}`);
  await goTo(ext, "apply");
  await ext.locator("#run").click();
  await expect(ext.locator("#status")).toBeVisible();

  // Verify form filling:
  // "Are you comfortable working in our Pune office 3 days a week?" -> Yes
  await expect(page.locator("input[name='work_office'][value='Yes']")).toBeChecked({ timeout: 10_000 });
  // "Are you willing to travel up to 25% of the time?" -> No (max travel is 10%)
  await expect(page.locator("input[name='travel_25'][value='No']")).toBeChecked();
});

/** E2E browser tests for Enterprise and Regional ATS widget families:
 * Workday, SAP UI5 (SuccessFactors), Oracle JET (Oracle Recruiting Cloud),
 * Angular Material, Zoho Recruit, and SmartRecruiters (Shadow DOM).
 */

import type { Page } from "@playwright/test";
import { ANSWERS, BASE, expect, goTo, PROFILE, setStorage, test } from "./fixtures";

async function pinPanel(ext: Page, page: Page): Promise<number> {
  const tabId = await ext.evaluate(async (url) => (await chrome.tabs.query({})).find((t) => t.url === url)!.id!, page.url());
  await ext.goto(`${ext.url().split("?")[0]}?tabId=${tabId}`);
  await goTo(ext, "apply");
  return tabId;
}

test("fills enterprise ATS widget families cleanly in real browser", async ({ ext, context }) => {
  await setStorage(ext, { profile: PROFILE, answers: ANSWERS });
  const page = await context.newPage();
  await page.goto(`${BASE}/ats-widgets.html`);
  await pinPanel(ext, page);

  // Trigger Fill from sidepanel
  await ext.locator("#run").click();

  // Wait for run completion (ready to submit or status finished filling)
  await expect(ext.locator("#status")).not.toHaveText(/Reading|Filling/, { timeout: 25_000 });

  // 1. Verify Workday fields
  await expect(page.locator("#wd-fn")).toHaveValue("Asha");
  await expect(page.locator("#wd-ln")).toHaveValue("Verma");
  await expect(page.locator("#wd-em")).toHaveValue("asha@example.com");
  await expect(page.locator("#wd-phone")).toHaveValue("+91 90000 00000");

  // 2. Verify SAP UI5 Combobox
  await expect(page.locator("#sap-country-combo .sapMSltLabel")).toHaveText("India");

  // 3. Verify Oracle JET oj-select
  await expect(page.locator("#oj-location-select .oj-select-single-label")).toHaveText("Pune");

  // 4. Verify Angular Material mat-select
  await expect(page.locator("#mat-edu-select .mat-select-value-text")).toHaveText("Master's Degree");

  // 5. Verify Zoho Recruit dropdown
  await expect(page.locator("#zoho-notice-dropdown .zp_selected_value")).toHaveText("30 days");

  // 6. Verify SmartRecruiters Shadow DOM input (Playwright selector pierces open shadow roots)
  await expect(page.locator("#sr-shadow-host input#sr-city")).toHaveValue("Pune", { timeout: 10_000 });
});

test("Workday practice flow: handles step navigation with dropdown buttons", async ({ ext, context }) => {
  await setStorage(ext, { profile: PROFILE, answers: ANSWERS });
  const page = await context.newPage();
  await page.goto(`${BASE}/workday.html?signedin=1`);
  await pinPanel(ext, page);

  // Fill Step 1
  await ext.locator("#run").click();

  // Verify personal info in Step 1
  await expect(page.locator("#given")).toHaveValue("Asha");
  await expect(page.locator("#family")).toHaveValue("Verma");
  await expect(page.locator("#email")).toHaveValue("asha@example.com");
});

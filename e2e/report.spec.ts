/** "Report a problem" in real Chromium: after a run, the copied report has the page's questions and the agent's
 * decisions, and none of the user's details. */

import { ANSWERS, BASE, expect, goTo, PROFILE, setStorage, test } from "./fixtures";

test("report a problem copies questions and decisions, never the user's details", async ({ ext, context }) => {
  await setStorage(ext, { profile: PROFILE, answers: ANSWERS });
  const page = await context.newPage();
  await page.goto(`${BASE}/apply.html?ref=secret-token`);
  const tabId = await ext.evaluate(async (url) => (await chrome.tabs.query({})).find((t) => t.url === url)!.id!, page.url());
  await ext.goto(`${ext.url().split("?")[0]}?tabId=${tabId}`);
  await goTo(ext, "apply");
  await expect(ext.locator("#report-problem")).toBeHidden();
  await ext.locator("#run").click();
  await expect(ext.locator("#report-problem")).toBeVisible({ timeout: 10_000 });

  // Capture what would go to the clipboard.
  await ext.evaluate(() => {
    const w = window as unknown as { __copied: string };
    w.__copied = "";
    navigator.clipboard.writeText = async (text: string) => void (w.__copied = text);
  });
  await ext.locator("#report-problem").click();
  await expect(ext.locator("#toasts")).toContainText("never your answers");
  const copied = await ext.evaluate(() => (window as unknown as { __copied: string }).__copied);
  const report = JSON.parse(copied);
  expect(report.page).toBe(`${BASE}/apply.html`);
  expect(report.fields.map((f: { question: string }) => f.question)).toContain("First Name");
  for (const secret of [PROFILE.email, PROFILE.firstName, PROFILE.lastName, PROFILE.phone, "secret-token", "30 days"]) {
    expect(copied, secret).not.toContain(secret);
  }
});

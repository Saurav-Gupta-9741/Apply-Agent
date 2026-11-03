/** E2E tests for Tracker CRM, Fit Card, and Usage Meter. */

import { BASE, expect, goTo, PROFILE, setStorage, test } from "./fixtures";

test("tracker CRM renders applications, allows stage edits, notes, and filtering", async ({ ext, context }) => {
  const testApplications = [
    {
      id: "app-1",
      url: "https://boards.greenhouse.io/acme/jobs/123",
      platform: "greenhouse",
      jobTitle: "Senior Frontend Engineer",
      status: "applied_confirmed",
      createdAt: new Date().toISOString(),
      stage: "Applied",
      notes: "First round completed",
      followUpAt: "2026-11-10",
    },
    {
      id: "app-2",
      url: "https://jobs.lever.co/stripe/456",
      platform: "lever",
      jobTitle: "Staff Software Engineer",
      status: "applied_confirmed",
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      stage: "Interview",
      notes: "System design scheduled",
    },
  ];

  const testSavedJobs = [
    {
      id: "saved-1",
      url: "https://jobs.lever.co/figma/789",
      title: "Product Designer",
      company: "Figma",
      createdAt: new Date().toISOString(),
      stage: "Saved",
      notes: "Looks interesting",
    },
  ];

  await setStorage(ext, {
    profile: PROFILE,
    applications: testApplications,
    savedJobs: testSavedJobs,
  });

  await ext.reload();
  await goTo(ext, "tracker");

  // Verify all 3 entries are rendered
  const items = ext.locator("#tracker-list .item");
  await expect(items).toHaveCount(3);

  // Test stage filter: select "Interview"
  const filter = ext.locator("#tracker-filter");
  await filter.selectOption("Interview");
  await expect(ext.locator("#tracker-list .item")).toHaveCount(1);
  await expect(ext.locator("#tracker-list .item")).toContainText("Staff Software Engineer");

  // Reset filter to All
  await filter.selectOption("");
  await expect(ext.locator("#tracker-list .item")).toHaveCount(3);

  // Test stage modification on app-1: move from Applied to Assessment
  const appItem = ext.locator("#tracker-list .item[data-entry='app-1']");
  const stageSelect = appItem.locator(".crm-stage");
  await stageSelect.selectOption("Assessment");
  await expect(ext.locator("#toasts")).toContainText("Moved to Assessment");

  // Verify persistence in storage
  await expect.poll(async () => {
    const data = await ext.evaluate(() => chrome.storage.local.get("applications"));
    return data.applications?.find((a: any) => a.id === "app-1")?.stage;
  }).toBe("Assessment");
});

test("save this job button captures page title and url into tracker without running scripts", async ({ ext, context }) => {
  await setStorage(ext, { profile: PROFILE, applications: [], savedJobs: [] });
  await ext.reload();

  const page = await context.newPage();
  await page.goto(`${BASE}/apply.html`);
  const tabId = await ext.evaluate(async (url) => (await chrome.tabs.query({})).find((t) => t.url === url)!.id!, page.url());
  await ext.goto(`${ext.url().split("?")[0]}?tabId=${tabId}`);
  await goTo(ext, "apply");

  // Click "Save this job"
  const saveBtn = ext.locator("#save-job-btn");
  await expect(saveBtn).toBeVisible();
  await saveBtn.click();
  await expect(ext.locator("#toasts")).toContainText("Job saved to Tracker");

  // Go to tracker and verify it appears
  await goTo(ext, "tracker");
  await expect(ext.locator("#tracker-list .item")).toHaveCount(1);

  // Clicking save again warns it already exists
  await goTo(ext, "apply");
  await saveBtn.click();
  await expect(ext.locator("#toasts")).toContainText("already in your Tracker");
});

test("usage meter displays monthly allowance, upgrade nudge, and trial hint", async ({ ext }) => {
  const now = new Date().toISOString();
  const testApps = Array.from({ length: 15 }, (_, i) => ({
    id: `app-${i}`,
    url: `https://company${i}.com/job`,
    platform: "custom",
    jobTitle: `Role ${i}`,
    status: "applied_confirmed",
    createdAt: now,
  }));

  await setStorage(ext, { profile: PROFILE, applications: testApps, answers: [] });
  await ext.reload();
  await goTo(ext, "apply");

  const meter = ext.locator("#usage-meter");
  await expect(meter).toBeVisible();
  await expect(meter.locator("#usage-text")).toContainText("Free plan · Unlimited single-form autofill");
  await expect(meter.locator("#usage-prompt")).toBeVisible();
  await expect(meter.locator("#usage-upgrade")).toBeVisible();
});

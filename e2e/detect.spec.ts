/** Silent detection in real Chromium: the registered read-only detector, the toolbar badge, the panel's detection
 * card, opening the application from a job page, and the hands-off platform policy. */

import type { Page } from "@playwright/test";
import type { QueueItem, Settings } from "../src/shared/types";
import { ANSWERS, BASE, expect, getStorage, goTo, PROFILE, setStorage, test } from "./fixtures";

async function useDetection(ext: Page, detection: Settings["detection"]): Promise<void> {
  const settings = (await getStorage<Settings>(ext, "settings")) ?? {};
  await setStorage(ext, { profile: PROFILE, answers: ANSWERS, settings: { ...settings, detection } });
  await ext.evaluate(() => chrome.runtime.sendMessage({ type: "DETECTION_SYNC" }));
}

async function tabIdOf(ext: Page, url: string): Promise<number> {
  return ext.evaluate(async (u) => (await chrome.tabs.query({})).find((t) => t.url === u)!.id!, url);
}

const badge = (ext: Page, tabId: number) => ext.evaluate((id) => chrome.action.getBadgeText({ tabId: id }), tabId);
const detected = async (ext: Page, tab: number | Promise<number>) =>
  ext.evaluate(async (id) => ((await chrome.storage.session.get(`detect:${id}`))[`detect:${id}`] as { detection?: { kind: string } } | undefined)?.detection?.kind, await tab);

test("an application form is recognised on its own (nothing typed) and the badge says what can be filled", async ({ ext, context }) => {
  await useDetection(ext, "allowed_sites");
  const page = await context.newPage();
  await page.goto(`${BASE}/apply.html`);
  const tabId = await tabIdOf(ext, page.url());
  await expect.poll(() => detected(ext, tabId)).toBe("application_form");
  await expect.poll(() => badge(ext, tabId)).toMatch(/^(✓|\d+)$/);
  await expect(page.locator("#first_name")).toHaveValue(""); // read-only: nothing was filled

  await ext.goto(`${ext.url().split("?")[0]}?tabId=${tabId}`);
  await goTo(ext, "apply");
  await expect(ext.locator("#detect-box")).toBeVisible();
  await expect(ext.locator("#detect-title")).toHaveText("Application form detected");
  await expect(ext.locator("#detect-text")).toContainText("Nothing is typed until you press Fill");
});

test("a job page shows 'Open the application'; it opens the form and detection follows", async ({ ext, context }) => {
  await useDetection(ext, "allowed_sites");
  const page = await context.newPage();
  await page.goto(`${BASE}/job.html`);
  const tabId = await tabIdOf(ext, page.url());
  await expect.poll(() => detected(ext, tabId)).toBe("job_page");
  await expect.poll(() => badge(ext, tabId)).toBe("•");

  await ext.goto(`${ext.url().split("?")[0]}?tabId=${tabId}`);
  await goTo(ext, "apply");
  await expect(ext.locator("#detect-title")).toHaveText("Job page: Data Engineer");
  await ext.locator("#open-application").click();
  await page.waitForURL(`${BASE}/apply.html`);
  await expect.poll(() => detected(ext, tabId)).toBe("application_form");
  await expect(ext.locator("#detect-title")).toHaveText("Application form detected");
});

test("a form that opens in place after 'Apply' is noticed by the quiet re-check", async ({ ext, context }) => {
  await useDetection(ext, "allowed_sites");
  const page = await context.newPage();
  await page.goto(`${BASE}/job.html?inline=1`);
  const tabId = await tabIdOf(ext, page.url());
  await expect.poll(() => detected(ext, tabId)).toBe("job_page");
  await ext.goto(`${ext.url().split("?")[0]}?tabId=${tabId}`);
  await goTo(ext, "apply");
  await ext.locator("#open-application").click(); // a button: clicked on the page, form rendered later
  await expect(page.locator("#application-form")).toBeVisible();
  await expect.poll(() => detected(ext, tabId), { timeout: 10_000 }).toBe("application_form");
  await expect(page.locator("#first_name")).toHaveValue("");
});

test("a sign-in wall is recognised and the panel asks the user to sign in themselves", async ({ ext, context }) => {
  await useDetection(ext, "allowed_sites");
  const page = await context.newPage();
  await page.goto(`${BASE}/login.html`);
  const tabId = await tabIdOf(ext, page.url());
  await expect.poll(() => badge(ext, tabId)).toBe("!");
  await ext.goto(`${ext.url().split("?")[0]}?tabId=${tabId}`);
  await goTo(ext, "apply");
  await expect(ext.locator("#detect-text")).toContainText("never handles passwords");
  await expect(page.locator("input[type='password']")).toHaveValue("");
});

test("detection stays off where the user didn't choose it: 'Off', and 'Job sites only' on a non-job site", async ({ ext, context }) => {
  for (const detection of ["off", "job_sites"] as const) {
    await useDetection(ext, detection);
    const page = await context.newPage();
    await page.goto(`${BASE}/apply.html?mode=${detection}`);
    const tabId = await tabIdOf(ext, page.url());
    await page.waitForTimeout(1500);
    expect(await badge(ext, tabId), detection).toBe("");
    expect(await detected(ext, tabId), detection).toBeUndefined();
    await page.close();
  }
  // The page script is still there (it must answer the panel), but it read nothing and reported nothing.
  const registered = await ext.evaluate(() => chrome.scripting.getRegisteredContentScripts());
  expect(registered.flatMap((s) => s.excludeMatches ?? [])).toContain("*://*.linkedin.com/*");
});

test("the setting in Profile & plan switches detection on and off", async ({ ext, context }) => {
  await setStorage(ext, { profile: PROFILE, answers: ANSWERS });
  await goTo(ext, "profile");
  await ext.locator("#set-detection").selectOption("off");
  await expect.poll(async () => (await getStorage<Settings>(ext, "settings"))?.detection).toBe("off");
  const quiet = await context.newPage();
  await quiet.goto(`${BASE}/apply.html?setting=off`);
  await quiet.waitForTimeout(1500);
  expect(await badge(ext, await tabIdOf(ext, quiet.url()))).toBe("");

  await ext.locator("#set-detection").selectOption("allowed_sites");
  await expect.poll(async () => (await getStorage<Settings>(ext, "settings"))?.detection).toBe("allowed_sites");
  const seen = await context.newPage();
  await seen.goto(`${BASE}/apply.html?setting=on`);
  await expect.poll(() => detected(ext, tabIdOf(ext, seen.url()))).toBe("application_form");
});

test("hands-off platforms: LinkedIn and Naukri links never enter the queue, and the panel says why", async ({ ext }) => {
  await goTo(ext, "queue");
  await ext.locator("#paste-urls").fill([
    "https://www.linkedin.com/jobs/view/4012345678", "https://www.naukri.com/job-listings-data-engineer-acme-1",
    "https://jobs.lever.co/acme/1",
  ].join("\n"));
  await ext.locator("#add-pasted").click();
  await expect(ext.locator("#toasts")).toContainText("doesn't allow automated applications");
  await expect.poll(async () => ((await getStorage<QueueItem[]>(ext, "queue")) ?? []).map((q) => q.url))
    .toEqual(["https://jobs.lever.co/acme/1"]);

  // The background refuses them too, whoever sends them.
  await ext.evaluate(() => chrome.runtime.sendMessage({ type: "QUEUE_ADD", jobs: [{ url: "https://in.indeed.com/viewjob?jk=1", title: "", company: "" }] }));
  expect(((await getStorage<QueueItem[]>(ext, "queue")) ?? []).length).toBe(1);
});

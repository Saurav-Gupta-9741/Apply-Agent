/** Safe pacing and consent review in real Chromium: a robot check stops the run (never solved), the queue keeps to
 * the user's limits, and consent boxes are ticked only one at a time by the user. */

import type { Page } from "@playwright/test";
import type { QueueItem } from "../src/shared/types";
import { ANSWERS, BASE, expect, getStorage, goTo, OTHER_SITE, setStorage, setup, test } from "./fixtures";

async function pinPanel(ext: Page, page: Page): Promise<void> {
  const tabId = await ext.evaluate(async (url) => (await chrome.tabs.query({})).find((t) => t.url === url)!.id!, page.url());
  await ext.goto(`${ext.url().split("?")[0]}?tabId=${tabId}`);
  await goTo(ext, "apply");
}

async function send(ext: Page, message: unknown) {
  return ext.evaluate((m) => chrome.runtime.sendMessage(m), message);
}

test("a reCAPTCHA-like frame stops the fill at once with the challenge message, and the queue backs off", async ({ ext, context }) => {
  await setup(ext, ANSWERS);
  const page = await context.newPage();
  await page.goto(`${BASE}/challenge.html`);
  await pinPanel(ext, page);
  await ext.locator("#run").click();
  await expect(ext.locator("#status")).toContainText("ApplyAgent stopped: the site is showing a CAPTCHA", { timeout: 30_000 });
  await expect(ext.locator("#status")).toContainText("never solves or gets past");
  // Nothing was typed, nothing submitted.
  expect(await page.locator("#first_name").inputValue()).toBe("");
  expect(await page.evaluate(() => sessionStorage.getItem("submits"))).toBeNull();
  // The background paused the queue (10 min) and this site (30 min).
  await expect.poll(async () => ((await getStorage<{ queuePausedUntil: number }>(ext, "pacingState"))?.queuePausedUntil ?? 0) > Date.now() + 8 * 60_000)
    .toBe(true);
  const state = await getStorage<{ sitePausedUntil: Record<string, number> }>(ext, "pacingState");
  expect(state.sitePausedUntil["127.0.0.1"]).toBeGreaterThan(Date.now() + 28 * 60_000);
});

test("a queued job on a robot-check page stops with a clear note and pauses the queue", async ({ ext }) => {
  await setup(ext, ANSWERS);
  await setStorage(ext, { settings: { mode: "auto", maxParallel: 1, perHostMax: 1, dailyCap: 25, cooldownDays: 30 } });
  await send(ext, { type: "QUEUE_ADD", jobs: [{ url: `${BASE}/challenge.html`, title: "Backend Engineer", company: "Acme" }] });
  await send(ext, { type: "QUEUE_START" });
  await expect.poll(async () => (await getStorage<QueueItem[]>(ext, "queue"))?.[0]?.status, { timeout: 45_000 }).toBe("needs_user");
  const [item] = await getStorage<QueueItem[]>(ext, "queue");
  expect(item?.note).toMatch(/showed a CAPTCHA/);
  expect(item?.note).toMatch(/never solves or bypasses/);
  expect(item?.note).toMatch(/queue until \d\d:\d\d/);
});

test("the queue keeps to the hourly limit: the next job waits with the reason and the time", async ({ ext }) => {
  await setup(ext, ANSWERS);
  await setStorage(ext, {
    settings: { mode: "review", maxParallel: 3, perHostMax: 2, dailyCap: 25, cooldownDays: 30 },
    pacing: { maxPerHour: 1 },
  });
  await send(ext, {
    type: "QUEUE_ADD",
    jobs: [
      { url: `${BASE}/apply.html`, title: "Backend Engineer", company: "Acme" },
      { url: `${OTHER_SITE}/apply.html`, title: "Backend Engineer", company: "Globex" },
    ],
  });
  await send(ext, { type: "QUEUE_START" });
  await expect.poll(async () => ((await getStorage<QueueItem[]>(ext, "queue")) ?? []).map((q) => q.status).sort().join(","), { timeout: 45_000 })
    .toBe("queued,ready");
  const waiting = (await getStorage<QueueItem[]>(ext, "queue")).find((q) => q.status === "queued")!;
  expect(waiting.note).toMatch(/^Waiting: 1 started this hour \(your safe pace\)\. Next at \d\d:\d\d\.$/);
  expect(waiting.waitUntil).toBeGreaterThan(Date.now() + 50 * 60_000);

  await goTo(ext, "queue");
  await expect(ext.locator("#pacing-status")).toContainText("1 of 1 this hour · 1 of 40 today · next at");
  await expect(ext.locator("#queue-list")).toContainText("Waiting");
});

test("consent boxes: none ticked by a fill; 'Tick this box' ticks only that one; a changed label is refused", async ({ ext, context }) => {
  await setup(ext, ANSWERS);
  const page = await context.newPage();
  await page.goto(`${BASE}/consent.html`);
  await pinPanel(ext, page);
  await ext.locator("#run").click();

  const items = ext.locator("#consent-list .consent-item");
  await expect(items).toHaveCount(3, { timeout: 30_000 });
  await expect(page.locator("#first_name")).toHaveValue("Asha"); // the rest was filled
  const ticked = () => page.evaluate(() => ["c-terms", "c-certify", "c-sms"].map((id) => (document.getElementById(id) as HTMLInputElement).checked));
  expect(await ticked()).toEqual([false, false, false]);
  // Required legal boxes first, the marketing opt-in last; each with its full text and tag.
  await expect(items.nth(0)).toContainText("Legal — read carefully");
  await expect(items.nth(0)).toContainText("Required by form");
  await expect(items.nth(2)).toContainText("I agree to receive marketing texts and WhatsApp messages about future jobs");
  await expect(items.nth(2)).toContainText("Marketing");
  await expect(items.nth(2)).toContainText("Optional");
  await expect(ext.getByRole("button", { name: /tick all/i })).toHaveCount(0);

  // One click ticks one box.
  const certify = items.filter({ hasText: "I certify that the information" });
  await certify.getByRole("button", { name: "Tick this box" }).click();
  await expect.poll(ticked).toEqual([false, true, false]);
  await expect(items.filter({ hasText: "I certify that the information" })).toContainText("Ticked");

  // The page changes the text of another box after the user read it: refused, nothing ticked.
  await page.evaluate(() => {
    const label = document.getElementById("c-terms")!.parentElement!;
    label.lastChild!.textContent = " I agree to the Terms of Use, the arbitration agreement and to waive any class action *";
  });
  await items.filter({ hasText: "I agree to the Terms of Use and the arbitration agreement" }).getByRole("button", { name: "Tick this box" }).click();
  await expect(ext.locator("#status")).toContainText("Nothing was ticked");
  expect(await ticked()).toEqual([false, true, false]);
});

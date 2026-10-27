/** Accessibility of the side panel, checked by axe-core in real Chromium: every section, with real content on
 * screen (questions, field details, queue items, saved answers), plus keyboard order and live regions. */

import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { ANSWERS, BASE, expect, goTo, PROFILE, setStorage, test } from "./fixtures";

const SECTIONS = ["apply", "jobs", "queue", "tracker", "answers", "profile"];

/** Sections fade in; contrast is measured once the animation is over. */
async function settled(ext: Page): Promise<void> {
  await ext.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running"));
}

async function pinToForm(ext: Page, page: Page): Promise<void> {
  await page.goto(`${BASE}/apply.html`);
  const tabId = await ext.evaluate(async (url) => (await chrome.tabs.query({})).find((t) => t.url === url)!.id!, page.url());
  await ext.goto(`${ext.url().split("?")[0]}?tabId=${tabId}`);
}

test("no WCAG A/AA violations in any section, with real content on screen", async ({ ext, context }) => {
  await setStorage(ext, {
    profile: PROFILE, answers: ANSWERS.slice(1),
    queue: [{ id: "q", url: `${BASE}/apply.html`, title: "Backend Engineer", company: "Acme", status: "needs_user",
      note: "2 question(s) need your answer", addedAt: "2026-10-26T00:00:00Z", updatedAt: "2026-10-26T00:00:00Z" }],
    applications: [{ id: "a", url: `${BASE}/apply.html`, platform: "generic", jobTitle: "Backend Engineer", status: "applied_confirmed",
      createdAt: "2026-10-26T00:00:00Z", confirmationText: "Thank you for applying" }],
  });
  await pinToForm(ext, await context.newPage());
  await ext.locator("#run").click(); // questions, chips and field details on screen
  await expect(ext.locator("#status")).toBeVisible();
  await ext.locator("#fields-box summary").click();
  const problems: string[] = [];
  for (const section of SECTIONS) {
    await goTo(ext, section);
    await settled(ext);
    const result = await new AxeBuilder({ page: ext }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    for (const v of result.violations) {
      problems.push(`${section}: ${v.id} (${v.impact}) ${v.nodes.slice(0, 3).map((n) => `${n.target.join(" ")} ${n.any[0]?.message ?? ""}`).join(" | ")}`);
    }
  }
  expect(problems).toEqual([]);
});

test("keyboard: Fill then Preview in order after the navigation, with a visible focus ring", async ({ ext, context }) => {
  await setStorage(ext, { profile: PROFILE });
  await pinToForm(ext, await context.newPage());
  await goTo(ext, "apply");
  await ext.locator("body").click({ position: { x: 1, y: 1 } });
  const order: string[] = [];
  for (let i = 0; i < 30; i++) {
    await ext.keyboard.press("Tab");
    order.push(await ext.evaluate(() => document.activeElement?.id || ""));
  }
  const run = order.indexOf("run");
  expect(run, order.join(" > ")).toBeGreaterThan(-1);
  expect(order[run + 1]).toBe("preview");
  expect(order.indexOf("open-application") === -1 || order.indexOf("open-application") < run).toBe(true);
  const ring = await ext.locator("#run").evaluate((el) => {
    const s = getComputedStyle(el);
    return `${s.boxShadow} ${s.outlineStyle}`;
  });
  expect(ring).not.toMatch(/^none none$/);
});

test("status messages and findings are announced to screen readers", async ({ ext }) => {
  await goTo(ext, "apply");
  expect(await ext.locator("#status").getAttribute("role")).toBe("status");
  expect(await ext.locator("#toasts").getAttribute("aria-live")).toBe("polite");
  expect(await ext.locator("#detect-box").getAttribute("aria-live")).toBe("polite");
});

/** The side panel UI in real Chromium (the fixture fails any test that throws a page error). */

import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Profile, QueueItem } from "../src/shared/types";
import { ANSWERS, BASE, expect, getStorage, goTo, PROFILE, setStorage, test } from "./fixtures";

test("profile: values are saved and survive a reload", async ({ ext }) => {
  await goTo(ext, "profile");
  await ext.locator("#profile-form input[name='firstName']").fill("Ravi");
  await ext.locator("#profile-form input[name='targetRoles']").fill("Backend Engineer");
  await ext.locator("#save-profile").click();
  await expect.poll(async () => (await getStorage<Profile>(ext, "profile"))?.firstName).toBe("Ravi");
  await ext.reload();
  await goTo(ext, "profile");
  await expect(ext.locator("#profile-form input[name='targetRoles']")).toHaveValue("Backend Engineer");
});

test("jobs: a feed file is filtered by the profile, with reasons shown", async ({ ext }) => {
  await setStorage(ext, { profile: PROFILE });
  const job = (overrides: Record<string, unknown>) => ({
    id: String(Math.random()), company: "Acme", platform: "greenhouse", title: "Backend Engineer", location: "Pune, India",
    is_india: true, is_remote: false, work_mode: "", seniority: "", exp_min: null, exp_max: null, employment_type: "",
    posted_at: new Date().toISOString(), first_seen_at: new Date().toISOString(), quality_score: 80,
    url: "https://boards.greenhouse.io/acme/jobs/1", ...overrides,
  });
  const feed = { version: 1, jobs: [job({}), job({ location: "Berlin, Germany", is_india: false }), job({ location: "Remote - US", is_remote: true, is_india: false })] };
  const file = join(mkdtempSync(join(tmpdir(), "feed-")), "feed.json");
  writeFileSync(file, JSON.stringify(feed));

  await ext.reload(); // pick up the stored profile
  await goTo(ext, "jobs");
  await ext.locator("#feed-file").setInputFiles(file);
  await expect(ext.locator("[data-stat='jobs']")).toHaveText("3");
  await expect(ext.locator("[data-stat='matches']")).toHaveText("1");
  await expect(ext.locator("[data-stat='filtered']")).toHaveText("2");
  await expect(ext.locator("#feed-list li")).toHaveCount(1);
  await expect(ext.locator("#feed-list li").first()).toContainText('Matches "Backend Engineer"');

  await ext.locator("#feed-add-good").click();
  await expect.poll(async () => ((await getStorage<QueueItem[]>(ext, "queue")) ?? []).length).toBe(1);
});

test("queue: pasted links are added once, invalid lines ignored", async ({ ext }) => {
  await goTo(ext, "queue");
  await ext.locator("#paste-urls").fill("https://jobs.lever.co/acme/1\nnot a link\nhttps://jobs.lever.co/acme/1\nhttps://jobs.ashbyhq.com/globex/2");
  await ext.locator("#add-pasted").click();
  await expect(ext.locator("#queue-list li")).toHaveCount(2);
  await expect(ext.locator("#queue-summary")).toContainText("2 queued");
});

test("answers: page text is shown as text, never as markup (no script injection into the extension)", async ({ ext }) => {
  await setStorage(ext, {
    answers: [...ANSWERS, { question: '<img src=x onerror="window.__xss=1">Evil question', answer: "<b>bold?</b>", updatedAt: "2026-10-25" }],
  });
  await goTo(ext, "answers");
  await expect(ext.locator("#answer-list")).toContainText('<img src=x onerror="window.__xss=1">Evil question');
  await expect(ext.locator("#answer-list img")).toHaveCount(0);
  expect(await ext.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();

  await ext.locator("#answer-list li", { hasText: "Evil question" }).getByRole("button", { name: "Delete" }).click();
  await expect(ext.locator("#answer-list")).not.toContainText("Evil question");
});

test("plan: free allowance is shown", async ({ ext }) => {
  await goTo(ext, "profile");
  await expect(ext.locator("#plan-status")).toContainText("Free · 20 of 20 applications left this month");
});

test("narrow side panel: the drawer slides in, is keyboard friendly, and closes with Esc", async ({ ext }) => {
  await ext.setViewportSize({ width: 380, height: 760 });
  const toggle = ext.locator("#nav-toggle");
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await expect(ext.locator("#drawer")).toHaveClass(/open/);
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(ext.locator("#scrim")).toBeVisible();
  await ext.keyboard.press("Escape");
  await expect(ext.locator("#drawer")).not.toHaveClass(/open/);
  await expect(ext.locator("#scrim")).toBeHidden();

  await goTo(ext, "queue");
  await expect(ext.locator("#section-title")).toHaveText("Queue");
  await expect(ext.locator("#drawer [data-section='queue']")).toHaveAttribute("aria-current", "page");
});

test("the bundled Inter font loads (no remote font requests)", async ({ ext }) => {
  await ext.evaluate(() => document.fonts.ready);
  expect(await ext.evaluate(() => document.fonts.check("13px Inter"))).toBe(true);
  expect(await ext.evaluate(() => getComputedStyle(document.body).fontFamily)).toContain("Inter");
});

test("apply flow through the panel's own buttons: fill, answer in the panel, submit, applied", async ({ ext, context }) => {
  await setStorage(ext, { profile: PROFILE, answers: ANSWERS.filter((a) => a.question !== "Are you legally authorized to work in India?") });
  const page = await context.newPage();
  await page.goto(`${BASE}/apply.html`);
  const tabId = await ext.evaluate(async (url) => (await chrome.tabs.query({})).find((t) => t.url === url)!.id!, page.url());
  await ext.goto(`${ext.url().split("?")[0]}?tabId=${tabId}`);
  await goTo(ext, "apply");
  await expect(ext.locator("#page-access")).toHaveText("Allowed");

  await ext.locator("#run").click();
  await expect(ext.locator("#status")).toContainText("Answer the questions below");
  const question = ext.locator(".question", { hasText: "Are you legally authorized to work in India?" });
  await expect(question).toContainText("Sensitive");
  await question.locator("select").selectOption("Yes");
  await question.getByRole("button", { name: "Save answer" }).click();

  await expect(ext.locator("#status")).toContainText("Every required field is filled");
  await expect(page.locator("input[name='auth'][value='yes']")).toBeChecked();
  await ext.locator("#submit").click();
  await expect(ext.locator("#status")).toContainText("Applied");
  await expect(ext.locator("[data-count='tracker']")).toHaveText("1");
});

test("preview reads a form without typing or uploading anything", async ({ ext, context }) => {
  await setStorage(ext, { profile: PROFILE });
  const page = await context.newPage();
  await page.goto(`${BASE}/apply.html`);
  const tabId = await ext.evaluate(async (url) => (await chrome.tabs.query({})).find((t) => t.url === url)!.id!, page.url());
  await ext.goto(`${ext.url().split("?")[0]}?tabId=${tabId}`);
  await goTo(ext, "apply");
  await ext.locator("#preview").click();
  await expect(ext.locator("#status")).toContainText("Nothing was typed or uploaded");
  await expect(ext.locator("#fields-box")).toHaveAttribute("open", "");
  await expect(ext.locator("#submit")).toBeHidden();
  await expect(page.locator("#first_name")).toHaveValue("");
  await expect(page.locator("#file-name")).toHaveText("");
});

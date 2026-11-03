/** E2E for the features wired in by arena-fix: tracker Board view, interview prep / follow-up drafts, and Discover
 * (job-board feeds stubbed, so no real network). */

import { expect, getStorage, goTo, PROFILE, setStorage, test } from "./fixtures";

const SAVED = [
  { id: "saved-1", url: "https://jobs.lever.co/figma/789", title: "Product Designer", company: "Figma", createdAt: new Date().toISOString(), stage: "Saved" },
  { id: "saved-2", url: "https://boards.greenhouse.io/acme/jobs/1", title: "QA Engineer", company: "Acme", createdAt: new Date().toISOString(), stage: "Assessment" },
];

test("tracker Board view shows every stage and moves a job with the arrow button", async ({ ext }) => {
  await setStorage(ext, { profile: PROFILE, savedJobs: SAVED });
  await ext.reload();
  await goTo(ext, "tracker");
  await ext.locator("#tracker-view-toggle").click();
  await expect(ext.locator("#tracker-board")).toBeVisible();
  await expect(ext.locator("#tracker-list")).toBeHidden();
  await expect(ext.locator("#tracker-board .kanban-column")).toHaveCount(7);
  // A job in Assessment is on the board (it used to have no column).
  await expect(ext.locator('#tracker-board .kanban-column[data-stage="Assessment"] .kanban-card')).toHaveCount(1);

  await ext.locator('#tracker-board .kanban-card[data-id="saved-1"] .btn-stage-next').click();
  await expect.poll(async () => (await getStorage<Array<{ id: string; stage: string }>>(ext, "savedJobs")).find((j) => j.id === "saved-1")?.stage).toBe("Applied");

  // The choice of view is remembered.
  await ext.reload();
  await goTo(ext, "tracker");
  await expect(ext.locator("#tracker-board")).toBeVisible();
  await expect(ext.locator("#tracker-view-toggle")).toHaveText("List view");
});

test("interview prep and follow-up email are drafts to copy, never typed anywhere", async ({ ext }) => {
  await setStorage(ext, { profile: PROFILE, savedJobs: SAVED.slice(0, 1) });
  await ext.reload();
  await goTo(ext, "tracker");
  const item = ext.locator("#tracker-list .item").first();
  await item.getByRole("button", { name: "Interview prep" }).click();
  const panel = item.locator(".draft-panel");
  await expect(panel).toBeVisible();
  await expect(panel.locator("textarea")).toHaveValue(/Questions you may be asked/);
  await expect(panel.getByRole("button", { name: "Copy prompt for your AI" })).toBeVisible();
  await panel.getByRole("button", { name: "Close" }).click();
  await expect(panel).toHaveCount(0);

  await item.getByRole("button", { name: "Follow-up email" }).click();
  await expect(item.locator(".draft-panel textarea")).toHaveValue(/^Subject: Following up regarding Product Designer/);
});

test("Discover reads public job boards and saves a match to the tracker", async ({ ext, context }) => {
  test.setTimeout(120_000);
  await context.route(/https:\/\/boards-api\.greenhouse\.io\/.*/, (route) => route.fulfill({
    status: 200, contentType: "application/json",
    body: JSON.stringify({ jobs: [{ id: 1, title: "Backend Engineer", absolute_url: "https://boards.greenhouse.io/sample/jobs/1", location: { name: "Pune, India" }, updated_at: new Date().toISOString(), content: "Python SQL" }] }),
  }));
  await context.route(/https:\/\/(api\.lever\.co|api\.ashbyhq\.com|api\.smartrecruiters\.com|[^/]+\.recruitee\.com|[^/]+\.jobs\.personio\.de|apply\.workable\.com)\/.*/,
    (route) => route.fulfill({ status: 404, body: "" }));
  await setStorage(ext, { profile: { ...PROFILE, targetRoles: "Backend Engineer" } });
  await ext.reload();
  // The permission prompt cannot be clicked in a headless test: grant it the way the user would.
  await ext.evaluate(() => { (chrome.permissions as unknown as { request: () => Promise<boolean> }).request = async () => true; });
  await goTo(ext, "jobs");
  await ext.locator("#discover-run").click();
  await expect(ext.locator("#discover-status")).toContainText("matches from", { timeout: 100_000 });
  const card = ext.locator("#discover-list .job-card").first();
  await expect(card).toContainText("Backend Engineer");
  await card.locator(".btn-save-tracker").click();
  await expect.poll(async () => ((await getStorage<Array<{ url: string }>>(ext, "savedJobs")) ?? []).map((j) => j.url))
    .toContain("https://boards.greenhouse.io/sample/jobs/1");
});

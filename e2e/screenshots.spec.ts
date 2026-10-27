/** Renders each side-panel section with realistic data and saves screenshots for visual review.
 * Run with: SHOTS=1 npx playwright test e2e/screenshots.spec.ts  (images in test-results/shots) */
import type { Page } from "@playwright/test";
import { ANSWERS, BASE, goTo, PROFILE, setStorage, test } from "./fixtures";

test.skip(!process.env.SHOTS, "screenshots run only with SHOTS=1");

const now = Date.now();
const ago = (m: number) => new Date(now - m * 60_000).toISOString();

async function seed(ext: Page) {
  await setStorage(ext, {
    profile: PROFILE, answers: ANSWERS,
    applications: [
      { id: "a1", url: "https://boards.greenhouse.io/figma/jobs/1", platform: "greenhouse", jobTitle: "Backend Engineer", status: "applied_confirmed", createdAt: ago(40), confirmationText: "Thank you for applying! We received your application." },
      { id: "a2", url: "https://jobs.lever.co/zeta/2", platform: "lever", jobTitle: "Data Engineer", status: "needs_check", createdAt: ago(300) },
      { id: "a3", url: "https://jobs.ashbyhq.com/notion/3", platform: "ashby", jobTitle: "Software Engineer, Platform", status: "applied_confirmed", createdAt: ago(1500), confirmationText: "Your application was successfully submitted." },
    ],
    queue: [
      { id: "q1", url: "https://jobs.lever.co/paytm/1/apply", title: "Backend Engineer", company: "Paytm", status: "running", addedAt: ago(5), updatedAt: ago(1), note: "Opening…" },
      { id: "q2", url: "https://boards.greenhouse.io/embed/job_app?for=stripe&token=2", title: "Software Engineer", company: "Stripe", status: "ready", addedAt: ago(9), updatedAt: ago(2), note: "Filled. Review the tab, then press Submit." },
      { id: "q3", url: "https://jobs.ashbyhq.com/atlan/3/application", title: "Platform Engineer", company: "Atlan", status: "needs_user", addedAt: ago(12), updatedAt: ago(3), note: "2 question(s) need your answer" },
      { id: "q4", url: "https://jobs.lever.co/meesho/4/apply", title: "Product Analyst", company: "Meesho", status: "applied", addedAt: ago(20), updatedAt: ago(8), note: "Thank you for applying!" },
      { id: "q5", url: "https://jobs.lever.co/meesho/5/apply", title: "Data Analyst", company: "Meesho", status: "skipped", addedAt: ago(20), updatedAt: ago(8), note: "Another application to this company is already in this run" },
    ],
    feedCache: { jobs: [
      { id: "1", company: "Stripe", platform: "greenhouse", title: "Backend Engineer, Payments", location: "Bengaluru, India", is_india: true, is_remote: false, work_mode: "", seniority: "", exp_min: 1, exp_max: 3, employment_type: "", posted_at: ago(600), first_seen_at: ago(600), quality_score: 90, url: "https://example.com/1" },
      { id: "2", company: "Atlan", platform: "ashby", title: "Backend Engineer", location: "Remote", is_india: false, is_remote: true, work_mode: "remote", seniority: "", exp_min: null, exp_max: null, employment_type: "", posted_at: ago(2000), first_seen_at: ago(2000), quality_score: 85, url: "https://example.com/2" },
      { id: "3", company: "Groww", platform: "greenhouse", title: "Data Engineer II", location: "Pune, India", is_india: true, is_remote: false, work_mode: "", seniority: "", exp_min: 2, exp_max: 4, employment_type: "", posted_at: ago(9000), first_seen_at: ago(9000), quality_score: 80, url: "https://example.com/3" },
      { id: "4", company: "Figma", platform: "greenhouse", title: "Product Designer", location: "San Francisco", is_india: false, is_remote: false, work_mode: "", seniority: "", exp_min: null, exp_max: null, employment_type: "", posted_at: ago(100), first_seen_at: ago(100), quality_score: 85, url: "https://example.com/4" },
    ] },
    queueRunning: false, // shown as data only: the background must not start working on these sample jobs
  });
  await setStorage(ext, { profile: { ...PROFILE, targetRoles: "Backend Engineer, Data Engineer" } });
}

for (const [width, label] of [[400, "narrow"], [760, "wide"]] as const) {
  test(`screenshots (${label})`, async ({ ext, context }) => {
    await ext.setViewportSize({ width, height: 900 });
    await seed(ext);
    await ext.reload();
    await ext.evaluate(() => document.fonts.ready);
    const shot = (name: string) => ext.screenshot({ path: `test-results/shots/${label}-${name}.png`, fullPage: true });
    for (const section of ["jobs", "queue", "tracker", "answers", "profile"]) {
      await goTo(ext, section);
      await ext.waitForTimeout(250);
      await shot(section);
    }
    if (label === "narrow") {
      await ext.locator("#nav-toggle").click();
      await ext.waitForTimeout(300);
      await shot("drawer");
      await ext.keyboard.press("Escape");
    }
    // Apply section: a real run on the practice page, driven through the panel's own buttons.
    const page = await context.newPage();
    await page.goto(`${BASE}/apply.html`);
    await setStorage(ext, { answers: ANSWERS.filter((a) => !/legally|Why/.test(a.question)) });
    const tabId = await ext.evaluate(async (url) => (await chrome.tabs.query({})).find((t) => t.url === url)!.id!, page.url());
    await ext.goto(`${ext.url().split("?")[0]}?tabId=${tabId}`);
    await goTo(ext, "apply");
    await ext.locator("#run").click();
    await ext.locator("#status").waitFor();
    await ext.waitForTimeout(800);
    await shot("apply");
  });
}

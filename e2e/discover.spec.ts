/** Round 4: Discover matched to the profile (what it matches on, why each %), companies added from a link, and the
 * Plan card without a key box nobody can use. Every job board and careers page is stubbed: no real network. */
import type { BrowserContext } from "@playwright/test";
import { EMPTY_PROFILE } from "../src/shared/storage";
import { expect, getStorage, goTo, PROFILE, setStorage, test } from "./fixtures";

const CORS = { "access-control-allow-origin": "*" };

async function stubBoards(context: BrowserContext): Promise<void> {
  // Registered first: Playwright tries the newest route first, so the specific boards below win over this one.
  await context.route(/https:\/\/(api\.lever\.co|api\.ashbyhq\.com|api\.smartrecruiters\.com|[^/]+\.recruitee\.com|[^/]+\.jobs\.personio\.de|apply\.workable\.com)\/.*/,
    (route) => route.fulfill({ status: 404, body: "", headers: CORS }));
  await context.route(/https:\/\/boards-api\.greenhouse\.io\/.*/, (route) => route.fulfill({
    status: 200, contentType: "application/json", headers: CORS,
    body: JSON.stringify({ jobs: [
      { id: 1, title: "Backend Engineer", absolute_url: "https://boards.greenhouse.io/sample/jobs/1", location: { name: "Pune, India" }, updated_at: new Date().toISOString(),
        company_name: "Sample Co", content: "&lt;p&gt;We use Python, SQL and Kubernetes. Our team builds the systems behind payments for millions of people every day.&lt;/p&gt;" },
      { id: 2, title: "Account Executive", absolute_url: "https://boards.greenhouse.io/sample/jobs/2", location: { name: "Pune, India" }, updated_at: new Date().toISOString(), content: "" },
    ] }),
  }));
  await context.route(/https:\/\/api\.lever\.co\/v0\/postings\/acmeco.*/, (route) => route.fulfill({
    status: 200, contentType: "application/json", headers: CORS,
    body: JSON.stringify([{ id: "l1", text: "Backend Engineer II", hostedUrl: "https://jobs.lever.co/acmeco/l1", categories: { location: "Remote - India" }, workplaceType: "remote", descriptionPlain: "Python services." }]),
  }));
  await context.route("https://careers.example-co.com/robots.txt", (route) => route.fulfill({ status: 200, body: "User-agent: *\nDisallow: /private\n", headers: CORS }));
  await context.route("https://careers.example-co.com/jobs", (route) => route.fulfill({
    status: 200, contentType: "text/html", headers: CORS,
    body: '<html><body><div id="grnhse_app"></div><script src="https://boards.greenhouse.io/embed/job_board/js?for=exampleco"></script></body></html>',
  }));
}

test("Discover shows what it matches on, and why each job scored what it did", async ({ ext, context }) => {
  test.setTimeout(150_000);
  await stubBoards(context);
  await setStorage(ext, { profile: { ...PROFILE, targetRoles: "Backend Engineer", skills: "Python, SQL", experienceYears: "3", country: "India", preferredLocations: "Pune" } });
  await ext.reload();
  await ext.evaluate(() => { (chrome.permissions as unknown as { request: () => Promise<boolean> }).request = async () => true; });
  await goTo(ext, "jobs");
  const box = ext.locator("#discover-for");
  await expect(box).toContainText("Backend Engineer (from your Target roles)");
  await expect(box).toContainText("3 years");
  await expect(box).toContainText("Pune");
  await ext.locator("#discover-run").click();
  await expect(ext.locator("#discover-status")).toContainText(/match(es)? from/, { timeout: 120_000 });
  // The sales job is left out, and the status says so.
  await expect(ext.locator("#discover-status")).toContainText("in other fields");
  const card = ext.locator("#discover-list .job-card").first();
  await expect(card).toContainText("Backend Engineer");
  await card.locator(".match-breakdown summary").click();
  await expect(card.locator(".match-parts li").first()).toContainText('Matches "Backend Engineer"');
  await expect(card.locator(".match-parts")).toContainText("You have Python, SQL");
  await expect(card.locator(".match-missing")).toContainText("Kubernetes");
  // The results are there again after closing and reopening the panel.
  await ext.reload();
  await goTo(ext, "jobs");
  await expect(ext.locator("#discover-list .job-card").first()).toContainText("Backend Engineer");
  await expect(ext.locator("#discover-status")).toContainText("Checked");
});

test("Discover says what is missing on an empty profile, and the button opens Profile", async ({ ext }) => {
  await setStorage(ext, { profile: { ...EMPTY_PROFILE } });
  await ext.reload();
  await goTo(ext, "jobs");
  await expect(ext.locator("#discover-for li.missing")).toHaveCount(4);
  await ext.locator("#discover-edit-profile").click();
  await expect(ext.locator("#sec-profile")).toBeVisible();
});

test("a company is added from its job-board link or its own careers page, and job sites are refused", async ({ ext, context }) => {
  test.setTimeout(90_000);
  await stubBoards(context);
  await setStorage(ext, { profile: PROFILE });
  await ext.reload();
  await ext.evaluate(() => { (chrome.permissions as unknown as { request: () => Promise<boolean> }).request = async () => true; });
  await goTo(ext, "jobs");
  await ext.locator("#discover-companies summary").click();
  const input = ext.locator("#company-url");
  const status = ext.locator("#company-status");

  await input.fill("https://www.linkedin.com/company/acme/jobs/");
  await ext.locator("#company-add").click();
  await expect(status).toContainText("job site");

  await input.fill("jobs.lever.co/acmeco");
  await input.press("Enter");
  await expect(status).toContainText("Added Acmeco: 1 open job.", { timeout: 30_000 });
  await expect(ext.locator("#company-list li")).toHaveCount(1);

  await input.fill("https://careers.example-co.com/jobs");
  await ext.locator("#company-add").click();
  await expect(status).toContainText("Added Sample Co", { timeout: 30_000 });
  const saved = await getStorage<Array<{ ats: string; slug: string }>>(ext, "myCompanies");
  expect(saved.map((c) => `${c.ats}:${c.slug}`)).toEqual(["lever:acmeco", "greenhouse:exampleco"]);

  await input.fill("https://acme.wd5.myworkdayjobs.com/External");
  await ext.locator("#company-add").click();
  await expect(status).toContainText("Workday");

  await ext.locator("#company-list li").first().getByRole("button", { name: /Remove/ }).click();
  await expect(ext.locator("#company-list li")).toHaveCount(1);
});

test("the Plan card shows no licence key box when there is nothing to activate", async ({ ext }) => {
  await goTo(ext, "profile");
  await expect(ext.locator("#plan-status")).toBeVisible();
  await expect(ext.locator("#license-row")).toBeHidden();
  await expect(ext.locator("#plan-payment-hint")).toBeHidden();
});

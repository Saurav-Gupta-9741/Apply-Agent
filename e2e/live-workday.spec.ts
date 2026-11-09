/** Workday on LIVE job postings, without an account (we never create one): open the job, press Apply → Apply
 * Manually, and run the extension's Fill (review, fill only) on whatever step Workday shows, which is normally
 * "Create Account / Sign In". Records what the extension found and did: it must not type a password, create an
 * account or press anything; the page's own requests other than reads are blocked as in the 1,000-form run.
 *
 *   LIVE_WORKDAY=1 LIVE_ALL_SITES=1 npx playwright test e2e/live-workday.spec.ts --reporter=line */

import { appendFileSync, writeFileSync } from "node:fs";
import type { Page } from "@playwright/test";
import { expect, setStorage, test } from "./fixtures";
import { isReadOnly } from "./live-guard";
import type { Message, RunReport } from "../src/shared/types";
import type { AnswerEntry, Profile } from "../src/shared/types";

// The fictional US-based candidate of live run 7 (a copy: Playwright does not let one test file import another).
const CANDIDATE: Profile = {
  firstName: "Emily", lastName: "Carter", email: "emily.carter.test@example.com", phone: "+1 512 555 0142", location: "Austin, TX", country: "United States",
  linkedin: "https://www.linkedin.com/in/emily-carter-test", github: "", portfolio: "", currentCompany: "Northwind Analytics", currentTitle: "Data Engineer",
  school: "Lone Star State University", degree: "Bachelor's Degree", discipline: "Computer Science", graduationYear: "2021", experienceYears: "5",
  targetRoles: "Data Engineer", preferredLocations: "Austin, Remote", skills: "Python, SQL",
};
const CANDIDATE_ANSWERS: AnswerEntry[] = [];

test.skip(!process.env.LIVE_WORKDAY, "live Workday probe: set LIVE_WORKDAY=1");
test.setTimeout(30 * 60_000);

const OUT = "reports/live1000/workday-probe.jsonl";
const JOBS = [
  "https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite/job/China-Shanghai/Senior-Physical-AI-Data-Engineer_JR2028588",
  "https://salesforce.wd12.myworkdayjobs.com/External_Career_Site/job/New-York---New-York/Enterprise-Account-Executive---Apromore---Regrello_JR367772",
  "https://adobe.wd5.myworkdayjobs.com/external_experienced/job/San-Jose/Staff-Security-Data-Engineer_R171875-1",
  "https://intel.wd1.myworkdayjobs.com/External/job/India-Bangalore/Senior-Director---Data-and-Intelligence_JR0286249",
  "https://target.wd5.myworkdayjobs.com/targetcareers/job/1000-Nicollet-Mall-MinneapolisMN-55403-2542/Lead-Data-Scientist---Recommendations--applied-ML--Reinforcement-Learning--Contextual-Bandit-Design-_R0000475165",
];

async function send(ext: Page, page: Page, message: Message): Promise<RunReport | undefined> {
  return ext.evaluate(async ({ url, message }) => {
    const tabs = await chrome.tabs.query({});
    const tab = tabs.find((t) => t.url === url) ?? tabs.reduce((a, b) => ((a.id ?? 0) > (b.id ?? 0) ? a : b));
    await chrome.scripting.executeScript({ target: { tabId: tab.id!, allFrames: true }, files: ["content.js"] }).catch(() => undefined);
    try {
      return (await chrome.tabs.sendMessage(tab.id!, message)) as RunReport | undefined;
    } catch {
      return undefined;
    }
  }, { url: page.url(), message });
}

test("live Workday: job page → Apply Manually → the extension on the step Workday shows (no account, nothing sent)", async ({ ext, context }) => {
  writeFileSync(OUT, "");
  const blocked: string[] = [];
  await context.route("**/*", async (route) => {
    const req = route.request();
    if (isReadOnly(req)) return route.continue();
    blocked.push(`${req.method()} ${new URL(req.url()).host}${new URL(req.url()).pathname.slice(0, 60)}`);
    return route.abort("blockedbyclient");
  });
  await setStorage(ext, { profile: CANDIDATE, answers: CANDIDATE_ANSWERS });
  for (const url of JOBS) {
    const page = await context.newPage();
    const row: Record<string, unknown> = { url };
    const before = blocked.length;
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
      await page.waitForTimeout(5000);
      row.jobPageTitle = await page.title();
      // The job page itself: the extension should see a job description, not a form.
      const onJob = await send(ext, page, { type: "RUN", mode: "review", fillOnly: true });
      row.onJobPage = { status: onJob?.status, fields: onJob?.fields.length ?? 0 };
      const apply = page.locator("[data-automation-id='adventureButton'], a[data-automation-id*='apply' i], button[data-automation-id*='apply' i]").first();
      row.applyButton = await apply.isVisible().catch(() => false);
      if (row.applyButton) {
        await apply.click({ timeout: 8000 }).catch((e) => (row.applyClickError = String(e).slice(0, 120)));
        await page.waitForTimeout(3000);
        const manual = page.locator("[data-automation-id='applyManually']").first();
        row.applyManually = await manual.isVisible().catch(() => false);
        if (row.applyManually) { await manual.click({ timeout: 8000 }).catch(() => undefined); await page.waitForTimeout(6000); }
      }
      row.stepUrl = page.url();
      row.stepHeading = (await page.locator("h1, h2, [data-automation-id='pageHeader']").first().innerText({ timeout: 3000 }).catch(() => "")).slice(0, 120);
      row.inputs = await page.locator("input:not([type=hidden]), textarea, select").evaluateAll((els) => els.map((e) => { const i = e as HTMLInputElement; return `${i.type}:${i.getAttribute("data-automation-id") ?? i.name ?? i.id}`; }));
      const report = await send(ext, page, { type: "RUN", mode: "review", fillOnly: true });
      row.status = report?.status;
      row.message = (report as unknown as { message?: string })?.message;
      row.fields = (report?.fields ?? []).map((f) => ({ label: f.field.label.slice(0, 120), control: f.field.control, decision: f.decision.kind, status: f.status }));
      row.passwordValues = await page.locator("input[type=password]").evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value.length));
      row.urlAfterFill = page.url();
    } catch (e) {
      row.error = String((e as Error)?.message ?? e).split("\n")[0]!.slice(0, 200);
    } finally {
      row.blocked = blocked.slice(before);
      appendFileSync(OUT, `${JSON.stringify(row)}\n`);
      console.log(JSON.stringify({ url: url.slice(8, 60), heading: row.stepHeading, status: row.status, fields: (row.fields as unknown[] | undefined)?.length, pw: row.passwordValues }));
      await page.close().catch(() => undefined);
      await ext.waitForTimeout(3000);
    }
  }
  expect(true).toBe(true);
});

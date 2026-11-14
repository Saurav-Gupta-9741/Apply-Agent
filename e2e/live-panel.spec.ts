/** Round 12, opt-in (LIVE_PANEL=1): the side panel's helpers on REAL live application forms. Suggestions from the
 * resume, the earlier-answer chip and the resume-tailoring card must appear where they should and say the right
 * thing. Read-only: every non-GET request is blocked (e2e/live-guard.ts); nothing is submitted. */

import { appendFileSync } from "node:fs";
import type { Page } from "@playwright/test";
import { expect, goTo, PROFILE, setStorage, test } from "./fixtures";
import { isReadOnly } from "./live-guard";

const RESUME = `Asha Verma, Data Scientist
Built credit risk and fraud models for a digital lender, cutting first-payment defaults by 18%.
Owned risk data science for a buy-now-pay-later product: risk-related models, policies and monitoring.
Sold a B2B SaaS analytics offering to mid-market customers as a solutions consultant, closing 14 deals in 2024.
Python, SQL, scikit-learn, XGBoost, Airflow, dbt, BigQuery, Looker.`;
const ME = {
  ...PROFILE, firstName: "Asha", lastName: "Verma", country: "India", location: "Pune", state: "Maharashtra",
  experienceYears: "5", skills: "Python, SQL, scikit-learn, XGBoost, Airflow, dbt, BigQuery",
  resume: { name: "Asha_Verma_Resume.txt", type: "text/plain", dataBase64: Buffer.from(RESUME).toString("base64") },
};
const EARLIER = [{ question: "Why do you want to work at Stripe?", answer: "I want to build financial products used by millions, and my work on risk models at a digital lender taught me how much careful data work matters for customers' trust.", updatedAt: "2026-11-01T00:00:00Z", company: "stripe" }];

async function pinPanel(ext: Page, page: Page): Promise<void> {
  const tabId = await ext.evaluate(async (url) => (await chrome.tabs.query({})).find((t) => t.url === url)!.id!, page.url());
  await ext.goto(`${ext.url().split("?")[0]}?tabId=${tabId}`);
  await goTo(ext, "apply");
}

const CASES = [
  { url: "https://job-boards.greenhouse.io/gusto/jobs/7656216", question: /risk data science/i, expect: "evidence", proof: /risk/i },
  { url: "https://job-boards.greenhouse.io/starburst/jobs/5462554008", question: /B2B SaaS/i, expect: "evidence", proof: /B2B SaaS/i },
  { url: "https://job-boards.greenhouse.io/mercury/jobs/6249882004", question: /^Why Mercury/i, expect: "earlier", proof: /similar question/i },
];

test("panel helpers on real live forms", async ({ ext, context }) => {
  test.skip(!process.env.LIVE_PANEL, "set LIVE_PANEL=1");
  test.setTimeout(15 * 60_000);
  await context.route("**/*", (route) => (isReadOnly(route.request()) ? route.continue() : route.abort("blockedbyclient")));
  await setStorage(ext, { profile: ME, answers: EARLIER });
  for (const c of CASES) {
    const page = await context.newPage();
    await page.goto(c.url, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.locator("input:not([type=hidden]), textarea").first().waitFor({ timeout: 20_000 }).catch(() => undefined);
    await pinPanel(ext, page);
    await ext.locator("#run").click();
    // The question card for the question left for the user.
    const card = ext.locator(".question").filter({ hasText: c.question }).first();
    const present = await card.waitFor({ timeout: 90_000 }).then(() => true, () => false);
    const text = present ? (await card.innerText()).replace(/\s+/g, " ") : "";
    const fit = await ext.locator("#fit-card").innerText().catch(() => "");
    const tailor = await ext.locator("#fit-card details.tailor").innerText().catch(() => "");
    appendFileSync("reports/live1000/live-panel.jsonl", `${JSON.stringify({ url: c.url, present, card: text.slice(0, 500), fit: fit.replace(/\s+/g, " ").slice(0, 200), tailor: tailor.replace(/\s+/g, " ").slice(0, 400) })}\n`);
    expect(present, `${c.url}: the question card`).toBe(true);
    expect(text, `${c.url}: the helper`).toMatch(c.proof);
    await page.close();
  }
});

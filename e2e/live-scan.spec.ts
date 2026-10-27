/** Read-only checks against REAL application forms from the JobReach feed.
 * The agent only reads (SCAN): it types nothing, uploads nothing and submits nothing, so no company receives
 * anything. Run with:  LIVE=1 npx playwright test e2e/live-scan.spec.ts */

import { existsSync, readFileSync } from "node:fs";
import { applicationUrl } from "../src/background/queue";
import type { FeedJob } from "../src/shared/types";
import { expect, runIn, setup, test } from "./fixtures";

const FEED = "../jobreach/exports/feed.json";
const PER_PLATFORM = 3;

function sample(): FeedJob[] {
  if (!existsSync(FEED)) return [];
  const jobs = (JSON.parse(readFileSync(FEED, "utf8")) as { jobs: FeedJob[] }).jobs;
  return ["greenhouse", "lever", "ashby"].flatMap((p) => {
    const seen = new Set<string>();
    return jobs.filter((j) => j.platform === p && !seen.has(j.company) && seen.add(j.company)).slice(0, PER_PLATFORM);
  });
}

test.skip(!process.env.LIVE, "live scans run only with LIVE=1");

for (const job of sample()) {
  test(`live read-only scan: ${job.platform} · ${job.company} · ${job.title}`, async ({ ext, context }) => {
    await setup(ext);
    const page = await context.newPage();
    const url = applicationUrl(job.apply_url ?? job.url);
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("input[type='email'], input[name*='email' i], input[id*='email' i]", { timeout: 20_000 }).catch(() => undefined);

    const report = await runIn(ext, page, { type: "SCAN" });
    const rows = (report?.fields ?? []).map((f) => `${f.field.required ? "*" : " "} ${f.field.control.padEnd(8)} ${f.decision.kind.padEnd(7)} ${f.field.label}`);
    console.log(`\n=== ${job.platform} · ${job.company} · ${url}\n${rows.join("\n")}`);

    expect(report, "an application form was found").toBeDefined();
    expect(report!.fields.length).toBeGreaterThanOrEqual(4);
    const decisions = report!.fields.map((f) => f.decision);
    expect(decisions.some((d) => d.kind === "profile" && d.key === "email"), "email recognised").toBe(true);
    expect(decisions.some((d) => d.kind === "profile" && (d.key === "firstName" || d.key === "fullName")), "name recognised").toBe(true);
    // Nothing on the page was changed by a scan.
    expect(await page.evaluate(() => Array.from(document.querySelectorAll("input[type='email']")).every((e) => !(e as HTMLInputElement).value))).toBe(true);
  });
}

/** Weekly health check:
 * Fetches 5 live job links across Greenhouse, Lever and Ashby.
 * Runs a read-only scan on each.
 * Asserts:
 * - Form found
 * - At least 10 fields detected
 * - 0 changes to the page (untouched=true)
 * Fails loudly (exit code 1) if any major ATS changed its DOM structure.
 */

import { chromium } from "playwright";
import { resolve, join } from "node:path";
import { mkdtempSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";

function applicationUrl(url) {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    if (/(^|\.)lever\.co$/.test(u.hostname) && parts.length === 2) u.pathname = `/${parts.join("/")}/apply`;
    if (/(^|\.)ashbyhq\.com$/.test(u.hostname) && parts.length === 2) u.pathname = `/${parts.join("/")}/application`;
    return u.toString();
  } catch {
    return url;
  }
}

async function getLiveJobs() {
  const jobs = [];

  // 1. Greenhouse live links
  try {
    const res = await fetch("https://boards-api.greenhouse.io/v1/boards/gusto/jobs");
    const data = await res.json();
    if (data.jobs && data.jobs.length > 0) {
      jobs.push({
        platform: "greenhouse",
        company: "Gusto",
        url: applicationUrl(data.jobs[0].absolute_url),
      });
    }
  } catch (e) {
    console.warn("Could not fetch from Greenhouse API:", e.message);
  }
  if (!jobs.some((j) => j.company === "Gusto")) {
    jobs.push({
      platform: "greenhouse",
      company: "Gusto",
      url: "https://job-boards.greenhouse.io/gusto/jobs/7899871",
    });
  }

  try {
    const res = await fetch("https://boards-api.greenhouse.io/v1/boards/twitch/jobs");
    const data = await res.json();
    if (data.jobs && data.jobs.length > 0) {
      jobs.push({
        platform: "greenhouse",
        company: "Twitch",
        url: applicationUrl(data.jobs[0].absolute_url),
      });
    }
  } catch (e) {
    console.warn("Could not fetch from Greenhouse API:", e.message);
  }
  if (!jobs.some((j) => j.company === "Twitch")) {
    jobs.push({
      platform: "greenhouse",
      company: "Twitch",
      url: "https://job-boards.greenhouse.io/twitch/jobs/8872835002",
    });
  }

  // 2. Ashby live links
  try {
    const res = await fetch("https://api.ashbyhq.com/posting-api/job-board/linear");
    const data = await res.json();
    if (data.jobs && data.jobs.length > 0) {
      jobs.push({
        platform: "ashby",
        company: "Linear",
        url: applicationUrl(data.jobs[0].jobUrl),
      });
    }
  } catch (e) {
    console.warn("Could not fetch from Ashby API:", e.message);
  }
  if (!jobs.some((j) => j.company === "Linear")) {
    jobs.push({
      platform: "ashby",
      company: "Linear",
      url: "https://jobs.ashbyhq.com/linear/d3bc1ced-3ce4-4086-a050-555055dbb1ff/application",
    });
  }

  // 3. Lever live links
  try {
    const r5Path = resolve("reports/round5-jobs.json");
    if (existsSync(r5Path)) {
      const r5 = JSON.parse(readFileSync(r5Path, "utf-8"));
      const leverJobs = r5.filter((j) => j.platform === "lever");
      for (const lj of leverJobs.slice(0, 2)) {
        jobs.push({
          platform: "lever",
          company: lj.company,
          url: applicationUrl(lj.url),
        });
      }
    }
  } catch {
    // fallback
  }

  if (jobs.filter((j) => j.platform === "lever").length < 2) {
    jobs.push({
      platform: "lever",
      company: "Palantir",
      url: "https://jobs.lever.co/palantir/6ed76ce8-4156-4b60-b120-403538bd66cd/apply",
    });
    jobs.push({
      platform: "lever",
      company: "Spotify",
      url: "https://jobs.lever.co/spotify/2a55d6c9-c564-443a-be3e-a3851db5a93b/apply",
    });
  }

  return jobs.slice(0, 5);
}

async function waitForForm(page) {
  await page.waitForSelector("input[type='email'], input[type='file'], textarea, form input:not([type='hidden'])", { timeout: 15000 })
    .catch(() => undefined);
  await page.waitForTimeout(2000);
}

async function valuesOf(page) {
  const all = new Map();
  for (const [f, frame] of page.frames().entries()) {
    const entries = await frame.evaluate(() => Array.from(document.querySelectorAll("input, textarea, select")).map((e, i) => {
      const el = e;
      return [`${i}:${el.name || el.id || el.type}`, el.type === "checkbox" || el.type === "radio" ? String(el.checked) : el.value];
    })).catch(() => []);
    for (const [k, v] of entries) all.set(`${f}/${k}`, v);
  }
  return all;
}

function changedFields(before, after) {
  return [...before].filter(([k, v]) => after.has(k) && after.get(k) !== v)
    .map(([k, v]) => `${k}: "${v.slice(0, 30)}" → "${after.get(k).slice(0, 30)}"`);
}

async function ask(extPage, page, message) {
  return extPage.evaluate(async ({ url, message }) => {
    const tabs = await chrome.tabs.query({});
    const tab = tabs.find((t) => t.url === url) ?? tabs.reduce((a, b) => ((a.id ?? 0) > (b.id ?? 0) ? a : b));
    if (!tab?.id) return undefined;
    await chrome.scripting.executeScript({ target: { tabId: tab.id, allFrames: true }, files: ["content.js"] }).catch(() => undefined);
    try {
      return await chrome.tabs.sendMessage(tab.id, message);
    } catch {
      return undefined;
    }
  }, { url: page.url(), message });
}

async function runHealthCheck() {
  console.log("=== APPLYAGENT WEEKLY HEALTH CHECK ===");
  const jobs = await getLiveJobs();
  console.log(`Checking ${jobs.length} live jobs across Greenhouse, Lever, and Ashby:\n`);
  for (const j of jobs) {
    console.log(`  - [${j.platform}] ${j.company}: ${j.url}`);
  }
  console.log("");

  const extensionPath = resolve("dist-test");
  if (!existsSync(extensionPath)) {
    console.error("FATAL: dist-test/ directory not found. Run 'node build.mjs --test' first.");
    process.exit(1);
  }

  const tmpDir = mkdtempSync(join(tmpdir(), "applyagent-healthcheck-"));
  const context = await chromium.launchPersistentContext(tmpDir, {
    channel: "chromium",
    headless: true,
    args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
  });

  let worker = context.serviceWorkers()[0];
  if (!worker) worker = await context.waitForEvent("serviceworker");
  const extensionId = new URL(worker.url()).host;

  const extPage = await context.newPage();
  await extPage.goto(`chrome-extension://${extensionId}/sidepanel.html`);

  let failures = 0;

  for (const job of jobs) {
    console.log(`Scanning [${job.platform}] ${job.company}...`);
    const page = await context.newPage();
    try {
      await page.goto(job.url, { waitUntil: "domcontentloaded", timeout: 30000 });
      await waitForForm(page);

      let before = await valuesOf(page);
      let report = await ask(extPage, page, { type: "SCAN" });

      if (!report?.fields?.length) {
        // Try opening application if on job description
        const opened = await ask(extPage, page, { type: "OPEN_APPLICATION" });
        if (opened?.href) {
          await page.goto(opened.href, { waitUntil: "domcontentloaded", timeout: 30000 });
          await waitForForm(page);
          before = await valuesOf(page);
          report = await ask(extPage, page, { type: "SCAN" });
        }
      }

      const after = await valuesOf(page);
      const changed = changedFields(before, after);
      const untouched = changed.length === 0;

      const formFound = report && report.status !== "not_a_form";
      const fieldCount = report?.fields?.length ?? 0;
      const sufficientFields = fieldCount >= 10;

      if (!formFound) {
        console.error(`❌ FAILED [${job.platform}] ${job.company}: No application form found on page!`);
        failures++;
      } else if (!sufficientFields) {
        console.error(`❌ FAILED [${job.platform}] ${job.company}: Only detected ${fieldCount} fields (expected at least 10). ATS DOM may have changed!`);
        failures++;
      } else if (!untouched) {
        console.error(`❌ FAILED [${job.platform}] ${job.company}: Read-only scan modified fields: ${changed.join(", ")}`);
        failures++;
      } else {
        console.log(`✅ PASSED [${job.platform}] ${job.company}: ${fieldCount} fields detected, form confirmed, 0 changes to page.`);
      }
    } catch (err) {
      console.error(`❌ FAILED [${job.platform}] ${job.company} with error: ${err.message}`);
      failures++;
    } finally {
      await page.close();
    }
  }

  await context.close();

  console.log("\n========================================");
  if (failures > 0) {
    console.error(`💥 HEALTH CHECK FAILED with ${failures} failure(s)! Review ATS DOM structure.`);
    process.exit(1);
  } else {
    console.log("🎉 ALL HEALTH CHECKS PASSED: Greenhouse, Lever, and Ashby structures verified.");
    process.exit(0);
  }
}

runHealthCheck().catch((err) => {
  console.error("FATAL HEALTH CHECK ERROR:", err);
  process.exit(1);
});

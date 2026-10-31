/** Coverage of REAL application forms (read-only): one job per company from the JobReach feed, across Greenhouse,
 * Lever, Ashby, SmartRecruiters and Workable. The agent only reads (SCAN): it types nothing, uploads nothing and
 * submits nothing, and a check confirms no field on the page changed. One page every few seconds.
 *
 *   COVERAGE=1 npx playwright test e2e/coverage.spec.ts                         jobs from the JobReach feed
 *   COVERAGE=1 COVERAGE_JOBS=reports/extra-jobs.json npx playwright test …      any list of {platform, company, url}
 *   COVERAGE_LIMIT=20 limits the number of pages. Then: node scripts/coverage-report.mjs
 *
 * Writes reports/coverage-<list>.json (every field and decision); scripts/coverage-report.mjs merges all of them into
 * reports/coverage.md. Saves a few real forms (scripts removed) to test/corpus/ for the offline regression test. */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { Page } from "@playwright/test";
import { applicationUrl } from "../src/background/queue";
import type { FeedJob, Message, RunReport } from "../src/shared/types";
import { expect, PROFILE, setStorage, test } from "./fixtures";

const FEED = "../jobreach/exports/feed.json";
const QUOTA: Record<string, number> = { greenhouse: 40, lever: 20, ashby: 15, smartrecruiters: 15, workable: 10 };
const CORPUS_PER_PLATFORM = 2;
const PAUSE_MS = 2500; // between pages: human pace

interface Job {
  platform: string;
  company: string;
  url: string;
}

const LIST = process.env.COVERAGE_JOBS;

function sample(): Job[] {
  const limit = Number(process.env.COVERAGE_LIMIT) || Infinity;
  if (LIST) return (JSON.parse(readFileSync(LIST, "utf8")) as Job[]).slice(0, limit);
  return feedSample().map((j) => ({ platform: j.platform, company: j.company, url: applicationUrl(j.apply_url ?? j.url) }));
}

/** Ask the page (all frames) like the side panel does. On a page whose own site is not allowed, Chrome refuses
 * injection, and only the page script already running in an allowed frame (an embedded form) can answer. */
async function ask(ext: Page, page: Page, message: Message): Promise<RunReport | undefined> {
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

function feedSample(): FeedJob[] {
  if (!existsSync(FEED)) return [];
  const jobs = (JSON.parse(readFileSync(FEED, "utf8")) as { jobs: FeedJob[] }).jobs;
  const picked = Object.entries(QUOTA).flatMap(([platform, quota]) => {
    const seen = new Set<string>();
    // Newest first, one job per company.
    return jobs.filter((j) => j.platform === platform).sort((a, b) => b.first_seen_at.localeCompare(a.first_seen_at))
      .filter((j) => !seen.has(j.company) && seen.add(j.company)).slice(0, quota);
  });
  return picked;
}

interface Row {
  platform: string;
  company: string;
  url: string;
  outcome: "form" | "closed" | "robot_check" | "no_form" | "error";
  openedFromJobPage?: boolean;
  untouched?: boolean;
  /** Fields whose value changed while reading (must be none). */
  changed?: string[];
  error?: string;
  fields?: Array<{ label: string; control: string; required: boolean; options: number; section?: string; workBlock?: number;
    decision: string; status: string }>;
}

const CLOSED = /no longer (accepting|available|open)|position (has been|is) (filled|closed)|job (not found|is closed|has expired)|page not found|404|this job has been|isn't accepting applications|not accepting applications/i;

async function waitForForm(page: Page): Promise<void> {
  await page.waitForSelector("input[type='email'], input[type='file'], textarea, form input:not([type='hidden'])", { timeout: 15_000 })
    .catch(() => undefined);
  await page.waitForTimeout(1200); // late fields (single-page apps)
}

/** Every field's value, keyed by the field (in every frame), to compare before and after reading. */
async function valuesOf(page: Page): Promise<Map<string, string>> {
  const all = new Map<string, string>();
  for (const [f, frame] of page.frames().entries()) {
    const entries = await frame.evaluate(() => Array.from(document.querySelectorAll("input, textarea, select")).map((e, i) => {
      const el = e as HTMLInputElement;
      return [`${i}:${el.name || el.id || el.type}`, el.type === "checkbox" || el.type === "radio" ? String(el.checked) : el.value] as const;
    })).catch(() => [] as Array<readonly [string, string]>);
    for (const [k, v] of entries) all.set(`${f}/${k}`, v);
  }
  return all;
}

/** Fields whose value differs (fields that appeared or disappeared are the page rendering, not a change). */
function changedFields(before: Map<string, string>, after: Map<string, string>): string[] {
  return [...before].filter(([k, v]) => after.has(k) && after.get(k) !== v).map(([k, v]) => `${k}: "${v.slice(0, 30)}" → "${after.get(k)!.slice(0, 30)}"`);
}

/** Wait until the page stops changing its own fields (sites fill a phone country code or a token a moment after
 * loading), so a change seen after reading can only come from the reading. */
async function stableValues(page: Page): Promise<Map<string, string>> {
  let last = await valuesOf(page);
  for (let i = 0; i < 8; i++) {
    await page.waitForTimeout(750);
    const now = await valuesOf(page);
    if (!changedFields(last, now).length && now.size === last.size) return now;
    last = now;
  }
  return last;
}

function describeDecision(d: RunReport["fields"][number]["decision"]): string {
  switch (d.kind) {
    case "profile": return `profile:${d.key}`;
    case "work": return `work:${d.part}#${d.index + 1}`;
    case "answer": return "answer";
    case "resume": return "resume";
    case "ask": return `ask:${d.topic ?? d.reason}`;
    case "draft": return `draft:${d.question}`;
    case "skip": return `skip:${d.reason}`;
  }
}

async function saveCorpus(page: Page, name: string): Promise<void> {
  // The form may be embedded (a careers site showing a Greenhouse form in a frame): save the frame that holds it.
  const counts = await Promise.all(page.frames().map((f) => f.evaluate(() => document.querySelectorAll("input:not([type='hidden']), textarea, select").length).catch(() => 0)));
  const frame = page.frames()[counts.indexOf(Math.max(...counts))] ?? page.mainFrame();
  const html = await frame.evaluate(() => {
    const forms = Array.from(document.querySelectorAll("form"));
    const count = (el: Element) => el.querySelectorAll("input:not([type='hidden']), textarea, select").length;
    const root = forms.sort((a, b) => count(b) - count(a))[0] ?? document.body;
    const clone = root.cloneNode(true) as Element;
    clone.querySelectorAll("script, style, noscript, svg, img, iframe, link, meta, video, picture, canvas").forEach((e) => e.remove());
    clone.querySelectorAll("*").forEach((e) => {
      for (const a of Array.from(e.attributes)) if (/^on/i.test(a.name) || a.name === "style" || a.name === "value" && e.tagName === "INPUT") e.removeAttribute(a.name);
    });
    const h1 = document.querySelector("h1")?.textContent?.trim() ?? "";
    return `<h1>${h1.replace(/[<>&]/g, "")}</h1>\n${clone.outerHTML}`;
  });
  mkdirSync("test/corpus", { recursive: true });
  writeFileSync(`test/corpus/${name}.html`, `<!-- Real application form, saved by e2e/coverage.spec.ts (scripts and styles removed). -->\n${html}\n`);
}

test.skip(!process.env.COVERAGE, "real-form coverage runs only with COVERAGE=1");

test("coverage of real application forms (read-only)", async ({ ext, context }) => {
  const jobs = sample();
  test.setTimeout(jobs.length * 60_000 + 60_000);
  await setStorage(ext, {
    profile: { ...PROFILE, workHistory: [{ title: "Data Analyst", company: "Initech", location: "Pune", start: "2024-03", end: "", current: true, summary: "" }] },
    answers: [],
  });
  const rows: Row[] = [];
  const saved: Record<string, number> = {};
  const page = await context.newPage();
  for (const job of jobs) {
    const url = job.url;
    const row: Row = { platform: job.platform, company: job.company, url, outcome: "no_form" };
    try {
      const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
      await waitForForm(page);
      const text = (await page.locator("body").innerText().catch(() => "")).slice(0, 4000);
      if ((response?.status() ?? 200) >= 400) row.outcome = "closed";
      let before = await stableValues(page);
      let report = await ask(ext, page, { type: "SCAN" });
      if (!report?.fields.length) {
        // A job description page: do what the panel's "Open the application" button does, then read again.
        const opened = (await ask(ext, page, { type: "OPEN_APPLICATION" })) as unknown as { href?: string; clicked?: boolean } | undefined;
        if (opened?.href) await page.goto(opened.href, { waitUntil: "domcontentloaded", timeout: 30_000 });
        if (opened?.href || opened?.clicked) {
          row.openedFromJobPage = true;
          await waitForForm(page);
          before = await stableValues(page); // the application page as it opened: nothing may change from here
          report = await ask(ext, page, { type: "SCAN" });
        }
      }
      if (report?.fields.length) {
        row.outcome = "form";
        // Every form is checked, including those opened from a job page (they used to be skipped).
        row.changed = changedFields(before, await valuesOf(page));
        row.untouched = !row.changed.length;
        row.fields = report.fields.map((f) => ({
          label: f.field.label, control: f.field.control, required: f.field.required, options: f.field.options.length,
          section: f.field.section, workBlock: f.field.workBlock, decision: describeDecision(f.decision), status: f.status,
        }));
        if ((saved[job.platform] ?? 0) < CORPUS_PER_PLATFORM && report.fields.length >= 4) {
          saved[job.platform] = (saved[job.platform] ?? 0) + 1;
          await saveCorpus(page, `${job.platform}-${job.company.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30)}`);
        }
      } else if (await page.locator("iframe[src*='captcha-delivery.com'], iframe[src*='hcaptcha'], iframe[src*='recaptcha'], iframe[src*='challenges.cloudflare.com'], #px-captcha").count()) {
        row.outcome = "robot_check"; // shown to automated browsers; people in normal Chrome usually pass straight through
      } else if (row.outcome !== "closed" && CLOSED.test(text)) row.outcome = "closed";
    } catch (e) {
      row.outcome = "error";
      row.error = e instanceof Error ? e.message.split("\n")[0] : String(e);
    }
    rows.push(row);
    console.log(`${rows.length}/${jobs.length} ${row.outcome.padEnd(7)} ${job.platform.padEnd(15)} ${job.company} (${row.fields?.length ?? 0} fields)`);
    await page.waitForTimeout(PAUSE_MS);
  }
  mkdirSync("reports", { recursive: true });
  const name = LIST ? LIST.replace(/^.*[\\/]/, "").replace(/\.json$/, "") : "feed";
  writeFileSync(`reports/coverage-${name}.json`, JSON.stringify({ generatedAt: new Date().toISOString(), rows }, null, 1));
  // Reading never changes a page.
  // Every form read must have been checked, and unchanged.
  expect(rows.filter((r) => r.outcome === "form" && r.untouched !== true).map((r) => r.url)).toEqual([]);
});

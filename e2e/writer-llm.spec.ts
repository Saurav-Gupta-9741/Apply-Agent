/** The on-device writer end to end, with the real model (Qwen3.5-0.8B, 0.53 GB) served by a local stand-in for
 * Hugging Face (e2e/model-server.mjs, which joins the 500 MB pieces on the fly). Slow and memory-hungry, so it only
 * runs when asked:  LLM_E2E=1 npx playwright test e2e/writer-llm.spec.ts
 *
 * One browser profile, one model process at a time:
 *  1. consent → download starts → the browser is closed mid-download;
 *  2. the browser opens again on the same profile → the download continues from where it stopped (a Range request
 *     that does not start at 0) → SHA-256 check → the model loads → a draft is written for an essay question →
 *     fact check → the preview shows → Use types it into the page's box. */

import { chromium, type BrowserContext, type Page } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { Profile } from "../src/shared/types";
import { BASE, expect, goTo, PRO_LICENSE, test } from "./fixtures";

const MODEL_PORT = 8182;
const MODEL_BASE = `http://127.0.0.1:${MODEL_PORT}`;
const MODEL_ID = "qwen3.5-0.8b";
/** The cover-letter test can use a bigger model (LLM_MODEL=qwen3-1.7b), as a stronger computer gets. */
const COVER_MODEL = process.env.LLM_MODEL ?? MODEL_ID;

const RESUME = [
  "Asha Verma - Data Engineer - Bengaluru, India",
  "Data Engineer, Acme Pay, Bengaluru (Jul 2021 to present): built batch and streaming data pipelines in Python and Apache Airflow that process about 40 million payment events per day.",
  "Data Engineer, Acme Pay: rewrote slow BigQuery reporting queries with partitioning and clustering; cut monthly query cost by 35% and report time from 20 minutes to 3 minutes.",
  "Data Engineer, Acme Pay: led the migration of 120 tables from MySQL to BigQuery over 6 weeks with zero data loss.",
  "Data Engineer, Acme Pay: added data quality checks with Great Expectations that catch schema breaks before they reach dashboards.",
  "Data Engineer, Acme Pay: mentored 2 junior engineers.",
  "Software Engineering Intern, Bluefin Labs (Jan 2021 to Jun 2021): built a Django REST API for internal reporting.",
  "Education: B.Tech in Computer Science, State Technical University, 2021",
].join("\n");

// A fictional candidate (not a real person).
const PROFILE: Profile = {
  firstName: "Asha", lastName: "Verma", email: "asha@example.com", phone: "+91 90000 00000", location: "Bengaluru", country: "India",
  linkedin: "", github: "", portfolio: "", currentCompany: "Acme Pay", currentTitle: "Data Engineer",
  school: "State Technical University", degree: "B.Tech", discipline: "Computer Science", graduationYear: "2021", experienceYears: "5",
  targetRoles: "Data Engineer", preferredLocations: "Bengaluru, Remote",
  skills: "Python, SQL, BigQuery, Apache Airflow, Docker, Great Expectations, Git, Looker",
  resume: { name: "Asha_Verma_Resume.txt", type: "text/plain", dataBase64: Buffer.from(RESUME).toString("base64") },
};

test.describe("on-device writer with the real model", () => {
  test.skip(!process.env.LLM_E2E, "set LLM_E2E=1 to run the real-model writer test (slow; ~0.6 GB download from a local server)");
  test.describe.configure({ mode: "serial" });

  let server: ChildProcess | undefined;
  test.beforeAll(async () => {
    server = spawn(process.execPath, [resolve("e2e/model-server.mjs")], { env: { ...process.env, MODEL_PORT: String(MODEL_PORT) }, stdio: "pipe" });
    await expect.poll(async () => (await fetch(`${MODEL_BASE}/log`).then((r) => r.ok).catch(() => false)), { timeout: 15_000 }).toBe(true);
  });
  test.afterAll(() => {
    server?.kill();
  });

  async function launch(dir: string): Promise<{ context: BrowserContext; ext: Page; extensionId: string }> {
    const extensionPath = resolve("dist-test");
    // LLM_CHANNEL=msedge runs the same test in Microsoft Edge (Google Chrome blocks unpacked extensions under automation).
    const channel = process.env.LLM_CHANNEL ?? "chromium";
    const context = await chromium.launchPersistentContext(dir, {
      channel,
      headless: channel === "chromium",
      args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
    });
    let [worker] = context.serviceWorkers();
    if (!worker) worker = await context.waitForEvent("serviceworker");
    const extensionId = new URL(worker.url()).host;
    const ext = await context.newPage();
    ext.on("console", (m) => m.type() === "error" || m.type() === "warning" ? console.log(`PANEL ${m.type()}: ${m.text()}`) : undefined);
    ext.on("pageerror", (e) => console.log(`PANEL pageerror: ${e.message}`));
    await ext.goto(`chrome-extension://${extensionId}/sidepanel.html`);
    return { context, ext, extensionId };
  }

  /** Open the practice page, point the panel at it and press Fill: the essay boxes become question cards. */
  async function fillEssayPage(context: BrowserContext, ext: Page): Promise<Page> {
    const page = await context.newPage();
    await page.goto(`${BASE}/essay.html`);
    const tabId = await ext.evaluate(async (url) => (await chrome.tabs.query({})).find((t) => t.url === url)!.id!, page.url());
    await ext.goto(`${ext.url().split("?")[0]}?tabId=${tabId}`);
    await goTo(ext, "apply");
    await ext.locator("#run").click();
    await expect(ext.locator("#status")).not.toHaveText(/Reading the form/, { timeout: 60_000 });
    await expect(ext.locator(".question", { hasText: "Why are you interested in joining Northwind Data?" })).toBeVisible({ timeout: 30_000 });
    return page;
  }

  /** The writer's own status, asked over its port like the panel does. */
  async function writerStatus(ext: Page): Promise<{ crossOriginIsolated: boolean; threads: number; files: Record<string, { done: number; complete: boolean }> }> {
    await ext.evaluate(() => chrome.runtime.sendMessage({ type: "WRITER_OPEN" }));
    return ext.evaluate(() => new Promise((resolveStatus) => {
      const port = chrome.runtime.connect({ name: "applyagent-writer" });
      port.onMessage.addListener((m: { type: string; status?: unknown }) => {
        if (m.type === "status") {
          port.disconnect();
          resolveStatus(m.status as never);
        }
      });
      port.postMessage({ type: "status" });
    }));
  }

  test("consent → download (interrupted, resumed) → hash check → load → draft → fact check → Use fills the box", async () => {
    test.setTimeout(25 * 60_000);
    const dir = mkdtempSync(join(tmpdir(), "applyagent-writer-e2e-"));
    const timings: Record<string, number> = {};
    const opened: BrowserContext[] = [];
    try {
      // ---- 1. First session: consent, download starts, the browser closes mid-way. ----
      await fetch(`${MODEL_BASE}/reset?throttle=25000000`); // ~25 MB/s: time to interrupt it
      let { context, ext } = await launch(dir);
      opened.push(context);
      await ext.evaluate((v) => chrome.storage.local.set(v), { profile: PROFILE, answers: [], license: PRO_LICENSE, writerTest: { baseUrl: MODEL_BASE, modelId: MODEL_ID } });
      await ext.reload();
      await fillEssayPage(context, ext);
      const card = ext.locator(".question", { hasText: "Why are you interested in joining Northwind Data?" });
      await card.getByRole("button", { name: "Draft answer" }).click();
      const setup = card.locator(".writer-setup");
      await expect(setup).toContainText("First, ApplyAgent needs one download. After that it writes answers on this computer, and your details are never sent anywhere.");
      await expect(setup).toContainText("Please use Wi-Fi, not mobile data.");
      const t0 = Date.now();
      await setup.getByRole("button", { name: "Download now (one time)" }).click();
      await expect(setup).toContainText(/Downloading: \d+% \(0\.[1-9] GB of 0\.5 GB\)/, { timeout: 60_000 });
      const firstPart = Date.now() - t0;
      await context.close(); // the browser closes in the middle of the download
      const log1 = (await (await fetch(`${MODEL_BASE}/log`)).json()) as Array<{ range: string }>;
      expect(log1[0]?.range).toMatch(/^bytes=0-/);

      // ---- 2. The browser opens again: the download continues where it stopped. ----
      await fetch(`${MODEL_BASE}/reset`); // full speed now
      ({ context, ext } = await launch(dir));
      opened.push(context);
      const before = await writerStatus(ext);
      const saved = before.files[MODEL_ID]!.done;
      expect(saved).toBeGreaterThan(0);
      expect(before.files[MODEL_ID]!.complete).toBe(false);
      const page = await fillEssayPage(context, ext);
      const card2 = ext.locator(".question", { hasText: "Why are you interested in joining Northwind Data?" });
      const t1 = Date.now();
      // Opening the panel resumed the download by itself (the user agreed before); the card shows its progress.
      await card2.getByRole("button", { name: "Draft answer" }).click();
      await expect(card2.locator(".writer-line")).toBeVisible({ timeout: 10 * 60_000 }); // downloaded + verified
      timings.downloadSeconds = (firstPart + (Date.now() - t1)) / 1000;
      const log2 = (await (await fetch(`${MODEL_BASE}/log`)).json()) as Array<{ range: string }>;
      expect(Number(/bytes=(\d+)-/.exec(log2[0]!.range)![1])).toBe(saved); // resumed, not restarted
      const after = await writerStatus(ext);
      expect(after.files[MODEL_ID]!.complete).toBe(true); // size and SHA-256 matched
      timings.crossOriginIsolated = after.crossOriginIsolated ? 1 : 0;

      // ---- 3. Load and draft. ----
      const t2 = Date.now();
      await expect(card2.locator(".writer-line")).not.toHaveText("Loading the writing model…", { timeout: 5 * 60_000 });
      timings.loadSeconds = (Date.now() - t2) / 1000;
      const t3 = Date.now();
      const result = card2.locator(".draft-textarea, .draft-insufficient, .draft-error");
      await expect(result).toBeVisible({ timeout: 15 * 60_000 });
      timings.draftSeconds = (Date.now() - t3) / 1000;
      console.log("WRITER E2E TIMINGS", JSON.stringify(timings));
      await expect(card2.locator(".draft-error")).toHaveCount(0);

      // ---- 4. The checked draft is only shown; Use types it into the page. ----
      const draft = card2.locator(".draft-textarea");
      if (await card2.locator(".draft-insufficient").count()) {
        console.log("WRITER E2E INSUFFICIENT", JSON.stringify(await card2.locator(".draft-insufficient").innerText({ timeout: 2000 }).catch(() => "")));
        const raw = await ext.evaluate(() => new Promise((res) => {
          const port = chrome.runtime.connect({ name: "applyagent-writer" });
          port.onMessage.addListener((m: { type: string; status?: { finished: Record<string, { raw: string }> } }) => { if (m.type === "status") { res(Object.values(m.status!.finished).map((f) => f.raw)); port.disconnect(); } });
          port.postMessage({ type: "status" });
          setTimeout(() => res(null), 3000);
        }));
        console.log("WRITER E2E RAW MODEL OUTPUT", JSON.stringify(raw));
      }
      await expect(draft, "the fact checker kept a draft (an INSUFFICIENT card here means everything was removed)").toBeVisible();
      const text = await draft.inputValue();
      console.log("WRITER E2E DRAFT", JSON.stringify(text), JSON.stringify(await card2.locator(".draft-removed").textContent({ timeout: 2000 }).catch(() => null)));
      expect(text.length).toBeGreaterThan(20);
      expect(text).not.toMatch(/INSUFFICIENT|<think>/);
      expect(text).not.toMatch(/\b(?:I|we)\b[^.]*\b(?:Kafka|Spark|Kubernetes)\b/); // tools only the job names, never claimed
      await expect(page.locator("#why")).toHaveValue(""); // nothing typed before Use
      // The panel is a tab here; a background tab paints no frames, so clicks and screenshots would wait forever (the
      // real side panel is always visible). Bring it to the front first.
      await ext.bringToFront();
      await card2.screenshot({ path: "test-results/writer-llm-draft-card.png", timeout: 15_000 }).catch(() => undefined);
      await card2.getByRole("button", { name: "Use this answer" }).click({ timeout: 30_000 });
      await expect(page.locator("#why")).toHaveValue(text, { timeout: 30_000 });
      console.log("WRITER E2E USE OK: the draft was typed into the page box only after Use");
    } finally {
      // Closing a browser whose offscreen page still holds the model can take minutes; never wait on it.
      const closeQuickly = (c: { close(): Promise<void> }) => Promise.race([c.close().catch(() => undefined), new Promise((r) => setTimeout(r, 20_000))]);
      for (const c of opened) await closeQuickly(c);
      try {
        rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 1000 });
      } catch {
        /* Chrome may hold a file a moment longer: the temp folder is left behind */
      }
    }
  });

  test("cover letter upload and professional summary: write → read → Use (PDF attached; summary kept in the profile)", async () => {
    test.setTimeout(30 * 60_000);
    const dir = mkdtempSync(join(tmpdir(), "applyagent-cover-e2e-"));
    await fetch(`${MODEL_BASE}/reset`);
    const { context, ext } = await launch(dir);
    try {
      await ext.evaluate((v) => chrome.storage.local.set(v), { profile: PROFILE, answers: [], license: PRO_LICENSE, writerTest: { baseUrl: MODEL_BASE, modelId: COVER_MODEL } });
      await ext.reload();
      const page = await context.newPage();
      await page.goto(`${BASE}/cover.html`);
      const tabId = await ext.evaluate(async (url) => (await chrome.tabs.query({})).find((t) => t.url === url)!.id!, page.url());
      await ext.goto(`${ext.url().split("?")[0]}?tabId=${tabId}`);
      await goTo(ext, "apply");
      await ext.locator("#run").click();
      const cover = ext.locator(".question", { hasText: "Cover Letter" });
      const summary = ext.locator(".question", { hasText: "Professional Summary" });
      await expect(cover).toBeVisible({ timeout: 60_000 });
      await expect(summary).toBeVisible();

      // ---- The cover letter: one download, then the draft. ----
      await ext.bringToFront();
      await cover.getByRole("button", { name: "Write a cover letter" }).click();
      await cover.locator(".writer-setup").getByRole("button", { name: "Download now (one time)" }).click();
      const t0 = Date.now();
      const letterResult = cover.locator(".draft-textarea, .draft-insufficient, .draft-error");
      await expect(letterResult).toBeVisible({ timeout: 20 * 60_000 });
      const letterSeconds = (Date.now() - t0) / 1000;
      await expect(cover.locator(".draft-error")).toHaveCount(0);
      const letter = await cover.locator(".draft-textarea").inputValue();
      console.log("COVER E2E LETTER", letterSeconds, JSON.stringify(letter), JSON.stringify(await cover.locator(".draft-removed").textContent({ timeout: 2000 }).catch(() => null)));
      expect(letter).toMatch(/^Dear Hiring Team/);
      expect(letter).toMatch(/Sincerely,\nAsha Verma$/);
      expect(letter.split(/\s+/).length).toBeGreaterThan(60);
      expect(letter).not.toMatch(/INSUFFICIENT|<think>/);
      expect(letter).not.toMatch(/\b(?:I|we)\b[^.]*\b(?:Kafka|Spark|Kubernetes)\b/); // the job's tools, never claimed
      expect(await page.locator("#cover").evaluate((i: HTMLInputElement) => i.files?.length ?? 0)).toBe(0); // nothing before Use
      await cover.screenshot({ path: "test-results/cover-letter-draft-card.png", timeout: 15_000 }).catch(() => undefined);
      await cover.getByRole("button", { name: "Use this answer" }).click({ timeout: 30_000 });
      await expect(page.locator("#cover-name")).toHaveText(/^Cover_Letter_Asha_Verma\.pdf \(\d+ bytes\)$/, { timeout: 30_000 });
      const head = await page.locator("#cover").evaluate(async (i: HTMLInputElement) => (await i.files![0]!.text()).slice(0, 8));
      expect(head).toBe("%PDF-1.4");

      // ---- The summary: written, then kept in the profile for the next form. ----
      await summary.getByRole("button", { name: "Write my summary" }).click();
      const sumResult = summary.locator(".draft-textarea, .draft-insufficient, .draft-error");
      await expect(sumResult).toBeVisible({ timeout: 15 * 60_000 });
      const text = await summary.locator(".draft-textarea").inputValue();
      console.log("COVER E2E SUMMARY", JSON.stringify(text));
      expect(text.split(/\s+/).length).toBeGreaterThan(12);
      await summary.getByRole("button", { name: "Use this answer" }).click({ timeout: 30_000 });
      await expect(page.locator("#summary")).toHaveValue(text, { timeout: 30_000 });
      const saved = await ext.evaluate(async () => ((await chrome.storage.local.get("profile")).profile as { summary?: string }).summary);
      expect(saved).toBe(text);
      // The submit button was never pressed.
      await expect(page.locator("#application-form")).toBeVisible();
    } finally {
      await Promise.race([context.close().catch(() => undefined), new Promise((r) => setTimeout(r, 20_000))]);
      try { rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 1000 }); } catch { /* left behind */ }
    }
  });
});

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
    const context = await chromium.launchPersistentContext(dir, {
      channel: "chromium",
      headless: true,
      args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
    });
    let [worker] = context.serviceWorkers();
    if (!worker) worker = await context.waitForEvent("serviceworker");
    const extensionId = new URL(worker.url()).host;
    const ext = await context.newPage();
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
    try {
      // ---- 1. First session: consent, download starts, the browser closes mid-way. ----
      await fetch(`${MODEL_BASE}/reset?throttle=25000000`); // ~25 MB/s: time to interrupt it
      let { context, ext } = await launch(dir);
      await ext.evaluate((v) => chrome.storage.local.set(v), { profile: PROFILE, answers: [], license: PRO_LICENSE, writerTest: { baseUrl: MODEL_BASE, modelId: MODEL_ID } });
      await ext.reload();
      await fillEssayPage(context, ext);
      const card = ext.locator(".question", { hasText: "Why are you interested in joining Northwind Data?" });
      await card.getByRole("button", { name: "Draft answer" }).click();
      const setup = card.locator(".writer-setup");
      await expect(setup).toContainText("Download the writing model once (0.5 GB). After that, essays are written on this computer and nothing is sent anywhere.");
      const t0 = Date.now();
      await setup.getByRole("button", { name: "Download" }).click();
      await expect(setup).toContainText(/Downloading the writing model: 0\.[1-9] GB of 0\.5 GB/, { timeout: 60_000 });
      const firstPart = Date.now() - t0;
      await context.close(); // the browser closes in the middle of the download
      const log1 = (await (await fetch(`${MODEL_BASE}/log`)).json()) as Array<{ range: string }>;
      expect(log1[0]?.range).toMatch(/^bytes=0-/);

      // ---- 2. The browser opens again: the download continues where it stopped. ----
      await fetch(`${MODEL_BASE}/reset`); // full speed now
      ({ context, ext } = await launch(dir));
      const before = await writerStatus(ext);
      const saved = before.files[MODEL_ID]!.done;
      expect(saved).toBeGreaterThan(0);
      expect(before.files[MODEL_ID]!.complete).toBe(false);
      const page = await fillEssayPage(context, ext);
      const card2 = ext.locator(".question", { hasText: "Why are you interested in joining Northwind Data?" });
      const t1 = Date.now();
      // Opening the panel resumed the download by itself (the user agreed before); the card shows its progress.
      await card2.getByRole("button", { name: "Draft answer" }).click();
      await expect(card2.locator(".draft-live, .writer-line")).toBeVisible({ timeout: 10 * 60_000 }); // downloaded + verified
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
      await expect(draft, "the fact checker kept a draft (an INSUFFICIENT card here means everything was removed)").toBeVisible();
      const text = await draft.inputValue();
      console.log("WRITER E2E DRAFT", JSON.stringify(text), JSON.stringify(await card2.locator(".draft-removed").textContent().catch(() => null)));
      expect(text.length).toBeGreaterThan(20);
      expect(text).not.toMatch(/INSUFFICIENT|<think>/);
      expect(text).not.toMatch(/\b(?:I|we)\b[^.]*\b(?:Kafka|Spark|Kubernetes)\b/); // tools only the job names, never claimed
      await expect(page.locator("#why")).toHaveValue(""); // nothing typed before Use
      await card2.getByRole("button", { name: "Use" }).click();
      await expect(page.locator("#why")).toHaveValue(text, { timeout: 30_000 });
      await context.close();
    } finally {
      rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });
    }
  });
});

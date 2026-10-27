/** Playwright fixtures: a real Chromium with the extension loaded, plus helpers that call the extension's
 * own APIs from one of its pages (exactly what the side panel does). */

import { chromium, test as base, type BrowserContext, type Page } from "@playwright/test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { AnswerEntry, Message, Profile, RunReport } from "../src/shared/types";

export const BASE = "http://127.0.0.1:8181";
export const OTHER_SITE = "http://localhost:8181";

export const PROFILE: Profile = {
  firstName: "Asha", lastName: "Verma", email: "asha@example.com", phone: "+91 90000 00000", location: "Pune", country: "India",
  linkedin: "https://linkedin.com/in/asha", github: "", portfolio: "", currentCompany: "Initech", currentTitle: "Data Analyst",
  school: "IIT Jodhpur", degree: "Master's Degree", discipline: "Computer Science", graduationYear: "2026", experienceYears: "2",
  targetRoles: "Backend Engineer", preferredLocations: "Pune, Remote", skills: "Python, SQL",
  resume: { name: "Asha_Verma_Resume.pdf", type: "application/pdf", dataBase64: Buffer.from("%PDF-1.4\n%test resume\n").toString("base64") },
};

const now = "2026-10-25T00:00:00Z";
export const ANSWERS: AnswerEntry[] = [
  { question: "Are you legally authorized to work in India?", answer: "Yes", topic: "work_authorization", updatedAt: now },
  { question: "What is your notice period?", answer: "30 days", topic: "notice_period", updatedAt: now },
  { question: "I agree to the privacy policy", answer: "Yes", topic: "consent", updatedAt: now },
  { question: "How many years of experience do you have with Python?", answer: "2", updatedAt: now },
  { question: "Why do you want to join Acme?", answer: "I want to build reliable data systems.", updatedAt: now },
  { question: "Gender", answer: "Decline to self identify", topic: "gender", updatedAt: now },
  { question: "Are you willing to relocate?", answer: "Yes", topic: "relocation", updatedAt: now },
];

type Fixtures = { context: BrowserContext; extensionId: string; ext: Page };

export const test = base.extend<Fixtures>({
  // A fresh browser profile per test: no state leaks between tests.
  context: async ({}, use) => {
    const extensionPath = resolve("dist-test");
    const context = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), "applyagent-e2e-")), {
      channel: "chromium",
      headless: true,
      args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
    });
    await use(context);
    await context.close();
  },
  extensionId: async ({ context }, use) => {
    let [worker] = context.serviceWorkers();
    if (!worker) worker = await context.waitForEvent("serviceworker");
    await use(new URL(worker.url()).host);
  },
  ext: async ({ context, extensionId }, use) => {
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`chrome-extension://${extensionId}/sidepanel.html`);
    await use(page);
    if (errors.length) throw new Error(`Side panel errors: ${errors.join(" | ")}`);
  },
});

export const expect = test.expect;

export async function setStorage(ext: Page, values: Record<string, unknown>): Promise<void> {
  await ext.evaluate((v) => chrome.storage.local.set(v), values);
}

export async function getStorage<T = unknown>(ext: Page, key: string): Promise<T> {
  return ext.evaluate(async (k) => (await chrome.storage.local.get(k))[k], key) as Promise<T>;
}

export async function setup(ext: Page, answers: AnswerEntry[] = []): Promise<void> {
  await setStorage(ext, { profile: PROFILE, answers });
}

/** Run the agent in the tab showing `page`, the same way the side panel does (inject + message). */
export async function runIn(ext: Page, page: Page, message: Message): Promise<RunReport | undefined> {
  return ext.evaluate(async ({ url, message }) => {
    const tabs = await chrome.tabs.query({});
    const tab = tabs.find((t) => t.url === url);
    if (tab?.id === undefined) throw new Error(`tab not found: ${url}`);
    await chrome.scripting.executeScript({ target: { tabId: tab.id, allFrames: true }, files: ["content.js"] });
    try {
      return (await chrome.tabs.sendMessage(tab.id, message)) as RunReport | undefined;
    } catch {
      return undefined;
    }
  }, { url: page.url(), message });
}

export function statusOf(report: RunReport | undefined, label: string): string | undefined {
  return report?.fields.find((f) => f.field.label === label)?.status;
}

/** Open a side-panel section through the navigation drawer (docked when wide, slide-in when narrow). */
export async function goTo(ext: Page, section: string): Promise<void> {
  const toggle = ext.locator("#nav-toggle");
  if (await toggle.isVisible()) await toggle.click();
  await ext.locator(`#drawer [data-section='${section}']`).click();
  await expect(ext.locator(`#sec-${section}`)).toBeVisible();
}

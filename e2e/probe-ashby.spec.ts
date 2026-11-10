/** Round 8 probe (opt-in: PROBE_ASHBY=1): on real Ashby forms, what the location list shows for "Austin", and which
 * file boxes the extension finds after a fill. Read-only: the same guard as the live runs (nothing is sent). */

import type { Page } from "@playwright/test";
import { appendFileSync } from "node:fs";
import { expect, setStorage, test } from "./fixtures";
import { isReadOnly } from "./live-guard";
import type { Message, Profile } from "../src/shared/types";

const CANDIDATE: Profile = {
  firstName: "Emily", lastName: "Carter", email: "emily.carter.test@example.com", phone: "+1 512 555 0142", location: "Austin, TX", state: "Texas", country: "United States",
  linkedin: "", github: "", portfolio: "", currentCompany: "Northwind Analytics", currentTitle: "Data Engineer", school: "", degree: "", discipline: "",
  graduationYear: "", experienceYears: "5", targetRoles: "", preferredLocations: "", skills: "",
  resume: { name: "Emily_Carter_Resume.txt", type: "text/plain", dataBase64: Buffer.from("Emily Carter, Data Engineer").toString("base64") },
};
const CANDIDATE_ANSWERS: never[] = [];

const URLS = (process.env.PROBE_URLS ?? "").split(",").filter(Boolean);
const OUT = "reports/live1000/probe-ashby.jsonl";

async function send(ext: Page, page: Page, message: Message): Promise<unknown> {
  return ext.evaluate(async ({ url, message }) => {
    const tab = (await chrome.tabs.query({})).find((t) => t.url === url)!;
    await chrome.scripting.executeScript({ target: { tabId: tab.id!, allFrames: true }, files: ["content.js"] }).catch(() => undefined);
    return chrome.tabs.sendMessage(tab.id!, message).catch((e) => String(e));
  }, { url: page.url(), message });
}

test("probe Ashby location lists and file boxes", async ({ ext, context }) => {
  test.skip(!process.env.PROBE_ASHBY, "set PROBE_ASHBY=1");
  test.setTimeout(15 * 60_000);
  await context.route("**/*", (route) => (isReadOnly(route.request()) ? route.continue() : route.abort("blockedbyclient")));
  await setStorage(ext, { profile: CANDIDATE, answers: CANDIDATE_ANSWERS });
  for (const url of URLS) {
    const page = await context.newPage();
    const row: Record<string, unknown> = { url };
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
      await page.locator("input:not([type=hidden])").first().waitFor({ timeout: 20_000 });
      await page.waitForTimeout(2000);
      // 1. The location list, typed by hand (before any fill).
      const loc = page.locator("input[placeholder*='typing' i], input[role=combobox]").first();
      if (await loc.count()) {
        for (const q of ["Austin, TX", "Austin, Texas", "Austin"]) {
          await loc.fill("");
          await loc.pressSequentially(q, { delay: 40 });
          await page.waitForTimeout(2500);
          row[`options:${q}`] = await page.getByRole("option").allInnerTexts().catch(() => []);
        }
        await loc.fill("");
        await page.keyboard.press("Tab");
      }

      // 2. The file boxes the extension sees before and after a fill.
      const before = (await send(ext, page, { type: "GET_FORM_STRUCTURE" })) as { fields?: Array<{ label: string; control: string; name?: string }> };
      row.filesBefore = before?.fields?.filter((f) => f.control === "file");
      await send(ext, page, { type: "RUN", mode: "review", fillOnly: true });
      await page.waitForTimeout(2000);
      const after = (await send(ext, page, { type: "GET_FORM_STRUCTURE" })) as { fields?: Array<{ label: string; control: string; name?: string }> };
      row.filesAfter = after?.fields?.filter((f) => f.control === "file");
      row.afterRaw = JSON.stringify(after).slice(0, 300);
      row.mainAfter = await ext.evaluate(async (url) => {
        const tab = (await chrome.tabs.query({})).find((t) => t.url === url)!;
        const s = await chrome.tabs.sendMessage(tab.id!, { type: "GET_FORM_STRUCTURE" }, { frameId: 0 }).catch((e) => String(e));
        return JSON.stringify(s).slice(0, 1500);
      }, page.url());
      const file = { name: "Cover_Letter_Emily_Carter.pdf", type: "application/pdf", dataBase64: Buffer.from("%PDF-1.4 test").toString("base64") };
      row.attachMain = await ext.evaluate(async ({ url, file }) => {
        const tab = (await chrome.tabs.query({})).find((t) => t.url === url)!;
        return JSON.stringify(await chrome.tabs.sendMessage(tab.id!, { type: "ATTACH_FILE", label: "Cover Letter", file }, { frameId: 0 }).catch((e) => `ERR ${String(e)}`));
      }, { url: page.url(), file });
      row.attachAll = JSON.stringify(await send(ext, page, { type: "ATTACH_FILE", label: "Cover Letter", file }));
      row.ashbyLocationOptions = {};
      const locBox = page.locator("input[placeholder*='typing' i]").first();
      if (await locBox.count()) for (const q of ["United States", "United", ""]) {
        await locBox.fill("");
        if (q) await locBox.pressSequentially(q, { delay: 40 }); else await locBox.press("ArrowDown");
        await page.waitForTimeout(2500);
        (row.ashbyLocationOptions as Record<string, string[]>)[q || "(empty)"] = (await page.getByRole("option").allInnerTexts().catch(() => [])).slice(0, 12);
      }
      row.pingAfter = await send(ext, page, { type: "PING" });
      row.dialogs = await page.evaluate(() => Array.from(document.querySelectorAll("[role=dialog], [aria-modal=true], form")).map((d) => `${d.tagName}:${(d.textContent ?? "").replace(/\s+/g, " ").slice(0, 80)}`));
      row.fileInputs = await page.evaluate(() => Array.from(document.querySelectorAll("input[type=file]")).map((i) => ({ id: i.id, name: (i as HTMLInputElement).name, files: (i as HTMLInputElement).files?.length ?? 0, near: (i.closest("div")?.parentElement?.textContent ?? "").replace(/\s+/g, " ").slice(0, 120) })));
    } catch (e) {
      row.error = String(e).slice(0, 200);
    }
    appendFileSync(OUT, `${JSON.stringify(row)}\n`);
    await page.close();
  }
  expect(true).toBe(true);
});

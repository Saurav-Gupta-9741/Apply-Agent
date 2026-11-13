/** Round 9 probe (opt-in: PROBE_LISTS=1): on real forms, the options each dropdown shows when opened, and what a
 * school list offers for an unlisted school and for "Other". Read-only: the same guard as the live runs. */

import { appendFileSync } from "node:fs";
import { test } from "./fixtures";
import { isReadOnly } from "./live-guard";

const URLS = (process.env.PROBE_URLS ?? "").split(",").filter(Boolean);
const OUT = process.env.PROBE_OUT ?? "reports/live1000/probe-lists.jsonl";

test("probe dropdown options on real forms", async ({ context }) => {
  test.skip(!process.env.PROBE_LISTS, "set PROBE_LISTS=1");
  test.setTimeout(20 * 60_000);
  await context.route("**/*", (route) => (isReadOnly(route.request()) ? route.continue() : route.abort("blockedbyclient")));
  for (const url of URLS) {
    const page = await context.newPage();
    const row: Record<string, unknown> = { url, lists: [] as unknown[] };
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
      await page.locator("input[role=combobox]").first().waitFor({ timeout: 25_000 });
      await page.waitForTimeout(1500);
      const boxes = page.locator("input[role=combobox]");
      const n = await boxes.count();
      for (let i = 0; i < n; i++) {
        const box = boxes.nth(i);
        const label = await box.evaluate((el) => {
          const id = el.getAttribute("id");
          const byFor = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`)?.textContent : "";
          const by = el.getAttribute("aria-labelledby");
          const byId = by ? by.split(/\s+/).map((x) => document.getElementById(x)?.textContent ?? "").join(" ") : "";
          return (byFor || byId || el.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim().slice(0, 120);
        });
        if (!/school|right to work|sponsor|previously worked|hear about|eligible|graduation|degree|state|located|location|live|reside/i.test(label)) continue;
        const entry: Record<string, unknown> = { label };
        try {
          await box.scrollIntoViewIfNeeded();
          await box.click({ timeout: 5000 });
          await page.waitForTimeout(1200);
          entry.open = (await page.getByRole("option").allInnerTexts().catch(() => [])).slice(0, 25);
          if (/school|degree/i.test(label)) {
            for (const q of ["Lone Star State University", "Other", "Savitribai Phule Pune University"]) {
              await box.fill("");
              await box.pressSequentially(q, { delay: 30 });
              await page.waitForTimeout(2500);
              entry[`typed:${q}`] = (await page.getByRole("option").allInnerTexts().catch(() => [])).slice(0, 12);
            }
          } else if (/^(no|yes)\b/i.test(String((entry.open as string[])[0] ?? "")) === false) {
            for (const q of ["No", "Yes"]) {
              await box.fill("");
              await box.pressSequentially(q, { delay: 30 });
              await page.waitForTimeout(1200);
              entry[`typed:${q}`] = (await page.getByRole("option").allInnerTexts().catch(() => [])).slice(0, 12);
            }
          }
          await box.fill("").catch(() => undefined);
          await page.keyboard.press("Escape");
        } catch (e) {
          entry.error = String(e).slice(0, 200);
        }
        (row.lists as unknown[]).push(entry);
      }
    } catch (e) {
      row.error = String(e).slice(0, 300);
    }
    appendFileSync(OUT, `${JSON.stringify(row)}\n`);
    await page.close();
  }
});

/** Round 12 probe (opt-in: PROBE_SITES=1): how Lever's location box, SmartRecruiters' apply step, Personio's apply page
 * and Rippling's lists behave on real pages. Read-only: every non-GET request is blocked, nothing is submitted. */

import type { Page } from "@playwright/test";
import { appendFileSync } from "node:fs";
import { setStorage, test, PROFILE } from "./fixtures";
import { isReadOnly } from "./live-guard";
import type { Message } from "../src/shared/types";

const OUT = "reports/live1000/probe-sites.jsonl";
const log = (row: unknown) => appendFileSync(OUT, `${JSON.stringify(row)}\n`);
async function send(ext: Page, page: Page, message: Message): Promise<unknown> {
  return ext.evaluate(async ({ url, message }) => {
    const tab = (await chrome.tabs.query({})).find((t) => t.url === url)!;
    await chrome.scripting.executeScript({ target: { tabId: tab.id!, allFrames: true }, files: ["content.js"] }).catch(() => undefined);
    return chrome.tabs.sendMessage(tab.id!, message).catch((e) => `ERR ${String(e)}`);
  }, { url: page.url(), message });
}

test("probe sites", async ({ ext, context }) => {
  test.skip(!process.env.PROBE_SITES, "set PROBE_SITES=1");
  test.setTimeout(15 * 60_000);
  await context.route("**/*", (route) => (isReadOnly(route.request()) ? route.continue() : route.abort("blockedbyclient")));
  await setStorage(ext, { profile: { ...PROFILE, location: "Pune", state: "Maharashtra", country: "India" }, answers: [] });
  const page = await context.newPage();

  // Lever: what the location box offers while typing.
  await page.goto("https://jobs.lever.co/angellist/143f5a18-7ea3-4827-851d-9d9c6f9bc894/apply", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  const loc = page.locator("#location-input");
  await loc.click();
  await loc.pressSequentially("Pune", { delay: 60 });
  await page.waitForTimeout(2500);
  const lever = await page.evaluate(() => {
    const box = document.getElementById("location-input")!;
    const around = box.closest(".application-field, li, .application-question")?.outerHTML.slice(0, 1500) ?? "";
    const results = Array.from(document.querySelectorAll(".dropdown-results div, .dropdown-location, [class*='location-result'], [class*='dropdown'] li, [role='option']")).slice(0, 6).map((e) => `${e.tagName}.${(e as HTMLElement).className}: ${(e.textContent ?? "").trim().slice(0, 60)}`);
    return { around, results, hidden: (document.querySelector("input[name=selectedLocation]") as HTMLInputElement)?.value };
  });
  log({ site: "lever", ...lever, around: "" });
  // The fill itself on the same real form (nothing is sent): the location must stick.
  await page.goto("https://jobs.lever.co/angellist/143f5a18-7ea3-4827-851d-9d9c6f9bc894/apply", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  const leverRun = (await send(ext, page, { type: "RUN", mode: "review", fillOnly: true })) as { fields?: Array<{ field: { label: string }; status: string; detail?: string }> } | string;
  const locField = typeof leverRun === "object" ? leverRun.fields?.find((f) => /location/i.test(f.field.label)) : undefined;
  log({ site: "lever-fill", location: locField ? `${locField.status} ${locField.detail ?? ""}` : String(leverRun).slice(0, 200), onPage: await page.locator("#location-input").inputValue(), hidden: await page.locator("input[name=selectedLocation]").inputValue() });

  // SmartRecruiters: the job page, then its "I'm interested" step.
  await page.goto("https://jobs.smartrecruiters.com/CDPROJEKTRED/744000161289789", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  const srButtons = await page.locator("a, button").evaluateAll((els) => els.map((e) => `${e.tagName}: ${(e.textContent ?? "").trim().slice(0, 40)} -> ${(e as HTMLAnchorElement).href ?? ""}`).filter((t) => /interest|apply/i.test(t)).slice(0, 6));
  const opened = await send(ext, page, { type: "OPEN_APPLICATION" });
  await page.waitForTimeout(5000);
  const srAfter = { url: page.url(), inputs: await page.locator("input:not([type=hidden]), textarea, select").count(), frames: page.frames().map((f) => f.url()).filter((u) => u.startsWith("http")).slice(0, 5) };
  const srRun = await send(ext, page, { type: "RUN", mode: "review", fillOnly: true });
  log({ site: "smartrecruiters", srButtons, opened, srAfter, run: String(JSON.stringify(srRun)).slice(0, 600) });

  // Personio: the apply page itself.
  await page.goto("https://ottonova.jobs.personio.de/job/2888695/apply?display=en", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4000);
  const pInputs = await page.locator("input:not([type=hidden]), textarea, select").count();
  const pRun = await send(ext, page, { type: "RUN", mode: "review", fillOnly: true });
  log({ site: "personio", url: page.url(), inputs: pInputs, frames: page.frames().map((f) => f.url()).slice(0, 4), run: String(JSON.stringify(pRun)).slice(0, 600) });

  // Rippling: the lists that did not keep the choice.
  await page.goto("https://ats.rippling.com/rippling/jobs/eb23a6c5-2260-4fb7-b1a5-7e4d23c4417d", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4000);
  const rip = await page.evaluate(() => Array.from(document.querySelectorAll("label")).filter((l) => /gender|hispanic|veteran/i.test(l.textContent ?? "")).slice(0, 2).map((l) => (l.closest("div[class]")?.parentElement?.outerHTML ?? l.outerHTML).slice(0, 1500)));
  log({ site: "rippling", url: page.url(), rip });
});

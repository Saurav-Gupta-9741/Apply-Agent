/** Round 12 probe 2 (opt-in: PROBE_SITES=1): which events make Lever's location box search, and what SmartRecruiters'
 * application step shows. Read-only: every non-GET request is blocked, nothing is submitted. */

import { appendFileSync } from "node:fs";
import { test } from "./fixtures";
import { isReadOnly } from "./live-guard";

const log = (row: unknown) => appendFileSync("reports/live1000/probe-sites2.jsonl", `${JSON.stringify(row)}\n`);

test("probe sites 2", async ({ context }) => {
  test.skip(!process.env.PROBE_SITES, "set PROBE_SITES=1");
  test.setTimeout(10 * 60_000);
  await context.route("**/*", (route) => (isReadOnly(route.request()) ? route.continue() : route.abort("blockedbyclient")));
  const page = await context.newPage();
  for (const variant of ["input+keyup", "keydown+input+keyup per char", "keyup with keyCode"]) {
    await page.goto("https://jobs.lever.co/angellist/143f5a18-7ea3-4827-851d-9d9c6f9bc894/apply", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);
    const shown = await page.evaluate(async (v) => {
      const box = document.getElementById("location-input") as HTMLInputElement;
      box.focus();
      const set = (val: string) => Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(box, val);
      if (v === "input+keyup") {
        set("Pune");
        box.dispatchEvent(new Event("input", { bubbles: true }));
        box.dispatchEvent(new KeyboardEvent("keyup", { key: "e", bubbles: true }));
      } else if (v === "keydown+input+keyup per char") {
        let acc = "";
        for (const ch of "Pune") {
          box.dispatchEvent(new KeyboardEvent("keydown", { key: ch, bubbles: true }));
          acc += ch;
          set(acc);
          box.dispatchEvent(new Event("input", { bubbles: true }));
          box.dispatchEvent(new KeyboardEvent("keyup", { key: ch, bubbles: true }));
        }
      } else {
        set("Pune");
        box.dispatchEvent(new Event("input", { bubbles: true }));
        const e = new KeyboardEvent("keyup", { key: "e", bubbles: true });
        Object.defineProperty(e, "keyCode", { get: () => 69 });
        Object.defineProperty(e, "which", { get: () => 69 });
        box.dispatchEvent(e);
      }
      await new Promise((r) => setTimeout(r, 3000));
      return Array.from(document.querySelectorAll(".dropdown-results > .dropdown-location")).map((e) => e.textContent?.trim()).slice(0, 3);
    }, variant);
    log({ site: "lever-events", variant, shown });
  }
  await page.goto("https://jobs.smartrecruiters.com/oneclick-ui/company/CDPROJEKTRED/publication/e5eb55ad-fae9-4064-9584-0eb422d18276?dcr_ci=CDPROJEKTRED", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(6000);
  log({
    site: "smartrecruiters-oneclick", url: page.url(), title: await page.title(),
    inputs: await page.locator("input:not([type=hidden]), textarea, select").count(),
    shadowInputs: await page.evaluate(() => { let n = 0; const walk = (r: Document | ShadowRoot) => { for (const el of Array.from(r.querySelectorAll("*"))) { if (el.shadowRoot) { n += el.shadowRoot.querySelectorAll("input, textarea, select").length; walk(el.shadowRoot); } } }; walk(document); return n; }),
    text: (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 400),
    captcha: await page.evaluate(() => !!document.querySelector("iframe[src*='captcha'], .g-recaptcha, .h-captcha, .cf-turnstile, iframe[src*='turnstile']")),
  });
});

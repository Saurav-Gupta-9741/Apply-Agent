/** Beta 2: the bundled practice form (onboarding's "try it in 5 seconds") really fills, names missing fields, and
 * submits only after the user ticks consent. In beta 1 Chrome refused to script it and its submit reloaded it empty. */
import { test, expect, setup } from "./fixtures";
import type { RunReport } from "../src/shared/types";

test("practice form fills, explains what is missing, and confirms after the user ticks consent", async ({ context, extensionId, ext }) => {
  await setup(ext);
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(`chrome-extension://${extensionId}/demo-form.html`);

  // The panel's own path: the page script answers PING and RUN (no injection is possible on an extension page).
  const report = await ext.evaluate(async (url) => {
    const tab = (await chrome.tabs.query({})).find((t) => t.url === url)!;
    const ping = await chrome.tabs.sendMessage(tab.id!, { type: "PING" });
    const run = (await chrome.tabs.sendMessage(tab.id!, { type: "RUN", mode: "review" })) as RunReport;
    return { ping, run };
  }, page.url());
  expect(report.ping).toMatchObject({ form: true, handsOff: false });
  const status = (label: string) => report.run.fields.find((f) => f.field.label.startsWith(label))?.status;
  expect(status("First Name")).toBe("filled");
  expect(status("Email Address")).toBe("filled");
  expect(status("Attach Resume")).toBe("filled");
  expect(status("Total Years of Experience")).toBe("filled");
  expect(status("I consent")).toBe("needs_user"); // never ticked for the user
  await expect(page.locator("#first_name")).toHaveValue("Asha");

  // Submitting now names each missing field instead of a bare "is required".
  await page.click("#submit-btn");
  await expect(page.locator("#form-errors")).toContainText("Consent is required");
  await expect(page.locator("#form-errors")).toContainText("Notice Period is required");

  await page.selectOption("#notice", "30_days");
  await page.check("input[name='work_auth'][value='yes']");
  await page.check("#consent");
  await page.click("#submit-btn");
  await expect(page.locator("#success-message")).toBeVisible();
  expect(page.url()).not.toContain("?"); // no reload into an empty form
  expect(errors.filter((e) => /Content Security Policy/.test(e))).toEqual([]);
});

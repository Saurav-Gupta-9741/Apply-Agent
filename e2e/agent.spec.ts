/** The agent on real pages in real Chromium: filling, asking, submitting, confirming, and refusing. */

import type { ApplicationRecord } from "../src/shared/types";
import { ANSWERS, BASE, expect, getStorage, runIn, setup, statusOf, test } from "./fixtures";

const submitsOn = (page: import("@playwright/test").Page) => page.evaluate(() => sessionStorage.getItem("submits"));

test("fills profile facts, attaches the resume, picks the right dropdown option, and asks the rest", async ({ ext, context }) => {
  await setup(ext);
  const page = await context.newPage();
  await page.goto(`${BASE}/apply.html`);
  const report = await runIn(ext, page, { type: "RUN", mode: "review" });

  expect(report?.status).toBe("needs_user");
  expect(report?.platform).toBe("greenhouse"); // matched by the #application-form layout
  await expect(page.locator("#first_name")).toHaveValue("Asha");
  await expect(page.locator("#last_name")).toHaveValue("Verma");
  await expect(page.locator("#email")).toHaveValue("asha@example.com");
  await expect(page.locator("#phone")).toHaveValue("+91 90000 00000");
  await expect(page.locator("#linkedin")).toHaveValue("https://linkedin.com/in/asha");
  await expect(page.locator("#exp")).toHaveValue("2");
  await expect(page.locator("#degree")).toHaveValue("Master's Degree");
  await expect(page.locator("#city")).toHaveValue("Pune, Maharashtra, India"); // not "Punta Gorda, Florida"
  await expect(page.locator("#file-name")).toHaveText("Asha_Verma_Resume.pdf"); // real file attached in real Chrome
  await expect(page.locator("input[name='alerts']")).not.toBeChecked();
  await expect(page.locator("input[name='privacy']")).not.toBeChecked();
  await expect(page.locator("#python")).toHaveValue(""); // skill-specific: never the total
  await expect(page.locator("#why")).toHaveValue("");

  for (const question of [
    "Are you legally authorized to work in India?", "What is your notice period?",
    "How many years of experience do you have with Python?", "Why do you want to join Acme?", "I agree to the privacy policy",
  ]) expect(statusOf(report, question), question).toBe("needs_user");
  expect(statusOf(report, "Email me about future jobs")).toBe("skipped");
  expect(await submitsOn(page)).toBeNull();
});

test("with the user's answers: ready in review mode, then submits exactly once with confirmed proof", async ({ ext, context }) => {
  await setup(ext, ANSWERS);
  const page = await context.newPage();
  await page.goto(`${BASE}/apply.html`);

  const filled = await runIn(ext, page, { type: "RUN", mode: "review" });
  expect(filled?.status).toBe("ready_to_submit");
  await expect(page.locator("input[name='auth'][value='yes']")).toBeChecked();
  await expect(page.locator("#notice")).toHaveValue("30 days");
  expect(await submitsOn(page)).toBeNull(); // review mode never submits on its own

  const submitted = await runIn(ext, page, { type: "SUBMIT" });
  expect(submitted?.status).toBe("submitted_confirmed");
  expect(await submitsOn(page)).toBe("1");
  await expect.poll(async () => (await getStorage<ApplicationRecord[]>(ext, "applications"))?.[0]?.status).toBe("applied_confirmed");
  const [record] = await getStorage<ApplicationRecord[]>(ext, "applications");
  expect(record?.confirmationText).toContain("Thank you for applying");
  expect(record?.jobTitle).toBe("Backend Engineer");
});

test("stops for a CAPTCHA and does not submit", async ({ ext, context }) => {
  await setup(ext, ANSWERS);
  const page = await context.newPage();
  await page.goto(`${BASE}/apply.html?captcha=1`);
  const report = await runIn(ext, page, { type: "RUN", mode: "auto" });
  expect(report?.status).toBe("needs_user");
  expect(report?.captcha).toBe(true);
  expect(await submitsOn(page)).toBeNull();
});

test("records the confirmation shown on the next page after a redirect", async ({ ext, context }) => {
  await setup(ext, ANSWERS);
  const page = await context.newPage();
  await page.goto(`${BASE}/apply.html?redirect=1`);
  await runIn(ext, page, { type: "RUN", mode: "auto" }); // the page navigates away mid-request
  await page.waitForURL("**/thanks.html");
  await expect.poll(async () => (await getStorage<ApplicationRecord[]>(ext, "applications"))?.[0]?.status, { timeout: 15_000 })
    .toBe("applied_confirmed");
  expect(await submitsOn(page)).toBe("1");
});

test("reports the site's error instead of claiming success, and leaves no stale 'in progress' record", async ({ ext, context }) => {
  await setup(ext, ANSWERS);
  const page = await context.newPage();
  await page.goto(`${BASE}/apply.html?fail=1`);
  const report = await runIn(ext, page, { type: "RUN", mode: "auto" });
  expect(report?.status).toBe("needs_user");
  expect(report?.errors).toContain("Server error: please try again later");
  await expect.poll(async () => (await getStorage<ApplicationRecord[]>(ext, "applications")) ?? []).toEqual([]);
});

test("refuses to submit an incomplete form and names the missing fields", async ({ ext, context }) => {
  await setup(ext);
  const page = await context.newPage();
  await page.goto(`${BASE}/apply.html`);
  const report = await runIn(ext, page, { type: "SUBMIT" });
  expect(report?.status).toBe("needs_user");
  expect(report?.errors.join(" ")).toContain("First Name");
  expect(await submitsOn(page)).toBeNull();
});

test("never overwrites what the user typed", async ({ ext, context }) => {
  await setup(ext);
  const page = await context.newPage();
  await page.goto(`${BASE}/apply.html`);
  await page.fill("#first_name", "Ash");
  const report = await runIn(ext, page, { type: "RUN", mode: "review" });
  await expect(page.locator("#first_name")).toHaveValue("Ash");
  expect(statusOf(report, "First Name")).toBe("already_filled");
});

test("a real React app receives every value in its state", async ({ ext, context }) => {
  await setup(ext, ANSWERS);
  const page = await context.newPage();
  await page.goto(`${BASE}/react.html`);
  await page.locator("#fullName").waitFor();
  const report = await runIn(ext, page, { type: "RUN", mode: "auto" });
  expect(report?.status).toBe("submitted_confirmed");
  const state = JSON.parse((await page.locator("#submitted-state").textContent()) ?? "{}");
  expect(state).toEqual({
    fullName: "Asha Verma", email: "asha@example.com", degree: "ms", relocate: "yes", consent: true, resumeName: "Asha_Verma_Resume.pdf",
  });
});

test("fills a form embedded in an iframe (how many company sites embed their job board)", async ({ ext, context }) => {
  await setup(ext, ANSWERS);
  const page = await context.newPage();
  await page.goto(`${BASE}/embed.html`);
  const frame = page.frameLocator("#app-frame");
  await frame.locator("#first_name").waitFor();
  const report = await runIn(ext, page, { type: "RUN", mode: "review" });
  expect(report?.status).toBe("ready_to_submit");
  await expect(frame.locator("#first_name")).toHaveValue("Asha");
  await expect(frame.locator("#file-name")).toHaveText("Asha_Verma_Resume.pdf");
});

test("handles a 60-question form quickly, leaves optional unknowns blank, and never executes label markup", async ({ ext, context }) => {
  await setup(ext);
  const page = await context.newPage();
  await page.goto(`${BASE}/long.html`);
  const started = Date.now();
  const report = await runIn(ext, page, { type: "RUN", mode: "review" });
  const elapsed = Date.now() - started;
  expect(elapsed).toBeLessThan(5_000);
  expect(report?.fields).toHaveLength(63);
  expect(report?.status).toBe("ready_to_submit");
  expect(report?.fields.filter((f) => f.status === "skipped")).toHaveLength(60);
  expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
});

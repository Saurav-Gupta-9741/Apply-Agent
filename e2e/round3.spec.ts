/** Round 3 of the hard cases, in real Chromium. 127.0.0.2 plays a company site the user has NOT allowed
 * (the test build allows only 127.0.0.1 and localhost). */

import type { Page } from "@playwright/test";
import { ANSWERS, BASE, expect, goTo, PROFILE, runIn, setStorage, test } from "./fixtures";

const NOT_ALLOWED = "http://127.0.0.2:8181";

/** The newest tab (its address is hidden from the extension on a site that is not allowed). */
async function newestTabId(ext: Page): Promise<number> {
  return ext.evaluate(async () => Math.max(...(await chrome.tabs.query({})).map((t) => t.id ?? -1)));
}

async function pin(ext: Page, tabId: number): Promise<void> {
  await ext.goto(`${ext.url().split("?")[0]}?tabId=${tabId}`);
  await goTo(ext, "apply");
}

test("a form embedded from an allowed site works inside a company page that is not allowed", async ({ ext, context }) => {
  await setStorage(ext, { profile: PROFILE, answers: ANSWERS });
  const page = await context.newPage();
  await page.goto(`${NOT_ALLOWED}/embed.html?frame=${BASE}/apply.html`);
  const frame = page.frameLocator("#app-frame");
  await frame.locator("#first_name").waitFor();
  await pin(ext, await newestTabId(ext));

  await expect(ext.locator("#page-access")).toHaveText("Form allowed");
  await expect(ext.locator("#page-host")).toHaveText("Form from 127.0.0.1:8181");
  await expect(ext.locator("#run")).toBeEnabled();
  await ext.locator("#run").click();
  await expect(frame.locator("#first_name")).toHaveValue("Asha");
  await expect(ext.locator("#status")).toBeVisible();
});

test("a page on a site that is not allowed: the panel says how to use ApplyAgent there, and Fill stays off", async ({ ext, context }) => {
  const page = await context.newPage();
  await page.goto(`${NOT_ALLOWED}/apply.html`);
  await pin(ext, await newestTabId(ext));
  await expect(ext.locator("#page-host")).toHaveText("This page");
  await expect(ext.locator("#page-url")).toContainText("Click the ApplyAgent icon");
  await expect(ext.locator("#run")).toBeDisabled();
  expect(await page.locator("#first_name").inputValue()).toBe("");
});

// --- Workday-style flow, resume autofill, the queue on multi-page applications, the work-history editor ---------
const WORK_PROFILE = {
  ...PROFILE,
  workHistory: [
    { title: "Data Engineer", company: "Initech", location: "Pune", start: "2024-03", end: "", current: true, summary: "Data pipelines" },
    { title: "Analyst", company: "Globex", location: "Mumbai", start: "2022-01", end: "2024-02", current: false, summary: "" },
  ],
};
const WORK_ANSWERS = [
  ...ANSWERS,
  { question: "Phone Device Type", answer: "Mobile", updatedAt: "2026-10-26T00:00:00Z" },
  { question: "How Did You Hear About Us?", answer: "Company Website", updatedAt: "2026-10-26T00:00:00Z" },
];

async function tabOf(ext: Page, url: string): Promise<number> {
  return ext.evaluate(async (u) => (await chrome.tabs.query({})).find((t) => t.url === u)!.id!, url);
}

test("Workday-style: sign-in wall, then Save and Continue through dropdowns, typeahead, work blocks, to Review", async ({ ext, context }) => {
  await setStorage(ext, { profile: WORK_PROFILE, answers: WORK_ANSWERS });
  const page = await context.newPage();
  await page.goto(`${BASE}/workday.html`);
  await pin(ext, await tabOf(ext, page.url()));

  await ext.locator("#run").click();
  await expect(ext.locator("#status")).toContainText("asks you to sign in");
  await expect(page.locator("#si-pass")).toHaveValue(""); // passwords are the user's

  // The user signs in themselves.
  await page.locator("#si-email").fill("asha@example.com");
  await page.locator("#si-pass").fill("hunter2");
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page.locator("#given")).toBeVisible();

  await ext.locator("#run").click();
  await expect(ext.locator("#status")).toContainText("Completed 2 steps", { timeout: 60_000 });
  await expect(page.getByRole("heading", { name: "Review" })).toBeVisible();
  await expect(page.locator("#submits")).toHaveText("0"); // review mode: nothing sent yet

  await ext.locator("#submit").click();
  await expect(ext.locator("#status")).toContainText("Applied");
  await expect(page.locator("#submits")).toHaveText("1");
});

test("Workday-style details: dropdown choices, typeahead pick, MM/YYYY dates, one block per job", async ({ ext, context }) => {
  await setStorage(ext, { profile: WORK_PROFILE, answers: WORK_ANSWERS });
  const page = await context.newPage();
  await page.goto(`${BASE}/workday.html?signedin=1`);
  // Record every step's values as the agent presses Save and Continue.
  const seen: Record<string, string> = {};
  await page.exposeFunction("__record", (k: string, v: string) => void (seen[k] = v));
  await page.evaluate(() => {
    const record = (window as unknown as { __record: (k: string, v: string) => void }).__record;
    document.addEventListener("submit", () => {
      const el = (id: string) => document.getElementById(id) as HTMLInputElement | null;
      for (const id of ["country", "device", "hear"]) if (el(id)) record(id, el(id)!.textContent ?? "");
      for (const id of ["given", "family", "city", "phone", "title-1", "company-1", "from-1", "to-1", "title-2", "company-2", "from-2", "to-2"]) {
        if (el(id)) record(id, el(id)!.value);
      }
      for (const id of ["current-1", "current-2"]) if (el(id)) record(id, String(el(id)!.checked));
    }, true);
  });
  const report = await runIn(ext, page, { type: "RUN", mode: "review" });
  expect(report?.status).toBe("ready_to_submit");
  expect(seen).toMatchObject({
    country: "India", device: "Mobile", hear: "Company Website", given: "Asha", family: "Verma",
    city: "Pune, Maharashtra, India", phone: PROFILE.phone,
    "title-1": "Data Engineer", "company-1": "Initech", "from-1": "03/2024", "to-1": "", "current-1": "true",
    "title-2": "Analyst", "company-2": "Globex", "from-2": "01/2022", "to-2": "02/2024", "current-2": "false",
  });
});

test("resume autofill: the resume goes first, the site's own parsing is waited for, never overwritten, and flagged", async ({ ext, context }) => {
  await setStorage(ext, { profile: PROFILE, answers: ANSWERS });
  const page = await context.newPage();
  await page.goto(`${BASE}/autofill.html`);
  const report = await runIn(ext, page, { type: "RUN", mode: "auto" });
  await expect(page.locator("#first_name")).toHaveValue("ASHA"); // the site's value is kept…
  await expect(page.locator("#phone")).toHaveValue("+1 555 0100"); // …even when it is wrong,
  expect(report?.fields.find((f) => f.field.label === "Phone")?.review).toBe(true); // but the user is told
  expect(report?.fields.find((f) => f.field.label === "First Name")?.review).toBeUndefined(); // same name, other case
  await expect(page.locator("#email")).toHaveValue(PROFILE.email);
  expect(await page.evaluate(() => sessionStorage.getItem("autofillSubmits"))).toBeNull(); // auto mode held back
});

test("the queue carries a page-per-step application to its last step", async ({ ext, context }) => {
  await setStorage(ext, {
    profile: PROFILE, answers: ANSWERS, settings: { mode: "review", maxParallel: 1, perHostMax: 1, dailyCap: 25, cooldownDays: 30 },
  });
  await ext.evaluate(() => chrome.runtime.sendMessage({
    type: "QUEUE_ADD", jobs: [{ url: "http://127.0.0.1:8181/step1.html", title: "Data Engineer", company: "Acme" }],
  }));
  await ext.evaluate(() => chrome.runtime.sendMessage({ type: "QUEUE_START" }));
  await expect.poll(async () => ((await ext.evaluate(() => chrome.storage.local.get("queue"))).queue as Array<{ status: string }>)[0]?.status,
    { timeout: 60_000 }).toBe("ready");
  const tab = context.pages().find((p) => p.url().includes("step2.html"));
  expect(tab).toBeDefined();
  await expect(tab!.locator("#ct")).toHaveValue("Pune");
});

test("work history can be added, edited and removed in Profile & plan", async ({ ext }) => {
  await setStorage(ext, { profile: PROFILE });
  await ext.reload();
  await goTo(ext, "profile");
  await ext.locator("#add-job").click();
  const row = ext.locator(".work-row").first();
  await row.locator("[data-work='title']").fill("Data Engineer");
  await row.locator("[data-work='company']").fill("Initech");
  await row.locator("[data-work='start']").fill("2024-03");
  await row.locator("[data-work='current']").check();
  await expect(row.locator("[data-work='end']")).toBeDisabled();
  await ext.locator("#add-job").click();
  await ext.locator(".work-row").nth(1).locator("[data-work='title']").fill("Analyst");
  await ext.locator(".work-row").nth(1).getByRole("button", { name: "Remove job 2" }).click();
  await ext.locator("#save-profile").click();
  await expect.poll(async () => (await ext.evaluate(() => chrome.storage.local.get("profile"))).profile?.workHistory)
    .toEqual([{ title: "Data Engineer", company: "Initech", location: "", start: "2024-03", end: "", current: true, summary: "" }]);
});

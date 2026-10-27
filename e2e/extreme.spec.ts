/** Extreme cases in real Chromium, through the panel's own UI. */

import type { QueueItem } from "../src/shared/types";
import { ANSWERS, BASE, expect, getStorage, goTo, OTHER_SITE, PROFILE, setStorage, test } from "./fixtures";

test("hard form: never types ID numbers or signatures, flags a wrong pre-fill, and shows fields on the page", async ({ ext, context }) => {
  await setStorage(ext, { profile: PROFILE, answers: [] });
  const page = await context.newPage();
  await page.goto(`${BASE}/extreme.html`);
  const tabId = await ext.evaluate(async (url) => (await chrome.tabs.query({})).find((t) => t.url === url)!.id!, page.url());
  await ext.goto(`${ext.url().split("?")[0]}?tabId=${tabId}`);
  await goTo(ext, "apply");
  await ext.locator("#auto-mode, input[name='mode'][value='auto']").first().check({ force: true });
  await ext.locator("#run").click();

  await expect(ext.locator("#status")).toContainText("differ");
  await expect(page.locator("#email")).toHaveValue("old.address@example.org"); // never overwritten
  await expect(page.locator("#aadhaar")).toHaveValue("");
  await expect(page.locator("#sign")).toHaveValue("");
  expect(await page.evaluate(() => sessionStorage.getItem("submits"))).toBeNull(); // auto mode did not submit

  const aadhaar = ext.locator(".question", { hasText: "Aadhaar number" });
  await expect(aadhaar).toContainText("never stores or types ID numbers");
  await expect(aadhaar.locator("input, textarea, select")).toHaveCount(0);
  const signature = ext.locator(".question", { hasText: "Type your full name to sign" });
  await expect(signature).toContainText("never signs for you");
  await expect(ext.locator(".question", { hasText: "Cover letter" })).toContainText("Attach this file yourself");
  await expect(ext.locator(".question", { hasText: "In one line, why us?" }).locator("input")).toHaveAttribute("maxlength", "50");

  await aadhaar.getByRole("button", { name: "Show on page" }).click();
  await expect.poll(() => page.evaluate(() => {
    const el = document.getElementById("aadhaar")!.closest(".field") as HTMLElement;
    return el.style.outline;
  })).toContain("solid");
});

test("questions inbox: one question shared by two waiting jobs is answered once and both continue", async ({ ext }) => {
  const missing = "Why do you want to join Acme?";
  await setStorage(ext, {
    profile: PROFILE,
    answers: ANSWERS.filter((a) => a.question !== missing),
    settings: { mode: "auto", maxParallel: 2, perHostMax: 2, dailyCap: 25, cooldownDays: 30 },
  });
  await ext.evaluate((m) => chrome.runtime.sendMessage(m), {
    type: "QUEUE_ADD",
    jobs: [
      { url: `${BASE}/apply.html`, title: "Backend Engineer", company: "Acme" },
      { url: `${OTHER_SITE}/apply.html`, title: "Backend Engineer", company: "Acme India" },
    ],
  });
  await ext.evaluate((m) => chrome.runtime.sendMessage(m), { type: "QUEUE_START" });
  await expect.poll(async () => ((await getStorage<QueueItem[]>(ext, "queue")) ?? []).map((q) => q.status).join(","), { timeout: 45_000 })
    .toBe("needs_user,needs_user");

  await goTo(ext, "queue");
  const inbox = ext.locator("#inbox");
  await expect(inbox).toContainText("Questions inbox · 1 for 2 jobs");
  const card = inbox.locator(".question", { hasText: missing });
  await expect(card).toContainText("2 jobs");
  await card.locator("textarea").fill("I want to build reliable payment systems at scale.");
  await card.getByRole("button", { name: "Save answer" }).click();

  await expect.poll(async () => ((await getStorage<QueueItem[]>(ext, "queue")) ?? []).map((q) => q.status).join(","), { timeout: 45_000 })
    .toBe("applied,applied");
  await expect(inbox).toBeHidden();
});

/** Raw images for the Chrome Web Store listing: the practice form beside the side panel, and the panel's main
 * sections, all with made-up companies (store images must not suggest ties to real employers).
 * Run with: STORE=1 npx playwright test e2e/store-shots.spec.ts  → test-results/store/*.png
 * Then: python scripts/store-shots.py  → store/screenshot-*.png (1280×800, with captions) */
import { ANSWERS, BASE, expect, goTo, PROFILE, setStorage, test } from "./fixtures";

test.skip(!process.env.STORE, "store images run only with STORE=1");

const now = Date.now();
const ago = (m: number) => new Date(now - m * 60_000).toISOString();
const OUT = "test-results/store";

test("store images", async ({ ext, context }) => {
  await setStorage(ext, {
    profile: {
      ...PROFILE, targetRoles: "Backend Engineer, Data Engineer", location: "Pune", country: "India",
      facts: { workCountries: "India", noticePeriod: "30 days", currentCtc: "12 LPA", expectedCtc: "18 LPA", relocate: "Yes", heardFrom: "LinkedIn",
        gender: "", hispanic: "", race: "", veteran: "", disability: "" },
    },
    answers: ANSWERS.filter((a) => !/legally|Why/.test(a.question)),
    applications: [
      { id: "a1", url: "https://jobs.example/northwind/1", platform: "greenhouse", jobTitle: "Backend Engineer", status: "applied_confirmed", createdAt: ago(40), confirmationText: "Thank you for applying! We received your application." },
      { id: "a2", url: "https://jobs.example/bluepeak/2", platform: "lever", jobTitle: "Data Engineer", status: "needs_check", createdAt: ago(300) },
      { id: "a3", url: "https://jobs.example/orbit/3", platform: "ashby", jobTitle: "Software Engineer, Platform", status: "applied_confirmed", createdAt: ago(1500), confirmationText: "Your application was successfully submitted." },
    ],
    queue: [
      { id: "q1", url: "https://jobs.example/lumen/1", title: "Backend Engineer", company: "Lumen Labs", status: "running", addedAt: ago(5), updatedAt: ago(1), note: "Opening…" },
      { id: "q2", url: "https://jobs.example/northwind/2", title: "Software Engineer", company: "Northwind", status: "ready", addedAt: ago(9), updatedAt: ago(2), note: "Filled. Review the tab, then press Submit." },
      { id: "q3", url: "https://jobs.example/orbit/3", title: "Platform Engineer", company: "Orbit Systems", status: "needs_user", addedAt: ago(12), updatedAt: ago(3), note: "2 question(s) need your answer" },
      { id: "q4", url: "https://jobs.example/bluepeak/4", title: "Product Analyst", company: "Bluepeak", status: "applied", addedAt: ago(20), updatedAt: ago(8), note: "Thank you for applying!" },
    ],
    queueRunning: false, // shown as data only
  });

  // 1. The practice form (left) after a Fill, and the panel's report (right).
  const page = await context.newPage();
  await page.setViewportSize({ width: 880, height: 800 });
  await page.goto(`${BASE}/apply.html`);
  const tabId = await ext.evaluate(async (url) => (await chrome.tabs.query({})).find((t) => t.url === url)!.id!, page.url());
  await ext.setViewportSize({ width: 400, height: 800 });
  await ext.goto(`${ext.url().split("?")[0]}?tabId=${tabId}`);
  await ext.evaluate(() => document.fonts.ready);
  await goTo(ext, "apply");
  await ext.locator("#run").click();
  // Done when the panel stops "reading" and reports (the field list itself may sit in a collapsed section).
  await expect(ext.locator("#status")).not.toHaveText(/Reading the form/, { timeout: 30_000 });
  await ext.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/fill-page.png` });
  await ext.screenshot({ path: `${OUT}/fill-panel.png` });

  // 2–4. Panel sections on their own. In front: a background tab never finishes the drawer's closing animation.
  await ext.bringToFront();
  for (const section of ["queue", "answers", "tracker"]) {
    await goTo(ext, section);
    await ext.waitForTimeout(900); // the drawer finishes closing
    await ext.screenshot({ path: `${OUT}/${section}.png` });
  }
});

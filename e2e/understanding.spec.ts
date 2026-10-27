/** The local question model running inside the extension, in real Chromium (offline: the test build has no network
 * access to model hosts; everything it needs ships in the extension). */

import { BASE, expect, PROFILE, runIn, setStorage, test } from "./fixtures";

type Reading = { intent: string; confidence: number } | null;

test("the model runs offline in the extension and reads what questions mean", async ({ ext }) => {
  const texts = ["Joining timeline?", "Preferred Last Name", "What city do you live in?", "Where did you first hear about this role?", "Why do you want to work with us?"];
  const started = Date.now();
  const readings = await ext.evaluate((t) => chrome.runtime.sendMessage({ type: "UNDERSTAND", texts: t }), texts) as Reading[];
  const firstMs = Date.now() - started;
  console.log("READINGS", JSON.stringify(readings), `first call ${firstMs} ms`);
  expect(readings.map((r) => r?.intent)).toEqual(["notice_period", "lastName", "location", "heard_about", "open_question"]);

  const again = Date.now();
  await ext.evaluate(() => chrome.runtime.sendMessage({ type: "UNDERSTAND", texts: ["Your current employer", "Mobile number"] }));
  const warmMs = Date.now() - again;
  console.log(`warm call for 2 questions: ${warmMs} ms`);
  expect(warmMs).toBeLessThan(2000);
});

test("questions the rules don't know are filled through the model, safely", async ({ ext, context }) => {
  await setStorage(ext, {
    profile: { ...PROFILE, facts: { workCountries: "India", noticePeriod: "30 days", currentCtc: "", expectedCtc: "", relocate: "", heardFrom: "LinkedIn",
      gender: "Female", hispanic: "", race: "", veteran: "", disability: "" } },
    answers: [],
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/understanding.html`);
  const report = await runIn(ext, page, { type: "RUN", mode: "review" });
  const by = (label: string) => report?.fields.find((f) => f.field.label === label);
  console.log("FIELDS", JSON.stringify(report?.fields.map((f) => [f.field.label, f.status, f.decision.kind])));
  await expect(page.locator("#heard")).toHaveValue("LinkedIn"); // "Where did you FIRST hear…": no rule matches the wording
  await expect(page.locator("#sex")).toHaveValue("Female");
  // Someone else's details and a yes/no question stay with the user, whatever the model reads.
  await expect(page.locator("#mentor")).toHaveValue("");
  expect(by("Do you have a mentor at our company? Their full name")?.status).not.toBe("filled");
});

test("a question reads exactly the same whatever other questions are on the form", async ({ ext }) => {
  const texts = [
    "Email", "Phone", "LinkedIn Profile", "How did you hear about us?", "What is your notice period?",
    "Are you legally authorized to work in the United States without the need for employer sponsorship, now or in the future?",
    "Expected salary (INR, per annum)", "Current company", "Gender", "Please describe a project you are proud of and what your role was in it.",
    "Website", "City", "Do you identify as a veteran?", "Preferred first name", "Years of experience",
    "Earliest start date", "GitHub", "Willing to relocate?",
  ];
  const batched = await ext.evaluate((t) => chrome.runtime.sendMessage({ type: "UNDERSTAND", texts: t }), texts) as Reading[];
  // A fresh worker-side cache is avoided by asking for each text with a distinguishing (ignored) trailing space.
  const single: Reading[] = [];
  for (const t of texts) single.push(...(await ext.evaluate((x) => chrome.runtime.sendMessage({ type: "UNDERSTAND", texts: [x] }), `${t} `) as Reading[]));
  expect(batched.map((r) => r?.intent)).toEqual(single.map((r) => r?.intent));
  batched.forEach((r, i) => expect(Math.abs(r!.confidence - single[i]!.confidence)).toBeLessThan(1e-6));
});

test("switched off in settings: no readings, and the rules alone fill the form", async ({ ext, context }) => {
  await setStorage(ext, {
    settings: { mode: "review", maxParallel: 3, perHostMax: 2, dailyCap: 25, cooldownDays: 30, detection: "job_sites", understanding: false },
    profile: { ...PROFILE, facts: { workCountries: "India", noticePeriod: "30 days", currentCtc: "", expectedCtc: "", relocate: "", heardFrom: "LinkedIn",
      gender: "Female", hispanic: "", race: "", veteran: "", disability: "" } },
    answers: [],
  });
  expect(await ext.evaluate(() => chrome.runtime.sendMessage({ type: "UNDERSTAND", texts: ["Joining timeline?"] }))).toBeNull();
  const page = await context.newPage();
  await page.goto(`${BASE}/understanding.html`);
  await runIn(ext, page, { type: "RUN", mode: "review" });
  await expect(page.locator("#heard")).toHaveValue(""); // only the model knew this wording
});

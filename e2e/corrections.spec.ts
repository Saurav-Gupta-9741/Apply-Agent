/** Learning from user corrections in real Chromium:
 * When the user edits a field ApplyAgent filled, the correction is tracked and stored.
 * After 2 identical corrections, it is promoted to the answer bank and automatically reused.
 */

import { BASE, expect, PROFILE, runIn, setStorage, test } from "./fixtures";

test("editing a filled field records a correction and remembers it", async ({ ext, context }) => {
  const initialAnswers = [
    { question: "Why do you want to join Acme?", answer: "I love building software", updatedAt: new Date().toISOString() },
  ];
  await setStorage(ext, { profile: PROFILE, answers: initialAnswers, corrections: [] });

  const page = await context.newPage();
  await page.goto(`${BASE}/apply.html`);

  // 1. First run fills #why with initial answer
  const report = await runIn(ext, page, { type: "RUN", mode: "review" });
  expect(report?.status).toBe("needs_user");
  await expect(page.locator("#why")).toHaveValue("I love building software");

  // 2. User edits the field to a new answer and blurs
  const correctedValue = "I want to architect scalable systems.";
  await page.locator("#why").fill(correctedValue);
  await page.locator("#why").blur();

  // Verify correction was recorded with count=1
  await expect.poll(async () => {
    const data = await ext.evaluate(() => chrome.storage.local.get("corrections"));
    return data.corrections?.length;
  }).toBeGreaterThanOrEqual(1);

  const firstCorrection = await ext.evaluate(() => chrome.storage.local.get("corrections"));
  const whyCorrection = (firstCorrection.corrections as Array<{ question: string; answer: string; count: number }> | undefined)?.find(
    (c) => c.question.includes("Why do you want to join")
  );
  expect(whyCorrection?.answer).toBe(correctedValue);
  expect(whyCorrection?.count).toBe(1);

  // 3. Second identical correction promotes to answer bank (AnswerEntry)
  await ext.evaluate(async (ans) => {
    await chrome.runtime.sendMessage({
      type: "RECORD_CORRECTION",
      question: "Why do you want to join Acme?",
      answer: ans,
    });
  }, correctedValue);

  await expect.poll(async () => {
    const data = await ext.evaluate(() => chrome.storage.local.get("answers"));
    return (data.answers as Array<{ question: string; answer: string }> | undefined)?.find(
      (a) => a.question === "Why do you want to join Acme?" && a.answer === correctedValue
    );
  }).toBeTruthy();

  const finalAnswers = await ext.evaluate(() => chrome.storage.local.get("answers"));
  const matched = (finalAnswers.answers as Array<{ question: string; answer: string }>).find(
    (a) => a.question === "Why do you want to join Acme?"
  );
  expect(matched?.answer).toBe(correctedValue);
});

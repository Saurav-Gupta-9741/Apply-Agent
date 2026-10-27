/** The parallel queue in real Chromium: background tabs, limits, confirmations, and the free plan. */

import type { ApplicationRecord, QueueItem } from "../src/shared/types";
import { ANSWERS, BASE, expect, getStorage, OTHER_SITE, setStorage, setup, test } from "./fixtures";

async function send(ext: import("@playwright/test").Page, message: unknown) {
  return ext.evaluate((m) => chrome.runtime.sendMessage(m), message);
}

test("applies on two sites in parallel, skips a second job at the same company, and closes finished tabs", async ({ ext, context }) => {
  await setup(ext, ANSWERS);
  await setStorage(ext, { settings: { mode: "auto", maxParallel: 3, perHostMax: 2, dailyCap: 25, cooldownDays: 30 } });
  await send(ext, {
    type: "QUEUE_ADD",
    jobs: [
      { url: `${BASE}/apply.html?redirect=1`, title: "Backend Engineer", company: "Acme" },
      { url: `${OTHER_SITE}/apply.html`, title: "Backend Engineer", company: "Globex" },
      { url: `${BASE}/apply.html`, title: "Backend Engineer II", company: "Acme" },
    ],
  });
  await send(ext, { type: "QUEUE_START" });

  await expect.poll(async () => {
    const queue = (await getStorage<QueueItem[]>(ext, "queue")) ?? [];
    return queue.map((q) => q.status).sort().join(",");
  }, { timeout: 45_000 }).toBe("applied,applied,skipped");

  const queue = await getStorage<QueueItem[]>(ext, "queue");
  expect(queue.find((q) => q.status === "skipped")?.note).toMatch(/same company|this company/i);
  const applied = (await getStorage<ApplicationRecord[]>(ext, "applications")).filter((a) => a.status === "applied_confirmed");
  expect(applied).toHaveLength(2);

  // Finished tabs close themselves (3 s after confirmation).
  await expect.poll(() => context.pages().filter((p) => /apply\.html|thanks\.html/.test(p.url())).length, { timeout: 10_000 }).toBe(0);
});

test("review mode stops at 'ready', and Submit from the queue submits exactly that item", async ({ ext, context }) => {
  await setup(ext, ANSWERS);
  await setStorage(ext, { settings: { mode: "review", maxParallel: 2, perHostMax: 2, dailyCap: 25, cooldownDays: 30 } });
  await send(ext, { type: "QUEUE_ADD", jobs: [{ url: `${BASE}/apply.html`, title: "Backend Engineer", company: "Acme" }] });
  await send(ext, { type: "QUEUE_START" });

  await expect.poll(async () => (await getStorage<QueueItem[]>(ext, "queue"))?.[0]?.status, { timeout: 30_000 }).toBe("ready");
  const tab = context.pages().find((p) => p.url().includes("apply.html"));
  expect(await tab?.evaluate(() => sessionStorage.getItem("submits"))).toBeNull();

  const [item] = await getStorage<QueueItem[]>(ext, "queue");
  await send(ext, { type: "QUEUE_SUBMIT", id: item!.id });
  await expect.poll(async () => (await getStorage<QueueItem[]>(ext, "queue"))?.[0]?.status, { timeout: 30_000 }).toBe("applied");
});

test("a job that needs the user keeps its tab open with a clear note", async ({ ext, context }) => {
  await setup(ext); // no answers: sensitive questions must be asked
  await setStorage(ext, { settings: { mode: "auto", maxParallel: 1, perHostMax: 1, dailyCap: 25, cooldownDays: 30 } });
  await send(ext, { type: "QUEUE_ADD", jobs: [{ url: `${BASE}/apply.html`, title: "Backend Engineer", company: "Acme" }] });
  await send(ext, { type: "QUEUE_START" });
  await expect.poll(async () => (await getStorage<QueueItem[]>(ext, "queue"))?.[0]?.status, { timeout: 30_000 }).toBe("needs_user");
  const [item] = await getStorage<QueueItem[]>(ext, "queue");
  expect(item?.note).toMatch(/question\(s\) need your answer/);
  expect(context.pages().some((p) => p.url().includes("apply.html"))).toBe(true);
});

test("the free plan stops at 20 applications a month and says so", async ({ ext, context }) => {
  await setup(ext, ANSWERS);
  const thisMonth = new Date().toISOString();
  await setStorage(ext, {
    applications: Array.from({ length: 20 }, (_, i) => ({
      id: `old${i}`, url: `https://example${i}.com/job`, platform: "generic", jobTitle: "Old", status: "applied_confirmed", createdAt: thisMonth,
    })),
  });
  await send(ext, { type: "QUEUE_ADD", jobs: [{ url: `${BASE}/apply.html`, title: "Backend Engineer", company: "Acme" }] });
  await send(ext, { type: "QUEUE_START" });
  await expect.poll(async () => (await getStorage<QueueItem[]>(ext, "queue"))?.[0]?.note ?? "", { timeout: 15_000 })
    .toMatch(/free plan limit/i);
  const [item] = await getStorage<QueueItem[]>(ext, "queue");
  expect(item?.status).toBe("queued");
  expect(context.pages().some((p) => p.url().includes("apply.html"))).toBe(false);
});

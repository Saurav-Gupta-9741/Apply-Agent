import { describe, expect, it } from "vitest";
import {
  applicationUrl, clampSettings, companyKey, DEFAULT_SETTINGS, parseJobList, planNext, splitCsv,
} from "../src/background/queue";
import { queueStatusFor } from "../src/background/runner";
import type { ApplicationRecord, QueueItem, RunReport } from "../src/shared/types";

const NOW = new Date("2026-10-25T10:00:00");

function item(id: string, url: string, status: QueueItem["status"] = "queued"): QueueItem {
  return { id, url, title: "", company: "", status, addedAt: NOW.toISOString(), updatedAt: NOW.toISOString() };
}

function applied(url: string, daysAgo: number): ApplicationRecord {
  return {
    id: url, url, platform: "greenhouse", jobTitle: "", status: "applied_confirmed",
    createdAt: new Date(NOW.getTime() - daysAgo * 86_400_000).toISOString(),
  };
}

describe("companyKey", () => {
  it("separates employers on shared job-board hosts", () => {
    expect(companyKey("https://boards.greenhouse.io/acme/jobs/1")).toBe("boards.greenhouse.io/acme");
    expect(companyKey("https://boards.greenhouse.io/embed/job_app?for=acme")).toBe("boards.greenhouse.io/acme");
    expect(companyKey("https://jobs.lever.co/globex/abc/apply")).toBe("jobs.lever.co/globex");
    expect(companyKey("https://www.careers.acme.com/apply/7")).toBe("careers.acme.com");
  });
});

describe("applicationUrl", () => {
  it("goes straight to the form page on Lever and Ashby", () => {
    expect(applicationUrl("https://jobs.lever.co/acme/123")).toBe("https://jobs.lever.co/acme/123/apply");
    expect(applicationUrl("https://jobs.lever.co/acme/123/apply")).toBe("https://jobs.lever.co/acme/123/apply");
    expect(applicationUrl("https://jobs.ashbyhq.com/acme/abc")).toBe("https://jobs.ashbyhq.com/acme/abc/application");
    expect(applicationUrl("https://boards.greenhouse.io/acme/jobs/1")).toBe("https://boards.greenhouse.io/acme/jobs/1");
  });
});

describe("planNext", () => {
  it("respects the parallel limit", () => {
    const queue = ["a", "b", "c", "d"].map((c, i) => item(String(i), `https://jobs.lever.co/${c}/1`));
    const plan = planNext(queue, [], { ...DEFAULT_SETTINGS, maxParallel: 2, perHostMax: 2 }, NOW);
    expect(plan.start.map((q) => q.id)).toEqual(["0", "1"]);
  });

  it("keeps at most 2 open applications per site", () => {
    const queue = [
      item("r1", "https://jobs.lever.co/a/1", "running"),
      item("r2", "https://jobs.lever.co/b/1", "needs_user"),
      item("q1", "https://jobs.lever.co/c/1"),
      item("q2", "https://boards.greenhouse.io/d/jobs/1"),
    ];
    const plan = planNext(queue, [], { ...DEFAULT_SETTINGS, maxParallel: 5 }, NOW);
    expect(plan.start.map((q) => q.id)).toEqual(["q2"]);
  });

  it("skips companies applied to within the cooldown, but not older ones", () => {
    const queue = [item("1", "https://jobs.lever.co/acme/2"), item("2", "https://jobs.lever.co/globex/9")];
    const history = [applied("https://jobs.lever.co/acme/1", 10), applied("https://jobs.lever.co/globex/1", 45)];
    const plan = planNext(queue, history, DEFAULT_SETTINGS, NOW);
    expect(plan.skip.map((s) => s.item.id)).toEqual(["1"]);
    expect(plan.start.map((q) => q.id)).toEqual(["2"]);
  });

  it("never sends two applications to the same company in one run", () => {
    const queue = [item("1", "https://jobs.lever.co/acme/1"), item("2", "https://jobs.lever.co/acme/2")];
    const plan = planNext(queue, [], DEFAULT_SETTINGS, NOW);
    expect(plan.start.map((q) => q.id)).toEqual(["1"]);
    expect(plan.skip.map((s) => s.item.id)).toEqual(["2"]);
  });

  it("stops at the daily cap", () => {
    const history = Array.from({ length: 3 }, (_, i) => applied(`https://x${i}.com/job`, 0));
    const queue = [item("1", "https://y.com/job"), item("2", "https://z.com/job")];
    const plan = planNext(queue, history, { ...DEFAULT_SETTINGS, dailyCap: 4 }, NOW);
    expect(plan.start.map((q) => q.id)).toEqual(["1"]);
  });
});

describe("queueStatusFor", () => {
  const base: RunReport = { status: "not_a_form", platform: "greenhouse", url: "", jobTitle: "", fields: [], captcha: false, errors: [] };

  it("maps every agent outcome to an honest queue status", () => {
    expect(queueStatusFor(undefined).status).toBe("failed");
    expect(queueStatusFor({ ...base, status: "submitted_confirmed", confirmationText: "Thanks" })).toEqual({ status: "applied", note: "Thanks" });
    expect(queueStatusFor({ ...base, status: "submitted_unconfirmed" }).status).toBe("needs_check");
    expect(queueStatusFor({ ...base, status: "ready_to_submit" }).status).toBe("ready");
    expect(queueStatusFor({ ...base, status: "needs_user", captcha: true, errors: ["Email: invalid"] }))
      .toEqual({ status: "needs_user", note: "Solve the CAPTCHA · Email: invalid" });
  });
});

describe("settings and job lists", () => {
  it("clamps settings to safe ranges", () => {
    expect(clampSettings({ maxParallel: 50, perHostMax: 9, dailyCap: 0 })).toMatchObject({ maxParallel: 5, perHostMax: 2, dailyCap: 1 });
  });

  it("reads pasted URLs and CSV exports, dropping duplicates and invalid lines", () => {
    expect(parseJobList("https://a.com/1\nnot a url\nhttps://a.com/1\nhttps://b.com/2")).toEqual([
      { url: "https://a.com/1", title: "", company: "" },
      { url: "https://b.com/2", title: "", company: "" },
    ]);
    const csv = 'company,title,location,url\nAcme,"Engineer, Backend",Pune,https://jobs.lever.co/acme/1';
    expect(parseJobList(csv)).toEqual([{ url: "https://jobs.lever.co/acme/1", title: "Engineer, Backend", company: "Acme" }]);
  });

  it("splits quoted CSV cells", () => {
    expect(splitCsv('a,"b, c","d ""q"""')).toEqual(["a", "b, c", 'd "q"']);
  });
});

/** Found by the code review and verified: each test pins one fix. */

import { describe, expect, it } from "vitest";
import { isApplicationPage } from "../src/content/target";
import { platformFor } from "../src/shared/platforms";
import { reconcileQueue, STUCK_AFTER_MS } from "../src/background/queue";
import { LICENSE_KEY_FORMAT, licenseKeyForPayment } from "../server/src/core";
import type { QueueItem } from "../src/shared/types";
import { mount } from "./fixtures";

describe("hands-off platforms cannot be reached with a trailing-dot host", () => {
  it.each(["https://www.linkedin.com./jobs/view/1", "https://WWW.NAUKRI.COM../job-listings-x", "https://in.indeed.com./viewjob?jk=1"])("%s", (url) => {
    expect(platformFor(url).policy).toBe("hands_off");
  });
});

describe("a job description's own small form is not the application", () => {
  it("job alerts beside an Apply link: not the application", () => {
    mount(`<h1>Backend Engineer</h1><a href="/apply">Apply now</a>
      <form><label for="e">Email</label><input id="e" type="email"><label for="n">Name</label><input id="n">
      <label for="l">Location</label><input id="l"><button>Get job alerts</button></form>`);
    expect(isApplicationPage(document)).toBe(false);
  });

  it("an application with a resume upload on the description page: the application", () => {
    mount(`<h1>Backend Engineer</h1><a href="#app">Apply</a>
      <form id="app"><label for="e">Email</label><input id="e" type="email"><label for="r">Resume</label><input id="r" type="file">
      <button type="submit">Submit application</button></form>`);
    expect(isApplicationPage(document)).toBe(true);
  });

  it("a page without an Apply button: the application", () => {
    mount(`<form><label for="e">Email</label><input id="e" type="email"><label for="n">Name</label><input id="n"><button>Submit</button></form>`);
    expect(isApplicationPage(document)).toBe(true);
  });
});

describe("long applications are not mistaken for stuck ones", () => {
  const now = Date.parse("2026-10-28T10:00:00Z");
  const item: QueueItem = {
    id: "q1", url: "https://jobs.lever.co/x/1", title: "", company: "x", status: "running", tabId: 7,
    addedAt: new Date(now - 600_000).toISOString(), updatedAt: new Date(now - STUCK_AFTER_MS - 1).toISOString(),
  };
  it("still being worked on by this worker: left alone", () => {
    expect(reconcileQueue([item], new Set([7]), [], now, new Set(["q1"]))[0]!.status).toBe("running");
  });
  it("lost by a restarted worker: repaired", () => {
    expect(reconcileQueue([item], new Set([7]), [], now)[0]!.status).toBe("needs_user");
  });
});

describe("one payment, one licence key", () => {
  it("the redirect and the webhook derive the same key for a new purchase", async () => {
    const a = await licenseKeyForPayment("secret", "pay_ABC123");
    expect(a).toMatch(LICENSE_KEY_FORMAT);
    expect(await licenseKeyForPayment("secret", "pay_ABC123")).toBe(a);
    expect(await licenseKeyForPayment("secret", "pay_XYZ789")).not.toBe(a);
  });
});

import { describe, expect, it } from "vitest";
import { LOST_TAB_AFTER_MS, reconcileQueue, STUCK_AFTER_MS } from "../src/background/queue";
import { extractFields } from "../src/content/extract";
import type { ApplicationRecord, QueueItem } from "../src/shared/types";

const NOW = Date.parse("2026-10-25T10:00:00Z");
const ago = (ms: number) => new Date(NOW - ms).toISOString();

function running(id: string, tabId: number | undefined, updatedMsAgo: number): QueueItem {
  return {
    id, url: `https://jobs.lever.co/acme/${id}`, title: "", company: "", status: "running", tabId,
    addedAt: ago(10 * 60_000), updatedAt: ago(updatedMsAgo),
  };
}

describe("reconcileQueue (background worker stopped mid-application)", () => {
  it("requeues a lost job only when nothing was submitted", () => {
    const [item] = reconcileQueue([running("1", 5, LOST_TAB_AFTER_MS + 1)], new Set(), [], NOW);
    expect(item).toMatchObject({ status: "queued", tabId: undefined });
  });

  it("never requeues a job that may already have been submitted (no duplicate applications)", () => {
    const submitted: ApplicationRecord = {
      id: "a", url: "https://jobs.lever.co/acme/1/apply", platform: "lever", jobTitle: "", status: "in_progress", createdAt: ago(60_000),
    };
    const [item] = reconcileQueue([running("1", 5, LOST_TAB_AFTER_MS + 1)], new Set(), [submitted], NOW);
    expect(item?.status).toBe("needs_check");
  });

  it("hands a silent open tab to the user instead of resubmitting", () => {
    const [item] = reconcileQueue([running("1", 7, STUCK_AFTER_MS + 1)], new Set([7]), [], NOW);
    expect(item?.status).toBe("needs_user");
  });

  it("leaves recently active items alone", () => {
    const fresh = [running("1", 7, 5_000), running("2", undefined, 5_000)];
    expect(reconcileQueue(fresh, new Set([7]), [], NOW)).toEqual(fresh);
  });
});

describe("extractFields on varied real-world markup", () => {
  it("handles aria-labelledby, wrapping labels with nested markup, aria-required and placeholders", () => {
    document.body.innerHTML = `
      <form>
        <span id="lbl-city">Current <em>city</em></span><input aria-labelledby="lbl-city" name="c">
        <label><span>Phone</span> <small>(optional)</small> <input name="p" type="tel"></label>
        <input name="w" placeholder="Website URL" aria-required="true">
        <select name="s"><optgroup label="Asia"><option>India</option></optgroup><optgroup label="Europe"><option>Spain</option></optgroup></select>
        <input name="ro" value="REQ-123" readonly><input name="dis" disabled>
      </form>`;
    const fields = extractFields(document.querySelector("form")!).map((f) => f.descriptor);
    expect(fields.map((f) => f.label)).toEqual(["Current city", "Phone", "Website URL", "s"]);
    expect(fields.find((f) => f.name === "w")?.required).toBe(true);
    expect(fields.find((f) => f.name === "s")?.options).toEqual(["India", "Spain"]);
    expect(fields.some((f) => f.name === "ro" || f.name === "dis")).toBe(false);
  });

  it("does not leak option text into a select's label", () => {
    document.body.innerHTML = `<form><label>Country <select name="country"><option>India</option><option>Spain</option></select></label></form>`;
    expect(extractFields(document.querySelector("form")!)[0]?.descriptor.label).toBe("Country");
  });
});

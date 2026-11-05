/** A resume for one application only (Apply panel): kept per tab in chrome.storage.session, sent with that tab's
 * Fill, attached instead of the Profile's resume, and never written into the Profile. */

import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkResumeFile, clearResumeOverride, forgetIfMovedOn, isResumeFile, loadResumeOverride, noteResumeFields, overrideKey,
  pruneResumeOverrides, sameApplication, saveResumeOverride, withResumeOverride, withTabResume,
} from "../src/shared/resume-override";
import { sendWithResume } from "../src/sidepanel/apply-resume";
import { fillForm } from "../src/content/agent";
import type { Message, ResumeFile, RunReport } from "../src/shared/types";
import { mount, PROFILE } from "./fixtures";

const OTHER: ResumeFile = { name: "Resume_v2_backend.pdf", type: "application/pdf", dataBase64: btoa("%PDF-1.4 other") };
const JOB = "https://jobs.example.com/acme/123";

type Area = { data: Record<string, unknown> };
function area(): Area & { get: (k: unknown) => Promise<Record<string, unknown>>; set: (v: Record<string, unknown>) => Promise<void>; remove: (k: string | string[]) => Promise<void> } {
  const a = {
    data: {} as Record<string, unknown>,
    async get(keys: unknown) {
      if (keys === null || keys === undefined) return structuredClone(a.data);
      const list = Array.isArray(keys) ? keys : [keys];
      return Object.fromEntries(list.filter((k) => k in a.data).map((k) => [k, structuredClone(a.data[k as string])]));
    },
    async set(values: Record<string, unknown>) {
      Object.assign(a.data, structuredClone(values));
    },
    async remove(keys: string | string[]) {
      for (const k of Array.isArray(keys) ? keys : [keys]) delete a.data[k];
    },
  };
  return a;
}

let local: ReturnType<typeof area>;
let session: ReturnType<typeof area>;
let tabUrls: Record<number, string | undefined>;

beforeEach(() => {
  local = area();
  session = area();
  tabUrls = {};
  local.data.profile = structuredClone(PROFILE);
  vi.stubGlobal("chrome", {
    storage: { local, session },
    tabs: {
      get: async (id: number) => ({ id, url: tabUrls[id] }),
      query: async () => Object.keys(tabUrls).map((id) => ({ id: Number(id), url: tabUrls[Number(id)] })),
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("checking a chosen file (same rules as the Profile upload)", () => {
  it("takes PDF, DOC, DOCX and TXT up to 5 MB", () => {
    for (const name of ["cv.pdf", "CV.PDF", "cv.doc", "cv.docx", "cv.txt"]) expect(checkResumeFile({ name, size: 1000 })).toBeNull();
    expect(checkResumeFile({ name: "cv.pdf", size: 5 * 1024 * 1024 })).toBeNull();
  });
  it("refuses other types, files over 5 MB and empty files", () => {
    expect(checkResumeFile({ name: "photo.png", size: 1000 })).toMatch(/PDF, DOC, DOCX or TXT/);
    expect(checkResumeFile({ name: "cv.pdf.exe", size: 1000 })).toMatch(/PDF, DOC, DOCX or TXT/);
    expect(checkResumeFile({ name: "cv.pdf", size: 5 * 1024 * 1024 + 1 })).toMatch(/larger than 5 MB/);
    expect(checkResumeFile({ name: "cv.pdf", size: 0 })).toMatch(/empty/);
  });
});

describe("the run's profile", () => {
  it("uses the chosen resume in a copy: the Profile object is not changed", () => {
    const before = structuredClone(PROFILE);
    const used = withResumeOverride(PROFILE, OTHER);
    expect(used.resume).toEqual(OTHER);
    expect(used).not.toBe(PROFILE);
    expect(PROFILE).toEqual(before);
    expect(used.email).toBe(PROFILE.email);
  });
  it("ignores anything that is not a resume file", () => {
    for (const bad of [undefined, null, "x", {}, { name: "a.pdf" }, { name: "", type: "", dataBase64: "AA==" }, { ...OTHER, dataBase64: "A".repeat(8_000_000) }]) {
      expect(withResumeOverride(PROFILE, bad)).toBe(PROFILE);
    }
    expect(isResumeFile(OTHER)).toBe(true);
  });
});

describe("which pages are the same application", () => {
  it("the same page, its #part and tracking parameters aside", () => {
    expect(sameApplication(JOB, JOB)).toBe(true);
    expect(sameApplication(JOB, `${JOB}#apply`)).toBe(true);
    expect(sameApplication(JOB, `${JOB}?utm_source=x&gh_src=y`)).toBe(true);
    expect(sameApplication(JOB, `${JOB}/`)).toBe(true);
  });
  it("a job page and its application page", () => {
    expect(sameApplication(JOB, `${JOB}/apply`)).toBe(true);
    expect(sameApplication(`${JOB}/apply`, JOB)).toBe(true);
  });
  it("another job, another site or a home page is not", () => {
    expect(sameApplication(JOB, "https://jobs.example.com/acme/124")).toBe(false);
    expect(sameApplication(JOB, "https://jobs.example.com/acme")).toBe(true); // continues the same path: kept (a list page has no form to fill)
    expect(sameApplication(JOB, "https://other.example.com/acme/123")).toBe(false);
    expect(sameApplication(JOB, "https://jobs.example.com/")).toBe(false);
    expect(sameApplication("https://boards.example.com/embed/job_app?for=acme&token=1", "https://boards.example.com/embed/job_app?for=acme&token=2")).toBe(false);
  });
  it("an address the browser hides is taken as the same", () => {
    expect(sameApplication("", JOB)).toBe(true);
    expect(sameApplication(JOB, "")).toBe(true);
  });
});

describe("storage per tab (chrome.storage.session, never local)", () => {
  it("saves, loads and clears one tab's resume without touching the Profile", async () => {
    await saveResumeOverride(7, OTHER, JOB, 1);
    expect(session.data[overrideKey(7)]).toEqual({ resume: OTHER, url: JOB, chosenAt: 1 });
    expect(Object.keys(local.data)).toEqual(["profile"]);
    expect(local.data.profile).toEqual(PROFILE);
    expect((await loadResumeOverride(7))?.resume).toEqual(OTHER);
    expect(await loadResumeOverride(8)).toBeUndefined(); // another tab has its own (none)
    await clearResumeOverride(7);
    expect(await loadResumeOverride(7)).toBeUndefined();
    expect(local.data.profile).toEqual(PROFILE);
  });
  it("each tab keeps its own resume", async () => {
    await saveResumeOverride(1, OTHER, JOB);
    await saveResumeOverride(2, { ...OTHER, name: "Another.pdf" }, "https://jobs.example.com/acme/999");
    expect((await loadResumeOverride(1))?.resume.name).toBe(OTHER.name);
    expect((await loadResumeOverride(2))?.resume.name).toBe("Another.pdf");
  });
  it("forgets the resumes of closed tabs, and nothing else", async () => {
    session.data.detect = { keep: true };
    await saveResumeOverride(1, OTHER, JOB);
    await saveResumeOverride(2, OTHER, JOB);
    await pruneResumeOverrides([1]);
    expect(Object.keys(session.data).sort()).toEqual(["detect", overrideKey(1)].sort());
  });
  it("forgets a tab's resume when the tab moves to another job, keeps it on the same application", async () => {
    await saveResumeOverride(3, OTHER, JOB);
    expect(await forgetIfMovedOn(3, `${JOB}/apply`)).toBe(false);
    expect(await forgetIfMovedOn(3, undefined)).toBe(false);
    expect(await loadResumeOverride(3)).toBeDefined();
    expect(await forgetIfMovedOn(3, "https://jobs.example.com/acme/124")).toBe(true);
    expect(await loadResumeOverride(3)).toBeUndefined();
  });
});

describe("the Fill message", () => {
  const run: Message = { type: "RUN", mode: "review", fillOnly: true };
  it("carries the tab's resume", async () => {
    await saveResumeOverride(5, OTHER, JOB);
    const { message } = await withTabResume(run, 5, `${JOB}/apply`);
    expect(message).toEqual({ ...run, resume: OTHER });
  });
  it("carries none without a chosen resume, and other messages are unchanged", async () => {
    expect((await withTabResume(run, 5, JOB)).message).toEqual(run);
    await saveResumeOverride(5, OTHER, JOB);
    expect((await withTabResume({ type: "SCAN" }, 5, JOB)).message).toEqual({ type: "SCAN" });
  });
  it("is never sent to another job: a tab on another job uses the Profile resume and forgets the chosen one", async () => {
    await saveResumeOverride(5, OTHER, JOB);
    const { message, override } = await withTabResume(run, 5, "https://jobs.example.com/acme/124");
    expect(message).toEqual(run);
    expect(override).toBeUndefined();
    expect(await loadResumeOverride(5)).toBeUndefined();
  });
  it("a later step of a run under way keeps it (a new page of the same application)", async () => {
    await saveResumeOverride(5, OTHER, "https://forms.example.com/step1.html");
    const { message } = await withTabResume({ ...run, continuing: true }, 5, "https://forms.example.com/step2.html");
    expect((message as { resume?: ResumeFile }).resume).toEqual(OTHER);
  });
});

function reportWithResume(url = JOB): RunReport {
  return {
    status: "ready_to_submit", platform: "Test", url, jobTitle: "Engineer", captcha: false, errors: [],
    fields: [
      { field: { key: "r", label: "Resume/CV", control: "file", required: true, options: [], name: "resume", autocomplete: "", placeholder: "" }, decision: { kind: "resume" }, status: "filled" },
      { field: { key: "e", label: "Email", control: "email", required: true, options: [], name: "email", autocomplete: "", placeholder: "" }, decision: { kind: "profile", key: "email", value: "asha@example.com" }, status: "filled" },
    ],
  };
}

describe("the panel's send (message wiring)", () => {
  it("sends the tab's resume with a Fill and names it in the checklist", async () => {
    tabUrls[9] = JOB;
    await saveResumeOverride(9, OTHER, JOB);
    const sent: Message[] = [];
    const report = await sendWithResume(9, { type: "RUN", mode: "review", fillOnly: true }, async (m) => {
      sent.push(m);
      return reportWithResume();
    });
    expect((sent[0] as { resume?: ResumeFile }).resume).toEqual(OTHER);
    expect(report?.fields[0]?.detail).toBe(`${OTHER.name} (this application only)`);
    expect(report?.fields[1]?.detail).toBeUndefined();
    expect(local.data.profile).toEqual(PROFILE); // the Profile's resume is unchanged
  });
  it("without one, the Fill carries no resume and the checklist names the Profile's file", async () => {
    tabUrls[9] = JOB;
    const sent: Message[] = [];
    const report = await sendWithResume(9, { type: "RUN", mode: "review" }, async (m) => {
      sent.push(m);
      return reportWithResume();
    });
    expect("resume" in sent[0]!).toBe(false);
    expect(report?.fields[0]?.detail).toBe(PROFILE.resume!.name);
  });
  it("other messages go out unchanged", async () => {
    await saveResumeOverride(9, OTHER, JOB);
    const sent: Message[] = [];
    await sendWithResume(9, { type: "FIELD_STATE" }, async (m) => {
      sent.push(m);
      return undefined;
    });
    expect(sent).toEqual([{ type: "FIELD_STATE" }]);
  });
  it("a run that moved on to the next page keeps the resume there; one removed meanwhile stays removed", async () => {
    tabUrls[9] = JOB;
    await saveResumeOverride(9, OTHER, JOB, 1);
    await sendWithResume(9, { type: "RUN", mode: "review" }, async () => reportWithResume(`${JOB}/step-2`));
    expect((await loadResumeOverride(9))?.url).toBe(`${JOB}/step-2`);
    await sendWithResume(9, { type: "RUN", mode: "review" }, async () => {
      await clearResumeOverride(9); // the user pressed Remove while the Fill ran
      return reportWithResume(`${JOB}/step-3`);
    });
    expect(await loadResumeOverride(9)).toBeUndefined();
  });
  it("only resume fields that were attached get the file name", () => {
    const r = reportWithResume();
    r.fields[0]!.status = "failed";
    r.fields[0]!.detail = "upload did not stick";
    expect(noteResumeFields(r, "x.pdf", true)?.fields[0]?.detail).toBe("upload did not stick");
  });
});

describe("the page script attaches the chosen file", () => {
  it("fills the form's file input with the chosen resume, not the Profile's", async () => {
    // jsdom cannot attach files: a minimal DataTransfer and a writable files list stand in for Chrome's.
    class FakeTransfer {
      files: File[] = [];
      items = { add: (f: File) => this.files.push(f) };
    }
    vi.stubGlobal("DataTransfer", FakeTransfer);
    const doc = mount();
    const input = doc.getElementById("resume") as HTMLInputElement;
    let files: File[] = [];
    Object.defineProperty(input, "files", { configurable: true, get: () => files, set: (v: File[]) => (files = v) });
    const before = structuredClone(PROFILE);
    const report = await fillForm(doc, { profile: withResumeOverride(PROFILE, OTHER), answers: [], mode: "review" });
    expect(files.map((f) => f.name)).toEqual([OTHER.name]);
    expect(report.fields.find((f) => f.decision.kind === "resume")?.status).toBe("filled");
    expect(PROFILE).toEqual(before);
  });

  it("the content script uses the RUN message's resume; the queue never sends one", () => {
    const content = readFileSync("src/content/index.ts", "utf8");
    expect(content).toMatch(/profile: withResumeOverride\(await loadProfile\(\), message\.resume\)/);
    const runner = readFileSync("src/background/runner.ts", "utf8") + readFileSync("src/background/index.ts", "utf8");
    expect(runner).not.toMatch(/resume:/);
    expect(runner).not.toMatch(/resumeOverride/);
  });
});

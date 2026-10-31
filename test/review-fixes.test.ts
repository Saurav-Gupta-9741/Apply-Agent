/** Regression tests for problems found when reviewing tasks 2–9 (agent-work branch). */

import { describe, expect, it, vi } from "vitest";
import { decide } from "../src/content/classify";
import { companyDomain, hasConfirmedApplication, type PageFacts } from "../src/content/facts";
import { trackCorrection } from "../src/content/corrections";
import type { ExtractedField } from "../src/content/extract";
import type { AnswerEntry, ApplicationRecord, Decision, FieldDescriptor, Profile } from "../src/shared/types";
import { PROFILE } from "./fixtures";

const field = (label: string, control: FieldDescriptor["control"] = "select", options: string[] = ["Yes", "No"]): FieldDescriptor => ({
  key: "k", label, control, required: true, options, name: "", autocomplete: "", placeholder: "",
});
const value = (d: Decision) => (d.kind === "answer" ? d.value : d.kind);
const saved = (question: string, answer: string, topic?: AnswerEntry["topic"]): AnswerEntry => ({ question, answer, topic, updatedAt: "2026-10-28T12:00:00Z" });
const applied = (url: string): ApplicationRecord => ({ id: url, url, platform: "x", jobTitle: "Engineer", status: "applied_confirmed", createdAt: "2026-10-01T00:00:00Z" });

describe("applied before: one company per subdomain ATS", () => {
  it("names the company from the subdomain, not the first path segment", () => {
    expect(companyDomain("https://acme.bamboohr.com/careers/12")).toBe("acme");
    expect(companyDomain("https://acme.teamtailor.com/jobs/34-engineer")).toBe("acme");
    expect(companyDomain("https://acme.breezy.hr/p/abc-engineer")).toBe("acme");
    expect(companyDomain("https://acme.jobs.personio.de/job/56")).toBe("acme");
    expect(companyDomain("https://job-boards.greenhouse.io/gusto/jobs/1")).toBe("gusto");
    expect(companyDomain("https://boards.greenhouse.io/embed/job_app?for=okta&token=1")).toBe("okta");
    expect(companyDomain("https://jobs.lever.co/palantir/abc/apply")).toBe("palantir");
    expect(companyDomain("https://apply.workable.com/acme/j/ABC/")).toBe("acme");
  });

  it("does not answer Yes for a different company on the same ATS", () => {
    const page: PageFacts = { jobCountries: [], url: "https://globex.bamboohr.com/careers/7", applications: [applied("https://acme.bamboohr.com/careers/12")] };
    expect(hasConfirmedApplication(page)).toBe(false);
    const other: PageFacts = { jobCountries: [], url: "https://globex.breezy.hr/p/x", applications: [applied("https://acme.breezy.hr/p/y")] };
    expect(hasConfirmedApplication(other)).toBe(false);
  });
});

describe("start immediately: an answer saved in the panel is used", () => {
  it("reuses the saved answer to the same question when no quick answer decides it", () => {
    const me: Profile = { ...PROFILE, facts: { ...PROFILE.facts!, noticePeriod: "" } };
    const answers = [saved("Can you start immediately?", "Yes", "notice_period")];
    expect(value(decide(field("Can you start immediately?"), me, answers))).toBe("Yes");
  });

  it("never reuses a notice-period answer such as '30 days' for it", () => {
    const me: Profile = { ...PROFILE, facts: { ...PROFILE.facts!, noticePeriod: "" } };
    const answers = [saved("What is your notice period?", "30 days", "notice_period")];
    expect(value(decide(field("Can you start immediately?"), me, answers))).toBe("ask");
  });
});

describe("common screening answers stay within their own question", () => {
  const me: Profile = { ...PROFILE, country: "India", facts: { ...PROFILE.facts!, workCountries: "India" } };
  const bank = [
    saved("Are you legally authorized to work in the country of this job?", "Yes"),
    saved("Are you willing to work weekends or flexible shifts?", "Yes"),
    saved("Are you willing to work night shifts?", "No"),
    saved("Do you have a bachelor's degree or higher?", "Yes"),
    saved("Are you willing to travel for work?", "Yes"),
  ];

  it("does not claim US work authorization from a general answer when the user can work only in India", () => {
    const d = decide(field("Are you legally authorized to work in the United States?"), me, bank, { jobCountries: ["United States"] });
    expect(value(d)).not.toBe("Yes");
  });

  it("does not answer night shifts from the weekends/flexible shifts answer", () => {
    expect(value(decide(field("Are you willing to work night shifts?"), me, [bank[1]!, bank[2]!]))).toBe("No");
    expect(value(decide(field("Are you willing to work night shifts?"), me, [bank[2]!, bank[1]!]))).toBe("No");
  });

  it("never types a yes/no screening answer into a free-text question", () => {
    expect(value(decide(field("What is your bachelor's degree in?", "text", []), me, bank))).not.toBe("Yes");
    expect(value(decide(field("What percentage of time are you willing to travel?", "text", []), me, bank))).not.toBe("Yes");
    expect(value(decide(field("How do you handle a shift in priorities?", "textarea", []), me, bank))).not.toBe("Yes");
  });

  it("does not stretch a general degree answer to a specific subject", () => {
    expect(value(decide(field("Do you have a bachelor's degree in Mechanical Engineering?"), me, bank))).not.toBe("Yes");
  });
});

describe("corrections: only a real edit by the user counts", () => {
  const capture = () => {
    const messages: unknown[] = [];
    (globalThis as { chrome?: unknown }).chrome = { runtime: { sendMessage: vi.fn((m) => { messages.push(m); return Promise.resolve(); }) } };
    return messages;
  };
  const textField = (label: string, el: HTMLElement): ExtractedField => ({
    descriptor: { key: label, name: label, label, control: "text", options: [], required: true, autocomplete: "", placeholder: "" }, elements: [el] as ExtractedField["elements"],
  });

  it("does not record a correction when the box holds a reformatted fill (phone without its dial code)", () => {
    const input = document.createElement("input");
    input.value = "9876543210"; // the agent put only the national number in the box
    document.body.append(input);
    const messages = capture();
    trackCorrection(document, textField("Phone", input));
    input.dispatchEvent(new Event("blur"));
    expect(messages).toHaveLength(0);
    input.value = "9123456789";
    input.dispatchEvent(new Event("blur"));
    expect(messages).toHaveLength(1);
    input.remove();
  });

  it("records the choice's label for radio buttons, not its value code", () => {
    const wrap = document.createElement("div");
    wrap.innerHTML = `<label><input type="radio" name="r" value="1" checked> Yes</label><label><input type="radio" name="r" value="2"> No</label>`;
    document.body.append(wrap);
    const radios = [...wrap.querySelectorAll("input")];
    const messages = capture();
    const f: ExtractedField = { descriptor: { key: "r", name: "r", label: "Do you enjoy remote work?", control: "radio", options: ["Yes", "No"], required: true, autocomplete: "", placeholder: "" }, elements: radios };
    trackCorrection(document, f);
    radios[1]!.checked = true;
    radios[1]!.dispatchEvent(new Event("change"));
    expect(messages).toEqual([{ type: "RECORD_CORRECTION", question: "Do you enjoy remote work?", answer: "No" }]);
    wrap.remove();
  });
});

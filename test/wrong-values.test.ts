/** The worst failure is a confident wrong value on a real application. Each case here put one in before it was
 * fixed: a saved answer reused for a different question, and the user's own details typed into fields about
 * someone else. */

import { describe, expect, it } from "vitest";
import { decide, findAnswer, questionKey } from "../src/content/classify";
import { extractFields } from "../src/content/extract";
import { fillForm } from "../src/content/agent";
import { sameQuestionScore } from "../src/shared/text";
import type { AnswerEntry, FieldDescriptor } from "../src/shared/types";
import { mount, PROFILE } from "./fixtures";

const field = (label: string, control: FieldDescriptor["control"] = "text", extra: Partial<FieldDescriptor> = {}): FieldDescriptor => ({
  key: "k", label, control, required: true, options: [], name: "", autocomplete: "", placeholder: "", ...extra,
});
const saved = (question: string, answer: string): AnswerEntry => ({ question, answer, updatedAt: "2026-10-26T00:00:00Z" });

describe("a saved answer is reused only for the same question", () => {
  const python = saved("How many years of experience do you have with Python?", "2");

  it("never for a question that differs in a key word, however many words match", () => {
    expect(decide(field("How many years of experience do you have with Java?"), PROFILE, [python]).kind).toBe("ask");
    expect(findAnswer(field("How many years of professional experience do you have with Java programming?"),
      [saved("How many years of professional experience do you have with Python programming?", "2")])).toBeUndefined();
    expect(sameQuestionScore("Are you willing to work from our Pune office?", "Are you willing to work from our Delhi office?")).toBe(0);
  });

  it("still for the same question in other words, or with a word added", () => {
    expect(findAnswer(field("How many years of experience with Python do you have?"), [python])?.answer).toBe("2");
    expect(findAnswer(field("Your notice period"), [saved("What is your notice period?", "30 days")])?.answer).toBe("30 days");
    expect(findAnswer(field("How many years of experience do you have with Python"), [python])?.answer).toBe("2");
  });
});

describe("the user's own details never go into fields about someone else", () => {
  it("emergency contacts, referees, referrers, managers: asked, not filled from the profile", () => {
    for (const [label, control] of [
      ["Emergency contact phone number", "tel"], ["Referee's email address", "email"], ["Manager email", "email"],
      ["Referrer full name", "text"], ["Name of the employee who referred you", "text"], ["Next of kin phone", "tel"],
      ["Notfallkontakt Telefon", "tel"], ["Supervisor's name", "text"],
    ] as const) {
      expect(decide(field(label, control), PROFILE, []).kind, label).toBe("ask");
      expect(decide(field(label, control, { required: false }), PROFILE, []).kind, label).toBe("skip");
    }
  });

  it("a 'References' section: its Name/Email/Phone are asked; the user's own fields above it are filled", async () => {
    mount(`<h1>Senior Product Manager</h1><form id="f">
      <label for="n">Full name *</label><input id="n" required>
      <label for="e">Email *</label><input id="e" type="email" required>
      <h3>References</h3>
      <label for="rn">Name *</label><input id="rn" required>
      <label for="re">Email *</label><input id="re" type="email" required>
      <label for="rp">Phone</label><input id="rp" type="tel">
      <button type="submit">Submit application</button></form>`);
    const report = await fillForm(document, { profile: PROFILE, answers: [], mode: "review" });
    const value = (id: string) => (document.getElementById(id) as HTMLInputElement).value;
    expect([value("n"), value("e")]).toEqual(["Asha Verma", PROFILE.email]); // "Product Manager" in the h1 blocks nothing
    expect([value("rn"), value("re"), value("rp")]).toEqual(["", "", ""]);
    expect(report.fields.filter((f) => f.status === "needs_user").map((f) => questionKey(f.field)))
      .toEqual(["References › Name", "References › Email"]);
  });

  it("an answer given for a referee's 'Name' never comes back as the user's own name", () => {
    mount(`<form><h3>Emergency contact</h3><label for="x">Name *</label><input id="x" required></form>`);
    const [emergency] = extractFields(document.body);
    expect(questionKey(emergency!.descriptor)).toBe("Emergency contact › Name");
    const answers = [saved(questionKey(emergency!.descriptor), "Ravi Verma")];
    expect(findAnswer(emergency!.descriptor, answers)?.answer).toBe("Ravi Verma"); // same section next time: reused
    expect(decide(field("Name"), PROFILE, answers)).toMatchObject({ kind: "profile", value: "Asha Verma" }); // own name
  });
});

describe("preferred location is not the current city", () => {
  it("uses the job-search preference", () => {
    const profile = { ...PROFILE, location: "Pune", preferredLocations: "Bangalore, Remote" };
    expect(decide(field("Preferred location"), profile, [])).toMatchObject({ kind: "profile", key: "preferredLocations" });
    expect(decide(field("Current location"), profile, [])).toMatchObject({ kind: "profile", value: "Pune" });
  });
});

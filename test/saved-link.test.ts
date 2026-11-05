// Round 7: a link typed on one form ("LinkedIn URL") is used for the same link asked in other words on later forms
// ("LinkedIn Profile URL") while the Profile has none, and only a value of the right shape is ever used.
import { describe, expect, it } from "vitest";
import { decide } from "../src/content/classify";
import { EMPTY_PROFILE } from "../src/shared/storage";
import type { AnswerEntry, FieldDescriptor, Profile } from "../src/shared/types";

const field = (label: string, extra: Partial<FieldDescriptor> = {}): FieldDescriptor =>
  ({ key: "f", label, control: "text", required: true, options: [], name: "", autocomplete: "", placeholder: "", ...extra }) as FieldDescriptor;
const P: Profile = { ...EMPTY_PROFILE, firstName: "Asha", lastName: "Verma", email: "asha@example.com" };
const saved = (question: string, answer: string): AnswerEntry => ({ question, answer, updatedAt: "2026-11-06T00:00:00Z" });

describe("links typed on earlier forms", () => {
  const bank = [saved("LinkedIn URL", "https://www.linkedin.com/in/asha-verma"), saved("GitHub Profile", "github.com/ashav"),
    saved("Portfolio", "https://asha.dev")];
  it.each([
    ["LinkedIn Profile URL", "https://www.linkedin.com/in/asha-verma"],
    ["Please provide your LinkedIn profile URL.", "https://www.linkedin.com/in/asha-verma"],
    ["GitHub URL", "github.com/ashav"],
    ["Website", "https://asha.dev"],
  ])("%s → %s", (label, want) => {
    expect(decide(field(label), P, bank)).toMatchObject({ kind: "answer", value: want });
  });
  it("never a value of the wrong shape or from another kind of question", () => {
    const wrong = [saved("LinkedIn URL", "I don't have one"), saved("GitHub Profile", "https://github.com/ashav/my-repo"),
      saved("Twitter URL", "https://linkedin.com/in/someone-else"), saved("Portfolio", "https://github.com/ashav")];
    for (const label of ["LinkedIn Profile URL", "GitHub URL", "Website"]) expect(decide(field(label), P, wrong).kind).toBe("ask");
  });
  it("the Profile's own link wins", () => {
    expect(decide(field("LinkedIn Profile URL"), { ...P, linkedin: "https://linkedin.com/in/asha" }, bank)).toMatchObject({ kind: "profile", value: "https://linkedin.com/in/asha" });
  });
});

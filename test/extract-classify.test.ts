import { beforeEach, describe, expect, it } from "vitest";
import { decide, sensitiveTopic } from "../src/content/classify";
import { extractFields } from "../src/content/extract";
import type { FieldDescriptor } from "../src/shared/types";
import { bestOption } from "../src/shared/text";
import { mount, PROFILE, SENSITIVE_ANSWERS } from "./fixtures";

function byLabel(label: string): FieldDescriptor {
  const field = extractFields(document.getElementById("application-form")!).find((f) => f.descriptor.label === label);
  if (!field) throw new Error(`no field labelled ${label}`);
  return field.descriptor;
}

describe("extractFields", () => {
  beforeEach(() => mount());

  it("finds every visible field with clean labels", () => {
    const labels = extractFields(document.getElementById("application-form")!).map((f) => f.descriptor.label);
    // Page order, top to bottom.
    expect(labels).toEqual([
      "First Name", "Last Name", "Email", "Phone", "Resume/CV", "LinkedIn Profile", "University degree",
      "Are you legally authorized to work in the United States?",
      "Will you now or in the future require visa sponsorship?", "How did you hear about this job?", "Cover letter",
      "Gender", "Email me about future jobs", "I agree to the privacy policy",
    ]);
  });

  it("skips hidden inputs and honeypots but keeps the hidden resume upload", () => {
    const names = extractFields(document.getElementById("application-form")!).map((f) => f.descriptor.name);
    expect(names).not.toContain("token");
    expect(names).not.toContain("honeypot");
    expect(names).toContain("resume");
  });

  it("reads required flags, control types and options", () => {
    expect(byLabel("First Name")).toMatchObject({ required: true, control: "text" });
    expect(byLabel("Phone")).toMatchObject({ required: false, control: "tel" });
    expect(byLabel("University degree").options).toEqual(["Bachelor's Degree", "Master's Degree", "PhD"]);
    expect(byLabel("Are you legally authorized to work in the United States?")).toMatchObject({
      control: "radio", required: true, options: ["Yes", "No"],
    });
  });
});

describe("decide", () => {
  beforeEach(() => mount());

  it("fills profile facts", () => {
    expect(decide(byLabel("First Name"), PROFILE, [])).toEqual({ kind: "profile", key: "firstName", value: "Asha" });
    expect(decide(byLabel("Email"), PROFILE, [])).toMatchObject({ kind: "profile", value: "asha@example.com" });
    expect(decide(byLabel("University degree"), PROFILE, [])).toMatchObject({ kind: "profile", key: "degree" });
    expect(decide(byLabel("Resume/CV"), PROFILE, [])).toEqual({ kind: "resume" });
  });

  it("never guesses sensitive questions", () => {
    for (const label of [
      "Are you legally authorized to work in the United States?",
      "Will you now or in the future require visa sponsorship?",
      "Gender",
      "I agree to the privacy policy",
    ]) {
      expect(decide(byLabel(label), PROFILE, []).kind).toBe("ask");
    }
  });

  it("reuses the user's own answers for the same question", () => {
    expect(decide(byLabel("Are you legally authorized to work in the United States?"), PROFILE, SENSITIVE_ANSWERS))
      .toMatchObject({ kind: "answer", value: "Yes" });
  });

  it("does not reuse a sensitive answer for a different topic", () => {
    const wrongTopic = [{ ...SENSITIVE_ANSWERS[0]!, topic: "salary" as const }];
    expect(decide(byLabel("Are you legally authorized to work in the United States?"), PROFILE, wrongTopic).kind).toBe("ask");
  });

  it("asks for unknown required questions and leaves unknown optional ones blank", () => {
    expect(decide(byLabel("How did you hear about this job?"), PROFILE, [])).toMatchObject({ kind: "ask", reason: "unknown" });
    expect(decide(byLabel("Cover letter"), PROFILE, [])).toMatchObject({ kind: "skip" });
  });

  it("never puts profile text into a yes/no checkbox", () => {
    expect(decide(byLabel("Email me about future jobs"), PROFILE, [])).toMatchObject({ kind: "skip" });
  });

  it("asks when a required profile value is missing", () => {
    expect(decide(byLabel("First Name"), { ...PROFILE, firstName: "" }, [])).toMatchObject({ kind: "ask", reason: "missing_profile_value" });
  });

  it("fills total experience but never a skill-specific experience question", () => {
    const me = { ...PROFILE, experienceYears: "2" };
    const f = (label: string) => ({ ...byLabel("First Name"), label, name: "", required: true });
    expect(decide(f("Total years of experience"), me, [])).toMatchObject({ kind: "profile", key: "experienceYears", value: "2" });
    expect(decide(f("Years of experience"), me, [])).toMatchObject({ kind: "profile", value: "2" });
    expect(decide(f("How many years of experience do you have with Python?"), me, []).kind).toBe("ask");
  });

  it("never mistakes a full-name field for a last-name field (real bug: id 'fullName' contains 'lname')", () => {
    const f = (label: string, name: string) => ({ ...byLabel("First Name"), label, name, required: true });
    expect(decide(f("Full name", "fullName"), PROFILE, [])).toMatchObject({ kind: "profile", key: "fullName", value: "Asha Verma" });
    expect(decide(f("Surname", "lname"), PROFILE, [])).toMatchObject({ kind: "profile", key: "lastName" });
    expect(decide(f("Given name", "fname"), PROFILE, [])).toMatchObject({ kind: "profile", key: "firstName" });
  });

  it("fills 'most recent employer' from the current company (seen on live Greenhouse and Ashby forms)", () => {
    const me = { ...PROFILE, currentCompany: "Initech" };
    const f = (label: string) => ({ ...byLabel("First Name"), label, name: "", required: true });
    expect(decide(f("Most Recent Employer"), me, [])).toMatchObject({ kind: "profile", key: "currentCompany", value: "Initech" });
    expect(decide(f("Please list your most recent Employer here."), me, [])).toMatchObject({ kind: "profile", value: "Initech" });
    expect(decide(f("Have you previously worked at Samsara?"), me, []).kind).toBe("ask");
  });

  it("detects sensitive topics in common phrasings", () => {
    const f = (label: string) => ({ ...byLabel("First Name"), label, name: "" });
    expect(sensitiveTopic(f("What is your expected CTC?"))).toBe("salary");
    expect(sensitiveTopic(f("What is your notice period?"))).toBe("notice_period");
    expect(sensitiveTopic(f("Are you willing to relocate to Pune?"))).toBe("relocation");
    expect(sensitiveTopic(f("Do you identify as a veteran?"))).toBe("veteran");
    expect(sensitiveTopic(f("Preferred programming language"))).toBeUndefined();
  });
});

describe("bestOption", () => {
  it("matches whole words, never a different word with the same prefix", () => {
    expect(bestOption(["None of the above", "No"], "no")).toBe("No");
    expect(bestOption(["None", "No, I do not"], "No")).toBe("No, I do not");
    expect(bestOption(["Yes", "No"], "maybe")).toBeUndefined();
    expect(bestOption(["Bachelor's Degree", "Master's Degree"], "Master's Degree")).toBe("Master's Degree");
  });
});

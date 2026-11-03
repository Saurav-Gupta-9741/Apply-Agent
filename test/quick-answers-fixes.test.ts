// @vitest-environment node
import { describe, expect, it } from "vitest";
import { decide } from "../src/content/classify";
import { EMPTY_PROFILE } from "../src/shared/storage";
import type { FieldDescriptor, Profile } from "../src/shared/types";

function field(label: string, control: FieldDescriptor["control"] = "text", options: string[] = []): FieldDescriptor {
  return {
    key: "k",
    label,
    control,
    required: true,
    options,
    name: "field",
    autocomplete: "",
    placeholder: "",
  };
}

describe("4B Step 5: Quick Answers Fixes", () => {
  describe("Notice Period from Quick Answers", () => {
    const profileWith60Days: Profile = {
      ...EMPTY_PROFILE,
      facts: {
        ...EMPTY_PROFILE.facts!,
        noticePeriod: "60",
      },
    };

    it("fills 'notice period (in days)' with 60", () => {
      const f = field("notice period (in days)", "text");
      const d = decide(f, profileWith60Days, []);
      expect(d).toEqual({ kind: "answer", value: "60", question: "Quick answers › notice period" });
    });

    it("fills 'notice period' with matching 60 days option", () => {
      const f = field("notice period", "select", ["Immediate", "15 days", "30 days", "60 days", "90 days"]);
      const d = decide(f, profileWith60Days, []);
      expect(d).toEqual({ kind: "answer", value: "60 days", question: "Quick answers › notice period" });
    });

    it("fills 'notice period' with 2+ months when options are in months", () => {
      const f = field("notice period", "select", ["Immediate", "1 month", "2+ months"]);
      const d = decide(f, profileWith60Days, []);
      expect(d).toEqual({ kind: "answer", value: "2+ months", question: "Quick answers › notice period" });
    });

    it("answers 'Can you join within 30 days?' with No when notice period is 60 days", () => {
      const f = field("Can you join within 30 days?", "radio", ["Yes", "No"]);
      const d = decide(f, profileWith60Days, []);
      expect(d).toEqual({ kind: "answer", value: "No", question: "Quick answers › notice period" });
    });

    it("answers 'Can you join within 30 days?' with Yes when notice period is 15 days", () => {
      const profile15: Profile = {
        ...EMPTY_PROFILE,
        facts: {
          ...EMPTY_PROFILE.facts!,
          noticePeriod: "15 days",
        },
      };
      const f = field("Can you join within 30 days?", "radio", ["Yes", "No"]);
      const d = decide(f, profile15, []);
      expect(d).toEqual({ kind: "answer", value: "Yes", question: "Quick answers › notice period" });
    });
  });

  describe("Work Authorization for unlisted countries", () => {
    const profileIndiaOnly: Profile = {
      ...EMPTY_PROFILE,
      facts: {
        ...EMPTY_PROFILE.facts!,
        workCountries: "India",
      },
    };

    it("answers Yes for a country listed in without sponsorship (India)", () => {
      const f = field("Are you legally authorized to work in India?", "radio", ["Yes", "No"]);
      const d = decide(f, profileIndiaOnly, []);
      expect(d).toEqual({ kind: "answer", value: "Yes", question: "Quick answers › work authorization" });
    });

    it("ASKS instead of guessing No when country is not listed (United Kingdom)", () => {
      const f = field("Are you legally authorized to work in the United Kingdom?", "radio", ["Yes", "No"]);
      const d = decide(f, profileIndiaOnly, []);
      expect(d.kind).toBe("ask");
      expect((d as any).topic).toBe("work_authorization");
    });

    it("answers No when country is explicitly in unauthorizedCountries", () => {
      const profileWithUnauth: Profile = {
        ...EMPTY_PROFILE,
        facts: {
          ...EMPTY_PROFILE.facts!,
          workCountries: "India",
          unauthorizedCountries: "United Kingdom, Australia",
        },
      };
      const f = field("Are you legally authorized to work in the United Kingdom?", "radio", ["Yes", "No"]);
      const d = decide(f, profileWithUnauth, []);
      expect(d).toEqual({ kind: "answer", value: "No", question: "Quick answers › work authorization" });
    });
  });
});

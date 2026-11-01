/** Secrets, card details, one-time codes and identity numbers: never filled, never remembered, never learned. */

import { describe, expect, it } from "vitest";
import { decide, findAnswer, isNeverRemembered, sensitiveTopic } from "../src/content/classify";
import { upsertAnswer } from "../src/shared/storage";
import { applyCorrection, isLearnableCorrection } from "../src/shared/corrections";
import type { AnswerEntry, ControlType, FieldDescriptor } from "../src/shared/types";
import { PROFILE } from "./fixtures";

function field(label: string, opts: Partial<FieldDescriptor> = {}): FieldDescriptor {
  return { key: label, label, control: "text" as ControlType, required: true, options: [], name: "", autocomplete: "", placeholder: "", ...opts };
}
const stored = (question: string, answer = "1234 5678 9012 3456"): AnswerEntry => ({ question, answer, updatedAt: "2026-10-01T00:00:00Z" });

const SECRET_LABELS = [
  "Credit card number", "Card number", "Debit Card Number", "CVV", "CVC", "CVV/CVC", "Card expiry", "Card expiry date",
  "Expiration date of your card", "Name on card", "OTP", "One-time code", "One time password", "Verification code",
  "Enter the 6-digit verification code", "Password", "Confirm password", "Passcode", "PIN", "Account PIN",
  "Mother's maiden name", "Security question", "Security answer", "Captcha", "Enter the captcha", "S.S.N.",
  "Voter ID", "Voter ID number", "UAN", "UAN number", "PF number", "Driving licence number", "Driving license number",
  "Driver's license", "Driver's licence number", "Drivers license no",
];

describe("secret labels are sensitive, never answered or filled from the profile", () => {
  for (const label of SECRET_LABELS) {
    it(`"${label}"`, () => {
      expect(sensitiveTopic(field(label))).toBe("identity");
      const d = decide(field(label), PROFILE, []);
      expect(d).toEqual({ kind: "ask", reason: "sensitive", topic: "identity" });
      // Optional ones stay blank: never 'answer' or 'profile'.
      expect(decide(field(label, { required: false }), PROFILE, []).kind).toBe("skip");
      expect(isNeverRemembered(label)).toBe(true);
    });
  }

  it("a password box typed as plain text (type=text) is still a password", () => {
    expect(decide(field("Password", { control: "text", name: "pwd" }), PROFILE, []).kind).toBe("ask");
    expect(decide(field("Choose a PIN", { control: "number" as ControlType }), PROFILE, []).kind).toBe("ask");
  });

  it("postal 'Pin code' / 'Zip / PIN code' stays a postal code, and a yes/no about having a licence stays answerable", () => {
    expect(sensitiveTopic(field("Pin code"))).toBeUndefined();
    expect(sensitiveTopic(field("Pincode"))).toBeUndefined();
    expect(sensitiveTopic(field("Zip / Pin code"))).toBeUndefined();
    expect(sensitiveTopic(field("Do you have a valid driver's license?"))).toBeUndefined();
  });
});

describe("autocomplete hints for cards and credentials override the label", () => {
  for (const ac of ["cc-number", "cc-name", "cc-exp", "cc-csc", "cc-exp-month", "one-time-code", "current-password", "new-password", "billing cc-number"]) {
    it(`autocomplete="${ac}"`, () => {
      expect(sensitiveTopic(field("Details", { autocomplete: ac }))).toBe("identity");
    });
  }

  it("'Name' with cc-name and 'Email' with cc-number never get the profile name or email", () => {
    const name = decide(field("Name", { autocomplete: "cc-name" }), PROFILE, []);
    expect(name).toEqual({ kind: "ask", reason: "sensitive", topic: "identity" });
    const email = decide(field("Email", { autocomplete: "cc-number", control: "email" as ControlType }), PROFILE, []);
    expect(email).toEqual({ kind: "ask", reason: "sensitive", topic: "identity" });
    // Without the card hint the same labels still get the profile.
    expect(decide(field("Name", { autocomplete: "name" }), PROFILE, []).kind).toBe("profile");
  });
});

describe("a stored secret is never filled from the answer bank", () => {
  it("even when the exact question was stored (old data, imported backup)", () => {
    for (const q of ["Card number", "OTP", "Password", "Mother's maiden name", "UAN number", "Driving licence number"]) {
      const d = decide(field(q), PROFILE, [stored(q)]);
      expect(d.kind).toBe("ask");
    }
  });

  it("a stored entry tagged identity/signature never matches any other question either", () => {
    const answers: AnswerEntry[] = [
      { question: "Preferred IDE", answer: "4111111111111111", topic: "identity", updatedAt: "2026-10-01T00:00:00Z" },
      stored("Security answer", "Fluffy"),
    ];
    expect(findAnswer(field("Preferred IDE"), answers)).toBeUndefined();
    expect(findAnswer(field("Security answer"), answers)).toBeUndefined();
    expect(decide(field("Preferred IDE"), PROFILE, answers).kind).not.toBe("answer");
  });

  it("ordinary saved answers still work", () => {
    const answers = [stored("Preferred IDE", "Neovim")];
    expect(decide(field("Preferred IDE"), PROFILE, answers)).toEqual({ kind: "answer", value: "Neovim", question: "Preferred IDE" });
  });
});

describe("upsertAnswer refuses to store secrets", () => {
  const base = [stored("Preferred IDE", "Neovim")];
  for (const q of ["Credit card number", "CVV", "One-time code", "Confirm password", "Passport number", "Signature", "S.S.N.", "Voter ID"]) {
    it(`"${q}" is not stored`, () => {
      const out = upsertAnswer(base, stored(q, "secret"));
      expect(out).toEqual(base);
    });
  }

  it("refuses an entry tagged with a never-remember topic whatever its question", () => {
    expect(upsertAnswer(base, { question: "Anything", answer: "x", topic: "identity", updatedAt: "2026-10-01T00:00:00Z" })).toEqual(base);
    expect(upsertAnswer(base, { question: "Anything", answer: "x", topic: "signature", updatedAt: "2026-10-01T00:00:00Z" })).toEqual(base);
  });

  it("stores ordinary and other sensitive answers (salary, gender) the user chose to save", () => {
    expect(upsertAnswer(base, stored("Years with Kotlin", "3")).map((a) => a.question)).toContain("Years with Kotlin");
    expect(upsertAnswer(base, { ...stored("Expected salary", "20 LPA"), topic: "salary" })).toHaveLength(2);
    expect(upsertAnswer(base, { ...stored("Gender", "Male"), topic: "gender" })).toHaveLength(2);
  });
});

describe("corrections never learn sensitive topics", () => {
  const NOT_LEARNABLE = [
    "Expected salary", "Current CTC", "Expected CTC (LPA)", "Will you require visa sponsorship?", "Do you need sponsorship?",
    "Are you authorized to work in the US?", "Work authorization status", "Gender", "Race / Ethnicity", "Veteran status",
    "Disability status", "Age", "Date of birth", "DOB", "Pronouns", "Aadhaar number", "PAN number", "UAN", "Credit card number",
    "Signature", "Type your full name to sign", "Password", "One-time code", "Are you willing to relocate?",
  ];
  for (const q of NOT_LEARNABLE) {
    it(`"${q}" is not learnable`, () => {
      expect(isLearnableCorrection(q)).toBe(false);
    });
  }

  it("the control type is honoured: password and file boxes are never learned", () => {
    expect(isLearnableCorrection("Preferred IDE", "password")).toBe(false);
    expect(isLearnableCorrection("Preferred IDE", "file")).toBe(false);
    expect(isLearnableCorrection("Preferred IDE", "text")).toBe(true);
    expect(isLearnableCorrection("Notice period at current job")).toBe(true);
  });

  it("a learned correction for a secret never reaches the answer bank", () => {
    let corrections = applyCorrection([], "Card number", "4111").updatedCorrections;
    const res = applyCorrection(corrections, "Card number", "4111");
    corrections = res.updatedCorrections;
    expect(res.promotedEntry).toBeDefined();
    expect(upsertAnswer([], res.promotedEntry!)).toEqual([]);
  });
});

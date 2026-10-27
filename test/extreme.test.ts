/** Extreme cases: questions the user never answered, data the agent must never touch, and site quirks. */

import { describe, expect, it } from "vitest";
import { fillForm, runOnce, sameValue } from "../src/content/agent";
import { decide, sensitiveTopic } from "../src/content/classify";
import { extractFields } from "../src/content/extract";
import { fillField } from "../src/content/fill";
import { pendingQuestions } from "../src/background/runner";
import type { FieldDescriptor } from "../src/shared/types";
import { mount, PROFILE } from "./fixtures";

const field = (label: string, required = true, control: FieldDescriptor["control"] = "text"): FieldDescriptor => ({
  key: "k", label, control, required, options: [], name: "", autocomplete: "", placeholder: "",
});

describe("identity numbers and signatures are never filled or remembered", () => {
  it("recognises ID documents, bank details and signatures in many phrasings", () => {
    for (const label of ["Aadhaar number", "Aadhar No.", "PAN card number", "Passport number", "Social Security Number",
      "Bank account number", "IFSC code", "National Insurance number"]) {
      expect(sensitiveTopic(field(label)), label).toBe("identity");
    }
    for (const label of ["Signature", "E-signature", "Type your full name to sign this application", "Electronically sign below"]) {
      expect(sensitiveTopic(field(label)), label).toBe("signature");
    }
    expect(sensitiveTopic(field("Full name"))).toBeUndefined(); // a normal name field is not a signature
    expect(sensitiveTopic(field("Company name"))).toBeUndefined(); // "pan" inside words never matches
  });

  it("asks for required ones, leaves optional ones blank, and ignores the answer bank entirely", () => {
    const bank = [{ question: "Aadhaar number", answer: "1234 5678 9012", topic: "identity" as const, updatedAt: "x" }];
    expect(decide(field("Aadhaar number"), PROFILE, bank)).toEqual({ kind: "ask", reason: "sensitive", topic: "identity" });
    expect(decide(field("PAN (optional)", false), PROFILE, bank).kind).toBe("skip");
    expect(decide(field("Type your full name to sign this application"), PROFILE, []))
      .toEqual({ kind: "ask", reason: "sensitive", topic: "signature" });
  });
});

describe("the extreme practice form", () => {
  const EXTREME = `<form id="application-form">
    <div class="field"><label for="first_name">First Name *</label><input id="first_name" required></div>
    <div class="field"><label for="email">Email *</label><input id="email" type="email" required value="old.address@example.org"></div>
    <div class="field"><label for="cover">Cover letter (PDF) *</label><input id="cover" type="file" required></div>
    <div class="field"><label for="aadhaar">Aadhaar number *</label><input id="aadhaar" required></div>
    <div class="field"><label for="father">Father's name *</label><input id="father" required></div>
    <div class="field"><label for="oneliner">In one line, why us? *</label><input id="oneliner" maxlength="50" required></div>
    <div class="field"><label for="sign">Type your full name to sign this application *</label><input id="sign" required></div>
    <button type="submit">Submit</button></form>`;

  it("fills what it knows, asks the rest, never types ID or signature, and flags the wrong pre-fill", async () => {
    mount(EXTREME);
    const report = await fillForm(document, { profile: PROFILE, answers: [], mode: "review" });
    const by = (label: string) => report.fields.find((f) => f.field.label === label)!;
    expect(by("First Name").status).toBe("filled");
    expect(by("Email")).toMatchObject({ status: "already_filled", review: true });
    expect((document.getElementById("email") as HTMLInputElement).value).toBe("old.address@example.org"); // never overwritten
    for (const label of ["Cover letter (PDF)", "Aadhaar number", "Father's name", "In one line, why us?", "Type your full name to sign this application"]) {
      expect(by(label).status, label).toBe("needs_user");
    }
    expect((document.getElementById("aadhaar") as HTMLInputElement).value).toBe("");
    expect((document.getElementById("sign") as HTMLInputElement).value).toBe("");
    expect(by("In one line, why us?").field.maxLength).toBe(50);
  });

  it("the inbox gets only questions the user can answer in the panel", async () => {
    mount(EXTREME);
    const report = await fillForm(document, { profile: PROFILE, answers: [], mode: "review" });
    expect(pendingQuestions(report)?.map((q) => q.label)).toEqual(["Father's name", "In one line, why us?"]);
  });

  it("does not auto-submit while a pre-filled value disagrees with the profile", async () => {
    mount(`<form id="application-form"><label for="e">Email *</label><input id="e" type="email" required value="old@example.org">
      <button type="submit">Submit</button></form>`);
    let submitted = false;
    document.querySelector("form")!.addEventListener("submit", (e) => { e.preventDefault(); submitted = true; });
    const report = await runOnce(document, { profile: PROFILE, answers: [], mode: "auto" });
    expect(report.status).toBe("ready_to_submit");
    expect(submitted).toBe(false);
  });

  it("refuses an answer longer than the field's limit instead of letting the browser cut it", () => {
    mount(`<form><label for="x">In one line *</label><input id="x" maxlength="10" required></form>`);
    const [f] = extractFields(document.querySelector("form")!);
    expect(fillField(f!, "This is far too long")).toMatchObject({ ok: false });
    expect((document.getElementById("x") as HTMLInputElement).value).toBe("");
  });
});

describe("sameValue", () => {
  it("treats formatting differences as the same fact", () => {
    expect(sameValue("ASHA VERMA", "Asha Verma")).toBe(true);
    expect(sameValue("+91 90000 00000", "9000000000")).toBe(true);
    expect(sameValue("old.address@example.org", "asha@example.com")).toBe(false);
  });
});

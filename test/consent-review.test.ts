/** Consent review: consent and agreement boxes are found and labelled for the user, never ticked during a fill, and
 * ticked one at a time only after the user's click, with the label re-checked first. */

import { beforeEach, describe, expect, it } from "vitest";
import {
  classifyConsent, findConsentBoxes, isConsentLabel, listConsentBoxes, reviewOrder, tickConsentBox,
} from "../src/shared/consent-review";
import { fillForm, scanForm } from "../src/content/agent";
import { dropResumeRequirement, mount, PROFILE, SENSITIVE_ANSWERS } from "./fixtures";

describe("which boxes are consent boxes", () => {
  it.each([
    "I agree to the Privacy Policy",
    "I do not consent to my data being shared with third parties",
    "I agree to receive marketing texts",
    "I certify the information is true",
    "I agree to the Privacy Policy and arbitration terms",
    "I consent to a background check",
    "Email me about future jobs",
    "Sign me up for the newsletter",
    "I acknowledge the data retention notice",
    "Yes, I'd like to receive updates on WhatsApp",
  ])("%s", (label) => {
    expect(isConsentLabel(label)).toBe(true);
  });

  it.each(["Marketing", "Communications", "Python", "I have a driving licence", "Remote", "Willing to travel"])("not: %s", (label) => {
    expect(isConsentLabel(label)).toBe(false);
  });
});

describe("classification", () => {
  it("'I do not consent' is a consent box that says no", () => {
    expect(classifyConsent("I do not consent to my data being shared")).toEqual({ tag: "consent", optOut: true });
  });

  it("marketing texts are marketing", () => {
    expect(classifyConsent("I agree to receive marketing texts")).toEqual({ tag: "marketing", optOut: false });
  });

  it("certifying the information is true is legal: read carefully", () => {
    expect(classifyConsent("I certify the information is true").tag).toBe("legal");
  });

  it("privacy policy together with arbitration is legal (the stronger tag wins)", () => {
    expect(classifyConsent("I agree to the Privacy Policy and arbitration terms").tag).toBe("legal");
  });

  it("a plain privacy policy is consent; a background check is legal", () => {
    expect(classifyConsent("I agree to the privacy policy").tag).toBe("consent");
    expect(classifyConsent("I consent to a background check").tag).toBe("legal");
  });

  it("orders required boxes first (legal on top), optional ones next, marketing last", () => {
    const box = (id: string, tag: "legal" | "marketing" | "consent", required: boolean) => ({ id, label: id, tag, required, checked: false, optOut: false });
    const ordered = reviewOrder([box("m", "marketing", false), box("c", "consent", true), box("o", "consent", false), box("l", "legal", true)]);
    expect(ordered.map((b) => b.id)).toEqual(["l", "c", "o", "m"]);
  });
});

const CONSENT_FORM = `
<h1>Backend Engineer</h1>
<form id="application-form">
  <div class="field"><label for="first_name">First Name *</label><input id="first_name" name="first_name" required></div>
  <div class="field"><label for="email">Email *</label><input id="email" name="email" type="email" required></div>
  <div class="field"><label for="python">How many years of experience do you have with Python?</label><input id="python" name="python"></div>
  <div class="field"><label><input type="checkbox" id="c-marketing" name="marketing"> I agree to receive marketing texts</label></div>
  <div class="field"><label><input type="checkbox" id="c-legal" name="legal" required> I agree to the Privacy Policy and arbitration terms *</label></div>
  <div class="field"><input type="checkbox" id="c-cert" name="cert" aria-required="true"><label for="c-cert">I certify the information is true</label></div>
  <div class="field"><label><input type="checkbox" id="c-no" name="nosell"> I do not consent to the sale of my personal information</label></div>
  <div class="field"><label><input type="checkbox" id="remote" name="remote"> Remote</label></div>
  <button type="submit">Submit Application</button>
</form>`;

const box = (id: string) => document.getElementById(id) as HTMLInputElement;

describe("on the page", () => {
  beforeEach(() => mount(CONSENT_FORM));

  it("finds every consent box with its exact label, required flag and tag", () => {
    const boxes = findConsentBoxes(document).map((x) => x.box);
    expect(boxes.map((b) => [b.label, b.tag, b.required, b.optOut])).toEqual([
      ["I agree to receive marketing texts", "marketing", false, false],
      ["I agree to the Privacy Policy and arbitration terms *", "legal", true, false],
      ["I certify the information is true", "legal", true, false],
      ["I do not consent to the sale of my personal information", "consent", false, true],
    ]);
  });

  it("lists them for review with marketing last", () => {
    const list = listConsentBoxes(document, "https://example.com/apply");
    expect(list.frameUrl).toBe("https://example.com/apply");
    expect(list.boxes.map((b) => b.label).at(-1)).toBe("I agree to receive marketing texts");
    expect(list.boxes[0]!.required).toBe(true);
  });

  it("a fill never ticks a consent box (not even with a similar saved answer), and the preview agrees", async () => {
    const answers = [...SENSITIVE_ANSWERS, { question: "I agree to receive marketing", answer: "Yes", topic: "consent" as const, updatedAt: "2026-10-25" }];
    const preview = await scanForm(document, { profile: PROFILE, answers });
    for (const label of ["I agree to receive marketing texts", "I certify the information is true"]) {
      expect(preview.fields.find((f) => f.field.label.startsWith(label))?.status).not.toBe("filled");
    }
    const report = await fillForm(document, { profile: PROFILE, answers, mode: "auto" });
    expect(["c-marketing", "c-legal", "c-cert", "c-no"].map((id) => box(id).checked)).toEqual([false, false, false, false]);
    expect(box("first_name").value).toBe("Asha"); // the rest of the form is filled as usual
    expect(report.status).toBe("needs_user"); // two required boxes wait for the user
  });

  it("ticks exactly the one box the user chose", () => {
    const target = findConsentBoxes(document).find((x) => x.box.label.startsWith("I certify"))!.box;
    const result = tickConsentBox(document, target.id, target.label);
    expect(result).toMatchObject({ ok: true, box: { checked: true } });
    expect(["c-marketing", "c-legal", "c-cert", "c-no"].map((id) => box(id).checked)).toEqual([false, false, true, false]);
  });

  it("a box already ticked is left as it is", () => {
    box("c-cert").checked = true;
    const target = findConsentBoxes(document).find((x) => x.box.label.startsWith("I certify"))!.box;
    expect(tickConsentBox(document, target.id, target.label)).toMatchObject({ ok: true, already: true });
    expect(box("c-cert").checked).toBe(true);
  });

  it("refuses when the label changed after the user read it", () => {
    const target = findConsentBoxes(document).find((x) => x.box.label.startsWith("I certify"))!.box;
    document.querySelector("label[for='c-cert']")!.textContent = "I certify the information is true and waive my right to sue";
    const result = tickConsentBox(document, target.id, target.label);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/Nothing was ticked/);
    expect(box("c-cert").checked).toBe(false);
  });

  it("refuses when the list is stale: a box was inserted before it (it moved)", () => {
    const target = findConsentBoxes(document).find((x) => x.box.label.startsWith("I certify"))!.box;
    document.getElementById("first_name")!.insertAdjacentHTML("afterend", "<label><input type='checkbox' id='c-new'> I agree to the terms of use</label>");
    expect(tickConsentBox(document, target.id, target.label).ok).toBe(false);
    expect(box("c-cert").checked).toBe(false);
    expect(box("c-new").checked).toBe(false);
  });

  it("refuses when the label the panel sends is not the one on the page", () => {
    const target = findConsentBoxes(document).find((x) => x.box.label.startsWith("I certify"))!.box;
    expect(tickConsentBox(document, target.id, "I agree").ok).toBe(false);
    expect(box("c-cert").checked).toBe(false);
  });

  it("a disabled box is not ticked", () => {
    box("c-cert").disabled = true;
    const target = findConsentBoxes(document).find((x) => x.box.label.startsWith("I certify"))!.box;
    expect(tickConsentBox(document, target.id, target.label).ok).toBe(false);
  });
});

describe("the existing rule stays: the user's own saved answer to exactly that box", () => {
  it("is still used (the user decided that box before)", async () => {
    mount();
    dropResumeRequirement();
    await fillForm(document, { profile: { ...PROFILE, resume: undefined }, answers: SENSITIVE_ANSWERS, mode: "review" });
    expect((document.getElementById("privacy") as HTMLInputElement).checked).toBe(true);
  });
});

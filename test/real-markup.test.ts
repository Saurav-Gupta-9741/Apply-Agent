/** Markup structures observed on live Greenhouse, Lever and Ashby application forms (Oct 2026),
 * reduced to their essentials. Each test is a real bug found by the live read-only scan. */

import { describe, expect, it } from "vitest";
import { pickAdapter } from "../src/content/adapters";
import { decide } from "../src/content/classify";
import { extractFields } from "../src/content/extract";
import { currentValue, fillField } from "../src/content/fill";
import { PROFILE } from "./fixtures";

function fields(html: string, root = "form") {
  document.body.innerHTML = html;
  return extractFields(document.querySelector(root) ?? document.body);
}

describe("Greenhouse (new job boards)", () => {
  it("reads the resume question from its group, not the 'Attach' button caption", () => {
    const [resume] = fields(`<form id="application-form">
      <div role="group" aria-labelledby="upload-label-resume" aria-required="true" class="file-upload">
        <div id="upload-label-resume" class="label upload-label">Resume/CV<span class="required">*</span></div>
        <div class="secondary-button"><button type="button">Attach</button>
          <label class="visually-hidden" for="resume">Attach</label><input id="resume" type="file"></div>
        <div class="secondary-button"><button type="button">Enter manually</button>
          <label class="visually-hidden" for="resume_text">Enter manually</label></div>
      </div></form>`);
    expect(resume?.descriptor).toMatchObject({ label: "Resume/CV", required: true, control: "file" });
    expect(decide(resume!.descriptor, PROFILE, [])).toEqual({ kind: "resume" });
  });
});

describe("Lever", () => {
  const LEVER = `<form>
    <ul><li class="application-question custom-question"><div>
      <div class="application-label full-width text"><div class="text">Total Years of Experience<span class="required">✱</span></div></div>
      <div class="application-field full-width required-field">
        <input required class="card-field-input" type="text" placeholder="Type your response" name="cards[59e7ee0c-506d-48b4-a83a-a7a23967a7dd][field1]">
      </div></div></li>
    <li class="application-question custom-question"><div>
      <div class="application-label"><div class="text">Gender<span class="required">✱</span></div></div>
      <div class="application-field"><ul>
        <li><label><input type="radio" name="cards[59e7ee0c-506d-48b4-a83a-a7a23967a7dd][field0]" value="Male" required><span class="application-answer-alternative">Male</span></label></li>
        <li><label><input type="radio" name="cards[59e7ee0c-506d-48b4-a83a-a7a23967a7dd][field0]" value="Female"><span class="application-answer-alternative">Female</span></label></li>
      </ul></div></div></li>
    <li class="application-question custom-question"><div>
      <div class="application-label"><div class="text">Which domains have you worked in?<span class="required">✱</span></div></div>
      <div class="application-field"><ul>
        <li><label><input type="checkbox" name="cards[72324442-aa8b-4b53-bf61-7e77684071b8][field2]" value="Banking"><span>Banking</span></label></li>
        <li><label><input type="checkbox" name="cards[72324442-aa8b-4b53-bf61-7e77684071b8][field2]" value="NBFC"><span>NBFC</span></label></li>
        <li><label><input type="checkbox" name="cards[72324442-aa8b-4b53-bf61-7e77684071b8][field2]" value="Fintech"><span>Fintech / Digital Payments</span></label></li>
      </ul></div></div></li>
    <li class="application-question"><label><div class="application-label">Current location</div>
      <div class="application-field"><input name="location" type="text">
        <div class="dropdown-results" style="display:none">No location found. Try entering a different location</div>
        <div style="display:none">Loading</div></div></label></li>
    </ul></form>`;

  it("finds the question text for custom questions instead of the generic placeholder or the field id", () => {
    const labels = fields(LEVER).map((f) => f.descriptor.label);
    expect(labels).toEqual(["Total Years of Experience", "Gender", "Which domains have you worked in?", "Current location"]);
  });

  it("marks ✱ questions as required and keeps hidden status text out of labels", () => {
    const [years, gender, domains, location] = fields(LEVER).map((f) => f.descriptor);
    expect([years?.required, gender?.required, domains?.required, location?.required]).toEqual([true, true, true, false]);
    expect(location?.label).not.toMatch(/No location found|Loading/);
  });

  it("treats same-name checkboxes as one 'select all that apply' question and fills only listed choices", () => {
    const domains = fields(LEVER).find((f) => f.descriptor.control === "checkbox_group")!;
    expect(domains.descriptor.options).toEqual(["Banking", "NBFC", "Fintech / Digital Payments"]);
    expect(decide(domains.descriptor, PROFILE, []).kind).toBe("ask");
    expect(fillField(domains, "Banking, Fintech / Digital Payments")).toEqual({ ok: true });
    expect(currentValue(domains)).toBe("Banking, Fintech / Digital Payments");
    expect(fillField(domains, "Banking, Insurance")).toMatchObject({ ok: false }); // unknown choice: refuse
  });
});

describe("Ashby", () => {
  it("finds the application fields even though they are not inside a <form>", () => {
    document.body.innerHTML = `
      <div class="ashby-application-form-autofill-input"><input type="file"><p>Autofill from resume</p></div>
      <div class="ashby-application-form-container">
        <div class="ashby-application-form-field-entry"><label class="ashby-application-form-question-title" for="_systemfield_name">Name</label>
          <input id="_systemfield_name" name="_systemfield_name" required></div>
        <div class="ashby-application-form-field-entry"><label class="ashby-application-form-question-title" for="_systemfield_email">Email</label>
          <input id="_systemfield_email" name="_systemfield_email" type="email" required></div>
        <div class="ashby-application-form-field-entry"><label class="ashby-application-form-question-title">Resume</label>
          <input id="_systemfield_resume" type="file"></div>
        <button>Submit Application</button>
      </div>`;
    const adapter = pickAdapter(document, "https://jobs.ashbyhq.com/acme/123/application");
    const root = adapter.formRoot(document)!;
    const found = extractFields(root);
    expect(found.length).toBeGreaterThanOrEqual(3);
    const kinds = found.map((f) => decide(f.descriptor, PROFILE, []));
    expect(kinds).toEqual(expect.arrayContaining([
      { kind: "profile", key: "fullName", value: "Asha Verma" },
      expect.objectContaining({ kind: "profile", key: "email" }),
      { kind: "resume" },
    ]));
    // The resume-autofill helper is never used (it would re-parse the resume and overwrite fields).
    const autofill = found.find((f) => f.descriptor.label === "Autofill from resume" || f.descriptor.name === "");
    if (autofill) expect(decide(autofill.descriptor, PROFILE, []).kind).toBe("skip");
    expect(adapter.action(root)?.button.textContent).toBe("Submit Application");
  });
});

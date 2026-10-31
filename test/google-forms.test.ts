/** Tests Google Forms support:
 * - isGoogleForms URL matching
 * - sensePage recognition as an application_form
 * - pickAdapter and formRoot finding
 * - extractFields: labels, control types, options, required flags
 * - decide: auto-filling profile facts (fullName, email, phone, resumeUrl, etc.)
 * - fillField: text, radio, checkbox, and dropdown
 * - primaryAction: finds Submit and never presses Clear Form */

import { describe, expect, it } from "vitest";
import { isGoogleForms, pickAdapter, primaryAction } from "../src/content/adapters";
import { extractFields } from "../src/content/extract";
import { decide } from "../src/content/classify";
import { currentValue, fillField } from "../src/content/fill";
import { sensePage } from "../src/content/sense";
import { mount, PROFILE, SENSITIVE_ANSWERS } from "./fixtures";
import type { Profile } from "../src/shared/types";

const GOOGLE_FORM_HTML = `
<form action="https://docs.google.com/forms/d/e/1FAIpQLSc_Example/formResponse" method="POST" id="mG61Hd">
  <!-- Form Title -->
  <div role="heading" aria-level="1" class="F9iSGe">Senior Software Engineer Application</div>
  <div class="freebirdFormviewerViewHeaderDescription">Please complete the application form below.</div>

  <!-- Q1: Full Name -->
  <div role="listitem" class="Qr7Oae">
    <div class="geS5n">
      <div role="heading" aria-level="3" class="M7eMe" id="i1">
        <span>Full Name</span><span class="vQIs2" aria-hidden="true"> *</span>
      </div>
      <div class="r2lsve">
        <div class="Xb9hP">
          <input type="text" class="whsOnd zHQkBf" jsname="YPqjbf" name="entry.1001" aria-labelledby="i1" aria-required="true" required>
        </div>
      </div>
    </div>
  </div>

  <!-- Q2: Email -->
  <div role="listitem" class="Qr7Oae">
    <div class="geS5n">
      <div role="heading" aria-level="3" class="M7eMe" id="i5">
        <span>Email Address</span><span class="vQIs2" aria-hidden="true"> *</span>
      </div>
      <div class="r2lsve">
        <div class="Xb9hP">
          <input type="email" class="whsOnd zHQkBf" jsname="YPqjbf" name="entry.1002" aria-labelledby="i5" aria-required="true" required>
        </div>
      </div>
    </div>
  </div>

  <!-- Q3: Phone -->
  <div role="listitem" class="Qr7Oae">
    <div class="geS5n">
      <div role="heading" aria-level="3" class="M7eMe" id="i9">
        <span>Phone Number</span><span class="vQIs2" aria-hidden="true"> *</span>
      </div>
      <div class="r2lsve">
        <div class="Xb9hP">
          <input type="tel" class="whsOnd zHQkBf" jsname="YPqjbf" name="entry.1003" aria-labelledby="i9" aria-required="true" required>
        </div>
      </div>
    </div>
  </div>

  <!-- Q4: Resume Drive Link -->
  <div role="listitem" class="Qr7Oae">
    <div class="geS5n">
      <div role="heading" aria-level="3" class="M7eMe" id="i13">
        <span>Resume Link (Google Drive / Cloud URL)</span><span class="vQIs2" aria-hidden="true"> *</span>
      </div>
      <div class="r2lsve">
        <div class="Xb9hP">
          <input type="url" class="whsOnd zHQkBf" jsname="YPqjbf" name="entry.1004" aria-labelledby="i13" aria-required="true" required>
        </div>
      </div>
    </div>
  </div>

  <!-- Q5: Radio Group (Work Authorization) -->
  <div role="listitem" class="Qr7Oae">
    <div class="geS5n">
      <div role="heading" aria-level="3" class="M7eMe" id="i17">
        <span>Are you legally authorized to work in the United States?</span><span class="vQIs2" aria-hidden="true"> *</span>
      </div>
      <div role="radiogroup" aria-labelledby="i17" class="SG0AAe" aria-required="true">
        <div class="eCGGdd">
          <div role="radio" aria-checked="false" aria-label="Yes" class="docssharedWizToggleLabeledControl" tabindex="0">
            <input type="radio" class="docssharedWizToggleLabeledInput" name="entry.1005" value="Yes" tabindex="-1">
            <span class="docssharedWizToggleLabeledLabelText">Yes</span>
          </div>
        </div>
        <div class="eCGGdd">
          <div role="radio" aria-checked="false" aria-label="No" class="docssharedWizToggleLabeledControl" tabindex="-1">
            <input type="radio" class="docssharedWizToggleLabeledInput" name="entry.1005" value="No" tabindex="-1">
            <span class="docssharedWizToggleLabeledLabelText">No</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Q6: Checkbox Group (Technologies) -->
  <div role="listitem" class="Qr7Oae">
    <div class="geS5n">
      <div role="heading" aria-level="3" class="M7eMe" id="i21">
        <span>Key technologies you have worked with</span>
      </div>
      <div role="group" aria-labelledby="i21" class="YmvwI">
        <div class="eCGGdd">
          <div role="checkbox" aria-checked="false" aria-label="Python" class="docssharedWizToggleLabeledControl" tabindex="0">
            <input type="checkbox" class="docssharedWizToggleLabeledInput" name="entry.1006" value="Python" tabindex="-1">
            <span class="docssharedWizToggleLabeledLabelText">Python</span>
          </div>
        </div>
        <div class="eCGGdd">
          <div role="checkbox" aria-checked="false" aria-label="TypeScript" class="docssharedWizToggleLabeledControl" tabindex="-1">
            <input type="checkbox" class="docssharedWizToggleLabeledInput" name="entry.1006" value="TypeScript" tabindex="-1">
            <span class="docssharedWizToggleLabeledLabelText">TypeScript</span>
          </div>
        </div>
        <div class="eCGGdd">
          <div role="checkbox" aria-checked="false" aria-label="SQL" class="docssharedWizToggleLabeledControl" tabindex="-1">
            <input type="checkbox" class="docssharedWizToggleLabeledInput" name="entry.1006" value="SQL" tabindex="-1">
            <span class="docssharedWizToggleLabeledLabelText">SQL</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Q7: Custom Dropdown (Degree) -->
  <div role="listitem" class="Qr7Oae">
    <div class="geS5n">
      <div role="heading" aria-level="3" class="M7eMe" id="i25">
        <span>University degree</span>
      </div>
      <div class="vQES8d">
        <div role="listbox" aria-labelledby="i25" aria-expanded="false" tabindex="0" class="MocG8c">
          <span class="quantumWizMenuPaperselectOptionText">Choose</span>
        </div>
        <div class="exportSelectPopup" role="presentation">
          <div role="option" data-value="Bachelor's Degree"><span>Bachelor's Degree</span></div>
          <div role="option" data-value="Master's Degree"><span>Master's Degree</span></div>
          <div role="option" data-value="PhD"><span>PhD</span></div>
        </div>
      </div>
    </div>
  </div>

  <!-- Buttons -->
  <div class="lRwqEb">
    <div role="button" class="uArJbe" aria-label="Clear form" tabindex="0">
      <span class="l4V7wb">Clear form</span>
    </div>
    <div role="button" class="uArJbe" aria-label="Submit" tabindex="0">
      <span class="l4V7wb">Submit</span>
    </div>
  </div>
</form>
`;

describe("Google Forms support", () => {
  it("recognizes Google Forms URLs correctly", () => {
    expect(isGoogleForms("https://docs.google.com/forms/d/e/1FAIpQLSc_Example/viewform")).toBe(true);
    expect(isGoogleForms("https://docs.google.com/forms/d/12345/formResponse")).toBe(true);
    expect(isGoogleForms("https://jobs.lever.co/acme/123")).toBe(false);
    expect(isGoogleForms("https://docs.google.com/document/d/123/edit")).toBe(false);
  });

  it("selects the googleForms adapter and finds the formRoot and title", () => {
    mount(GOOGLE_FORM_HTML);
    const url = "https://docs.google.com/forms/d/e/1FAIpQLSc_Example/viewform";
    const adapter = pickAdapter(document, url);

    expect(adapter.platform).toBe("google_forms");
    const root = adapter.formRoot(document);
    expect(root).not.toBeNull();
    expect(root?.tagName.toLowerCase()).toBe("form");
    expect(adapter.jobTitle(document)).toBe("Senior Software Engineer Application");
  });

  it("identifies Submit as the primary action and never presses Clear form", () => {
    mount(GOOGLE_FORM_HTML);
    const root = document.querySelector<HTMLElement>("form")!;
    const action = primaryAction(root);

    expect(action).not.toBeNull();
    expect(action?.kind).toBe("submit");
    expect(action?.button.textContent?.trim()).toBe("Submit");
  });

  it("recognizes the page as an application_form in sensePage", () => {
    mount(GOOGLE_FORM_HTML);
    const url = "https://docs.google.com/forms/d/e/1FAIpQLSc_Example/viewform";
    const sense = sensePage(document, url);

    expect(sense.kind).toBe("application_form");
    expect(sense.score).toBeGreaterThanOrEqual(7);
  });

  it("extracts all fields with clean labels, correct control types, and options", () => {
    mount(GOOGLE_FORM_HTML);
    const form = document.querySelector<HTMLElement>("form")!;
    const fields = extractFields(form);

    expect(fields.length).toBe(7);

    // Q1: Full Name
    expect(fields[0]!.descriptor.label).toBe("Full Name");
    expect(fields[0]!.descriptor.control).toBe("text");
    expect(fields[0]!.descriptor.required).toBe(true);

    // Q2: Email
    expect(fields[1]!.descriptor.label).toBe("Email Address");
    expect(fields[1]!.descriptor.control).toBe("email");
    expect(fields[1]!.descriptor.required).toBe(true);

    // Q3: Phone
    expect(fields[2]!.descriptor.label).toBe("Phone Number");
    expect(fields[2]!.descriptor.control).toBe("tel");
    expect(fields[2]!.descriptor.required).toBe(true);

    // Q4: Resume Drive Link
    expect(fields[3]!.descriptor.label).toBe("Resume Link (Google Drive / Cloud URL)");
    expect(fields[3]!.descriptor.control).toBe("url");
    expect(fields[3]!.descriptor.required).toBe(true);

    // Q5: Work Authorization Radio Group
    expect(fields[4]!.descriptor.label).toBe("Are you legally authorized to work in the United States?");
    expect(fields[4]!.descriptor.control).toBe("radio");
    expect(fields[4]!.descriptor.required).toBe(true);
    expect(fields[4]!.descriptor.options).toEqual(["Yes", "No"]);

    // Q6: Technologies Checkbox Group
    expect(fields[5]!.descriptor.label).toBe("Key technologies you have worked with");
    expect(fields[5]!.descriptor.control).toBe("checkbox_group");
    expect(fields[5]!.descriptor.options).toEqual(["Python", "TypeScript", "SQL"]);

    // Q7: Education Dropdown
    expect(fields[6]!.descriptor.label).toBe("University degree");
    expect(fields[6]!.descriptor.control).toBe("dropdown");
    expect(fields[6]!.descriptor.options).toEqual(["Bachelor's Degree", "Master's Degree", "PhD"]);
  });

  it("decides fields accurately from the user profile with 0 wrong fills", () => {
    mount(GOOGLE_FORM_HTML);
    const form = document.querySelector<HTMLElement>("form")!;
    const fields = extractFields(form);

    const testProfile: Profile = {
      ...PROFILE,
      resumeUrl: "https://drive.google.com/file/d/1_L5NAIAgNgMUZYuyqM25RNu02NELLGwp/view?usp=drive_link",
    };

    // Q1 -> fullName
    const d1 = decide(fields[0]!.descriptor, testProfile, SENSITIVE_ANSWERS);
    expect(d1).toEqual({ kind: "profile", key: "fullName", value: "Asha Verma" });

    // Q2 -> email
    const d2 = decide(fields[1]!.descriptor, testProfile, SENSITIVE_ANSWERS);
    expect(d2).toEqual({ kind: "profile", key: "email", value: "asha@example.com" });

    // Q3 -> phone
    const d3 = decide(fields[2]!.descriptor, testProfile, SENSITIVE_ANSWERS);
    expect(d3).toEqual({ kind: "profile", key: "phone", value: "+91 90000 00000" });

    // Q4 -> resumeUrl (Google Drive Link)
    const d4 = decide(fields[3]!.descriptor, testProfile, SENSITIVE_ANSWERS);
    expect(d4).toEqual({
      kind: "profile",
      key: "resumeUrl",
      value: "https://drive.google.com/file/d/1_L5NAIAgNgMUZYuyqM25RNu02NELLGwp/view?usp=drive_link",
    });

    // Q5 -> sensitive answer (work authorization: Yes)
    const d5 = decide(fields[4]!.descriptor, testProfile, SENSITIVE_ANSWERS);
    expect(d5).toEqual({ kind: "answer", question: "Are you legally authorized to work in the United States?", value: "Yes" });

    // Q7 -> degree
    const d7 = decide(fields[6]!.descriptor, testProfile, SENSITIVE_ANSWERS);
    expect(d7).toEqual({ kind: "profile", key: "degree", value: "Master's Degree" });
  });

  it("fills Google Forms fields and reads current values back cleanly", () => {
    mount(GOOGLE_FORM_HTML);
    const form = document.querySelector<HTMLElement>("form")!;
    const fields = extractFields(form);

    // Fill Full Name
    const res1 = fillField(fields[0]!, "Asha Verma");
    expect(res1.ok).toBe(true);
    expect(currentValue(fields[0]!)).toBe("Asha Verma");

    // Fill Email
    const res2 = fillField(fields[1]!, "asha@example.com");
    expect(res2.ok).toBe(true);
    expect(currentValue(fields[1]!)).toBe("asha@example.com");

    // Fill Radio Group (Yes)
    const res5 = fillField(fields[4]!, "Yes");
    expect(res5.ok).toBe(true);
    expect(currentValue(fields[4]!)).toBe("Yes");

    // Fill Checkbox Group (Python, SQL)
    const res6 = fillField(fields[5]!, "Python, SQL");
    expect(res6.ok).toBe(true);
    expect(currentValue(fields[5]!)).toBe("Python, SQL");
  });
});

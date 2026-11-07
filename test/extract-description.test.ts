// The question's own description paragraph is read for every kind of field (live Greenhouse markup, 2026-11-07), so an
// employer's AI rule written under a Yes/No question is seen; a dropdown's "Select..." placeholder is not help text.
// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { extractFields } from "../src/content/extract";
import { aiPolicyOfForm } from "../src/shared/ai-policy";

describe("question descriptions", () => {
  it("reads the description of a custom dropdown, a select and a checkbox group", () => {
    document.body.innerHTML = `
      <form>
        <label id="q1-label" for="q1">AI Policy for Application</label>
        <div><div id="react-select-q1-placeholder">Select...</div>
          <input id="q1" type="text" role="combobox" aria-labelledby="q1-label" aria-describedby="react-select-q1-placeholder"></div>
        <div id="q1-description"><p>Please do not use AI tools during the application process. We prohibit AI-written answers.</p></div>
        <label for="q2">Do you agree?</label><select id="q2" name="q2"><option>Yes</option><option>No</option></select>
        <div id="q2-description">You confirm that all answers were human generated.</div>
        <fieldset><legend>Pick one</legend>
          <label><input type="checkbox" name="q3[]" value="a"> A</label><label><input type="checkbox" name="q3[]" value="b"> B</label></fieldset>
        <div id="q3-description">Our guidelines for using AI in our interviewing process.</div>
      </form>`;
    const fields = extractFields(document).map((f) => f.descriptor);
    const byLabel = (s: string) => fields.find((f) => f.label.includes(s));
    expect(byLabel("AI Policy")?.hint).toContain("do not use AI tools");
    expect(byLabel("AI Policy")?.hint ?? "").not.toContain("Select...");
    expect(byLabel("Do you agree")?.hint).toContain("human generated");
    expect(fields.find((f) => f.control === "checkbox_group")?.hint).toContain("guidelines for using AI");
    expect(aiPolicyOfForm(fields.map((f) => `${f.label} ${f.hint ?? ""}`))?.kind).toBe("banned");
  });
});

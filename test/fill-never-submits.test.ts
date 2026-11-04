// Round 4 tester report: "I pressed Fill this application, some fields were still blank for me, and the
// application form closed." Fill must only fill: never close the form, never move it on, never send it, and a
// submit (auto mode, or the panel's Submit) never happens while a required field is empty.
import { afterEach, describe, expect, it } from "vitest";
import { emptyRequired, fillForm, runOnce, submitForm } from "../src/content/agent";
import { fillCombobox } from "../src/content/fill";
import { PROFILE } from "./fixtures";

function mount(html: string): void {
  document.body.innerHTML = html;
}
afterEach(() => {
  document.body.innerHTML = "";
});

describe("Fill never closes, moves on or sends the form", () => {
  it("a dropdown whose list never opens is closed without an Escape reaching the page (pop-up forms close on it)", async () => {
    mount(`<div role="dialog"><label for="c">City</label><input id="c" role="combobox" aria-controls="none"></div>`);
    let pageEscapes = 0;
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") pageEscapes++; });
    const out = await fillCombobox(document.getElementById("c") as HTMLInputElement, "Pune", 300);
    expect(out.ok).toBe(false);
    expect(pageEscapes).toBe(0);
  });

  it("a click on a plain <button> inside the form (a type-less button is a Submit button) does not send it", async () => {
    mount(`<h1>Engineer</h1><form id="f">
      <label for="fn">First name *</label><input id="fn" name="first_name" required>
      <label id="exp-l">How did you hear about us?</label>
      <button id="dd" aria-labelledby="exp-l" aria-haspopup="listbox">Select...</button>
      <ul role="listbox" id="lb" hidden><li role="option">LinkedIn</li><li role="option">Friend</li></ul>
      <button type="submit">Submit application</button></form>`);
    let submits = 0;
    document.getElementById("f")!.addEventListener("submit", (e) => { submits++; e.preventDefault(); });
    const dd = document.getElementById("dd")!;
    dd.addEventListener("click", () => { document.getElementById("lb")!.hidden = false; });
    await fillForm(document, { profile: PROFILE, answers: [{ question: "How did you hear about us?", answer: "LinkedIn", updatedAt: "2026-11-04" }], mode: "review" });
    expect(submits).toBe(0);
    // A page script that submits when a value changes is stopped too.
    mount(`<h1>Engineer</h1><form id="g"><label for="e">Email *</label><input id="e" type="email" required><button type="submit">Submit</button></form>`);
    let sent = 0;
    const g = document.getElementById("g") as HTMLFormElement;
    g.addEventListener("submit", () => { sent++; });
    document.getElementById("e")!.addEventListener("change", () => g.requestSubmit());
    await fillForm(document, { profile: PROFILE, answers: [], mode: "review" });
    expect((document.getElementById("e") as HTMLInputElement).value).toBe(PROFILE.email);
    expect(sent).toBe(0);
  });

  it("the guard is gone after the fill: the user's own Submit still works", async () => {
    mount(`<h1>Engineer</h1><form id="h"><label for="e2">Email *</label><input id="e2" type="email" required><button id="go" type="submit">Submit</button></form>`);
    let sent = 0;
    document.getElementById("h")!.addEventListener("submit", (e) => { sent++; e.preventDefault(); });
    await fillForm(document, { profile: PROFILE, answers: [], mode: "review" });
    (document.getElementById("go") as HTMLButtonElement).click();
    expect(sent).toBe(1);
  });
});

describe("never submitted while a required field is empty", () => {
  it("lists required fields that are still empty on the page", () => {
    mount(`<form id="r"><label for="a">Full name *</label><input id="a" value="Asha">
      <label for="b">Why this role? *</label><textarea id="b"></textarea>
      <label for="c">Nickname</label><input id="c"></form>`);
    expect(emptyRequired(document.getElementById("r")!)).toEqual(["Why this role?"]);
  });

  it("Submit stops and names the empty required fields", async () => {
    mount(`<h1>Engineer</h1><form id="s" novalidate><label for="a">First name *</label><input id="a" value="Asha">
      <label for="b">Expected salary *</label><input id="b">
      <button type="submit">Submit application</button></form>`);
    let sent = 0;
    document.getElementById("s")!.addEventListener("submit", (e) => { sent++; e.preventDefault(); });
    const report = await submitForm(document, 500);
    expect(report.status).toBe("needs_user");
    expect(report.errors.join(" ")).toMatch(/Still empty: Expected salary/);
    expect(sent).toBe(0);
  });

  it("auto mode does not submit while any question is still open for the user, even an optional one", async () => {
    mount(`<h1>Engineer</h1><form id="t" novalidate><label for="fn">First name *</label><input id="fn" required>
      <fieldset><legend>Have you ever been convicted of a criminal offence?</legend>
        <label><input type="radio" name="crim" value="yes"> Yes</label><label><input type="radio" name="crim" value="no"> No</label></fieldset>
      <button type="submit">Submit application</button></form>`);
    let sent = 0;
    document.getElementById("t")!.addEventListener("submit", (e) => { sent++; e.preventDefault(); });
    const report = await runOnce(document, { profile: PROFILE, answers: [], mode: "auto" });
    expect(report.fields.some((f) => f.status === "needs_user")).toBe(true);
    expect(report.status).toBe("needs_user");
    expect(sent).toBe(0);
  }, 30_000);

});

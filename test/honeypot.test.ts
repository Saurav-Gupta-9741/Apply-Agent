/** Spam traps: hidden or "leave this blank" text boxes. Filling one gets the application thrown away as a bot's. */

import { describe, expect, it } from "vitest";
import { extractFields } from "../src/content/extract";
import { runOnce } from "../src/content/agent";
import { mount, PROFILE } from "./fixtures";

const labels = () => extractFields(document.getElementById("f")!).map((f) => f.descriptor.label);

describe("honeypots are never filled", () => {
  it("skips off-screen, see-through and 'leave blank' boxes, keeps real fields and styled choices", () => {
    mount(`<form id="f">
      <label for="fn">First name</label><input id="fn">
      <label for="em">Email</label><input id="em" type="email">
      <div style="position:absolute; left:-5000px"><label for="hp1">Website</label><input id="hp1" name="b_8a7c" tabindex="-1"></div>
      <label for="hp2">Phone</label><input id="hp2" style="opacity:0">
      <label for="hp3">Leave this field blank</label><input id="hp3">
      <input id="hp4" name="honeypot" aria-label="Company">
      <label for="mid">Middle name (leave blank if none)</label><input id="mid">
      <fieldset><legend>Willing to relocate?</legend>
        <label><input type="radio" name="rel" value="Yes" style="opacity:0">Yes</label>
        <label><input type="radio" name="rel" value="No" style="opacity:0">No</label></fieldset>
      <button type="submit">Submit application</button></form>`);
    expect(labels()).toEqual(["First name", "Email", "Middle name (leave blank if none)", "Willing to relocate?"]);
  });

  it("a full run leaves the traps empty", async () => {
    mount(`<h1>Engineer</h1><form id="f">
      <label for="fn">First name</label><input id="fn">
      <label for="em">Email</label><input id="em" type="email">
      <div style="position:absolute; top:-9999px"><label for="trap">Email</label><input id="trap" type="email"></div>
      <button type="submit">Submit application</button></form>`);
    await runOnce(document, { profile: PROFILE, answers: [], mode: "review" });
    expect((document.getElementById("em") as HTMLInputElement).value).toBe(PROFILE.email);
    expect((document.getElementById("trap") as HTMLInputElement).value).toBe("");
  });
});

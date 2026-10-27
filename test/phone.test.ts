/** Phone numbers on forms with a separate country-code picker, and phone widgets that pre-fill a dialling code. */

import { describe, expect, it } from "vitest";
import { runOnce } from "../src/content/agent";
import { splitPhone } from "../src/content/phone";
import { mount, PROFILE } from "./fixtures";

describe("splitPhone", () => {
  it.each([
    ["+91 90000 00000", "91", "90000 00000"],
    ["+919000000000", "91", "9000000000"],
    ["+1 (415) 555-0100", "1", "(415) 555-0100"],
    ["+14155550100", "1", "4155550100"],
    ["+44 20 7946 0958", "44", "20 7946 0958"],
    ["+971 50 123 4567", "971", "50 123 4567"],
    ["+353871234567", "353", "871234567"],
    ["+7 912 345-67-89", "7", "912 345-67-89"],
  ])("%s", (phone, code, national) => expect(splitPhone(phone)).toEqual({ code, national }));

  it("leaves numbers without + alone", () => expect(splitPhone("09000000000")).toEqual({ national: "09000000000" }));
});

const run = () => runOnce(document, { profile: PROFILE, answers: [], mode: "review" });
const value = (id: string) => (document.getElementById(id) as HTMLInputElement).value;

describe("phone with a country-code picker", () => {
  it("a 'Country code' select beside the number: the box gets the national number only", async () => {
    mount(`<h1>Engineer</h1><form id="f">
      <label for="em">Email</label><input id="em" type="email">
      <div class="phone"><label for="cc">Country code</label>
        <select id="cc"><option value="">Select</option><option>United States (+1)</option><option>India (+91)</option><option>United Kingdom (+44)</option></select>
        <label for="ph">Phone number</label><input id="ph" type="tel"></div>
      <button type="submit">Submit application</button></form>`);
    await run();
    expect(value("ph")).toBe("90000 00000");
  });

  it("a select of dial codes with no label words is recognised by its options", async () => {
    const codes = ["+1", "+44", "+49", "+61", "+91", "+971"].map((c) => `<option>${c}</option>`).join("");
    mount(`<h1>Engineer</h1><form id="f">
      <label for="ph">Mobile</label><span><select aria-label="Prefix">${codes}</select><input id="ph" type="tel"></span>
      <button type="submit">Submit application</button></form>`);
    await run();
    expect(value("ph")).toBe("90000 00000");
  });

  it("no picker: the full international number", async () => {
    mount(`<h1>Engineer</h1><form id="f"><label for="ph">Phone</label><input id="ph" type="tel">
      <label for="ct">Country</label><select id="ct"><option>India</option><option>United States</option></select>
      <button type="submit">Submit application</button></form>`);
    await run();
    expect(value("ph")).toBe(PROFILE.phone);
  });

  it("a widget that pre-fills '+1 ' gets the user's full number (not counted as already filled)", async () => {
    mount(`<h1>Engineer</h1><form id="f"><label for="ph">Phone</label><input id="ph" type="tel" value="+1 ">
      <button type="submit">Submit application</button></form>`);
    await run();
    expect(value("ph")).toBe(PROFILE.phone);
  });

  it("intl-tel-input reads '+91…' itself: full number", async () => {
    mount(`<h1>Engineer</h1><form id="f"><label for="ph">Phone</label>
      <div class="iti"><div class="iti__flag-container"><button type="button" aria-haspopup="listbox" aria-label="Country code">+1</button></div><input id="ph" type="tel"></div>
      <button type="submit">Submit application</button></form>`);
    await run();
    expect(value("ph")).toBe(PROFILE.phone);
  });

  it("a number the user typed is never touched", async () => {
    mount(`<h1>Engineer</h1><form id="f"><label for="ph">Phone</label><input id="ph" type="tel" value="+1 415 555 0100">
      <button type="submit">Submit application</button></form>`);
    await run();
    expect(value("ph")).toBe("+1 415 555 0100");
  });
});

describe("the country-code picker itself", () => {
  const select = (id: string) => document.getElementById(id) as HTMLSelectElement;

  it("a picker showing '+1' by default is set to the user's code before the national number goes in", async () => {
    const codes = ["+1", "+44", "+49", "+61", "+91", "+971"].map((c) => `<option>${c}</option>`).join("");
    mount(`<h1>Engineer</h1><form id="f">
      <label for="ph">Mobile</label><span><select id="cc" aria-label="Prefix">${codes}</select><input id="ph" type="tel"></span>
      <button type="submit">Submit application</button></form>`);
    await run();
    expect(select("cc").value).toBe("+91");
    expect(value("ph")).toBe("90000 00000");
  });

  it("codes shared by countries (+1): the user's own country", async () => {
    mount(`<h1>Engineer</h1><form id="f"><div>
      <label for="cc">Country code</label><select id="cc"><option value="">Code</option><option value="us">United States +1</option><option value="ca">Canada +1</option><option value="in">India +91</option></select>
      <label for="ph">Phone</label><input id="ph" type="tel"></div><button type="submit">Submit application</button></form>`);
    await runOnce(document, { profile: { ...PROFILE, phone: "+1 604 555 0100", country: "Canada" }, answers: [], mode: "review" });
    expect(select("cc").value).toBe("ca");
    expect(value("ph")).toBe("604 555 0100");
  });

  it("the user's code is not in the list: the number is left for the user, never typed under another code", async () => {
    mount(`<h1>Engineer</h1><form id="f"><div>
      <label for="cc">Country code</label><select id="cc"><option>United States (+1)</option><option>United Kingdom (+44)</option></select>
      <label for="ph">Phone</label><input id="ph" type="tel"></div><button type="submit">Submit application</button></form>`);
    const report = await run();
    expect(value("ph")).toBe("");
    expect(report.fields.find((f) => f.field.label === "Phone")?.status).toBe("needs_user");
  });

  it("a number the user typed keeps the code the user chose", async () => {
    mount(`<h1>Engineer</h1><form id="f"><div>
      <label for="cc">Country code</label><select id="cc"><option>United States (+1)</option><option>India (+91)</option></select>
      <label for="ph">Phone</label><input id="ph" type="tel" value="415 555 0100"></div><button type="submit">Submit application</button></form>`);
    await run();
    expect(select("cc").value).toBe("United States (+1)");
    expect(value("ph")).toBe("415 555 0100");
  });
});

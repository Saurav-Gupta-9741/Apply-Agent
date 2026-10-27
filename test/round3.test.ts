/** Round 3 hard cases: dates in every format, custom dropdowns, slow typeahead results, repeating work-experience
 * blocks (with "Add"), "Phone Device Type", and a field-less "Review" step at the end of a wizard. */

import { describe, expect, it } from "vitest";
import { fillForm, runOnce } from "../src/content/agent";
import { decide } from "../src/content/classify";
import { extractFields } from "../src/content/extract";
import { formatDateFor } from "../src/content/fill";
import type { FieldDescriptor, Profile } from "../src/shared/types";
import { mount, PROFILE } from "./fixtures";

const WORK: Profile = {
  ...PROFILE, country: "India", location: "Pune",
  workHistory: [
    { title: "Data Engineer", company: "Initech", location: "Pune", start: "2024-03", end: "", current: true, summary: "Pipelines" },
    { title: "Analyst", company: "Globex", location: "Mumbai", start: "2022-01", end: "2024-02", current: false, summary: "" },
  ],
};

describe("dates: each box gets the format it asks for", () => {
  const input = (attrs: string) => {
    mount(`<input id="d" ${attrs}>`);
    return document.getElementById("d") as HTMLInputElement;
  };
  it("native date and month inputs", () => {
    expect(formatDateFor(input(`type="date"`), "2024-03")).toBe("2024-03-01");
    expect(formatDateFor(input(`type="month"`), "2024-03-15")).toBe("2024-03");
  });
  it("typed formats from the placeholder, label or aria-label, in several languages", () => {
    expect(formatDateFor(input(`placeholder="MM/YYYY"`), "2024-03")).toBe("03/2024");
    expect(formatDateFor(input(`placeholder="DD/MM/YYYY"`), "2024-03-15")).toBe("15/03/2024");
    expect(formatDateFor(input(`placeholder="MM-DD-YYYY"`), "2024-03-15")).toBe("03-15-2024");
    expect(formatDateFor(input(`aria-label="Start date (TT.MM.JJJJ)"`), "2024-03-15")).toBe("15.03.2024");
    expect(formatDateFor(input(""), "2024-03", "From (MM/YY)")).toBe("03/24");
  });
  it("leaves anything that is not a stored date alone", () => {
    expect(formatDateFor(input(`placeholder="MM/YYYY"`), "Immediately")).toBe("Immediately");
    expect(formatDateFor(input(""), "2024-03")).toBe("2024-03");
  });
});

/** A dropdown button whose list opens late, and a typeahead that shows "Loading…" before its results. */
const WIDGETS = `
<form id="f">
  <label id="c-l">Country *</label>
  <button type="button" id="country" aria-haspopup="listbox" aria-labelledby="c-l" aria-required="true">Select One</button>
  <label for="city">Location (City) *</label>
  <input id="city" role="combobox" aria-controls="city-list" required><ul id="city-list" role="listbox"></ul>
  <label id="d-l">Phone Device Type *</label>
  <button type="button" id="device" aria-haspopup="listbox" aria-labelledby="d-l" aria-required="true">Select One</button>
  <label for="phone">Phone Number *</label><input id="phone" type="tel" required>
  <button type="submit">Submit application</button>
</form>`;

function wireWidgets(): void {
  for (const [id, options] of [["country", ["United States", "India", "Germany"]], ["device", ["Landline", "Mobile"]]] as const) {
    const button = document.getElementById(id)!;
    button.addEventListener("click", () => setTimeout(() => {
      const list = document.createElement("ul");
      list.setAttribute("role", "listbox");
      for (const text of options) {
        const li = document.createElement("li");
        li.setAttribute("role", "option");
        li.textContent = text;
        li.addEventListener("click", () => { button.textContent = text; list.remove(); });
        list.append(li);
      }
      button.after(list);
    }, 150));
  }
  const city = document.getElementById("city") as HTMLInputElement;
  const list = document.getElementById("city-list")!;
  city.addEventListener("input", () => {
    list.innerHTML = `<li role="option">Loading…</li>`;
    setTimeout(() => {
      list.innerHTML = `<li role="option">Punta Gorda, Florida</li><li role="option">Pune, Maharashtra, India</li>`;
      list.querySelectorAll("li").forEach((li) => li.addEventListener("mousedown", () => { city.value = li.textContent!; }));
    }, 500);
  });
}

describe("custom dropdowns and slow typeahead results", () => {
  it("reads a dropdown button as a question, without its 'Select One' placeholder", () => {
    mount(WIDGETS);
    const fields = extractFields(document.getElementById("f")!);
    expect(fields.find((f) => f.descriptor.label === "Country")).toMatchObject({ descriptor: { control: "dropdown", required: true } });
  });

  it("opens the dropdown, waits for the list, picks the match; waits past 'Loading…' for the typeahead", async () => {
    mount(WIDGETS);
    wireWidgets();
    const answers = [{ question: "Phone Device Type", answer: "Mobile", updatedAt: "2026-10-26" }];
    const report = await fillForm(document, { profile: { ...PROFILE, country: "India", location: "Pune" }, answers, mode: "review" });
    expect(document.getElementById("country")!.textContent).toBe("India");
    expect((document.getElementById("city") as HTMLInputElement).value).toBe("Pune, Maharashtra, India");
    expect(document.getElementById("device")!.textContent).toBe("Mobile");
    expect((document.getElementById("phone") as HTMLInputElement).value).toBe(PROFILE.phone); // the number, not the device type
    expect(report.status).toBe("ready_to_submit");
  });

  it("'Phone Device Type' is never answered with the phone number", () => {
    const field: FieldDescriptor = { key: "k", label: "Phone Device Type", control: "dropdown", required: true, options: [], name: "", autocomplete: "", placeholder: "" };
    expect(decide(field, PROFILE, []).kind).toBe("ask");
  });
});

/** A Workday-like "My Experience" step: no job block until "Add" is pressed; Education follows. */
function mountExperience(): void {
  mount(`<h1>Data Engineer</h1><form id="f" novalidate>
    <section><h3>Work Experience</h3><div id="jobs"></div><button type="button" id="add">Add</button></section>
    <section><h3>Education</h3><label for="school">School or University</label><input id="school"></section>
    <button type="submit">Save and Continue</button></form>`);
  let n = 0;
  document.getElementById("add")!.addEventListener("click", () => setTimeout(() => {
    n++;
    document.getElementById("jobs")!.insertAdjacentHTML("beforeend", `<div><h4>Work Experience ${n}</h4>
      <label for="t${n}">Job Title *</label><input id="t${n}" required>
      <label for="c${n}">Company *</label><input id="c${n}" required>
      <label><input type="checkbox" id="cur${n}"> I currently work here</label>
      <label for="from${n}">From *</label><input id="from${n}" placeholder="MM/YYYY" required>
      <label for="to${n}">To</label><input id="to${n}" placeholder="MM/YYYY">
      <label for="desc${n}">Role Description</label><textarea id="desc${n}"></textarea></div>`);
  }, 100));
}

describe("repeating work-experience sections", () => {
  const value = (id: string) => (document.getElementById(id) as HTMLInputElement).value;

  it("adds one block per job, fills each from the work history, and leaves Education alone", async () => {
    mountExperience();
    const report = await fillForm(document, { profile: { ...WORK, school: "IIT Jodhpur" }, answers: [], mode: "review" });
    expect(document.querySelectorAll("#jobs > div")).toHaveLength(2);
    expect([value("t1"), value("c1"), value("from1"), value("to1")]).toEqual(["Data Engineer", "Initech", "03/2024", ""]);
    expect((document.getElementById("cur1") as HTMLInputElement).checked).toBe(true);
    expect(value("desc1")).toBe("Pipelines");
    expect([value("t2"), value("c2"), value("from2"), value("to2")]).toEqual(["Analyst", "Globex", "01/2022", "02/2024"]);
    expect((document.getElementById("cur2") as HTMLInputElement).checked).toBe(false);
    expect(value("school")).toBe("IIT Jodhpur");
    expect(report.status).toBe("ready_to_submit");
  });

  it("without a work history, the current job from the profile fills the first block; no extra blocks are added", async () => {
    mountExperience();
    await fillForm(document, { profile: { ...PROFILE, currentTitle: "Data Analyst", currentCompany: "Initech" }, answers: [], mode: "review" });
    expect(document.querySelectorAll("#jobs > div")).toHaveLength(1);
    expect([value("t1"), value("c1")]).toEqual(["Data Analyst", "Initech"]);
  });

  it("an answer given for one job is never reused for another job's block", () => {
    const field: FieldDescriptor = {
      key: "k", label: "Company", control: "text", required: true, options: [], name: "", autocomplete: "", placeholder: "", workBlock: 3,
    };
    const d = decide(field, WORK, [{ question: "Company", answer: "Initech", updatedAt: "2026-10-26" }]);
    expect(d.kind).toBe("ask");
  });
});

describe("a wizard that ends on a Review step with no fields", () => {
  it("presses Next into the Review step, recognises it, and stops ready to submit", async () => {
    mount(`<h1>Engineer</h1><form id="w" novalidate><div id="s">
      <label for="fn">First name *</label><input id="fn" required>
      <label for="em">Email *</label><input id="em" type="email" required>
      <button type="submit">Save and Continue</button></div></form>`);
    document.getElementById("w")!.addEventListener("submit", (e) => {
      e.preventDefault();
      setTimeout(() => (document.getElementById("s")!.innerHTML = `<h2>Review</h2><p>Check, then submit.</p><button type="submit">Submit</button>`), 100);
    }, { once: true });
    const report = await runOnce(document, { profile: PROFILE, answers: [], mode: "review", stepTimeoutMs: 3000 });
    expect(report.status).toBe("ready_to_submit");
    expect(report.steps).toBe(2);
  });

  it("a page holding only a Submit button is never a place to start", async () => {
    mount(`<form><p>Confirm?</p><button type="submit">Submit</button></form>`);
    const report = await runOnce(document, { profile: PROFILE, answers: [], mode: "auto" });
    expect(report.status).toBe("not_a_form");
  });
});

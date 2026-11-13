// Round 6 (a real Stripe form on the new Greenhouse job board): the phone "did not stick", the School list's options
// "did not appear", and the Degree was left for the user. testpages/greenhouse-new.html copies those widgets:
// react-select lists that search a server after a pause, a list that loads when opened, a phone box that formats.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { fillForm } from "../src/content/agent";
import { fillPhone } from "../src/content/fill";
import { pickSchool, schoolKey, schoolQueries } from "../src/content/schools";
import { EMPTY_PROFILE } from "../src/shared/storage";
import { bestOption } from "../src/shared/text";
import type { Profile } from "../src/shared/types";

const PAGE = readFileSync(resolve(__dirname, "../testpages/greenhouse-new.html"), "utf8");
function mountPage(): void {
  const body = /<body>([\s\S]*)<\/body>/.exec(PAGE)![1]!;
  const script = /<script>([\s\S]*?)<\/script>/.exec(body)![1]!;
  document.body.innerHTML = body.replace(/<script>[\s\S]*?<\/script>/, "");
  new Function(script)();
}
afterEach(() => {
  document.body.innerHTML = "";
});

const P: Profile = { ...EMPTY_PROFILE, firstName: "Asha", lastName: "Verma", email: "asha@example.com", phone: "+91 90000 00000",
  country: "India", location: "Bengaluru", school: "IIT Jodhpur", degree: "M.Tech", discipline: "Computer Science" };

const shown = (id: string) => document.getElementById(id)?.closest(".select")?.querySelector(".select__single-value")?.textContent ?? "";

describe("new Greenhouse form (react-select lists, formatted phone)", () => {
  it("fills phone, school, degree, discipline and city, and asks the work question", async () => {
    mountPage();
    const report = await fillForm(document, { profile: P, answers: [], mode: "review" });
    const by = (label: string) => report.fields.find((f) => f.field.label === label);
    expect(by("Phone")?.status).toBe("filled");
    expect((document.getElementById("phone") as HTMLInputElement).value.replace(/\D/g, "")).toBe("919000000000");
    expect(by("School")?.status).toBe("filled");
    expect(shown("school--0")).toBe("Indian Institute of Technology Jodhpur");
    expect(shown("degree--0")).toBe("Master's Degree");
    expect(shown("discipline--0")).toBe("Computer Science");
    expect(shown("candidate-location")).toBe("Bengaluru, Karnataka, India");
    expect(by("Are you currently eligible to work in India?")?.status).toBe("needs_user");
    expect((window as { __submitted?: number }).__submitted ?? 0).toBe(0);
  }, 90_000);

  it("a school that is not listed: the list's own 'Other', flagged for the user; never another campus", async () => {
    // Round 9: many Indian colleges are missing from Greenhouse's list; a person whose school is not there picks "Other".
    mountPage();
    const report = await fillForm(document, { profile: { ...P, school: "IIT Hyderabad" }, answers: [], mode: "review" });
    const school = report.fields.find((f) => f.field.label === "School");
    expect(school).toMatchObject({ status: "filled", review: true });
    expect(school?.detail).toMatch(/not in this list/);
    expect(shown("school--0")).toBe("Other");
  }, 90_000);
});

describe("school names", () => {
  const LIST = ["Indian Institute of Technology Delhi", "Indian Institute of Technology Jodhpur", "Jodhpur National University", "Other"];
  it("short forms are spelled out; asides and punctuation do not matter", () => {
    expect(schoolKey("IIT Jodhpur")).toBe(schoolKey("Indian Institute of Technology, Jodhpur"));
    expect(schoolKey("I.I.T. Jodhpur")).toBe(schoolKey("Indian Institute of Technology (IIT) Jodhpur"));
    expect(schoolKey("NIT Trichy")).toBe("national institute of technology trichy");
    expect(schoolKey("BITS Pilani")).toBe("birla institute of technology and science pilani");
  });
  it("picks only the same institution", () => {
    expect(pickSchool(LIST, "IIT Jodhpur")).toBe("Indian Institute of Technology Jodhpur");
    expect(pickSchool(LIST, "IIT Bombay")).toBeUndefined();
    expect(pickSchool(LIST, "Indian Institute of Technology")).toBeUndefined(); // no campus named: not one of them
    expect(pickSchool(LIST, "Jodhpur")).toBeUndefined();
    expect(pickSchool(["Indian Institute of Technology Jodhpur", "IIT Jodhpur"], "IIT Jodhpur")).toBeUndefined(); // two: ask
  });
  it("searches the saved name, the full name, then the most distinctive word", () => {
    expect(schoolQueries("IIT Jodhpur")).toEqual(["IIT Jodhpur", "indian institute of technology jodhpur", "jodhpur"]);
  });
});

describe("degrees on Greenhouse's list", () => {
  const DEGREES = ["High School", "Associate's Degree", "Bachelor's Degree", "Master's Degree", "Master of Business Administration (M.B.A.)",
    "Juris Doctor (J.D.)", "Doctor of Medicine (M.D.)", "Doctor of Philosophy (Ph.D.)", "Engineer's Degree", "Other"];
  it.each([
    ["M.Tech", "Master's Degree"], ["MTech", "Master's Degree"], ["M.E.", "Master's Degree"], ["MCA", "Master's Degree"],
    ["M.Sc", "Master's Degree"], ["M.Com", "Master's Degree"], ["B.Tech", "Bachelor's Degree"], ["B.E.", "Bachelor's Degree"],
    ["BCA", "Bachelor's Degree"], ["B.Sc", "Bachelor's Degree"], ["B.Com", "Bachelor's Degree"], ["MBA", "Master of Business Administration (M.B.A.)"],
    ["Ph.D", "Doctor of Philosophy (Ph.D.)"], ["Master of Technology", "Master's Degree"], ["B.Tech in Computer Science", "Bachelor's Degree"],
  ])("%s → %s", (degree, option) => {
    expect(bestOption(DEGREES, degree)).toBe(option);
  });
});

describe("phone boxes", () => {
  function box(onInput?: (el: HTMLInputElement) => void): HTMLInputElement {
    document.body.innerHTML = `<label for="p">Phone</label><input id="p" type="tel">`;
    const el = document.getElementById("p") as HTMLInputElement;
    if (onInput) el.addEventListener("input", () => onInput(el));
    return el;
  }
  it("a box that formats as you type keeps the number", () => {
    const el = box((e) => { e.value = e.value.replace(/\D/g, "").replace(/^(\d{5})(\d+)$/, "$1 $2"); });
    expect(fillPhone(el, "9000000000").ok).toBe(true);
  });
  it("a box beside a country picker that keeps only the national number is fine", () => {
    const el = box((e) => { e.value = e.value.replace(/^\+91\s*/, ""); });
    expect(fillPhone(el, "+91 90000 00000", "91").ok).toBe(true);
  });
  it("a box that ends up with something else is reported, not counted as filled", () => {
    const el = box((e) => { e.value = "+1 555"; });
    expect(fillPhone(el, "+91 90000 00000", "91")).toMatchObject({ ok: false });
  });
});

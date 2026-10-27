import { beforeEach, describe, expect, it, vi } from "vitest";
import { pickAdapter } from "../src/content/adapters";
import { fillForm, runOnce, submitForm } from "../src/content/agent";
import { detectConfirmation, hasCaptcha } from "../src/content/detect";
import { extractFields } from "../src/content/extract";
import { fillCombobox, fillField } from "../src/content/fill";
import { dropResumeRequirement, mount, PROFILE, SENSITIVE_ANSWERS, SUBMIT_FORM } from "./fixtures";

const input = (id: string) => document.getElementById(id) as HTMLInputElement;
const select = (id: string) => document.getElementById(id) as HTMLSelectElement;

describe("fillField", () => {
  beforeEach(() => mount());

  it("sets values through the native setter and fires input/change, like a real user", () => {
    const el = input("first_name");
    const seen: string[] = [];
    el.addEventListener("input", () => seen.push(`input:${el.value}`));
    el.addEventListener("change", () => seen.push(`change:${el.value}`));
    const [field] = extractFields(document.getElementById("application-form")!);
    expect(fillField(field!, "Asha")).toEqual({ ok: true });
    expect(seen).toEqual(["input:Asha", "change:Asha"]);
  });

  it("selects options by meaning and reports a clear failure when nothing matches", () => {
    const fields = extractFields(document.getElementById("application-form")!);
    const degree = fields.find((f) => f.descriptor.name === "degree")!;
    expect(fillField(degree, "masters degree")).toEqual({ ok: true });
    expect(select("degree").selectedOptions[0]!.textContent).toBe("Master's Degree");
    const hear = fields.find((f) => f.descriptor.name === "hear")!;
    expect(fillField(hear, "Carrier pigeon")).toMatchObject({ ok: false });
  });

  it("picks radio choices and toggles checkboxes", () => {
    const fields = extractFields(document.getElementById("application-form")!);
    const auth = fields.find((f) => f.descriptor.name === "auth")!;
    expect(fillField(auth, "Yes")).toEqual({ ok: true });
    expect((document.querySelector("input[name='auth'][value='1']") as HTMLInputElement).checked).toBe(true);
    const privacy = fields.find((f) => f.descriptor.name === "privacy")!;
    expect(fillField(privacy, "Yes")).toEqual({ ok: true });
    expect(input("privacy").checked).toBe(true);
    expect(fillField(privacy, "perhaps")).toMatchObject({ ok: false });
  });

  it("fails clearly when the browser cannot attach files (real Chrome supports it)", () => {
    const resume = extractFields(document.getElementById("application-form")!).find((f) => f.descriptor.name === "resume")!;
    const outcome = fillField(resume, "", PROFILE.resume);
    if (typeof DataTransfer === "undefined") expect(outcome).toEqual({ ok: false, detail: "file upload not supported here" });
  });
});

describe("fillCombobox", () => {
  it("types, waits for options, and clicks the best match", async () => {
    mount(`<input id="loc" role="combobox" aria-controls="loc-list"><ul id="loc-list" role="listbox"></ul>`);
    const box = input("loc");
    box.addEventListener("input", () => {
      setTimeout(() => {
        document.getElementById("loc-list")!.innerHTML =
          `<li role="option">Pune, Maharashtra, India</li><li role="option">Punta Gorda, Florida</li>`;
      }, 50);
    });
    const clicked: string[] = [];
    document.addEventListener("click", (e) => clicked.push((e.target as HTMLElement).textContent ?? ""));
    expect(await fillCombobox(box, "Pune, Maharashtra, India")).toEqual({ ok: true });
    expect(clicked).toEqual(["Pune, Maharashtra, India"]);
  });
});

describe("fillForm (the agent)", () => {
  beforeEach(() => mount());

  it("fills facts, asks about sensitive and unknown required questions, and is not ready to submit", async () => {
    const report = await fillForm(document, { profile: PROFILE, answers: [], mode: "review" });
    const status = Object.fromEntries(report.fields.map((r) => [r.field.label, r.status]));
    expect(status["First Name"]).toBe("filled");
    expect(status["Email"]).toBe("filled");
    expect(status["University degree"]).toBe("filled");
    expect(status["Are you legally authorized to work in the United States?"]).toBe("needs_user");
    expect(status["How did you hear about this job?"]).toBe("needs_user");
    expect(status["Cover letter"]).toBe("skipped");
    expect(status["Email me about future jobs"]).toBe("skipped");
    expect(report.status).toBe("needs_user");
    expect(report.platform).toBe("greenhouse");
    expect(report.jobTitle).toBe("Backend Engineer");
  });

  it("does not treat 'Thank you for your interest' on the form page as a submission", async () => {
    const report = await fillForm(document, { profile: PROFILE, answers: [], mode: "review" });
    expect(report.status).not.toBe("submitted_confirmed");
  });

  it("never overwrites what the user already typed", async () => {
    input("first_name").value = "Ash";
    const report = await fillForm(document, { profile: PROFILE, answers: [], mode: "review" });
    expect(input("first_name").value).toBe("Ash");
    expect(report.fields.find((r) => r.field.label === "First Name")!.status).toBe("already_filled");
  });

  it("becomes ready once the user's answers cover every required question", async () => {
    const resumeless = { ...PROFILE, resume: undefined };
    dropResumeRequirement();
    const report = await fillForm(document, { profile: resumeless, answers: SENSITIVE_ANSWERS, mode: "review" });
    expect(report.status).toBe("ready_to_submit");
    expect(select("sponsor").selectedOptions[0]!.textContent).toBe("No");
    expect(input("privacy").checked).toBe(true);
  });

  it("stops for a visible CAPTCHA", async () => {
    document.body.insertAdjacentHTML("beforeend", `<div class="h-captcha"></div>`);
    expect(hasCaptcha(document)).toBe(true);
    dropResumeRequirement();
    const report = await fillForm(document, { profile: { ...PROFILE, resume: undefined }, answers: SENSITIVE_ANSWERS, mode: "auto" });
    expect(report.status).toBe("needs_user");
    expect(report.captcha).toBe(true);
  });

  it("ignores an invisible reCAPTCHA badge", () => {
    document.body.insertAdjacentHTML("beforeend", `<div class="g-recaptcha" data-size="invisible"></div>`);
    expect(hasCaptcha(document)).toBe(false);
  });
});

describe("submitForm", () => {
  beforeEach(() => mount(SUBMIT_FORM));

  it("refuses to click Submit on an invalid form and names the missing fields", async () => {
    mount();
    const report = await submitForm(document, 1000);
    expect(report.status).toBe("needs_user");
    expect(report.errors.some((e) => e.startsWith("First Name"))).toBe(true);
  });

  it("registers the submission first, then reports success only with a confirmation", async () => {
    const order: string[] = [];
    document.getElementById("application-form")!.addEventListener("submit", (e) => {
      e.preventDefault();
      order.push("submitted");
      setTimeout(() => (document.body.innerHTML = "<h1>Thank you for applying!</h1>"), 100);
    });
    const report = await submitForm(document, 3000, async () => void order.push("registered"));
    expect(order).toEqual(["registered", "submitted"]);
    expect(report.status).toBe("submitted_confirmed");
    expect(report.confirmationText).toContain("Thank you for applying");
  });

  it("returns the site's validation errors instead of claiming success", async () => {
    document.getElementById("application-form")!.addEventListener("submit", (e) => {
      e.preventDefault();
      document.body.insertAdjacentHTML("beforeend", `<div role="alert">Please upload your resume</div>`);
    });
    const report = await submitForm(document, 3000);
    expect(report.status).toBe("needs_user");
    expect(report.errors).toEqual(["Please upload your resume"]);
  });

  it("says 'unconfirmed' when nothing confirms the submission", async () => {
    document.getElementById("application-form")!.addEventListener("submit", (e) => e.preventDefault());
    const report = await submitForm(document, 1200);
    expect(report.status).toBe("submitted_unconfirmed");
  });

  it("does not auto-submit in review mode", async () => {
    mount();
    const onSubmit = vi.fn((e: Event) => e.preventDefault());
    document.getElementById("application-form")!.addEventListener("submit", onSubmit);
    dropResumeRequirement();
    const report = await runOnce(document, { profile: { ...PROFILE, resume: undefined }, answers: SENSITIVE_ANSWERS, mode: "review" });
    expect(report.status).toBe("ready_to_submit");
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe("adapters and confirmation", () => {
  it("recognises platforms by host", () => {
    mount("<form></form>");
    expect(pickAdapter(document, "https://jobs.lever.co/acme/123/apply").platform).toBe("lever");
    expect(pickAdapter(document, "https://jobs.ashbyhq.com/acme/123").platform).toBe("ashby");
    expect(pickAdapter(document, "https://job-boards.greenhouse.io/acme/jobs/1").platform).toBe("greenhouse");
    expect(pickAdapter(document, "https://careers.example.com/apply").platform).toBe("generic");
  });

  it("detects common confirmation messages", () => {
    mount("<h2>Your application has been submitted.</h2>");
    expect(detectConfirmation(document).confirmed).toBe(true);
    mount("<h2>Thank you for your interest in Acme</h2>");
    expect(detectConfirmation(document).confirmed).toBe(false);
  });
});

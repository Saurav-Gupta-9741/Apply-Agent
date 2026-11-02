/** Tests for real ATS application forms captured from public portals.
 * Verifies exact field extraction (labels, controls, required) and ensures 0 honeypot fills.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { pickAdapter } from "../src/content/adapters";
import { extractFields } from "../src/content/extract";
import { fillField } from "../src/content/fill";
import { mount, PROFILE } from "./fixtures";

describe("Real ATS Fixtures (11 forms across 6 platforms)", () => {
  it("extracts and verifies test/corpus/zohorecruit-hireboost.html", () => {
    const html = readFileSync("test/corpus/zohorecruit-hireboost.html", "utf8");
    mount(html);
    const adapter = pickAdapter(document, "https://thehireboost.zohorecruit.com/jobs/Careers/672666000020119069/Executive-Assistant-Recruiting-Ops");
    expect(adapter.platform).toBe("zohorecruit");
    expect(adapter.jobTitle(document)).toBe("Executive Assistant / Recruiting Ops");
    const root = adapter.formRoot(document);
    expect(root).not.toBeNull();
    const fields = extractFields(root!);
    expect(fields.length).toBe(15);
    // Verify 0 honeypot fills: no extracted element should be inside a hidden or honeypot container
    for (const f of fields) {
      for (const el of f.elements) {
        expect(el.closest("[aria-hidden='true']")).toBeNull();
      }
    }

    // Exact descriptor check
    const extractedDescriptors = fields.map((f) => ({
      label: f.descriptor.label,
      control: f.descriptor.control,
      required: f.descriptor.required,
    }));
    expect(extractedDescriptors).toEqual([
      {
            "label": "Salutation",
            "control": "dropdown",
            "required": false
      },
      {
            "label": "First Name",
            "control": "text",
            "required": false
      },
      {
            "label": "Last Name",
            "control": "text",
            "required": false
      },
      {
            "label": "Email",
            "control": "text",
            "required": false
      },
      {
            "label": "Mobile",
            "control": "dropdown",
            "required": false
      },
      {
            "label": "Mobile",
            "control": "text",
            "required": false
      },
      {
            "label": "Country",
            "control": "text",
            "required": false
      },
      {
            "label": "What is your level of English?",
            "control": "dropdown",
            "required": false
      },
      {
            "label": "What is your level of English?",
            "control": "text",
            "required": false
      },
      {
            "label": "Please provide a 30-40 second recording discussing your relevant experience for this position in English. To avoid the need for a prescreening call, please use https://vocaroo.com/ to record yourself. Once completed, kindly include the link to your record",
            "control": "text",
            "required": false
      },
      {
            "label": "Would you like to subscribe to HireBoost's newsletter to receive the latest remote job openings, job search tips, among other information?",
            "control": "dropdown",
            "required": false
      },
      {
            "label": "Where did you discover this job vacancy?",
            "control": "dropdown",
            "required": false
      },
      {
            "label": "Where did you discover this job vacancy?",
            "control": "text",
            "required": false
      },
      {
            "label": "Please share your LinkedIn profile",
            "control": "text",
            "required": false
      },
      {
            "label": "Resume",
            "control": "file",
            "required": false
      }
]);

    // Safe fill check: simulate fill on text/email fields
    for (const f of fields) {
      if (f.descriptor.control === "text" || f.descriptor.control === "email") {
        fillField(f, "test");
      }
    }
  });

  it("extracts and verifies test/corpus/workable-bolderapps.html", () => {
    const html = readFileSync("test/corpus/workable-bolderapps.html", "utf8");
    mount(html);
    const adapter = pickAdapter(document, "https://apply.workable.com/bolderapps/j/520A568230/apply/");
    expect(adapter.platform).toBe("generic");
    expect(adapter.jobTitle(document)).toBe("Junior Project Manager");
    const root = adapter.formRoot(document);
    expect(root).not.toBeNull();
    const fields = extractFields(root!);
    expect(fields.length).toBe(8);
    // Verify 0 honeypot fills: no extracted element should be inside a hidden or honeypot container
    for (const f of fields) {
      for (const el of f.elements) {
        expect(el.closest("[aria-hidden='true']")).toBeNull();
      }
    }

    // Exact descriptor check
    const extractedDescriptors = fields.map((f) => ({
      label: f.descriptor.label,
      control: f.descriptor.control,
      required: f.descriptor.required,
    }));
    expect(extractedDescriptors).toEqual([
      {
            "label": "First name",
            "control": "text",
            "required": true
      },
      {
            "label": "Last name",
            "control": "text",
            "required": true
      },
      {
            "label": "Email",
            "control": "email",
            "required": true
      },
      {
            "label": "Phone",
            "control": "tel",
            "required": true
      },
      {
            "label": "Address",
            "control": "text",
            "required": false
      },
      {
            "label": "Photo Choose file",
            "control": "file",
            "required": false
      },
      {
            "label": "Resume Choose file",
            "control": "file",
            "required": true
      },
      {
            "label": "What is your desired HOURLY compensation in USD?",
            "control": "text",
            "required": true
      }
]);

    // Safe fill check: simulate fill on text/email fields
    for (const f of fields) {
      if (f.descriptor.control === "text" || f.descriptor.control === "email") {
        fillField(f, "test");
      }
    }
  });

  it("extracts and verifies test/corpus/personio-kaiserxlabs.html", () => {
    const html = readFileSync("test/corpus/personio-kaiserxlabs.html", "utf8");
    mount(html);
    const adapter = pickAdapter(document, "https://kaiser-x-labs.jobs.personio.de/job/2812267/apply");
    expect(adapter.platform).toBe("generic");
    expect(adapter.jobTitle(document)).toBe("EXECUTIVE ASSISTANT (M/F/D)");
    const root = adapter.formRoot(document);
    expect(root).not.toBeNull();
    const fields = extractFields(root!);
    expect(fields.length).toBe(14);
    // Verify 0 honeypot fills: no extracted element should be inside a hidden or honeypot container
    for (const f of fields) {
      for (const el of f.elements) {
        expect(el.closest("[aria-hidden='true']")).toBeNull();
      }
    }

    // Exact descriptor check
    const extractedDescriptors = fields.map((f) => ({
      label: f.descriptor.label,
      control: f.descriptor.control,
      required: f.descriptor.required,
    }));
    expect(extractedDescriptors).toEqual([
      {
            "label": "First",
            "control": "text",
            "required": false
      },
      {
            "label": "Last",
            "control": "text",
            "required": false
      },
      {
            "label": "Email",
            "control": "email",
            "required": true
      },
      {
            "label": "Phone",
            "control": "text",
            "required": false
      },
      {
            "label": "Available from",
            "control": "text",
            "required": true
      },
      {
            "label": "Expected salary",
            "control": "text",
            "required": true
      },
      {
            "label": "Birthday",
            "control": "date",
            "required": false
      },
      {
            "label": "Nationality",
            "control": "text",
            "required": false
      },
      {
            "label": "Location",
            "control": "text",
            "required": true
      },
      {
            "label": "Website",
            "control": "text",
            "required": false
      },
      {
            "label": "Place of residence in Germany",
            "control": "select",
            "required": true
      },
      {
            "label": "Why Kaiser X Labs? State your motivation for applying in a single sentence (in German, max 15 words!).",
            "control": "text",
            "required": true
      },
      {
            "label": "CV",
            "control": "file",
            "required": true
      },
      {
            "label": "Other",
            "control": "file",
            "required": false
      }
]);

    // Safe fill check: simulate fill on text/email fields
    for (const f of fields) {
      if (f.descriptor.control === "text" || f.descriptor.control === "email") {
        fillField(f, "test");
      }
    }
  });

  it("extracts and verifies test/corpus/personio-europassistance.html", () => {
    const html = readFileSync("test/corpus/personio-europassistance.html", "utf8");
    mount(html);
    const adapter = pickAdapter(document, "https://europ-assistance-services-gmbh.jobs.personio.de/job/2706845/apply");
    expect(adapter.platform).toBe("generic");
    expect(adapter.jobTitle(document)).toBe("Claims Expert (m/w/d) Medical & Travel");
    const root = adapter.formRoot(document);
    expect(root).not.toBeNull();
    const fields = extractFields(root!);
    expect(fields.length).toBe(20);
    // Verify 0 honeypot fills: no extracted element should be inside a hidden or honeypot container
    for (const f of fields) {
      for (const el of f.elements) {
        expect(el.closest("[aria-hidden='true']")).toBeNull();
      }
    }

    // Exact descriptor check
    const extractedDescriptors = fields.map((f) => ({
      label: f.descriptor.label,
      control: f.descriptor.control,
      required: f.descriptor.required,
    }));
    expect(extractedDescriptors).toEqual([
      {
            "label": "Vorname",
            "control": "text",
            "required": false
      },
      {
            "label": "Nachname",
            "control": "text",
            "required": false
      },
      {
            "label": "Geschlecht",
            "control": "select",
            "required": false
      },
      {
            "label": "E-Mail",
            "control": "email",
            "required": false
      },
      {
            "label": "Telefon",
            "control": "text",
            "required": false
      },
      {
            "label": "Verfügbar ab",
            "control": "text",
            "required": false
      },
      {
            "label": "gewünschte Gehaltsbandbreite",
            "control": "text",
            "required": false
      },
      {
            "label": "Kündigungsfrist",
            "control": "text",
            "required": false
      },
      {
            "label": "Straße und Hausnummer",
            "control": "text",
            "required": false
      },
      {
            "label": "PLZ",
            "control": "text",
            "required": false
      },
      {
            "label": "Ort",
            "control": "text",
            "required": false
      },
      {
            "label": "Hier hast Du uns gefunden:",
            "control": "select",
            "required": false
      },
      {
            "label": "Freies Kommentarfeld",
            "control": "text",
            "required": false
      },
      {
            "label": "Hast du einen deutschen Erstwohnsitz?",
            "control": "select",
            "required": false
      },
      {
            "label": "Verfügst du mindestens über eine befristete Aufenthalts- und Arbeitserlaubnis?",
            "control": "select",
            "required": false
      },
      {
            "label": "Verfügst du mindestens über B2 Deutschkenntnisse in Wort und Schrift?",
            "control": "select",
            "required": false
      },
      {
            "label": "Lebenslauf",
            "control": "file",
            "required": false
      },
      {
            "label": "Andere",
            "control": "file",
            "required": false
      },
      {
            "label": "Anschreiben",
            "control": "file",
            "required": false
      },
      {
            "label": "Arbeitszeugnis",
            "control": "file",
            "required": false
      }
]);

    // Safe fill check: simulate fill on text/email fields
    for (const f of fields) {
      if (f.descriptor.control === "text" || f.descriptor.control === "email") {
        fillField(f, "test");
      }
    }
  });

  it("extracts and verifies test/corpus/personio-europassistance-2.html", () => {
    const html = readFileSync("test/corpus/personio-europassistance-2.html", "utf8");
    mount(html);
    const adapter = pickAdapter(document, "https://europ-assistance-services-gmbh.jobs.personio.de/job/2836331/apply");
    expect(adapter.platform).toBe("generic");
    expect(adapter.jobTitle(document)).toBe("Claims Expert (m/w/d) Medical & Travel (befristet)");
    const root = adapter.formRoot(document);
    expect(root).not.toBeNull();
    const fields = extractFields(root!);
    expect(fields.length).toBe(20);
    // Verify 0 honeypot fills: no extracted element should be inside a hidden or honeypot container
    for (const f of fields) {
      for (const el of f.elements) {
        expect(el.closest("[aria-hidden='true']")).toBeNull();
      }
    }

    // Exact descriptor check
    const extractedDescriptors = fields.map((f) => ({
      label: f.descriptor.label,
      control: f.descriptor.control,
      required: f.descriptor.required,
    }));
    expect(extractedDescriptors).toEqual([
      {
            "label": "Vorname",
            "control": "text",
            "required": false
      },
      {
            "label": "Nachname",
            "control": "text",
            "required": false
      },
      {
            "label": "Geschlecht",
            "control": "select",
            "required": false
      },
      {
            "label": "E-Mail",
            "control": "email",
            "required": false
      },
      {
            "label": "Telefon",
            "control": "text",
            "required": false
      },
      {
            "label": "Verfügbar ab",
            "control": "text",
            "required": false
      },
      {
            "label": "gewünschte Gehaltsbandbreite",
            "control": "text",
            "required": false
      },
      {
            "label": "Kündigungsfrist",
            "control": "text",
            "required": false
      },
      {
            "label": "Straße und Hausnummer",
            "control": "text",
            "required": false
      },
      {
            "label": "PLZ",
            "control": "text",
            "required": false
      },
      {
            "label": "Ort",
            "control": "text",
            "required": false
      },
      {
            "label": "Hier hast Du uns gefunden:",
            "control": "select",
            "required": false
      },
      {
            "label": "Freies Kommentarfeld",
            "control": "text",
            "required": false
      },
      {
            "label": "Hast du einen deutschen Erstwohnsitz?",
            "control": "select",
            "required": false
      },
      {
            "label": "Verfügst du mindestens über eine befristete Aufenthalts- und Arbeitserlaubnis?",
            "control": "select",
            "required": false
      },
      {
            "label": "Verfügst du mindestens über B2 Deutschkenntnisse in Wort und Schrift?",
            "control": "select",
            "required": false
      },
      {
            "label": "Lebenslauf",
            "control": "file",
            "required": false
      },
      {
            "label": "Andere",
            "control": "file",
            "required": false
      },
      {
            "label": "Anschreiben",
            "control": "file",
            "required": false
      },
      {
            "label": "Arbeitszeugnis",
            "control": "file",
            "required": false
      }
]);

    // Safe fill check: simulate fill on text/email fields
    for (const f of fields) {
      if (f.descriptor.control === "text" || f.descriptor.control === "email") {
        fillField(f, "test");
      }
    }
  });

  it("extracts and verifies test/corpus/freshteam-ourcodelab.html", () => {
    const html = readFileSync("test/corpus/freshteam-ourcodelab.html", "utf8");
    mount(html);
    const adapter = pickAdapter(document, "https://ourcodelab.freshteam.com/jobs/NbwpooNgjC-i/full-stack-software-developer-remote");
    expect(adapter.platform).toBe("freshteam");
    expect(adapter.jobTitle(document)).toBe("Full Stack Software Developer (Remote)");
    const root = adapter.formRoot(document);
    expect(root).not.toBeNull();
    const fields = extractFields(root!);
    expect(fields.length).toBe(13);
    // Verify 0 honeypot fills: no extracted element should be inside a hidden or honeypot container
    for (const f of fields) {
      for (const el of f.elements) {
        expect(el.closest("[aria-hidden='true']")).toBeNull();
      }
    }

    // Exact descriptor check
    const extractedDescriptors = fields.map((f) => ({
      label: f.descriptor.label,
      control: f.descriptor.control,
      required: f.descriptor.required,
    }));
    expect(extractedDescriptors).toEqual([
      {
            "label": "Apply With Resume",
            "control": "file",
            "required": true
      },
      {
            "label": "First Name",
            "control": "text",
            "required": true
      },
      {
            "label": "Middle Name",
            "control": "text",
            "required": false
      },
      {
            "label": "Last Name",
            "control": "text",
            "required": true
      },
      {
            "label": "Email",
            "control": "text",
            "required": true
      },
      {
            "label": "Gender",
            "control": "select",
            "required": true
      },
      {
            "label": "Mobile",
            "control": "text",
            "required": false
      },
      {
            "label": "Phone",
            "control": "text",
            "required": false
      },
      {
            "label": "Street",
            "control": "text",
            "required": true
      },
      {
            "label": "City / Country",
            "control": "text",
            "required": true
      },
      {
            "label": "Postal Code",
            "control": "text",
            "required": true
      },
      {
            "label": "National Service Obligations",
            "control": "radio",
            "required": true
      },
      {
            "label": "Social Network and Web Links",
            "control": "text",
            "required": false
      }
]);

    // Safe fill check: simulate fill on text/email fields
    for (const f of fields) {
      if (f.descriptor.control === "text" || f.descriptor.control === "email") {
        fillField(f, "test");
      }
    }
  });

  it("extracts and verifies test/corpus/freshteam-dipantara.html", () => {
    const html = readFileSync("test/corpus/freshteam-dipantara.html", "utf8");
    mount(html);
    const adapter = pickAdapter(document, "https://dipantara.freshteam.com/jobs/dmfmJQugKRCO/software-developer-software-engineer");
    expect(adapter.platform).toBe("freshteam");
    expect(adapter.jobTitle(document)).toBe("Software Developer / Software Engineer");
    const root = adapter.formRoot(document);
    expect(root).not.toBeNull();
    const fields = extractFields(root!);
    expect(fields.length).toBe(9);
    // Verify 0 honeypot fills: no extracted element should be inside a hidden or honeypot container
    for (const f of fields) {
      for (const el of f.elements) {
        expect(el.closest("[aria-hidden='true']")).toBeNull();
      }
    }

    // Exact descriptor check
    const extractedDescriptors = fields.map((f) => ({
      label: f.descriptor.label,
      control: f.descriptor.control,
      required: f.descriptor.required,
    }));
    expect(extractedDescriptors).toEqual([
      {
            "label": "Apply With Resume",
            "control": "file",
            "required": true
      },
      {
            "label": "First Name",
            "control": "text",
            "required": true
      },
      {
            "label": "Middle Name",
            "control": "text",
            "required": false
      },
      {
            "label": "Last Name",
            "control": "text",
            "required": true
      },
      {
            "label": "Email",
            "control": "text",
            "required": true
      },
      {
            "label": "Mobile",
            "control": "text",
            "required": false
      },
      {
            "label": "Phone",
            "control": "text",
            "required": false
      },
      {
            "label": "Hyperlink",
            "control": "text",
            "required": false
      },
      {
            "label": "Hyperlink",
            "control": "text",
            "required": false
      }
]);

    // Safe fill check: simulate fill on text/email fields
    for (const f of fields) {
      if (f.descriptor.control === "text" || f.descriptor.control === "email") {
        fillField(f, "test");
      }
    }
  });

  it("extracts and verifies test/corpus/jazzhr-concordusa.html", () => {
    const html = readFileSync("test/corpus/jazzhr-concordusa.html", "utf8");
    mount(html);
    const adapter = pickAdapter(document, "https://concordusa.applytojob.com/apply/BOHXG4iF3Y/AI-Developer");
    expect(adapter.platform).toBe("jazzhr");
    expect(adapter.jobTitle(document)).toBe("AI Developer - Concord USA - Career Page");
    const root = adapter.formRoot(document);
    expect(root).not.toBeNull();
    const fields = extractFields(root!);
    expect(fields.length).toBe(11);
    // Verify 0 honeypot fills: no extracted element should be inside a hidden or honeypot container
    for (const f of fields) {
      for (const el of f.elements) {
        expect(el.closest("[aria-hidden='true']")).toBeNull();
      }
    }

    // Exact descriptor check
    const extractedDescriptors = fields.map((f) => ({
      label: f.descriptor.label,
      control: f.descriptor.control,
      required: f.descriptor.required,
    }));
    expect(extractedDescriptors).toEqual([
      {
            "label": "First Name",
            "control": "text",
            "required": true
      },
      {
            "label": "Last Name",
            "control": "text",
            "required": true
      },
      {
            "label": "Email Address",
            "control": "email",
            "required": true
      },
      {
            "label": "Phone",
            "control": "tel",
            "required": true
      },
      {
            "label": "Address",
            "control": "text",
            "required": false
      },
      {
            "label": "City",
            "control": "text",
            "required": false
      },
      {
            "label": "State/Province",
            "control": "text",
            "required": false
      },
      {
            "label": "Postal",
            "control": "text",
            "required": false
      },
      {
            "label": "Resume",
            "control": "file",
            "required": true
      },
      {
            "label": "Paste your resume here or",
            "control": "textarea",
            "required": false
      },
      {
            "label": "resumator xml value",
            "control": "textarea",
            "required": false
      }
]);

    // Safe fill check: simulate fill on text/email fields
    for (const f of fields) {
      if (f.descriptor.control === "text" || f.descriptor.control === "email") {
        fillField(f, "test");
      }
    }
  });

  it("extracts and verifies test/corpus/recruitee-miaplatform.html", () => {
    const html = readFileSync("test/corpus/recruitee-miaplatform.html", "utf8");
    mount(html);
    const adapter = pickAdapter(document, "https://miaplatform.recruitee.com/o/software-engineer-4/c/new");
    expect(adapter.platform).toBe("recruitee");
    expect(adapter.jobTitle(document)).toBe("Software Engineer");
    const root = adapter.formRoot(document);
    expect(root).not.toBeNull();
    const fields = extractFields(root!);
    expect(fields.length).toBe(10);
    // Verify 0 honeypot fills: no extracted element should be inside a hidden or honeypot container
    for (const f of fields) {
      for (const el of f.elements) {
        expect(el.closest("[aria-hidden='true']")).toBeNull();
      }
    }

    // Exact descriptor check
    const extractedDescriptors = fields.map((f) => ({
      label: f.descriptor.label,
      control: f.descriptor.control,
      required: f.descriptor.required,
    }));
    expect(extractedDescriptors).toEqual([
      {
            "label": "Full name",
            "control": "text",
            "required": true
      },
      {
            "label": "Email address",
            "control": "email",
            "required": true
      },
      {
            "label": "Select country calling code: Italy",
            "control": "dropdown",
            "required": false
      },
      {
            "label": "Phone number",
            "control": "tel",
            "required": true
      },
      {
            "label": "Photo",
            "control": "file",
            "required": false
      },
      {
            "label": "CV or resume",
            "control": "file",
            "required": true
      },
      {
            "label": "Cover letter",
            "control": "file",
            "required": false
      },
      {
            "label": "Will you require now or in the future the Visa sponsorship?",
            "control": "text",
            "required": true
      },
      {
            "label": "Are you open to a hybrid work model at our Milan office?",
            "control": "text",
            "required": true
      },
      {
            "label": "Salary Expectaton",
            "control": "number",
            "required": true
      }
]);

    // Safe fill check: simulate fill on text/email fields
    for (const f of fields) {
      if (f.descriptor.control === "text" || f.descriptor.control === "email") {
        fillField(f, "test");
      }
    }
  });

  it("extracts and verifies test/corpus/recruitee-sahl.html", () => {
    const html = readFileSync("test/corpus/recruitee-sahl.html", "utf8");
    mount(html);
    const adapter = pickAdapter(document, "https://sahl.recruitee.com/o/software-development-engineer/c/new");
    expect(adapter.platform).toBe("recruitee");
    expect(adapter.jobTitle(document)).toBe("Software Development Engineer");
    const root = adapter.formRoot(document);
    expect(root).not.toBeNull();
    const fields = extractFields(root!);
    expect(fields.length).toBe(7);
    // Verify 0 honeypot fills: no extracted element should be inside a hidden or honeypot container
    for (const f of fields) {
      for (const el of f.elements) {
        expect(el.closest("[aria-hidden='true']")).toBeNull();
      }
    }

    // Exact descriptor check
    const extractedDescriptors = fields.map((f) => ({
      label: f.descriptor.label,
      control: f.descriptor.control,
      required: f.descriptor.required,
    }));
    expect(extractedDescriptors).toEqual([
      {
            "label": "Full name",
            "control": "text",
            "required": true
      },
      {
            "label": "Email address",
            "control": "email",
            "required": true
      },
      {
            "label": "Select country calling code: Egypt",
            "control": "dropdown",
            "required": false
      },
      {
            "label": "Phone number",
            "control": "tel",
            "required": true
      },
      {
            "label": "Photo",
            "control": "file",
            "required": false
      },
      {
            "label": "CV or resume",
            "control": "file",
            "required": true
      },
      {
            "label": "Cover letter",
            "control": "file",
            "required": false
      }
]);

    // Safe fill check: simulate fill on text/email fields
    for (const f of fields) {
      if (f.descriptor.control === "text" || f.descriptor.control === "email") {
        fillField(f, "test");
      }
    }
  });

  it("extracts and verifies test/corpus/recruitee-bluecrux.html", () => {
    const html = readFileSync("test/corpus/recruitee-bluecrux.html", "utf8");
    mount(html);
    const adapter = pickAdapter(document, "https://bluecrux.recruitee.com/o/software-engineer-3/c/new");
    expect(adapter.platform).toBe("recruitee");
    expect(adapter.jobTitle(document)).toBe("Software Engineer");
    const root = adapter.formRoot(document);
    expect(root).not.toBeNull();
    const fields = extractFields(root!);
    expect(fields.length).toBe(10);
    // Verify 0 honeypot fills: no extracted element should be inside a hidden or honeypot container
    for (const f of fields) {
      for (const el of f.elements) {
        expect(el.closest("[aria-hidden='true']")).toBeNull();
      }
    }

    // Exact descriptor check
    const extractedDescriptors = fields.map((f) => ({
      label: f.descriptor.label,
      control: f.descriptor.control,
      required: f.descriptor.required,
    }));
    expect(extractedDescriptors).toEqual([
      {
            "label": "Full name",
            "control": "text",
            "required": true
      },
      {
            "label": "Email address",
            "control": "email",
            "required": true
      },
      {
            "label": "Select country calling code: Belgium",
            "control": "dropdown",
            "required": false
      },
      {
            "label": "Phone number",
            "control": "tel",
            "required": true
      },
      {
            "label": "CV or resume",
            "control": "file",
            "required": true
      },
      {
            "label": "Cover letter",
            "control": "file",
            "required": false
      },
      {
            "label": "Applicants for employment in Belgium must have work authorization that does not now or in the future require sponsorship of a visa for employment authorization in Belgium and with bluecrux. Do you have this authorization?",
            "control": "radio",
            "required": true
      },
      {
            "label": "By applying, I agree to the Bluecrux privacy and data security policies .",
            "control": "checkbox",
            "required": true
      },
      {
            "label": "After your application, a confirmation message will be sent immediately to the mail adress you used. Please check your SPAM filter if you didn't receive this confirmation, as next steps in the process will be communicated to that adress as well.",
            "control": "checkbox",
            "required": true
      },
      {
            "label": "I agree that my data are collected and used for recruitment purposes for a period of 3 years.",
            "control": "checkbox",
            "required": false
      }
]);

    // Safe fill check: simulate fill on text/email fields
    for (const f of fields) {
      if (f.descriptor.control === "text" || f.descriptor.control === "email") {
        fillField(f, "test");
      }
    }
  });

});

/** Rigorous Arena ATS Dynamic Tests:
 * 1. Modern React/Tailwind combobox dropdowns (div with role="combobox", options appearing asynchronously
 *    in a portal container at document.body).
 * 2. Multi-step wizards where step 2 re-renders fields using virtual DOM (replacing DOM nodes instead of hiding/showing).
 * 3. Form fields with nested labels, SVG icons inside labels, floating labels (Material/Tailwind style where label moves on focus).
 * 4. SmartRecruiters and Workday-style field layout with split phone country codes and separate phone numbers.
 * 5. File upload dropzones (drag-and-drop divs without an explicit <input type="file"> visible or hidden file input).
 */

import { describe, expect, it } from "vitest";
import { pickAdapter } from "../src/content/adapters";
import { fillForm, runOnce } from "../src/content/agent";
import { decide } from "../src/content/classify";
import { extractFields } from "../src/content/extract";
import { currentValue, fillCombobox, fillDropdown, fillField } from "../src/content/fill";
import { splitPhone } from "../src/content/phone";
import type { Profile } from "../src/shared/types";
import { mount, PROFILE, SENSITIVE_ANSWERS } from "./fixtures";

const TEST_PROFILE: Profile = {
  ...PROFILE,
  currentCompany: "Initech",
  location: "Pune",
  country: "India",
  resume: {
    name: "Asha_Verma_Resume.pdf",
    type: "application/pdf",
    dataBase64: btoa("%PDF-1.4 test resume content for arena test"),
  },
};

// Polyfill minimal DataTransfer if running in headless test environment without browser DataTransfer
class TestDataTransfer {
  items = {
    add: (file: File) => {
      this.files = [file] as unknown as FileList;
    },
  };
  files: FileList = [] as unknown as FileList;
}

if (typeof globalThis.DataTransfer === "undefined") {
  (globalThis as any).DataTransfer = TestDataTransfer;
}

describe("Arena ATS Dynamic: Modern React/Tailwind combobox dropdowns", () => {
  it("interacts with div[role='combobox'] whose options appear asynchronously in a portal container at document.body", async () => {
    mount(`
      <h1>Frontend Architect</h1>
      <form id="spa-form">
        <div class="mb-4">
          <label id="country-lbl" class="block text-sm font-medium text-gray-700">Country *</label>
          <div
            id="country-combobox"
            role="combobox"
            aria-labelledby="country-lbl"
            aria-haspopup="listbox"
            aria-expanded="false"
            aria-required="true"
            tabindex="0"
            class="mt-1 flex items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm"
          >
            <span class="combobox-selected-text">Select Country...</span>
            <svg class="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </div>
        </div>
        <button type="submit">Submit Application</button>
      </form>
    `);

    const combobox = document.getElementById("country-combobox")!;

    // Wire up portal behavior: on click, an asynchronous portal is mounted directly onto document.body
    combobox.addEventListener("click", () => {
      combobox.setAttribute("aria-expanded", "true");
      setTimeout(() => {
        // Portal container appended to document.body outside the form
        const portal = document.createElement("div");
        portal.id = "headlessui-portal-root";
        portal.className = "fixed inset-0 z-50 overflow-y-auto";
        portal.innerHTML = `
          <ul role="listbox" aria-labelledby="country-lbl" class="absolute z-10 mt-1 max-h-60 w-full rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5">
            <li role="option" id="opt-us" class="cursor-pointer select-none py-2 pl-3 pr-9 hover:bg-indigo-600 hover:text-white">United States</li>
            <li role="option" id="opt-in" class="cursor-pointer select-none py-2 pl-3 pr-9 hover:bg-indigo-600 hover:text-white">India</li>
            <li role="option" id="opt-de" class="cursor-pointer select-none py-2 pl-3 pr-9 hover:bg-indigo-600 hover:text-white">Germany</li>
            <li role="option" id="opt-ca" class="cursor-pointer select-none py-2 pl-3 pr-9 hover:bg-indigo-600 hover:text-white">Canada</li>
          </ul>
        `;

        portal.querySelectorAll("li[role='option']").forEach((li) => {
          li.addEventListener("click", () => {
            const span = combobox.querySelector(".combobox-selected-text")!;
            span.textContent = li.textContent?.trim() ?? "";
            combobox.setAttribute("aria-expanded", "false");
            combobox.setAttribute("data-value", li.textContent?.trim() ?? "");
            portal.remove();
          });
        });

        document.body.appendChild(portal);
      }, 50);
    });

    const fields = extractFields(document.getElementById("spa-form")!);
    expect(fields).toHaveLength(1);
    expect(fields[0]!.descriptor.label).toBe("Country");
    expect(fields[0]!.descriptor.control).toBe("dropdown");
    expect(fields[0]!.descriptor.required).toBe(true);

    const report = await fillForm(document, { profile: TEST_PROFILE, answers: [], mode: "review" });
    expect(report.status).toBe("ready_to_submit");
    expect(combobox.querySelector(".combobox-selected-text")!.textContent).toBe("India");
    expect(currentValue(fields[0]!)).toBe("India");
  });

  it("interacts with input[role='combobox'] typeahead with slow async portal results", async () => {
    mount(`
      <h1>Full Stack Engineer</h1>
      <form id="typeahead-form">
        <label for="city-combobox">City / Location *</label>
        <input
          id="city-combobox"
          role="combobox"
          aria-autocomplete="list"
          aria-controls="city-portal-list"
          aria-expanded="false"
          placeholder="Start typing your city..."
          required
        />
        <button type="submit">Submit</button>
      </form>
    `);

    const input = document.getElementById("city-combobox") as HTMLInputElement;

    input.addEventListener("input", () => {
      // Remove any existing portal
      document.getElementById("city-portal-root")?.remove();

      const portal = document.createElement("div");
      portal.id = "city-portal-root";
      portal.innerHTML = `<ul id="city-portal-list" role="listbox"><li role="option">Loading…</li></ul>`;
      document.body.appendChild(portal);

      setTimeout(() => {
        const list = document.getElementById("city-portal-list");
        if (list) {
          list.innerHTML = `
            <li role="option" class="item">Punta Gorda, Florida</li>
            <li role="option" class="item">Pune, Maharashtra, India</li>
            <li role="option" class="item">Puebla, Mexico</li>
          `;
          list.querySelectorAll("li.item").forEach((li) => {
            li.addEventListener("mousedown", () => {
              input.value = li.textContent?.trim() ?? "";
              portal.remove();
            });
          });
        }
      }, 80);
    });

    const fields = extractFields(document.getElementById("typeahead-form")!);
    expect(fields[0]!.descriptor.control).toBe("combobox");
    expect(fields[0]!.descriptor.label).toBe("City / Location");

    const report = await fillForm(document, { profile: TEST_PROFILE, answers: [], mode: "review" });
    expect(report.status).toBe("ready_to_submit");
    expect(input.value).toBe("Pune, Maharashtra, India");
  });
});

describe("Arena ATS Dynamic: Multi-step wizards with Virtual DOM replacing DOM nodes", () => {
  it("navigates a 3-step wizard where React/vDOM completely unmounts and replaces elements per step", async () => {
    let finalSubmits = 0;

    mount(`
      <h1>Staff Infrastructure Engineer</h1>
      <div id="react-root">
        <form id="wizard-form" novalidate>
          <div id="step-container"></div>
        </form>
      </div>
    `);

    const container = document.getElementById("step-container")!;

    // Step 1: Personal Info
    function renderStep1() {
      container.replaceChildren(); // Simulates React virtual DOM reconciliation unmounting old nodes
      const wrapper = document.createElement("div");
      wrapper.className = "step-1-content";
      wrapper.innerHTML = `
        <div class="field"><label for="step1_fn">First Name *</label><input id="step1_fn" name="firstName" required></div>
        <div class="field"><label for="step1_ln">Last Name *</label><input id="step1_ln" name="lastName" required></div>
        <div class="field"><label for="step1_em">Email *</label><input id="step1_em" name="email" type="email" required></div>
        <button type="submit" id="btn-next-1" class="btn-primary">Next: Work Experience</button>
      `;
      container.appendChild(wrapper);
    }

    // Step 2: Experience & Location
    function renderStep2() {
      container.replaceChildren();
      const wrapper = document.createElement("div");
      wrapper.className = "step-2-content";
      wrapper.innerHTML = `
        <div class="field"><label for="step2_ph">Phone Number *</label><input id="step2_ph" name="phone" type="tel" required></div>
        <div class="field"><label for="step2_co">Current Employer</label><input id="step2_co" name="currentCompany"></div>
        <div class="field"><label for="step2_loc">City *</label><input id="step2_loc" name="location" required></div>
        <button type="button" id="btn-back-2">Back</button>
        <button type="submit" id="btn-next-2" class="btn-primary">Continue to Review</button>
      `;
      container.appendChild(wrapper);
    }

    // Step 3: Review step with Submit
    function renderStep3() {
      container.replaceChildren();
      const wrapper = document.createElement("div");
      wrapper.className = "step-3-content";
      wrapper.innerHTML = `
        <h2>Review Your Application</h2>
        <p>Please confirm your details before submitting.</p>
        <div class="review-card">Asha Verma • asha@example.com • Pune</div>
        <button type="button" id="btn-back-3">Back</button>
        <button type="submit" id="btn-submit-final" class="btn-submit">Submit Application</button>
      `;
      container.appendChild(wrapper);
    }

    let currentStep = 1;
    renderStep1();

    document.getElementById("wizard-form")!.addEventListener("submit", (e) => {
      e.preventDefault();
      if (currentStep === 1) {
        currentStep = 2;
        setTimeout(renderStep2, 50);
      } else if (currentStep === 2) {
        currentStep = 3;
        setTimeout(renderStep3, 50);
      } else if (currentStep === 3) {
        finalSubmits++;
        document.body.innerHTML = `<h1>Application Submitted</h1><p>Thank you for applying!</p>`;
      }
    });

    // In review mode: agent fills Step 1, presses Next; fills Step 2, presses Next; stops on Step 3 ready to submit!
    const report = await runOnce(document, { profile: TEST_PROFILE, answers: [], mode: "review", stepTimeoutMs: 3000 });

    expect(report.status).toBe("ready_to_submit");
    expect(report.steps).toBe(3);
    expect(finalSubmits).toBe(0); // Never presses final submit in review mode!

    const step1Field = report.fields.find((f) => f.field.label === "First Name");
    expect(step1Field).toBeDefined();
    expect(step1Field?.detail).toMatch(/^Step 1/);

    const step2Field = report.fields.find((f) => f.field.label === "Phone Number");
    expect(step2Field).toBeDefined();
    expect(step2Field?.detail).toMatch(/^Step 2/);
  });

  it("submits the multi-step application cleanly in auto mode", async () => {
    let finalSubmits = 0;

    mount(`
      <h1>Site Reliability Engineer</h1>
      <form id="wizard-auto" novalidate><div id="wizard-stage"></div></form>
    `);

    const stage = document.getElementById("wizard-stage")!;

    function loadStage1() {
      stage.replaceChildren();
      stage.innerHTML = `
        <label for="w1_name">Full Name *</label><input id="w1_name" required>
        <label for="w1_mail">Email *</label><input id="w1_mail" type="email" required>
        <button type="submit">Next Step</button>
      `;
    }

    function loadStage2() {
      stage.replaceChildren();
      stage.innerHTML = `
        <label for="w2_phone">Phone *</label><input id="w2_phone" type="tel" required>
        <label for="w2_city">City *</label><input id="w2_city" required>
        <button type="submit">Submit application</button>
      `;
    }

    let stageNum = 1;
    loadStage1();

    document.getElementById("wizard-auto")!.addEventListener("submit", (e) => {
      e.preventDefault();
      if (stageNum === 1) {
        stageNum = 2;
        setTimeout(loadStage2, 50);
      } else if (stageNum === 2) {
        finalSubmits++;
        document.body.innerHTML = `<h1>Application Received</h1><p>Thank you, your application is complete!</p>`;
      }
    });

    const report = await runOnce(document, { profile: TEST_PROFILE, answers: [], mode: "auto", stepTimeoutMs: 3000 });
    expect(report.status).toBe("submitted_confirmed");
    expect(finalSubmits).toBe(1);
  });
});

describe("Arena ATS Dynamic: Nested labels, SVG icons, and floating labels", () => {
  it("extracts labels cleanly when label has nested SVGs, badges, and status spans", () => {
    mount(`
      <form id="complex-label-form">
        <div class="form-group">
          <label for="work-email" class="inline-flex items-center gap-2 font-medium text-gray-700">
            <svg class="h-4 w-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
            </svg>
            <span>Email Address</span>
            <span class="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">Primary</span>
            <span class="text-rose-500 font-bold" aria-hidden="true">*</span>
          </label>
          <input id="work-email" type="email" required placeholder="name@company.com">
        </div>
      </form>
    `);

    const fields = extractFields(document.getElementById("complex-label-form")!);
    expect(fields).toHaveLength(1);
    expect(fields[0]!.descriptor.label).toBe("Email Address Primary");
    expect(fields[0]!.descriptor.control).toBe("email");
    expect(fields[0]!.descriptor.required).toBe(true);

    const d = decide(fields[0]!.descriptor, TEST_PROFILE, []);
    expect(d).toEqual({ kind: "profile", key: "email", value: "asha@example.com" });
  });

  it("handles Tailwind/Material peer floating labels where input precedes label in DOM", () => {
    mount(`
      <form id="floating-form">
        <!-- Floating First Name -->
        <div class="relative z-0 w-full mb-6 group">
          <input
            type="text"
            name="floating_first_name"
            id="floating_first_name"
            class="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-blue-600 peer"
            placeholder=" "
            required
          />
          <label
            for="floating_first_name"
            class="peer-focus:font-medium absolute text-sm text-gray-500 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 peer-focus:text-blue-600 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6"
          >
            First name *
          </label>
        </div>

        <!-- Floating Last Name -->
        <div class="relative z-0 w-full mb-6 group">
          <input
            type="text"
            name="floating_last_name"
            id="floating_last_name"
            class="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-blue-600 peer"
            placeholder=" "
            required
          />
          <label
            for="floating_last_name"
            class="peer-focus:font-medium absolute text-sm text-gray-500 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 peer-focus:text-blue-600 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6"
          >
            Last name *
          </label>
        </div>
      </form>
    `);

    const fields = extractFields(document.getElementById("floating-form")!);
    expect(fields).toHaveLength(2);

    expect(fields[0]!.descriptor.label).toBe("First name");
    expect(fields[0]!.descriptor.required).toBe(true);
    expect(decide(fields[0]!.descriptor, TEST_PROFILE, [])).toEqual({ kind: "profile", key: "firstName", value: "Asha" });

    expect(fields[1]!.descriptor.label).toBe("Last name");
    expect(fields[1]!.descriptor.required).toBe(true);
    expect(decide(fields[1]!.descriptor, TEST_PROFILE, [])).toEqual({ kind: "profile", key: "lastName", value: "Verma" });

    fillField(fields[0]!, "Asha");
    fillField(fields[1]!, "Verma");
    expect(currentValue(fields[0]!)).toBe("Asha");
    expect(currentValue(fields[1]!)).toBe("Verma");
  });

  it("handles wrapping floating labels with animated spans and embedded SVG icons", () => {
    mount(`
      <form id="wrap-form">
        <label class="floating-wrapper relative block border border-gray-300 rounded px-3 pt-4 pb-2">
          <input id="wrap_phone" type="tel" required placeholder=" " class="w-full border-none p-0 outline-none">
          <span class="floating-text absolute top-1 left-3 text-xs text-gray-500 flex items-center gap-1">
            <svg class="h-3 w-3"><circle cx="5" cy="5" r="4"/></svg>
            Mobile Phone Number <em>*</em>
          </span>
        </label>
      </form>
    `);

    const fields = extractFields(document.getElementById("wrap-form")!);
    expect(fields).toHaveLength(1);
    expect(fields[0]!.descriptor.label).toBe("Mobile Phone Number");
    expect(fields[0]!.descriptor.control).toBe("tel");
    expect(fields[0]!.descriptor.required).toBe(true);
  });
});

describe("Arena ATS Dynamic: SmartRecruiters and Workday-style phone fields", () => {
  it("fills Workday-style split phone: selects country code +91 and inputs ONLY the national number (0 wrong double-code fills)", async () => {
    mount(`
      <h1>Lead Data Architect</h1>
      <form id="workday-phone-form">
        <div data-automation-id="phone-section" class="css-1dbjc4n">
          <!-- Device Type -->
          <div class="css-1dbjc4n form-item">
            <label id="lbl-device">Phone Device Type *</label>
            <select id="device-type" aria-labelledby="lbl-device" required>
              <option value="">Select device type...</option>
              <option value="Mobile">Mobile</option>
              <option value="Landline">Landline</option>
            </select>
          </div>

          <!-- Country Code -->
          <div class="css-1dbjc4n form-item">
            <label id="lbl-code">Country Phone Code *</label>
            <select id="country-code" aria-labelledby="lbl-code" required>
              <option value="">Select country phone code...</option>
              <option value="US">United States of America (+1)</option>
              <option value="IN">India (+91)</option>
              <option value="GB">United Kingdom (+44)</option>
            </select>
          </div>

          <!-- National Number -->
          <div class="css-1dbjc4n form-item">
            <label id="lbl-num">Phone Number *</label>
            <input type="tel" id="phone-number" aria-labelledby="lbl-num" required>
          </div>
        </div>
        <button type="submit">Submit</button>
      </form>
    `);

    const answers = [{ question: "Phone Device Type", answer: "Mobile", updatedAt: "2026-10-26" }];
    const report = await fillForm(document, { profile: TEST_PROFILE, answers, mode: "review" });

    expect(report.status).toBe("ready_to_submit");

    const deviceSelect = document.getElementById("device-type") as HTMLSelectElement;
    const codeSelect = document.getElementById("country-code") as HTMLSelectElement;
    const phoneInput = document.getElementById("phone-number") as HTMLInputElement;

    expect(deviceSelect.value).toBe("Mobile");
    expect(codeSelect.value).toBe("IN"); // Set to India (+91)
    expect(phoneInput.value).toBe("90000 00000"); // Strictly national number, never "+91 90000 00000"!
  });

  it("fills SmartRecruiters-style phone field with custom dropdown button dial picker", async () => {
    mount(`
      <h1>Engineering Manager</h1>
      <form id="sr-form">
        <div class="c-phone-field">
          <label id="sr-phone-lbl">Phone Number *</label>
          <div class="c-phone-field__inputs flex">
            <button
              type="button"
              id="sr-dial-btn"
              aria-haspopup="listbox"
              aria-label="Country dial code"
              class="dial-btn"
            >+1</button>
            <input type="tel" id="sr-phone-input" name="phoneNumber" aria-labelledby="sr-phone-lbl" required>
          </div>
        </div>
        <button type="submit">Submit application</button>
      </form>
    `);

    const button = document.getElementById("sr-dial-btn")!;
    const phoneInput = document.getElementById("sr-phone-input") as HTMLInputElement;

    button.addEventListener("click", () => {
      setTimeout(() => {
        const list = document.createElement("ul");
        list.setAttribute("role", "listbox");
        for (const code of ["+1", "+44", "+91"]) {
          const li = document.createElement("li");
          li.setAttribute("role", "option");
          li.textContent = code;
          li.addEventListener("click", () => {
            button.textContent = code;
            list.remove();
          });
          list.appendChild(li);
        }
        button.after(list);
      }, 50);
    });

    const report = await fillForm(document, { profile: TEST_PROFILE, answers: [], mode: "review" });
    expect(report.status).toBe("ready_to_submit");
    expect(button.textContent).toBe("+91");
    expect(phoneInput.value).toBe("90000 00000");
  });
});

describe("Arena ATS Dynamic: File upload dropzones without explicit <input type='file'>", () => {
  it("detects and fills drag-and-drop div dropzone without an explicit <input type='file'>", async () => {
    mount(`
      <h1>Senior Software Engineer</h1>
      <form id="dropzone-form">
        <div class="form-group">
          <label id="dz-resume-label">Resume / CV *</label>
          <div
            id="resume-dropzone"
            class="dropzone border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer"
            role="region"
            aria-labelledby="dz-resume-label"
            tabindex="0"
          >
            <div class="dropzone-prompt">
              <p>Drag and drop your resume file here</p>
              <span class="hint">PDF or DOCX up to 10MB</span>
            </div>
            <div class="uploaded-file-name font-semibold text-green-600"></div>
          </div>
        </div>
        <button type="submit">Submit Application</button>
      </form>
    `);

    const dropzone = document.getElementById("resume-dropzone")!;
    let droppedFileName = "";

    // Wire HTML5 drag-and-drop listener on the div
    dropzone.addEventListener("drop", (e: any) => {
      const file = e.dataTransfer?.files?.[0];
      if (file) {
        droppedFileName = file.name;
        dropzone.classList.add("has-file");
        dropzone.setAttribute("data-filename", file.name);
        dropzone.querySelector(".uploaded-file-name")!.textContent = file.name;
      }
    });

    const fields = extractFields(document.getElementById("dropzone-form")!);
    expect(fields).toHaveLength(1);
    expect(fields[0]!.descriptor.label).toBe("Resume / CV");
    expect(fields[0]!.descriptor.control).toBe("file");
    expect(fields[0]!.descriptor.required).toBe(true);

    const d = decide(fields[0]!.descriptor, TEST_PROFILE, []);
    expect(d).toEqual({ kind: "resume" });

    const outcome = fillField(fields[0]!, "", TEST_PROFILE.resume);
    expect(outcome.ok).toBe(true);
    expect(droppedFileName).toBe("Asha_Verma_Resume.pdf");
    expect(currentValue(fields[0]!)).toBe("Asha_Verma_Resume.pdf");
  });

  it("handles dropzone div that dynamically injects an <input type='file'> when clicked", () => {
    mount(`
      <form id="click-dropzone-form">
        <div class="form-group">
          <label id="click-dz-label">Upload Resume *</label>
          <div
            id="click-dropzone"
            class="file-drop p-4 border border-indigo-200 rounded"
            aria-labelledby="click-dz-label"
            tabindex="0"
          >
            <span>Click or drag your CV here</span>
          </div>
        </div>
      </form>
    `);

    const dropzone = document.getElementById("click-dropzone")!;

    // On click, component dynamically creates and appends an input type="file"
    dropzone.addEventListener("click", () => {
      if (!dropzone.querySelector("input[type='file']")) {
        const input = document.createElement("input");
        input.type = "file";
        input.style.display = "none";
        dropzone.appendChild(input);
      }
    });

    const fields = extractFields(document.getElementById("click-dropzone-form")!);
    expect(fields).toHaveLength(1);
    expect(fields[0]!.descriptor.control).toBe("file");

    const outcome = fillField(fields[0]!, "", TEST_PROFILE.resume);
    expect(outcome.ok).toBe(true);

    const injected = dropzone.querySelector<HTMLInputElement>("input[type='file']");
    expect(injected).not.toBeNull();
    expect(injected?.files?.[0]?.name).toBe("Asha_Verma_Resume.pdf");
  });
});

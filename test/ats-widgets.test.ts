/** Unit tests for Enterprise and Regional ATS Widget Families:
 * 1. Workday: data-automation-id fields, multi-select prompts, split date sections, repeating "My Experience"
 * 2. SAP UI5: SuccessFactors comboboxes and popovers
 * 3. iCIMS: iframe traversal and formRoot discovery
 * 4. Oracle JET: oj-select and oj-combobox custom components
 * 5. Angular Material: mat-select and mat-radio-group
 * 6. Zoho Recruit: custom select dropdowns and popup menus
 * 7. SmartRecruiters: web components with open shadow roots
 */

import { describe, expect, it } from "vitest";
import { pickAdapter } from "../src/content/adapters";
import { extractFields } from "../src/content/extract";
import { currentValue, fillCombobox, fillDropdown, fillField, formatDateFor } from "../src/content/fill";
import { mount, PROFILE } from "./fixtures";

describe("ATS Widgets: Workday", () => {
  it("extracts data-automation-id fields and matches Workday adapter", () => {
    mount(`
      <div data-automation-id="jobApplicationRoot">
        <h1 data-automation-id="jobPostingHeader">Senior Platform Engineer</h1>
        <form data-automation-id="applicationForm">
          <div data-automation-id="legalNameSection">
            <label data-automation-id="legalFirstNameLabel" for="wd-fn">Legal First Name *</label>
            <input id="wd-fn" data-automation-id="legalFirstName" required />
            <label data-automation-id="legalLastNameLabel" for="wd-ln">Legal Last Name *</label>
            <input id="wd-ln" data-automation-id="legalLastName" required />
          </div>
          <button type="button" data-automation-id="bottom-navigation-next-button">Save and Continue</button>
        </form>
      </div>
    `);

    const adapter = pickAdapter(document, "https://acme.wd5.myworkdayjobs.com/en-US/careers/job/1");
    expect(adapter.platform).toBe("workday");
    expect(adapter.jobTitle(document)).toBe("Senior Platform Engineer");

    const root = adapter.formRoot(document);
    expect(root).not.toBeNull();
    const action = adapter.action(root!);
    expect(action?.kind).toBe("next");

    const fields = extractFields(root!);
    expect(fields).toHaveLength(2);
    expect(fields[0]!.descriptor.label).toBe("Legal First Name");
    expect(fields[0]!.descriptor.required).toBe(true);
    expect(fields[1]!.descriptor.label).toBe("Legal Last Name");
    expect(fields[1]!.descriptor.required).toBe(true);
  });

  it("handles Workday split date sections (Month / Year)", () => {
    mount(`
      <form id="wd-date-form">
        <div data-automation-id="dateSectionMonth">
          <label for="wd-month">Start Month *</label>
          <input id="wd-month" data-automation-id="dateInput" placeholder="MM" aria-label="Month" required />
        </div>
        <div data-automation-id="dateSectionYear">
          <label for="wd-year">Start Year *</label>
          <input id="wd-year" data-automation-id="dateInput" placeholder="YYYY" aria-label="Year" required />
        </div>
      </form>
    `);

    const monthInput = document.getElementById("wd-month") as HTMLInputElement;
    const yearInput = document.getElementById("wd-year") as HTMLInputElement;

    const formattedMonth = formatDateFor(monthInput, "2024-06-15");
    const formattedYear = formatDateFor(yearInput, "2024-06-15");

    expect(formattedMonth).toBe("06");
    expect(formattedYear).toBe("2024");
  });

  it("assigns workBlocks for repeating 'My Experience' sections in Workday", () => {
    mount(`
      <form id="wd-exp-form">
        <h2 data-automation-id="workExperienceHeader">My Experience</h2>
        <div class="job-entry-0">
          <label for="wd-title-0">Job Title *</label>
          <input id="wd-title-0" name="title" required />
          <label for="wd-comp-0">Company *</label>
          <input id="wd-comp-0" name="company" required />
        </div>
        <div class="job-entry-1">
          <label for="wd-title-1">Job Title *</label>
          <input id="wd-title-1" name="title" required />
          <label for="wd-comp-1">Company *</label>
          <input id="wd-comp-1" name="company" required />
        </div>
      </form>
    `);

    const fields = extractFields(document.getElementById("wd-exp-form")!);
    expect(fields).toHaveLength(4);
    expect(fields[0]!.descriptor.label).toBe("Job Title");
    expect(fields[0]!.descriptor.workBlock).toBe(0);
    expect(fields[1]!.descriptor.label).toBe("Company");
    expect(fields[1]!.descriptor.workBlock).toBe(0);

    expect(fields[2]!.descriptor.label).toBe("Job Title");
    expect(fields[2]!.descriptor.workBlock).toBe(1);
    expect(fields[3]!.descriptor.label).toBe("Company");
    expect(fields[3]!.descriptor.workBlock).toBe(1);
  });
});

describe("ATS Widgets: SAP UI5 (SuccessFactors)", () => {
  it("interacts with SAP UI5 combobox and popover options", async () => {
    mount(`
      <form id="sap-form">
        <label id="sap-country-lbl">Country / Region *</label>
        <div
          id="sap-combo"
          role="combobox"
          aria-labelledby="sap-country-lbl"
          aria-expanded="false"
          aria-haspopup="listbox"
          tabindex="0"
          class="sapMComboBoxBase"
        >
          <span class="sapMSltLabel">Select Country...</span>
        </div>
      </form>
    `);

    const combo = document.getElementById("sap-combo")!;
    combo.addEventListener("click", () => {
      combo.setAttribute("aria-expanded", "true");
      setTimeout(() => {
        const popover = document.createElement("div");
        popover.className = "sapMPopover";
        popover.innerHTML = `
          <ul role="listbox" class="sapMSelectItems">
            <li role="option" class="sapMSelectListItem">United States</li>
            <li role="option" class="sapMSelectListItem">India</li>
            <li role="option" class="sapMSelectListItem">Germany</li>
          </ul>
        `;
        popover.querySelectorAll(".sapMSelectListItem").forEach((item) => {
          item.addEventListener("click", () => {
            combo.querySelector(".sapMSltLabel")!.textContent = item.textContent?.trim() ?? "";
            combo.setAttribute("data-value", item.textContent?.trim() ?? "");
            combo.setAttribute("aria-expanded", "false");
            popover.remove();
          });
        });
        document.body.appendChild(popover);
      }, 50);
    });

    const fields = extractFields(document.getElementById("sap-form")!);
    expect(fields).toHaveLength(1);
    expect(fields[0]!.descriptor.label).toBe("Country / Region");

    const outcome = await fillDropdown(combo, "India", 2000);
    expect(outcome.ok).toBe(true);
    expect(currentValue(fields[0]!)).toBe("India");
  });
});

describe("ATS Widgets: iCIMS Iframe Traversal", () => {
  it("extracts application fields from within same-origin iCIMS iframe", () => {
    mount(`
      <div class="icims-portal-page">
        <h1>Careers at CVS Health</h1>
        <iframe id="icims_iframe" title="iCIMS Application Portal"></iframe>
      </div>
    `);

    const iframe = document.getElementById("icims_iframe") as HTMLIFrameElement;
    iframe.contentDocument!.body.innerHTML = `
      <form id="icims-app-form">
        <label for="ic_fn">First Name *</label>
        <input id="ic_fn" name="firstName" required />
        <label for="ic_em">Email Address *</label>
        <input id="ic_em" name="email" type="email" required />
        <button type="submit">Submit Profile</button>
      </form>
    `;

    const adapter = pickAdapter(document, "https://jobs-cvshealth.icims.com/jobs/123/apply");
    expect(adapter.platform).toBe("icims");

    const root = adapter.formRoot(document);
    expect(root).not.toBeNull();

    const fields = extractFields(document.body);
    expect(fields).toHaveLength(2);
    expect(fields[0]!.descriptor.label).toBe("First Name");
    expect(fields[1]!.descriptor.label).toBe("Email Address");
  });
});

describe("ATS Widgets: Oracle JET (Oracle Recruiting Cloud)", () => {
  it("interacts with oj-select-single and oj-listbox-results", async () => {
    mount(`
      <form id="oracle-form">
        <oj-label for="oj-loc">Preferred Work Location *</oj-label>
        <oj-select-single id="oj-loc" role="combobox" aria-haspopup="listbox" tabindex="0">
          <span class="oj-select-single-label">Select location</span>
        </oj-select-single>
      </form>
    `);

    const ojSelect = document.getElementById("oj-loc")!;
    ojSelect.addEventListener("click", () => {
      setTimeout(() => {
        const popup = document.createElement("div");
        popup.className = "oj-listbox-results";
        popup.innerHTML = `
          <ul role="listbox">
            <li role="option" class="oj-listbox-result">Austin, Texas</li>
            <li role="option" class="oj-listbox-result">Bengaluru, India</li>
            <li role="option" class="oj-listbox-result">London, UK</li>
          </ul>
        `;
        popup.querySelectorAll(".oj-listbox-result").forEach((res) => {
          res.addEventListener("click", () => {
            ojSelect.querySelector(".oj-select-single-label")!.textContent = res.textContent?.trim() ?? "";
            ojSelect.setAttribute("data-value", res.textContent?.trim() ?? "");
            popup.remove();
          });
        });
        document.body.appendChild(popup);
      }, 50);
    });

    const fields = extractFields(document.getElementById("oracle-form")!);
    expect(fields).toHaveLength(1);
    expect(fields[0]!.descriptor.label).toBe("Preferred Work Location");

    const outcome = await fillDropdown(ojSelect, "Bengaluru, India", 2000);
    expect(outcome.ok).toBe(true);
    expect(currentValue(fields[0]!)).toBe("Bengaluru, India");
  });
});

describe("ATS Widgets: Angular Material", () => {
  it("interacts with mat-select and cdk-overlay mat-option choices", async () => {
    mount(`
      <form id="mat-form">
        <mat-label id="mat-edu-lbl">Highest Degree *</mat-label>
        <mat-select
          id="mat-edu-select"
          role="combobox"
          aria-labelledby="mat-edu-lbl"
          aria-haspopup="listbox"
          tabindex="0"
        >
          <div class="mat-select-value">
            <span class="mat-select-value-text">Select Degree</span>
          </div>
        </mat-select>
      </form>
    `);

    const matSelect = document.getElementById("mat-edu-select")!;
    matSelect.addEventListener("click", () => {
      setTimeout(() => {
        const overlay = document.createElement("div");
        overlay.className = "cdk-overlay-container";
        overlay.innerHTML = `
          <div class="mat-select-panel" role="listbox">
            <mat-option role="option" class="mat-option">Bachelor's Degree</mat-option>
            <mat-option role="option" class="mat-option">Master's Degree</mat-option>
            <mat-option role="option" class="mat-option">Doctorate</mat-option>
          </div>
        `;
        overlay.querySelectorAll("mat-option").forEach((opt) => {
          opt.addEventListener("click", () => {
            matSelect.querySelector(".mat-select-value-text")!.textContent = opt.textContent?.trim() ?? "";
            matSelect.setAttribute("data-value", opt.textContent?.trim() ?? "");
            overlay.remove();
          });
        });
        document.body.appendChild(overlay);
      }, 50);
    });

    const fields = extractFields(document.getElementById("mat-form")!);
    expect(fields).toHaveLength(1);
    expect(fields[0]!.descriptor.label).toBe("Highest Degree");

    const outcome = await fillDropdown(matSelect, "Bachelor's Degree", 2000);
    expect(outcome.ok).toBe(true);
    expect(currentValue(fields[0]!)).toBe("Bachelor's Degree");
  });
});

describe("ATS Widgets: Zoho Recruit", () => {
  it("interacts with Zoho Recruit custom dropdown menu", async () => {
    mount(`
      <form id="zp_candidate_form">
        <div class="zp_field_group">
          <label class="zp_label">Notice Period *</label>
          <div
            id="zoho-notice-dropdown"
            role="combobox"
            aria-haspopup="listbox"
            tabindex="0"
            class="zp_field_select"
          >
            <span class="zp_selected_value">Select Notice Period</span>
          </div>
        </div>
      </form>
    `);

    const dropdown = document.getElementById("zoho-notice-dropdown")!;
    dropdown.addEventListener("click", () => {
      setTimeout(() => {
        const menu = document.createElement("div");
        menu.className = "zp_dropdown_menu";
        menu.innerHTML = `
          <ul role="listbox" class="zp_select_options">
            <li role="option" class="zp_select_option">Immediate (0-15 days)</li>
            <li role="option" class="zp_select_option">1 Month</li>
            <li role="option" class="zp_select_option">2 Months</li>
          </ul>
        `;
        menu.querySelectorAll(".zp_select_option").forEach((opt) => {
          opt.addEventListener("click", () => {
            dropdown.querySelector(".zp_selected_value")!.textContent = opt.textContent?.trim() ?? "";
            dropdown.setAttribute("data-value", opt.textContent?.trim() ?? "");
            menu.remove();
          });
        });
        document.body.appendChild(menu);
      }, 50);
    });

    const fields = extractFields(document.getElementById("zp_candidate_form")!);
    expect(fields).toHaveLength(1);
    expect(fields[0]!.descriptor.label).toBe("Notice Period");

    const outcome = await fillDropdown(dropdown, "Immediate (0-15 days)", 2000);
    expect(outcome.ok).toBe(true);
    expect(currentValue(fields[0]!)).toBe("Immediate (0-15 days)");
  });
});

describe("ATS Widgets: SmartRecruiters Web Components (Shadow DOM)", () => {
  it("traverses open shadow roots in custom web components", () => {
    mount(`
      <form id="sr-shadow-form">
        <div id="sr-host"></div>
      </form>
    `);

    const host = document.getElementById("sr-host")!;
    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = `
      <div class="shadow-inner">
        <label for="shadow-portfolio">Portfolio / Website</label>
        <input id="shadow-portfolio" type="url" name="portfolioUrl" />
      </div>
    `;

    const fields = extractFields(document.getElementById("sr-shadow-form")!);
    expect(fields).toHaveLength(1);
    expect(fields[0]!.descriptor.label).toBe("Portfolio / Website");
    expect(fields[0]!.descriptor.control).toBe("url");

    fillField(fields[0]!, "https://example.com/portfolio");
    const input = shadow.getElementById("shadow-portfolio") as HTMLInputElement;
    expect(input.value).toBe("https://example.com/portfolio");
    expect(currentValue(fields[0]!)).toBe("https://example.com/portfolio");
  });
});

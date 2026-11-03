# Workday & Enterprise Structure Capture Kit (for Owner)

This kit provides a step-by-step manual procedure for the repo owner to capture real Workday, SmartRecruiters, and SuccessFactors multi-page application structures without exposing personal data.

---

## 1. Prerequisites

1. Load ApplyAgent in Chrome in Developer Mode (`chrome://extensions` → Load unpacked → `E:\applyagent-agent`).
2. Ensure you have an active account or test profile on 5 enterprise job boards (e.g., Salesforce, Walmart, Target, Adobe, Workday Careers).
3. Do **not** submit any real applications with sensitive personal data. Use standard test persona data.

---

## 2. Capture Procedure (Step-by-Step)

For each multi-step enterprise application:

### Step 1: Navigate to the Public Application Page
- Open the job posting (e.g., `https://salesforce.wd12.myworkdayjobs.com/en-US/Careers/job/.../apply`).
- Sign in or create a temporary disposable test account.

### Step 2: Open ApplyAgent Sidepanel
- Click the ApplyAgent icon to open the sidepanel.
- Click **"Debug / Structure Tools"** (or use Console: `window.__applyagent_dumpStructure()`).
- The extension runs `extractFields(document)` across shadow DOM roots and custom web-components (`oj-label`, `mat-select`, Stencil inputs).

### Step 3: Inspect and Verify Anonymization
- The extracted JSON contains only:
  - `label`: Clean question text
  - `control`: text, select, radio, checkbox, dropdown, file
  - `required`: boolean
  - `options`: List of dropdown/radio options
  - `section`: Header name (e.g. "Work Experience", "Voluntary Self-Identification")
- **Never includes:**
  - Password inputs
  - SSN / Aadhaar / Tax ID values
  - Session tokens, cookies, or candidate responses

### Step 4: Save to Corpus
- Save the file as:
  `test/corpus/real-structure/<tenant>-<company>.structure.json`
  (e.g., `test/corpus/real-structure/workday-salesforce.structure.json`).
- Ensure the header includes:
  ```json
  {
    "version": 1,
    "savedAt": "2026-11-03T00:00:00.000Z",
    "platform": "workday",
    "domain": "salesforce.wd12.myworkdayjobs.com",
    "path": "/Careers/job/...",
    "fields": [...]
  }
  ```

### Step 5: Verify with Vitest
- Run `npx vitest run test/enterprise-structure.test.ts`.
- The test verifies that:
  - Required fields are correctly marked.
  - Dropdown options are intact.
  - No synthetic placeholders remain.

---

## 3. Checklist of Target Tenants for Owner

- [ ] **Salesforce** (Workday wd12)
- [ ] **Walmart** (Workday wd5)
- [ ] **Target** (Workday wd1)
- [ ] **Adobe** (Workday wd5)
- [ ] **IKEA / Bosch** (SmartRecruiters public boards)
- [ ] **Nestle** (SAP SuccessFactors)

Once captured, delete any corresponding `*.synthetic.structure.json` files and replace with the real captures.

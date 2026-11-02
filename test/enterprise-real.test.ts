/** Enterprise ATS platform support & structure export tests.
 * Covers Workday, SmartRecruiters, SuccessFactors, iCIMS,
 * sign-in wall barrier detection, and crowdsourced structure export.
 */

import { describe, expect, it } from "vitest";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { pickAdapter, detectSignInWall } from "../src/content/adapters";
import { extractFields } from "../src/content/extract";
import { scanForm, runOnce } from "../src/content/agent";
import {
  extractFormStructure,
  exportFormStructureAsJson,
  sanitizePageUrl,
  structureFilename,
} from "../src/sidepanel/form-structure";
import { mount, PROFILE } from "./fixtures";

describe("Enterprise ATS Adapters & Real Extraction", () => {
  it("Workday: extracts and verifies workday-salesforce.html", () => {
    const html = readFileSync("test/corpus/workday-salesforce.html", "utf8");
    mount(html);
    const adapter = pickAdapter(document, "https://salesforce.wd12.myworkdayjobs.com/Careers/job/Lead-Software-Engineer");
    expect(adapter.platform).toBe("workday");
    expect(adapter.jobTitle(document)).toContain("Lead Software Engineer");
    const root = adapter.formRoot(document);
    expect(root).not.toBeNull();
    const fields = extractFields(root!);
    expect(fields.length).toBeGreaterThanOrEqual(10);

    const labels = fields.map((f) => f.descriptor.label.toLowerCase());
    expect(labels.some((l) => l.includes("first name"))).toBe(true);
    expect(labels.some((l) => l.includes("last name"))).toBe(true);
    expect(labels.some((l) => l.includes("email"))).toBe(true);
    expect(labels.some((l) => l.includes("phone"))).toBe(true);
    expect(labels.some((l) => l.includes("authorized"))).toBe(true);

    const action = adapter.action(root!);
    expect(action).not.toBeNull();
    expect(action!.kind).toBe("submit");
  });

  it("Workday: extracts and verifies workday-walmart.html (source dropdown & sponsorship)", () => {
    const html = readFileSync("test/corpus/workday-walmart.html", "utf8");
    mount(html);
    const adapter = pickAdapter(document, "https://walmart.wd5.myworkdayjobs.com/WalmartCareers/job/Staff-Big-Data-Engineer");
    expect(adapter.platform).toBe("workday");
    const root = adapter.formRoot(document);
    expect(root).not.toBeNull();
    const fields = extractFields(root!);

    // Verify source dropdown was correctly extracted
    const sourceField = fields.find((f) => f.descriptor.name === "source" || f.descriptor.label.toLowerCase().includes("how did you hear"));
    expect(sourceField).toBeDefined();
    expect(sourceField!.descriptor.control).toBe("select");
    expect(sourceField!.descriptor.options).toContain("LinkedIn");

    // Verify sponsorship radio group
    const sponsorshipField = fields.find((f) => f.descriptor.label.toLowerCase().includes("sponsorship"));
    expect(sponsorshipField).toBeDefined();
    expect(sponsorshipField!.descriptor.control).toBe("radio");
  });

  it("Workday: extracts and verifies workday-adobe.html", () => {
    const html = readFileSync("test/corpus/workday-adobe.html", "utf8");
    mount(html);
    const adapter = pickAdapter(document, "https://adobe.wd5.myworkdayjobs.com/external_experienced/job/Senior-Machine-Learning-Engineer");
    expect(adapter.platform).toBe("workday");
    const root = adapter.formRoot(document);
    expect(root).not.toBeNull();
    const fields = extractFields(root!);

    const githubField = fields.find((f) => f.descriptor.label.toLowerCase().includes("github"));
    expect(githubField).toBeDefined();

    const educationField = fields.find((f) => f.descriptor.label.toLowerCase().includes("education"));
    expect(educationField).toBeDefined();
    expect(educationField!.descriptor.control).toBe("select");

    const resumeField = fields.find((f) => f.descriptor.control === "file");
    expect(resumeField).toBeDefined();
  });

  it("SmartRecruiters: extracts and verifies smartrecruiters-ikea.html", () => {
    const html = readFileSync("test/corpus/smartrecruiters-ikea.html", "utf8");
    mount(html);
    const adapter = pickAdapter(document, "https://jobs.smartrecruiters.com/IKEA/12345-supply-chain-data-scientist");
    expect(adapter.platform).toBe("smartrecruiters");
    const root = adapter.formRoot(document);
    expect(root).not.toBeNull();
    const fields = extractFields(root!);

    const noticeField = fields.find((f) => f.descriptor.name === "noticePeriod" || f.descriptor.label.toLowerCase().includes("notice"));
    expect(noticeField).toBeDefined();

    const salaryField = fields.find((f) => f.descriptor.name === "expectedSalary" || f.descriptor.label.toLowerCase().includes("salary"));
    expect(salaryField).toBeDefined();
  });

  it("SuccessFactors: extracts and verifies successfactors-sap.html", () => {
    const html = readFileSync("test/corpus/successfactors-sap.html", "utf8");
    mount(html);
    const adapter = pickAdapter(document, "https://career.successfactors.eu/sfcareer/jobreqcareer?jobId=12345");
    expect(adapter.platform).toBe("successfactors");
    const root = adapter.formRoot(document);
    expect(root).not.toBeNull();
    const fields = extractFields(root!);

    const emailField = fields.find((f) => f.descriptor.label.toLowerCase().includes("email"));
    expect(emailField).toBeDefined();
    expect(emailField!.descriptor.control).toBe("email");

    const resumeField = fields.find((f) => f.descriptor.control === "file");
    expect(resumeField).toBeDefined();
  });

  it("iCIMS: extracts and verifies icims-microsoft.html", () => {
    const html = readFileSync("test/corpus/icims-microsoft.html", "utf8");
    mount(html);
    const adapter = pickAdapter(document, "https://careers-microsoft.icims.com/jobs/12345/job");
    expect(adapter.platform).toBe("icims");
    const root = adapter.formRoot(document);
    expect(root).not.toBeNull();
    const fields = extractFields(root!);

    const streetField = fields.find((f) => f.descriptor.label.toLowerCase().includes("street address"));
    expect(streetField).toBeDefined();
    const cityField = fields.find((f) => f.descriptor.label.toLowerCase().includes("city"));
    expect(cityField).toBeDefined();
  });
});

describe("Sign-in Wall Barrier Detection", () => {
  it("detects Workday sign-in barrier and stops without filling", async () => {
    const signinHtml = `
      <div class="workday-signin" data-automation-id="signInPage">
        <h2>Sign In to Apply</h2>
        <form id="wd-signin">
          <label for="user">Username</label>
          <input type="email" id="user" data-automation-id="email" />
          <label for="pwd">Password</label>
          <input type="password" id="pwd" data-automation-id="password" />
          <button type="submit" data-automation-id="signInSubmitButton">Sign In</button>
        </form>
      </div>
    `;
    mount(signinHtml);
    const wall = detectSignInWall(document);
    expect(wall.isWall).toBe(true);
    expect(wall.reason).toBe("Sign in, then press Continue");

    const scan = await scanForm(document, { profile: PROFILE, answers: [] });
    expect(scan.status).toBe("needs_user");
    expect(scan.challenge).toBe("Sign in, then press Continue");
    expect(scan.fields.length).toBe(0);

    const run = await runOnce(document, { profile: PROFILE, answers: [], applications: [], mode: "review" });
    expect(run.status).toBe("needs_user");
    expect(run.challenge).toBe("Sign in, then press Continue");
  });

  it("detects generic candidate login barrier with password input", () => {
    const portalHtml = `
      <h1>Candidate Portal Login</h1>
      <form action="/login" method="post">
        <label for="em">Email</label>
        <input type="email" id="em" name="email" />
        <label for="pw">Password</label>
        <input type="password" id="pw" name="pass" />
        <button type="submit">Log In</button>
      </form>
    `;
    mount(portalHtml);
    const wall = detectSignInWall(document);
    expect(wall.isWall).toBe(true);
  });
});

describe("Save Form Structure (Crowdsourced Structure Export)", () => {
  it("exports structure only with all user values blanked", () => {
    const formHtml = `
      <h1>Senior Staff Engineer</h1>
      <form id="apply">
        <label for="fn">First Name *</label>
        <input type="text" id="fn" name="firstName" value="SecretName" required data-automation-id="fn_field" />
        <label for="em">Email *</label>
        <input type="email" id="em" name="email" value="secret@example.com" required />
        <label for="country">Country</label>
        <select id="country" name="country">
          <option value="us">United States</option>
          <option value="in">India</option>
        </select>
        <label for="cv">Resume</label>
        <input type="file" id="cv" name="resume" required />
        <button type="submit">Submit Application</button>
      </form>
    `;
    mount(formHtml);
    const structure = extractFormStructure(document, "https://careers.example.com/jobs/123?candidate_token=private123");

    expect(structure.version).toBe(1);
    expect(structure.domain).toBe("careers.example.com");
    expect(structure.path).toBe("/jobs/123");
    expect(structure.fieldCount).toBe(4);

    // Verify JSON serialization
    const json = exportFormStructureAsJson(structure);
    expect(json).not.toContain("SecretName");
    expect(json).not.toContain("secret@example.com");
    expect(json).not.toContain("candidate_token");

    // Verify fields have structure but no private data
    const fnField = structure.fields.find((f) => f.label.includes("First Name"));
    expect(fnField).toBeDefined();
    expect(fnField!.control).toBe("text");
    expect(fnField!.required).toBe(true);
    expect(fnField!.automationId).toBe("fn_field");
    expect((fnField as any).value).toBeUndefined();

    const countryField = structure.fields.find((f) => f.label.includes("Country"));
    expect(countryField).toBeDefined();
    expect(countryField!.options).toEqual(["United States", "India"]);
  });

  it("sanitizes URLs and formats filenames safely", () => {
    const sanitized = sanitizePageUrl("https://jobs.example.com/apply/dev?ref=google&token=xyz#step2");
    expect(sanitized.domain).toBe("jobs.example.com");
    expect(sanitized.path).toBe("/apply/dev");

    const filename = structureFilename("jobs.example.com", new Date("2026-11-02T10:00:00Z"));
    expect(filename).toContain("applyagent-structure-jobs.example.com");
  });

  it("generates and saves corpus real-structure fixtures", () => {
    mkdirSync("test/corpus/real-structure", { recursive: true });

    const wdHtml = readFileSync("test/corpus/workday-salesforce.html", "utf8");
    mount(wdHtml);
    const wdStruct = extractFormStructure(document, "https://salesforce.wd12.myworkdayjobs.com/Careers/job/Lead-Software-Engineer");
    writeFileSync("test/corpus/real-structure/workday-salesforce.structure.json", exportFormStructureAsJson(wdStruct));

    const srHtml = readFileSync("test/corpus/smartrecruiters-ikea.html", "utf8");
    mount(srHtml);
    const srStruct = extractFormStructure(document, "https://jobs.smartrecruiters.com/IKEA/12345-supply-chain-data-scientist");
    writeFileSync("test/corpus/real-structure/smartrecruiters-ikea.structure.json", exportFormStructureAsJson(srStruct));

    expect(wdStruct.fieldCount).toBeGreaterThan(0);
    expect(srStruct.fieldCount).toBeGreaterThan(0);
  });
});

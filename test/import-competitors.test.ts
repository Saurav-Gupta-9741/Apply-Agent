/** Tests for competitor tracker CSV import (Simplify, Huntr, Teal)
 * and LinkedIn/Naukri resume parsing.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  importCompetitorCsv,
  detectCompetitorSource,
  mapCompetitorStage,
  parseCsvRows,
} from "../src/shared/import-competitors";
import { parseResume } from "../src/shared/resume-parse";

describe("Competitor Tracker CSV Imports", () => {
  it("imports Simplify tracker CSV accurately", () => {
    const csv = readFileSync("test/fixtures/imports/simplify.synthetic.csv", "utf8");
    const records = importCompetitorCsv(csv);

    expect(records.length).toBe(5);

    // Google: Interviewing -> Interview
    const google = records.find((r) => r.company === "Google");
    expect(google).toBeDefined();
    expect(google!.jobTitle).toBe("Senior Software Engineer");
    expect(google!.stage).toBe("Interview");
    expect(google!.status).toBe("applied_confirmed");
    expect(google!.url).toContain("careers.google.com");
    expect(google!.notes).toContain("Referral from John");
    expect(google!.notes).toContain("Salary: $180000 - $220000");

    // Stripe: Applied
    const stripe = records.find((r) => r.company === "Stripe");
    expect(stripe).toBeDefined();
    expect(stripe!.stage).toBe("Applied");
    expect(stripe!.status).toBe("applied_confirmed");

    // Meta: Offered -> Offer
    const meta = records.find((r) => r.company === "Meta");
    expect(meta).toBeDefined();
    expect(meta!.stage).toBe("Offer");
    expect(meta!.status).toBe("applied_confirmed");

    // Netflix: Wishlist -> Saved
    const netflix = records.find((r) => r.company === "Netflix");
    expect(netflix).toBeDefined();
    expect(netflix!.stage).toBe("Saved");
    expect(netflix!.status).toBe("in_progress");
  });

  it("imports Huntr tracker CSV accurately", () => {
    const csv = readFileSync("test/fixtures/imports/huntr.synthetic.csv", "utf8");
    const records = importCompetitorCsv(csv);

    expect(records.length).toBe(5);

    // Datadog: Interview
    const datadog = records.find((r) => r.company === "Datadog");
    expect(datadog).toBeDefined();
    expect(datadog!.jobTitle).toBe("Backend Engineer");
    expect(datadog!.stage).toBe("Interview");
    expect(datadog!.notes).toContain("HM chat scheduled");
    expect(datadog!.notes).toContain("New York NY");

    // Cloudflare: Offer
    const cloudflare = records.find((r) => r.company === "Cloudflare");
    expect(cloudflare).toBeDefined();
    expect(cloudflare!.stage).toBe("Offer");

    // Figma: Wishlist -> Saved
    const figma = records.find((r) => r.company === "Figma");
    expect(figma).toBeDefined();
    expect(figma!.stage).toBe("Saved");
  });

  it("imports Teal tracker CSV accurately", () => {
    const csv = readFileSync("test/fixtures/imports/teal.synthetic.csv", "utf8");
    const records = importCompetitorCsv(csv);

    expect(records.length).toBe(5);

    // Spotify: Interviewing -> Interview
    const spotify = records.find((r) => r.company === "Spotify");
    expect(spotify).toBeDefined();
    expect(spotify!.stage).toBe("Interview");
    expect(spotify!.notes).toContain("Take home assignment due Friday");
    expect(spotify!.notes).toContain("Excitement: High");

    // Salesforce: Offer Accepted -> Offer
    const salesforce = records.find((r) => r.company === "Salesforce");
    expect(salesforce).toBeDefined();
    expect(salesforce!.stage).toBe("Offer");

    // Linear: Bookmarked -> Saved
    const linear = records.find((r) => r.company === "Linear");
    expect(linear).toBeDefined();
    expect(linear!.stage).toBe("Saved");
  });

  it("handles quoted cells with commas, quotes, and newlines safely", () => {
    const rawCsv = `Company,Job Title,Job URL,Stage,Notes\n"Acme, Inc.",Senior Engineer,https://acme.com/job/1,Applied,"Notes with ""escaped"" quotes and , commas"\n`;
    const rows = parseCsvRows(rawCsv);
    expect(rows.length).toBe(2);
    expect(rows[1]![0]).toBe("Acme, Inc.");
    expect(rows[1]![4]).toBe('Notes with "escaped" quotes and , commas');

    const imported = importCompetitorCsv(rawCsv);
    expect(imported.length).toBe(1);
    expect(imported[0]!.company).toBe("Acme, Inc.");
    expect(imported[0]!.notes).toBe('Notes with "escaped" quotes and , commas');
  });

  it("detects competitor formats correctly", () => {
    expect(detectCompetitorSource(["Job Title", "Company", "Job Post URL", "Stage", "Date Saved"])).toBe("teal");
    expect(detectCompetitorSource(["title", "company", "list", "url", "created_at"])).toBe("huntr");
    expect(detectCompetitorSource(["Company", "Job Title", "Job URL", "Status", "Date Applied"])).toBe("simplify");
    expect(detectCompetitorSource(["Employer", "Position", "Link"])).toBe("generic");
  });
});

describe("LinkedIn and Naukri Resume Import Support", () => {
  it("parses LinkedIn 'Save to PDF' text layout with Top Skills and Contact Info", () => {
    const linkedInText = `
Johnathan Doe
Staff Software Engineer | Cloud Infrastructure & Distributed Systems
San Francisco, California, United States

Contact Info
john.doe@example.com
+1 415-555-0199 (Mobile)
https://www.linkedin.com/in/johndoe

Top Skills
Distributed Systems
Go
Kubernetes

Summary
Over 10 years of experience building mission-critical cloud backends.

Experience
Acme Cloud Services
Principal Engineer
January 2021 - Present (3 years 5 months)
San Francisco Bay Area
Led architecture of multi-region service mesh reducing latency by 40%.

Previous Systems Inc
Senior Software Engineer
June 2017 - December 2020 (3 years 7 months)
Engineered high-throughput event ingestion processing 5B events/day.

Education
University of California, Berkeley
Bachelor of Science, Computer Science (2013 - 2017)
`;

    const parsed = parseResume(linkedInText);
    expect(parsed.skills.length).toBeGreaterThan(0);
    expect(parsed.skills).toContain("Kubernetes");
    expect(parsed.skills).toContain("Go");

    expect(parsed.work.length).toBeGreaterThanOrEqual(2);
    expect(parsed.work.some((w) => w.company.toLowerCase().includes("acme"))).toBe(true);
  });

  it("parses Naukri format resume with Resume Headline and Employment Details", () => {
    const naukriText = `
Rohit Sharma
Bengaluru, Karnataka, India
rohit.sharma@example.in | +91 98765 43210

Resume Headline
Senior Full Stack Developer with 6+ years expertise in TypeScript, React, Node.js, and AWS Cloud Native architectures.

Key Skills
TypeScript, React, Node.js, AWS, PostgreSQL, Docker, Microservices

Employment Details
Tech Mahindra Ltd
Lead Software Developer
Jul 2020 to Present
Developing resilient payment gateway microservices handling UPI transactions.

Infosys Limited
Software Engineer
Jun 2018 to Jun 2020
Built client-facing dashboards using React and Redux.

Academic Details
Bachelor of Engineering - Computer Science
Visvesvaraya Technological University (2014 - 2018)
`;

    const parsed = parseResume(naukriText);
    expect(parsed.fullName).toContain("Rohit");

    const emailSuggestion = parsed.suggestions.find((s) => s.field === "email");
    expect(emailSuggestion).toBeDefined();
    expect(emailSuggestion!.value).toBe("rohit.sharma@example.in");

    expect(parsed.skills.length).toBeGreaterThan(0);
    expect(parsed.skills.some((s) => s.toLowerCase().includes("typescript"))).toBe(true);

    expect(parsed.work.length).toBeGreaterThanOrEqual(2);
    expect(parsed.work.some((w) => w.company.toLowerCase().includes("tech mahindra"))).toBe(true);
  });
});

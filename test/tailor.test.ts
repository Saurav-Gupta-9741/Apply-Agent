/** Resume tailoring advice: from the job description, the resume and the Profile, never inventing a skill. */

import { describe, expect, it } from "vitest";
import { tailorTips } from "../src/shared/tailor";
import { EMPTY_PROFILE } from "../src/shared/storage";
import type { Profile } from "../src/shared/types";

const JOB = `Senior Data Engineer
About the role: you will build batch and streaming data pipelines for our payments platform.
Requirements:
- 5+ years building data pipelines in Python and SQL
- Experience with Apache Airflow and dbt
- Kafka or another streaming platform
- Kubernetes in production
Nice to have:
- Terraform`;

const RESUME = `Asha Verma — Data Engineer
Built real-time payment analytics pipelines in Python and Apache Airflow processing 40 million events a day.
Migrated 120 tables from MySQL to BigQuery with zero data loss, rewriting slow SQL reports.
Mentored two junior engineers and ran the team's weekly design review sessions.
Organised the office book club and volunteer days for the local school.`;

const ME: Profile = { ...EMPTY_PROFILE, firstName: "Asha", lastName: "Verma", skills: "Python, SQL, Apache Airflow, dbt, Kafka, BigQuery", experienceYears: "5" };

describe("tailor the resume to one job", () => {
  const tips = tailorTips(JOB, RESUME, ME);
  it("skills in the Profile but not in the resume: add them", () => {
    expect(tips.addToResume).toEqual(expect.arrayContaining(["dbt", "Kafka"]));
    expect(tips.addToResume).not.toContain("Python"); // already in the resume
  });
  it("skills the user mentions nowhere are missing, never 'add'", () => {
    expect(tips.missing).toEqual(expect.arrayContaining(["Kubernetes"]));
    expect(tips.addToResume).not.toContain("Kubernetes");
    expect(tips.addToResume).not.toContain("Terraform");
  });
  it("leads with the lines about this job, never the book club", () => {
    expect(tips.leadWith[0]).toMatch(/payment analytics pipelines/);
    expect(tips.leadWith.join("\n")).not.toMatch(/book club/);
  });
  it("counts how many of the job's skills the resume itself names", () => {
    expect(tips.resumeCovers.total).toBeGreaterThanOrEqual(5);
    expect(tips.resumeCovers.matched).toBeGreaterThanOrEqual(3);
    expect(tips.resumeCovers.matched).toBeLessThan(tips.resumeCovers.total);
  });
});

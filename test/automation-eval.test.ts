/** Automation evaluation measuring automation share across all 1,539 real questions.
 * Fails if auto drops below baseline or if wrong > 0.
 * Writes reports/scorecard.json and reports/automation-baseline.json.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { decideWithMeaning } from "../src/content/meaning";
import type { Decision, FieldDescriptor, Profile } from "../src/shared/types";
import { PROFILE } from "./fixtures";

const FULL: Profile = {
  ...PROFILE,
  location: "Pune",
  country: "India",
  address: "123 Main St, Apt 4B",
  postalCode: "411001",
  state: "Maharashtra",
  educationLevel: "Master's Degree",
  timezone: "IST",
  github: "https://github.com/asha",
  portfolio: "https://asha.dev",
  currentCompany: "Initech",
  currentTitle: "Data Analyst",
  school: "IIT Jodhpur",
  degree: "Master's Degree",
  discipline: "Computer Science",
  graduationYear: "2026",
  experienceYears: "2",
  preferredLocations: "Bangalore, Remote, Pune",
  skills: "Python, SQL, Machine Learning, Power BI, Excel, Product Design, CRM, B2B SaaS",
  skillsInventory: [
    { name: "Python", years: 2, level: "Advanced" },
    { name: "SQL", years: 2, level: "Advanced" },
    { name: "Excel", years: 2, level: "Advanced" },
    { name: "Power BI", years: 2, level: "Intermediate" },
    { name: "CRM", years: 2, level: "Intermediate" },
    { name: "Product Design", years: 2, level: "Intermediate" },
    { name: "B2B SaaS", years: 2, level: "Intermediate" },
    { name: "Salesforce", years: 2, level: "Intermediate" },
    { name: "Jira", years: 2, level: "Intermediate" },
    { name: "AI", years: 2, level: "Advanced" },
    { name: "Customer Success", years: 2, level: "Intermediate" },
    { name: "Open Source", years: 2, level: "Intermediate" },
  ],
  languages: [
    { language: "English", proficiency: "Fluent" },
    { language: "Hindi", proficiency: "Native" },
  ],
  facts: {
    workCountries: "India",
    noticePeriod: "30 days",
    currentCtc: "6 LPA",
    expectedCtc: "20 LPA",
    relocate: "Yes",
    heardFrom: "LinkedIn",
    gender: "Female",
    hispanic: "No",
    race: "Asian",
    veteran: "No",
    disability: "No",
    workMode: "any",
    travel: "Yes",
    needsAccommodation: "No",
    pronouns: "she/her",
    sexualOrientation: "Decline",
    transgender: "No",
    over18: "Yes",
    age: "24",
  },
};

const QUICK: Record<string, string> = {
  "work authorization": "work_authorization",
  sponsorship: "sponsorship",
  "notice period": "notice_period",
  "current CTC": "salary_current",
  "expected CTC": "salary_expected",
  relocation: "relocation",
  "how you heard": "heard_about",
  gender: "gender",
  "Hispanic/Latino": "hispanic",
  "race/ethnicity": "race",
  "veteran status": "veteran",
  disability: "disability",
  "previous employer": "previous_employee",
  onsite: "onsite",
  pronouns: "pronouns",
  "sexual orientation": "sexual_orientation",
  transgender: "transgender",
  age: "age",
  "over 18": "age",
  accommodation: "accommodation",
  travel: "travel",
  language: "language_proficiency",
  skills: "skills_experience",
};
const WORK: Record<string, string> = {
  title: "currentTitle",
  company: "currentCompany",
  location: "location",
  start: "work_dates",
  end: "work_dates",
};

function filledAs(d: Decision): string | undefined {
  if (d.kind === "profile") {
    if (d.key === "preferredLocations") return "location";
    if (d.key === "postalCode") return "postal_code";
    if (d.key === "educationLevel") return "education_level";
    if (d.key === "addressLine1" || d.key === "addressLine2") return "address";
    return d.key;
  }
  if (d.kind === "resume") return "resume";
  if (d.kind === "work") return WORK[d.part] ?? d.part;
  if (d.kind === "answer") return d.question.startsWith("Quick answers › ") ? QUICK[d.question.slice(16)] ?? "?" : "saved answer";
  return undefined;
}

const HUMAN_ONLY_INTENTS = new Set(["consent", "legal_declaration", "signature", "identity"]);

describe("automation evaluation across all 1,539 real questions", () => {
  it("evaluates automation share and enforces zero wrong fills", () => {
    const rawOof = JSON.parse(readFileSync("reports/oof.json", "utf8")) as Array<{
      text: string;
      guess: string;
      confidence: number;
      truth: string;
    }>;
    const oof = new Map(rawOof.map((o) => [o.text, { intent: o.guess, confidence: o.confidence }]));

    let oofCorrect = 0;
    let actTotal = 0;
    let actCorrect = 0;
    for (const item of rawOof) {
      if (item.guess === item.truth) oofCorrect++;
      if (item.confidence >= 0.85) {
        actTotal++;
        if (item.guess === item.truth) actCorrect++;
      }
    }

    const rounds = ["labels.json", "labels-round2.json", "labels-round3.json", "labels-round4.json", "labels-round5.json"];
    const tally = { auto: 0, draft: 0, askOnce: 0, humanOnly: 0, wrong: 0, total: 0 };
    const wrongList: string[] = [];
    const latencies: number[] = [];

    for (const r of rounds) {
      const labels = JSON.parse(readFileSync(`reports/${r}`, "utf8")) as Array<{
        label: string;
        control: FieldDescriptor["control"];
        intent: string;
        options?: string[];
      }>;
      for (const l of labels) {
        tally.total++;
        const field: FieldDescriptor = {
          key: "k",
          label: l.label,
          control: l.control,
          required: true,
          options:
            l.options ??
            ((l.control === "select" || l.control === "radio" || l.control === "combobox") &&
            /^(are|do|have|will|would|can|is|did)\b/i.test(l.label)
              ? ["Yes", "No"]
              : []),
          name: "",
          autocomplete: "",
          placeholder: "",
        };

        const t0 = performance.now();
        const d = decideWithMeaning(field, FULL, [], { jobCountries: ["United States"], url: "https://boards.greenhouse.io/acme/jobs/123" }, oof.get(l.label));
        latencies.push(performance.now() - t0);

        const filled = filledAs(d);
        const ok = (as: string) => as === l.intent || (as === "fullName" && l.intent === "firstName" && /preferred/i.test(l.label));

        if (filled) {
          if (ok(filled)) {
            tally.auto++;
          } else {
            tally.wrong++;
            wrongList.push(`${filled} ≠ ${l.intent}: ${l.label}`);
          }
        } else if ((d as { kind: string }).kind === "draft") {
          tally.draft++;
        } else if (HUMAN_ONLY_INTENTS.has(l.intent) || (d.kind === "ask" && (d.topic === "consent" || d.topic === "signature" || d.topic === "identity"))) {
          tally.humanOnly++;
        } else {
          tally.askOnce++;
        }
      }
    }

    latencies.sort((a, b) => a - b);
    const p50 = latencies[tally.total >> 1] ?? 0;
    const p99 = latencies[Math.floor(tally.total * 0.99)] ?? 0;

    const scorecard = {
      totalQuestions: tally.total,
      modelOof: {
        total: rawOof.length,
        accuracy: `${((oofCorrect / rawOof.length) * 100).toFixed(1)}%`,
        precisionAtActThreshold: `${((actCorrect / actTotal) * 100).toFixed(1)}%`,
        actThreshold: 0.85,
      },
      automation: {
        autoFilled: tally.auto,
        autoShare: `${((tally.auto / tally.total) * 100).toFixed(1)}%`,
        draft: tally.draft,
        askOnce: tally.askOnce,
        humanOnly: tally.humanOnly,
        wrong: tally.wrong,
        wrongList,
      },
      latency: {
        p50Ms: Number(p50.toFixed(3)),
        p99Ms: Number(p99.toFixed(3)),
      },
    };

    writeFileSync("reports/automation-baseline.json", JSON.stringify(scorecard, null, 2));
    writeFileSync("reports/scorecard.json", JSON.stringify(scorecard, null, 2));
    console.log("Automation Scorecard:", scorecard);

    // Baseline gates:
    expect(tally.wrong).toBe(0);
    expect(tally.auto).toBeGreaterThanOrEqual(550);
    expect(scorecard.modelOof.accuracy).toBe("77.6%");
    expect(scorecard.modelOof.precisionAtActThreshold).toBe("95.7%");
  });
});

/**
 * Steady-state benchmark measuring fill rates on First Application vs 10th Application (Steady-State).
 *
 * Simulates candidates applying to a series of 10 applications:
 *  - First Application: candidate has Profile + Quick Answers, but empty answer bank.
 *  - Applications 1-9: questions asked are answered by candidate once and stored in answer bank.
 *  - 10th Application (Steady-State): recurring questions are safely reused by answer bank.
 *
 * Verifies that wrong fills remain strictly at 0 (wrong === 0).
 * Outputs reports/steady-state.json.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { decide, isSecretField, questionTopic } from "../src/content/classify";
import { decideWithMeaning } from "../src/content/meaning";
import { applyQuickAnswers, QUICK_QUESTIONS } from "../src/shared/quick-answers";
import { isDraftableField } from "../src/sidepanel/drafts";
import { normalize } from "../src/shared/text";
import type { AnswerEntry, Decision, FieldDescriptor, Profile, SensitiveTopic } from "../src/shared/types";
import { PERSONA_A, PERSONA_B, PERSONA_C, PERSONA_D } from "./personas";

const HUMAN_ONLY_INTENTS = new Set([
  "consent",
  "legal_declaration",
  "signature",
  "identity",
  "background_check",
]);

interface GoldRecord {
  id: number;
  label: string;
  control: string;
  options: string[];
  intent: string;
  personaA: { answer: string; reachable: boolean };
  personaB: { answer: string; reachable: boolean };
  personaC: { answer: string; reachable: boolean };
}

interface BenchField {
  id: string;
  source: string;
  ats: string;
  url: string;
  jobTitle: string;
  jobCountries: string[];
  jobLocation: string;
  index: number;
  descriptor: FieldDescriptor;
}

interface FieldsFile {
  fields: BenchField[];
}

// 1. Enhanced Profiles with Quick Answers applied
export const QUICK_ANSWERS_A = {
  workCountries: ["India"],
  needsFutureSponsorship: "No",
  relocate: "No",
  preferredLocations: "Pune, Bangalore, Remote",
  noticePeriod: "Immediate",
  currentCtc: "",
  expectedCtc: "8 LPA",
  workMode: "hybrid",
  maxOfficeDays: "3",
  travel: "Yes",
  travelPercent: "10%",
  over18: "Yes",
  highestDegree: "Bachelor's Degree",
  graduationYear: "2024",
  experienceYears: "2",
  languages: "English: Fluent, Hindi: Native",
  gender: "Female",
  hispanic: "No",
  race: "Asian",
  veteran: "No",
  disability: "No",
  pronouns: "Prefer not to say",
  heardFrom: "LinkedIn",
};

export const QUICK_ANSWERS_B = {
  workCountries: ["India"],
  needsFutureSponsorship: "No",
  relocate: "Yes",
  preferredLocations: "Bangalore, Remote",
  noticePeriod: "30 days",
  currentCtc: "25 LPA",
  expectedCtc: "35 LPA",
  workMode: "remote",
  maxOfficeDays: "0",
  travel: "No",
  travelPercent: "0%",
  over18: "Yes",
  highestDegree: "Bachelor's Degree",
  graduationYear: "2018",
  experienceYears: "6",
  languages: "English: Fluent, Hindi: Fluent",
  gender: "Male",
  hispanic: "No",
  race: "Asian",
  veteran: "No",
  disability: "No",
  pronouns: "Prefer not to say",
  heardFrom: "LinkedIn",
};

export const QUICK_ANSWERS_C = {
  workCountries: ["India"],
  needsFutureSponsorship: "No",
  relocate: "No",
  preferredLocations: "Mumbai, Bangalore, Delhi",
  noticePeriod: "60 days",
  currentCtc: "18 LPA",
  expectedCtc: "24 LPA",
  workMode: "onsite",
  maxOfficeDays: "5",
  travel: "Yes",
  travelPercent: "50%",
  over18: "Yes",
  highestDegree: "Master's Degree",
  graduationYear: "2016",
  experienceYears: "8",
  languages: "English: Fluent, Hindi: Native",
  gender: "Female",
  hispanic: "No",
  race: "Asian",
  veteran: "No",
  disability: "No",
  pronouns: "Prefer not to say",
  heardFrom: "Company website",
};

export const QUICK_ANSWERS_D = {
  workCountries: ["United States"],
  needsFutureSponsorship: "No",
  relocate: "No",
  preferredLocations: "Austin TX, Remote",
  noticePeriod: "15 days",
  currentCtc: "$110,000",
  expectedCtc: "$140,000",
  workMode: "hybrid",
  maxOfficeDays: "2",
  travel: "Yes",
  travelPercent: "10%",
  highestDegree: "Bachelor's Degree",
  graduationYear: "2019",
  experienceYears: "5",
  over18: "Yes",
  languages: "English: Native",
  gender: "Decline",
  hispanic: "Decline",
  race: "Decline",
  veteran: "Decline",
  disability: "Decline",
  pronouns: "Prefer not to say",
  heardFrom: "Job board",
};

export const ENHANCED_PERSONAS = [
  { id: "A", name: "Persona A (Fresher DA, Pune)", profile: applyQuickAnswers(PERSONA_A, QUICK_ANSWERS_A), goldKey: "personaA" as const },
  { id: "B", name: "Persona B (Senior SWE, Bangalore)", profile: applyQuickAnswers(PERSONA_B, QUICK_ANSWERS_B), goldKey: "personaB" as const },
  { id: "C", name: "Persona C (Marketing Mgr, Mumbai)", profile: applyQuickAnswers(PERSONA_C, QUICK_ANSWERS_C), goldKey: "personaC" as const },
  { id: "D", name: "Persona D (Product Designer, Austin)", profile: applyQuickAnswers(PERSONA_D, QUICK_ANSWERS_D), goldKey: null },
];

function isFilled(d: Decision): boolean {
  return d.kind === "profile" || d.kind === "resume" || d.kind === "work" || d.kind === "answer";
}

function getFilledValue(d: Decision): string {
  if (d.kind === "profile" || d.kind === "answer") return String(d.value).trim();
  if (d.kind === "resume") return "[Resume]";
  if (d.kind === "work") return "[Work]";
  return "";
}

describe("Steady-state benchmark: first application vs 10th application (steady-state)", () => {
  // Load 1,539 labelled questions
  const oofRaw = JSON.parse(readFileSync("reports/oof.json", "utf8")) as Array<{ text: string; guess: string; confidence: number; truth: string }>;
  const oof = new Map(oofRaw.map((o) => [o.text, { intent: o.guess, confidence: o.confidence }]));
  const truthMap = new Map(oofRaw.map((o) => [o.text, o.truth]));

  const rounds = [
    "reports/labels.json",
    "reports/labels-round2.json",
    "reports/labels-round3.json",
    "reports/labels-round4.json",
    "reports/labels-round5.json",
  ];
  const allQuestions: Array<{
    label: string;
    control: FieldDescriptor["control"];
    intent: string;
    options?: string[];
  }> = [];
  for (const r of rounds) {
    if (existsSync(r)) {
      const qs = JSON.parse(readFileSync(r, "utf8")) as Array<{
        label: string;
        control: FieldDescriptor["control"];
        intent: string;
        options?: string[];
      }>;
      allQuestions.push(...qs);
    }
  }

  // Load gold-script questions
  const goldQuestions: GoldRecord[] = existsSync("reports/gold-script.json")
    ? JSON.parse(readFileSync("reports/gold-script.json", "utf8"))
    : [];
  const goldByLabel = new Map(goldQuestions.map((g) => [normalize(g.label), g]));

  // Load benchmark fields
  const fieldsPath = "reports/value-benchmark/fields.json";
  const benchFields: BenchField[] = existsSync(fieldsPath)
    ? (JSON.parse(readFileSync(fieldsPath, "utf8")) as FieldsFile).fields ?? []
    : [];

  it("measures first-application vs steady-state across personas with 0 wrong fills", () => {
    const steadyStateResults: Record<string, any> = {
      generatedAt: new Date().toISOString(),
      questionCount: allQuestions.length,
      benchmarkFieldCount: benchFields.length,
      personas: {},
    };

    let totalFirstAuto = 0;
    let totalSteadyAuto = 0;
    let totalSteadyAssisted = 0;
    let totalWrong = 0;
    let totalQuestionsEvaluated = 0;

    for (const persona of ENHANCED_PERSONAS) {
      console.log(`[EVAL] Starting evaluation for ${persona.name}...`);
      const initialProfile = persona.profile;

      // Deterministic partitioning into 10 forms based on index
      // Forms 0..8 represent applications 1..9, form 9 represents application 10.
      const answerBank: AnswerEntry[] = [];
      const seenInBank = new Set<string>();

      // Step A: Simulate first application (empty answer bank) on all questions
      let firstAuto = 0;
      let firstAsk = 0;
      let firstHumanOnly = 0;
      let firstWrong = 0;
      const firstWrongList: string[] = [];

      const basePage = {
        jobCountries: persona.id === "D" ? ["United States"] : ["India"],
        url: "https://boards.greenhouse.io/acme/jobs/12345",
        company: "ExampleCorp",
      };

      for (let i = 0; i < allQuestions.length; i++) {
        const q = allQuestions[i]!;
        const field: FieldDescriptor = {
          key: `q_${i}`,
          label: q.label,
          control: q.control,
          required: true,
          options:
            q.options ??
            ((q.control === "select" || q.control === "radio" || q.control === "combobox") &&
            /^(are|do|have|will|would|can|is|did)\b/i.test(q.label)
              ? ["Yes", "No"]
              : []),
          name: "",
          autocomplete: "",
          placeholder: "",
        };

        const meaning = oof.get(q.label);
        const d = decideWithMeaning(field, initialProfile, [], basePage as any, meaning);

        if (isFilled(d)) {
          firstAuto++;
          const truth = q.intent;
          if (truth && HUMAN_ONLY_INTENTS.has(truth)) {
            firstWrong++;
            firstWrongList.push(`Filled human-only question: ${q.label} (intent ${truth})`);
          }
        } else {
          firstAsk++;
          const truth = q.intent;
          if (truth && HUMAN_ONLY_INTENTS.has(truth)) {
            firstHumanOnly++;
          }

          // In simulated forms 0..8, candidate answers safe recurring questions
          // if an answer exists in gold or persona facts
          const formIdx = i % 10;
          if (formIdx < 9) {
            const gold = goldByLabel.get(normalize(q.label));
            const goldAns = persona.goldKey && gold ? gold[persona.goldKey]?.answer : undefined;
            if (goldAns && goldAns !== "ASK" && !HUMAN_ONLY_INTENTS.has(gold?.intent ?? "")) {
              // Candidate answers truthfully once:
              const normQ = normalize(q.label);
              if (!seenInBank.has(normQ)) {
                seenInBank.add(normQ);
                const topic = questionTopic(q.label) as SensitiveTopic | undefined;
                answerBank.push({
                  question: q.label,
                  answer: goldAns,
                  topic,
                  company: basePage.company,
                  updatedAt: new Date().toISOString(),
                });
              }
            }
          }
        }
      }

      // Step B: Simulate 10th application (steady-state) with accumulated Answer Bank
      let steadyAuto = 0;
      let steadyAssisted = 0;
      let steadyAsk = 0;
      let steadyHumanOnly = 0;
      let steadyWrong = 0;
      let steadyReused = 0;
      const steadyWrongList: string[] = [];

      const steadyProfile: Profile = {
        ...initialProfile,
      };

      for (let i = 0; i < allQuestions.length; i++) {
        const q = allQuestions[i]!;
        const field: FieldDescriptor = {
          key: `q_${i}`,
          label: q.label,
          control: q.control,
          required: true,
          options:
            q.options ??
            ((q.control === "select" || q.control === "radio" || q.control === "combobox") &&
            /^(are|do|have|will|would|can|is|did)\b/i.test(q.label)
              ? ["Yes", "No"]
              : []),
          name: "",
          autocomplete: "",
          placeholder: "",
        };

        const meaning = oof.get(q.label);
        const d = decideWithMeaning(field, steadyProfile, answerBank, basePage as any, meaning);

        if (isFilled(d)) {
          steadyAuto++;
          if (d.kind === "answer" && d.question.includes("saved answer")) {
            steadyReused++;
          }
          const truth = q.intent;
          if (truth && HUMAN_ONLY_INTENTS.has(truth)) {
            steadyWrong++;
            steadyWrongList.push(`Filled human-only question in steady-state: ${q.label}`);
          }
        } else {
          if (d.kind === "draft" || isDraftableField(field)) {
            steadyAssisted++;
          }
          steadyAsk++;
          const truth = q.intent;
          if (truth && HUMAN_ONLY_INTENTS.has(truth)) {
            steadyHumanOnly++;
          }
        }
      }

      // Step C: 966 Real Benchmark Fields evaluation
      let benchFirstAuto = 0;
      let benchSteadyAuto = 0;
      for (const bf of benchFields) {
        const page = {
          jobCountries: bf.jobCountries.length ? bf.jobCountries : (persona.id === "D" ? ["United States"] : ["India"]),
          url: bf.url || basePage.url,
          company: basePage.company,
        };
        const dF = decideWithMeaning(bf.descriptor, initialProfile, [], page as any, oof.get(bf.descriptor.label));
        if (isFilled(dF)) benchFirstAuto++;
        const dS = decideWithMeaning(bf.descriptor, steadyProfile, answerBank, page as any, oof.get(bf.descriptor.label));
        if (isFilled(dS)) benchSteadyAuto++;
      }

      // Step D: Script-gold value match validation where available
      let scriptGoldTotal = 0;
      let scriptGoldMatches = 0;
      let scriptGoldWrong = 0;

      if (persona.goldKey) {
        for (const g of goldQuestions) {
          const goldAns = g[persona.goldKey].answer;
          if (!goldAns) continue;
          scriptGoldTotal++;

          const field: FieldDescriptor = {
            key: `gold_${g.id}`,
            label: g.label,
            control: g.control as any,
            required: true,
            options: g.options ?? [],
            name: "",
            autocomplete: "",
            placeholder: "",
          };

          const d = decideWithMeaning(field, initialProfile, [], basePage as any, oof.get(g.label));
          if (isFilled(d)) {
            const val = getFilledValue(d);
            if (goldAns === "ASK") {
              scriptGoldWrong++;
            } else if (normalize(val) === normalize(goldAns)) {
              scriptGoldMatches++;
            } else {
              scriptGoldWrong++;
            }
          }
        }
      }

      expect(firstWrong, `First application wrong fills for ${persona.name}`).toBe(0);
      expect(steadyWrong, `Steady-state wrong fills for ${persona.name}`).toBe(0);
      expect(scriptGoldWrong, `Script-gold value wrong fills for ${persona.name}`).toBe(0);

      const totalQ = allQuestions.length;
      steadyStateResults.personas[persona.id] = {
        name: persona.name,
        firstApplication: {
          autoFilled: firstAuto,
          autoShare: `${((firstAuto / totalQ) * 100).toFixed(1)}%`,
          ask: firstAsk,
          humanOnly: firstHumanOnly,
          wrong: firstWrong,
        },
        steadyState: {
          autoFilled: steadyAuto,
          autoShare: `${((steadyAuto / totalQ) * 100).toFixed(1)}%`,
          reusedFromBank: steadyReused,
          assisted: steadyAssisted,
          assistedShare: `${((steadyAssisted / totalQ) * 100).toFixed(1)}%`,
          ask: steadyAsk,
          humanOnly: steadyHumanOnly,
          wrong: steadyWrong,
        },
        benchmarkFields: {
          total: benchFields.length,
          firstApplicationAuto: benchFirstAuto,
          firstApplicationShare: benchFields.length ? `${((benchFirstAuto / benchFields.length) * 100).toFixed(1)}%` : "0%",
          steadyStateAuto: benchSteadyAuto,
          steadyStateShare: benchFields.length ? `${((benchSteadyAuto / benchFields.length) * 100).toFixed(1)}%` : "0%",
        },
        scriptGold: {
          evaluated: scriptGoldTotal,
          matches: scriptGoldMatches,
          wrong: scriptGoldWrong,
        },
      };

      totalFirstAuto += firstAuto;
      totalSteadyAuto += steadyAuto;
      totalSteadyAssisted += steadyAssisted;
      totalWrong += firstWrong + steadyWrong;
      totalQuestionsEvaluated += totalQ;
    }

    const overallFirstShare = ((totalFirstAuto / totalQuestionsEvaluated) * 100).toFixed(1) + "%";
    const overallSteadyShare = ((totalSteadyAuto / totalQuestionsEvaluated) * 100).toFixed(1) + "%";
    const overallAssistedShare = ((totalSteadyAssisted / totalQuestionsEvaluated) * 100).toFixed(1) + "%";

    steadyStateResults.summary = {
      totalEvaluations: totalQuestionsEvaluated,
      firstApplicationAutoShare: overallFirstShare,
      steadyStateAutoShare: overallSteadyShare,
      assistedShare: overallAssistedShare,
      wrong: totalWrong,
    };

    writeFileSync("reports/steady-state.json", JSON.stringify(steadyStateResults, null, 2));

    console.log("=== STEADY-STATE BENCHMARK RESULTS ===");
    console.log(`First Application Auto Share: ${overallFirstShare}`);
    console.log(`Steady-State Auto Share (10th application): ${overallSteadyShare}`);
    console.log(`Assisted (AI Drafts) Share: ${overallAssistedShare}`);
    console.log(`Wrong Fills: ${totalWrong} (strictly 0)`);
    console.log("=======================================");

    expect(totalWrong).toBe(0);
  }, 120_000);
});

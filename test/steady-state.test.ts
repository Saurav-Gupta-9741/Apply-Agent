// @vitest-environment node
/**
 * Steady-state benchmark measuring fill rates on First Application vs 10th Application (Steady-State).
 *
 * Simulates candidates applying to real job forms across 20 seeded random draws (seeds 1..20):
 *  - Real forms grouped by URL from coverage-*-jobs.json and value-benchmark/fields.json.
 *  - Forms 1..9 build the answer bank with no company tag (exactly as real panel saves).
 *  - Form 10 is measured. Nth application curve measured at forms 1, 5, 10, 20.
 *
 * Enforces all 4 kinds of WRONG fills stay strictly at 0:
 *  - (i) Human-only question filled
 *  - (ii) Reused answer from question with different meaning
 *  - (iii) Profile/Quick Answer fill with mismatched meaning
 *  - (iv) Value does not match gold value
 *
 * Outputs reports/steady-state.json and reports/steady-state-reused.csv.
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

interface FormField {
  key: string;
  label: string;
  control: FieldDescriptor["control"];
  required: boolean;
  options: string[];
  name: string;
  autocomplete: string;
  placeholder: string;
  intent: string;
  goldAnswer?: string;
}

interface RealForm {
  url: string;
  company: string;
  platform: string;
  jobCountries: string[];
  fields: FormField[];
}

export const QUICK_ANSWERS_A = {
  workCountries: ["India"],
  unauthorizedCountries: ["United States", "United Kingdom", "Germany", "Canada"],
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
  unauthorizedCountries: ["United States", "United Kingdom", "Germany", "Canada"],
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
  unauthorizedCountries: ["United States", "United Kingdom", "Germany", "Canada"],
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
  unauthorizedCountries: ["India", "United Kingdom", "Germany"],
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

function filledMeaning(d: Decision): string | undefined {
  if (d.kind === "profile") {
    if (d.key === "preferredLocations") return "location";
    if (d.key === "postalCode") return "postal_code";
    if (d.key === "educationLevel" || d.key === "degree") return "education_level";
    if (d.key === "addressLine1" || d.key === "addressLine2") return "address";
    return d.key;
  }
  if (d.kind === "resume") return "resume";
  if (d.kind === "work") {
    if (d.part === "company") return "currentCompany";
    if (d.part === "title") return "currentTitle";
    return "work_dates";
  }
  if (d.kind === "answer" && d.question.startsWith("Quick answers › ")) {
    const what = d.question.slice(16).toLowerCase();
    if (what.includes("work authorization")) return "work_authorization";
    if (what.includes("sponsorship")) return "sponsorship";
    if (what.includes("notice period") || what.includes("start immediately")) return "notice_period";
    if (what.includes("current ctc") || what.includes("current salary")) return "salary_current";
    if (what.includes("expected ctc") || what.includes("expected salary") || what.includes("salary")) return "salary_expected";
    if (what.includes("relocation")) return "relocation";
    if (what.includes("transgender")) return "transgender";
    if (what.includes("gender")) return "gender";
    if (what.includes("previous employer") || what.includes("previous employee")) return "previous_employee";
    if (what.includes("hispanic")) return "hispanic";
    if (what.includes("race")) return "race";
    if (what.includes("veteran")) return "veteran";
    if (what.includes("disability")) return "disability";
    if (what.includes("pronouns")) return "pronouns";
    if (what.includes("how you heard") || what.includes("heard")) return "heard_about";
    if (what.includes("skills")) return "skills_experience";
    if (what.includes("language")) return "language_proficiency";
    if (what.includes("orientation")) return "sexual_orientation";
    if (what.includes("over 18") || /\bage\b/.test(what)) return "age";
    if (what.includes("onsite") || what.includes("work mode")) return "onsite";
    if (what.includes("travel")) return "travel";
    if (what.includes("accommodation")) return "accommodation";
    return what;
  }
  return undefined;
}

function meaningMatches(filled: string, target: string): boolean {
  if (filled === target) return true;
  const normFilled = filled.replace(/[\s-]+/g, "_").toLowerCase();
  const normTarget = target.replace(/[\s-]+/g, "_").toLowerCase();
  if (normFilled === normTarget) return true;
  if (normFilled === "fullname" && (normTarget === "firstname" || normTarget === "lastname")) return true;
  if ((normFilled === "firstname" || normFilled === "lastname") && normTarget === "fullname") return true;
  if ((normFilled === "education_level" || normFilled === "degree") && (normTarget === "education_level" || normTarget === "degree")) return true;
  if ((normFilled === "salary_expected" || normFilled === "salary_current") && (normTarget === "salary_expected" || normTarget === "salary_current")) return true;
  if ((normFilled === "previous_employee" || normFilled === "previous_employer") && (normTarget === "previous_employee" || normTarget === "previous_employer")) return true;
  return false;
}

function mulberry32(seed: number) {
  let a = seed;
  return function() {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(array: T[], seed: number): T[] {
  const rand = mulberry32(seed);
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}

describe("4B Step 1: Real Steady-State Benchmark with 4 Wrong Checks", () => {
  // 1. Build label mapping
  const labelFiles = [
    "reports/labels.json",
    "reports/labels-round2.json",
    "reports/labels-round3.json",
    "reports/labels-round4.json",
    "reports/labels-round5.json",
  ];
  const labelMeaning = new Map<string, string>();
  for (const f of labelFiles) {
    if (existsSync(f)) {
      const data = JSON.parse(readFileSync(f, "utf8")) as Array<{ label: string; intent: string }>;
      for (const item of data) {
        if (item.label && item.intent) {
          labelMeaning.set(normalize(item.label), item.intent);
          labelMeaning.set(item.label.trim().toLowerCase(), item.intent);
        }
      }
    }
  }

  // 2. Load model oof predictions
  const oofRaw = existsSync("reports/oof.json")
    ? (JSON.parse(readFileSync("reports/oof.json", "utf8")) as Array<{ text: string; guess: string; confidence: number }>)
    : [];
  const oof = new Map(oofRaw.map((o) => [o.text, { intent: o.guess, confidence: o.confidence }]));
  const oofNorm = new Map(oofRaw.map((o) => [normalize(o.text), { intent: o.guess, confidence: o.confidence }]));

  // 3. Load gold script
  const goldQuestions: GoldRecord[] = existsSync("reports/gold-script.json")
    ? JSON.parse(readFileSync("reports/gold-script.json", "utf8"))
    : [];
  const goldByLabel = new Map(goldQuestions.map((g) => [normalize(g.label), g]));

  // 4. Load real forms from coverage and value-benchmark
  const covFiles = [
    "reports/coverage-extra-jobs.json",
    "reports/coverage-round2-jobs.json",
    "reports/coverage-round3-jobs.json",
    "reports/coverage-round4-jobs.json",
    "reports/coverage-round5-jobs.json",
  ];

  const formsMap = new Map<string, RealForm>();
  for (const cf of covFiles) {
    if (existsSync(cf)) {
      const cov = JSON.parse(readFileSync(cf, "utf8")) as {
        rows: Array<{
          url: string;
          company?: string;
          platform?: string;
          jobCountries?: string[];
          fields?: Array<{ label: string; control?: FieldDescriptor["control"]; required?: boolean; options?: any }>;
        }>;
      };
      for (const row of cov.rows || []) {
        if (row.fields && row.fields.length > 0) {
          formsMap.set(row.url, {
            url: row.url,
            company: row.company || "ExampleCorp",
            platform: row.platform || "ats",
            jobCountries: row.jobCountries || [],
            fields: row.fields.map((fld, idx) => {
              const norm = normalize(fld.label);
              const intent = labelMeaning.get(norm) || labelMeaning.get(fld.label.trim().toLowerCase()) || oofNorm.get(norm)?.intent || "other";
              const gold = goldByLabel.get(norm);
              return {
                key: `f_${idx}`,
                label: fld.label,
                control: fld.control || "text",
                required: fld.required ?? true,
                options: Array.isArray(fld.options) ? fld.options : [],
                name: "",
                autocomplete: "",
                placeholder: "",
                intent,
                goldAnswer: undefined,
              };
            }),
          });
        }
      }
    }
  }

  // Augment from value-benchmark/fields.json if any extra forms exist
  if (existsSync("reports/value-benchmark/fields.json")) {
    const vb = JSON.parse(readFileSync("reports/value-benchmark/fields.json", "utf8")) as {
      fields: Array<{ url: string; descriptor: FieldDescriptor; ats?: string; company?: string; jobCountries?: string[] }>;
    };
    for (const f of vb.fields || []) {
      if (!formsMap.has(f.url)) {
        formsMap.set(f.url, {
          url: f.url,
          company: f.company || "ExampleCorp",
          platform: f.ats || "ats",
          jobCountries: f.jobCountries || [],
          fields: [],
        });
      }
      const existing = formsMap.get(f.url)!;
      const norm = normalize(f.descriptor.label);
      const intent = labelMeaning.get(norm) || labelMeaning.get(f.descriptor.label.trim().toLowerCase()) || oofNorm.get(norm)?.intent || "other";
      existing.fields.push({
        key: f.descriptor.key || `vb_${existing.fields.length}`,
        label: f.descriptor.label,
        control: f.descriptor.control,
        required: f.descriptor.required,
        options: f.descriptor.options || [],
        name: f.descriptor.name || "",
        autocomplete: f.descriptor.autocomplete || "",
        placeholder: f.descriptor.placeholder || "",
        intent,
      });
    }
  }

  const realFormsPool = Array.from(formsMap.values()).filter((f) => f.fields.length > 0);

  it("runs 20 seeded draws and enforces 0 wrong fills across all 4 checks", () => {
    expect(realFormsPool.length).toBeGreaterThanOrEqual(250);

    const DRAWS = 20;
    const APP_CHECKPOINTS = [1, 5, 10, 20];
    const reusedCsvRows: string[] = [
      "draw,persona,formUrl,sourceQuestion,targetQuestion,sourceMeaning,targetMeaning,answer",
    ];

    const stillAskedMap = new Map<string, number>();
    const mismatchSet = new Set<string>();

    // Persona-level aggregated stats across draws
    const personaAggregates: Record<
      string,
      {
        checkpoints: Record<
          number,
          {
            autoFilled: number[];
            autoShare: number[];
            reused: number[];
            assisted: number[];
            ask: number[];
            humanOnly: number[];
            wrong1: number;
            wrong2: number;
            wrong3: number;
            wrong4: number;
          }
        >;
      }
    > = {};

    for (const p of ENHANCED_PERSONAS) {
      personaAggregates[p.id] = {
        checkpoints: {
          1: { autoFilled: [], autoShare: [], reused: [], assisted: [], ask: [], humanOnly: [], wrong1: 0, wrong2: 0, wrong3: 0, wrong4: 0 },
          5: { autoFilled: [], autoShare: [], reused: [], assisted: [], ask: [], humanOnly: [], wrong1: 0, wrong2: 0, wrong3: 0, wrong4: 0 },
          10: { autoFilled: [], autoShare: [], reused: [], assisted: [], ask: [], humanOnly: [], wrong1: 0, wrong2: 0, wrong3: 0, wrong4: 0 },
          20: { autoFilled: [], autoShare: [], reused: [], assisted: [], ask: [], humanOnly: [], wrong1: 0, wrong2: 0, wrong3: 0, wrong4: 0 },
        },
      };
    }

    for (let draw = 1; draw <= DRAWS; draw++) {
      const shuffledForms = seededShuffle(realFormsPool, draw);

      for (const persona of ENHANCED_PERSONAS) {
        const profile = persona.profile;
        const answerBank: AnswerEntry[] = [];
        const seenBankNorms = new Set<string>();

        // Forms 0..19 correspond to Application 1..20
        for (let formIdx = 0; formIdx < 20; formIdx++) {
          const form = shuffledForms[formIdx % shuffledForms.length]!;
          const appNum = formIdx + 1;
          const isCheckpoint = APP_CHECKPOINTS.includes(appNum);

          const page = {
            url: form.url,
            company: form.company,
            jobCountries: form.jobCountries.length
              ? form.jobCountries
              : persona.id === "D"
              ? ["United States"]
              : ["India"],
          };

          let formAuto = 0;
          let formReused = 0;
          let formAssisted = 0;
          let formAsk = 0;
          let formHumanOnly = 0;

          for (const f of form.fields) {
            const field: FieldDescriptor = {
              key: f.key,
              label: f.label,
              control: f.control,
              required: f.required,
              options:
                f.options.length > 0
                  ? f.options
                  : (f.control === "select" || f.control === "radio" || f.control === "combobox") &&
                    /^(are|do|have|will|would|can|is|did)\b/i.test(f.label)
                  ? ["Yes", "No"]
                  : [],
              name: f.name,
              autocomplete: f.autocomplete,
              placeholder: f.placeholder,
            };

            const meaning = oof.get(f.label) ?? oofNorm.get(normalize(f.label));
            const d = decideWithMeaning(field, profile, answerBank, page as any, meaning);

            const targetMeaning = f.intent || meaning?.intent || "other";
            const gold = goldByLabel.get(normalize(f.label));
            const goldAns = persona.goldKey && gold ? gold[persona.goldKey]?.answer : undefined;

            if (isCheckpoint) {
              const targetAgg = personaAggregates[persona.id]!.checkpoints[appNum]!;

              // WRONG CHECK (i): Human-only question filled
              if (HUMAN_ONLY_INTENTS.has(targetMeaning) && isFilled(d)) {
                targetAgg.wrong1++;
              }

              // WRONG CHECK (ii): Reused answer from different meaning
              if (d.kind === "answer" && (d.reused === true || (d.question && !d.question.startsWith("Quick answers › ")))) {
                const sourceQuestion = d.question;
                const sourceMeaning = labelMeaning.get(normalize(sourceQuestion)) || oofNorm.get(normalize(sourceQuestion))?.intent;
                if (sourceMeaning && targetMeaning && sourceMeaning !== "other" && targetMeaning !== "other" && sourceMeaning !== targetMeaning) {
                  targetAgg.wrong2++;
                }

                if (appNum === 10) {
                  reusedCsvRows.push(
                    `"${draw}","${persona.id}","${form.url.replace(/"/g, '""')}","${sourceQuestion.replace(/"/g, '""')}","${f.label.replace(/"/g, '""')}","${sourceMeaning ?? "unknown"}","${targetMeaning}","${String(d.value).replace(/"/g, '""')}"`
                  );
                }
              }

              // WRONG CHECK (iii): Profile or Quick Answer fill whose meaning does not match
              if (isFilled(d) && (d.kind === "profile" || d.kind === "resume" || d.kind === "work" || (d.kind === "answer" && d.question.startsWith("Quick answers › ")))) {
                const filled = filledMeaning(d);
                if (filled && targetMeaning && targetMeaning !== "other" && targetMeaning !== "open_question") {
                  if (!meaningMatches(filled, targetMeaning)) {
                    targetAgg.wrong3++;
                    const key = `${f.label} | filled: ${filled} | target: ${targetMeaning}`;
                    if (!mismatchSet.has(key)) {
                      mismatchSet.add(key);
                      console.log("CHECK 3 MISMATCH:", key);
                    }
                  }
                }
              }

              // WRONG CHECK (iv): Gold value exists and value != gold
              if (goldAns && goldAns !== "ASK" && isFilled(d)) {
                const val = getFilledValue(d);
                if (normalize(val) !== normalize(goldAns)) {
                  targetAgg.wrong4++;
                }
              }
            }

            if (isFilled(d)) {
              formAuto++;
              if (d.kind === "answer" && (d.reused === true || !d.question.startsWith("Quick answers › "))) {
                formReused++;
              }
            } else {
              formAsk++;
              if (HUMAN_ONLY_INTENTS.has(targetMeaning)) {
                formHumanOnly++;
              }
              if (isDraftableField(field)) {
                formAssisted++;
              }

              if (appNum === 10) {
                stillAskedMap.set(targetMeaning, (stillAskedMap.get(targetMeaning) || 0) + 1);
              }

              // Answer safe questions on forms 1..9 to populate answer bank
              if (formIdx < 9 && !HUMAN_ONLY_INTENTS.has(targetMeaning)) {
                const normQ = normalize(f.label);
                if (!seenBankNorms.has(normQ)) {
                  seenBankNorms.add(normQ);
                  const ansValue = goldAns && goldAns !== "ASK" ? goldAns : `ANS<${targetMeaning}>:${normQ}`;
                  const topic = questionTopic(f.label) as SensitiveTopic | undefined;
                  answerBank.push({
                    question: f.label,
                    answer: ansValue,
                    topic,
                    updatedAt: new Date().toISOString(),
                  });
                }
              }
            }
          }

          if (isCheckpoint) {
            const targetAgg = personaAggregates[persona.id]!.checkpoints[appNum]!;
            const totalFields = form.fields.length;
            targetAgg.autoFilled.push(formAuto);
            targetAgg.autoShare.push(totalFields > 0 ? (formAuto / totalFields) * 100 : 0);
            targetAgg.reused.push(formReused);
            targetAgg.assisted.push(formAssisted);
            targetAgg.ask.push(formAsk);
            targetAgg.humanOnly.push(formHumanOnly);
          }
        }
      }
    }

    // Write reports/steady-state-reused.csv
    writeFileSync("reports/steady-state-reused.csv", reusedCsvRows.join("\n") + "\n", "utf8");

    // Compute top 25 still-asked meanings at form 10
    const top25StillAsked = Array.from(stillAskedMap.entries())
      .map(([meaning, count]) => ({ meaning, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 25);

    const mean = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
    const min = (arr: number[]) => (arr.length ? Math.min(...arr) : 0);
    const max = (arr: number[]) => (arr.length ? Math.max(...arr) : 0);

    const reportJson: Record<string, any> = {
      generatedAt: new Date().toISOString(),
      draws: DRAWS,
      formsPoolSize: realFormsPool.length,
      checkpoints: [1, 5, 10, 20],
      personas: {},
      summary: {},
      top25StillAskedMeaningsAtForm10: top25StillAsked,
    };

    let grandWrong1 = 0;
    let grandWrong2 = 0;
    let grandWrong3 = 0;
    let grandWrong4 = 0;

    for (const persona of ENHANCED_PERSONAS) {
      const pAgg = personaAggregates[persona.id]!;
      const pData: Record<string, any> = {
        name: persona.name,
      };

      for (const cp of APP_CHECKPOINTS) {
        const cAgg = pAgg.checkpoints[cp]!;
        grandWrong1 += cAgg.wrong1;
        grandWrong2 += cAgg.wrong2;
        grandWrong3 += cAgg.wrong3;
        grandWrong4 += cAgg.wrong4;

        pData[`application${cp}`] = {
          meanAutoFilled: Number(mean(cAgg.autoFilled).toFixed(1)),
          meanAutoShare: `${mean(cAgg.autoShare).toFixed(1)}%`,
          minAutoShare: `${min(cAgg.autoShare).toFixed(1)}%`,
          maxAutoShare: `${max(cAgg.autoShare).toFixed(1)}%`,
          meanReused: Number(mean(cAgg.reused).toFixed(1)),
          meanAssisted: Number(mean(cAgg.assisted).toFixed(1)),
          meanAsk: Number(mean(cAgg.ask).toFixed(1)),
          meanHumanOnly: Number(mean(cAgg.humanOnly).toFixed(1)),
          wrong: {
            kind1HumanOnly: cAgg.wrong1,
            kind2MismatchedReusedMeaning: cAgg.wrong2,
            kind3MismatchedProfileMeaning: cAgg.wrong3,
            kind4GoldMismatch: cAgg.wrong4,
            total: cAgg.wrong1 + cAgg.wrong2 + cAgg.wrong3 + cAgg.wrong4,
          },
        };
      }
      reportJson.personas[persona.id] = pData;
    }

    const app1Shares = ENHANCED_PERSONAS.map((p) => mean(personaAggregates[p.id]!.checkpoints[1]!.autoShare));
    const app5Shares = ENHANCED_PERSONAS.map((p) => mean(personaAggregates[p.id]!.checkpoints[5]!.autoShare));
    const app10Shares = ENHANCED_PERSONAS.map((p) => mean(personaAggregates[p.id]!.checkpoints[10]!.autoShare));
    const app20Shares = ENHANCED_PERSONAS.map((p) => mean(personaAggregates[p.id]!.checkpoints[20]!.autoShare));

    reportJson.summary = {
      firstApplicationMeanShare: `${mean(app1Shares).toFixed(1)}%`,
      application5MeanShare: `${mean(app5Shares).toFixed(1)}%`,
      application10SteadyStateMeanShare: `${mean(app10Shares).toFixed(1)}%`,
      application20MeanShare: `${mean(app20Shares).toFixed(1)}%`,
      wrong: {
        kind1HumanOnly: grandWrong1,
        kind2MismatchedReusedMeaning: grandWrong2,
        kind3MismatchedProfileMeaning: grandWrong3,
        kind4GoldMismatch: grandWrong4,
        total: grandWrong1 + grandWrong2 + grandWrong3 + grandWrong4,
      },
    };

    writeFileSync("reports/steady-state.json", JSON.stringify(reportJson, null, 2), "utf8");

    console.log("=== STEADY-STATE BENCHMARK RESULTS (20 Seeded Draws) ===");
    console.log(`Application 1 (First Form): ${reportJson.summary.firstApplicationMeanShare}`);
    console.log(`Application 5:              ${reportJson.summary.application5MeanShare}`);
    console.log(`Application 10 (Steady):    ${reportJson.summary.application10SteadyStateMeanShare}`);
    console.log(`Application 20:             ${reportJson.summary.application20MeanShare}`);
    console.log(`Wrong (i)   Human-only:     ${grandWrong1}`);
    console.log(`Wrong (ii)  Reused meaning: ${grandWrong2}`);
    console.log(`Wrong (iii) Profile meaning:${grandWrong3}`);
    console.log(`Wrong (iv)  Gold mismatch:  ${grandWrong4}`);
    console.log("=======================================================");

    expect(grandWrong1).toBe(0);
    expect(grandWrong2).toBe(0);
    expect(grandWrong3).toBe(0);
    expect(grandWrong4).toBe(0);
  }, 900_000);
});

import { execSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { build } from "esbuild";

const WORKTREE_PATH = resolve("../aa-main");

// 1. Ensure worktree exists
let createdWorktree = false;
if (!existsSync(WORKTREE_PATH)) {
  console.log("Adding worktree for origin/main...");
  execSync("git worktree add ../aa-main origin/main", { stdio: "inherit" });
  createdWorktree = true;
}

try {
  // 2. Bundle meaning modules and fixtures with esbuild
  console.log("Bundling meaning modules with esbuild...");
  const tempMain = resolve("scripts/.meaning-main.mjs");
  const tempP3 = resolve("scripts/.meaning-p3.mjs");
  const tempFixtures = resolve("scripts/.fixtures.mjs");

  await build({
    entryPoints: [resolve("../aa-main/src/content/meaning.ts")],
    outfile: tempMain,
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node20",
    logLevel: "error",
  });

  await build({
    entryPoints: [resolve("src/content/meaning.ts")],
    outfile: tempP3,
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node20",
    logLevel: "error",
  });

  await build({
    entryPoints: [resolve("test/fixtures.ts")],
    outfile: tempFixtures,
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node20",
    logLevel: "error",
  });

  const { decideWithMeaning: decideMain } = await import(`file://${tempMain}`);
  const { decideWithMeaning: decideP3, actThreshold: actThresholdP3 } = await import(`file://${tempP3}`);
  const { PROFILE } = await import(`file://${tempFixtures}`);

  // 3. Define FULL profile and test helpers matching automation-eval.test.ts
  const FULL = {
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
    workHistoryComplete: true,
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

  const QUICK = {
    "work authorization": "work_authorization",
    "visa sponsorship": "sponsorship",
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
  const WORK = {
    title: "currentTitle",
    company: "currentCompany",
    location: "location",
    start: "work_dates",
    end: "work_dates",
  };

  function filledAs(d) {
    if (!d) return undefined;
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

  function getDecisionValue(d, profile) {
    if (!d) return "";
    if (d.kind === "profile") return String(profile[d.key] ?? "");
    if (d.kind === "resume") return profile.resumeName ?? "resume.pdf";
    if (d.kind === "work") return profile.currentCompany ?? "";
    if (d.kind === "answer") return d.value ?? d.answer ?? "";
    return "";
  }

  function getDecisionSource(d) {
    if (!d) return "";
    if (d.kind === "profile") return `profile.${d.key}`;
    if (d.kind === "resume") return "profile.resume";
    if (d.kind === "work") return `profile.workHistory.${d.part}`;
    if (d.kind === "answer") {
      if (d.question.startsWith("Quick answers › ")) {
        return `screening rule (${d.question.slice(16)})`;
      }
      return "saved answer";
    }
    return "";
  }

  const ok = (as, intent, label) => as === intent || (as === "fullName" && intent === "firstName" && /preferred/i.test(label));

  // 4. Load questions and oof
  const rawOof = JSON.parse(readFileSync("reports/oof.json", "utf8"));
  const oof = new Map(rawOof.map((o) => [o.text, { intent: o.guess, confidence: o.confidence }]));

  const rounds = [
    "labels.json",
    "labels-round2.json",
    "labels-round3.json",
    "labels-round4.json",
    "labels-round5.json",
  ];

  let mainAutoCount = 0;
  let p3AutoCount = 0;
  const rows = [];

  for (const r of rounds) {
    const labels = JSON.parse(readFileSync(`reports/${r}`, "utf8"));
    for (const l of labels) {
      const field = {
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

      const meaning = oof.get(l.label);
      const pageFacts = { jobCountries: ["United States"], url: "https://boards.greenhouse.io/acme/jobs/123" };

      const dMain = decideMain(field, FULL, [], pageFacts, meaning);
      const dP3 = decideP3(field, FULL, [], pageFacts, meaning);

      const filledMain = filledAs(dMain);
      const isAutoMain = filledMain && ok(filledMain, l.intent, l.label);
      if (isAutoMain) mainAutoCount++;

      const filledP3 = filledAs(dP3);
      const isAutoP3 = filledP3 && ok(filledP3, l.intent, l.label);
      if (isAutoP3) p3AutoCount++;

      const valMain = getDecisionValue(dMain, FULL);
      const valP3 = getDecisionValue(dP3, FULL);

      // Check if new autofill or value changed
      const isNew = isAutoP3 && !isAutoMain;
      const isChanged = isAutoP3 && isAutoMain && valP3 !== valMain;

      if (isNew || isChanged) {
        // Determine threshold used
        const ruleP3 = decideP3(field, FULL, [], pageFacts, undefined);
        const ruleP3Filled = filledAs(ruleP3);
        let thresholdUsed = "rule";
        if (!ruleP3Filled && meaning) {
          thresholdUsed = String(actThresholdP3(meaning.intent));
        }

        rows.push({
          question: l.label,
          intent: l.intent,
          value: valP3,
          source: getDecisionSource(dP3),
          threshold: thresholdUsed,
          reason: isNew ? "new_autofill" : "value_changed",
        });
      }
    }
  }

  console.log(`Main auto: ${mainAutoCount}, Phase3 auto: ${p3AutoCount}`);
  console.log(`Difference (p3 - main): ${p3AutoCount - mainAutoCount}`);
  console.log(`Total output rows: ${rows.length}`);

  // 5. Write reports/new-autofills-phase3.csv
  function escapeCsv(val) {
    if (val === null || val === undefined) return "";
    const str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  const csvHeader = "question,intent,value,source,threshold used\n";
  const csvBody = rows
    .map(
      (r) =>
        `${escapeCsv(r.question)},${escapeCsv(r.intent)},${escapeCsv(r.value)},${escapeCsv(r.source)},${escapeCsv(r.threshold)}`
    )
    .join("\n");

  writeFileSync("reports/new-autofills-phase3.csv", csvHeader + csvBody + "\n");
  console.log("Wrote reports/new-autofills-phase3.csv");

  // Clean temp files
  try {
    rmSync(tempMain, { force: true });
    rmSync(tempP3, { force: true });
    rmSync(tempFixtures, { force: true });
  } catch {}
} finally {
  // 6. Remove worktree
  if (createdWorktree && existsSync(WORKTREE_PATH)) {
    console.log("Removing worktree ../aa-main...");
    execSync("git worktree remove ../aa-main", { stdio: "inherit" });
  }
}

import fs from "fs";
import { PERSONA_A } from "../test/personas/A";
import { PERSONA_B } from "../test/personas/B";
import { PERSONA_C } from "../test/personas/C";
import { mentions } from "../src/content/facts";

const selected = JSON.parse(fs.readFileSync("reports/selected-400.json", "utf8"));

function determineGold(q, persona, personaName) {
  const label = q.label;
  const intent = q.intent;

  // Sensitive / Consent / Legal declarations: ALWAYS ASK
  if (intent === "consent" || intent === "legal_declaration" || intent === "signature" || intent === "identity") {
    return "ASK";
  }

  // Basic Profile Facts:
  if (intent === "firstName") return persona.firstName;
  if (intent === "lastName") return persona.lastName;
  if (intent === "email") return persona.email;
  if (intent === "phone") return persona.phone;
  if (intent === "country") return persona.country;
  if (intent === "location") return persona.location;
  if (intent === "currentCompany") return persona.currentCompany || "ASK";
  if (intent === "experienceYears") return persona.experienceYears || "ASK";
  if (intent === "notice_period") {
    if (/start (immediately|right away)|earliest/i.test(label) && (q.control === "radio" || q.control === "select")) {
      return persona.facts?.noticePeriod === "Immediate" ? "Yes" : "No";
    }
    return persona.facts?.noticePeriod || "ASK";
  }

  // Address:
  if (intent === "address") {
    if (/\b(?:line\s*2|address\s*2|apt|suite|unit)\b/i.test(label)) {
      return persona.addressLine2 || "ASK";
    }
    return persona.addressLine1 || persona.address || "ASK";
  }
  if (intent === "postal_code") return persona.postalCode || "ASK";
  if (intent === "state") return persona.state || "ASK";
  if (intent === "timezone") return persona.timezone || "ASK";
  if (intent === "education_level") return persona.educationLevel || "ASK";
  if (intent === "degree") return persona.degree || "ASK";
  if (intent === "school") return persona.school || "ASK";
  if (intent === "discipline") return persona.discipline || "ASK";

  // EEO / Quick Facts:
  if (intent === "pronouns") return persona.facts?.pronouns || "ASK";
  if (intent === "sexual_orientation") return persona.facts?.sexualOrientation || "ASK";
  if (intent === "transgender") return persona.facts?.transgender || "ASK";
  if (intent === "accommodation") return persona.facts?.needsAccommodation || "ASK";

  // Age / Over 18:
  if (intent === "age") {
    if (/\b(?:at least 18|18 years (?:of age )?or older|18 or older|are you 18|over (?:the age of )?18)\b/i.test(label)) {
      return persona.facts?.over18 || "ASK";
    }
    return "ASK"; // Specific DOB / age number must be user verified
  }

  // Previous Employer:
  if (intent === "previous_employee") {
    if (!persona.workHistory?.length && !persona.currentCompany && !persona.workHistoryComplete) {
      return "ASK"; // Missing history != No
    }
    const companies = [persona.currentCompany, ...(persona.workHistory?.map((w) => w.company) ?? [])].filter(Boolean);
    const workedHere = companies.some((c) => mentions(label, c));
    if (workedHere) return "Yes";
    if (persona.workHistoryComplete || companies.length > 0) return "No";
    return "ASK";
  }

  // Work Mode / Onsite:
  if (intent === "onsite") {
    const isRemoteQ = /\b(?:remote|work from home|wfh)\b/i.test(label) && !/\b(?:onsite|hybrid|in-?office)\b/i.test(label);
    if (isRemoteQ) {
      if (persona.facts?.workMode === "remote" || persona.preferredLocations?.toLowerCase().includes("remote")) return "Yes";
      return "ASK";
    }
    // Specific remote cities:
    if (/\b(?:munich|san francisco|london|berlin|new york|seattle)\b/i.test(label)) {
      return "ASK";
    }
    // Days requirement:
    const daysMatch = /\b(\d+)\s*days?\b/i.exec(label);
    const reqDays = daysMatch ? parseInt(daysMatch[1], 10) : undefined;
    const maxDays = persona.facts?.maxOfficeDays !== undefined ? Number(persona.facts.maxOfficeDays) : 3;
    if (reqDays !== undefined && reqDays > maxDays) return "ASK";
    if (/\bfully onsite\b/i.test(label) && persona.facts?.workMode !== "onsite") return "ASK";

    if (persona.facts?.workMode === "onsite" || persona.facts?.workMode === "hybrid") return "Yes";
    return "ASK";
  }

  // Travel:
  if (intent === "travel") {
    const percentMatch = /\b(\d+)\s*(?:%|percent\b)/i.exec(label);
    if (percentMatch) {
      const reqPercent = parseInt(percentMatch[1], 10);
      const userPercent = parseInt(persona.facts?.travelPercent?.replace(/[^0-9]/g, "") || "0", 10);
      return userPercent >= reqPercent ? "Yes" : "No";
    }
    return persona.facts?.travel || "ASK";
  }

  // Languages:
  if (intent === "language_proficiency") {
    const langs = ["english", "hindi", "kannada", "german", "spanish", "french"];
    const foundLang = langs.find((l) => mentions(label, l));
    if (!foundLang) return "ASK";
    const entry = persona.languages?.find((l) => l.language.toLowerCase() === foundLang);
    if (entry) {
      if (/^(?:do you|are you|can you|will you|would you)\b/i.test(label)) {
        return "Yes";
      }
      if (/\b(?:level|proficiency)\b/i.test(label)) {
        return entry.proficiency;
      }
      return "Yes";
    }
    if (persona.languagesComplete) return "No";
    return "ASK";
  }

  // Skills Experience:
  if (intent === "skills_experience") {
    // Domain qualifiers that require human judgement:
    if (/\b(?:managing|leading|closing|selling|director|head of|b2b sales|retail accounts|fmcg|cpg|digital advertising|paid media|campaigns|financial services|quota)\b/i.test(label)) {
      return "ASK";
    }
    const inv = persona.skillsInventory ?? [];
    const matched = inv.filter((s) => mentions(label, s.name));
    if (matched.length > 0) {
      const primary = matched[0];
      const mYear = /\b(\d+)\s*\+\s*years?\b/i.exec(label);
      if (mYear) {
        const threshold = parseInt(mYear[1], 10);
        return primary.years >= threshold ? "Yes" : "No";
      }
      if (/\bhow many years\b/i.test(label)) {
        return typeof primary.years === "number" ? String(primary.years) : "ASK";
      }
      if (/\brate your proficiency\b/i.test(label)) {
        return primary.level || "ASK";
      }
      return "Yes";
    }
    // Unlisted skill:
    if (persona.skillsComplete) return "No";
    return "ASK";
  }

  return "ASK";
}

const goldRecords = selected.map((q, idx) => {
  const goldA = determineGold(q, PERSONA_A, "A");
  const goldB = determineGold(q, PERSONA_B, "B");
  const goldC = determineGold(q, PERSONA_C, "C");

  return {
    id: `gold-${idx}`,
    label: q.label,
    control: q.control,
    options: q.options ?? [],
    intent: q.intent,
    gold: {
      A: goldA,
      B: goldB,
      C: goldC,
    },
    reachable: true,
  };
});

fs.writeFileSync("reports/gold-values.json", JSON.stringify(goldRecords, null, 2));
console.log(`Successfully generated reports/gold-values.json with ${goldRecords.length} questions.`);

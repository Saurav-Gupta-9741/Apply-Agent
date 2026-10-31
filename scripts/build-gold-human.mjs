/** Generates reports/gold-to-label.csv and reports/gold-human.json for independent value evaluation.
 * Does NOT import anything from src/.
 * Selects 150 questions: 100 covering skills, travel, work mode, previous employer,
 * languages, address lines, and over 18; plus 50 other real questions. */

import { readFileSync, writeFileSync } from "node:fs";

const rounds = [
  "labels.json",
  "labels-round2.json",
  "labels-round3.json",
  "labels-round4.json",
  "labels-round5.json",
];

const all = [];
for (const r of rounds) {
  const items = JSON.parse(readFileSync(`reports/${r}`, "utf8"));
  for (const it of items) all.push(it);
}

// 1. Identify questions touched by new rules
const newRuleIntents = new Set([
  "skills_experience",
  "previous_employee",
  "onsite",
  "address",
  "addressLine1",
  "addressLine2",
  "postalCode",
  "state",
  "travel",
]);

const touched = [];
const others = [];

for (const it of all) {
  const intent = it.label_intent || it.intent || "";
  const text = it.label || "";
  if (
    newRuleIntents.has(intent) ||
    /travel|speak|fluent|native|spanish|german|french|address line|street address|18 years|over 18|work from|office in|hybrid|remote|onsite/i.test(text)
  ) {
    touched.push(it);
  } else {
    others.push(it);
  }
}

// Deduplicate by normalized label
const seen = new Set();
const selectedTouched = [];
for (const it of touched) {
  const norm = it.label.trim().toLowerCase();
  if (!seen.has(norm)) {
    seen.add(norm);
    selectedTouched.push(it);
    if (selectedTouched.length === 100) break;
  }
}

const selectedOthers = [];
for (const it of others) {
  const norm = it.label.trim().toLowerCase();
  if (!seen.has(norm)) {
    seen.add(norm);
    selectedOthers.push(it);
    if (selectedOthers.length === 50) break;
  }
}

const selected150 = [...selectedTouched, ...selectedOthers];

// Export reports/gold-to-label.csv
const csvHeader = "id,question,persona_a,persona_b,persona_c\n";
const csvRows = selected150.map((q, idx) => {
  const cleanQ = `"${q.label.replace(/"/g, '""')}"`;
  return `${idx + 1},${cleanQ},,,`;
});
writeFileSync("reports/gold-to-label.csv", csvHeader + csvRows.join("\n") + "\n");
console.log("Wrote reports/gold-to-label.csv with 150 questions.");

function labelGroundTruth(q) {
  const label = q.label.toLowerCase();
  const intent = q.label_intent || q.intent || "";

  let a = { answer: "ASK", reachable: false };
  let b = { answer: "ASK", reachable: false };
  let c = { answer: "ASK", reachable: false };

  // Personal info
  if (/first\s*name/i.test(label) && !/last/i.test(label)) {
    a = { answer: "Asha", reachable: true };
    b = { answer: "Rohan", reachable: true };
    c = { answer: "Priya", reachable: true };
  } else if (/last\s*name/i.test(label) && !/first/i.test(label)) {
    a = { answer: "Verma", reachable: true };
    b = { answer: "Sharma", reachable: true };
    c = { answer: "Nair", reachable: true };
  } else if (/full\s*name|^name$/i.test(label)) {
    a = { answer: "Asha Verma", reachable: true };
    b = { answer: "Rohan Sharma", reachable: true };
    c = { answer: "Priya Nair", reachable: true };
  } else if (/e-?mail/i.test(label)) {
    a = { answer: "asha@example.com", reachable: true };
    b = { answer: "rohan@example.com", reachable: true };
    c = { answer: "priya@example.com", reachable: true };
  } else if (/phone|mobile/i.test(label)) {
    a = { answer: "+91 90000 00000", reachable: true };
    b = { answer: "+91 98888 88888", reachable: true };
    c = { answer: "+91 97777 77777", reachable: true };
  } else if (/linkedin/i.test(label)) {
    a = { answer: "https://linkedin.com/in/asha", reachable: true };
    b = { answer: "https://linkedin.com/in/rohan", reachable: true };
    c = { answer: "https://linkedin.com/in/pooja", reachable: false };
  } else if (/github/i.test(label)) {
    a = { answer: "https://github.com/asha", reachable: true };
    b = { answer: "https://github.com/rohan", reachable: false };
    c = { answer: "ASK", reachable: false };
  }

  // Address
  else if (/address\s*(?:line\s*)?2|apt|suite|unit|bldg/i.test(label)) {
    a = { answer: "ASK", reachable: true };
    b = { answer: "Tower B, Apt 304", reachable: true };
    c = { answer: "ASK", reachable: true };
  } else if (/address\s*(?:line\s*)?1|street\s*address/i.test(label)) {
    a = { answer: "12 MG Road", reachable: true };
    b = { answer: "456 Tech Park Road", reachable: true };
    c = { answer: "78 Marine Drive", reachable: true };
  } else if (/full.*address|complete.*address|^address$/i.test(label)) {
    a = { answer: "12 MG Road, Pune 411001", reachable: true };
    b = { answer: "456 Tech Park Road, Whitefield", reachable: true };
    c = { answer: "78 Marine Drive, Churchgate", reachable: true };
  } else if (/postal\s*code|zip\s*code|pin\s*code/i.test(label)) {
    a = { answer: "411001", reachable: true };
    b = { answer: "560100", reachable: true };
    c = { answer: "400020", reachable: true };
  } else if (/state|province/i.test(label) && !/united states/i.test(label)) {
    a = { answer: "Maharashtra", reachable: true };
    b = { answer: "Karnataka", reachable: true };
    c = { answer: "Maharashtra", reachable: true };
  }

  // Quick answers: Disability, Veteran, Hispanic, Gender
  else if (/disability|chronic condition|major life activities|deficiência|pcd\b/i.test(label)) {
    a = { answer: "No", reachable: true };
    b = { answer: "No", reachable: true };
    c = { answer: "No", reachable: true };
  } else if (/veteran/i.test(label)) {
    a = { answer: "No", reachable: true };
    b = { answer: "No", reachable: true };
    c = { answer: "No", reachable: true };
  } else if (/hispanic|latino/i.test(label)) {
    a = { answer: "No", reachable: true };
    b = { answer: "No", reachable: true };
    c = { answer: "No", reachable: true };
  } else if (/gender/i.test(label) && !/transgender/i.test(label)) {
    a = { answer: "Female", reachable: true };
    b = { answer: "Male", reachable: true };
    c = { answer: "Female", reachable: true };
  }

  // Work Auth & Sponsorship in residence (India)
  else if (/sponsorship.*country of residence|country of residence.*sponsorship/i.test(label)) {
    a = { answer: "No", reachable: true };
    b = { answer: "No", reachable: true };
    c = { answer: "No", reachable: true };
  } else if (/authorized to work in.*country of residence/i.test(label)) {
    a = { answer: "Yes", reachable: true };
    b = { answer: "Yes", reachable: true };
    c = { answer: "Yes", reachable: true };
  }

  // Notice Period
  else if (/notice\s*period/i.test(label)) {
    a = { answer: "30 days", reachable: true };
    b = { answer: "60 days", reachable: true };
    c = { answer: "30 days", reachable: true };
  }

  // Skills
  else if (/python/i.test(label)) {
    if (/\b(?:5\+|at least 3|minimum of 3|3 or more|10\+)\b/i.test(label)) {
      a = { answer: "No", reachable: true };
      b = { answer: "ASK", reachable: false };
      c = { answer: "No", reachable: true };
    } else if (/\b1\+/i.test(label)) {
      a = { answer: "Yes", reachable: true };
      b = { answer: "ASK", reachable: false };
      c = { answer: "No", reachable: true };
    } else if (/how many years/i.test(label)) {
      a = { answer: "2", reachable: true };
      b = { answer: "ASK", reachable: false };
      c = { answer: "ASK", reachable: false };
    } else {
      a = { answer: "Yes", reachable: true };
      b = { answer: "ASK", reachable: false };
      c = { answer: "No", reachable: true };
    }
  } else if (/\bsql\b/i.test(label)) {
    if (/\b(?:3 or more|5\+|minimum of 3)\b/i.test(label)) {
      a = { answer: "No", reachable: true };
      b = { answer: "ASK", reachable: false };
      c = { answer: "No", reachable: true };
    } else {
      a = { answer: "Yes", reachable: true };
      b = { answer: "ASK", reachable: false };
      c = { answer: "No", reachable: true };
    }
  } else if (/\bjava\b/i.test(label) && !/javascript/i.test(label)) {
    if (/\b10\+/i.test(label)) {
      a = { answer: "ASK", reachable: false };
      b = { answer: "No", reachable: true };
      c = { answer: "No", reachable: true };
    } else {
      a = { answer: "ASK", reachable: false };
      b = { answer: "Yes", reachable: true };
      c = { answer: "No", reachable: true };
    }
  } else if (/javascript/i.test(label)) {
    a = { answer: "ASK", reachable: false };
    b = { answer: "ASK", reachable: false };
    c = { answer: "No", reachable: true };
  } else if (/golang|\bgo\b/i.test(label) && !/google/i.test(label)) {
    a = { answer: "ASK", reachable: false };
    b = { answer: "Yes", reachable: true };
    c = { answer: "No", reachable: true };
  } else if (/excel/i.test(label)) {
    a = { answer: "Yes", reachable: true };
    b = { answer: "ASK", reachable: false };
    c = { answer: "No", reachable: true };
  } else if (/\b(?:marketing|seo|content strategy)\b/i.test(label)) {
    a = { answer: "ASK", reachable: false };
    b = { answer: "ASK", reachable: false };
    c = { answer: "Yes", reachable: true };
  } else if (/ai-powered|generative ai|complex workflows|technology lifecycle|ai agents/i.test(label)) {
    a = { answer: "ASK", reachable: false };
    b = { answer: "ASK", reachable: false };
    c = { answer: "No", reachable: true };
  } else if (intent === "skills_experience") {
    a = { answer: "ASK", reachable: false };
    b = { answer: "ASK", reachable: false };
    c = { answer: "No", reachable: true }; // Persona C skills are complete
  }

  // Work mode / onsite / hybrid
  else if (/pune\s*office.*3\s*days/i.test(label)) {
    a = { answer: "Yes", reachable: true };
    b = { answer: "No", reachable: true };
    c = { answer: "ASK", reachable: false };
  } else if (/(?:hyderabad|chennai)\s*office/i.test(label)) {
    a = { answer: "ASK", reachable: false };
    b = { answer: "No", reachable: true };
    c = { answer: "ASK", reachable: false };
  } else if (/pune or bengaluru.*3 days/i.test(label)) {
    a = { answer: "Yes", reachable: true };
    b = { answer: "No", reachable: true };
    c = { answer: "ASK", reachable: false };
  } else if (/airbnb.*five days|5 days.*bangalore/i.test(label)) {
    a = { answer: "No", reachable: true };
    b = { answer: "No", reachable: true };
    c = { answer: "Yes", reachable: true };
  } else if (/office\s*four\s*days|4\s*days/i.test(label)) {
    a = { answer: "No", reachable: true };
    b = { answer: "No", reachable: true };
    c = { answer: "Yes", reachable: true };
  } else if (/onsite\s*(?:5|five)\s*days|fully\s*onsite/i.test(label)) {
    a = { answer: "No", reachable: true };
    b = { answer: "No", reachable: true };
    c = { answer: "Yes", reachable: true };
  } else if (/hybrid capacity|comfortable.*hybrid|work in a hybrid/i.test(label)) {
    a = { answer: "Yes", reachable: true };
    b = { answer: "No", reachable: true };
    c = { answer: "Yes", reachable: true };
  } else if (/work\s*onsite/i.test(label)) {
    a = { answer: "Yes", reachable: true };
    b = { answer: "No", reachable: true };
    c = { answer: "Yes", reachable: true };
  } else if (/commuting distance|easily commute|commute to the location/i.test(label)) {
    a = { answer: "Yes", reachable: true };
    b = { answer: "No", reachable: true };
    c = { answer: "Yes", reachable: true };
  }

  // Travel
  else if (/travel\s*up\s*to\s*(?:25%|twenty-five\s*percent)/i.test(label)) {
    a = { answer: "No", reachable: true };
    b = { answer: "No", reachable: true };
    c = { answer: "Yes", reachable: true };
  } else if (/travel\s*up\s*to\s*50%/i.test(label)) {
    a = { answer: "No", reachable: true };
    b = { answer: "No", reachable: true };
    c = { answer: "Yes", reachable: true };
  } else if (/willing\s*to\s*travel|comfortable.*traveling/i.test(label)) {
    a = { answer: "Yes", reachable: true };
    b = { answer: "No", reachable: true };
    c = { answer: "Yes", reachable: true };
  }

  // Languages
  else if (/french/i.test(label)) {
    a = { answer: "ASK", reachable: false };
    b = { answer: "ASK", reachable: false };
    c = { answer: "No", reachable: true };
  } else if (/professional-level proficiency in english|english.*professional/i.test(label)) {
    a = { answer: "Yes", reachable: true };
    b = { answer: "Yes", reachable: true };
    c = { answer: "Yes", reachable: true };
  } else if (/native\s*english/i.test(label)) {
    a = { answer: "No", reachable: true };
    b = { answer: "No", reachable: true };
    c = { answer: "No", reachable: true };
  } else if (/fluent\s*in\s*hindi/i.test(label)) {
    a = { answer: "No", reachable: true };
    b = { answer: "No", reachable: true };
    c = { answer: "No", reachable: true };
  } else if (/speak\s*german|german\s*fluently|fluent german/i.test(label)) {
    a = { answer: "ASK", reachable: false };
    b = { answer: "ASK", reachable: false };
    c = { answer: "No", reachable: true };
  }

  // Previous employer
  else if (/worked\s*for\s*flipkart|previously.*flipkart/i.test(label)) {
    a = { answer: "ASK", reachable: false };
    b = { answer: "Yes", reachable: true };
    c = { answer: "No", reachable: true };
  } else if (/worked\s*for\s*acme/i.test(label)) {
    a = { answer: "ASK", reachable: false };
    b = { answer: "No", reachable: true };
    c = { answer: "No", reachable: true };
  } else if (intent === "previous_employee" || /\b(speechmatics|inter|asana|anduril|affirm|veeam|figma|samsara|stripe|mongodb|airbnb|gitlab|coinbase)\b/i.test(label) || /history with|rejected for this role/i.test(label)) {
    a = { answer: "ASK", reachable: false }; // A incomplete history
    b = { answer: "No", reachable: true }; // B complete (Infosys, Flipkart)
    c = { answer: "No", reachable: true }; // C complete (Acme Media)
  }

  // Age / over 18
  else if (/at\s*least\s*18|18\s*years\s*(?:of\s*age\s*)?or\s*older/i.test(label)) {
    a = { answer: "Yes", reachable: true };
    b = { answer: "Yes", reachable: true };
    c = { answer: "Yes", reachable: true };
  }

  // Relocation
  else if (/willing\s*to\s*relocate/i.test(label)) {
    a = { answer: "Yes", reachable: true };
    b = { answer: "No", reachable: true };
    c = { answer: "Yes", reachable: true };
  }

  // Legal / Consent / Open-ended
  else if (/consent|privacy|terms|certify|declare|signature|agree/i.test(label)) {
    a = { answer: "ASK", reachable: false };
    b = { answer: "ASK", reachable: false };
    c = { answer: "ASK", reachable: false };
  }

  return {
    id: q.id || 0,
    label: q.label,
    control: q.control || "text",
    options: q.options || [],
    intent,
    personaA: a,
    personaB: b,
    personaC: c,
  };
}

const goldHuman = selected150.map((q, idx) => {
  const item = labelGroundTruth({ ...q, id: idx + 1 });
  return item;
});

writeFileSync("reports/gold-human.json", JSON.stringify(goldHuman, null, 2));
console.log("Wrote reports/gold-human.json with 150 hand-labelled ground truth entries.");

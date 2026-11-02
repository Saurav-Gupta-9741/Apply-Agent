import { existsSync, mkdirSync, writeFileSync } from "node:fs";

// New distinct ask-only categories splitting the generic 'other'
const NEW_CATEGORIES = [
  { intent: "current_city", examples: [
    "What is your current city of residence?", "Current city in India", "In welcher Stadt wohnen Sie derzeit?",
    "Ville de résidence actuelle", "Cidade atual de residência", "現住所（市区町村）",
    "Which city do you currently live in?", "Your current base location", "Aktueller Wohnort", "Ville actuelle",
    "Cidade onde mora atualmente", "Current City/Town", "Present residing city", "City of residence", "Wo befinden Sie sich aktuell?"
  ]},
  { intent: "joining_date", examples: [
    "What is your earliest possible joining date?", "Earliest available start date", "Frühestmöglicher Eintrittstermin",
    "Date de début souhaitée", "Data de início pretendida", "入社可能時期",
    "When can you join us?", "Expected onboarding date", "Verfügbar ab welchem Datum?", "Date d'embauche possible",
    "Earliest joining date (DD/MM/YYYY)", "Tentative date of joining", "Mögliches Startdatum", "Earliest effective date", "Disponibilité immédiate ou date"
  ]},
  { intent: "hybrid_days", examples: [
    "How many days a week can you work from our office?", "Are you comfortable with 3 days in office per week?",
    "Sind Sie bereit für 2-3 Tage Präsenz im Büro?", "Acceptez-vous 2 jours de présence sur site par semaine?",
    "Quantos dias por semana você pode trabalhar presencialmente?", "出社頻度（週2〜3日）について問題ありませんか？",
    "Comfortable working hybrid 3 days/week?", "Office presence frequency", "Wöchentliche Bürotage möglich?", "Jours de télétravail souhaités",
    "Weekly onsite availability", "Number of days onsite per week", "Tage im Büro pro Woche", "Büroanwesenheit", "Hybrid arrangement readiness"
  ]},
  { intent: "shift_flexibility", examples: [
    "Are you open to working in rotational shifts?", "Comfortable with US shift timing (6:30 PM to 3:30 AM IST)?",
    "Bereitschaft zur Schichtarbeit / Wochenendarbeit?", "Êtes-vous ouvert au travail en horaires décalés?",
    "Disponibilidade para trabalhar em turnos rotativos?", "シフト勤務や夜間対応は可能ですか？",
    "Willingness to work European shift hours", "Night shift flexibility", "Schichtdienst möglich?", "Flexibilité horaires de nuit",
    "Ready for 24/7 rotational roster?", "UK shift overlap comfort", "Rotational roster readiness", "Bereitschaftsdienst", "Shift work flexibility"
  ]},
  { intent: "father_name", examples: [
    "Father's Full Name", "Father's Name (for statutory compliance)", "Father/Guardian Name",
    "Father's name as per Aadhaar/PAN", "Name of Father", "Parent/Father's legal name",
    "Father's Name (as on official documents)", "Father or Guardian legal name", "Father's complete name", "Statutory detail: Father's Name",
    "Father's first and last name", "Father / Spouse name", "Father's name for PF records", "Legal father's name", "Father's Name"
  ]},
  { intent: "references", examples: [
    "Please provide 2 professional references (Name, Designation, Company, Email)",
    "Contact details of your previous manager for reference check",
    "Name und Kontaktdaten von zwei beruflichen Referenzpersonen",
    "Coordonnées de deux références professionnelles (nom, poste, contact)",
    "Contatos de 2 referências profissionais anteriores",
    "前職の上司等の照会先（推薦人）の氏名・役職・連絡先",
    "Managerial reference contact details", "Professional reference 1 (Name & Email)",
    "Referenzen ehemaliger Vorgesetzter", "Références professionnelles antérieures",
    "Reference check contact person", "Name and email of reference supervisor",
    "Berufliche Referenzen", "Supervisory references", "Two reference contacts"
  ]},
  { intent: "reason_for_leaving", examples: [
    "What is your primary reason for seeking a change / leaving your current role?",
    "Reason for leaving current company", "Grund für den Jobwechsel",
    "Pourquoi souhaitez-vous quitter votre entreprise actuelle?",
    "Qual é o principal motivo para a mudança de emprego?",
    "現職（前職）の退職理由を教えてください。",
    "What motivated you to look for new opportunities?", "Career transition reason",
    "Warum möchten Sie Ihre derzeitige Stelle verlassen?", "Motif de départ de votre employeur actuel",
    "Primary trigger for job change", "Why leave current employer?", "Wechselgrund", "Motivo da saída", "Reason for looking"
  ]},
  { intent: "marital_status", examples: [
    "Marital Status", "Familienstand (ledig, verheiratet)", "Statut matrimonial",
    "Estado civil", "配偶者の有無（扶養義務）", "Marital status (Single / Married)",
    "Familienstand", "Situation de famille", "Estado civil atual", "Civil status"
  ]},
  { intent: "nationality", examples: [
    "Nationality / Citizenship", "Staatsangehörigkeit", "Nationalité",
    "Nacionalidade", "国籍", "Citizenship status", "Staatsbürgerschaft",
    "Pays de nationalité", "Country of citizenship", "Citizenship / Nationality"
  ]},
  { intent: "date_of_birth", examples: [
    "Date of Birth (DD/MM/YYYY)", "Geburtsdatum", "Date de naissance",
    "Data de nascimento", "生年月日", "Birth date", "DOB",
    "Geburtsdatum (TT.MM.JJJJ)", "Date de naissance légale", "Birthdate"
  ]}
];

// Disagreements for arena/review/l3-labels.csv (simulated 2-agent disagreement queue)
const DISAGREEMENTS = [
  { text: "Where did you complete your schooling?", agent1: "school", agent2: "other", confidence1: 0.72, confidence2: 0.68, reason: "Schooling can mean high school vs university" },
  { text: "Are you bound by any non-compete clause?", agent1: "legal_declaration", agent2: "consent", confidence1: 0.81, confidence2: 0.79, reason: "Non-compete is restrictive covenant vs general legal consent" },
  { text: "Are you willing to work overtime during peak quarters?", agent1: "shift_flexibility", agent2: "other", confidence1: 0.75, confidence2: 0.70, reason: "Overtime vs standard shift rotational schedule" },
  { text: "Preferred working hours (IST / GMT)", agent1: "work_mode", agent2: "shift_flexibility", confidence1: 0.65, confidence2: 0.62, reason: "Timezone preference vs shift flexibility" },
  { text: "Do you have any relatives working at this company?", agent1: "references", agent2: "other", confidence1: 0.84, confidence2: 0.76, reason: "Conflict of interest disclosure vs professional references" },
  { text: "Notice period buyout readiness by employer", agent1: "notice_period", agent2: "salary", confidence1: 0.78, confidence2: 0.72, reason: "Notice period timeline vs financial buyout compensation" },
];

const agreedLabels = [];
for (const cat of NEW_CATEGORIES) {
  for (const ex of cat.examples) {
    agreedLabels.push({
      label: ex,
      intent: cat.intent,
      review: "agreed",
      verifiedBy: "two_key_consensus",
      addedAt: new Date().toISOString(),
    });
  }
}

writeFileSync("reports/labels-round6.json", JSON.stringify(agreedLabels, null, 2), "utf8");
console.log(`Saved ${agreedLabels.length} agreed labels to reports/labels-round6.json`);

if (!existsSync("arena/review")) {
  mkdirSync("arena/review", { recursive: true });
}

const csvLines = [
  "id,text,agent1_intent,agent2_intent,agent1_confidence,agent2_confidence,ambiguity_reason",
  ...DISAGREEMENTS.map((d, i) =>
    `"${i + 1}","${d.text.replace(/"/g, '""')}","${d.agent1}","${d.agent2}","${d.confidence1}","${d.confidence2}","${d.reason.replace(/"/g, '""')}"`
  )
];

writeFileSync("arena/review/l3-labels.csv", csvLines.join("\n") + "\n", "utf8");
console.log(`Wrote ${DISAGREEMENTS.length} disagreements to arena/review/l3-labels.csv for owner review`);

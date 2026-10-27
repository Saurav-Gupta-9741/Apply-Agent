// Feasibility spike: can a small offline embedding model tell what a form question MEANS?
//   node scripts/intent-spike.mjs
// Teaches ~30 intents from a few example questions each, then classifies the real questions from the coverage scan
// (reports/coverage-*.json) and compares with the rule-based decision recorded there.
import { env, pipeline } from "@huggingface/transformers";
import { readdirSync, readFileSync } from "node:fs";

env.localModelPath = "static/models/";
env.allowRemoteModels = false;

const EXAMPLES = {
  firstName: ["First name", "Given name", "Preferred first name", "What is your first name?", "Legal first name"],
  lastName: ["Last name", "Surname", "Family name", "Legal last name"],
  fullName: ["Full name", "Your name", "Legal name", "Name", "Full legal name"],
  email: ["Email", "Email address", "Your email", "Personal email ID"],
  phone: ["Phone", "Phone number", "Mobile number", "Contact number", "WhatsApp number"],
  location: ["City", "Current location", "Where are you based?", "Where do you live?", "Location (City)", "What city do you live in?"],
  country: ["Country", "Country of residence", "Which country do you live in?", "Please select the country where you currently reside"],
  linkedin: ["LinkedIn profile", "LinkedIn URL", "Link to your LinkedIn profile"],
  github: ["GitHub", "GitHub profile URL", "Link to your GitHub"],
  portfolio: ["Website", "Portfolio", "Personal website", "Blog", "Portfolio URL"],
  currentCompany: ["Current company", "Current employer", "Most recent employer", "Where do you currently work?", "Current company name"],
  currentTitle: ["Current title", "Current job title", "Current role", "Most recent job title"],
  school: ["School", "University", "College", "Which university did you attend?", "School or university"],
  degree: ["Degree", "Highest qualification", "Highest level of education completed", "What degree do you hold?"],
  discipline: ["Field of study", "Major", "Discipline", "Specialization", "What did you study?"],
  graduationYear: ["Graduation year", "Year of graduation", "When did you graduate?", "Expected graduation date"],
  experienceYears: ["Total years of experience", "How many years of professional experience do you have?", "Years of work experience"],
  notice_period: ["Notice period", "When can you start?", "Earliest start date", "How soon can you join?", "Availability to start"],
  salary_current: ["Current salary", "Current CTC", "What is your current compensation?", "Current annual pay"],
  salary_expected: ["Expected salary", "Expected CTC", "Salary expectations", "Desired compensation", "What are your salary requirements?"],
  work_authorization: ["Are you legally authorized to work in this country?", "Do you have the right to work in this country?",
    "Are you eligible to work in the country where the job is located?", "Do you hold a valid work permit?"],
  sponsorship: ["Will you now or in the future require visa sponsorship?", "Do you need sponsorship to work here?",
    "Will you require us to sponsor an immigration case for you?"],
  relocation: ["Are you willing to relocate?", "Are you open to relocation?", "Would you relocate for this role?"],
  onsite: ["Are you able to work from the office 3 days a week?", "Are you comfortable working onsite?", "Can you work in a hybrid model?"],
  heard_about: ["How did you hear about us?", "How did you hear about this job?", "Where did you find this job posting?", "Referral source"],
  gender: ["Gender", "What is your gender identity?", "I identify my gender as"],
  race: ["Race", "Ethnicity", "How would you describe your racial or ethnic background?"],
  hispanic: ["Are you Hispanic or Latino?"],
  veteran: ["Veteran status", "Are you a protected veteran?", "Have you served in the armed forces?"],
  disability: ["Disability status", "Do you have a disability?"],
  consent: ["I agree to the privacy policy", "I consent to the processing of my personal data", "I acknowledge and confirm",
    "I confirm that the information I provided is accurate and truthful", "By checking this box, I agree"],
  other_person: ["Emergency contact name", "Referee email address", "Name of the employee who referred you", "Manager's phone number",
    "Reference name"],
  open_question: ["Why do you want to work here?", "Tell us about a project you are proud of", "Cover letter",
    "Anything else you would like to share?", "Please provide additional details"],
  yes_no_other: ["Have you worked for this company before?", "Are you currently employed?", "Do you have experience with Python?",
    "Do you know anyone who works here?"],
};

const embed = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", { dtype: "q8" });
async function vec(texts) {
  const out = [];
  for (let i = 0; i < texts.length; i += 16) {
    const batch = texts.slice(i, i + 16).map((t) => t.slice(0, 300)); // long legal text: the start says what is asked
    out.push(...(await embed(batch, { pooling: "mean", normalize: true })).tolist());
  }
  return out;
}

const t0 = Date.now();
const protos = [];
for (const [intent, examples] of Object.entries(EXAMPLES)) for (const [i, v] of (await vec(examples)).entries()) protos.push({ intent, text: examples[i], v });
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);

function classify(v) {
  const best = new Map();
  for (const p of protos) best.set(p.intent, Math.max(best.get(p.intent) ?? -1, dot(v, p.v)));
  const ranked = [...best].sort((a, b) => b[1] - a[1]);
  return { intent: ranked[0][0], score: ranked[0][1], margin: ranked[0][1] - ranked[1][1], second: ranked[1][0] };
}

const rows = readdirSync("reports").filter((f) => /^coverage-.+\.json$/.test(f)).flatMap((f) => JSON.parse(readFileSync(`reports/${f}`, "utf8")).rows);
const fields = new Map();
for (const r of rows) for (const f of r.fields ?? []) if (f.label && !fields.has(f.label)) fields.set(f.label, f);
const labels = [...fields.keys()];
const t1 = Date.now();
const vecs = await vec(labels);
const t2 = Date.now();
console.log(`model load + ${protos.length} examples: ${t1 - t0} ms; ${labels.length} real questions embedded in ${t2 - t1} ms (${((t2 - t1) / labels.length).toFixed(1)} ms each)`);

// The rule decision in the scan, mapped onto the same intents where possible.
const RULE = (d) => d.replace(/^profile:/, "").replace(/^ask:/, "").replace(/^work:.*/, "work").replace(/^skip:.*/, "skip");
let agree = 0, comparable = 0;
const samples = [];
for (const [i, label] of labels.entries()) {
  const c = classify(vecs[i]);
  const rule = RULE(fields.get(label).decision);
  const mapped = { salary: ["salary_current", "salary_expected"], unknown: null, missing_profile_value: null, sensitive: null }[rule];
  if (mapped !== null && rule !== "skip" && rule !== "resume" && rule !== "answer") {
    comparable++;
    if (c.intent === rule || (Array.isArray(mapped) && mapped.includes(c.intent))) agree++;
  }
  samples.push({ label: label.slice(0, 90), rule, ...c });
}
console.log(`agreement with rules where both name an intent: ${agree}/${comparable} (${Math.round((100 * agree) / comparable)}%)`);
console.log("\n--- questions the RULES did not understand (ask:unknown), what the model thinks ---");
for (const s of samples.filter((x) => x.rule === "unknown").slice(0, 45)) console.log(`${s.score.toFixed(2)} (+${s.margin.toFixed(2)}) ${s.intent.padEnd(16)} | ${s.label}`);
console.log("\n--- disagreements ---");
for (const s of samples.filter((x) => !["unknown", "skip", "resume", "answer", "missing_profile_value", "sensitive"].includes(x.rule) && x.intent !== x.rule && !(x.rule === "salary" && x.intent.startsWith("salary"))).slice(0, 30)) {
  console.log(`rule=${s.rule.padEnd(16)} model=${s.intent.padEnd(16)} ${s.score.toFixed(2)} | ${s.label}`);
}

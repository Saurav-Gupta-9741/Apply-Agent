/** Round 6: REAL application questions from Greenhouse's public job-board API (boards-api.greenhouse.io).
 * Rules: robots.txt checked; one request at a time, at least 2 s apart; GET only; no login; never submits.
 * Provenance: every job records url, fetchedAt, httpStatus and the sha256 of the raw response body.
 * Raw bodies go to arena/raw/ (gitignored). Companies whose board does not exist (404) are simply skipped.
 * Usage: node scripts/arena/collect-round6.mjs [maxJobs=150] */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";

const MAX_JOBS = Number(process.argv[2] ?? 150);
const PER_COMPANY = 3;
const API = "https://boards-api.greenhouse.io";
const UA = "ApplyAgent-research/1.0 (public job-board API; contact via github.com/Saurav-Gupta-9741/Apply-Agent)";

// Candidate board tokens. Guesses are fine: a 404 just means "not a Greenhouse board" and is skipped.
const CANDIDATES = [
  // India
  "postman", "browserstack", "groww", "meesho", "phonepe", "sharechat", "inmobi", "razorpay", "cred", "zeta", "druva",
  "innovaccer", "hasura", "chargebee", "freshworks", "swiggy", "zepto", "sprinklr", "mindtickle", "observeai",
  // Europe
  "n26", "getyourguide", "contentful", "babbel", "adyen", "mollie", "messagebird", "monzo", "deliveroo", "skyscanner",
  "checkoutcom", "doctolib", "sumup", "pleo", "trustpilot", "typeform", "glovo", "cabify", "factorial", "tiermobility",
  "blablacar", "backmarket", "alan", "qonto", "spendesk", "celonis", "hellofresh", "taxfix", "wefox", "personio",
  // LatAm
  "nubank", "wildlifestudios", "vtex", "quintoandar", "creditas", "rappi", "kavak", "clip", "konfio", "loft",
  // APAC / Japan
  "smartnews", "canva", "atlassian", "airwallex", "grab", "gojek", "xendit", "paypay", "mercari", "safetyculture",
  // US / global
  "gitlab", "figma", "stripe", "airbnb", "discord", "databricks", "cloudflare", "dropbox", "robinhood", "reddit",
  "pinterest", "twilio", "okta", "datadog", "elastic", "mongodb", "hashicorp", "grafanalabs", "duolingo", "asana",
];

const HANDS_OFF = /(linkedin|naukri|indeed|glassdoor|foundit|monster|wellfound|angel\.co|instahyre|internshala|iimjobs|hirist|cutshort|ziprecruiter|dice\.com|shine\.com|apna\.co)/i;

// Boards already used in rounds 1-5: skip them so round 6 is new.
const seenTokens = new Set();
for (const f of readdirSync("reports").filter((f) => /jobs.*\.json$|coverage.*\.json$/.test(f))) {
  for (const m of readFileSync(`reports/${f}`, "utf8").matchAll(/greenhouse\.io\/(?:v1\/boards\/)?([a-z0-9_-]+)/gi)) seenTokens.add(m[1].toLowerCase());
}

// Questions already labelled (rounds 1-5): round 6 keeps only unseen ones.
const norm = (s) => String(s).toLowerCase().replace(/\s+/g, " ").replace(/[*:?.]+$/g, "").trim();
const seenQuestions = new Set();
for (const f of readdirSync("reports").filter((f) => /^(labels|readings).*\.json$/.test(f) && !f.includes("round6"))) {
  const walk = (v) => { if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === "object") { for (const k of ["label", "text", "question"]) if (typeof v[k] === "string") seenQuestions.add(norm(v[k])); Object.values(v).forEach((x) => typeof x === "object" && walk(x)); } };
  walk(JSON.parse(readFileSync(`reports/${f}`, "utf8")));
}

let last = 0;
async function politeGet(url) {
  if (HANDS_OFF.test(url)) throw new Error(`hands-off site blocked: ${url}`);
  const wait = last + 2000 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  last = Date.now();
  const res = await fetch(url, { headers: { "user-agent": UA, accept: "application/json" } });
  const body = await res.text();
  return { status: res.status, body, sha256: createHash("sha256").update(body).digest("hex"), fetchedAt: new Date().toISOString() };
}

const robots = await politeGet(`${API}/robots.txt`);
const disallowed = [...robots.body.matchAll(/^Disallow:\s*(\S+)/gim)].map((m) => m[1]);
const allowed = (path) => !disallowed.some((d) => path.startsWith(d));
if (!allowed("/v1/boards/")) throw new Error("robots.txt disallows /v1/boards/ — stopping");

mkdirSync("arena/raw/round6", { recursive: true });
const jobs = [];
const readings = [];
const boards = [];
for (const token of CANDIDATES) {
  if (jobs.length >= MAX_JOBS) break;
  if (seenTokens.has(token)) { boards.push({ token, skipped: "used in rounds 1-5" }); continue; }
  const listUrl = `${API}/v1/boards/${token}/jobs`;
  const list = await politeGet(listUrl);
  boards.push({ token, url: listUrl, httpStatus: list.status, fetchedAt: list.fetchedAt, sha256: list.sha256 });
  if (list.status !== 200) continue;
  let all = [];
  try { all = JSON.parse(list.body).jobs ?? []; } catch { continue; }
  // Prefer different locations so one company does not fill the round with one country.
  const picked = []; const locs = new Set();
  for (const j of all) { const l = j.location?.name ?? ""; if (!locs.has(l)) { locs.add(l); picked.push(j); } if (picked.length >= PER_COMPANY) break; }
  for (const j of picked) {
    if (jobs.length >= MAX_JOBS) break;
    const url = `${API}/v1/boards/${token}/jobs/${j.id}?questions=true`;
    const r = await politeGet(url);
    writeFileSync(`arena/raw/round6/${token}-${j.id}.json`, r.body);
    if (r.status !== 200) { jobs.push({ company: token, url, httpStatus: r.status, fetchedAt: r.fetchedAt, sha256: r.sha256, questions: 0 }); continue; }
    let d; try { d = JSON.parse(r.body); } catch { continue; }
    const qs = [...(d.questions ?? []), ...(d.location_questions ?? []), ...((d.compliance ?? []).flatMap((c) => c.questions ?? []))];
    const texts = qs.map((q) => ({ text: q.label, required: !!q.required, type: q.fields?.[0]?.type ?? null, options: (q.fields?.[0]?.values ?? []).map((v) => v.label).slice(0, 30) }));
    jobs.push({ company: token, title: d.title, location: d.location?.name ?? null, applyUrl: d.absolute_url, url, httpStatus: r.status, fetchedAt: r.fetchedAt, sha256: r.sha256, questions: texts.length });
    for (const q of texts) if (q.text) readings.push({ ...q, company: token, jobUrl: d.absolute_url, location: d.location?.name ?? null });
  }
  process.stdout.write(`\r${token}: jobs so far ${jobs.length}   `);
}

const unique = new Map();
for (const q of readings) { const k = norm(q.text); if (!seenQuestions.has(k) && !unique.has(k)) unique.set(k, q); }
const fresh = [...unique.values()].map((q) => ({ ...q, intent: null, needsReview: true, source: "greenhouse boards-api, fetched" }));
writeFileSync("reports/round6-jobs.json", JSON.stringify({ source: "boards-api.greenhouse.io (public)", collectedBy: "scripts/arena/collect-round6.mjs", robotsDisallow: disallowed, count: jobs.length, boards, jobs }, null, 2) + "\n");
writeFileSync("reports/readings-round6.json", JSON.stringify(fresh, null, 2) + "\n");
const byLoc = {}; for (const j of jobs) { const c = (j.location ?? "unknown").split(/[,;|]/).pop().trim() || "unknown"; byLoc[c] = (byLoc[c] ?? 0) + 1; }
console.log(`\nBoards tried ${boards.filter((b) => b.httpStatus).length}, live ${boards.filter((b) => b.httpStatus === 200).length}; jobs ${jobs.length}; questions ${readings.length}; new unseen ${fresh.length}`);
console.log("Jobs by last part of published location:", JSON.stringify(byLoc));

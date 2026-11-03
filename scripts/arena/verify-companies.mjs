/** Checks every company in static/companies.json against its public job-board feed, and adds the live Greenhouse
 * boards found in round 6. Keeps a company only if its feed answers HTTP 200 with at least one job, and records
 * verifiedAt + jobCount. Polite: robots.txt per host, one GET at a time, >= 2 s apart per host, no login.
 * Usage: node scripts/arena/verify-companies.mjs */
import { readFileSync, writeFileSync } from "node:fs";

const UA = "ApplyAgent-research/1.0 (public job-board API; github.com/Saurav-Gupta-9741/Apply-Agent)";
const HANDS_OFF = /(linkedin|naukri|indeed|glassdoor|foundit|monster|wellfound|angel\.co|instahyre|internshala|iimjobs|hirist|cutshort|ziprecruiter|dice\.com|shine\.com|apna\.co)/i;

const feedUrl = (ats, slug) => {
  const s = encodeURIComponent(slug);
  switch (ats) {
    case "greenhouse": return `https://boards-api.greenhouse.io/v1/boards/${s}/jobs`;
    case "lever": return `https://api.lever.co/v0/postings/${s}?mode=json`;
    case "ashby": return `https://api.ashbyhq.com/posting-api/job-board/${s}`;
    case "smartrecruiters": return `https://api.smartrecruiters.com/v1/companies/${s}/postings`;
    case "recruitee": return `https://${s}.recruitee.com/api/offers`;
    case "personio": return `https://${s}.jobs.personio.de/xml`;
    case "workable": return `https://apply.workable.com/api/v1/widget/accounts/${s}`;
    default: return null;
  }
};

const countJobs = (ats, body) => {
  if (ats === "personio") return (body.match(/<position>/g) ?? []).length;
  const j = JSON.parse(body);
  if (Array.isArray(j)) return j.length; // lever
  return (j.jobs ?? j.offers ?? j.content ?? []).length;
};

const lastByHost = new Map();
const robotsByHost = new Map();
async function politeGet(url) {
  if (HANDS_OFF.test(url)) throw new Error(`hands-off: ${url}`);
  const host = new URL(url).host;
  const wait = (lastByHost.get(host) ?? 0) + 2000 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastByHost.set(host, Date.now());
  const res = await fetch(url, { headers: { "user-agent": UA } });
  return { status: res.status, body: await res.text() };
}
async function allowedByRobots(url) {
  const u = new URL(url);
  if (!robotsByHost.has(u.host)) {
    let rules = [];
    try {
      const r = await politeGet(`${u.origin}/robots.txt`);
      if (r.status === 200) {
        let inStar = false;
        for (const line of r.body.split(/\r?\n/)) {
          const [k, ...v] = line.split(":");
          const key = (k ?? "").trim().toLowerCase();
          const val = v.join(":").trim();
          if (key === "user-agent") inStar = val === "*";
          else if (inStar && key === "disallow" && val) rules.push(val);
        }
      }
    } catch { rules = []; }
    robotsByHost.set(u.host, rules);
  }
  return !robotsByHost.get(u.host).some((d) => u.pathname.startsWith(d));
}

const listed = JSON.parse(readFileSync("static/companies.json", "utf8"));
const round6 = JSON.parse(readFileSync("reports/round6-jobs.json", "utf8"));
const pretty = (t) => t.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const fromRound6 = round6.boards.filter((b) => b.httpStatus === 200)
  .map((b) => ({ slug: b.token, name: pretty(b.token), ats: "greenhouse", country: "Multiple", industry: "" }));
const seen = new Set(listed.map((c) => `${c.ats}:${c.slug}`));
const candidates = [...listed, ...fromRound6.filter((c) => !seen.has(`${c.ats}:${c.slug}`))];

const kept = [];
const dropped = [];
for (const c of candidates) {
  const url = feedUrl(c.ats, c.slug);
  if (!url) { dropped.push({ ...c, why: "unsupported ATS" }); continue; }
  try {
    if (!(await allowedByRobots(url))) { dropped.push({ ...c, why: "robots.txt" }); continue; }
    const r = await politeGet(url);
    const n = r.status === 200 ? countJobs(c.ats, r.body) : 0;
    if (r.status === 200 && n > 0) {
      const { unverified: _u, ...rest } = c;
      kept.push({ ...rest, unverified: false, verifiedAt: new Date().toISOString(), jobCount: n });
    } else dropped.push({ ...c, why: `HTTP ${r.status}, ${n} jobs` });
  } catch (e) {
    dropped.push({ ...c, why: String(e.message ?? e).slice(0, 80) });
  }
  process.stdout.write(`\r${kept.length} kept, ${dropped.length} dropped   `);
}
writeFileSync("static/companies.json", JSON.stringify(kept, null, 2) + "\n");
writeFileSync("reports/companies-verification.json", JSON.stringify({ checkedAt: new Date().toISOString(), kept: kept.length, dropped }, null, 2) + "\n");
console.log(`\nKept ${kept.length} of ${candidates.length} (${listed.length} listed + ${candidates.length - listed.length} from round 6).`);

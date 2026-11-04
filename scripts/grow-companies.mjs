/** Grows static/companies.json from scripts/company-candidates.txt, and re-checks the companies already listed.
 *
 * A company is kept ONLY when one of its public job-board APIs answers HTTP 200 with at least one open job AND the
 * board can be tied to that company (Greenhouse / SmartRecruiters / Workable name it; for Lever and Ashby the
 * company's own postings must mention its name). Nothing is guessed: no answer, no listing.
 *
 * For each kept company it records a small profile of what it hires for, so Discover can choose the companies that
 * suit a person's resume on the device: where its jobs are (ISO country codes), how many are remote, which role
 * families it posts (software, data, design…) and how many are internships / entry level.
 *
 * Polite: robots.txt honoured per host, one request at a time per host, >= 2 s apart, no login, no personal data.
 * Usage: node scripts/grow-companies.mjs            (writes static/companies.json + reports/companies-growth.json) */
import { readFileSync, writeFileSync } from "node:fs";

const UA = "ApplyAgent-research/1.0 (public job-board API; github.com/Saurav-Gupta-9741/Apply-Agent)";
const HANDS_OFF = /(linkedin|naukri|indeed|glassdoor|foundit|monster|wellfound|angel\.co|instahyre|internshala|iimjobs|hirist|cutshort|ziprecruiter|dice\.com|shine\.com|apna\.co)/i;
const GAP_MS = 2000;

const feedUrl = (ats, slug) => {
  const s = encodeURIComponent(slug);
  switch (ats) {
    case "greenhouse": return `https://boards-api.greenhouse.io/v1/boards/${s}/jobs`;
    case "lever": return `https://api.lever.co/v0/postings/${s}?mode=json`;
    case "ashby": return `https://api.ashbyhq.com/posting-api/job-board/${s}`;
    case "smartrecruiters": return `https://api.smartrecruiters.com/v1/companies/${s}/postings?limit=100`;
    case "recruitee": return `https://${s}.recruitee.com/api/offers`;
    case "workable": return `https://apply.workable.com/api/v1/widget/accounts/${s}`;
    default: return null;
  }
};

// --- polite fetching: one serial queue per host -----------------------------------------------------------------
const chains = new Map();
const robots = new Map();
function politeGet(url) {
  if (HANDS_OFF.test(url)) return Promise.reject(new Error("hands-off"));
  const host = new URL(url).host;
  const run = async () => {
    const res = await fetch(url, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(20000) }).catch((e) => ({ status: 0, text: async () => String(e) }));
    const body = await res.text();
    await new Promise((r) => setTimeout(r, GAP_MS));
    return { status: res.status, body };
  };
  const next = (chains.get(host) ?? Promise.resolve()).then(run, run);
  chains.set(host, next.catch(() => undefined));
  return next;
}
async function allowed(url) {
  const u = new URL(url);
  if (!robots.has(u.host)) {
    robots.set(u.host, (async () => {
      const rules = [];
      const r = await politeGet(`${u.origin}/robots.txt`).catch(() => ({ status: 0, body: "" }));
      if (r.status === 200) {
        let star = false;
        for (const line of r.body.split(/\r?\n/)) {
          const [k, ...v] = line.split(":");
          const key = (k ?? "").trim().toLowerCase();
          const val = v.join(":").trim();
          if (key === "user-agent") star = val === "*";
          else if (star && key === "disallow" && val) rules.push(val);
        }
      }
      return rules;
    })());
  }
  const rules = await robots.get(u.host);
  return !rules.some((d) => u.pathname.startsWith(d));
}

// --- reading a board ------------------------------------------------------------------------------------------
/** { title, location, remote, text, boardName } for every job, whatever the ATS. */
function readJobs(ats, body) {
  const j = JSON.parse(body);
  switch (ats) {
    case "greenhouse": return (j.jobs ?? []).map((x) => ({ title: x.title ?? "", location: x.location?.name ?? "", text: "", boardName: x.company_name ?? "" }));
    case "lever": return (Array.isArray(j) ? j : []).map((x) => ({ title: x.text ?? "", location: x.categories?.location ?? "", remote: /remote/i.test(x.workplaceType ?? ""), text: `${x.descriptionPlain ?? ""} ${x.additionalPlain ?? ""}`, boardName: "" }));
    case "ashby": return (j.jobs ?? []).map((x) => ({ title: x.title ?? "", location: x.location ?? "", remote: !!x.isRemote, text: x.descriptionPlain ?? "", boardName: "" }));
    case "smartrecruiters": return (j.content ?? []).map((x) => ({ title: x.name ?? "", location: [x.location?.city, x.location?.country].filter(Boolean).join(", "), remote: !!x.location?.remote, text: "", boardName: x.company?.name ?? "" }));
    case "recruitee": return (j.offers ?? []).map((x) => ({ title: x.title ?? "", location: x.location ?? "", remote: !!x.remote, text: x.description ?? "", boardName: "" }));
    case "workable": return (j.jobs ?? []).map((x) => ({ title: x.title ?? "", location: [x.city, x.country].filter(Boolean).join(", "), remote: !!x.telecommuting, text: "", boardName: j.name ?? "" }));
    default: return [];
  }
}

const squash = (s) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]/g, "");
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Ties a board to the company: its own name for it, or (Lever / Ashby) its postings naming the company. */
function sameCompany(name, jobs) {
  const want = squash(name);
  const board = jobs.find((x) => x.boardName)?.boardName ?? "";
  if (board) {
    const b = squash(board);
    return b === want || (want.length >= 4 && (b.includes(want) || want.includes(b) && b.length >= 4));
  }
  const words = name.replace(/\b(inc|ltd|pty|nv|labs?)\b\.?/gi, "").trim();
  const re = words.length <= 3 ? new RegExp(`\\b${escapeRe(words)}\\b`) : new RegExp(`\\b${escapeRe(words)}\\b`, "i");
  return jobs.some((x) => re.test(x.text));
}

// --- what a company hires for --------------------------------------------------------------------------------
const PLACES = [
  ["IN", /\b(india|bengaluru|bangalore|hyderabad|pune|mumbai|delhi|new delhi|gurgaon|gurugram|noida|chennai|kolkata|ahmedabad|jaipur|kochi|coimbatore|indore|chandigarh|trivandrum|thiruvananthapuram)\b/i],
  ["US", /\b(united states|usa|u\.s\.|us-?remote|remote[,\s-]*us\b|new york|san francisco|seattle|austin|boston|chicago|los angeles|denver|atlanta|miami|washington,? dc|palo alto|mountain view|sunnyvale|san jose|san mateo|redwood city|menlo park|oakland|portland|philadelphia|dallas|houston|salt lake|nashville|pittsburgh|raleigh|phoenix|san diego|minneapolis|detroit|columbus)\b|,\s?(ca|ny|wa|tx|ma|il|co|ga|fl|nc|va|or|pa|nj|ut|az|mn|mi|oh|md|dc)\b/i],
  ["GB", /\b(united kingdom|uk\b|england|scotland|london|manchester|edinburgh|cambridge|oxford|bristol|leeds|glasgow|belfast)\b/i],
  ["DE", /\b(germany|deutschland|berlin|munich|münchen|hamburg|frankfurt|cologne|köln|stuttgart|düsseldorf)\b/i],
  ["CA", /\b(canada|toronto|vancouver|montreal|montréal|ottawa|calgary|waterloo)\b/i],
  ["IE", /\b(ireland|dublin|cork)\b/i],
  ["NL", /\b(netherlands|amsterdam|rotterdam|utrecht|eindhoven)\b/i],
  ["FR", /\b(france|paris|lyon)\b/i],
  ["ES", /\b(spain|madrid|barcelona|valencia)\b/i],
  ["PL", /\b(poland|warsaw|kraków|krakow|wrocław|wroclaw)\b/i],
  ["SE", /\b(sweden|stockholm|gothenburg)\b/i],
  ["SG", /\b(singapore)\b/i],
  ["AU", /\b(australia|sydney|melbourne|brisbane|perth)\b/i],
  ["JP", /\b(japan|tokyo|osaka)\b/i],
  ["AE", /\b(uae|united arab emirates|dubai|abu dhabi)\b/i],
  ["IL", /\b(israel|tel aviv)\b/i],
  ["BR", /\b(brazil|são paulo|sao paulo|rio de janeiro)\b/i],
  ["MX", /\b(mexico|mexico city|guadalajara)\b/i],
  ["PT", /\b(portugal|lisbon|porto)\b/i],
  ["CH", /\b(switzerland|zurich|zürich|geneva)\b/i],
];
const FAMILIES = [
  ["data", /\b(data|machine learning|ml|ai|analytics|analyst|scientist|research scientist|nlp|computer vision|llm)\b/i],
  ["software", /\b(software|engineer|engineering|developer|sde|backend|back-end|frontend|front-end|full[- ]?stack|mobile|ios|android|devops|sre|site reliability|platform|infrastructure|qa|test|security engineer|firmware|embedded)\b/i],
  ["design", /\b(design|designer|ux|ui|user research)\b/i],
  ["product", /\b(product manager|product management|product owner|program manager|technical program)\b/i],
  ["sales", /\b(sales|account executive|business development|bdr|sdr|account manager|partnerships)\b/i],
  ["marketing", /\b(marketing|growth|seo|content|brand|communications|social media)\b/i],
  ["support", /\b(customer success|customer support|support engineer|support specialist|customer service|implementation)\b/i],
  ["operations", /\b(operations|ops|supply chain|logistics|procurement|strategy)\b/i],
  ["finance", /\b(finance|financial|accountant|accounting|tax|treasury|fp&a|controller|audit)\b/i],
  ["people", /\b(recruiter|recruiting|talent|people|hr|human resources)\b/i],
  ["legal", /\b(legal|counsel|compliance|privacy|paralegal)\b/i],
];
const ENTRY = /\b(intern|internship|graduate|new grad|fresher|entry[- ]level|junior|jr\.?|campus|apprentice|trainee|early career|associate engineer)\b/i;

function profileOf(jobs) {
  const hires = {};
  const families = {};
  let remote = 0;
  let entry = 0;
  for (const x of jobs) {
    for (const [code, re] of PLACES) if (re.test(x.location)) hires[code] = (hires[code] ?? 0) + 1;
    if (x.remote || /\bremote|anywhere|work from home\b/i.test(x.location)) remote++;
    // Data before software: "ML Engineer" is data; "Engineer" alone is software.
    const fam = FAMILIES.find(([, re]) => re.test(x.title))?.[0];
    if (fam) families[fam] = (families[fam] ?? 0) + 1;
    if (ENTRY.test(x.title)) entry++;
  }
  return { hires, remote, families, entry };
}

// --- candidates ---------------------------------------------------------------------------------------------
const listed = JSON.parse(readFileSync("static/companies.json", "utf8")).slice(0, process.env.LIMIT ? 2 : undefined);
const candidates = readFileSync("scripts/company-candidates.txt", "utf8").split(/\r?\n/)
  .map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
  .map((l) => { const [name, industry, country] = l.split("|").map((s) => s.trim()); return { name, industry, country }; })
  .slice(0, Number(process.env.LIMIT) || undefined);
const OUT = process.env.OUT || "static/companies.json";

function triesFor(c) {
  const a = squash(c.name);
  const hyphen = c.name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const camel = c.name.replace(/[^A-Za-z0-9]/g, "");
  const tries = [["greenhouse", a], ["lever", a], ["ashby", a], ["smartrecruiters", camel], ["workable", hyphen]];
  if (hyphen !== a) tries.push(["lever", hyphen], ["ashby", hyphen]);
  return tries;
}

async function check(ats, slug, name) {
  const url = feedUrl(ats, slug);
  if (!url || !(await allowed(url))) return null;
  const r = await politeGet(url);
  if (r.status !== 200) return null;
  let jobs;
  try { jobs = readJobs(ats, r.body); } catch { return null; }
  if (!jobs.length || !sameCompany(name, jobs)) return null;
  return { ats, slug, jobs };
}

const kept = new Map(); // squash(name) -> entry
const dropped = [];
const now = new Date().toISOString();
let done = 0;
const total = listed.length + candidates.length;
const tick = () => process.stdout.write(`\r${++done}/${total} checked, ${kept.size} kept   `);

// Already listed: re-check the same board (their slugs are known), and profile them.
await Promise.all(listed.map(async (c) => {
  const hit = await check(c.ats, c.slug, c.name).catch(() => null)
    // A listed board that answers but does not name itself is still the same board as before: keep it on job count.
    ?? await (async () => {
      const url = feedUrl(c.ats, c.slug);
      const r = url ? await politeGet(url).catch(() => null) : null;
      try { const jobs = r?.status === 200 ? readJobs(c.ats, r.body) : []; return jobs.length ? { ats: c.ats, slug: c.slug, jobs } : null; } catch { return null; }
    })();
  tick();
  if (!hit) { dropped.push({ name: c.name, why: "listed board no longer answers with jobs" }); return; }
  const { unverified: _u, verifiedAt: _v, jobCount: _j, hires: _h, families: _f, remote: _r, entry: _e, ...rest } = c;
  kept.set(squash(c.name), { ...rest, unverified: false, verifiedAt: now, jobCount: hit.jobs.length, ...profileOf(hit.jobs) });
}));

await Promise.all(candidates.map(async (c) => {
  if (kept.has(squash(c.name))) { tick(); return; }
  const hits = (await Promise.all(triesFor(c).map(([ats, slug]) => check(ats, slug, c.name).catch(() => null)))).filter(Boolean);
  tick();
  if (!hits.length) { dropped.push({ name: c.name, why: "no public board with open jobs found" }); return; }
  const best = hits.sort((x, y) => y.jobs.length - x.jobs.length)[0];
  if (kept.has(squash(c.name))) return;
  kept.set(squash(c.name), {
    slug: best.slug, name: c.name, ats: best.ats, country: c.country, industry: c.industry,
    unverified: false, verifiedAt: now, jobCount: best.jobs.length, ...profileOf(best.jobs),
  });
}));

// One listing per board, even if two candidate names reached the same one.
const byBoard = new Map();
for (const c of kept.values()) {
  const k = `${c.ats}:${c.slug.toLowerCase()}`;
  if (!byBoard.has(k)) byBoard.set(k, c);
  else dropped.push({ name: c.name, why: `same board as ${byBoard.get(k).name}` });
}
const out = [...byBoard.values()].sort((a, b) => a.name.localeCompare(b.name));
writeFileSync(OUT, JSON.stringify(out, null, 1) + "\n");
writeFileSync(process.env.LIMIT ? `${OUT}.report.json` : "reports/companies-growth.json", JSON.stringify({ checkedAt: now, kept: out.length, candidates: total, dropped }, null, 2) + "\n");
console.log(`\nKept ${out.length} companies (${listed.length} listed before, ${candidates.length} candidates).`);

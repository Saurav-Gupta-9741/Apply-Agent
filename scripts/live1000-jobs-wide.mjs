// Round 12 job list: fresh open jobs on every public job site ApplyAgent supports beyond the four of rounds 8-11:
// Lever, Workable, SmartRecruiters, Recruitee, Personio, Teamtailor, Jobvite, Rippling, Pinpoint. Read-only GETs of
// public job lists (robots.txt checked 2026-11-14: Lever, Workable, Teamtailor, Rippling, Pinpoint allow it; the
// others publish no rules). Never a job any earlier round used. Up to 2 jobs per company.
// Writes reports/live1000/jobs-r12.json and two shards (jobs-r12-a.json, jobs-r12-b.json).
import { readdirSync, readFileSync, writeFileSync } from "node:fs";

const DIR = "reports/live1000";
const PER = 2;
const CAP = { lever: 30, workable: 25, smartrecruiters: 25, recruitee: 20, personio: 20, teamtailor: 20, jobvite: 15, rippling: 10, pinpoint: 10 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const UA = { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36" };
const get = async (u, as = "json") => {
  try {
    const r = await fetch(u, { headers: { ...UA, accept: as === "json" ? "application/json" : "text/html,application/xml" } });
    if (!r.ok) return undefined;
    return as === "json" ? await r.json() : await r.text();
  } catch { return undefined; }
};

const used = new Set();
const slugs = { lever: new Set(), workable: new Set(), smartrecruiters: new Set(), recruitee: new Set() };
for (const f of readdirSync(DIR).filter((f) => /^jobs.*\.json$/.test(f) && !f.startsWith("jobs-r12"))) {
  let list;
  try { list = JSON.parse(readFileSync(`${DIR}/${f}`, "utf8")); } catch { continue; }
  for (const j of Array.isArray(list) ? list : []) {
    if (!j?.url) continue;
    used.add(j.url.replace(/[?#].*$/, "").replace(/\/(apply|application|c\/new)\/?$/, ""));
    if (slugs[j.platform]) slugs[j.platform].add(j.company);
  }
}
for (const c of JSON.parse(readFileSync("static/companies.json", "utf8"))) if (slugs[c.ats]) slugs[c.ats].add(c.slug);
const fresh = (url) => !used.has(url.replace(/[?#].*$/, "").replace(/\/(apply|application|c\/new)\/?$/, ""));
const pick = (jobs) => {
  const seen = new Set();
  return jobs.filter((j) => j.url && fresh(j.url)).filter((j) => {
    const k = String(j.title).toLowerCase().replace(/[^a-z]+/g, " ").split(" ").slice(0, 3).join(" ");
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).slice(0, PER);
};
const out = { lever: [], workable: [], smartrecruiters: [], recruitee: [], personio: [], teamtailor: [], jobvite: [], rippling: [], pinpoint: [] };
const take = (platform, company, jobs) => { for (const j of pick(jobs)) if (out[platform].length < CAP[platform]) out[platform].push({ platform, company, title: j.title, url: j.url }); };

for (const s of slugs.lever) {
  if (out.lever.length >= CAP.lever) break;
  const j = await get(`https://api.lever.co/v0/postings/${s}?mode=json`);
  take("lever", s, (Array.isArray(j) ? j : []).map((x) => ({ title: x.text, url: `${x.hostedUrl}/apply` })));
  await sleep(300);
}
for (const s of slugs.workable) {
  if (out.workable.length >= CAP.workable) break;
  const j = await get(`https://apply.workable.com/api/v1/widget/accounts/${s}`);
  take("workable", s, (j?.jobs ?? []).map((x) => ({ title: x.title, url: `https://apply.workable.com/${s}/j/${x.shortcode}/apply/` })));
  await sleep(300);
}
for (const s of slugs.smartrecruiters) {
  if (out.smartrecruiters.length >= CAP.smartrecruiters) break;
  const j = await get(`https://api.smartrecruiters.com/v1/companies/${s}/postings?limit=20`);
  take("smartrecruiters", s, (j?.content ?? []).map((x) => ({ title: x.name, url: `https://jobs.smartrecruiters.com/${s}/${x.id}` })));
  await sleep(300);
}
for (const s of slugs.recruitee) {
  if (out.recruitee.length >= CAP.recruitee) break;
  const j = await get(`https://${s}.recruitee.com/api/offers/`);
  take("recruitee", s, (j?.offers ?? []).map((x) => ({ title: x.title, url: `${x.careers_url ?? `https://${s}.recruitee.com/o/${x.slug}`}/c/new` })));
  await sleep(300);
}
// Personio: the public XML feed of each candidate company (kept only if it answers).
for (const s of ["egym", "ottonova", "chrono24", "flaschenpost", "tourlane", "kontist", "zenjob", "home24", "mytheresa", "taxfix", "solarisgroup", "freeletics", "smava", "scalablecapital", "vivenu", "hellofresh", "personio", "babbel", "sennder", "moss", "pitch", "trade-republic", "grover", "enpal", "comtravo", "contentful", "fernride", "planradar", "bitpanda", "storyblok"]) {
  if (out.personio.length >= CAP.personio) break;
  const xml = await get(`https://${s}.jobs.personio.de/xml`, "text");
  if (!xml || !/<position>/.test(xml)) { await sleep(200); continue; }
  const jobs = [...xml.matchAll(/<position>[\s\S]*?<id>(\d+)<\/id>[\s\S]*?<name>([\s\S]*?)<\/name>/g)].map((m) => ({ title: m[2].replace(/<!\[CDATA\[|\]\]>/g, "").trim(), url: `https://${s}.jobs.personio.de/job/${m[1]}?display=en` }));
  take("personio", s, jobs);
  await sleep(300);
}
// Teamtailor: each company's public jobs page.
for (const s of ["career", "bravura", "venzo", "kry", "epidemicsound", "voi", "tibber", "budbee", "einride", "lunar", "pleo", "planday", "trustly", "kahoot", "mentimeter", "matsmart", "instabox", "anyfin", "juni", "hemnet"]) {
  if (out.teamtailor.length >= CAP.teamtailor) break;
  const html = await get(`https://${s}.teamtailor.com/jobs`, "text");
  if (!html) { await sleep(200); continue; }
  const jobs = [...new Map([...html.matchAll(/href="(https:\/\/[a-z0-9-]+\.teamtailor\.com\/jobs\/\d+-[a-z0-9-]+)"[^>]*>([\s\S]{0,300}?)<\/a>/g)].map((m) => [m[1], { url: m[1], title: m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() || m[1].split("/").pop() }])).values()];
  take("teamtailor", s, jobs);
  await sleep(300);
}
// Jobvite: each company's public jobs page.
for (const s of ["internetbrands", "logitech", "ubisoft", "zendesk", "nutanix", "hubspot", "ellucian", "trimble", "inovalon", "ingenico"]) {
  if (out.jobvite.length >= CAP.jobvite) break;
  const html = await get(`https://jobs.jobvite.com/${s}/jobs`, "text");
  if (!html) { await sleep(200); continue; }
  const jobs = [...new Map([...html.matchAll(/href="(\/[a-z0-9-]+\/job\/[A-Za-z0-9]+)"[^>]*>([\s\S]{0,200}?)<\/a>/g)].map((m) => [m[1], { url: `https://jobs.jobvite.com${m[1]}/apply`, title: m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() }])).values()];
  take("jobvite", s, jobs);
  await sleep(300);
}
// Rippling: the public board API.
for (const s of ["rippling"]) {
  const j = await get(`https://ats.rippling.com/api/v2/board/${s}/jobs`);
  const items = Array.isArray(j) ? j : j?.items ?? j?.jobs ?? j?.results ?? [];
  take("rippling", s, items.map((x) => ({ title: x.name ?? x.title, url: x.url ?? `https://ats.rippling.com/${s}/jobs/${x.id ?? x.uuid}` })));
}
// Pinpoint: the public postings feed.
for (const s of ["workwithus"]) {
  const j = await get(`https://${s}.pinpointhq.com/postings.json`);
  take("pinpoint", s, (j?.data ?? []).map((x) => ({ title: x.title, url: x.url ? `${x.url}` : undefined })));
}

const all = [];
const lists = Object.values(out);
for (let i = 0; lists.some((l) => i < l.length); i++) for (const l of lists) if (l[i]) all.push(l[i]);
writeFileSync(`${DIR}/jobs-r12.json`, JSON.stringify(all, null, 1));
writeFileSync(`${DIR}/jobs-r12-a.json`, JSON.stringify(all.filter((_, i) => i % 2 === 0), null, 1));
writeFileSync(`${DIR}/jobs-r12-b.json`, JSON.stringify(all.filter((_, i) => i % 2 === 1), null, 1));
console.log(`${all.length} fresh jobs`, JSON.stringify(Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.length]))));

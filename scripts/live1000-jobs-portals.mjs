// Open jobs on more application portals for the live real-form runs: Workable, SmartRecruiters, BambooHR, Recruitee
// and Breezy (their robots.txt allow it; Lever is left out: its robots.txt blocks AI agents by name). Companies come
// from earlier read-only runs; jobs from each portal's public job API, up to 4 per company.
// Writes reports/live1000/jobs-portals.json.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const urls = [];
for (const f of readdirSync("reports").filter((f) => /^coverage-.*\.json$|extra-jobs\.json$/.test(f))) {
  try { const j = JSON.parse(readFileSync(`reports/${f}`, "utf8")); for (const r of Array.isArray(j) ? j : j.rows ?? []) if (r.url) urls.push(r.url); } catch {}
}
const slugs = { workable: new Set(), smartrecruiters: new Set(), bamboohr: new Set(), recruitee: new Set(), breezy: new Set() };
for (const u of urls) {
  let m;
  if ((m = u.match(/apply\.workable\.com\/([^/?#]+)/))) slugs.workable.add(m[1]);
  else if ((m = u.match(/jobs\.smartrecruiters\.com\/([^/?#]+)\/\d/))) slugs.smartrecruiters.add(m[1]);
  else if ((m = u.match(/https?:\/\/([^./]+)\.bamboohr\.com/))) slugs.bamboohr.add(m[1]);
  else if ((m = u.match(/https?:\/\/([^./]+)\.recruitee\.com/))) slugs.recruitee.add(m[1]);
  else if ((m = u.match(/https?:\/\/([^./]+)\.breezy\.hr/))) slugs.breezy.add(m[1]);
}
const out = [];
const take = (platform, company, list) => { for (const j of list.slice(0, 4)) out.push({ platform, company, title: j.title, url: j.url }); };
const get = async (u) => { try { const r = await fetch(u, { headers: { accept: "application/json" } }); return r.ok ? await r.json() : undefined; } catch { return undefined; } };
for (const s of slugs.workable) { const j = await get(`https://apply.workable.com/api/v1/widget/accounts/${s}`); take("workable", s, (j?.jobs ?? []).map((x) => ({ title: x.title, url: `https://apply.workable.com/${s}/j/${x.shortcode}/apply/` }))); await sleep(300); }
for (const s of slugs.smartrecruiters) { const j = await get(`https://api.smartrecruiters.com/v1/companies/${s}/postings?limit=10`); take("smartrecruiters", s, (j?.content ?? []).map((x) => ({ title: x.name, url: `https://jobs.smartrecruiters.com/${s}/${x.id}` }))); await sleep(300); }
for (const s of slugs.bamboohr) { const j = await get(`https://${s}.bamboohr.com/careers/list`); take("bamboohr", s, (j?.result ?? []).map((x) => ({ title: x.jobOpeningName, url: `https://${s}.bamboohr.com/careers/${x.id}` }))); await sleep(300); }
for (const s of slugs.recruitee) { const j = await get(`https://${s}.recruitee.com/api/offers/`); take("recruitee", s, (j?.offers ?? []).map((x) => ({ title: x.title, url: `${x.careers_url ?? `https://${s}.recruitee.com/o/${x.slug}`}/c/new` }))); await sleep(300); }
for (const s of slugs.breezy) { const j = await get(`https://${s}.breezy.hr/json`); take("breezy", s, (Array.isArray(j) ? j : []).map((x) => ({ title: x.name, url: `${x.url}/apply` }))); await sleep(300); }
writeFileSync("reports/live1000/jobs-portals.json", JSON.stringify(out, null, 1));
const by = {}; for (const j of out) by[j.platform] = (by[j.platform] ?? 0) + 1;
console.log(out.length, "jobs", JSON.stringify(by), "companies tried", JSON.stringify(Object.fromEntries(Object.entries(slugs).map(([k, v]) => [k, v.size]))));

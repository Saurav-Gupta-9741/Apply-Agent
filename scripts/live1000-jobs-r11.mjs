// Round 11 job list: FRESH open jobs (never in any earlier round's list) on the four portals of round 7 (Greenhouse,
// Ashby, Breezy, BambooHR), from their public job APIs (robots.txt allows them; Lever is left out). Up to 2 jobs with
// different titles per company, so the new rules meet new forms, not the 225 they were tuned on.
// Writes reports/live1000/jobs-r11.json and two shards (jobs-r11-a.json, jobs-r11-b.json).
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const DIR = "reports/live1000";
const CAP = { greenhouse: 70, ashby: 60, breezy: 50, bamboohr: 20 };
const PER = 2;

const used = new Set();
const slugs = { greenhouse: new Set(), ashby: new Set(), breezy: new Set(), bamboohr: new Set() };
for (const f of readdirSync(DIR).filter((f) => /^jobs.*\.json$/.test(f) && !f.startsWith("jobs-r11"))) {
  let list;
  try { list = JSON.parse(readFileSync(`${DIR}/${f}`, "utf8")); } catch { continue; }
  for (const j of Array.isArray(list) ? list : []) {
    if (!j?.url) continue;
    used.add(j.url.replace(/[?#].*$/, "").replace(/\/(apply|application)\/?$/, ""));
    if (slugs[j.platform]) slugs[j.platform].add(j.company);
  }
}
for (const c of JSON.parse(readFileSync("static/companies.json", "utf8"))) if (slugs[c.ats]) slugs[c.ats].add(c.slug);

const fresh = (url) => !used.has(url.replace(/[?#].*$/, "").replace(/\/(apply|application)\/?$/, ""));
const pick = (jobs) => {
  const seen = new Set();
  return jobs.filter((j) => fresh(j.url)).filter((j) => {
    const k = j.title.toLowerCase().replace(/[^a-z]+/g, " ").trim().split(" ").slice(0, 3).join(" ");
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).slice(0, PER);
};
const get = async (u) => { try { const r = await fetch(u, { headers: { accept: "application/json" } }); return r.ok ? await r.json() : undefined; } catch { return undefined; } };

const out = { greenhouse: [], ashby: [], breezy: [], bamboohr: [] };
const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);
for (const b of shuffle([...slugs.greenhouse])) {
  if (out.greenhouse.length >= CAP.greenhouse * 1.3) break;
  const j = await get(`https://boards-api.greenhouse.io/v1/boards/${b}/jobs`);
  for (const x of pick((j?.jobs ?? []).map((x) => ({ title: x.title, url: `https://job-boards.greenhouse.io/${b}/jobs/${x.id}` })))) out.greenhouse.push({ platform: "greenhouse", company: b, ...x });
  await sleep(250);
}
for (const o of shuffle([...slugs.ashby])) {
  if (out.ashby.length >= CAP.ashby * 1.3) break;
  const j = await get(`https://api.ashbyhq.com/posting-api/job-board/${o}`);
  for (const x of pick((j?.jobs ?? []).filter((x) => x.isListed !== false).map((x) => ({ title: x.title, url: x.applyUrl || `${x.jobUrl}/application` })))) out.ashby.push({ platform: "ashby", company: o, ...x });
  await sleep(250);
}
for (const s of shuffle([...slugs.breezy])) {
  if (out.breezy.length >= CAP.breezy * 1.3) break;
  const j = await get(`https://${s}.breezy.hr/json`);
  for (const x of pick((Array.isArray(j) ? j : []).map((x) => ({ title: x.name, url: `${x.url}/apply` })))) out.breezy.push({ platform: "breezy", company: s, ...x });
  await sleep(300);
}
for (const s of shuffle([...slugs.bamboohr])) {
  if (out.bamboohr.length >= CAP.bamboohr * 1.3) break;
  const j = await get(`https://${s}.bamboohr.com/careers/list`);
  for (const x of pick((j?.result ?? []).map((x) => ({ title: x.jobOpeningName, url: `https://${s}.bamboohr.com/careers/${x.id}` })))) out.bamboohr.push({ platform: "bamboohr", company: s, ...x });
  await sleep(300);
}
// Interleave platforms and companies so each shard (and each site) gets an even, slow spread of requests.
const lists = Object.entries(out).map(([p, l]) => shuffle(l).slice(0, CAP[p]));
const all = [];
for (let i = 0; lists.some((l) => l[i]); i++) for (const l of lists) if (l[i]) all.push(l[i]);
writeFileSync(`${DIR}/jobs-r11.json`, JSON.stringify(all, null, 1));
writeFileSync(`${DIR}/jobs-r11-a.json`, JSON.stringify(all.filter((_, i) => i % 2 === 0), null, 1));
writeFileSync(`${DIR}/jobs-r11-b.json`, JSON.stringify(all.filter((_, i) => i % 2 === 1), null, 1));
console.log(all.length, "fresh jobs", JSON.stringify(Object.fromEntries(lists.map((l, i) => [Object.keys(out)[i], l.length]))), "urls excluded", used.size);

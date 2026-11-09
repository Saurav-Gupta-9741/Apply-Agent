// Builds the job list for the 1,000-form real-life run: up to 3 open jobs with different titles per company, from
// the public job APIs of Greenhouse and Ashby (both allow automated access in robots.txt). Writes
// reports/live1000/jobs.json and two shards for parallel runs.
import { readFileSync, writeFileSync } from "node:fs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const companies = JSON.parse(readFileSync("static/companies.json", "utf8"));
const r7 = JSON.parse(readFileSync("reports/round7/questions.json", "utf8"));
const gh = new Set([...companies.filter((c) => c.ats === "greenhouse").map((c) => c.slug), ...r7.flatMap((q) => q.boards ?? [])]);
const ashby = new Set(companies.filter((c) => c.ats === "ashby").map((c) => c.slug));
const PER = 4;
const out = [];
const pick = (jobs) => {
  const seen = new Set();
  return jobs.filter((j) => { const k = j.title.toLowerCase().replace(/[^a-z]+/g, " ").split(" ").slice(0, 3).join(" "); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, PER);
};
for (const b of gh) {
  try {
    const r = await fetch(`https://boards-api.greenhouse.io/v1/boards/${b}/jobs`);
    if (r.ok) for (const j of pick((await r.json()).jobs ?? [])) out.push({ platform: "greenhouse", company: b, title: j.title, url: `https://job-boards.greenhouse.io/${b}/jobs/${j.id}` });
  } catch {}
  await sleep(250);
}
for (const o of ashby) {
  try {
    const r = await fetch(`https://api.ashbyhq.com/posting-api/job-board/${o}`);
    if (r.ok) for (const j of pick(((await r.json()).jobs ?? []).filter((x) => x.isListed !== false))) out.push({ platform: "ashby", company: o, title: j.title, url: j.applyUrl || `${j.jobUrl}/application` });
  } catch {}
  await sleep(250);
}
// Interleave companies so the two shards (and each site) get an even, slow spread of requests.
const byCo = new Map();
for (const j of out) byCo.set(j.company, [...(byCo.get(j.company) ?? []), j]);
const rounds = [];
for (let i = 0; i < PER; i++) for (const list of byCo.values()) if (list[i]) rounds.push(list[i]);
writeFileSync("reports/live1000/jobs.json", JSON.stringify(rounds, null, 1));
writeFileSync("reports/live1000/jobs-a.json", JSON.stringify(rounds.filter((_, i) => i % 2 === 0), null, 1));
writeFileSync("reports/live1000/jobs-b.json", JSON.stringify(rounds.filter((_, i) => i % 2 === 1), null, 1));
console.log(`${rounds.length} jobs from ${byCo.size} companies (greenhouse boards tried ${gh.size}, ashby ${ashby.size})`);

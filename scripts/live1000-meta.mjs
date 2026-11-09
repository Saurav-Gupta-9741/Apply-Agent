// Job facts for the live-run audit, from the public job APIs (read-only GETs, cached): each job's location, and for
// Greenhouse every question's real options (react-select dropdowns do not show their options until opened, so the
// run cannot record them). The audit uses them to check that a chosen option belongs to the question, and to judge
// work-authorization / sponsorship answers against the country the job is in.
//
//   node scripts/live1000-meta.mjs [--in reports/live1000] [--out reports/live1000]   -> <out>/meta.json
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const arg = (name, dflt) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : dflt; };
const IN = arg("--in", "reports/live1000");
const OUT = arg("--out", "reports/live1000");
const path = join(OUT, "meta.json");
const meta = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const rows = readdirSync(IN).filter((f) => /^results-.*\.jsonl$/.test(f) && !/smoke/.test(f))
  .flatMap((f) => readFileSync(join(IN, f), "utf8").split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return undefined; } }))
  .filter((r) => r && r.outcome === "filled");

const ashbyBoards = new Map();
let fetched = 0;
for (const r of rows) {
  if (meta[r.url]) continue;
  try {
    if (r.platform === "greenhouse") {
      const m = /greenhouse\.io\/([^/]+)\/jobs\/(\d+)/.exec(r.url);
      if (!m) continue;
      const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${m[1]}/jobs/${m[2]}?questions=true`);
      if (!res.ok) { meta[r.url] = { error: res.status }; continue; }
      const j = await res.json();
      const options = {};
      const add = (qs) => { for (const q of qs ?? []) for (const f of q.fields ?? []) if (f.values?.length) options[f.name] = f.values.map((v) => v.label); };
      add(j.questions); add(j.location_questions);
      for (const c of j.compliance ?? []) add(c.questions);
      for (const q of j.demographic_questions?.questions ?? []) if (q.answer_options?.length) options[`demographic_${q.id}`] = q.answer_options.map((a) => a.label);
      meta[r.url] = { location: j.location?.name ?? "", offices: (j.offices ?? []).map((o) => o.location || o.name).filter(Boolean), options };
      fetched++;
      await sleep(300);
    } else if (r.platform === "bamboohr") {
      // BambooHR's public job detail (the careers page reads it): city and country.
      const m = /^https:\/\/([^.]+)\.bamboohr\.com\/careers\/(\d+)/.exec(r.url);
      if (!m) continue;
      const res = await fetch(`https://${m[1]}.bamboohr.com/careers/${m[2]}/detail`);
      if (!res.ok) { meta[r.url] = { error: res.status }; continue; }
      // `location` is the posting's address; `atsLocation` fills in when that is empty (Corcym: Delhi, India).
      const job = (await res.json()).result?.jobOpening ?? {};
      const loc = job.location ?? {};
      const ats = job.atsLocation ?? {};
      meta[r.url] = { location: [loc.city ?? ats.city, loc.state ?? ats.state].filter(Boolean).join(", "), country: loc.addressCountry ?? ats.country ?? "", options: {} };
      fetched++;
      await sleep(300);
    } else if (r.platform === "breezy") {
      // Breezy's public job list (https://<company>.breezy.hr/json): each job's city, state and country.
      if (!ashbyBoards.has(`breezy:${r.company}`)) {
        const res = await fetch(`https://${r.company}.breezy.hr/json`);
        ashbyBoards.set(`breezy:${r.company}`, res.ok ? await res.json() : []);
        await sleep(300);
      }
      const id = /\/p\/([0-9a-f]+)-/.exec(r.url)?.[1];
      const job = ashbyBoards.get(`breezy:${r.company}`).find((j) => j.id === id);
      const locs = job ? (job.locations?.length ? job.locations : [job.location]).filter(Boolean) : [];
      meta[r.url] = { location: locs.map((l) => l.name).filter(Boolean).join("; "), country: [...new Set(locs.map((l) => l.country?.name).filter(Boolean))].join("; "), remote: job?.location?.is_remote, options: {} };
      fetched++;
    } else if (r.platform === "ashby") {
      if (!ashbyBoards.has(r.company)) {
        const res = await fetch(`https://api.ashbyhq.com/posting-api/job-board/${r.company}`);
        ashbyBoards.set(r.company, res.ok ? (await res.json()).jobs ?? [] : []);
        await sleep(300);
      }
      const id = /[0-9a-f-]{36}/.exec(r.url)?.[0];
      const job = ashbyBoards.get(r.company).find((j) => j.id === id || (j.applyUrl ?? "").includes(id ?? "\u0000"));
      meta[r.url] = { location: job ? [job.location, ...(job.secondaryLocations ?? []).map((l) => l.location)].filter(Boolean).join("; ") : "", country: job?.address?.postalAddress?.addressCountry ?? "", remote: job?.isRemote ?? undefined, options: {} };
      fetched++;
    }
  } catch (e) {
    meta[r.url] = { error: String(e?.message ?? e).slice(0, 100) };
  }
  if (fetched % 50 === 0) writeFileSync(path, JSON.stringify(meta));
}
writeFileSync(path, JSON.stringify(meta));
console.log(`meta for ${Object.keys(meta).length} jobs (${fetched} fetched now)`);

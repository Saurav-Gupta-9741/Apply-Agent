// Collects real application questions from Greenhouse's public Job Board API (boards-api.greenhouse.io, which its
// robots.txt allows and which sets no AI-training restriction). Public job data only: no applicant data, nothing is
// ever submitted. Lever, Workable and SmartRecruiters are NOT collected: their robots.txt forbids AI training or all
// crawling.
//   node scripts/crawl-greenhouse-questions.mjs <tokens.txt> <out.jsonl> [jobsPerBoard=6]
// tokens.txt: one board token per line ("stripe"), "#" comments allowed. Resumable: boards already in out.jsonl are
// skipped. One request at a time, with a pause between requests.
import { appendFileSync, existsSync, readFileSync } from "node:fs";

const [tokensFile, out, perBoardArg] = process.argv.slice(2);
if (!tokensFile || !out) {
  console.error("usage: node scripts/crawl-greenhouse-questions.mjs <tokens.txt> <out.jsonl> [jobsPerBoard]");
  process.exit(1);
}
const PER_BOARD = Number(perBoardArg ?? 6);
const PAUSE_MS = 400;
const API = "https://boards-api.greenhouse.io/v1/boards";
const HEADERS = { "User-Agent": "ApplyAgent-question-research/1.0 (public job board API; no applicant data)", Accept: "application/json" };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    await sleep(PAUSE_MS * (attempt + 1));
    try {
      const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(20_000) });
      if (res.status === 404) return null;
      if (res.status === 429 || res.status >= 500) { await sleep(5000 * (attempt + 1)); continue; }
      if (!res.ok) return null;
      return await res.json();
    } catch {
      await sleep(2000);
    }
  }
  return null;
}

const text = (html) => (html ?? "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"')
  .replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();

function question(q, group) {
  return {
    group,
    label: (q.label ?? "").trim(),
    description: text(q.description).slice(0, 600),
    required: !!q.required,
    fields: (q.fields ?? []).map((f) => ({ type: f.type, name: f.name, options: (f.values ?? []).map((v) => String(v.label ?? v.value ?? "")).slice(0, 80) })),
  };
}

/** Jobs spread over different locations and departments, so one board gives its variety, not 6 copies of one form. */
function pick(jobs) {
  const byPlace = new Map();
  for (const j of jobs) {
    const k = j.location?.name ?? "";
    if (!byPlace.has(k)) byPlace.set(k, []);
    byPlace.get(k).push(j);
  }
  const lists = [...byPlace.values()];
  const chosen = [];
  for (let i = 0; chosen.length < PER_BOARD && lists.some((l) => l.length > i); i++) {
    for (const l of lists) if (l[i] && chosen.length < PER_BOARD) chosen.push(l[i]);
  }
  return chosen;
}

const done = new Set(existsSync(out) ? readFileSync(out, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l).board) : []);
const tokens = [...new Set(readFileSync(tokensFile, "utf8").split(/\r?\n/).map((l) => l.replace(/#.*/, "").trim().toLowerCase()).filter(Boolean))];
console.log(`${tokens.length} boards, ${done.size} already collected`);

let n = 0;
for (const board of tokens) {
  if (done.has(board)) continue;
  n++;
  const list = await get(`${API}/${encodeURIComponent(board)}/jobs`);
  if (!list?.jobs?.length) {
    appendFileSync(out, JSON.stringify({ board, missing: true }) + "\n");
    continue;
  }
  const jobs = [];
  for (const j of pick(list.jobs)) {
    const d = await get(`${API}/${encodeURIComponent(board)}/jobs/${j.id}?questions=true`);
    if (!d) continue;
    jobs.push({
      id: d.id, title: d.title, location: d.location?.name ?? "", language: d.language ?? "", url: d.absolute_url,
      company: d.company_name ?? "",
      questions: [
        ...(d.questions ?? []).map((q) => question(q, "questions")),
        ...(d.location_questions ?? []).map((q) => question(q, "location")),
        ...(d.compliance ?? []).flatMap((c) => (c.questions ?? []).map((q) => question(q, `compliance:${c.type ?? ""}`))),
        ...((d.demographic_questions?.questions) ?? []).map((q) => ({
          group: "demographic", label: (q.label ?? "").trim(), description: "", required: !!q.required,
          fields: [{ type: q.type ?? "", name: "", options: (q.answer_options ?? []).map((o) => String(o.label ?? "")).slice(0, 80) }],
        })),
      ],
    });
  }
  appendFileSync(out, JSON.stringify({ board, totalJobs: list.jobs.length, jobs }) + "\n");
  if (n % 10 === 0) console.log(`${n} boards fetched (last: ${board}, ${jobs.length} jobs)`);
}
console.log("done");

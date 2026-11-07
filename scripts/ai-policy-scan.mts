// Runs the AI-rule detector over every round-7 question (label + help text) and prints what it flags.
import { readFileSync } from "node:fs";
import { aiPolicyOf, aiTrapOf } from "../src/shared/ai-policy.ts";
const items = JSON.parse(readFileSync("reports/round7/questions.json", "utf8")) as Array<{ label: string; description?: string; jobs?: number; boards?: string[] }>;
const hits: Record<string, Set<string>> = { banned: new Set(), "own-work": new Set(), policy: new Set(), trap: new Set() };
const boards: Record<string, Set<string>> = { banned: new Set(), "own-work": new Set(), policy: new Set(), trap: new Set() };
for (const it of items) {
  const text = `${it.label} ${it.description ?? ""}`;
  const p = aiPolicyOf(text);
  if (p) { hits[p.kind]!.add(`${p.quote.slice(0, 150)}  [${it.boards?.slice(0, 3).join(",")}]`); for (const b of it.boards ?? []) boards[p.kind]!.add(b); }
  const t = aiTrapOf(text);
  if (t) { hits.trap!.add(`${t.slice(0, 150)}  [${it.boards?.slice(0, 3).join(",")}]`); for (const b of it.boards ?? []) boards.trap!.add(b); }
}
for (const k of Object.keys(hits)) { console.log(`\n== ${k}: ${hits[k]!.size} texts, ${boards[k]!.size} boards`); for (const h of hits[k]!) console.log(" -", h); }

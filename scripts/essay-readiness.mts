// How ApplyAgent's essay layer treats every free-text question of the 222 real Greenhouse boards (round 7): which
// boxes get a draft button, which length limits are understood, which forms ban AI or plant tests for AI writers.
// Writes reports/essay-readiness.json and prints a short log. Usage: npx tsx scripts/essay-readiness.mts
import { readFileSync, writeFileSync } from "node:fs";
import { aiPolicyOfForm, aiTrapOf, draftsForbidden } from "../src/shared/ai-policy.ts";
import { lengthLimit } from "../src/shared/length-limit.ts";
import { isDraftableField } from "../src/sidepanel/drafts.ts";

type Q = { label: string; description?: string; control: string; options?: string[]; fieldName?: string; required?: boolean; boards?: string[]; languages?: string[]; jobs?: number; group?: string };
const qs = JSON.parse(readFileSync("reports/round7/questions.json", "utf8")) as Q[];
const byBoard = new Map<string, Q[]>();
for (const q of qs) for (const b of q.boards ?? []) (byBoard.get(b) ?? byBoard.set(b, []).get(b)!).push(q);

const boards = [...byBoard.entries()].map(([board, list]) => {
  const rule = aiPolicyOfForm(list.map((q) => `${q.label} ${q.description ?? ""}`));
  const essays = list.filter((q) => isDraftableField({ control: q.control, label: q.label, name: q.fieldName, options: q.options }));
  const items = essays.map((q) => {
    const text = `${q.label} ${q.description ?? ""}`;
    const limit = lengthLimit(text);
    const mentionsLength = /\b\d+\s*(words?|characters?|chars?|sentences?|paragraphs?)\b|\bsentences?\b|字|단어|palabras|mots|Wörter|caracteres|parole/i.test(text);
    return { label: q.label.slice(0, 140), lang: q.languages?.[0], limit, mentionsLength, trap: !!aiTrapOf(text), draftButton: !draftsForbidden(rule) && !aiTrapOf(text) };
  });
  return { board, aiRule: rule?.kind ?? null, essays: items.length, draftButtons: items.filter((i) => i.draftButton).length, items };
});

const all = boards.flatMap((b) => b.items);
const missedLimits = all.filter((i) => i.mentionsLength && !i.limit);
const sum = {
  boards: boards.length,
  boardsWithEssayBoxes: boards.filter((b) => b.essays).length,
  essayBoxes: all.length,
  withDraftButton: all.filter((i) => i.draftButton).length,
  blockedByEmployerRule: boards.filter((b) => b.aiRule && b.aiRule !== "policy").map((b) => b.board),
  policyNoticeOnly: boards.filter((b) => b.aiRule === "policy").map((b) => b.board),
  traps: all.filter((i) => i.trap).length,
  lengthStated: all.filter((i) => i.mentionsLength).length,
  lengthUnderstood: all.filter((i) => i.mentionsLength && i.limit).length,
  missedLimits: missedLimits.map((i) => i.label),
  languages: Object.fromEntries(Object.entries(all.reduce<Record<string, number>>((a, i) => ((a[i.lang ?? "?"] = (a[i.lang ?? "?"] ?? 0) + 1), a), {})).sort((a, b) => b[1] - a[1])),
};
writeFileSync("reports/essay-readiness.json", JSON.stringify({ summary: sum, boards }, null, 1));
console.log(JSON.stringify(sum, null, 1));

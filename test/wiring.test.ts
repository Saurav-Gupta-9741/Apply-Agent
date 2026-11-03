/** A feature counts as done only if the shipped extension can reach it: walk the static and dynamic imports from the
 * build entry points (build.mjs) and check that every feature module is in the graph. Added by Claude's review of
 * arena 553c7fe, where kanban, interview prep, job discovery, storage migration and the locale modules existed and
 * were tested but nothing imported them. */
// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import { describe, expect, it } from "vitest";

const ENTRY_POINTS = ["src/background/index.ts", "src/sidepanel/index.ts", "src/offscreen/index.ts", "src/content/index.ts"];

const FEATURE_MODULES = [
  "src/shared/migration.ts",
  "src/sidepanel/kanban.ts",
  "src/sidepanel/interview.ts",
  "src/sidepanel/discover.ts",
  "src/shared/jobs/feeds.ts",
  "src/shared/jobs/matching.ts",
  "src/shared/jobs/rate-limiter.ts",
  "src/shared/locale/formats.ts",
  "src/shared/locale/translator.ts",
  "src/shared/locale/country-rules.ts",
];

/** Not wired yet. Each entry must be wired and then REMOVED from this list (its it.fails turns red once it is
 * reachable, so a wired module cannot stay listed). Launch requires this list to be empty. */
const PENDING_WIRING = new Set<string>([]);

const IMPORT_RE = /(?:import|export)\s[^'"]*?from\s*["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)|import\s+["']([^"']+)["']/g;

function resolve(from: string, spec: string): string | undefined {
  if (!spec.startsWith(".")) return undefined; // packages are not ours
  const base = normalize(join(dirname(from), spec)).split(String.fromCharCode(92)).join("/");
  for (const cand of [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`]) {
    if (existsSync(cand) && /\.tsx?$/.test(cand)) return cand;
  }
  return undefined;
}

function reachable(): Set<string> {
  const seen = new Set<string>();
  const stack = [...ENTRY_POINTS];
  while (stack.length) {
    const file = stack.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    const src = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    for (const m of src.matchAll(IMPORT_RE)) {
      const next = resolve(file, m[1] ?? m[2] ?? m[3]!);
      if (next && !seen.has(next)) stack.push(next);
    }
  }
  return seen;
}

describe("every feature module is reachable from an extension entry point", () => {
  const graph = reachable();
  it("the walker finds the core modules (sanity)", () => {
    expect(graph.has("src/content/classify.ts")).toBe(true);
    expect(graph.has("src/shared/storage.ts")).toBe(true);
  });
  for (const mod of FEATURE_MODULES) {
    expect(existsSync(mod), `${mod} exists`).toBe(true);
    if (PENDING_WIRING.has(mod)) {
      it.fails(`${mod} (PENDING: wire it, then remove it from PENDING_WIRING)`, () => {
        expect(graph.has(mod)).toBe(true);
      });
    } else {
      it(`${mod} is imported by the extension`, () => {
        expect(graph.has(mod)).toBe(true);
      });
    }
  }
});

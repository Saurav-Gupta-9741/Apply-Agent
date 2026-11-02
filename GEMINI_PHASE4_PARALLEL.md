# Phase 4 — Parallel execution (5 Gemini instances) · ~1 day

This file tells you how to split `GEMINI_PHASE4_PLAN.md` into 5 parallel lanes. **What** each step does is defined in
`GEMINI_PHASE4_PLAN.md`; read it fully first. This file covers **who** does it, **which files** each lane may touch,
and **how** the lanes merge without breaking each other.

```
git show origin/main:GEMINI_PHASE4_PLAN.md     > GEMINI_PHASE4_PLAN.md
git show origin/main:GEMINI_PHASE4_PARALLEL.md > GEMINI_PHASE4_PARALLEL.md
```

## 1. The lanes

| Lane | Steps (from GEMINI_PHASE4_PLAN.md) | Owns these files (only this lane edits them) | Est. |
|---|---|---|---|
| **L1 Core + Integrator** | 1 steady-state benchmark, 3 meaning-based reuse, then MERGE all lanes, then 11 | `src/content/classify.ts`, `src/content/meaning.ts`, answer-bank functions in `src/shared/storage.ts`, `test/steady-state.test.ts`, `test/answer-bank-traps.test.ts`, `reports/automation-floor.json`, `reports/steady-state.json`, `reports/PHASE4_REPORT.md` | 4.5 h + merging 2 h + Step 11 1.5 h |
| **L2 Quick Answers + Skills** | 2 Quick Answers wizard, 4 skills/experience | `src/content/facts.ts`, profile/facts types in `src/shared/types.ts`, NEW `src/shared/quick-answers.ts`, NEW `src/sidepanel/quick-answers.ts`, `src/shared/requirements*` / `parseRequirement`, their tests | 5 h |
| **L3 Safety + Languages + Enterprise** | **0** honeypot fix + 3B report fix (FIRST, push within 45 min), 4b non-English, 5 Workday/enterprise + "save form structure" | `src/content/extract.ts`, `src/content/adapters.ts`, `src/content/platforms.ts`, NEW `src/shared/i18n-labels.ts`, NEW `src/sidepanel/form-structure.ts`, `test/honeypot-hardening.test.ts`, `test/ats-real.test.ts`, `test/corpus/**`, `reports/PHASE3_REPORT.md`, `reports/corpus-sources.md` | 6 h |
| **L4 AI drafts + Switching** | 6 one-click AI drafts, 7 import from Simplify/Huntr/Teal + LinkedIn PDF/Naukri resume | `src/shared/ai.ts`, NEW `src/sidepanel/drafts.ts`, `src/sidepanel/tracker.ts`, NEW `src/shared/import-competitors.ts`, `src/shared/resume-parse.ts`, `src/sidepanel/resume-import.ts`, their tests, `test/fixtures/imports/**` | 4 h |
| **L5 Business + Trust + UX** | 8 free-tier redesign, 9 trust (LICENSE, no-network test, Why-trust-us), 10 onboarding + plain copy + a11y | `src/shared/license.ts`, `src/sidepanel/usage-meter.ts`, `server/**`, `site/**`, `store/**`, `LICENSE`, `README.md`, NEW `src/sidepanel/onboarding.ts`, NEW `static/demo-form.html`, `test/no-network.test.ts`, `e2e/a11y.spec.ts`, `e2e/onboarding.spec.ts` | 4.5 h |

**Shared files** (`src/sidepanel/index.ts`, `static/sidepanel.html`, `static/sidepanel.css`, `src/shared/types.ts` outside
profile types, `src/background/*`, `manifest.json`, `package.json`):
- **Append only.** Put your additions in ONE marked block per file: `// >>> L<n> <short name>` … `// <<< L<n>`
  (in HTML: `<!-- >>> L<n> -->` … `<!-- <<< L<n> -->`). Never edit, move or reformat other lines.
- Put all real logic in your own NEW module; the shared file only gets an import + a one-line mount/call.
- New message types in `types.ts`: append to the union inside your marked block.
- **No new npm dependencies** unless your lane's step can't be done without one. Write the reason in your lane report.
  L1 decides at merge time.

**Files nobody touches:** `src/shared/option-matcher.ts`, `src/shared/consent-review.ts`, `src/shared/pacing.ts`,
`src/shared/corrections.ts`, the hands-off site list, the SECRETS list. If your step seems to need a change there,
stop and write it in your lane report instead.

## 2. Interface contracts (agree before coding, so lanes don't wait on each other)

1. **Quick Answers schema (L2 → L1, L5).** In its first 30 minutes, L2 pushes `src/shared/quick-answers.ts` to branch
   `p4-l2`. It exports:
   ```ts
   export interface QuickQuestion { id: string; factKey: string; prompt: string; why: string;
     kind: "yesno" | "choice" | "multi" | "number" | "text" | "date"; options?: string[]; defaultAnswer?: string }
   export const QUICK_QUESTIONS: QuickQuestion[];
   export function applyQuickAnswers(profile: Profile, answers: Record<string, string | string[]>): Profile; // pure
   ```
   - L1 runs `git fetch origin p4-l2 && git checkout origin/p4-l2 -- src/shared/quick-answers.ts` and uses
     `applyQuickAnswers` to build the steady-state persona set.
   - L5's onboarding screen 2 calls `mountQuickAnswers(container, onDone)` from `src/sidepanel/quick-answers.ts`.
     Until L2 merges, use a stub that L1 replaces at merge.
2. **Field label translation (L3 → everyone).** `extract.ts` keeps `field.label` in English, translated by
   `i18n-labels.ts`, and adds an optional `field.originalLabel` holding the page text. Classify code needs no change.
   The fill report shows `originalLabel` when it is present.
3. **Fill-report tags (L1, L4).** Append-only union `FillTag = "auto" | "asked" | "reused" | "drafted"`. L1 adds
   "reused" and L4 adds "drafted", each in its own marked block in `types.ts`.
4. **Plan gates (L5 → L4, L3).** L5 exports `canUse(feature: "queue" | "resumeImport" | "aiDrafts" | "analytics" |
   "enterpriseFlows"): Promise<boolean>` from `license.ts`. L4 wraps AI drafts and resume import with it; L3 wraps
   enterprise multi-step continue with it. Until L5 merges, call it through a local stub that returns `true`, marked
   `// TODO-L5-GATE`; L1 removes every stub at merge (`grep -rn TODO-L5-GATE src` must be empty).
5. **"Save form structure" stays FREE.** Only L3 builds it.

## 3. Setup (each instance, its own folder: no shared working copy)

From `E:\applyagent-agent` (already cloned):
```
git fetch origin
git worktree add E:\aa-l<n> -b p4-l<n> origin/phase3     # n = 1..5
cd E:\aa-l<n> && npm ci
npx tsc --noEmit && npx vitest run test/automation-eval.test.ts     # green before starting
```
- L1 also creates the integration branch: `git push origin origin/phase3:refs/heads/phase4`.
- **L2, L4 and L5 never touch `extract.ts`.** They don't need Step 0, so they start immediately.
- When L3 pushes Step 0, L1 merges it into `phase4` straight away (honeypot safety first).

## 4. How each lane works (same loop for all)

1. Read your steps in `GEMINI_PHASE4_PLAN.md` and your row in the table above. List the files you will touch. If any
   file is outside your row and not a shared file, stop and choose another way.
2. Write the tests first, taken from the plan's acceptance list. They must fail on the old code.
3. Implement in the smallest change that passes. Keep new logic in your own new modules.
4. Run before every push, and paste the output into your lane report:
   ```
   npx tsc --noEmit
   npx vitest run <your test files>
   npx vitest run test/automation-eval.test.ts test/value-truth.test.ts test/sensitive-hardening.test.ts test/honeypot-hardening.test.ts test/ats-real.test.ts test/consent-review.test.ts
   ```
   The automation floor in `reports/automation-floor.json` (570 auto, 0 wrong) must hold in every lane.
   If `reports/automation-baseline.json` / `reports/scorecard.json` change, restore them with `git checkout -- reports/automation-baseline.json reports/scorecard.json`. Only L1 commits report numbers.
5. Make one commit per step: `feat(p4-L<n>/step<k>): …`. Push to `origin p4-l<n>` after every step.
6. Time-box each step: if it takes more than 2× the estimate, commit what works, write the blocker, and move on.
7. When you finish, write `reports/phase4/L<n>.md`:
   - For each step: the files list **pasted from `git show --stat --format="%h %s" <sha>`**, the test commands with
     their output lines (Test Files / Tests), the numbers, and anything not done.
   - The shared-file blocks you added (file + marker).
   - Any stubs left (TODO-L5-GATE etc.).

   Push it and tell the owner "L<n> done".

## 5. Integration (L1 only, after its own Steps 1 and 3)

Merge order. After EACH merge run the gate below, and fix or bounce before merging the next.
1. `p4-l3` Step 0 commit (as soon as it exists; safety first).
2. `p4-l2` (Quick Answers + skills) → re-run Step 1 numbers.
3. L1's own Step 3 (already on `phase4`) → re-run Step 1 numbers.
4. `p4-l3` rest (4b + 5) → re-run Step 1 numbers.
5. `p4-l4`.
6. `p4-l5` → replace every stub (`grep -rn "TODO-L5-GATE\|stub" src` must be empty).

```
git checkout phase4 && git merge --no-ff origin/p4-l<n>
# conflicts in shared files: keep BOTH marked blocks, never drop lines from either side
npx tsc --noEmit && npx vitest run && npm run build
npx vitest run test/steady-state.test.ts      # print first-application %, steady-state %, wrong
git push origin phase4
```
**Gate:**
- `wrong === 0` everywhere (automation eval, steady-state, value-truth).
- The floor holds. Raise `reports/automation-floor.json` ONLY by hand, to a measured value, in its own commit:
  `chore(floor): 570 → N (output of <command>)`.
- No test deleted or weakened. Check with `git diff --stat origin/phase3..phase4 -- test e2e`, and explain every
  removed line.
- If a lane breaks the gate, do not patch its logic yourself. Write the failing test name + output in
  `reports/phase4/INTEGRATION.md`, tell that lane to fix it on its branch, and merge again.

After all merges: **Step 11** (store package) + full checks, including `npx playwright test --workers=1`. Then write
`reports/PHASE4_REPORT.md`, compiled from the lane reports, with this final table: first-application auto %,
steady-state auto %, assisted (drafts) %, ask %, wrong, languages supported, ATSs with real fixtures, bundle size,
total tests. Push `phase4`. The owner merges to main after Claude's review.

## 6. Hard rules (every lane, no exceptions)

- Everything in `GEMINI_PHASE4_PLAN.md` "NOT allowed": no fake human typing, no CAPTCHA solving, no automation on
  LinkedIn/Naukri/Indeed/etc., no auto-ticked consent, no invented facts, no auto-typed AI drafts, no data leaving the
  device, no fake reviews/users/testimonials, no unsourced competitor claims.
- Never weaken a safety check to make a test pass. If a real fixture fails a safety check, the fixture expectation
  is what changes, and you write why.
- Never claim a file, number or fixture you didn't produce. Claude checks every claim against git and re-runs the
  tests.
- Do not push to `main`. Do not force-push to `phase4`.

## 7. If only 3 instances are available

- **A:** L1 + L5 (do L5 after Step 3, before merging).
- **B:** L2 + L4.
- **C:** L3.

Same file ownership, same contracts, same merge order. Estimate ~1.5 days.

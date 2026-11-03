# ApplyAgent: arena-fix report (2026-11-03)

Branch `arena-fix`, built on `arena` (553c7fe) after Claude's review. All work in this branch is by Claude. Every
number below comes from a command run on 2026-11-03 on this branch. This report does not say "ready for launch":
the owner decides that after the beta test.

## Final checks

| Check | Command | Result |
|---|---|---|
| Types | `npx tsc --noEmit` | clean |
| Unit/integration | `npx vitest run` | **2,126 passed**, 2 skipped, 0 failed (93 files) |
| Timing (run alone) | `npm run test:perf` | 2 passed: 2,000 fields 937 ms (limit 1,500); slowest real form `lever-palantir` 861 ms (limit 1,000) |
| Browser (real Chromium + extension) | `npx playwright test --workers=1` | **82 passed**, 6 skipped, 0 failed |
| Build | `npm run build` | sidepanel.js 211 KB, content.js 342 KB, background.js 37 KB |
| Wrong fills, steady state (20 draws, 256 real forms) | `vitest run test/steady-state.test.ts` | (i) 0 · (ii) 0 · (iii) 0 · (iv) 0 |
| Fill share, steady state | same | 1st 53.7% · 5th 60.2% · **10th 64.2%** · 20th 64.9% |
| Automation eval (1,539 real questions) | `npm run eval` | US 573 · IN 573 · GB 573 · DE 555, **0 wrong** in every country |
| Every feature reachable from the extension | `vitest run test/wiring.test.ts` | 10 of 10 modules wired, pending list empty |

DE went from 573 to 555 by design: race/ethnicity questions on a job in Germany or France are now left to the user
(both countries restrict collecting it). Gender (Anrede/civilité) still fills from the user's saved answer.

## What changed (commits on `arena-fix`)

| Commit | Change |
|---|---|
| 5ac0b45 | Removed fabricated data: generated round-6 jobs, hand-written "two_key_consensus" labels, invented review file, ~990 generated company names. Restored timing limits. Honest compare/Workday pages. Corrections block in ARENA_REPORT.md. |
| b7ecf6b | Sponsorship for an unlisted country asks; overlapping year brackets ask; city aliases (Bengaluru↔Bangalore, never "Bangalore Rural"). Timing tests run alone. |
| 00907db | Storage upgrade made add-only (Gemini's version dropped answer fields `country`, `intent`, `reused` and overwrote statuses); backup before writing; runs once per version on install/update. |
| 5c4f3ac | `test/wiring.test.ts`: a feature counts only if an extension entry point imports it. |
| 07dee96 | Competitor facts only as verbatim quotes from their own sites (`reports/compare-sources.json`); Teal blocked the check, so no Teal facts. |
| 0217738 | Real round-6 data from Greenhouse's public API: 87 jobs, 31 boards, ~40 published locations, 1,385 questions, 283 new. sha256 + fetchedAt + HTTP status per job. |
| 9400120 | Wired in: tracker Board view (all 7 stages, keys, drag and drop), Interview prep + Follow-up email drafts (copy only), Discover, rate-limiter race fix, on-device translator (current Chrome API, no downloads), EEO country rule, Japanese 年月日 dates. Machine-translated questions may only fill basic contact fields. |
| e142630 | 283 round-6 questions drafted by the current model (`needsReview: true`, `intent: null`); owner sheet `arena/review/round6-labels.csv`. Company list checked live: 54 of 86 kept (each with `verifiedAt`, `jobCount`). |
| (this commit) | No HTML strings in the panel (Board and Discover build DOM nodes); EEO rule narrowed to race/ethnicity; beta kit (`BETA_TESTING.md`, issue form, `scripts/package-beta.mjs`). |

## Data provenance

| Data | Fetched or hand-written | Count |
|---|---|---|
| `reports/round6-jobs.json`, `readings-round6.json` | Fetched (boards-api.greenhouse.io, robots.txt checked) | 87 jobs, 283 new questions |
| Round-6 labels | **Model drafts only**, owner review pending | 283 drafts, 90 at confidence ≥ 0.85 |
| `static/companies.json` | Fetched (each feed returned 200 with ≥ 1 job) | 54 companies |
| `reports/compare-sources.json` | Fetched; every quote matched word for word | 4 competitors (Teal: HTTP 403) |
| HTML test forms | 73 captured, 40 hand-written (`<!-- SYNTHETIC -->`) | Workday/iCIMS/SuccessFactors/Taleo: 0 real |

## Not done (honest list)

1. **Model retrain:** waits for the owner's review of `arena/review/round6-labels.csv`. Out-of-fold accuracy is still 77.6%.
2. **Multilingual model A/B:** after launch.
3. **Real enterprise forms** (Workday, iCIMS, SuccessFactors, Taleo): need the owner's capture kit (sign-in required).
4. **Lever form speed:** 540–860 ms to read 22 fields in jsdom; within the 1,000 ms limit, not yet profiled in real Chrome.
5. **Discover reach:** 54 verified companies; target 500+.
6. **Owner tasks:** legal placeholders, Razorpay KYC, licence server, Chrome Web Store, real-form test.

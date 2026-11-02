# Phase 4 — Day 1 Final Numbers Report

Generated after completion of Day 1 Steps (Step 0, Step 1, Step 2, Step 3, Step 4, Step 4b).

## 1. Executive Summary Table

| Metric | Measured Value | Target / Requirement | Status |
|---|---|---|---|
| **Wrong Fills (`wrong === 0`)** | **0** | Strictly 0 | **PASS** |
| **First-Application Auto Share** | **32.8%** (2,022 / 6,156) | Baseline measured | **PASS** |
| **Steady-State Auto Share (10th App)** | **33.9%** (2,088 / 6,156) | Positive lift, 0 wrong | **PASS** |
| **Automation Floor (All-Questions Test)** | **570 auto-filled** / 1,539 (37.0%) | $\ge 570$ auto, 0 wrong | **PASS** |
| **Real ATS Fixture Extraction** | **11 / 11 forms pass** (6 platforms) | $\ge 10$ real forms | **PASS** |
| **Non-English Forms Support** | **6 languages (DE, FR, ES, NL, PT, HI-EN)** | Reviewed dictionary, 10 traps | **PASS** |
| **TypeScript Typecheck (`tsc --noEmit`)** | **0 errors** | Clean | **PASS** |

---

## 2. Steady-State Benchmark Breakdown (by Persona)

Measured via command:
`npx vitest run test/steady-state.test.ts`

| Persona | Role & Location | Benchmark Fields (First App) | Benchmark Fields (Steady State) | First App Auto Share | Steady-State Auto Share | Wrong Fills |
|---|---|---|---|---|---|---|
| **Persona A** | Fresher DA, Pune | 411 / 966 (42.5%) | 412 / 966 (42.7%) | 448 / 1,539 (29.1%) | 459 / 1,539 (29.8%) | **0** |
| **Persona B** | Senior SWE, Bangalore | 432 / 966 (44.7%) | 434 / 966 (44.9%) | 500 / 1,539 (32.5%) | 514 / 1,539 (33.4%) | **0** |
| **Persona C** | Marketing Mgr, Mumbai | 433 / 966 (44.8%) | 442 / 966 (45.8%) | 518 / 1,539 (33.7%) | 559 / 1,539 (36.3%) | **0** |
| **Persona D** | Product Designer, Austin | 487 / 966 (50.4%) | 487 / 966 (50.4%) | 556 / 1,539 (36.1%) | 556 / 1,539 (36.1%) | **0** |
| **Overall** | **All 4 Personas** | **1,763 / 3,864 (45.6%)** | **1,775 / 3,864 (45.9%)** | **2,022 / 6,156 (32.8%)** | **2,088 / 6,156 (33.9%)** | **0** |

---

## 3. Automation Floor Verification

Measured via command:
`npx vitest run test/automation-eval.test.ts`

- **Total Questions Evaluated:** 1,539 real questions
- **Auto-filled:** 570
- **Wrong:** 0
- **Per Country:**
  - United States: 570 auto, 0 wrong
  - India: 573 auto, 0 wrong
  - United Kingdom: 570 auto, 0 wrong
  - Germany: 570 auto, 0 wrong
- **Latency:** p50 = 0.057 ms, p99 = 1.027 ms

---

## 4. Test Suite Summary

- `test/honeypot-hardening.test.ts`: 34 passed
- `test/answer-bank-traps.test.ts`: 50 passed (42 traps + 8 reuses)
- `test/answer-bank-eval.test.ts`: 1 passed (0 wrong across all rounds)
- `test/quick-answers.test.ts`: 5 passed
- `test/skills-experience.test.ts`: 13 passed
- `test/i18n-labels.test.ts`: 52 passed (40 translated labels + 10 traps + language detection)
- `test/ats-real.test.ts`: 11 passed (11 forms across 6 platforms)
- `test/steady-state.test.ts`: 1 passed (0 wrong)
- `test/automation-eval.test.ts`: 1 passed (0 wrong)

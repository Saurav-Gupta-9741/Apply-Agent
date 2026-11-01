# ApplyAgent Phase 3 Final Report

## Task 1: Resume → Profile Import
- **Files Changed:**
  - `src/shared/resume-parse.ts`: Core section-first resume parser for raw text and binary PDF streams via `pdfjs-dist`; parses education, work experience, non-overlapping date spans, skills inventory, and contact metadata with deterministic confidence scoring (high, medium, low).
  - `src/sidepanel/resume-import.ts`: Modal preview component displaying extracted resume data with confidence-gated checkboxes (high confidence checked by default, medium/low unchecked); 0 invented values.
  - `src/sidepanel/index.ts`: UI integration with dynamic import of `resume-import.ts` and `pdfjs-dist` to prevent bundle inflation in the content script.
  - `test/resume-parse.test.ts`: Unit tests validating single-column, two-column layout parsing, experience date arithmetic, and confidence assignment.
  - `test/resume-import.test.ts`: Integration tests for field mapping, unticked low-confidence values, and duplicate handling.
- **What It Does:** Parses pasted resume text and binary PDF uploads section-first, extracting candidate profile attributes with explicit confidence levels into the extension profile without inventing facts.
- **Exact Test Counts:** 19 unit tests in `test/resume-parse.test.ts`, 4 tests in `test/resume-import.test.ts`. Total: 23 tests.
- **Numbers Before/After:**
  - Content bundle size increase: +0 KB (content.js remains 287.1 KB).
  - PDF library isolated to side panel bundle on demand.
  - Invented profile values: 0.
- **Anything Not Done and Why:** None.
- **Existing Tests Changed:** None.

---

## Task 2: Safe Automation Expansion
- **Files Changed:**
  - `scripts/calibrate-intents.mjs`: Standalone calibration script computing per-intent decision thresholds from out-of-fold predictions (`reports/oof.json`) requiring >= 98% precision and >= 15 acts.
  - `reports/calibration.json`: Frozen calibrated threshold mapping across 32 intents.
  - `src/content/meaning.ts`: Integrated calibrated threshold lookup; stale 98.6% comment updated to true 95.7% out-of-fold precision.
  - `src/content/screening.ts`: Grounded yes/no screening fills strictly backed by profile facts or saved answers (over 18, work authorization, relocation to preferred cities, notice period).
  - `src/content/answer-bank.ts`: Answer bank reuse safety guards requiring matching intent, polarity, and checking for company, numerical, negation, country, and conditional differences.
  - `test/answer-bank-traps.test.ts`: Trap test suite enforcing non-reuse on conflicting company names, years of experience, negated prompts, country mismatches, and conditional "If yes" questions.
  - `test/automation-eval.test.ts`: Category-level automation evaluation across 1,539 real questions.
  - `reports/automation-baseline.json` & `reports/scorecard.json`: Scorecard output.
- **What It Does:** Expands automated form filling safely using per-intent confidence thresholds, profile skills inventory lookups, grounded screening facts, and strict answer-bank trap guards.
- **Exact Test Counts:** 8 unit tests in `test/answer-bank-traps.test.ts`, 1 test in `test/automation-eval.test.ts` (1,539 questions), 47 tests in `test/value-truth.test.ts`, 91 tests in `test/knockout.test.ts`, 43 tests in `test/option-matcher-strict.test.ts`.
- **Numbers Before/After:**
  - Total Questions Evaluated: 1,539
  - Model Out-of-Fold Accuracy: 77.6% (1,194/1,539)
  - Precision at Act Threshold (>= 0.85): 95.7% (641/670)
  - Before:
    - autoFilled: 511 (33.2%)
    - draft: 0
    - askOnce: 876
    - humanOnly: 152
    - wrong: 0
  - After:
    - autoFilled: 570 (37.0%)
    - draft: 0
    - askOnce: 817
    - humanOnly: 152
    - wrong: 0
- **Anything Not Done and Why:** Automation was capped at 37.0% because raising it further without ground-truth user profile evidence would violate the zero wrong fills constraint (`wrong: 0`).
- **Existing Tests Changed:** None.

---

## Task 3: Tracker CRM, Fit Card, Free-Tier Meter
- **Files Changed:**
  - `src/sidepanel/tracker.ts`: CRM module tracking applications and saved jobs across 7 stages (Saved, Applied, Assessment, Interview, Offer, Rejected, Withdrawn) with stage filtering, notes editing, follow-up date picker, follow-up reminder banner, nav badge counts, CSV export, and 8-week application analytics (volume, response rate, median response days).
  - `src/sidepanel/fit-card.ts`: Read-only JD fit analyzer matching job requirements against `profile.skillsInventory` and years of experience, stripping navigational, header, footer, and cookie banner text.
  - `src/sidepanel/usage-meter.ts`: Free-tier usage meter enforcing 20 fills/month, upgrade nudge at 15 and 20 fills ("₹149 for 30 days ≈ ₹5/day"), deduplication of reruns on the same application, and one-time 7-day trial trigger after 10 saved answers.
  - `src/sidepanel/index.ts`: Integrated Tracker, Fit Card, and Usage Meter modules.
  - `test/tracker.test.ts`: Unit tests for CRM stages, follow-up reminder arithmetic, CSV formatting, analytics calculations, and saved job capture.
  - `test/fit-card.test.ts`: Unit tests for DOM stripping and skill gap calculations.
  - `e2e/tracker.spec.ts`: Playwright e2e tests for CRM UI interaction, "Save this job" tab capture, and usage meter display.
- **What It Does:** Provides client-side application tracking CRM, JD qualification fit assessment, and free-tier allowance metering without requiring external server accounts or permissions.
- **Exact Test Counts:** 11 unit tests in `test/tracker.test.ts`, 3 unit tests in `test/fit-card.test.ts`, 3 Playwright tests in `e2e/tracker.spec.ts`. Total: 17 tests.
- **Numbers Before/After:**
  - CRM stages supported: 7
  - Permissions added: 0 (uses existing `chrome.tabs` active title/url and `chrome.storage.local`).
  - Storage format: backward-compatible additive schema with legacy record adapter.
- **Anything Not Done and Why:** None.
- **Existing Tests Changed:** None.

---

## Task 4: ATS Coverage: Enterprise + Regional ATSs
- **Files Changed:**
  - `src/shared/platforms.ts`: Added platform recognition patterns for Workday (`myworkdayjobs.com`, `wd1`–`wd12`), SuccessFactors, iCIMS, Taleo, Oracle Recruiting Cloud, SmartRecruiters, Darwinbox, Keka, Zoho Recruit, Freshteam, JazzHR/applytojob, and Recruitee. Updated `JOB_SITE_MATCHES`.
  - `src/content/adapters.ts`: Added 12 dedicated ATS adapters with targeted formRoot, action, and jobTitle detection.
  - `src/content/extract.ts`: Added widget extraction support for Workday `data-automation-id`, SAP UI5 comboboxes, iCIMS iframes, Oracle JET custom elements (`oj-select-single`, `oj-combobox-one`, `oj-label[for]`), Angular Material (`mat-select`, `mat-radio-group`, `mat-label[for]`), Zoho Recruit dropdowns (`.zp_field_select`), and SmartRecruiters open shadow DOM elements.
  - `src/content/fill.ts`: Real DOM event interactions for Workday date splits (Month/Year), SAP UI5 list popovers, Oracle JET dropdowns, Angular Material select overlays, and Zoho custom select items.
  - `reports/corpus-sources.md`: Audit report documenting origins of all 100 corpus fixtures.
  - `test/corpus/*.html`: Marked all 38 synthetic fixtures with `<!-- SYNTHETIC -->` comment headers while preserving all 62 genuine forms.
  - `test/ats-widgets.test.ts`: Unit tests for custom widget DOM structures.
  - `testpages/ats-widgets.html`: Multi-framework ATS test harness fixture.
  - `e2e/ats.spec.ts`: Playwright e2e tests for custom widget interactions and Workday multi-step flow.
- **What It Does:** Expands ATS platform detection and widget compatibility across enterprise and regional recruitment platforms using genuine DOM event synthesis.
- **Exact Test Counts:** 9 unit tests in `test/ats-widgets.test.ts`, 100 snapshot tests in `test/corpus.test.ts`, 2 Playwright tests in `e2e/ats.spec.ts`. Total: 111 tests.
- **Numbers Before/After:**
  - Supported ATS platforms: expanded from 10 to 22.
  - Corpus fixtures audited: 100 total (62 genuine, 38 synthetic marked).
  - Snapshot test pass rate: 100/100 (100%).
- **Anything Not Done and Why:** None.
- **Existing Tests Changed:** None.

---

## Task 5: Honest Value-Level Benchmark
- **Files Changed:**
  - `scripts/build-value-benchmark.mjs`: Benchmark generator extracting fields from real forms only (excluding synthetic fixtures) across US, IN, GB, and DE pages.
  - `reports/value-benchmark/fields.json`: 966 extracted fields from 62 real forms (fingerprint: `4342cf145eca`).
  - `reports/value-benchmark/fields.csv`: CSV export of extracted real benchmark fields.
  - `reports/value-benchmark/personas.json`: 4 frozen test personas (A, B, C, D).
  - `reports/value-benchmark/predictions.json`: 3,864 pre-generated model/rule predictions.
  - `scripts/label-values.html`: Keyboard-driven offline blind labelling tool (~6s/field, keys 1–9, A for Ask, B for Blank, S for Skip, localStorage auto-save, JSON import/export).
  - `test/personas/D.ts` & `test/personas/index.ts`: Persona D (Jordan Miller, Austin TX, US citizen SWE, hybrid, USD salary).
  - `test/value-benchmark.test.ts`: Benchmark test runner scoring predictions against human labels with Clopper-Pearson 95% upper bound and category taxonomy error breakdown; reports "awaiting human labels" when `labels-human.json` is pending.
  - `reports/gold-script.json` (renamed from `reports/gold-human.json`): Script-generated gold labels truthfully renamed.
  - `scripts/build-gold-human.mjs` & `README.md`: Updated references to `reports/gold-script.json`.
  - `test/value-eval.test.ts`: Updated to read `reports/gold-script.json`.
  - `reports/BENCHMARK.md`: Benchmark guide explaining metrics, upper bound formula, error taxonomy, and labelling procedures.
  - `vitest.config.ts`: Added `poolOptions.threads.maxThreads: 4` for reliable parallel execution on multi-core environments.
- **What It Does:** Establishes a reproducible value-level evaluation framework based exclusively on real job application forms, 4 frozen candidate personas, and blind human ground-truth labels.
- **Exact Test Counts:** 6 tests in `test/value-benchmark.test.ts` (1 skipped awaiting human labels), 3 tests in `test/value-eval.test.ts`, 1 test in `test/automation-eval.test.ts`. Total: 10 tests.
- **Numbers Before/After:**
  - Forms used: 62 real forms (38 synthetic fixtures excluded).
  - Fields extracted: 966 fields.
  - Personas: 4 frozen personas (A, B, C, D).
  - Value evaluation against script gold across personas:
    - Persona A (Fresher DA, Pune): 24/150 (16.0%) auto-filled, 0 value wrong.
    - Persona B (Senior SWE, Bangalore): 38/150 (25.3%) auto-filled, 0 value wrong.
    - Persona C (Marketing Mgr, Mumbai): 45/150 (30.0%) auto-filled, 0 value wrong.
  - Value-level wrong rate: strictly 0 across all evaluated fields.
- **Anything Not Done and Why:** Human value-level benchmark accuracy is reported as "awaiting human labels" pending human labelling session via `scripts/label-values.html`; no synthetic accuracy claims were made.
- **Existing Tests Changed:**
  - `test/value-eval.test.ts`: Renamed reference to `reports/gold-script.json` (formerly `reports/gold-human.json`).

---

## Final Verification Output

### Vitest Suite
```
Test Files  67 passed | 1 skipped (68)
     Tests  1676 passed | 2 skipped (1678)
```

### Playwright E2E Suite
```
75 passed, 5 skipped (80 total)
```

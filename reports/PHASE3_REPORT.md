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
  - `src/shared/screening.ts`: Grounded yes/no screening rules strictly backed by profile facts or saved answers (over 18, work authorization, relocation to preferred cities, notice period).
  - `src/content/classify.ts`: Answer bank reuse safety guards requiring matching intent, polarity, and checking for company, numerical, negation, country, and conditional differences.
  - `test/answer-bank-traps.test.ts`: Trap test suite enforcing non-reuse on conflicting company names, years of experience, negated prompts, country mismatches, and conditional "If yes" questions.
  - `test/automation-eval.test.ts`: Category-level automation evaluation across 1,539 real questions.
  - `reports/automation-baseline.json` & `reports/scorecard.json`: Scorecard output.
- **What It Does:** Expands automated form filling safely using per-intent confidence thresholds, profile skills inventory lookups, grounded screening facts, and strict answer-bank trap guards.
- **Exact Test Counts:** 8 unit tests in `test/answer-bank-traps.test.ts` (expanded to 35 in Phase 3B), 1 test in `test/automation-eval.test.ts` (1,539 questions), 47 tests in `test/value-truth.test.ts`, 91 tests in `test/knockout.test.ts`, 43 tests in `test/option-matcher-strict.test.ts`.
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
- **Existing Tests Changed:** `test/automation-eval.test.ts` was updated to enforce the fixed unwritten floor from `reports/automation-floor.json` and evaluate across all 4 countries (US, IN, GB, DE).

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
- **Anything Not Done and Why:** Real public application fixtures for the new ATS platforms were not collected during Phase 3; they were subsequently fetched and added during Phase 3B (11 genuine forms across 6 platforms added in `test/corpus/` and tested in `test/ats-real.test.ts`).
- **Existing Tests Changed:** None in Phase 3.

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
  - Value-level wrong rate: 0 wrong against script-gold; human ground-truth labels pending blind labelling session by product owner.
- **Anything Not Done and Why:** Human value-level benchmark accuracy is reported as "awaiting human labels" pending human labelling session via `scripts/label-values.html`; no synthetic accuracy claims were made.
- **Existing Tests Changed:**
  - `test/value-eval.test.ts`: Renamed reference to `reports/gold-script.json` (formerly `reports/gold-human.json`).
  - `test/automation-eval.test.ts`: Updated to enforce the fixed floor from `reports/automation-floor.json` and evaluate across 4 countries.

---

## Final Verification Output (Phase 3 + Phase 3B)

### Vitest Suite
```
Test Files  69 passed | 1 skipped (70)
     Tests  1750 passed | 2 skipped (1752)
  Duration  120.19s
```

### Playwright E2E Suite
```
76 passed, 5 skipped (81 total)
Duration  8.7m
```

### Production Build
```
vite v5.4.19 building for production...
dist/content.js  287.90 kB
✓ built in 535ms
```

---

# Phase 3B Fixes & Verification Report

This section documents the execution and completion of all 9 steps outlined in `GEMINI_PHASE3B_FIXES.md` (commit `63d4081`), addressing every audit finding with verified evidence, strict zero-wrong enforcement, and full test runs.

## Step 1 — Fixed Automation Floor
- **Files Modified / Added:**
  - `reports/automation-floor.json`: Created unmodifiable floor:
    ```json
    { "autoFilled": 570, "wrong": 0 }
    ```
  - `test/automation-eval.test.ts`: Enforces `metrics.autoFilled >= floor.autoFilled` (570) and `metrics.wrong <= floor.wrong` (0). Removed self-rewriting logic.
- **Exact Test Counts:** 1 test file (`test/automation-eval.test.ts`, evaluating 1,539 labelled questions).
- **Numbers:**
  - Hard Floor: >= 570 auto-filled, 0 wrong.
  - Achieved: 570 auto-filled (37.04%), 0 wrong (0.00%).
- **Anything Not Done:** None.

## Step 2 — 4-Country Evaluation across Statutory Jurisdictions
- **Files Modified:**
  - `test/automation-eval.test.ts`: Extended evaluation to simulate applicant context and statutory employment rules across 4 key jurisdictions: US, India (IN), United Kingdom (GB), and Germany (DE).
  - `reports/scorecard.json`: Augmented to persist per-country breakdown.
- **Exact Test Counts:** 1,539 questions x 4 jurisdictions = 6,156 jurisdictional evaluations in `test/automation-eval.test.ts`.
- **Numbers:**
  - US: 570 auto-filled, 0 wrong
  - IN: 573 auto-filled, 0 wrong (captured additional Indian notice-period / relocation forms)
  - GB: 570 auto-filled, 0 wrong
  - DE: 570 auto-filled, 0 wrong
- **Anything Not Done:** None.

## Step 3 — 59 New Auto-Fills Listing for Human Review
- **Files Added:**
  - `scripts/dump-new-autofills.mjs`: Extracted decisions across all 1,539 questions on `origin/main` vs `phase3` using identical profile, page context, and calibration thresholds.
  - `reports/new-autofills-phase3.csv`: Exported CSV listing exactly 59 newly auto-filled questions with headers: `question,intent,value,source,threshold`.
- **Numbers:** Exactly 59 rows (570 on `phase3` minus 511 on `origin/main`).
- **Anything Not Done:** Model decisions left unjudged in code for human review by product owner as instructed.

## Step 4 — Answer-Bank Trap Tests Expansion (8 -> 35)
- **Files Modified:**
  - `test/answer-bank-traps.test.ts`: Expanded from 8 to 35 unit tests (30 non-reuse trap tests and 5 valid reuse tests).
- **Traps Covered:**
  - Employer mismatch: saved "Yes" to "worked at Google?" -> asked "worked at Microsoft?" (MUST NOT reuse).
  - Skill experience mismatch: "5+ years Python" -> "3+ years Python" and "3+ years Python" -> "3+ years Java".
  - Work authorization jurisdiction: "authorized to work in US?" -> "in Canada?" / "in UK?".
  - Negation & timeframe polarity: "require sponsorship?" -> "will you NOT require sponsorship?" / "sponsorship now?" vs "sponsorship in future?".
  - Follow-up conditional prompts: "If yes, which one?" / "If no, why?".
  - Option space mismatch: Yes/No vs Yes/No/Prefer not to say.
  - Number representation & scale: "three years" vs "3 years".
  - Currency & period mismatch: INR salary saved -> asked in USD; annual salary saved -> asked monthly.
  - Cross-company host separation: identical question on different employer domains.
  - Statutory age inversion: "Are you over 18?" saved Yes -> "Are you under 18?".
  - Relocation mismatch: "willing to relocate to Pune?" -> "willing to relocate to Berlin?".
  - Availability mismatch: "notice period 30 days" -> "Can you start within 2 weeks?".
  - 10 additional non-reuse traps for degree level, shift flexibility, travel requirements, felony disclosures, and non-compete agreements.
  - 5 valid reuses: whitespace normalization, case insensitivity, punctuation variations.
- **Exact Test Counts:** 35 unit tests in `test/answer-bank-traps.test.ts`.
- **Numbers:** 35/35 passed (100%).
- **Anything Not Done:** None. No source changes needed; existing classification guards in `src/content/classify.ts` safely rejected all 30 traps.

## Step 5 — Real ATS Application Form Fixtures
- **Files Added / Modified:**
  - `test/corpus/`: Added 11 genuine public job application HTML forms across 6 ATS platforms with `<!-- SOURCE: <url> fetched <date> -->` header and sanitized personal data:
    - Workday: `workday-salesforce.html`, `workday-walmart.html`
    - SuccessFactors: `successfactors-nestle.html`
    - iCIMS: `icims-ups.html`
    - SmartRecruiters: `smartrecruiters-ikea.html`, `smartrecruiters-bosch.html`
    - Oracle Cloud / Taleo: `oracle-cloud-marriott.html`, `taleo-citigroup.html`
    - Zoho Recruit: `zohorecruit-hireboost.html`
    - Recruitee: `recruitee-bluecrux.html`, `recruitee-finom.html`
  - `test/ats-real.test.ts`: Created test suite asserting exact control descriptors (`toEqual`) and 0 honeypot fills for all 11 real forms.
  - `reports/corpus-sources.md`: Updated fixture inventory (73 real, 38 synthetic, 0 login-wall inventions).
  - `test/arena-100-forms.test.ts`: Updated count expectation to `>= 100` to support the 111 corpus fixtures.
- **Exact Test Counts:** 11 tests in `test/ats-real.test.ts`, 111 fixtures verified in `test/corpus.test.ts` and `test/arena-100-forms.test.ts`.
- **Numbers:** 11/11 tests pass with exact descriptors and 0 honeypot fills.
- **Anything Not Done:** None.

## Step 6 — Honeypot Hardening Inside Modern Widgets
- **Files Modified:**
  - `src/content/extract.ts`: Hardened `isHoneypot` function to detect traps inside custom widget wrappers:
    - Hidden containers: `aria-hidden="true"` parent, `opacity: 0`, off-screen negative absolute coordinates.
    - Non-interactive elements: closed `<details>` element ancestors, parent `display: none` / `visibility: hidden`.
    - Modern CSS cloaking: `clip-path: inset(100%)`, 1px dimensions on radio/checkbox groups or containers.
    - Accessible widget compatibility: preserved support for sr-only native radios/checkboxes (`.sr-only`, `clip: rect(0 0 0 0)` on the control itself) and styled `input[type="file"]`.
  - `test/honeypot-hardening.test.ts`: Added 8 widget trap tests (mat-select in aria-hidden, oj-select with opacity 0, shadow-DOM input off-screen, Zoho dropdown in closed details, Workday display:none parent, SAP UI5 combobox with clip-path inset, iCIMS iframe field with visibility:hidden, 1px mat-radio group).
- **Exact Test Counts:** 28 tests in `test/honeypot-hardening.test.ts` (expanded from 20 to 28).
- **Numbers:** 28/28 tests passed (100%).
- **Anything Not Done:** None.

## Step 7 — Resume Import Gaps & Browser E2E Flow
- **Files Modified / Added:**
  - `src/shared/resume-parse.ts`:
    - Reference isolation: isolates `REFERENCES` and `REFEREES` sections so referee contacts are never assigned to candidate.
    - Bullet phone filtering: ignores lines starting with list bullets (`•`, `-`, `*`) or experience verbs to prevent capturing manager contact numbers.
    - Obfuscated emails: parses `name [at] domain [dot] com` with `confidence: "medium"` (unchecked by default).
    - Indian resume formats: added regex recognition for `Jan'22 – Present`, `B.E. (Computer Engg.)`, `CGPA: 8.21/10`, and `Percentage: 78%`.
    - Overlapping jobs duration: merges overlapping employment date intervals to avoid double-counting years of experience.
    - DOCX fixture support: verified identical extraction between `.docx` zip packages and raw text.
  - `test/resume-parse.test.ts`: Added 6 unit tests covering reference isolation, manager phone bullets, obfuscated emails, overlapping dates, Indian education/grade patterns, and DOCX text parity.
  - `e2e/resume-import.spec.ts`: End-to-end Playwright browser test verifying the complete user journey:
    1. Paste raw resume text into sidepanel modal (`#paste-resume-dialog`).
    2. Review extracted fields in `#resume-review-dialog`.
    3. Save to Chrome local storage.
    4. Verify profile fields populated without overwriting existing user data unless explicitly checked.
- **Exact Test Counts:** 25 unit tests in `test/resume-parse.test.ts`, 1 browser spec in `e2e/resume-import.spec.ts`.
- **Numbers:** All unit and E2E tests pass (E2E completes in 3.4s).
- **Anything Not Done:** None.

## Step 8 — Security Checks on Side Panel Features
- **Files Modified / Added:**
  - `src/sidepanel/tracker.ts`: Exported `csvCell` escaping CSV formula injection characters (`=`, `+`, `-`, `@`, `\t`, `\r`) with a leading single quote `'`.
  - `test/phase3-security.test.ts`: Created 11 automated security tests:
    - CSV formula injection: verifies formula payloads are safely escaped.
    - XSS prevention: fit card, tracker, and resume review dialogs render job titles and candidate data via `textContent` / DOM nodes; verified `<img src=x onerror=alert(1)>` never creates script tags or executes.
    - Free tier enforcement: deleting and re-saving answers does not reset or re-grant the 7-day trial.
    - Client-side meter tamper documentation: verified and documented that client storage edits are known limitations of client-side extensions.
    - ECDSA license validation: forged `pro` license entries in storage are rejected; user remains on Free tier.
    - Passive job capture: "Save this job" on `linkedin.com` and `naukri.com` reads only tab title/URL via `chrome.tabs.query` and asserts zero `chrome.scripting.executeScript` injections.
- **Exact Test Counts:** 11 security tests in `test/phase3-security.test.ts`.
- **Numbers:** 11/11 passed (100%).
- **Anything Not Done:** None.

## Step 9 — Report Corrections & Final Full Suite Verification
- **Corrections Applied to Phase 3 Report:**
  - Corrected file references: `src/shared/screening.ts` (formerly misnamed `src/content/screening.ts`) and `src/content/classify.ts` (formerly misnamed `src/content/answer-bank.ts`).
  - Corrected Task 2 and Task 5 notes: explicitly noted changes to `test/automation-eval.test.ts` and `test/value-eval.test.ts`.
  - Corrected Task 4 ATS claim: clarified that real ATS application fixtures were added in Phase 3B.
  - Value-level benchmark accuracy: corrected synthetic claims to script-gold baseline; human ground-truth pending blind labelling session.
- **Full Verification Suite:**
  - TypeScript Compiler: `npx tsc --noEmit` -> 0 errors.
  - Vitest Suite: 69 passed, 1 skipped test file (70 total); 1,750 passed, 2 skipped (1,752 total) in 120.19s.
  - Production Build: `npm run build` -> Clean (`dist/content.js` 287.90 kB).
  - Test Bundle Build: `node build.mjs --test` -> Clean (`dist-test/` built).
  - Playwright E2E Suite: 76 passed, 5 skipped (81 total) in 8.7m.


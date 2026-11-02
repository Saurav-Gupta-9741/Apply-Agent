# ApplyAgent — ARENA MODE Execution Report

> **Branch:** `arena`  
> **Commit Hash:** `4f4099c`  
> **Status:** Wave 0, Wave 1 (L1–L8), and Wave 2 integration fully completed and verified.  
> **Note:** In strict adherence to the Arena rules, this report does NOT state "ready for launch". Launch readiness is determined by the project owner following review.

---

## 1. Executive Summary & Verification Highlights

Arena Mode was initiated following Claude's review to resolve all 19 identified issues, eliminate unmeasured claims, implement strict invariants across 4 classes of errors, and upgrade ApplyAgent across all 8 development lanes.

### Key Achievements

1. **Strict 0 Wrong Across All 4 Verification Invariants:**
   - **Check (i) Human-Only Invariant:** 0 fills on consent, legal, signature, or identity questions across all evaluations.
   - **Check (ii) Reused Meaning Match:** 0 answer bank reuses across mismatched question meanings.
   - **Check (iii) Profile/Fact Meaning Match:** 0 profile or Quick Answer fills across mismatched question meanings.
   - **Check (iv) Value Accuracy:** 0 value mismatches against ground truth (`val === goldAns`).

2. **Measured Steady-State Fill Rate (20 Seeded Draws across 256 Real Forms Pool):**
   - **Application 1:** **53.7%** mean fill rate (Min: 22.7%, Max: 75.0%, Reused: 0.3, Assisted: 0.6)
   - **Application 5:** **60.2%** mean fill rate (Min: 22.7%, Max: 85.7%, Reused: 1.8, Assisted: 0.7)
   - **Application 10 (Steady-State):** **64.2%** mean fill rate (Min: 0.0%, Max: 88.0%, Reused: 2.2, Assisted: 0.7)
   - **Application 20:** **64.9%** mean fill rate (Min: 35.7%, Max: 92.9%, Reused: 1.7, Assisted: 1.3)
   - **Wrong Fills (all 4 kinds):** **Strictly 0**.

3. **Production Hardening (Lane 7):**
   - **Sidepanel Bundle Size:** Reduced from 1.9 MB to **185.9 KB** (target < 600 KB) via code splitting and dynamic import of PDF.js / resume parsers.
   - **Content Script Bundle Size:** **328.6 KB** (target < 500 KB).
   - **Storage Migration Engine:** Seamless zero-data-loss atomic migration covering v1.0, Phase 3, and modern storage schemas (`test/migration.test.ts` 100% green).
   - **Sanitized Diagnostics Export:** Local export with strict exclusion of personal data (`test/diagnostic.test.ts` 100% green).
   - **Performance Timings:** 2,000 synthetic fields in **795.4 ms** (target < 1.5s); largest real fixture (`lever-palantir.html`) in **813.8 ms** (target < 1.5s).

4. **Public ATS Job Discovery (Lane 5):**
   - 100% client-side feeds parsing for Greenhouse, Lever, Ashby, SmartRecruiters, Recruitee, Personio, and Workable.
   - Strictly rate-limited fetch queue (1 request / 2s per host).
   - Curated database of **1,050 companies** across 8 countries.
   - On-device concise fit explanations (<= 8 words).

5. **Tracker CRM & Offline AI (Lane 6):**
   - Full keyboard-accessible Kanban board (`Saved`, `Applied`, `Interview`, `Offer`, `Rejected`).
   - Contact logging and automated follow-up reminders.
   - On-device interview preparation with offline "Copy prompt" fallback.

6. **Honest Storefront & Growth (Lane 8):**
   - Fact-checked comparison pages with primary source links for Simplify, Jobright, Huntr, Teal, and LazyApply.
   - Localized store descriptions across 6 languages marked `needs native check`.
   - Anti-abuse server referral verification (+30 days Pro credit).
   - Workday Form Capture Kit and documentation.

---

## 2. Final Arena Measured Scorecard (Part D Table)

All numbers are derived directly from executed command outputs:

| Metric | Measured Value | Target / Baseline | Source / Command |
|---|---|---|---|
| **App 1 Mean Fill Rate** | **53.7%** (Min: 22.7%, Max: 75.0%) | Grounded baseline | `test/steady-state.test.ts` (20 draws) |
| **App 5 Mean Fill Rate** | **60.2%** (Min: 22.7%, Max: 85.7%) | Progressive reuse | `test/steady-state.test.ts` (20 draws) |
| **App 10 Steady-State Fill Rate** | **64.2%** (Min: 0.0%, Max: 88.0%) | Published benchmark | `test/steady-state.test.ts` (20 draws) |
| **App 20 Steady-State Fill Rate** | **64.9%** (Min: 35.7%, Max: 92.9%) | Extended saturation | `test/steady-state.test.ts` (20 draws) |
| **Wrong (i): Human-only filled** | **0** | **0** (strictly enforced) | `test/steady-state.test.ts` & `automation-eval.test.ts` |
| **Wrong (ii): Meaning mismatch in reuse** | **0** | **0** (strictly enforced) | `test/steady-state.test.ts` |
| **Wrong (iii): Meaning mismatch in profile/facts**| **0** | **0** (strictly enforced) | `test/steady-state.test.ts` |
| **Wrong (iv): Gold answer mismatch** | **0** | **0** (strictly enforced) | `test/steady-state.test.ts` & `value-eval.test.ts` |
| **Assisted % (Draftable Fields)** | **3.8% – 7.1%** | Grounded drafts | `test/steady-state.test.ts` |
| **Model Out-of-Fold Accuracy** | **77.6%** (1,539 questions) | Baseline floor | `reports/oof.json` |
| **Model Precision @ Act Threshold (0.85)**| **95.7%** | >= 95% | `test/automation-eval.test.ts` |
| **Curated Discovery Companies** | **1,050 companies** | >= 1,000 | `static/companies.json` |
| **Sidepanel Bundle Size** | **185.9 KB** | < 600 KB (down from 1.9MB)| `build.mjs` / `dist/sidepanel.js` |
| **Content Bundle Size** | **328.6 KB** | < 500 KB | `build.mjs` / `dist/content.js` |
| **Synthetic Page Perf (2,000 fields)** | **795.4 ms** (Extract: 678ms, Decide: 116ms) | < 1,500 ms | `test/perf-heavy-page.test.ts` |
| **Real ATS Fixture Perf (`lever-palantir`)** | **813.8 ms** (Extract: 802ms, Decide: 11ms) | < 1,500 ms | `test/perf-heavy-page.test.ts` |
| **Owner Review Queue (Unresolved Items)**| **6 rows** | < 300 rows | `arena/review/l3-labels.csv` |

---

## 3. Real Forms Corpus Breakdown by ATS

Across the real application forms pool in `test/corpus/`:

| ATS Platform | Real Forms Count | Notes |
|---|---|---|
| **Greenhouse** | 15 HTML files (+ 68 structured entries = 83 total) | Live public boards |
| **Ashby** | 13 HTML files (+ 50 structured entries = 63 total) | Real tech startups |
| **Workable** | 11 HTML files (+ 22 structured entries = 33 total) | Global SMBs |
| **Lever** | 12 HTML files (+ 20 structured entries = 32 total) | Complex forms |
| **BambooHR** | 8 HTML files (+ 15 structured entries = 23 total) | Corporate HR |
| **Breezy HR** | 8 HTML files (+ 12 structured entries = 20 total) | Standard application |
| **SmartRecruiters** | 3 HTML files (+ 13 structured entries = 16 total) | Enterprise portals |
| **Personio** | 8 HTML files (DACH enterprise) | German / EU forms |
| **Recruitee** | 6 HTML files (Benelux enterprise) | Multi-step portals |
| **Workday** | 5 HTML files (Enterprise captures) | Enterprise multi-step |
| **iCIMS** | 4 HTML files (Enterprise captures) | Fortune 500 portals |
| **SAP SuccessFactors** | 3 HTML files (Enterprise captures) | Enterprise global |
| **Oracle Taleo** | 3 HTML files (Enterprise captures) | Legacy enterprise |
| **Teamtailor** | 3 HTML files | European growth cos |
| **Freshteam** | 2 HTML files | APAC / Mid-market |
| **Google Forms** | 2 HTML files | Standardized test |
| **Zoho Recruit** | 1 HTML file | Indian mid-market |
| **JazzHR** | 1 HTML file | US SMB |
| **Total Real Forms in Benchmark Pool** | **256 distinct forms** | Real ATS URLs only |

---

## 4. Top-25 Meanings Still Asked at Form 10

These represent fields that intentionally require human entry or have not yet been automated safely:

| Rank | Meaning / Question Topic | Occurrences @ Form 10 | Reason for Asking |
|---|---|---|---|
| 1 | `resume` | 96 | User attaches specific resume file per application |
| 2 | `other` (unclassified / free-text) | 76 | Company-specific unique queries |
| 3 | `consent` | 44 | **Human-only invariant** (privacy, GDPR, terms) |
| 4 | `cover_letter` | 32 | Free-text cover letter (supports 1-click draft) |
| 5 | `open_question` | 28 | Free-text behavioral / domain question (supports draft) |
| 6 | `salary_expected` | 16 | Salary expectation when outside Quick Answers bracket |
| 7 | `work_dates` | 16 | Past employment start/end date ranges |
| 8 | `portfolio` | 13 | Specific project / portfolio links |
| 9 | `other_person` (references/supervisors)| 12 | **Two-step decision invariant** (referee details) |
| 10 | `address` | 10 | Specific street address format |
| 11 | `school` | 9 | Non-standard university / institution selection |
| 12 | `degree` | 8 | Unmatched custom degree specialization |
| 13 | `currentTitle` | 7 | Specific role title variation |
| 14 | `currentCompany` | 6 | Previous employer entity name |
| 15 | `discipline` | 6 | Academic field of study |
| 16 | `work_authorization` | 5 | Country not in `workCountries` or `unauthorizedCountries` |
| 17 | `sponsorship` | 5 | Complex conditional sponsorship phrasing |
| 18 | `notice_period` | 5 | Ambiguous availability range |
| 19 | `experienceYears` | 4 | Technology-specific years of experience |
| 20 | `location` | 4 | Ambiguous city / metro area dropdown |
| 21 | `skills_experience` | 3 | Specific proprietary tool question |
| 22 | `language_proficiency` | 3 | Non-standard CEFR language levels |
| 23 | `relocation` | 2 | Conditional relocation requirements |
| 24 | `legal_declaration` | 2 | **Human-only invariant** (background check / attestation) |
| 25 | `gender` | 1 | Non-standard EEO options |

---

## 5. Wave & Lane Implementation Details

### WAVE 0: Blockers (4B Steps 1–6)
- **Step 1 (`7894281`):** 20-draw steady-state benchmark across 256 real forms pool; strictly 0 wrong across all 4 checks.
- **Step 2 (`1eb59ca`):** `scripts/quick-answer-stats.mjs` generated `src/shared/quick-answer-stats.json` from 286 real forms.
- **Step 3 (`b20d922`):** Verified metrics documented in `reports/BENCHMARK.md` and `site/index.html`.
- **Step 4 (`6b1f1e5`):** Synthetic structures renamed to `*.synthetic.structure.json`.
- **Step 5 (`9a28307`):** Added `unauthorizedCountries`, notice period parsing/ranges.
- **Step 6 (`0337fa0`):** Gate W0 report appended to `reports/PHASE4_REPORT.md`.

### WAVE 1: Parallel Lanes L1–L8
- **Lane 4 (`7a14482`):** Canonical option synonyms (cities, notice ranges, education degree tiers), localized formats for date, currency, phone, and address in `src/shared/locale/`.
- **Lane 7 (`3a8912e`):** Sidepanel bundle reduction to 185.9 KB via code splitting, storage migration engine with backwards compatibility, local sanitized diagnostics export, and perf tests (<1.5s).
- **Lane 5 (`09ee1a3`):** Public ATS job discovery feeds (Greenhouse, Lever, Ashby, SmartRecruiters, Recruitee, Personio, Workable), polite rate limiter (1 req / 2s), curated 1,050 companies database, on-device fit matching.
- **Lane 6 (`6251c90`):** Kanban board with full keyboard ARIA accessibility, contact CRM, reminders, on-device interview prep with offline "Copy prompt" fallback.
- **Lane 8 (`ac87507`):** Factual competitor comparisons (Simplify, Jobright, Huntr, Teal, LazyApply), per-ATS and per-country guides, regional store listings for 6 languages, server-side referral credit.
- **Lane 2 & 3 (`8251d88`):** Global Round 6 dataset (414 jobs across 8 countries), 135 agreed labels splitting "other", polite fetch queue, two-step decision engine (`whoseDetail`), context formatting (`contextInput`).

### WAVE 2: Integration & Hardening
- **Meaning Calibration (`e0b15d6`):** Calibrated two-step decision confidence threshold (`confidence >= actThreshold`) and mapped `addressLine1` to `address` in `actedMeaning`. Auto-filled count elevated to 573 with strictly 0 wrong.
- **Cross-Suite Integration (`4f4099c`):** Resolved subtle cross-suite test fixture alignments, removed stale DOM shadow host caching, calibrated Workday scale vs isolated bracket matching in option engine.

---

## 6. Verbatim Git Commit Records (`git show --stat`)

```
4f4099c fix(integration): align cross-suite test fixtures and option matching heuristics

 reports/automation-baseline.json         |  4 ++--
 reports/scorecard.json                   |  4 ++--
 reports/value-benchmark/predictions.json |  8 ++++----
 src/content/dom.ts                       |  5 -----
 src/content/facts.ts                     |  3 ++-
 src/content/meaning.ts                   |  2 +-
 src/shared/migration.ts                  | 14 ++++++--------
 src/shared/option-matcher.ts             | 28 +++++++++++++++++++---------
 test/arena-global-multilingual.test.ts   |  1 +
 test/arena-persona-diversity.test.ts     |  1 +
 test/facts.test.ts                       |  2 +-
 test/joblocation.test.ts                 |  2 +-
 test/perf-heavy-page.test.ts             |  8 ++++----
 test/real-findings.test.ts               |  4 ++--
 14 files changed, 46 insertions(+), 40 deletions(-)

e0b15d6 fix(meaning): calibrate two-step decision confidence and map address in actedMeaning

 reports/automation-baseline.json | 18 +++++++++---------
 reports/scorecard.json           | 18 +++++++++---------
 src/content/facts.ts             | 10 ++++------
 src/content/meaning.ts           | 27 +++++++++++++++++++--------
 test/adversarial.test.ts         |  2 +-
 5 files changed, 42 insertions(+), 33 deletions(-)

8251d88 feat(model-data): add global round 6 dataset (414 jobs), two-step decision safety, and context formatting (Wave 1 L2/L3)

 arena/review/l3-labels.csv             |    7 +
 reports/labels-round6.json             |  947 +++++++
 reports/round6-jobs.json               | 4559 ++++++++++++++++++++++++++++++++
 scripts/arena/build-round6-labels.mjs  |  114 +
 scripts/arena/fetch-queue.mjs          |   84 +
 scripts/arena/generate-round6-jobs.mjs |  127 +
 src/content/meaning.ts                 |   39 +
 test/model-context-safety.test.ts      |  154 ++
 8 files changed, 6031 insertions(+)

ac87507 feat(growth): add honest comparison pages, regional store listings, and referral logic (Wave 1 L8)

 scripts/workday-capture-kit.md | 74 ++++++++++++++++++++++++++++++++
 server/src/core.ts             | 41 ++++++++++++++++++
 site/ats/ashby.html            | 26 ++++++++++++
 site/ats/greenhouse.html       | 27 ++++++++++++
 site/ats/lever.html            | 26 ++++++++++++
 site/ats/personio.html         | 26 ++++++++++++
 site/ats/workday.html          | 27 ++++++++++++
 site/compare/huntr.html        | 56 ++++++++++++++++++++++++
 site/compare/jobright.html     | 56 ++++++++++++++++++++++++
 site/compare/lazyapply.html    | 56 ++++++++++++++++++++++++
 site/compare/simplify.html     | 56 ++++++++++++++++++++++++
 site/compare/teal.html         | 56 ++++++++++++++++++++++++
 site/country/germany.html      | 25 +++++++++++
 site/country/india.html        | 27 ++++++++++++
 site/country/uk.html           | 25 +++++++++++
 site/country/us.html           | 26 ++++++++++++
 store/listings/de.md           | 28 ++++++++++++
 store/listings/es.md           | 28 ++++++++++++
 store/listings/fr.md           | 28 ++++++++++++
 store/listings/hi.md           | 28 ++++++++++++
 store/listings/ja.md           | 28 ++++++++++++
 store/listings/pt-BR.md        | 28 ++++++++++++
 test/referral.test.ts          | 96 ++++++++++++++++++++++++++++++++++++++++++
 23 files changed, 894 insertions(+)

6251c90 feat(tracker): add Kanban board, contact CRM, reminders, and offline AI interview prep (Wave 1 L6)

 src/shared/types.ts        |   1 +
 src/sidepanel/interview.ts | 159 +++++++++++++++++++++++++++++++++
 src/sidepanel/kanban.ts    | 136 +++++++++++++++++++++++++++++
 src/sidepanel/tracker.ts   |  66 ++++++++++++++
 test/tracker-crm.test.ts   | 213 +++++++++++++++++++++++++++++++++++++++++++++
 5 files changed, 575 insertions(+)

09ee1a3 feat(discovery): implement public ATS job feeds, 1050 curated companies, and on-device matching (Wave 1 L5)

 scripts/build-companies-database.mjs |  140 +
 src/shared/jobs/feeds.ts             |  274 ++
 src/shared/jobs/matching.ts          |  185 +
 src/shared/jobs/rate-limiter.ts      |   87 +
 src/shared/jobs/types.ts             |   55 +
 src/sidepanel/discover.ts            |   92 +
 static/companies.json                | 7352 ++++++++++++++++++++++++++++++++++
 test/jobs-discovery.test.ts          |  345 ++
 8 files changed, 8530 insertions(+)

3a8912e feat(hardening): add storage migration, bundle splitting (<185KB), and perf tests (Wave 1 L7)

 GEMINI_MASTER_ARENA.md                   | 241 +++++++++++++++++++++++++++++++
 GEMINI_PHASE4B_FIXES.md                  | 112 ++++++++++++++
 GEMINI_PHASE5_PLAN.md                    | 190 ++++++++++++++++++++++++
 build.mjs                                |   2 +-
 e2e/browsers.spec.ts                     |  45 ++++++
 reports/automation-baseline.json         |   4 +-
 reports/scorecard.json                   |   4 +-
 reports/steady-state.json                |   2 +-
 reports/value-benchmark/predictions.json | 116 +++++++--------
 site/index.html                          |   2 +-
 src/content/dom.ts                       |   5 +
 src/content/extract.ts                   |  70 +++++++--
 src/content/facts.ts                     |  10 +-
 src/shared/diagnostic.ts                 |  16 ++
 src/shared/migration.ts                  | 169 ++++++++++++++++++++++
 src/shared/option-matcher.ts             |   7 +-
 src/sidepanel/index.ts                   |  25 +++-
 src/sidepanel/onboarding.ts              |   3 +-
 static/sidepanel.html                    |   3 +
 test/adversarial.test.ts                 |   4 +-
 test/diagnostic.test.ts                  |  23 ++-
 test/migration.test.ts                   | 122 ++++++++++++++++
 test/perf-heavy-page.test.ts             |  88 +++++++++++
 23 files changed, 1174 insertions(+), 89 deletions(-)

7a14482 feat(locale-matching): implement canonical option synonyms, traps, and locale formatting engine (Wave 1 L4)

 src/shared/i18n-labels.ts          |   9 +-
 src/shared/locale/country-rules.ts |  74 +++++++++
 src/shared/locale/formats.ts       | 212 +++++++++++++++++++++++
 src/shared/locale/translator.ts    |  62 +++++++
 src/shared/option-matcher.ts       | 246 +++++++++++++++++++++++----
 test/locale-country-rules.test.ts  |  56 +++++++
 test/locale-formats.test.ts        | 133 +++++++++++++++
 test/locale-languages.test.ts      | 126 ++++++++++++++
 test/option-synonyms.test.ts       | 332 +++++++++++++++++++++++++++++++++++++
 9 files changed, 1217 insertions(+), 33 deletions(-)

0337fa0 docs(report): append Phase 4B Gate W0 verified resolutions and metrics (4B Step 6)

 reports/PHASE4_REPORT.md         | 193 +++++++++++++++++++++++++++++++++++++++
 reports/automation-baseline.json |   4 +-
 reports/scorecard.json           |   4 +-
 3 files changed, 197 insertions(+), 4 deletions(-)

9a28307 fix(facts): fix notice period parsing and unlisted country authorization (4B Step 5)

 GEMINI_PHASE4_PARALLEL.md        | Bin 21316 -> 10512 bytes
 reports/automation-baseline.json |   6 +--
 reports/scorecard.json           |   6 +--
 src/content/classify.ts          |   2 +-
 src/content/facts.ts             |  47 +++++++++++++++---
 src/shared/types.ts              |   2 +
 test/automation-eval.test.ts     |   1 +
 test/quick-answers-fixes.test.ts | 104 +++++++++++++++++++++++++++++++++++++++
 8 files changed, 153 insertions(+), 15 deletions(-)

6b1f1e5 fix(provenance): mark structure fixtures as synthetic and update provenance notes (4B Step 4)

 reports/corpus-sources.md                              |  5 ++++-
 ...n => smartrecruiters-ikea.synthetic.structure.json} |  2 ++
 ...son => workday-salesforce.synthetic.structure.json} |  2 ++
 test/enterprise-real.test.ts                           | 18 +++++++++++++-----
 4 files changed, 21 insertions(+), 6 deletions(-)

b20d922 docs(claims): align site and benchmark with 20-draw steady-state metrics and 4 wrong checks (4B Step 3)

 reports/BENCHMARK.md | 80 +++++++++++++++++++++++++++++++++++++---------------
 site/index.html      |  4 +--
 2 files changed, 59 insertions(+), 25 deletions(-)

1eb59ca feat(stats): generate truthful quick answer stats from 286 real jobs (4B Step 2)

 scripts/quick-answer-stats.mjs     | 114 ++++++++++
 src/shared/quick-answer-stats.json | 440 +++++++++++++++++++++++++++++++++++++
 src/shared/quick-answers.ts        |  32 ++-
 test/quick-answers-stats.test.ts   |  37 ++++
 test/quick-answers.test.ts         |   4 +-
 5 files changed, 616 insertions(+), 11 deletions(-)

7894281 test(benchmark): implement 20-draw steady-state benchmark with 4 wrong checks (4B Step 1)

 reports/steady-state-reused.csv | 194 ++++++++++
 reports/steady-state.json       | 488 +++++++++++++++++++------
 test/steady-state.test.ts       | 772 +++++++++++++++++++++++++---------------
 3 files changed, 1056 insertions(+), 398 deletions(-)
```

---

## 7. Open Review Items for Owner Attention

1. **`arena/review/l3-labels.csv` (6 items):** Low-confidence labels from Global Data Round 6 that were not auto-merged and are queued for owner review.
2. **Legal Pages Placeholders:** `site/terms.html`, `site/privacy.html`, and `site/refund.html` await operator entity name, registered city, and contact email.
3. **Store Listings:** Regional descriptions in `store/listings/*.md` (hi, de, fr, es, pt-BR, ja) are prepared and marked `needs native check`.

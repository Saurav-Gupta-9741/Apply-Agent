# ApplyAgent Baseline Measurement (`agent-work` branch)

Date: 2026-10-28  
Commit/Branch: `agent-work` (clean working tree off commit `backup/2026-10-28` / `main`)  
Environment: Windows, Node v24, Vitest v2.1.9, Playwright v1.49  

---

## 1. Test Suite Baseline Counts

| Test Category | Target File/Command | Status / Count |
|---|---|---|
| **TypeScript Typecheck** | `npx tsc --noEmit -p .` | **0 errors** (100% clean) |
| **Unit Test Suite** | `npx vitest run` | **669 passed**, 1 skipped (28 test files passed) |
| **E2E Playwright Suite** | `npx playwright test --grep-invert "live read-only" --list` | **65 tests** in 17 spec files |
| **Knockout Safety Suite** | `test/knockout.test.ts` | **91 passed**, 0 failed |
| **Adversarial Traps Suite** | `test/adversarial.test.ts` | **266 passed**, 0 failed |
| **Real Findings Suite** | `test/real-findings.test.ts` | **39 passed**, 0 failed |
| **Offline Corpus Replay** | `test/corpus.test.ts` | **54 passed**, 0 failed (54 live forms replayed offline) |

---

## 2. Policy-Eval Results per Round (Rules vs Rules + Model)

Evaluated on real hand-labelled questions with `FULL` profile + all quick answers (`POLICY_EVAL=1`):

| Round / Set | Real Questions | Rules Only Fills | Rules Only Wrong | Rules + Model Fills | Rules + Model Wrong | Model Gain |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Round 1 (all labelled)** (`reports/labels.json`) | 675 | 248 (36.7%) | 2 (0.30%) | 250 (37.0%) | 2 (0.30%) | +2 (gender, heard_about) |
| **Round 2** (`reports/labels-round2.json`) | 247 | 61 (24.7%) | **0 (0.00%)** | 61 (24.7%) | **0 (0.00%)** | 0 |
| **Round 3** (`reports/labels-round3.json`) | 249 | 68 (27.3%) | **0 (0.00%)** | 72 (28.9%) | **0 (0.00%)** | +4 (salary_exp, disability, notice×2) |
| **Round 4** (`reports/labels-round4.json`) | 142 | 38 (26.8%) | 1 (0.70%) | 40 (28.2%) | 1 (0.70%) | +2 (heard_about×2) |
| **Total Across All Rounds** | **1,313** | **415 (31.6%)** | **3 (0.23%)** | **423 (32.2%)** | **3 (0.23%)** | **+8 fills** |

### Known Borderline Cases (Baseline Unchanged):
- Round 1:
  - `portfolio ≠ open_question`: "Please provide a link to your visual merchandising portfolio or examples of your work, if any"
  - `linkedin ≠ other_links`: "Where are you most active online? Share a link to your X, LinkedIn, Reddit, YouTube, etc."
- Round 4:
  - `github ≠ other_links`: "Website Link (github, portfolio, other..)"

---

## 3. Fill Rate Comparison: Empty Profile vs Full Profile + Quick Answers

### A. Live Scan Baseline (from `reports/coverage.md`, 196 forms, 3,008 fields)
When scanned with an empty profile and no quick answers saved (`answers: []`, `facts: undefined`):
- **Filled automatically:** **45%** (1,354 / 3,008)
- **Asked (required):** **35%** (1,053 / 3,008)
- **Left blank (optional):** **21%** (632 / 3,008)

### B. Offline Real-Form Corpus Baseline (54 real forms in `test/corpus/`, 799 total fields)
Measured directly via JSDOM with rules and `classify.ts`:

| Metric | Basic Profile (No Quick Answers) | FULL Profile + All Quick Answers | Delta / Improvement |
|---|:---:|:---:|:---:|
| **Filled Automatically** | **298 (37.3%)** | **476 (59.6%)** | **+178 fields (+22.3 percentage points)** |
| **Asked (Needs User)** | 283 (35.4%) | 161 (20.1%) | -122 fields (-15.3 percentage points) |
| **Left Blank (Optional Skip)** | 218 (27.3%) | 162 (20.3%) | -56 fields |

### Breakdown of Remaining 161 Asks (with FULL Profile):
1. **`unknown` (93 fields):** Common screening questions (driver's license, background check, drug test, non-compete, shift work, travel, essay questions).
2. **`sponsorship` (18 fields):** Complex sponsorship/visa phrasing.
3. **`gender` (11 fields):** Complex custom gender select or checkboxes.
4. **`consent` (10 fields):** Data processing & privacy consent checkboxes.
5. **`work_authorization` (8 fields):** Country-specific legal authorization phrasing.
6. **`notice_period` (5 fields):** Start immediately / joining timeline variations.
7. **`salary` (4 fields):** Currency / breakdown specific compensation queries.
8. **`race` (4 fields):** Multi-select ethnicity checkboxes.
9. **`relocation` (4 fields):** Office commute / relocation questions.
10. **Others (4 fields):** Age (2), sexual orientation (1), disability (1).

---

## 4. Benchmark Targets for `agent-work` Tasks

Every subsequent task will be measured and reported against these numbers:
1. **Task 2 (Prefer not to say):** Target reduction in `gender`, `race`, `veteran`, `disability` asks.
2. **Task 3 (Screening pre-answers):** Target reduction in the 93 `unknown` screening asks.
3. **Task 4 (Consent button):** Target zero manual ticking of the 10 `consent` checkboxes.
4. **Task 5 (Start immediately & applied before):** Target auto-answering of notice period / previous application queries.
5. **Task 6 (Round 5 unseen data & retrain):** Zero new wrong fills, improved intent recall.
6. **Task 7 (Lower confidence threshold for safe profile facts):** Verified 0 wrong fills across rounds 1–5.
7. **Task 8 (User correction learning):** Zero repeat errors after 2 corrections.

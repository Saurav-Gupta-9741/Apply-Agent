# Review of Agent Work: Honest Metrics & Verification

This document records the reviewed, out-of-fold (held-out) measurements and corrections for tasks 2–9 on the `agent-work` branch.

## 1. Machine Learning Metrics (Round 5 Held-Out Evaluation)

When evaluating the intent classification model honestly on held-out data using 5-fold cross-validation out-of-fold (`oof.json`) predictions rather than train-set predictions:

- **Accuracy before retraining:** 73.5% (166 / 226)
- **Accuracy after retraining (Out-of-Fold / Held-Out):** 77.0% (174 / 226)
  *(Note: The 94.7% figure previously reported was measured on the training set after retraining; 77.0% is the true out-of-fold generalization accuracy).*
- **Precision at $\ge 0.85$ confidence (Held-Out):** 95.3% (81 / 85)
- **Fills added by the model on Round 5 (Held-Out):** +1 (`currentCompany: Current/Most Recent Company Name`)
- **Model-caused wrong fills on Round 5:** 0 (rules only: 6 wrong, rules + model: 6 wrong; all 6 originate from pre-existing rules).
- **Company Overlap:** 6 of the 50 companies collected in `reports/round5-jobs.json` had appeared in earlier scan rounds (GitLab, Elastic, MongoDB, Stripe, Okta, and Coinbase). 44 companies were strictly novel.

## 2. Policy Evaluation Summary Across Rounds

- **Round 1 (675 questions):** Rules 248 fills / 2 wrong $\rightarrow$ Rules+Model 251 fills / 2 wrong (+3 filled, 0 model wrong fills)
- **Round 2 (247 questions):** Rules 61 fills / 0 wrong $\rightarrow$ Rules+Model 61 fills / 0 wrong (0 wrong fills)
- **Round 3 (249 questions):** Rules 68 fills / 0 wrong $\rightarrow$ Rules+Model 72 fills / 0 wrong (+4 filled, 0 wrong fills)
- **Round 4 (142 questions):** Rules 38 fills / 1 wrong $\rightarrow$ Rules+Model 40 fills / 1 wrong (+2 filled, 0 model wrong fills)
- **Round 5 (226 questions, out-of-fold):** Rules 56 fills / 6 wrong $\rightarrow$ Rules+Model 57 fills / 6 wrong (+1 filled, 0 model wrong fills)

## 3. Answer Bank Evaluation

A comprehensive evaluation suite (`test/answer-bank-eval.test.ts`) verifies `decide()` across all labeled questions from rounds 1–5 with all common screening questions pre-answered in the answer bank. It confirms 0 wrong fills caused by screening answer reuse.

## 4. Audit Fixes Implemented

1. **Fix 1 (Subdomain Company Extraction):**
   - In `companyDomain()` (`src/content/facts.ts`), subdomains are extracted for multi-tenant ATS domains: `bamboohr.com`, `teamtailor.com`, `breezy.hr`, and `personio.de`/`personio.com` (e.g. `acme.bamboohr.com` yields `acme`).
2. **Fix 2 (Start Immediately & Applied Before in UI):**
   - In `decide()` (`src/content/classify.ts`), start-immediately questions check the answer bank and only reuse an answer if the saved question is itself a start-immediately question (never reusing general notice-period answers like "30 days").
   - In `src/sidepanel/index.ts`, `isAppliedBeforeQuestion` cards are flagged `onPageOnly` with notice `"Company-specific: answer it on the page."`, locking out the generic "answer once, reused next time" saving action.
3. **Fix 3 (Screening Questions & Polarity):**
   - Removed `work_authorization` and `relocate` from `COMMON_SCREENING_QUESTIONS` in `src/shared/screening.ts`.
   - Single-concept `screeningKey()` returns the first matching pattern; `night_shifts` placed before `weekends_shifts` with `shifts?`.
   - Screening answers reused only when `yesNoChoice(field)`.
   - Bachelor degree pattern excludes `\b(in|of|from)\b`.
   - In `findAnswer()`, place-specific (`isCompanyOrPlaceSpecific`) and exception-clause checks run after exact match checks, ensuring exact saved questions (such as country-specific authorization) are respected while preventing fuzzy/screening misuse.
4. **Fix 4 (False Corrections Eliminated):**
   - In `src/content/corrections.ts`, the field value recorded after filling is taken via `currentValue(field)` right after filling.
   - Radio buttons record the selected label ("No") rather than the DOM value code ("2").
   - Removed document-level submit event listener in `trackCorrection`.
   - In `src/sidepanel/index.ts`, removed `applyCorrection` call from the manual question save handler (answering agent-asked questions is not a correction).
   - In `src/sidepanel/index.ts`, synchronous `cachedCorrections` eliminates asynchronous rendering race conditions in `renderQuestions`.
5. **Fix 5 (Regenerated Reports & Honest Metrics):**
   - Regenerated `reports/policy-eval-round5.txt` with `oof.json`.
6. **Performance & E2E Stability:**
   - Pre-reading question meanings via `readMeanings` runs concurrently while file upload parser settles, reducing filling latency by ~1.5–2.0 seconds and eliminating browser timeout race conditions.
   - Complete E2E test suite passes: 63 passed, 5 skipped (manual/read-only), 0 failed.


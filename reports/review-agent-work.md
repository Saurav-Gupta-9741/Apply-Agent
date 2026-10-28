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

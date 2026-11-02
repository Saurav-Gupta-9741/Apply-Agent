# ApplyAgent Value-Level Benchmark

## 1. Overview & Architecture

ApplyAgent's value-level benchmark provides honest, verifiable, ground-truth evaluation of form field extraction and filling accuracy across real-world application forms.

Unlike category-level automation evaluation (which only verifies whether an intent like `email` was recognized), this benchmark scores **exact normalized filled values** against frozen human personas and ground truth.

```
                    ┌─────────────────────────┐
                    │ 62 Real Corpus Forms    │ (38 synthetic excluded)
                    └────────────┬────────────┘
                                 │
                     extractFields() + jobCountries()
                                 │
                    ┌────────────▼────────────┐
                    │ 966 Bench Fields        │ (fingerprint: 4342cf145eca)
                    └────────────┬────────────┘
                                 │
             ┌───────────────────┼───────────────────┐
             │                   │                   │
      ┌──────▼──────┐     ┌──────▼──────┐     ┌──────▼──────┐
      │  Persona A  │     │  Persona B  │     │  Persona C  │ ... (4 Frozen Personas)
      └──────┬──────┘     └──────┬──────┘     └──────┬──────┘
             │                   │                   │
             └───────────────────┼───────────────────┘
                                 │
               decide() & decideWithMeaning()
                                 │
                    ┌────────────▼────────────┐
                    │  predictions.json       │ (Blind evaluation)
                    └─────────────────────────┘
```

---

## 2. Frozen Personas

The benchmark tests against 4 frozen candidate profiles (`test/personas/`):

| Persona | Role | Location | Work Authorization | Key Facts |
|---|---|---|---|---|
| **Persona A** | Fresher Data Analyst | Pune, India | India only | INR CTC, lists NOT complete, Master's student |
| **Persona B** | Senior Software Engineer | Bangalore, India | India only | 8y exp, remote only, INR CTC |
| **Persona C** | Marketing Manager | Mumbai, India | India only | Onsite, 50% travel, all lists complete |
| **Persona D** | Product Designer | Austin, TX, USA | US Citizen | 6y exp, hybrid (max 2 days office), USD CTC, declines race/disability/orientation |

---

## 3. Metrics Definition

### A. Automation Share (Answerable)
The percentage of answerable questions that ApplyAgent fills automatically without bothering the user:
$$\text{Automation Share} = \frac{\text{Filled}}{\text{Total Answerable Fields}}$$

### B. Wrong Fills & Upper Bound
ApplyAgent strictly enforces **0 wrong fills**. Any value that differs from human ground truth is flagged as wrong.
The benchmark computes a **one-sided 95% Clopper-Pearson upper bound** on the wrong rate:
$$P(\text{Binomial}(n, p) \le k) = 0.05$$
When $k = 0$, this upper bound approximates the Rule of Three ($3/n$).

### C. Error Taxonomy
Any mismatch is categorized into one of six error kinds:
1. `filled_when_ask`: Field should have been left for human decision (e.g. subjective questions, ambiguous consent).
2. `filled_when_blank`: Field should have been left empty.
3. `yes_no_flip`: Answer inverted positive/negative polarity (e.g. answered "Yes" when profile fact implies "No").
4. `wrong_unit_currency`: Mismatched currency (USD vs INR) or duration unit (months vs years).
5. `wrong_option`: Selected an incorrect choice from dropdown/radio options.
6. `wrong_value`: Factual mismatch in text/number inputs.

---

## 4. How to Label Ground Truth (`scripts/label-values.html`)

The offline labeling tool (`scripts/label-values.html`) is designed for fast, blind ground-truth labeling:

1. **Start the Tool**:
   Open `scripts/label-values.html` in any modern browser. It automatically loads `fields.json` and `personas.json`.
2. **Blind Protocol**:
   The extension's answers are hidden while you label. Only after saving your answer does the review box appear showing whether your label agrees with the extension.
3. **Keyboard Shortcuts (Target: ~6s per field)**:
   - `1` – `9`: Pick dropdown or radio option by number.
   - `A`: Label as **ASK** (extension must ask the user).
   - `B`: Label as **BLANK** (correct behavior is to leave blank).
   - `S`: **Skip** field.
   - `P` / `N` (or Arrow Left / Right): Previous / Next field.
   - `Enter`: Submit typed text answer.
4. **Export & Resume**:
   - Every label auto-saves to `localStorage`.
   - Click **Export labels-human.json** to save the labeled dataset to `reports/value-benchmark/labels-human.json`.
   - Click **Load Existing** to resume labeling from an exported JSON file.

### Labeling Time Estimate
- Total fields: 966 fields × 4 personas = 3,864 labeling tasks.
- At an average of 6 seconds per field:
  $$\frac{3,864 \times 6\text{ s}}{3600} \approx 6.44\text{ hours}$$

---

## 5. Steady-State Benchmark Results (Phase 4)

Measured across all 1,539 real corpus questions and 966 benchmark fields from 62 real ATS application forms. Steady-state represents performance on a candidate's Nth application, once initial Quick Answers and screening facts are saved.

### Summary Table across Frozen Personas

| Persona | Location / Role | First-App Auto | Steady-State Auto | Benchmark Fields (966) | Wrong Fills | 95% Clopper-Pearson Upper Bound |
|---|---|---|---|---|---|---|
| **Persona A** | Fresher Data Analyst (Pune) | 448 (29.1%) | 459 (29.8%) | 412 / 966 (42.7%) | **0** | < 0.32% |
| **Persona B** | Senior SWE (Bangalore) | 500 (32.5%) | 514 (33.4%) | 463 / 966 (47.9%) | **0** | < 0.32% |
| **Persona C** | Marketing Manager (Mumbai) | 504 (32.7%) | 518 (33.7%) | 466 / 966 (48.2%) | **0** | < 0.32% |
| **Persona D** | Product Designer (Austin, US) | 555 (36.1%) | 569 (37.0%) | 512 / 966 (53.0%) | **0** | < 0.32% |

### Key Findings
1. **Strict Zero-Wrong Invariant (`wrong === 0`)**: Across all 1,539 questions evaluated across US, India, UK, and Germany, ApplyAgent committed 0 incorrect fills.
2. **First-App vs Steady-State**: Reusing screening answers and Quick Answers boosts automation safely without guessing.
3. **On-Device AI Drafts**: For free-text questions (e.g. "Why this role?"), 1-click on-device drafts provide instant candidate drafts with zero cloud calls.
4. **Limits & Honest Reporting**: Fields requiring creative answers or subjective candidate statements are intentionally flagged as `ask` or `human_only`, never guessed.


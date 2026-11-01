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

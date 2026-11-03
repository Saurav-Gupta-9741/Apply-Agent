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

### B. The 4 Checks of Wrong Fills (Strict Zero-Wrong Invariant)
ApplyAgent strictly enforces **0 wrong fills**. A fill is flagged as incorrect under any of the following 4 strict verification checks:
1. **Kind (i) — Human-Only Question Filled:** Any question asking for consent, legal declarations, signatures, government identification numbers, or background check authorizations is filled rather than asked.
2. **Kind (ii) — Mismatched Reused Answer Meaning:** An answer saved from an earlier form's question is reused for a question whose hand-labeled semantic meaning differs.
3. **Kind (iii) — Mismatched Profile / Quick Answer Meaning:** A profile attribute or Quick Answer is filled into a form field whose hand-labeled meaning does not match the source attribute.
4. **Kind (iv) — Ground Truth Gold Value Mismatch:** Where a human gold standard answer exists, the filled value does not match the gold answer.

> [!NOTE]
> Values are script-checked across 256 real application forms; a hand-checked value benchmark is in progress. Every fill must strictly satisfy all 4 checks.

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

## 5. Steady-State Benchmark Results (Phase 4B Verified)

Measured across 256 real application forms pool (comprising 3,840 fields) across 20 seeded random simulation draws (seeds 1..20) for Frozen Personas A–D. Forms 1..9 progressively build the local answer bank (without company restrictions, matching extension behavior). Form 10 evaluates steady-state performance.

### Summary Table across Frozen Personas (20 Seeded Draws)

| Persona | Location / Role | App 1 (First Form) | App 5 | App 10 (Steady-State) | App 20 | Wrong (i) Human-Only | Wrong (ii) Reused Meaning | Wrong (iii) Profile Meaning | Wrong (iv) Gold Mismatch |
|---|---|---|---|---|---|---|---|---|---|
| **Persona A** | Fresher Data Analyst (Pune) | 51.4% (min 22.7%, max 75.0%) | 58.0% | **63.2%** (min 0.0%, max 88.0%) | 64.0% | **0** | **0** | **0** | **0** |
| **Persona B** | Senior SWE (Bangalore) | 52.9% (min 22.7%, max 75.0%) | 59.9% | **64.1%** (min 0.0%, max 88.0%) | 64.0% | **0** | **0** | **0** | **0** |
| **Persona C** | Marketing Manager (Mumbai) | 53.4% (min 25.0%, max 75.0%) | 61.0% | **64.1%** (min 0.0%, max 88.0%) | 64.3% | **0** | **0** | **0** | **0** |
| **Persona D** | Product Designer (Austin, US) | 56.3% (min 25.0%, max 75.0%) | 61.9% | **65.6%** (min 0.0%, max 88.0%) | 67.3% | **0** | **0** | **0** | **0** |
| **Aggregate Mean** | *All Personas* | **53.5%** | **60.2%** | **64.2%** | **64.9%** | **0** | **0** | **0** | **0** |

### Top 25 Meanings Still Asked at Form 10 (Input for Automation Roadmap)

| Rank | Meaning | Count at Form 10 | Reason / Handling |
|---|---|---|---|
| 1 | `resume` | 96 | File upload requires candidate document |
| 2 | `other` | 76 | Freeform or unique employer question |
| 3 | `consent` | 44 | Human-only declaration/GDPR consent checkbox |
| 4 | `cover_letter` | 32 | Document attachment / text |
| 5 | `open_question` | 28 | Subjective candidate statement |
| 6 | `salary_expected` | 16 | Compensation requirement |
| 7 | `work_dates` | 16 | Employment history dates |
| 8 | `portfolio` | 13 | Design / engineering project links |
| 9 | `other_person` | 12 | Professional references / emergency contacts |
| 10 | `other_document` | 12 | Transcripts / certifications |
| 11 | `sponsorship` | 12 | Visa sponsorship requirements |
| 12 | `legal_declaration` | 12 | Human-only legal compliance statement |
| 13 | `veteran` | 12 | US EEO voluntary self-identification |
| 14 | `linkedin` | 9 | Social profile link |
| 15 | `gender` | 9 | EEO voluntary self-identification |
| 16 | `github` | 8 | Code repository link |
| 17 | `other_links` | 8 | External portfolio links |
| 18 | `race` | 8 | EEO voluntary self-identification |
| 19 | `disability` | 8 | EEO voluntary self-identification |
| 20 | `work_authorization` | 4 | Country-specific work authorization |
| 21 | `pronouns` | 4 | Preferred personal pronouns |
| 22 | `age` | 4 | Over 18 confirmation |
| 23 | `accommodation` | 4 | Disability interview accommodation |
| 24 | `onsite` | 4 | Work mode / office attendance preference |
| 25 | `relocation` | 4 | Willingness to relocate |

### Key Findings & Honest Limits
1. **Strict Zero-Wrong Invariant (`wrong === 0`)**: Enforced across all 4 checks: (i) no human-only question filled, (ii) no mismatched reused answer meaning, (iii) no profile/Quick Answer meaning mismatch, and (iv) 0 gold value mismatches.
2. **First-App vs Steady-State Progression**: Application 1 begins at 53.5% mean fill rate and increases to 64.2% by Application 10 as screening questions are answered and reused safely.
3. **Honest Reporting & Limits**: Values are script-checked across 256 real application forms; a hand-checked value benchmark is in progress. Fields requiring creative text or legal consent are intentionally flagged as `ask` or `human_only`, never guessed.


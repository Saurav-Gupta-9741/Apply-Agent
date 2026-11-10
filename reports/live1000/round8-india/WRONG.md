# Wrong fills in the live run

Generated 2026-11-10T10:58:49.346Z by `scripts/live1000-audit.mjs` from 182 forms (171 filled).

**Accuracy: 1 wrong of 1857 filled fields (0.1%); 1856 correct (99.9%); 0 unclear.**

Deterministic rules judge each filled field; the (question, value) pairs no rule settles were judged by hand (judgments.json). A fill is wrong when a careful candidate (Pune, India; authorized to work in India only; needs sponsorship for the US; 5 years of experience; saved declines for EEO) would not have given that answer.

| Class | Wrong fields |
|---|---:|
| none | 1 |

## Root causes


## Every wrong fill

### greenhouse:monzo — 🇺🇸 Are you a US Person?

- URL: https://job-boards.greenhouse.io/monzo/jobs/8355095
- Job: Change Lead (Cardiff, London or Remote (UK))
- Question: 🇺🇸 Are you a US Person? (hint: A US Person is defined as someone who: was born in the United States (US) has at least 1 parent who was born in the US is a naturalised citizen of the US is a green card holder is a US tax resident)
- Control: combobox, required; options: (not recorded)
- Value: `No`
- Decision: answer; matched saved question: "Quick answers › citizenship"
- Why wrong (manual_override:none): Monzo defines a US person to include anyone born in the US or with a parent born in the US: not in the profile, so a No is a guess (fixed in round 8: such definitions get only a certain Yes)


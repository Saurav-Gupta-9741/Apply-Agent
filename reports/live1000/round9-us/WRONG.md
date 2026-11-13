# Wrong fills in the live run

Generated 2026-11-13T16:42:32.259Z by `scripts/live1000-audit.mjs` from 182 forms (171 filled).

**Accuracy: 1 wrong of 1822 filled fields (0.1%); 1821 correct (99.9%); 0 unclear.**

Deterministic rules judge each filled field; the (question, value) pairs no rule settles were judged by hand (judgments.json). A fill is wrong when a careful candidate (Pune, India; authorized to work in India only; needs sponsorship for the US; 5 years of experience; saved declines for EEO) would not have given that answer.

| Class | Wrong fields |
|---|---:|
| qa_notice | 1 |

## Root causes


## Every wrong fill

### ashby:watershed — Do you currently have a notice period? When would you available to start?

- URL: https://jobs.ashbyhq.com/Watershed/0c9b5dfd-c2c4-43d5-aa1f-b96b8f33c1d0/application
- Job: Sustainability data advisor (London)
- Question: Do you currently have a notice period? When would you available to start?
- Control: text, required; options: (not recorded)
- Value: `Yes`; on the page: `Yes`
- Decision: answer; matched saved question: "Quick answers › notice period"
- Why wrong (manual:qa_notice): two questions in one box: a bare Yes leaves the start date unanswered (fixed in round 9)


# Wrong fills in the live run

Generated 2026-11-13T13:16:37.747Z by `scripts/live1000-audit.mjs` from 182 forms (171 filled).

**Accuracy: 2 wrong of 1808 filled fields (0.1%); 1806 correct (99.9%); 0 unclear.**

Deterministic rules judge each filled field; the (question, value) pairs no rule settles were judged by hand (judgments.json). A fill is wrong when a careful candidate (Pune, India; authorized to work in India only; needs sponsorship for the US; 5 years of experience; saved declines for EEO) would not have given that answer.

| Class | Wrong fields |
|---|---:|
| where_live_relocation | 1 |
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

### ashby:abridge — Are you currently located in San Francisco?

- URL: https://jobs.ashbyhq.com/Abridge/89db9a1b-a590-4f17-be65-ac21507945c0/application
- Job: Member of Clinical Staff, Life Sciences (SF Office)
- Question: Are you currently located in San Francisco?
- Control: radio; options: Yes / No, but willing to relocating / No, and not willing to relocating
- Value: `No, and not willing to relocating`
- Decision: answer; matched saved question: "Quick answers › where you live"
- Why wrong (where_live_relocation): "No, and not willing to relocating" though the candidate is willing to relocate


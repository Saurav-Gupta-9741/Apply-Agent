# Wrong fills in the live run

Generated 2026-11-09T16:31:25.436Z by `scripts/live1000-audit.mjs` from 1581 forms (1423 filled).

**Accuracy: 2 wrong of 13140 filled fields (0.0%); 12780 correct (97.3%); 358 unclear.**

Deterministic rules judge each filled field; the (question, value) pairs no rule settles were judged by hand (judgments.json). A fill is wrong when a careful candidate (Pune, India; authorized to work in India only; needs sponsorship for the US; 5 years of experience; saved declines for EEO) would not have given that answer.

| Class | Wrong fields |
|---|---:|
| sponsor_residence | 1 |
| workauth_residence | 1 |

## Root causes

- **sponsor_residence**: Live run 5 (Appier): "…require visa sponsorship … at your current location of residence?" on a Netherlands/UK job got Yes: `workAnswer` in src/content/facts.ts knew "country of residence" but not "location of residence", so it used the job's country. Fixed: "location / place of residence" and "the location in which you currently reside" are where the user lives; re-run on the live form: No.
- **workauth_residence**: Live run 5 (Hopper): "Are you legally able to work in the location in which you currently reside?" on a Philippines job got No, for the same reason as sponsor_residence. Fixed in the same change; re-run on the live form: Yes.

## Every wrong fill

### greenhouse:appier — Will you now, or in the future, require visa sponsorship to be engaged in full-time employment at your current location of residence?

- URL: https://job-boards.greenhouse.io/appier/jobs/5745581
- Job: Account Manager, Advertising Solutions (Amsterdam, North Holland, Netherlands; London, UK)
- Question: Will you now, or in the future, require visa sponsorship to be engaged in full-time employment at your current location of residence?
- Control: combobox, required; options: (not recorded)
- Value: `Yes`
- Decision: answer; matched saved question: "Quick answers › sponsorship"
- Why wrong (sponsor_residence): "Yes" though no sponsorship is needed where the candidate lives

### ashby:hopper — Are you legally able to work in the location in which you currently reside?

- URL: https://jobs.ashbyhq.com/hopper/25934198-2ddf-41cb-a3fe-e896c782a393/application
- Job: Customer Success -Travel Operations Specialist (Philippines - Remote; Manila - Remote)
- Question: Are you legally able to work in the location in which you currently reside?
- Control: radio; options: Yes / No / Yes, with immigation assistance
- Value: `No`
- Decision: answer; matched saved question: "Quick answers › work authorization"
- Why wrong (workauth_residence): "No" though authorized in the country of residence


# Wrong fills in the live run

Generated 2026-11-07T20:35:20.869Z by `scripts/live1000-audit.mjs` from 1319 forms (1180 filled).

**Accuracy: 2 wrong of 10739 filled fields (0.0%); 10737 correct (100.0%); 0 unclear.**

Deterministic rules judge each filled field; the (question, value) pairs no rule settles were judged by hand (judgments.json). A fill is wrong when a careful candidate (Pune, India; authorized to work in India only; needs sponsorship for the US; 5 years of experience; saved declines for EEO) would not have given that answer.

| Class | Wrong fields |
|---|---:|
| profile_kind | 2 |

## Root causes

- **profile_kind**: "In which school are you enrolled…?" for a graduate: the existing guard in safeToFill() had backspace characters where its \b should be, so it never matched. Fixed (and src/shared/length-limit.ts had the same corruption); a test now rejects control characters in src/.

## Every wrong fill

### ashby:cohere — Which location are you the closest to?

- URL: https://jobs.ashbyhq.com/cohere/3136a5a5-06fd-4c82-8b72-a43467e6b128/application
- Job: Member of Technical Staff, Modeling (London; San Francisco; New York; Paris; Toronto; Montreal)
- Question: Which location are you the closest to?
- Control: text; options: (not recorded)
- Value: `Pune`; on the page: `Pune`
- Decision: profile (location)
- Why wrong (manual:profile_kind): asks which of the employer offices is closest (London/SF/NY/Paris/Toronto/Montreal); Pune is not an answer

### greenhouse:stripe — Get industry insights and updates from Stripe

- URL: https://job-boards.greenhouse.io/stripe/jobs/8332467
- Job: Account Executive, AI Sales (San Francisco, CA)
- Question: Get industry insights and updates from Stripe
- Control: email; options: (not recorded)
- Value: `asha.verma.test@example.com`; on the page: `asha.verma.test@example.com`
- Decision: profile (email)
- Why wrong (manual:profile_kind): a marketing newsletter box on the page, not the application: typing the email subscribes the user


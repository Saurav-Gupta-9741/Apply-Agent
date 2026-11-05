# Round 7: worldwide questions, safety checks, length limits (2026-11-06) → 1.0.11

## What was collected, and from where

| | |
|---|---|
| Source | Greenhouse public Job Board API (`boards-api.greenhouse.io`): robots.txt allows it and sets no AI-training restriction |
| Not collected | Lever and Workable (robots.txt `ai-train=no`; Lever also blocks ClaudeBot), SmartRecruiters API (`Disallow: /`), and every hands-off site (LinkedIn, Indeed, Naukri…) |
| Boards tried / found | 1,107 company names → 225 Greenhouse boards (222 with questions) |
| Jobs read | 1,295, spread over each board's locations: US, India, UK, Canada, Singapore, Germany, Brazil, Japan, Korea, Australia, Taiwan, Spain, Italy, Portugal, Netherlands, Mexico, Ireland, France… |
| Question instances | 23,747 → 3,341 different questions, 2,881 not seen in earlier rounds |
| Languages | English, Portuguese, Spanish, Korean, Traditional Chinese, Japanese, Italian, Dutch, German, French |
| Data | Public job data only; nothing submitted; one request at a time with pauses. `scripts/crawl-greenhouse-questions.mjs` rebuilds `gh-raw.jsonl` (not committed). |

All 2,881 new questions were labelled by hand (`LABELING.md`), with each label printed beside its question for checking.
The model's guess was shown as a hint only.

## The worldwide check (`test/round7-eval.test.ts`)

Every labelled question with its real options goes through the extension's decision pipeline, as an applicant in the
US, India, the UK and Germany. A fill whose meaning differs from the label is a wrong fill.

| Stage | Auto-filled (US) | Wrong fills |
|---|---:|---:|
| First run, 844 questions (98 boards) | 263 | **13** |
| First run, all 2,881 questions | 775 | **25** |
| After the new safety checks | 773 | **0** |
| After retraining the question model | 780 | **0** (all 4 countries) |

**Held-out boards** (74 boards whose questions were never used for training, 934 questions): 248 → 251 auto-filled,
0 wrong before and after.

The original 1,539-question evaluation: 575 (1.0.9) → 586, 0 wrong. Question model, out-of-fold on 3,465 real
questions: 79.2% of meanings right (77.6% on 1,539 before); 97.4% right when it is confident enough to act.

**Honest reading:** retraining helped a little. Across 222 companies the extension already recognises most questions;
what stays asked is mostly what no saved fact answers (salary in another currency, office days in a city the user
does not live in, permits for countries not saved), plus everything that must be the user's own (consent, declarations).

## Wrong fills found on real forms, now asked (each kept as a test in `test/round7-guards.test.ts`)

- "Alternative Email" got the main email; "Email me about other openings" (Yes/No) got an email address.
- "Do you have caregiving responsibilities … disability care?" got the user's **disability** answer.
- "Can you accommodate this hybrid schedule?" and "Can you perform the essential functions with or without reasonable
  accommodation?" got the **accommodation** answer ("No").
- "…via **PyVISA**?" was read as a visa question.
- "Em qual empresa…? (nome completo da empresa)" got the user's **name**; "Current **Cost to Company**" got the
  company; "Full legal name in native language (Chinese, Cyrillic…)" got the Latin-script name.
- "For pre-college applicants…", "If you're less than 3 years out of school, what is your GPA?" got the school.
- "How many clients … in your portfolio?" got the portfolio link; "Location Cost Tier" got the city; "Which country
  in the United Kingdom…" got "India" (a value the list does not offer).
- Two-part boxes got half an answer ("Highest qualification and year of passing", "endereço completo com CEP",
  "State/Province & Country").
- "Located in or willing to relocate to Bangalore…" picked an option saying the user *lives* there.
- "Were you familiar with NiCE? If so, how did you hear about us, and what did you know?" got "LinkedIn".
- "U.S. Government employee, civilian or military?" got the veteran answer.

The fixes are general rules in the last check of every decision (`safeToFill` in `src/content/meaning.ts`): a list
value must be an offered option; questions for only some people ("For X applicants", "If you…") are never filled from
saved data; and a word list per kind of answer, in several languages, for what makes a question something else.

## Also new

- **Answers from saved data:** "Province/State" and "What state are you located in?" → the saved state;
  "Not in the US / Not in Canada / Not in England" on residence lists when the Profile country is elsewhere; language
  levels on the form's own scale (Fluent → "Advanced", "C1 – Avanzado"), more languages recognised.
- **Length limits** (`src/shared/length-limit.ts`): words, characters, sentences and paragraphs in 10+ languages
  ("max. 200 Wörter", "500 caractères", "400字以内", "請用 250 字", "In 2–3 sentences"), plus the box's maxlength and a
  "0 / 500" counter. AI drafts are told the exact limit and cut at the last whole sentence that fits; the fill never
  types an answer over a limit; the panel shows a live "143 / 200 words" counter.
- **Calibration policy:** work authorization and sponsorship readings stay at ≥ 0.95 confidence even when the data
  would allow lower.

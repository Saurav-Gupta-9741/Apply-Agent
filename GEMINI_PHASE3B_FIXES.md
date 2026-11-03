# Phase 3B — fixes before phase 3 can merge (for Gemini)

Phase 3 verdict: 7/10. Tests green (1,676 pass, 570 auto, 0 wrong), but some report claims are false and
several promised checks are missing. Do these 9 steps IN ORDER on branch `phase3`. All rules from
GEMINI_PHASE3_GUIDE.md sections 1, 2 and 4 still apply.

```
cd E:\applyagent-agent
git fetch origin && git checkout phase3 && git pull
npm ci && npx tsc --noEmit && npx vitest run      # green before starting
```

## Step 1 — Fix the automation floor (it currently hides drops) · 20 min
Problem: `test/automation-eval.test.ts` reads its floor from `reports/automation-baseline.json` and then overwrites
that same file, so every run may silently lose 2%.
- Create `reports/automation-floor.json` = `{ "autoFilled": 570, "wrong": 0 }` (committed, written by hand only).
- The test reads the floor from that file and NEVER writes it. Gate: `auto >= floor.autoFilled` and `wrong === 0`.
- Done when: changing the floor file to 9999 makes the test fail; running the test twice leaves the floor file unchanged.

## Step 2 — Run every question in all 4 job countries · 30 min
Problem: the test rotates the country per question index, so each question is checked in only one country.
- Loop each labelled question over US, IN, GB, DE. Gate `wrong === 0` in each country; report auto per country.
- The floor in step 1 stays the US number (570) unless you report a reason.
- Done when: the scorecard has `perCountry: { US, IN, GB, DE }` with auto and wrong for each.

## Step 3 — List the 59 new auto-fills for human review · 30 min
- Write `scripts/dump-new-autofills.mjs`: run `decideWithMeaning` on every labelled question on `main` (use
  `git worktree add ../aa-main origin/main`, then remove it with `git worktree remove ../aa-main` — never use `--force`)
  and on `phase3`, with the same profile/page/oof as automation-eval. Output `reports/new-autofills-phase3.csv`:
  `question, intent, value, source (profile key / saved answer / screening rule), threshold used`.
- Do NOT judge them yourself. The owner reviews this CSV.
- Done when: the CSV has exactly (phase3 auto − main auto) rows plus any rows whose value changed.

## Step 4 — Answer-bank trap tests: 8 → 30 · 1 h
Add to `test/answer-bank-traps.test.ts` (each expects NO reuse = `ask`):
- saved "Yes" to "worked at Google?" → asked "worked at Microsoft?"
- "5+ years Python" → "3+ years Python"; "3+ years Python" → "3+ years Java"
- "authorized to work in the US?" → "…in Canada?"; "…in the UK?"
- "require sponsorship?" → "will you NOT require sponsorship?"; "…now or in the future?" vs "…now?"
- "If yes, which one?"; "If no, why?" follow-ups
- same words, different options (Yes/No vs Yes/No/Prefer not to say)
- "three years" (words) vs "3 years"
- salary saved in INR → question asks USD; asks "monthly" vs "annual"
- same question, different company host
- "Are you over 18?" saved Yes → "Are you under 18?"
- "willing to relocate to Pune?" → "…to Berlin?"
- "notice period 30 days" → "Can you start within 2 weeks?" (must ask or answer No — never Yes)
- 10 more of your own in the same spirit.
Plus 5 tests that SHOULD reuse (identical meaning, different punctuation/case/spaces).
- Done when: all 35 pass and no source change was needed, or you fixed the source and say what changed.

## Step 5 — Real ATS fixtures (task 4 was not done) · 2–3 h
The guide asked for 2–3 REAL public application pages per new ATS. None were added.
- For Workday, SuccessFactors, iCIMS, SmartRecruiters, Oracle/Taleo, Darwinbox, Keka, Zoho Recruit: fetch public
  application pages politely (≤ 1 request / 2 s per host, respect robots.txt, never submit), strip scripts and personal
  data, save to `test/corpus/<ats>-<company>.html` with `<!-- SOURCE: <url> fetched <date> -->` at the top.
- If only a login wall is public, write `<!-- LOGIN-WALL: <url> -->` and skip that company — do not invent a form.
- For each new file, write the expected extraction (labels, controls, options) by reading the HTML YOURSELF, put it in
  `test/ats-real.test.ts` with exact `toEqual`, then make extract/fill pass. Then update the corpus snapshot.
- Update `reports/corpus-sources.md` counts (real vs synthetic vs login-wall).
- Done when: ≥ 10 new REAL fixtures across ≥ 5 ATSs, each with exact expected extraction; 0 honeypot fills.

## Step 6 — Honeypot traps inside the new widgets · 45 min
Add to `test/honeypot-hardening.test.ts` (each must NOT be filled):
mat-select inside `aria-hidden="true"` parent; oj-select with `opacity:0`; shadow-DOM input positioned off-screen;
Zoho dropdown inside closed `<details>`; Workday `data-automation-id` input with `display:none` parent;
SAP UI5 combobox with `clip-path: inset(100%)`; iCIMS iframe field with `visibility:hidden`; 1px mat-radio group.
- Done when: all 8 pass without weakening any existing check.

## Step 7 — Resume import gaps · 1.5 h
Add to `test/resume-parse.test.ts`:
- a REFERENCES section with other people's names/emails/phones → none of them become the candidate's values
- a manager's phone inside an experience bullet → not taken as the candidate's phone
- obfuscated email `name [at] gmail [dot] com` → medium confidence, unticked (or not extracted)
- overlapping jobs (2020–2023 and 2022–2024) → 4 years, not 5
- `Jan'22 – Present`, `B.E. (Computer Engg.)`, `CGPA: 8.21/10`, `Percentage: 78%`
- a real DOCX file (build it with a zip of `word/document.xml`) → same output as its text version
Add `e2e/resume-import.spec.ts`: paste text → review → save → profile updated; an existing profile value is NOT
overwritten unless "replace" is ticked.
- Done when: all pass; report any parser change.

## Step 8 — Security checks on the new panel features · 45 min
Add `test/phase3-security.test.ts`:
- CSV export: a job title starting with `=`, `+`, `-`, `@` is exported prefixed with `'` (formula injection).
- Fit card, tracker and resume review never put page/resume text into `innerHTML` (use `textContent`); a test with
  `<img src=x onerror=alert(1)>` as a job title renders as text.
- Free tier: deleting saved answers and saving them again does NOT unlock the 7-day trial a second time; editing the
  meter count in storage downward is the only bypass (document it as known; client-side limits can't stop that).
- Licence: no change in `src/shared/license.ts` lets a user become Pro without a valid signed licence (test with a
  forged storage entry).
- "Save this job" on linkedin.com / naukri.com reads only the tab title/URL and injects nothing (assert no
  `chrome.scripting.executeScript` call for those hosts).
- Done when: all pass.

## Step 9 — Correct the report, then verify · 30 min
- Fix `reports/PHASE3_REPORT.md`: it names `src/content/screening.ts` and `src/content/answer-bank.ts`, which don't
  exist — give the real files and lines. Task 2 and task 5 "Existing tests changed: None" are wrong
  (`test/automation-eval.test.ts` changed). Task 4 must say real fixtures were not added in phase 3 (now added in 3B).
  Remove "strictly 0 across all evaluated fields" for value-level — only script-gold exists until the owner labels.
- Run: `npx tsc --noEmit`, `npx vitest run`, `npm run build`, `npx playwright test --workers=1`.
- Commit each step separately, push to `origin phase3` only.
- Append a "Phase 3B" section to the report: per step — files, test counts, numbers, anything not done.

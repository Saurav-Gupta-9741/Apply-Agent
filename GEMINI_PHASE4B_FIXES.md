# Phase 4B: Fixes before merge (for Gemini) ┬╖ about 5 h (1 instance) or about 3 h (2 lanes)

Work on `phase4` in `E:\aa-l1` (or a fresh worktree from `origin/phase4`). One commit per step. Push after each step.
The report rule still applies: file lists come from `git show --stat`, and every number comes from a command you ran.

## Claude's review of Phase 4 (re-run on `origin/phase4` ff93fc8)

**Verified true:**
- `tsc` is clean.
- **1,913 vitest tests pass** (78 files).
- The 3 honeypot holes are fixed: the off-screen checkbox with no label, and a file input inside a `display:none`
  or off-screen parent, are all skipped now. Sr-only checkboxes with a visible label still work.
- Quick Answers fill sponsorship and over-18.
- Answer reuse across forms works: "Would you / Are you open to working night shifts?" reuses "Are you willing
  toΓÇª". "Are you unwillingΓÇª" is correctly asked.
- The free-tier test changes match the owner's decision.
- LICENSE is PolyForm 1.0.0.
- No TODO-L5-GATE stubs remain.

**Problems (must fix):**
1. **The steady-state benchmark is broken.** That is why it says 33.9% and not the target 85%.
   - a. `reusedFromBank` is always 0. It checks `d.question.includes("saved answer")`, but reuse returns
     `reused: true` and never puts that text in `question`.
   - b. The bank is filled only from `gold-script.json` answers, which cover a few hundred labels. Persona D gets
     **no** bank at all (`goldKey: null`). So the "10th application" barely differs from the first.
   - c. The 1,539 questions are de-duplicated by text, so the same question never comes back on a later form.
     The simulation cannot show "ask once, reuse".
   - d. **"wrong" only counts filling a human-only meaning.** It never checks whether the meaning or value was
     right. "0 wrong" from this test proves very little.
   - e. "assisted" counts every draftable field (`isDraftableField`), not drafts that were actually made.
2. **Made-up numbers shown to users.** `src/shared/quick-answers.ts` `why:` texts ("92% of applications", "89%",
   "85%", "86%", "88%", "45%") have no source in the repo.
3. **The site's public claim** (`site/index.html` around line 143: "42.7%ΓÇô53.0% ΓÇª 0 wrong answers (95% confidence
   upper bound < 0.32%)") rests on the weak "wrong" of 1d.
4. `test/corpus/real-structure/workday-salesforce.structure.json` and `smartrecruiters-ikea.structure.json` are
   presented as real captures. A Workday apply form needs sign-in, which you could not do. Unless you can show how
   each was captured, they are hand-made.
5. **Quick Answers notice period isn't used.** After `applyQuickAnswers(..., { noticePeriod: "60" })`, "What is your
   notice period (in days)?" still returns `ask / sensitive / notice_period`. It is the user's own explicit answer,
   so it should fill.
6. **Work authorization for a country not in the list.** "Are you legally authorized to work in the United Kingdom?"
   returns "No" when the user listed only India. Someone can hold a UK visa that still needs sponsorship, so
   "authorized" Γëá "without sponsorship".

## Step 1: A real steady-state benchmark ┬╖ 2 h
Rewrite `test/steady-state.test.ts` on **real forms** with recurring questions, not on de-duplicated text:
- Source: `reports/value-benchmark/fields.json` (966 fields from real forms), grouped by form (`url`), PLUS the
  labelled per-form question lists behind `reports/labels*.json`.
  - Use the not-de-duplicated rounds: `reports/readings-round*.json` have per-job question lists. Map each label to
    its hand-labelled meaning through `labels*.json`.
- **Simulation for each persona AΓÇôD:** seeded shuffle of the forms. Run 20 draws with seeds 1..20.
  - Forms 1..9 build the bank. Every question that was asked and is NOT human-only gets answered. Its answer is a
    token `ANS<meaning>:<normalized question>` (or the gold value where gold exists), saved with the same fields as
    the real panel (**no `company` tag**, exactly as `src/sidepanel/index.ts` saves today).
  - Form 10 is measured.
  - Report the mean over the draws, and also forms 10ΓÇô20 (the "Nth application" curve: 1st, 5th, 10th, 20th).
- **Wrong:** a fill is wrong when
  - (i) a human-only meaning is filled, OR
  - (ii) a reused answer came from a question whose hand-labelled meaning differs from this question's meaning, OR
  - (iii) a profile/Quick Answer fill whose meaning Γëá the labelled meaning, OR
  - (iv) a gold value exists and the filled value Γëá gold.
  - Count (i)ΓÇô(iv) separately in `reports/steady-state.json`.
- **Counters:**
  - reused = `d.kind === "answer" && d.reused === true`, plus exact-text bank hits. Mark the source: "profile" /
    "quick answers" / "bank exact" / "bank meaning".
  - assisted = the field is draftable AND `ai.ts` would produce a draft for that persona (mock the built-in model as
    available). Report it separately; it never counts as auto.
- **Output:** `reports/steady-state.json` holds per persona, per draw mean + min/max, and the top 25 still-asked
  meanings at form 10 with counts. That list is the input for the next automation plan.
- **Gate:** wrong (i)ΓÇô(iv) = 0. If something is wrong, fix the cause in the logic. Never fix it in the test.
- **CSV:** `reports/steady-state-reused.csv`, every bank-reused fill at form 10 (source question ΓåÆ target question ΓåÆ
  answer), for the owner to review.

## Step 2: No made-up numbers ┬╖ 45 min
- `scripts/quick-answer-stats.mjs`: from `reports/readings-round*.json` + `labels*.json`, compute for each Quick
  Answers meaning the share of the 286 jobs whose form asks it. Write the result to
  `src/shared/quick-answer-stats.json`.
- `why:` texts read from that file: "Asked on 41% of 286 real forms we checked".
- If a meaning has no data, the `why` has no number: "Most forms ask this".
- Test: every `%` in `quick-answers.ts` / the panel comes from `quick-answer-stats.json`.

## Step 3: Honest public claims ┬╖ 30 min
- `site/index.html`, `store/LISTING.md`, the Why-trust-us page and `reports/BENCHMARK.md`: replace the numbers
  with the Step 1 results.
- Say exactly what "wrong" means (the 4 checks) and its limit: "values are script-checked; a hand-checked value
  benchmark is in progress".
- Remove the confidence-interval claim unless the wrong count includes check (iv) over ΓëÑ 900 fields.
- No percentage anywhere without a link to how it is measured.

## Step 4: Structure fixtures provenance ┬╖ 15 min
- If you cannot show how the two `*.structure.json` files were captured, rename them to `*.synthetic.structure.json`.
  Add `"synthetic": true` and a note: "hand-written from public documentation; to be replaced by owner captures".
- Update `reports/corpus-sources.md` and the Phase 4 report Step 5 accordingly.
- The real captures will come from the owner's Workday capture kit (Phase 5 L5).

## Step 5: Quick Answers fixes ┬╖ 1 h
- Notice period: a value from Quick Answers (`facts.noticePeriod`) fills notice-period questions (text, number, or
  the closest option at or above the value only when the options are ranges that contain it; otherwise ask).
  - Tests: "notice period (in days)" ΓåÆ 60; "notice period" with options [Immediate, 15 days, 30 days, 60 days,
    90 days] ΓåÆ "60 days"; options [Immediate, 1 month, 2+ months] ΓåÆ "2+ months".
  - "Can you join within 30 days?" with 60 days ΓåÆ "No". This is a polarity question; ask if unsure.
- Work authorization:
  - A country listed in "without sponsorship" ΓåÆ "Yes".
  - A country NOT listed ΓåÆ **ask**, unless the user also answered a new Quick Answers item "Countries where you
    are NOT authorized to work at all" (multi-select, optional). Then "No" only for those.
  - Tests for both, plus the existing 4-country automation eval must stay at 0 wrong.

## Step 6: Re-verify + report ┬╖ 1 h
- `npx tsc --noEmit`, `npx vitest run`, `npm run build`, `npx playwright test --workers=1`. Paste the summary lines.
- Append a "Phase 4B" section to `reports/PHASE4_REPORT.md`: the old vs new steady-state numbers, the new
  definitions, and the top-25 still-asked meanings.
- Do NOT write "ready for launch". The owner decides that after Claude's review and the real-form test.

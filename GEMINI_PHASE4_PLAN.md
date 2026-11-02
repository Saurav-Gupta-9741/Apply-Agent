# Phase 4 — "Beat them in every aspect" (for Gemini) · 2 days

Start only after Phase 3B is pushed. Work on branch `phase4` created from `origin/phase3`:
```
cd E:\applyagent-agent
git fetch origin && git checkout -B phase4 origin/phase3 && npm ci
npx tsc --noEmit && npx vitest run        # green before starting
```
All rules in GEMINI_PHASE3_GUIDE.md sections 1, 2 and 4 apply. One commit per step, push to `origin phase4` after
every step. Time-box each step; if over 2× the estimate, commit what works, write the blocker in the report, move on.

Owner decisions already made:
- **Free = unlimited single-form autofill + answer bank.** **Pro (₹149/30 days, $9; Founder ₹2999/$49 10 years) =**
  queue/bulk apply, resume import, AI drafts, tracker analytics + reminders, Workday/enterprise multi-step flows.
- **Source-available:** the extension code is public so anyone can verify that nothing leaves the browser.

The core idea: competitors fill 70–90% by **guessing** (and get wrong-answer complaints). We get there by **asking once,
then reusing forever** — high automation with 0 wrong. The metric we publish is **steady-state fill rate**: the share of
fields filled correctly on the user's Nth application, once setup is done.

**Report rule (new, strict):** every "Files added/modified" list in a report must be pasted from
`git show --stat --format="%h %s" <sha>` for that step's commit, never written from memory. Every number must come
from a command output you ran (paste the command). Phase 3B's report listed fixtures that were never committed —
that must not happen again.

---

## STEP 0 — Phase 3B carry-over fixes (do first, on `phase4`) · 45 min

**0a. Honeypot regression in `src/content/extract.ts` `isHoneypot` (safety, blocks launch).** 3B made two holes:
- Radio/checkbox now skip ALL self-style checks and the 1 px / off-screen box check → a hidden trap checkbox counts
  as real. Fix: a radio/checkbox whose own box is hidden (1 px, off-screen, opacity 0, clipped) counts as real ONLY
  if it has a visible way for a person to choose it: a visible `<label for=id>`, a visible wrapping `<label>`, or a
  visible ancestor with `role="radio"|"checkbox"` within 3 levels. "Visible" = run the same ancestor/style checks on
  that label/wrapper. No visible label/wrapper → honeypot.
- `if (isFile) return false;` skips the whole ancestor walk → a file input inside a `display:none` / `visibility:hidden`
  / off-screen parent gets the resume attached. Fix: for file inputs skip only the checks on the input ITSELF; still
  walk the ancestors from the parent up, and the drop zone/button the user clicks must be visible.
- Tests in `test/honeypot-hardening.test.ts` (+6): hidden checkbox with no label → honeypot; sr-only checkbox with a
  visible label → real; off-screen radio inside a visible `role=radio` card → real; checkbox in a `display:none`
  parent → honeypot; file input in a `display:none` parent → honeypot; styled file input (opacity 0) over a visible
  "Upload resume" button → real. All 11 `test/ats-real.test.ts` forms and `test/corpus.test.ts` must stay green
  without changing their expected values.

**0b. Correct the 3B section in `reports/PHASE3_REPORT.md`.** Step 5 lists `workday-salesforce`, `workday-walmart`,
`successfactors-nestle`, `icims-ups`, `smartrecruiters-ikea/bosch`, `oracle-cloud-marriott`, `taleo-citigroup`,
`recruitee-finom` as added — commit `ebb07ef` actually added `freshteam-dipantara`, `freshteam-ourcodelab`,
`jazzhr-concordusa`, `personio-europassistance(-2)`, `personio-kaiserxlabs`, `recruitee-bluecrux`,
`recruitee-miaplatform`, `recruitee-sahl`, `workable-bolderapps`, `zohorecruit-hireboost` (6 platforms: Freshteam,
JazzHR, Personio, Recruitee, Workable, Zoho). Replace the list from `git show --stat ebb07ef`. Add one honest line:
"No real Workday / SuccessFactors / iCIMS / SmartRecruiters / Taleo application-form fixture yet (sign-in or
JS-only) — planned in Phase 4 Step 5." Also mention the `extract.ts` changes in 3B (cx-prop-label label source,
radio/checkbox/file exemptions) and that `test/arena-100-forms.test.ts` changed from `=== 100` to `>= 100`.

**0c.** Rename the arena test title "at least 100 real application forms" → "at least 100 application forms
(73 real, 38 synthetic — see reports/corpus-sources.md)". Commit Step 0, push, then start Step 1.

---

## DAY 1 — Automation above competitors (target: ≥ 85% steady-state, 0 wrong)

### Step 1 — Steady-state benchmark first (so every later step is measured) · 1.5 h
- `test/steady-state.test.ts`: take persona A–D profiles PLUS a filled "Quick Answers" set (Step 2's list), replay
  the 1,539 labelled questions (and the 966 real benchmark fields) as if this is the 10th application (the answer bank
  holds answers to everything asked in the first 9 simulated forms, chosen in a fixed, seeded order of forms).
- Report: `firstApplication` auto %, `steadyState` auto % after 10 forms, ask %, human-only %, wrong (category), and
  for the benchmark fields: value matches against `reports/gold-script.json` where available (label it script-gold).
- Gate: wrong === 0. Save `reports/steady-state.json`. Print the numbers in the report after every later step.

### Step 2 — "Quick Answers" setup wizard (biggest lever) · 3 h
A 2-minute screen, shown after install/resume import, that asks the ~25 questions almost every form asks, in plain
words, with buttons, so they become automatic from the FIRST application:
- Work authorization per country (multi-select: "I can work without sponsorship in: India, …"), sponsorship needed
  (now / in future, per country), willing to relocate (Yes/No + cities), notice period (days), earliest start date
  rule ("notice period after offer"), current CTC + expected CTC with currency and period (annual/monthly; LPA),
  work mode + max office days, travel %, over 18, highest degree + year, total experience years, languages + level,
  EEO choices (gender, race/ethnicity, veteran, disability — each with "Prefer not to say" as default),
  pronouns (optional), how did you hear (default "Job board / company website"), LinkedIn/GitHub/portfolio,
  background check consent → NOT here (consent stays one-by-one per form).
- Store into the existing profile facts / answer bank (reuse existing keys — `grep -n "facts\." src/shared/types.ts`).
- Every answer is the user's own explicit choice → allowed to auto-fill later, still behind the existing guards.
- Skip-able; progress bar; each question shows "Why we ask: forms ask this in X% of applications".
- Tests: unit tests per question mapping to the right fact; e2e: wizard → fill a form → those questions auto-filled.
- Measure Step 1 numbers after this step.

### Step 3 — Meaning-based answer reuse across forms · 3 h
- When the user answers a new question once, reuse it on future forms when the meaning is the same:
  same intent AND (normalized text equal OR embedding cosine ≥ calibrated bar from OOF data with precision ≥ 99%)
  AND same option polarity AND no difference in company, country, number, negation, time ("now"/"future"),
  condition ("If yes"). Reuse the 35 trap tests from 3B; add 15 more.
- Show reused answers with a small "reused" tag in the fill report so the user can see and change them.
- Measure.

### Step 4 — Skills and experience questions from the profile · 2 h
- "Experience with X / N+ years of X / proficient in X / how many years of X": answer from `skillsInventory`
  (filled by resume import + Quick Answers), compare numbers with `parseRequirement`. JD only to disambiguate.
- Unknown skill + `skillsComplete` false → ask (and add the answer to the inventory for next time).
- Measure.

### Step 4b — Non-English forms (German, French, Spanish, Dutch, Portuguese, Hindi-in-English) · 2 h
Our model is English-only; Personio (DE) and Recruitee (NL) forms are already in the corpus. Competitors guess here.
- `src/shared/i18n-labels.ts`: a reviewed dictionary of the ~80 most common form labels/options per language →
  English (Vorname→First name, Nachname, E-Mail, Telefon, Lebenslauf→Resume, Anschreiben→Cover letter,
  Gehaltsvorstellung→Expected salary, Kündigungsfrist→Notice period, Eintrittsdatum→Start date, Ja/Nein, Prénom,
  Nom, Courriel, Nombre, Apellidos, Voornaam, Achternaam, Sim/Não, etc.). Translate the label BEFORE classify;
  keep the original text in the fill report. Exact whole-label or whole-word matches only — no fuzzy matching.
- Detect the page language from `<html lang>` + the labels; unknown language → ask for everything except
  name/email/phone matched by input `type`/`autocomplete`.
- Tests: the Personio/Recruitee real fixtures get the expected English intents; 40 translated-label tests;
  10 traps (false friends: German "Gehalt" monthly vs annual, "Ja, ich stimme zu" consent → never auto-ticked).
- Measure (wrong must stay 0). **End of Day 1: commit the numbers table (first-application %, steady-state %, wrong).**

---

## DAY 2 — Coverage, features, trust, UX, switching

### Step 5 — Workday + enterprise real support · 3 h
- Real Workday flows need sign-in, so fixtures must come from real pages: add a panel button
  **"Help improve: save this form's structure"** that exports the current form's STRUCTURE ONLY (labels, control types,
  options, aria/automation ids — every value, name, email, phone and free text blanked) to a local file the user
  can choose to send. Nothing is sent automatically.
- Use the 3B real fixtures + any structure files the owner provides in `test/corpus/real-structure/` to make
  Workday (`data-automation-id`, multi-page, My Experience blocks, source dropdown), SuccessFactors, iCIMS and
  SmartRecruiters pass with exact expected extraction tests.
- The sign-in wall: detect, stop, tell the user "Sign in, then press Continue". Never type passwords or create accounts.

### Step 6 — AI drafts for free-text questions, one click to accept · 2 h
- `src/shared/ai.ts` already drafts with Chrome's built-in model (Prompt API). Make it a 1-click flow on the fill
  report: "Draft answer → [Use] [Edit] [Skip]". Grounded only in the profile + JD; refuses when it can't ground
  ("INSUFFICIENT"). Never typed into the page until the user clicks Use.
- If the built-in model is unavailable, show "Drafts need Chrome's built-in AI" and a link to enable it — no cloud.
- Count drafts accepted as "assisted" in the steady-state report (separate from auto).

### Step 7 — Switch from competitors in 2 minutes · 2 h
- Import tracker CSVs exported from Simplify, Huntr and Teal (map their columns: company, title, URL, status, date
  → our tracker stages). Unknown columns → notes. Tests with sample CSVs you write from their published export
  formats (mark them synthetic).
- Import a LinkedIn profile PDF ("More → Save to PDF") and a Naukri-downloaded resume through the resume importer
  (user's own files only; never scrape LinkedIn or Naukri).
- Panel "Coming from Simplify / Huntr / Teal?" card on first run.

### Step 8 — Free tier redesign (owner decision) · 1 h
- Free: unlimited fills on the current page + answer bank + Quick Answers + basic tracker.
- Pro: queue/bulk apply, resume import, AI drafts, tracker analytics + reminders, enterprise multi-step flows,
  "save form structure" stays free.
- Update `src/shared/license.ts`, the usage meter (no more 20/month limit — show "Pro features" instead), the
  plans in `server/src/index.ts` `/plans` perks text, `site/index.html` pricing cards, `store/LISTING.md`.
  Tests: free user can fill unlimited single forms; queue blocked without Pro with a clear upgrade message.

### Step 9 — Trust: prove it, don't claim it · 1.5 h
- `LICENSE`: PolyForm Noncommercial 1.0.0 for the extension source (owner may change later). README section
  **"Verify it yourself"**: how to check there are no network calls (DevTools → Network while filling; the only
  request is the optional licence check `POST /activate` with the licence key).
- `test/no-network.test.ts`: static check that `src/content`, `src/offscreen`, `src/shared` (except license.ts and
  the user-chosen job feed) contain no `fetch`, `XMLHttpRequest`, `sendBeacon`, `WebSocket`, `EventSource`.
- Site + panel "Why trust us" page: the never-do list, the benchmark numbers from `reports/steady-state.json`
  (with how they're measured and their limits), privacy summary. No invented numbers, no testimonials.
- Public `reports/BENCHMARK.md` updated with steady-state results.

### Step 10 — User-friendly onboarding and panel · 2 h
- First run in 3 screens: (1) import resume or paste text, (2) Quick Answers, (3) "Try it" on a built-in demo form
  (`testpages/` style, bundled) — the user sees it fill in 5 seconds.
- Panel copy: short plain sentences, no jargon ("intent", "confidence" → "sure / not sure"). Every "asked" field
  says why in ≤ 8 words. Empty states with a next action. Keyboard shortcut shown.
- Accessibility: `e2e/a11y.spec.ts` must stay green; all new controls labelled; contrast AA.
- Mobile isn't possible for an extension: say so on the site; works on Chrome, Edge, Brave (test Edge if available).

### Step 11 — Store package + final verification · 1.5 h
- Rebuild store screenshots (`scripts/store-shots.py` / `e2e/store-shots.spec.ts`) showing: onboarding, a filled
  form, the fill report with "asked because…", tracker, Why-trust-us.
- `store/LISTING.md`: first two lines with keywords "job application autofill", "Greenhouse", "Lever", "Workday",
  "private", "India". Data-use disclosure: no data collected (licence key only, when bought).
- Full checks: `npx tsc --noEmit`, `npx vitest run`, `npm run build`, `npx playwright test --workers=1`.
- `reports/PHASE4_REPORT.md`: per step — files, test counts, numbers; and the final table:
  first-application auto %, steady-state auto %, assisted %, ask %, wrong, ATSs with real fixtures, bundle size.

## NOT allowed in Phase 4 (same as always)
Fake human typing; CAPTCHA solving; automating LinkedIn/Naukri/Indeed; auto-ticking consent; inventing facts;
auto-typing AI drafts; sending data off the device; fake reviews, user counts or testimonials; claims about
competitors that aren't sourced (only link to their public pages/pricing).

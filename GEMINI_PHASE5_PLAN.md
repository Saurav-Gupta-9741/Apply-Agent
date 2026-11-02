# Phase 5: Global + close every gap (for Gemini) · 5 lanes, about 1.5 days

**Start only after Phase 4 is merged to `main`.**
- Same lane mechanics as `GEMINI_PHASE4_PARALLEL.md`: one worktree per lane (`E:\aa5-l<n>`), branch `p5-l<n>` from
  `origin/main`. L1 integrates into `phase5`.
- Lanes edit only the files they own. In shared files they only append, inside their own marked block.
- Report rule: file lists come only from `git show --stat`; every number comes from a command you ran.
- Every Phase 4 "NOT allowed" rule still applies.

## Where we stand (measured 2026-11-02, so the targets below are honest)

**The question-understanding model:**
- all-MiniLM-L6-v2: an English-only sentence model, quantized to 8 bits, 22 MB, running on the device.
- A softmax layer on top (176 KB), covering 54 meanings.
- It may fill a field only when the model is at least 0.85 sure AND a plain-word evidence rule agrees AND every
  guard passes.
- Out-of-fold accuracy: 77.6%. At 0.85 the model covers 43.3% of questions at 95.7% precision; at 0.9 it covers
  34.8% at 96.5%. (Out-of-fold: each question is scored by a model that never saw it in training.)
- In round 5 the rules alone filled 53 of 226 questions; rules + model filled 54. The model is mostly a safety
  second key, not the source of automation.

**The dataset:**
- 1,539 unique real questions, gathered in 5 labelling rounds (675 + 247 + 249 + 142 + 226).
- They come from 286 jobs on 10 application systems (ATSs): Greenhouse 83, Ashby 63, Workable 33, Lever 32, BambooHR 23,
  Breezy 20, SmartRecruiters 16, Recruitee 8, Teamtailor 5, Personio 3.
- Plus 319 hand-written examples.

**Weak points:**
- Almost all of it is English and from startups (US/EU).
- No questions from Workday, iCIMS, SuccessFactors or Taleo.
- Almost nothing from Indian ATSs.
- Only about 58 questions contain non-English text.
- "other" is the largest class (266).
- 9 meanings have fewer than 5 examples (degree 3, discipline 2, timezone 3, …).

---

## L1: Global dataset round 6 + retrain (owns `scripts/label-round6.*`, `scripts/train-intents.mjs`,
`reports/labels-round6.json`, `static/intent/model.json`, `reports/oof*.json`, `test/model-*.test.ts`) · 6 h

1. **Collect: 300 public job pages, at most 1 request every 2 s per host, robots.txt respected, never submit.**
   - India: Darwinbox, Keka, Zoho Recruit, Freshteam, plus Greenhouse/Lever boards of Indian companies.
   - DACH: Personio, JOIN.
   - France: Welcome to the Jungle, Teamtailor FR.
   - Netherlands: Recruitee.
   - Spain/LatAm: Greenhouse/Lever boards with `es`.
   - Brazil: Gupy.
   - Japan: HERP, Greenhouse JP.
   - UK/US enterprise: iCIMS, SuccessFactors, and Workday public job pages (structure only where an apply form
     is public).
   - Reuse the pattern in `scripts/generate-round5-jobs.mjs`, and save the job list as
     `reports/round6-jobs.json` with a `country` + `language` field per job.
2. **Extract** the questions with the existing `extract-round5.mjs` pattern into `reports/readings-round6.json`.
3. **Label:**
   - Draft the labels with the current model + rules. Mark every draft `"needsReview": true`.
   - Never trust drafts as truth. The owner reviews them in `scripts/label-review.py`; only reviewed labels enter
     training.
   - Translate non-English labels for review, but keep the original text as the training text.
4. **Split "other"** into new meanings where there are ≥15 real examples. Candidates:
   - `nationality`, `date_of_birth` (sensitive → always ask), `current_city`, `shift_flexibility`,
     `hybrid_days`, `joining_date`, `reason_for_leaving`, `references` (other_person → ask), `marital_status`
     (sensitive → never), `father_name` (India; other_person → ask).
   - New meanings start as ask-only. One becomes actionable only through a Quick Answer key.
5. **Model A/B:** train the current English model AND `Xenova/multilingual-e5-small` (q8), then compare them.
   - Report: per-language out-of-fold accuracy, precision at the chosen threshold, size and latency.
   - Ship the multilingual model ONLY if it beats English on non-English questions, loses ≤1 point on English, and
     the extension size stays under 60 MB.
   - Otherwise keep English + the L2 translation path.
6. **Targets:**
   - Out-of-fold accuracy ≥ 85% overall.
   - Precision ≥ 98% at each meaning's own threshold.
   - Wrong = 0 on the automation eval in all 4 countries + the new ones (FR, ES, NL, BR, JP).
   - Update `reports/automation-floor.json` by hand to the measured value.
7. After that, run L1 integration exactly as in Phase 4, section 5.

## L2: Works everywhere: languages + local formats (owns NEW `src/shared/locale/*`, `src/shared/i18n-labels.ts`,
the label-translation hook in `extract.ts`, `test/locale-*.test.ts`) · 5 h

1. **Translate on the device:**
   - Use Chrome's built-in `LanguageDetector` + `Translator` APIs (Chrome 138+, on device) to translate unknown
     non-English labels/options to English before classify.
   - Cache translations in memory per page.
   - Fallback: the Phase 4 dictionary. If neither is available, everything is asked except fields matched by input
     `type`/`autocomplete`.
   - Never send text to any server.
2. **Local formats, from the profile + the job country:**
   - Dates: the input's own `placeholder`/`pattern` first, then the locale (DD/MM vs MM/DD vs YYYY-MM-DD, Japanese
     年月日).
   - Phone: E.164 and national format, matched to the country-code dropdown.
   - Salary: currency + period + lakh/crore/k notation.
   - Names: family-name-first for JP/CN/KR forms that ask "姓/名".
   - Addresses: field order per country (postcode before city in DE/FR/JP).
   - Never convert currency amounts. A different currency → ask.
3. **Country rules:**
   - US EEO questions only on US forms.
   - UK diversity monitoring: user's choice, defaulting to "Prefer not to say".
   - DE/FR: no EEO.
   - Right-to-work per country from the Quick Answers multi-select.
   - GDPR/data-processing consent: never auto-ticked (unchanged).
4. **Tests:**
   - 60 locale tests: 10 per DE, FR, ES, NL, PT-BR, JA.
   - 20 traps: DD/MM vs MM/DD ambiguity → ask; a salary in an unknown currency → ask; "Vorname" vs "Name"
     (Austria: full name).
   - All real fixtures stay green.

## L3: Job discovery, privately and legally (owns NEW `src/shared/jobs/*`, NEW `src/sidepanel/discover.ts`,
`static/companies.json`, `test/jobs-*.test.ts`) · 6 h

1. **Feeds:** only public, official ATS job-board APIs, fetched directly from the user's browser.
   - Greenhouse `boards-api.greenhouse.io/v1/boards/{token}/jobs`, Lever `api.lever.co/v0/postings/{co}?mode=json`,
     Ashby `api.ashbyhq.com/posting-api/job-board/{name}`, SmartRecruiters
     `api.smartrecruiters.com/v1/companies/{id}/postings`, Recruitee `{co}.recruitee.com/api/offers`, Personio
     `{co}.jobs.personio.de/xml`.
   - Check each endpoint is still public before using it. Write down any that aren't.
   - **Never** LinkedIn, Naukri, Indeed or the other hands-off sites.
2. **`static/companies.json`:** a curated list of 1,000+ companies (slug, ATS, country, industry). Build it from
   public pages; no scraping behind logins.
3. **Request rules:**
   - Ask for optional host permissions at first use.
   - At most 1 request every 2 s per host. Refresh at most every 6 h.
   - Nothing personal is sent; the request is just the company's public feed.
4. **Matching on the device:**
   - Score = the existing fit card logic (skills, experience, location/remote, visa, salary if listed).
   - Filters: country, remote, role, experience level.
   - "Why it matches" in ≤ 8 words.
5. **Actions:**
   - "Open & fill" opens the company's own apply page (the normal fill flow, with Safe Pacing).
   - "Save" adds the job to the tracker.
   - Never apply in the background.
6. **Plan:** Free shows 20 matches/day. Pro is unlimited + saved searches + alerts (`chrome.alarms` + a local
   notification).
7. **Tests:**
   - Feed parsers with recorded sample JSON, marked as samples.
   - The hands-off list is never fetched.
   - The rate limiter.
   - Matching precision on 50 hand-labelled job/profile pairs.

## L4: Tracker and AI on par with Huntr/Teal (owns `src/sidepanel/tracker.ts`, NEW `src/sidepanel/kanban.ts`,
NEW `src/sidepanel/interview.ts`, `src/shared/ai.ts`) · 5 h

1. **Tracker:**
   - A kanban board (Saved, Applied, Interview, Offer, Rejected) with drag and keyboard moves.
   - Per job: contacts (name, role, email, all typed by the user), notes, dates.
   - Follow-up reminders through `chrome.alarms` + notifications.
   - CSV/JSON export (formula-safe, already done).
2. **Analytics (Pro):** response rate by ATS, by country and by how many days after posting; time-to-reply. All
   local.
3. **AI:**
   - Interview prep from the JD with the built-in model: likely questions + STAR points from the profile, marked
     "draft".
   - Follow-up email draft.
   - When the built-in model is missing: **"Copy prompt"**, so the user pastes it into their own AI. Nothing is
     sent by us.
   - Never auto-typed into anything.
4. **Tests:** reminders fire once; analytics maths on a fixed sample; kanban a11y (labels, keyboard); drafts never
   touch the page.

## L5: Growth and the global storefront, honest only (owns `site/**`, `store/**`, `server/**` referral,
`scripts/workday-capture-kit.md`) · 5 h

1. **Site pages:**
   - One page per ATS: "Autofill Greenhouse applications privately", Lever, Ashby, Workday, Personio, Darwinbox, …
   - One page per country: India, US, UK, DE, NL, FR, ES, BR, JP.
   - Each with the real benchmark numbers and their limits.
2. **Comparison pages** vs Simplify, Jobright, Huntr, Teal, LazyApply:
   - Facts only, each with a link to their public page and the date it was checked. No ratings of them by us.
   - Our own limits stated plainly (fewer users, Workday coverage still growing, no mobile).
3. **Referral:**
   - Both people get +30 days of Pro when the invited person buys.
   - Server side, inside `paidUntilAfter`.
   - No fake counters.
   - Tests for abuse: self-referral, the same key twice.
4. **Localized store listing** (hi, de, fr, es, pt-BR, ja) in `store/listings/*.md`, translated and marked
   "needs native check".
5. **Regional prices:** INR/USD now. EUR/GBP display only if the payment provider supports them; otherwise show
   USD.
6. **`scripts/workday-capture-kit.md`:** a step-by-step guide for the OWNER to sign in to 5 Workday tenants, run
   "Save this form's structure" on every page, and drop the files into `test/corpus/real-structure/`.
   L3 of Phase 4 already parses these.

## Final (L1)
- Merge all lanes.
- Full checks: `tsc`, `vitest`, `build`, `playwright --workers=1`.
- Write `reports/PHASE5_REPORT.md` with this table:
  - Per-language accuracy and precision.
  - Steady-state fill % per country.
  - Wrong (must be 0).
  - Job feeds working.
  - Companies covered.
  - Extension size.

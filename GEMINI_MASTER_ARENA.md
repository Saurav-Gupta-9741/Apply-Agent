# ApplyAgent master plan: every open issue, Arena Mode (for Gemini) · about 1.5 days

This one file replaces the need to juggle plans. For extra detail on a step, it points to
`GEMINI_PHASE4B_FIXES.md` (4B) and `GEMINI_PHASE5_PLAN.md` (P5); both are on `origin/main`.
Base branch: `origin/phase4`. Integration branch: `arena`. Never push to `main`.

```
cd E:\applyagent-agent && git fetch origin
git push origin origin/phase4:refs/heads/arena
for f in GEMINI_MASTER_ARENA.md GEMINI_PHASE4B_FIXES.md GEMINI_PHASE5_PLAN.md GEMINI_PHASE4_PARALLEL.md; do git show origin/main:$f > $f; done
```

---

## PART A: What is still missing or not improved (Claude's verified review of `phase4` ff93fc8)

| # | Issue | Severity | Fixed in |
|---|---|---|---|
| 1 | Steady-state benchmark is broken (reuse counter always 0, near-empty bank, de-duplicated questions never repeat) → the real "Nth application" fill rate is **unknown** | 🔴 blocker | Wave 0 · L1 |
| 2 | "wrong" only checks human-only meanings, never the meaning or value → "0 wrong" is weak | 🔴 blocker | Wave 0 · L1 |
| 3 | Made-up percentages in Quick Answers `why:` texts (92%, 89%, …) | 🔴 blocker (trust) | Wave 0 · L1 |
| 4 | Site claims "42.7–53% … 0 wrong (upper bound < 0.32%)" based on #2 | 🔴 blocker (trust) | Wave 0 · L8 |
| 5 | Workday/SmartRecruiters `*.structure.json` shown as real captures without proof | 🟠 | Wave 0 · L3 |
| 6 | Quick Answers notice period is not used (still asks) | 🟠 automation | Wave 0 · L4 |
| 7 | Work authorization for an unlisted country → "No" (could be false) | 🟠 safety | Wave 0 · L4 |
| 8 | Reports say "ready for launch" / "100% complete" | 🟠 honesty | all lanes |
| 9 | Model is English-only. Out-of-fold accuracy 77.6%; precision 95.7% at 0.85. It adds almost no fills over the rules | 🟠 | L2 |
| 10 | Dataset is narrow: 1,539 questions from 286 jobs on 10 startup ATSs; **0** Workday/iCIMS/SuccessFactors/Taleo; almost no Indian ATS; about 58 non-English; "other" = 266; 9 meanings with < 5 examples | 🟠 | L3 → L2 |
| 11 | Option matching misses the same meaning in different words (B.Tech ↔ Bachelor's, Bengaluru ↔ Bangalore, 2+ months ↔ 60 days) → we know the answer but ask | 🟠 automation | L4 |
| 12 | Classification ignores context (section heading, help text, neighbours) → "Name" under "References" | 🟠 safety + automation | L2 |
| 13 | Local formats missing: date order, phone format, lakh/crore, family-name-first, address order; country rules (US-only EEO, UK monitoring) | 🟠 global | L4 |
| 14 | Job discovery = 0 (Jobright/Simplify lead) | 🟠 competitive | L5 |
| 15 | Real Workday coverage: none; real enterprise fixtures: none | 🟠 competitive | L3 + owner kit (L8) |
| 16 | Tracker behind Huntr/Teal: no kanban, reminders, contacts, analytics | 🟡 | L6 |
| 17 | AI drafts need Chrome's built-in model; there is no fallback, no interview prep, no follow-up email | 🟡 | L6 |
| 18 | Production gaps: no storage-upgrade (migration) tests; diagnostics export not surfaced/verified; `sidepanel.js` is 1.9 MB (pdf.js loaded upfront); no heavy-page performance test; Edge/Brave untested; legal pages still have `{{OPERATOR}}` placeholders | 🟡 production | L7 |
| 19 | Growth: no per-ATS/per-country pages, no sourced comparison pages, no referral, store listing English-only | 🟡 | L8 |

---

## PART B: Arena Mode, the efficient way

Two kinds of workers. **Code lanes:** ≤ 8 agents, and only these edit the repo. **Swarm agents:** up to ~500, for
small independent jobs. Swarm agents NEVER edit `src/`, `test/`, `static/`, `site/` or `server/`.

**1. Code lanes (8).** Each lane owns its files, exactly like `GEMINI_PHASE4_PARALLEL.md`:
- Worktree `E:\ar-l<n>`, branch `ar-l<n>` from `origin/phase4`.
- In shared files, append only, inside `// >>> L<n>` … `// <<< L<n>` blocks.
- One commit per step; push after each step.

**2. Swarm agents (up to about 500), spawned by a lane for one micro-task each:**
- Examples: read ONE job page and extract its questions; draft labels for 20 questions; write tests for ONE
  locale; check ONE competitor fact and its source URL; review ONE diff.
- Input = one task file `arena/tasks/<lane>/<id>.json`. Output = one result file `arena/out/<lane>/<id>.json`.
  Nothing else.
- **Two-key rule for swarm output.** Every result that becomes truth (a label, a fixture, a fact) is produced by
  2 independent agents. A third agent compares them:
  - They agree → accepted.
  - They disagree → `arena/review/<lane>.csv` for the OWNER. Never decided by an agent.
- **Politeness:** all web requests from all swarm agents go through ONE queue process
  (`scripts/arena/fetch-queue.mjs`). It allows at most 1 request every 2 s per host, respects robots.txt, never
  submits a form, and never logs in. The hands-off list (LinkedIn, Naukri, Indeed, Glassdoor, …) is blocked inside
  the queue.
- **Aggregation:** a lane's aggregator script merges `arena/out/...` into ONE committed file, then deletes the task
  files. Commit only the merged result + the review CSV, never 500 tiny files.
- **Budget:** spawn a swarm only for jobs that really are independent. Use 1 agent when the job is sequential
  (logic changes, refactors).

**3. Integrator (L1)** merges lanes into `arena` in the order of Part D and runs the gates after each merge.

---

## PART C: The work, wave by wave

### WAVE 0: Blockers (about 3 h; L1, L3, L4, L8 in parallel; nothing else merges before Wave 0)
Do exactly `GEMINI_PHASE4B_FIXES.md` Steps 1–6, split like this:
- **L1:** 4B Step 1 (the real steady-state benchmark: real forms grouped by URL, 20 seeded draws, the "Nth
  application" curve, 4 kinds of wrong, correct counters, the top-25 still-asked list, the reused-answers CSV) +
  Step 2 (Quick Answers stats from data, no invented %).
- **L3:** 4B Step 4 (rename the unproven structure files to `*.synthetic.structure.json`).
- **L4:** 4B Step 5 (notice period from Quick Answers; an unlisted country → ask).
- **L8:** 4B Step 3 (site/store/BENCHMARK claims only from the new `reports/steady-state.json`, with definitions
  and limits; no confidence interval unless value-checked over ≥ 900 fields).
- Swarm use in Wave 0: none needed, except 1 reviewer agent per diff.

**Gate W0:**
- tsc, vitest and build are green.
- `reports/steady-state.json` exists with wrong (i)–(iv) = 0.
- `grep -rnE "[0-9]+%" src/shared/quick-answers.ts` finds only numbers that come from `quick-answer-stats.json`.

### WAVE 1: Close every gap (about 8–10 h, all 8 lanes in parallel)

**L1: Benchmark owner + integrator** (owns `test/steady-state.test.ts`, `reports/*` numbers, `automation-floor.json`)
- After each lane merges, re-run the steady-state numbers and append them to `reports/arena/numbers.md`.
- Raise the floor by hand only, to measured values, each in its own commit.

**L2: Model upgrades** (owns `scripts/train-intents.mjs`, `static/intent/*`, `src/shared/intent-model.ts`,
`src/content/meaning.ts`, `test/model-*.test.ts`). The ordered steps are in `P5` L1 plus:
1. **Fine-tune** the MiniLM encoder SetFit-style (contrastive pairs from the labels, then the softmax layer). Export
   it as q8 ONNX at the same size, and compare the 5-fold out-of-fold accuracy to the current 77.6%.
2. **Context input:** label + section heading + help text + the nearest neighbouring label, joined with `[SEP]`.
   Retrain and compare.
3. **Two-step decision:** first "whose detail: self / another person / company / legal", then the meaning. An
   "another person" or "legal" result always asks.
4. **Per-meaning thresholds** chosen for ≥ 99.5% out-of-fold precision. Safe meanings (email, github…) get lower
   bars; risky ones (salary, visa) higher.
5. **A/B test with `multilingual-e5-small`** (q8) after L3's round-6 data lands. Ship only if non-English improves,
   English loses ≤ 1 point, and the extension stays < 60 MB.
6. **Targets:** out-of-fold accuracy ≥ 85%; precision ≥ 98% at each meaning's own threshold; wrong (i)–(iv) = 0
   in the steady-state run.
- Swarm: none for training. Use 5 agents to run the folds in parallel if the hardware allows.

**L3: Global data round 6 + enterprise fixtures** (owns `scripts/arena/*`, `reports/round6-*`,
`reports/labels-round6.json`, `test/corpus/**`, `reports/corpus-sources.md`). **Swarm lane.**
1. Build `scripts/arena/fetch-queue.mjs` (the politeness rules above) FIRST.
2. **Job list:** 300+ public job pages, spread over India (Darwinbox, Keka, Zoho, Freshteam, plus Indian companies
   on Greenhouse/Lever), DACH (Personio, JOIN), France (Welcome to the Jungle, Teamtailor), the Netherlands
   (Recruitee), Spain/LatAm, Brazil (Gupy), Japan (HERP, Greenhouse JP), and UK/US enterprise (iCIMS,
   SuccessFactors, and Workday pages where the form is public). Each entry gets `country` + `language`.
3. **Swarm A** (1 agent per page, about 300): fetch through the queue, extract the questions with the existing
   extractor, and write `arena/out/l3/page-<id>.json`.
4. **Swarm B** (2 agents per 20-question batch): draft labels independently. A third agent compares them.
   - They agree → `labels-round6.json` with `"review": "agreed"`.
   - They disagree → `arena/review/l3-labels.csv` for the owner.
   - Drafts are never final truth. L2 trains only on owner-reviewed + agreed labels, and reports both numbers.
5. **New real fixtures:** any page with a public apply form gets saved as a fixture with a SOURCE header and
   personal data stripped. Add exact extraction tests (the `test/ats-real.test.ts` pattern).
   - Target: ≥ 25 new real forms, ≥ 3 of them enterprise.
6. Split "other" into new ask-only meanings with ≥ 15 examples each (see P5 L1 step 4).

**L4: Option matching, Quick Answers, local formats** (owns `src/shared/option-matcher.ts`, the Quick Answers
fill paths in `facts.ts`, NEW `src/shared/locale/*`, `test/locale-*.test.ts`, `test/option-synonyms.test.ts`)
1. **Synonym tables**, reviewed and exact-match only:
   - Degrees: B.Tech/B.E./BSc → Bachelor's; M.Tech/MSc/MBA → Master's.
   - Cities: Bengaluru↔Bangalore, Gurugram↔Gurgaon, Mumbai↔Bombay, München↔Munich.
   - Countries: USA/US/United States; UK/United Kingdom/Great Britain.
   - Notice ranges: 60 days ⊂ "2+ months".
   - Experience ranges: 4 years ⊂ "3–5 years".
   - No fuzzy distance; a number matches a range only if it lies inside it.
   - 60 tests + 20 traps: "Bachelor's (in progress)", "MBA" vs "Master's in Engineering", overlapping ranges →
     ask.
2. **Local formats + country rules:** P5 L2 steps 1–3 (on-device Translator API, then the dictionary, then ask;
   dates/phone/salary/name order/address; US-only EEO; GDPR consent never ticked).
3. Measure the steady-state gain in L1's run after this lane merges.
- Swarm: 1 agent per locale (DE, FR, ES, NL, PT-BR, JA, HI-EN) writes that locale's test file. The lane owner
  reviews and merges them.

**L5: Job discovery** (owns `src/shared/jobs/*`, `src/sidepanel/discover.ts`, `static/companies.json`,
`test/jobs-*.test.ts`)
- Exactly P5 L3: official public ATS feeds only, fetched from the user's browser after an optional permission;
  1 request / 2 s per host, refreshed at most every 6 h.
- Matching runs on the device and shows why a job matches.
- "Open & fill" goes through the normal flow plus Safe Pacing. Never apply in the background.
- Hands-off sites are never fetched.
- Swarm: about 50 agents build `companies.json` (1,000+ companies: slug, ATS, country, industry). Each company
  needs 2 agents agreeing that the public feed exists (via the fetch queue). Disagreements are dropped.

**L6: Tracker + AI** (owns `src/sidepanel/tracker.ts`, `kanban.ts`, `interview.ts`, `src/shared/ai.ts`)
- Exactly P5 L4:
  - Kanban with keyboard moves.
  - Contacts and notes.
  - Reminders through `chrome.alarms`.
  - Local analytics (Pro).
  - Interview prep + follow-up email drafts on the device.
  - A "Copy prompt" fallback when the built-in model is missing.
  - Drafts are never auto-typed.

**L7: Production hardening** (owns NEW `test/migration.test.ts`, NEW `test/perf-*.test.ts`,
`src/shared/diagnostic.ts`, `build.mjs`, `e2e/browsers.spec.ts`)
1. **Storage upgrades:** for every stored key, a test that loads data saved in the v1.0 (main) format and the
   phase3 format, runs the upgrade, and checks nothing is lost (profile, answers, tracker, licence).
2. **Diagnostics:** `src/shared/diagnostic.ts` exists. Add an "Export diagnostics" button that saves a local file
   (no values, no emails, no URL queries), plus a test proving the file holds no personal data.
3. **Bundle:** load pdf.js and the resume parser only when the user imports a resume (dynamic import). Target
   `sidepanel.js` < 600 KB. Report the before/after sizes.
4. **Performance:** a 2,000-field synthetic page plus the 5 largest real fixtures. Extract + decide must take < 1.5 s
   on CI hardware, with no long task > 200 ms. Report the timings.
5. **Browsers:** run the e2e smoke test on the Chromium channels `msedge` (and Brave if installed) via Playwright
   `channel`. If a channel is missing, write that in the report; never claim it.
6. **Legal pages:** the build must fail while `{{OPERATOR}}` / `{{CITY}}` / `{{CONTACT_EMAIL}}` are unfilled (the
   owner fills them).
   - Check that `terms.html` and `privacy.html` exist, plus a refund/cancellation page. Razorpay needs one; add
     a plain template and mark it for owner review.

**L8: Honest growth + storefront** (owns `site/**`, `store/**`, the referral part of `server/**`,
`scripts/workday-capture-kit.md`)
- Exactly P5 L5:
  - Pages per ATS and per country, using numbers only from `reports/*.json`.
  - Comparison pages: facts only, each with a source URL and the date it was checked; our own limits stated.
  - Referral: +30 days for both people, inside `paidUntilAfter`, with abuse tests.
  - Store listing in 6 languages, marked "needs native check".
  - The Workday capture kit for the owner.
- Swarm: 1 agent per competitor fact (about 40 facts) finds the official source URL. A second agent re-checks it.
  Facts without 2 agreeing sources are dropped.

### WAVE 2: Integrate + verify (about 3 h, L1)
Merge into `arena` in this order: Wave 0 lanes → L4 → L2 → L3 data (then L2 retrain) → L7 → L5 → L6 → L8.
After EACH merge:
```
npx tsc --noEmit && npx vitest run && npm run build
npx vitest run test/steady-state.test.ts test/automation-eval.test.ts
```
Then the final run: `npx playwright test --workers=1`.

**Final gates (all must hold):**
- wrong (i)–(iv) = 0 in steady-state, and 0 in the 4-country automation eval.
- No test deleted or weakened. Run `git diff --stat origin/phase4..arena -- test e2e` and explain every
  removed line.
- `test/no-network.test.ts` is green. Job-feed fetches are allowed only inside `src/shared/jobs/` behind the
  optional permission.
- No percentage in `site/`, `store/` or `src/` without a source in `reports/`.
- Swarm leftovers are cleaned up: `arena/tasks` and `arena/out` are not committed.

---

## PART D: Report (`reports/ARENA_REPORT.md`)

- Per lane: the commits (pasted from `git show --stat`), the test commands with their output lines, and what was
  NOT done.
- **The final table:**
  - Fill % at the 1st, 5th, 10th and 20th application (mean, min, max over 20 draws).
  - Wrong (i)–(iv).
  - Assisted %.
  - Model out-of-fold accuracy and precision, per language.
  - Real forms, by ATS.
  - Companies in discovery.
  - Bundle sizes.
  - Perf timings.
  - Browsers tested.
- Owner review queues: `arena/review/*.csv`, with row counts.
- **The top 25 meanings still asked at the 10th application.** These are the next automation targets.
- Never write "ready for launch". The owner decides after Claude's review and real-form testing.

## Hard rules (every agent, every lane, every swarm)
- No fake human typing, no CAPTCHA solving, no automation on LinkedIn/Naukri/Indeed and the other hands-off sites.
- No auto-ticked consent. No invented facts or numbers. No auto-typed AI drafts.
- No data leaves the device, except the optional licence check and the user-enabled public job feeds.
- No fake reviews, user counts or testimonials. No logging in or account creation anywhere.
- Never weaken a safety check or a test to pass. Fix the logic, or write the blocker in the report.
- File lists only from `git show --stat`. Numbers only from commands you ran. Claude re-checks everything.
- Time-box each step. Over 2× the estimate → commit what works, note the blocker, and move on.

# ApplyAgent (v0.4, private)

Chrome extension that finds well-matched jobs, fills applications on company career sites (up to 5 at once),
asks you before answering anything sensitive, and records "applied" only when the employer's site confirms it.
Plan: `../AI_APPLY_AGENT_PLAN.md` · Testing: `TESTING.md` · Deployment & payments: `DEPLOY.md` · Privacy: `PRIVACY.md`
Hinglish guide to the whole project: `PROJECT_GUIDE_HINGLISH.md` · Store listing + screenshots: `store/` · Price, costs, marketing, obstacles: `LAUNCH_PLAN.md` · Website: `site/`

## Build and load
```bash
npm install
node scripts/fetch-model.mjs   # once: the 23 MB question model (all-MiniLM-L6-v2, quantized) into models/
npm test             # 376 unit tests, no network
npm run e2e          # end-to-end tests in real Chromium (local practice pages)
npm run typecheck
npm run build        # outputs dist/
```
Chrome → `chrome://extensions` → Developer mode → **Load unpacked** → `dist/`. Click the icon for the side panel.
Practice safely first: `python -m http.server 8080 --directory testpages` → `http://localhost:8080/apply.html`.

## Tabs
| Tab | What it does |
|---|---|
| **Jobs** | Loads the JobReach feed (URL or file), filters out wrong roles / places / experience in code, ranks the rest with reasons; add good matches to the queue |
| **Apply** | Fills the form on the current page; asks sensitive/new questions; on-device AI drafts for free-text questions (you review); Submit |
| **Queue** | Up to 5 applications in parallel, ≤ 2 per site, daily cap, 30-day company cooldown; review or auto-submit |
| **Profile** | Your facts, resume, preferences, plan (Free 20/month, Pro 30-day pass) and licence key |
| **Answers** | Answers you gave once, reused only for the same question |
| **Tracker** | Every application: "applied ✓" with confirmation text (+ screenshot when visible) or "needs check" |

## Rules the agent never breaks
- Only facts from your profile or answers you gave; unknown optional fields stay blank; nothing you typed is overwritten
- A saved answer is reused only for the same question ("years with Python" is never reused for "years with Java")
- Your own name, email and phone never go into fields about someone else (emergency contact, referee, referrer,
  manager), including whole "References" / "Emergency contact" sections; answers there are saved per section
- Work authorization, sponsorship, salary, notice period, relocation, EEO, consent → asked, never guessed
- No CAPTCHA solving; Submit is never retried
- Hands-off platforms (LinkedIn, Indeed, Naukri, Glassdoor, foundit, Wellfound, Instahyre, Internshala, iimjobs, Cutshort,
  ZipRecruiter, Dice, Shine, apna): their terms forbid automated applications, so the agent never reads or fills forms
  there and the queue refuses their links. Their "Apply on company site" links lead to the employer's ATS, where it helps
- Never handles passwords: on a sign-in wall (Workday, Taleo) you sign in yourself, then press Fill
- "Applied" only with the employer's confirmation; otherwise "needs check"
- AI drafts are on-device, grounded in your facts, flagged when they contain unknown numbers, and always reviewed
- Data stays in the browser; it acts only on sites you allow

## Silent detection
A read-only detector recognises application forms on its own and shows the result on the toolbar icon:
**✓** everything can be filled · **2** two questions for you · **•** job page (form not open yet; the panel offers
"Open the application") · **!** sign-in wall. It only scores the page (JobPosting data, ATS host, resume upload,
job-specific questions against password and payment fields), never types, and runs only where you chose:
*Job sites only* (default: ATS and careers sites you allowed), *Every site I allowed*, or *Off* (Profile & plan).
It is never registered on hands-off platforms.

## Ways to use it
- **Side panel**: click the toolbar icon (or **Alt+Shift+A**) → Fill this application
- **Shortcut**: **Alt+Shift+F** on any application page fills it (change it at `chrome://extensions/shortcuts`)
- **Right-click** → *Fill this application with ApplyAgent*
- Opening ApplyAgent on a page gives it access to **that visit only** ("This visit"); allow the site to use it every time
- **Multi-step applications**: fills each step and presses Next/Continue (sending nothing) up to the last step; works
  for one-page wizards and sites that load a new page per step. Never presses "Apply with LinkedIn", autofill,
  Save draft, Back or Cancel. Submit on a step that is not the last is refused
- **Other languages**: English, German, French, Spanish, Portuguese, Italian and Dutch labels and buttons
- **Web-component forms** (shadow DOM) are read and filled like any other form
- **Backup & move** (Profile & plan): export everything to a file and restore it on another computer
- **Setup checklist** on first run; saved answers can be edited
- **Quick answers** (Answers): work countries, notice period, current/expected CTC, relocation, how you heard, and
  optional diversity answers, given once and used for any wording, only where the question clearly matches
  ("authorized to work in the UK?" → No and "need sponsorship in the UK?" → Yes from "I can work in India"; "the country
  where this job is located" is still asked). Rules: `src/content/facts.ts`, tests: `test/facts.test.ts`
- **Embedded forms**: a Greenhouse/Lever form embedded in a company page works even when the company site is not allowed
- **Workday-style flows**: sign-in walls (you sign in; passwords are never touched), "Save and Continue" steps, field-less
  Review pages, dropdown buttons, location typeaheads with slow results, dates in the format each box asks for
  ("MM/YYYY", "DD.MM.YYYY", native date pickers), and **work history**: one "Work experience" block per job, added with
  the section's own "Add" button (never removed)
- **Resume autofill pages**: the resume is uploaded first and the site's parsing is waited for; values it filled are
  kept and flagged when they differ from your profile
- **Install warnings**: none. No `tabs` permission; sites are allowed one by one
- **Accessibility**: axe-core finds no WCAG 2.1 A/AA violations in any section (`e2e/a11y.spec.ts`); keyboard and
  screen-reader friendly

## Understanding questions (local model, offline)
Rules name the questions they know; a small sentence model reads the ones they don't ("Joining timeline?" → notice
period). It runs inside the extension (offscreen page, onnxruntime-web, single-threaded wasm): nothing leaves the
computer and nothing costs money per question. ~1.1 s to load on first use, then ~25 ms per question, one question
per run so a reading never depends on the other questions on the form (batching shifted confidences by up to 0.03).
- **Data:** 1,171 real questions from 196 live forms on 9 ATSs, hand-labelled into 55 meanings
  (`reports/labels*.json`, one file per collection round), plus written examples (`src/content/intent-examples.json`).
  `node scripts/train-intents.mjs` trains the head and reports 5-fold out-of-fold accuracy (74.6% overall; 96.7% right
  when it acts at ≥ 0.85 confidence).
- **Unseen-data rounds:** each round scans forms from companies never scanned before, labels them, and measures
  *before* changing anything (`scripts/read-questions.mjs` + `POLICY_LABELS=… POLICY_READINGS=…` policy-eval):

  | Round (unseen when measured) | Model accuracy | Model right when ≥ 0.85 sure | Wrong fills (rules + model) |
  |---|---|---|---|
  | 2: 247 questions, 54 forms | 57.9% | 88.5% | 8 of 69 |
  | 3: 249 questions, 52 forms | 71.9% | 90.0% | 4 of 75 |
  | 4: 142 questions, 41 forms | 82.4% | 90.2% | 5 of 47 |

  Round 4 also ran a multi-agent review (an attacker writing 266 tricky cases in `test/adversarial.test.ts`, a code
  reviewer, and a verifier): 37 findings, all confirmed and fixed — including submit safety (one run per page, only the
  application's frame acts, the tab is pinned during a run, nothing is filled after Submit, pending submissions expire).

  Every wrong fill was traced to a general pattern, fixed, and pinned in `test/real-findings.test.ts`; after the
  fixes all three sets have no wrong fills beyond 2 borderline ones (a link where "examples of your work" were asked).
- **Two keys:** the model acts only when it is confident, the question also contains a plain word of that meaning,
  and every safety check the rules use passes (someone else's details, yes/no questions, declarations, sensitive
  topics…). When the rules would fill but the model is ≥ 0.95 sure the question means something else, it asks.
- **Proof:** `test/knockout.test.ts` forces every one of the 55 readings at 99% onto 50 screening questions (licences,
  clearances, background checks, shifts, skill-specific years), typed-name signatures, 22 labels in other languages
  and empty labels: nothing is filled that should not be. `POLICY_EVAL=1 npx vitest run test/policy-eval.test.ts`
  replays the labelled questions (round 1: rules + model fill 250 of 675, 2 borderline).
- If the model can't load or is slow (10 s), ApplyAgent works with its rules alone.

## Real-form coverage
`e2e/coverage.spec.ts` reads real application forms (one per company) without typing, uploading or submitting
anything, and checks that no field changed. Three rounds so far: 228 real pages → 196 forms (Greenhouse, Lever,
Ashby, Workable, BambooHR, Teamtailor, Breezy, Recruitee, Personio), about 3,000 fields; summary
in `reports/coverage.md`. About 45% of fields fill with no quick answers saved (BambooHR rose from 36% to 51% after
round 2). Until round 4 the "nothing changed" check skipped forms opened from a job page; it now covers every form.
Every wrong mapping found is fixed and pinned in `test/real-findings.test.ts`; 30 of the forms are replayed
offline in `test/corpus.test.ts`.
SmartRecruiters shows automated browsers a DataDome robot check, so it could not be read in this test (people in
normal Chrome usually pass straight through; ApplyAgent now recognises that check and asks the user to solve it).
```bash
COVERAGE=1 npx playwright test e2e/coverage.spec.ts && node scripts/coverage-report.mjs
```

## Brand
The mark is an "A" whose crossbar is a check mark (the application, done) with a spark for the agent, drawn in one
place: `scripts/brand-mark.mjs`. `node scripts/icons.mjs` renders the toolbar and store icons, the toolbar's
"working" frames, the panel's animated logo (draws itself on open, works while filling, celebrates "Applied"; still
with reduced motion) and the store promo tile. Open `brand/preview.html` to see the animations.

## Layout
`src/content` agent (read → decide → fill → verify → submit) · `src/background` queue and tracker ·
`src/sidepanel` UI · `src/shared` types, storage, fit scoring, AI, licences · `server` licence + Razorpay worker ·
`testpages` local practice form · `test` unit tests

## Not built yet
Workday account creation (you sign in yourself) · Workday's split month/year date spinners ·
non-English questions in the model (the rules cover 7 languages) · job-alert email import · store listing assets · panel UI in other languages

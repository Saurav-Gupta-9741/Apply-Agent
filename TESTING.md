# Testing ApplyAgent

Rule: never send test applications to real companies. Use the local practice page, then real jobs you
genuinely want.

## 1. Automated tests (every change)
```bash
npm run test:all    # typecheck + unit tests + end-to-end tests in real Chromium
npm test            # 350 unit tests (no network)
npm run e2e         # 74 end-to-end tests: the real extension in real Chromium, on local practice pages
npm run e2e:live    # READ-ONLY scans of real Greenhouse/Lever/Ashby forms (types nothing, submits nothing)
```
| Suite | Covers |
|---|---|
| Unit (350) | Form reading incl. markup copied from live ATS forms, 13 saved real forms replayed offline, decisions, quick answers, work history, filling, phone country codes, spam-trap (honeypot) fields, submit/confirm, queue limits, crash recovery, fit scoring, licences, Razorpay signatures, security guard rails |
| Safety (`test/knockout.test.ts`) | 50 screening questions (licences, clearances, background checks, shifts, skill-specific years), typed-name signatures, 22 labels in other languages and empty labels, each tried with all 55 model readings forced at 99%: nothing filled that should not be |
| Model | `node scripts/train-intents.mjs` (5-fold out-of-fold accuracy), `POLICY_EVAL=1 npx vitest run test/policy-eval.test.ts` (rules vs rules + model on 675 real questions), `scripts/read-questions.mjs` for new unseen sets |
| E2E (74) | Practice forms, real React app, iframes, multi-step wizards, auto-open from job descriptions, the local model running offline in the extension (and switched off), 60-question form, CAPTCHA stop, redirect confirmation, site error, incomplete form, never overwriting, parallel queue, side panel UI and accessibility (axe), script-injection safety |
| Coverage | `COVERAGE=1 [COVERAGE_JOBS=list.json] npx playwright test e2e/coverage.spec.ts`: read-only scans of real application forms, checks nothing changed |

Flakiness check before a release: `npx playwright test --repeat-each=3` (all runs must pass).

## 2. Real Chrome on the practice page (safe end-to-end)
```bash
python -m http.server 8080 --directory testpages
```
1. `chrome://extensions` → Developer mode → **Load unpacked** → `dist/` (after code changes: **reload**).
2. Profile tab: fill details, upload a resume, set "Total years of experience", Save.
3. Open `http://localhost:8080/apply.html` → Apply tab → **Allow on this site** → **Fill**.

| Check | Expected |
|---|---|
| Name, email, phone, LinkedIn, degree, total experience | Filled from your profile |
| Resume | Attached (file name appears under the button) |
| Location (City) searchable dropdown | Picks "…India" option matching your city |
| Work authorization, notice period, gender, privacy consent | **Asked**, never guessed |
| "Years of experience with Python" | **Asked** (not filled with total experience) |
| "Why do you want to join Acme?" | Asked; "Draft with on-device AI" if your Chrome supports it; you review |
| "Email me about future jobs" | Left unticked |
| Answer the questions → Fill again | Answers fill; nothing you typed is overwritten |
| Review mode → Submit application | "Applied ✓", tracker shows the confirmation |
| `apply.html?captcha=1` | Stops: "Solve the CAPTCHA" |
| `apply.html?redirect=1` | Confirmation on the next page is still recorded |
| `apply.html?fail=1` | Shows the site's error, not "applied" |
| Leave a required field empty → Submit | Names the missing field; does not claim success |
| Queue tab: add `http://localhost:8080/apply.html` (+ `?redirect=1`) → Start | Runs in background tabs; statuses update live |

## 3. Real jobs (dry run first)
Use jobs you would genuinely apply to. Keep **Review before submit**.
1. Fill → check every field on the page by eye.
2. Only press Submit if you really want the job; otherwise close the tab.
3. Write down any field that was wrong or missed (platform + question text) → fix → add a test.

## 4. Payments (Razorpay test mode, no real money)
Deploy the licence server with Razorpay **test** keys (DEPLOY.md), buy a pass with Razorpay's test card/UPI,
check the key page, activate it in the extension, and confirm the plan shows "Pro". Repeat with the same key to
confirm renewal stacks 30 more days.

## 5. Beta (20–50 real users)
- Share the unpacked build or an unlisted Chrome Web Store listing.
- Ask each tester: platforms used, applications submitted, any wrong/missed field (with question text).
- Target before paid launch: ≥ 90% of applications complete without manual fixes, zero wrong answers submitted.

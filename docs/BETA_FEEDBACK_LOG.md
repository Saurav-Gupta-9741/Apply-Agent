# Beta feedback log

Every flaw testers reported, what was done, and what is still open. Updated after each round of fixes.
Status: **Fixed** (in a released build, with a test), **Not a bug** (works as designed, explained), **Open** (not fixed yet).

## Round 1: first tester report (a friend's Google Doc) → beta 2 (1.0.1)

| # | Flaw reported | Status | What changed |
|---|---|---|---|
| 1.1 | Practice form: "no application form found", Fill did nothing | Fixed | Chrome blocks extensions from scripting their own pages; the practice form now loads ApplyAgent's page script itself |
| 1.2 | Practice form: Submit reloaded the page empty | Fixed | Inline script was blocked by the extension page's security policy; moved to its own file |
| 1.3 | Practice form: no message for missing required fields | Fixed | Each missing field is named ("Consent is required") in a box and under the field |
| 1.4 | Setup saved example answers ("3 years", "2024") for skipped questions | Fixed | Nothing pre-filled; Skip means "ask me on each form"; beta 1 users get a one-time "check your answers" notice |
| 1.5 | Setup lost progress when closed | Fixed | Saved after every question; reopens where you left it |
| 1.6 | Gender and resume "reverted" after saving | Fixed | Every save reads the stored profile first; resume saved the moment it is chosen |
| 1.7 | Experience over 7 years not filled ("7-10", "Above 7") | Fixed | Year brackets read "above / beyond / exceeding" and bare ranges; 0 years fills "Fresher" |
| 1.8 | Language level wrong ("Beginner" filled as "Fluent") | Fixed | Level dropdown; no level, no fill |
| 1.9 | Skills without years got 3 years | Fixed | Years never guessed |
| 1.10 | LinkedIn / GitHub links not checked | Fixed | Shape checks; bare links completed with https:// |
| 1.11 | City typo ("Banglore") accepted silently | Fixed | "Did you mean Bangalore?" note |
| 1.12 | Veteran question in other words asked again | Fixed | A diversity answer given on a form becomes the saved answer for every wording |
| 1.13 | No fresher / job type / remote filters in Jobs | Fixed | Experience, type and remote filters |
| 1.14 | No way back from Apply to the job list | Fixed | "Back to jobs" button |
| 1.15 | "Are you currently enrolled?" not answered | Fixed | Education status setting (completed / pursuing) |
| 1.16 | 75% marks and expected CTC "not used to filter jobs" | Not a bug | They answer form questions; they are never job filters |
| 1.17 | "It didn't submit the application" | Not a bug | ApplyAgent never submits; you press Submit |
| 1.18 | "Consent box not ticked" | Not a bug | Consent is always yours to tick |

## Round 2: own testing of beta 2 (2026-11-04) → beta 3 (1.0.2)

| # | Flaw reported | Status | What changed |
|---|---|---|---|
| 2.1 | Uploading the resume overwrote the profile | Fixed | The review pre-ticked confident values, and saving it redrew the form, wiping unsaved typing. Now nothing is ticked and unsaved edits are saved first |
| 2.2 | Resume read and imported without consent | Fixed | Upload only saves the file; ApplyAgent asks before reading it; each value shows the resume line it came from; only ticked values are imported |
| 2.3 | Portfolio became "https://M.TECH" | Fixed | Degrees (M.Tech, B.Sc, Ph.D…) are never links; imported values pass the same checks as typed ones |
| 2.4 | Graduation year 2025 for a degree still in progress | Fixed | "2025 – Present" gives no year and sets "currently pursuing"; "Expected 2027" gives 2027; education level is the highest completed |
| 2.5 | Skills imported with 1 year, languages as "Conversational" | Fixed | No years or level invented; a language needs a level you pick |
| 2.6 | A fake country or address could be saved | Fixed (with a limit) | Country from a list of all countries; state must belong to the country (India, US, Canada, Australia, UK); postal code format per country; Indian PIN must fit the state; city vs country check. **Limit:** a believable made-up address can't be detected without an online map lookup, which would send data out of the browser |
| 2.7 | Any URL accepted for links | Fixed | LinkedIn, GitHub, portfolio and resume link each take only their own kind of link |
| 2.8 | Fields had no proper validation | Fixed | Names, email (+ typo hint), phone (country code, Indian/US lengths), city, address, state, postal code, time zone, years, graduation year, titles, lists |
| 2.9 | (found while fixing) Unsaved Profile edits lost when leaving the screen | Fixed | "You have unsaved changes": save, discard or keep editing |
| 2.10 | (found while fixing) Importing replaced Key skills instead of adding | Fixed | Imported skills are added; inventory skills are kept in Key skills |
| 2.11 | (found while fixing) Skill level defaulted to "Intermediate" | Fixed | Level is "Not set" until chosen |

## Round 3: own testing of beta 3 (2026-11-04) → beta 4 (1.0.3)

| # | Flaw reported | Status | What changed |
|---|---|---|---|
| 3.1 | Profile data lost every time the extension was loaded again | Fixed | Cause: Chrome gives an unpacked extension a new identity per folder, and removing it deletes its data. Beta builds now have a fixed identity (same data in any folder); optional automatic backup file on the PC; "Restore from a backup" on the first screen. No data is sent anywhere (no account, no cloud sync, by decision) |
| 3.2 | No example of what to type in each Profile field | Fixed | Every field has an example placeholder and says which form questions it answers |
| 3.3 | (found while fixing) First-run screen copied name, email and phone from the resume without asking | Fixed | It saves the file and asks, like the Profile upload; pasted text opens the review |
| 3.4 | Discover not based on the profile / resume; match % unclear; few companies; can't add a company's careers page | Fixed in beta 5 | See round 4 |
| 3.5 | "Account setup" so data is always saved | Not done, by decision | An account means storing data on a server; replaced by the fixed identity + backup file (data stays on the PC) |

## Round 4: Discover and the Plan card (2026-11-04) → beta 5 (1.0.4)

| # | Flaw reported | Status | What changed |
|---|---|---|---|
| 4.1 | Plan card showed a licence key box and "One-time payment" in the beta, where nothing can be bought | Fixed | Key box and payment line appear only when licensing is set up; the beta says there is nothing to buy or activate |
| 4.2 | Jobs not fetched from the profile / resume | Fixed | Matching uses Target roles, else current title, work history or field of study (shown on screen with its source); experience, student status, cities, countries you may work in, skills |
| 4.3 | Experience level not matched | Fixed | Years asked in the description **or the title** ("Exp- 4-6 Years"); two or more years over yours, senior or team-lead roles for freshers are left out and counted |
| 4.4 | Match % not explained (a flat 30%) | Fixed | Role 40 + Skills 25 + Experience 20 + Location 15, each with its reason; skills read from the full job description; missing skills listed |
| 4.5 | Only 54 companies | Fixed | 340 companies, each verified on its own job board, with a hiring profile (countries, remote, role families, entry level) |
| 4.6 | "Train a model" to pick companies from the resume | Done differently | No training data exists, so companies are ranked on the device from their hiring profile against yours (field, where you can work, entry level). Transparent and testable |
| 4.7 | Crawl companies' career pages | Fixed (polite) | Paste a careers page: read once after robots.txt, its job board found and checked first in every search. No crawling of job sites |
| 4.8 | (found in a live check) Jobs in Bucharest / Taiwan shown as places an India-only student can work | Fixed | 60 more tech-hub cities mapped to their countries; unknown places score low and say so |
| 4.9 | (found in a live check) "Credit Risk Analyst" scored like a machine-learning role | Fixed | Analytics is its own field, related to (not the same as) data science |
| 4.10 | (found while fixing) Reopened results could show a different % (descriptions were not kept) | Fixed | The shown jobs are kept with their descriptions |
| 4.12 | Pressing **Fill this application** on a partly filled form filled it, then **the application form closed** | Fixed | Four causes, all closed: (1) closing a dropdown sent an Escape key to the whole page, and pop-up application forms close on Escape: it now stays on the dropdown; (2) the panel's Fill pressed the form's Next / Continue by itself on multi-page forms (on some sites that sends the application): Fill now fills **this page only** and says "press Next yourself, then Fill again"; (3) a dropdown built from a plain button inside a form acts as a Submit button: every submit is blocked while a fill runs; (4) the "Apply" opener could match a "Submit application" button: it never does now |
| 4.13 | Must not submit while mandatory fields are empty | Fixed | Before any submit (Auto-submit or the panel's Submit) every required field is re-read on the page; if any is empty it stops and names them ("Still empty: …"). Auto-submit also waits while any question to you is open, even an optional one |
| 4.14 | Is exactly the right option chosen in a dropdown? | Fixed (found 2 wrong picks, 1 wrong fallback, 1 unchecked step) | Checked against 66 real dropdowns with their traps. Wrong before: language "Native" chose "Full professional"; skill "C" chose "C++" (symbols were ignored); a Basic / Conversational speaker could be filled as "Fluent" (fallback). Unchecked: a custom dropdown only had to show *something*, not the chosen option. Now: five language levels; "+" and "#" count; no fluent fallback; the dropdown must show the chosen option, else it is reported ("The list on the page shows X: choose the right one there") and listed under Needs your answer; auto-submit waits on any failed field. Also now chosen: "I don't wish to answer", "Employee Referral", "Company Careers Page", "Professional working". Rule kept: when unsure, leave it for you (asked, never guessed) |
| 4.11 | The on-device model in Discover (said in round 3) | Not done, by decision | A plain role table gives a reason you can read for every point; the model would give a number nobody can explain |

## Round 5: several applications open at once (2026-11-05) → 1.0.6

| # | Flaw reported | Status | What changed |
|---|---|---|---|
| 5.1 | With several application tabs open, the panel must show the current tab's form and never the previous tab's fields | Fixed (4 flaws found) | (1) A fill still running when you switched tabs showed its result, and its status lines, on the new tab: now each result is kept for its own tab and shown only there. (2) Saving an answer while another tab was filling started a second fill at the same time, which could send a step to the wrong tab: one fill at a time, with a clear message. (3) Coming back to a tab lost its result: each tab's result is kept until that tab loads another page or closes. (4) Switching quickly could let a slow page check paint the previous tab's page info: only the latest check paints. Tabs in another Chrome window no longer change the panel |
| 5.2 | Show a Simplify-style list: what is filled, what is left, and go to an unfilled field by clicking it | Fixed in 1.0.7 | "Fields on this page" comes first after a fill: required count, progress bar, every required field with its state (optional folded). Clicking a field scrolls the page to it, outlines it and puts the cursor in it. Fields the user fills on the page afterwards are ticked off live ("Filled by you"), their question cards go away, and the status says when nothing required is left. A wrong dropdown option still showing is not counted as fixed |
| 5.3 | Does the on-device AI answer new questions using the resume? | Fixed in 1.0.7 (it used the Profile only) | Drafts for open questions now also read the saved resume file (PDF, Word or text) as a source of facts, on the device. Numbers and degrees from the resume are not flagged as invented; anything else still is. Unchanged: a draft is never typed until you press Use, and "not enough facts" gives no draft. Short-answer questions are recognised by the local question model (55 kinds), which fills only from your saved data |
| 5.4 | (found by the tests) The Quick answers setup wizard could close by itself after Next | Fixed in 1.0.8 | Each step saves the profile, and the Quick answers card redrew itself ~150 ms later, replacing the wizard with the plain form (timing-dependent: 3 of 4 runs). The card no longer redraws while the wizard is open; the wizard redraws it once when it is done |
| 5.5 | Show which fields the AI filled (like Simplify's sparkle) | Fixed in 1.0.8 | Fields answered because the on-device question model understood an unfamiliar wording, and AI drafts you approved, are marked "AI" in the field list, with a line asking for a quick check. Fields the rules knew are not marked |

## Round 6: Stripe form vs Simplify, Profile and resume (2026-11-05) → 1.0.9

| # | Flaw reported | Status | What changed |
|---|---|---|---|
| 6.1 | Phone "did not stick" on a new Greenhouse form | Fixed | The box formats the number as typed or keeps only the national part beside its country picker: the number is checked by its digits, typed key by key when needed |
| 6.2 | School "options did not appear" | Fixed | The list searches a server after a pause: ApplyAgent waits for the results, searches the full name of short forms (IIT, NIT, BITS…) and the distinctive word; only the same institution is picked, never another campus or "Other" |
| 6.3 | Degree left for the user (Simplify filled it) | Fixed | M.Tech/MCA/M.E. → Master's, B.Tech/BCA/B.E./B.Com → Bachelor's, Ph.D → Doctorate, on Greenhouse's level lists |
| 6.4 | Simplify answered more questions | Fixed (and beyond) | Work eligibility / sponsorship: Simplify asks them at sign-up; ApplyAgent now offers to answer them once in Quick answers right on the question. Employer and job title (Simplify left them too) are filled from work history. Education in other words, total experience, "experience with X" answered from the user's own data, marked AI with the source |
| 6.5 | Country → State → City as lists | Fixed | Linked suggestion lists (offline data, all Indian states and UTs, US/CA/AU/UK), any city can still be typed |
| 6.6 | Resume upload first in Profile, clearly worded | Fixed | "Fill your profile from your resume" card at the top |
| 6.7 | Resume reading not accurate; GitHub/LinkedIn behind words not read | Fixed | Links read from PDF annotations and Word hyperlinks with their words; a repository link is never the profile; parser fixes; labelled set: 99%/96% → 100%/100% precision/recall |
| 6.8 | Use the Profile resume in Apply, with a different one for one application | Fixed | Resume row in Apply; "Use a different resume" for this tab's application only (Fill and Preview); Profile unchanged |
| 6.9 | On-device AI for every question, based on the resume | Partly, by design | The user's laptop cannot run Chrome's built-in AI (needs 16 GB RAM or a 4 GB GPU). Short factual questions are answered from the resume/profile without any model (works everywhere, never invents); open questions use Chrome AI drafts (now with the resume) where available, else asked |

## Round 7: a small on-device model for the questions still asked (2026-11-06) → 1.0.10

| # | Flaw reported | Status | What changed |
|---|---|---|---|
| 7.1 | Use a small on-device language model (Qwen) so every laptop can answer diverse questions from the resume | Measured, not shipped | Qwen2.5-0.5B in the extension on the user's laptop (i3, 8 GB): 11-50 s per answer, invented facts, gibberish on the Intel GPU. Fails the 0-wrong rule. Report: reports/ON_DEVICE_LM_PHASE0.md |
| 7.2 | Which still-asked questions can be answered without a model? | Fixed (part) | "Where do you live?" questions from the Profile country/city and the job's country; "Highest level of education" (never a degree in progress for "completed"). Automation eval 575 → 583, 0 wrong |
| 7.3 | (found by the tests) "American Samoa+1" chosen for a list labelled "How many years of experience" | Fixed | The 1.0.9 experience rule answered any list; only lists of year counts are answered now |
| 7.4 | Links typed on one form not used on the next ("LinkedIn URL" vs "LinkedIn Profile URL") | Fixed | Reused for the same kind of link while the Profile has none, only when the value has the right shape |

## Round 7b: "Train on every application, worldwide, with limits" (2026-11-06) → 1.0.11

| # | Flaw reported | Status | What changed |
|---|---|---|---|
| 7.5 | Handle every kind of question worldwide, with full validation | Done for what is allowed | 2,881 real questions from 222 Greenhouse boards in 10 languages, hand-labelled; checked as applicants in 4 countries; 25 wrong fills found and fixed (0 now); question model retrained (3,465 questions), 74 boards held out for an honest check. Lever/Workable/SmartRecruiters not collected: their robots.txt forbids AI training. Report: reports/round7/ROUND7_REPORT.md |
| 7.6 | Respect word / character limits on answers | Fixed | Limits read from the question, help text and box (words, characters, sentences, paragraphs; 10+ languages). AI drafts told the limit and cut at a whole sentence; over-limit answers never typed; live counter in the panel |
| 7.7 | (found by the tests) Help-text reading made 500-field forms slow (7.5 s) | Fixed | Only the box's nearest neighbours are read |

## Round 8: rigorous testing on real live application forms (2026-11-07 to 2026-11-09) → 1.0.12, 1.0.13

Real job postings on 6 portals (Greenhouse, Ashby, Workable, BambooHR, Breezy, Recruitee), a fictional candidate, every
send blocked, nothing submitted. SmartRecruiters (bot check) and Lever (robots.txt) skipped; Workday needs accounts.

| # | Flaw found | Status | What changed |
|---|---|---|---|
| 8.1 | CRITICAL: "future sponsorship: No" Quick answer used for every country (US jobs got "No sponsorship needed") | Fixed (1.0.12) | Only for the user's own work countries; others Yes or asked |
| 8.2 | Rupee salary typed on jobs in other countries / unknown countries | Fixed (1.0.12, 1.0.13) | Salary only in the job's own currency; unknown country is asked; a salary per currency for jobs abroad |
| 8.3 | Fill share on real forms too low | Improved (1.0.13) | New Quick answers (other countries, non-compete, relatives, clearance, salary abroad, work history), start month/year, outside-US questions. Round 5: 1,581 forms, 61.0% of fields filled, 29.3% of required fields left (was 35.6%) |
| 8.4 | "…at your current location of residence?" / "…the location in which you currently reside?" answered for the job's country | Fixed (1.0.13) | Read as where the user lives; both live forms re-run correct |
| 8.5 | Head-to-head with Simplify on the same 57 live forms | Measured | ApplyAgent 384 fields filled vs 170; required left 30.8% vs 68.2%; median 21 s vs 41 s. Simplify fills Breezy work-history/education blocks ApplyAgent does not yet (8.6). Report: reports/compare/COMPARE.md on the essay-writer branch, with the live-run tools |
| 8.6 | Breezy "Work History" / "Education" add-blocks not filled | Fixed (1.0.14) | "+ Add Position" pressed once per saved job, "+ Add Education" once for the saved school; company, title, summary, dates, school and field of study filled in the right boxes (Breezy's date boxes are mislabelled "Company" in its code; the visible "Start date" is read). Live re-run of all 72 Breezy forms: fields filled 435 → 1,020, 0 wrong. Simplify comparison now 450 vs 170 fields |
| 8.7 | (found by hand-checking 132 unclear answers) Australian job ("New South Wales") got a pound salary; "$50000, £50000" format example read as the currency; "country from which you plan to work" answered; "List previous employment" got only the job title | Fixed (1.0.14) | Australian states and cities; New England / New Mexico are the US; format examples ignored and "no commas" respected; plans and full work-history lists left for the user. Each live form re-run: correct |
| 8.8 | (found in the 8.6 live re-run) A salary question whose text mentions "work experience" got the job title | Fixed (1.0.14) | Only a short section title, not a question, starts a work-history block; live re-run: USD salary on the US job |

Round 5 accuracy: 2 wrong of 13,140 filled fields (both 8.4, fixed). Round 6 (78 re-run forms): 0 wrong of 1,020. 0 application sends in any run.

## Round 9: a US-based candidate, essay writer shipped, rating follow-ups (2026-11-10) → 1.0.15

Live round 7: a second fictional candidate living in Austin, TX (all earlier runs used one India-based candidate),
225 real US-heavy forms on Greenhouse, Ashby, BambooHR and Breezy; every send blocked, nothing submitted.

| # | Flaw found | Status | What changed |
|---|---|---|---|
| 9.1 | Fill shortcut Alt+Shift+F clashed with Simplify's (Chrome drops one) | Fixed (1.0.15) | Now Alt+Shift+G |
| 9.2 | A salary saved without a currency ("120000") was always read as rupees, so a US user's salary was never typed | Fixed (1.0.15) | A bare figure is in the money of the user's own country |
| 9.3 | Most Greenhouse job links now redirect to the company's own careers page; the embedded form shows no location, so "…in the country where this job is based?" and sponsorship questions went to the user (26 US forms) | Fixed (1.0.15) | The job's country from Greenhouse's public job API (read-only, nothing about the user); Greenhouse's new location class read; a bare "Locations" heading skipped |
| 9.4 | "…for any U.S. employer?" split at "U.S."; a one-line preface before a sponsorship question counted as a long declaration | Fixed (1.0.15) | Abbreviation-safe sentences; short prefaces read past (not ones that agree to anything) |
| 9.5 | Breezy "Desired Salary" never answered (job country unknown); currency list left on its default | Fixed (1.0.15) | Job country from Breezy's position data; the currency list follows the salary typed |
| 9.6 | Plain "State" boxes never got the profile's state; lists written "(US) Texas" or "TX" never matched | Fixed (1.0.15) | Label-only rule for state; state codes and tagged names match (codes only in a list of state codes) |
| 9.7 | "We're able to accommodate employment in most states" read as a disability-accommodation question | Fixed (1.0.15) | Accommodation topic excludes "accommodate employment / hiring" |
| 9.8 | Essay writer only on a branch | Shipped (1.0.15) | On-device writer, employer AI-rule detection and every-script word counts merged to main; privacy policy names the one-time model download |
| 9.9 | Workday | Not testable under our rules | A live probe on 5 Workday jobs (NVIDIA, Salesforce, Adobe, Intel, Target) cannot reach the apply step without letting Workday's own requests out, and an account is needed after it; the adapter stays tested on saved pages only |

Results (every unclear answer checked by hand):
- Round 7 (US candidate, 225 forms, before the fixes): 0 wrong of 2,392 filled; 60.3% of fields filled; 66 forms ready.
- Re-run with 9.3/9.4: 0 wrong of 2,407; sponsorship answered 48 → 62 of 75, work authorization 36 → 44 of 55.
- Targeted re-runs: state questions 5 → 11 of 19 (0 wrong of 636); the India candidate on 36 US forms: visa
  questions 18 → 42 of 61 (0 wrong of 487).
- Harness now counts required sections (Breezy "Work History*"): 79 seen, 74 filled; the 5 left are the free-text
  "Experience Summary".

## Still open

| Item | Why open |
|---|---|
| Cover letter generator (on-device AI) | Planned feature, not started |
| AI matching for reworded questions | Question model retrained on 3,465 real questions (7.5); a writing model failed the laptop test (7.1) |
| Address existence check | Needs an online lookup; conflicts with "data never leaves the browser" |
| Workday, iCIMS, Taleo live testing | Need accounts (user's decision); adapters tested on saved pages only (9.9) |
| Essay writer tier thresholds and fine-tuning | Waiting on the user's Chrome-only model test on their laptop |
| Long state questions with a note ("Please select your current state of residence. Select 'Not in the US'…") | Over the word limit for profile facts; 5 seen in round 7 |

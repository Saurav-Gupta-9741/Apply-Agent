# Chrome Web Store listing (copy-paste ready)

Images in this folder: `screenshot-fill.png`, `screenshot-queue.png`, `screenshot-answers.png`,
`screenshot-tracker.png` (1280×800). Promo tile: `../brand/promo-tile-440x280.png`. Icon: `../brand/icon128.png`.
Regenerate: `STORE=1 npx playwright test e2e/store-shots.spec.ts && python scripts/store-shots.py`.

## Basics
- **Name:** ApplyAgent (check it is free first: store search, trademark search, domain)
- **Category:** Productivity → Workflow & Planning
- **Language:** English
- **Visibility for the beta:** Unlisted (share the link with testers), then Public

## Short description (max 132 characters)
Fills job applications on company career sites from your profile. Asks before anything sensitive. You press Submit.

## Detailed description
Job application autofill for company career sites, with private, on-device AI. Built for applicants in India and
worldwide. Your data stays in your browser.

ApplyAgent fills job applications on company career sites for you. Tested on thousands of live applications on
Greenhouse, Ashby, Lever, Breezy, BambooHR, Recruitee and Workable, and it works on many companies' own careers pages.
Workday, iCIMS and Taleo are not supported yet.

TESTED ON REAL FORMS
On 182 live job applications it had never seen, filled for a US and an Indian test candidate: about 69% of all fields
filled, and 3 wrong answers out of 3,691 (all fixed). Nothing was submitted during testing.

HOW IT WORKS
• Save your profile, resume and a few quick answers once (notice period, work permit, expected salary).
• Open an application and press Fill (or Alt+Shift+G). ApplyAgent types your details, attaches your resume and picks
  the right options.
• Questions only you can answer (why this company, background checks, licences, diversity questions you did not
  fill in) are left for you, highlighted on the page.
• You review the form and press Submit. "Applied" is recorded only when the employer's site confirms it.

UNDERSTANDS QUESTIONS, CAREFULLY
A small AI model inside the extension reads unusual wordings ("Joining timeline?" is your notice period). It runs
offline on your computer. It fills a question only when it is sure, the question says so in plain words, and every
safety check passes. Anything unclear is asked.

WHAT IT NEVER DOES
• Never runs on LinkedIn, Naukri, Indeed, Glassdoor and similar job platforms.
• Never handles passwords or solves CAPTCHAs: you do those.
• Never submits without your choice.
• Never sends your data anywhere: your profile, resume and answers stay in your browser.

WRITES WITH YOU, ON YOUR COMPUTER
• Cover letters and essay answers drafted from your profile and resume by an AI model that runs on your computer.
  Sentences your resume does not support are removed; you read and edit every draft before it is used.
• A cover letter you approve becomes a PDF and is attached to the form's cover-letter box.
• "Tailor your resume for this job": which of your skills to add and which lines to put first, never a skill you do
  not have.

FINDS JOBS
• Discover reads the public job boards of hundreds of verified companies and ranks the jobs for your profile.
• Optional daily check: the number of new matching jobs appears on the ApplyAgent icon.

ALSO
• Queue: paste job links and work through several applications at a human pace.
• Tracker with proof of every confirmed submission.
• Works on multi-step forms, forms inside frames, and forms in 7 languages.

PRICING
• Free: unlimited single-form applications, answer bank, Quick Answers, basic tracker, save form structure.
• Pro: ₹149 for 30 days in India, $9 elsewhere. Queue & bulk apply, resume import, AI drafts, tracker analytics & reminders, enterprise multi-step flows.
• Founder (limited time): ₹2999 in India, $49 elsewhere, valid for 10 years.
• One-time payments only: nothing renews automatically. You get a licence key; no account needed.

## Single purpose (required field)
Fill job application forms on company career sites with the user's own saved details, leaving sensitive questions
and the final submission to the user.

## Permission justifications
| Permission | Why |
|---|---|
| `sidePanel` | The extension's interface. |
| `storage`, `unlimitedStorage` | The user's profile, resume file, saved answers and application tracker, kept locally. A resume can exceed the default quota. |
| `scripting` | Fills the application form on the page, and registers the form detector only on sites the user allowed. |
| `activeTab` | One-time access to the current tab when the user presses Fill on a site not allowed permanently. |
| `alarms` | Resumes the application queue after Chrome restarts, times out stuck steps, and runs the optional once-a-day job check the user switches on in Discover. |
| `contextMenus` | The "Fill this application with ApplyAgent" right-click entry. |
| `offscreen` | Runs the offline question-understanding model (WebAssembly) in an offscreen page; no data leaves the computer. |
| `system.memory`, `system.cpu` | Reads this computer's memory size and processor count, on this device only, to pick an essay-writing model small enough to run well here. Nothing is sent anywhere. |
| Optional host permissions (`https://*/*`) | Requested per site, only when the user allows a careers site (one click for the common job-application platforms). Never used on LinkedIn, Indeed, Naukri and similar platforms. |
| Optional host permissions for job boards | Discover and the optional daily job check read companies' public job lists (boards-api.greenhouse.io, api.lever.co, api.ashbyhq.com, api.smartrecruiters.com, *.recruitee.com, *.jobs.personio.de, apply.workable.com), requested when the user first presses "Find matching jobs". No cookies, nothing about the user is sent. |
| Remote code | None. All code ships inside the package. The question-understanding model ships inside the package too; the optional essay-writing model is a data file (model weights) downloaded once from Hugging Face when the user first asks for a draft. |

## Privacy practices tab / Data-use disclosure
- **Data collected:** No data collected. Everything (profile, resume, answers, applications) stays 100% on your device in local browser storage.
- **Transmitted off device (no personal data in any of them):**
  - the application forms the user fills and submits themselves, on the employer's site;
  - the licence key check (`POST /activate`) when the user activates a Pro key;
  - public job lists read by Discover and the optional daily check (no cookies);
  - one read of a job's public location on Greenhouse's job API, or on the same BambooHR site, to know the job's country;
  - the one-time download of the optional essay-writing model from Hugging Face.
- **Not collected/transmitted:** No personal details, no resume bytes, no answers, no tracking, no health, no financial, no authentication, no analytics.
- **Certifications:** not sold to third parties; not used or transferred for purposes unrelated to the single purpose;
  not used for creditworthiness or lending.
- **Privacy policy URL:** your hosted copy of `../PRIVACY.md`.

## Before submitting
- [ ] Final name checked and free
- [ ] `src/shared/config.ts`: licence server URL + public key set (see `../DEPLOY.md` §3–4), or leave empty for free mode
- [ ] `static/manifest.json`: version bumped
- [ ] `npm run test:all` green, `npm run build`, zip the **contents** of `dist/` (with `dist/intent/` and `dist/ort/`)
- [ ] Privacy policy, terms and refund pages live on your website

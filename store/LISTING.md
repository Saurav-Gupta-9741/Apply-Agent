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
ApplyAgent fills job applications on company career sites for you: Greenhouse, Lever, Ashby, Workable, BambooHR,
Teamtailor, Breezy, Recruitee, Personio and companies' own careers pages.

HOW IT WORKS
• Save your profile, resume and a few quick answers once (notice period, work permit, expected salary).
• Open an application and press Fill (or Alt+Shift+F). ApplyAgent types your details, attaches your resume and picks
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

ALSO
• Queue: paste job links and work through several applications at a human pace.
• Tracker with proof of every confirmed submission.
• Works on multi-step forms, forms inside frames, and forms in 7 languages.

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
| `alarms` | Resumes the application queue after Chrome restarts, and times out stuck steps. |
| `contextMenus` | The "Fill this application with ApplyAgent" right-click entry. |
| `offscreen` | Runs the offline question-understanding model (WebAssembly) in an offscreen page; no data leaves the computer. |
| Optional host permissions (`https://*/*`) | Requested per site, only when the user allows a careers site (one click for the common job-application platforms). Never used on LinkedIn, Indeed, Naukri and similar platforms. |
| Remote code | None. All code and the model ship inside the package. |

## Privacy practices tab
- **Data collected:** Personally identifiable information (name, email, phone, address the user types), Website
  content (the application form being filled). Both are handled **locally only**.
- **Not collected/transmitted:** health, financial, authentication, location tracking, web history, user activity.
- **Certifications:** not sold to third parties; not used or transferred for purposes unrelated to the single purpose;
  not used for creditworthiness or lending.
- **Privacy policy URL:** your hosted copy of `../PRIVACY.md`.

## Before submitting
- [ ] Final name checked and free
- [ ] `src/shared/config.ts`: licence server URL + public key set (see `../DEPLOY.md` §3–4), or leave empty for free mode
- [ ] `static/manifest.json`: version bumped
- [ ] `npm run test:all` green, `npm run build`, zip the **contents** of `dist/` (with `dist/intent/` and `dist/ort/`)
- [ ] Privacy policy, terms and refund pages live on your website

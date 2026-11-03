# ApplyAgent beta: how to test

Thank you for helping. ApplyAgent fills job applications on companies' own career pages (Greenhouse, Lever, Ashby,
Workable and similar). It fills only what it is sure about, asks you about the rest, and **never presses Submit**.

## Install (2 minutes, Chrome or Edge)

1. Download `applyagent-beta-<version>.zip` from the repository's **Releases** page and unzip it into a folder.
2. Open `chrome://extensions` (Edge: `edge://extensions`) and switch on **Developer mode** (top right).
3. Click **Load unpacked** and choose the unzipped folder.
4. Pin ApplyAgent from the puzzle-piece menu, then click its icon to open the side panel.

## Updating from beta 1

To keep your profile, update **the same folder**: unzip beta 2 into the folder you loaded beta 1 from (replace the
files), then press **Reload** on ApplyAgent in `chrome://extensions`. Loading beta 2 from a *new* folder makes a
separate copy that starts empty. (Safest: first export a backup from Profile & plan.) After updating, ApplyAgent asks you once to **check your saved answers**: beta 1's
setup could save its example answers (e.g. "3 years of experience") for questions you skipped. Please clear anything
that isn't yours.

## What's new in beta 2 (from your reports)

- **Setup never saves an example answer.** Skip means "ask me on each form". Progress is saved after every question
  and the setup reopens where you left it.
- **Practice form works** (onboarding's "Try it"): it fills, names each missing field, and submits after you tick
  consent yourself.
- **Your answers no longer revert** (gender, resume): saving one screen never overwrites what another saved.
- **Resume is saved the moment you choose it.**
- **Experience over 7 years** fills "7-10", "Above 7 years", "10+"; 0 years fills "Fresher".
- **Languages:** a level dropdown (Native, Fluent, Advanced, Intermediate, Beginner); "Beginner" is never filled as
  "Fluent". Skills without years are never given guessed years.
- **Links are checked** (LinkedIn must be linkedin.com/in/…), and a city typo gets a "Did you mean …?".
- **Reworded diversity questions:** a gender, veteran or disability answer you give on a form now answers the same
  question in other words next time.
- **Education status:** "completed" or "currently pursuing", used for "Are you currently enrolled?" questions.
- **Jobs:** filters for experience (fresher to senior), job type (full-time, internship, contract…) and remote, and a
  **Back to jobs** button on the Apply screen.

## What to try (about 20 minutes)

1. **Profile:** fill your profile and the Quick Answers (notice period, work countries, salary).
2. **Fill a real form:** open 3–5 job applications on company career pages (not LinkedIn or Naukri) and press
   **Fill**. Check every field it filled. **Do not submit unless you really want to apply.**
3. **Tracker:** save a job, switch to **Board view**, move it between stages, and try **Interview prep**.
4. **Discover** (Jobs section): press **Find matching jobs**, then open one and save one.

## What matters most to us

- **A wrong answer** (it filled something incorrectly). This is the most important thing to report.
- A field it should have filled but asked about instead.
- Anything confusing, slow or broken.

## How to report

Open an issue with the **Beta feedback** form. Include:

- the job page address (the company's career page, **not** anything with your personal details);
- what happened and what you expected;
- from the side panel, **Report a problem → Export diagnostics**: it contains the questions and decisions only, never
  your answers or personal data. Look at it before attaching it.

Please **remove your personal details** (name, email, phone, address) from any screenshot.

## Privacy

Your profile and answers stay in your browser. Nothing is sent to us. The only network requests are the job-board
feeds you choose in Discover (public company job lists) and, if you buy Pro, the licence check.

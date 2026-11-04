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

## Updating to beta 4 (1.0.3): one extra step, once

Beta 4 gives ApplyAgent a fixed identity, so from now on **every update keeps your data, whatever folder you unzip
it to**. Switching to it once looks like a new extension to Chrome, so:

1. In your current ApplyAgent: **Profile & plan → Backup & move → Export backup** (saves a .json file).
2. Unzip beta 4 and load it (same folder + **Reload**, or a new folder + **Load unpacked**; remove the old copy).
3. In beta 4's first screen choose **"Used ApplyAgent before? Restore from a backup file"** and pick that file.
4. Turn on **Keep an automatic backup on this PC** (Backup & move), so a reinstall never loses anything again.

## Updating to beta 5 (1.0.4)

Nothing to do: unzip it over your beta 4 folder (or any folder) and press **Reload** (or **Load unpacked**). Your
data stays, because beta 4 and later share one identity.

## What's new in beta 5 (1.0.4): Discover, rebuilt around you

- **Jobs are matched to your profile and resume.** The Jobs screen shows exactly what it matches on (roles,
  experience, where, skills) and where each came from. With no Target roles it uses your current title, your work
  history, or your field of study, and says so. A student is treated as a fresher.
- **Every % is explained.** "Why 82%?" on each job shows Role, Skills, Experience and Location points with the reason
  for each, and the skills the job names that your profile does not list.
- **Jobs you can't take are left out, and counted:** other fields, two or more years more experience than you have,
  senior / team-lead roles for freshers, and (with "Only where I can work", on by default) jobs in countries you did
  not list, including remote jobs open only to other countries.
- **340 companies** (was 54), each checked against its own job board, with what it hires for and where. Discover
  checks the companies that hire for your field where you can work first; "Check more companies" goes further.
- **Add any company** by pasting its careers page or job-board link (Jobs → Add a company you want to work for).
  ApplyAgent reads that page once (after checking the site's robots.txt), finds its Greenhouse / Lever / Ashby /
  SmartRecruiters / Workable / Recruitee / Personio board, and checks it first in every search. Job sites (LinkedIn,
  Naukri…) are refused. Your companies are in your backups.
- **The last results come back** when you reopen the panel, with when they were checked.
- **Plan card:** no licence key box while there is nothing to buy or activate.
- **Fill only fills (from your report).** It no longer closes pop-up application forms, never presses Next or
  Continue for you (multi-page forms: check the page, press Next yourself, then Fill again), and nothing is ever
  submitted while a required field is empty: Submit names the empty ones instead. The Queue, which works in its own
  tabs, still moves through the steps and stops before the final Submit.

Privacy: Discover only reads public job boards and, when you add a company, that company's page. Nothing about you
is in any request; matching happens in your browser.

## What's new in beta 4 (1.0.3)

- **Your data survives reinstalls:** fixed extension identity for every beta; optional **automatic backup** to
  Downloads → ApplyAgent → applyagent-backup.json (at most once an hour, never uploaded); **Restore from a backup**
  on the first screen.
- **Every Profile field shows an example** ("e.g. +91 98765 43210") and which form questions it answers.
- **The first-run screen asks before reading your resume** (it used to copy your name, email and phone silently).

## What's new in beta 3 (1.0.2, from your reports)

- **Your resume is read only when you say so.** Uploading saves the file; ApplyAgent then asks whether to read it
  for profile details. In the review **nothing is ticked**: every value shows the resume line it came from, and only
  what you tick is imported. Unsaved Profile edits are saved first, so nothing you typed is lost.
- **The import no longer invents values:** a degree like "M.Tech" is never read as a website, "2025 – Present" is not a
  graduation year (it sets "currently pursuing"), skills get no made-up years and languages no made-up level.
- **Every Profile field is checked.** Country and state come from lists (a made-up country or a state of another
  country can't be saved), postal codes are checked per country (an Indian PIN must fit the state), and names,
  email ("Did you mean gmail.com?"), phone, links, time zone and years are checked too. Red notes block saving;
  amber notes are worth a second look.
- **Leaving Profile with unsaved changes asks you** to save, discard or keep editing.

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

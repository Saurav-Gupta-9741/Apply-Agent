# ApplyAgent beta: how to test

Thank you for helping. ApplyAgent fills job applications on companies' own career pages (Greenhouse, Lever, Ashby,
Workable and similar). It fills only what it is sure about, asks you about the rest, and **never presses Submit**.

## Install (2 minutes, Chrome or Edge)

1. Download `applyagent-beta-<version>.zip` from the repository's **Releases** page and unzip it into a folder.
2. Open `chrome://extensions` (Edge: `edge://extensions`) and switch on **Developer mode** (top right).
3. Click **Load unpacked** and choose the unzipped folder.
4. Pin ApplyAgent from the puzzle-piece menu, then click its icon to open the side panel.

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

# Privacy Policy (draft: review before publishing)

_Last updated: [DATE]_

ApplyAgent ("we") is a browser extension that helps you fill job applications on websites you choose.

## What stays on your computer
Your profile (name, contact details, education, experience, preferences), your resume file, the answers you
save, your application queue and your application history (including confirmation text and screenshots) are
stored **only in your browser** (Chrome local storage). We do not receive or store them.

## What the extension sends, and where
- **To the job websites you allow:** the information you choose to submit in their application forms,
  exactly as when you apply yourself.
- **To our licence server (only if you buy Pro):** your licence key, to check that your pass is active.
  Payments are processed by Razorpay; we receive the payment ID and status, not your card or UPI details.
- **To the job feed URL you enter (optional):** a normal download request for the job list.
- **On-device AI (optional):** drafts are generated on your computer, by the AI model built into Chrome or by a
  small open model that ApplyAgent downloads once from Hugging Face when you first ask for a draft (a plain file
  download; nothing about you is sent). Nothing is sent to us or to an AI provider.
- **Greenhouse's public job listing:** when a Greenhouse application form is embedded in a company's own careers
  page, it does not show where the job is. ApplyAgent then reads that job's public location from Greenhouse's
  public job list (boards-api.greenhouse.io), to know which country's work-permit and salary questions apply. The
  request names only the job; it carries no information about you and no cookies.
- **BambooHR's public job details:** on a BambooHR application, ApplyAgent reads the job's country from that same
  BambooHR site's public job details (a location such as "Milano, MI" could otherwise be read as Michigan). The
  request names only the job; it carries no information about you and no cookies.
- **Discover and the daily job check (optional):** when you press "Find matching jobs", or switch on "Check for new
  matching jobs every day", ApplyAgent downloads companies' public job lists from their job-board sites
  (Greenhouse, Lever, Ashby, SmartRecruiters, Recruitee, Personio, Workable), without cookies. Matching your
  profile to the jobs happens on your computer; nothing about you is sent. The daily check runs once a day only
  while the switch is on, and shows the number of new matches on the ApplyAgent icon.
- **Cover letters:** a cover letter you approve is turned into a PDF file on your computer and attached to the
  form's cover-letter box only when you press "Use this answer". It is never sent anywhere else.
- **Question understanding:** a small language model shipped inside the extension reads what form questions mean.
  It runs on your computer, offline; question text and your answers are never sent anywhere for this.

## What we never do
We do not sell or share your data, show ads, track your browsing, or read pages on sites you have not allowed.
The extension only acts on websites you explicitly allow, one site at a time, or on a page where you open it
yourself (toolbar icon, keyboard shortcut or right-click menu), for that visit only. It never runs on LinkedIn,
Indeed, Naukri and similar job platforms.

**Silent detection** (setting in Profile & plan): on the sites you allowed, the extension can recognise
application forms and show what it could fill on its icon. This happens on your computer; nothing is sent
anywhere. Turn it off and the extension reads no page until you press Fill.

## Deleting your data
Remove the extension, or clear its data in Chrome, to delete everything stored locally. To delete licence
records, email [CONTACT EMAIL] with your licence key.

## Contact
[CONTACT EMAIL]

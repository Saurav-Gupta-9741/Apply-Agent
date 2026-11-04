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

## Still open

| Item | Why open |
|---|---|
| Cover letter generator (on-device AI) | Planned feature, not started |
| AI matching for reworded questions | Planned feature, not started |
| Address existence check | Needs an online lookup; conflicts with "data never leaves the browser" |

# Manual Test Plan — before launch

Goal: find every problem a real user would hit, before they do. About **6–8 days**, 1–2 hours a day.
Log every problem in a sheet (section 9). Send me screenshots in batches; I fix, you re-test.

**Golden rules while testing**
- Use a **fresh Chrome profile** (Chrome → profile icon → Add) with only ApplyAgent installed.
- **Never submit** to a job you don't want. Days 1–5 are Preview / Fill only.
- After every Fill, look at **every field yourself**. A wrong value is worse than an empty one.

---

## Day 1 — Setup and first impressions (1 hr)
| # | Test | Pass if |
|---|---|---|
| 1.1 | Install from `dist/`, click the icon | Panel opens, logo animates, setup checklist shows 0–1 of 4 |
| 1.2 | Fill profile, upload resume (PDF), quick answers | Checklist ticks each step; data still there after closing Chrome |
| 1.3 | "Allow the job sites" | One Chrome prompt; step ticks |
| 1.4 | Read every screen as a new user | Nothing confusing; write down any word you didn't understand |
| 1.5 | Backup → remove extension → reinstall → Restore | Everything comes back |

## Days 2–3 — Preview on 30 real forms (2 hrs/day)
Pick **3 jobs on each** platform: Greenhouse, Lever, Ashby, Workable, BambooHR, Teamtailor, Breezy, Recruitee,
Personio, + 3 company sites with their own careers page. Mix: Indian jobs, US jobs, EU jobs, internships.

On each: open the job description page → press **Preview**, then **Fill** (don't submit). Check:
| # | Check | Pass if |
|---|---|---|
| a | It found the application (opened Apply by itself if needed) | Yes, or it clearly said what to do |
| b | Every filled value is correct (name, email, phone + country code, LinkedIn, city, resume) | **0 wrong values** |
| c | Work authorization / sponsorship answers match the job's country | Correct for India job and for a US job |
| d | Nothing filled into: references, referrer name, "describe…", signature, yes/no screening questions | Left empty / "needs you" |
| e | "Needs your answer" list matches what is really left | No field forgotten |
| f | Preview count ≈ Fill result | Same numbers |
| g | Time from Fill to done | Under ~10 s |
| h | Form typed by you before Fill | Not overwritten |

## Day 4 — Extreme cases (1.5 hrs)
| # | Test | Pass if |
|---|---|---|
| 4.1 | LinkedIn, Naukri, Indeed job pages: press Fill | Refuses politely, types nothing |
| 4.2 | A Workday job (sign-in wall) | Says "sign in yourself", never touches password |
| 4.3 | A form with CAPTCHA / robot check | Stops and asks you to solve it |
| 4.4 | Multi-step form (Next → Next → Submit) | Goes through steps, never presses final Submit in Review mode |
| 4.5 | Form inside an iframe (company site embedding Greenhouse) | Fills it |
| 4.6 | Switch tab while it's filling; close the panel mid-fill | No crash; no wrong state shown on the other tab |
| 4.7 | Very slow internet (DevTools → Network → Slow 3G) | Still fills, or says what failed |
| 4.8 | Quick answers empty → fill a form | Those questions are asked, not guessed |
| 4.9 | Profile with a non-Indian phone (+1…) and country USA | Correct country code everywhere |
| 4.10 | Resume as .docx; resume over 5 MB | Uploads or clear message |
| 4.11 | Settings: question understanding OFF → fill same form | Still works (fewer fills), no errors |
| 4.12 | Settings: silent detection OFF/ON | Badge stops/starts |
| 4.13 | Keyboard only (Tab/Enter) through the panel | Everything reachable |
| 4.14 | Browser zoom 150% and a small laptop screen | Panel readable, nothing cut off |

## Day 5 — Queue and tracker (1 hr)
| # | Test | Pass if |
|---|---|---|
| 5.1 | Paste 5 job links (2 from same company) → Start | Max "At once" tabs; same-company second job skipped |
| 5.2 | Restart Chrome during a queue | Queue resumes or marks items clearly |
| 5.3 | Daily limit (set Per day = 2) | Stops at 2 |
| 5.4 | LinkedIn link in the queue | Refused with a reason |

## Day 6 — Other browsers and computers (1 hr)
| # | Test | Pass if |
|---|---|---|
| 6.1 | Microsoft Edge, Brave (load `dist/` the same way) | Same as Chrome |
| 6.2 | Opera | Panel opens in its own small window and works |
| 6.3 | A friend's Mac (if possible) | Shortcut shows ⌥⇧F; everything works |
| 6.4 | An old/low-RAM laptop | Works (slower is fine) |
| 6.5 | Website `site/` on your phone | Readable, no sideways scrolling |

## Day 7 — Real applications (1 hr)
Apply for real to **3–5 jobs you actually want**, in Review mode:
| # | Check | Pass if |
|---|---|---|
| 7.1 | You review and press Submit | Site accepts it first time |
| 7.2 | Tracker | Shows "Applied ✓" only after the site's confirmation |
| 7.3 | Confirmation email from the company | Arrives; details in it are correct |

## Day 8 — Payments (test mode, no real money) (1 hr, after Razorpay test keys)
| # | Test | Pass if |
|---|---|---|
| 8.1 | Buy Pro with a Razorpay **test** card/UPI | Licence key shown; Pro active in panel |
| 8.2 | Buy again before expiry | 30 days added on top |
| 8.3 | Free plan after 20 applications | Clear message, buy link works |
| 8.4 | Refund in Razorpay dashboard | You know how to do it in under 5 minutes |

## Beta (1 week, 20–50 people)
Give each person: the install steps, 3 tasks ("fill 3 applications"), and a 5-question form:
1. Did any field get a wrong value? (screenshot) 2. What confused you? 3. How long did one application take?
4. Would you pay ₹79 for 30 days? 5. Would you recommend it (0–10)?

## 9. Bug log (Google Sheet columns)
`# | Date | Site link | What I did | What happened | What should happen | Screenshot | Severity (Wrong value / Crash / Confusing / Small)`
**Wrong value = fix before launch, always.**

## 10. Ready to launch when
- [ ] 30+ real forms tested, **0 wrong values** left unfixed
- [ ] All Day 4 extreme cases pass
- [ ] 3+ real applications submitted and confirmed
- [ ] Test payment works end to end
- [ ] 10+ beta users finished; average recommend score ≥ 7

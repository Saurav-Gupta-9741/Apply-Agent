# Testing ApplyAgent 1.0.20 by hand: exact steps and real job links

Every link below was an **open job on 2026-11-14**. A job can close at any time; if one has closed, use any other open job
on the same company page. **Never press Submit unless you really want to apply.**

Total time: about 4–5 hours. It can be split over several days; do Part 1 and Part 2 first.

---

## Part 0 — Set up (15 min)

1. **Install 1.0.20.** Unzip `applyagent-beta-1.0.20.zip` over your ApplyAgent folder, open `chrome://extensions`,
   press **reload** on ApplyAgent, and check the card says **1.0.20**.
2. **Profile** (ApplyAgent icon → Profile): name, email, phone, city **and state**, country, LinkedIn, current company
   and title, school, degree, graduation year, years of experience, skills, **Professional summary**, and your
   **resume as a PDF**.
3. **Quick Answers** (fill every one): countries where you can work without a visa, what you need elsewhere,
   **willing to relocate**, **work mode** (remote/hybrid/onsite), notice period, current and expected salary, **expected
   salary abroad** (e.g. `USD 70,000; EUR 60,000; GBP 55,000`), citizenship, how you heard about jobs, the diversity
   questions (or "Decline").
4. **Note down for every form you test** (copy this line into a notes file):
   `Site | Link | Fields filled | Asked you | WRONG (which field, what it put, what is right) | Seconds | Notes`

## How to test ONE form (repeat for every link)

1. Open the link. If you see only the job description, press the page's **Apply** button first.
2. Open ApplyAgent (toolbar icon or **Alt+Shift+G**). If it asks to allow the site, allow it.
3. Press **Fill** and count the seconds until it says it is done.
4. Check **every field on the page**, top to bottom:
   - **Filled and correct** → fine.
   - **Filled but WRONG** → the most important finding. Screenshot it (hide your personal details).
   - **Left empty, and you think ApplyAgent knew the answer** → note it.
   - **Left empty and it is yours** (essays, "Why us?", consent boxes) → fine.
   - Dropdowns: open each one filled and check the choice; check the **resume is attached**.
5. In the side panel, look at the **questions it left for you**:
   - **"Suggested from your resume"**: is the quoted line real, and is "Yes" right?
   - **"Start from my earlier answer"** on "Why …?" questions (after you saved one answer once).
   - The **Job fit** card → **Tailor your resume for this job**: sensible?
6. **Do not press Submit.** Close the tab.
7. If something was wrong: side panel → **Report a problem → Export diagnostics** (it holds no answers), and keep it
   with the screenshot.

---

## Part 1 — Sites I could NOT test (highest priority, ~1.5 h)

### SmartRecruiters (shows a robot check to test browsers; your normal Chrome should see the form)
Open the job, press **I'm interested**, then Fill on the application page.
- Bosch — Manufacturing Quality Engineer: https://jobs.smartrecruiters.com/BoschGroup/744000161629479
- Ubisoft — HR Advisor (Montreal): https://jobs.smartrecruiters.com/Ubisoft2/744000161565892
- CD PROJEKT RED — Legal Counsel (Warsaw): https://jobs.smartrecruiters.com/CDPROJEKTRED/744000161289789
- Vitol — Senior Data Scientist (Houston): https://jobs.smartrecruiters.com/Vitol/744000161551039

### Jobvite (a privacy-consent step comes first: accept it yourself, then press Fill)
- Internet Brands — Account Manager: https://jobs.jobvite.com/internetbrands/job/oXDMAfwG
- Logitech (pick any open job): https://jobs.jobvite.com/logitech/jobs

### Workday (most big companies; needs an account on each company's site)
Workday is **not supported yet** — this test tells me how far ApplyAgent gets. Use a separate email for the account if
you prefer. Pick any job, press **Apply → Apply Manually**, create the account, then press Fill on each step and note
which fields filled.
- Salesforce: https://salesforce.wd12.myworkdayjobs.com/External_Career_Site
- Adobe: https://adobe.wd5.myworkdayjobs.com/external_experienced
- Intel: https://intel.wd1.myworkdayjobs.com/External
- NVIDIA: https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite

### Other big-company systems (also need an account; note what fills)
- **Oracle Recruiting Cloud** (Oracle's own jobs): https://eeho.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1
- **SAP SuccessFactors** (SAP's own jobs): https://jobs.sap.com/
- **iCIMS**: https://careers.icims.com → *Search openings* (or Google `careers- site:icims.com jobs` for any company)
- **Taleo**: Google `site:taleo.net careersection jobdetail` and open any live job
- **Amazon** (own system): https://www.amazon.jobs/en/
- **IBM** (own system): https://careers.ibm.com

### Indian job systems
- **Darwinbox**: https://darwinbox.darwinbox.in/ms/candidate/careers
- **Keka**: https://keka.keka.com/careers
- **Zoho**: https://careers.zohocorp.com
- Also try 2–3 Indian companies' own careers pages you would really apply to.

---

## Part 2 — Fixed in 1.0.20: confirm on your computer (~45 min)

### Lever (filled nothing before 1.0.20; now its location list must pick your own city)
- Paytm — Account Executive (Dubai): https://jobs.lever.co/paytm/9eed4fec-73f7-4114-a5d3-b2f689c92e8c/apply
- Meesho — Risk & Decision Science (Bangalore): https://jobs.lever.co/meesho/7d9af9b5-c1c7-48ec-bbb5-9b25e49f6596/apply
- CRED — Accounts Payable Manager (Hyderabad): https://jobs.lever.co/cred/aa98a938-af3a-45f5-851d-966b2b5bad33/apply
- Zeta — Analyst II SIEM/SecOps (Hyderabad): https://jobs.lever.co/zeta/38accd53-250f-4e8f-b635-261f31f78b65/apply
- Palantir — Administrative Business Partner (Singapore): https://jobs.lever.co/palantir/6ed76ce8-4156-4b60-b120-403538bd66cd/apply

Check: name, email, phone, **Current location shows your city from Lever's list**, LinkedIn, resume, salary only in the
job's currency. Leave the captcha at the bottom alone.

### Personio
- ottonova — Customer Support (Munich): https://ottonova.jobs.personio.de/job/2888695/apply?display=en
- Chrono24 — Full Stack Engineer (Remote): https://chrono24.jobs.personio.de/job/2827202/apply?display=en

---

## Part 3 — LinkedIn, Indeed, Naukri → the company's own site (~45 min)

ApplyAgent never fills LinkedIn/Indeed/Naukri pages (they ban it; your account could be restricted). It finds the
same job on the company's own site.

1. On LinkedIn search e.g. "Data Engineer" in Bengaluru (or your role). Open **5 jobs whose button says "Apply" with an
   arrow (company website)** — not "Easy Apply".
2. On the job page, open ApplyAgent with the **toolbar icon** (it needs that to see the tab).
3. Expect: a card **"Apply on <Company>'s site"**. Press it.
4. Expect one of:
   - a new tab with **the same job** on the company's site → press **Fill** there and test it as above;
   - or a Google search for it (when the company's job board is not one ApplyAgent reads).
5. Note for each: found the same job? wrong job? search opened?
6. Repeat with **2 Indeed jobs** and **2 Naukri jobs**.
7. Also open one **Easy Apply** job: ApplyAgent must say it does not work there and fill nothing.

Good companies to try (their boards are known to ApplyAgent): Razorpay, Groww, PhonePe, Postman, CRED, Meesho, Zeta,
Paytm, OpenAI, Notion, Databricks, Stripe, Airbnb.

---

## Part 4 — Features (~1 h)

1. **Suggestions from your resume** — open these (their experience questions are left for you):
   - Gusto: https://job-boards.greenhouse.io/gusto/jobs/7656216 ("experience in risk data science?")
   - Starburst: https://job-boards.greenhouse.io/starburst/jobs/5462554008 ("experience selling B2B SaaS?")
   Fill, then check the **"Suggested from your resume"** line under the question. If your resume does not show it,
   there must be no suggestion.
2. **Earlier answers** — on any form with "Why <company>?", type an answer and press **Save answer**. Then open
   Mercury: https://job-boards.greenhouse.io/mercury/jobs/6249882004 → "Why Mercury?" must offer **Start from my
   earlier answer**.
3. **Cover letter** — on a form with a Cover Letter upload, press **Write a cover letter**, time it, read it (any
   invented fact?), press **Use this answer**, check the PDF is attached and reads well.
4. **Drafts start by themselves** — on a form with an essay question, after Fill the draft should start without a click
   (only if the writing model is already downloaded).
5. **Tailor your resume** — on any job with a description: Job fit card → **Tailor your resume for this job**. Are the
   "add these" skills ones you really have (they come from your Profile)?
6. **Discover** — press **Find matching jobs**, then press it again: the second search should be almost instant.
   Switch on **Check for new matching jobs every day**; the next day a number should appear on the icon.
7. **Backup** — Profile → back up, then restore; check Quick Answers are all still there.

## Part 5 — Regular sites, quick spot-check (~45 min, 1 form each)
- Greenhouse: Razorpay https://job-boards.greenhouse.io/razorpaysoftwareprivatelimited/jobs/4745511005 · Groww
  https://job-boards.eu.greenhouse.io/groww/jobs/4970739101 · Databricks (form inside the company site)
  https://databricks.com/company/careers/open-positions/job?gh_jid=8805655002
- Ashby: Sarvam https://jobs.ashbyhq.com/sarvam/c0406fe0-c8c0-44aa-aa3e-b879f2bf1049/application · OpenAI
  https://jobs.ashbyhq.com/openai/8fb1615c-34bf-47c4-a1d1-b7b2f836bbd3/application · Notion
  https://jobs.ashbyhq.com/notion/1fc309c8-da20-4ff2-84c7-8b863ece2b0a/application
- Workable: https://apply.workable.com/xtremax-pte-ltd/j/180831B162/apply/ · https://apply.workable.com/fundingsocieties/j/B878A4EF9D/apply/
- Recruitee: https://aikidosecurity.recruitee.com/o/full-stack-developer-autofix/c/new
- Teamtailor: https://career.teamtailor.com/jobs/8742767-customer-success-manager-french-speaking
- Pinpoint: https://workwithus.pinpointhq.com/en/postings/fa79e602-e5a1-4ee7-9cee-3bb2a13eb20a
- BambooHR: https://adistec.bamboohr.com/careers/688
- Breezy: https://zero-hash.breezy.hr/p/82a9bd812da7-client-services-manager/apply

## Part 6 — Chrome's built-in AI (15 min, decides fast cover letters)
1. Update Chrome, then open `chrome://on-device-internals` and note what it says about the model.
2. In ApplyAgent, start a cover letter: if it offers **Chrome's built-in model**, use it and time the letter.
3. Send me: Chrome version, what the page said, and the seconds per letter.

## What to send me
- Your notes table (one line per form).
- For every **WRONG** field: the job link, a screenshot (personal details hidden) and the exported diagnostics.
- The LinkedIn/Indeed/Naukri results (found / wrong job / search).
- Anything slow, confusing or broken.

# Round 7 labelling conventions (Greenhouse public API, worldwide)

Labels are decided by a person, one question at a time (`python scripts/round7-show.py N` →
`python scripts/round7-label.py "<intents in shown order>"`, which echoes each label beside its question for checking;
`python scripts/round7-fix.py "<piece>=<intent>"` corrects one). The model's guess is shown as a hint only.

A label is the question's meaning *for filling*: if filling it with that meaning's saved answer could be wrong, the label
is the narrower or safer one.

| Question shape | Label |
|---|---|
| Yes/no with no saved fact ("Are you comfortable with the posted range?", shifts, contracts, "based in Madrid?") | other |
| "Are you based in X?" / "Do you live in X?" (residence yes/no) | other |
| "…or willing to relocate…", "based in X or open to relocating" | relocation |
| Office days, hybrid, commute to an office, "willing to work from office" | onsite |
| "In what cities / which offices would you work from?" (choice of places) | location |
| Authorized / eligible / right to work, citizenship or residency status lists | work_authorization |
| Need / require (now or future) sponsorship, visa support, permit needed | sponsorship |
| Compound questions (based in X *and* need sponsorship; right to work + sponsorship in one text box) | other |
| Follow-ups ("If yes/no/other, please specify…", dates of prior employment, visa type held) | other |
| Current / former employee or contractor of a named company | previous_employee |
| Relatives or friends working at the company | other |
| Privacy notices, data retention, AI note-taker / recording consent, SMS/email opt-ins | consent |
| Certify info is true, initials, arbitration, export control, PEP, conflicts, non-compete, criminal record, "AI or human?", "prepared by AI?" | legal_declaration |
| Essays and "describe / tell us / why" (any length) | open_question |
| Years of / experience with a skill, tool, industry (yes/no, ranges, counts) | skills_experience |
| Language fluency / level | language_proficiency |
| EEO/demographic: gender, race/ethnicity (incl. national/cultural origin lists), veteran, disability (incl. neurodiversity, health condition, certificates), LGBTQ+, transgender, Hispanic | the matching sensitive intent |
| Caregiving, parents' education, under-represented group, first-generation | other |
| Notice period, earliest start date, availability to join | notice_period |
| Expected / desired salary or compensation (any currency, period) | salary_expected |
| Current salary / CTC / compensation | salary_current |
| Pay-range alignment yes/no, average deal size, quota | other |
| "Website / GitHub", portfolio links | portfolio (github when only GitHub is asked) |
| Alternative / secondary email, GPA, graduation month, GitLab username | other |
| State/province/UK nation of residence (text or list) | state |
| Country of residence | country |
| Current city / "where are you located (city)" | location |
| "Degree type" with levels | degree; "highest completed education" | education_level |
| Files other than the resume | other_document |
| Referrer's / employee's name, relationship to employee (follow-up) | other_person |

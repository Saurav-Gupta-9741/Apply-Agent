# Live run statistics (36 forms)

Generated 2026-11-09T21:47:20.695Z from results-r7c-india.jsonl by `scripts/live1000-audit.mjs`. The run is still growing: re-run the script.

## Forms

| Outcome | Forms | Share |
|---|---:|---:|
| filled | 36 | 100.0% |

| Platform | filled |
|---|---:|
| greenhouse | 26 |
| ashby | 6 |
| bamboohr | 3 |
| breezy | 1 |

Filled forms: **36**. Ready to submit (nothing left for the user): **5** (13.9%); needing the user: **31**. Run status: needs_user 31, ready_to_submit 5.

## Fields

Fields on filled forms: **728** (20.2 per form).

| Status | Fields | Share |
|---|---:|---:|
| filled | 487 | 66.9% |
| needs_user | 135 | 18.5% |
| skipped | 93 | 12.8% |
| failed | 13 | 1.8% |

- Filled by the extension: **66.9%** of all fields.
- Required fields: 429; filled 307; **left for the user: 122 (28.4%)**.
- Required sections (lists such as Breezy "Work History*", not in the field list): 0; **left empty: 0**.

| Decision | Fields | filled | needs_user | failed | skipped | already_filled |
|---|---:|---:|---:|---:|---:|---:|
| profile | 281 | 274 | 0 | 7 | 0 | 0 |
| answer | 174 | 168 | 0 | 6 | 0 | 0 |
| ask | 135 | 0 | 135 | 0 | 0 | 0 |
| skip | 93 | 0 | 0 | 0 | 93 | 0 |
| resume | 36 | 36 | 0 | 0 | 0 | 0 |
| work | 9 | 9 | 0 | 0 | 0 | 0 |

## Asks (fields left for the user), by reason / topic (top 30)

| Topic | All | Required |
|---|---:|---:|
| unknown | 79 | 79 |
| sponsorship | 12 | 6 |
| missing_profile_value | 9 | 9 |
| consent | 8 | 7 |
| work_authorization | 8 | 6 |
| notice_period | 6 | 0 |
| salary | 4 | 2 |
| pronouns | 3 | 0 |
| relocation | 3 | 3 |
| signature | 1 | 1 |
| accommodation | 1 | 1 |
| sensitive | 1 | 1 |

## Skips

| Reason | Fields |
|---|---:|
| optional, not in profile | 45 |
| optional attachment (not your resume) | 24 |
| optional choice | 9 |
| no addressLine1 in profile | 3 |
| no postalCode in profile | 3 |
| not sure this saved answer fits: left for you | 2 |
| study dates are not in your profile | 2 |
| no portfolio in profile | 2 |
| optional address line 2 empty | 1 |
| optional attachment | 1 |
| current job: no end date | 1 |

## Failed fills (decision:key)

| Decision:key (control) | Fields |
|---|---:|
| profile:school (combobox) | 6 |
| answer:How did you hear about this job? (combobox) | 2 |
| answer:Quick answers › previous employer (combobox) | 2 |
| answer:Quick answers › sponsorship (combobox) | 1 |
| answer:Quick answers › relocation (combobox) | 1 |
| profile:country (combobox) | 1 |

## Time per form

Median 28s, mean 24.9s, max 44s (all 36 forms; includes page load, 3s settle and the fill). Filled forms: median 28s.

## Per platform

| Platform | Forms filled | Fields | Filled | Needs user | Failed | Required left | Ready | Median s |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| greenhouse | 26 | 588 | 410 (69.7%) | 109 | 13 | 104 of 377 | 2 | 33 |
| ashby | 6 | 69 | 38 (55.1%) | 14 | 0 | 6 of 34 | 3 | 11 |
| bamboohr | 3 | 43 | 24 (55.8%) | 6 | 0 | 6 of 10 | 0 | 19 |
| breezy | 1 | 28 | 15 (53.6%) | 6 | 0 | 6 of 8 | 0 | 29 |

## Fills the page cleared afterwards

3 text fills on 3 forms were reported filled but were empty when the page was read 0.8 s later (other fills on the same forms were there). By field: city.value 3. On Greenhouse these are the fields its resume autofill sets (first/last name, email, phone): its parse request is blocked in this run, and the reset arrives after the fill.

## Safety

- Requests blocked by the read-only guard: 647 on 36 forms (analytics, consent and tracking beacons).
- Blocked requests that look like application sends (to the ATS, path with appl/submit/candidate): **0**.
- Forms whose URL changed during the fill: **7** (must be 0).
  - URL changed: https://job-boards.greenhouse.io/zoominfo/jobs/8622943002
  - URL changed: https://job-boards.greenhouse.io/coreweave/jobs/4688540006
  - URL changed: https://job-boards.greenhouse.io/circleci/jobs/8801094002
  - URL changed: https://job-boards.greenhouse.io/lucidmotors/jobs/5093940007
  - URL changed: https://job-boards.greenhouse.io/circleci/jobs/8560754002
  - URL changed: https://job-boards.greenhouse.io/lucidmotors/jobs/5279891007
  - URL changed: https://job-boards.greenhouse.io/samsara/jobs/8162034

## Accuracy (see WRONG.md)

Filled fields judged: 487. Correct **487** (100.0%), wrong **0** (0.0%), unclear 0 (0 unique pairs, listed in UNCLEAR.md).

## Per company (filled forms)

| Company | Forms | Fields | Filled | Needs user | Required left | Ready |
|---|---:|---:|---:|---:|---:|---:|
| ashby:benchling | 1 | 16 | 7 | 5 | 3 | 0 |
| ashby:insitro | 1 | 9 | 5 | 2 | 2 | 0 |
| ashby:mintlify | 1 | 7 | 4 | 1 | 0 | 1 |
| ashby:pinecone | 2 | 20 | 12 | 4 | 0 | 2 |
| ashby:zapier | 1 | 17 | 10 | 2 | 1 | 0 |
| bamboohr:familiesforvaccines | 1 | 13 | 8 | 2 | 2 | 0 |
| bamboohr:royal | 2 | 30 | 16 | 4 | 4 | 0 |
| breezy:totalsecurityltd | 1 | 28 | 15 | 6 | 6 | 0 |
| greenhouse:abnormalsecurity | 1 | 21 | 17 | 2 | 2 | 0 |
| greenhouse:airtable | 1 | 15 | 10 | 3 | 2 | 0 |
| greenhouse:block | 1 | 31 | 18 | 7 | 7 | 0 |
| greenhouse:brex | 1 | 25 | 15 | 5 | 5 | 0 |
| greenhouse:calendly | 1 | 20 | 14 | 5 | 5 | 0 |
| greenhouse:calm | 1 | 25 | 18 | 6 | 5 | 0 |
| greenhouse:circleci | 2 | 37 | 28 | 6 | 6 | 0 |
| greenhouse:coreweave | 1 | 27 | 16 | 9 | 8 | 0 |
| greenhouse:datadog | 1 | 18 | 13 | 4 | 4 | 0 |
| greenhouse:fivetran | 1 | 28 | 17 | 7 | 7 | 0 |
| greenhouse:klaviyo | 1 | 17 | 14 | 0 | 0 | 1 |
| greenhouse:launchdarkly | 1 | 31 | 20 | 4 | 3 | 0 |
| greenhouse:lucidmotors | 2 | 65 | 48 | 7 | 7 | 0 |
| greenhouse:newrelic | 1 | 20 | 16 | 3 | 3 | 0 |
| greenhouse:samsara | 1 | 27 | 20 | 4 | 5 | 0 |
| greenhouse:sigmacomputing | 2 | 34 | 23 | 8 | 8 | 0 |
| greenhouse:sproutsocial | 2 | 42 | 33 | 7 | 7 | 0 |
| greenhouse:stockx | 1 | 15 | 11 | 1 | 1 | 0 |
| greenhouse:tanium | 1 | 20 | 15 | 3 | 3 | 0 |
| greenhouse:twitch | 1 | 37 | 15 | 16 | 14 | 0 |
| greenhouse:warp | 1 | 14 | 11 | 2 | 2 | 0 |
| greenhouse:zoominfo | 1 | 19 | 18 | 0 | 0 | 1 |

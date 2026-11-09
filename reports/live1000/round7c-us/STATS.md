# Live run statistics (43 forms)

Generated 2026-11-09T21:47:20.454Z from results-r7c-us.jsonl by `scripts/live1000-audit.mjs`. The run is still growing: re-run the script.

## Forms

| Outcome | Forms | Share |
|---|---:|---:|
| filled | 43 | 100.0% |

| Platform | filled |
|---|---:|
| greenhouse | 15 |
| ashby | 2 |
| bamboohr | 1 |
| breezy | 25 |

Filled forms: **43**. Ready to submit (nothing left for the user): **3** (7.0%); needing the user: **40**. Run status: needs_user 40, ready_to_submit 3.

## Fields

Fields on filled forms: **1097** (25.5 per form).

| Status | Fields | Share |
|---|---:|---:|
| filled | 636 | 58.0% |
| skipped | 210 | 19.1% |
| needs_user | 174 | 15.9% |
| already_filled | 58 | 5.3% |
| failed | 19 | 1.7% |

- Filled by the extension: **58.0%** of all fields.
- Required fields: 544; filled 359; **left for the user: 185 (34.0%)**.
- Required sections (lists such as Breezy "Work History*", not in the field list): 34; **left empty: 3** (summary 3).

| Decision | Fields | filled | needs_user | failed | skipped | already_filled |
|---|---:|---:|---:|---:|---:|---:|
| profile | 271 | 259 | 0 | 12 | 0 | 0 |
| skip | 222 | 0 | 0 | 0 | 210 | 12 |
| ask | 205 | 0 | 174 | 0 | 0 | 31 |
| work | 180 | 180 | 0 | 0 | 0 | 0 |
| answer | 176 | 154 | 0 | 7 | 0 | 15 |
| resume | 43 | 43 | 0 | 0 | 0 | 0 |

## Asks (fields left for the user), by reason / topic (top 30)

| Topic | All | Required |
|---|---:|---:|
| unknown | 147 | 147 |
| salary | 26 | 12 |
| notice_period | 12 | 12 |
| relocation | 5 | 5 |
| missing_profile_value | 4 | 4 |
| sponsorship | 4 | 3 |
| consent | 4 | 4 |
| work_authorization | 1 | 1 |
| signature | 1 | 1 |
| pronouns | 1 | 1 |

## Skips

| Reason | Fields |
|---|---:|
| optional, not in profile | 110 |
| study dates are not in your profile | 40 |
| optional choice | 34 |
| current job: no end date | 20 |
| optional attachment (not your resume) | 15 |
| no addressLine1 in profile | 1 |
| no postalCode in profile | 1 |
| no portfolio in profile | 1 |

## Failed fills (decision:key)

| Decision:key (control) | Fields |
|---|---:|
| profile:location (combobox) | 12 |
| answer:Quick answers › expected salary abroad (text) | 3 |
| answer:How did you hear about this job? (checkbox_group) | 2 |
| answer:Disability status (combobox) | 1 |
| answer:Quick answers › previous employer (combobox) | 1 |

## Time per form

Median 29s, mean 27.7s, max 44s (all 43 forms; includes page load, 3s settle and the fill). Filled forms: median 29s.

## Per platform

| Platform | Forms filled | Fields | Filled | Needs user | Failed | Required left | Ready | Median s |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| greenhouse | 15 | 319 | 236 (74.0%) | 43 | 14 | 53 of 232 | 0 | 34 |
| ashby | 2 | 33 | 13 (39.4%) | 5 | 2 | 5 of 12 | 0 | 15 |
| bamboohr | 1 | 13 | 8 (61.5%) | 2 | 0 | 2 of 4 | 0 | 20 |
| breezy | 25 | 732 | 379 (51.8%) | 124 | 3 | 128 of 330 | 3 | 29 |

## Fills the page cleared afterwards

1 text fills on 1 forms were reported filled but were empty when the page was read 0.8 s later (other fills on the same forms were there). By field: city.value 1. On Greenhouse these are the fields its resume autofill sets (first/last name, email, phone): its parse request is blocked in this run, and the reset arrives after the fill.

## Safety

- Requests blocked by the read-only guard: 444 on 42 forms (analytics, consent and tracking beacons).
- Blocked requests that look like application sends (to the ATS, path with appl/submit/candidate): **0**.
- Forms whose URL changed during the fill: **3** (must be 0).
  - URL changed: https://job-boards.greenhouse.io/billcom/jobs/6217056004
  - URL changed: https://job-boards.greenhouse.io/coreweave/jobs/4718149006
  - URL changed: https://job-boards.greenhouse.io/coreweave/jobs/4688540006

## Accuracy (see WRONG.md)

Filled fields judged: 636. Correct **636** (100.0%), wrong **0** (0.0%), unclear 0 (0 unique pairs, listed in UNCLEAR.md).

## Per company (filled forms)

| Company | Forms | Fields | Filled | Needs user | Required left | Ready |
|---|---:|---:|---:|---:|---:|---:|
| ashby:abridge | 1 | 17 | 5 | 4 | 4 | 0 |
| ashby:helpscout | 1 | 16 | 8 | 1 | 1 | 0 |
| bamboohr:familiesforvaccines | 1 | 13 | 8 | 2 | 2 | 0 |
| breezy:beex | 1 | 7 | 4 | 1 | 1 | 0 |
| breezy:helpware-inc | 3 | 78 | 45 | 5 | 4 | 1 |
| breezy:inallmedia-llc | 4 | 154 | 68 | 40 | 40 | 0 |
| breezy:north-wind-group | 1 | 27 | 16 | 1 | 1 | 0 |
| breezy:prime-philippines | 1 | 25 | 15 | 1 | 1 | 0 |
| breezy:prolift-rigging | 4 | 148 | 84 | 21 | 21 | 1 |
| breezy:segal-mccambridge | 3 | 34 | 17 | 2 | 2 | 1 |
| breezy:spark-power | 3 | 90 | 45 | 11 | 14 | 0 |
| breezy:t3-services-group | 1 | 35 | 19 | 6 | 6 | 0 |
| breezy:totalsecurityltd | 1 | 32 | 15 | 8 | 10 | 0 |
| breezy:vagaro | 2 | 75 | 41 | 16 | 16 | 0 |
| breezy:zeno-power | 1 | 27 | 10 | 12 | 12 | 0 |
| greenhouse:affirm | 1 | 23 | 17 | 0 | 1 | 0 |
| greenhouse:billcom | 1 | 21 | 17 | 2 | 3 | 0 |
| greenhouse:calendly | 1 | 20 | 13 | 5 | 6 | 0 |
| greenhouse:calm | 1 | 25 | 18 | 5 | 5 | 0 |
| greenhouse:coreweave | 2 | 52 | 34 | 13 | 11 | 0 |
| greenhouse:faire | 2 | 35 | 21 | 5 | 9 | 0 |
| greenhouse:instacart | 2 | 41 | 35 | 2 | 4 | 0 |
| greenhouse:newrelic | 1 | 20 | 17 | 2 | 2 | 0 |
| greenhouse:oura | 1 | 22 | 19 | 0 | 1 | 0 |
| greenhouse:scopely | 1 | 18 | 14 | 2 | 2 | 0 |
| greenhouse:sproutsocial | 2 | 42 | 31 | 7 | 9 | 0 |

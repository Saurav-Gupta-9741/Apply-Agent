# Live run statistics (40 forms)

Generated 2026-11-13T11:03:58.895Z from results-perf-after.jsonl by `scripts/live1000-audit.mjs`. The run is still growing: re-run the script.

## Forms

| Outcome | Forms | Share |
|---|---:|---:|
| filled | 39 | 97.5% |
| robot_check | 1 | 2.5% |

| Platform | filled | robot_check |
|---|---:|---:|
| greenhouse | 9 | 1 |
| ashby | 10 | 0 |
| breezy | 10 | 0 |
| bamboohr | 10 | 0 |

Filled forms: **39**. Ready to submit (nothing left for the user): **10** (25.6%); needing the user: **29**. Run status: needs_user 29, ready_to_submit 10.

## Fields

Fields on filled forms: **709** (18.2 per form).

| Status | Fields | Share |
|---|---:|---:|
| filled | 412 | 58.1% |
| skipped | 198 | 27.9% |
| needs_user | 88 | 12.4% |
| already_filled | 8 | 1.1% |
| failed | 3 | 0.4% |

- Filled by the extension: **58.1%** of all fields.
- Required fields: 259; filled 183; **left for the user: 76 (29.3%)**.
- Required sections (lists such as Breezy "Work History*", not in the field list): 13; **left empty: 0**.

| Decision | Fields | filled | needs_user | failed | skipped | already_filled |
|---|---:|---:|---:|---:|---:|---:|
| profile | 261 | 258 | 0 | 3 | 0 | 0 |
| skip | 196 | 0 | 0 | 0 | 194 | 2 |
| ask | 98 | 0 | 88 | 0 | 4 | 6 |
| work | 72 | 72 | 0 | 0 | 0 | 0 |
| answer | 43 | 43 | 0 | 0 | 0 | 0 |
| resume | 39 | 39 | 0 | 0 | 0 | 0 |

## Asks (fields left for the user), by reason / topic (top 30)

| Topic | All | Required |
|---|---:|---:|
| unknown | 61 | 61 |
| salary | 17 | 5 |
| consent | 8 | 3 |
| sponsorship | 3 | 3 |
| work_authorization | 2 | 2 |
| missing_profile_value | 2 | 2 |
| relocation | 1 | 1 |
| pronouns | 1 | 0 |
| disability | 1 | 0 |
| age | 1 | 0 |
| notice_period | 1 | 1 |

## Skips

| Reason | Fields |
|---|---:|
| optional choice | 87 |
| optional, not in profile | 68 |
| study dates are not in your profile | 16 |
| optional attachment (not your resume) | 9 |
| current job: no end date | 8 |
| no portfolio in profile | 5 |
| optional attachment | 3 |

## Failed fills (decision:key)

| Decision:key (control) | Fields |
|---|---:|
| profile:location (combobox) | 1 |
| profile:state (combobox) | 1 |
| profile:school (combobox) | 1 |

## Time per form

Median 19s, mean 18.1s, max 46s (all 40 forms; includes page load, 3s settle and the fill). Filled forms: median 18s.

## Per platform

| Platform | Forms filled | Fields | Filled | Needs user | Failed | Required left | Ready | Median s |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| greenhouse | 9 | 151 | 99 (65.6%) | 32 | 2 | 33 of 108 | 0 | 11 |
| ashby | 10 | 163 | 55 (33.7%) | 17 | 1 | 12 of 52 | 3 | 9 |
| breezy | 10 | 236 | 155 (65.7%) | 21 | 0 | 19 of 88 | 3 | 27 |
| bamboohr | 10 | 159 | 103 (64.8%) | 18 | 0 | 12 of 24 | 4 | 19 |

## Fills the page cleared afterwards

38 text fills on 16 forms were reported filled but were empty when the page was read 0.8 s later (other fills on the same forms were there). By field: streetAddress.value 10, city.value 10, zip.value 10, cAddress 6, state.value 2. On Greenhouse these are the fields its resume autofill sets (first/last name, email, phone): its parse request is blocked in this run, and the reset arrives after the fill.

## Safety

- Requests blocked by the read-only guard: 321 on 30 forms (analytics, consent and tracking beacons).
- Blocked requests that look like application sends (to the ATS, path with appl/submit/candidate): **0**.
- Forms whose URL changed during the fill: **1** (must be 0).
  - URL changed: https://job-boards.greenhouse.io/zoominfo/jobs/8922316002

## Accuracy (see WRONG.md)

Filled fields judged: 412. Correct **412** (100.0%), wrong **0** (0.0%), unclear 0 (0 unique pairs, listed in UNCLEAR.md).

## Per company (filled forms)

| Company | Forms | Fields | Filled | Needs user | Required left | Ready |
|---|---:|---:|---:|---:|---:|---:|
| ashby:abridge | 1 | 18 | 7 | 1 | 1 | 0 |
| ashby:influxdata | 1 | 7 | 4 | 1 | 1 | 0 |
| ashby:primer | 1 | 25 | 6 | 5 | 5 | 0 |
| ashby:satispay | 2 | 68 | 13 | 4 | 2 | 1 |
| ashby:snowflake | 1 | 12 | 6 | 1 | 1 | 0 |
| ashby:warp | 1 | 4 | 4 | 0 | 0 | 1 |
| ashby:watershed | 1 | 8 | 6 | 2 | 1 | 0 |
| ashby:wealthsimple | 1 | 18 | 6 | 3 | 1 | 0 |
| ashby:whoop | 1 | 3 | 3 | 0 | 0 | 1 |
| bamboohr:adistec | 2 | 30 | 19 | 4 | 2 | 0 |
| bamboohr:familypromiseofspokane | 1 | 14 | 10 | 1 | 1 | 0 |
| bamboohr:hinterlandgroup | 2 | 31 | 22 | 3 | 3 | 1 |
| bamboohr:hsvarc | 1 | 19 | 10 | 2 | 0 | 1 |
| bamboohr:icmarketsglobal | 1 | 17 | 10 | 2 | 0 | 1 |
| bamboohr:maplr | 1 | 21 | 10 | 5 | 5 | 0 |
| bamboohr:nexii | 1 | 13 | 10 | 1 | 1 | 0 |
| bamboohr:royal | 1 | 14 | 12 | 0 | 0 | 1 |
| breezy:helpware-inc | 1 | 25 | 16 | 1 | 0 | 1 |
| breezy:inallmedia-llc | 2 | 65 | 38 | 9 | 8 | 0 |
| breezy:north-wind-group | 1 | 22 | 16 | 0 | 0 | 1 |
| breezy:prime-philippines | 1 | 25 | 17 | 1 | 1 | 0 |
| breezy:segal-mccambridge | 1 | 10 | 7 | 0 | 0 | 1 |
| breezy:taqar-consulting-co-l-l-c | 2 | 46 | 33 | 3 | 3 | 0 |
| breezy:zeno-power | 1 | 17 | 10 | 5 | 5 | 0 |
| breezy:zero-hash | 1 | 26 | 18 | 2 | 2 | 0 |
| greenhouse:algolia | 1 | 20 | 15 | 3 | 3 | 0 |
| greenhouse:bird | 2 | 28 | 14 | 10 | 10 | 0 |
| greenhouse:labelbox | 1 | 14 | 10 | 2 | 2 | 0 |
| greenhouse:mercury | 1 | 15 | 9 | 2 | 2 | 0 |
| greenhouse:raisin | 1 | 16 | 10 | 4 | 4 | 0 |
| greenhouse:showpad | 1 | 12 | 9 | 2 | 2 | 0 |
| greenhouse:squarespace | 1 | 26 | 14 | 8 | 9 | 0 |
| greenhouse:zoominfo | 1 | 20 | 18 | 1 | 1 | 0 |

# Live run statistics (42 forms)

Generated 2026-11-14T08:24:19.070Z from results-r12-recheck-us.jsonl by `scripts/live1000-audit.mjs`. The run is still growing: re-run the script.

## Forms

| Outcome | Forms | Share |
|---|---:|---:|
| filled | 40 | 95.2% |
| no_form | 2 | 4.8% |

| Platform | filled | no_form |
|---|---:|---:|
| lever | 30 | 0 |
| personio | 4 | 2 |
| teamtailor | 2 | 0 |
| rippling | 2 | 0 |
| pinpoint | 2 | 0 |

Filled forms: **40**. Ready to submit (nothing left for the user): **5** (12.5%); needing the user: **35**. Run status: needs_user 35, ready_to_submit 5.

## Fields

Fields on filled forms: **574** (14.3 per form).

| Status | Fields | Share |
|---|---:|---:|
| filled | 354 | 61.7% |
| skipped | 126 | 22.0% |
| needs_user | 89 | 15.5% |
| failed | 3 | 0.5% |
| already_filled | 2 | 0.3% |

- Filled by the extension: **61.7%** of all fields.
- Required fields: 274; filled 198; **left for the user: 76 (27.7%)**.
- Required sections (lists such as Breezy "Work History*", not in the field list): 0; **left empty: 0**.

| Decision | Fields | filled | needs_user | failed | skipped | already_filled |
|---|---:|---:|---:|---:|---:|---:|
| profile | 256 | 256 | 0 | 0 | 0 | 0 |
| skip | 118 | 0 | 0 | 0 | 118 | 0 |
| ask | 99 | 0 | 89 | 0 | 8 | 2 |
| answer | 61 | 58 | 0 | 3 | 0 | 0 |
| resume | 40 | 40 | 0 | 0 | 0 | 0 |

## Asks (fields left for the user), by reason / topic (top 30)

| Topic | All | Required |
|---|---:|---:|
| unknown | 42 | 42 |
| salary | 27 | 23 |
| consent | 8 | 0 |
| pronouns | 6 | 0 |
| relocation | 5 | 3 |
| work_authorization | 3 | 2 |
| sponsorship | 3 | 3 |
| disability | 3 | 3 |
| gender | 1 | 1 |
| race | 1 | 1 |

## Skips

| Reason | Fields |
|---|---:|
| optional, not in profile | 70 |
| no portfolio in profile | 22 |
| optional choice | 18 |
| optional attachment | 4 |
| optional attachment (not your resume) | 2 |
| not sure this saved answer fits: left for you | 2 |

## Failed fills (decision:key)

| Decision:key (control) | Fields |
|---|---:|
| answer:Gender (dropdown) | 1 |
| answer:Race / Ethnicity (dropdown) | 1 |
| answer:Veteran status (dropdown) | 1 |

## Time per form

Median 9s, mean 12.9s, max 35s (all 42 forms; includes page load, 3s settle and the fill). Filled forms: median 9s.

## Per platform

| Platform | Forms filled | Fields | Filled | Needs user | Failed | Required left | Ready | Median s |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| lever | 30 | 450 | 284 (63.1%) | 67 | 0 | 61 of 224 | 0 | 9 |
| personio | 4 | 49 | 28 (57.1%) | 10 | 0 | 6 of 20 | 2 | 7 |
| teamtailor | 2 | 25 | 12 (48.0%) | 2 | 0 | 0 of 2 | 2 | 24 |
| rippling | 2 | 28 | 18 (64.3%) | 3 | 3 | 3 of 16 | 1 | 35 |
| pinpoint | 2 | 22 | 12 (54.5%) | 7 | 0 | 6 of 12 | 0 | 35 |

## Fills the page cleared afterwards

0 text fills on 0 forms were reported filled but were empty when the page was read 0.8 s later (other fills on the same forms were there). By field: . On Greenhouse these are the fields its resume autofill sets (first/last name, email, phone): its parse request is blocked in this run, and the reset arrives after the fill.

## Safety

- Requests blocked by the read-only guard: 487 on 40 forms (analytics, consent and tracking beacons).
- Blocked requests that look like application sends (to the ATS, path with appl/submit/candidate): **0**.
- Forms whose URL changed during the fill: **0** (must be 0).

## Accuracy (see WRONG.md)

Filled fields judged: 354. Correct **347** (98.0%), wrong **0** (0.0%), unclear 7 (4 unique pairs, listed in UNCLEAR.md).

## Per company (filled forms)

| Company | Forms | Fields | Filled | Needs user | Required left | Ready |
|---|---:|---:|---:|---:|---:|---:|
| lever:angellist | 2 | 20 | 15 | 2 | 2 | 0 |
| lever:animocabrands | 2 | 37 | 20 | 6 | 6 | 0 |
| lever:arcadia | 2 | 48 | 30 | 6 | 4 | 0 |
| lever:blablacar | 2 | 33 | 18 | 5 | 3 | 0 |
| lever:contentsquare | 2 | 38 | 23 | 3 | 3 | 0 |
| lever:cred | 2 | 22 | 16 | 0 | 0 | 0 |
| lever:hevodata | 2 | 24 | 16 | 7 | 7 | 0 |
| lever:jamcity | 2 | 24 | 16 | 0 | 0 | 0 |
| lever:kavak | 2 | 22 | 16 | 0 | 0 | 0 |
| lever:meesho | 2 | 40 | 22 | 12 | 12 | 0 |
| lever:mindtickle | 2 | 34 | 18 | 6 | 6 | 0 |
| lever:neon | 2 | 33 | 17 | 12 | 12 | 0 |
| lever:ninjavan | 2 | 17 | 15 | 2 | 2 | 0 |
| lever:nium | 2 | 29 | 23 | 4 | 4 | 0 |
| lever:outreach | 2 | 29 | 19 | 2 | 0 | 0 |
| personio:chrono24 | 2 | 27 | 16 | 6 | 6 | 0 |
| personio:ottonova | 2 | 22 | 12 | 4 | 0 | 2 |
| pinpoint:workwithus | 2 | 22 | 12 | 7 | 6 | 0 |
| rippling:rippling | 2 | 28 | 18 | 3 | 3 | 1 |
| teamtailor:career | 2 | 25 | 12 | 2 | 0 | 2 |

# Live run statistics (111 forms)

Generated 2026-11-14T07:41:24.515Z from results-r12-in-a.jsonl, results-r12-in-b.jsonl by `scripts/live1000-audit.mjs`. The run is still growing: re-run the script.

## Forms

| Outcome | Forms | Share |
|---|---:|---:|
| filled | 76 | 68.5% |
| no_form | 35 | 31.5% |

| Platform | filled | no_form |
|---|---:|---:|
| lever | 30 | 0 |
| smartrecruiters | 0 | 25 |
| personio | 2 | 4 |
| jobvite | 0 | 4 |
| pinpoint | 2 | 0 |
| workable | 23 | 2 |
| recruitee | 15 | 0 |
| teamtailor | 2 | 0 |
| rippling | 2 | 0 |

Filled forms: **76**. Ready to submit (nothing left for the user): **12** (15.8%); needing the user: **64**. Run status: needs_user 64, ready_to_submit 12.

## Fields

Fields on filled forms: **934** (12.3 per form).

| Status | Fields | Share |
|---|---:|---:|
| filled | 525 | 56.2% |
| needs_user | 172 | 18.4% |
| skipped | 171 | 18.3% |
| failed | 33 | 3.5% |
| already_filled | 33 | 3.5% |

- Filled by the extension: **56.2%** of all fields.
- Required fields: 566; filled 397; **left for the user: 169 (29.9%)**.
- Required sections (lists such as Breezy "Work History*", not in the field list): 0; **left empty: 0**.

| Decision | Fields | filled | needs_user | failed | skipped | already_filled |
|---|---:|---:|---:|---:|---:|---:|
| profile | 430 | 369 | 0 | 30 | 0 | 31 |
| ask | 182 | 0 | 172 | 0 | 8 | 2 |
| skip | 163 | 0 | 0 | 0 | 163 | 0 |
| answer | 82 | 79 | 0 | 3 | 0 | 0 |
| resume | 77 | 77 | 0 | 0 | 0 | 0 |

## Asks (fields left for the user), by reason / topic (top 30)

| Topic | All | Required |
|---|---:|---:|
| unknown | 111 | 111 |
| salary | 35 | 33 |
| consent | 12 | 4 |
| pronouns | 6 | 0 |
| work_authorization | 4 | 3 |
| sponsorship | 4 | 4 |
| relocation | 3 | 3 |
| disability | 3 | 3 |
| notice_period | 2 | 2 |
| gender | 1 | 1 |
| race | 1 | 1 |

## Skips

| Reason | Fields |
|---|---:|
| optional, not in profile | 97 |
| optional attachment (not your resume) | 22 |
| no portfolio in profile | 22 |
| optional choice | 18 |
| optional attachment | 2 |
| not sure this saved answer fits: left for you | 2 |

## Failed fills (decision:key)

| Decision:key (control) | Fields |
|---|---:|
| profile:location (text) | 30 |
| answer:Gender (dropdown) | 1 |
| answer:Race / Ethnicity (dropdown) | 1 |
| answer:Veteran status (dropdown) | 1 |

## Time per form

Median 9s, mean 16.6s, max 41s (all 111 forms; includes page load, 3s settle and the fill). Filled forms: median 8s.

## Per platform

| Platform | Forms filled | Fields | Filled | Needs user | Failed | Required left | Ready | Median s |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| lever | 30 | 450 | 265 (58.9%) | 56 | 30 | 56 of 224 | 0 | 8 |
| pinpoint | 2 | 22 | 12 (54.5%) | 7 | 0 | 6 of 12 | 0 | 28 |
| workable | 23 | 244 | 136 (55.7%) | 56 | 0 | 56 of 189 | 4 | 7 |
| recruitee | 15 | 138 | 66 (47.8%) | 42 | 0 | 42 of 107 | 5 | 9 |
| teamtailor | 2 | 25 | 12 (48.0%) | 2 | 0 | 0 of 2 | 2 | 23 |
| rippling | 2 | 28 | 18 (64.3%) | 3 | 3 | 3 of 16 | 1 | 34 |
| personio | 2 | 27 | 16 (59.3%) | 6 | 0 | 6 of 16 | 0 | 8 |

## Fills the page cleared afterwards

23 text fills on 23 forms were reported filled but were empty when the page was read 0.8 s later (other fills on the same forms were there). By field: phone 23. On Greenhouse these are the fields its resume autofill sets (first/last name, email, phone): its parse request is blocked in this run, and the reset arrives after the fill.

## Safety

- Requests blocked by the read-only guard: 746 on 105 forms (analytics, consent and tracking beacons).
- Blocked requests that look like application sends (to the ATS, path with appl/submit/candidate): **0**.
- Forms whose URL changed during the fill: **0** (must be 0).

## Accuracy (see WRONG.md)

Filled fields judged: 525. Correct **525** (100.0%), wrong **0** (0.0%), unclear 0 (0 unique pairs, listed in UNCLEAR.md).

## Per company (filled forms)

| Company | Forms | Fields | Filled | Needs user | Required left | Ready |
|---|---:|---:|---:|---:|---:|---:|
| lever:angellist | 2 | 20 | 13 | 2 | 4 | 0 |
| lever:animocabrands | 2 | 37 | 18 | 6 | 6 | 0 |
| lever:arcadia | 2 | 48 | 28 | 6 | 4 | 0 |
| lever:blablacar | 2 | 33 | 16 | 5 | 3 | 0 |
| lever:contentsquare | 2 | 38 | 21 | 3 | 3 | 0 |
| lever:cred | 2 | 22 | 14 | 0 | 0 | 0 |
| lever:hevodata | 2 | 24 | 17 | 4 | 4 | 0 |
| lever:jamcity | 2 | 24 | 14 | 0 | 0 | 0 |
| lever:kavak | 2 | 22 | 14 | 0 | 0 | 0 |
| lever:meesho | 2 | 40 | 24 | 8 | 8 | 0 |
| lever:mindtickle | 2 | 34 | 20 | 2 | 2 | 0 |
| lever:neon | 2 | 33 | 15 | 12 | 12 | 0 |
| lever:ninjavan | 2 | 17 | 13 | 2 | 2 | 0 |
| lever:nium | 2 | 29 | 21 | 4 | 6 | 0 |
| lever:outreach | 2 | 29 | 17 | 2 | 2 | 0 |
| personio:chrono24 | 2 | 27 | 16 | 6 | 6 | 0 |
| pinpoint:workwithus | 2 | 22 | 12 | 7 | 6 | 0 |
| recruitee:aikidosecurity | 2 | 12 | 9 | 1 | 1 | 1 |
| recruitee:aubay | 2 | 33 | 8 | 21 | 21 | 0 |
| recruitee:hardrockdigital | 2 | 17 | 9 | 4 | 4 | 0 |
| recruitee:hostpointag | 1 | 9 | 5 | 1 | 1 | 0 |
| recruitee:partejobs | 2 | 12 | 8 | 0 | 0 | 2 |
| recruitee:sahl | 2 | 12 | 8 | 0 | 0 | 2 |
| recruitee:snapsoft | 2 | 24 | 11 | 8 | 8 | 0 |
| recruitee:swordtechnologies | 2 | 19 | 8 | 7 | 7 | 0 |
| rippling:rippling | 2 | 28 | 18 | 3 | 3 | 1 |
| teamtailor:career | 2 | 25 | 12 | 2 | 0 | 2 |
| workable:blue-nile | 2 | 33 | 12 | 13 | 13 | 0 |
| workable:export-development-canada | 2 | 16 | 10 | 2 | 2 | 0 |
| workable:fundingsocieties | 2 | 22 | 13 | 4 | 4 | 0 |
| workable:hudabeauty | 2 | 21 | 14 | 3 | 3 | 0 |
| workable:interpath-advisory | 2 | 26 | 12 | 8 | 8 | 0 |
| workable:lamour | 2 | 15 | 10 | 0 | 0 | 2 |
| workable:luxasia | 2 | 20 | 13 | 2 | 2 | 1 |
| workable:our-future-health | 1 | 9 | 5 | 2 | 2 | 0 |
| workable:revisionz | 2 | 28 | 14 | 8 | 8 | 0 |
| workable:the-pod-group | 2 | 17 | 10 | 5 | 5 | 0 |
| workable:workana-premium | 2 | 19 | 12 | 6 | 6 | 0 |
| workable:xtremax-pte-ltd | 2 | 18 | 11 | 3 | 3 | 1 |

# Live run statistics (111 forms)

Generated 2026-11-14T07:41:24.364Z from results-r12-us-a.jsonl, results-r12-us-b.jsonl by `scripts/live1000-audit.mjs`. The run is still growing: re-run the script.

## Forms

| Outcome | Forms | Share |
|---|---:|---:|
| no_form | 65 | 58.6% |
| filled | 46 | 41.4% |

| Platform | no_form | filled |
|---|---:|---:|
| lever | 30 | 0 |
| smartrecruiters | 25 | 0 |
| personio | 4 | 2 |
| jobvite | 4 | 0 |
| pinpoint | 0 | 2 |
| workable | 2 | 23 |
| recruitee | 0 | 15 |
| teamtailor | 0 | 2 |
| rippling | 0 | 2 |

Filled forms: **46**. Ready to submit (nothing left for the user): **12** (26.1%); needing the user: **34**. Run status: needs_user 34, ready_to_submit 12.

## Fields

Fields on filled forms: **479** (10.4 per form).

| Status | Fields | Share |
|---|---:|---:|
| filled | 258 | 53.9% |
| needs_user | 114 | 23.8% |
| skipped | 71 | 14.8% |
| already_filled | 33 | 6.9% |
| failed | 3 | 0.6% |

- Filled by the extension: **53.9%** of all fields.
- Required fields: 340; filled 229; **left for the user: 111 (32.6%)**.
- Required sections (lists such as Breezy "Work History*", not in the field list): 0; **left empty: 0**.

| Decision | Fields | filled | needs_user | failed | skipped | already_filled |
|---|---:|---:|---:|---:|---:|---:|
| profile | 227 | 196 | 0 | 0 | 0 | 31 |
| ask | 120 | 0 | 114 | 0 | 4 | 2 |
| skip | 67 | 0 | 0 | 0 | 67 | 0 |
| resume | 46 | 46 | 0 | 0 | 0 | 0 |
| answer | 19 | 16 | 0 | 3 | 0 | 0 |

## Asks (fields left for the user), by reason / topic (top 30)

| Topic | All | Required |
|---|---:|---:|
| unknown | 80 | 80 |
| salary | 27 | 25 |
| consent | 8 | 4 |
| work_authorization | 2 | 1 |
| notice_period | 2 | 2 |
| sponsorship | 1 | 1 |

## Skips

| Reason | Fields |
|---|---:|
| optional, not in profile | 37 |
| optional attachment (not your resume) | 22 |
| optional choice | 6 |
| optional attachment | 2 |

## Failed fills (decision:key)

| Decision:key (control) | Fields |
|---|---:|
| answer:Gender (dropdown) | 1 |
| answer:Race / Ethnicity (dropdown) | 1 |
| answer:Veteran status (dropdown) | 1 |

## Time per form

Median 8s, mean 15.9s, max 43s (all 111 forms; includes page load, 3s settle and the fill). Filled forms: median 8s.

## Per platform

| Platform | Forms filled | Fields | Filled | Needs user | Failed | Required left | Ready | Median s |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| pinpoint | 2 | 17 | 10 (58.8%) | 5 | 0 | 4 of 10 | 0 | 35 |
| workable | 23 | 244 | 136 (55.7%) | 56 | 0 | 56 of 189 | 4 | 7 |
| recruitee | 15 | 138 | 66 (47.8%) | 42 | 0 | 42 of 107 | 5 | 9 |
| teamtailor | 2 | 25 | 12 (48.0%) | 2 | 0 | 0 of 2 | 2 | 25 |
| rippling | 2 | 28 | 18 (64.3%) | 3 | 3 | 3 of 16 | 1 | 36 |
| personio | 2 | 27 | 16 (59.3%) | 6 | 0 | 6 of 16 | 0 | 23 |

## Fills the page cleared afterwards

23 text fills on 23 forms were reported filled but were empty when the page was read 0.8 s later (other fills on the same forms were there). By field: phone 23. On Greenhouse these are the fields its resume autofill sets (first/last name, email, phone): its parse request is blocked in this run, and the reset arrives after the fill.

## Safety

- Requests blocked by the read-only guard: 688 on 105 forms (analytics, consent and tracking beacons).
- Blocked requests that look like application sends (to the ATS, path with appl/submit/candidate): **0**.
- Forms whose URL changed during the fill: **0** (must be 0).

## Accuracy (see WRONG.md)

Filled fields judged: 258. Correct **258** (100.0%), wrong **0** (0.0%), unclear 0 (0 unique pairs, listed in UNCLEAR.md).

## Per company (filled forms)

| Company | Forms | Fields | Filled | Needs user | Required left | Ready |
|---|---:|---:|---:|---:|---:|---:|
| personio:chrono24 | 2 | 27 | 16 | 6 | 6 | 0 |
| pinpoint:workwithus | 2 | 17 | 10 | 5 | 4 | 0 |
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

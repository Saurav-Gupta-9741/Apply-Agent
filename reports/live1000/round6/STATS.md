# Live run statistics (78 forms)

Generated 2026-11-09T18:01:23.846Z from results-r6-a.jsonl, results-r6-b.jsonl by `scripts/live1000-audit.mjs`. The run is still growing: re-run the script.

## Forms

| Outcome | Forms | Share |
|---|---:|---:|
| filled | 78 | 100.0% |

| Platform | filled |
|---|---:|
| breezy | 72 |
| bamboohr | 3 |
| ashby | 2 |
| greenhouse | 1 |

Filled forms: **78**. Ready to submit (nothing left for the user): **18** (23.1%); needing the user: **60**. Run status: needs_user 60, ready_to_submit 18.

## Fields

Fields on filled forms: **1838** (23.6 per form).

| Status | Fields | Share |
|---|---:|---:|
| filled | 1020 | 55.5% |
| skipped | 485 | 26.4% |
| needs_user | 253 | 13.8% |
| already_filled | 65 | 3.5% |
| failed | 15 | 0.8% |

- Filled by the extension: **55.5%** of all fields.
- Required fields: 641; filled 389; **left for the user: 252 (39.3%)**.

| Decision | Fields | filled | needs_user | failed | skipped | already_filled |
|---|---:|---:|---:|---:|---:|---:|
| skip | 495 | 0 | 0 | 0 | 483 | 12 |
| work | 479 | 479 | 0 | 0 | 0 | 0 |
| profile | 378 | 377 | 0 | 1 | 0 | 0 |
| ask | 308 | 0 | 253 | 0 | 2 | 53 |
| answer | 100 | 86 | 0 | 14 | 0 | 0 |
| resume | 78 | 78 | 0 | 0 | 0 | 0 |

## Asks (fields left for the user), by reason / topic (top 30)

| Topic | All | Required |
|---|---:|---:|
| unknown | 198 | 198 |
| salary | 52 | 22 |
| consent | 22 | 20 |
| notice_period | 18 | 16 |
| pronouns | 4 | 4 |
| missing_profile_value | 4 | 4 |
| gender | 2 | 0 |
| disability | 2 | 0 |
| age | 2 | 0 |
| relocation | 1 | 1 |
| work_authorization | 1 | 1 |
| signature | 1 | 1 |
| sponsorship | 1 | 1 |

## Skips

| Reason | Fields |
|---|---:|
| optional, not in profile | 252 |
| study dates are not in your profile | 112 |
| optional choice | 64 |
| current job: no end date | 56 |
| no addressLine1 in profile | 3 |
| no postalCode in profile | 3 |
| no portfolio in profile | 2 |
| not sure this saved answer fits: left for you | 2 |
| optional attachment (not your resume) | 1 |

## Failed fills (decision:key)

| Decision:key (control) | Fields |
|---|---:|
| answer:Quick answers › expected salary abroad (text) | 14 |
| profile:school (combobox) | 1 |

## Time per form

Median 28s, mean 27s, max 46s (all 78 forms; includes page load, 3s settle and the fill). Filled forms: median 28s.

## Per platform

| Platform | Forms filled | Fields | Filled | Needs user | Failed | Required left | Ready | Median s |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| breezy | 72 | 1704 | 960 (56.3%) | 228 | 14 | 235 of 596 | 16 | 28 |
| bamboohr | 3 | 52 | 24 (46.2%) | 6 | 0 | 1 of 4 | 2 | 21 |
| ashby | 2 | 55 | 23 (41.8%) | 8 | 0 | 6 of 21 | 0 | 12 |
| greenhouse | 1 | 27 | 13 (48.1%) | 11 | 1 | 10 of 20 | 0 | 21 |

## Fills the page cleared afterwards

3 text fills on 3 forms were reported filled but were empty when the page was read 0.8 s later (other fills on the same forms were there). By field: city.value 3. On Greenhouse these are the fields its resume autofill sets (first/last name, email, phone): its parse request is blocked in this run, and the reset arrives after the fill.

## Safety

- Requests blocked by the read-only guard: 662 on 78 forms (analytics, consent and tracking beacons).
- Blocked requests that look like application sends (to the ATS, path with appl/submit/candidate): **0**.
- Forms whose URL changed during the fill: **0** (must be 0).

## Accuracy (see WRONG.md)

Filled fields judged: 1020. Correct **1020** (100.0%), wrong **0** (0.0%), unclear 0 (0 unique pairs, listed in UNCLEAR.md).

## Per company (filled forms)

| Company | Forms | Fields | Filled | Needs user | Required left | Ready |
|---|---:|---:|---:|---:|---:|---:|
| ashby:1password | 2 | 55 | 23 | 8 | 6 | 0 |
| bamboohr:hsvarc | 2 | 36 | 15 | 4 | 0 | 2 |
| bamboohr:storeforce | 1 | 16 | 9 | 2 | 1 | 0 |
| breezy:aimpoint-digital | 4 | 90 | 60 | 1 | 1 | 3 |
| breezy:bear-robotics | 4 | 99 | 62 | 6 | 6 | 3 |
| breezy:beex | 4 | 40 | 27 | 3 | 3 | 1 |
| breezy:helpware-inc | 4 | 109 | 63 | 7 | 4 | 1 |
| breezy:inallmedia-llc | 4 | 134 | 48 | 40 | 40 | 0 |
| breezy:north-wind-group | 4 | 80 | 49 | 1 | 2 | 3 |
| breezy:prime-philippines | 4 | 88 | 60 | 1 | 1 | 3 |
| breezy:prolift-rigging | 4 | 148 | 80 | 21 | 22 | 1 |
| breezy:segal-mccambridge | 4 | 46 | 19 | 3 | 7 | 0 |
| breezy:small-batch-standard | 2 | 28 | 12 | 14 | 14 | 0 |
| breezy:social-discovery-ventures | 4 | 40 | 25 | 7 | 7 | 0 |
| breezy:spark-power | 4 | 116 | 60 | 16 | 17 | 0 |
| breezy:t3-services-group | 2 | 56 | 35 | 3 | 3 | 1 |
| breezy:taqar-consulting-co-l-l-c | 4 | 89 | 60 | 4 | 4 | 0 |
| breezy:totalsecurityltd | 4 | 109 | 61 | 19 | 19 | 0 |
| breezy:vagaro | 4 | 120 | 64 | 20 | 22 | 0 |
| breezy:wealthy-recruiting | 4 | 100 | 60 | 12 | 12 | 0 |
| breezy:zeno-power | 4 | 110 | 47 | 44 | 45 | 0 |
| breezy:zero-hash | 4 | 102 | 68 | 6 | 6 | 0 |
| greenhouse:xai | 1 | 27 | 13 | 11 | 10 | 0 |

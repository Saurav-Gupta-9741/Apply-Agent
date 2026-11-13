# Live run statistics (182 forms)

Generated 2026-11-13T16:42:31.604Z from results-r11-in-a.jsonl, results-r11-in-b.jsonl by `scripts/live1000-audit.mjs`. The run is still growing: re-run the script.

## Forms

| Outcome | Forms | Share |
|---|---:|---:|
| filled | 166 | 91.2% |
| no_form | 9 | 4.9% |
| closed | 4 | 2.2% |
| robot_check | 3 | 1.6% |

| Platform | filled | robot_check | no_form | closed |
|---|---:|---:|---:|---:|
| greenhouse | 59 | 3 | 8 | 0 |
| breezy | 32 | 0 | 0 | 0 |
| ashby | 55 | 0 | 1 | 4 |
| bamboohr | 20 | 0 | 0 | 0 |

Filled forms: **166**. Ready to submit (nothing left for the user): **55** (33.1%); needing the user: **111**. Run status: needs_user 111, ready_to_submit 55.

## Fields

Fields on filled forms: **2793** (16.8 per form).

| Status | Fields | Share |
|---|---:|---:|
| filled | 1820 | 65.2% |
| skipped | 578 | 20.7% |
| needs_user | 351 | 12.6% |
| already_filled | 28 | 1.0% |
| failed | 16 | 0.6% |

- Filled by the extension: **65.2%** of all fields.
- Required fields: 1338; filled 1025; **left for the user: 313 (23.4%)**.
- Required sections (lists such as Breezy "Work History*", not in the field list): 34; **left empty: 0**.

| Decision | Fields | filled | needs_user | failed | skipped | already_filled |
|---|---:|---:|---:|---:|---:|---:|
| profile | 1081 | 1070 | 0 | 11 | 0 | 0 |
| skip | 575 | 0 | 0 | 0 | 568 | 7 |
| ask | 382 | 0 | 351 | 0 | 10 | 21 |
| answer | 355 | 350 | 0 | 5 | 0 | 0 |
| work | 234 | 234 | 0 | 0 | 0 | 0 |
| resume | 166 | 166 | 0 | 0 | 0 | 0 |

## Asks (fields left for the user), by reason / topic (top 30)

| Topic | All | Required |
|---|---:|---:|
| unknown | 217 | 217 |
| salary | 52 | 29 |
| consent | 39 | 26 |
| relocation | 15 | 11 |
| sponsorship | 12 | 8 |
| notice_period | 11 | 7 |
| pronouns | 7 | 2 |
| criminal | 6 | 4 |
| sensitive | 4 | 4 |
| missing_profile_value | 4 | 4 |
| accommodation | 4 | 2 |
| work_authorization | 3 | 1 |
| signature | 2 | 2 |
| age | 2 | 1 |
| gender | 2 | 0 |
| identity | 1 | 1 |
| disability | 1 | 0 |

## Skips

| Reason | Fields |
|---|---:|
| optional, not in profile | 232 |
| optional choice | 167 |
| optional attachment (not your resume) | 70 |
| study dates are not in your profile | 52 |
| current job: no end date | 26 |
| no portfolio in profile | 20 |
| not sure this saved answer fits: left for you | 5 |
| optional attachment | 3 |

## Failed fills (decision:key)

| Decision:key (control) | Fields |
|---|---:|
| profile:school (combobox) | 6 |
| profile:location (combobox) | 4 |
| answer:Quick answers › onsite (combobox) | 2 |
| answer:Quick answers › expected CTC (text) | 1 |
| profile:country (combobox) | 1 |
| answer:Quick answers › work authorization (combobox) | 1 |
| answer:How did you hear about this job? (checkbox_group) | 1 |

## Time per form

Median 14s, mean 16.6s, max 44s (all 182 forms; includes page load, 3s settle and the fill). Filled forms: median 14s.

## Per platform

| Platform | Forms filled | Fields | Filled | Needs user | Failed | Required left | Ready | Median s |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| greenhouse | 59 | 1045 | 735 (70.3%) | 186 | 13 | 186 of 749 | 5 | 15 |
| breezy | 32 | 763 | 509 (66.7%) | 61 | 1 | 60 of 275 | 12 | 27 |
| ashby | 55 | 673 | 369 (54.8%) | 76 | 2 | 51 of 306 | 27 | 9 |
| bamboohr | 20 | 312 | 207 (66.3%) | 28 | 0 | 16 of 42 | 11 | 19 |

## Fills the page cleared afterwards

86 text fills on 39 forms were reported filled but were empty when the page was read 0.8 s later (other fills on the same forms were there). By field: streetAddress.value 20, city.value 20, zip.value 20, cAddress 19, state.value 7. On Greenhouse these are the fields its resume autofill sets (first/last name, email, phone): its parse request is blocked in this run, and the reset arrives after the fill.

## Safety

- Requests blocked by the read-only guard: 2019 on 177 forms (analytics, consent and tracking beacons).
- Blocked requests that look like application sends (to the ATS, path with appl/submit/candidate): **0**.
- Forms whose URL changed during the fill: **2** (must be 0).
  - URL changed: https://job-boards.greenhouse.io/asana/jobs/8293698
  - URL changed: https://job-boards.greenhouse.io/asana/jobs/8232028

## Accuracy (see WRONG.md)

Filled fields judged: 1820. Correct **1820** (100.0%), wrong **0** (0.0%), unclear 0 (0 unique pairs, listed in UNCLEAR.md).

## Per company (filled forms)

| Company | Forms | Fields | Filled | Needs user | Required left | Ready |
|---|---:|---:|---:|---:|---:|---:|
| ashby:1password | 2 | 47 | 20 | 8 | 6 | 0 |
| ashby:alan | 2 | 19 | 11 | 3 | 3 | 1 |
| ashby:alephalpha | 1 | 13 | 7 | 3 | 3 | 0 |
| ashby:benevity | 2 | 16 | 12 | 2 | 0 | 2 |
| ashby:buffer | 1 | 7 | 6 | 1 | 1 | 0 |
| ashby:clickhouse | 2 | 12 | 11 | 0 | 0 | 2 |
| ashby:cognition | 2 | 12 | 10 | 0 | 0 | 2 |
| ashby:decagon | 1 | 7 | 7 | 0 | 0 | 1 |
| ashby:deepl | 2 | 38 | 15 | 8 | 2 | 0 |
| ashby:docker | 2 | 18 | 14 | 0 | 0 | 2 |
| ashby:drata | 2 | 16 | 14 | 2 | 2 | 0 |
| ashby:hex | 2 | 20 | 12 | 2 | 2 | 1 |
| ashby:illumio | 1 | 13 | 8 | 1 | 0 | 1 |
| ashby:koho | 2 | 16 | 8 | 4 | 4 | 0 |
| ashby:lightspeed | 2 | 12 | 10 | 0 | 0 | 2 |
| ashby:lovable | 1 | 13 | 7 | 5 | 5 | 0 |
| ashby:m-kopa | 2 | 62 | 13 | 4 | 2 | 1 |
| ashby:modal | 2 | 6 | 6 | 0 | 0 | 2 |
| ashby:moneybox | 1 | 28 | 13 | 3 | 3 | 0 |
| ashby:openai | 1 | 14 | 9 | 1 | 1 | 0 |
| ashby:pinecone | 2 | 23 | 12 | 6 | 0 | 2 |
| ashby:poshmark | 1 | 7 | 6 | 0 | 0 | 1 |
| ashby:runway | 1 | 5 | 3 | 0 | 0 | 1 |
| ashby:sentry | 1 | 11 | 8 | 2 | 1 | 0 |
| ashby:sierra | 1 | 52 | 11 | 1 | 1 | 0 |
| ashby:skydio | 1 | 6 | 5 | 0 | 0 | 1 |
| ashby:supabase | 1 | 11 | 8 | 1 | 1 | 0 |
| ashby:thought-machine | 2 | 18 | 13 | 1 | 0 | 2 |
| ashby:thumbtack | 2 | 18 | 12 | 0 | 0 | 2 |
| ashby:wealthsimple | 2 | 27 | 13 | 4 | 2 | 0 |
| ashby:whoop | 2 | 32 | 20 | 2 | 2 | 0 |
| ashby:writer | 2 | 18 | 12 | 4 | 4 | 0 |
| ashby:xero | 1 | 15 | 7 | 1 | 0 | 1 |
| ashby:zapier | 1 | 18 | 10 | 5 | 4 | 0 |
| ashby:zilch | 2 | 23 | 16 | 2 | 2 | 0 |
| bamboohr:adistec | 1 | 16 | 10 | 3 | 2 | 0 |
| bamboohr:couples | 2 | 42 | 20 | 4 | 1 | 1 |
| bamboohr:flsgroup | 1 | 13 | 10 | 1 | 0 | 1 |
| bamboohr:hinterlandgroup | 2 | 26 | 21 | 0 | 0 | 2 |
| bamboohr:hsvarc | 1 | 19 | 10 | 2 | 0 | 1 |
| bamboohr:icmarkets | 1 | 19 | 14 | 1 | 1 | 0 |
| bamboohr:icmarketsglobal | 2 | 28 | 18 | 2 | 0 | 2 |
| bamboohr:latigobio | 1 | 15 | 10 | 2 | 2 | 0 |
| bamboohr:maplr | 2 | 39 | 18 | 8 | 6 | 0 |
| bamboohr:nexii | 1 | 14 | 10 | 2 | 1 | 0 |
| bamboohr:otstaffing | 2 | 21 | 18 | 3 | 3 | 0 |
| bamboohr:royal | 2 | 26 | 22 | 0 | 0 | 2 |
| bamboohr:verastem | 2 | 34 | 26 | 0 | 0 | 2 |
| breezy:aimpoint-digital | 2 | 45 | 33 | 0 | 0 | 2 |
| breezy:bear-robotics | 2 | 45 | 33 | 0 | 0 | 2 |
| breezy:beex | 2 | 13 | 8 | 2 | 2 | 0 |
| breezy:helpware-inc | 2 | 49 | 37 | 0 | 0 | 2 |
| breezy:inallmedia-llc | 2 | 77 | 41 | 16 | 16 | 0 |
| breezy:north-wind-group | 2 | 46 | 34 | 0 | 0 | 2 |
| breezy:prime-philippines | 2 | 50 | 34 | 2 | 2 | 0 |
| breezy:prolift-rigging | 2 | 61 | 42 | 3 | 3 | 1 |
| breezy:segal-mccambridge | 2 | 24 | 16 | 2 | 2 | 0 |
| breezy:social-discovery-ventures | 2 | 46 | 32 | 4 | 4 | 0 |
| breezy:spark-power | 2 | 63 | 36 | 10 | 10 | 0 |
| breezy:taqar-consulting-co-l-l-c | 2 | 45 | 33 | 2 | 2 | 1 |
| breezy:vagaro | 2 | 58 | 37 | 3 | 2 | 0 |
| breezy:wealthy-recruiting | 2 | 44 | 32 | 0 | 0 | 2 |
| breezy:zeno-power | 2 | 44 | 24 | 14 | 14 | 0 |
| breezy:zero-hash | 2 | 53 | 37 | 3 | 3 | 0 |
| greenhouse:appsflyer | 1 | 9 | 6 | 1 | 1 | 0 |
| greenhouse:asana | 2 | 36 | 25 | 6 | 5 | 1 |
| greenhouse:attentive | 2 | 36 | 24 | 4 | 4 | 0 |
| greenhouse:brex | 1 | 25 | 15 | 5 | 5 | 0 |
| greenhouse:careem | 1 | 20 | 13 | 5 | 6 | 0 |
| greenhouse:checkr | 2 | 33 | 24 | 2 | 2 | 0 |
| greenhouse:chime | 2 | 44 | 34 | 8 | 8 | 0 |
| greenhouse:cribl | 2 | 35 | 29 | 3 | 3 | 0 |
| greenhouse:dremio | 1 | 10 | 8 | 0 | 0 | 1 |
| greenhouse:grafanalabs | 1 | 17 | 16 | 1 | 1 | 0 |
| greenhouse:gusto | 2 | 50 | 42 | 6 | 6 | 0 |
| greenhouse:housinganywhere | 1 | 15 | 10 | 3 | 3 | 0 |
| greenhouse:jumia | 1 | 11 | 6 | 4 | 4 | 0 |
| greenhouse:lattice | 2 | 39 | 27 | 8 | 6 | 0 |
| greenhouse:mercury | 2 | 31 | 18 | 5 | 5 | 0 |
| greenhouse:neo4j | 2 | 34 | 24 | 5 | 5 | 0 |
| greenhouse:nextdoor | 1 | 14 | 11 | 1 | 1 | 0 |
| greenhouse:pagerduty | 1 | 15 | 12 | 2 | 2 | 0 |
| greenhouse:payoneer | 2 | 34 | 19 | 11 | 10 | 0 |
| greenhouse:ripple | 1 | 16 | 14 | 0 | 0 | 1 |
| greenhouse:rocketlab | 1 | 29 | 15 | 11 | 10 | 0 |
| greenhouse:scaleai | 1 | 19 | 13 | 2 | 2 | 0 |
| greenhouse:sigmacomputing | 2 | 38 | 26 | 6 | 8 | 0 |
| greenhouse:smartlyio | 2 | 34 | 26 | 4 | 4 | 0 |
| greenhouse:smartsheet | 2 | 51 | 36 | 11 | 9 | 0 |
| greenhouse:squarespace | 2 | 51 | 25 | 17 | 19 | 0 |
| greenhouse:starburst | 2 | 36 | 27 | 5 | 5 | 0 |
| greenhouse:stockx | 1 | 16 | 12 | 1 | 1 | 0 |
| greenhouse:storyblok | 2 | 36 | 18 | 16 | 16 | 0 |
| greenhouse:sumologic | 2 | 28 | 22 | 4 | 4 | 0 |
| greenhouse:taskrabbit | 2 | 36 | 30 | 3 | 3 | 0 |
| greenhouse:trustpilot | 2 | 27 | 19 | 6 | 6 | 0 |
| greenhouse:turing | 1 | 11 | 9 | 2 | 2 | 0 |
| greenhouse:vercel | 1 | 26 | 17 | 5 | 6 | 0 |
| greenhouse:verkada | 2 | 25 | 21 | 0 | 0 | 2 |
| greenhouse:vonage | 2 | 23 | 20 | 3 | 3 | 0 |
| greenhouse:xendit | 2 | 35 | 22 | 10 | 11 | 0 |

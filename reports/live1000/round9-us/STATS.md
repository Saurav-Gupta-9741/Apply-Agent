# Live run statistics (182 forms)

Generated 2026-11-13T13:16:37.279Z from results-r9-us-a.jsonl, results-r9-us-b.jsonl by `scripts/live1000-audit.mjs`. The run is still growing: re-run the script.

## Forms

| Outcome | Forms | Share |
|---|---:|---:|
| filled | 171 | 94.0% |
| no_form | 6 | 3.3% |
| robot_check | 3 | 1.6% |
| closed | 2 | 1.1% |

| Platform | filled | robot_check | closed | no_form |
|---|---:|---:|---:|---:|
| greenhouse | 61 | 3 | 0 | 6 |
| breezy | 32 | 0 | 0 | 0 |
| ashby | 58 | 0 | 2 | 0 |
| bamboohr | 20 | 0 | 0 | 0 |

Filled forms: **171**. Ready to submit (nothing left for the user): **71** (41.5%); needing the user: **100**. Run status: needs_user 100, ready_to_submit 71.

## Fields

Fields on filled forms: **2785** (16.3 per form).

| Status | Fields | Share |
|---|---:|---:|
| filled | 1822 | 65.4% |
| skipped | 596 | 21.4% |
| needs_user | 333 | 12.0% |
| already_filled | 20 | 0.7% |
| failed | 14 | 0.5% |

- Filled by the extension: **65.4%** of all fields.
- Required fields: 1317; filled 1023; **left for the user: 294 (22.3%)**.
- Required sections (lists such as Breezy "Work History*", not in the field list): 38; **left empty: 0**.

| Decision | Fields | filled | needs_user | failed | skipped | already_filled |
|---|---:|---:|---:|---:|---:|---:|
| profile | 1107 | 1099 | 0 | 8 | 0 | 0 |
| skip | 588 | 0 | 0 | 0 | 583 | 5 |
| ask | 361 | 0 | 333 | 0 | 13 | 15 |
| answer | 343 | 337 | 0 | 6 | 0 | 0 |
| work | 216 | 216 | 0 | 0 | 0 | 0 |
| resume | 170 | 170 | 0 | 0 | 0 | 0 |

## Asks (fields left for the user), by reason / topic (top 30)

| Topic | All | Required |
|---|---:|---:|
| unknown | 211 | 211 |
| consent | 46 | 31 |
| salary | 34 | 15 |
| sponsorship | 14 | 10 |
| notice_period | 11 | 4 |
| work_authorization | 10 | 6 |
| relocation | 9 | 8 |
| pronouns | 9 | 1 |
| missing_profile_value | 8 | 8 |
| sensitive | 3 | 3 |
| disability | 3 | 0 |
| age | 2 | 0 |
| criminal | 1 | 1 |

## Skips

| Reason | Fields |
|---|---:|
| optional, not in profile | 233 |
| optional choice | 183 |
| optional attachment (not your resume) | 66 |
| study dates are not in your profile | 48 |
| current job: no end date | 24 |
| no portfolio in profile | 17 |
| not sure this saved answer fits: left for you | 11 |
| optional attachment | 5 |
| identity: entered by you only | 1 |

## Failed fills (decision:key)

| Decision:key (control) | Fields |
|---|---:|
| profile:school (combobox) | 5 |
| answer:Quick answers › work authorization (combobox) | 3 |
| answer:Quick answers › relocation (combobox) | 2 |
| profile:location (combobox) | 1 |
| answer:Quick answers › onsite (combobox) | 1 |
| profile:state (combobox) | 1 |
| profile:country (combobox) | 1 |

## Time per form

Median 19s, mean 19.8s, max 53s (all 182 forms; includes page load, 3s settle and the fill). Filled forms: median 18s.

## Per platform

| Platform | Forms filled | Fields | Filled | Needs user | Failed | Required left | Ready | Median s |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| greenhouse | 61 | 1077 | 751 (69.7%) | 183 | 13 | 178 of 735 | 12 | 21 |
| breezy | 32 | 715 | 489 (68.4%) | 52 | 0 | 50 of 272 | 15 | 29 |
| ashby | 58 | 683 | 373 (54.6%) | 69 | 1 | 46 of 304 | 33 | 11 |
| bamboohr | 20 | 310 | 209 (67.4%) | 29 | 0 | 20 of 44 | 11 | 21 |

## Fills the page cleared afterwards

81 text fills on 38 forms were reported filled but were empty when the page was read 0.8 s later (other fills on the same forms were there). By field: streetAddress.value 20, city.value 20, zip.value 20, cAddress 18, state.value 3. On Greenhouse these are the fields its resume autofill sets (first/last name, email, phone): its parse request is blocked in this run, and the reset arrives after the fill.

## Safety

- Requests blocked by the read-only guard: 2142 on 180 forms (analytics, consent and tracking beacons).
- Blocked requests that look like application sends (to the ATS, path with appl/submit/candidate): **0**.
- Forms whose URL changed during the fill: **11** (must be 0).
  - URL changed: https://job-boards.greenhouse.io/zoominfo/jobs/8922316002
  - URL changed: https://job-boards.greenhouse.io/five9/jobs/6238401004
  - URL changed: https://job-boards.greenhouse.io/stabilityai/jobs/5031493101
  - URL changed: https://job-boards.greenhouse.io/coreweave/jobs/4705797006
  - URL changed: https://job-boards.greenhouse.io/zoominfo/jobs/8888394002
  - URL changed: https://job-boards.greenhouse.io/coreweave/jobs/4690150006
  - URL changed: https://job-boards.greenhouse.io/asana/jobs/8137748
  - URL changed: https://job-boards.greenhouse.io/five9/jobs/5835102004
  - URL changed: https://job-boards.greenhouse.io/sumup/jobs/8923240002
  - URL changed: https://job-boards.greenhouse.io/asana/jobs/8282374
  - URL changed: https://job-boards.greenhouse.io/sumup/jobs/8644753002

## Accuracy (see WRONG.md)

Filled fields judged: 1822. Correct **1821** (99.9%), wrong **1** (0.1%), unclear 0 (0 unique pairs, listed in UNCLEAR.md).

## Per company (filled forms)

| Company | Forms | Fields | Filled | Needs user | Required left | Ready |
|---|---:|---:|---:|---:|---:|---:|
| ashby:abridge | 1 | 18 | 7 | 1 | 1 | 0 |
| ashby:airbyte | 2 | 11 | 10 | 1 | 1 | 1 |
| ashby:alan | 1 | 14 | 8 | 0 | 0 | 1 |
| ashby:ashby | 2 | 16 | 8 | 2 | 2 | 0 |
| ashby:babbel | 2 | 17 | 15 | 2 | 1 | 1 |
| ashby:backmarket | 2 | 22 | 16 | 0 | 0 | 2 |
| ashby:clickhouse | 2 | 15 | 12 | 0 | 0 | 2 |
| ashby:clickup | 1 | 8 | 6 | 1 | 1 | 0 |
| ashby:docker | 2 | 17 | 13 | 0 | 0 | 2 |
| ashby:fullstory | 2 | 19 | 12 | 4 | 2 | 1 |
| ashby:harvey | 1 | 14 | 12 | 0 | 0 | 1 |
| ashby:illumio | 1 | 13 | 8 | 1 | 0 | 1 |
| ashby:influxdata | 2 | 14 | 8 | 2 | 2 | 0 |
| ashby:kong | 1 | 10 | 7 | 1 | 1 | 0 |
| ashby:lambda | 2 | 17 | 16 | 0 | 0 | 2 |
| ashby:lightspeed | 1 | 6 | 5 | 0 | 0 | 1 |
| ashby:mintlify | 1 | 16 | 6 | 1 | 0 | 1 |
| ashby:notion | 2 | 29 | 12 | 3 | 1 | 1 |
| ashby:oyster | 2 | 52 | 11 | 12 | 10 | 0 |
| ashby:primer | 2 | 34 | 12 | 8 | 8 | 0 |
| ashby:qonto | 1 | 20 | 7 | 7 | 2 | 0 |
| ashby:redis | 2 | 14 | 12 | 0 | 0 | 2 |
| ashby:rohlik | 1 | 6 | 5 | 0 | 0 | 1 |
| ashby:satispay | 2 | 68 | 13 | 4 | 2 | 1 |
| ashby:skydio | 2 | 15 | 10 | 0 | 0 | 2 |
| ashby:snowflake | 2 | 24 | 12 | 2 | 2 | 0 |
| ashby:temporal | 2 | 34 | 21 | 0 | 0 | 2 |
| ashby:thought-machine | 2 | 18 | 13 | 1 | 0 | 2 |
| ashby:thumbtack | 1 | 9 | 6 | 0 | 0 | 1 |
| ashby:uipath | 2 | 22 | 14 | 0 | 0 | 2 |
| ashby:warp | 2 | 8 | 8 | 0 | 0 | 2 |
| ashby:watershed | 2 | 18 | 13 | 4 | 2 | 0 |
| ashby:wealthsimple | 1 | 18 | 6 | 3 | 1 | 0 |
| ashby:whoop | 2 | 10 | 8 | 1 | 1 | 1 |
| ashby:zapier | 2 | 37 | 21 | 8 | 6 | 0 |
| bamboohr:adistec | 2 | 30 | 19 | 4 | 2 | 0 |
| bamboohr:eastlandfood | 1 | 14 | 12 | 0 | 0 | 1 |
| bamboohr:familypromiseofspokane | 2 | 28 | 20 | 1 | 1 | 1 |
| bamboohr:hinterlandgroup | 2 | 31 | 22 | 3 | 3 | 1 |
| bamboohr:hsvarc | 2 | 38 | 20 | 4 | 0 | 2 |
| bamboohr:icmarketsglobal | 2 | 32 | 21 | 5 | 2 | 1 |
| bamboohr:latigobio | 1 | 15 | 11 | 1 | 1 | 0 |
| bamboohr:maplr | 2 | 42 | 20 | 10 | 10 | 0 |
| bamboohr:nexii | 1 | 13 | 10 | 1 | 1 | 0 |
| bamboohr:royal | 2 | 27 | 22 | 0 | 0 | 2 |
| bamboohr:totalps | 2 | 24 | 20 | 0 | 0 | 2 |
| bamboohr:verastem | 1 | 16 | 12 | 0 | 0 | 1 |
| breezy:aimpoint-digital | 2 | 44 | 32 | 0 | 0 | 2 |
| breezy:bear-robotics | 2 | 46 | 34 | 0 | 0 | 2 |
| breezy:beex | 2 | 12 | 8 | 2 | 2 | 0 |
| breezy:helpware-inc | 2 | 33 | 23 | 1 | 0 | 2 |
| breezy:inallmedia-llc | 2 | 65 | 38 | 9 | 8 | 0 |
| breezy:north-wind-group | 2 | 45 | 33 | 0 | 0 | 2 |
| breezy:prime-philippines | 2 | 47 | 33 | 1 | 1 | 1 |
| breezy:prolift-rigging | 2 | 62 | 46 | 0 | 0 | 2 |
| breezy:segal-mccambridge | 2 | 20 | 14 | 0 | 0 | 2 |
| breezy:social-discovery-ventures | 2 | 46 | 32 | 3 | 3 | 0 |
| breezy:spark-power | 2 | 46 | 28 | 8 | 8 | 0 |
| breezy:taqar-consulting-co-l-l-c | 2 | 46 | 33 | 3 | 3 | 0 |
| breezy:vagaro | 2 | 70 | 45 | 11 | 11 | 0 |
| breezy:wealthy-recruiting | 2 | 44 | 32 | 0 | 0 | 2 |
| breezy:zeno-power | 2 | 38 | 22 | 11 | 11 | 0 |
| breezy:zero-hash | 2 | 51 | 36 | 3 | 3 | 0 |
| greenhouse:algolia | 2 | 42 | 32 | 6 | 6 | 0 |
| greenhouse:appier | 2 | 19 | 17 | 0 | 0 | 2 |
| greenhouse:asana | 2 | 52 | 34 | 12 | 10 | 0 |
| greenhouse:attentive | 2 | 36 | 26 | 2 | 2 | 0 |
| greenhouse:bird | 2 | 28 | 14 | 10 | 10 | 0 |
| greenhouse:carta | 2 | 34 | 28 | 2 | 2 | 0 |
| greenhouse:coreweave | 2 | 49 | 35 | 9 | 7 | 0 |
| greenhouse:dataiku | 2 | 42 | 30 | 8 | 8 | 0 |
| greenhouse:deliveroo | 2 | 35 | 26 | 8 | 8 | 0 |
| greenhouse:eucalyptus | 1 | 26 | 8 | 17 | 17 | 0 |
| greenhouse:five9 | 2 | 31 | 21 | 2 | 3 | 0 |
| greenhouse:gemini | 1 | 17 | 13 | 2 | 2 | 0 |
| greenhouse:groww | 1 | 11 | 9 | 0 | 0 | 1 |
| greenhouse:housinganywhere | 1 | 15 | 10 | 3 | 3 | 0 |
| greenhouse:klaviyo | 1 | 20 | 14 | 2 | 0 | 1 |
| greenhouse:labelbox | 2 | 28 | 20 | 4 | 4 | 0 |
| greenhouse:mentimeter | 2 | 29 | 16 | 9 | 9 | 0 |
| greenhouse:mercury | 1 | 15 | 9 | 2 | 2 | 0 |
| greenhouse:mirakl | 1 | 17 | 11 | 4 | 4 | 0 |
| greenhouse:mongodb | 2 | 36 | 25 | 2 | 2 | 0 |
| greenhouse:monzo | 2 | 40 | 28 | 2 | 4 | 0 |
| greenhouse:nice | 2 | 40 | 27 | 11 | 11 | 0 |
| greenhouse:oura | 2 | 38 | 34 | 0 | 0 | 2 |
| greenhouse:pagerduty | 2 | 27 | 24 | 1 | 1 | 1 |
| greenhouse:pendo | 1 | 14 | 12 | 1 | 1 | 0 |
| greenhouse:raisin | 1 | 16 | 10 | 4 | 4 | 0 |
| greenhouse:showpad | 1 | 12 | 9 | 2 | 2 | 0 |
| greenhouse:smartsheet | 1 | 28 | 21 | 5 | 4 | 0 |
| greenhouse:squarespace | 1 | 26 | 14 | 8 | 9 | 0 |
| greenhouse:stabilityai | 1 | 3 | 0 | 0 | 0 | 1 |
| greenhouse:sumup | 2 | 23 | 14 | 4 | 6 | 0 |
| greenhouse:turing | 1 | 10 | 9 | 1 | 1 | 0 |
| greenhouse:twitch | 2 | 74 | 32 | 29 | 25 | 0 |
| greenhouse:upwork | 1 | 9 | 8 | 0 | 0 | 1 |
| greenhouse:veriff | 1 | 14 | 10 | 2 | 2 | 0 |
| greenhouse:verkada | 2 | 26 | 22 | 0 | 0 | 2 |
| greenhouse:wildlifestudios | 1 | 22 | 17 | 3 | 3 | 0 |
| greenhouse:workato | 2 | 34 | 27 | 5 | 5 | 0 |
| greenhouse:zoominfo | 2 | 39 | 35 | 1 | 1 | 1 |

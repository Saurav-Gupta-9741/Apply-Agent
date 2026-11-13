# Live run statistics (182 forms)

Generated 2026-11-13T13:16:40.003Z from results-r10-in-a.jsonl, results-r10-in-b.jsonl by `scripts/live1000-audit.mjs`. The run is still growing: re-run the script.

## Forms

| Outcome | Forms | Share |
|---|---:|---:|
| filled | 176 | 96.7% |
| no_form | 4 | 2.2% |
| robot_check | 1 | 0.5% |
| closed | 1 | 0.5% |

| Platform | filled | no_form | robot_check | closed |
|---|---:|---:|---:|---:|
| greenhouse | 65 | 4 | 1 | 0 |
| breezy | 32 | 0 | 0 | 0 |
| ashby | 59 | 0 | 0 | 1 |
| bamboohr | 20 | 0 | 0 | 0 |

Filled forms: **176**. Ready to submit (nothing left for the user): **61** (34.7%); needing the user: **115**. Run status: needs_user 115, ready_to_submit 61.

## Fields

Fields on filled forms: **3000** (17.0 per form).

| Status | Fields | Share |
|---|---:|---:|
| filled | 1889 | 63.0% |
| skipped | 640 | 21.3% |
| needs_user | 420 | 14.0% |
| already_filled | 28 | 0.9% |
| failed | 23 | 0.8% |

- Filled by the extension: **63.0%** of all fields.
- Required fields: 1482; filled 1091; **left for the user: 391 (26.4%)**.
- Required sections (lists such as Breezy "Work History*", not in the field list): 36; **left empty: 0**.

| Decision | Fields | filled | needs_user | failed | skipped | already_filled |
|---|---:|---:|---:|---:|---:|---:|
| profile | 1152 | 1139 | 0 | 13 | 0 | 0 |
| skip | 633 | 0 | 0 | 0 | 625 | 8 |
| ask | 455 | 0 | 420 | 0 | 15 | 20 |
| answer | 399 | 389 | 0 | 10 | 0 | 0 |
| work | 189 | 189 | 0 | 0 | 0 | 0 |
| resume | 172 | 172 | 0 | 0 | 0 | 0 |

## Asks (fields left for the user), by reason / topic (top 30)

| Topic | All | Required |
|---|---:|---:|
| unknown | 305 | 305 |
| consent | 42 | 24 |
| salary | 39 | 18 |
| sponsorship | 19 | 18 |
| missing_profile_value | 7 | 7 |
| relocation | 7 | 4 |
| criminal | 6 | 4 |
| pronouns | 6 | 1 |
| notice_period | 6 | 0 |
| disability | 5 | 3 |
| work_authorization | 3 | 3 |
| sensitive | 3 | 3 |
| age | 3 | 0 |
| accommodation | 2 | 2 |
| gender | 2 | 0 |

## Skips

| Reason | Fields |
|---|---:|
| optional, not in profile | 290 |
| optional choice | 170 |
| optional attachment (not your resume) | 73 |
| study dates are not in your profile | 44 |
| no portfolio in profile | 24 |
| current job: no end date | 21 |
| not sure this saved answer fits: left for you | 6 |
| legal: entered by you only | 2 |
| identity: entered by you only | 1 |
| optional attachment | 1 |
| unsure: reads like skills experience | 1 |

## Failed fills (decision:key)

| Decision:key (control) | Fields |
|---|---:|
| profile:school (combobox) | 6 |
| profile:state (combobox) | 5 |
| answer:Quick answers › relocation (combobox) | 2 |
| answer:Disability status (combobox) | 2 |
| answer:Quick answers › sponsorship (combobox) | 1 |
| profile:location (combobox) | 1 |
| profile:country (combobox) | 1 |
| answer:Gender (combobox) | 1 |
| answer:Race / Ethnicity (combobox) | 1 |
| answer:Veteran status (combobox) | 1 |
| answer:Quick answers › expected salary abroad (combobox) | 1 |
| answer:What is your notice period? (number) | 1 |

## Time per form

Median 15s, mean 17.9s, max 59s (all 182 forms; includes page load, 3s settle and the fill). Filled forms: median 15s.

## Per platform

| Platform | Forms filled | Fields | Filled | Needs user | Failed | Required left | Ready | Median s |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| greenhouse | 65 | 1138 | 763 (67.0%) | 229 | 21 | 233 of 791 | 9 | 16 |
| breezy | 32 | 685 | 457 (66.7%) | 61 | 0 | 61 of 288 | 14 | 28 |
| ashby | 59 | 757 | 432 (57.1%) | 73 | 2 | 58 of 358 | 27 | 9 |
| bamboohr | 20 | 420 | 237 (56.4%) | 57 | 0 | 39 of 81 | 11 | 21 |

## Fills the page cleared afterwards

89 text fills on 41 forms were reported filled but were empty when the page was read 0.8 s later (other fills on the same forms were there). By field: cAddress 21, streetAddress.value 20, city.value 20, zip.value 20, state.value 8. On Greenhouse these are the fields its resume autofill sets (first/last name, email, phone): its parse request is blocked in this run, and the reset arrives after the fill.

## Safety

- Requests blocked by the read-only guard: 1741 on 179 forms (analytics, consent and tracking beacons).
- Blocked requests that look like application sends (to the ATS, path with appl/submit/candidate): **0**.
- Forms whose URL changed during the fill: **8** (must be 0).
  - URL changed: https://job-boards.greenhouse.io/circleci/jobs/8475304002
  - URL changed: https://job-boards.greenhouse.io/cockroachlabs/jobs/8383567
  - URL changed: https://job-boards.greenhouse.io/circleci/jobs/8814842002
  - URL changed: https://job-boards.greenhouse.io/sumup/jobs/8348937002
  - URL changed: https://job-boards.greenhouse.io/cockroachlabs/jobs/8055505
  - URL changed: https://job-boards.greenhouse.io/fireblocks/jobs/4698021006
  - URL changed: https://job-boards.greenhouse.io/fastly/jobs/8160641
  - URL changed: https://job-boards.greenhouse.io/fireblocks/jobs/4699618006

## Accuracy (see WRONG.md)

Filled fields judged: 1889. Correct **1876** (99.3%), wrong **13** (0.7%), unclear 0 (0 unique pairs, listed in UNCLEAR.md).

## Per company (filled forms)

| Company | Forms | Fields | Filled | Needs user | Required left | Ready |
|---|---:|---:|---:|---:|---:|---:|
| ashby:1password | 2 | 61 | 25 | 7 | 5 | 0 |
| ashby:acorns | 2 | 28 | 20 | 0 | 0 | 2 |
| ashby:airwallex | 2 | 28 | 19 | 3 | 3 | 0 |
| ashby:alchemy | 2 | 18 | 12 | 3 | 3 | 1 |
| ashby:ashby | 2 | 18 | 10 | 1 | 1 | 1 |
| ashby:atlan | 2 | 29 | 18 | 3 | 3 | 0 |
| ashby:backmarket | 2 | 32 | 17 | 3 | 3 | 1 |
| ashby:benevity | 1 | 8 | 6 | 1 | 0 | 1 |
| ashby:epidemic-sound | 2 | 11 | 10 | 0 | 0 | 2 |
| ashby:farfetch | 1 | 16 | 9 | 1 | 0 | 1 |
| ashby:gainsight | 1 | 9 | 6 | 1 | 1 | 0 |
| ashby:getyourguide | 2 | 20 | 14 | 3 | 0 | 2 |
| ashby:gorgias | 1 | 5 | 4 | 0 | 0 | 1 |
| ashby:helpscout | 2 | 33 | 16 | 2 | 2 | 1 |
| ashby:illumio | 2 | 27 | 16 | 3 | 1 | 1 |
| ashby:iterable | 1 | 11 | 8 | 1 | 0 | 1 |
| ashby:kong | 2 | 20 | 14 | 2 | 2 | 0 |
| ashby:lovable | 2 | 23 | 15 | 8 | 8 | 0 |
| ashby:magic | 1 | 8 | 5 | 1 | 1 | 0 |
| ashby:mapbox | 1 | 12 | 8 | 2 | 0 | 1 |
| ashby:mintlify | 2 | 32 | 10 | 2 | 0 | 2 |
| ashby:moneybox | 1 | 19 | 13 | 2 | 2 | 0 |
| ashby:notion | 1 | 14 | 6 | 1 | 0 | 1 |
| ashby:openai | 2 | 24 | 16 | 1 | 1 | 1 |
| ashby:qonto | 2 | 28 | 16 | 3 | 3 | 0 |
| ashby:ramp | 1 | 11 | 5 | 2 | 2 | 0 |
| ashby:render | 1 | 10 | 8 | 0 | 0 | 1 |
| ashby:replit | 2 | 26 | 16 | 2 | 2 | 0 |
| ashby:resend | 2 | 22 | 14 | 4 | 4 | 0 |
| ashby:rohlik | 1 | 6 | 5 | 0 | 0 | 1 |
| ashby:sentry | 1 | 11 | 9 | 1 | 0 | 1 |
| ashby:sierra | 1 | 50 | 10 | 0 | 0 | 1 |
| ashby:snowflake | 1 | 11 | 6 | 1 | 1 | 0 |
| ashby:strava | 2 | 18 | 14 | 0 | 0 | 2 |
| ashby:thinkific | 1 | 9 | 5 | 2 | 2 | 0 |
| ashby:tractable | 1 | 6 | 5 | 0 | 1 | 0 |
| ashby:uipath | 1 | 11 | 7 | 0 | 0 | 1 |
| ashby:warp | 2 | 23 | 9 | 5 | 5 | 0 |
| ashby:writer | 1 | 9 | 6 | 2 | 2 | 0 |
| bamboohr:birchesgroup | 2 | 23 | 20 | 0 | 0 | 2 |
| bamboohr:corcym | 2 | 46 | 26 | 4 | 4 | 0 |
| bamboohr:couples | 2 | 139 | 42 | 39 | 25 | 0 |
| bamboohr:hinterlandgroup | 1 | 14 | 11 | 0 | 0 | 1 |
| bamboohr:icmarkets | 2 | 37 | 28 | 3 | 3 | 0 |
| bamboohr:icmarketsglobal | 2 | 34 | 19 | 3 | 0 | 2 |
| bamboohr:latigobio | 1 | 15 | 10 | 2 | 2 | 0 |
| bamboohr:maplr | 1 | 20 | 9 | 4 | 3 | 0 |
| bamboohr:otstaffing | 2 | 22 | 19 | 2 | 2 | 1 |
| bamboohr:royal | 1 | 12 | 10 | 0 | 0 | 1 |
| bamboohr:storeforce | 1 | 17 | 10 | 0 | 0 | 1 |
| bamboohr:totalps | 2 | 24 | 20 | 0 | 0 | 2 |
| bamboohr:verastem | 1 | 17 | 13 | 0 | 0 | 1 |
| breezy:aimpoint-digital | 2 | 46 | 34 | 0 | 0 | 2 |
| breezy:bear-robotics | 2 | 46 | 34 | 0 | 0 | 2 |
| breezy:beex | 2 | 12 | 8 | 2 | 2 | 0 |
| breezy:helpware-inc | 2 | 12 | 10 | 0 | 0 | 2 |
| breezy:inallmedia-llc | 2 | 78 | 42 | 16 | 16 | 0 |
| breezy:north-wind-group | 2 | 46 | 34 | 0 | 0 | 2 |
| breezy:prime-philippines | 2 | 26 | 20 | 0 | 0 | 2 |
| breezy:prolift-rigging | 2 | 76 | 48 | 11 | 11 | 1 |
| breezy:segal-mccambridge | 2 | 22 | 15 | 1 | 1 | 1 |
| breezy:social-discovery-ventures | 2 | 18 | 10 | 3 | 3 | 0 |
| breezy:spark-power | 2 | 63 | 36 | 10 | 10 | 0 |
| breezy:taqar-consulting-co-l-l-c | 2 | 46 | 34 | 2 | 2 | 0 |
| breezy:vagaro | 2 | 56 | 40 | 3 | 3 | 0 |
| breezy:wealthy-recruiting | 2 | 44 | 32 | 0 | 0 | 2 |
| breezy:zeno-power | 2 | 43 | 24 | 10 | 10 | 0 |
| breezy:zero-hash | 2 | 51 | 36 | 3 | 3 | 0 |
| greenhouse:abnormalsecurity | 1 | 19 | 15 | 2 | 2 | 0 |
| greenhouse:betterment | 1 | 21 | 13 | 5 | 5 | 0 |
| greenhouse:blockchain | 1 | 10 | 7 | 1 | 1 | 0 |
| greenhouse:braze | 1 | 18 | 12 | 2 | 2 | 0 |
| greenhouse:chime | 1 | 22 | 17 | 4 | 4 | 0 |
| greenhouse:circleci | 2 | 31 | 23 | 8 | 8 | 0 |
| greenhouse:cockroachlabs | 2 | 46 | 37 | 3 | 3 | 0 |
| greenhouse:cultureamp | 2 | 46 | 39 | 3 | 3 | 0 |
| greenhouse:datadog | 2 | 37 | 27 | 7 | 7 | 0 |
| greenhouse:dremio | 2 | 27 | 22 | 1 | 1 | 1 |
| greenhouse:fastly | 1 | 22 | 17 | 3 | 2 | 0 |
| greenhouse:fireblocks | 2 | 24 | 18 | 1 | 1 | 1 |
| greenhouse:gitlab | 1 | 19 | 13 | 1 | 2 | 0 |
| greenhouse:gocardless | 1 | 20 | 14 | 4 | 3 | 0 |
| greenhouse:greenhouse | 2 | 60 | 36 | 20 | 20 | 0 |
| greenhouse:lovable | 1 | 15 | 9 | 3 | 3 | 0 |
| greenhouse:netskope | 2 | 6 | 0 | 0 | 0 | 2 |
| greenhouse:newrelic | 2 | 38 | 29 | 5 | 7 | 0 |
| greenhouse:nextdoor | 2 | 24 | 14 | 2 | 3 | 0 |
| greenhouse:nuro | 2 | 2 | 2 | 0 | 0 | 2 |
| greenhouse:oura | 2 | 38 | 32 | 0 | 2 | 0 |
| greenhouse:pagerduty | 2 | 26 | 15 | 7 | 8 | 0 |
| greenhouse:raisin | 1 | 14 | 9 | 3 | 3 | 0 |
| greenhouse:showpad | 2 | 30 | 23 | 4 | 4 | 0 |
| greenhouse:sigmacomputing | 2 | 34 | 23 | 8 | 8 | 0 |
| greenhouse:spacex | 2 | 60 | 32 | 20 | 22 | 0 |
| greenhouse:squarespace | 1 | 26 | 14 | 8 | 9 | 0 |
| greenhouse:storyblok | 1 | 18 | 9 | 8 | 8 | 0 |
| greenhouse:sumup | 1 | 12 | 7 | 4 | 4 | 0 |
| greenhouse:tanium | 2 | 36 | 28 | 4 | 4 | 0 |
| greenhouse:taskrabbit | 2 | 34 | 26 | 5 | 3 | 0 |
| greenhouse:tenstorrent | 2 | 28 | 22 | 2 | 2 | 0 |
| greenhouse:tripactions | 1 | 19 | 15 | 2 | 2 | 0 |
| greenhouse:twitch | 2 | 76 | 32 | 31 | 27 | 0 |
| greenhouse:upstart | 1 | 17 | 11 | 5 | 5 | 0 |
| greenhouse:veriff | 2 | 24 | 18 | 2 | 2 | 1 |
| greenhouse:verkada | 2 | 25 | 21 | 0 | 0 | 2 |
| greenhouse:vtex | 2 | 41 | 19 | 18 | 20 | 0 |
| greenhouse:xai | 2 | 44 | 22 | 17 | 17 | 0 |
| greenhouse:zocdoc | 2 | 29 | 21 | 6 | 6 | 0 |

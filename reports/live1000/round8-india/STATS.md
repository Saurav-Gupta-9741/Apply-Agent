# Live run statistics (182 forms)

Generated 2026-11-10T10:58:49.346Z from results-r8-in-a.jsonl, results-r8-in-b.jsonl by `scripts/live1000-audit.mjs`. The run is still growing: re-run the script.

## Forms

| Outcome | Forms | Share |
|---|---:|---:|
| filled | 171 | 94.0% |
| no_form | 6 | 3.3% |
| robot_check | 4 | 2.2% |
| closed | 1 | 0.5% |

| Platform | filled | no_form | robot_check | closed |
|---|---:|---:|---:|---:|
| greenhouse | 60 | 6 | 4 | 0 |
| breezy | 32 | 0 | 0 | 0 |
| ashby | 59 | 0 | 0 | 1 |
| bamboohr | 20 | 0 | 0 | 0 |

Filled forms: **171**. Ready to submit (nothing left for the user): **77** (45.0%); needing the user: **94**. Run status: needs_user 94, ready_to_submit 77.

## Fields

Fields on filled forms: **2674** (15.6 per form).

| Status | Fields | Share |
|---|---:|---:|
| filled | 1857 | 69.4% |
| skipped | 445 | 16.6% |
| needs_user | 319 | 11.9% |
| failed | 27 | 1.0% |
| already_filled | 26 | 1.0% |

- Filled by the extension: **69.4%** of all fields.
- Required fields: 1343; filled 1050; **left for the user: 293 (21.8%)**.
- Required sections (lists such as Breezy "Work History*", not in the field list): 39; **left empty: 0**.

| Decision | Fields | filled | needs_user | failed | skipped | already_filled |
|---|---:|---:|---:|---:|---:|---:|
| profile | 1104 | 1087 | 0 | 17 | 0 | 0 |
| skip | 442 | 0 | 0 | 0 | 435 | 7 |
| answer | 394 | 384 | 0 | 10 | 0 | 0 |
| ask | 348 | 0 | 319 | 0 | 10 | 19 |
| work | 216 | 216 | 0 | 0 | 0 | 0 |
| resume | 170 | 170 | 0 | 0 | 0 | 0 |

## Asks (fields left for the user), by reason / topic (top 30)

| Topic | All | Required |
|---|---:|---:|
| unknown | 201 | 201 |
| salary | 38 | 19 |
| consent | 36 | 24 |
| relocation | 14 | 9 |
| sponsorship | 14 | 10 |
| notice_period | 11 | 8 |
| pronouns | 8 | 2 |
| sensitive | 7 | 7 |
| missing_profile_value | 6 | 6 |
| work_authorization | 3 | 3 |
| signature | 3 | 3 |
| accommodation | 2 | 2 |
| disability | 2 | 0 |
| age | 2 | 0 |
| criminal | 1 | 1 |

## Skips

| Reason | Fields |
|---|---:|
| optional, not in profile | 202 |
| optional choice | 72 |
| optional attachment (not your resume) | 63 |
| study dates are not in your profile | 48 |
| current job: no end date | 24 |
| no portfolio in profile | 22 |
| not sure this saved answer fits: left for you | 7 |
| optional address line 2 empty | 1 |
| optional attachment | 1 |
| legal: entered by you only | 1 |
| identity: entered by you only | 1 |

## Failed fills (decision:key)

| Decision:key (control) | Fields |
|---|---:|
| profile:school (combobox) | 10 |
| answer:Quick answers › work authorization (combobox) | 4 |
| answer:How did you hear about this job? (combobox) | 3 |
| profile:location (combobox) | 3 |
| answer:Quick answers › sponsorship (combobox) | 2 |
| profile:state (combobox) | 2 |
| profile:graduationYear (combobox) | 1 |
| answer:Quick answers › previous employer (combobox) | 1 |
| profile:degree (combobox) | 1 |

## Time per form

Median 19s, mean 20.8s, max 92s (all 182 forms; includes page load, 3s settle and the fill). Filled forms: median 19s.

## Per platform

| Platform | Forms filled | Fields | Filled | Needs user | Failed | Required left | Ready | Median s |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| greenhouse | 60 | 1106 | 798 (72.2%) | 179 | 22 | 179 of 748 | 10 | 20 |
| breezy | 32 | 751 | 492 (65.5%) | 74 | 0 | 73 of 306 | 12 | 30 |
| ashby | 59 | 536 | 368 (68.7%) | 47 | 5 | 34 of 301 | 39 | 11 |
| bamboohr | 20 | 281 | 199 (70.8%) | 19 | 0 | 7 of 27 | 16 | 23 |

## Fills the page cleared afterwards

78 text fills on 37 forms were reported filled but were empty when the page was read 0.8 s later (other fills on the same forms were there). By field: cAddress 19, streetAddress.value 18, city.value 18, zip.value 18, state.value 5. On Greenhouse these are the fields its resume autofill sets (first/last name, email, phone): its parse request is blocked in this run, and the reset arrives after the fill.

## Safety

- Requests blocked by the read-only guard: 1672 on 181 forms (analytics, consent and tracking beacons).
- Blocked requests that look like application sends (to the ATS, path with appl/submit/candidate): **0**.
- Forms whose URL changed during the fill: **10** (must be 0).
  - URL changed: https://job-boards.greenhouse.io/coreweave/jobs/4705790006
  - URL changed: https://job-boards.greenhouse.io/imply/jobs/7532582003
  - URL changed: https://job-boards.greenhouse.io/billcom/jobs/6113507004
  - URL changed: https://job-boards.greenhouse.io/cockroachlabs/jobs/2578081
  - URL changed: https://job-boards.greenhouse.io/lucidmotors/jobs/5231094007
  - URL changed: https://job-boards.greenhouse.io/billcom/jobs/6223028004
  - URL changed: https://job-boards.greenhouse.io/asana/jobs/8221174
  - URL changed: https://job-boards.greenhouse.io/esri/jobs/5091940007
  - URL changed: https://job-boards.greenhouse.io/asana/jobs/7964297
  - URL changed: https://job-boards.greenhouse.io/circleci/jobs/8420901002

## Accuracy (see WRONG.md)

Filled fields judged: 1857. Correct **1856** (99.9%), wrong **1** (0.1%), unclear 0 (0 unique pairs, listed in UNCLEAR.md).

## Per company (filled forms)

| Company | Forms | Fields | Filled | Needs user | Required left | Ready |
|---|---:|---:|---:|---:|---:|---:|
| ashby:acorns | 1 | 14 | 10 | 0 | 0 | 1 |
| ashby:airwallex | 1 | 8 | 6 | 2 | 2 | 0 |
| ashby:amplitude | 2 | 14 | 10 | 0 | 0 | 2 |
| ashby:ashby | 2 | 21 | 8 | 5 | 5 | 0 |
| ashby:benevity | 1 | 8 | 6 | 1 | 0 | 1 |
| ashby:circle | 2 | 12 | 10 | 0 | 0 | 2 |
| ashby:cognition | 1 | 7 | 6 | 0 | 0 | 1 |
| ashby:drata | 2 | 16 | 14 | 2 | 2 | 0 |
| ashby:elevenlabs | 2 | 24 | 10 | 0 | 0 | 2 |
| ashby:faculty | 2 | 16 | 14 | 0 | 0 | 2 |
| ashby:farfetch | 1 | 16 | 10 | 0 | 0 | 1 |
| ashby:fullstory | 2 | 16 | 11 | 2 | 0 | 2 |
| ashby:hex | 1 | 9 | 8 | 1 | 1 | 0 |
| ashby:illumio | 2 | 26 | 16 | 2 | 0 | 2 |
| ashby:influxdata | 2 | 14 | 8 | 2 | 2 | 0 |
| ashby:koho | 1 | 8 | 4 | 2 | 2 | 0 |
| ashby:kong | 1 | 10 | 7 | 1 | 1 | 0 |
| ashby:langchain | 2 | 12 | 12 | 0 | 0 | 2 |
| ashby:llamaindex | 1 | 7 | 4 | 0 | 0 | 1 |
| ashby:lovable | 1 | 12 | 7 | 5 | 5 | 0 |
| ashby:modal | 2 | 6 | 6 | 0 | 0 | 2 |
| ashby:nubank | 2 | 20 | 12 | 3 | 0 | 2 |
| ashby:paddle | 2 | 15 | 14 | 0 | 0 | 2 |
| ashby:poolside | 1 | 6 | 5 | 0 | 0 | 1 |
| ashby:poshmark | 2 | 14 | 12 | 1 | 1 | 1 |
| ashby:railway | 1 | 4 | 3 | 1 | 1 | 0 |
| ashby:redis | 2 | 14 | 11 | 0 | 0 | 2 |
| ashby:skydio | 1 | 8 | 5 | 0 | 0 | 1 |
| ashby:sorare | 1 | 10 | 6 | 1 | 0 | 1 |
| ashby:supabase | 1 | 15 | 7 | 4 | 3 | 0 |
| ashby:surveymonkey | 2 | 25 | 22 | 0 | 0 | 2 |
| ashby:synthesia | 2 | 16 | 11 | 3 | 2 | 1 |
| ashby:thumbtack | 1 | 10 | 6 | 2 | 2 | 0 |
| ashby:vanta | 2 | 19 | 17 | 0 | 0 | 2 |
| ashby:wayve | 2 | 20 | 17 | 1 | 1 | 1 |
| ashby:webflow | 2 | 23 | 14 | 0 | 0 | 2 |
| ashby:writer | 1 | 9 | 6 | 2 | 2 | 0 |
| ashby:xero | 2 | 32 | 13 | 4 | 2 | 0 |
| bamboohr:adistec | 2 | 29 | 19 | 5 | 2 | 1 |
| bamboohr:corcym | 2 | 30 | 19 | 2 | 2 | 1 |
| bamboohr:couples | 1 | 15 | 9 | 1 | 0 | 1 |
| bamboohr:flsgroup | 2 | 26 | 20 | 2 | 0 | 2 |
| bamboohr:hinterlandgroup | 2 | 27 | 22 | 0 | 0 | 2 |
| bamboohr:hsvarc | 2 | 36 | 19 | 4 | 0 | 2 |
| bamboohr:icmarketsglobal | 1 | 13 | 11 | 0 | 0 | 1 |
| bamboohr:nexii | 2 | 27 | 18 | 3 | 1 | 1 |
| bamboohr:otstaffing | 1 | 6 | 6 | 0 | 0 | 1 |
| bamboohr:royal | 2 | 27 | 20 | 2 | 2 | 1 |
| bamboohr:totalps | 1 | 12 | 10 | 0 | 0 | 1 |
| bamboohr:verastem | 2 | 33 | 26 | 0 | 0 | 2 |
| breezy:aimpoint-digital | 2 | 31 | 22 | 0 | 0 | 2 |
| breezy:bear-robotics | 2 | 49 | 36 | 0 | 0 | 2 |
| breezy:beex | 2 | 12 | 8 | 2 | 2 | 0 |
| breezy:helpware-inc | 2 | 35 | 25 | 1 | 1 | 1 |
| breezy:inallmedia-llc | 2 | 78 | 38 | 20 | 20 | 0 |
| breezy:north-wind-group | 2 | 53 | 37 | 0 | 0 | 2 |
| breezy:prime-philippines | 2 | 43 | 33 | 0 | 0 | 2 |
| breezy:prolift-rigging | 2 | 62 | 44 | 3 | 3 | 1 |
| breezy:segal-mccambridge | 2 | 24 | 16 | 2 | 2 | 0 |
| breezy:social-discovery-ventures | 2 | 28 | 19 | 3 | 3 | 0 |
| breezy:spark-power | 2 | 62 | 39 | 8 | 8 | 0 |
| breezy:taqar-consulting-co-l-l-c | 2 | 50 | 33 | 5 | 4 | 0 |
| breezy:vagaro | 2 | 67 | 40 | 10 | 10 | 0 |
| breezy:wealthy-recruiting | 2 | 44 | 32 | 0 | 0 | 2 |
| breezy:zeno-power | 2 | 57 | 33 | 15 | 15 | 0 |
| breezy:zero-hash | 2 | 56 | 37 | 5 | 5 | 0 |
| greenhouse:airbnb | 2 | 37 | 23 | 10 | 12 | 0 |
| greenhouse:airtable | 1 | 18 | 13 | 3 | 2 | 0 |
| greenhouse:appier | 2 | 20 | 18 | 0 | 0 | 2 |
| greenhouse:asana | 2 | 50 | 31 | 13 | 11 | 0 |
| greenhouse:attentive | 2 | 37 | 25 | 4 | 4 | 0 |
| greenhouse:billcom | 2 | 43 | 36 | 4 | 6 | 0 |
| greenhouse:block | 2 | 60 | 35 | 16 | 17 | 0 |
| greenhouse:braze | 2 | 42 | 31 | 2 | 2 | 0 |
| greenhouse:circleci | 1 | 16 | 13 | 3 | 3 | 0 |
| greenhouse:cockroachlabs | 1 | 20 | 14 | 4 | 3 | 0 |
| greenhouse:coreweave | 1 | 25 | 18 | 4 | 3 | 0 |
| greenhouse:cultureamp | 2 | 46 | 39 | 3 | 3 | 0 |
| greenhouse:esri | 1 | 17 | 14 | 2 | 1 | 0 |
| greenhouse:fivetran | 1 | 31 | 20 | 5 | 5 | 0 |
| greenhouse:grafanalabs | 2 | 28 | 28 | 0 | 0 | 2 |
| greenhouse:graphcore | 2 | 47 | 29 | 12 | 16 | 0 |
| greenhouse:greenhouse | 1 | 30 | 18 | 10 | 10 | 0 |
| greenhouse:housinganywhere | 1 | 15 | 10 | 3 | 3 | 0 |
| greenhouse:imply | 1 | 13 | 11 | 0 | 0 | 1 |
| greenhouse:justworks | 2 | 50 | 39 | 10 | 10 | 0 |
| greenhouse:labelbox | 2 | 29 | 19 | 6 | 6 | 0 |
| greenhouse:lucidmotors | 1 | 32 | 24 | 3 | 3 | 0 |
| greenhouse:mentimeter | 2 | 31 | 15 | 12 | 13 | 0 |
| greenhouse:monzo | 1 | 18 | 13 | 1 | 2 | 0 |
| greenhouse:nextdoor | 2 | 30 | 22 | 4 | 2 | 0 |
| greenhouse:porter | 1 | 1 | 1 | 0 | 0 | 1 |
| greenhouse:realtimeboardglobal | 1 | 12 | 7 | 2 | 2 | 0 |
| greenhouse:singlestore | 2 | 38 | 27 | 4 | 1 | 1 |
| greenhouse:slice | 1 | 14 | 8 | 3 | 3 | 0 |
| greenhouse:stockx | 2 | 33 | 22 | 5 | 5 | 0 |
| greenhouse:taskrabbit | 2 | 40 | 30 | 7 | 7 | 0 |
| greenhouse:toast | 2 | 29 | 19 | 6 | 6 | 0 |
| greenhouse:typeface | 2 | 28 | 22 | 3 | 3 | 0 |
| greenhouse:upwork | 1 | 13 | 8 | 5 | 5 | 0 |
| greenhouse:verkada | 1 | 15 | 13 | 0 | 0 | 1 |
| greenhouse:vonage | 1 | 14 | 13 | 1 | 1 | 0 |
| greenhouse:warp | 1 | 14 | 11 | 2 | 2 | 0 |
| greenhouse:wasabi | 2 | 42 | 40 | 0 | 0 | 2 |
| greenhouse:xendit | 2 | 28 | 19 | 7 | 7 | 0 |

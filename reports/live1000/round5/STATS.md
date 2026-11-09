# Live run statistics (1581 forms)

Generated 2026-11-09T16:31:25.436Z from results-a.jsonl, results-b.jsonl by `scripts/live1000-audit.mjs`. The run is still growing: re-run the script.

## Forms

| Outcome | Forms | Share |
|---|---:|---:|
| filled | 1423 | 90.0% |
| no_form | 101 | 6.4% |
| robot_check | 27 | 1.7% |
| closed | 24 | 1.5% |
| error | 6 | 0.4% |

| Platform | filled | no_form | closed | robot_check | error |
|---|---:|---:|---:|---:|---:|
| greenhouse | 756 | 74 | 7 | 27 | 5 |
| ashby | 432 | 1 | 17 | 0 | 0 |
| bamboohr | 63 | 18 | 0 | 0 | 1 |
| recruitee | 27 | 0 | 0 | 0 | 0 |
| breezy | 72 | 0 | 0 | 0 | 0 |
| workable | 73 | 8 | 0 | 0 | 0 |

Filled forms: **1423**. Ready to submit (nothing left for the user): **356** (25.0%); needing the user: **1067**. Run status: needs_user 1067, ready_to_submit 356.

Errors:
- 4 × page.goto: net::ERR_HTTP2_PROTOCOL_ERROR at https://job-boards.greenhouse.io/rob
- 1 × page.goto: Timeout 45000ms exceeded.
- 1 × page.goto: net::ERR_CONNECTION_TIMED_OUT at https://job-boards.greenhouse.io/squ

## Fields

Fields on filled forms: **21548** (15.1 per form).

| Status | Fields | Share |
|---|---:|---:|
| filled | 13140 | 61.0% |
| needs_user | 3979 | 18.5% |
| skipped | 3825 | 17.8% |
| failed | 440 | 2.0% |
| already_filled | 164 | 0.8% |

- Filled by the extension: **61.0%** of all fields.
- Required fields: 13293; filled 9393; **left for the user: 3900 (29.3%)**.

| Decision | Fields | filled | needs_user | failed | skipped | already_filled |
|---|---:|---:|---:|---:|---:|---:|
| profile | 8884 | 8656 | 0 | 196 | 0 | 32 |
| ask | 4143 | 0 | 3979 | 0 | 85 | 79 |
| skip | 3793 | 0 | 0 | 0 | 3740 | 53 |
| answer | 3324 | 3080 | 0 | 244 | 0 | 0 |
| resume | 1404 | 1404 | 0 | 0 | 0 | 0 |

## Asks (fields left for the user), by reason / topic (top 30)

| Topic | All | Required |
|---|---:|---:|
| unknown | 2508 | 2507 |
| consent | 380 | 275 |
| salary | 308 | 213 |
| sponsorship | 230 | 194 |
| notice_period | 150 | 86 |
| work_authorization | 148 | 127 |
| relocation | 118 | 91 |
| missing_profile_value | 91 | 91 |
| pronouns | 53 | 4 |
| identity | 37 | 37 |
| accommodation | 28 | 19 |
| sensitive | 16 | 16 |
| age | 16 | 8 |
| criminal | 14 | 13 |
| signature | 13 | 13 |
| disability | 12 | 1 |
| race | 12 | 0 |
| gender | 8 | 0 |
| sexual_orientation | 1 | 0 |

## Skips

| Reason | Fields |
|---|---:|
| optional, not in profile | 1648 |
| optional choice | 1036 |
| optional attachment (not your resume) | 761 |
| no portfolio in profile | 112 |
| no addressLine1 in profile | 63 |
| no postalCode in profile | 63 |
| not sure this saved answer fits: left for you | 51 |
| optional attachment | 33 |
| identity: entered by you only | 16 |
| optional address line 2 empty | 7 |
| legal: entered by you only | 2 |
| no state in profile | 1 |

## Failed fills (decision:key)

| Decision:key (control) | Fields |
|---|---:|
| profile:school (combobox) | 105 |
| answer:How did you hear about this job? (combobox) | 65 |
| answer:Disability status (combobox) | 39 |
| profile:country (combobox) | 34 |
| profile:location (combobox) | 34 |
| answer:Quick answers › work authorization (combobox) | 27 |
| answer:Veteran status (combobox) | 14 |
| answer:Quick answers › expected salary abroad (text) | 14 |
| answer:Quick answers › previous employer (combobox) | 13 |
| answer:Gender (combobox) | 12 |
| answer:Quick answers › sponsorship (combobox) | 10 |
| answer:How did you hear about this job? (checkbox_group) | 8 |
| profile:graduationYear (combobox) | 8 |
| answer:Race / Ethnicity (combobox) | 7 |
| answer:Quick answers › onsite (combobox) | 6 |
| answer:Quick answers › notice period (text) | 6 |
| profile:degree (combobox) | 5 |
| answer:Quick answers › relocation (combobox) | 4 |
| answer:What is your notice period? (number) | 4 |
| answer:Quick answers › current CTC (text) | 4 |

## Time per form

Median 15s, mean 20s, max 118s (all 1581 forms; includes page load, 3s settle and the fill). Filled forms: median 14s.

## Per platform

| Platform | Forms filled | Fields | Filled | Needs user | Failed | Required left | Ready | Median s |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| greenhouse | 756 | 13742 | 8931 (65.0%) | 2916 | 368 | 2984 of 9459 | 79 | 18 |
| ashby | 432 | 4989 | 2824 (56.6%) | 532 | 49 | 402 of 2347 | 215 | 11 |
| bamboohr | 63 | 977 | 508 (52.0%) | 98 | 0 | 65 of 146 | 32 | 28 |
| recruitee | 27 | 223 | 120 (53.8%) | 43 | 0 | 43 of 160 | 7 | 23 |
| breezy | 72 | 889 | 369 (41.5%) | 228 | 14 | 235 of 596 | 16 | 26 |
| workable | 73 | 728 | 388 (53.3%) | 162 | 9 | 171 of 585 | 7 | 9 |

## Fills the page cleared afterwards

135 text fills on 135 forms were reported filled but were empty when the page was read 0.8 s later (other fills on the same forms were there). By field: phone 72, city.value 63. On Greenhouse these are the fields its resume autofill sets (first/last name, email, phone): its parse request is blocked in this run, and the reset arrives after the fill.

## Safety

- Requests blocked by the read-only guard: 15188 on 1520 forms (analytics, consent and tracking beacons).
- Blocked requests that look like application sends (to the ATS, path with appl/submit/candidate): **0**.
- Forms whose URL changed during the fill: **62** (must be 0).
  - URL changed: https://job-boards.greenhouse.io/billcom/jobs/6217056004
  - URL changed: https://job-boards.greenhouse.io/circleci/jobs/8801094002
  - URL changed: https://job-boards.greenhouse.io/cockroachlabs/jobs/8332010
  - URL changed: https://job-boards.greenhouse.io/coreweave/jobs/4718149006
  - URL changed: https://job-boards.greenhouse.io/fireblocks/jobs/4695814006
  - URL changed: https://job-boards.greenhouse.io/lucidmotors/jobs/5093940007
  - URL changed: https://job-boards.greenhouse.io/stabilityai/jobs/4965731101
  - URL changed: https://job-boards.greenhouse.io/zoominfo/jobs/8622943002
  - URL changed: https://job-boards.greenhouse.io/asana/jobs/8194380
  - URL changed: https://job-boards.greenhouse.io/circleci/jobs/8560754002
  - URL changed: https://job-boards.greenhouse.io/cockroachlabs/jobs/8331987
  - URL changed: https://job-boards.greenhouse.io/coreweave/jobs/4688540006
  - URL changed: https://job-boards.greenhouse.io/fireblocks/jobs/4689433006
  - URL changed: https://job-boards.greenhouse.io/lucidmotors/jobs/5279891007
  - URL changed: https://job-boards.greenhouse.io/samsara/jobs/8162034
  - URL changed: https://job-boards.greenhouse.io/sumup/jobs/8923317002
  - URL changed: https://job-boards.greenhouse.io/asana/jobs/8092044
  - URL changed: https://job-boards.greenhouse.io/circleci/jobs/8881662002
  - URL changed: https://job-boards.greenhouse.io/cockroachlabs/jobs/8079608
  - URL changed: https://job-boards.greenhouse.io/coreweave/jobs/4717065006
  - URL changed: https://job-boards.greenhouse.io/fireblocks/jobs/4688774006
  - URL changed: https://job-boards.greenhouse.io/billcom/jobs/5554066004
  - URL changed: https://job-boards.greenhouse.io/databricks/jobs/8880398002
  - URL changed: https://job-boards.greenhouse.io/druva/jobs/8908468002
  - URL changed: https://job-boards.greenhouse.io/esri/jobs/5067174007
  - URL changed: https://job-boards.greenhouse.io/fastly/jobs/8264992
  - URL changed: https://job-boards.greenhouse.io/five9/jobs/6123417004
  - URL changed: https://job-boards.greenhouse.io/imply/jobs/6558076003
  - URL changed: https://job-boards.greenhouse.io/zoominfo/jobs/8888418002
  - URL changed: https://job-boards.greenhouse.io/asana/jobs/8305286
  - URL changed: https://job-boards.greenhouse.io/betterment/jobs/8246279
  - URL changed: https://job-boards.greenhouse.io/databricks/jobs/8805655002
  - URL changed: https://job-boards.greenhouse.io/druva/jobs/7727374002
  - URL changed: https://job-boards.greenhouse.io/esri/jobs/5259316007
  - URL changed: https://job-boards.greenhouse.io/fastly/jobs/8105433
  - URL changed: https://job-boards.greenhouse.io/five9/jobs/6105888004
  - URL changed: https://job-boards.greenhouse.io/imply/jobs/7590615003
  - URL changed: https://job-boards.greenhouse.io/sumup/jobs/8507799002
  - URL changed: https://job-boards.greenhouse.io/billcom/jobs/6233809004
  - URL changed: https://job-boards.greenhouse.io/databricks/jobs/6918763002
  - URL changed: https://job-boards.greenhouse.io/druva/jobs/8858480002
  - URL changed: https://job-boards.greenhouse.io/esri/jobs/5253674007
  - URL changed: https://job-boards.greenhouse.io/five9/jobs/6199392004
  - URL changed: https://job-boards.greenhouse.io/imply/jobs/6498668003
  - URL changed: https://job-boards.greenhouse.io/zoominfo/jobs/7940411002
  - URL changed: https://job-boards.greenhouse.io/billcom/jobs/6221603004
  - URL changed: https://job-boards.greenhouse.io/databricks/jobs/8758263002
  - URL changed: https://job-boards.greenhouse.io/druva/jobs/8811603002
  - URL changed: https://job-boards.greenhouse.io/esri/jobs/5199110007
  - URL changed: https://job-boards.greenhouse.io/five9/jobs/4137873004
  - URL changed: https://job-boards.greenhouse.io/imply/jobs/6623406003
  - URL changed: https://job-boards.greenhouse.io/lucidmotors/jobs/4838992007
  - URL changed: https://job-boards.greenhouse.io/samsara/jobs/8359124
  - URL changed: https://job-boards.greenhouse.io/sumup/jobs/8907622002
  - URL changed: https://job-boards.greenhouse.io/zoominfo/jobs/8687545002
  - URL changed: https://job-boards.greenhouse.io/asana/jobs/8177854
  - URL changed: https://job-boards.greenhouse.io/circleci/jobs/8770550002
  - URL changed: https://job-boards.greenhouse.io/cockroachlabs/jobs/8209735
  - URL changed: https://job-boards.greenhouse.io/coreweave/jobs/4725626006
  - URL changed: https://job-boards.greenhouse.io/fireblocks/jobs/4701715006
  - URL changed: https://job-boards.greenhouse.io/samsara/jobs/8304638
  - URL changed: https://job-boards.greenhouse.io/sumup/jobs/8644734002

## Accuracy (see WRONG.md)

Filled fields judged: 13140. Correct **12780** (97.3%), wrong **2** (0.0%), unclear 358 (132 unique pairs, listed in UNCLEAR.md).

## Per company (filled forms)

| Company | Forms | Fields | Filled | Needs user | Required left | Ready |
|---|---:|---:|---:|---:|---:|---:|
| ashby:1password | 4 | 115 | 51 | 12 | 8 | 0 |
| ashby:abridge | 4 | 81 | 28 | 7 | 7 | 0 |
| ashby:acorns | 4 | 57 | 40 | 1 | 1 | 3 |
| ashby:airbyte | 4 | 26 | 23 | 3 | 3 | 1 |
| ashby:airwallex | 4 | 52 | 39 | 3 | 2 | 2 |
| ashby:alan | 4 | 67 | 36 | 7 | 3 | 2 |
| ashby:alchemy | 4 | 37 | 25 | 2 | 2 | 3 |
| ashby:alephalpha | 2 | 44 | 14 | 2 | 2 | 0 |
| ashby:amplitude | 4 | 27 | 22 | 0 | 0 | 4 |
| ashby:andela | 4 | 16 | 16 | 0 | 0 | 4 |
| ashby:anyscale | 4 | 56 | 38 | 2 | 0 | 4 |
| ashby:ashby | 4 | 40 | 16 | 12 | 12 | 0 |
| ashby:atlan | 4 | 60 | 37 | 7 | 7 | 0 |
| ashby:babbel | 4 | 32 | 28 | 4 | 4 | 3 |
| ashby:backmarket | 4 | 72 | 30 | 14 | 14 | 0 |
| ashby:benchling | 4 | 58 | 28 | 14 | 6 | 0 |
| ashby:benevity | 4 | 32 | 24 | 3 | 0 | 4 |
| ashby:cerebras | 4 | 30 | 20 | 3 | 3 | 3 |
| ashby:circle | 3 | 19 | 15 | 0 | 0 | 3 |
| ashby:clearco | 4 | 24 | 20 | 4 | 4 | 0 |
| ashby:clerk | 2 | 12 | 7 | 0 | 0 | 2 |
| ashby:clickhouse | 4 | 27 | 22 | 2 | 2 | 2 |
| ashby:clickup | 4 | 32 | 22 | 6 | 6 | 0 |
| ashby:cognition | 4 | 28 | 24 | 0 | 0 | 4 |
| ashby:cohere | 4 | 50 | 24 | 4 | 4 | 2 |
| ashby:dave | 4 | 60 | 21 | 5 | 5 | 1 |
| ashby:deepl | 4 | 76 | 29 | 19 | 7 | 0 |
| ashby:docker | 4 | 36 | 20 | 4 | 4 | 0 |
| ashby:doctolib | 4 | 36 | 23 | 1 | 1 | 3 |
| ashby:drata | 4 | 32 | 28 | 4 | 4 | 0 |
| ashby:elevenlabs | 4 | 43 | 18 | 1 | 1 | 3 |
| ashby:epidemic-sound | 4 | 20 | 20 | 0 | 0 | 4 |
| ashby:faculty | 4 | 40 | 26 | 9 | 9 | 3 |
| ashby:farfetch | 4 | 58 | 36 | 3 | 1 | 3 |
| ashby:fullstory | 4 | 40 | 25 | 6 | 2 | 2 |
| ashby:gainsight | 4 | 36 | 26 | 2 | 2 | 2 |
| ashby:gorgias | 4 | 20 | 16 | 0 | 0 | 4 |
| ashby:harvey | 4 | 47 | 36 | 2 | 1 | 3 |
| ashby:helpscout | 4 | 63 | 31 | 6 | 6 | 0 |
| ashby:hex | 4 | 40 | 23 | 3 | 3 | 3 |
| ashby:hopper | 4 | 53 | 20 | 6 | 6 | 2 |
| ashby:illumio | 4 | 52 | 28 | 8 | 4 | 0 |
| ashby:improbable | 4 | 42 | 34 | 0 | 0 | 4 |
| ashby:influxdata | 4 | 28 | 16 | 4 | 4 | 0 |
| ashby:insitro | 4 | 32 | 20 | 4 | 4 | 1 |
| ashby:iterable | 4 | 41 | 32 | 4 | 0 | 4 |
| ashby:koho | 4 | 46 | 16 | 9 | 9 | 0 |
| ashby:kong | 4 | 40 | 28 | 4 | 4 | 0 |
| ashby:kustomer | 1 | 8 | 5 | 2 | 1 | 0 |
| ashby:lambda | 4 | 45 | 28 | 2 | 2 | 3 |
| ashby:langchain | 4 | 22 | 20 | 1 | 1 | 3 |
| ashby:ledger | 4 | 24 | 20 | 0 | 0 | 4 |
| ashby:lightspeed | 4 | 16 | 16 | 0 | 0 | 4 |
| ashby:linear | 4 | 49 | 26 | 12 | 12 | 0 |
| ashby:llamaindex | 3 | 22 | 12 | 1 | 1 | 2 |
| ashby:magic | 4 | 30 | 17 | 5 | 5 | 0 |
| ashby:mapbox | 4 | 52 | 27 | 8 | 0 | 4 |
| ashby:marshmallow | 4 | 54 | 27 | 12 | 4 | 0 |
| ashby:mintlify | 4 | 28 | 19 | 4 | 3 | 1 |
| ashby:miro | 4 | 59 | 21 | 6 | 6 | 1 |
| ashby:modal | 4 | 15 | 14 | 0 | 0 | 4 |
| ashby:mollie | 4 | 35 | 27 | 6 | 2 | 2 |
| ashby:moneybox | 3 | 61 | 37 | 10 | 10 | 0 |
| ashby:notion | 4 | 57 | 24 | 5 | 1 | 3 |
| ashby:nubank | 4 | 44 | 27 | 5 | 0 | 4 |
| ashby:openai | 4 | 104 | 29 | 3 | 3 | 1 |
| ashby:oyster | 4 | 96 | 20 | 23 | 19 | 0 |
| ashby:paddle | 4 | 31 | 27 | 0 | 0 | 4 |
| ashby:patreon | 4 | 40 | 28 | 0 | 0 | 4 |
| ashby:perplexity | 4 | 32 | 20 | 12 | 12 | 0 |
| ashby:pinecone | 4 | 39 | 24 | 9 | 1 | 3 |
| ashby:plaid | 4 | 136 | 40 | 0 | 0 | 4 |
| ashby:pleo | 4 | 48 | 31 | 13 | 9 | 0 |
| ashby:poolside | 3 | 18 | 15 | 0 | 0 | 3 |
| ashby:poshmark | 4 | 28 | 25 | 0 | 0 | 4 |
| ashby:primer | 4 | 87 | 23 | 14 | 14 | 0 |
| ashby:qonto | 4 | 67 | 31 | 12 | 9 | 0 |
| ashby:quora | 4 | 113 | 41 | 9 | 2 | 3 |
| ashby:railway | 4 | 16 | 12 | 4 | 4 | 0 |
| ashby:ramp | 3 | 37 | 16 | 10 | 10 | 0 |
| ashby:redis | 4 | 26 | 21 | 1 | 1 | 3 |
| ashby:render | 4 | 43 | 35 | 1 | 1 | 3 |
| ashby:replit | 4 | 56 | 32 | 9 | 9 | 0 |
| ashby:resend | 4 | 44 | 28 | 8 | 8 | 0 |
| ashby:rohlik | 4 | 24 | 20 | 0 | 0 | 4 |
| ashby:runway | 2 | 10 | 6 | 0 | 0 | 2 |
| ashby:satispay | 4 | 143 | 25 | 9 | 5 | 1 |
| ashby:sentry | 4 | 44 | 32 | 6 | 2 | 2 |
| ashby:skydio | 4 | 24 | 20 | 0 | 0 | 4 |
| ashby:snowflake | 4 | 47 | 24 | 4 | 4 | 0 |
| ashby:snyk | 4 | 40 | 32 | 0 | 0 | 4 |
| ashby:sorare | 2 | 20 | 12 | 2 | 0 | 2 |
| ashby:strava | 4 | 39 | 28 | 3 | 3 | 3 |
| ashby:substack | 4 | 24 | 17 | 2 | 2 | 2 |
| ashby:supabase | 4 | 44 | 25 | 11 | 8 | 0 |
| ashby:surveymonkey | 4 | 46 | 38 | 4 | 0 | 4 |
| ashby:synthesia | 4 | 34 | 24 | 4 | 4 | 1 |
| ashby:temporal | 4 | 69 | 39 | 1 | 1 | 3 |
| ashby:thinkific | 2 | 18 | 10 | 3 | 3 | 0 |
| ashby:thought-machine | 4 | 36 | 28 | 0 | 0 | 4 |
| ashby:thumbtack | 4 | 40 | 23 | 0 | 0 | 4 |
| ashby:tractable | 4 | 24 | 20 | 0 | 4 | 0 |
| ashby:uipath | 4 | 44 | 28 | 0 | 0 | 4 |
| ashby:vanta | 4 | 44 | 37 | 3 | 3 | 3 |
| ashby:watershed | 4 | 33 | 19 | 10 | 7 | 1 |
| ashby:wayve | 4 | 38 | 35 | 0 | 0 | 4 |
| ashby:wealthsimple | 4 | 66 | 33 | 10 | 10 | 0 |
| ashby:weaviate | 2 | 13 | 13 | 0 | 0 | 2 |
| ashby:webflow | 4 | 45 | 28 | 0 | 0 | 4 |
| ashby:whoop | 4 | 56 | 35 | 2 | 2 | 2 |
| ashby:writer | 4 | 36 | 24 | 8 | 8 | 0 |
| ashby:xero | 4 | 60 | 24 | 8 | 4 | 0 |
| ashby:zapier | 4 | 71 | 39 | 19 | 15 | 0 |
| bamboohr:adistec | 3 | 43 | 21 | 6 | 3 | 1 |
| bamboohr:aterlo | 1 | 13 | 8 | 1 | 0 | 1 |
| bamboohr:birchesgroup | 3 | 40 | 23 | 2 | 2 | 2 |
| bamboohr:corcym | 4 | 49 | 29 | 2 | 0 | 4 |
| bamboohr:couples | 3 | 80 | 25 | 10 | 2 | 1 |
| bamboohr:eastlandfood | 2 | 26 | 18 | 0 | 0 | 2 |
| bamboohr:familiesforvaccines | 1 | 13 | 8 | 2 | 2 | 0 |
| bamboohr:familypromiseofspokane | 3 | 37 | 22 | 1 | 1 | 2 |
| bamboohr:flsgroup | 1 | 12 | 7 | 1 | 0 | 1 |
| bamboohr:flynn | 1 | 12 | 7 | 1 | 1 | 0 |
| bamboohr:hinterlandgroup | 2 | 37 | 17 | 2 | 2 | 1 |
| bamboohr:hsvarc | 2 | 36 | 17 | 4 | 0 | 2 |
| bamboohr:icmarkets | 4 | 74 | 37 | 9 | 8 | 0 |
| bamboohr:icmarketsglobal | 4 | 52 | 30 | 2 | 0 | 4 |
| bamboohr:latigobio | 3 | 42 | 24 | 4 | 4 | 0 |
| bamboohr:maplr | 4 | 81 | 28 | 16 | 12 | 0 |
| bamboohr:nexii | 4 | 52 | 29 | 5 | 1 | 3 |
| bamboohr:otstaffing | 3 | 27 | 21 | 0 | 0 | 3 |
| bamboohr:royal | 3 | 45 | 24 | 6 | 6 | 0 |
| bamboohr:storeforce | 4 | 71 | 32 | 16 | 13 | 0 |
| bamboohr:totalps | 2 | 24 | 16 | 0 | 0 | 2 |
| bamboohr:verastem | 3 | 48 | 32 | 0 | 0 | 3 |
| bamboohr:waycrosse | 3 | 63 | 33 | 8 | 8 | 0 |
| breezy:aimpoint-digital | 4 | 30 | 16 | 1 | 1 | 3 |
| breezy:bear-robotics | 4 | 39 | 18 | 6 | 6 | 3 |
| breezy:beex | 4 | 25 | 16 | 3 | 3 | 1 |
| breezy:helpware-inc | 4 | 49 | 19 | 7 | 4 | 1 |
| breezy:inallmedia-llc | 4 | 94 | 24 | 40 | 40 | 0 |
| breezy:north-wind-group | 4 | 35 | 16 | 1 | 2 | 3 |
| breezy:prime-philippines | 4 | 28 | 16 | 1 | 1 | 3 |
| breezy:prolift-rigging | 4 | 88 | 36 | 21 | 22 | 1 |
| breezy:segal-mccambridge | 4 | 46 | 19 | 3 | 7 | 0 |
| breezy:small-batch-standard | 2 | 28 | 12 | 14 | 14 | 0 |
| breezy:social-discovery-ventures | 4 | 25 | 14 | 7 | 7 | 0 |
| breezy:spark-power | 4 | 56 | 16 | 16 | 17 | 0 |
| breezy:t3-services-group | 2 | 26 | 13 | 3 | 3 | 1 |
| breezy:taqar-consulting-co-l-l-c | 4 | 29 | 16 | 4 | 4 | 0 |
| breezy:totalsecurityltd | 4 | 49 | 17 | 19 | 19 | 0 |
| breezy:vagaro | 4 | 65 | 25 | 20 | 22 | 0 |
| breezy:wealthy-recruiting | 4 | 40 | 16 | 12 | 12 | 0 |
| breezy:zeno-power | 4 | 95 | 36 | 44 | 45 | 0 |
| breezy:zero-hash | 4 | 42 | 24 | 6 | 6 | 0 |
| greenhouse:abnormalsecurity | 4 | 86 | 48 | 18 | 30 | 0 |
| greenhouse:adyen | 3 | 51 | 23 | 23 | 18 | 0 |
| greenhouse:affirm | 4 | 86 | 58 | 3 | 8 | 0 |
| greenhouse:agoda | 4 | 79 | 39 | 26 | 32 | 0 |
| greenhouse:airbnb | 4 | 76 | 49 | 19 | 21 | 0 |
| greenhouse:airtable | 4 | 66 | 49 | 9 | 8 | 0 |
| greenhouse:algolia | 4 | 92 | 67 | 13 | 16 | 0 |
| greenhouse:anthropic | 4 | 88 | 50 | 27 | 24 | 0 |
| greenhouse:apolloio | 4 | 58 | 45 | 10 | 8 | 0 |
| greenhouse:appier | 4 | 39 | 35 | 0 | 0 | 4 |
| greenhouse:appsflyer | 3 | 33 | 18 | 4 | 4 | 0 |
| greenhouse:asana | 4 | 99 | 58 | 29 | 25 | 0 |
| greenhouse:attentive | 4 | 72 | 48 | 8 | 8 | 0 |
| greenhouse:backblaze | 4 | 53 | 41 | 4 | 4 | 0 |
| greenhouse:bandwidth | 4 | 59 | 53 | 2 | 2 | 3 |
| greenhouse:betterment | 4 | 83 | 56 | 15 | 15 | 0 |
| greenhouse:billcom | 4 | 86 | 68 | 13 | 13 | 0 |
| greenhouse:bird | 4 | 46 | 28 | 13 | 13 | 0 |
| greenhouse:block | 4 | 130 | 70 | 40 | 41 | 0 |
| greenhouse:blockchain | 4 | 46 | 32 | 6 | 6 | 0 |
| greenhouse:branch | 2 | 30 | 26 | 2 | 2 | 0 |
| greenhouse:braze | 4 | 72 | 53 | 8 | 8 | 0 |
| greenhouse:brex | 4 | 100 | 50 | 24 | 27 | 0 |
| greenhouse:c6bank | 4 | 100 | 36 | 45 | 45 | 0 |
| greenhouse:cabify | 4 | 63 | 32 | 28 | 31 | 0 |
| greenhouse:calendly | 4 | 87 | 56 | 27 | 27 | 0 |
| greenhouse:calm | 1 | 25 | 18 | 6 | 5 | 0 |
| greenhouse:careem | 4 | 82 | 52 | 21 | 25 | 0 |
| greenhouse:carta | 4 | 68 | 56 | 4 | 4 | 0 |
| greenhouse:celonis | 4 | 89 | 55 | 17 | 15 | 0 |
| greenhouse:checkr | 4 | 59 | 47 | 4 | 4 | 0 |
| greenhouse:chime | 4 | 88 | 68 | 16 | 16 | 0 |
| greenhouse:circleci | 4 | 75 | 48 | 20 | 20 | 0 |
| greenhouse:cleo | 4 | 75 | 51 | 14 | 11 | 0 |
| greenhouse:cloudflare | 4 | 63 | 48 | 9 | 9 | 0 |
| greenhouse:cockroachlabs | 4 | 89 | 71 | 6 | 6 | 1 |
| greenhouse:cognite | 4 | 61 | 46 | 7 | 7 | 1 |
| greenhouse:commercetools | 4 | 75 | 57 | 14 | 14 | 0 |
| greenhouse:consensys | 4 | 66 | 37 | 25 | 25 | 0 |
| greenhouse:contentful | 4 | 52 | 33 | 10 | 10 | 0 |
| greenhouse:coreweave | 4 | 102 | 67 | 24 | 20 | 0 |
| greenhouse:coursera | 4 | 71 | 46 | 17 | 17 | 0 |
| greenhouse:cresta | 4 | 49 | 39 | 2 | 2 | 3 |
| greenhouse:cribl | 4 | 68 | 53 | 8 | 8 | 0 |
| greenhouse:cultureamp | 3 | 66 | 56 | 4 | 4 | 0 |
| greenhouse:databricks | 4 | 73 | 46 | 19 | 19 | 0 |
| greenhouse:datadog | 3 | 51 | 32 | 16 | 16 | 0 |
| greenhouse:dataiku | 4 | 83 | 58 | 17 | 17 | 0 |
| greenhouse:dcard | 4 | 54 | 22 | 12 | 14 | 0 |
| greenhouse:deliveroo | 3 | 34 | 25 | 7 | 7 | 0 |
| greenhouse:dialpad | 4 | 78 | 59 | 8 | 7 | 0 |
| greenhouse:discord | 4 | 106 | 80 | 15 | 15 | 0 |
| greenhouse:dremio | 4 | 69 | 54 | 7 | 7 | 0 |
| greenhouse:druva | 4 | 61 | 47 | 4 | 4 | 1 |
| greenhouse:duolingo | 4 | 58 | 30 | 17 | 17 | 0 |
| greenhouse:ebanx | 4 | 82 | 55 | 22 | 21 | 0 |
| greenhouse:esri | 4 | 68 | 48 | 16 | 4 | 0 |
| greenhouse:eucalyptus | 4 | 59 | 37 | 21 | 21 | 0 |
| greenhouse:faire | 4 | 75 | 48 | 12 | 16 | 0 |
| greenhouse:fastly | 4 | 79 | 62 | 10 | 7 | 0 |
| greenhouse:figma | 4 | 72 | 53 | 12 | 12 | 0 |
| greenhouse:figureai | 4 | 41 | 36 | 0 | 0 | 4 |
| greenhouse:fireblocks | 4 | 46 | 38 | 2 | 2 | 2 |
| greenhouse:five9 | 4 | 65 | 43 | 6 | 8 | 0 |
| greenhouse:fivetran | 4 | 93 | 48 | 30 | 30 | 0 |
| greenhouse:flatironhealth | 4 | 97 | 60 | 30 | 30 | 0 |
| greenhouse:flexport | 4 | 59 | 46 | 4 | 8 | 0 |
| greenhouse:formlabs | 4 | 62 | 48 | 8 | 9 | 0 |
| greenhouse:gemini | 4 | 67 | 51 | 8 | 8 | 0 |
| greenhouse:ginkgobioworks | 4 | 84 | 48 | 16 | 20 | 0 |
| greenhouse:gitlab | 3 | 56 | 37 | 5 | 8 | 0 |
| greenhouse:glance | 4 | 65 | 50 | 9 | 7 | 2 |
| greenhouse:gocardless | 4 | 83 | 56 | 18 | 17 | 0 |
| greenhouse:grafanalabs | 4 | 64 | 57 | 7 | 7 | 1 |
| greenhouse:graphcore | 4 | 79 | 50 | 19 | 23 | 1 |
| greenhouse:greenhouse | 4 | 108 | 63 | 37 | 37 | 0 |
| greenhouse:groww | 4 | 52 | 44 | 8 | 8 | 0 |
| greenhouse:gusto | 4 | 96 | 84 | 8 | 8 | 0 |
| greenhouse:gympass | 4 | 143 | 39 | 71 | 65 | 0 |
| greenhouse:gymshark | 4 | 89 | 58 | 22 | 24 | 0 |
| greenhouse:honeycomb | 4 | 74 | 57 | 8 | 4 | 0 |
| greenhouse:hootsuite | 4 | 103 | 59 | 30 | 31 | 0 |
| greenhouse:housinganywhere | 3 | 39 | 28 | 7 | 7 | 0 |
| greenhouse:imply | 4 | 55 | 44 | 3 | 3 | 2 |
| greenhouse:inflectionai | 4 | 68 | 52 | 0 | 0 | 4 |
| greenhouse:inmobi | 4 | 54 | 40 | 11 | 11 | 1 |
| greenhouse:instacart | 4 | 86 | 69 | 13 | 13 | 0 |
| greenhouse:inter | 4 | 132 | 44 | 76 | 80 | 0 |
| greenhouse:intercom | 4 | 103 | 50 | 28 | 36 | 0 |
| greenhouse:isaraerospace | 4 | 68 | 37 | 21 | 23 | 0 |
| greenhouse:jetbrains | 4 | 51 | 35 | 3 | 8 | 0 |
| greenhouse:jumia | 3 | 29 | 22 | 1 | 1 | 2 |
| greenhouse:justworks | 4 | 100 | 72 | 24 | 24 | 0 |
| greenhouse:khanacademy | 3 | 73 | 42 | 14 | 16 | 0 |
| greenhouse:klaviyo | 4 | 78 | 47 | 17 | 12 | 0 |
| greenhouse:komodohealth | 4 | 70 | 51 | 12 | 12 | 0 |
| greenhouse:krafton | 4 | 65 | 24 | 13 | 29 | 0 |
| greenhouse:labelbox | 4 | 56 | 40 | 8 | 8 | 0 |
| greenhouse:lattice | 2 | 42 | 26 | 12 | 10 | 0 |
| greenhouse:launchdarkly | 4 | 99 | 62 | 16 | 10 | 0 |
| greenhouse:lightmatter | 4 | 106 | 83 | 12 | 12 | 0 |
| greenhouse:lovable | 4 | 50 | 36 | 4 | 4 | 2 |
| greenhouse:lucidmotors | 4 | 98 | 67 | 15 | 15 | 1 |
| greenhouse:luno | 2 | 42 | 22 | 18 | 18 | 0 |
| greenhouse:lyft | 4 | 115 | 29 | 53 | 64 | 0 |
| greenhouse:medium | 3 | 67 | 39 | 19 | 19 | 0 |
| greenhouse:mentimeter | 4 | 56 | 33 | 17 | 19 | 0 |
| greenhouse:mercury | 4 | 60 | 36 | 8 | 8 | 0 |
| greenhouse:mirakl | 4 | 67 | 40 | 19 | 18 | 0 |
| greenhouse:mixpanel | 4 | 96 | 67 | 4 | 8 | 0 |
| greenhouse:mongodb | 3 | 75 | 46 | 8 | 11 | 0 |
| greenhouse:moniepoint | 4 | 51 | 37 | 8 | 8 | 1 |
| greenhouse:monzo | 4 | 87 | 58 | 11 | 15 | 0 |
| greenhouse:n26 | 4 | 66 | 48 | 13 | 13 | 0 |
| greenhouse:neo4j | 4 | 67 | 34 | 18 | 18 | 1 |
| greenhouse:netlify | 4 | 99 | 44 | 46 | 37 | 0 |
| greenhouse:netskope | 4 | 12 | 0 | 0 | 0 | 4 |
| greenhouse:newrelic | 4 | 70 | 50 | 16 | 16 | 0 |
| greenhouse:nextdoor | 4 | 61 | 40 | 8 | 9 | 0 |
| greenhouse:nice | 4 | 46 | 34 | 7 | 7 | 1 |
| greenhouse:nuro | 4 | 4 | 4 | 0 | 0 | 4 |
| greenhouse:oura | 4 | 78 | 63 | 7 | 7 | 0 |
| greenhouse:pagerduty | 4 | 58 | 46 | 8 | 8 | 0 |
| greenhouse:paypay | 4 | 49 | 22 | 15 | 15 | 0 |
| greenhouse:pendo | 4 | 62 | 49 | 5 | 9 | 0 |
| greenhouse:planetscale | 4 | 41 | 33 | 1 | 1 | 3 |
| greenhouse:polyai | 3 | 62 | 41 | 13 | 8 | 0 |
| greenhouse:porter | 4 | 4 | 4 | 0 | 0 | 4 |
| greenhouse:purestorage | 4 | 73 | 54 | 9 | 10 | 0 |
| greenhouse:quintoandar | 4 | 116 | 38 | 44 | 61 | 0 |
| greenhouse:raisin | 4 | 57 | 39 | 10 | 10 | 0 |
| greenhouse:ramp | 1 | 24 | 8 | 4 | 1 | 0 |
| greenhouse:realtimeboardglobal | 4 | 73 | 25 | 11 | 11 | 0 |
| greenhouse:reddit | 4 | 87 | 70 | 13 | 11 | 0 |
| greenhouse:riotgames | 4 | 102 | 39 | 48 | 48 | 0 |
| greenhouse:ripple | 4 | 61 | 51 | 2 | 2 | 2 |
| greenhouse:robinhood | 4 | 91 | 57 | 12 | 15 | 1 |
| greenhouse:rocketlab | 4 | 112 | 55 | 44 | 44 | 0 |
| greenhouse:samsara | 4 | 85 | 54 | 20 | 23 | 1 |
| greenhouse:sas | 3 | 60 | 47 | 11 | 11 | 0 |
| greenhouse:scaleai | 4 | 77 | 57 | 5 | 5 | 1 |
| greenhouse:scopely | 4 | 70 | 52 | 8 | 8 | 0 |
| greenhouse:shakepay | 4 | 53 | 35 | 5 | 5 | 0 |
| greenhouse:showpad | 4 | 51 | 42 | 5 | 5 | 1 |
| greenhouse:sigmacomputing | 4 | 72 | 49 | 14 | 16 | 0 |
| greenhouse:singlestore | 4 | 83 | 58 | 9 | 3 | 2 |
| greenhouse:slice | 4 | 44 | 32 | 5 | 5 | 1 |
| greenhouse:smartsheet | 4 | 101 | 75 | 20 | 19 | 0 |
| greenhouse:snorkelai | 4 | 75 | 58 | 9 | 9 | 0 |
| greenhouse:solarisbank | 3 | 36 | 27 | 9 | 9 | 0 |
| greenhouse:spacex | 4 | 110 | 60 | 30 | 36 | 0 |
| greenhouse:sproutsocial | 4 | 80 | 54 | 16 | 21 | 0 |
| greenhouse:squarespace | 3 | 78 | 42 | 24 | 27 | 0 |
| greenhouse:stabilityai | 1 | 3 | 0 | 0 | 0 | 1 |
| greenhouse:stackblitz | 4 | 82 | 52 | 18 | 18 | 0 |
| greenhouse:staffbase | 4 | 66 | 33 | 20 | 20 | 0 |
| greenhouse:starburst | 4 | 69 | 52 | 9 | 9 | 0 |
| greenhouse:stockx | 4 | 66 | 40 | 14 | 14 | 0 |
| greenhouse:stone | 4 | 105 | 32 | 49 | 49 | 0 |
| greenhouse:storyblok | 4 | 72 | 36 | 32 | 32 | 0 |
| greenhouse:stripe | 4 | 4 | 0 | 0 | 0 | 4 |
| greenhouse:sumologic | 4 | 50 | 42 | 4 | 4 | 0 |
| greenhouse:sumup | 4 | 47 | 30 | 11 | 11 | 1 |
| greenhouse:tailscale | 4 | 87 | 46 | 33 | 33 | 0 |
| greenhouse:tamara | 4 | 64 | 33 | 30 | 30 | 0 |
| greenhouse:tanium | 4 | 89 | 62 | 18 | 18 | 0 |
| greenhouse:taskrabbit | 4 | 73 | 58 | 11 | 11 | 0 |
| greenhouse:tenstorrent | 4 | 53 | 41 | 4 | 4 | 0 |
| greenhouse:toast | 4 | 59 | 37 | 16 | 16 | 0 |
| greenhouse:togetherai | 4 | 80 | 61 | 6 | 6 | 1 |
| greenhouse:tripactions | 4 | 72 | 49 | 15 | 15 | 0 |
| greenhouse:truelayer | 4 | 83 | 51 | 26 | 25 | 0 |
| greenhouse:trustpilot | 4 | 50 | 25 | 20 | 19 | 1 |
| greenhouse:turing | 4 | 42 | 37 | 3 | 3 | 2 |
| greenhouse:twilio | 4 | 76 | 56 | 16 | 16 | 0 |
| greenhouse:twitch | 4 | 148 | 56 | 67 | 59 | 0 |
| greenhouse:typeface | 4 | 52 | 40 | 6 | 6 | 0 |
| greenhouse:typeform | 4 | 57 | 36 | 13 | 9 | 0 |
| greenhouse:upwork | 4 | 60 | 42 | 11 | 12 | 0 |
| greenhouse:vercel | 4 | 94 | 65 | 15 | 19 | 0 |
| greenhouse:veriff | 4 | 50 | 35 | 8 | 8 | 1 |
| greenhouse:verkada | 4 | 45 | 37 | 1 | 1 | 3 |
| greenhouse:vonage | 4 | 53 | 38 | 12 | 12 | 0 |
| greenhouse:vtex | 4 | 83 | 50 | 30 | 30 | 0 |
| greenhouse:wallapop | 4 | 58 | 36 | 15 | 15 | 0 |
| greenhouse:warp | 4 | 64 | 45 | 12 | 12 | 0 |
| greenhouse:wasabi | 4 | 72 | 65 | 3 | 3 | 1 |
| greenhouse:wildlifestudios | 4 | 73 | 57 | 11 | 14 | 0 |
| greenhouse:wise | 2 | 38 | 26 | 8 | 8 | 0 |
| greenhouse:wolt | 4 | 54 | 32 | 18 | 18 | 0 |
| greenhouse:workato | 4 | 63 | 42 | 17 | 17 | 0 |
| greenhouse:xai | 4 | 105 | 56 | 36 | 33 | 0 |
| greenhouse:xendit | 4 | 56 | 36 | 16 | 16 | 0 |
| greenhouse:yugabyte | 4 | 72 | 60 | 2 | 2 | 2 |
| greenhouse:zocdoc | 4 | 66 | 52 | 10 | 10 | 0 |
| greenhouse:zoominfo | 4 | 71 | 61 | 4 | 4 | 0 |
| greenhouse:zscaler | 4 | 97 | 59 | 22 | 22 | 0 |
| recruitee:aikidosecurity | 4 | 24 | 17 | 3 | 3 | 2 |
| recruitee:aubay | 4 | 37 | 16 | 11 | 11 | 0 |
| recruitee:hardrockdigital | 4 | 35 | 18 | 9 | 9 | 0 |
| recruitee:hostpointag | 3 | 29 | 15 | 3 | 3 | 0 |
| recruitee:partejobs | 4 | 25 | 16 | 1 | 1 | 3 |
| recruitee:snapsoft | 4 | 45 | 22 | 12 | 12 | 2 |
| recruitee:swordtechnologies | 4 | 28 | 16 | 4 | 4 | 0 |
| workable:blue-nile | 4 | 56 | 20 | 16 | 16 | 0 |
| workable:culligan-uk-limited | 3 | 34 | 15 | 8 | 8 | 0 |
| workable:export-development-canada | 2 | 16 | 10 | 2 | 2 | 0 |
| workable:fundingsocieties | 4 | 41 | 24 | 9 | 9 | 0 |
| workable:hudabeauty | 4 | 45 | 24 | 13 | 13 | 0 |
| workable:interpath-advisory | 4 | 43 | 23 | 8 | 8 | 1 |
| workable:jolera | 3 | 40 | 18 | 7 | 7 | 0 |
| workable:lamour | 4 | 32 | 20 | 2 | 2 | 3 |
| workable:libertex-europe | 4 | 38 | 20 | 4 | 4 | 0 |
| workable:luxasia | 4 | 39 | 22 | 10 | 10 | 2 |
| workable:orfium | 4 | 34 | 21 | 8 | 9 | 0 |
| workable:our-future-health | 4 | 37 | 23 | 4 | 4 | 1 |
| workable:pearltalent | 1 | 8 | 1 | 2 | 2 | 0 |
| workable:porsche-asia-pacific | 4 | 38 | 20 | 7 | 7 | 0 |
| workable:prominence-advisors | 4 | 39 | 20 | 19 | 19 | 0 |
| workable:swtch-energy | 4 | 50 | 24 | 18 | 18 | 0 |
| workable:the-pod-group | 4 | 36 | 20 | 10 | 10 | 0 |
| workable:weekday-1 | 4 | 28 | 20 | 0 | 8 | 0 |
| workable:workana-premium | 4 | 35 | 20 | 7 | 7 | 0 |
| workable:xtremax-pte-ltd | 4 | 39 | 23 | 8 | 8 | 0 |

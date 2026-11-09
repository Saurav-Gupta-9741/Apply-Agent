# Live run statistics (1319 forms)

Generated 2026-11-08T01:03:57.367Z from results-a.jsonl, results-b.jsonl by `scripts/live1000-audit.mjs`. The run is still growing: re-run the script.

## Forms

| Outcome | Forms | Share |
|---|---:|---:|
| filled | 1198 | 90.8% |
| no_form | 73 | 5.5% |
| robot_check | 28 | 2.1% |
| closed | 16 | 1.2% |
| error | 4 | 0.3% |

| Platform | filled | no_form | robot_check | closed | error |
|---|---:|---:|---:|---:|---:|
| greenhouse | 763 | 72 | 28 | 2 | 4 |
| ashby | 435 | 1 | 0 | 14 | 0 |

Filled forms: **1198**. Ready to submit (nothing left for the user): **276** (23.0%); needing the user: **922**. Run status: needs_user 922, ready_to_submit 276.

Errors:
- 4 × page.goto: net::ERR_HTTP2_PROTOCOL_ERROR at https://job-boards.greenhouse.io/rob

## Fields

Fields on filled forms: **18993** (15.9 per form).

| Status | Fields | Share |
|---|---:|---:|
| filled | 11551 | 60.8% |
| needs_user | 3943 | 20.8% |
| skipped | 3106 | 16.4% |
| failed | 375 | 2.0% |
| already_filled | 18 | 0.1% |

- Filled by the extension: **60.8%** of all fields.
- Required fields: 11969; filled 8160; **left for the user: 3809 (31.8%)**.

| Decision | Fields | filled | needs_user | failed | skipped | already_filled |
|---|---:|---:|---:|---:|---:|---:|
| profile | 7983 | 7788 | 0 | 195 | 0 | 0 |
| ask | 4028 | 0 | 3943 | 0 | 84 | 1 |
| skip | 3039 | 0 | 0 | 0 | 3022 | 17 |
| answer | 2762 | 2582 | 0 | 180 | 0 | 0 |
| resume | 1181 | 1181 | 0 | 0 | 0 | 0 |

## Asks (fields left for the user), by reason / topic (top 30)

| Topic | All | Required |
|---|---:|---:|
| unknown | 2352 | 2351 |
| work_authorization | 370 | 326 |
| sponsorship | 348 | 285 |
| consent | 345 | 241 |
| salary | 136 | 106 |
| notice_period | 123 | 60 |
| relocation | 85 | 61 |
| missing_profile_value | 84 | 84 |
| pronouns | 42 | 0 |
| identity | 36 | 36 |
| accommodation | 29 | 19 |
| age | 13 | 8 |
| criminal | 13 | 13 |
| signature | 12 | 12 |
| race | 12 | 0 |
| disability | 10 | 1 |
| sensitive | 9 | 9 |
| gender | 8 | 0 |
| sexual_orientation | 1 | 0 |

## Skips

| Reason | Fields |
|---|---:|
| optional, not in profile | 1195 |
| optional choice | 964 |
| optional attachment (not your resume) | 711 |
| no portfolio in profile | 77 |
| optional attachment | 34 |
| not sure this saved answer fits: left for you | 34 |
| identity: entered by you only | 16 |
| optional address line 2 empty | 7 |
| no state in profile | 1 |

## Failed fills (decision:key)

| Decision:key (control) | Fields |
|---|---:|
| profile:school (combobox) | 106 |
| answer:How did you hear about this job? (combobox) | 64 |
| answer:Disability status (combobox) | 39 |
| profile:location (combobox) | 32 |
| profile:country (combobox) | 32 |
| answer:Quick answers › expected CTC (combobox) | 11 |
| answer:Veteran status (combobox) | 10 |
| profile:graduationYear (combobox) | 9 |
| answer:How did you hear about this job? (checkbox_group) | 8 |
| answer:Quick answers › relocation (combobox) | 8 |
| answer:Gender (combobox) | 7 |
| answer:Quick answers › onsite (combobox) | 6 |
| answer:Will you now or in the future require visa sponsorship to work in the United States? (combobox) | 6 |
| profile:degree (combobox) | 5 |
| answer:Quick answers › work authorization (combobox) | 4 |
| profile:discipline (combobox) | 4 |
| answer:What is your notice period? (number) | 4 |
| profile:email (combobox) | 3 |
| answer:Quick answers › pronouns (combobox) | 3 |
| answer:Race / Ethnicity (combobox) | 3 |

## Time per form

Median 12s, mean 16.3s, max 130s (all 1319 forms; includes page load, 3s settle and the fill). Filled forms: median 12s.

## Per platform

| Platform | Forms filled | Fields | Filled | Needs user | Failed | Required left | Ready | Median s |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| greenhouse | 763 | 13964 | 8740 (62.6%) | 3355 | 323 | 3382 of 9602 | 64 | 14 |
| ashby | 435 | 5029 | 2811 (55.9%) | 588 | 52 | 427 of 2367 | 212 | 10 |

## Fills the page cleared afterwards

0 text fills on 0 forms were reported filled but were empty when the page was read 0.8 s later (other fills on the same forms were there). By field: . On Greenhouse these are the fields its resume autofill sets (first/last name, email, phone): its parse request is blocked in this run, and the reset arrives after the fill.

## Safety

- Requests blocked by the read-only guard: 14734 on 1290 forms (analytics, consent and tracking beacons).
- Blocked requests that look like application sends (to the ATS, path with appl/submit/candidate): **0**.
- Forms whose URL changed during the fill: **62** (must be 0).
  - URL changed: https://job-boards.greenhouse.io/billcom/jobs/6217056004
  - URL changed: https://job-boards.greenhouse.io/circleci/jobs/8801094002
  - URL changed: https://job-boards.greenhouse.io/cockroachlabs/jobs/8332010
  - URL changed: https://job-boards.greenhouse.io/coreweave/jobs/4718149006
  - URL changed: https://job-boards.greenhouse.io/fireblocks/jobs/4695814006
  - URL changed: https://job-boards.greenhouse.io/lucidmotors/jobs/5093940007
  - URL changed: https://job-boards.greenhouse.io/samsara/jobs/8332753
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
  - URL changed: https://job-boards.greenhouse.io/lucidmotors/jobs/4838992007
  - URL changed: https://job-boards.greenhouse.io/samsara/jobs/8359124
  - URL changed: https://job-boards.greenhouse.io/sumup/jobs/8907622002
  - URL changed: https://job-boards.greenhouse.io/zoominfo/jobs/8687545002
  - URL changed: https://job-boards.greenhouse.io/asana/jobs/8177854
  - URL changed: https://job-boards.greenhouse.io/circleci/jobs/8770550002
  - URL changed: https://job-boards.greenhouse.io/cockroachlabs/jobs/8209735
  - URL changed: https://job-boards.greenhouse.io/coreweave/jobs/4725626006
  - URL changed: https://job-boards.greenhouse.io/fireblocks/jobs/4701715006
  - URL changed: https://job-boards.greenhouse.io/lucidmotors/jobs/5282234007
  - URL changed: https://job-boards.greenhouse.io/samsara/jobs/8304638
  - URL changed: https://job-boards.greenhouse.io/sumup/jobs/8644734002

## Accuracy (see WRONG.md)

Filled fields judged: 11551. Correct **11335** (98.1%), wrong **216** (1.9%), unclear 0 (0 unique pairs, listed in UNCLEAR.md).

## Per company (filled forms)

| Company | Forms | Fields | Filled | Needs user | Required left | Ready |
|---|---:|---:|---:|---:|---:|---:|
| ashby:1password | 4 | 115 | 40 | 23 | 19 | 0 |
| ashby:abridge | 4 | 81 | 28 | 7 | 7 | 0 |
| ashby:acorns | 4 | 57 | 40 | 1 | 1 | 3 |
| ashby:airbyte | 4 | 26 | 23 | 3 | 3 | 1 |
| ashby:airwallex | 4 | 52 | 42 | 0 | 0 | 4 |
| ashby:alan | 4 | 67 | 38 | 5 | 3 | 2 |
| ashby:alchemy | 4 | 37 | 25 | 2 | 2 | 3 |
| ashby:alephalpha | 3 | 57 | 21 | 5 | 5 | 0 |
| ashby:amplitude | 4 | 27 | 22 | 0 | 0 | 4 |
| ashby:andela | 4 | 16 | 16 | 0 | 0 | 4 |
| ashby:anyscale | 4 | 56 | 38 | 2 | 0 | 4 |
| ashby:ashby | 4 | 40 | 16 | 12 | 12 | 0 |
| ashby:atlan | 4 | 60 | 37 | 7 | 7 | 0 |
| ashby:babbel | 4 | 32 | 24 | 8 | 5 | 3 |
| ashby:backmarket | 4 | 72 | 30 | 14 | 14 | 0 |
| ashby:benchling | 4 | 58 | 28 | 14 | 6 | 0 |
| ashby:benevity | 4 | 32 | 24 | 0 | 0 | 4 |
| ashby:cerebras | 4 | 30 | 20 | 3 | 3 | 3 |
| ashby:circle | 4 | 26 | 20 | 1 | 1 | 3 |
| ashby:clearco | 4 | 24 | 20 | 4 | 4 | 0 |
| ashby:clerk | 2 | 12 | 7 | 0 | 0 | 2 |
| ashby:clickhouse | 4 | 27 | 22 | 2 | 2 | 2 |
| ashby:clickup | 4 | 32 | 24 | 8 | 4 | 0 |
| ashby:cognition | 4 | 28 | 24 | 0 | 0 | 4 |
| ashby:cohere | 4 | 50 | 24 | 4 | 4 | 2 |
| ashby:dave | 4 | 60 | 21 | 5 | 5 | 1 |
| ashby:deepl | 4 | 76 | 32 | 16 | 4 | 0 |
| ashby:docker | 4 | 36 | 20 | 4 | 4 | 0 |
| ashby:doctolib | 4 | 36 | 22 | 2 | 2 | 3 |
| ashby:drata | 4 | 32 | 28 | 4 | 4 | 0 |
| ashby:elevenlabs | 4 | 43 | 18 | 1 | 1 | 3 |
| ashby:epidemic-sound | 4 | 20 | 20 | 0 | 0 | 4 |
| ashby:faculty | 4 | 40 | 23 | 12 | 11 | 1 |
| ashby:farfetch | 4 | 58 | 36 | 3 | 1 | 3 |
| ashby:fullstory | 4 | 40 | 25 | 6 | 2 | 2 |
| ashby:gainsight | 4 | 36 | 24 | 4 | 4 | 0 |
| ashby:gorgias | 4 | 20 | 16 | 0 | 0 | 4 |
| ashby:harvey | 4 | 47 | 36 | 6 | 1 | 3 |
| ashby:helpscout | 4 | 63 | 31 | 10 | 6 | 0 |
| ashby:hex | 4 | 40 | 23 | 3 | 3 | 3 |
| ashby:hopper | 4 | 53 | 19 | 7 | 6 | 2 |
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
| ashby:ledger | 4 | 24 | 16 | 4 | 0 | 4 |
| ashby:lightspeed | 4 | 16 | 16 | 0 | 0 | 4 |
| ashby:linear | 4 | 49 | 26 | 12 | 12 | 0 |
| ashby:llamaindex | 3 | 22 | 12 | 1 | 1 | 2 |
| ashby:magic | 4 | 30 | 17 | 5 | 5 | 0 |
| ashby:mapbox | 4 | 52 | 31 | 4 | 0 | 4 |
| ashby:marshmallow | 4 | 54 | 28 | 11 | 7 | 0 |
| ashby:mintlify | 4 | 28 | 19 | 7 | 3 | 1 |
| ashby:miro | 4 | 59 | 21 | 6 | 6 | 1 |
| ashby:modal | 4 | 15 | 14 | 0 | 0 | 4 |
| ashby:mollie | 4 | 35 | 26 | 7 | 3 | 2 |
| ashby:moneybox | 4 | 81 | 44 | 19 | 11 | 0 |
| ashby:notion | 4 | 57 | 24 | 5 | 1 | 3 |
| ashby:nubank | 4 | 44 | 28 | 4 | 0 | 4 |
| ashby:openai | 4 | 104 | 27 | 5 | 3 | 1 |
| ashby:oyster | 4 | 96 | 19 | 24 | 20 | 0 |
| ashby:paddle | 4 | 31 | 24 | 3 | 0 | 4 |
| ashby:patreon | 4 | 40 | 28 | 0 | 0 | 4 |
| ashby:perplexity | 4 | 32 | 20 | 12 | 12 | 0 |
| ashby:pinecone | 4 | 39 | 24 | 9 | 1 | 3 |
| ashby:plaid | 4 | 136 | 40 | 0 | 0 | 4 |
| ashby:pleo | 4 | 48 | 28 | 16 | 12 | 0 |
| ashby:poolside | 3 | 18 | 15 | 0 | 0 | 3 |
| ashby:poshmark | 4 | 28 | 25 | 0 | 0 | 4 |
| ashby:primer | 4 | 87 | 23 | 14 | 14 | 0 |
| ashby:qonto | 4 | 67 | 32 | 11 | 9 | 0 |
| ashby:quora | 4 | 113 | 41 | 9 | 2 | 3 |
| ashby:railway | 4 | 16 | 12 | 4 | 4 | 0 |
| ashby:ramp | 3 | 37 | 16 | 10 | 10 | 0 |
| ashby:redis | 4 | 26 | 21 | 1 | 1 | 3 |
| ashby:render | 4 | 43 | 35 | 1 | 1 | 3 |
| ashby:replit | 4 | 56 | 32 | 9 | 9 | 0 |
| ashby:resend | 4 | 44 | 28 | 8 | 8 | 0 |
| ashby:rohlik | 4 | 24 | 20 | 0 | 0 | 4 |
| ashby:runway | 2 | 10 | 6 | 0 | 0 | 2 |
| ashby:satispay | 4 | 143 | 24 | 10 | 6 | 0 |
| ashby:sentry | 4 | 44 | 32 | 6 | 2 | 2 |
| ashby:skydio | 4 | 24 | 20 | 0 | 0 | 4 |
| ashby:snowflake | 4 | 47 | 24 | 4 | 4 | 0 |
| ashby:snyk | 4 | 40 | 32 | 0 | 0 | 4 |
| ashby:sorare | 2 | 20 | 12 | 2 | 0 | 2 |
| ashby:strava | 4 | 39 | 28 | 3 | 3 | 3 |
| ashby:substack | 4 | 24 | 17 | 2 | 2 | 2 |
| ashby:supabase | 4 | 44 | 28 | 8 | 8 | 0 |
| ashby:surveymonkey | 4 | 46 | 36 | 6 | 0 | 4 |
| ashby:synthesia | 4 | 34 | 24 | 4 | 4 | 1 |
| ashby:temporal | 4 | 69 | 36 | 4 | 1 | 3 |
| ashby:thinkific | 2 | 18 | 9 | 4 | 3 | 0 |
| ashby:thought-machine | 4 | 36 | 24 | 4 | 0 | 4 |
| ashby:thumbtack | 4 | 40 | 23 | 0 | 0 | 4 |
| ashby:tractable | 4 | 24 | 20 | 0 | 4 | 0 |
| ashby:uipath | 4 | 44 | 28 | 0 | 0 | 4 |
| ashby:vanta | 4 | 44 | 36 | 4 | 4 | 3 |
| ashby:watershed | 4 | 33 | 19 | 10 | 7 | 1 |
| ashby:wayve | 4 | 38 | 35 | 0 | 0 | 4 |
| ashby:wealthsimple | 4 | 66 | 32 | 10 | 10 | 0 |
| ashby:weaviate | 2 | 13 | 13 | 0 | 0 | 2 |
| ashby:webflow | 4 | 45 | 28 | 0 | 0 | 4 |
| ashby:whoop | 4 | 56 | 32 | 5 | 2 | 2 |
| ashby:writer | 4 | 36 | 24 | 8 | 8 | 0 |
| ashby:xero | 4 | 60 | 24 | 8 | 4 | 0 |
| ashby:zapier | 4 | 71 | 39 | 19 | 15 | 0 |
| greenhouse:abnormalsecurity | 4 | 86 | 56 | 22 | 22 | 0 |
| greenhouse:adyen | 4 | 64 | 29 | 29 | 23 | 0 |
| greenhouse:affirm | 4 | 86 | 56 | 9 | 10 | 0 |
| greenhouse:agoda | 4 | 79 | 41 | 24 | 30 | 0 |
| greenhouse:airbnb | 4 | 76 | 44 | 24 | 26 | 0 |
| greenhouse:airtable | 4 | 66 | 46 | 12 | 11 | 0 |
| greenhouse:algolia | 4 | 92 | 62 | 18 | 21 | 0 |
| greenhouse:anthropic | 4 | 88 | 49 | 27 | 25 | 0 |
| greenhouse:apolloio | 4 | 58 | 41 | 14 | 12 | 0 |
| greenhouse:appier | 4 | 39 | 34 | 1 | 1 | 3 |
| greenhouse:appsflyer | 4 | 42 | 24 | 5 | 5 | 0 |
| greenhouse:asana | 4 | 99 | 54 | 33 | 29 | 0 |
| greenhouse:attentive | 4 | 72 | 48 | 8 | 8 | 0 |
| greenhouse:backblaze | 4 | 53 | 42 | 3 | 3 | 1 |
| greenhouse:bandwidth | 4 | 59 | 49 | 6 | 6 | 0 |
| greenhouse:betterment | 4 | 83 | 54 | 17 | 17 | 0 |
| greenhouse:billcom | 4 | 86 | 68 | 13 | 13 | 0 |
| greenhouse:bird | 4 | 46 | 28 | 13 | 13 | 0 |
| greenhouse:block | 4 | 130 | 70 | 40 | 41 | 0 |
| greenhouse:blockchain | 4 | 46 | 28 | 10 | 10 | 0 |
| greenhouse:branch | 2 | 30 | 24 | 4 | 4 | 0 |
| greenhouse:braze | 4 | 72 | 47 | 14 | 14 | 0 |
| greenhouse:brex | 4 | 100 | 56 | 24 | 24 | 0 |
| greenhouse:c6bank | 4 | 100 | 39 | 42 | 42 | 0 |
| greenhouse:cabify | 4 | 63 | 32 | 30 | 31 | 0 |
| greenhouse:calendly | 4 | 87 | 52 | 31 | 31 | 0 |
| greenhouse:calm | 1 | 25 | 17 | 7 | 6 | 0 |
| greenhouse:careem | 4 | 82 | 48 | 25 | 29 | 0 |
| greenhouse:carta | 4 | 68 | 48 | 12 | 12 | 0 |
| greenhouse:celonis | 4 | 89 | 54 | 19 | 16 | 0 |
| greenhouse:checkr | 4 | 59 | 43 | 8 | 8 | 0 |
| greenhouse:chime | 4 | 88 | 64 | 20 | 20 | 0 |
| greenhouse:circleci | 4 | 75 | 48 | 20 | 20 | 0 |
| greenhouse:cleo | 4 | 75 | 51 | 14 | 11 | 0 |
| greenhouse:cloudflare | 4 | 63 | 47 | 10 | 10 | 0 |
| greenhouse:cockroachlabs | 4 | 89 | 67 | 10 | 10 | 0 |
| greenhouse:cognite | 4 | 61 | 44 | 9 | 9 | 0 |
| greenhouse:commercetools | 4 | 75 | 56 | 15 | 15 | 0 |
| greenhouse:consensys | 4 | 66 | 37 | 25 | 25 | 0 |
| greenhouse:contentful | 4 | 52 | 33 | 10 | 10 | 0 |
| greenhouse:coreweave | 4 | 102 | 59 | 32 | 28 | 0 |
| greenhouse:coursera | 4 | 71 | 43 | 20 | 20 | 0 |
| greenhouse:cresta | 4 | 49 | 37 | 4 | 4 | 2 |
| greenhouse:cribl | 4 | 68 | 50 | 12 | 12 | 0 |
| greenhouse:cultureamp | 4 | 86 | 72 | 6 | 6 | 0 |
| greenhouse:databricks | 4 | 73 | 46 | 19 | 19 | 0 |
| greenhouse:datadog | 3 | 50 | 32 | 15 | 15 | 0 |
| greenhouse:dataiku | 4 | 83 | 59 | 16 | 16 | 0 |
| greenhouse:dcard | 4 | 54 | 22 | 12 | 14 | 0 |
| greenhouse:deliveroo | 4 | 55 | 40 | 11 | 11 | 0 |
| greenhouse:dialpad | 4 | 78 | 57 | 10 | 9 | 0 |
| greenhouse:discord | 4 | 106 | 79 | 16 | 16 | 0 |
| greenhouse:dremio | 4 | 69 | 48 | 12 | 13 | 0 |
| greenhouse:druva | 4 | 61 | 46 | 5 | 5 | 1 |
| greenhouse:duolingo | 4 | 58 | 30 | 17 | 17 | 0 |
| greenhouse:ebanx | 4 | 82 | 51 | 26 | 25 | 0 |
| greenhouse:esri | 4 | 68 | 52 | 12 | 4 | 0 |
| greenhouse:eucalyptus | 4 | 59 | 33 | 25 | 25 | 0 |
| greenhouse:faire | 4 | 75 | 48 | 12 | 16 | 0 |
| greenhouse:fastly | 4 | 79 | 58 | 14 | 14 | 0 |
| greenhouse:figma | 4 | 72 | 49 | 16 | 16 | 0 |
| greenhouse:figureai | 4 | 41 | 36 | 0 | 0 | 4 |
| greenhouse:fireblocks | 4 | 46 | 35 | 5 | 4 | 2 |
| greenhouse:five9 | 4 | 65 | 43 | 7 | 8 | 0 |
| greenhouse:fivetran | 4 | 93 | 48 | 30 | 30 | 0 |
| greenhouse:flatironhealth | 4 | 97 | 52 | 38 | 38 | 0 |
| greenhouse:flexport | 4 | 59 | 38 | 12 | 16 | 0 |
| greenhouse:formlabs | 4 | 62 | 44 | 12 | 13 | 0 |
| greenhouse:gemini | 4 | 67 | 44 | 15 | 15 | 0 |
| greenhouse:ginkgobioworks | 4 | 84 | 48 | 16 | 20 | 0 |
| greenhouse:gitlab | 4 | 74 | 46 | 14 | 14 | 0 |
| greenhouse:glance | 4 | 65 | 50 | 9 | 7 | 2 |
| greenhouse:gocardless | 4 | 83 | 54 | 20 | 19 | 0 |
| greenhouse:grafanalabs | 4 | 64 | 57 | 7 | 7 | 1 |
| greenhouse:graphcore | 4 | 79 | 47 | 25 | 26 | 1 |
| greenhouse:greenhouse | 4 | 108 | 60 | 40 | 40 | 0 |
| greenhouse:groww | 4 | 52 | 36 | 16 | 16 | 0 |
| greenhouse:gusto | 4 | 96 | 75 | 17 | 17 | 0 |
| greenhouse:gympass | 4 | 143 | 39 | 71 | 65 | 0 |
| greenhouse:gymshark | 4 | 89 | 56 | 26 | 26 | 0 |
| greenhouse:honeycomb | 4 | 74 | 53 | 12 | 8 | 0 |
| greenhouse:hootsuite | 4 | 103 | 56 | 33 | 34 | 0 |
| greenhouse:housinganywhere | 3 | 39 | 28 | 7 | 7 | 0 |
| greenhouse:imply | 3 | 42 | 33 | 3 | 3 | 1 |
| greenhouse:inflectionai | 4 | 68 | 52 | 0 | 0 | 4 |
| greenhouse:inmobi | 4 | 54 | 40 | 11 | 11 | 1 |
| greenhouse:instacart | 4 | 86 | 57 | 25 | 25 | 0 |
| greenhouse:inter | 4 | 132 | 42 | 78 | 82 | 0 |
| greenhouse:intercom | 4 | 103 | 50 | 28 | 36 | 0 |
| greenhouse:isaraerospace | 4 | 68 | 34 | 24 | 26 | 0 |
| greenhouse:jetbrains | 4 | 51 | 35 | 3 | 8 | 0 |
| greenhouse:jumia | 4 | 39 | 31 | 0 | 0 | 4 |
| greenhouse:justworks | 4 | 100 | 72 | 24 | 24 | 0 |
| greenhouse:khanacademy | 3 | 73 | 42 | 14 | 16 | 0 |
| greenhouse:klaviyo | 4 | 78 | 48 | 17 | 11 | 0 |
| greenhouse:komodohealth | 4 | 70 | 51 | 12 | 12 | 0 |
| greenhouse:krafton | 4 | 65 | 24 | 13 | 29 | 0 |
| greenhouse:labelbox | 4 | 56 | 40 | 8 | 8 | 0 |
| greenhouse:lattice | 2 | 42 | 25 | 13 | 11 | 0 |
| greenhouse:launchdarkly | 4 | 99 | 60 | 18 | 12 | 0 |
| greenhouse:lightmatter | 4 | 106 | 81 | 14 | 13 | 0 |
| greenhouse:lovable | 4 | 50 | 35 | 4 | 5 | 2 |
| greenhouse:lucidmotors | 4 | 130 | 87 | 26 | 22 | 0 |
| greenhouse:luno | 2 | 42 | 24 | 16 | 16 | 0 |
| greenhouse:lyft | 4 | 115 | 24 | 50 | 66 | 0 |
| greenhouse:medium | 3 | 67 | 39 | 19 | 19 | 0 |
| greenhouse:mentimeter | 4 | 56 | 33 | 20 | 19 | 0 |
| greenhouse:mercury | 4 | 60 | 33 | 11 | 11 | 0 |
| greenhouse:mirakl | 4 | 67 | 39 | 20 | 19 | 0 |
| greenhouse:mixpanel | 4 | 96 | 67 | 7 | 8 | 0 |
| greenhouse:mongodb | 4 | 100 | 57 | 15 | 19 | 0 |
| greenhouse:moniepoint | 4 | 51 | 33 | 12 | 12 | 1 |
| greenhouse:monzo | 4 | 87 | 58 | 15 | 15 | 0 |
| greenhouse:n26 | 4 | 65 | 44 | 16 | 16 | 0 |
| greenhouse:neo4j | 4 | 81 | 43 | 24 | 24 | 0 |
| greenhouse:netlify | 4 | 99 | 44 | 46 | 37 | 0 |
| greenhouse:netskope | 4 | 12 | 0 | 0 | 0 | 4 |
| greenhouse:newrelic | 4 | 70 | 42 | 24 | 24 | 0 |
| greenhouse:nextdoor | 4 | 61 | 45 | 7 | 7 | 0 |
| greenhouse:nice | 4 | 55 | 38 | 13 | 13 | 0 |
| greenhouse:nuro | 4 | 4 | 4 | 0 | 0 | 4 |
| greenhouse:oura | 4 | 78 | 60 | 10 | 10 | 0 |
| greenhouse:pagerduty | 4 | 58 | 46 | 8 | 8 | 0 |
| greenhouse:paypay | 4 | 49 | 22 | 15 | 15 | 0 |
| greenhouse:pendo | 4 | 62 | 43 | 11 | 15 | 0 |
| greenhouse:planetscale | 4 | 41 | 33 | 1 | 1 | 3 |
| greenhouse:polyai | 3 | 62 | 39 | 15 | 10 | 0 |
| greenhouse:porter | 4 | 4 | 4 | 0 | 0 | 4 |
| greenhouse:purestorage | 4 | 73 | 50 | 13 | 14 | 0 |
| greenhouse:quintoandar | 4 | 116 | 41 | 41 | 59 | 0 |
| greenhouse:raisin | 4 | 57 | 39 | 10 | 10 | 0 |
| greenhouse:ramp | 1 | 24 | 8 | 4 | 1 | 0 |
| greenhouse:realtimeboardglobal | 4 | 73 | 24 | 12 | 12 | 0 |
| greenhouse:reddit | 4 | 87 | 64 | 19 | 17 | 0 |
| greenhouse:riotgames | 4 | 102 | 37 | 50 | 50 | 0 |
| greenhouse:ripple | 4 | 61 | 43 | 10 | 10 | 0 |
| greenhouse:robinhood | 4 | 91 | 54 | 18 | 18 | 1 |
| greenhouse:rocketlab | 4 | 112 | 55 | 44 | 44 | 0 |
| greenhouse:samsara | 4 | 114 | 72 | 30 | 34 | 0 |
| greenhouse:sas | 3 | 60 | 47 | 11 | 11 | 0 |
| greenhouse:scaleai | 4 | 77 | 55 | 7 | 7 | 1 |
| greenhouse:scopely | 4 | 70 | 49 | 11 | 11 | 0 |
| greenhouse:shakepay | 4 | 53 | 32 | 8 | 8 | 0 |
| greenhouse:showpad | 4 | 51 | 39 | 8 | 8 | 1 |
| greenhouse:sigmacomputing | 4 | 72 | 49 | 14 | 16 | 0 |
| greenhouse:singlestore | 4 | 83 | 52 | 15 | 9 | 0 |
| greenhouse:slice | 4 | 44 | 32 | 5 | 5 | 1 |
| greenhouse:smartsheet | 4 | 101 | 72 | 23 | 22 | 0 |
| greenhouse:snorkelai | 4 | 75 | 58 | 9 | 9 | 0 |
| greenhouse:solarisbank | 3 | 36 | 27 | 9 | 9 | 0 |
| greenhouse:spacex | 4 | 110 | 60 | 34 | 36 | 0 |
| greenhouse:sproutsocial | 4 | 80 | 52 | 24 | 24 | 0 |
| greenhouse:squarespace | 4 | 105 | 47 | 41 | 45 | 0 |
| greenhouse:stabilityai | 1 | 3 | 0 | 0 | 0 | 1 |
| greenhouse:stackblitz | 4 | 82 | 52 | 18 | 18 | 0 |
| greenhouse:staffbase | 4 | 66 | 34 | 19 | 19 | 0 |
| greenhouse:starburst | 4 | 69 | 52 | 9 | 9 | 0 |
| greenhouse:stockx | 4 | 66 | 40 | 14 | 14 | 0 |
| greenhouse:stone | 4 | 105 | 32 | 45 | 49 | 0 |
| greenhouse:storyblok | 4 | 72 | 36 | 32 | 32 | 0 |
| greenhouse:stripe | 4 | 4 | 0 | 0 | 0 | 4 |
| greenhouse:sumologic | 4 | 50 | 38 | 8 | 8 | 0 |
| greenhouse:sumup | 4 | 47 | 30 | 10 | 11 | 1 |
| greenhouse:tailscale | 4 | 87 | 48 | 31 | 31 | 0 |
| greenhouse:tamara | 4 | 64 | 33 | 30 | 30 | 0 |
| greenhouse:tanium | 4 | 89 | 62 | 18 | 18 | 0 |
| greenhouse:taskrabbit | 4 | 73 | 53 | 16 | 16 | 0 |
| greenhouse:tenstorrent | 4 | 53 | 41 | 4 | 4 | 0 |
| greenhouse:toast | 4 | 59 | 32 | 21 | 21 | 0 |
| greenhouse:togetherai | 4 | 80 | 59 | 8 | 8 | 1 |
| greenhouse:tripactions | 4 | 72 | 49 | 15 | 15 | 0 |
| greenhouse:truelayer | 4 | 83 | 53 | 24 | 24 | 0 |
| greenhouse:trustpilot | 4 | 64 | 35 | 23 | 24 | 0 |
| greenhouse:turing | 4 | 42 | 36 | 4 | 4 | 2 |
| greenhouse:twilio | 4 | 76 | 53 | 19 | 19 | 0 |
| greenhouse:twitch | 4 | 148 | 52 | 71 | 63 | 0 |
| greenhouse:typeface | 4 | 52 | 38 | 8 | 7 | 0 |
| greenhouse:typeform | 4 | 57 | 29 | 20 | 16 | 0 |
| greenhouse:upwork | 4 | 60 | 39 | 15 | 15 | 0 |
| greenhouse:vercel | 4 | 94 | 62 | 19 | 22 | 0 |
| greenhouse:veriff | 4 | 50 | 37 | 6 | 6 | 1 |
| greenhouse:verkada | 4 | 45 | 36 | 2 | 2 | 2 |
| greenhouse:vonage | 4 | 53 | 33 | 17 | 17 | 0 |
| greenhouse:vtex | 4 | 83 | 48 | 32 | 32 | 0 |
| greenhouse:wallapop | 4 | 58 | 36 | 15 | 14 | 0 |
| greenhouse:warp | 4 | 64 | 41 | 16 | 16 | 0 |
| greenhouse:wasabi | 4 | 72 | 64 | 4 | 4 | 0 |
| greenhouse:wildlifestudios | 4 | 73 | 60 | 8 | 11 | 1 |
| greenhouse:wise | 2 | 38 | 26 | 8 | 8 | 0 |
| greenhouse:wolt | 4 | 54 | 32 | 18 | 18 | 0 |
| greenhouse:workato | 4 | 63 | 42 | 17 | 17 | 0 |
| greenhouse:xai | 4 | 105 | 53 | 39 | 36 | 0 |
| greenhouse:xendit | 4 | 52 | 32 | 16 | 16 | 0 |
| greenhouse:yugabyte | 4 | 72 | 56 | 6 | 4 | 2 |
| greenhouse:zocdoc | 4 | 66 | 52 | 10 | 10 | 0 |
| greenhouse:zoominfo | 4 | 71 | 57 | 8 | 8 | 0 |
| greenhouse:zscaler | 4 | 97 | 50 | 31 | 31 | 0 |

# Live run statistics (1319 forms)

Generated 2026-11-07T20:35:20.869Z from results-a.jsonl, results-b.jsonl by `scripts/live1000-audit.mjs`. The run is still growing: re-run the script.

## Forms

| Outcome | Forms | Share |
|---|---:|---:|
| filled | 1180 | 89.5% |
| no_form | 109 | 8.3% |
| closed | 16 | 1.2% |
| robot_check | 9 | 0.7% |
| error | 5 | 0.4% |

| Platform | filled | no_form | robot_check | closed | error |
|---|---:|---:|---:|---:|---:|
| greenhouse | 745 | 109 | 9 | 1 | 5 |
| ashby | 435 | 0 | 0 | 15 | 0 |

Filled forms: **1180**. Ready to submit (nothing left for the user): **240** (20.3%); needing the user: **940**. Run status: needs_user 940, ready_to_submit 240.

Errors:
- 4 × page.goto: net::ERR_HTTP2_PROTOCOL_ERROR at https://job-boards.greenhouse.io/rob
- 1 × page.goto: net::ERR_INSUFFICIENT_RESOURCES at https://job-boards.greenhouse.io/m

## Fields

Fields on filled forms: **18880** (16.0 per form).

| Status | Fields | Share |
|---|---:|---:|
| filled | 10739 | 56.9% |
| needs_user | 4610 | 24.4% |
| skipped | 3104 | 16.4% |
| failed | 423 | 2.2% |
| already_filled | 4 | 0.0% |

- Filled by the extension: **56.9%** of all fields.
- Required fields: 11892; filled 7658; **left for the user: 4234 (35.6%)**.

| Decision | Fields | filled | needs_user | failed | skipped | already_filled |
|---|---:|---:|---:|---:|---:|---:|
| profile | 7949 | 7714 | 0 | 235 | 0 | 0 |
| ask | 4690 | 0 | 4610 | 0 | 80 | 0 |
| skip | 3028 | 0 | 0 | 0 | 3024 | 4 |
| answer | 2039 | 1851 | 0 | 188 | 0 | 0 |
| resume | 1174 | 1174 | 0 | 0 | 0 | 0 |

## Asks (fields left for the user), by reason / topic (top 30)

| Topic | All | Required |
|---|---:|---:|
| unknown | 2389 | 2388 |
| work_authorization | 375 | 330 |
| sponsorship | 359 | 296 |
| salary | 343 | 267 |
| consent | 334 | 234 |
| notice_period | 180 | 111 |
| pronouns | 172 | 17 |
| relocation | 132 | 105 |
| sexual_orientation | 97 | 43 |
| missing_profile_value | 83 | 83 |
| accommodation | 66 | 41 |
| transgender | 57 | 21 |
| identity | 36 | 36 |
| age | 15 | 10 |
| criminal | 11 | 11 |
| signature | 11 | 11 |
| disability | 10 | 1 |
| gender | 8 | 0 |
| race | 8 | 0 |
| sensitive | 4 | 4 |

## Skips

| Reason | Fields |
|---|---:|
| optional, not in profile | 1209 |
| optional choice | 959 |
| optional attachment (not your resume) | 703 |
| no portfolio in profile | 76 |
| optional attachment | 34 |
| not sure this saved answer fits: left for you | 25 |
| identity: entered by you only | 14 |
| optional address line 2 empty | 7 |
| no state in profile | 1 |

## Failed fills (decision:key)

| Decision:key (control) | Fields |
|---|---:|
| profile:school (combobox) | 107 |
| answer:How did you hear about this job? (combobox) | 68 |
| profile:country (combobox) | 54 |
| answer:Disability status (combobox) | 50 |
| profile:location (combobox) | 46 |
| answer:Gender (combobox) | 24 |
| answer:Veteran status (combobox) | 15 |
| answer:Race / Ethnicity (combobox) | 9 |
| answer:How did you hear about this job? (checkbox_group) | 8 |
| profile:graduationYear (combobox) | 8 |
| answer:Will you now or in the future require visa sponsorship to work in the United States? (combobox) | 8 |
| profile:degree (combobox) | 8 |
| profile:discipline (combobox) | 5 |
| answer:What is your notice period? (number) | 4 |
| profile:email (combobox) | 3 |
| profile:preferredLocations (combobox) | 2 |
| answer:What is your notice period? (combobox) | 1 |
| profile:currentCompany (combobox) | 1 |
| answer:Are you legally authorized to work in India? (combobox) | 1 |
| profile:graduationYear (text) | 1 |

## Time per form

Median 15s, mean 19.9s, max 167s (all 1319 forms; includes page load, 3s settle and the fill). Filled forms: median 14s.

## Per platform

| Platform | Forms filled | Fields | Filled | Needs user | Failed | Required left | Ready | Median s |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| greenhouse | 745 | 13851 | 8098 (58.5%) | 3851 | 375 | 3739 of 9525 | 44 | 21 |
| ashby | 435 | 5029 | 2641 (52.5%) | 759 | 48 | 495 of 2367 | 196 | 11 |

## Fills the page cleared afterwards

0 text fills on 0 forms were reported filled but were empty when the page was read 0.8 s later (other fills on the same forms were there). By field: . On Greenhouse these are the fields its resume autofill sets (first/last name, email, phone): its parse request is blocked in this run, and the reset arrives after the fill.

## Safety

- Requests blocked by the read-only guard: 13999 on 1283 forms (analytics, consent and tracking beacons).
- Blocked requests that look like application sends (to the ATS, path with appl/submit/candidate): **0**.
- Forms whose URL changed during the fill: **29** (must be 0).
  - URL changed: https://job-boards.greenhouse.io/fireblocks/jobs/4695814006
  - URL changed: https://job-boards.greenhouse.io/billcom/jobs/6217056004
  - URL changed: https://job-boards.greenhouse.io/circleci/jobs/8801094002
  - URL changed: https://job-boards.greenhouse.io/cockroachlabs/jobs/8332010
  - URL changed: https://job-boards.greenhouse.io/coreweave/jobs/4718149006
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
  - URL changed: https://job-boards.greenhouse.io/asana/jobs/8305286
  - URL changed: https://job-boards.greenhouse.io/imply/jobs/7590615003
  - URL changed: https://job-boards.greenhouse.io/databricks/jobs/8805655002
  - URL changed: https://job-boards.greenhouse.io/dremio/jobs/6314003003
  - URL changed: https://job-boards.greenhouse.io/druva/jobs/7727374002
  - URL changed: https://job-boards.greenhouse.io/esri/jobs/5259316007
  - URL changed: https://job-boards.greenhouse.io/fastly/jobs/8105433

## Accuracy (see WRONG.md)

Filled fields judged: 10739. Correct **10737** (100.0%), wrong **2** (0.0%), unclear 0 (0 unique pairs, listed in UNCLEAR.md).

## Per company (filled forms)

| Company | Forms | Fields | Filled | Needs user | Required left | Ready |
|---|---:|---:|---:|---:|---:|---:|
| ashby:1password | 4 | 115 | 36 | 27 | 19 | 0 |
| ashby:abridge | 4 | 81 | 28 | 7 | 7 | 0 |
| ashby:acorns | 4 | 57 | 40 | 1 | 1 | 3 |
| ashby:airbyte | 4 | 26 | 23 | 3 | 3 | 1 |
| ashby:airwallex | 4 | 52 | 38 | 4 | 3 | 1 |
| ashby:alan | 4 | 67 | 35 | 8 | 4 | 2 |
| ashby:alchemy | 4 | 37 | 25 | 2 | 2 | 3 |
| ashby:alephalpha | 3 | 57 | 18 | 8 | 5 | 0 |
| ashby:amplitude | 4 | 27 | 22 | 0 | 0 | 4 |
| ashby:andela | 4 | 16 | 16 | 0 | 0 | 4 |
| ashby:anyscale | 4 | 56 | 35 | 3 | 0 | 4 |
| ashby:ashby | 4 | 40 | 16 | 12 | 12 | 0 |
| ashby:atlan | 4 | 60 | 33 | 11 | 11 | 0 |
| ashby:babbel | 4 | 32 | 20 | 12 | 9 | 0 |
| ashby:backmarket | 4 | 72 | 26 | 18 | 14 | 0 |
| ashby:benchling | 4 | 58 | 24 | 18 | 10 | 0 |
| ashby:benevity | 4 | 32 | 24 | 4 | 0 | 4 |
| ashby:cerebras | 4 | 30 | 20 | 3 | 3 | 3 |
| ashby:circle | 4 | 26 | 20 | 1 | 1 | 3 |
| ashby:clearco | 4 | 24 | 20 | 4 | 4 | 0 |
| ashby:clerk | 2 | 12 | 7 | 0 | 0 | 2 |
| ashby:clickhouse | 4 | 27 | 22 | 2 | 2 | 2 |
| ashby:clickup | 4 | 32 | 20 | 12 | 8 | 0 |
| ashby:cognition | 4 | 28 | 24 | 0 | 0 | 4 |
| ashby:cohere | 4 | 50 | 25 | 4 | 4 | 2 |
| ashby:dave | 4 | 60 | 21 | 5 | 5 | 1 |
| ashby:deepl | 4 | 76 | 20 | 28 | 12 | 0 |
| ashby:docker | 4 | 36 | 20 | 4 | 4 | 0 |
| ashby:doctolib | 4 | 36 | 20 | 4 | 2 | 3 |
| ashby:drata | 4 | 32 | 28 | 4 | 4 | 0 |
| ashby:elevenlabs | 4 | 43 | 18 | 1 | 1 | 3 |
| ashby:epidemic-sound | 4 | 20 | 20 | 0 | 0 | 4 |
| ashby:faculty | 4 | 40 | 20 | 15 | 13 | 1 |
| ashby:farfetch | 4 | 58 | 34 | 3 | 1 | 3 |
| ashby:fullstory | 4 | 40 | 24 | 7 | 2 | 2 |
| ashby:gainsight | 4 | 36 | 24 | 4 | 4 | 0 |
| ashby:gorgias | 4 | 20 | 16 | 0 | 0 | 4 |
| ashby:harvey | 4 | 47 | 32 | 10 | 1 | 3 |
| ashby:helpscout | 4 | 63 | 27 | 14 | 6 | 0 |
| ashby:hex | 4 | 40 | 23 | 3 | 3 | 3 |
| ashby:hopper | 4 | 53 | 19 | 7 | 6 | 2 |
| ashby:illumio | 4 | 52 | 28 | 8 | 4 | 0 |
| ashby:improbable | 4 | 42 | 29 | 5 | 1 | 3 |
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
| ashby:mapbox | 4 | 52 | 27 | 8 | 0 | 4 |
| ashby:marshmallow | 4 | 54 | 24 | 15 | 7 | 0 |
| ashby:mintlify | 4 | 28 | 19 | 7 | 3 | 1 |
| ashby:miro | 4 | 59 | 20 | 7 | 6 | 1 |
| ashby:modal | 4 | 15 | 14 | 0 | 0 | 4 |
| ashby:mollie | 4 | 35 | 23 | 10 | 5 | 2 |
| ashby:moneybox | 4 | 81 | 36 | 27 | 19 | 0 |
| ashby:notion | 4 | 57 | 24 | 5 | 1 | 3 |
| ashby:nubank | 4 | 44 | 24 | 8 | 0 | 4 |
| ashby:openai | 4 | 104 | 23 | 9 | 7 | 0 |
| ashby:oyster | 4 | 96 | 19 | 24 | 20 | 0 |
| ashby:paddle | 4 | 31 | 20 | 7 | 0 | 4 |
| ashby:patreon | 4 | 40 | 28 | 0 | 0 | 4 |
| ashby:perplexity | 4 | 32 | 20 | 12 | 12 | 0 |
| ashby:pinecone | 4 | 39 | 24 | 9 | 1 | 3 |
| ashby:plaid | 4 | 136 | 40 | 0 | 0 | 4 |
| ashby:pleo | 4 | 48 | 28 | 16 | 12 | 0 |
| ashby:poolside | 3 | 18 | 15 | 0 | 0 | 3 |
| ashby:poshmark | 4 | 28 | 20 | 5 | 3 | 2 |
| ashby:primer | 4 | 87 | 23 | 14 | 14 | 0 |
| ashby:qonto | 4 | 67 | 30 | 12 | 9 | 0 |
| ashby:quora | 4 | 113 | 41 | 9 | 2 | 3 |
| ashby:railway | 4 | 16 | 12 | 4 | 4 | 0 |
| ashby:ramp | 3 | 37 | 16 | 10 | 10 | 0 |
| ashby:redis | 4 | 26 | 21 | 1 | 1 | 3 |
| ashby:render | 4 | 43 | 31 | 5 | 1 | 3 |
| ashby:replit | 4 | 56 | 28 | 13 | 13 | 0 |
| ashby:resend | 4 | 44 | 28 | 8 | 8 | 0 |
| ashby:rohlik | 4 | 24 | 20 | 0 | 0 | 4 |
| ashby:runway | 2 | 10 | 6 | 0 | 0 | 2 |
| ashby:satispay | 4 | 143 | 24 | 10 | 6 | 0 |
| ashby:sentry | 4 | 44 | 28 | 10 | 5 | 1 |
| ashby:skydio | 4 | 24 | 20 | 0 | 0 | 4 |
| ashby:snowflake | 4 | 47 | 24 | 4 | 4 | 0 |
| ashby:snyk | 4 | 40 | 32 | 0 | 0 | 4 |
| ashby:sorare | 2 | 20 | 12 | 2 | 0 | 2 |
| ashby:strava | 4 | 39 | 24 | 7 | 3 | 3 |
| ashby:substack | 4 | 24 | 17 | 2 | 2 | 2 |
| ashby:supabase | 4 | 44 | 25 | 11 | 8 | 0 |
| ashby:surveymonkey | 4 | 46 | 36 | 6 | 0 | 4 |
| ashby:synthesia | 4 | 34 | 21 | 7 | 5 | 1 |
| ashby:temporal | 4 | 69 | 32 | 9 | 1 | 3 |
| ashby:thinkific | 2 | 18 | 9 | 4 | 3 | 0 |
| ashby:thought-machine | 4 | 36 | 24 | 4 | 0 | 4 |
| ashby:thumbtack | 4 | 40 | 23 | 0 | 0 | 4 |
| ashby:tractable | 4 | 24 | 16 | 4 | 8 | 0 |
| ashby:uipath | 4 | 44 | 28 | 0 | 0 | 4 |
| ashby:vanta | 4 | 44 | 33 | 7 | 4 | 3 |
| ashby:watershed | 4 | 33 | 19 | 10 | 7 | 1 |
| ashby:wayve | 4 | 38 | 25 | 10 | 6 | 1 |
| ashby:wealthsimple | 4 | 66 | 30 | 12 | 10 | 0 |
| ashby:weaviate | 2 | 13 | 11 | 2 | 2 | 0 |
| ashby:webflow | 4 | 45 | 24 | 4 | 0 | 4 |
| ashby:whoop | 4 | 56 | 32 | 5 | 2 | 2 |
| ashby:writer | 4 | 36 | 24 | 8 | 8 | 0 |
| ashby:xero | 4 | 60 | 16 | 16 | 4 | 0 |
| ashby:zapier | 4 | 71 | 36 | 22 | 15 | 0 |
| greenhouse:abnormalsecurity | 4 | 86 | 54 | 22 | 24 | 0 |
| greenhouse:adyen | 4 | 64 | 27 | 31 | 24 | 0 |
| greenhouse:affirm | 4 | 86 | 52 | 13 | 14 | 0 |
| greenhouse:agoda | 4 | 79 | 39 | 26 | 32 | 0 |
| greenhouse:airbnb | 4 | 76 | 44 | 24 | 26 | 0 |
| greenhouse:airtable | 4 | 66 | 45 | 13 | 12 | 0 |
| greenhouse:algolia | 4 | 92 | 62 | 18 | 21 | 0 |
| greenhouse:anthropic | 4 | 88 | 42 | 32 | 29 | 0 |
| greenhouse:apolloio | 4 | 58 | 37 | 18 | 15 | 0 |
| greenhouse:appier | 4 | 39 | 34 | 1 | 1 | 3 |
| greenhouse:appsflyer | 1 | 12 | 6 | 2 | 2 | 0 |
| greenhouse:asana | 4 | 98 | 48 | 38 | 30 | 0 |
| greenhouse:attentive | 4 | 72 | 48 | 8 | 8 | 0 |
| greenhouse:backblaze | 4 | 53 | 38 | 7 | 7 | 0 |
| greenhouse:bandwidth | 4 | 59 | 45 | 10 | 10 | 0 |
| greenhouse:betterment | 4 | 83 | 50 | 21 | 17 | 0 |
| greenhouse:billcom | 4 | 86 | 64 | 17 | 17 | 0 |
| greenhouse:bird | 4 | 46 | 28 | 13 | 13 | 0 |
| greenhouse:block | 3 | 94 | 52 | 27 | 27 | 0 |
| greenhouse:blockchain | 4 | 46 | 28 | 10 | 10 | 0 |
| greenhouse:branch | 2 | 30 | 22 | 6 | 6 | 0 |
| greenhouse:braze | 4 | 72 | 47 | 14 | 14 | 0 |
| greenhouse:brex | 4 | 100 | 51 | 28 | 25 | 0 |
| greenhouse:c6bank | 4 | 100 | 28 | 49 | 53 | 0 |
| greenhouse:cabify | 4 | 63 | 27 | 33 | 34 | 0 |
| greenhouse:calendly | 4 | 87 | 52 | 31 | 31 | 0 |
| greenhouse:calm | 1 | 25 | 15 | 9 | 6 | 0 |
| greenhouse:careem | 4 | 82 | 48 | 25 | 29 | 0 |
| greenhouse:carta | 4 | 68 | 48 | 12 | 12 | 0 |
| greenhouse:celonis | 4 | 89 | 50 | 23 | 20 | 0 |
| greenhouse:checkr | 4 | 59 | 39 | 12 | 12 | 0 |
| greenhouse:chime | 4 | 88 | 60 | 24 | 24 | 0 |
| greenhouse:circleci | 4 | 75 | 48 | 20 | 20 | 0 |
| greenhouse:cleo | 4 | 75 | 51 | 14 | 11 | 0 |
| greenhouse:cloudflare | 4 | 63 | 47 | 10 | 10 | 0 |
| greenhouse:cockroachlabs | 4 | 89 | 61 | 16 | 10 | 0 |
| greenhouse:cognite | 4 | 61 | 40 | 13 | 13 | 0 |
| greenhouse:collibra | 1 | 17 | 12 | 3 | 3 | 0 |
| greenhouse:commercetools | 4 | 75 | 52 | 19 | 19 | 0 |
| greenhouse:consensys | 4 | 66 | 36 | 26 | 26 | 0 |
| greenhouse:contentful | 4 | 52 | 33 | 10 | 10 | 0 |
| greenhouse:coreweave | 4 | 102 | 59 | 32 | 28 | 0 |
| greenhouse:coursera | 4 | 71 | 39 | 24 | 24 | 0 |
| greenhouse:cresta | 4 | 49 | 37 | 4 | 4 | 2 |
| greenhouse:cribl | 4 | 68 | 47 | 12 | 14 | 0 |
| greenhouse:cultureamp | 4 | 86 | 64 | 14 | 6 | 0 |
| greenhouse:databricks | 4 | 73 | 46 | 19 | 19 | 0 |
| greenhouse:datadog | 3 | 50 | 32 | 15 | 15 | 0 |
| greenhouse:dataiku | 4 | 83 | 54 | 21 | 20 | 0 |
| greenhouse:dcard | 4 | 54 | 22 | 12 | 14 | 0 |
| greenhouse:deliveroo | 4 | 55 | 38 | 13 | 13 | 0 |
| greenhouse:dialpad | 4 | 78 | 55 | 12 | 11 | 0 |
| greenhouse:discord | 4 | 106 | 72 | 23 | 19 | 0 |
| greenhouse:dremio | 3 | 53 | 34 | 12 | 10 | 0 |
| greenhouse:druva | 4 | 61 | 42 | 9 | 9 | 1 |
| greenhouse:duolingo | 2 | 34 | 14 | 13 | 13 | 0 |
| greenhouse:ebanx | 4 | 82 | 47 | 30 | 29 | 0 |
| greenhouse:esri | 4 | 68 | 48 | 16 | 4 | 0 |
| greenhouse:eucalyptus | 4 | 59 | 33 | 25 | 25 | 0 |
| greenhouse:faire | 4 | 75 | 42 | 18 | 22 | 0 |
| greenhouse:fastly | 4 | 79 | 48 | 21 | 17 | 0 |
| greenhouse:figma | 4 | 72 | 45 | 20 | 16 | 0 |
| greenhouse:figureai | 4 | 41 | 35 | 0 | 1 | 3 |
| greenhouse:fireblocks | 4 | 46 | 35 | 5 | 4 | 2 |
| greenhouse:five9 | 4 | 65 | 42 | 8 | 9 | 0 |
| greenhouse:fivetran | 4 | 93 | 48 | 30 | 30 | 0 |
| greenhouse:flatironhealth | 4 | 97 | 40 | 46 | 50 | 0 |
| greenhouse:flexport | 4 | 59 | 38 | 12 | 16 | 0 |
| greenhouse:formlabs | 4 | 62 | 44 | 12 | 13 | 0 |
| greenhouse:gemini | 4 | 67 | 42 | 17 | 17 | 0 |
| greenhouse:ginkgobioworks | 4 | 84 | 44 | 20 | 20 | 0 |
| greenhouse:gitlab | 4 | 74 | 46 | 14 | 14 | 0 |
| greenhouse:glance | 4 | 65 | 40 | 19 | 16 | 0 |
| greenhouse:gocardless | 4 | 83 | 42 | 31 | 21 | 0 |
| greenhouse:grafanalabs | 4 | 64 | 53 | 11 | 11 | 1 |
| greenhouse:graphcore | 4 | 79 | 47 | 25 | 26 | 1 |
| greenhouse:greenhouse | 4 | 108 | 54 | 46 | 46 | 0 |
| greenhouse:groww | 4 | 52 | 32 | 20 | 17 | 0 |
| greenhouse:gusto | 4 | 96 | 67 | 25 | 25 | 0 |
| greenhouse:gympass | 4 | 143 | 31 | 67 | 65 | 0 |
| greenhouse:gymshark | 4 | 89 | 47 | 35 | 33 | 0 |
| greenhouse:honeycomb | 4 | 74 | 53 | 12 | 8 | 0 |
| greenhouse:hootsuite | 4 | 103 | 51 | 38 | 35 | 0 |
| greenhouse:housinganywhere | 3 | 39 | 25 | 10 | 10 | 0 |
| greenhouse:imply | 4 | 55 | 42 | 3 | 5 | 1 |
| greenhouse:inflectionai | 4 | 68 | 52 | 0 | 0 | 4 |
| greenhouse:inmobi | 4 | 54 | 36 | 15 | 15 | 0 |
| greenhouse:instacart | 4 | 86 | 47 | 28 | 35 | 0 |
| greenhouse:inter | 4 | 132 | 28 | 88 | 96 | 0 |
| greenhouse:intercom | 4 | 103 | 46 | 32 | 40 | 0 |
| greenhouse:isaraerospace | 4 | 68 | 32 | 27 | 28 | 0 |
| greenhouse:jetbrains | 4 | 51 | 35 | 3 | 8 | 0 |
| greenhouse:jumia | 4 | 39 | 29 | 2 | 2 | 2 |
| greenhouse:justworks | 4 | 100 | 60 | 36 | 36 | 0 |
| greenhouse:khanacademy | 3 | 73 | 42 | 14 | 16 | 0 |
| greenhouse:klaviyo | 4 | 78 | 42 | 21 | 16 | 0 |
| greenhouse:komodohealth | 4 | 70 | 47 | 16 | 16 | 0 |
| greenhouse:krafton | 4 | 65 | 24 | 13 | 29 | 0 |
| greenhouse:labelbox | 4 | 56 | 40 | 8 | 8 | 0 |
| greenhouse:lattice | 2 | 42 | 25 | 13 | 11 | 0 |
| greenhouse:launchdarkly | 4 | 99 | 55 | 23 | 13 | 0 |
| greenhouse:lightmatter | 4 | 106 | 69 | 26 | 17 | 0 |
| greenhouse:lovable | 4 | 50 | 32 | 5 | 5 | 2 |
| greenhouse:lucidmotors | 4 | 129 | 62 | 37 | 29 | 0 |
| greenhouse:luno | 2 | 42 | 20 | 20 | 20 | 0 |
| greenhouse:lyft | 4 | 115 | 24 | 58 | 66 | 0 |
| greenhouse:medium | 3 | 67 | 36 | 22 | 19 | 0 |
| greenhouse:mentimeter | 4 | 56 | 31 | 22 | 21 | 0 |
| greenhouse:mercury | 4 | 60 | 33 | 11 | 11 | 0 |
| greenhouse:mirakl | 4 | 67 | 33 | 26 | 25 | 0 |
| greenhouse:mixpanel | 4 | 96 | 57 | 17 | 10 | 0 |
| greenhouse:mongodb | 4 | 99 | 45 | 17 | 27 | 0 |
| greenhouse:moniepoint | 4 | 51 | 33 | 12 | 12 | 1 |
| greenhouse:monzo | 3 | 67 | 36 | 21 | 12 | 0 |
| greenhouse:n26 | 2 | 32 | 18 | 12 | 12 | 0 |
| greenhouse:neo4j | 4 | 81 | 41 | 26 | 26 | 0 |
| greenhouse:netlify | 4 | 99 | 36 | 54 | 37 | 0 |
| greenhouse:netskope | 1 | 3 | 0 | 0 | 0 | 1 |
| greenhouse:newrelic | 4 | 70 | 42 | 24 | 24 | 0 |
| greenhouse:nextdoor | 4 | 61 | 44 | 8 | 8 | 0 |
| greenhouse:nice | 4 | 55 | 37 | 14 | 14 | 0 |
| greenhouse:nuro | 3 | 34 | 26 | 4 | 4 | 1 |
| greenhouse:oura | 4 | 78 | 57 | 13 | 10 | 0 |
| greenhouse:pagerduty | 4 | 58 | 46 | 8 | 8 | 0 |
| greenhouse:paypay | 4 | 49 | 22 | 15 | 15 | 0 |
| greenhouse:pendo | 4 | 62 | 41 | 13 | 17 | 0 |
| greenhouse:planetscale | 4 | 41 | 33 | 1 | 1 | 3 |
| greenhouse:polyai | 3 | 62 | 33 | 21 | 16 | 0 |
| greenhouse:porter | 4 | 45 | 32 | 8 | 8 | 2 |
| greenhouse:purestorage | 4 | 73 | 50 | 13 | 14 | 0 |
| greenhouse:quintoandar | 4 | 116 | 35 | 46 | 64 | 0 |
| greenhouse:raisin | 4 | 57 | 32 | 17 | 17 | 0 |
| greenhouse:ramp | 1 | 24 | 8 | 4 | 1 | 0 |
| greenhouse:realtimeboardglobal | 2 | 49 | 15 | 5 | 4 | 0 |
| greenhouse:reddit | 4 | 87 | 58 | 25 | 23 | 0 |
| greenhouse:riotgames | 4 | 102 | 37 | 50 | 50 | 0 |
| greenhouse:ripple | 4 | 61 | 38 | 10 | 12 | 0 |
| greenhouse:robinhood | 4 | 91 | 48 | 21 | 20 | 1 |
| greenhouse:rocketlab | 4 | 112 | 48 | 51 | 51 | 0 |
| greenhouse:samsara | 4 | 114 | 68 | 34 | 34 | 0 |
| greenhouse:sas | 3 | 60 | 43 | 15 | 11 | 0 |
| greenhouse:scaleai | 4 | 77 | 54 | 8 | 8 | 1 |
| greenhouse:scopely | 4 | 70 | 48 | 12 | 12 | 0 |
| greenhouse:shakepay | 4 | 53 | 32 | 8 | 8 | 0 |
| greenhouse:showpad | 4 | 51 | 36 | 11 | 11 | 0 |
| greenhouse:sigmacomputing | 4 | 72 | 49 | 16 | 16 | 0 |
| greenhouse:singlestore | 4 | 83 | 51 | 16 | 10 | 0 |
| greenhouse:slice | 4 | 44 | 32 | 5 | 5 | 1 |
| greenhouse:smartsheet | 4 | 101 | 66 | 29 | 28 | 0 |
| greenhouse:snorkelai | 4 | 75 | 57 | 10 | 10 | 0 |
| greenhouse:solarisbank | 4 | 50 | 28 | 21 | 21 | 0 |
| greenhouse:spacex | 4 | 110 | 60 | 34 | 36 | 0 |
| greenhouse:sproutsocial | 4 | 80 | 45 | 24 | 27 | 0 |
| greenhouse:squarespace | 4 | 105 | 45 | 42 | 47 | 0 |
| greenhouse:stabilityai | 1 | 3 | 0 | 0 | 0 | 1 |
| greenhouse:stackblitz | 4 | 82 | 52 | 18 | 18 | 0 |
| greenhouse:staffbase | 4 | 66 | 32 | 23 | 21 | 0 |
| greenhouse:starburst | 4 | 69 | 51 | 10 | 10 | 0 |
| greenhouse:stockx | 4 | 66 | 40 | 14 | 14 | 0 |
| greenhouse:stone | 4 | 105 | 32 | 49 | 49 | 0 |
| greenhouse:storyblok | 4 | 72 | 32 | 36 | 36 | 0 |
| greenhouse:stripe | 1 | 1 | 1 | 0 | 0 | 1 |
| greenhouse:sumologic | 4 | 50 | 38 | 8 | 8 | 0 |
| greenhouse:sumup | 4 | 47 | 28 | 13 | 11 | 1 |
| greenhouse:tailscale | 4 | 87 | 44 | 35 | 35 | 0 |
| greenhouse:tamara | 4 | 64 | 33 | 30 | 30 | 0 |
| greenhouse:tanium | 4 | 89 | 62 | 18 | 18 | 0 |
| greenhouse:taskrabbit | 4 | 73 | 50 | 19 | 19 | 0 |
| greenhouse:tenstorrent | 4 | 53 | 41 | 4 | 4 | 0 |
| greenhouse:toast | 2 | 30 | 14 | 13 | 13 | 0 |
| greenhouse:togetherai | 4 | 80 | 55 | 12 | 8 | 1 |
| greenhouse:tripactions | 4 | 72 | 49 | 15 | 15 | 0 |
| greenhouse:truelayer | 4 | 83 | 41 | 36 | 35 | 0 |
| greenhouse:trustpilot | 4 | 64 | 31 | 27 | 26 | 0 |
| greenhouse:turing | 4 | 42 | 36 | 4 | 4 | 2 |
| greenhouse:twilio | 4 | 76 | 51 | 21 | 21 | 0 |
| greenhouse:twitch | 4 | 148 | 52 | 75 | 63 | 0 |
| greenhouse:typeface | 4 | 52 | 36 | 10 | 9 | 0 |
| greenhouse:typeform | 4 | 57 | 29 | 20 | 16 | 0 |
| greenhouse:upwork | 4 | 60 | 34 | 20 | 18 | 0 |
| greenhouse:vercel | 4 | 94 | 54 | 30 | 22 | 0 |
| greenhouse:veriff | 4 | 50 | 35 | 8 | 8 | 1 |
| greenhouse:verkada | 4 | 45 | 36 | 2 | 2 | 2 |
| greenhouse:vonage | 4 | 53 | 32 | 17 | 18 | 0 |
| greenhouse:vtex | 4 | 83 | 43 | 37 | 37 | 0 |
| greenhouse:wallapop | 4 | 58 | 32 | 19 | 18 | 0 |
| greenhouse:warp | 4 | 64 | 41 | 16 | 16 | 0 |
| greenhouse:wasabi | 4 | 72 | 58 | 10 | 4 | 0 |
| greenhouse:wildlifestudios | 4 | 73 | 54 | 14 | 17 | 0 |
| greenhouse:wise | 2 | 38 | 26 | 8 | 8 | 0 |
| greenhouse:wolt | 4 | 54 | 32 | 18 | 18 | 0 |
| greenhouse:workato | 4 | 62 | 35 | 20 | 23 | 0 |
| greenhouse:xai | 4 | 105 | 53 | 39 | 36 | 0 |
| greenhouse:xendit | 4 | 52 | 32 | 16 | 16 | 0 |
| greenhouse:yugabyte | 4 | 72 | 54 | 8 | 4 | 2 |
| greenhouse:zocdoc | 4 | 66 | 43 | 19 | 17 | 0 |
| greenhouse:zoominfo | 4 | 71 | 57 | 8 | 8 | 0 |
| greenhouse:zscaler | 4 | 97 | 49 | 32 | 32 | 0 |

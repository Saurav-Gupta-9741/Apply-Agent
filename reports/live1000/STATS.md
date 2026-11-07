# Live run statistics (476 forms)

Generated 2026-11-07T16:08:21.999Z from results-a.jsonl, results-b.jsonl by `scripts/live1000-audit.mjs`. The run is still growing: re-run the script.

## Forms

| Outcome | Forms | Share |
|---|---:|---:|
| filled | 417 | 87.6% |
| no_form | 52 | 10.9% |
| closed | 5 | 1.1% |
| error | 2 | 0.4% |

| Platform | filled | no_form | closed | error |
|---|---:|---:|---:|---:|
| greenhouse | 305 | 52 | 1 | 2 |
| ashby | 112 | 0 | 4 | 0 |

Filled forms: **417**. Ready to submit (nothing left for the user): **70** (16.8%); needing the user: **347**. Run status: needs_user 347, ready_to_submit 70.

Errors:
- 1 × page.evaluate: Target page, context or browser has been closed
- 1 × page.goto: net::ERR_HTTP2_PROTOCOL_ERROR at https://job-boards.greenhouse.io/rob

## Fields

Fields on filled forms: **6981** (16.7 per form).

| Status | Fields | Share |
|---|---:|---:|
| filled | 3733 | 53.5% |
| needs_user | 2175 | 31.2% |
| skipped | 967 | 13.9% |
| failed | 106 | 1.5% |

- Filled by the extension: **53.5%** of all fields.
- Required fields: 4507; filled 2701; **left for the user: 1806 (40.1%)**.

| Decision | Fields | filled | needs_user | failed | skipped | already_filled |
|---|---:|---:|---:|---:|---:|---:|
| profile | 2978 | 2904 | 0 | 74 | 0 | 0 |
| ask | 2205 | 0 | 2175 | 0 | 30 | 0 |
| skip | 937 | 0 | 0 | 0 | 937 | 0 |
| answer | 445 | 413 | 0 | 32 | 0 | 0 |
| resume | 416 | 416 | 0 | 0 | 0 | 0 |

## Asks (fields left for the user), by reason / topic (top 30)

| Topic | All | Required |
|---|---:|---:|
| unknown | 914 | 913 |
| sponsorship | 215 | 192 |
| race | 170 | 42 |
| work_authorization | 157 | 144 |
| consent | 134 | 99 |
| salary | 124 | 98 |
| gender | 74 | 39 |
| notice_period | 67 | 35 |
| pronouns | 62 | 7 |
| relocation | 53 | 45 |
| disability | 48 | 26 |
| veteran | 42 | 29 |
| sexual_orientation | 41 | 15 |
| missing_profile_value | 31 | 31 |
| accommodation | 24 | 15 |
| transgender | 22 | 7 |
| identity | 12 | 12 |
| signature | 6 | 6 |
| age | 5 | 2 |
| criminal | 4 | 4 |

## Skips

| Reason | Fields |
|---|---:|
| optional, not in profile | 442 |
| optional attachment (not your resume) | 271 |
| optional choice | 179 |
| no portfolio in profile | 24 |
| optional attachment | 13 |
| optional address line 2 empty | 3 |
| not sure this saved answer fits: left for you | 3 |
| identity: entered by you only | 2 |

## Failed fills (decision:key)

| Decision:key (control) | Fields |
|---|---:|
| profile:school (combobox) | 44 |
| answer:How did you hear about this job? (combobox) | 24 |
| profile:location (combobox) | 18 |
| answer:How did you hear about this job? (checkbox_group) | 4 |
| profile:graduationYear (combobox) | 3 |
| profile:country (combobox) | 2 |
| profile:email (combobox) | 2 |
| profile:degree (combobox) | 2 |
| profile:discipline (combobox) | 2 |
| profile:preferredLocations (combobox) | 1 |
| answer:What is your notice period? (combobox) | 1 |
| answer:What is your notice period? (number) | 1 |
| answer:Gender (combobox) | 1 |
| answer:Veteran status (combobox) | 1 |

## Time per form

Median 12s, mean 16.3s, max 54s (all 476 forms; includes page load, 3s settle and the fill). Filled forms: median 12s.

## Per platform

| Platform | Forms filled | Fields | Filled | Needs user | Failed | Required left | Ready | Median s |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| greenhouse | 305 | 5770 | 3060 (53.0%) | 1988 | 93 | 1688 of 3910 | 16 | 12 |
| ashby | 112 | 1211 | 673 (55.6%) | 187 | 13 | 118 of 597 | 54 | 13 |

## Fills the page cleared afterwards

65 text fills on 30 forms were reported filled but were empty when the page was read 0.8 s later (other fills on the same forms were there). By field: first_name 30, last_name 19, email 10, preferred_name 6. On Greenhouse these are the fields its resume autofill sets (first/last name, email, phone): its parse request is blocked in this run, and the reset arrives after the fill.

## Safety

- Requests blocked by the read-only guard: 4785 on 466 forms (analytics, consent and tracking beacons).
- Blocked requests that look like application sends (to the ATS, path with appl/submit/candidate): **0**.
- Forms whose URL changed during the fill: **0** (must be 0).

## Accuracy (see WRONG.md)

Filled fields judged: 3733. Correct **3701** (99.1%), wrong **32** (0.9%), unclear 0 (0 unique pairs, listed in UNCLEAR.md).

## Per company (filled forms)

| Company | Forms | Fields | Filled | Needs user | Required left | Ready |
|---|---:|---:|---:|---:|---:|---:|
| ashby:1password | 1 | 30 | 9 | 7 | 5 | 0 |
| ashby:abridge | 1 | 17 | 6 | 4 | 4 | 0 |
| ashby:acorns | 1 | 14 | 10 | 0 | 0 | 1 |
| ashby:airbyte | 1 | 5 | 5 | 0 | 0 | 1 |
| ashby:airwallex | 1 | 11 | 8 | 1 | 0 | 1 |
| ashby:alan | 1 | 23 | 11 | 2 | 0 | 1 |
| ashby:alchemy | 1 | 11 | 7 | 0 | 0 | 1 |
| ashby:alephalpha | 1 | 8 | 5 | 2 | 1 | 0 |
| ashby:amplitude | 1 | 7 | 5 | 0 | 0 | 1 |
| ashby:andela | 1 | 4 | 4 | 0 | 0 | 1 |
| ashby:anyscale | 1 | 13 | 8 | 1 | 0 | 1 |
| ashby:ashby | 1 | 9 | 5 | 3 | 3 | 0 |
| ashby:atlan | 1 | 16 | 9 | 3 | 3 | 0 |
| ashby:babbel | 1 | 11 | 5 | 6 | 6 | 0 |
| ashby:backmarket | 1 | 15 | 7 | 4 | 3 | 0 |
| ashby:benchling | 1 | 16 | 6 | 6 | 4 | 0 |
| ashby:benevity | 1 | 8 | 6 | 1 | 0 | 1 |
| ashby:cerebras | 1 | 6 | 5 | 0 | 0 | 1 |
| ashby:circle | 1 | 7 | 5 | 0 | 0 | 1 |
| ashby:clearco | 1 | 6 | 5 | 1 | 1 | 0 |
| ashby:clerk | 1 | 6 | 3 | 0 | 0 | 1 |
| ashby:clickhouse | 1 | 8 | 6 | 0 | 0 | 1 |
| ashby:clickup | 1 | 8 | 5 | 3 | 2 | 0 |
| ashby:cognition | 1 | 7 | 6 | 0 | 0 | 1 |
| ashby:cohere | 1 | 9 | 6 | 1 | 0 | 1 |
| ashby:dave | 1 | 6 | 6 | 0 | 0 | 1 |
| ashby:deepl | 1 | 16 | 5 | 7 | 3 | 0 |
| ashby:docker | 1 | 9 | 5 | 1 | 1 | 0 |
| ashby:doctolib | 1 | 9 | 5 | 2 | 2 | 0 |
| ashby:drata | 1 | 8 | 7 | 1 | 1 | 0 |
| ashby:elevenlabs | 1 | 10 | 4 | 1 | 1 | 0 |
| ashby:epidemic-sound | 1 | 5 | 5 | 0 | 0 | 1 |
| ashby:faculty | 1 | 7 | 5 | 2 | 0 | 1 |
| ashby:farfetch | 1 | 16 | 9 | 1 | 0 | 1 |
| ashby:fullstory | 1 | 9 | 6 | 1 | 0 | 1 |
| ashby:gainsight | 1 | 9 | 6 | 1 | 1 | 0 |
| ashby:gorgias | 1 | 5 | 4 | 0 | 0 | 1 |
| ashby:harvey | 1 | 14 | 10 | 2 | 0 | 1 |
| ashby:helpscout | 1 | 16 | 7 | 3 | 1 | 0 |
| ashby:hex | 1 | 10 | 5 | 3 | 3 | 0 |
| ashby:hopper | 1 | 18 | 5 | 3 | 3 | 0 |
| ashby:illumio | 1 | 13 | 7 | 2 | 1 | 0 |
| ashby:improbable | 1 | 11 | 7 | 2 | 1 | 0 |
| ashby:influxdata | 1 | 7 | 4 | 1 | 1 | 0 |
| ashby:insitro | 1 | 9 | 5 | 2 | 2 | 0 |
| ashby:iterable | 1 | 11 | 8 | 1 | 0 | 1 |
| ashby:koho | 1 | 8 | 4 | 2 | 2 | 0 |
| ashby:kong | 1 | 10 | 7 | 1 | 1 | 0 |
| ashby:kustomer | 1 | 8 | 5 | 2 | 1 | 0 |
| ashby:lambda | 1 | 8 | 7 | 0 | 0 | 1 |
| ashby:langchain | 1 | 4 | 3 | 1 | 1 | 0 |
| ashby:ledger | 1 | 6 | 4 | 1 | 0 | 1 |
| ashby:lightspeed | 1 | 4 | 4 | 0 | 0 | 1 |
| ashby:linear | 1 | 13 | 7 | 4 | 4 | 0 |
| ashby:llamaindex | 1 | 7 | 4 | 0 | 0 | 1 |
| ashby:magic | 1 | 7 | 4 | 1 | 1 | 0 |
| ashby:mapbox | 1 | 13 | 6 | 2 | 0 | 1 |
| ashby:marshmallow | 1 | 12 | 6 | 4 | 2 | 0 |
| ashby:mintlify | 1 | 7 | 4 | 1 | 0 | 1 |
| ashby:miro | 1 | 8 | 5 | 2 | 2 | 0 |
| ashby:modal | 1 | 3 | 3 | 0 | 0 | 1 |
| ashby:mollie | 1 | 6 | 3 | 3 | 2 | 0 |
| ashby:moneybox | 1 | 19 | 9 | 6 | 4 | 0 |
| ashby:notion | 1 | 14 | 6 | 1 | 0 | 1 |
| ashby:nubank | 1 | 11 | 6 | 2 | 0 | 1 |
| ashby:openai | 1 | 10 | 6 | 1 | 1 | 0 |
| ashby:oyster | 1 | 22 | 4 | 7 | 6 | 0 |
| ashby:paddle | 1 | 7 | 5 | 1 | 0 | 1 |
| ashby:patreon | 1 | 10 | 7 | 0 | 0 | 1 |
| ashby:perplexity | 1 | 8 | 5 | 3 | 3 | 0 |
| ashby:pinecone | 1 | 10 | 6 | 2 | 0 | 1 |
| ashby:plaid | 1 | 34 | 10 | 0 | 0 | 1 |
| ashby:pleo | 1 | 12 | 7 | 4 | 3 | 0 |
| ashby:poolside | 1 | 6 | 5 | 0 | 0 | 1 |
| ashby:poshmark | 1 | 7 | 5 | 1 | 0 | 1 |
| ashby:primer | 1 | 6 | 5 | 1 | 1 | 0 |
| ashby:qonto | 1 | 18 | 8 | 4 | 3 | 0 |
| ashby:quora | 1 | 27 | 10 | 2 | 0 | 1 |
| ashby:railway | 1 | 4 | 3 | 1 | 1 | 0 |
| ashby:redis | 1 | 7 | 6 | 0 | 0 | 1 |
| ashby:render | 1 | 10 | 7 | 1 | 0 | 1 |
| ashby:replit | 1 | 13 | 7 | 2 | 2 | 0 |
| ashby:resend | 1 | 11 | 7 | 2 | 2 | 0 |
| ashby:rohlik | 1 | 6 | 5 | 0 | 0 | 1 |
| ashby:runway | 1 | 5 | 3 | 0 | 0 | 1 |
| ashby:satispay | 1 | 41 | 8 | 2 | 1 | 0 |
| ashby:sentry | 1 | 10 | 7 | 3 | 2 | 0 |
| ashby:skydio | 1 | 6 | 5 | 0 | 0 | 1 |
| ashby:snowflake | 1 | 12 | 6 | 1 | 1 | 0 |
| ashby:snyk | 1 | 10 | 8 | 0 | 0 | 1 |
| ashby:sorare | 1 | 10 | 6 | 1 | 0 | 1 |
| ashby:strava | 1 | 9 | 6 | 1 | 0 | 1 |
| ashby:substack | 1 | 6 | 5 | 1 | 1 | 0 |
| ashby:supabase | 1 | 11 | 8 | 1 | 1 | 0 |
| ashby:surveymonkey | 1 | 12 | 8 | 2 | 0 | 1 |
| ashby:synthesia | 1 | 8 | 5 | 2 | 2 | 0 |
| ashby:temporal | 1 | 17 | 9 | 2 | 0 | 1 |
| ashby:thinkific | 1 | 9 | 5 | 2 | 2 | 0 |
| ashby:thought-machine | 1 | 9 | 6 | 1 | 0 | 1 |
| ashby:thumbtack | 1 | 14 | 6 | 0 | 0 | 1 |
| ashby:tractable | 1 | 6 | 4 | 1 | 2 | 0 |
| ashby:uipath | 1 | 11 | 7 | 0 | 0 | 1 |
| ashby:vanta | 1 | 9 | 8 | 0 | 0 | 1 |
| ashby:watershed | 1 | 11 | 5 | 2 | 2 | 0 |
| ashby:wayve | 1 | 10 | 6 | 3 | 2 | 0 |
| ashby:wealthsimple | 1 | 9 | 6 | 2 | 1 | 0 |
| ashby:weaviate | 1 | 7 | 6 | 1 | 1 | 0 |
| ashby:webflow | 1 | 12 | 6 | 1 | 0 | 1 |
| ashby:whoop | 1 | 17 | 8 | 3 | 1 | 0 |
| ashby:writer | 1 | 9 | 6 | 2 | 2 | 0 |
| ashby:xero | 1 | 15 | 4 | 4 | 1 | 0 |
| ashby:zapier | 1 | 17 | 9 | 3 | 1 | 0 |
| greenhouse:abnormalsecurity | 2 | 42 | 26 | 12 | 12 | 0 |
| greenhouse:adyen | 2 | 36 | 13 | 19 | 13 | 0 |
| greenhouse:affirm | 2 | 43 | 21 | 12 | 10 | 0 |
| greenhouse:agoda | 2 | 45 | 18 | 19 | 23 | 0 |
| greenhouse:airbnb | 2 | 37 | 21 | 14 | 14 | 0 |
| greenhouse:airtable | 2 | 33 | 20 | 9 | 7 | 0 |
| greenhouse:algolia | 2 | 45 | 28 | 11 | 13 | 0 |
| greenhouse:anthropic | 2 | 48 | 18 | 21 | 18 | 0 |
| greenhouse:apolloio | 2 | 35 | 18 | 14 | 10 | 0 |
| greenhouse:appier | 1 | 9 | 8 | 0 | 0 | 1 |
| greenhouse:asana | 1 | 25 | 8 | 12 | 12 | 0 |
| greenhouse:attentive | 2 | 36 | 20 | 8 | 6 | 0 |
| greenhouse:backblaze | 2 | 27 | 20 | 3 | 3 | 0 |
| greenhouse:bandwidth | 2 | 30 | 20 | 8 | 8 | 0 |
| greenhouse:betterment | 2 | 42 | 22 | 14 | 10 | 0 |
| greenhouse:billcom | 2 | 42 | 30 | 10 | 10 | 0 |
| greenhouse:bird | 1 | 10 | 7 | 2 | 2 | 0 |
| greenhouse:block | 2 | 67 | 30 | 26 | 27 | 0 |
| greenhouse:blockchain | 1 | 12 | 7 | 3 | 3 | 0 |
| greenhouse:branch | 1 | 15 | 11 | 3 | 3 | 0 |
| greenhouse:braze | 2 | 39 | 20 | 12 | 9 | 0 |
| greenhouse:brex | 2 | 50 | 26 | 16 | 10 | 0 |
| greenhouse:c6bank | 1 | 27 | 7 | 16 | 15 | 0 |
| greenhouse:cabify | 2 | 35 | 14 | 21 | 20 | 0 |
| greenhouse:calendly | 2 | 42 | 20 | 20 | 20 | 0 |
| greenhouse:calm | 1 | 25 | 10 | 14 | 7 | 0 |
| greenhouse:careem | 2 | 40 | 22 | 14 | 14 | 0 |
| greenhouse:carta | 2 | 34 | 20 | 10 | 8 | 0 |
| greenhouse:celonis | 2 | 44 | 22 | 14 | 12 | 0 |
| greenhouse:checkr | 2 | 28 | 17 | 8 | 8 | 0 |
| greenhouse:chime | 2 | 44 | 22 | 20 | 20 | 0 |
| greenhouse:circleci | 2 | 37 | 18 | 16 | 10 | 0 |
| greenhouse:cleo | 1 | 20 | 11 | 5 | 2 | 0 |
| greenhouse:cloudflare | 2 | 29 | 20 | 5 | 4 | 0 |
| greenhouse:cockroachlabs | 2 | 42 | 27 | 9 | 5 | 0 |
| greenhouse:cognite | 1 | 15 | 10 | 3 | 3 | 0 |
| greenhouse:collibra | 2 | 34 | 22 | 8 | 6 | 0 |
| greenhouse:commercetools | 1 | 19 | 11 | 7 | 7 | 0 |
| greenhouse:consensys | 1 | 17 | 9 | 7 | 7 | 0 |
| greenhouse:contentful | 2 | 27 | 17 | 5 | 5 | 0 |
| greenhouse:coreweave | 2 | 52 | 24 | 23 | 19 | 0 |
| greenhouse:coursera | 2 | 32 | 18 | 10 | 10 | 0 |
| greenhouse:cresta | 2 | 22 | 18 | 0 | 0 | 2 |
| greenhouse:cribl | 1 | 17 | 12 | 3 | 2 | 0 |
| greenhouse:cultureamp | 2 | 40 | 21 | 15 | 3 | 0 |
| greenhouse:databricks | 2 | 36 | 20 | 12 | 11 | 0 |
| greenhouse:datadog | 2 | 34 | 20 | 12 | 11 | 0 |
| greenhouse:dataiku | 2 | 42 | 24 | 14 | 13 | 0 |
| greenhouse:dcard | 1 | 13 | 7 | 2 | 2 | 0 |
| greenhouse:deliveroo | 2 | 21 | 16 | 4 | 4 | 0 |
| greenhouse:dialpad | 2 | 39 | 25 | 8 | 5 | 0 |
| greenhouse:discord | 2 | 54 | 34 | 14 | 10 | 0 |
| greenhouse:dremio | 2 | 34 | 21 | 9 | 7 | 0 |
| greenhouse:druva | 2 | 25 | 19 | 4 | 2 | 1 |
| greenhouse:ebanx | 1 | 20 | 8 | 9 | 8 | 0 |
| greenhouse:esri | 2 | 34 | 22 | 10 | 4 | 0 |
| greenhouse:eucalyptus | 1 | 14 | 7 | 7 | 7 | 0 |
| greenhouse:faire | 2 | 35 | 18 | 11 | 12 | 0 |
| greenhouse:fastly | 2 | 47 | 26 | 16 | 13 | 0 |
| greenhouse:figma | 2 | 38 | 22 | 12 | 8 | 0 |
| greenhouse:figureai | 2 | 20 | 17 | 0 | 0 | 2 |
| greenhouse:fireblocks | 2 | 23 | 18 | 1 | 0 | 2 |
| greenhouse:five9 | 2 | 33 | 20 | 6 | 6 | 0 |
| greenhouse:fivetran | 2 | 54 | 26 | 20 | 18 | 0 |
| greenhouse:flatironhealth | 2 | 49 | 20 | 26 | 26 | 0 |
| greenhouse:flexport | 1 | 15 | 8 | 6 | 4 | 0 |
| greenhouse:formlabs | 2 | 26 | 18 | 6 | 4 | 0 |
| greenhouse:gemini | 2 | 33 | 20 | 9 | 9 | 0 |
| greenhouse:ginkgobioworks | 2 | 42 | 20 | 14 | 10 | 0 |
| greenhouse:gitlab | 2 | 36 | 22 | 8 | 6 | 0 |
| greenhouse:glance | 2 | 22 | 18 | 4 | 4 | 0 |
| greenhouse:gocardless | 2 | 42 | 17 | 20 | 12 | 0 |
| greenhouse:grafanalabs | 2 | 28 | 23 | 5 | 4 | 0 |
| greenhouse:graphcore | 2 | 49 | 19 | 27 | 28 | 0 |
| greenhouse:greenhouse | 2 | 49 | 21 | 24 | 24 | 0 |
| greenhouse:groww | 2 | 25 | 16 | 9 | 7 | 0 |
| greenhouse:gusto | 2 | 51 | 25 | 24 | 23 | 0 |
| greenhouse:gympass | 1 | 37 | 9 | 20 | 17 | 0 |
| greenhouse:gymshark | 2 | 48 | 20 | 24 | 18 | 0 |
| greenhouse:honeycomb | 2 | 36 | 23 | 8 | 5 | 0 |
| greenhouse:hootsuite | 2 | 48 | 16 | 26 | 18 | 0 |
| greenhouse:housinganywhere | 1 | 12 | 8 | 3 | 3 | 0 |
| greenhouse:imply | 1 | 15 | 10 | 3 | 2 | 0 |
| greenhouse:inflectionai | 2 | 34 | 24 | 2 | 0 | 2 |
| greenhouse:inmobi | 2 | 28 | 18 | 10 | 10 | 0 |
| greenhouse:instacart | 2 | 41 | 21 | 18 | 18 | 0 |
| greenhouse:inter | 1 | 31 | 7 | 22 | 22 | 0 |
| greenhouse:intercom | 1 | 27 | 12 | 9 | 10 | 0 |
| greenhouse:isaraerospace | 2 | 35 | 17 | 14 | 14 | 0 |
| greenhouse:jetbrains | 2 | 25 | 17 | 1 | 4 | 0 |
| greenhouse:jumia | 1 | 9 | 7 | 0 | 0 | 1 |
| greenhouse:justworks | 2 | 50 | 22 | 26 | 26 | 0 |
| greenhouse:khanacademy | 2 | 47 | 24 | 12 | 11 | 0 |
| greenhouse:klaviyo | 2 | 37 | 22 | 9 | 7 | 0 |
| greenhouse:komodohealth | 2 | 31 | 19 | 8 | 7 | 0 |
| greenhouse:krafton | 1 | 16 | 7 | 6 | 6 | 0 |
| greenhouse:labelbox | 2 | 28 | 20 | 4 | 4 | 0 |
| greenhouse:lattice | 2 | 42 | 23 | 15 | 11 | 0 |
| greenhouse:launchdarkly | 2 | 53 | 24 | 17 | 6 | 0 |
| greenhouse:lightmatter | 2 | 54 | 25 | 24 | 9 | 0 |
| greenhouse:lovable | 1 | 12 | 8 | 1 | 1 | 0 |
| greenhouse:lucidmotors | 2 | 65 | 28 | 29 | 13 | 0 |
| greenhouse:luno | 1 | 21 | 8 | 12 | 12 | 0 |
| greenhouse:lyft | 2 | 60 | 14 | 33 | 34 | 0 |
| greenhouse:medium | 2 | 45 | 22 | 17 | 13 | 0 |
| greenhouse:mentimeter | 1 | 16 | 9 | 5 | 4 | 0 |
| greenhouse:mercury | 2 | 30 | 16 | 6 | 6 | 0 |
| greenhouse:mirakl | 2 | 34 | 16 | 14 | 14 | 0 |
| greenhouse:mixpanel | 2 | 49 | 27 | 12 | 6 | 0 |
| greenhouse:mongodb | 2 | 56 | 26 | 14 | 16 | 0 |
| greenhouse:moniepoint | 2 | 28 | 17 | 8 | 8 | 0 |
| greenhouse:monzo | 2 | 47 | 18 | 23 | 9 | 0 |
| greenhouse:neo4j | 2 | 48 | 18 | 20 | 20 | 0 |
| greenhouse:netlify | 2 | 50 | 18 | 27 | 18 | 0 |
| greenhouse:newrelic | 2 | 37 | 22 | 13 | 13 | 0 |
| greenhouse:nextdoor | 2 | 31 | 20 | 6 | 6 | 0 |
| greenhouse:nice | 2 | 22 | 15 | 5 | 5 | 0 |
| greenhouse:nuro | 2 | 33 | 20 | 8 | 7 | 0 |
| greenhouse:oura | 2 | 47 | 30 | 13 | 9 | 0 |
| greenhouse:pagerduty | 2 | 29 | 20 | 7 | 5 | 0 |
| greenhouse:paypay | 2 | 20 | 12 | 2 | 2 | 0 |
| greenhouse:pendo | 2 | 31 | 18 | 9 | 11 | 0 |
| greenhouse:planetscale | 2 | 20 | 16 | 1 | 1 | 1 |
| greenhouse:polyai | 1 | 23 | 12 | 8 | 6 | 0 |
| greenhouse:porter | 1 | 21 | 13 | 6 | 5 | 0 |
| greenhouse:purestorage | 1 | 11 | 8 | 0 | 0 | 1 |
| greenhouse:quintoandar | 1 | 32 | 8 | 22 | 20 | 0 |
| greenhouse:raisin | 2 | 29 | 16 | 9 | 9 | 0 |
| greenhouse:ramp | 1 | 24 | 8 | 4 | 1 | 0 |
| greenhouse:reddit | 1 | 17 | 11 | 5 | 4 | 0 |
| greenhouse:riotgames | 2 | 51 | 16 | 28 | 28 | 0 |
| greenhouse:ripple | 1 | 14 | 10 | 2 | 2 | 0 |
| greenhouse:robinhood | 2 | 53 | 22 | 18 | 18 | 0 |
| greenhouse:rocketlab | 2 | 57 | 24 | 27 | 23 | 0 |
| greenhouse:samsara | 2 | 58 | 27 | 25 | 24 | 0 |
| greenhouse:sas | 1 | 23 | 11 | 12 | 5 | 0 |
| greenhouse:scaleai | 1 | 21 | 13 | 5 | 4 | 0 |
| greenhouse:scopely | 2 | 36 | 24 | 6 | 6 | 0 |
| greenhouse:shakepay | 1 | 12 | 7 | 3 | 3 | 0 |
| greenhouse:showpad | 1 | 13 | 8 | 4 | 4 | 0 |
| greenhouse:sigmacomputing | 2 | 34 | 20 | 11 | 10 | 0 |
| greenhouse:singlestore | 1 | 23 | 13 | 5 | 2 | 0 |
| greenhouse:slice | 1 | 11 | 8 | 2 | 2 | 0 |
| greenhouse:smartsheet | 2 | 47 | 23 | 23 | 21 | 0 |
| greenhouse:snorkelai | 1 | 20 | 13 | 5 | 4 | 0 |
| greenhouse:solarisbank | 1 | 12 | 7 | 5 | 5 | 0 |
| greenhouse:spacex | 1 | 30 | 14 | 12 | 12 | 0 |
| greenhouse:sproutsocial | 2 | 42 | 23 | 17 | 13 | 0 |
| greenhouse:squarespace | 1 | 26 | 11 | 11 | 12 | 0 |
| greenhouse:stabilityai | 1 | 3 | 0 | 0 | 0 | 1 |
| greenhouse:stackblitz | 1 | 18 | 12 | 3 | 2 | 0 |
| greenhouse:staffbase | 1 | 14 | 8 | 4 | 4 | 0 |
| greenhouse:starburst | 2 | 35 | 22 | 7 | 7 | 0 |
| greenhouse:stockx | 1 | 15 | 9 | 3 | 3 | 0 |
| greenhouse:stone | 1 | 23 | 8 | 10 | 9 | 0 |
| greenhouse:storyblok | 1 | 18 | 8 | 9 | 9 | 0 |
| greenhouse:sumologic | 1 | 13 | 10 | 2 | 2 | 0 |
| greenhouse:sumup | 2 | 23 | 15 | 3 | 1 | 1 |
| greenhouse:tailscale | 1 | 20 | 9 | 9 | 9 | 0 |
| greenhouse:tamara | 2 | 32 | 17 | 14 | 14 | 0 |
| greenhouse:tanium | 1 | 20 | 11 | 7 | 7 | 0 |
| greenhouse:taskrabbit | 2 | 37 | 22 | 13 | 11 | 0 |
| greenhouse:tenstorrent | 1 | 14 | 10 | 2 | 1 | 0 |
| greenhouse:togetherai | 2 | 34 | 22 | 5 | 3 | 1 |
| greenhouse:tripactions | 1 | 16 | 10 | 4 | 4 | 0 |
| greenhouse:truelayer | 1 | 19 | 7 | 10 | 10 | 0 |
| greenhouse:trustpilot | 2 | 31 | 16 | 13 | 13 | 0 |
| greenhouse:turing | 1 | 12 | 8 | 4 | 4 | 0 |
| greenhouse:twilio | 2 | 42 | 20 | 20 | 20 | 0 |
| greenhouse:twitch | 1 | 37 | 12 | 20 | 16 | 0 |
| greenhouse:typeface | 2 | 24 | 16 | 6 | 6 | 0 |
| greenhouse:typeform | 1 | 14 | 7 | 5 | 4 | 0 |
| greenhouse:upwork | 1 | 18 | 8 | 7 | 6 | 0 |
| greenhouse:vercel | 1 | 25 | 9 | 13 | 7 | 0 |
| greenhouse:veriff | 1 | 13 | 8 | 3 | 3 | 0 |
| greenhouse:verkada | 1 | 10 | 8 | 1 | 1 | 0 |
| greenhouse:vonage | 1 | 12 | 8 | 4 | 4 | 0 |
| greenhouse:vtex | 1 | 22 | 8 | 13 | 13 | 0 |
| greenhouse:wallapop | 1 | 16 | 8 | 6 | 6 | 0 |
| greenhouse:warp | 1 | 14 | 9 | 4 | 3 | 0 |
| greenhouse:wasabi | 1 | 20 | 11 | 8 | 1 | 0 |
| greenhouse:wildlifestudios | 1 | 12 | 9 | 2 | 2 | 0 |
| greenhouse:wise | 1 | 19 | 12 | 5 | 4 | 0 |
| greenhouse:wolt | 1 | 17 | 7 | 9 | 8 | 0 |
| greenhouse:workato | 1 | 14 | 7 | 6 | 6 | 0 |
| greenhouse:xai | 1 | 28 | 15 | 10 | 8 | 0 |
| greenhouse:xendit | 1 | 13 | 8 | 4 | 4 | 0 |
| greenhouse:yugabyte | 1 | 16 | 10 | 4 | 3 | 0 |
| greenhouse:zocdoc | 1 | 16 | 7 | 8 | 2 | 0 |
| greenhouse:zoominfo | 1 | 19 | 14 | 4 | 3 | 0 |
| greenhouse:zscaler | 1 | 24 | 11 | 9 | 9 | 0 |

# Live run statistics (225 forms)

Generated 2026-11-09T21:47:20.209Z from results-r7b-a.jsonl, results-r7b-b.jsonl by `scripts/live1000-audit.mjs`. The run is still growing: re-run the script.

## Forms

| Outcome | Forms | Share |
|---|---:|---:|
| filled | 223 | 99.1% |
| closed | 1 | 0.4% |
| error | 1 | 0.4% |

| Platform | filled | closed | error |
|---|---:|---:|---:|
| greenhouse | 69 | 1 | 0 |
| ashby | 60 | 0 | 0 |
| bamboohr | 23 | 0 | 0 |
| breezy | 71 | 0 | 1 |

Filled forms: **223**. Ready to submit (nothing left for the user): **67** (30.0%); needing the user: **156**. Run status: needs_user 156, ready_to_submit 67.

Errors:
- 1 × page.goto: net::ERR_CONNECTION_CLOSED at https://segal-mccambridge.breezy.hr/p/9

## Fields

Fields on filled forms: **3956** (17.7 per form).

| Status | Fields | Share |
|---|---:|---:|
| filled | 2407 | 60.8% |
| skipped | 846 | 21.4% |
| needs_user | 527 | 13.3% |
| failed | 113 | 2.9% |
| already_filled | 63 | 1.6% |

- Filled by the extension: **60.8%** of all fields.
- Required fields: 1800; filled 1252; **left for the user: 548 (30.4%)**.
- Required sections (lists such as Breezy "Work History*", not in the field list): 78; **left empty: 5** (summary 5).

| Decision | Fields | filled | needs_user | failed | skipped | already_filled |
|---|---:|---:|---:|---:|---:|---:|
| profile | 1282 | 1194 | 0 | 88 | 0 | 0 |
| skip | 849 | 0 | 0 | 0 | 837 | 12 |
| ask | 587 | 0 | 527 | 0 | 9 | 51 |
| answer | 513 | 488 | 0 | 25 | 0 | 0 |
| work | 504 | 504 | 0 | 0 | 0 | 0 |
| resume | 221 | 221 | 0 | 0 | 0 | 0 |

## Asks (fields left for the user), by reason / topic (top 30)

| Topic | All | Required |
|---|---:|---:|
| unknown | 388 | 388 |
| salary | 51 | 19 |
| consent | 48 | 36 |
| notice_period | 26 | 16 |
| missing_profile_value | 17 | 17 |
| relocation | 13 | 12 |
| sponsorship | 13 | 7 |
| work_authorization | 9 | 7 |
| pronouns | 8 | 4 |
| accommodation | 3 | 3 |
| signature | 2 | 2 |
| criminal | 2 | 2 |
| disability | 2 | 0 |
| age | 2 | 0 |
| identity | 1 | 1 |
| sensitive | 1 | 1 |
| gender | 1 | 0 |

## Skips

| Reason | Fields |
|---|---:|
| optional, not in profile | 401 |
| optional choice | 125 |
| study dates are not in your profile | 112 |
| optional attachment (not your resume) | 78 |
| current job: no end date | 56 |
| no addressLine1 in profile | 23 |
| no postalCode in profile | 23 |
| no portfolio in profile | 20 |
| not sure this saved answer fits: left for you | 6 |
| optional attachment | 3 |
| optional address line 2 empty | 1 |
| identity: entered by you only | 1 |

## Failed fills (decision:key)

| Decision:key (control) | Fields |
|---|---:|
| profile:location (combobox) | 72 |
| profile:school (combobox) | 13 |
| answer:How did you hear about this job? (combobox) | 6 |
| answer:Quick answers › previous employer (combobox) | 6 |
| answer:Quick answers › expected salary abroad (text) | 3 |
| answer:How did you hear about this job? (checkbox_group) | 2 |
| profile:state (combobox) | 2 |
| answer:Gender (combobox) | 2 |
| answer:Disability status (combobox) | 1 |
| profile:country (combobox) | 1 |
| answer:Quick answers › work authorization (combobox) | 1 |
| answer:Quick answers › sponsorship (combobox) | 1 |
| answer:Race / Ethnicity (combobox) | 1 |
| answer:Veteran status (combobox) | 1 |
| answer:Quick answers › relocation (combobox) | 1 |

## Time per form

Median 24s, mean 23.4s, max 119s (all 225 forms; includes page load, 3s settle and the fill). Filled forms: median 24s.

## Per platform

| Platform | Forms filled | Fields | Filled | Needs user | Failed | Required left | Ready | Median s |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| greenhouse | 69 | 1350 | 900 (66.7%) | 217 | 78 | 256 of 854 | 6 | 24 |
| ashby | 60 | 551 | 321 (58.3%) | 58 | 32 | 45 of 304 | 32 | 13 |
| bamboohr | 23 | 331 | 192 (58.0%) | 22 | 0 | 17 of 47 | 13 | 21 |
| breezy | 71 | 1724 | 994 (57.7%) | 230 | 3 | 235 of 673 | 16 | 28 |

## Fills the page cleared afterwards

23 text fills on 23 forms were reported filled but were empty when the page was read 0.8 s later (other fills on the same forms were there). By field: city.value 23. On Greenhouse these are the fields its resume autofill sets (first/last name, email, phone): its parse request is blocked in this run, and the reset arrives after the fill.

## Safety

- Requests blocked by the read-only guard: 2040 on 224 forms (analytics, consent and tracking beacons).
- Blocked requests that look like application sends (to the ATS, path with appl/submit/candidate): **0**.
- Forms whose URL changed during the fill: **10** (must be 0).
  - URL changed: https://job-boards.greenhouse.io/billcom/jobs/6217056004
  - URL changed: https://job-boards.greenhouse.io/coreweave/jobs/4718149006
  - URL changed: https://job-boards.greenhouse.io/stabilityai/jobs/4965731101
  - URL changed: https://job-boards.greenhouse.io/zoominfo/jobs/8622943002
  - URL changed: https://job-boards.greenhouse.io/coreweave/jobs/4688540006
  - URL changed: https://job-boards.greenhouse.io/circleci/jobs/8801094002
  - URL changed: https://job-boards.greenhouse.io/lucidmotors/jobs/5093940007
  - URL changed: https://job-boards.greenhouse.io/circleci/jobs/8560754002
  - URL changed: https://job-boards.greenhouse.io/lucidmotors/jobs/5279891007
  - URL changed: https://job-boards.greenhouse.io/samsara/jobs/8162034

## Accuracy (see WRONG.md)

Filled fields judged: 2407. Correct **2407** (100.0%), wrong **0** (0.0%), unclear 0 (0 unique pairs, listed in UNCLEAR.md).

## Per company (filled forms)

| Company | Forms | Fields | Filled | Needs user | Required left | Ready |
|---|---:|---:|---:|---:|---:|---:|
| ashby:1password | 1 | 25 | 11 | 3 | 2 | 0 |
| ashby:abridge | 1 | 17 | 5 | 4 | 4 | 0 |
| ashby:acorns | 1 | 14 | 9 | 0 | 0 | 1 |
| ashby:airbyte | 1 | 5 | 4 | 0 | 0 | 1 |
| ashby:alchemy | 1 | 8 | 6 | 0 | 0 | 1 |
| ashby:amplitude | 1 | 7 | 6 | 0 | 0 | 1 |
| ashby:andela | 1 | 4 | 4 | 0 | 0 | 1 |
| ashby:benchling | 1 | 16 | 6 | 5 | 3 | 0 |
| ashby:cerebras | 1 | 6 | 4 | 0 | 0 | 1 |
| ashby:circle | 1 | 6 | 5 | 0 | 0 | 1 |
| ashby:clerk | 1 | 6 | 4 | 0 | 0 | 1 |
| ashby:clickup | 1 | 8 | 6 | 1 | 1 | 0 |
| ashby:dave | 1 | 18 | 4 | 3 | 3 | 0 |
| ashby:docker | 1 | 9 | 5 | 1 | 1 | 0 |
| ashby:drata | 1 | 8 | 6 | 1 | 1 | 0 |
| ashby:fullstory | 1 | 9 | 5 | 1 | 0 | 1 |
| ashby:gainsight | 1 | 9 | 6 | 0 | 0 | 1 |
| ashby:helpscout | 1 | 16 | 8 | 1 | 1 | 0 |
| ashby:hex | 1 | 9 | 6 | 0 | 0 | 1 |
| ashby:hopper | 1 | 18 | 4 | 3 | 3 | 0 |
| ashby:insitro | 1 | 9 | 5 | 2 | 2 | 0 |
| ashby:kustomer | 1 | 8 | 5 | 1 | 1 | 0 |
| ashby:langchain | 2 | 10 | 8 | 1 | 1 | 1 |
| ashby:lightspeed | 2 | 8 | 8 | 0 | 0 | 2 |
| ashby:llamaindex | 2 | 15 | 8 | 1 | 1 | 1 |
| ashby:mintlify | 2 | 14 | 10 | 2 | 1 | 1 |
| ashby:modal | 2 | 7 | 6 | 0 | 0 | 2 |
| ashby:nubank | 1 | 11 | 6 | 1 | 0 | 1 |
| ashby:patreon | 2 | 20 | 12 | 0 | 0 | 2 |
| ashby:pinecone | 2 | 20 | 10 | 4 | 0 | 2 |
| ashby:poshmark | 2 | 14 | 10 | 0 | 0 | 2 |
| ashby:railway | 2 | 8 | 6 | 2 | 2 | 0 |
| ashby:ramp | 1 | 10 | 6 | 3 | 3 | 0 |
| ashby:render | 2 | 22 | 16 | 0 | 0 | 2 |
| ashby:resend | 2 | 22 | 14 | 4 | 4 | 0 |
| ashby:runway | 2 | 10 | 6 | 0 | 0 | 2 |
| ashby:sentry | 2 | 21 | 14 | 3 | 1 | 1 |
| ashby:snowflake | 2 | 24 | 10 | 2 | 2 | 0 |
| ashby:substack | 2 | 12 | 9 | 2 | 2 | 0 |
| ashby:synthesia | 2 | 17 | 10 | 3 | 3 | 0 |
| ashby:thumbtack | 1 | 14 | 6 | 0 | 0 | 1 |
| ashby:webflow | 1 | 11 | 6 | 0 | 0 | 1 |
| ashby:writer | 1 | 9 | 6 | 2 | 2 | 0 |
| ashby:zapier | 1 | 17 | 10 | 2 | 1 | 0 |
| bamboohr:eastlandfood | 2 | 26 | 18 | 0 | 0 | 2 |
| bamboohr:familiesforvaccines | 1 | 13 | 8 | 2 | 2 | 0 |
| bamboohr:familypromiseofspokane | 2 | 22 | 14 | 1 | 1 | 1 |
| bamboohr:flynn | 1 | 12 | 7 | 1 | 1 | 0 |
| bamboohr:hinterlandgroup | 2 | 37 | 17 | 2 | 2 | 1 |
| bamboohr:hsvarc | 2 | 36 | 15 | 4 | 0 | 2 |
| bamboohr:latigobio | 2 | 28 | 16 | 3 | 3 | 0 |
| bamboohr:nexii | 1 | 12 | 7 | 1 | 0 | 1 |
| bamboohr:otstaffing | 2 | 18 | 14 | 0 | 0 | 2 |
| bamboohr:royal | 2 | 30 | 16 | 4 | 4 | 0 |
| bamboohr:totalps | 2 | 24 | 16 | 0 | 0 | 2 |
| bamboohr:verastem | 2 | 33 | 22 | 0 | 0 | 2 |
| bamboohr:waycrosse | 2 | 40 | 22 | 4 | 4 | 0 |
| breezy:aimpoint-digital | 4 | 90 | 60 | 1 | 1 | 3 |
| breezy:bear-robotics | 4 | 99 | 62 | 6 | 7 | 3 |
| breezy:beex | 4 | 40 | 27 | 3 | 3 | 1 |
| breezy:helpware-inc | 4 | 109 | 63 | 7 | 5 | 1 |
| breezy:inallmedia-llc | 4 | 154 | 68 | 40 | 40 | 0 |
| breezy:north-wind-group | 4 | 80 | 50 | 1 | 1 | 3 |
| breezy:prime-philippines | 4 | 88 | 60 | 1 | 1 | 3 |
| breezy:prolift-rigging | 4 | 148 | 84 | 21 | 21 | 1 |
| breezy:segal-mccambridge | 3 | 34 | 17 | 2 | 2 | 1 |
| breezy:small-batch-standard | 2 | 28 | 12 | 14 | 14 | 0 |
| breezy:social-discovery-ventures | 4 | 40 | 25 | 7 | 7 | 0 |
| breezy:spark-power | 4 | 116 | 61 | 14 | 17 | 0 |
| breezy:t3-services-group | 2 | 63 | 37 | 9 | 9 | 0 |
| breezy:taqar-consulting-co-l-l-c | 4 | 89 | 60 | 4 | 4 | 0 |
| breezy:totalsecurityltd | 4 | 109 | 61 | 18 | 20 | 0 |
| breezy:vagaro | 4 | 125 | 71 | 20 | 21 | 0 |
| breezy:wealthy-recruiting | 4 | 100 | 60 | 12 | 12 | 0 |
| breezy:zeno-power | 4 | 110 | 48 | 44 | 44 | 0 |
| breezy:zero-hash | 4 | 102 | 68 | 6 | 6 | 0 |
| greenhouse:abnormalsecurity | 1 | 21 | 16 | 2 | 3 | 0 |
| greenhouse:affirm | 1 | 23 | 17 | 0 | 1 | 0 |
| greenhouse:airtable | 1 | 15 | 9 | 3 | 3 | 0 |
| greenhouse:anthropic | 1 | 23 | 13 | 7 | 7 | 0 |
| greenhouse:attentive | 1 | 18 | 12 | 2 | 2 | 0 |
| greenhouse:bandwidth | 1 | 15 | 13 | 0 | 1 | 0 |
| greenhouse:billcom | 1 | 21 | 16 | 3 | 4 | 0 |
| greenhouse:block | 1 | 31 | 17 | 7 | 8 | 0 |
| greenhouse:brex | 1 | 25 | 15 | 5 | 5 | 0 |
| greenhouse:calendly | 1 | 20 | 13 | 5 | 6 | 0 |
| greenhouse:calm | 1 | 25 | 18 | 5 | 5 | 0 |
| greenhouse:carta | 1 | 17 | 13 | 1 | 1 | 0 |
| greenhouse:checkr | 2 | 28 | 22 | 2 | 3 | 0 |
| greenhouse:circleci | 2 | 37 | 26 | 6 | 8 | 0 |
| greenhouse:cleo | 1 | 20 | 13 | 3 | 1 | 0 |
| greenhouse:coreweave | 2 | 52 | 34 | 13 | 11 | 0 |
| greenhouse:cresta | 2 | 22 | 16 | 0 | 2 | 0 |
| greenhouse:datadog | 1 | 18 | 13 | 4 | 4 | 0 |
| greenhouse:discord | 1 | 26 | 19 | 3 | 4 | 0 |
| greenhouse:duolingo | 2 | 29 | 15 | 9 | 9 | 0 |
| greenhouse:faire | 2 | 35 | 21 | 5 | 9 | 0 |
| greenhouse:figma | 1 | 19 | 14 | 2 | 3 | 0 |
| greenhouse:fivetran | 1 | 28 | 16 | 7 | 8 | 0 |
| greenhouse:gemini | 1 | 16 | 12 | 1 | 2 | 0 |
| greenhouse:gitlab | 1 | 18 | 14 | 1 | 1 | 0 |
| greenhouse:gymshark | 1 | 23 | 16 | 5 | 5 | 0 |
| greenhouse:inflectionai | 2 | 34 | 26 | 0 | 0 | 2 |
| greenhouse:instacart | 2 | 41 | 33 | 2 | 6 | 0 |
| greenhouse:klaviyo | 1 | 17 | 14 | 0 | 0 | 1 |
| greenhouse:launchdarkly | 1 | 31 | 20 | 4 | 3 | 0 |
| greenhouse:lucidmotors | 2 | 65 | 46 | 7 | 7 | 0 |
| greenhouse:medium | 2 | 45 | 26 | 13 | 13 | 0 |
| greenhouse:newrelic | 1 | 20 | 16 | 3 | 3 | 0 |
| greenhouse:oura | 1 | 22 | 18 | 1 | 2 | 0 |
| greenhouse:pendo | 1 | 17 | 13 | 1 | 3 | 0 |
| greenhouse:planetscale | 2 | 20 | 16 | 1 | 1 | 1 |
| greenhouse:realtimeboardglobal | 1 | 12 | 7 | 2 | 2 | 0 |
| greenhouse:robinhood | 2 | 53 | 30 | 8 | 12 | 0 |
| greenhouse:rocketlab | 2 | 57 | 30 | 21 | 19 | 0 |
| greenhouse:samsara | 1 | 27 | 19 | 4 | 6 | 0 |
| greenhouse:scopely | 1 | 18 | 13 | 2 | 2 | 0 |
| greenhouse:sigmacomputing | 2 | 34 | 21 | 8 | 10 | 0 |
| greenhouse:sproutsocial | 2 | 42 | 22 | 7 | 14 | 0 |
| greenhouse:stabilityai | 1 | 3 | 0 | 0 | 0 | 1 |
| greenhouse:stockx | 1 | 15 | 10 | 1 | 2 | 0 |
| greenhouse:stripe | 1 | 1 | 0 | 0 | 0 | 1 |
| greenhouse:tanium | 1 | 20 | 14 | 3 | 4 | 0 |
| greenhouse:tenstorrent | 1 | 14 | 10 | 1 | 2 | 0 |
| greenhouse:turing | 1 | 12 | 9 | 2 | 3 | 0 |
| greenhouse:twitch | 1 | 37 | 14 | 16 | 15 | 0 |
| greenhouse:warp | 1 | 14 | 10 | 3 | 3 | 0 |
| greenhouse:wise | 1 | 19 | 12 | 4 | 5 | 0 |
| greenhouse:yugabyte | 1 | 16 | 12 | 1 | 2 | 0 |
| greenhouse:zoominfo | 1 | 19 | 16 | 1 | 1 | 0 |

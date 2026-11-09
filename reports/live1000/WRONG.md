# Wrong fills in the live run

Generated 2026-11-07T16:08:21.999Z by `scripts/live1000-audit.mjs` from 476 forms (417 filled).

**Accuracy: 32 wrong of 3733 filled fields (0.9%); 3701 correct (99.1%); 0 unclear.**

Deterministic rules judge each filled field; the (question, value) pairs no rule settles were judged by hand (judgments.json). A fill is wrong when a careful candidate (Pune, India; authorized to work in India only; needs sponsorship for the US; 5 years of experience; saved declines for EEO) would not have given that answer.

| Class | Wrong fields |
|---|---:|
| option_not_offered | 25 |
| residence_as_plan | 4 |
| profile_kind | 1 |
| eeo_not_decline | 1 |
| profile_country_citizenship | 1 |

## Root causes

- **option_not_offered**: A country question's react-select list picked "India+91" from the PHONE's country list, which was still open: `listNear()` in src/content/fill.ts took the only open list on the page (or every option on the page) without checking whose it was, and `fillCombobox` accepted the pick although the question's own widget showed nothing chosen. Fixed: lists named by, or sitting in, another dropdown's widget are never used; a react-select that shows no choice after the pick is reported as not filled.
- **residence_as_plan**: The profile residence (Pune / India) typed for where the candidate PLANS to work ("Which country do you intend to work from?", "What city/country will you work from?") or for her work location. Fixed with a guard in src/content/meaning.ts NOT_THIS_FACT: plans, intentions and work location are asked.
- **profile_kind**: "In which school are you enrolled…?" for a graduate: the existing guard in safeToFill() had backspace characters where its \b should be, so it never matched. Fixed (and src/shared/length-limit.ts had the same corruption); a test now rejects control characters in src/.
- **eeo_not_decline**: A saved "Decline to self identify" was matched to "Other": the pronoun bucket DECLINE in src/shared/option-matcher.ts listed "other" and "not listed", and pronoun mapping runs before gender mapping. Fixed: those words removed; and decide() (src/content/classify.ts) never lets a saved decline land on a choice that does not decline.
- **profile_country_citizenship**: "Passport Country" filled with the country of residence: the classify.ts country pattern matches any label with "country". Fixed with a guard in src/content/meaning.ts NOT_THIS_FACT (passport, citizenship, nationality, birth are asked).

## Every wrong fill

### ashby:quora — How would you describe your gender identity?

- URL: https://jobs.ashbyhq.com/quora/b2462dc7-08d7-4060-8ceb-9a1fa16615fb/application
- Job: Detection & CorpSec Engineer (Remote) (Remote - Multiple Locations; United States; Canada)
- Question: How would you describe your gender identity?
- Control: radio; options: Male / Female / Non Binary / Other / I prefer not to say
- Value: `Other`
- Decision: answer; matched saved question: "Gender"
- Why wrong (eeo_not_decline): EEO answer "Other" is not a decline

### ashby:backmarket — In which school are you enrolled for this work-study program (apprentissage) ?

- URL: https://jobs.ashbyhq.com/backmarket/26c4cd8e-9679-42ac-8905-2cd8ae8f7e10/application
- Job: Product & Operations Management Apprentice (Bordeaux)
- Question: In which school are you enrolled for this work-study program (apprentissage) ?
- Control: text, required; options: (not recorded)
- Value: `State Technical University`; on the page: `State Technical University`
- Decision: profile (school)
- Why wrong (manual_override:profile_kind): the candidate graduated in 2021; the question asks which school she is enrolled in now (the existing guard never fired: its \b were backspace characters)

### greenhouse:affirm — Which country in the United Kingdom do you reside in?

- URL: https://job-boards.greenhouse.io/affirm/jobs/7832318003
- Job: Analyst II, Credit (Remote UK)
- Question: Which country in the United Kingdom do you reside in? (hint: For UK-based candidates only)
- Control: combobox, required; options: (not recorded)
- Value: `India` (chose "India+91")
- Decision: profile (country)
- Why wrong (option_not_offered): "India+91" is not one of the question's options (England / Scotland / Wales / Northern Ireland / Other)

### greenhouse:agoda — In which country/region are you currently based?

- URL: https://job-boards.greenhouse.io/agoda/jobs/8129477
- Job: 2026 Support Associate - Korean&English(Seoul) (Seoul)
- Question: In which country/region are you currently based?
- Control: combobox, required; options: (not recorded)
- Value: `India` (chose "India+91")
- Decision: profile (country)
- Why wrong (option_not_offered): "India+91" is not one of the question's options (Afghanistan / Albania / Algeria / Andorra / Angola / Antigua and Barbuda / Argentina / Armenia / ...)

### greenhouse:agoda — In which country/region are you currently based?

- URL: https://job-boards.greenhouse.io/agoda/jobs/8184766
- Job: 2026 - People - Rewards Senior Specialist/ Principal Specialist (Bangkok-based, Relocation Provided) (Bangkok)
- Question: In which country/region are you currently based?
- Control: combobox, required; options: (not recorded)
- Value: `India` (chose "India+91")
- Decision: profile (country)
- Why wrong (option_not_offered): "India+91" is not one of the question's options (Afghanistan / Albania / Algeria / Andorra / Angola / Antigua and Barbuda / Argentina / Armenia / ...)

### greenhouse:backblaze — What country do you reside in?

- URL: https://job-boards.greenhouse.io/backblaze/jobs/5287532008
- Job: AI Workflow Engineer \| LATAM (Remote - Argentina; Remote - Colombia ; Remote - Costa Rica ; Remote - Mexico)
- Question: What country do you reside in? (hint: Please do not provide your full address, only your country is needed.)
- Control: combobox, required; options: (not recorded)
- Value: `India` (chose "India+91")
- Decision: profile (country)
- Why wrong (option_not_offered): "India+91" is not one of the question's options (Argentina / Australia / Austria / Bangladesh / Belgium / Brazil / Canada / Chile / ...)

### greenhouse:billcom — Country

- URL: https://job-boards.greenhouse.io/billcom/jobs/6217056004
- Job: Alliance Partnerships Manager (United States)
- Question: Country
- Control: combobox, required; options: (not recorded)
- Value: `India` (chose "India+91")
- Decision: profile (country)
- Why wrong (option_not_offered): "India+91" is not one of the question's options (Afghanistan / Åland Islands / Albania / Algeria / American Samoa / Andorra / Angola / Anguilla / ...)

### greenhouse:billcom — Country

- URL: https://job-boards.greenhouse.io/billcom/jobs/6233809004
- Job: Business Continuity, Incident Management & Internal Audit Manager (United States)
- Question: Country
- Control: combobox, required; options: (not recorded)
- Value: `India` (chose "India+91")
- Decision: profile (country)
- Why wrong (option_not_offered): "India+91" is not one of the question's options (Afghanistan / Åland Islands / Albania / Algeria / American Samoa / Andorra / Angola / Anguilla / ...)

### greenhouse:brex — What country are you based in?

- URL: https://job-boards.greenhouse.io/brex/jobs/8686667002
- Job: Account Executive, Small Business (San Francisco, California, United States)
- Question: What country are you based in?
- Control: combobox, required; options: (not recorded)
- Value: `India` (chose "India+91")
- Decision: profile (country)
- Why wrong (option_not_offered): "India+91" is not one of the question's options (Brazil / Canada / USA / Netherlands / United Kingdom / Other)

### greenhouse:brex — What country are you based in?

- URL: https://job-boards.greenhouse.io/brex/jobs/8912603002
- Job: Accountant Partnerships Manager (New York, New York, United States)
- Question: What country are you based in?
- Control: combobox, required; options: (not recorded)
- Value: `India` (chose "India+91")
- Decision: profile (country)
- Why wrong (option_not_offered): "India+91" is not one of the question's options (Brazil / Canada / USA / Netherlands / United Kingdom / Other)

### greenhouse:careem — Where are you currently located? (Country)

- URL: https://job-boards.greenhouse.io/careem/jobs/8844091002
- Job: Account Manager I (Amman, Jordan)
- Question: Where are you currently located? (Country)
- Control: combobox, required; options: (not recorded)
- Value: `India` (chose "India+91"); on the page: `India`
- Decision: profile (country)
- Why wrong (option_not_offered): "India+91" is not one of the question's options (Afghanistan / Albania / Algeria / Andorra / Angola / Antigua and Barbuda / Argentina / Armenia / ...)

### greenhouse:careem — Where are you currently located? (Country)

- URL: https://job-boards.greenhouse.io/careem/jobs/8899591002
- Job: Account Manager II - Shops (Dubai, United Arab Emirates)
- Question: Where are you currently located? (Country)
- Control: combobox, required; options: (not recorded)
- Value: `India` (chose "India+91"); on the page: `India`
- Decision: profile (country)
- Why wrong (option_not_offered): "India+91" is not one of the question's options (Afghanistan / Albania / Algeria / Andorra / Angola / Antigua and Barbuda / Argentina / Armenia / ...)

### greenhouse:chime — Country

- URL: https://job-boards.greenhouse.io/chime/jobs/8569366002
- Job: AI/ML Engineer (Chicago, IL, USA; New York, NY, USA; San Francisco, CA, USA)
- Question: Country (hint: Your country of residence)
- Control: combobox, required; options: (not recorded)
- Value: `India` (chose "India+91")
- Decision: profile (country)
- Why wrong (option_not_offered): "India+91" is not one of the question's options (United States of America / Canada / Afghanistan / Albania / Algeria / Andorra / Angola / Antigua and Barbuda / ...)

### greenhouse:chime — Country

- URL: https://job-boards.greenhouse.io/chime/jobs/8853166002
- Job: Business Control Manager (Chicago, IL, USA; New York, NY, USA; San Francisco, CA, USA)
- Question: Country (hint: Your country of residence)
- Control: combobox, required; options: (not recorded)
- Value: `India` (chose "India+91")
- Decision: profile (country)
- Why wrong (option_not_offered): "India+91" is not one of the question's options (United States of America / Canada / Afghanistan / Albania / Algeria / Andorra / Angola / Antigua and Barbuda / ...)

### greenhouse:cognite — Country / Place of Residence

- URL: https://job-boards.greenhouse.io/cognite/jobs/4969944101
- Job: Academy Engineer - (Data Scientist- Training) (India (Bengaluru))
- Question: Country / Place of Residence
- Control: combobox, required; options: (not recorded)
- Value: `India` (chose "India+91"); on the page: `India`
- Decision: profile (country)
- Why wrong (option_not_offered): "India+91" is not one of the question's options (Afghanistan / Albania / Algeria / American Samoa / Andorra / Angola / Anguilla / Antarctica / ...)

### greenhouse:gitlab — Please choose the country in which you are located.

- URL: https://job-boards.greenhouse.io/gitlab/jobs/8638232002
- Job: AI Transformation Owner, CRO (Remote, United States)
- Question: Please choose the country in which you are located.
- Control: combobox; options: (not recorded)
- Value: `India` (chose "India+91")
- Decision: profile (country)
- Why wrong (option_not_offered): "India+91" is not one of the question's options (Afghanistan / Albania / Algeria / Andorra / Angola / Antigua and Barbuda / Argentina / Armenia / ...)

### greenhouse:gitlab — What is your current country of residence?

- URL: https://job-boards.greenhouse.io/gitlab/jobs/8638232002
- Job: AI Transformation Owner, CRO (Remote, United States)
- Question: What is your current country of residence?
- Control: combobox, required; options: (not recorded)
- Value: `India` (chose "India+91")
- Decision: profile (country)
- Why wrong (option_not_offered): "India+91" is not one of the question's options (Afghanistan / Albania / Algeria / Andorra / Angola / Antigua and Barbuda / Argentina / Armenia / ...)

### greenhouse:gitlab — Please choose the country in which you are located.

- URL: https://job-boards.greenhouse.io/gitlab/jobs/8923757002
- Job: Associate Renewals Manager - France (Remote)
- Question: Please choose the country in which you are located.
- Control: combobox; options: (not recorded)
- Value: `India` (chose "India+91")
- Decision: profile (country)
- Why wrong (option_not_offered): "India+91" is not one of the question's options (Afghanistan / Albania / Algeria / Andorra / Angola / Antigua and Barbuda / Argentina / Armenia / ...)

### greenhouse:gitlab — What is your current country of residence?

- URL: https://job-boards.greenhouse.io/gitlab/jobs/8923757002
- Job: Associate Renewals Manager - France (Remote)
- Question: What is your current country of residence?
- Control: combobox, required; options: (not recorded)
- Value: `India` (chose "India+91")
- Decision: profile (country)
- Why wrong (option_not_offered): "India+91" is not one of the question's options (Afghanistan / Albania / Algeria / Andorra / Angola / Antigua and Barbuda / Argentina / Armenia / ...)

### greenhouse:gympass — Please select your Country Phone Code

- URL: https://job-boards.greenhouse.io/gympass/jobs/8857404002
- Job: Analista de Atendimento ao Cliente  - Vaga Afirmativa para Pessoas com Deficiência (Brazil)
- Question: Please select your Country Phone Code
- Control: combobox, required; options: (not recorded)
- Value: `India` (chose "India+91")
- Decision: profile (country)
- Why wrong (option_not_offered): "India+91" is not one of the question's options (BRA (+55) / USA (+1) / ARG (+54) / MEX (+52) / CHL (+56) / ESP (+34) / PRT (+351) / DEU (+49) / ...)

### greenhouse:honeycomb — Please select the country in which you currently reside

- URL: https://job-boards.greenhouse.io/honeycomb/jobs/5461207008
- Job: Director, EMEA Partnerships (Remote - United Kingdom)
- Question: Please select the country in which you currently reside
- Control: combobox, required; options: (not recorded)
- Value: `India` (chose "India+91"); on the page: `India`
- Decision: profile (country)
- Why wrong (option_not_offered): "India+91" is not one of the question's options (Australia / Austria / Belgium / Brazil / Colombia / Czech Republic / Denmark / France / ...)

### greenhouse:newrelic — Current country of residence

- URL: https://job-boards.greenhouse.io/newrelic/jobs/5121001008
- Job: Account Executive - Enterprise Sales (Berlin, Germany; Munich, Germany)
- Question: Current country of residence
- Control: combobox, required; options: (not recorded)
- Value: `India` (chose "India+91")
- Decision: profile (country)
- Why wrong (option_not_offered): "India+91" is not one of the question's options (Afghanistan / Albania / Algeria / Andorra / Angola / Antigua and Barbuda / Argentina / Armenia / ...)

### greenhouse:newrelic — Current country of residence

- URL: https://job-boards.greenhouse.io/newrelic/jobs/5429159008
- Job: Account Executive - Mid-Enterprise Sales
- Question: Current country of residence
- Control: combobox, required; options: (not recorded)
- Value: `India` (chose "India+91")
- Decision: profile (country)
- Why wrong (option_not_offered): "India+91" is a phone country code: picked from the phone's list

### greenhouse:scopely — Country

- URL: https://job-boards.greenhouse.io/scopely/jobs/5462613008
- Job: Accounting Manager (ES - Barcelona, Spain)
- Question: Country
- Control: combobox, required; options: (not recorded)
- Value: `India` (chose "India+91")
- Decision: profile (country)
- Why wrong (option_not_offered): "India+91" is not one of the question's options (Afghanistan / Åland Islands / Albania / Algeria / American Samoa / Andorra / Angola / Anguilla / ...)

### greenhouse:trustpilot — Please select the country you are applying from.

- URL: https://job-boards.greenhouse.io/trustpilot/jobs/8095990
- Job: Account Executive Benelux
- Question: Please select the country you are applying from.
- Control: combobox, required; options: (not recorded)
- Value: `India` (chose "India+91"); on the page: `India`
- Decision: profile (country)
- Why wrong (option_not_offered): "India+91" is a phone country code: picked from the phone's list

### greenhouse:trustpilot — Please select the country you are applying from.

- URL: https://job-boards.greenhouse.io/trustpilot/jobs/7588014
- Job: Account Executive - Belgium market (Flemish speaking) (Amsterdam)
- Question: Please select the country you are applying from.
- Control: combobox, required; options: (not recorded)
- Value: `India` (chose "India+91")
- Decision: profile (country)
- Why wrong (option_not_offered): "India+91" is not one of the question's options (Afghanistan / Albania / Algeria / Andorra / Angola / Antigua and Barbuda / Argentina / Armenia / ...)

### greenhouse:xai — What country are you planning to work from?

- URL: https://job-boards.greenhouse.io/xai/jobs/4925878007
- Job: AI Tutor, Applied Math - Temporary (Remote, International)
- Question: What country are you planning to work from?
- Control: combobox, required; options: (not recorded)
- Value: `India` (chose "India+91")
- Decision: profile (country)
- Why wrong (option_not_offered): "India+91" is not one of the question's options (Afghanistan / Albania / Algeria / Andorra / Angola / Antigua and Barbuda / Argentina / Armenia / ...)

### ashby:supabase — Passport Country

- URL: https://jobs.ashbyhq.com/supabase/3b5d54ca-741b-45ac-bd3f-31605a0d3541/application
- Job: AI Platform Engineer (Remote, Global)
- Question: Passport Country
- Control: text, required; options: (not recorded)
- Value: `India`; on the page: `India`
- Decision: profile (country)
- Why wrong (profile_country_citizenship): country of residence used as citizenship / nationality (not in the profile)

### ashby:ashby — Which country do you intend to work from?

- URL: https://jobs.ashbyhq.com/Ashby/7458d4e9-da2e-47bd-98cb-adfda43d42b2/application
- Job: Engineering Manager - EU (Remote - European Union; Spain; Italy; Germany; Switzerland; Denmark; Norway; Croatia; Ireland; Stockholm; Romania; Austria; Barcelona; Netherlands; Portugal; France; Berlin; Sweden; Hungary; Estonia)
- Question: Which country do you intend to work from?
- Control: combobox; options: (not recorded)
- Value: `India`
- Decision: profile (country)
- Why wrong (residence_as_plan): asks where the candidate plans to work (or her work location); the residence from the profile is a guess

### greenhouse:launchdarkly — Where is your permanent (City, Country) work location?

- URL: https://job-boards.greenhouse.io/launchdarkly/jobs/7989233003
- Job: Associate Accounts Payable & Expense Specialist (India)
- Question: Where is your permanent (City, Country) work location?
- Control: text, required; options: (not recorded)
- Value: `Pune`; on the page: `Pune`
- Decision: profile (location)
- Why wrong (residence_as_plan): asks where the candidate plans to work (or her work location); the residence from the profile is a guess

### greenhouse:launchdarkly — Where is your permanent (City, State) work location?

- URL: https://job-boards.greenhouse.io/launchdarkly/jobs/8015117003
- Job: Backend Software Engineer, SDK
- Question: Where is your permanent (City, State) work location?
- Control: text, required; options: (not recorded)
- Value: `Pune`; on the page: `Pune`
- Decision: profile (location)
- Why wrong (residence_as_plan): asks where the candidate plans to work (or her work location); the residence from the profile is a guess

### ashby:temporal — What location do you intend to work from?

- URL: https://jobs.ashbyhq.com/temporal/30600762-62fe-4ffb-9b6e-98f145329ea3/application
- Job: Technical Executive Communications, Senior Manager (San Francisco, California; Seattle, Washington)
- Question: What location do you intend to work from?
- Control: combobox; options: (not recorded)
- Value: `Pune` (chose "Pune, Maharashtra, India")
- Decision: profile (location)
- Why wrong (residence_as_plan): asks where the candidate plans to work (or her work location); the residence from the profile is a guess


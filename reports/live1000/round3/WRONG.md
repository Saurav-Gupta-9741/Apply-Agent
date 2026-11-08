# Wrong fills in the live run

Generated 2026-11-08T01:03:57.367Z by `scripts/live1000-audit.mjs` from 1319 forms (1198 filled).

**Accuracy: 216 wrong of 11551 filled fields (1.9%); 11335 correct (98.1%); 0 unclear.**

Deterministic rules judge each filled field; the (question, value) pairs no rule settles were judged by hand (judgments.json). A fill is wrong when a careful candidate (Pune, India; authorized to work in India only; needs sponsorship for the US; 5 years of experience; saved declines for EEO) would not have given that answer.

| Class | Wrong fields |
|---|---:|
| qa_salary_currency | 165 |
| qa_relocation_residence | 34 |
| qa_pronoun_followup | 7 |
| qa_salary_question | 7 |
| qa_transgender_reversed | 3 |

## Root causes


## Every wrong fill

### greenhouse:fastly — If your Personal Pronoun is not listed above, how would you like to be addressed?

- URL: https://job-boards.greenhouse.io/fastly/jobs/8264992
- Job: Contracts Manager (London, United Kingdom)
- Question: If your Personal Pronoun is not listed above, how would you like to be addressed?
- Control: text; options: (not recorded)
- Value: `she/her`; on the page: `she/her`
- Decision: answer; matched saved question: "Quick answers › pronouns"
- Why wrong (qa_pronoun_followup): a box only for pronouns the list leaves out

### greenhouse:fastly — If your Personal Pronoun is not listed above, how would you like to be addressed?

- URL: https://job-boards.greenhouse.io/fastly/jobs/8278933
- Job: Brand Marketing Manager (Denver, CO; New York City, NY; San Francisco, CA)
- Question: If your Personal Pronoun is not listed above, how would you like to be addressed?
- Control: text; options: (not recorded)
- Value: `she/her`; on the page: `she/her`
- Decision: answer; matched saved question: "Quick answers › pronouns"
- Why wrong (qa_pronoun_followup): a box only for pronouns the list leaves out

### greenhouse:fastly — If your Personal Pronoun is not listed above, how would you like to be addressed?

- URL: https://job-boards.greenhouse.io/fastly/jobs/8350187
- Job: Contracts Administrator (New York City, NY)
- Question: If your Personal Pronoun is not listed above, how would you like to be addressed?
- Control: text; options: (not recorded)
- Value: `she/her`; on the page: `she/her`
- Decision: answer; matched saved question: "Quick answers › pronouns"
- Why wrong (qa_pronoun_followup): a box only for pronouns the list leaves out

### ashby:mapbox — Self describe - I prefer to use the following pronouns:

- URL: https://jobs.ashbyhq.com/Mapbox/5eed80f2-dceb-4e9b-a355-f4ab3733410e/application
- Job: Solutions Architect, Automotive/Enterprise (Korean Speaking) (South Korea; South Korea)
- Question: Self describe - I prefer to use the following pronouns:
- Control: text; options: (not recorded)
- Value: `she/her`; on the page: `she/her`
- Decision: answer; matched saved question: "Quick answers › pronouns"
- Why wrong (qa_pronoun_followup): a box only for pronouns the list leaves out

### ashby:mapbox — Self describe - I prefer to use the following pronouns:

- URL: https://jobs.ashbyhq.com/Mapbox/521994b0-cd96-4c24-b622-6d965e515cde/application
- Job: Senior Business Development Manager, Automotive  (Mapbox Japan)
- Question: Self describe - I prefer to use the following pronouns:
- Control: text; options: (not recorded)
- Value: `she/her`; on the page: `she/her`
- Decision: answer; matched saved question: "Quick answers › pronouns"
- Why wrong (qa_pronoun_followup): a box only for pronouns the list leaves out

### ashby:mapbox — Self describe - I prefer to use the following pronouns:

- URL: https://jobs.ashbyhq.com/Mapbox/1177eb0c-bcbf-44c7-874d-fce855570013/application
- Job: Machine Learning Engineer III, Routing Cost (Mapbox Germany)
- Question: Self describe - I prefer to use the following pronouns:
- Control: text; options: (not recorded)
- Value: `she/her`; on the page: `she/her`
- Decision: answer; matched saved question: "Quick answers › pronouns"
- Why wrong (qa_pronoun_followup): a box only for pronouns the list leaves out

### ashby:mapbox — Self describe - I prefer to use the following pronouns:

- URL: https://jobs.ashbyhq.com/Mapbox/0fefd6a4-d43e-4ad9-ade2-dd40f4927e8f/application
- Job: Senior Account Executive (Mapbox Japan)
- Question: Self describe - I prefer to use the following pronouns:
- Control: text; options: (not recorded)
- Value: `she/her`; on the page: `she/her`
- Decision: answer; matched saved question: "Quick answers › pronouns"
- Why wrong (qa_pronoun_followup): a box only for pronouns the list leaves out

### ashby:alan — Are you currently located (or willing to relocate) in Belgium?

- URL: https://jobs.ashbyhq.com/alan/aa09a696-4323-47de-86ce-d210f5412e29/application
- Job: Inbound Sales - Belgium 🇧🇪  (Anywhere in Belgium)
- Question: Are you currently located (or willing to relocate) in Belgium?
- Control: radio; options: Yes / No
- Value: `Yes`
- Decision: answer; matched saved question: "Quick answers › relocation"
- Why wrong (qa_relocation_residence): relocation and where the candidate lives in one question

### ashby:alan — Are you located (or willing to relocate) in France, Spain or Belgium?

- URL: https://jobs.ashbyhq.com/alan/a5973d82-d4f2-48f8-8c96-70de49f14c9b/application
- Job: Portfolio analytics and forecasts actuary (Anywhere in France)
- Question: Are you located (or willing to relocate) in France, Spain or Belgium?
- Control: radio; options: Yes / No
- Value: `Yes`
- Decision: answer; matched saved question: "Quick answers › relocation"
- Why wrong (qa_relocation_residence): relocation and where the candidate lives in one question

### greenhouse:anthropic — Are you currently located in SF/NYC or open to relocation, if not?

- URL: https://job-boards.greenhouse.io/anthropic/jobs/4461450008
- Job: Account Executive, AI Native (New York City, NY; San Francisco, CA \| New York City, NY)
- Question: Are you currently located in SF/NYC or open to relocation, if not?
- Control: combobox, required; options: (not recorded)
- Value: `Yes`
- Decision: answer; matched saved question: "Quick answers › relocation"
- Why wrong (qa_relocation_residence): relocation and where the candidate lives in one question

### greenhouse:anthropic — Are you open to relocation for this role?

- URL: https://job-boards.greenhouse.io/anthropic/jobs/5456619008
- Job: 3P Revenue Accounting & Reporting (San Francisco, CA \| Seattle, WA)
- Question: Are you open to relocation for this role?
- Control: combobox, required; options: (not recorded)
- Value: `Yes`
- Decision: answer; matched saved question: "Quick answers › relocation"
- Why wrong (qa_relocation_residence): relocation and where the candidate lives in one question

### greenhouse:anthropic — Are you open to relocation for this role?

- URL: https://job-boards.greenhouse.io/anthropic/jobs/5391381008
- Job: Account Executive - Public Sector (ASEAN) (Singapore)
- Question: Are you open to relocation for this role?
- Control: combobox, required; options: (not recorded)
- Value: `Yes`
- Decision: answer; matched saved question: "Quick answers › relocation"
- Why wrong (qa_relocation_residence): relocation and where the candidate lives in one question

### greenhouse:billcom — Are you currently located in, or open to relocating to, one BILL's remote-eligible states?

- URL: https://job-boards.greenhouse.io/billcom/jobs/6217056004
- Job: Alliance Partnerships Manager (United States)
- Question: Are you currently located in, or open to relocating to, one BILL's remote-eligible states? (hint: BILL is currently able to hire employees in the following states: Arizona, Arkansas, California, Colorado, Florida, Georgia, Idaho, Illinois, Maryland, Massachusetts, Michigan, Minnesota, Nebraska, Ne)
- Control: combobox, required; options: (not recorded)
- Value: `Yes` (chose "Yes, I currently reside in one of the eligible states")
- Decision: answer; matched saved question: "Quick answers › relocation"
- Why wrong (qa_relocation_residence): relocation and where the candidate lives in one question

### greenhouse:billcom — Are you currently located in, or open to relocating to, one BILL's remote-eligible states?

- URL: https://job-boards.greenhouse.io/billcom/jobs/5554066004
- Job: Business Development Representative  (United States)
- Question: Are you currently located in, or open to relocating to, one BILL's remote-eligible states? (hint: BILL is currently able to hire employees in the following states: Arizona, Arkansas, California, Colorado, Florida, Georgia, Idaho, Illinois, Maryland, Massachusetts, Michigan, Minnesota, Nebraska, Ne)
- Control: combobox, required; options: (not recorded)
- Value: `Yes` (chose "Yes, I currently reside in one of the eligible states")
- Decision: answer; matched saved question: "Quick answers › relocation"
- Why wrong (qa_relocation_residence): relocation and where the candidate lives in one question

### greenhouse:billcom — Are you currently located in, or open to relocating to, one BILL's remote-eligible states?

- URL: https://job-boards.greenhouse.io/billcom/jobs/6233809004
- Job: Business Continuity, Incident Management & Internal Audit Manager (United States)
- Question: Are you currently located in, or open to relocating to, one BILL's remote-eligible states? (hint: BILL is currently able to hire employees in the following states: Arizona, Arkansas, California, Colorado, Florida, Georgia, Idaho, Illinois, Maryland, Massachusetts, Michigan, Minnesota, Nebraska, Ne)
- Control: combobox, required; options: (not recorded)
- Value: `Yes` (chose "Yes, I currently reside in one of the eligible states")
- Decision: answer; matched saved question: "Quick answers › relocation"
- Why wrong (qa_relocation_residence): relocation and where the candidate lives in one question

### greenhouse:billcom — Are you currently located in, or open to relocating to, one BILL's remote-eligible states?

- URL: https://job-boards.greenhouse.io/billcom/jobs/6221603004
- Job: Business Development Manager (United States)
- Question: Are you currently located in, or open to relocating to, one BILL's remote-eligible states? (hint: BILL is currently able to hire employees in the following states: Arizona, Arkansas, California, Colorado, Florida, Georgia, Idaho, Illinois, Maryland, Massachusetts, Michigan, Minnesota, Nebraska, Ne)
- Control: combobox, required; options: (not recorded)
- Value: `Yes` (chose "Yes, I currently reside in one of the eligible states")
- Decision: answer; matched saved question: "Quick answers › relocation"
- Why wrong (qa_relocation_residence): relocation and where the candidate lives in one question

### greenhouse:discord — Are you currently based in or willing to relocate to the Bay Area for this position?

- URL: https://job-boards.greenhouse.io/discord/jobs/8917177002
- Job: Associate Commercial Counsel (San Francisco Bay Area or Remote (U.S.))
- Question: Are you currently based in or willing to relocate to the Bay Area for this position?
- Control: combobox, required; options: (not recorded)
- Value: `Yes`
- Decision: answer; matched saved question: "Quick answers › relocation"
- Why wrong (qa_relocation_residence): relocation and where the candidate lives in one question

### greenhouse:discord — Are you currently based in or willing to relocate to the Bay Area for this position?

- URL: https://job-boards.greenhouse.io/discord/jobs/8649856002
- Job: Engineering Manager, Platform Security (Remote (West Coast))
- Question: Are you currently based in or willing to relocate to the Bay Area for this position?
- Control: combobox, required; options: (not recorded)
- Value: `Yes`
- Decision: answer; matched saved question: "Quick answers › relocation"
- Why wrong (qa_relocation_residence): relocation and where the candidate lives in one question

### greenhouse:discord — Are you currently based in or willing to relocate to the Bay Area for this position?

- URL: https://job-boards.greenhouse.io/discord/jobs/8847080002
- Job: Group Product Manager, Data/ML (San Francisco Bay Area)
- Question: Are you currently based in or willing to relocate to the Bay Area for this position?
- Control: combobox, required; options: (not recorded)
- Value: `Yes`
- Decision: answer; matched saved question: "Quick answers › relocation"
- Why wrong (qa_relocation_residence): relocation and where the candidate lives in one question

### greenhouse:druva — Are you open to relocation to Pune? (Yes/No)

- URL: https://job-boards.greenhouse.io/druva/jobs/8908468002
- Job: Customer Success Manager (Pune, Maharashtra, India)
- Question: Are you open to relocation to Pune? (Yes/No)
- Control: combobox, required; options: (not recorded)
- Value: `Yes`
- Decision: answer; matched saved question: "Quick answers › relocation"
- Why wrong (qa_relocation_residence): relocation and where the candidate lives in one question

### greenhouse:druva — Are you open to relocation to Pune? (Yes/No)

- URL: https://job-boards.greenhouse.io/druva/jobs/8908468002
- Job: Customer Success Manager (Pune, Maharashtra, India)
- Question: Are you open to relocation to Pune? (Yes/No)
- Control: combobox, required; options: (not recorded)
- Value: `Yes`
- Decision: answer; matched saved question: "Quick answers › relocation"
- Why wrong (qa_relocation_residence): relocation and where the candidate lives in one question

### greenhouse:flatironhealth — Are you willing to relocate to the preferred primary location of the position?

- URL: https://job-boards.greenhouse.io/flatironhealth/jobs/8315819
- Job: Clinical Genomics Advanced Practice Provider (NY office OR Remote - US)
- Question: Are you willing to relocate to the preferred primary location of the position?
- Control: combobox, required; options: (not recorded)
- Value: `Yes`
- Decision: answer; matched saved question: "Quick answers › relocation"
- Why wrong (qa_relocation_residence): relocation and where the candidate lives in one question

### greenhouse:flatironhealth — Are you willing to relocate to the preferred primary location of the position?

- URL: https://job-boards.greenhouse.io/flatironhealth/jobs/8292596
- Job: Associate, Abstraction Training - Instructional Designer  (NY office)
- Question: Are you willing to relocate to the preferred primary location of the position?
- Control: combobox, required; options: (not recorded)
- Value: `Yes`
- Decision: answer; matched saved question: "Quick answers › relocation"
- Why wrong (qa_relocation_residence): relocation and where the candidate lives in one question

### greenhouse:flatironhealth — Are you willing to relocate to the preferred primary location of the position?

- URL: https://job-boards.greenhouse.io/flatironhealth/jobs/8122311
- Job: Associate, Life Sciences Partnerships (NY office)
- Question: Are you willing to relocate to the preferred primary location of the position?
- Control: combobox, required; options: (not recorded)
- Value: `Yes`
- Decision: answer; matched saved question: "Quick answers › relocation"
- Why wrong (qa_relocation_residence): relocation and where the candidate lives in one question

### greenhouse:flatironhealth — Are you willing to relocate to the preferred primary location of the position?

- URL: https://job-boards.greenhouse.io/flatironhealth/jobs/8128223
- Job: Associate, Product Marketing (Real-World Evidence) (NY office)
- Question: Are you willing to relocate to the preferred primary location of the position?
- Control: combobox, required; options: (not recorded)
- Value: `Yes`
- Decision: answer; matched saved question: "Quick answers › relocation"
- Why wrong (qa_relocation_residence): relocation and where the candidate lives in one question

### greenhouse:gemini — This role is required to be based near our New York City, NY hub. Are you open to relocating if you're not currently based there?

- URL: https://job-boards.greenhouse.io/gemini/jobs/7951043
- Job: Associate, Growth Marketing (Advanced Trading Products) (New York, New York)
- Question: This role is required to be based near our New York City, NY hub. Are you open to relocating if you're not currently based there?
- Control: combobox, required; options: (not recorded)
- Value: `Yes`
- Decision: answer; matched saved question: "Quick answers › relocation"
- Why wrong (qa_relocation_residence): relocation and where the candidate lives in one question

### greenhouse:gemini — This role is required to be based near our Scottsdale, AZ office. Are you open to relocating if you're not currently based there?

- URL: https://job-boards.greenhouse.io/gemini/jobs/8089812
- Job: Head of Customer Service (Scottsdale, Arizona)
- Question: This role is required to be based near our Scottsdale, AZ office. Are you open to relocating if you're not currently based there?
- Control: combobox, required; options: (not recorded)
- Value: `Yes`
- Decision: answer; matched saved question: "Quick answers › relocation"
- Why wrong (qa_relocation_residence): relocation and where the candidate lives in one question

### greenhouse:mirakl — Location : Our office is based in Paris. Please confirm whether you are within commuting distance or willing to relocate for the role?

- URL: https://job-boards.greenhouse.io/mirakl/jobs/5589254004
- Job: Account Executive (German Speaking), Mirakl Connect  (Paris, France)
- Question: Location : Our office is based in Paris. Please confirm whether you are within commuting distance or willing to relocate for the role?
- Control: combobox, required; options: (not recorded)
- Value: `Yes`
- Decision: answer; matched saved question: "Quick answers › relocation"
- Why wrong (qa_relocation_residence): relocation and where the candidate lives in one question

### greenhouse:mirakl — Location : Our office is based in Munich. Please confirm whether you are within commuting distance or willing to relocate for the role?

- URL: https://job-boards.greenhouse.io/mirakl/jobs/6233307004
- Job: Account Executive, Mirakl Connect  (München, Bavaria, Germany)
- Question: Location : Our office is based in Munich. Please confirm whether you are within commuting distance or willing to relocate for the role?
- Control: combobox, required; options: (not recorded)
- Value: `Yes`
- Decision: answer; matched saved question: "Quick answers › relocation"
- Why wrong (qa_relocation_residence): relocation and where the candidate lives in one question

### greenhouse:neo4j — Are you currently located in or willing to relocate to Bangalore, and are you able to work from our Bangalore office 1–2 days per week for team collaboration an

- URL: https://job-boards.greenhouse.io/neo4j/jobs/4714409006
- Job: Business Development Representative - Enterprise Customers (India) (Bangalore, India)
- Question: Are you currently located in or willing to relocate to Bangalore, and are you able to work from our Bangalore office 1–2 days per week for team collaboration and training?
- Control: combobox, required; options: (not recorded)
- Value: `Yes` (chose "Yes — Currently based in Bangalore and comfortable with 1–2 days/week in-office.")
- Decision: answer; matched saved question: "Quick answers › relocation"
- Why wrong (qa_relocation_residence): relocation and where the candidate lives in one question

### greenhouse:nextdoor — Would you be willing to relocate to the Dallas area if you are currently located elsewhere? We operate on a light hybrid schedule.

- URL: https://job-boards.greenhouse.io/nextdoor/jobs/8356430
- Job: Chief Information & Security Officer (Dallas, TX)
- Question: Would you be willing to relocate to the Dallas area if you are currently located elsewhere? We operate on a light hybrid schedule.
- Control: combobox, required; options: (not recorded)
- Value: `Yes`
- Decision: answer; matched saved question: "Quick answers › relocation"
- Why wrong (qa_relocation_residence): relocation and where the candidate lives in one question

### ashby:qonto — Are you based in either France, Spain, Germany or Italy, or willing to relocate there?

- URL: https://jobs.ashbyhq.com/qonto/11844a11-8911-4fa5-8fc2-73f001af6ebb/application
- Job: Staff Product Manager - Accounting Europe - German speaking 🇩🇪 (Berlin, Germany)
- Question: Are you based in either France, Spain, Germany or Italy, or willing to relocate there?
- Control: radio; options: Yes / No
- Value: `Yes`
- Decision: answer; matched saved question: "Quick answers › relocation"
- Why wrong (qa_relocation_residence): relocation and where the candidate lives in one question

### greenhouse:snorkelai — Are you open to relocating to either the SF Bay Area or New York and working in one of our office locations in a hybrid in-office arrangement?

- URL: https://job-boards.greenhouse.io/snorkelai/jobs/6135754004
- Job: Accounting Manager, Technical Accounting & Financial Reporting (San Francisco, CA (Hybrid))
- Question: Are you open to relocating to either the SF Bay Area or New York and working in one of our office locations in a hybrid in-office arrangement?
- Control: combobox, required; options: (not recorded)
- Value: `Yes`
- Decision: answer; matched saved question: "Quick answers › relocation"
- Why wrong (qa_relocation_residence): relocation and where the candidate lives in one question

### greenhouse:tailscale — Are you located in or willing to relocate to the country for which you are applying?

- URL: https://job-boards.greenhouse.io/tailscale/jobs/4750008005
- Job: ABM Campaign Manager (Remote (United Kingdom))
- Question: Are you located in or willing to relocate to the country for which you are applying? (hint: Please note, you must reside in the country for which you are applying to be considered for this position. We are not currently providing relocation support for this role. If you intended to apply for)
- Control: combobox, required; options: (not recorded)
- Value: `Yes` (chose "Yes, I live in the country for which I am applying.")
- Decision: answer; matched saved question: "Quick answers › relocation"
- Why wrong (qa_relocation_residence): relocation and where the candidate lives in one question

### greenhouse:tailscale — Are you located in or willing to relocate to the United States?

- URL: https://job-boards.greenhouse.io/tailscale/jobs/4735278005
- Job: Commercial Legal Counsel (Remote (United States))
- Question: Are you located in or willing to relocate to the United States? (hint: Please note, you must reside in the United States to be considered for this position. We are not currently providing relocation support for this role. If you intended to apply for employment in anothe)
- Control: combobox, required; options: (not recorded)
- Value: `Yes` (chose "Yes, I live in the US.")
- Decision: answer; matched saved question: "Quick answers › relocation"
- Why wrong (qa_relocation_residence): relocation and where the candidate lives in one question

### greenhouse:tailscale — Are you located in or willing to relocate to the country for which you are applying?

- URL: https://job-boards.greenhouse.io/tailscale/jobs/4751829005
- Job: Community Engagement and Advocacy Manager (Remote (Canada))
- Question: Are you located in or willing to relocate to the country for which you are applying? (hint: Please note, you must reside in the country for which you are applying to be considered for this position. We are not currently providing relocation support for this role. If you intended to apply for)
- Control: combobox, required; options: (not recorded)
- Value: `Yes` (chose "Yes, I live in the country for which I am applying.")
- Decision: answer; matched saved question: "Quick answers › relocation"
- Why wrong (qa_relocation_residence): relocation and where the candidate lives in one question

### greenhouse:tailscale — Are you located in or willing to relocate to the United States?

- URL: https://job-boards.greenhouse.io/tailscale/jobs/4740935005
- Job: Billing Engineer (Remote (United States))
- Question: Are you located in or willing to relocate to the United States? (hint: Please note, you must reside in the United States to be considered for this position. We are not currently providing relocation support for this role. If you intended to apply for employment in anothe)
- Control: combobox, required; options: (not recorded)
- Value: `Yes` (chose "Yes, I live in the United States.")
- Decision: answer; matched saved question: "Quick answers › relocation"
- Why wrong (qa_relocation_residence): relocation and where the candidate lives in one question

### greenhouse:wallapop — Are you in Catalonia (Spain) or willing to relocate?

- URL: https://job-boards.greenhouse.io/wallapop/jobs/4774660101
- Job: Principal Growth Product Manager (Barcelona)
- Question: Are you in Catalonia (Spain) or willing to relocate?
- Control: combobox, required; options: (not recorded)
- Value: `Yes`
- Decision: answer; matched saved question: "Quick answers › relocation"
- Why wrong (qa_relocation_residence): relocation and where the candidate lives in one question

### greenhouse:wallapop — Are you in Catalonia (Spain) or willing to relocate?

- URL: https://job-boards.greenhouse.io/wallapop/jobs/4214949101
- Job: Senior Product Manager (Barcelona)
- Question: Are you in Catalonia (Spain) or willing to relocate?
- Control: combobox, required; options: (not recorded)
- Value: `Yes`
- Decision: answer; matched saved question: "Quick answers › relocation"
- Why wrong (qa_relocation_residence): relocation and where the candidate lives in one question

### greenhouse:wallapop — Are you in Catalonia (Spain) or willing to relocate?

- URL: https://job-boards.greenhouse.io/wallapop/jobs/5027245101
- Job: Principal Product Manager (Barcelona)
- Question: Are you in Catalonia (Spain) or willing to relocate?
- Control: combobox, required; options: (not recorded)
- Value: `Yes`
- Decision: answer; matched saved question: "Quick answers › relocation"
- Why wrong (qa_relocation_residence): relocation and where the candidate lives in one question

### greenhouse:wallapop — Are you in Catalonia (Spain) or willing to relocate?

- URL: https://job-boards.greenhouse.io/wallapop/jobs/4917916101
- Job: Staff Data Scientist, Experimentation (Barcelona)
- Question: Are you in Catalonia (Spain) or willing to relocate?
- Control: combobox, required; options: (not recorded)
- Value: `Yes`
- Decision: answer; matched saved question: "Quick answers › relocation"
- Why wrong (qa_relocation_residence): relocation and where the candidate lives in one question

### greenhouse:adyen — What's your salary expectation?

- URL: https://job-boards.greenhouse.io/adyen/jobs/8190518
- Job: Accounts Payable Specialist (São Paulo)
- Question: What's your salary expectation?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in Brazil

### greenhouse:agoda — What is your expected salary?

- URL: https://job-boards.greenhouse.io/agoda/jobs/8129477
- Job: 2026 Support Associate - Korean&English(Seoul) (Seoul)
- Question: What is your expected salary?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in an unknown country

### greenhouse:agoda — What is your expected salary?

- URL: https://job-boards.greenhouse.io/agoda/jobs/8104970
- Job: Account Executive-Seoul (Seoul, South Korea)
- Question: What is your expected salary?
- Control: textarea, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in South Korea

### greenhouse:airtable — What are your compensation expectations?

- URL: https://job-boards.greenhouse.io/airtable/jobs/8403107002
- Job: Account Executive, Corporate (Remote - US)
- Question: What are your compensation expectations?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### ashby:airwallex — Salary Expectations

- URL: https://jobs.ashbyhq.com/airwallex/330db6f4-079a-452a-a552-0c499d5c1473/application
- Job: Senior Associate, Partner Marketing, CN (CN - Shanghai)
- Question: Salary Expectations
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in China

### ashby:airwallex — Salary Expectations

- URL: https://jobs.ashbyhq.com/airwallex/6e975468-e033-4f50-95fe-0f4351457003/application
- Job: Senior Data Platform Engineer, Knowledge Platform & AI Enablement (SG - Singapore)
- Question: Salary Expectations
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in Singapore

### ashby:airwallex — Salary Expectations

- URL: https://jobs.ashbyhq.com/airwallex/46586b3a-ab75-4f41-b51a-5cf34a7d598b/application
- Job: Head of SME & Growth, Canada (CA - Toronto)
- Question: Salary Expectations
- Control: text; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in Canada, United States

### ashby:airwallex — Salary Expectations

- URL: https://jobs.ashbyhq.com/airwallex/2fd283e7-a736-46b0-ba17-5fd3a5cefe17/application
- Job: Staff Product Manager, Card Schemes (US - San Francisco)
- Question: Salary Expectations
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### ashby:alephalpha — Expected salary

- URL: https://jobs.ashbyhq.com/AlephAlpha/2faca6ec-69bd-4e04-b055-05f24ddf0f4d/application
- Job: Senior AI R&D Engineer - Performance - Pre-training (f/m/d) (Heidelberg)
- Question: Expected salary
- Control: text; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in Germany

### ashby:alephalpha — Expected salary

- URL: https://jobs.ashbyhq.com/AlephAlpha/0ed0c9ef-8e9f-4161-80e6-55fc95c93736/application
- Job: AI R&D Engineer – Model Training  (f/m/d) (Heidelberg; Berlin)
- Question: Expected salary
- Control: text; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in Germany

### ashby:alephalpha — Expected salary

- URL: https://jobs.ashbyhq.com/AlephAlpha/fce0b58f-e95a-45bc-9ca5-b47b1c3cbabd/application
- Job: Senior AI Researcher: LLM post-training for hallucination reduction (f/m/d) (Heidelberg; Berlin)
- Question: Expected salary
- Control: text; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in Germany

### greenhouse:apolloio — What are your compensation expectations for the role? (Please do not say negotiable)

- URL: https://job-boards.greenhouse.io/apolloio/jobs/6015562004
- Job: Account Executive, New Business (Mid-Market) (Remote, United States)
- Question: What are your compensation expectations for the role? (Please do not say negotiable)
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### ashby:atlan — What are your compensation expectations for this role?

- URL: https://jobs.ashbyhq.com/atlan/b623af11-93ae-437f-bd32-8e9ac97430d4/application
- Job: Enterprise Account Executive - SF/Bay Area (San Francisco)
- Question: What are your compensation expectations for this role?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### greenhouse:backblaze — What is your desired salary? Please include currency as well.

- URL: https://job-boards.greenhouse.io/backblaze/jobs/5287532008
- Job: AI Workflow Engineer \| LATAM (Remote - Argentina; Remote - Colombia ; Remote - Costa Rica ; Remote - Mexico)
- Question: What is your desired salary? Please include currency as well.
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in Mexico, Argentina, Colombia

### greenhouse:backblaze — What is your desired salary?

- URL: https://job-boards.greenhouse.io/backblaze/jobs/5400309008
- Job: Data Center Technician I (On-site in Chandler, AZ) (Chandler, Arizona, United States)
- Question: What is your desired salary?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### greenhouse:backblaze — What is your desired salary?

- URL: https://job-boards.greenhouse.io/backblaze/jobs/5456359008
- Job: AE Neo Cloud - UK (Remote - United Kingdom)
- Question: What is your desired salary?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United Kingdom

### greenhouse:backblaze — What is your desired salary?

- URL: https://job-boards.greenhouse.io/backblaze/jobs/5382622008
- Job: Director, Enterprise Systems & Architecture (Remote - US)
- Question: What is your desired salary?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### greenhouse:bandwidth — Desired Total Compensation?

- URL: https://job-boards.greenhouse.io/bandwidth/jobs/8285488
- Job: Applied AI Engineer (Raleigh, NC)
- Question: Desired Total Compensation?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### greenhouse:bandwidth — Desired total salary?

- URL: https://job-boards.greenhouse.io/bandwidth/jobs/8247649
- Job: Carrier Account Executive (United Kingdom - London)
- Question: Desired total salary?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United Kingdom

### greenhouse:bandwidth — Desired Total Compensation?

- URL: https://job-boards.greenhouse.io/bandwidth/jobs/8244478
- Job: Audio Visual Manager  (Raleigh, NC)
- Question: Desired Total Compensation?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### greenhouse:bandwidth — Desired Total Compensation?

- URL: https://job-boards.greenhouse.io/bandwidth/jobs/8177971
- Job: Business Development Representative (Raleigh, NC)
- Question: Desired Total Compensation?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### greenhouse:branch — What are your compensation expectations?

- URL: https://job-boards.greenhouse.io/branch/jobs/7902608003
- Job: Enterprise Account Executive, Marketplaces (Remote, US)
- Question: What are your compensation expectations?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### greenhouse:branch — What are your compensation expectations?

- URL: https://job-boards.greenhouse.io/branch/jobs/8044391003
- Job: Data Engineer (Remote, US)
- Question: What are your compensation expectations?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### greenhouse:c6bank — Qual é a sua expectativa salarial? CLT

- URL: https://job-boards.greenhouse.io/c6bank/jobs/4739497005
- Job: Analista de Business Intelligence Júnior \| Investimentos (São Paulo, Brazil)
- Question: Qual é a sua expectativa salarial? CLT
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in Brazil

### greenhouse:c6bank — Qual é a sua expectativa salarial (CLT)?

- URL: https://job-boards.greenhouse.io/c6bank/jobs/4748850005
- Job: Analista de Conteúdo Sênior \| Eventos (São Paulo, Brazil)
- Question: Qual é a sua expectativa salarial (CLT)?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in Brazil

### greenhouse:c6bank — Qual é a sua expectativa salarial? CLT

- URL: https://job-boards.greenhouse.io/c6bank/jobs/4742683005
- Job: Analista de Controles Internos Sênior – Regulatórios \| Processos & Controles  (São Paulo, Brazil)
- Question: Qual é a sua expectativa salarial? CLT
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in Brazil

### greenhouse:celonis — Salary Expectation

- URL: https://job-boards.greenhouse.io/celonis/jobs/8039943003
- Job: Account Executive - Public Sector Germany - Defense (Bundeswehr) (Remote, Germany)
- Question: Salary Expectation
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in Germany

### greenhouse:celonis — Salary Expectation

- URL: https://job-boards.greenhouse.io/celonis/jobs/7887061003
- Job: Account Executive - CPG (Remote, US, Georgia)
- Question: Salary Expectation
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### greenhouse:celonis — Salary Expectation

- URL: https://job-boards.greenhouse.io/celonis/jobs/7778127003
- Job: Account Executive - Energy (Remote, US, Texas)
- Question: Salary Expectation
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### greenhouse:celonis — Salary Expectation

- URL: https://job-boards.greenhouse.io/celonis/jobs/7799840003
- Job: Account Executive - Federal (Remote, US, Washington DC)
- Question: Salary Expectation
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### ashby:clickup — What is your desired salary range for this role, including base and any variable or on-target earnings?

- URL: https://jobs.ashbyhq.com/clickup/abcd8589-5341-4890-99bb-3dcfc93246a9/application
- Job: Staff Backend Engineer, Hierarchy (United States)
- Question: What is your desired salary range for this role, including base and any variable or on-target earnings?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### ashby:clickup — What is your desired salary range for this role, including base and any variable or on-target earnings?

- URL: https://jobs.ashbyhq.com/clickup/1e8c7f3d-3cd6-4393-b17f-6a858f480ba9/application
- Job: Strategic Solutions Engineer (Australia)
- Question: What is your desired salary range for this role, including base and any variable or on-target earnings?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in Australia

### ashby:clickup — What is your desired salary range for this role, including base and any variable or on-target earnings?

- URL: https://jobs.ashbyhq.com/clickup/c252ee33-b277-474e-963d-7fb64004c8a0/application
- Job: Engineering Manager (Frontend) (United States)
- Question: What is your desired salary range for this role, including base and any variable or on-target earnings?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### ashby:clickup — What is your desired salary range for this role, including base and any variable or on-target earnings?

- URL: https://jobs.ashbyhq.com/clickup/6e0ac570-85a9-4ff4-b986-f8cf44168e31/application
- Job: Senior Backend Engineer (Czechia; Bulgaria; Ukraine; Poland; Hungary)
- Question: What is your desired salary range for this role, including base and any variable or on-target earnings?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in Poland

### greenhouse:cockroachlabs — What are your salary expectations?

- URL: https://job-boards.greenhouse.io/cockroachlabs/jobs/8332010
- Job: Account Executive, DACH (Remote, Germany)
- Question: What are your salary expectations?
- Control: text; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in Germany

### greenhouse:cockroachlabs — What are your salary expectations?

- URL: https://job-boards.greenhouse.io/cockroachlabs/jobs/8331987
- Job: Account Executive, UK  (London, UK)
- Question: What are your salary expectations?
- Control: text; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United Kingdom

### greenhouse:cockroachlabs — What are your salary expectations?

- URL: https://job-boards.greenhouse.io/cockroachlabs/jobs/8079608
- Job: Deal Desk Manager, AMER (New York, NY)
- Question: What are your salary expectations?
- Control: text; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### greenhouse:cockroachlabs — What are your salary expectations?

- URL: https://job-boards.greenhouse.io/cockroachlabs/jobs/8209735
- Job: Director, FP&A (New York, NY; San Mateo, CA)
- Question: What are your salary expectations?
- Control: text; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### greenhouse:cognite — What is your annual salary expectation? (Please provide a number or range)

- URL: https://job-boards.greenhouse.io/cognite/jobs/4867423101
- Job: Account Executive (Process Manufacturing) (Switzerland)
- Question: What is your annual salary expectation? (Please provide a number or range)
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in Switzerland

### greenhouse:cognite — What is your annual salary expectation? (Please provide a number or range)

- URL: https://job-boards.greenhouse.io/cognite/jobs/4959436101
- Job: Business Development Director – Supply Chain Center of Excellence (CoE) (Germany)
- Question: What is your annual salary expectation? (Please provide a number or range)
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in Germany

### greenhouse:cognite — What is your annual salary expectation? (Please provide a number or range)

- URL: https://job-boards.greenhouse.io/cognite/jobs/4948187101
- Job: Account Executive (USA (Houston))
- Question: What is your annual salary expectation? (Please provide a number or range)
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### greenhouse:commercetools — What are your salary expectations?

- URL: https://job-boards.greenhouse.io/commercetools/jobs/7791431003
- Job: Principal Engineer, Product Security (London, England, United Kingdom (Hybrid) )
- Question: What are your salary expectations?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United Kingdom

### greenhouse:dataiku — What are your salary expectations?

- URL: https://job-boards.greenhouse.io/dataiku/jobs/6250336004
- Job: General Manager, Agent Management (United States, Remote)
- Question: What are your salary expectations?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### greenhouse:dataiku — What are your salary expectations?

- URL: https://job-boards.greenhouse.io/dataiku/jobs/6236322004
- Job: Director, Sales Engineering (United States, Remote)
- Question: What are your salary expectations?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### greenhouse:dataiku — What are your salary expectations?

- URL: https://job-boards.greenhouse.io/dataiku/jobs/5734728004
- Job: Enterprise Account Executive (South Korea, Seoul)
- Question: What are your salary expectations?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in South Korea

### greenhouse:dataiku — What are your salary expectations?

- URL: https://job-boards.greenhouse.io/dataiku/jobs/5420293004
- Job: Fullstack Software Engineer - Core (France, Remote; Germany, Remote; Netherlands, Remote; Spain, Remote; United Kingdom, Remote)
- Question: What are your salary expectations?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United Kingdom, Germany, France, Spain, Netherlands

### ashby:deepl — What is your annual salary expectation?

- URL: https://jobs.ashbyhq.com/DeepL/236d8651-c4c9-4bb8-a9ea-57d535cb76fb/application
- Job: Head of Product Growth (London; Amsterdam)
- Question: What is your annual salary expectation?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United Kingdom, Netherlands

### ashby:deepl — What is your annual salary expectation?

- URL: https://jobs.ashbyhq.com/DeepL/22c4e48d-09ed-446d-bf74-4a546db31e8c/application
- Job: Machine Learning Engineering Manager  (London; Amsterdam; Munich)
- Question: What is your annual salary expectation?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United Kingdom, Germany, Netherlands

### ashby:deepl — What is your annual salary expectation?

- URL: https://jobs.ashbyhq.com/DeepL/14d6eeda-bbf1-44c3-a881-8f04b4e4d664/application
- Job: Lead Customer Marketing Manager (London; Cologne; Amsterdam; Berlin; Munich)
- Question: What is your annual salary expectation?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United Kingdom, Germany, Netherlands

### ashby:deepl — What is your annual salary expectation?

- URL: https://jobs.ashbyhq.com/DeepL/ee1e5089-4652-4ea2-b233-8c3ab0fe729d/application
- Job: VP of Sales, AMER (Austin; San Francisco; New York)
- Question: What is your annual salary expectation?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### greenhouse:deliveroo — Please give an indication of salary expectations

- URL: https://job-boards.greenhouse.io/deliveroo/jobs/8234571
- Job: Account Management Team Lead - Regional UKI (Mandarin Speaking, Chinese Category) (Birmingham, United Kingdom; Bristol, United Kingdom; Dublin, Ireland; Edinburgh, United Kingdom; Leeds, United Kingdom; London, United Kingdom; Manchester, United Kingdom)
- Question: Please give an indication of salary expectations
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United Kingdom, Ireland

### greenhouse:deliveroo — What are your base salary expectations for this position?

- URL: https://job-boards.greenhouse.io/deliveroo/jobs/8352921
- Job: Account Manager (Bexleyheath/Orpington, Sidcup) (London, United Kingdom - Deliveroo)
- Question: What are your base salary expectations for this position?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United Kingdom

### ashby:doctolib — Bitte teile uns deine Gehaltsvorstellungen mit

- URL: https://jobs.ashbyhq.com/doctolib/e5d45fd8-4497-42dc-87eb-df7f187682b6/application
- Job: Team Manager Customer Success (x/f/m) (Berlin)
- Question: Bitte teile uns deine Gehaltsvorstellungen mit
- Control: text; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in Germany

### greenhouse:esri — What is your annual salary range requirement?

- URL: https://job-boards.greenhouse.io/esri/jobs/5067174007
- Job: Account Manager - Education (Denver, CO - Louisville)
- Question: What is your annual salary range requirement?
- Control: text; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### greenhouse:esri — What is your annual salary range requirement?

- URL: https://job-boards.greenhouse.io/esri/jobs/5259316007
- Job: Accountant I - Revenue (Redlands, CA)
- Question: What is your annual salary range requirement?
- Control: text; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### greenhouse:esri — What is your annual salary range requirement?

- URL: https://job-boards.greenhouse.io/esri/jobs/5253674007
- Job: Accounting Representative - AP (Redlands, CA)
- Question: What is your annual salary range requirement?
- Control: text; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### greenhouse:esri — What is your annual salary range requirement?

- URL: https://job-boards.greenhouse.io/esri/jobs/5199110007
- Job: Account Manager – Architecture & Urban Planning (San Antonio, TX)
- Question: What is your annual salary range requirement?
- Control: text; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### greenhouse:ginkgobioworks — Salary Expectations

- URL: https://job-boards.greenhouse.io/ginkgobioworks/jobs/5220505007
- Job: Cheminformatics & Synthesis Prediction (Boston, Massachusetts)
- Question: Salary Expectations
- Control: text; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### greenhouse:ginkgobioworks — Salary Expectations

- URL: https://job-boards.greenhouse.io/ginkgobioworks/jobs/5238882007
- Job: Associate Director, Environmental Health and Safety (Boston, Massachusetts)
- Question: Salary Expectations
- Control: text; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### greenhouse:ginkgobioworks — Salary Expectations

- URL: https://job-boards.greenhouse.io/ginkgobioworks/jobs/5249264007
- Job: Automation Scientist Graduate Intern, RAC Operations (Boston, Massachusetts)
- Question: Salary Expectations
- Control: text; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### greenhouse:ginkgobioworks — Salary Expectations

- URL: https://job-boards.greenhouse.io/ginkgobioworks/jobs/5022683007
- Job: Automation Scientist Intern, RAC Operations (Boston, Massachusetts)
- Question: Salary Expectations
- Control: text; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### greenhouse:glance — What are your salary expectations?

- URL: https://job-boards.greenhouse.io/glance/jobs/8190827
- Job: Director – Media & Entertainment Partnerships (Los Angeles, CA)
- Question: What are your salary expectations?
- Control: text; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### greenhouse:gocardless — What are your salary expectations?

- URL: https://job-boards.greenhouse.io/gocardless/jobs/8188573
- Job: Associate Legal Counsel (Leeds, UK)
- Question: What are your salary expectations?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United Kingdom

### greenhouse:gocardless — What are your salary expectations for this role?

- URL: https://job-boards.greenhouse.io/gocardless/jobs/8267215
- Job: Customer Operations Representative, French-speaking (12-month FTC) (Riga, Latvia)
- Question: What are your salary expectations for this role?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in an unknown country

### greenhouse:gymshark — What are your salary expectations (per annum) for this role?

- URL: https://job-boards.greenhouse.io/gymshark/jobs/4981295101
- Job: Department Manager  (New York, New York, United States)
- Question: What are your salary expectations (per annum) for this role?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### greenhouse:gymshark — What are your salary expectations (per annum) for this role?

- URL: https://job-boards.greenhouse.io/gymshark/jobs/4863068101
- Job: Gym Assistant General Manager (Miami, Florida, United States)
- Question: What are your salary expectations (per annum) for this role?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### greenhouse:gymshark — What are your salary expectations (per annum) for this role?

- URL: https://job-boards.greenhouse.io/gymshark/jobs/4988756101
- Job: Mobile Engineer - IOS (Solihull, England, United Kingdom)
- Question: What are your salary expectations (per annum) for this role?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United Kingdom

### greenhouse:hootsuite — What are your annual salary expectations (or total on target earnings) for this position?

- URL: https://job-boards.greenhouse.io/hootsuite/jobs/7716381
- Job: Enterprise Sales Development Representative (Vancouver, British Columbia, Canada)
- Question: What are your annual salary expectations (or total on target earnings) for this position?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in Canada

### greenhouse:housinganywhere — What are your salary expectations?

- URL: https://job-boards.greenhouse.io/housinganywhere/jobs/8179120003
- Job: Head of Customer Experience & Trust  (Rotterdam, Zuid-Holland, Netherlands)
- Question: What are your salary expectations?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in Netherlands

### greenhouse:housinganywhere — What are your salary expectations?

- URL: https://job-boards.greenhouse.io/housinganywhere/jobs/7971427003
- Job: Strategy & Planning Manager  (Rotterdam, Zuid-Holland, Netherlands)
- Question: What are your salary expectations?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in Netherlands

### greenhouse:housinganywhere — What are your salary expectations (based on 40 hours, including Holiday Allowance)?

- URL: https://job-boards.greenhouse.io/housinganywhere/jobs/8015483003
- Job: Senior Product Designer - Listing & Finding experience (Rotterdam, Zuid-Holland, Netherlands)
- Question: What are your salary expectations (based on 40 hours, including Holiday Allowance)?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in Netherlands

### greenhouse:inter — Informe seu salário atual/último:

- URL: https://job-boards.greenhouse.io/inter/jobs/4745929005
- Job: BRANDING SPECIALIST I  (Belo Horizonte, MG)
- Question: Informe seu salário atual/último:
- Control: text, required; options: (not recorded)
- Value: `12 LPA`; on the page: `12 LPA`
- Decision: answer; matched saved question: "Quick answers › current CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in an unknown country

### greenhouse:inter — Informe seu salário atual/último:

- URL: https://job-boards.greenhouse.io/inter/jobs/4738654005
- Job: COLLECTION ANALYST III \| UNSECURED DEBT COLLECTION (Belo Horizonte, MG)
- Question: Informe seu salário atual/último:
- Control: text, required; options: (not recorded)
- Value: `12 LPA`; on the page: `12 LPA`
- Decision: answer; matched saved question: "Quick answers › current CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in an unknown country

### greenhouse:jumia — What is your net salary expectation ?

- URL: https://job-boards.greenhouse.io/jumia/jobs/4974610101
- Job: First Mile & Last Mile Manager - Jumia (Full Time) (Nigeria)
- Question: What is your net salary expectation ?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in an unknown country

### greenhouse:jumia — What is your net salary expectation?

- URL: https://job-boards.greenhouse.io/jumia/jobs/5020464101
- Job: Fraud Analyst - Jumia (Full Time) (Nigeria)
- Question: What is your net salary expectation?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in an unknown country

### greenhouse:justworks — What are your salary expectations for this role? (Base/OTE)

- URL: https://job-boards.greenhouse.io/justworks/jobs/6522701
- Job: Account Executive - In-Territory  (Austin, TX) (Remote - U.S.A.)
- Question: What are your salary expectations for this role? (Base/OTE)
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### greenhouse:justworks — What are your salary expectations for this role?

- URL: https://job-boards.greenhouse.io/justworks/jobs/8278376
- Job: Associate, Ancillary Benefits (New York, New York)
- Question: What are your salary expectations for this role?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### greenhouse:justworks — What are your salary expectations for this role?

- URL: https://job-boards.greenhouse.io/justworks/jobs/7305519
- Job: Channel Partner Manager (Benefits Broker Segment) (New York, New York; Phoenix, Arizona)
- Question: What are your salary expectations for this role?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### greenhouse:justworks — What are your salary expectations for this role?

- URL: https://job-boards.greenhouse.io/justworks/jobs/5136582
- Job: Customer Success Manager (New York, New York)
- Question: What are your salary expectations for this role?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### greenhouse:komodohealth — What is your desired salary for this role?

- URL: https://job-boards.greenhouse.io/komodohealth/jobs/7811272002
- Job: Account Executive - AVP, Sales (Emerging) (United States)
- Question: What is your desired salary for this role?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### greenhouse:komodohealth — What is your desired salary for this role?

- URL: https://job-boards.greenhouse.io/komodohealth/jobs/8868143002
- Job: Principal Product Manager, AI Products (United States)
- Question: What is your desired salary for this role?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### greenhouse:komodohealth — What is your desired salary for this role?

- URL: https://job-boards.greenhouse.io/komodohealth/jobs/8880020002
- Job: Sales Development Representative (New York, NY)
- Question: What is your desired salary for this role?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### greenhouse:lucidmotors — What is your expected compensation range?

- URL: https://job-boards.greenhouse.io/lucidmotors/jobs/5093940007
- Job: ADAS/AD Simulation Engineer - Tools (Southfield, MI)
- Question: What is your expected compensation range?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### greenhouse:lucidmotors — What is your expected compensation range?

- URL: https://job-boards.greenhouse.io/lucidmotors/jobs/5279891007
- Job: Assistant Manager, Customer Care (Southfield, MI)
- Question: What is your expected compensation range?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### greenhouse:lucidmotors — What is your expected compensation range?

- URL: https://job-boards.greenhouse.io/lucidmotors/jobs/5282234007
- Job: Assistant Service Manager, Seattle (Seattle, WA)
- Question: What is your expected compensation range?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### greenhouse:luno — What is your salary expectation?

- URL: https://job-boards.greenhouse.io/luno/jobs/8108140
- Job: OTC Trader (Cape Town or Johannesburg)
- Question: What is your salary expectation?
- Control: textarea, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### greenhouse:luno — What is your salary expectation?

- URL: https://job-boards.greenhouse.io/luno/jobs/8345344
- Job: Senior Manager - Payment Partnerships (South Africa or Nigeria)
- Question: What is your salary expectation?
- Control: textarea, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### greenhouse:mentimeter — Considering your experience & relevant skills for this position - what compensation expectations do you have?

- URL: https://job-boards.greenhouse.io/mentimeter/jobs/4849785101
- Job: Account Manager - DACH Enterprise (Berlin)
- Question: Considering your experience & relevant skills for this position - what compensation expectations do you have? (hint: We ask this question to ensure alignment and transparency early in the process. Your response will not be used as a negotiation tool, but rather to assess whether our compensation framework and your e)
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in Germany

### greenhouse:mentimeter — Considering your experience & relevant skills for this position - what compensation expectations do you have?

- URL: https://job-boards.greenhouse.io/mentimeter/jobs/4968994101
- Job: Account Manager - EMEA  (Stockholm)
- Question: Considering your experience & relevant skills for this position - what compensation expectations do you have? (hint: We ask this question to ensure alignment and transparency early in the process. Your response will not be used as a negotiation tool, but rather to assess whether our compensation framework and your e)
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in an unknown country

### greenhouse:mirakl — Salary Expectation : What is your expected total annual gross salary for this role, including both base salary or/and any variable components (e.g., based paid 

- URL: https://job-boards.greenhouse.io/mirakl/jobs/5589254004
- Job: Account Executive (German Speaking), Mirakl Connect  (Paris, France)
- Question: Salary Expectation : What is your expected total annual gross salary for this role, including both base salary or/and any variable components (e.g., based paid and bonus or commission)?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in France

### greenhouse:mirakl — Salary Expectation : What is your expected total annual gross salary for this role, including both base salary or/and any variable components (e.g., based paid 

- URL: https://job-boards.greenhouse.io/mirakl/jobs/6233307004
- Job: Account Executive, Mirakl Connect  (München, Bavaria, Germany)
- Question: Salary Expectation : What is your expected total annual gross salary for this role, including both base salary or/and any variable components (e.g., based paid and bonus or commission)?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in Germany

### ashby:miro — What are your salary expectations? (Optional — we believe in flexible, transparent conversations about compensation and this helps us have that conversation ear

- URL: https://jobs.ashbyhq.com/miro/652d9608-66b6-48a2-91a3-8c206347896b/application
- Job: Expression of Interest: Enterprise & Strategic Account Executive (Austin)
- Question: What are your salary expectations? (Optional — we believe in flexible, transparent conversations about compensation and this helps us have that conversation early.)
- Control: text; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### ashby:mollie — What are your salary expectations? (Yearly gross)

- URL: https://jobs.ashbyhq.com/mollie/304404f1-c1c6-4e91-bfc6-16affeeeeeda/application
- Job: Senior Product Marketing Manager - Online Payments (London)
- Question: What are your salary expectations? (Yearly gross)
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United Kingdom

### ashby:mollie — What are your salary expectations? (Yearly gross)

- URL: https://jobs.ashbyhq.com/mollie/3bcb16aa-833c-4aeb-a277-ab7603a176f9/application
- Job: Application Engineer II (Lisbon)
- Question: What are your salary expectations? (Yearly gross)
- Control: textarea; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in Portugal

### ashby:moneybox — Salary expections?

- URL: https://jobs.ashbyhq.com/moneybox/8f562e37-e5c6-41c5-b352-5e570f7939b4/application
- Job: Senior Data Engineer (London Office)
- Question: Salary expections?
- Control: textarea, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United Kingdom

### ashby:moneybox — What is your expected salary?

- URL: https://jobs.ashbyhq.com/moneybox/9831faa4-19e7-4cc3-8a59-2bbda9e78a34/application
- Job: Director of Treasury (London Office)
- Question: What is your expected salary?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United Kingdom

### ashby:moneybox — What is your expected salary?

- URL: https://jobs.ashbyhq.com/moneybox/fc1df409-2e3f-48b6-a392-507bcf857cfb/application
- Job: Financial Coach - (Remote) (Remote)
- Question: What is your expected salary?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in an unknown country

### ashby:moneybox — What is your expected salary?

- URL: https://jobs.ashbyhq.com/moneybox/f6b1a0f6-5636-4faf-8cd6-3b823d4992b1/application
- Job: Head of Advice - (Remote) (Remote)
- Question: What is your expected salary?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in an unknown country

### greenhouse:n26 — What are your salary expectations?

- URL: https://job-boards.greenhouse.io/n26/jobs/8345614
- Job: AFC Associate - SAR Delegate (Madrid)
- Question: What are your salary expectations? (hint: Please state yearly gross salary expectations in the following format: XX,XXX €)
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in Spain

### greenhouse:n26 — What are your salary expectations?

- URL: https://job-boards.greenhouse.io/n26/jobs/8333692
- Job: AFC Manager - SAR Delegate Lead \| MLRO France (Paris)
- Question: What are your salary expectations? (hint: Please state yearly gross salary expectations in the following format: XX,XXX €)
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in France

### greenhouse:n26 — What are your salary expectations?

- URL: https://job-boards.greenhouse.io/n26/jobs/8305489
- Job: AFCO Team Lead (Madrid)
- Question: What are your salary expectations? (hint: Please state yearly gross salary expectations in the following format: XX,XXX €)
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in Spain

### greenhouse:n26 — What are your salary expectations?

- URL: https://job-boards.greenhouse.io/n26/jobs/8156159
- Job: AFC Operations Team Lead (Italian Speaker) (Madrid)
- Question: What are your salary expectations? (hint: Please state yearly gross salary expectations in the following format: XX,XXX €)
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in Spain

### greenhouse:nice — What is your desired base salary?

- URL: https://job-boards.greenhouse.io/nice/jobs/4956979101
- Job: Account Executive, Enterprise AI, West Coast (USA - Remote)
- Question: What is your desired base salary?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### ashby:nubank — What is your salary expectation?

- URL: https://jobs.ashbyhq.com/nubank/7f8653ae-56fd-4f2c-939e-05f95f19fe4a/application
- Job: Lead Business Analyst (Buenos Aires)
- Question: What is your salary expectation? (hint: Add the currency of your Country of residence, for example: BRL 10.000, USD 10.000, MXN 10.000 and so on)
- Control: text; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in Argentina

### ashby:nubank — What is your salary expectation?

- URL: https://jobs.ashbyhq.com/nubank/857cd146-2988-4c87-907d-558aa7001a72/application
- Job: Staff Software Engineer (Crypto, SV) - US - IC7 - 2026 (Palo Alto)
- Question: What is your salary expectation? (hint: Add the currency of your Country of residence, for example: BRL 10.000, USD 10.000, MXN 10.000 and so on)
- Control: text; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### ashby:nubank — What is your salary expectation?

- URL: https://jobs.ashbyhq.com/nubank/d9d8a861-675c-4f43-819e-ccaf58bf23af/application
- Job: Senior Staff Software Engineer (Crypto, SV) - IC8+ - US - 2026 (Palo Alto)
- Question: What is your salary expectation? (hint: Add the currency of your Country of residence, for example: BRL 10.000, USD 10.000, MXN 10.000 and so on)
- Control: text; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### ashby:nubank — What is your salary expectation?

- URL: https://jobs.ashbyhq.com/nubank/f54964e0-80b5-46c1-8b30-5a92d2b47126/application
- Job: Lead Mobile Engineer (Palo Alto)
- Question: What is your salary expectation? (hint: Add the currency of your Country of residence, for example: BRL 10.000, USD 10.000, MXN 10.000 and so on)
- Control: text; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### greenhouse:polyai — What are your salary expectations for this role?

- URL: https://job-boards.greenhouse.io/polyai/jobs/5027239101
- Job: Staff Product Manager (Runtime Team)  (London, United Kingdom)
- Question: What are your salary expectations for this role?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United Kingdom

### greenhouse:polyai — What are your salary expectations for this role?

- URL: https://job-boards.greenhouse.io/polyai/jobs/5027447101
- Job: Senior Account Manager (Pacific, Mountain, or Central time zone) (United States)
- Question: What are your salary expectations for this role?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### greenhouse:polyai — What are your base salary expectations for this role?

- URL: https://job-boards.greenhouse.io/polyai/jobs/5010878101
- Job: Senior Marketing Manager, EMEA (United Kingdom)
- Question: What are your base salary expectations for this role?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United Kingdom

### ashby:poshmark — What are your compensation expectations?

- URL: https://jobs.ashbyhq.com/poshmark/22fe890a-5c2c-4133-a91c-2e82348bc5d8/application
- Job: Software Engineer II, Cloud Platform (US California (Redwood City) - Office)
- Question: What are your compensation expectations?
- Control: text; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### ashby:poshmark — What are your compensation expectations?

- URL: https://jobs.ashbyhq.com/poshmark/b85cce7a-9349-46e2-954f-710db8ac0eb9/application
- Job: Staff Software Engineer, Web (US California (Redwood City) - Office)
- Question: What are your compensation expectations?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### ashby:poshmark — What are your compensation expectations?

- URL: https://jobs.ashbyhq.com/poshmark/62cbe59f-9ef5-454f-9987-4c537a050984/application
- Job: Sr. Software Engineer II, Web (US California (Redwood City) - Office)
- Question: What are your compensation expectations?
- Control: text; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### ashby:poshmark — What are your compensation expectations?

- URL: https://jobs.ashbyhq.com/poshmark/461a37db-d133-4947-a17d-8afd2092a6fc/application
- Job: Senior Software Engineer II, Machine Learning (IN Tamil Nadu (Chennai) - Office)
- Question: What are your compensation expectations?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in India, United States

### greenhouse:quintoandar — ¿Cuál es tu expectativa bruta salarial para esta posición?

- URL: https://job-boards.greenhouse.io/quintoandar/jobs/4449573009
- Job: Data Specialist (Argentina)
- Question: ¿Cuál es tu expectativa bruta salarial para esta posición?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in Argentina

### greenhouse:quintoandar — Caso se sinta confortável para compartilhar com a gente, qual é a sua pretensão salarial para esta posição?

- URL: https://job-boards.greenhouse.io/quintoandar/jobs/4433716009
- Job: Analista de Planejamento e Performance \| Sales Operations - Afirmativa PcD (Brasil)
- Question: Caso se sinta confortável para compartilhar com a gente, qual é a sua pretensão salarial para esta posição?
- Control: text; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in an unknown country

### greenhouse:quintoandar — ¿Cuál es tu expectativa salarial para esta posición?

- URL: https://job-boards.greenhouse.io/quintoandar/jobs/4330619009
- Job: Banco de Talentos I Telesales Executive - Argentina (Argentina)
- Question: ¿Cuál es tu expectativa salarial para esta posición? (hint: Por favor, determinar fijo y variable en bruto.)
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in Argentina

### greenhouse:raisin — What are your salary expectations?

- URL: https://job-boards.greenhouse.io/raisin/jobs/4949391101
- Job: AFC Advisory Manager (f/m/d) (Berlin, Berlin, Germany; Frankfurt a. M.; Hamburg; Munich)
- Question: What are your salary expectations? (hint: Please share your annual expected salary in the local currency of the posting location. Eg. 65000)
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in Germany

### greenhouse:raisin — What is your salary expectation?

- URL: https://job-boards.greenhouse.io/raisin/jobs/5017767101
- Job: B2B Partner Operations Manager (m/f/d) (Berlin, Berlin, Germany)
- Question: What is your salary expectation? (hint: Please share your expected salary in the local currency of the posting location. Eg. 65000)
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in Germany

### greenhouse:raisin — What is your salary expectation?

- URL: https://job-boards.greenhouse.io/raisin/jobs/4997564101
- Job: Chief of Staff, Strategic Growth & Partnerships (UK) (London, England, United Kingdom)
- Question: What is your salary expectation? (hint: Please share your expected salary in the local currency of the posting location. Eg. 65000)
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United Kingdom

### greenhouse:raisin — What is your salary expectation?

- URL: https://job-boards.greenhouse.io/raisin/jobs/4950903101
- Job: Corporate Communications Manager (m/f/d) (Berlin, Berlin, Germany)
- Question: What is your salary expectation? (hint: Please share your expected salary in the local currency of the posting location. Eg. 65000)
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in Germany

### greenhouse:realtimeboardglobal — What are your salary expectations? (Optional — we believe in flexible, transparent conversations about compensation and this helps us have that conversation ear

- URL: https://job-boards.greenhouse.io/realtimeboardglobal/jobs/8634110002
- Job: Expression of Interest: Enterprise & Strategic Account Executive (Austin, US)
- Question: What are your salary expectations? (Optional — we believe in flexible, transparent conversations about compensation and this helps us have that conversation early.)
- Control: text; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### ashby:replit — What is your desired salary range?

- URL: https://jobs.ashbyhq.com/replit/234c9a82-2857-4691-af83-308100806df3/application
- Job: Senior/Product Marketing Manager (Foster City, CA)
- Question: What is your desired salary range?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### ashby:replit — What is your desired salary range?

- URL: https://jobs.ashbyhq.com/replit/659a8e1e-69ba-44c0-a632-96665051a3e8/application
- Job: Senior Software Engineer, Compute Platform (Foster City, CA)
- Question: What is your desired salary range?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### ashby:replit — What is your desired salary range?

- URL: https://jobs.ashbyhq.com/replit/0170f630-f7c9-4471-8d2f-8c55fb184206/application
- Job: Engineering Manager, Mobile (Foster City, CA)
- Question: What is your desired salary range?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### ashby:replit — What is your desired salary range?

- URL: https://jobs.ashbyhq.com/replit/8027a0f4-4837-4e49-a4dd-8ad1bde23277/application
- Job: Cloud Security Lead (Foster City, CA)
- Question: What is your desired salary range?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### greenhouse:rocketlab — Please share with us your salary expectations.

- URL: https://job-boards.greenhouse.io/rocketlab/jobs/8165912003
- Job: Accounts Payable Specialist (Long Beach, CA)
- Question: Please share with us your salary expectations.
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### greenhouse:rocketlab — Please share with us your salary expectations.

- URL: https://job-boards.greenhouse.io/rocketlab/jobs/8040606003
- Job: Accounts Receivable Accountant II (Long Beach, CA)
- Question: Please share with us your salary expectations.
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### greenhouse:rocketlab — Please share with us your salary expectations.

- URL: https://job-boards.greenhouse.io/rocketlab/jobs/8016902003
- Job: Additive Manufacturing Technician I (Long Beach, CA)
- Question: Please share with us your salary expectations.
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### greenhouse:solarisbank — What are your gross annual salary expectations?

- URL: https://job-boards.greenhouse.io/solarisbank/jobs/8596522002
- Job: Cyber Security Staff Engineer - Application Security  (Berlin)
- Question: What are your gross annual salary expectations? (hint: Please specify with local currency of the work location (example: 60000 EUR))
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in Germany

### greenhouse:solarisbank — What are your gross annual salary expectations?

- URL: https://job-boards.greenhouse.io/solarisbank/jobs/8610000002
- Job: Audit Senior Manager*innen (m/w/d) (Frankfurt)
- Question: What are your gross annual salary expectations? (hint: Please specify with local currency of the work location (example: 60000 EUR))
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in an unknown country

### greenhouse:solarisbank — What are your gross annual salary expectations?

- URL: https://job-boards.greenhouse.io/solarisbank/jobs/8596685002
- Job: Cyber Security Engineer (Vulnerability Management & SecOperations) (Berlin)
- Question: What are your gross annual salary expectations? (hint: Please specify with local currency of the work location (example: 60000 EUR))
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in Germany

### greenhouse:staffbase — What are your salary expectations?

- URL: https://job-boards.greenhouse.io/staffbase/jobs/8861538002
- Job: Advanced Implementation Consultant (Toronto, Ontario, Canada)
- Question: What are your salary expectations?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in Canada

### greenhouse:staffbase — What are your salary expectations for this role?

- URL: https://job-boards.greenhouse.io/staffbase/jobs/8731518002
- Job: Enterprise Account Executive (New York, New York, United States)
- Question: What are your salary expectations for this role?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### greenhouse:sumup — Salary expectations?

- URL: https://job-boards.greenhouse.io/sumup/jobs/8507799002
- Job: Account Manager (HVM) - German (Barcelona, Barcelona, Spain)
- Question: Salary expectations?
- Control: text; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in Spain

### ashby:supabase — Expected Compensation

- URL: https://jobs.ashbyhq.com/supabase/c01f7436-1fdd-4a3e-8b96-8cadc33b006e/application
- Job: Support Engineer (EMEA) (Remote, EMEA)
- Question: Expected Compensation
- Control: text; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in an unknown country

### ashby:supabase — Expected Compensation

- URL: https://jobs.ashbyhq.com/supabase/d5573afa-636c-4219-832f-386f498243bf/application
- Job: Customer Solution Architect (AMER) (Remote, AMER)
- Question: Expected Compensation
- Control: text; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in an unknown country

### ashby:supabase — Expected Compensation

- URL: https://jobs.ashbyhq.com/supabase/e4e3ccb7-7b7d-42a2-be0f-26cbb5ae4abd/application
- Job: Support Engineer (AMER) (Remote, AMER)
- Question: Expected Compensation
- Control: text; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in an unknown country

### ashby:synthesia — If you're comfortable doing so, please outline your salary expectations.

- URL: https://jobs.ashbyhq.com/synthesia/30e9bca5-32ce-4609-8546-47772b6315a1/application
- Job: Strategic Account Executive (New York City; Austin)
- Question: If you're comfortable doing so, please outline your salary expectations.
- Control: text; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### ashby:tractable — What are your salary expectations?

- URL: https://jobs.ashbyhq.com/tractable/070c7232-21b3-49d4-b77b-447fc09deebd/application
- Job: Procurement Manager (United States)
- Question: What are your salary expectations?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### ashby:tractable — What are your salary expectations?

- URL: https://jobs.ashbyhq.com/tractable/5247ca75-f4ab-401f-86fc-7791aaeadb7f/application
- Job: Embedded Systems Engineer (Salt Lake City)
- Question: What are your salary expectations?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### ashby:tractable — What are your salary expectations?

- URL: https://jobs.ashbyhq.com/tractable/76ecdf04-aa82-4488-9b4c-c46982c2cdf6/application
- Job: Senior Embedded Systems Engineer (Salt Lake City)
- Question: What are your salary expectations?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### ashby:tractable — What are your salary expectations?

- URL: https://jobs.ashbyhq.com/tractable/22b7f0dc-b06a-427b-995b-ea92c14b5bcd/application
- Job: Supply Chain & Operations Specialist (United States)
- Question: What are your salary expectations?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### greenhouse:truelayer — Please note your base salary expectations.

- URL: https://job-boards.greenhouse.io/truelayer/jobs/4906393101
- Job: Customer Success Manager - iGaming (London, United Kingdom)
- Question: Please note your base salary expectations.
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United Kingdom

### greenhouse:truelayer — What are your salary expectations?

- URL: https://job-boards.greenhouse.io/truelayer/jobs/5020556101
- Job: Senior Risk Analyst (Dublin, Ireland; London, United Kingdom; Milan, Italy)
- Question: What are your salary expectations?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United Kingdom, Ireland, Italy

### greenhouse:truelayer — Can you give us a rough indication of your salary expectations?

- URL: https://job-boards.greenhouse.io/truelayer/jobs/5012708101
- Job: Finance Assistant - Part-Time (Categorie Protette L. 68/99)  (Milan, Italy)
- Question: Can you give us a rough indication of your salary expectations?
- Control: text; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in Italy

### greenhouse:trustpilot — What are your salary expectations?

- URL: https://job-boards.greenhouse.io/trustpilot/jobs/8095990
- Job: Account Executive Benelux (Amsterdam)
- Question: What are your salary expectations? (hint: Please state yearly expectations in EUR.)
- Control: text, required; options: (not recorded)
- Value: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in Netherlands

### greenhouse:trustpilot — What are your salary expectations?

- URL: https://job-boards.greenhouse.io/trustpilot/jobs/7588014
- Job: Account Executive - Belgium market (Flemish speaking) (Amsterdam)
- Question: What are your salary expectations?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in Netherlands

### greenhouse:trustpilot — What are your salary expectations?

- URL: https://job-boards.greenhouse.io/trustpilot/jobs/8236598
- Job: Account Executive - DACH (Hamburg)
- Question: What are your salary expectations? (hint: Please state yearly expectations in EUR.)
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in Germany

### greenhouse:trustpilot — What are your salary expectations?

- URL: https://job-boards.greenhouse.io/trustpilot/jobs/8105352
- Job: Account Executive - French Mid-Market (French Speaking) (Copenhagen)
- Question: What are your salary expectations?
- Control: text; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in an unknown country

### greenhouse:typeface — What is your compensation expectation?

- URL: https://job-boards.greenhouse.io/typeface/jobs/5244588007
- Job: Enterprise Account Executive (West)
- Question: What is your compensation expectation?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in an unknown country

### greenhouse:typeface — What is your compensation expectation?

- URL: https://job-boards.greenhouse.io/typeface/jobs/5257457007
- Job: Engagement Manager  (Remote )
- Question: What is your compensation expectation?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in an unknown country

### greenhouse:veriff — Salary expectation (local currency/gross)

- URL: https://job-boards.greenhouse.io/veriff/jobs/8923220002
- Job: Lead Product Manager, Veriff Network (US(Remote), Tallinn, Spain (Remote))
- Question: Salary expectation (local currency/gross)
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States, Spain

### greenhouse:veriff — Salary expectation (local currency/gross)

- URL: https://job-boards.greenhouse.io/veriff/jobs/8912657002
- Job: Data Engineer (Tallinn)
- Question: Salary expectation (local currency/gross) (hint: In compliance with EU pay transparency guidelines, our defined salary band for this role will be shared prior to the first interview.)
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in an unknown country

### ashby:wayve — Salary Expectations?

- URL: https://jobs.ashbyhq.com/wayve/7ccefb0d-8264-4c72-9ddb-898ef56d3db5/application
- Job: Staff Machine Learning Engineer, Data Curation & Dataset Strategy (Sunnyvale, California USA)
- Question: Salary Expectations?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### ashby:wayve — Salary Expectations?

- URL: https://jobs.ashbyhq.com/wayve/ab085171-5815-4a63-bfe9-3bf4a09787b2/application
- Job: Technical Lead Manager, Synthetic Data  (London, United Kingdom)
- Question: Salary Expectations?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United Kingdom

### ashby:wayve — Salary Expectations?

- URL: https://jobs.ashbyhq.com/wayve/643e2bcf-ee19-4b9c-8b13-fa65c8069fc9/application
- Job: System Integration Engineer (Sunnyvale, California USA)
- Question: Salary Expectations?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### ashby:weaviate — What are your salary expectations for this role?

- URL: https://jobs.ashbyhq.com/weaviate/676139ff-9b72-4ee4-9e40-2bb52c6e96bd/application
- Job: Enterprise Account Executive (US - West)  (United States)
- Question: What are your salary expectations for this role?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### ashby:weaviate — What are your salary expectations for this role?

- URL: https://jobs.ashbyhq.com/weaviate/b8115139-e487-446c-96f5-fde81a6b0fc7/application
- Job: Finance Associate (Part-time/ Dutch Speaker) (Netherlands)
- Question: What are your salary expectations for this role?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in Netherlands

### greenhouse:wildlifestudios — What are your salary expectations?

- URL: https://job-boards.greenhouse.io/wildlifestudios/jobs/8932474002
- Job: Associate AI Automation Analyst (São Paulo, Brazil)
- Question: What are your salary expectations?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in Brazil

### greenhouse:wildlifestudios — What are your salary expectations?

- URL: https://job-boards.greenhouse.io/wildlifestudios/jobs/8908816002
- Job: Accounting and Reporting Manager (São Paulo)
- Question: What are your salary expectations?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in Brazil

### greenhouse:workato — What is your expected compensation?

- URL: https://job-boards.greenhouse.io/workato/jobs/8924839002
- Job: Account Executive (Tokyo, Japan)
- Question: What is your expected compensation?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in Japan

### greenhouse:workato — What is your expected compensation?

- URL: https://job-boards.greenhouse.io/workato/jobs/8870119002
- Job: Analytics Engineer (Singapore)
- Question: What is your expected compensation?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in Singapore

### greenhouse:workato — What is your expected compensation?

- URL: https://job-boards.greenhouse.io/workato/jobs/8731391002
- Job: Account Manager (New York, New York)
- Question: What is your expected compensation?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in United States

### greenhouse:workato — What is your expected compensation?

- URL: https://job-boards.greenhouse.io/workato/jobs/8595288002
- Job: Accounts and Billing Specialist (Alabang, Philippines)
- Question: What is your expected compensation?
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in Philippines

### greenhouse:glance — What is your current fixed/variable compensation breakdown?

- URL: https://job-boards.greenhouse.io/glance/jobs/8203695
- Job: Consultant - AI Governance Specialist (bangalore)
- Question: What is your current fixed/variable compensation breakdown?
- Control: text, required; options: (not recorded)
- Value: `12 LPA`; on the page: `12 LPA`
- Decision: answer; matched saved question: "Quick answers › current CTC"
- Why wrong (qa_salary_question): the question does not ask for the figure

### ashby:marshmallow — If there's anything else you'd like to mention regarding expected salary, please let us know here

- URL: https://jobs.ashbyhq.com/marshmallow/beb98aec-a226-4ae1-8d84-f08a6f4be675/application
- Job: Customer Care Executive (Budapest)
- Question: If there's anything else you'd like to mention regarding expected salary, please let us know here
- Control: text; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_question): the question does not ask for the figure

### ashby:marshmallow — If there's anything else you'd like to mention regarding expected salary, please let us know here

- URL: https://jobs.ashbyhq.com/marshmallow/ecb457b5-1773-496c-a8b5-fabec42759e2/application
- Job: Staff Data Scientist (London)
- Question: If there's anything else you'd like to mention regarding expected salary, please let us know here
- Control: text; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_question): the question does not ask for the figure

### ashby:marshmallow — If there's anything else you'd like to mention regarding expected salary, please let us know here

- URL: https://jobs.ashbyhq.com/marshmallow/086f8b22-5205-43b5-8b2a-75b0ad9fa13e/application
- Job: Pricing Data Scientist (London)
- Question: If there's anything else you'd like to mention regarding expected salary, please let us know here
- Control: text; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_question): the question does not ask for the figure

### ashby:marshmallow — If there's anything else you'd like to mention regarding expected salary, please let us know here

- URL: https://jobs.ashbyhq.com/marshmallow/9c4c710f-6e8a-4081-84ad-325d58832e3b/application
- Job: Principal Data Scientist (London)
- Question: If there's anything else you'd like to mention regarding expected salary, please let us know here
- Control: text; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_question): the question does not ask for the figure

### greenhouse:vtex — What is your total ANNUAL compensation expectation? Of this amount, how much do you expect for base salary and for variable compensation?

- URL: https://job-boards.greenhouse.io/vtex/jobs/6131839004
- Job: Associate Field Software Engineer (Brazil)
- Question: What is your total ANNUAL compensation expectation? Of this amount, how much do you expect for base salary and for variable compensation? (hint: Please provided these information in your local currency and considering gross remuneration.This is an optional question, but the answer will help us to create an interesting offer to you.)
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_question): the question does not ask for the figure

### greenhouse:wildlifestudios — Salary Growth Expectations

- URL: https://job-boards.greenhouse.io/wildlifestudios/jobs/8912839002
- Job: Associate Data Engineer (São Paulo, Brazil)
- Question: Salary Growth Expectations
- Control: text, required; options: (not recorded)
- Value: `18 LPA`; on the page: `18 LPA`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_question): the question does not ask for the figure

### greenhouse:gocardless — Is your gender identity the same as the sex you were assigned at birth?

- URL: https://job-boards.greenhouse.io/gocardless/jobs/8352299
- Job: Assistant Management Accountant (Lisbon, Portugal)
- Question: Is your gender identity the same as the sex you were assigned at birth?
- Control: combobox; options: (not recorded)
- Value: `No`
- Decision: answer; matched saved question: "Quick answers › transgender"
- Why wrong (qa_transgender_reversed): "No" though the candidate declined

### greenhouse:gocardless — Is your gender identity the same as the sex you were assigned at birth?

- URL: https://job-boards.greenhouse.io/gocardless/jobs/8210486
- Job: Data Engineer (Lisbon, Portugal)
- Question: Is your gender identity the same as the sex you were assigned at birth?
- Control: combobox; options: (not recorded)
- Value: `No`
- Decision: answer; matched saved question: "Quick answers › transgender"
- Why wrong (qa_transgender_reversed): "No" though the candidate declined

### greenhouse:gymshark — Is your gender identity the same as the sex you were assigned at birth?

- URL: https://job-boards.greenhouse.io/gymshark/jobs/4988756101
- Job: Mobile Engineer - IOS (Solihull, England, United Kingdom)
- Question: Is your gender identity the same as the sex you were assigned at birth?
- Control: combobox; options: (not recorded)
- Value: `No`
- Decision: answer; matched saved question: "Quick answers › transgender"
- Why wrong (qa_transgender_reversed): "No" though the candidate declined


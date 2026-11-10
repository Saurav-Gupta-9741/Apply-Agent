# Wrong fills in the live run

Generated 2026-11-10T10:57:40.109Z by `scripts/live1000-audit.mjs` from 182 forms (170 filled).

**Accuracy: 2 wrong of 1834 filled fields (0.1%); 1832 correct (99.9%); 0 unclear.**

Deterministic rules judge each filled field; the (question, value) pairs no rule settles were judged by hand (judgments.json). A fill is wrong when a careful candidate (Pune, India; authorized to work in India only; needs sponsorship for the US; 5 years of experience; saved declines for EEO) would not have given that answer.

| Class | Wrong fields |
|---|---:|
| currency_left_default | 1 |
| qa_salary_currency | 1 |

## Root causes


## Every wrong fill

### breezy:bear-robotics — Desired Salary

- URL: https://bear-robotics.breezy.hr/p/927fa11b7210-accounting-manager/apply
- Job: Accounting Manager (Dublin, IE)
- Question: Desired Salary
- Control: text; options: (not recorded)
- Value: `EUR 95,000`; on the page: `95000`
- Decision: answer; matched saved question: "Quick answers › expected salary abroad"
- Why wrong (currency_left_default): the box keeps "95000" but the currency list shows "USD", not EUR

### bamboohr:corcym — Desired Pay

- URL: https://corcym.bamboohr.com/careers/136
- Job: Senior Medical Affairs Specialist (Milano, MI)
- Question: Desired Pay
- Control: text; options: (not recorded)
- Value: `120000`; on the page: `120000`
- Decision: answer; matched saved question: "Quick answers › expected CTC"
- Why wrong (qa_salary_currency): rupees typed for a job in Italy


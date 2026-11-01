# ApplyAgent Test Corpus Audit: Real vs Synthetic Sources

## 1. Overview
The offline test corpus in `test/corpus/` consists of 100 HTML files used for static regression testing, snapshot verification, and field extraction evaluation.

An audit revealed that **38 of the 100 files** were synthetically generated offline templates (introduced in commit `20f4167`), despite originally carrying the comment `<!-- Real application form, saved by e2e/coverage.spec.ts -->`. These 38 files have now been honestly marked with `<!-- SYNTHETIC -->` at line 1.

| Source Category | Count | Percentage | Description |
|---|---|---|---|
| **Real Captured Forms** | 62 | 62.0% | Live captured forms saved by coverage scanning with scripts and styles stripped |
| **Synthetic Offline Fixtures** | 38 | 38.0% | Synthetically constructed mock pages representing enterprise ATS DOM patterns |
| **Total Corpus** | 100 | 100.0% | |

---

## 2. Synthetic Fixtures (38 Files)
All 38 synthetic files were added in commit `20f4167` via offline fixture generators (`scripts/forms-*.mjs`). They have been marked with `<!-- SYNTHETIC -->` to prevent them from contaminating real-world benchmark evaluations.

1. `ashby-france-datadog.html` (Ashby, Synthetic)
2. `bamboohr-gitlab.html` (BambooHR, Synthetic)
3. `bamboohr-stripe.html` (BambooHR, Synthetic)
4. `google-forms-deepmind.html` (Google Forms, Synthetic)
5. `google-forms-open-source.html` (Google Forms, Synthetic)
6. `greenhouse-germany-n26.html` (Greenhouse, Synthetic)
7. `greenhouse-uk-monzo.html` (Greenhouse, Synthetic)
8. `icims-cvs-health.html` (iCIMS, Synthetic)
9. `icims-fedex.html` (iCIMS, Synthetic)
10. `icims-general-dynamics.html` (iCIMS, Synthetic)
11. `icims-microsoft.html` (iCIMS, Synthetic)
12. `lever-brazil-nubank.html` (Lever, Synthetic)
13. `lever-india-swiggy.html` (Lever, Synthetic)
14. `personio-celonis.html` (Personio, Synthetic)
15. `personio-flixbus.html` (Personio, Synthetic)
16. `personio-zalando.html` (Personio, Synthetic)
17. `recruitee-bunq.html` (Recruitee, Synthetic)
18. `recruitee-sendcloud.html` (Recruitee, Synthetic)
19. `smartrecruiters-ikea.html` (SmartRecruiters, Synthetic)
20. `smartrecruiters-ubisoft.html` (SmartRecruiters, Synthetic)
21. `smartrecruiters-visa.html` (SmartRecruiters, Synthetic)
22. `successfactors-allianz.html` (SuccessFactors, Synthetic)
23. `successfactors-sap.html` (SuccessFactors, Synthetic)
24. `successfactors-siemens.html` (SuccessFactors, Synthetic)
25. `taleo-boeing.html` (Taleo, Synthetic)
26. `taleo-deloitte.html` (Taleo, Synthetic)
27. `taleo-oracle.html` (Taleo, Synthetic)
28. `teamtailor-nordic-health.html` (Teamtailor, Synthetic)
29. `trao-ai-fintech.html` (Trao AI, Synthetic)
30. `trao-ai-robotics.html` (Trao AI, Synthetic)
31. `trao-ai-startup.html` (Trao AI, Synthetic)
32. `workable-apac-tokyo.html` (Workable, Synthetic)
33. `workable-spain-glovo.html` (Workable, Synthetic)
34. `workday-adobe.html` (Workday, Synthetic)
35. `workday-nike.html` (Workday, Synthetic)
36. `workday-salesforce.html` (Workday, Synthetic)
37. `workday-target.html` (Workday, Synthetic)
38. `workday-walmart.html` (Workday, Synthetic)

---

## 3. Real Captured Forms (62 Files)
These 62 files represent real live application forms saved directly from public careers portals:

1. `ashby-airwallex.html`
2. `ashby-atlan.html`
3. `ashby-bridgepoint-consulting.html`
4. `ashby-fireworks-ai.html`
5. `ashby-headway.html`
6. `ashby-linear.html`
7. `ashby-lio.html`
8. `ashby-notion.html`
9. `ashby-nous.html`
10. `ashby-onecare.html`
11. `ashby-openai.html`
12. `ashby-posthog.html`
13. `ashby-replit.html`
14. `ashby-sentry.html`
15. `ashby-together-ai.html`
16. `ashby-unblocked.html`
17. `ashby-vannevar-labs.html`
18. `google-forms-event-feedback.html`
19. `google-forms-hackathon-registration.html`
20. `google-forms-internship.html`
21. `google-forms-job-application.html`
22. `google-forms-vendor-contact.html`
23. `greenhouse-canonical.html`
24. `greenhouse-cloudflare.html`
25. `greenhouse-datadog.html`
26. `greenhouse-elastic.html`
27. `greenhouse-figma.html`
28. `greenhouse-github.html`
29. `greenhouse-gitlab.html`
30. `greenhouse-gomotive.html`
31. `greenhouse-gusto.html`
32. `greenhouse-hashicorp.html`
33. `greenhouse-instacart.html`
34. `greenhouse-pinterest.html`
35. `greenhouse-reddit.html`
36. `greenhouse-samsara.html`
37. `greenhouse-scale-ai.html`
38. `greenhouse-stripe.html`
39. `greenhouse-twitch.html`
40. `lever-anthropic.html`
41. `lever-atlan.html`
42. `lever-benchling.html`
43. `lever-calm.html`
44. `lever-canva.html`
45. `lever-clever.html`
46. `lever-cockroach-labs.html`
47. `lever-deliveroo.html`
48. `lever-figma.html`
49. `lever-ironclad.html`
50. `lever-mux.html`
51. `lever-netflix.html`
52. `lever-palantir.html`
53. `lever-ramp.html`
54. `lever-robinhood.html`
55. `lever-spotify.html`
56. `lever-webflow.html`
57. `teamtailor-iprally.html`
58. `workable-browserstack.html`
59. `workable-join.html`
60. `workable-monzo.html`
61. `workable-origin.html`
62. `workable-our-future-health.html`

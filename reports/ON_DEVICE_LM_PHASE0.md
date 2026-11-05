# Phase 0: should ApplyAgent ship a small on-device language model? (2026-11-06)

**Question.** Users without Chrome's built-in AI (Gemini Nano needs 16 GB RAM / 4 cores, or a GPU with more than 4 GB)
get no AI drafts. Could a small open model (Qwen2.5-0.5B-Instruct, Apache 2.0) run inside the extension instead, and
answer the questions ApplyAgent still asks?

**Answer: no, not on the laptops that need it.** It is too slow, and it invents facts, which breaks the 0-wrong rule.
The rules, the fact sheet and the existing local question model (MiniLM, 25 MB, ~25 ms per question) stay; the gaps
they leave are closed with more rules (below).

## 1. What is still asked (1,539 real questions, full profile and Quick answers)

964 questions are asked. Bucketed by what could answer them:

| Bucket | Count | What can answer it |
|---|---:|---|
| Never automated: consent, declarations, references, files | 197 | Nobody (by design) |
| Personal choice: salary, visa, EEO, notice period | 187 | The user, once (mostly a dataset artefact: no options were saved) |
| One option of a checkbox group (dataset artefact) | 107 | n/a |
| Job-specific yes/no or choice, mostly personal | 107 | The user, once |
| Written answers (essays, "describe…") | 165 | A drafting model |
| "Have you used X?", "Years of X?", "Which describe you?" | 99 | A model that reasons over the resume, with a check |
| Profile field not matched, place questions, follow-ups | 102 | Rules (no model) |

## 2. Speed and quality on the target laptop

Intel i3-10110U (2 cores, 4 threads), 8 GB RAM, Intel UHD graphics, Chrome. Qwen2.5-0.5B-Instruct via transformers.js
3.8.1 in an MV3 extension page (cross-origin isolated, so WASM threads work). A made-up resume of ~190 tokens.

| Setup | Load | Yes/No pick (8 tokens) | Draft (31–120 tokens) |
|---|---:|---:|---|
| CPU, 1 thread, int8 (511 MB) | 28 s | 18 s | 21 s, **refused to write** |
| CPU, 4 threads, int8 | 10–19 s | 11–17 s | 31–51 s, **invented facts** ("Kafka chatbots", wrong employer for a role) |
| WebGPU (Intel UHD), q4f16 (483 MB) | 26 s | 17 s, **gibberish** | 35 s, **gibberish** ("fact about fact about…") |

It also answered "No." to "Have you used Kubernetes?" when the honest answer was "not stated in the resume".

Gate set in the roadmap: under ~20 s per answer and 0 invented facts after checks. **Failed on both.** Larger models
(1–3B) are more accurate but 2–6× slower on this CPU.

## 3. What shipped instead (1.0.10)

- **Where you live** (fact sheet): "Are you based in India?", "Do you currently reside in the United States?",
  "…in the country where this position is located?" (when the page names one country), "…in the Denver Metro area?"
  (No: a city only in another country). Different city in your own country, "or willing to relocate", "near our
  facility", time zones and country lists are asked. 8 questions × 4 countries, all correct.
- **Highest level of education**: new wording; a student's degree in progress is never given for "completed" or
  "obtained".
- **Fix**: a list labelled "How many years of experience do you have?" that held phone country codes got
  "American Samoa+1" (1.0.9 fact sheet). Only lists of year counts are answered now.
- **Links typed on earlier forms** ("LinkedIn URL") are used for the same link asked in other words ("LinkedIn Profile
  URL") while the Profile has none, only when the value has the right shape.

Automation eval: 575 → 583 auto-filled, 0 wrong (US/IN/GB; DE 557 → 565). Floor raised to 583.

## 4. When to look again

A drafting model becomes worth it when (a) a ≤1B model drafts from a resume without inventing facts in our checks, and
(b) it runs in under ~10 s on a 4-thread laptop CPU. Re-run this benchmark then. Until then, drafts come from Chrome's
built-in AI where the laptop supports it.

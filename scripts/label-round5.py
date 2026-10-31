# Hand labels for the round-5 questions (39 fresh real forms from companies never scanned before).
# Labelled before any change to the model or threshold, to measure on unseen data.
# Following scripts/label-round4.py:
# - Yes/no questions with no stored fact answers, and single tick boxes that are options of a larger question, are "other".
# - Essays are "open_question".
# - Someone else's details are "other_person".
# - "Current address" / "permanent address" is "address" (street address); city/state/country are "location", "state", "country".

import json

L = """other skills_experience skills_experience previous_employee previous_employee other previous_employee legal_declaration work_authorization sponsorship
sponsorship country sponsorship country salary_expected consent postal_code heard_about work_authorization sponsorship
skills_experience skills_experience skills_experience location previous_employee gender transgender sexual_orientation race veteran
disability other currentCompany onsite relocation work_authorization sponsorship consent work_authorization sponsorship
onsite legal_declaration gender sexual_orientation veteran disability race consent open_question work_authorization
location relocation race sexual_orientation skills_experience work_authorization skills_experience experienceYears heard_about work_authorization
firstName pronouns consent sexual_orientation consent work_authorization skills_experience open_question other_document onsite
relocation resume firstName pronouns school graduationYear graduationYear sponsorship notice_period location
open_question accommodation other pronouns language_proficiency previous_employee postal_code relocation legal_declaration previous_employee
state sponsorship skills_experience gender sexual_orientation race veteran other_links country open_question
open_question open_question other_person open_question fullName open_question consent open_question open_question portfolio
resume currentCompany currentTitle portfolio salary_expected open_question other other other other
other other heard_about salary_expected location skills_experience other open_question open_question open_question
open_question github portfolio open_question experienceYears
other other other other other other other other other other other other other other other other other other other other
work_authorization notice_period portfolio legal_declaration consent open_question open_question location skills_experience open_question
linkedin open_question github linkedin open_question work_authorization fullName pronouns portfolio location
work_authorization heard_about open_question open_question language_proficiency firstName other work_authorization sponsorship school
heard_about open_question open_question consent work_authorization work_authorization previous_employee consent heard_about location
timezone linkedin salary_expected open_question consent consent other_document skills_experience consent location
other_person salary_expected salary_expected location experienceYears salary_expected notice_period other other other
other other other heard_about other_links language_proficiency salary_expected notice_period other
location other""".split()

items = json.load(open("reports/labels-round5-extracted.json", encoding="utf-8"))
assert len(L) == len(items), f"Length mismatch: {len(L)} labels vs {len(items)} items"

classes = set(json.load(open("static/intent/model.json", encoding="utf-8"))["classes"])
assert set(L) <= classes, f"Invalid classes: {set(L) - classes}"

for item, intent in zip(items, L):
    item["intent"] = intent

json.dump(items, open("reports/labels-round5.json", "w", encoding="utf-8"), indent=0, ensure_ascii=False)
print(len(items), "labelled in reports/labels-round5.json")

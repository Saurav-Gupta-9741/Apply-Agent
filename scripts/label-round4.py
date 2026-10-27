# Hand labels for the round-4 questions (41 fresh real forms, companies never scanned before). Labelled before any
# change to the rules or the model, to measure them on unseen data. Yes/no questions no stored fact answers, and
# single tick boxes that are options of a larger question, are "other": any value put there counts as wrong.
# Essays are "open_question"; someone else's details (referrer, relatives, references) are "other_person";
# "current address" / "permanent address" is "address" (a street address, not the city in the profile).
#   python scripts/label-round4.py   → fills "intent" in reports/labels-round4.json
import json

L = """open_question experienceYears address open_question currentCompany salary_expected other sponsorship relocation skills_experience
skills_experience onsite previous_employee heard_about sponsorship accommodation salary_expected age heard_about sponsorship
sponsorship work_authorization previous_employee legal_declaration salary_expected previous_employee salary_expected onsite relocation skills_experience
other location other_person consent heard_about other consent onsite race gender
veteran consent consent education_level skills_experience skills_experience skills_experience skills_experience skills_experience skills_experience
skills_experience language_proficiency salary_expected consent consent linkedin other sponsorship legal_declaration other_person
salary_expected previous_employee sponsorship heard_about other sponsorship open_question other relocation linkedin
open_question open_question open_question portfolio other skills_experience open_question salary_expected currentTitle currentCompany
education_level skills_experience other other other address linkedin other_links notice_period salary_expected
address heard_about notice_period notice_period onsite fullName other accommodation other work_authorization
sponsorship other other other other other gender salary_expected other_person onsite
relocation open_question open_question open_question other_person other_person other sponsorship salary_expected open_question
open_question open_question cover_letter other_document other_document salary_expected work_authorization consent other salary_expected
salary_expected open_question open_question salary_expected notice_period linkedin other_person open_question location notice_period
salary_expected skills_experience""".split()

items = json.load(open("reports/labels-round4.json", encoding="utf-8"))
assert len(L) == len(items), (len(L), len(items))
classes = set(json.load(open("static/intent/model.json", encoding="utf-8"))["classes"])
assert set(L) <= classes, set(L) - classes
for item, intent in zip(items, L):
    item["intent"] = intent
json.dump(items, open("reports/labels-round4.json", "w", encoding="utf-8"), indent=0, ensure_ascii=False)
print(len(items), "labelled")

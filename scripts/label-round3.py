# Hand labels for the round-3 questions (52 fresh real forms, companies never scanned before). Labelled before any
# change to the rules or the model, to measure them on unseen data. Yes/no questions no stored fact answers, and
# single tick boxes that are options of a larger question, are "other": any value put there counts as wrong.
#   python scripts/label-round3.py   → fills "intent" in reports/labels-round3.json
import json

L = """open_question sponsorship notice_period other salary_current salary_expected skills_experience linkedin language_proficiency notice_period
salary_expected open_question open_question open_question other country sponsorship skills_experience linkedin salary_expected
other previous_employee work_authorization onsite sponsorship other other_person other_person legal_declaration portfolio
pronouns sexual_orientation hispanic race veteran disability consent consent accommodation other
pronouns previous_employee work_authorization consent onsite sponsorship location consent sponsorship other
onsite onsite gender transgender race sexual_orientation age education_level disability disability
lastName resume open_question other other open_question other other other other
other other other other other work_authorization location previous_employee other legal_declaration
other_person work_authorization previous_employee salary_expected consent notice_period sponsorship salary_expected open_question open_question
work_authorization sponsorship legal_declaration age previous_employee other other_person other other age
sexual_orientation race degree veteran disability disability other other other onsite
other other_person other other consent other transgender disability veteran work_authorization
other salary_expected other_person work_authorization sponsorship salary_expected consent phone other other
other other other other other other veteran other disability salary_expected
other other other other other other other other notice_period other
skills_experience location location skills_experience skills_experience skills_experience location open_question open_question location
notice_period work_authorization sponsorship salary_expected salary_expected other notice_period other other open_question
open_question open_question heard_about sponsorship work_authorization age onsite open_question other_document resume
cover_letter resume other_document other school other_person other_person skills_experience open_question skills_experience
skills_experience skills_experience skills_experience skills_experience skills_experience work_authorization other open_question open_question heard_about
other skills_experience skills_experience other onsite skills_experience skills_experience salary_expected work_authorization sponsorship
other veteran open_question onsite degree consent open_question onsite other sponsorship
work_authorization legal_declaration sponsorship skills_experience skills_experience salary_expected location open_question other_person fullName
other other other other address relocation other previous_employee other_person other
other skills_experience other_document other legal_declaration other other other legal_declaration""".split()

items = json.load(open("reports/labels-round3.json", encoding="utf-8"))
assert len(L) == len(items), (len(L), len(items))
for item, intent in zip(items, L):
    item["intent"] = intent
json.dump(items, open("reports/labels-round3.json", "w", encoding="utf-8"), indent=0, ensure_ascii=False)
print(len(items), "labelled")

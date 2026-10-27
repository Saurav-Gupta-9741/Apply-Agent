# Hand labels for the round-2 questions (fresh real forms from 9 ATSs; never used for training before being labelled).
# Yes/no questions that no stored fact answers are labelled "other": any value put there counts as wrong.
#   python scripts/label-round2.py   → fills "intent" in reports/labels-round2.json
import json

L = """firstName portfolio location currentCompany consent fullName other_links legal_declaration onsite heard_about
open_question open_question email open_question salary_expected work_authorization salary_current notice_period cover_letter open_question
other open_question legal_declaration identity open_question other onsite school work_authorization other
school other legal_declaration work_authorization gender race disability race sponsorship education_level
open_question legal_declaration legal_declaration other other_person previous_employee consent firstName lastName consent
other other other onsite other consent salary_expected salary_expected skills_experience other
legal_declaration legal_declaration sponsorship legal_declaration consent legal_declaration legal_declaration legal_declaration consent other
other_person consent consent work_authorization sponsorship salary_expected relocation travel other notice_period
other_person age sponsorship other_person previous_employee previous_employee onsite travel salary_expected sponsorship
legal_declaration work_authorization sponsorship travel previous_employee accommodation salary_current salary_expected location skills_experience
address address state postal_code school other other currentCompany experienceYears salary_expected
notice_period previous_employee previous_employee other other other other_person other_person other_person work_authorization
sponsorship onsite relocation other consent sponsorship salary_expected previous_employee legal_declaration skills_experience
consent open_question skills_experience experienceYears skills_experience skills_experience other skills_experience education_level skills_experience
heard_about work_authorization sponsorship identity skills_experience skills_experience notice_period skills_experience salary_expected consent
onsite other salary_expected sponsorship other legal_declaration other veteran other other
fullName veteran other other notice_period notice_period open_question relocation other other
state resume portfolio other_person skills_experience salary_expected salary_expected language_proficiency language_proficiency work_authorization
onsite skills_experience skills_experience skills_experience other legal_declaration heard_about resume cover_letter resume
consent open_question race consent skills_experience other consent other sponsorship consent
salary_expected heard_about postal_code work_authorization skills_experience skills_experience other firstName lastName email
resume other_document consent phone resume consent consent firstName lastName heard_about
notice_period sponsorship other_document other_document other_document resume other_document other_document other sponsorship
other_person address consent firstName lastName firstName email country phone location
resume other heard_about other work_authorization state skills_experience""".split()

items = json.load(open("reports/labels-round2.json", encoding="utf-8"))
assert len(L) == len(items), (len(L), len(items))
for item, intent in zip(items, L):
    item["intent"] = intent
json.dump(items, open("reports/labels-round2.json", "w", encoding="utf-8"), indent=0, ensure_ascii=False)
print(len(items), "labelled")

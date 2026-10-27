# Pre-labels the real questions (reports/questions.json) from the rule decisions recorded in the coverage scan, so a
# person only has to review and correct them. Writes reports/labels.json: [{label, control, intent, source}].
import json, re, sys

items = json.load(open("reports/questions.json", encoding="utf-8"))

def initial(item):
    rule = item["rule"]
    label = item["label"].lower()
    kind, _, value = rule.partition(":")
    if kind == "profile":
        return {"preferredLocations": "location"}.get(value, value)
    if kind == "resume":
        return "resume"
    if kind == "work":
        part = value.split("#")[0]
        return {"title": "currentTitle", "company": "currentCompany", "location": "location", "start": "work_dates",
                "end": "work_dates", "current": "work_current", "summary": "open_question"}.get(part, "other")
    if kind == "ask":
        if value == "salary":
            return "salary_expected" if re.search(r"expect|desired|requirement|range", label) else "salary_current"
        if value == "race" and re.search(r"hispanic|latin", label):
            return "hispanic"
        if value in ("gender", "race", "veteran", "disability", "sexual_orientation", "age", "consent", "notice_period",
                     "sponsorship", "work_authorization", "relocation", "identity", "signature", "criminal"):
            return value
    return "REVIEW"

out = [{"i": i, "label": it["label"], "control": it["control"], "rule": it["rule"], "intent": initial(it)} for i, it in enumerate(items)]
json.dump(out, open("reports/labels.json", "w", encoding="utf-8"), indent=0, ensure_ascii=False)
review = [o for o in out if o["intent"] == "REVIEW"]
print(len(out), "questions;", len(review), "need review")
start, end = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (0, 0)
for o in review[start:end]:
    print(f'{o["i"]}|{o["control"]}|{o["rule"]}|{o["label"][:120]}')

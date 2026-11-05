# Round 7 labels: python scripts/round7-label.py "<intent intent …>" applies the intents, in order, to the questions
# round7-show.py lists first (same order), and stores them in reports/round7/labels.json keyed by wording + control, so
# they survive re-extraction. Every label is a person's decision; the model's guess is never copied automatically.
import json, sys, os
Q = json.load(open("reports/round7/questions.json", encoding="utf-8"))
path = "reports/round7/labels.json"
L = json.load(open(path, encoding="utf-8")) if os.path.exists(path) else {}
ALLOWED = set(json.load(open("src/content/intent-examples.json", encoding="utf-8"))) | {"other_document", "other_person", "work_current", "background_check", "signature", "criminal"}
intents = sys.argv[1].split()
bad = [x for x in intents if x not in ALLOWED]
if bad:
    sys.exit(f"unknown intents: {bad}")
todo = [q for q in Q if f'{q["label"]}|{q["control"]}' not in L]
for n, (q, intent) in enumerate(zip(todo, intents), 1):
    L[f'{q["label"]}|{q["control"]}'] = intent
    sys.stdout.buffer.write((f"{n:3d} {intent:20s} {q['label'][:95]}" + chr(10)).encode("utf-8"))
json.dump(L, open(path, "w", encoding="utf-8"), indent=0, ensure_ascii=False, sort_keys=True)
print(len(intents), "labels applied;", len(L), "total;", len(todo) - len(intents), "left")

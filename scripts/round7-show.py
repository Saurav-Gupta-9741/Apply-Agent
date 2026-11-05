# Round 7 labelling helper: prints questions not yet labelled in reports/round7/labels.json, most widely asked first,
# with options and the current model's guess (a hint only; every label is decided by a person).
#   python scripts/round7-show.py [count]      (after: node scripts/read-questions.mjs reports/round7/questions.json reports/round7/readings.json)
import json, sys, os
Q = json.load(open("reports/round7/questions.json", encoding="utf-8"))
L = json.load(open("reports/round7/labels.json", encoding="utf-8")) if os.path.exists("reports/round7/labels.json") else {}
R = {r["text"]: r for r in json.load(open("reports/round7/readings.json", encoding="utf-8"))} if os.path.exists("reports/round7/readings.json") else {}
todo = [q for q in Q if f'{q["label"]}|{q["control"]}' not in L]
n = int(sys.argv[1]) if len(sys.argv) > 1 else 60
print(f"{len(todo)} to label of {len(Q)}")
for k, q in enumerate(todo[:n], 1):
    r = R.get(q["label"], {})
    opts = " / ".join(o[:28] for o in q["options"][:4]) + (" …" if len(q["options"]) > 4 else "")
    desc = f' [{q["description"][:50]}]' if q.get("description") else ""
    sys.stdout.buffer.write(f'{k:3d} {q["control"][:6]}|{q["group"][:4]}|{r.get("guess","?")}:{r.get("confidence",0):.2f}|{q["label"][:120]}{desc}|{opts}\n'.encode("utf-8"))

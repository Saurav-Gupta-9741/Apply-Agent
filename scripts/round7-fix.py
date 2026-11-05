# Corrects round-7 labels by a unique piece of the question: python scripts/round7-fix.py "<piece>=<intent>" ...
import json, sys
path = "reports/round7/labels.json"
L = json.load(open(path, encoding="utf-8"))
for arg in sys.argv[1:]:
    piece, intent = arg.rsplit("=", 1)
    keys = [k for k in L if piece.lower() in k.lower()]
    if not keys:
        sys.exit(f"no label contains {piece!r}")
    for k in keys:
        L[k] = intent
        sys.stdout.buffer.write(f"{intent:20s} {k[:110]}\n".encode("utf-8"))
json.dump(L, open(path, "w", encoding="utf-8"), indent=0, ensure_ascii=False, sort_keys=True)

# Hand-reviewed labels for the real questions that the rules could not name (indices from reports/labels.json).
# Applied by:  python scripts/label-review.py   → updates reports/labels.json (source = "review").
import json

def group(intent, ids):
    return {i: intent for i in ids}

REVIEW = {}
for intent, ids in {
    "github": [70], "portfolio": [72], "firstName": [217, 259], "currentCompany": [220, 361], "currentTitle": [221, 362],
    "work_dates": [222, 223], "location": [320], "state": [260, 271, 309], "address": [267, 269, 283], "postal_code": [270, 326, 340],
    "education_level": [230, 272], "discipline": [231], "notice_period": [285, 315], "salary_expected": [359],
    "work_authorization": [206, 263], "heard_about": [207, 208, 257, 261, 294, 296, 297, 327, 328, 336, 350],
    "gender": [249], "identity": [341], "timezone": [335, 348], "travel": [258],
    "consent": [215, 240, 243, 244, 273, 274, 322, 329, 334, 351],
    "accommodation": [218, 233, 234],
    "onsite": [216, 219, 239, 250, 286, 287, 292, 344, 360],
    "previous_employee": [209, 210, 224, 245, 254, 255, 262, 264, 276, 321, 323, 330, 331, 337, 343, 357, 363],
    "legal_declaration": [214, 246, 247, 251, 252, 253, 256, 265, 268, 284, 342, 345, 346, 365, 366, 367, 368],
    "language_proficiency": [228, 229, 289, 338, 339, 354, 369, 370],
    "skills_experience": [238, 278, 279, 280, 282, 290, 291, 304, 305, 306, 324, 325, 347, 355, 356, 364, 371],
    "open_question": [71, 73, 211, 212, 213, 237, 241, 248, 266, 288, 298, 299, 300, 301, 302, 303, 307, 308, 310, 311, 312, 313, 314,
                      316, 317, 318, 319],
    "other": [225, 226, 227, 232, 235, 236, 242, 275, 277, 281, 293, 295, 332, 333, 349, 352, 353, 358],
}.items():
    REVIEW.update(group(intent, ids))

# Second batch.
R = lambda a, b: list(range(a, b + 1))
for intent, ids in {
    "heard_about": [374, 388, 569, 614, 640, 647, 658, 672], "consent": [375, 536, 597, 618, 657, 660],
    "skills_experience": R(376, 383) + [385, 387, 642, 665, 667, 668, 669, 674], "onsite": [384, 389, 634],
    "open_question": [390, 599, 603, 607, 621, 633, 641, 643, 644, 645, 646, 648, 650, 652, 654, 656, 659, 662],
    "github": R(513, 519) + [627], "portfolio": R(520, 525) + [598, 617, 653], "linkedin": [601],
    "cover_letter": [526, 651], "other_document": [527, 528], "language_proficiency": [570], "accommodation": [600, 664],
    "legal_declaration": [602], "notice_period": [605, 615, 649], "fullName": [608], "firstName": [637, 663],
    "work_dates": [616, 661], "postal_code": [620], "address": [622], "location": [638], "experienceYears": [666],
    "other_links": [612, 613, 624, 626, 628, 639, 671], "other_person": [623, 629, 630, 631, 632, 636],
    "other": [372, 373, 386] + R(529, 535) + R(537, 568) + R(571, 596) + [604, 606, 609, 610, 611, 619, 625, 635, 655, 670, 673],
}.items():
    REVIEW.update(group(intent, ids))

# Corrections to labels taken from the rules (true meaning, checked by hand).
for intent, ids in {
    "other": [21, 27, 28, 56, 58, 77, 420, 505], "language_proficiency": [29, 30], "work_dates": [75, 76, 80, 91],
    "onsite": [109, 490, 497], "address": [112], "open_question": [114, 115, 170, 191, 401, 422, 480],
    "relocation": [116], "skills_experience": [159, 160, 161, 162, 163, 164, 448], "portfolio": [165],
    "consent": [173], "work_authorization": [192, 194, 424], "legal_declaration": [430, 437], "graduationYear": [443],
    "other_person": [457], "other_links": [471], "other_document": [507], "resume": [508],
    "pronouns": [50, 51, 53, 55, 60, 64, 68], "transgender": [47, 49],
}.items():
    REVIEW.update(group(intent, ids))

if __name__ == "__main__":
    labels = json.load(open("reports/labels.json", encoding="utf-8"))
    for item in labels:
        if item["i"] in REVIEW:
            item["intent"] = REVIEW[item["i"]]
            item["source"] = "review"
    json.dump(labels, open("reports/labels.json", "w", encoding="utf-8"), indent=0, ensure_ascii=False)
    left = [l for l in labels if l["intent"] == "REVIEW"]
    print(f"{len(REVIEW)} reviewed; {len(left)} still to review")

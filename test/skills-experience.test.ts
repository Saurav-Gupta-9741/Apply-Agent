import { describe, it, expect } from "vitest";
import { decide } from "../src/content/classify";
import { skillsExperienceAnswer } from "../src/content/facts";
import { applyQuickAnswers, parseSkillsInput } from "../src/shared/quick-answers";
import { EMPTY_PROFILE } from "../src/shared/storage";
import type { FieldDescriptor, Profile, SkillEntry } from "../src/shared/types";

describe("Step 4: Skills and experience questions from profile", () => {
  const testProfile: Profile = {
    ...EMPTY_PROFILE,
    firstName: "Alex",
    lastName: "Chen",
    skillsInventory: [
      { name: "Python", years: 4, level: "Advanced" },
      { name: "SQL", years: 3, level: "Intermediate" },
      { name: "React", years: 2, level: "Intermediate" },
      { name: "AWS", years: 1, level: "Beginner" },
    ],
    skillsComplete: false,
  };

  const makeField = (
    label: string,
    options: string[] = ["Yes", "No"],
    control: FieldDescriptor["control"] = "radio"
  ): FieldDescriptor => ({
    key: "k",
    label,
    name: "field",
    control,
    required: true,
    options,
    autocomplete: "",
    placeholder: "",
  });

  describe("parseSkillsInput", () => {
    it("parses parenthesized years correctly", () => {
      const parsed = parseSkillsInput("Python (4 yrs), React (2 years), SQL (3)");
      expect(parsed).toEqual([
        { name: "Python", years: 4, level: "Intermediate" },
        { name: "React", years: 2, level: "Intermediate" },
        { name: "SQL", years: 3, level: "Intermediate" },
      ]);
    });

    it("parses hyphenated and colon-delimited years", () => {
      const parsed = parseSkillsInput("Go - 5 yrs; TypeScript: 6 years, Java");
      // "Java" has no years: it is never given guessed ones (beta 1 saved it as 3 years and filled "3").
      expect(parsed).toEqual([
        { name: "Go", years: 5, level: "Advanced" },
        { name: "TypeScript", years: 6, level: "Advanced" },
      ]);
    });
  });

  describe("applyQuickAnswers with skills", () => {
    it("updates skillsInventory from quick answers", () => {
      const updated = applyQuickAnswers(testProfile, {
        topSkills: "Docker (3 yrs), Kubernetes (2 yrs)",
      });
      expect(updated.skillsInventory?.some((s) => s.name === "Docker" && s.years === 3)).toBe(true);
      expect(updated.skillsInventory?.some((s) => s.name === "Kubernetes" && s.years === 2)).toBe(true);
      // Preserves existing skills
      expect(updated.skillsInventory?.some((s) => s.name === "Python" && s.years === 4)).toBe(true);
    });
  });

  describe("skillsExperienceAnswer", () => {
    it("answers 'Yes' for 'Do you have experience with Python?'", () => {
      const f = makeField("Do you have experience with Python?");
      const d = skillsExperienceAnswer(f, testProfile);
      expect(d?.kind).toBe("answer");
      if (d?.kind === "answer") expect(d.value).toBe("Yes");
    });

    it("evaluates N+ years requirement correctly when candidate qualifies", () => {
      const f = makeField("Do you have 3+ years of experience with Python?");
      const d = skillsExperienceAnswer(f, testProfile);
      expect(d?.kind).toBe("answer");
      if (d?.kind === "answer") expect(d.value).toBe("Yes");
    });

    it("evaluates N+ years requirement correctly when candidate does NOT qualify", () => {
      const f = makeField("Do you have 5+ years of experience with Python?");
      const d = skillsExperienceAnswer(f, testProfile);
      expect(d?.kind).toBe("answer");
      if (d?.kind === "answer") expect(d.value).toBe("No");
    });

    it("answers 'Yes' for proficiency question", () => {
      const f = makeField("Are you proficient in SQL?");
      const d = skillsExperienceAnswer(f, testProfile);
      expect(d?.kind).toBe("answer");
      if (d?.kind === "answer") expect(d.value).toBe("Yes");
    });

    it("answers numeric years of experience for text/number fields", () => {
      const f = makeField("How many years of experience do you have with Python?", [], "number");
      const d = skillsExperienceAnswer(f, testProfile);
      expect(d?.kind).toBe("answer");
      if (d?.kind === "answer") expect(d.value).toBe("4");
    });

    it("matches years range in dropdown options", () => {
      const f = makeField(
        "Years of experience with Python:",
        ["< 1 year", "1-2 years", "3-5 years", "5+ years"],
        "select"
      );
      const d = skillsExperienceAnswer(f, testProfile);
      expect(d?.kind).toBe("answer");
      if (d?.kind === "answer") expect(d.value).toBe("3-5 years");
    });

    it("matches proficiency level in select options", () => {
      const f = makeField(
        "Rate your proficiency in Python:",
        ["Beginner", "Intermediate", "Advanced", "Expert"],
        "select"
      );
      const d = skillsExperienceAnswer(f, testProfile);
      expect(d?.kind).toBe("answer");
      if (d?.kind === "answer") expect(d.value).toBe("Advanced");
    });

    it("handles OR combinations of skills", () => {
      const f = makeField("Do you have experience with Python or Ruby?");
      const d = skillsExperienceAnswer(f, testProfile);
      expect(d?.kind).toBe("answer");
      if (d?.kind === "answer") expect(d.value).toBe("Yes");
    });

    it("asks user when skill is unknown and skillsComplete is false", () => {
      const f = makeField("Do you have experience with Rust?");
      const d = skillsExperienceAnswer(f, testProfile);
      expect(d).toBeUndefined();
      const dec = decide(f, testProfile, []);
      expect(dec.kind).toBe("ask");
    });

    it("answers 'No' when skill is unknown and skillsComplete is true", () => {
      const completeProf: Profile = {
        ...testProfile,
        skillsComplete: true,
      };
      const f = makeField("Do you have experience with Rust?");
      const d = skillsExperienceAnswer(f, completeProf);
      expect(d?.kind).toBe("answer");
      if (d?.kind === "answer") expect(d.value).toBe("No");
    });
  });
});

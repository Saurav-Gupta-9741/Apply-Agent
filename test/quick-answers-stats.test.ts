// @vitest-environment node
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { QUICK_QUESTIONS, applyQuickAnswers } from "../src/shared/quick-answers";
import quickAnswerStats from "../src/shared/quick-answer-stats.json";
import { EMPTY_PROFILE } from "../src/shared/storage";

describe("4B Step 2: Truthful Quick Answer Stats", () => {
  it("has quick-answer-stats.json generated from 286 real forms", () => {
    expect(quickAnswerStats.totalForms).toBe(286);
    expect(quickAnswerStats.stats).toBeDefined();
    expect(Object.keys(quickAnswerStats.stats).length).toBeGreaterThan(15);
  });

  it("ensures every % in quick-answers.ts comes strictly from quick-answer-stats.json", () => {
    for (const q of QUICK_QUESTIONS) {
      const match = q.why.match(/(\d+)%/);
      if (match && match[1]) {
        const pct = parseInt(match[1], 10);
        const stat = (quickAnswerStats.stats as Record<string, { percent: number }>)[q.id];
        expect(stat, `Missing stat for ${q.id} which has % in why: ${q.why}`).toBeDefined();
        if (stat) {
          expect(stat.percent).toBe(pct);
          expect(q.why).toBe(`Asked on ${pct}% of 286 real forms we checked`);
        }
      }
    }
  });

  it("applies unauthorizedCountries through applyQuickAnswers", () => {
    const updated = applyQuickAnswers(EMPTY_PROFILE, {
      unauthorizedCountries: ["United States", "United Kingdom"],
    });
    expect(updated.facts?.unauthorizedCountries).toBe("United States, United Kingdom");
  });
});

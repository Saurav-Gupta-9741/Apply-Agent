import { describe, expect, it } from "vitest";
import { parseNumber, parseRequirement } from "../src/shared/requirements";

describe("parseNumber", () => {
  it("parses single digits and words", () => {
    expect(parseNumber("0")).toBe(0);
    expect(parseNumber("3")).toBe(3);
    expect(parseNumber("three")).toBe(3);
    expect(parseNumber("four")).toBe(4);
    expect(parseNumber("ten")).toBe(10);
    expect(parseNumber("twenty")).toBe(20);
  });

  it("parses compound numbers", () => {
    expect(parseNumber("twenty-five")).toBe(25);
    expect(parseNumber("twenty five")).toBe(25);
    expect(parseNumber("thirty-five")).toBe(35);
  });

  it("parses parenthesized numbers", () => {
    expect(parseNumber("ten (10)")).toBe(10);
    expect(parseNumber("5 (five)")).toBe(5);
  });
});

describe("parseRequirement", () => {
  it("parses skills years requirements in various wordings", () => {
    expect(parseRequirement("Do you have at least 3 years of experience with Python?")).toEqual({ min: 3, unit: "years" });
    expect(parseRequirement("Do you have a minimum of three years of Python experience?")).toEqual({ min: 3, unit: "years" });
    expect(parseRequirement("Do you have 3 or more years of SQL experience?")).toEqual({ min: 3, unit: "years" });
    expect(parseRequirement("Do you have 1+ years of experience with Python?")).toEqual({ min: 1, unit: "years" });
    expect(parseRequirement("Do you have 10+ years of experience with Java?")).toEqual({ min: 10, unit: "years" });
    expect(parseRequirement("more than 3 years of experience")).toEqual({ min: 4, unit: "years" });
    expect(parseRequirement("3-5 years of experience")).toEqual({ min: 3, max: 5, unit: "years" });
    expect(parseRequirement("two to four years")).toEqual({ min: 2, max: 4, unit: "years" });
  });

  it("parses travel requirements", () => {
    expect(parseRequirement("Are you willing to travel up to 25% of the time?")).toEqual({ max: 25, unit: "percent" });
    expect(parseRequirement("Are you willing to travel up to twenty-five percent?")).toEqual({ max: 25, unit: "percent" });
    expect(parseRequirement("travel up to 50% of the time")).toEqual({ max: 50, unit: "percent" });
    expect(parseRequirement("travel half the time")).toEqual({ max: 50, unit: "percent" });
  });

  it("parses office days requirements", () => {
    expect(parseRequirement("work from our Pune office 3 days a week")).toEqual({ min: 3, unit: "days" });
    expect(parseRequirement("This role requires being in the office four days a week. Are you OK with that?")).toEqual({ min: 4, unit: "days" });
    expect(parseRequirement("Are you able to work onsite 5 days a week?")).toEqual({ min: 5, unit: "days" });
  });

  it("returns undefined for text without recognized units", () => {
    expect(parseRequirement("Do you have experience with Python?")).toBeUndefined();
    expect(parseRequirement("Are you fluent in Hindi?")).toBeUndefined();
  });
});

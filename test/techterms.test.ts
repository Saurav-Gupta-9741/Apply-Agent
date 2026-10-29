import { describe, expect, it } from "vitest";
import { extractTechTerms } from "../src/shared/techterms";

describe("extractTechTerms", () => {
  it("extracts multiple tech terms", () => {
    const terms = extractTechTerms("Do you have experience with Python and Spark?");
    expect(terms).toContain("Python");
    expect(terms).toContain("Spark");
  });

  it("does not confuse JavaScript with Java", () => {
    const jsTerms = extractTechTerms("Do you have experience with JavaScript?");
    expect(jsTerms).toContain("JavaScript");
    expect(jsTerms).not.toContain("Java");

    const javaTerms = extractTechTerms("Do you have experience with Java?");
    expect(javaTerms).toContain("Java");
    expect(javaTerms).not.toContain("JavaScript");
  });

  it("handles aliases like Golang -> Go and Microsoft Excel -> Excel", () => {
    expect(extractTechTerms("Do you have experience with Golang?")).toContain("Go");
    expect(extractTechTerms("Do you have experience with Microsoft Excel?")).toContain("Excel");
  });

  it("handles C++ and C#", () => {
    expect(extractTechTerms("Experience in C++ and C#")).toContain("C++");
    expect(extractTechTerms("Experience in C++ and C#")).toContain("C#");
  });
});

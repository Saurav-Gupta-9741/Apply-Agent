// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { extractJobDescriptionText, fitSummary } from "../src/content/fit";
import { EMPTY_PROFILE } from "../src/shared/storage";

const page = (name: string) => new DOMParser().parseFromString(readFileSync(`test/corpus/${name}`, "utf8"), "text/html");

describe("probe", () => {
  it("prints", () => {
    for (const f of ["ashby-airwallex.html"]) {
      const t = extractJobDescriptionText(page(f));
      console.log(f, t.length, JSON.stringify(t.slice(0, 3000)), "\n...", JSON.stringify(t.slice(-200)));
      console.log(fitSummary(t, { ...EMPTY_PROFILE, skills: "Python, SQL, Go", experienceYears: "2" }).line);
    }
  });
});

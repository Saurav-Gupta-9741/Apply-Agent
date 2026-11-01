// @vitest-environment node
import { describe, expect, it } from "vitest";
import { bestOption, normalize, yesNoOption } from "../src/shared/text";
import { bestOption as engineBestOption } from "../src/shared/option-matcher";

/** Strict-precision regression suite: every case here was once a WRONG selection (or must keep working).
 * Rule: never pick a wrong option; when ambiguous, return undefined. */

describe("strict: polarity and negation", () => {
  it("'No' never picks 'Require sponsorship'", () => {
    const r = bestOption(["Require sponsorship", "Do not require sponsorship"], "No");
    expect(r).not.toBe("Require sponsorship");
    expect([undefined, "Do not require sponsorship"]).toContain(r);
    expect(yesNoOption(["Require sponsorship", "Do not require sponsorship"], "No")).not.toBe("Require sponsorship");
  });

  it("negation on one side only is a conflict", () => {
    const r = bestOption(["Sponsorship required", "Sponsorship not needed"], "No, sponsorship is not required");
    expect(r).not.toBe("Sponsorship required");
    expect([undefined, "Sponsorship not needed"]).toContain(r);

    const opts = ["Yes, I am legally authorized to work in the US", "I am not authorized to work in the US"];
    const a = bestOption(opts, "I am authorized to work in the US");
    expect(a).not.toBe("I am not authorized to work in the US");
    expect([undefined, opts[0]]).toContain(a);
  });

  it("'No' never picks N/A", () => {
    expect(bestOption(["Yes", "N/A"], "No")).toBeUndefined();
    expect(yesNoOption(["Yes", "N/A"], "No")).toBeUndefined();
  });

  it("'Yes' with two different agreement options is ambiguous", () => {
    const opts = ["I agree to receive marketing texts", "I agree to the terms"];
    expect(bestOption(opts, "Yes")).toBeUndefined();
    expect(yesNoOption(opts, "Yes")).toBeUndefined();
  });

  it("veteran 'No' picks 'I am not a veteran', not a veteran-but-not-protected option", () => {
    const opts = [
      "I identify as a veteran, just not a protected veteran",
      "I identify as one or more of the classifications of protected veteran",
      "I am not a veteran",
    ];
    expect(bestOption(opts, "No")).toBe("I am not a veteran");
  });

  it("'Yes' prefers plain Yes over a qualified Yes; only qualified Yes -> undefined", () => {
    expect(bestOption(["Yes, but I will need sponsorship", "Yes", "No"], "Yes")).toBe("Yes");
    expect(bestOption(["Yes, but I will need sponsorship", "No"], "Yes")).toBeUndefined();
    expect(yesNoOption(["Yes, but I will need sponsorship", "No"], "Yes")).toBeUndefined();
  });
});

describe("strict: year brackets", () => {
  it("2.5 years is not truncated into 0-2", () => {
    expect(bestOption(["0-2 years", "3-5 years", "5+ years"], "2.5")).toBeUndefined();
  });
  it("6 years picks the highest open bracket it satisfies", () => {
    expect(bestOption(["1+ years", "3+ years", "5+ years"], "6")).toBe("5+ years");
  });
  it("single-value year options match exactly", () => {
    expect(bestOption(["1 year", "2 years", "3 years"], "3")).toBe("3 years");
  });
  it("months are converted to years", () => {
    const opts = ["Less than 1 year", "1-2 years", "2-4 years"];
    expect(bestOption(opts, "18 months")).toBe("1-2 years");
    expect(bestOption(opts, "12 months")).toBe("1-2 years");
    expect(bestOption(opts, "24 months")).toBeUndefined();
    expect(bestOption(opts, "36 months")).toBe("2-4 years");
    expect(bestOption(opts, "6 months")).toBe("Less than 1 year");
  });
  it("bracket logic only fires for a pure experience quantity", () => {
    expect(bestOption(["0-2 years", "3-5 years", "5+ years"], "Bachelor 2019")).toBeUndefined();
  });
});

describe("strict: notice-period tiers", () => {
  it("exact tier wins over Less than / More than", () => {
    expect(bestOption(["Immediately", "Less than 30 days", "30 days"], "30 days")).toBe("30 days");
    expect(bestOption(["More than 3 months", "3 months"], "3 months")).toBe("3 months");
    expect(bestOption(["Less than 1 month", "1 month"], "1 month")).toBe("1 month");
  });
  it("in-between values never snap to a nearby tier", () => {
    const tiers = ["Immediate", "15 days", "30 days", "60 days", "90 days", "More than 90 days"];
    expect(bestOption(tiers, "45 days")).toBeUndefined();
    expect(bestOption(tiers, "75 days")).toBeUndefined();
    const r = bestOption(tiers, "120 days");
    expect(r).not.toBe("15 days");
    expect([undefined, "More than 90 days"]).toContain(r);
  });
});

describe("strict: gender", () => {
  it("'Male' picks 'Man', never a transgender option", () => {
    expect(bestOption(["Transgender man", "Man", "Woman"], "Male")).toBe("Man");
    expect(bestOption(["Female", "Male to female"], "Male")).toBeUndefined();
  });
  it("zero-width characters are deleted, not turned into spaces", () => {
    expect(normalize("Fe​male")).toBe("female");
    expect(normalize("a‌b‍c⁠d﻿e")).toBe("abcde");
    expect(bestOption(["Fe​male"], "Male")).toBeUndefined();
    expect(bestOption(["Fe​male", "Male"], "Male")).toBe("Male");
    expect(bestOption(["Fe​male", "Male"], "Female")).toBe("Fe​male");
  });
});

describe("strict: degrees", () => {
  it("B.Tech", () => {
    expect(bestOption(["Bachelor of Arts", "Bachelor of Technology"], "B.Tech")).toBe("Bachelor of Technology");
    expect(bestOption(["BA", "BS"], "B.Tech")).toBeUndefined();
  });
  it("M.Tech", () => {
    expect(bestOption(["MBA", "MS", "Master of Technology"], "M.Tech")).toBe("Master of Technology");
    expect(bestOption(["MBA", "MS"], "M.Tech")).toBeUndefined();
    expect(bestOption(["Master of Engineering", "Master of Arts"], "M.Tech")).not.toBe("Master of Arts");
    expect(bestOption(["Master of Engineering", "Master of Arts"], "M.Tech")).toBeUndefined();
  });
  it("Master of Science in CS picks MS", () => {
    expect(bestOption(["MBA", "MS"], "Master of Science in CS")).toBe("MS");
  });
  it("PhD never picks MD or JD", () => {
    expect(bestOption(["Doctor of Medicine (MD)", "Juris Doctor (JD)"], "PhD")).toBeUndefined();
  });
  it("two-letter degree codes match only as whole tokens", () => {
    expect(bestOption(["Same as above", "High School"], "Associate's Degree")).toBeUndefined();
    expect(bestOption(["Be the first", "High School"], "BE")).toBeUndefined();
  });
});

describe("strict: no typo / Levenshtein matching", () => {
  const pairs: [string, string][] = [
    ["Iran", "Iraq"],
    ["Niger", "Nigeria"],
    ["Austria", "Australia"],
    ["Slovakia", "Slovenia"],
    ["Mumbai", "Dubai"],
    ["Software Engineer I", "SWE II"],
    ["Software Engineer I", "Software Engineer II"],
    ["Rest", "Rust"],
  ];
  for (const [wanted, wrong] of pairs) {
    it(`${wanted} never picks ${wrong}`, () => {
      expect(bestOption([wrong], wanted)).toBeUndefined();
      expect(bestOption([wrong, "Other"], wanted)).toBeUndefined();
    });
  }
  it("whitespace/punctuation/case differences still match", () => {
    expect(bestOption(["Java Script", "Python"], "JavaScript")).toBe("Java Script");
    expect(bestOption(["Node.js", "Python"], "nodejs")).toBe("Node.js");
  });
});

describe("strict: boundary suffix / containment", () => {
  it("Guinea never picks Equatorial Guinea / Papua New Guinea", () => {
    expect(bestOption(["Equatorial Guinea", "Papua New Guinea"], "Guinea")).toBeUndefined();
    expect(bestOption(["Equatorial Guinea", "Guinea", "Papua New Guinea"], "Guinea")).toBe("Guinea");
  });
  it("Virginia never picks West Virginia", () => {
    expect(bestOption(["West Virginia", "Washington"], "Virginia")).toBeUndefined();
  });
  it("Junior Engineer never picks Engineer", () => {
    expect(bestOption(["Engineer", "Manager"], "Junior Engineer")).toBeUndefined();
  });
});

describe("strict: country codes need context", () => {
  it("bare 2-letter values do not map to countries", () => {
    expect(bestOption(["Italy", "Spain"], "IT")).toBeUndefined();
    expect(bestOption(["Canada", "Mexico"], "CA")).toBeUndefined();
    expect(bestOption(["India", "Nepal"], "IN")).toBeUndefined();
    expect(bestOption(["Germany", "France"], "DE")).toBeUndefined();
  });
  it("exact option matches and 3-letter codes still work", () => {
    expect(bestOption(["IT", "HR"], "IT")).toBe("IT");
    expect(bestOption(["India", "Nepal"], "IND")).toBe("India");
    expect(bestOption(["Canada", "Mexico"], "CAN")).toBe("Canada");
  });
});

describe("strict: keep working", () => {
  it("Male vs Female", () => {
    expect(bestOption(["Female", "Male"], "Male")).toBe("Male");
    expect(bestOption(["Male", "Female"], "Female")).toBe("Female");
    expect(bestOption(["Female", "Other"], "Male")).toBeUndefined();
  });
  it("Asian vs Native Hawaiian", () => {
    const race = ["Native Hawaiian or Other Pacific Islander", "Asian", "White"];
    expect(bestOption(race, "Asian")).toBe("Asian");
    expect(bestOption(["Native Hawaiian or Other Pacific Islander", "White"], "Asian")).toBeUndefined();
  });
  it("India vs British Indian Ocean Territory / Indiana", () => {
    expect(bestOption(["British Indian Ocean Territory", "Indiana", "India"], "India")).toBe("India");
    expect(bestOption(["British Indian Ocean Territory", "Indiana"], "India")).toBeUndefined();
  });
  it("Dominica vs Dominican Republic", () => {
    expect(bestOption(["Dominican Republic", "Dominica"], "Dominica")).toBe("Dominica");
    expect(bestOption(["Dominican Republic"], "Dominica")).toBeUndefined();
  });
  it("accents and curly apostrophes", () => {
    expect(bestOption(["Côte d’Ivoire", "Cameroon"], "Cote d'Ivoire")).toBe("Côte d’Ivoire");
    expect(bestOption(["São Paulo", "Rio"], "Sao Paulo")).toBe("São Paulo");
    expect(bestOption(["Bachelor’s Degree", "Master’s Degree"], "Bachelor's Degree")).toBe("Bachelor’s Degree");
  });
  it("duplicates return the first copy", () => {
    expect(bestOption(["Yes", "Yes", "No"], "Yes")).toBe("Yes");
    expect(bestOption(["India", "India"], "India")).toBe("India");
  });
  it("BBA vs MBA, BEng, PhD exact", () => {
    expect(bestOption(["BBA", "MBA"], "MBA")).toBe("MBA");
    expect(bestOption(["MBA", "BBA"], "BBA")).toBe("BBA");
    expect(bestOption(["Bachelor of Engineering (BEng)", "Master of Engineering (MEng)"], "BEng")).toBe("Bachelor of Engineering (BEng)");
    expect(bestOption(["Doctor of Medicine (MD)", "PhD"], "PhD")).toBe("PhD");
    expect(bestOption(["Doctor of Philosophy (Ph.D.)", "Juris Doctor (JD)"], "PhD")).toBe("Doctor of Philosophy (Ph.D.)");
  });
  it("exact Yes/No and No never picks None", () => {
    expect(bestOption(["Yes", "No"], "Yes")).toBe("Yes");
    expect(bestOption(["Yes", "No"], "No")).toBe("No");
    expect(yesNoOption(["Yes, I do", "No, I do not"], "No")).toBe("No, I do not");
    expect(yesNoOption(["Yes, I do", "No, I do not"], "Yes")).toBe("Yes, I do");
    expect(bestOption(["None", "Some"], "No")).toBeUndefined();
    expect(yesNoOption(["None", "Some"], "No")).toBeUndefined();
    expect(yesNoOption(["I agree to the terms", "I do not agree"], "Yes")).toBe("I agree to the terms");
    expect(yesNoOption(["I agree", "I disagree"], "No")).toBe("I disagree");
  });
  it("engine export agrees with text.ts wrapper", () => {
    expect(engineBestOption(["Transgender man", "Man", "Woman"], "Male")).toBe("Man");
  });
});

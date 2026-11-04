// Tester report 2 (beta 2): resume import consent, values the import made up, and checks on every Profile field.
import { describe, expect, test } from "vitest";
import {
  canonicalCountry, canonicalState, countryCode, emailSuggestion, linkIssue, looksLikeDegree, normalizeProfileValue,
  statesFor, timezoneValid, validateProfile,
} from "../src/shared/profile-validate";
import { parseResume } from "../src/shared/resume-parse";
import { applyReviewItemsToProfile, buildReviewItems } from "../src/sidepanel/resume-import";
import { linkProblem } from "../src/shared/quick-answers";
import { EMPTY_PROFILE } from "../src/shared/storage";
import type { Profile } from "../src/shared/types";

const issue = (values: Record<string, string>, key: string) => validateProfile(values, new Date("2026-11-04")).find((i) => i.key === key);

describe("country, state, postal code", () => {
  test("real countries in any common spelling; made-up ones are errors", () => {
    expect(countryCode("India")).toBe("IN");
    expect(countryCode("usa")).toBe("US");
    expect(countryCode("UK")).toBe("GB");
    expect(countryCode("Bharat")).toBe("IN");
    expect(canonicalCountry("united states of america")).toBe("United States");
    expect(issue({ country: "Indiaa" }, "country")?.level).toBe("error");
    expect(issue({ country: "Wakanda" }, "country")?.level).toBe("error");
    expect(issue({ country: "Germany" }, "country")).toBeUndefined();
  });

  test("state must belong to the country (where ApplyAgent knows the states)", () => {
    expect(canonicalState("India", "KA")).toBe("Karnataka");
    expect(canonicalState("India", "orissa")).toBe("Odisha");
    expect(canonicalState("US", "ca")).toBe("California");
    expect(issue({ country: "India", state: "Karnatka" }, "state")?.level).toBe("error");
    expect(issue({ country: "India", state: "California" }, "state")?.level).toBe("error");
    expect(issue({ country: "Germany", state: "Bayern" }, "state")).toBeUndefined();
    expect(statesFor("India")).toContain("Telangana");
  });

  test("postal code format per country, and an Indian PIN must fit the state", () => {
    expect(issue({ country: "India", postalCode: "560001" }, "postalCode")).toBeUndefined();
    expect(issue({ country: "India", postalCode: "56001" }, "postalCode")?.level).toBe("error");
    expect(issue({ country: "United States", postalCode: "94105-1234" }, "postalCode")).toBeUndefined();
    expect(issue({ country: "United Kingdom", postalCode: "SW1A 1AA" }, "postalCode")).toBeUndefined();
    expect(issue({ country: "India", state: "Karnataka", postalCode: "110001" }, "postalCode")?.level).toBe("warn");
    expect(issue({ country: "India", state: "Karnataka", postalCode: "560001" }, "postalCode")).toBeUndefined();
    expect(normalizeProfileValue("postalCode", "560 001", { country: "India" })).toBe("560001");
  });

  test("city: no digits, typo hint, a country typed as a city, a city in another country", () => {
    expect(issue({ location: "Flat 4, MG Road" }, "location")?.level).toBe("error");
    expect(issue({ location: "Banglore" }, "location")?.text).toContain("Bangalore");
    expect(issue({ location: "India" }, "location")?.level).toBe("warn");
    expect(issue({ location: "Singapore" }, "location")).toBeUndefined();
    expect(issue({ location: "London", country: "India" }, "location")?.level).toBe("warn");
    expect(issue({ location: "Pune", country: "India" }, "location")).toBeUndefined();
  });
});

describe("personal fields", () => {
  test("names, email, phone, timezone", () => {
    expect(issue({ firstName: "Saurav2" }, "firstName")?.level).toBe("error");
    expect(issue({ firstName: "Anne-Marie" }, "firstName")).toBeUndefined();
    expect(issue({ lastName: "O'Brien" }, "lastName")).toBeUndefined();
    expect(issue({ email: "name@" }, "email")?.level).toBe("error");
    expect(emailSuggestion("asha@gmial.com")).toBe("asha@gmail.com");
    expect(emailSuggestion("asha@gmail.con")).toBe("asha@gmail.com");
    expect(emailSuggestion("asha@company.io")).toBeUndefined();
    expect(issue({ phone: "+91-7977693755", country: "India" }, "phone")).toBeUndefined();
    expect(issue({ phone: "+91 12345", country: "India" }, "phone")?.level).toBe("error");
    expect(issue({ phone: "+91 5123456789", country: "India" }, "phone")?.level).toBe("warn");
    expect(issue({ phone: "98765 43210", country: "India" }, "phone")?.text).toContain("country code");
    expect(issue({ phone: "call me", country: "India" }, "phone")?.level).toBe("error");
    expect(issue({ phone: "+1 415 555 0100", country: "United States" }, "phone")).toBeUndefined();
    expect(timezoneValid("IST")).toBe(true);
    expect(timezoneValid("Asia/Kolkata")).toBe(true);
    expect(timezoneValid("UTC+5:30")).toBe(true);
    expect(timezoneValid("Mars time")).toBe(false);
  });

  test("experience and graduation year agree with each other and the study status", () => {
    expect(issue({ experienceYears: "abc" }, "experienceYears")?.level).toBe("error");
    expect(issue({ graduationYear: "2025", educationStatus: "pursuing" }, "graduationYear")?.level).toBe("warn");
    expect(issue({ graduationYear: "2027", educationStatus: "pursuing" }, "graduationYear")).toBeUndefined();
    expect(issue({ graduationYear: "2028", educationStatus: "completed" }, "graduationYear")?.level).toBe("warn");
    expect(issue({ graduationYear: "2025", experienceYears: "10" }, "experienceYears")?.level).toBe("warn");
  });
});

describe("links", () => {
  test("a degree is never a website", () => {
    expect(looksLikeDegree("https://M.TECH")).toBe(true);
    expect(looksLikeDegree("B.Sc")).toBe(true);
    expect(looksLikeDegree("asha.dev")).toBe(false);
    expect(linkIssue("portfolio", "https://M.TECH")).toContain("degree");
    expect(linkProblem("portfolio", "M.Tech")).toContain("degree"); // the Quick answers wizard uses the same check
  });

  test("each link field takes only its own kind of link", () => {
    expect(linkIssue("linkedin", "https://github.com/asha")).toBeDefined();
    expect(linkIssue("github", "linkedin.com/in/asha")).toBeDefined();
    expect(linkIssue("portfolio", "linkedin.com/in/asha")).toContain("LinkedIn");
    expect(linkIssue("portfolio", "github.com/asha")).toContain("GitHub");
    expect(linkIssue("portfolio", "asha.github.io")).toBeUndefined();
    expect(linkIssue("portfolio", "asha@example.com")).toContain("email");
    expect(linkIssue("resumeUrl", "my resume")).toBeDefined();
    expect(issue({ resumeUrl: "https://example.com/cv.pdf" }, "resumeUrl")?.level).toBe("warn");
    expect(issue({ resumeUrl: "https://drive.google.com/file/d/abc/view" }, "resumeUrl")).toBeUndefined();
  });
});

const RESUME = `Asha Verma
M.TECH CSE | IIT Jodhpur | asha.verma@example.com | +91 98765 43210
linkedin.com/in/asha-verma-test

EDUCATION
M.Tech in Computer Science, Indian Institute of Technology Jodhpur  2025 – Present
B.Tech in Electronics, ABC Institute of Technology  2019 – 2023  CGPA 8.1/10

SKILLS
Python, Java, C++, PyTorch

LANGUAGES
English, Hindi (Native)
`;

describe("resume import (tester report 2)", () => {
  const parsed = parseResume(RESUME);
  const field = (f: string) => parsed.suggestions.filter((s) => s.field === f);

  test("'M.TECH' in the header is not read as a portfolio website", () => {
    expect(field("portfolio")).toHaveLength(0);
  });

  test("'2025 – Present' is not a graduation year; it means still studying", () => {
    expect(field("graduationYear")).toHaveLength(0);
    expect(field("educationStatus")[0]?.value).toMatch(/pursuing/);
    // Education level is the highest level COMPLETED (the B.Tech), not the M.Tech being studied for.
    expect(field("educationLevel")[0]?.value).toBe("Bachelor's");
  });

  test("'Expected 2027' gives the expected year", () => {
    const p = parseResume(RESUME.replace("2025 – Present", "2025 – 2027 (Expected)"));
    expect(p.suggestions.find((s) => s.field === "graduationYear")?.value).toBe("2027");
    expect(p.suggestions.find((s) => s.field === "educationStatus")).toBeDefined();
  });

  test("nothing is ticked; values the profile already has are not offered again", () => {
    const profile: Profile = { ...EMPTY_PROFILE, firstName: "Asha", email: "asha.verma@example.com" };
    const items = buildReviewItems(parsed, profile);
    expect(items.every((i) => !i.checked && !i.preChecked)).toBe(true);
    expect(items.find((i) => i.suggestion.field === "firstName")).toBeUndefined();
    expect(items.find((i) => i.suggestion.field === "email")).toBeUndefined();
  });

  test("a value that fails the Profile checks is never offered", () => {
    const bad = parseResume("Asha Verma\nPortfolio: https://M.TECH\nasha@example.com");
    const items = buildReviewItems(bad, { ...EMPTY_PROFILE });
    expect(items.find((i) => i.suggestion.field === "portfolio")).toBeUndefined();
  });

  test("importing skills invents no years; a language needs a level; key skills are added to, not replaced", () => {
    const profile: Profile = { ...EMPTY_PROFILE, skills: "SQL", skillsInventory: [{ name: "SQL", years: 2 }] };
    const items = buildReviewItems(parsed, profile).map((i) => ({ ...i, checked: true }));
    const updated = applyReviewItemsToProfile(profile, items);
    expect(updated.skills).toBe("SQL, Python, Java, C++, PyTorch");
    expect(updated.skillsInventory).toEqual([{ name: "SQL", years: 2 }]);
    expect(updated.languages?.map((l) => l.language)).toEqual(["Hindi"]); // English has no level in the resume
    expect(updated.languages?.[0]?.proficiency).toBe("Native");
    expect(updated.educationStatus).toBe("pursuing");
    expect(updated.portfolio ?? "").toBe("");
  });

  test("unticked values change nothing", () => {
    const profile: Profile = { ...EMPTY_PROFILE };
    expect(applyReviewItemsToProfile(profile, buildReviewItems(parsed, profile))).toEqual(profile);
  });
});

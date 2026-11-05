/** Value truth: audited questions where ApplyAgent filled a wrong value. Each case states the exact value (or that the
 * user is asked) for the automation-eval candidate: lives in Pune, India; may work in India only; open to any work
 * mode; willing to relocate; prefers Bangalore, Remote, Pune. The job page is usually in the United States. */

import { describe, expect, it } from "vitest";
import { decideWithMeaning } from "../src/content/meaning";
import { decide } from "../src/content/classify";
import { EMPTY_PROFILE, pruneApplications, MAX_APPLICATIONS } from "../src/shared/storage";
import { actThreshold, ACT_CONFIDENCE } from "../src/content/meaning";
import type { ApplicationRecord, Decision, FieldDescriptor, Profile } from "../src/shared/types";
import type { PageFacts } from "../src/content/facts";
import { PROFILE } from "./fixtures";

const FULL: Profile = {
  ...PROFILE,
  location: "Pune",
  country: "India",
  postalCode: "411001",
  state: "Maharashtra",
  currentCompany: "Initech",
  currentTitle: "Data Analyst",
  workHistoryComplete: true,
  preferredLocations: "Bangalore, Remote, Pune",
  skills: "Python, SQL, Machine Learning, Power BI, Excel",
  skillsInventory: [
    { name: "Python", years: 2, level: "Advanced" },
    { name: "SQL", years: 2, level: "Advanced" },
    { name: "Excel", years: 2, level: "Advanced" },
    { name: "AI", years: 2, level: "Advanced" },
  ],
  facts: {
    workCountries: "India",
    noticePeriod: "30 days",
    currentCtc: "6 LPA",
    expectedCtc: "20 LPA",
    relocate: "Yes",
    heardFrom: "LinkedIn",
    gender: "Female",
    hispanic: "No",
    race: "Asian",
    veteran: "No",
    disability: "No",
    workMode: "any",
    travel: "Yes",
    over18: "Yes",
  },
};

const US_PAGE: PageFacts = { jobCountries: ["United States"], url: "https://boards.greenhouse.io/acme/jobs/123" };
const ASK = "ASK";

function field(label: string, control: FieldDescriptor["control"] = "combobox", options?: string[]): FieldDescriptor {
  const opts = options ?? ((control === "select" || control === "radio" || control === "combobox") && /^(are|do|have|will|would|can|is|did)\b/i.test(label) ? ["Yes", "No"] : []);
  return { key: "k", label, control, required: true, options: opts, name: "", autocomplete: "", placeholder: "" };
}

function value(d: Decision): string {
  return d.kind === "profile" || d.kind === "answer" ? d.value : ASK;
}

/** Both engines (rules alone, and rules with a confident model reading) give the same value. */
function both(f: FieldDescriptor, profile: Profile = FULL, page: PageFacts | undefined = US_PAGE, intent?: string): string {
  const rule = value(decide(f, profile, [], page));
  const withModel = value(decideWithMeaning(f, profile, [], page, intent ? { intent, confidence: 0.99 } : undefined));
  expect(withModel, `model path for "${f.label}"`).toBe(rule);
  return rule;
}

describe("1. the empty profile carries no one's data", () => {
  it("every string in EMPTY_PROFILE is empty", () => {
    for (const [key, v] of Object.entries(EMPTY_PROFILE)) {
      if (typeof v === "string") expect(v, key).toBe("");
    }
    expect(EMPTY_PROFILE.resumeUrl).toBe("");
  });
  it("a resume link question with no saved link is asked", () => {
    expect(value(decide(field("Resume link", "url"), { ...EMPTY_PROFILE, firstName: "A" }, []))).toBe(ASK);
  });
});

describe("2. proof-of-submission screenshots are never deleted", () => {
  it("keeps every screenshot", () => {
    const records: ApplicationRecord[] = Array.from({ length: 60 }, (_, i) => ({
      id: `a${i}`, url: `https://x.com/${i}`, platform: "greenhouse", jobTitle: "SWE", status: "applied_confirmed",
      createdAt: "2026-01-01T00:00:00Z", screenshotKey: `proof:a${i}`,
    }));
    const { pruned, evictedScreenshotKeys } = pruneApplications(records);
    expect(evictedScreenshotKeys).toEqual([]);
    expect(pruned.filter((r) => r.screenshotKey).length).toBe(60);
  });
  it("past the application cap only records without a screenshot make room", () => {
    const records: ApplicationRecord[] = Array.from({ length: MAX_APPLICATIONS + 10 }, (_, i) => ({
      id: `a${i}`, url: `https://x.com/${i}`, platform: "greenhouse", jobTitle: "SWE", status: "applied_confirmed",
      createdAt: "2026-01-01T00:00:00Z", screenshotKey: i < 5 ? `proof:a${i}` : undefined,
    }));
    const { pruned, evictedScreenshotKeys } = pruneApplications(records);
    expect(evictedScreenshotKeys).toEqual([]);
    expect(pruned.length).toBe(MAX_APPLICATIONS);
    expect(pruned.filter((r) => r.screenshotKey).length).toBe(5);
  });
});

describe("3. commuting and on-site questions need a place that is the user's", () => {
  it.each([
    ["Are you local and within commuting distance to this job?", "combobox"],
    ["Are you currently located within commuting distance to the assigned office location for this role?", "radio"],
    ["This is an office based position. Are you able to commute daily to PO15 5TT?", "radio"],
    ["This role requires working on‑site at least three days a week in Wayzata, Minnesota. Are you able to meet this requirement?", "radio"],
    ["This role is based in Alameda, CA, and requires on-site work five days per week. Are you able to reliably commute to Alameda for this schedule?", "select"],
    ["Are you comfortable commuting to and working onsite at our New York City office location?", "combobox"],
    ["Will you be able to regularly commute and work in an office in job posting location?", "combobox"],
    ["This role requires at least 3 days a week in the office, are you able to easily commute to the location the role is based in?", "select"],
  ] as const)("%s → asked", (label, control) => {
    expect(both(field(label, control), FULL, US_PAGE, "onsite")).toBe(ASK);
  });
  it("names the user's city → Yes", () => {
    expect(both(field("Are you able to commute daily to our Pune office?", "radio"))).toBe("Yes");
  });
});

describe("4. work authorization by country of residence and of application", () => {
  it.each([
    ["Are you authorized to work in the country you currently reside in?", "radio"],
    ["Your authorization to work in the country where you live. Please choose the option that describes your work authorization.", "combobox"],
  ] as const)("%s → Yes (lives in India, may work in India)", (label, control) => {
    expect(both(field(label, control, control === "radio" ? ["Yes", "No"] : []), FULL, US_PAGE, "work_authorization")).toBe("Yes");
  });
  it("country of application: asked when the job country is not one the user may work in", () => {
    expect(both(field("Are you legally authorized to work in your country of application?"), FULL, US_PAGE, "work_authorization")).toBe(ASK);
    expect(both(field("Are you authorized to work in the country for which you applied?"), FULL, US_PAGE, "work_authorization")).toBe(ASK);
    expect(both(field("Are you legally authorized to work in your country of application?"), FULL, { jobCountries: [] }, "work_authorization")).toBe(ASK);
  });
  it("country of application: Yes when the job is in India", () => {
    expect(both(field("Are you legally authorized to work in your country of application?"), FULL, { jobCountries: ["India"] }, "work_authorization")).toBe("Yes");
  });
  it("residence unknown → asked", () => {
    expect(both(field("Are you authorized to work in the country you currently reside in?", "radio"), { ...FULL, country: "" })).toBe(ASK);
  });
});

describe("5. the form's instruction for candidates outside the US", () => {
  const zip = field('Zip Code / Postal Code (Non-U.S. based candidates, please enter "00000")', "text");
  it("a candidate in India types 00000", () => {
    expect(both(zip, FULL, US_PAGE, "postal_code")).toBe("00000");
  });
  it("a US candidate gives their ZIP", () => {
    expect(both(zip, { ...FULL, country: "United States", postalCode: "94105" })).toBe("94105");
  });
  it("where the user lives is unknown → asked", () => {
    expect(both(zip, { ...FULL, country: "" })).toBe(ASK);
  });
});

describe("6. a skill inside a narrower one is not a claim", () => {
  it.each([
    ["Have you built or configured AI agents, custom connectors, or automated workflows (e.g., using Claude, OpenAI APIs, or custom harnesses) to deliver automated reports or assets to other departments?", "text"],
    ["Have you designed AI-powered content creation or generative AI experiences?", "text"],
    ["Do you have experience with Distributed SQL Databases", "combobox"],
  ] as const)("%s → asked", (label, control) => {
    expect(both(field(label, control), FULL, US_PAGE, "skills_experience")).toBe(ASK);
  });
  it("the plain skill is still answered", () => {
    expect(both(field("Do you have experience with SQL?", "radio"))).toBe("Yes");
  });
});

describe("7. five office days for a user open to any work mode", () => {
  it("Bangalore office (preferred) → Yes", () => {
    expect(both(field("Are you willing to work for 5 days a week, from our Bangalore office?"), FULL, US_PAGE, "onsite")).toBe("Yes");
  });
  it("in-office 5 days a week → Yes", () => {
    expect(both(field("Are you willing to work in-office 5 days a week?", "radio"), FULL, US_PAGE, "onsite")).toBe("Yes");
  });
  it("a hybrid user is not told No for four days without a saved maximum", () => {
    const hybrid = { ...FULL, facts: { ...FULL.facts!, workMode: "hybrid" as const } };
    expect(both(field("Are you willing to work in-office 4 days a week?", "radio"), hybrid)).toBe(ASK);
  });
});

describe("8. applied before: the tracker record must match the role and the time asked", () => {
  const now = Date.now();
  const old: ApplicationRecord = {
    id: "1", url: "https://boards.greenhouse.io/acme/jobs/999", platform: "greenhouse", jobTitle: "Other role",
    status: "applied_confirmed", createdAt: new Date(now - 500 * 86_400_000).toISOString(), submittedAt: new Date(now - 500 * 86_400_000).toISOString(),
  };
  const recentSame: ApplicationRecord = {
    ...old, id: "2", url: "https://boards.greenhouse.io/acme/jobs/123/application", jobTitle: "This role",
    createdAt: new Date(now - 30 * 86_400_000).toISOString(), submittedAt: new Date(now - 30 * 86_400_000).toISOString(),
  };
  const withOld: PageFacts = { ...US_PAGE, applications: [old] };
  const withRecent: PageFacts = { ...US_PAGE, applications: [recentSame] };
  it("another role at the company → Yes for the company, asked for this position", () => {
    expect(value(decide(field("Have you applied to this company before?"), FULL, [], withOld))).toBe("Yes");
    expect(value(decide(field("Have you previously applied for this position?"), FULL, [], withOld))).toBe(ASK);
  });
  it("an application older than the window asked → asked", () => {
    expect(value(decide(field("Have you applied to us before in the past 12 months?"), FULL, [], withOld))).toBe(ASK);
  });
  it("the same posting, inside the window → Yes", () => {
    expect(value(decide(field("Have you previously applied for this position?"), FULL, [], withRecent))).toBe("Yes");
    expect(value(decide(field("Have you applied to us before in the past 12 months?"), FULL, [], withRecent))).toBe("Yes");
  });
  it("another company named in the question → asked", () => {
    expect(value(decide(field("Have you previously applied to Amazon or any Amazon subsidiary?"), FULL, [], withRecent))).toBe(ASK);
  });
});

describe("9. previous employer known only from the page address", () => {
  it.each([
    "Have you ever worked for us before?",
    "Have you previously been employed by this company?",
    "Have you been rejected for this role at Samsara within the past 6 months?",
    "Have you ever worked for LogicSource Inc. or one of its clients?",
  ])("%s → asked", (label) => {
    expect(both(field(label), FULL, US_PAGE, "previous_employee")).toBe(ASK);
  });
  it("a company named in the question and not in a complete history → No", () => {
    expect(both(field("Have you ever worked for Samsara before?"))).toBe("No");
  });
  it("a company in the history → Yes", () => {
    expect(both(field("Have you ever worked for Initech before?"))).toBe("Yes");
  });
});

describe("10. fragments and notice periods are not answers", () => {
  it("veteran list with unknown choices → asked", () => {
    expect(both(field("Veteran Status", "combobox", []), FULL, US_PAGE, "veteran")).toBe(ASK);
  });
  it("veteran list with choices → the choice", () => {
    expect(both(field("Veteran Status", "select", ["I am a protected veteran", "I am not a protected veteran", "I don't wish to answer"]))).toBe("I am not a protected veteran");
  });
  it.each(["Start date", "Date Available", "Availability date"])("%s → asked (30 days is not a date)", (label) => {
    expect(both(field(label, "text"), FULL, US_PAGE, "notice_period")).toBe(ASK);
  });
  it("a notice period question still gets the notice period", () => {
    expect(both(field("Notice period", "text"))).toBe("30 days");
  });
});

describe("11. the model acts on links only at the full threshold, and on resume words only", () => {
  it("thresholds", () => {
    for (const intent of ["firstName", "lastName", "fullName", "email", "phone"]) expect(actThreshold(intent)).toBeLessThan(ACT_CONFIDENCE);
    // Never below the full threshold; calibration may make one stricter (location: 0.89 in round 7, 17/17 right).
    for (const intent of ["resumeUrl", "linkedin", "github", "portfolio", "location", "country"]) expect(actThreshold(intent)).toBeGreaterThanOrEqual(ACT_CONFIDENCE);
  });
  it("a link box that does not say resume is not filled with the resume link", () => {
    const p = { ...FULL, resumeUrl: "https://example.com/cv.pdf" };
    const d = decideWithMeaning(field("Other link", "url"), p, [], US_PAGE, { intent: "resumeUrl", confidence: 0.9 });
    expect(value(d)).toBe(ASK);
    const d2 = decideWithMeaning(field("Google Drive link", "url"), p, [], US_PAGE, { intent: "resumeUrl", confidence: 0.99 });
    expect(value(d2)).not.toBe("https://example.com/cv.pdf");
  });
});

describe("12. value-eval findings (gold label wrong, fixed in src)", () => {
  it("a state of another country is not a U.S. state", () => {
    const f = field("Which U.S. State or Canadian Province do you reside in?", "combobox", []);
    expect(both(f, FULL, US_PAGE, "location")).toBe(ASK);
    expect(both(f, FULL, US_PAGE, "state")).toBe(ASK);
    expect(both(f, { ...FULL, country: "United States", state: "California" })).toBe("California");
  });
});

// Round 6: real forms keep adding questions the rules do not name ("Who is your current or previous employer?",
// "Branch", "Year of passing", "Do you have experience with Kafka?"). The fact sheet answers them from the user's own
// saved data only, says where each value came from, and asks whenever the facts do not settle it.
import { describe, expect, it } from "vitest";
import { answerSuggestion, factSheetAnswer, historyQuestion, missingQuickAnswer } from "../src/content/factsheet";
import { decideWithMeaning, MODEL_DECISIONS } from "../src/content/meaning";
import { EMPTY_PROFILE } from "../src/shared/storage";
import type { FieldDescriptor, Profile } from "../src/shared/types";

const field = (label: string, extra: Partial<FieldDescriptor> = {}): FieldDescriptor =>
  ({ key: "f1", label, control: "text", required: true, options: [], name: "", autocomplete: "", placeholder: "", ...extra }) as FieldDescriptor;

/** A made-up student with two internships. */
const STUDENT: Profile = {
  ...EMPTY_PROFILE, firstName: "Asha", lastName: "Verma", email: "asha@example.com",
  degree: "M.Tech", discipline: "Computer Science", school: "Example Institute of Technology", graduationYear: "May 2027",
  educationStatus: "pursuing", skills: "Python, SQL, React",
  workHistory: [
    { company: "Initech", title: "Software Engineering Intern", start: "2025-05", end: "2025-07", current: false, location: "", summary: "Built Kafka consumers in Java" },
    { company: "Globex", title: "Data Intern", start: "2024-05", end: "2024-07", current: false, location: "", summary: "" },
  ],
};
/** A made-up professional with a current job. */
const PRO: Profile = { ...STUDENT, educationStatus: "completed", graduationYear: "2022", currentCompany: "Hooli", currentTitle: "Backend Engineer", experienceYears: "3" };

const value = (label: string, profile: Profile, extra: Partial<FieldDescriptor> = {}) => {
  const d = factSheetAnswer(field(label, extra), profile);
  return d && "value" in d ? d.value : undefined;
};

describe("employer and job title", () => {
  it.each([
    "Who is your current or previous employer?", "Current or most recent employer", "Most recent company",
    "Name of your latest employer", "Latest organisation",
  ])("student, %s → the latest job", (label) => {
    expect(value(label, STUDENT)).toBe("Initech");
  });
  it.each([
    "What is your current or previous job title?", "Most recent job title", "Latest designation", "Current or last role",
  ])("student, %s → its title", (label) => {
    expect(value(label, STUDENT)).toBe("Software Engineering Intern");
  });
  it("a professional's current employer and title come from the profile", () => {
    expect(value("Current employer", PRO)).toBe("Hooli");
    expect(value("Current designation", PRO)).toBe("Backend Engineer");
  });
  it("says where the value came from", () => {
    const d = factSheetAnswer(field("Who is your current or previous employer?"), STUDENT);
    expect(d && "source" in d ? d.source : "").toMatch(/work history: Initech/);
  });
  it("internships do not count when the question excludes them", () => {
    expect(value("Most recent employer (excluding internships)", STUDENT)).toBeUndefined();
    expect(value("Current full-time employer", STUDENT)).toBeUndefined();
  });
  it.each([
    "Previous employer", // the professional has a current job: which previous one is meant? asked
    "Your manager's name at your current employer", "Employer of your reference", "Reason for leaving your current employer",
    "Current company address", "Which company are you applying to?", "Desired job title", "Expected salary",
    "Current CTC", "Notice period at current employer", "How long have you worked at your current company?",
  ])("asked, never filled: %s", (label) => {
    expect(value(label, PRO)).toBeUndefined();
  });
  it("a list of employers takes only a listed one", () => {
    expect(value("Most recent employer", STUDENT, { control: "select", options: ["Initech", "Other"] })).toBe("Initech");
    expect(value("Most recent employer", STUDENT, { control: "select", options: ["Acme", "Other"] })).toBeUndefined();
  });
  it("is not a history question when it asks for both at once", () => {
    expect(historyQuestion(field("Current title and company"))).toBeUndefined();
  });
});

describe("education in other words", () => {
  it.each([["Branch", "Computer Science"], ["Stream", "Computer Science"], ["Which branch did you study?", "Computer Science"],
    ["Name of your college", "Example Institute of Technology"], ["Institute name", "Example Institute of Technology"],
    ["Year of passing", "2027"], ["Passing year", "2027"], ["Batch", "2027"]])("%s → %s", (label, want) => {
    expect(value(label, STUDENT)).toBe(want);
  });
  it.each(["Year of passing (12th)", "PG branch", "UG college name", "Graduation date (MM/YYYY)"])("one named level or a full date is asked: %s", (label) => {
    expect(value(label, STUDENT)).toBeUndefined();
  });
});

describe("experience", () => {
  it("total years only as the user stated them", () => {
    expect(value("Total years of experience", PRO)).toBe("3");
    expect(value("How many years of work experience do you have?", PRO)).toBe("3");
    expect(value("Total years of experience", STUDENT)).toBeUndefined(); // not stated: never worked out from dates
  });
  it("a range list takes the range that holds it", () => {
    expect(value("Total experience", PRO, { control: "select", options: ["0-1 years", "2-4 years", "5+ years"] })).toBe("2-4 years");
    expect(value("Total experience", PRO, { control: "select", options: ["Select...", "Fresher", "1-2", "3-5", "6 or more years"] })).toBe("3-5");
    expect(value("Total experience", PRO, { control: "select", options: ["Less than 1 year", "1 to 3 years", "More than 3 years"] })).toBe("1 to 3 years");
  });
  it("a list that is not years is never answered (a real Greenhouse phone list carried this label)", () => {
    const codes = ["Afghanistan+93", "Åland Islands+358", "Albania+355", "American Samoa+1", "India+91"];
    expect(value("How many years of experience do you have?", PRO, { control: "select", options: codes })).toBeUndefined();
    expect(value("Total experience", PRO, { control: "select", options: ["Junior", "Mid-level", "Senior"] })).toBeUndefined();
  });
  it("Yes only for a skill in the user's own data; never No for them", () => {
    expect(value("Do you have experience with Kafka?", STUDENT, { control: "select", options: ["Yes", "No"] })).toBe("Yes"); // internship summary
    expect(value("Have you worked with React?", STUDENT, { control: "select", options: ["Yes", "No"] })).toBe("Yes"); // skills
    expect(value("Do you have experience with Kubernetes?", STUDENT, { control: "select", options: ["Yes", "No"] })).toBeUndefined();
    expect(value("Do you have 3+ years of experience with Python?", STUDENT, { control: "select", options: ["Yes", "No"] })).toBeUndefined();
    expect(value("Do you have experience leading teams using Python?", STUDENT, { control: "select", options: ["Yes", "No"] })).toBeUndefined();
  });
});

describe("where the user lives (real wordings from the 1,539 questions)", () => {
  const PUNE: Profile = { ...STUDENT, country: "India", location: "Pune" };
  const yn = { control: "select" as const, options: ["Yes", "No"] };
  it.each([
    ["Are you based in India?", "Yes"],
    ["Do you currently reside in Cyprus?", "No"],
    ["Do you currently live in the United States?", "No"],
    ["Do you currently reside in the United States?", "No"],
    ["Are you currently located in the US?", "No"],
    ["Do you currently reside in the Denver Metro area?", "No"], // Denver is only in the US lists
    ["Are you currently living in the Denver area", "No"],
    ["Are you based out of Pune ?", "Yes"],
    ["Are you based out of Poona?", "Yes"], // the listed old name of Pune
    ["Are you based out of Hinjewadi?", undefined], // not a listed place: asked
  ])("%s → %s", (label, want) => {
    expect(value(label, PUNE, yn)).toBe(want);
  });
  it.each([
    "Are you based out of Bangalore ?", // another city in the user's own country: asked (metro areas, suburbs)
    "Are you currently based in EST / MST?",
    "Are you based in the United Kingdom and able to work a Sunday-to-Thursday schedule?",
    "Are you currently based in Ireland, or willing to relocate there at your own expense?",
    "Are you currently located within commuting distance to the assigned office location for this role?",
    "Do you live/go to school near our Culloden, WV facility? (30-40 miles)",
    "Are you located in one of the following countries or regions: Belarus, Cuba, Iran, North Korea (DPRK), Syria, or Russia?",
    "Are you currently based in any of these countries? Please note these are the only countries where we are accepting applications",
    "Do you currently reside in the geographic location specified in the posting?",
    "Are you currently based in or willing to relocate to the Bay Area for this position?",
  ])("asked: %s", (label) => {
    expect(value(label, PUNE, yn)).toBeUndefined();
  });
  it("the job's own country, only when the page names exactly one", () => {
    const f = field("Do you currently reside in the country where this position is located?", yn);
    const at = (jobCountries: string[]) => {
      const d = factSheetAnswer(f, PUNE, undefined, { jobCountries });
      return d && "value" in d ? d.value : undefined;
    };
    expect(at(["India"])).toBe("Yes");
    expect(at(["Germany"])).toBe("No");
    expect(at([])).toBeUndefined();
    expect(at(["India", "Germany"])).toBeUndefined();
  });
  it("no Profile country: asked", () => {
    expect(value("Are you based in India?", { ...PUNE, country: "" }, yn)).toBeUndefined();
  });
  it("takes the form's own wording of yes and no, and says where it came from", () => {
    const d = factSheetAnswer(field("Are you based in India?", { control: "radio", options: ["Yes, I am", "No, I am not"] }), PUNE);
    expect(d).toMatchObject({ kind: "answer", value: "Yes, I am" });
    expect(d && "source" in d ? d.source : "").toMatch(/Profile country \(India\)/);
  });
});

describe("highest education", () => {
  it("a finished degree is filled; a student's degree in progress is not 'completed'", () => {
    expect(value("Highest level of education", PRO)).toBe("M.Tech");
    expect(value("What is your highest level of education completed?", PRO)).toBe("M.Tech");
    expect(value("Highest level of education completed", STUDENT)).toBeUndefined();
    expect(value("Degree obtained", STUDENT)).toBeUndefined();
    expect(value("Highest level of education", STUDENT)).toBe("M.Tech");
  });
});

describe("in the decision pipeline", () => {
  it("fills only where the rules gave up, and marks it for a check", () => {
    const d = decideWithMeaning(field("Who is your current or previous employer?"), STUDENT, []);
    expect(d).toMatchObject({ kind: "profile", value: "Initech" });
    expect(MODEL_DECISIONS.has(d)).toBe(true);
    const email = decideWithMeaning(field("Email", { name: "email" }), STUDENT, []);
    expect(MODEL_DECISIONS.has(email)).toBe(false);
  });
});

describe("help for questions that stay asked", () => {
  it("suggests a start date for a student from the graduation month and year", () => {
    expect(answerSuggestion(field("When are you available to start full-time?"), STUDENT, undefined, new Date("2026-11-05"))?.value)
      .toBe("After graduating in May 2027");
    expect(answerSuggestion(field("When are you available to start full-time?"), { ...STUDENT, graduationYear: "2027" }, undefined, new Date("2026-11-05"))).toBeUndefined();
    expect(answerSuggestion(field("When are you available to start full-time?"), PRO, undefined, new Date("2026-11-05"))).toBeUndefined();
  });
  it("points work questions to the Quick answer while it is empty", () => {
    expect(missingQuickAnswer({ kind: "ask", reason: "sensitive", topic: "work_authorization" }, STUDENT)?.key).toBe("workCountries");
    expect(missingQuickAnswer({ kind: "ask", reason: "sensitive", topic: "sponsorship" }, { ...STUDENT, facts: { workCountries: "India" } as Profile["facts"] })).toBeUndefined();
  });
});

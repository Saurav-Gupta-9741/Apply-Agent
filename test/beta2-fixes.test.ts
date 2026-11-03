/** Beta 2 and beta 3: the first tester report (Nov 2026), each fix pinned by a test.
 * Wrong-fill fixes first: nothing the user did not say is ever saved or filled. */
import { beforeEach, describe, expect, it, vi } from "vitest";

const storageStore: Record<string, any> = {};
vi.stubGlobal("chrome", {
  storage: {
    local: {
      get: vi.fn(async (keys?: string | string[]) => {
        if (!keys) return { ...storageStore };
        if (typeof keys === "string") return { [keys]: storageStore[keys] };
        return Object.fromEntries(keys.map((k) => [k, storageStore[k]]));
      }),
      set: vi.fn(async (items: Record<string, any>) => void Object.assign(storageStore, items)),
      remove: vi.fn(async (key: string) => void delete storageStore[key]),
    },
  },
});

import { decide } from "../src/content/classify";
import { educationStatusAnswer } from "../src/content/facts";
import { makeBackup, readBackup } from "../src/shared/backup";
import { citySuggestion } from "../src/shared/city-check";
import { jobLevel, jobType, passesFilters, requiredYears, NO_FILTERS } from "../src/shared/jobs/job-filters";
import type { JobPosting } from "../src/shared/jobs/types";
import { bestOption } from "../src/shared/option-matcher";
import {
  applyQuickAnswers, diversityFactFromAnswer, existingQuickAnswer, languageLevel, linkProblem, normalizeLink,
  parseLanguagesInput, QUICK_QUESTIONS, quickAnswerProblem, splitSkillsInput,
} from "../src/shared/quick-answers";
import { EMPTY_PROFILE } from "../src/shared/storage";
import type { FieldDescriptor, Profile } from "../src/shared/types";
import { mountQuickAnswers, WIZARD_STEP_KEY } from "../src/sidepanel/quick-answers";

const field = (label: string, control: FieldDescriptor["control"] = "select", options: string[] = []): FieldDescriptor => ({
  key: "f", label, control, required: true, options, name: "", autocomplete: "", placeholder: "",
});
const YN = ["Yes", "No"];
const tick = () => new Promise((r) => setTimeout(r, 30));

describe("Quick Answers wizard never saves an example as the user's answer", () => {
  let container: HTMLElement;
  beforeEach(() => {
    for (const k of Object.keys(storageStore)) delete storageStore[k];
    storageStore.profile = { ...EMPTY_PROFILE, firstName: "Asha" };
    container = document.createElement("div");
    document.body.replaceChildren(container);
  });

  const click = (sel: string) => container.querySelector<HTMLButtonElement>(sel)!.click();
  const counter = () => container.querySelector(".wizard-step-counter")?.textContent;

  it("Skip and untouched Next save nothing (beta 1 saved 3 years, 2024, Bachelor's...)", async () => {
    await mountQuickAnswers(container, () => undefined);
    expect(container.querySelector(".active-choice, .active-pill")).toBeNull(); // nothing pre-selected
    for (let i = 0; i < QUICK_QUESTIONS.length - 1; i++) click(i % 2 ? ".wizard-skip" : ".wizard-next");
    expect(counter()).toBe(`Question ${QUICK_QUESTIONS.length} of ${QUICK_QUESTIONS.length}`);
    click(".wizard-next"); // Finish
    await tick();
    const p = storageStore.profile as Profile;
    expect(p.experienceYears).toBe("");
    expect(p.graduationYear).toBe("");
    expect(p.educationLevel ?? "").toBe("");
    expect(p.preferredLocations).toBe("");
    expect(p.languages).toBeUndefined();
    for (const v of Object.values(p.facts ?? {})) expect(v).toBe("");
  });

  it("saves after every question and resumes where the user left (progress was lost before)", async () => {
    await mountQuickAnswers(container, () => undefined);
    const india = Array.from(container.querySelectorAll<HTMLButtonElement>(".wizard-multi-group .btn")).find((b) => b.textContent === "India")!;
    india.click();
    click(".wizard-next");
    await tick();
    expect((storageStore.profile as Profile).facts?.workCountries).toBe("India"); // saved without Finish
    click(".wizard-skip");
    click(".wizard-skip");
    await tick();
    expect(storageStore[WIZARD_STEP_KEY]).toBe(3);

    // The panel closes; opening the wizard again continues at question 4.
    const again = document.createElement("div");
    document.body.replaceChildren(again);
    await mountQuickAnswers(again, () => undefined);
    expect(again.querySelector(".wizard-step-counter")?.textContent).toBe(`Question 4 of ${QUICK_QUESTIONS.length}`);
    expect(again.querySelector(".wizard-resumed")).not.toBeNull();
  });

  it("checks the LinkedIn link before moving on", async () => {
    storageStore[WIZARD_STEP_KEY] = QUICK_QUESTIONS.findIndex((q) => q.id === "linkedin");
    await mountQuickAnswers(container, () => undefined);
    const input = container.querySelector<HTMLInputElement>(".wizard-input")!;
    input.value = "my profile";
    click(".wizard-next");
    expect(container.querySelector<HTMLElement>(".wizard-error")!.hidden).toBe(false);
    expect(counter()).toContain(`Question ${QUICK_QUESTIONS.findIndex((q) => q.id === "linkedin") + 1} of`);
    input.value = "linkedin.com/in/asha-verma";
    click(".wizard-next");
    await tick();
    expect((storageStore.profile as Profile).linkedin).toBe("https://linkedin.com/in/asha-verma");
  });

  it("languages: a row per language with a level picked, never a guessed 'Fluent'", async () => {
    storageStore[WIZARD_STEP_KEY] = QUICK_QUESTIONS.findIndex((q) => q.id === "languages");
    await mountQuickAnswers(container, () => undefined);
    const row = container.querySelector(".wizard-lang-row")!;
    row.querySelector<HTMLInputElement>(".wizard-lang-name")!.value = "Hindi";
    click(".wizard-next");
    expect(container.querySelector<HTMLElement>(".wizard-error")!.textContent).toContain("Hindi");
    row.querySelector<HTMLSelectElement>(".wizard-lang-level")!.value = "Basic";
    click(".wizard-next");
    await tick();
    expect((storageStore.profile as Profile).languages).toEqual([{ language: "Hindi", proficiency: "Basic" }]);
  });
});

describe("skills and languages are saved only as the user wrote them", () => {
  it("a skill without years goes to the skills list, never to '3 years'", () => {
    expect(splitSkillsInput("Python (4 yrs), Docker")).toEqual({ withYears: [{ name: "Python", years: 4, level: "Intermediate" }], withoutYears: ["Docker"] });
    const p = applyQuickAnswers({ ...EMPTY_PROFILE, skills: "SQL" }, { topSkills: "Python (4 yrs), Docker, sql" });
    expect(p.skillsInventory).toEqual([{ name: "Python", years: 4, level: "Intermediate" }]);
    expect(p.skills).toBe("SQL, Docker");
  });

  it("language levels: Beginner is Basic, Advanced is Professional; no level means not saved", () => {
    expect(languageLevel("Beginner")).toBe("Basic");
    expect(languageLevel("advanced")).toBe("Professional");
    expect(languageLevel("mother tongue")).toBe("Native");
    expect(parseLanguagesInput("English: Fluent, Hindi - native, Tamil (Beginner), Marathi")).toEqual({
      entries: [{ language: "English", proficiency: "Fluent" }, { language: "Hindi", proficiency: "Native" }, { language: "Tamil", proficiency: "Basic" }],
      missingLevel: ["Marathi"],
    });
    expect(applyQuickAnswers(EMPTY_PROFILE, { languages: "Hindi: Beginner" }).languages).toEqual([{ language: "Hindi", proficiency: "Basic" }]);
    expect(applyQuickAnswers(EMPTY_PROFILE, { languages: "Hindi" }).languages).toBeUndefined();
  });

  it("reopening the wizard shows saved skills as text (beta 1 showed [object Object])", () => {
    const q = QUICK_QUESTIONS.find((x) => x.id === "topSkills")!;
    expect(existingQuickAnswer({ ...EMPTY_PROFILE, skillsInventory: [{ name: "Go", years: 2, level: "Intermediate" }] }, q)).toBe("Go (2 yrs)");
  });
});

describe("answers are checked before they are saved", () => {
  it("links", () => {
    expect(linkProblem("linkedin", "https://www.linkedin.com/in/asha-verma/")).toBeUndefined();
    expect(linkProblem("linkedin", "in.linkedin.com/in/asha")).toBeUndefined();
    expect(linkProblem("linkedin", "asha verma")).toBeDefined();
    expect(linkProblem("linkedin", "https://github.com/asha")).toBeDefined();
    expect(linkProblem("linkedin", "https://linkedin.com/company/acme")).toBeDefined();
    expect(linkProblem("github", "github.com/asha-v")).toBeUndefined();
    expect(linkProblem("github", "https://github.com/asha/repo")).toBeDefined();
    expect(linkProblem("portfolio", "asha.dev")).toBeUndefined();
    expect(linkProblem("portfolio", "my site")).toBeDefined();
    expect(linkProblem("linkedin", "")).toBeUndefined();
    expect(normalizeLink("linkedin.com/in/asha")).toBe("https://linkedin.com/in/asha");
  });

  it("years, graduation year, office days", () => {
    expect(quickAnswerProblem("experienceYears", "0")).toBeUndefined();
    expect(quickAnswerProblem("experienceYears", "2.5")).toBeUndefined();
    expect(quickAnswerProblem("experienceYears", "12")).toBeUndefined();
    expect(quickAnswerProblem("experienceYears", "NA")).toBeDefined();
    expect(quickAnswerProblem("graduationYear", "2027")).toBeUndefined();
    expect(quickAnswerProblem("graduationYear", "27")).toBeDefined();
    expect(quickAnswerProblem("maxOfficeDays", "9")).toBeDefined();
  });

  it("city typos get a suggestion; known cities and small towns are fine", () => {
    expect(citySuggestion("Banglore")).toMatch(/Bangalore|Bengaluru/);
    expect(citySuggestion("Hyderbad")).toBe("Hyderabad");
    expect(citySuggestion("Pune")).toBeUndefined();
    expect(citySuggestion("Pune, Maharashtra")).toBeUndefined();
    expect(citySuggestion("Jodhpur")).toBeUndefined();
    expect(citySuggestion("Bhilwara")).toBeUndefined();
  });
});

describe("experience above 7 years and fresher options", () => {
  it.each([
    ["8", ["0-2", "2-5", "5-7", "7-10", "10+"], "7-10"],
    ["8", ["Less than 1 year", "1 to 3 years", "3 to 5 years", "5 to 7 years", "Above 7 years"], "Above 7 years"],
    ["12", ["Less than 1 year", "1 to 3 years", "3 to 5 years", "5 to 7 years", "Beyond 7 years"], "Beyond 7 years"],
    ["15", ["0-2", "2-5", "5-7", "7-10", "10+"], "10+"],
    ["0", ["Fresher", "1-2 years", "2-4 years", "4-7 years", "More than 7 years"], "Fresher"],
    ["8", ["1+ years", "3+ years", "5+ years", "7+ years"], "7+ years"],
  ])("%s years with %j picks %s", (years, options, want) => {
    expect(bestOption(options, years)).toBe(want);
  });

  it("still asks when two options both fit", () => {
    expect(bestOption(["0-1 years", "1-3 years", "3-5 years", "5-7 years", "7+ years"], "7")).toBeUndefined();
  });
});

describe("education status (beta 3)", () => {
  const pursuing = { ...EMPTY_PROFILE, educationStatus: "pursuing" as const };
  const completed = { ...EMPTY_PROFILE, educationStatus: "completed" as const };
  const val = (label: string, p: Profile) => {
    const d = educationStatusAnswer(field(label, "select", YN), p);
    return d?.kind === "answer" ? d.value : undefined;
  };

  it("answers enrolment and completion questions", () => {
    expect(val("Are you currently enrolled in a degree program?", pursuing)).toBe("Yes");
    expect(val("Are you currently a student?", pursuing)).toBe("Yes");
    expect(val("Are you currently enrolled in a degree program?", completed)).toBe("No");
    expect(val("Have you completed your degree?", completed)).toBe("Yes");
  });

  it("asks where the answer is not certain", () => {
    expect(val("Have you completed your degree?", pursuing)).toBeUndefined(); // may have finished an earlier one
    expect(val("Have you completed a bachelor's degree?", completed)).toBeUndefined();
    expect(val("Is your spouse a student?", pursuing)).toBeUndefined();
    expect(val("Are you currently enrolled in a degree program?", EMPTY_PROFILE)).toBeUndefined();
  });

  it("reaches forms through decide()", () => {
    const d = decide(field("Are you currently enrolled in a degree program?", "select", YN), pursuing, []);
    expect(d.kind === "answer" && d.value).toBe("Yes");
  });

  it("the wizard maps its choice to the stored status, and back", () => {
    const p = applyQuickAnswers(EMPTY_PROFILE, { educationStatus: "I am currently pursuing a degree" });
    expect(p.educationStatus).toBe("pursuing");
    expect(existingQuickAnswer(p, QUICK_QUESTIONS.find((q) => q.id === "educationStatus")!)).toBe("I am currently pursuing a degree");
  });
});

describe("a diversity answer given on a form answers the reworded question next time", () => {
  it("maps clear answers only", () => {
    expect(diversityFactFromAnswer("veteran", "I am not a protected veteran")).toEqual({ key: "veteran", value: "No" });
    expect(diversityFactFromAnswer("veteran", "I identify as one or more of the classifications of protected veteran")).toEqual({ key: "veteran", value: "Yes" });
    expect(diversityFactFromAnswer("veteran", "I don't wish to answer")).toEqual({ key: "veteran", value: "Decline" });
    expect(diversityFactFromAnswer("gender", "Female")).toEqual({ key: "gender", value: "Female" });
    expect(diversityFactFromAnswer("gender", "Male")).toEqual({ key: "gender", value: "Male" });
    expect(diversityFactFromAnswer("disability", "No, I do not have a disability")).toEqual({ key: "disability", value: "No" });
    expect(diversityFactFromAnswer("gender", "Woman, trans")).toBeUndefined();
    expect(diversityFactFromAnswer("race", "Asian")).toBeUndefined();
  });

  it("the saved quick answer covers other wordings", () => {
    const p = { ...EMPTY_PROFILE, facts: { ...(EMPTY_PROFILE.facts ?? {}), veteran: "No" } } as Profile;
    for (const label of ["Veteran Status", "Are you a protected veteran?", "Have you served in the military?"]) {
      expect(decide(field(label, "select", ["Yes", "No", "I don't wish to answer"]), p, []).kind).toBe("answer");
    }
    expect(decide(field("Are you a military spouse?", "select", YN), p, []).kind).toBe("ask");
  });
});

describe("backups keep every Quick Answer (beta 1 dropped three)", () => {
  it("restores sponsorship, temporary permits, unauthorized countries and education status", () => {
    const profile = {
      ...EMPTY_PROFILE, educationStatus: "pursuing" as const,
      facts: { ...(EMPTY_PROFILE.facts ?? {}), temporaryWorkCountries: "Canada", unauthorizedCountries: "United States", needsFutureSponsorship: "Yes" as const },
    } as Profile;
    const back = readBackup(JSON.parse(JSON.stringify(makeBackup({ profile, answers: [], applications: [], settings: {} as never }))));
    expect(typeof back).not.toBe("string");
    if (typeof back === "string") return;
    expect(back.profile.facts?.temporaryWorkCountries).toBe("Canada");
    expect(back.profile.facts?.unauthorizedCountries).toBe("United States");
    expect(back.profile.facts?.needsFutureSponsorship).toBe("Yes");
    expect(back.profile.educationStatus).toBe("pursuing");
  });
});

describe("Discover filters (beta 3)", () => {
  const job = (title: string, extra: Partial<JobPosting> = {}): JobPosting => ({
    id: title, companySlug: "acme", companyName: "Acme", ats: "lever", title, location: "Pune", isRemote: false, ...extra,
  });

  it("reads level, type and years from the posting", () => {
    expect(jobLevel(job("Software Engineering Intern"))).toBe("internship");
    expect(jobLevel(job("Graduate Software Engineer"))).toBe("entry");
    expect(jobLevel(job("Senior Backend Engineer"))).toBe("senior");
    expect(jobLevel(job("Backend Engineer"))).toBe("mid");
    expect(jobType(job("Data Analyst", { employmentType: "Full-time" }))).toBe("full_time");
    expect(jobType(job("Data Analyst", { employmentType: "Intern" }))).toBe("internship");
    expect(jobType(job("Designer (Contract)"))).toBe("contract");
    expect(jobType(job("Designer"))).toBeUndefined();
    expect(requiredYears(job("x", { descriptionSnippet: "You have 3+ years of experience in Go." }))).toBe(3);
    expect(requiredYears(job("x", { descriptionSnippet: "Minimum 5 years of professional experience" }))).toBe(5);
    expect(requiredYears(job("x", { descriptionSnippet: "We value curiosity." }))).toBeUndefined();
  });

  it("fresher, senior, type and remote filters", () => {
    const f = (o: Partial<typeof NO_FILTERS>) => ({ ...NO_FILTERS, ...o });
    expect(passesFilters(job("Software Engineering Intern"), f({ experience: "fresher" }))).toBe(true);
    expect(passesFilters(job("Backend Engineer", { descriptionSnippet: "0-1 years of experience" }), f({ experience: "fresher" }))).toBe(true);
    expect(passesFilters(job("Backend Engineer", { descriptionSnippet: "4+ years of experience" }), f({ experience: "fresher" }))).toBe(false);
    expect(passesFilters(job("Senior Backend Engineer"), f({ experience: "fresher" }))).toBe(false);
    expect(passesFilters(job("Senior Backend Engineer"), f({ experience: "senior" }))).toBe(true);
    expect(passesFilters(job("Designer"), f({ type: "full_time" }))).toBe(true); // no type stated: usually full-time
    expect(passesFilters(job("Designer"), f({ type: "internship" }))).toBe(false);
    expect(passesFilters(job("Designer", { isRemote: true }), f({ remoteOnly: true }))).toBe(true);
    expect(passesFilters(job("Designer"), f({ remoteOnly: true }))).toBe(false);
  });
});

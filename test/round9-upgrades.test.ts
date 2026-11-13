/** Round 9 upgrades: the fields that failed to fill in live round 8, with the option lists the live forms really show
 * (read-only probe e2e/probe-lists.spec.ts on Greenhouse, 2026-11-13). */

import { beforeAll, describe, expect, it } from "vitest";
import { fillForm, outsideUsOption, sourceOption } from "../src/content/agent";
import { decide } from "../src/content/classify";
import { decideWithMeaning } from "../src/content/meaning";
import { yesNoOption } from "../src/shared/text";
import type { AnswerEntry, FieldDescriptor, Profile } from "../src/shared/types";
import { countriesInLocation } from "../src/shared/countries";
import { mount, PROFILE } from "./fixtures";

const MENTIMETER = [
  "Yes, I am a Swedish resident or Swedish citizen",
  "Yes, I have a valid work permit and am eligible to work in Sweden - without further support from Mentimeter",
  "I have a valid work permit and am eligible to work in Sweden - but will require renewal assistance from Mentimeter sometime in the future.",
  "I have an EU Blue Card",
  "I do not have a valid work permit and would need visa sponsorship or assistance from Mentimeter upon employment",
];
const LUCID = ["Currently a contractor", "Previously a contractor", "Previously an employee", "Never been a contractor or an employee"];
const AIRBNB_SPONSOR = [
  "Yes, I will require immigration sponsorship now to legally work in the country where the job is located.",
  "Yes, I will require immigration sponsorship in the future to legally work in the country where the job is located.",
  "No, I do not and will not require immigration sponsorship to legally work in the country where the job is located.",
];

describe("Yes/No onto options worded as sentences", () => {
  it("No: the one option that says no in its own words", () => {
    expect(yesNoOption(MENTIMETER, "No")).toBe(MENTIMETER[4]);
    expect(yesNoOption(LUCID, "No")).toBe("Never been a contractor or an employee");
    expect(yesNoOption(["I am authorized to work in the US", "I am not authorized to work in the US"], "No")).toBe("I am not authorized to work in the US");
  });
  it("'No, and not willing to relocate' is not a plain No (Abridge, live round 9)", () => {
    const abridge = ["Yes", "No, but willing to relocating", "No, and not willing to relocating"];
    expect(yesNoOption(abridge, "No")).toBeUndefined();
    expect(yesNoOption(["Yes", "No, I do not require sponsorship"], "No")).toBe("No, I do not require sponsorship");
  });
  it("never: two no-options, 'Not applicable', 'I prefer not to say'", () => {
    expect(yesNoOption(["I am not a veteran", "I do not wish to answer", "I am a veteran"], "No")).toBe("I am not a veteran");
    expect(yesNoOption(["Yes", "Not applicable"], "No")).toBeUndefined();
    expect(yesNoOption(["I am a protected veteran", "I prefer not to say"], "No")).toBeUndefined();
    expect(yesNoOption(["I do not need sponsorship", "I have never needed it"], "No")).toBeUndefined();
  });
  it("Yes on a sponsorship question: 'Yes, I will require…', now or in the future from the user's own work permit", () => {
    expect(yesNoOption(AIRBNB_SPONSOR, "Yes")).toBeUndefined(); // no topic: a qualified yes stays for the user
    expect(yesNoOption(AIRBNB_SPONSOR, "Yes", { topic: "sponsorship" })).toBeUndefined(); // now or later unknown
    expect(yesNoOption(AIRBNB_SPONSOR, "Yes", { topic: "sponsorship", authorizedHere: false })).toBe(AIRBNB_SPONSOR[0]);
    expect(yesNoOption(AIRBNB_SPONSOR, "Yes", { topic: "sponsorship", authorizedHere: true })).toBe(AIRBNB_SPONSOR[1]);
    expect(yesNoOption(AIRBNB_SPONSOR, "No", { topic: "sponsorship" })).toBe(AIRBNB_SPONSOR[2]);
    // A "Yes, but…" is still not a plain yes, even on a sponsorship question.
    expect(yesNoOption(["Yes, but not now", "No"], "Yes", { topic: "sponsorship", authorizedHere: false })).toBeUndefined();
  });
  it("Yes on other questions keeps the old rule (a yes with conditions is not a plain yes)", () => {
    expect(yesNoOption(["Yes, but I will need sponsorship", "No"], "Yes", { topic: "work_authorization" })).toBeUndefined();
    expect(yesNoOption(MENTIMETER, "Yes")).toBeUndefined(); // two different yeses
  });
});

describe("other lists from round 8", () => {
  it("How did you hear: LinkedIn means the job search, not the advert", () => {
    const fivetran = ["Afrotech", "Glassdoor", "Indeed", "LinkedIn advertisement", "LinkedIn job search", "Other", "Referred"];
    expect(sourceOption(fivetran, "LinkedIn")).toBe("LinkedIn job search");
    expect(sourceOption(["LinkedIn post", "LinkedIn advertisement"], "LinkedIn")).toBeUndefined();
    expect(sourceOption(["Indeed", "LinkedIn"], "LinkedIn")).toBe("LinkedIn");
  });
  it("a US-states list: 'outside the United States' for a user abroad", () => {
    expect(outsideUsOption(["I am located outside the United States and its territories", "Alabama", "Alaska"])).toBe("I am located outside the United States and its territories");
    expect(outsideUsOption(["Alabama", "Alaska"])).toBeUndefined();
  });
  it("'degree classification' is not the degree question", () => {
    const f = { id: "q", key: "q", name: "", label: "What is your predicted/final degree classification?", control: "combobox", required: true, options: [], placeholder: "", hint: "", autocomplete: "" } as unknown as FieldDescriptor;
    expect(decide(f, PROFILE, [])).not.toMatchObject({ kind: "profile", key: "degree" });
  });
});

// ---------------------------------------------------------------------------------------------------------------
// Step 2: questions about the job's requirements, answered from the user's own saved facts (live round 8 wordings).

const baseFacts = { workCountries: "United States", needsFutureSponsorship: "No" as const, noticePeriod: "2 weeks", currentCtc: "", expectedCtc: "", relocate: "Yes" as const, heardFrom: "", gender: "" as const, hispanic: "" as const, race: "", veteran: "" as const, disability: "" as const, otherCountries: "sponsorship" as const, workMode: "any" as const, citizenship: "United States" };
const US = { ...PROFILE, country: "United States", location: "Austin, TX", state: "Texas", preferredLocations: "Austin, Remote", facts: baseFacts } as unknown as Profile;
const IN = { ...PROFILE, country: "India", location: "Pune", state: "Maharashtra", preferredLocations: "Pune, Remote", facts: { ...baseFacts, workCountries: "India", noticePeriod: "30 days", citizenship: "India" } } as unknown as Profile;
const q = (label: string, control = "radio", options: string[] = ["Yes", "No"]) =>
  ({ id: "q", key: "q", name: "", label, control, required: true, options, placeholder: "", hint: "", autocomplete: "" }) as unknown as FieldDescriptor;
const at = (...jobCountries: string[]) => ({ jobCountries, url: "https://job-boards.greenhouse.io/x/jobs/1" }) as never;

describe("jobs in countries the rules did not know", () => {
  it("Xendit (Bali, Bangkok, Jakarta): every country needs a visa → sponsorship Yes", () => {
    expect(countriesInLocation("Bali, Indonesia; Bangkok, Thailand; Jakarta, Indonesia")).toEqual(["Indonesia", "Thailand"]);
    expect(decideWithMeaning(q("Will you require visa sponsorship in the country in which this position is located?", "combobox"), IN, [], at("Indonesia", "Thailand"))).toMatchObject({ kind: "answer", value: "Yes" });
  });
  it("cities alone name their country; Porto Alegre is Brazil, not Portugal", () => {
    expect(countriesInLocation("Reykjavík")).toEqual(["Iceland"]);
    expect(countriesInLocation("Warsaw")).toEqual(["Poland"]);
    expect(countriesInLocation("Porto Alegre")).toEqual(["Brazil"]);
    expect(countriesInLocation("Lagos, Nigeria")).toEqual(["Nigeria"]);
  });
  it("authorized … and able to provide documentation: still one yes/no", () => {
    const label = "Are you legally authorized to work in the United States and able to provide documentation of work authorization upon hire?";
    expect(decideWithMeaning(q(label), US, [], at("United States"))).toMatchObject({ kind: "answer", value: "Yes" });
    expect(decideWithMeaning(q(label), IN, [], at("United States"))).toMatchObject({ kind: "answer", value: "No" });
  });
});

describe("where the user lives and works", () => {
  it("based in a list of countries: yes or no from the Profile country", () => {
    expect(decideWithMeaning(q("Are you based in the United States or Canada?", "radio", ["No", "Yes"]), US, [])).toMatchObject({ kind: "answer", value: "Yes" });
    expect(decideWithMeaning(q("Are you based in the United States or Canada?", "radio", ["No", "Yes"]), IN, [])).toMatchObject({ kind: "answer", value: "No" });
  });
  it("'will you be based…' and 'please confirm you're based…': only a yes for a user who lives there", () => {
    expect(decideWithMeaning(q("If hired by Warp, will you be based in the U.S. or Canada?", "combobox"), US, [])).toMatchObject({ kind: "answer", value: "Yes" });
    expect(decideWithMeaning(q("If hired by Warp, will you be based in the U.S. or Canada?", "combobox"), IN, [])).not.toMatchObject({ kind: "answer" });
    const confirm = q("Due to current team needs, we are only considering candidates based in the USA. Please confirm you're based in the USA.", "combobox", ["Yes, I'm currently based in the USA.", "No, but I am planning on relocating to the USA."]);
    expect(decideWithMeaning(confirm, US, [])).toMatchObject({ kind: "answer", value: "Yes, I'm currently based in the USA." });
    expect(decideWithMeaning(confirm, IN, [])).not.toMatchObject({ kind: "answer" });
  });
  it("the office in the user's own city; any other office is theirs to choose", () => {
    const offices = ["Austin, Texas, USA", "Bengaluru, India", "Bristol, UK"];
    expect(decideWithMeaning(q("Which of our offices would you prefer to work from?", "combobox", offices), US, [])).toMatchObject({ kind: "answer", value: "Austin, Texas, USA" });
    expect(decideWithMeaning(q("Which of our offices would you prefer to work from?", "combobox", ["Atlanta", "New York"]), US, [])).not.toMatchObject({ kind: "answer" });
  });
  it("hybrid or on-site in another city: yes for a user willing to relocate, in a country they may work in", () => {
    expect(decideWithMeaning(q("Are you able to work hybrid in our NYC office 3 days a week?", "combobox"), US, [], at("United States"))).toMatchObject({ kind: "answer", value: "Yes" });
    expect(decideWithMeaning(q("This position is 100% on-site in Pleasanton, CA (Monday–Friday). Are you able to meet this requirement?"), US, [], at("United States"))).toMatchObject({ kind: "answer", value: "Yes" });
    // Not willing to relocate, or a country that needs a visa: theirs to say.
    const stay = { ...US, facts: { ...baseFacts, relocate: "No" } } as unknown as Profile;
    expect(decideWithMeaning(q("Are you able to work hybrid in our NYC office 3 days a week?", "combobox"), stay, [], at("United States"))).not.toMatchObject({ kind: "answer" });
    expect(decideWithMeaning(q("This is a full-time, in-office position based in Stevenage, Hertfordshire. Are you available to work onsite full-time?"), US, [], at("United Kingdom"))).not.toMatchObject({ kind: "answer" });
    // Where they live now is a fact, not a plan.
    expect(decideWithMeaning(q("Are you based in NYC (5 boroughs)? We go into our downtown office 2x a week.", "radio"), US, [], at("United States"))).not.toMatchObject({ kind: "answer", value: "Yes" });
  });
  it("relocation questions the plain answer did not cover", () => {
    expect(decideWithMeaning(q("Would you need to relocate to work regularly from this office?", "combobox", ["Yes", "No", "Unsure"]), IN, [], at("United Kingdom"))).toMatchObject({ kind: "answer", value: "Yes" });
    expect(decideWithMeaning(q("Would you need to relocate to work regularly from this office?", "combobox", ["Yes", "No", "Unsure"]), US, [], at("United States"))).not.toMatchObject({ kind: "answer" });
    // Graphcore's offices include Austin: a list of offices is the user's to answer.
    expect(decideWithMeaning(q("Would you need to relocate to work regularly from one of these Offices?", "combobox", ["Yes", "No", "Unsure"]), US, [], at("United Kingdom"))).not.toMatchObject({ kind: "answer" });
    expect(decideWithMeaning(q("If you live outside of the Detroit area, are you open to relocation?", "combobox", ["Yes", "No", "N/A"]), IN, [])).toMatchObject({ kind: "answer", value: "Yes" });
    const bill = ["Yes, I currently reside in one of the eligible states", "No, but I am open to relocating to an eligible state", "No, I am not open to relocation"];
    expect(decideWithMeaning(q("Are you currently located in, or open to relocating to, one BILL's remote-eligible states?", "combobox", bill), IN, [], at("United States"))).toMatchObject({ kind: "answer", value: bill[1] });
    expect(decideWithMeaning(q("Are you currently located in, or open to relocating to, one BILL's remote-eligible states?", "combobox", bill), US, [], at("United States"))).not.toMatchObject({ kind: "answer" });
  });
});

describe("live round 10", () => {
  it("countries named only as examples are not the job's country (New Relic, Tokyo)", () => {
    const label = "Do you now or will you in the future require sponsorship for or assistance with an employment visa, authorization, or permit to work for or continue to work for New Relic in this role (e.g. U.S. F-1, H-1B, TN, E-3, or other non-immigrant visa category)?";
    expect(decideWithMeaning(q(label, "combobox"), US, [], at("Japan"))).toMatchObject({ kind: "answer", value: "Yes" });
    expect(decideWithMeaning(q(label, "combobox"), US, [], at("United States"))).toMatchObject({ kind: "answer", value: "No" });
  });
  it("variable pay, commission or bonus is never the salary expectation", () => {
    const paid = { ...US, facts: { ...baseFacts, expectedCtc: "120000" } } as unknown as Profile;
    expect(decideWithMeaning(q("What is your expected annual variable compensation (ex. commission)?", "text", []), paid, [], at("United States"))).not.toMatchObject({ kind: "answer" });
    expect(decideWithMeaning(q("What is your expected salary?", "text", []), paid, [], at("United States"))).toMatchObject({ kind: "answer" });
  });
  it("'employed or refused employment by…' is not answered from the work history", () => {
    expect(decideWithMeaning(q("Have you ever been employed or refused employment by Couples Negril?", "combobox"), US, [], at("Jamaica"))).not.toMatchObject({ kind: "answer" });
    // The question model's path too (it reads these as previous-employer questions).
    expect(decideWithMeaning(q("Have you ever been employed or refused employment by Couples Sans Souci?", "combobox"), US, [], at("Jamaica"), { intent: "previous_employee", confidence: 0.99 } as never)).not.toMatchObject({ kind: "answer" });
  });
});

describe("notice period and names", () => {
  it("'Do you have a notice period…', 'If offered… how soon…', the earliest start date", () => {
    expect(decideWithMeaning(q("Do you have a notice period at your current job before being able to start a new role?"), IN, [])).toMatchObject({ kind: "answer", value: "Yes" });
    // Two questions in one box (Watershed, live round 9): a bare "Yes" would leave the second unanswered.
    expect(decideWithMeaning(q("Do you currently have a notice period? When would you available to start?", "text", []), IN, [])).not.toMatchObject({ kind: "answer", value: "Yes" });
    expect(decideWithMeaning(q("If offered this position, how soon are you available to start?", "text", []), IN, [])).toMatchObject({ kind: "answer", value: "30 days" });
    const start = decideWithMeaning(q("What is your earliest possible start date?", "date", []), IN, []);
    expect(start).toMatchObject({ kind: "answer" });
    const days = Math.round((Date.parse((start as { value: string }).value) - Date.now()) / 86_400_000);
    expect(days).toBeGreaterThanOrEqual(29);
    expect(days).toBeLessThanOrEqual(31);
    // A last day is not a start date.
    expect(decideWithMeaning(q("What is your last working day?", "date", []), IN, [])).not.toMatchObject({ kind: "answer" });
  });
  it("'Name (first & last)' is the full name; 'Passport Country' is the citizenship, never the home country", () => {
    expect(decideWithMeaning(q("Name (first & last)", "text", []), US, [])).toMatchObject({ kind: "profile", value: `${US.firstName} ${US.lastName}` });
    const abroad = { ...US, facts: { ...baseFacts, citizenship: "India" } } as unknown as Profile;
    expect(decideWithMeaning(q("Passport Country", "text", []), abroad, [])).toMatchObject({ kind: "answer", value: "India" });
    expect(decideWithMeaning(q("Passport Country", "text", []), { ...US, facts: { ...baseFacts, citizenship: "" } } as unknown as Profile, [])).not.toMatchObject({ kind: "profile" });
  });
});

/** A react-select as Greenhouse renders it (see live1000-fixes.test.ts). */
const reactSelect = (id: string, label: string) => `
  <div class="field"><label id="${id}-label" for="${id}">${label}</label>
    <div class="select__container"><div class="select__control"><div class="select__value-container">
      <input id="${id}" role="combobox" aria-expanded="false">
    </div></div></div></div>`;
function opensLate(id: string, options: string[]): void {
  const box = document.getElementById(id) as HTMLInputElement;
  box.addEventListener("input", () => setTimeout(() => {
    const container = box.closest(".select__container")!;
    if (container.querySelector(".select__menu")) return;
    box.setAttribute("aria-controls", `react-select-${id}-listbox`);
    container.insertAdjacentHTML("beforeend", `<div class="select__menu"><div role="listbox" id="react-select-${id}-listbox">${options.map((o) => `<div class="select__option" role="option">${o}</div>`).join("")}</div></div>`);
  }, 60));
}

describe("fill: the round 8 failures on react-select lists", () => {
  beforeAll(() => {
    document.addEventListener("click", (e) => {
      const option = (e.target as HTMLElement).closest(".select__option");
      const container = option?.closest(".select__container");
      if (!option || !container) return;
      container.querySelector(".select__value-container")!.insertAdjacentHTML("afterbegin", `<div class="select__single-value">${option.textContent}</div>`);
      container.querySelector(".select__menu")?.remove();
      // Like many school lists: "Other" opens a box for the school's name.
      if (option.textContent === "Other" && container.closest(".field")?.querySelector("label")?.textContent === "School") {
        container.closest(".field")!.insertAdjacentHTML("afterend", `<div class="field"><label for="other_school">Other school name</label><input id="other_school" type="text"></div>`);
      }
    });
  });

  it("a school not in the list: 'Other', the name typed in the box it opens, flagged for the user", async () => {
    mount(`<form id="application-form">${reactSelect("school", "School")}</form>`);
    opensLate("school", ["Aalborg University", "Christian Brothers University", "Other"]);
    const report = await fillForm(document, { profile: { ...PROFILE, school: "Savitribai Phule Pune University" }, answers: [], mode: "review" });
    const school = report.fields.find((r) => r.field.label === "School")!;
    expect(school).toMatchObject({ status: "filled", review: true });
    expect(school.detail).toMatch(/not in this list: chose "Other" and typed it/);
    expect((document.getElementById("other_school") as HTMLInputElement).value).toBe("Savitribai Phule Pune University");
  }, 30_000);

  it("a listed school is still picked by name (never 'Other')", async () => {
    mount(`<form id="application-form">${reactSelect("school", "School")}</form>`);
    opensLate("school", ["Aalborg University", "Aalto University", "Other"]);
    const report = await fillForm(document, { profile: { ...PROFILE, school: "Aalto University" }, answers: [], mode: "review" });
    expect(report.fields.find((r) => r.field.label === "School")).toMatchObject({ status: "filled", detail: undefined });
  }, 30_000);

  it("Mentimeter: 'No' (not allowed to work in Sweden) picks the no-permit sentence", async () => {
    mount(`<form id="application-form">${reactSelect("q1", "Are you legally eligible to work in Sweden?*")}</form>`);
    opensLate("q1", MENTIMETER);
    const answers: AnswerEntry[] = [{ question: "Are you legally authorized to work in Sweden?", answer: "No", topic: "work_authorization", country: "Sweden", updatedAt: "2026-11-13T00:00:00Z" }];
    const report = await fillForm(document, { profile: PROFILE, answers, mode: "review", page: { jobCountries: ["Sweden"], url: "" } });
    expect(report.fields[0]).toMatchObject({ status: "filled", detail: `chose "${MENTIMETER[4]}"` });
  }, 30_000);

  it("Airbnb: sponsorship 'Yes' for a user not allowed to work in the US picks 'now'", async () => {
    const label = "Will you now or in the future require company sponsorship to retain or extend your work authorization in the country where the job is located?";
    mount(`<form id="application-form">${reactSelect("q2", label)}</form>`);
    opensLate("q2", AIRBNB_SPONSOR);
    const answers: AnswerEntry[] = [
      { question: "Are you legally authorized to work in the United States?", answer: "No", topic: "work_authorization", country: "United States", updatedAt: "2026-11-13T00:00:00Z" },
      { question: "Will you now or in the future require visa sponsorship to work in the United States?", answer: "Yes", topic: "sponsorship", country: "United States", updatedAt: "2026-11-13T00:00:00Z" },
    ];
    const report = await fillForm(document, { profile: { ...PROFILE, country: "India" }, answers, mode: "review", page: { jobCountries: ["United States"], url: "" } });
    expect(report.fields[0]).toMatchObject({ status: "filled", detail: `chose "${AIRBNB_SPONSOR[0]}"` });
  }, 30_000);
});

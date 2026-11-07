/** Regressions from the 1,000-form live run (reports/live1000, scripts/live1000-audit.mjs): wrong fills found on real
 * Greenhouse and Ashby forms, with the forms' own wordings. */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { fillForm } from "../src/content/agent";
import { decide, questionTopic } from "../src/content/classify";
import { isDeclineAnswer, type PageFacts } from "../src/content/facts";
import { decideWithMeaning } from "../src/content/meaning";
import { bestOption } from "../src/shared/text";
import type { AnswerEntry, FieldDescriptor } from "../src/shared/types";
import { fillCombobox } from "../src/content/fill";
import { mount, PROFILE } from "./fixtures";

/** A react-select widget as the new Greenhouse job boards render it: the box names its list only while it is open. */
const reactSelect = (id: string, label: string, open: string[] = []) => `
  <div class="field"><label id="${id}-label" for="${id}">${label}</label>
    <div class="select__container"><div class="select__control"><div class="select__value-container">
      <input id="${id}" role="combobox" aria-expanded="${open.length > 0}" ${open.length ? `aria-controls="react-select-${id}-listbox"` : ""}>
    </div></div>
    ${open.length ? `<div class="select__menu"><div role="listbox" id="react-select-${id}-listbox">${open.map((o) => `<div class="select__option" role="option">${o}</div>`).join("")}</div></div>` : ""}
    </div></div>`;

/** The question's own list opens 60 ms after typing, like a real react-select re-render. */
function opensLate(id: string, options: string[]): void {
  const box = document.getElementById(id) as HTMLInputElement;
  box.addEventListener("input", () => setTimeout(() => {
    const container = box.closest(".select__container")!;
    if (container.querySelector(".select__menu")) return;
    box.setAttribute("aria-controls", `react-select-${id}-listbox`);
    container.insertAdjacentHTML("beforeend", `<div class="select__menu"><div role="listbox" id="react-select-${id}-listbox">${options.map((o) => `<div class="select__option" role="option">${o}</div>`).join("")}</div></div>`);
  }, 60));
}

/** Like react-select: a click on an option shows it beside its own box and closes its own list. */
function reactSelectClicks(): void {
  document.addEventListener("click", (e) => {
    const option = (e.target as HTMLElement).closest(".select__option");
    const container = option?.closest(".select__container");
    if (!option || !container) return;
    container.querySelector(".select__value-container")!.insertAdjacentHTML("afterbegin", `<div class="select__single-value">${option.textContent}</div>`);
    container.querySelector(".select__menu")?.remove();
  });
}

describe("live run: a dropdown never picks from another field's open list", () => {
  beforeAll(reactSelectClicks);

  it("agoda / careem: 'In which country/region are you currently based?' picks India from its own list, not the phone's India+91", async () => {
    mount(reactSelect("country", "Country", ["India+91", "Indonesia+62"]) + reactSelect("question_69032103", "In which country/region are you currently based?"));
    opensLate("question_69032103", ["India", "British Indian Ocean Territory"]);
    const out = await fillCombobox(document.getElementById("question_69032103") as HTMLInputElement, "India", 3000);
    expect(out).toMatchObject({ ok: true, chosen: "India" });
  });

  it("brex: 'What country are you based in?' without India in its options is left for the user (not India+91 from the phone list)", async () => {
    mount(reactSelect("country", "Country", ["India+91", "Indonesia+62"]) + reactSelect("question_38956968002", "What country are you based in?"));
    opensLate("question_38956968002", ["Brazil", "Canada", "USA", "Netherlands", "United Kingdom", "Other"]);
    const out = await fillCombobox(document.getElementById("question_38956968002") as HTMLInputElement, "India", 2000);
    expect(out.ok).toBe(false);
    expect(out.chosen).toBeUndefined();
  });

  it("an open list no field names, sitting in another dropdown's widget, is not this field's", async () => {
    mount(`${reactSelect("country", "Country", ["India+91"]).replace(/aria-controls="[^"]*"/, "")}${reactSelect("q", "Country of residence")}`);
    opensLate("q", ["India", "Ireland"]);
    expect(await fillCombobox(document.getElementById("q") as HTMLInputElement, "India", 3000)).toMatchObject({ ok: true, chosen: "India" });
  });

  it("a react-select that shows nothing after the pick is not reported as filled", async () => {
    // The pick reaches a list that is not this box's (portal, no names): the box itself shows nothing chosen.
    mount(`${reactSelect("q2", "Country of residence")}<div class="portal"><div class="select__option" role="option">India+91</div></div>`);
    expect(await fillCombobox(document.getElementById("q2") as HTMLInputElement, "India", 1500)).toMatchObject({ ok: false });
  });
});

const field = (label: string, control: FieldDescriptor["control"] = "combobox", options: string[] = []): FieldDescriptor =>
  ({ key: label, label, name: "q", control, required: true, options, autocomplete: "", placeholder: "" });
const SAVED: AnswerEntry[] = [{ question: "How did you hear about this job?", answer: "LinkedIn", updatedAt: "2026-11-07T00:00:00Z" }];

describe("live run: 'How did you hear' in the wordings real forms use reuses the saved answer", () => {
  for (const label of [
    "How did you first hear about Cockroach Labs?", // cockroachlabs
    "How did you first learn about Affirm as an employer?", // affirm
    "How did you first hear about Graphcore?", // graphcore
    "Where did you see or hear about this job?",
    "How did your hear about this position?", // a typo on a live form
  ]) {
    it(label, () => {
      expect(decide(field(label, label.startsWith("How did your") ? "text" : "combobox"), PROFILE, SAVED)).toMatchObject({ kind: "answer", value: "LinkedIn" });
    });
  }
  it("a referral follow-up or a familiarity question is not 'How did you hear'", () => {
    expect(decide(field("If you heard about us through a referral, please state the Brex employee's name.", "text"), PROFILE, SAVED)).not.toMatchObject({ kind: "answer" });
    expect(decide(field("Before seeing this job posting, how familiar were you with Faire as a company?"), PROFILE, SAVED)).not.toMatchObject({ kind: "answer" });
  });
});

const DECLINES: AnswerEntry[] = [
  { question: "Gender", answer: "Decline to self identify", topic: "gender", updatedAt: "2026-11-07T00:00:00Z" },
  { question: "Race / Ethnicity", answer: "Decline to self identify", topic: "race", updatedAt: "2026-11-07T00:00:00Z" },
];

describe("live run: a saved EEO decline answers the same topic in lists whose choices show only once opened", () => {
  it("decide: 'Are you Hispanic/Latino?' (Greenhouse react-select, no choices yet) reuses the saved race decline", () => {
    expect(decide(field("Are you Hispanic/Latino?"), PROFILE, DECLINES)).toMatchObject({ kind: "answer", value: "Decline to self identify" });
    expect(decide(field("How do you identify your gender?"), PROFILE, DECLINES)).toMatchObject({ kind: "answer", value: "Decline to self identify" });
  });

  it("decide: a saved non-decline is never typed into a list whose choices are unknown, and topics without an answer stay asked", () => {
    const female: AnswerEntry[] = [{ question: "Gender", answer: "Female", topic: "gender", updatedAt: "2026-11-07T00:00:00Z" }];
    expect(decide(field("How do you identify your gender?"), PROFILE, female)).toMatchObject({ kind: "ask" });
    expect(decide(field("Do you identify as transgender?"), PROFILE, DECLINES)).toMatchObject({ kind: "ask" });
    expect(decide(field("How would you describe your sexual orientation?"), PROFILE, DECLINES)).toMatchObject({ kind: "ask" });
    expect(decide(field("Are you Hispanic/Latino?", "text"), PROFILE, DECLINES)).not.toMatchObject({ kind: "answer" });
  });

  it("fill: picks only a declining choice; a list without one is left for the user", async () => {
    mount();
    document.getElementById("application-form")!.insertAdjacentHTML("beforeend",
      reactSelect("hispanic_ethnicity", "Are you Hispanic/Latino?") + reactSelect("gender_identity", "How do you identify your gender?"));
    opensLate("hispanic_ethnicity", ["Yes", "No", "Decline To Self Identify"]);
    opensLate("gender_identity", ["Man", "Woman", "Non-binary"]);
    const report = await fillForm(document, { profile: PROFILE, answers: DECLINES, mode: "review" });
    const hispanic = report.fields.find((r) => r.field.label === "Are you Hispanic/Latino?")!;
    const gender = report.fields.find((r) => r.field.label === "How do you identify your gender?")!;
    expect(hispanic).toMatchObject({ status: "filled", detail: 'chose "Decline To Self Identify"' });
    expect(gender.status).not.toBe("filled");
  }, 30_000);
});

const COUNTRY_SAVED: AnswerEntry[] = [
  { question: "Are you legally authorized to work in India?", answer: "Yes", topic: "work_authorization", country: "India", updatedAt: "2026-11-07T00:00:00Z" },
  { question: "Will you now or in the future require visa sponsorship to work in the United States?", answer: "Yes", topic: "sponsorship", country: "United States", updatedAt: "2026-11-07T00:00:00Z" },
];
const US_JOB = { jobCountries: ["United States"], url: "https://job-boards.greenhouse.io/x/jobs/1", company: "x" };
const INDIA_JOB = { jobCountries: ["India"], url: "https://job-boards.greenhouse.io/apolloio/jobs/1", company: "apolloio" };
const INDIA_PROFILE = { ...PROFILE, country: "India", location: "Pune" };

describe("live run: a saved answer about one country answers the same plain question about that country", () => {
  for (const label of [
    "Will you now or in the future require sponsorship for employment visa status?", // checkr, starburst
    "Do you require visa sponsorship?", // anthropic
    "Will you now or in the future require sponsorship to work in the US?", // attentive
    "WILL YOU NOW OR IN THE FUTURE REQUIRE SPONSORSHIP FOR EMPLOYMENT VISA STATUS (E.G., H-1B, TN, E-3, F-1 VISA STATUS)?", // billcom
    "Do you now or in the future require visa sponsorship to continue working in the country where this position is located?", // carta
    "Will you now or in the future require immigration sponsorship to work for Instacart?", // instacart
  ]) {
    it(`US job: ${label}`, () => {
      expect(decide(field(label), INDIA_PROFILE, COUNTRY_SAVED, US_JOB)).toMatchObject({ kind: "answer", value: "Yes" });
    });
  }
  it("India job / residence: 'authorized to work' takes the saved India answer", () => {
    expect(decide(field("Are you legally authorized to work in the country/state/province where this position is located?"), INDIA_PROFILE, COUNTRY_SAVED, INDIA_JOB)).toMatchObject({ kind: "answer", value: "Yes" });
    expect(decide(field("Are you legally authorized to work in your country of residence?"), INDIA_PROFILE, COUNTRY_SAVED, US_JOB)).toMatchObject({ kind: "answer", value: "Yes" });
  });
  it("chooses the matching yes/no choice when the choices are listed", () => {
    expect(decide(field("Do you require visa sponsorship?", "radio", ["No", "Yes"]), INDIA_PROFILE, COUNTRY_SAVED, US_JOB)).toMatchObject({ kind: "answer", value: "Yes" });
    // A qualified choice is never read as a plain yes (existing yesNoOption rule): left for the user.
    expect(decide(field("Do you require visa sponsorship?", "radio", ["Yes, I will require sponsorship", "No, I will not require sponsorship"]), INDIA_PROFILE, COUNTRY_SAVED, US_JOB)).not.toMatchObject({ kind: "answer" });
  });
  for (const [label, page, why] of [
    ["Will you now or in the future require sponsorship for a visa to remain in your current location?", US_JOB, "gitlab: about where the user lives (India), not the US job"],
    ["Will you now or in the future require employer sponsorship to work in that country?", US_JOB, "cribl: 'that country' is an earlier answer"],
    ["Your authorization to work in the country where you live. Please choose the option that describes your work authorization.", US_JOB, "vercel: wants a status"],
    ["Are you legally authorized to work in the United States?", US_JOB, "no saved answer about US authorization"],
    ["Do you require sponsorship to work in Canada?", US_JOB, "another country than the saved one"],
    ["Will you NOT require sponsorship now or in the future?", US_JOB, "turned round"],
    ["Do you require visa sponsorship?", { ...US_JOB, jobCountries: ["United States", "Canada"] }, "a job in two countries"],
    ["Do you require visa sponsorship?", { ...US_JOB, jobCountries: [] }, "the job's country is unknown"],
    ["Are you legally authorized to work in the country where this job is located? If not, will you require sponsorship?", INDIA_JOB, "two questions"],
    ["If you require sponsorship, which visa do you hold?", US_JOB, "a follow-up wanting details"],
  ] as Array<[string, PageFacts, string]>) {
    it(`left for the user: ${why}`, () => {
      expect(decide(field(label), INDIA_PROFILE, COUNTRY_SAVED, page)).not.toMatchObject({ kind: "answer" });
    });
  }
});

describe("live run: where the user intends to work is not where they live", () => {
  it("ashby (Engineering Manager - EU): 'Which country do you intend to work from?' is left for the user", () => {
    expect(decideWithMeaning(field("Which country do you intend to work from?", "text"), INDIA_PROFILE, [])).not.toMatchObject({ kind: "profile" });
    expect(decideWithMeaning(field("Which city are you planning to work from?", "text"), INDIA_PROFILE, [])).not.toMatchObject({ kind: "profile" });
  });
  it("temporal / zapier / xai / launchdarkly / supabase wordings are left for the user", () => {
    for (const label of ["What location do you intend to work from?", "What city/country will you work from?", "What country are you planning to work from?",
      "Where is your permanent (City, Country) work location?", "Passport Country", "Country of citizenship"]) {
      expect(decideWithMeaning(field(label, "text"), INDIA_PROFILE, [])).not.toMatchObject({ kind: "profile" });
    }
  });
  it("where the user is based is still filled", () => {
    expect(decideWithMeaning(field("What country are you based in?", "text"), INDIA_PROFILE, [])).toMatchObject({ kind: "profile", key: "country", value: "India" });
    expect(decideWithMeaning(field("Location (City)", "text"), INDIA_PROFILE, [])).toMatchObject({ kind: "profile", key: "location", value: "Pune" });
  });
});

describe("live run: a saved decline never becomes 'Other'", () => {
  it("quora: 'How would you describe your gender identity?' (Male / Female / Non Binary / Other / I prefer not to say)", () => {
    const options = ["Male", "Female", "Non Binary", "Other", "I prefer not to say"];
    expect(decide(field("How would you describe your gender identity?", "radio", options), PROFILE, DECLINES)).toMatchObject({ kind: "answer", value: "I prefer not to say" });
    expect(bestOption(options, "Decline to self identify")).toBe("I prefer not to say");
  });
  it("a list with no declining choice is left for the user", () => {
    expect(decide(field("How would you describe your gender identity?", "radio", ["Male", "Female", "Non Binary", "Other"]), PROFILE, DECLINES)).not.toMatchObject({ kind: "answer" });
    expect(bestOption(["He/him", "She/her", "They/them", "Other"], "Decline to self identify")).not.toBe("Other");
  });
});

describe("live run: a graduate is never filled in as enrolled", () => {
  it("ashby (Apprentice): 'In which school are you enrolled for this work-study program (apprentissage)?' is left for the user", () => {
    // The guard existed, but its \b had become backspace characters in the source, so it never matched.
    expect(decideWithMeaning(field("In which school are you enrolled for this work-study program (apprentissage) ?", "text"), INDIA_PROFILE, [])).not.toMatchObject({ kind: "profile" });
    expect(decideWithMeaning(field("What degree are you currently pursuing?", "text"), INDIA_PROFILE, [])).not.toMatchObject({ kind: "profile" });
    expect(decideWithMeaning(field("School", "text"), { ...INDIA_PROFILE, school: "State Technical University" }, [])).toMatchObject({ kind: "profile", key: "school" });
  });

  it("no source file holds control characters (a \\b written as a backspace breaks a regex silently)", () => {
    const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]);
    const bad = walk("src").filter((f) => /\.(ts|js|mjs)$/.test(f)).filter((f) => /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(readFileSync(f, "utf8")));
    expect(bad).toEqual([]);
  });
});

describe("live run: values the page clears after the fill are typed again or reported", () => {
  it("greenhouse: first name emptied by the page while later fields are typed is typed again", async () => {
    mount();
    // Like a stale React state update landing mid-fill: the first name typed earlier is reset once.
    let resets = 0;
    document.getElementById("email")!.addEventListener("input", () => {
      if (resets++ === 0) (document.getElementById("first_name") as HTMLInputElement).value = "";
    });
    const report = await fillForm(document, { profile: PROFILE, answers: [], mode: "review" });
    const first = report.fields.find((r) => r.field.label === "First Name")!;
    expect(first.status).toBe("filled");
    expect((document.getElementById("first_name") as HTMLInputElement).value).toBe("Asha");
  });

  it("a value the page keeps clearing is reported as not filled (never 'filled' with an empty box)", async () => {
    mount();
    const box = document.getElementById("last_name") as HTMLInputElement;
    // The page empties the last name when the email is typed, and again when the last name is typed a second time.
    document.getElementById("email")!.addEventListener("input", () => { box.value = ""; });
    let changes = 0;
    box.addEventListener("change", () => { if (changes++ > 0) box.value = ""; });
    const report = await fillForm(document, { profile: PROFILE, answers: [], mode: "review" });
    const last = report.fields.find((r) => r.field.label === "Last Name")!;
    expect(box.value).toBe("");
    expect(last.status).not.toBe("filled");
  });
});

// The run on the fixed code (1,180 live forms, 2026-11-08): the two wrong fills left.
describe("live run 2: marketing signups and 'closest office' questions", () => {
  it("stripe: the page's newsletter email box ('Get industry insights and updates from Stripe') is never filled", () => {
    const f = { ...field("Get industry insights and updates from Stripe", "email"), name: "email" };
    expect(decideWithMeaning(f, INDIA_PROFILE, [])).not.toMatchObject({ kind: "profile" });
    for (const label of ["Subscribe to our newsletter", "Join our talent community", "Sign up for job alerts", "Keep me posted about future roles"]) {
      expect(decideWithMeaning(field(label, "email"), INDIA_PROFILE, [])).not.toMatchObject({ kind: "profile" });
    }
  });
  it("the application's own email box is still filled", () => {
    expect(decideWithMeaning(field("Email", "email"), INDIA_PROFILE, [])).toMatchObject({ kind: "profile", key: "email" });
  });
  it("cohere: 'Which location are you the closest to?' (their offices) is left for the user", () => {
    for (const label of ["Which location are you the closest to?", "Which office are you nearest to?", "Preferred office location", "Which hub would you work from?"]) {
      expect(decideWithMeaning(field(label, "text"), INDIA_PROFILE, [])).not.toMatchObject({ kind: "profile" });
    }
  });
});

/** Like a real react-select: the list shows only the choices that contain what is typed (all of them for an empty
 * search), and "No options" when none does. */
function filters(id: string, options: string[]): void {
  const box = document.getElementById(id) as HTMLInputElement;
  const render = () => {
    const container = box.closest(".select__container")!;
    container.querySelector(".select__menu")?.remove();
    const shown = options.filter((o) => o.toLowerCase().includes(box.value.trim().toLowerCase()));
    box.setAttribute("aria-controls", `react-select-${id}-listbox`);
    container.insertAdjacentHTML("beforeend", `<div class="select__menu"><div role="listbox" id="react-select-${id}-listbox">${
      shown.length ? shown.map((o) => `<div class="select__option" role="option">${o}</div>`).join("") : `<div class="select__menu-notice--no-options">No options</div>`}</div></div>`);
  };
  box.addEventListener("input", () => setTimeout(render, 40));
  box.addEventListener("keydown", (e) => { if ((e as KeyboardEvent).key === "ArrowDown") setTimeout(render, 40); });
}

// Live run 2 (2026-11-08): 71 EEO lists failed with "no option matches 'I do not want to answer'": the saved decline
// was typed first, the list filtered to nothing, and the time ran out before a search that finds the list's own decline.
describe("live run 2: a saved decline finds the list's own decline wording", () => {
  beforeAll(reactSelectClicks);
  for (const [saved, listed] of [["I do not want to answer", "I don't wish to answer"], ["Decline to self identify", "I prefer not to say"], ["I don't wish to answer", "Decline To Self Identify"]] as Array<[string, string]>) {
    it(`saved "${saved}" picks "${listed}" in a filtering list`, async () => {
      mount();
      document.getElementById("application-form")!.insertAdjacentHTML("beforeend", reactSelect("disability_status", "Please indicate your disability status") + reactSelect("gender_identity", "What is your gender identity?"));
      filters("disability_status", ["Yes, I have a disability (or previously had a disability)", "No, I do not have a disability and have not had one in the past", listed]);
      filters("gender_identity", ["Male", "Female", listed]);
      const answers: AnswerEntry[] = [
        { question: "Disability status", answer: saved, topic: "disability", updatedAt: "2026-11-08T00:00:00Z" },
        { question: "Gender", answer: saved, topic: "gender", updatedAt: "2026-11-08T00:00:00Z" },
      ];
      const report = await fillForm(document, { profile: PROFILE, answers, mode: "review" });
      for (const label of ["Please indicate your disability status", "What is your gender identity?"]) {
        expect(report.fields.find((r) => r.field.label === label)).toMatchObject({ status: "filled", detail: `chose "${listed}"` });
      }
    }, 30_000);
  }
  it("a list without any declining choice is still left for the user", async () => {
    mount();
    document.getElementById("application-form")!.insertAdjacentHTML("beforeend", reactSelect("gender_identity", "What is your gender identity?"));
    filters("gender_identity", ["Male", "Female", "Non-binary"]);
    const report = await fillForm(document, { profile: PROFILE, answers: [{ question: "Gender", answer: "I do not want to answer", topic: "gender", updatedAt: "2026-11-08T00:00:00Z" }], mode: "review" });
    expect(report.fields.find((r) => r.field.label === "What is your gender identity?")!.status).not.toBe("filled");
  }, 30_000);
});

describe("live run 2: declines in other languages", () => {
  it.each(["Prefiero no responder", "Prefiro não responder", "Je préfère ne pas répondre", "Keine Angabe", "Preferisco non rispondere", "Zeg ik liever niet", "回答しない", "不愿透露", "I don't wish to answer"])("%s is a decline", (s) => {
    expect(isDeclineAnswer(s)).toBe(true);
  });
  it.each(["Si", "Não", "Mulher Cis", "Other", "Outra", "Yes", "No, I do not have a disability"])("%s is not a decline", (s) => {
    expect(isDeclineAnswer(s)).toBe(false);
  });
  it("c6bank: a saved decline picks 'Prefiro não responder' from the gender list", () => {
    const options = ["Mulher Cis", "Mulher Trans", "Homem Cis", "Homem Trans", "Não-Binário", "Outra", "Prefiro não responder"];
    expect(decide(field("Qual a sua identidade de gênero?", "select", options), PROFILE, DECLINES)).toMatchObject({ kind: "answer", value: "Prefiro não responder" });
  });
});

describe("live run 2: Brazilian race question", () => {
  it("'Raça/Cor' is a race question (asked, or a saved decline reused), never a free guess", () => {
    expect(questionTopic("Raça/Cor")).toBe("race");
    expect(questionTopic("¿Cuál es tu raza?")).toBe("race");
    expect(questionTopic("Qual a cor do seu carro?")).toBeUndefined();
  });
});

// Live run 3 (2026-11-08, Quick answers on): Affirm, a US job; the user may work in India only and said "No" to "Will
// you need sponsorship in the future?" (meaning in India). The extension answered "No" to US sponsorship questions.
describe("live run 3: the future-sponsorship Quick answer is only about the user's own work countries", () => {
  const facts = { workCountries: "India", needsFutureSponsorship: "No" as const, noticePeriod: "", currentCtc: "", expectedCtc: "", relocate: "" as const, heardFrom: "", gender: "" as const, hispanic: "" as const, race: "", veteran: "" as const, disability: "" as const };
  const me = { ...INDIA_PROFILE, facts };
  const yn = (label: string) => field(label, "select", ["Yes", "No"]);
  it("a US sponsorship question is never answered No for a user who may not work in the US", () => {
    for (const label of ["Do you require immigration sponsorship to work for Affirm in the United States?",
      "Will you require immigration sponsorship at any point in the future to maintain authorization to work in the United States?"]) {
      expect(decide(yn(label), me, [], US_JOB as PageFacts)).not.toMatchObject({ kind: "answer", value: "No" });
    }
  });
  it("…and is answered Yes when the user listed the US as a country they cannot work in", () => {
    const listed = { ...me, facts: { ...facts, unauthorizedCountries: "United States" } };
    expect(decide(yn("Do you require immigration sponsorship to work in the United States?"), listed, [], US_JOB as PageFacts)).toMatchObject({ kind: "answer", value: "Yes" });
  });
  it("in a country the user may work in, their future-sponsorship answer is used", () => {
    expect(decide(yn("Will you now or in the future require visa sponsorship to work in India?"), me, [])).toMatchObject({ kind: "answer", value: "No" });
    const later = { ...me, facts: { ...facts, needsFutureSponsorship: "Yes" as const } };
    expect(decide(yn("Will you now or in the future require visa sponsorship to work in India?"), later, [])).toMatchObject({ kind: "answer", value: "Yes" });
  });
  it("a declined future-sponsorship answer is asked, never turned into No", () => {
    const declined = { ...me, facts: { ...facts, needsFutureSponsorship: "Decline" as const } };
    expect(decide(yn("Will you now or in the future require visa sponsorship to work in India?"), declined, [])).not.toMatchObject({ kind: "answer" });
  });
});

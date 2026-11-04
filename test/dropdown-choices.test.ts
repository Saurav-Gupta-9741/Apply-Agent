// Round 4: "when a dropdown appears, is exactly the right option chosen?" Realistic dropdowns from real forms, with
// their traps (Male inside Female, C inside C++, Native vs Full professional...). Expected undefined = leave it to
// the user: a missing answer is asked, a wrong one is never filled.
import { expect, it } from "vitest";
import { bestOption, yesNoOption } from "../src/shared/text";

type Case = [wanted: string, options: string[], expected: string | undefined];
const C: Case[] = [
  // gender: Male inside Female
  ["Male", ["Female", "Male", "Non-binary", "Prefer not to say"], "Male"],
  ["Female", ["Male", "Female", "Decline to self-identify"], "Female"],
  ["Male", ["Woman", "Man", "Non-binary", "I don't wish to answer"], "Man"],
  ["Male", ["Female", "Transgender (Male to Female)", "Male"], "Male"],
  ["Decline", ["Male", "Female", "I don't wish to answer"], "I don't wish to answer"],
  // countries / codes
  ["India", ["Indonesia", "India", "British Indian Ocean Territory"], "India"],
  ["India", ["Indonesia (+62)", "India (+91)", "Iran (+98)"], "India (+91)"],
  ["United States", ["United States Minor Outlying Islands", "United States", "United Kingdom"], "United States"],
  ["United States", ["USA", "UK", "Canada"], "USA"],
  ["United Kingdom", ["United States", "United Kingdom of Great Britain and Northern Ireland"], "United Kingdom of Great Britain and Northern Ireland"],
  ["Niger", ["Nigeria", "Niger"], "Niger"],
  ["Dominica", ["Dominican Republic", "Dominica"], "Dominica"],
  // states / cities
  ["Karnataka", ["Kerala", "Karnataka", "Tamil Nadu"], "Karnataka"],
  ["Bengaluru", ["Bangalore", "Mumbai", "Pune"], "Bangalore"],
  ["Pune", ["Pune, Maharashtra, India", "Punjab, India"], "Pune, Maharashtra, India"],
  // yes / no
  ["Yes", ["Yes", "No"], "Yes"],
  ["No", ["Yes", "No"], "No"],
  ["Yes", ["Yes, I will require sponsorship", "No, I will not require sponsorship"], undefined],
  ["No", ["Yes, I will require sponsorship", "No, I will not require sponsorship"], "No, I will not require sponsorship"],
  ["No", ["Yes", "No", "N/A"], "No"],
  ["No", ["Not applicable", "Yes"], undefined],
  // experience brackets
  ["2", ["0-1 years", "1-3 years", "3-5 years", "5+ years"], "1-3 years"],
  ["3", ["0-2", "3-5", "6-10", "10+"], "3-5"],
  ["5", ["Less than 1 year", "1-2 years", "2-5 years", "5-10 years", "More than 10 years"], "5-10 years"], // a full scale starts a bracket at its lower bound
  ["0", ["Fresher", "0-1 years", "1-3 years"], "Fresher"],
  ["12", ["0-5", "5-10", "10+"], "10+"],
  ["7", ["1 year", "7 years", "17 years"], "7 years"],
  ["1", ["1 year", "11 years", "10+ years"], "1 year"],
  // degrees
  ["Bachelor's Degree", ["High School", "Associate's", "Bachelor's", "Master's", "PhD"], "Bachelor's"],
  ["Master's Degree", ["Bachelors", "Masters", "Doctorate"], "Masters"],
  ["Master's Degree", ["Bachelor of Technology", "Master of Technology", "MBA"], undefined],
  ["Bachelor's Degree", ["B.Tech / B.E.", "M.Tech / M.E.", "Diploma"], "B.Tech / B.E."],
  ["Doctorate", ["Bachelor's", "Master's", "Ph.D."], "Ph.D."],
  // notice / availability
  ["Immediate", ["Immediately", "Within 2 weeks", "1 month", "2 months", "3 months or more"], "Immediately"],
  ["30 days", ["15 days or less", "1 month", "2 months", "3 months"], "1 month"],
  ["2 months", ["1 month", "2 months", "3 months"], "2 months"],
  ["90 days", ["Immediate", "30 days", "60 days", "90 days", "More than 90 days"], "90 days"],
  // sources
  ["LinkedIn", ["LinkedIn", "Indeed", "Company website", "Referral", "Other"], "LinkedIn"],
  ["Company Website", ["Company Careers Page", "LinkedIn", "Glassdoor"], "Company Careers Page"],
  ["Referral", ["Employee Referral", "Recruiter", "Job Board"], "Employee Referral"],
  ["Friend", ["Employee Referral", "LinkedIn", "Other"], undefined],
  // language level
  ["Fluent", ["Basic", "Conversational", "Fluent", "Native"], "Fluent"],
  ["Native", ["Elementary", "Limited working", "Professional working", "Full professional", "Native or bilingual"], "Native or bilingual"],
  ["Professional", ["Elementary", "Limited working", "Professional working", "Full professional", "Native or bilingual"], "Professional working"],
  // work mode
  ["Remote", ["On-site", "Hybrid", "Remote"], "Remote"],
  ["Hybrid", ["Onsite", "Remote", "Hybrid (2-3 days in office)"], "Hybrid (2-3 days in office)"],
  // veteran / disability
  ["No", ["I am a protected veteran", "I am not a protected veteran", "I don't wish to answer"], "I am not a protected veteran"],
  ["Yes", ["I am a protected veteran", "I am not a protected veteran", "I don't wish to answer"], "I am a protected veteran"],
  ["No", ["Yes, I have a disability (or previously had a disability)", "No, I do not have a disability", "I do not want to answer"], "No, I do not have a disability"],
  // employment type
  ["Full-time", ["Part-time", "Full-time", "Contract", "Internship"], "Full-time"],
  ["Internship", ["Full time", "Part time", "Intern"], "Intern"],
  // pronouns
  ["He/Him", ["She/Her", "He/Him", "They/Them"], "He/Him"],
  ["She/Her", ["He/him/his", "She/her/hers", "They/them/theirs"], "She/her/hers"],
  // salary currency
  ["INR", ["USD", "EUR", "INR", "GBP"], "INR"],
  // phone code
  ["+91", ["+1", "+61", "+91", "+971"], "+91"],
  // traps: nothing should be picked
  ["Java", ["JavaScript", "TypeScript", "Python"], undefined],
  ["C", ["C++", "C#", "Objective-C"], undefined],
  ["Engineer", ["Engineering Manager", "Sales"], undefined],
  ["Asha", ["Ashanti", "Natasha"], undefined],
  ["C#", ["C++", "C#", "C"], "C#"],
  ["C++", ["C", "C#", "C++"], "C++"],
  ["C", ["C", "C++", "C#"], "C"],
  ["Basic", ["Fluent", "Native"], undefined],
  ["Conversational", ["Elementary", "Limited working", "Professional working", "Full professional", "Native or bilingual"], "Limited working"],
  ["Native", ["Basic", "Intermediate", "Fluent"], "Fluent"],
  ["Fluent", ["Beginner", "Intermediate", "Advanced", "Native"], "Advanced"],
];

it("picks exactly the right option, or none", () => {
  const bad: string[] = [];
  for (const [w, opts, exp] of C) {
    const got = yesNoOption(opts, w) ?? bestOption(opts, w);
    if (got !== exp) bad.push(`want ${JSON.stringify(w)} → got ${JSON.stringify(got)}, expected ${JSON.stringify(exp)}  | ${opts.join(" / ")}`);
  }
  console.log(`\n${C.length - bad.length}/${C.length} right\n${bad.join("\n")}`);
});

it("a custom dropdown must show the option that was chosen afterwards, or it is not counted as filled", async () => {
  const { fillDropdown } = await import("../src/content/fill");
  const setup = (shows: (picked: string) => string) => {
    document.body.innerHTML = `<button id="dd" aria-haspopup="listbox" aria-controls="lb" aria-expanded="false">Select...</button>
      <ul role="listbox" id="lb" hidden><li role="option">LinkedIn</li><li role="option">Indeed</li><li role="option">Friend</li></ul>`;
    const dd = document.getElementById("dd")!;
    const lb = document.getElementById("lb")!;
    dd.addEventListener("click", () => { lb.hidden = false; dd.setAttribute("aria-expanded", "true"); });
    lb.querySelectorAll("li").forEach((li) => li.addEventListener("click", () => { dd.textContent = shows(li.textContent ?? ""); lb.hidden = true; }));
    return dd;
  };
  expect(await fillDropdown(setup((p) => p), "LinkedIn", 1500)).toMatchObject({ ok: true });
  // A widget that ends up on another option (a bug in the site, a re-render): reported, never counted as filled.
  const wrong = await fillDropdown(setup(() => "Friend"), "LinkedIn", 1500);
  expect(wrong.ok).toBe(false);
  expect(wrong.detail).toMatch(/shows "Friend"/);
});

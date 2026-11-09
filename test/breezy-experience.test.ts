/** Breezy HR application forms (live run 5 / Simplify comparison): "Work History" and "Education" start empty, with an
 * "Add Position" / "Add Education" LINK (not a button) that inserts a block of boxes labelled only by placeholders.
 * Both date boxes carry the placeholder "Company" (Breezy's own markup); their real label is the "Start date" / "End
 * date" text before them. Simplify typed a date into a "Company" box and "Master's Degree" into "Summary" here.
 * Markup copied from prolift-rigging.breezy.hr (2026-11-09). */

import { describe, expect, it } from "vitest";
import { fillForm } from "../src/content/agent";
import type { Profile } from "../src/shared/types";
import { mount, PROFILE } from "./fixtures";

const ME: Profile = {
  ...PROFILE, country: "India", location: "Pune", school: "IIT Jodhpur", degree: "Bachelor's Degree", discipline: "Computer Science", graduationYear: "2020",
  workHistory: [
    { title: "Data Engineer", company: "Initech", location: "Pune", start: "2024-03", end: "", current: true, summary: "Pipelines" },
    { title: "Analyst", company: "Globex", location: "Mumbai", start: "2022-01", end: "2024-02", current: false, summary: "" },
  ],
};

const POSITION = `<li class="experience" ng-repeat="candidatePosition in candidate.work_history">
  <input class="polygot" ng-model="candidatePosition.company_name" placeholder="Company" type="text" name=""><div class="form-divider"></div>
  <input class="polygot" ng-model="candidatePosition.title" placeholder="Title" type="text" name=""><div class="form-divider"></div>
  <textarea name="" class="polygot" ng-model="candidatePosition.summary" placeholder="Summary"></textarea><div class="form-divider"></div>
  <span class="polygot date-label">Start date</span><input class="polygot input-date" ng-model="candidatePosition.date_start" placeholder="Company" type="date" name=""><div class="form-divider"></div>
  <span class="polygot date-label">End date</span><input class="polygot input-date" ng-model="candidatePosition.date_end" placeholder="Company" type="date" name=""><div class="form-divider"></div>
  <a href="" class="blue bzyLinkColor polygot date-label del-pos">Delete</a><div class="form-divider"></div></li>`;
const SCHOOL = `<li class="experience" ng-repeat="candidateSchool in candidate.education">
  <input class="polygot" ng-model="candidateSchool.school_name" placeholder="School" type="text" name=""><div class="form-divider"></div>
  <input class="polygot" ng-model="candidateSchool.field_of_study" placeholder="Field of Study" type="text" name=""><div class="form-divider"></div>
  <textarea name="" class="polygot" ng-model="candidateSchool.summary" placeholder="Summary"></textarea><div class="form-divider"></div>
  <span class="polygot date-label">Start date</span><input class="polygot input-date" ng-model="candidateSchool.date_start" placeholder="Company" type="date" name=""><div class="form-divider"></div>
  <span class="polygot date-label">End date</span><input class="polygot input-date" ng-model="candidateSchool.date_end" placeholder="Company" type="date" name=""><div class="form-divider"></div>
  <a href="" class="blue bzyLinkColor polygot date-label del-pos">Delete</a><div class="form-divider"></div></li>`;

function mountBreezy(): void {
  mount(`<h1>Assistant Project Manager</h1><form name="form" novalidate>
  <div class="section"><div class="section-header"><h2 class="polygot">Personal Details</h2></div>
    <h3><span class="polygot">Full Name</span><span class="required" title="Required">*</span></h3>
    <input class="polygot" required ng-model="candidate.name" placeholder="Full Name" type="text" name="cName"><div class="form-divider"></div>
    <h3><span class="polygot">Email Address</span><span class="required" title="Required">*</span></h3>
    <input class="email-address polygot" required ng-model="candidate.email_address" placeholder="Email Address" type="email" name="cEmail">
  </div>
  <div class="section"><div class="section-header"><h2 class="polygot">Experience</h2></div>
    <input id="work_required" type="hidden" value="optional">
    <div class="section-header"><h3><span class="polygot">Work History</span></h3></div>
    <ul id="jobs"></ul>
    <div class="section-footer"><a class="blue bzyLinkColor" href="" id="addPos"><i class="fa fa-plus"></i><span> </span><span class="polygot">Add Position</span></a></div>
    <div class="form-divider"></div>
    <input id="education_required" type="hidden" value="optional">
    <div class="section-header"><h3><span class="polygot">Education</span></h3></div>
    <ul id="schools"></ul>
    <div class="section-footer"><a class="blue bzyLinkColor" href="" id="addEdu"><i class="fa fa-plus"></i><span> </span><span class="polygot">Add Education</span></a></div>
    <div class="form-divider"></div>
    <div class="section-header"><h3><span class="polygot">Experience Summary</span></h3></div>
    <textarea name="cSummary" class="description" ng-model="candidate.summary" placeholder=""></textarea>
  </div>
  <div class="section"><h3><span class="polygot">Will you now or in the future require sponsorship for employment?</span></h3>
    <input type="text" name="q1" ng-model="q1"></div>
  <button type="submit">Submit Application</button></form>`);
  const add = (link: string, list: string, html: string) => document.getElementById(link)!.addEventListener("click", (e) => {
    e.preventDefault();
    setTimeout(() => document.getElementById(list)!.insertAdjacentHTML("beforeend", html), 50);
  });
  add("addPos", "jobs", POSITION);
  add("addEdu", "schools", SCHOOL);
}

const boxes = (list: string, model: string) => Array.from(document.querySelectorAll<HTMLInputElement>(`#${list} [ng-model='${model}']`)).map((e) => e.value);

describe("Breezy work history and education", () => {
  it("adds one position per job and fills company, title, summary and dates in the right boxes", async () => {
    mountBreezy();
    await fillForm(document, { profile: ME, answers: [], mode: "review" });
    expect(document.querySelectorAll("#jobs > li")).toHaveLength(2);
    expect(boxes("jobs", "candidatePosition.company_name")).toEqual(["Initech", "Globex"]);
    expect(boxes("jobs", "candidatePosition.title")).toEqual(["Data Engineer", "Analyst"]);
    expect(boxes("jobs", "candidatePosition.summary")).toEqual(["Pipelines", ""]);
    expect(boxes("jobs", "candidatePosition.date_start")).toEqual(["2024-03-01", "2022-01-01"]);
    expect(boxes("jobs", "candidatePosition.date_end")).toEqual(["", "2024-02-01"]);
  });

  it("adds one education block and fills school and field of study; no invented dates or summary", async () => {
    mountBreezy();
    await fillForm(document, { profile: ME, answers: [], mode: "review" });
    expect(document.querySelectorAll("#schools > li")).toHaveLength(1);
    expect(boxes("schools", "candidateSchool.school_name")).toEqual(["IIT Jodhpur"]);
    expect(boxes("schools", "candidateSchool.field_of_study")).toEqual(["Computer Science"]);
    expect(boxes("schools", "candidateSchool.summary")).toEqual([""]);
    expect(boxes("schools", "candidateSchool.date_start")).toEqual([""]);
    expect(boxes("schools", "candidateSchool.date_end")).toEqual([""]);
  });

  it("never types a date into a Company box or a job into the overall 'Experience Summary'", async () => {
    mountBreezy();
    await fillForm(document, { profile: ME, answers: [], mode: "review" });
    for (const v of boxes("jobs", "candidatePosition.company_name")) expect(v).not.toMatch(/\d{4}/);
    expect((document.querySelector("[name=cSummary]") as HTMLTextAreaElement).value).toBe("");
  });

  it("zeno power: a question heading that mentions 'work experience' does not start a job block", async () => {
    mount(`<form><h3><span>What are your salary expectations for this role? Please note that final compensation is determined by various factors such as years of relevant work experience, skills, qualifications, certifications, and other business considerations.</span></h3>
      <input type="text" name="q" id="q"><button type="submit">Submit</button></form>`);
    await fillForm(document, { profile: ME, answers: [], mode: "review" });
    expect((document.getElementById("q") as HTMLInputElement).value).not.toBe("Data Engineer");
  });

  it("without any saved job or school, no block is added", async () => {
    mountBreezy();
    await fillForm(document, { profile: { ...PROFILE, currentTitle: "", currentCompany: "", school: "", workHistory: [] }, answers: [], mode: "review" });
    expect(document.querySelectorAll("#jobs > li")).toHaveLength(0);
    expect(document.querySelectorAll("#schools > li")).toHaveLength(0);
  });
});

// @vitest-environment node
// Round 4: Discover matches jobs to the person's profile and resume, explains every point, picks companies for them,
// and adds a company from its careers-page link. All on the device.
import { describe, expect, it } from "vitest";
import { matchJob, rankJobs, roleFamily, roleWords, searchProfile } from "../src/shared/jobs/matching";
import { requiredYears } from "../src/shared/jobs/job-filters";
import { boardsIn, companyRelevance, rankCompanies, readCareersLink, robotsAllows } from "../src/shared/jobs/companies";
import { htmlToText, parseGreenhouseFeed, parseLeverFeed } from "../src/shared/jobs/feeds";
import { describeSearch } from "../src/sidepanel/discover";
import { makeBackup, mergeCompanies, readBackup } from "../src/shared/backup";
import { EMPTY_PROFILE } from "../src/shared/storage";
import type { JobPosting } from "../src/shared/jobs/types";
import type { Profile } from "../src/shared/types";

const job = (over: Partial<JobPosting>): JobPosting => ({
  id: Math.random().toString(36).slice(2), companySlug: "acme", companyName: "Acme", ats: "greenhouse",
  title: "Software Engineer", location: "Bengaluru, India", isRemote: false, ...over,
});
const LONG = " We build payments software used by millions of people across many countries every single day.";

/** A final-year student in India (the person this round was built for). */
const STUDENT: Profile = {
  ...EMPTY_PROFILE, country: "India", location: "Jodhpur", preferredLocations: "Bengaluru, Hyderabad, Remote",
  targetRoles: "Software Engineer, Machine Learning Engineer", experienceYears: "", educationStatus: "pursuing",
  skills: "Python, ReactJS, SQL, PyTorch", discipline: "Computer Science",
};
/** Someone with 4 years who wants backend roles. */
const MID: Profile = {
  ...EMPTY_PROFILE, country: "India", location: "Pune", preferredLocations: "Pune", targetRoles: "Backend Engineer",
  experienceYears: "4", skills: "Java, Spring Boot, PostgreSQL, Kafka, AWS",
};

describe("job titles", () => {
  it("reads the role apart from its level and spelling", () => {
    expect(roleWords("Senior Software Engineer II")).toBe("software engineer");
    expect(roleWords("SDE-1")).toBe("software engineer");
    expect(roleWords("Sr. Back-end Developer")).toBe("backend engineer");
    expect(roleWords("ML Engineer, Intern")).toBe("machine learning engineer");
  });
  it("puts titles in the right field", () => {
    const cases: Array<[string, string]> = [
      ["Sales Engineer", "sales"], ["Data Engineer", "data"], ["Product Designer", "design"], ["Product Manager", "product"],
      ["Site Reliability Engineer", "software"], ["Mechanical Engineer", "mechanical"], ["Civil Site Engineer", "mechanical"],
      ["Customer Success Manager", "support"], ["Nursing Supervisor", "healthcare"], ["Financial Analyst", "finance"],
      ["Growth Engineer", "software"], ["Member of Technical Staff", "software"], ["Account Executive", "sales"],
      ["Electrical Engineer", "hardware"], ["Engineering Manager", "software"], ["Technical Recruiter", "people"],
    ];
    for (const [title, fam] of cases) expect([title, roleFamily(title)]).toEqual([title, fam]);
  });
});

describe("what Discover looks for", () => {
  it("uses Target roles first, then the current title, then work history, then the field of study", () => {
    expect(searchProfile(STUDENT).rolesFrom).toBe("target");
    expect(searchProfile({ ...EMPTY_PROFILE, currentTitle: "Data Analyst" })).toMatchObject({ roles: ["Data Analyst"], rolesFrom: "title" });
    expect(searchProfile({ ...EMPTY_PROFILE, workHistory: [{ title: "Frontend Developer", company: "X", location: "", start: "", end: "", current: false, summary: "" }] }))
      .toMatchObject({ roles: ["Frontend Developer"], rolesFrom: "history" });
    expect(searchProfile({ ...EMPTY_PROFILE, discipline: "Computer Science and Engineering", skills: "PyTorch" }))
      .toMatchObject({ roles: ["Software Engineer", "Machine Learning Engineer"], rolesFrom: "education" });
    expect(searchProfile(EMPTY_PROFILE)).toMatchObject({ roles: [], rolesFrom: "none" });
  });
  it("treats a student as a fresher and reads places with their other spellings", () => {
    const sp = searchProfile(STUDENT);
    expect(sp).toMatchObject({ student: true, years: 0, homeCountry: "India", workCountries: ["India"], wantsRemote: true });
    expect(sp.places).toEqual(expect.arrayContaining(["bengaluru", "bangalore", "hyderabad"]));
  });
  it("says plainly what is missing", () => {
    const lines = describeSearch(searchProfile(EMPTY_PROFILE));
    expect(lines.filter((l) => l.missing).map((l) => l.label)).toEqual(["Roles", "Experience", "Where", "Skills"]);
    const ok = describeSearch(searchProfile(STUDENT));
    expect(ok.every((l) => !l.missing)).toBe(true);
    expect(ok[1]!.value).toMatch(/Still studying/);
  });
});

describe("match score", () => {
  it("every point is explained and the parts add up to the score", () => {
    const r = matchJob(job({ title: "Software Engineer Intern", description: `Python and React.${LONG}` }), STUDENT);
    expect(r.parts.map((p) => p.key)).toEqual(["role", "skills", "experience", "location"]);
    expect(r.parts.reduce((s, p) => s + p.points, 0)).toBe(r.score);
    expect(r.parts.every((p) => p.text.length > 0)).toBe(true);
  });
  it("a fresher sees internships at full experience points and never senior roles", () => {
    expect(matchJob(job({ title: "Software Engineering Intern" }), STUDENT).parts[2]!.points).toBe(20);
    expect(matchJob(job({ title: "Senior Software Engineer" }), STUDENT).excluded).toBe("needs more experience");
    expect(matchJob(job({ title: "Engineering Manager" }), STUDENT).excluded).toBe("needs more experience");
    const asks = matchJob(job({ title: "Software Engineer", description: `You have 3+ years of experience building APIs.${LONG}` }), STUDENT);
    expect(asks.excluded).toBe("needs more experience");
    expect(asks.score).toBe(0);
  });
  it("one year short is shown with fewer points; two or more is not shown", () => {
    const d = (n: number) => `Requirements: ${n}+ years of experience with Java.${LONG}`;
    expect(matchJob(job({ title: "Backend Engineer", description: d(5) }), MID).parts[2]!.points).toBe(10);
    expect(matchJob(job({ title: "Backend Engineer", description: d(6) }), MID).excluded).toBe("needs more experience");
    expect(matchJob(job({ title: "Backend Engineer", description: d(3) }), MID).parts[2]!.points).toBe(20);
  });
  it("other fields are left out, close fields score lower", () => {
    expect(matchJob(job({ title: "Account Executive" }), STUDENT).excluded).toMatch(/different field/);
    expect(matchJob(job({ title: "Sales Engineer" }), STUDENT).excluded).toMatch(/different field/);
    const data = matchJob(job({ title: "Data Engineer" }), MID);
    expect(data.excluded).toBeUndefined();
    expect(data.parts[0]!.points).toBe(12);
    expect(matchJob(job({ title: "Java Backend Developer" }), MID).parts[0]!.points).toBe(40);
    expect(matchJob(job({ title: "Platform Engineer" }), MID).parts[0]!.points).toBe(24);
  });
  it("skills are read from the description, with their usual names, and missing ones are listed", () => {
    const r = matchJob(job({ title: "Machine Learning Engineer", description: `You will use Python, React.js, PyTorch and Kubernetes.${LONG}` }), STUDENT);
    expect(r.matchedSkills).toEqual(expect.arrayContaining(["Python", "ReactJS", "PyTorch"]));
    expect(r.missingSkills).toContain("Kubernetes");
    expect(r.parts[1]!.text).toMatch(/You have/);
  });
  it("a short board listing with no description is not marked down for skills", () => {
    const r = matchJob(job({ title: "Software Engineer" }), STUDENT);
    expect(r.parts[1]!.points).toBe(13);
    expect(r.parts[1]!.text).toMatch(/no description/);
  });
  it("location: the user's cities, remote open to them, and where they may work", () => {
    const where = (over: Partial<JobPosting>) => matchJob(job({ title: "Software Engineer Intern", ...over }), STUDENT);
    expect(where({ location: "Bangalore" }).parts[3]).toMatchObject({ points: 15, text: "In Bengaluru" });
    expect(where({ location: "Remote", isRemote: true }).isEligibleWorkCountry).toBe(true);
    expect(where({ location: "Remote - India", isRemote: true }).isEligibleWorkCountry).toBe(true);
    const usOnly = where({ location: "Remote - US", isRemote: true });
    expect(usOnly.isEligibleWorkCountry).toBe(false);
    expect(usOnly.parts[3]!.text).toMatch(/only from United States/);
    expect(where({ location: "Berlin, Germany" }).isEligibleWorkCountry).toBe(false);
    expect(where({ location: "Pune, India" }).parts[3]!.text).toMatch(/Elsewhere in India/);
  });
  it("ranks the right job first for a fresher in India", () => {
    const jobs = [
      job({ id: "us", title: "Software Engineer Intern", location: "New York, NY" }),
      job({ id: "senior", title: "Senior Software Engineer" }),
      job({ id: "sales", title: "Sales Development Representative" }),
      job({ id: "good", title: "Machine Learning Intern", location: "Bengaluru", description: `Python, PyTorch, SQL.${LONG}` }),
      job({ id: "ok", title: "Software Engineer", location: "Hyderabad" }),
    ];
    const ranked = rankJobs(jobs, STUDENT);
    expect(ranked[0]!.job.id).toBe("good");
    expect(ranked.map((r) => r.job.id)).not.toContain("senior");
    expect(ranked.map((r) => r.job.id)).not.toContain("sales");
    expect(ranked.find((r) => r.job.id === "us")!.isEligibleWorkCountry).toBe(false);
  });
});

describe("found on live job boards (round 4 check)", () => {
  it("reads the experience Indian boards write in the title", () => {
    for (const [title, n] of [["Business Analytics | Experience : 5-7 yrs", 5], ["Growth Analytics I Exp- 4-6 Years", 4], ["Risk Analyst | Exp - 1 to 3 Yrs", 1], ["Python Developer (3+ Years)", 3]] as const) {
      expect([title, requiredYears({ title })]).toEqual([title, n]);
    }
    expect(matchJob(job({ title: "Backend Engineer | Exp- 4-6 Years" }), STUDENT).excluded).toBe("needs more experience");
  });
  it("team-lead titles are senior", () => {
    expect(matchJob(job({ title: "Backend - TL/STL" }), STUDENT).excluded).toBe("needs more experience");
  });
  it("analyst roles are not the same field as machine learning", () => {
    expect(roleFamily("Credit Risk Analyst")).toBe("analytics");
    expect(roleFamily("Data Analyst")).toBe("analytics");
    expect(matchJob(job({ title: "Credit Risk Analyst" }), STUDENT).parts[0]!.points).toBe(12);
  });
  it("a city abroad is not taken for a place the person can work", () => {
    expect(matchJob(job({ title: "Software Engineer, Intern", location: "Bucharest" }), STUDENT).isEligibleWorkCountry).toBe(false);
    expect(matchJob(job({ title: "Software Engineer, New Grad", location: "Taiwan" }), STUDENT).isEligibleWorkCountry).toBe(false);
    expect(matchJob(job({ title: "Data Scientist", location: "N/A" }), STUDENT).parts[3]!.text).toBe("Location not stated");
  });
});

describe("job board descriptions", () => {
  it("Greenhouse's escaped HTML becomes plain text; its company name is used", () => {
    expect(htmlToText("&lt;p&gt;Use &lt;strong&gt;Python&lt;/strong&gt; &amp;amp; SQL&lt;/p&gt;&lt;ul&gt;&lt;li&gt;3+ years&lt;/li&gt;&lt;/ul&gt;"))
      .toBe("Use Python & SQL\n• 3+ years");
    const [j] = parseGreenhouseFeed({ jobs: [{ id: 1, title: "SWE", location: { name: "Pune" }, company_name: "Acme Corp", content: "&lt;p&gt;Go and Rust&lt;/p&gt;" }] }, "acme", "");
    expect(j).toMatchObject({ companyName: "Acme Corp", description: "Go and Rust" });
  });
  it("Lever keeps the requirement lists", () => {
    const [j] = parseLeverFeed([{ id: "x", text: "Dev", categories: {}, descriptionPlain: "About us.", lists: [{ text: "Requirements", content: "<li>Kotlin</li>" }] }], "acme", "");
    expect(j!.description).toContain("Kotlin");
    expect(j!.companyName).toBe("Acme");
  });
});

describe("adding a company from a link", () => {
  it("reads job-board links of every supported kind", () => {
    const cases: Array<[string, string, string]> = [
      ["https://boards.greenhouse.io/stripe", "greenhouse", "stripe"],
      ["https://job-boards.greenhouse.io/figma/jobs/123", "greenhouse", "figma"],
      ["jobs.lever.co/netflix", "lever", "netflix"],
      ["https://jobs.ashbyhq.com/notion?utm_source=x", "ashby", "notion"],
      ["https://jobs.smartrecruiters.com/Visa", "smartrecruiters", "Visa"],
      ["https://apply.workable.com/huggingface/", "workable", "huggingface"],
      ["https://acme.recruitee.com/o/engineer", "recruitee", "acme"],
      ["https://acme-gmbh.jobs.personio.de/", "personio", "acme-gmbh"],
    ];
    for (const [url, ats, slug] of cases) expect([url, readCareersLink(url)]).toEqual([url, { kind: "board", board: { ats, slug } }]);
  });
  it("finds the board inside a company's own careers page", () => {
    const html = `<html><script src="https://boards.greenhouse.io/embed/job_board/js?for=razorpay"></script>
      <a href="https://jobs.lever.co/acme/123">a job</a></html>`;
    expect(boardsIn(html)).toEqual([{ ats: "greenhouse", slug: "razorpay" }, { ats: "lever", slug: "acme" }]);
    expect(readCareersLink("https://razorpay.com/jobs/")).toMatchObject({ kind: "page" });
  });
  it("says why a link can't be used", () => {
    expect(readCareersLink("")).toMatchObject({ kind: "invalid" });
    expect(readCareersLink("not a link at all")).toMatchObject({ kind: "invalid" });
    expect(readCareersLink("http://careers.acme.com")).toMatchObject({ kind: "invalid" });
    expect(readCareersLink("https://localhost/jobs")).toMatchObject({ kind: "invalid" });
    expect(readCareersLink("https://acme.wd5.myworkdayjobs.com/External")).toEqual({ kind: "workday" });
  });
  it("respects robots.txt", () => {
    const robots = "User-agent: Googlebot\nDisallow: /\n\nUser-agent: *\nDisallow: /private\nAllow: /private/jobs\n";
    expect(robotsAllows(robots, "/careers")).toBe(true);
    expect(robotsAllows(robots, "/private/x")).toBe(false);
    expect(robotsAllows(robots, "/private/jobs")).toBe(true);
    expect(robotsAllows("User-agent: *\nDisallow: /", "/careers")).toBe(false);
    expect(robotsAllows("", "/careers")).toBe(true);
  });
});

describe("choosing companies for the person", () => {
  const co = (slug: string, over: object) => ({ slug, name: slug, ats: "greenhouse" as const, country: "", industry: "", jobCount: 100, ...over });
  it("prefers companies hiring in the person's field and country, and entry-level for a fresher", () => {
    const sp = searchProfile(STUDENT);
    const indiaSoftware = co("in-sw", { hires: { IN: 80 }, families: { software: 60 }, entry: 10 });
    const usSoftware = co("us-sw", { hires: { US: 90 }, families: { software: 60 } });
    const indiaSales = co("in-sales", { hires: { IN: 90 }, families: { sales: 80 } });
    expect(companyRelevance(indiaSoftware, sp)).toBeGreaterThan(companyRelevance(usSoftware, sp));
    expect(companyRelevance(indiaSales, sp)).toBe(0);
    expect(rankCompanies([indiaSales, usSoftware, indiaSoftware] as never, [], sp).map((c) => c.slug)).toEqual(["in-sw", "us-sw", "in-sales"]);
  });
});

describe("backups keep the user's companies", () => {
  it("round-trips them and drops anything malformed", () => {
    const companies = [{ ats: "lever" as const, slug: "acme", name: "Acme", addedAt: "2026-11-04T10:00:00.000Z", source: "https://jobs.lever.co/acme", jobCount: 3 }];
    const backup = makeBackup({ profile: EMPTY_PROFILE, answers: [], applications: [], settings: {} as never, companies });
    const read = readBackup(JSON.parse(JSON.stringify({ ...backup, companies: [...companies, { ats: "workday", slug: "x" }, { ats: "lever", slug: "../../evil" }] })));
    expect(typeof read).toBe("object");
    expect((read as { companies: unknown }).companies).toEqual(companies);
    expect(mergeCompanies(companies, [{ ...companies[0]!, slug: "ACME" }, { ...companies[0]!, slug: "other" }]).map((c) => c.slug)).toEqual(["acme", "other"]);
  });
});

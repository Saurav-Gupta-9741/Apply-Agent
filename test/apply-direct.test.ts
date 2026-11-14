/** "Apply on the company site": the role and company from a job tab's title, and the same job on the company's board. */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { companiesNamed, guessedBoards, sameRole, seenJobFromTitle } from "../src/shared/jobs/apply-direct";
import type { ListedCompany } from "../src/shared/jobs/companies";
import { fetchATSFeed } from "../src/shared/jobs/feeds";
import { FeedRateLimiter } from "../src/shared/jobs/rate-limiter";
import type { JobPosting } from "../src/shared/jobs/types";

describe("the job from a tab title", () => {
  it("LinkedIn, Indeed and Naukri title formats", () => {
    expect(seenJobFromTitle("Stripe hiring Senior Data Engineer in Bengaluru, Karnataka, India | LinkedIn", "https://www.linkedin.com/jobs/view/123")).toEqual({ company: "Stripe", role: "Senior Data Engineer", platform: "LinkedIn" });
    expect(seenJobFromTitle("(3) Senior Data Engineer | Stripe | LinkedIn", "https://www.linkedin.com/jobs/view/123")).toMatchObject({ company: "Stripe", role: "Senior Data Engineer" });
    expect(seenJobFromTitle("Data Engineer - Stripe - Bengaluru, Karnataka | Indeed.com", "https://in.indeed.com/viewjob?jk=abc")).toMatchObject({ company: "Stripe", role: "Data Engineer", platform: "Indeed" });
    expect(seenJobFromTitle("Data Engineer Job in Stripe at Bengaluru - Naukri.com", "https://www.naukri.com/job-listings-data-engineer-stripe-123")).toMatchObject({ company: "Stripe", role: "Data Engineer", platform: "Naukri" });
  });
  it("nothing for pages that are not one job", () => {
    expect(seenJobFromTitle("Jobs | LinkedIn", "https://www.linkedin.com/jobs/")).toBeUndefined();
    expect(seenJobFromTitle("Feed | LinkedIn", "https://www.linkedin.com/feed/")).toBeUndefined();
  });
});

describe("the same role on the company's board", () => {
  const p = (title: string, id: string): JobPosting => ({ id, title, url: `https://x/${id}`, companySlug: "s", companyName: "S", ats: "greenhouse", location: "", isRemote: false });
  it("the one posting with the same role words; never a guess between two", () => {
    expect(sameRole([p("Senior Data Engineer", "1"), p("Data Engineer", "2")], "Senior Data Engineer")?.id).toBe("1");
    expect(sameRole([p("Senior Data Engineer, Payments", "1"), p("Product Manager", "2")], "Senior Data Engineer")?.id).toBe("1");
    expect(sameRole([p("Senior Data Engineer, Payments", "1"), p("Senior Data Engineer, Risk", "2")], "Senior Data Engineer")).toBeUndefined();
    expect(sameRole([p("Product Manager", "2")], "Senior Data Engineer")).toBeUndefined();
  });
  it("boards to try for a company the directory does not know", () => {
    expect(guessedBoards("Bear Robotics").map((b) => `${b.ats}:${b.slug}`)).toEqual(expect.arrayContaining(["greenhouse:bearrobotics", "lever:bear-robotics", "ashby:bearrobotics"]));
  });
});

/** Opt-in (REAL_APPLY_DIRECT=1): real open jobs, their titles written the way LinkedIn writes them, found again on the
 * companies' live public boards. Read-only GETs; nothing is sent about anyone. */
describe.runIf(process.env.REAL_APPLY_DIRECT)("live: LinkedIn-style titles of real open jobs", () => {
  it("finds the same posting on the company's own board", async () => {
    const directory = JSON.parse(readFileSync("static/companies.json", "utf8")) as ListedCompany[];
    const jobs = (JSON.parse(readFileSync("reports/live1000/jobs-r11.json", "utf8")) as Array<{ platform: string; company: string; title: string; url: string }>)
      .filter((j) => j.platform === "greenhouse" || j.platform === "ashby").slice(0, 30);
    const limiter = new FeedRateLimiter();
    const results: string[] = [];
    let found = 0, right = 0, tried = 0;
    for (const j of jobs) {
      const listed = directory.find((c) => c.ats === j.platform && c.slug.toLowerCase() === j.company.toLowerCase());
      if (!listed) continue;
      tried++;
      const seen = seenJobFromTitle(`${listed.name} hiring ${j.title} in Somewhere | LinkedIn`, "https://www.linkedin.com/jobs/view/1")!;
      const boards = companiesNamed(directory, seen.company);
      let match: JobPosting | undefined;
      for (const b of boards) {
        match = sameRole(await fetchATSFeed(b.ats, b.slug, b.name, fetch as never, limiter).catch(() => []), seen.role);
        if (match) break;
      }
      const id = (u: string) => (u.match(/[0-9a-f-]{8,}|\d{5,}/gi) ?? []).pop();
      if (match) found++;
      if (match && id(match.url!) === id(j.url)) right++;
      results.push(`${match ? (id(match.url!) === id(j.url) ? "SAME" : "OTHER") : "none"} | ${listed.name} | ${j.title}`);
    }
    console.log(`APPLY-DIRECT tried ${tried}, found ${found}, the same posting ${right}\n${results.join("\n")}`);
    expect(found - right).toBe(0); // never another posting
  }, 600_000);
});

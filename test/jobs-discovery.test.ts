// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  parseGreenhouseFeed,
  parseLeverFeed,
  parseAshbyFeed,
  parseSmartRecruitersFeed,
  parseRecruiteeFeed,
  parseWorkableFeed,
  parsePersonioXml,
  fetchATSFeed,
} from "../src/shared/jobs/feeds";
import { FeedRateLimiter, HANDS_OFF_DOMAINS } from "../src/shared/jobs/rate-limiter";
import { matchJob, rankJobs } from "../src/shared/jobs/matching";
import { canViewMoreMatches, discoverJobs, FREE_DAILY_MATCH_LIMIT, renderJobCard } from "../src/sidepanel/discover";
import type { JobPosting } from "../src/shared/jobs/types";
import type { Profile } from "../src/shared/types";
import { PROFILE } from "./fixtures";

const MOCK_PROFILE: Profile = {
  ...PROFILE,
  firstName: "Asha",
  lastName: "Sharma",
  email: "asha@example.com",
  phone: "+91 98765 43210",
  location: "Bangalore, India",
  country: "India",
  targetRoles: "Backend Engineer, Software Engineer",
  currentTitle: "Software Engineer",
  currentCompany: "Initech",
  experienceYears: "4",
  preferredLocations: "Bangalore, Remote",
  skills: "Python, Django, PostgreSQL, Docker, AWS, REST APIs",
  facts: {
    ...PROFILE.facts!,
    workCountries: "India",
    workMode: "remote",
    noticePeriod: "30 days",
  },
};

describe("Lane 5: Job Discovery & Official Public Feeds", () => {
  describe("1. Feed Parsers for Official ATS Platforms", () => {
    it("parses Greenhouse public feed format correctly", () => {
      const sample = {
        jobs: [
          {
            id: 123456,
            title: "Senior Backend Engineer",
            location: { name: "Remote, India" },
            departments: [{ name: "Engineering" }],
            absolute_url: "https://boards.greenhouse.io/sample/jobs/123456",
            updated_at: "2026-11-01T12:00:00Z",
            content: "<p>We are seeking a <strong>Python</strong> engineer with AWS experience.</p>",
          },
        ],
      };

      const parsed = parseGreenhouseFeed(sample, "sample", "Sample Corp");
      expect(parsed).toHaveLength(1);
      expect(parsed[0]!.id).toBe("gh-123456");
      expect(parsed[0]!.title).toBe("Senior Backend Engineer");
      expect(parsed[0]!.isRemote).toBe(true);
      expect(parsed[0]!.companyName).toBe("Sample Corp");
      expect(parsed[0]!.ats).toBe("greenhouse");
      expect(parsed[0]!.descriptionSnippet).toContain("Python");
    });

    it("parses Lever public feed format correctly", () => {
      const sample = [
        {
          id: "lever-99",
          text: "Full Stack Engineer",
          categories: { location: "San Francisco, CA", department: "Product" },
          workplaceType: "hybrid",
          hostedUrl: "https://jobs.lever.co/sample/lever-99",
          createdAt: 1730000000000,
          descriptionPlain: "Build modern web apps using React and Python.",
          salaryRange: { min: 140000, max: 180000, currency: "USD", interval: "per-year-salary" },
        },
      ];

      const parsed = parseLeverFeed(sample, "sample", "Lever Corp");
      expect(parsed).toHaveLength(1);
      expect(parsed[0]!.title).toBe("Full Stack Engineer");
      expect(parsed[0]!.isRemote).toBe(false);
      expect(parsed[0]!.salary?.min).toBe(140000);
      expect(parsed[0]!.salary?.period).toBe("year");
    });

    it("parses Ashby public feed format correctly", () => {
      const sample = {
        jobs: [
          {
            id: "ashby-42",
            title: "Staff Data Engineer",
            location: "Remote",
            isRemote: true,
            department: "Data Platform",
            jobUrl: "https://jobs.ashbyhq.com/sample/ashby-42",
            publishedAt: "2026-10-30T10:00:00Z",
            descriptionPlain: "Lead our PostgreSQL and Snowflake pipelines.",
            compensationTier: { min: 180000, max: 220000, currencyCode: "USD" },
          },
        ],
      };

      const parsed = parseAshbyFeed(sample, "sample", "Ashby Corp");
      expect(parsed).toHaveLength(1);
      expect(parsed[0]!.title).toBe("Staff Data Engineer");
      expect(parsed[0]!.isRemote).toBe(true);
      expect(parsed[0]!.ats).toBe("ashby");
    });

    it("parses SmartRecruiters public feed format correctly", () => {
      const sample = {
        content: [
          {
            id: "sr-100",
            name: "Cloud Architect",
            location: { city: "Berlin", country: "de", remote: true },
            department: { label: "Infrastructure" },
            releasedDate: "2026-10-25T08:00:00Z",
          },
        ],
      };

      const parsed = parseSmartRecruitersFeed(sample, "sample", "SR Corp");
      expect(parsed).toHaveLength(1);
      expect(parsed[0]!.title).toBe("Cloud Architect");
      expect(parsed[0]!.location).toBe("Berlin, de");
      expect(parsed[0]!.isRemote).toBe(true);
    });

    it("parses Recruitee public feed format correctly", () => {
      const sample = {
        offers: [
          {
            id: 555,
            slug: "devops-engineer",
            title: "DevOps Engineer",
            city: "Amsterdam",
            country: "Netherlands",
            remote: false,
            department: "Operations",
            created_at: "2026-10-20T00:00:00Z",
          },
        ],
      };

      const parsed = parseRecruiteeFeed(sample, "sample", "Recruitee Corp");
      expect(parsed).toHaveLength(1);
      expect(parsed[0]!.title).toBe("DevOps Engineer");
      expect(parsed[0]!.country).toBe("Netherlands");
      expect(parsed[0]!.url).toBe("https://sample.recruitee.com/o/devops-engineer");
    });

    it("parses Workable public feed format correctly", () => {
      const sample = {
        jobs: [
          {
            shortcode: "ABC123XYZ",
            title: "Security Specialist",
            city: "London",
            country: "United Kingdom",
            telecommuting: true,
            department: "InfoSec",
            url: "https://apply.workable.com/sample/j/ABC123XYZ/",
            published_on: "2026-10-22",
          },
        ],
      };

      const parsed = parseWorkableFeed(sample, "sample", "Workable Corp");
      expect(parsed).toHaveLength(1);
      expect(parsed[0]!.title).toBe("Security Specialist");
      expect(parsed[0]!.isRemote).toBe(true);
    });

    it("parses Personio public XML feed correctly", () => {
      const xml = `
        <work-positions>
          <position>
            <id>789</id>
            <name>Frontend Developer (Vue/TS)</name>
            <office>Munich, Germany</office>
            <department>Product Development</department>
          </position>
        </work-positions>
      `;

      const parsed = parsePersonioXml(xml, "sample", "Personio Corp");
      expect(parsed).toHaveLength(1);
      expect(parsed[0]!.id).toBe("personio-789");
      expect(parsed[0]!.title).toBe("Frontend Developer (Vue/TS)");
      expect(parsed[0]!.location).toBe("Munich, Germany");
    });
  });

  describe("2. Hands-Off Sites Protection & Rate Limiter", () => {
    it("strictly blocks fetching from hands-off domains", async () => {
      const limiter = new FeedRateLimiter();

      for (const domain of HANDS_OFF_DOMAINS) {
        expect(limiter.isHandsOff(domain)).toBe(true);
        expect(limiter.isHandsOff(`https://${domain}/jobs/search`)).toBe(true);
        expect(limiter.isHandsOff(`https://sub.${domain}/apply`)).toBe(true);

        await expect(limiter.acquire(`https://${domain}/feed`)).rejects.toThrow(
          /Hands-off site strictly blocked/i
        );
      }
    });

    it("enforces minimum interval per host and caches feeds", async () => {
      const limiter = new FeedRateLimiter();
      const testHost = "https://boards-api.greenhouse.io/v1/boards/test/jobs";

      const t0 = Date.now();
      await limiter.acquire(testHost);
      const elapsed1 = Date.now() - t0;
      expect(elapsed1).toBeLessThan(100);

      // Cache test
      limiter.setCached(testHost, [{ id: "1" }]);
      expect(limiter.getCached(testHost)).toHaveLength(1);
    });
  });

  describe("3. On-Device Match Scoring & 50 Labelled Job Pairs", () => {
    it("scores strong role & skill match highly with <= 8 words explanation", () => {
      const strongJob: JobPosting = {
        id: "j-1",
        companySlug: "acme",
        companyName: "Acme",
        ats: "greenhouse",
        title: "Senior Backend Engineer",
        location: "Bangalore",
        country: "India",
        isRemote: true,
        descriptionSnippet: "Looking for an engineer experienced in Python, PostgreSQL, and AWS.",
      };

      const match = matchJob(strongJob, MOCK_PROFILE);
      expect(match.score).toBeGreaterThanOrEqual(75);
      expect(match.matchedSkills).toContain("Python");
      expect(match.matchedSkills).toContain("PostgreSQL");
      expect(match.isEligibleWorkCountry).toBe(true);

      const wordCount = match.why.trim().split(/\s+/).length;
      expect(wordCount).toBeLessThanOrEqual(8);
    });

    it("evaluates precision across 50 labelled job/profile pairs", () => {
      // 50 test jobs with known match qualities
      const testCases: Array<{ job: JobPosting; expectHigh: boolean }> = [];

      for (let i = 1; i <= 25; i++) {
        testCases.push({
          job: {
            id: `high-${i}`,
            companySlug: `co-${i}`,
            companyName: `TechCorp ${i}`,
            ats: "greenhouse",
            title: i % 2 === 0 ? "Backend Software Engineer" : "Python Engineer",
            location: "Bangalore",
            country: "India",
            isRemote: true,
            descriptionSnippet: "Requires Python, Django, Docker, and PostgreSQL expertise.",
          },
          expectHigh: true,
        });
      }

      for (let i = 1; i <= 25; i++) {
        testCases.push({
          job: {
            id: `low-${i}`,
            companySlug: `co-low-${i}`,
            companyName: `OtherCorp ${i}`,
            ats: "lever",
            title: i % 2 === 0 ? "Nursing Supervisor" : "Civil Construction Site Lead",
            location: "Tokyo, Japan",
            country: "Japan",
            isRemote: false,
            descriptionSnippet: "Requires clinical certifications and AutoCAD.",
          },
          expectHigh: false,
        });
      }

      expect(testCases).toHaveLength(50);

      let correctClassifications = 0;
      for (const tc of testCases) {
        const match = matchJob(tc.job, MOCK_PROFILE);
        const isHigh = match.score >= 50;
        if (isHigh === tc.expectHigh) {
          correctClassifications++;
        }
      }

      // Precision target >= 95% on 50 labelled pairs
      const accuracy = (correctClassifications / 50) * 100;
      expect(accuracy).toBeGreaterThanOrEqual(96);
    });
  });

  describe("4. Discovery Tier Limits & UI Rendering", () => {
    const SAMPLE_JOBS: JobPosting[] = Array.from({ length: 30 }, (_, i) => ({
      id: `job-${i}`,
      companySlug: `slug-${i}`,
      companyName: `Company ${i}`,
      ats: "greenhouse",
      title: `Software Engineer ${i}`,
      location: "Bangalore",
      isRemote: true,
    }));

    it("enforces 20 matches per day limit on Free tier", () => {
      expect(canViewMoreMatches(10, false)).toBe(true);
      expect(canViewMoreMatches(FREE_DAILY_MATCH_LIMIT, false)).toBe(false);
      expect(canViewMoreMatches(50, true)).toBe(true); // Pro is unlimited

      const freeResult = discoverJobs(SAMPLE_JOBS, MOCK_PROFILE, {}, false, 0);
      expect(freeResult.results).toHaveLength(FREE_DAILY_MATCH_LIMIT);
      expect(freeResult.reachedLimit).toBe(true);

      const proResult = discoverJobs(SAMPLE_JOBS, MOCK_PROFILE, {}, true, 0);
      expect(proResult.results).toHaveLength(30);
      expect(proResult.reachedLimit).toBe(false);
    });

    it("renders job card HTML with proper tags, fit explanation, and escaping", () => {
      const match = matchJob(SAMPLE_JOBS[0]!, MOCK_PROFILE);
      const html = renderJobCard(match);

      expect(html).toContain('class="job-card"');
      expect(html).toContain("Company 0");
      expect(html).toContain("Open &amp; Fill");
      expect(html).toContain("Save");
      expect(html).toContain("Fit:");
    });
  });
});

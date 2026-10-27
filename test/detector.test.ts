/** Where the silent detector may run, and how a tab's frames' findings combine into one badge. */

import { describe, expect, it } from "vitest";
import { badgeFor, detectorMatches, mergeDetection } from "../src/background/detector";
import { isJobHost, JOB_SITE_MATCHES, shouldDetect } from "../src/shared/platforms";
import type { Detection } from "../src/shared/types";

const d = (kind: Detection["kind"], extra: Partial<Detection> = {}): Detection => ({
  kind, platform: "Acme", jobTitle: "", hasApplyButton: false, url: "https://careers.acme.com/x", ...extra,
});

describe("detectorMatches: where the page script is registered", () => {
  const granted = ["https://*.greenhouse.io/*", "https://careers.acme.com/*", "https://www.example.com/*", "http://127.0.0.1:8181/*"];

  it("every site the user allowed one by one, whatever the detection setting (it must answer the panel there)", () => {
    for (const mode of ["off", "job_sites", "allowed_sites"] as const) expect(detectorMatches(granted, mode), mode).toEqual(granted);
  });

  it("access to all sites still means job sites only, unless the user chose every site", () => {
    expect(detectorMatches(["<all_urls>"], "job_sites")).toEqual(JOB_SITE_MATCHES);
    expect(detectorMatches(["<all_urls>"], "off")).toEqual(JOB_SITE_MATCHES);
    expect(detectorMatches(["<all_urls>"], "allowed_sites")).toEqual(["<all_urls>"]);
  });

  it("ignores malformed origins", () => {
    expect(detectorMatches(["nonsense", ""], "allowed_sites")).toEqual([]);
  });
});

describe("shouldDetect: whether the page script silently reads the page", () => {
  it("off never; job sites only on ATS and careers sites; every allowed site when chosen", () => {
    expect(shouldDetect("off", "https://boards.greenhouse.io/acme/jobs/1")).toBe(false);
    expect(shouldDetect("job_sites", "https://boards.greenhouse.io/acme/jobs/1")).toBe(true);
    expect(shouldDetect("job_sites", "https://careers.acme.com/apply")).toBe(true);
    expect(shouldDetect("job_sites", "https://www.example.com/")).toBe(false);
    expect(shouldDetect("allowed_sites", "https://www.example.com/")).toBe(true);
    expect(shouldDetect("job_sites", "not a url")).toBe(false);
  });
});

describe("isJobHost", () => {
  it("knows ATS and careers hosts", () => {
    for (const h of ["boards.greenhouse.io", "*.lever.co", "careers.acme.com", "jobs.acme.in", "acme.jobs", "acme.wd5.myworkdayjobs.com"]) {
      expect(isJobHost(h), h).toBe(true);
    }
    for (const h of ["www.example.com", "mail.google.com", "acme.com", "careersacme.com"]) expect(isJobHost(h), h).toBe(false);
  });
});

describe("mergeDetection", () => {
  it("an embedded form beats the job description around it, in either order", () => {
    const page = { detection: d("job_page"), frameId: 0 };
    const form = { detection: d("application_form"), frameId: 5 };
    expect(mergeDetection(page, form)).toBe(form);
    expect(mergeDetection(form, page)).toBe(form);
  });

  it("a frame replaces its own earlier report (the form went away)", () => {
    const form = { detection: d("application_form"), frameId: 0 };
    const gone = { detection: d("other"), frameId: 0 };
    expect(mergeDetection(form, gone)).toBe(gone);
  });
});

describe("badgeFor", () => {
  it("✓ when everything can be filled, the number of questions otherwise", () => {
    expect(badgeFor(d("application_form", { fill: 6, ask: 0, total: 6 })).text).toBe("✓");
    expect(badgeFor(d("application_form", { fill: 4, ask: 2, total: 6 })).text).toBe("2");
    expect(badgeFor(d("application_form", { ask: 250 })).text).toBe("99");
  });

  it("job page •, sign-in wall !, nothing for other pages", () => {
    expect(badgeFor(d("job_page")).text).toBe("•");
    expect(badgeFor(d("login_wall")).text).toBe("!");
    expect(badgeFor(d("other")).text).toBe("");
  });
});

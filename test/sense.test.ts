/** Silent page understanding: job application forms are recognised; everything else is left alone. */

import { describe, expect, it } from "vitest";
import { sensePage } from "../src/content/sense";
import { isHandsOff, platformFor } from "../src/shared/platforms";
import { APPLICATION_FORM, mount } from "./fixtures";

const OTHER = "https://www.example.com/page";

describe("platform policy", () => {
  it("keeps hands off job platforms whose terms forbid automation", () => {
    for (const url of ["https://www.linkedin.com/jobs/view/123", "https://in.indeed.com/viewjob?jk=1", "https://www.naukri.com/job-listings-x",
      "https://www.glassdoor.co.in/job-listing/x", "https://wellfound.com/jobs/1", "https://www.foundit.in/job/x"]) {
      expect(isHandsOff(url), url).toBe(true);
    }
  });

  it("helps on company ATS and career sites", () => {
    expect(platformFor("https://boards.greenhouse.io/acme/jobs/1")).toMatchObject({ policy: "assist", ats: true, name: "Greenhouse" });
    expect(platformFor("https://acme.wd5.myworkdayjobs.com/en-US/careers/job/x")).toMatchObject({ ats: true, name: "Workday" });
    expect(platformFor("https://careers.acme.com/apply/7")).toMatchObject({ policy: "assist", ats: false });
    expect(isHandsOff("https://linkedin.com.evil.example/jobs")).toBe(false); // lookalike hosts are not LinkedIn
  });
});

describe("sensePage", () => {
  it("recognises a job application form even on an unknown site", () => {
    mount(APPLICATION_FORM);
    const sense = sensePage(document, "https://careers.acme.com/apply/backend-engineer");
    expect(sense.kind).toBe("application_form");
    expect(sense.reasons.join(" ")).toMatch(/resume upload/);
  });

  it("ignores login, sign-up, checkout, newsletter, contact and search forms", () => {
    const cases: Record<string, string> = {
      login: `<form><label>Email<input type="email"></label><label>Password<input type="password"></label><button>Sign in</button></form>`,
      signup: `<form><label>Full name<input></label><label>Email<input type="email"></label><label>Password<input type="password"></label><label>Phone<input type="tel"></label></form>`,
      checkout: `<form><label>Name<input></label><label>Email<input type="email"></label><label>Card number<input autocomplete="cc-number"></label><label>CVV<input></label></form>`,
      newsletter: `<form><label>Email<input type="email"></label><button>Subscribe</button></form>`,
      contact: `<h1>Contact us</h1><form><label>Name<input></label><label>Email<input type="email"></label><label>Phone<input type="tel"></label><label>Message<textarea></textarea></label></form>`,
      search: `<form><input type="search" placeholder="Search"><button>Go</button></form>`,
    };
    for (const [name, html] of Object.entries(cases)) {
      mount(html);
      expect(sensePage(document, OTHER).kind, name).toBe("other");
    }
  });

  it("does not mistake a careers-site sign-up for an application", () => {
    mount(`<h1>Create your candidate account</h1><form><label>Email<input type="email"></label><label>Password<input type="password"></label>
      <label>First name<input></label><label>Last name<input></label></form>`);
    expect(sensePage(document, "https://careers.acme.com/signup").kind).not.toBe("application_form");
  });

  it("recognises a login wall on an ATS (e.g. Workday asks to sign in first)", () => {
    mount(`<h1>Sign In</h1><form><label>Email Address<input type="email"></label><label>Password<input type="password"></label><button>Sign In</button></form>`);
    expect(sensePage(document, "https://acme.wd5.myworkdayjobs.com/en-US/careers/login").kind).toBe("login_wall");
  });

  it("recognises a job description page with an Apply button (form not open yet)", () => {
    mount(`<script type="application/ld+json">{"@context":"https://schema.org","@type":"JobPosting","title":"Data Engineer"}</script>
      <h1>Data Engineer</h1><p>About the role…</p><a href="/apply">Apply now</a>`);
    const sense = sensePage(document, "https://careers.acme.com/jobs/data-engineer");
    expect(sense).toMatchObject({ kind: "job_page", hasApplyButton: true, jobTitle: "Data Engineer" });
  });

  it("reads JobPosting data inside a @graph and survives malformed structured data", () => {
    mount(`<script type="application/ld+json">{ not json</script>
      <script type="application/ld+json">{"@graph":[{"@type":"Organization"},{"@type":["JobPosting"]}]}</script>
      <h1>Analyst</h1><button>Apply</button>`);
    expect(sensePage(document, "https://acme.com/role/analyst").kind).toBe("job_page");
  });

  it("an ordinary article page is 'other'", () => {
    mount(`<h1>How we build software</h1><p>Text</p><a href="/x">Read more</a>`);
    expect(sensePage(document, "https://blog.acme.com/post").kind).toBe("other");
  });
});

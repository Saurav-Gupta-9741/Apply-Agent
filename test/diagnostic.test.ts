/** "Report a problem" must help fix the site without exposing the user: questions and decisions only. */

import { describe, expect, it } from "vitest";
import { buildDiagnostic } from "../src/shared/diagnostic";
import type { FieldResult, RunReport } from "../src/shared/types";
import { PROFILE } from "./fixtures";

const field = (label: string, extra: Partial<FieldResult> = {}): FieldResult => ({
  field: { key: "k", label, control: "text", required: true, options: [], name: "", autocomplete: "", placeholder: "" },
  decision: { kind: "profile", key: "email", value: PROFILE.email },
  status: "filled",
  ...extra,
});

const REPORT: RunReport = {
  status: "needs_user",
  platform: "greenhouse",
  url: "https://job-boards.greenhouse.io/acme/jobs/1?token=SECRET&email=asha@example.com",
  jobTitle: "Engineer",
  captcha: false,
  errors: [`The email ${PROFILE.email} is already registered. Call +91 98765 43210 for help.`],
  fields: [
    field("Email"),
    field("City", { decision: { kind: "answer", value: "Pune, India", question: "City" }, status: "already_filled", detail: "Pune, India" }),
    field("Location", { decision: { kind: "profile", key: "location", value: "Pune" }, status: "failed", detail: 'no option matches "Pune"' }),
    field("Why us?", { decision: { kind: "ask", reason: "unknown" }, status: "needs_user" }),
    field(`Is ${PROFILE.firstName} your preferred name?`, { decision: { kind: "skip", reason: "optional choice" }, status: "skipped" }),
  ],
};

const META = { version: "0.4.0", browser: "Chrome 141", when: "2026-10-26T00:00:00Z" };

describe("buildDiagnostic", () => {
  const text = buildDiagnostic(REPORT, META, { ...PROFILE, location: "Pune" });
  const data = JSON.parse(text);

  it("keeps what helps fix the site: questions, types, decisions, outcomes", () => {
    expect(data).toMatchObject({ applyAgent: "0.4.0", platform: "greenhouse", result: "needs_user" });
    expect(data.fields.map((f: { question: string }) => f.question)).toContain("Why us?");
    expect(data.fields[0]).toMatchObject({ question: "Email", type: "text", decision: "profile: email", outcome: "filled" });
    expect(data.fields[3].decision).toBe("asked you (unknown)");
  });

  it("never contains the user's details, answers, page values, tokens or contact numbers", () => {
    for (const secret of [PROFILE.email, PROFILE.firstName, PROFILE.lastName, PROFILE.phone, "Pune", "SECRET", "98765"]) {
      expect(text, secret).not.toContain(secret);
    }
    expect(data.page).toBe("https://job-boards.greenhouse.io/acme/jobs/1");
    expect(data.siteMessages[0]).toBe("The email [email] is already registered. Call [number] for help.");
    expect(data.fields[2].problem).toBe('no option matches "…"');
  });

  it("a page where nothing was found still gives a useful report", () => {
    expect(JSON.parse(buildDiagnostic(undefined, { ...META, url: "https://acme.com/careers?ref=x" }))).toMatchObject({
      page: "https://acme.com/careers", result: "no application form found",
    });
  });
});

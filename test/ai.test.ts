import { afterEach, describe, expect, it } from "vitest";
import { aiStatus, buildDraftPrompt, checkDraft, draftAnswer, INSUFFICIENT, profileFacts } from "../src/shared/ai";
import { EMPTY_PROFILE } from "../src/shared/storage";

const ME = { ...EMPTY_PROFILE, email: "asha@example.com", phone: "+91 9", currentTitle: "Data Analyst", experienceYears: "2", skills: "SQL, Python" };
const JOB = { title: "Analytics Engineer", company: "Acme" };

function fakeModel(reply: string) {
  (globalThis as Record<string, unknown>).LanguageModel = {
    availability: async () => "available",
    create: async () => ({ prompt: async () => reply, destroy: () => undefined }),
  };
}

afterEach(() => {
  delete (globalThis as Record<string, unknown>).LanguageModel;
});

describe("prompt grounding", () => {
  it("gives the model only profile facts, never contact details", () => {
    const prompt = buildDraftPrompt("Why do you want to join Acme?", ME, JOB);
    expect(prompt).toContain("Current title: Data Analyst");
    expect(prompt).toContain("Total years of experience: 2");
    expect(prompt).not.toContain("asha@example.com");
    expect(prompt).not.toContain("+91");
    expect(profileFacts(EMPTY_PROFILE)).toEqual([]);
  });

  it("flags numbers that are not in the profile", () => {
    expect(checkDraft("I have 2 years of SQL experience.", ME, JOB)).toEqual([]);
    expect(checkDraft("I have 5 years of SQL and led a team of 12.", ME, JOB)[0]).toMatch(/5, 12/);
  });
});

describe("draftAnswer", () => {
  it("is unavailable when Chrome has no built-in model", async () => {
    expect(await aiStatus()).toBe("unavailable");
    expect(await draftAnswer("Why us?", ME, JOB)).toBeNull();
  });

  it("returns the model's draft", async () => {
    fakeModel("I enjoy turning data into decisions and want to grow as an analytics engineer.");
    expect(await draftAnswer("Why us?", ME, JOB)).toMatch(/analytics engineer/);
  });

  it("returns nothing when the model says the facts are insufficient", async () => {
    fakeModel(INSUFFICIENT);
    expect(await draftAnswer("Describe your Kubernetes experience", ME, JOB)).toBeNull();
  });
});

/** Behaviour of the modules wired in by arena-fix: machine-translation safety, translator, EEO country rules,
 * Japanese dates, kanban columns, the feed rate limiter and Discover's company choice. */
import { afterEach, describe, expect, it, vi } from "vitest";
import { decideWithMeaning } from "../src/content/meaning";
import { formatDateFor } from "../src/content/fill";
import { EMPTY_PROFILE } from "../src/shared/storage";
import { FeedRateLimiter } from "../src/shared/jobs/rate-limiter";
import { clearTranslationCache, translateFieldsOnDevice } from "../src/shared/locale/translator";
import { KANBAN_COLUMNS, renderKanbanBoard } from "../src/sidepanel/kanban";
import { rankCompanies } from "../src/shared/jobs/companies";
import { searchProfile } from "../src/shared/jobs/matching";
import type { FieldDescriptor, Profile } from "../src/shared/types";
import { PROFILE } from "./fixtures";

const field = (label: string, extra: Partial<FieldDescriptor> = {}): FieldDescriptor =>
  ({ key: "k", label, control: "select", required: true, options: ["Yes", "No"], name: "", autocomplete: "", placeholder: "", ...extra });
const ME: Profile = { ...PROFILE, country: "India", facts: { ...EMPTY_PROFILE.facts!, workCountries: "India", gender: "Female", race: "Asian" } };

describe("machine-translated questions only fill basic contact fields", () => {
  it("a translated work-permit question asks, even though the same English question fills", () => {
    const english = field("Are you legally authorized to work in India?");
    expect(decideWithMeaning(english, ME, []).kind).toBe("answer");
    const translated = { ...english, label: "インドで働く許可がありますか？", translatedLabel: english.label, machineTranslated: true };
    expect(decideWithMeaning(translated, ME, []).kind).toBe("ask");
  });
  it("a translated email field still fills", () => {
    const f = field("E-Mail-Adresse", { control: "text", options: [], translatedLabel: "Email address", machineTranslated: true, autocomplete: "email" });
    expect(decideWithMeaning(f, ME, [])).toMatchObject({ kind: "profile", key: "email" });
  });
});

describe("translateFieldsOnDevice", () => {
  afterEach(() => {
    delete (globalThis as Record<string, unknown>).Translator;
    clearTranslationCache();
  });
  it("uses the browser translator only when the language pair is already available", async () => {
    (globalThis as Record<string, unknown>).Translator = {
      availability: async () => "available",
      create: async () => ({ translate: async (t: string) => (t === "メールアドレス" ? "Email address" : t) }),
    };
    const d = [{ label: "メールアドレス" }] as Array<{ label: string; translatedLabel?: string; machineTranslated?: boolean; originalLabel?: string }>;
    expect(await translateFieldsOnDevice(d, "ja")).toBe(1);
    expect(d[0]).toMatchObject({ translatedLabel: "Email address", machineTranslated: true, originalLabel: "メールアドレス" });
  });
  it("never downloads a model: a language pair that is not available leaves the label alone", async () => {
    const create = vi.fn();
    (globalThis as Record<string, unknown>).Translator = { availability: async () => "downloadable", create };
    const d = [{ label: "メールアドレス" }];
    expect(await translateFieldsOnDevice(d, "ja")).toBe(0);
    expect(create).not.toHaveBeenCalled();
  });
  it("does nothing on English pages or for labels the dictionary already translated", async () => {
    expect(await translateFieldsOnDevice([{ label: "Email" }], "en-US")).toBe(0);
    expect(await translateFieldsOnDevice([{ label: "Vorname", translatedLabel: "First name" }], "de")).toBe(0);
  });
});

describe("EEO country rules", () => {
  const race = field("What is your race/ethnicity?", { options: ["Asian", "White", "Decline to self-identify"] });
  it("fills the user's own answer on a US job", () => {
    expect(decideWithMeaning(race, ME, [], { jobCountries: ["United States"], url: "", applications: [] } as never).kind).toBe("answer");
  });
  it("asks on a job in Germany or France", () => {
    for (const c of ["Germany", "France"]) {
      expect(decideWithMeaning(race, ME, [], { jobCountries: [c], url: "", applications: [] } as never).kind).toBe("ask");
    }
  });
});

describe("Japanese date boxes", () => {
  it("writes 年月日 when the box shows that form", () => {
    const el = document.createElement("input");
    el.setAttribute("placeholder", "yyyy年mm月dd日");
    expect(formatDateFor(el, "2026-05-01")).toBe("2026年05月01日");
  });
  it("keeps the unambiguous ISO date when the box shows no format", () => {
    const el = document.createElement("input");
    expect(formatDateFor(el, "2026-05-01")).toBe("2026-05-01");
  });
});

describe("kanban board", () => {
  it("has a column for every stage, so no job disappears from the board", () => {
    for (const s of ["Saved", "Applied", "Assessment", "Interview", "Offer", "Rejected", "Withdrawn"]) expect(KANBAN_COLUMNS).toContain(s);
    const html = renderKanbanBoard([{ kind: "saved", id: "1", url: "u", title: "QA <b>", company: "Acme", stage: "Assessment", notes: "", followUpAt: "", createdAt: "" }]);
    expect(html).toContain('data-stage="Assessment"');
    expect(html).toContain("QA &lt;b&gt;");
    expect(html).not.toContain("<b>");
  });
});

describe("feed rate limiter", () => {
  it("two requests to one host at the same moment are still 2 s apart", async () => {
    vi.useFakeTimers();
    try {
      const l = new FeedRateLimiter();
      const start = Date.now();
      const times: number[] = [];
      const a = l.acquire("https://boards-api.greenhouse.io/v1/boards/a/jobs").then(() => times.push(Date.now() - start));
      const b = l.acquire("https://boards-api.greenhouse.io/v1/boards/b/jobs").then(() => times.push(Date.now() - start));
      await vi.advanceTimersByTimeAsync(5000);
      await Promise.all([a, b]);
      times.sort((x, y) => x - y);
      expect(times[1]! - times[0]!).toBeGreaterThanOrEqual(2000);
    } finally {
      vi.useRealTimers();
    }
  });
  it("blocks hands-off sites", async () => {
    await expect(new FeedRateLimiter().acquire("https://www.linkedin.com/jobs/view/1")).rejects.toThrow(/Hands-off/);
  });
});

describe("Discover company choice", () => {
  it("puts the user's own companies first, leaves out unverified ones, then ranks by field and country", () => {
    const all = [
      { slug: "a", name: "A", ats: "greenhouse", country: "India", industry: "", unverified: true, jobCount: 50 },
      { slug: "b", name: "B", ats: "greenhouse", country: "Germany", industry: "", jobCount: 40, hires: { DE: 40 }, families: { software: 30 } },
      { slug: "c", name: "C", ats: "lever", country: "India", industry: "", jobCount: 40, hires: { IN: 35 }, families: { software: 30 } },
      { slug: "s", name: "S", ats: "lever", country: "India", industry: "", jobCount: 40, hires: { IN: 40 }, families: { sales: 40 } },
    ] as never;
    const sp = searchProfile({ ...EMPTY_PROFILE, country: "India", targetRoles: "Software Engineer" });
    const mine = [{ ats: "ashby" as const, slug: "mine", name: "Mine", addedAt: "", source: "" }];
    expect(rankCompanies(all, mine, sp).map((c) => c.slug)).toEqual(["mine", "c", "b", "s"]);
  });
});

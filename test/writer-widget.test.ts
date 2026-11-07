/** The draft widget's writer choice (Chrome's built-in model mocked; Playwright's Chromium has none) and the fact
 * check between the model and the preview. */

import { afterEach, describe, expect, it, vi } from "vitest";
import { createDraftWidget } from "../src/sidepanel/drafts";
import type { FieldDescriptor, Profile } from "../src/shared/types";
import { mount, PROFILE } from "./fixtures";

const RESUME = [
  "Data Engineer, Acme Pay (2021 to present): built batch and streaming data pipelines in Python and Apache Airflow that process about 40 million payment events per day.",
  "Data Engineer, Acme Pay: led the migration of 120 tables from MySQL to BigQuery with zero data loss.",
].join("\n");
const ME: Profile = {
  ...PROFILE, currentTitle: "Data Engineer", currentCompany: "Acme Pay", skills: "Python, SQL, BigQuery, Airflow",
  resume: { name: "resume.txt", type: "text/plain", dataBase64: btoa(RESUME) },
};
const field: FieldDescriptor = { key: "f1", label: "Why Salesforce?", control: "textarea", required: true, options: [], name: "", autocomplete: "", placeholder: "" };

function widget(onUse: (t: string) => void = () => undefined): HTMLElement {
  mount("<div id='card'></div>");
  const w = createDraftWidget({ question: "Why Salesforce?", field, profile: ME, job: { title: "Data Engineer", company: "Salesforce" }, onUse });
  document.getElementById("card")!.append(w);
  return w;
}

type Monitor = { addEventListener: (t: string, f: (e: { loaded: number }) => void) => void };
function fakeNano(availability: string, reply = "", progress: number[] = []) {
  (globalThis as Record<string, unknown>).LanguageModel = {
    availability: async () => availability,
    create: async (o?: { monitor?: (m: Monitor) => void }) => {
      o?.monitor?.({ addEventListener: (_t, f) => progress.forEach((loaded) => f({ loaded })) });
      return { prompt: async () => reply, destroy: () => undefined };
    },
  };
}
const button = (w: HTMLElement, label: string) => [...w.querySelectorAll("button")].find((b) => b.textContent === label);

afterEach(() => {
  delete (globalThis as Record<string, unknown>).LanguageModel;
});

describe("draft widget: which writer", () => {
  it("without Chrome AI, offers our own writer with a plain consent line, and types nothing", async () => {
    let usedText = "";
    const w = widget((t) => { usedText = t; });
    const trigger = w.querySelector<HTMLButtonElement>(".draft-trigger")!;
    expect(trigger.textContent).toBe("Draft answer");
    trigger.click();
    await vi.waitFor(() => expect(w.querySelector(".writer-setup")).not.toBeNull());
    expect(w.textContent).toContain("First, ApplyAgent needs one download. After that it writes answers on this computer, and your details are never sent anywhere.");
    expect(w.textContent).toContain("Size: 1.1 GB");
    expect(w.textContent).toContain("Please use Wi-Fi, not mobile data.");
    expect(w.textContent).not.toContain("Chrome's built-in AI");
    expect(usedText).toBe("");
  });

  it("when Chrome can download Gemini Nano, offers that download next to our model (it used to be treated as unavailable)", async () => {
    const seen: number[] = [];
    fakeNano("downloadable", "I built batch and streaming data pipelines in Python and Apache Airflow at Acme Pay that process about 40 million payment events per day.", [0.25, 0.5, 1]);
    const w = widget();
    w.querySelector<HTMLButtonElement>(".draft-trigger")!.click();
    await vi.waitFor(() => expect(button(w, "Download Chrome's built-in AI")).toBeDefined());
    expect(w.textContent).toContain("First, ApplyAgent needs one download"); // our model is still offered
    // After its download Chrome reports the model ready.
    (globalThis as unknown as { LanguageModel: { availability: () => Promise<string> } }).LanguageModel.availability = async () => (seen.push(1), "available");
    button(w, "Download Chrome's built-in AI")!.click();
    await vi.waitFor(() => expect(w.querySelector<HTMLTextAreaElement>(".draft-textarea")?.value).toContain("Apache Airflow"));
    expect(seen.length).toBeGreaterThan(0);
  });

  it("with Gemini Nano ready: the draft passes the fact checker before it is shown, and Use types it", async () => {
    fakeNano("available", "Sure, here is an answer:\nI built batch and streaming data pipelines in Python and Apache Airflow at Acme Pay that process about 40 million payment events per day. I led a team of 4 engineers there. I led the migration of 120 tables from MySQL to BigQuery with zero data loss.");
    let usedText = "";
    const w = widget((t) => { usedText = t; });
    w.querySelector<HTMLButtonElement>(".draft-trigger")!.click();
    await vi.waitFor(() => expect(w.querySelector(".draft-textarea")).not.toBeNull());
    const text = w.querySelector<HTMLTextAreaElement>(".draft-textarea")!.value;
    expect(text).not.toMatch(/Sure|team of 4/);
    expect(text).toMatch(/120 tables/);
    expect(w.querySelector(".draft-removed")!.textContent).toContain("the number 4 is not in your profile or resume");
    expect(usedText).toBe("");
    expect(w.textContent).toContain("Please read this draft.");
    button(w, "Use this answer")!.click();
    await vi.waitFor(() => expect(usedText).toBe(text));
  });

  it("with Gemini Nano ready: an invented answer becomes 'not enough facts'", async () => {
    fakeNano("available", "I have 6 years of Kubernetes experience and I managed a team of 9 engineers at Salesforce.");
    const w = widget();
    w.querySelector<HTMLButtonElement>(".draft-trigger")!.click();
    await vi.waitFor(() => expect(w.querySelector(".draft-insufficient")).not.toBeNull());
    expect(w.textContent).toContain("does not know enough about you to write this answer without guessing");
    expect(w.querySelector(".draft-textarea")).toBeNull();
  });
});

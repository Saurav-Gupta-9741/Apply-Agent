/** One step harder: multi-step applications, the buttons the agent may press, forms inside web components
 * (shadow DOM) and forms in other languages. */

import { describe, expect, it } from "vitest";
import { primaryAction } from "../src/content/adapters";
import { runOnce, submitForm } from "../src/content/agent";
import { decide } from "../src/content/classify";
import { extractFields } from "../src/content/extract";
import { normalize } from "../src/shared/text";
import type { FieldDescriptor } from "../src/shared/types";
import { mount, PROFILE } from "./fixtures";

/** A three-step wizard in one page, like Workday or SmartRecruiters: "Next" is a submit-type button underneath. */
function mountWizard(opts: { stuck?: boolean; errorOnStep1?: boolean } = {}): { submits: () => number } {
  let submits = 0;
  mount(`<h1>Platform Engineer</h1><form id="wizard" novalidate><div id="step"></div></form>`);
  const step = document.getElementById("step")!;
  const steps = [
    `<div class="field"><label for="fn">First name *</label><input id="fn" required></div>
     <div class="field"><label for="ln">Last name *</label><input id="ln" required></div>
     <div class="field"><label for="em">Email *</label><input id="em" type="email" required></div>
     <button type="button">Apply with LinkedIn</button><button type="submit">Next</button>`,
    `<div class="field"><label for="ph">Phone number *</label><input id="ph" type="tel" required></div>
     <div class="field"><label for="why">Anything else you'd like to share?</label><textarea id="why"></textarea></div>
     <button type="button">Back</button><button type="submit">Continue</button>`,
    `<div class="field"><label for="li">LinkedIn profile</label><input id="li"></div>
     <div class="field"><label for="ct">City *</label><input id="ct" required></div>
     <button type="button">Save draft</button><button type="submit">Submit application</button>`,
  ];
  let index = 0;
  step.innerHTML = steps[0]!;
  document.getElementById("wizard")!.addEventListener("submit", (e) => {
    e.preventDefault();
    if (opts.stuck) return;
    if (opts.errorOnStep1 && index === 0) {
      step.insertAdjacentHTML("beforeend", `<p role="alert">Please verify your email address first.</p>`);
      return;
    }
    if (index === steps.length - 1) {
      submits++;
      document.body.innerHTML = "<h1>Thank you for applying!</h1>";
      return;
    }
    setTimeout(() => (step.innerHTML = steps[++index]!), 50); // the next step renders a moment later
  });
  return { submits: () => submits };
}

const PROFILE_WITH_CITY = { ...PROFILE, location: "Pune" };
const FAST = { stepTimeoutMs: 3000 };

describe("multi-step applications", () => {
  it("review mode: fills every step, presses Next/Continue, stops at the final Submit without pressing it", async () => {
    const wizard = mountWizard();
    const report = await runOnce(document, { profile: PROFILE_WITH_CITY, answers: [], mode: "review", ...FAST });
    expect(report.status).toBe("ready_to_submit");
    expect(report.steps).toBe(3);
    expect(wizard.submits()).toBe(0);
    expect((document.getElementById("ct") as HTMLInputElement).value).toBe("Pune");
    const labels = report.fields.map((f) => f.field.label);
    expect(labels).toEqual(expect.arrayContaining(["First name", "Phone number", "City"]));
    expect(report.fields.find((f) => f.field.label === "First name")?.detail).toMatch(/^Step 1/);
  });

  it("auto mode: registers the submission once, only at the last step, and reports the confirmation", async () => {
    const wizard = mountWizard();
    const registered: number[] = [];
    const report = await runOnce(document, { profile: PROFILE_WITH_CITY, answers: [], mode: "auto", ...FAST },
      async () => void registered.push(wizard.submits()));
    expect(report.status).toBe("submitted_confirmed");
    expect(registered).toEqual([0]); // registered before the one real submission
    expect(wizard.submits()).toBe(1);
  });

  it("Submit from the panel on a 'Next' step is refused: nothing is recorded as applied", async () => {
    mountWizard();
    let registered = false;
    const report = await submitForm(document, 500, async () => void (registered = true));
    expect(report.status).toBe("needs_user");
    expect(report.errors.join(" ")).toMatch(/isn't the last step/);
    expect(registered).toBe(false);
  });

  it("stops with the site's message when a step is rejected", async () => {
    mountWizard({ errorOnStep1: true });
    const report = await runOnce(document, { profile: PROFILE_WITH_CITY, answers: [], mode: "auto", ...FAST });
    expect(report.status).toBe("needs_user");
    expect(report.errors).toEqual(["Please verify your email address first."]);
  });

  it("stops and says so when Next does nothing (no endless clicking)", async () => {
    mountWizard({ stuck: true });
    const report = await runOnce(document, { profile: PROFILE_WITH_CITY, answers: [], mode: "auto", stepTimeoutMs: 800 });
    expect(report.status).toBe("needs_user");
    expect(report.errors.join(" ")).toMatch(/didn't open a new step/);
  });

  it("asks the user on the step that needs them, keeping earlier steps' work", async () => {
    mountWizard();
    const report = await runOnce(document, { profile: PROFILE, answers: [], mode: "auto", ...FAST }); // no city in profile
    expect(report.status).toBe("needs_user");
    expect(report.steps).toBe(3);
    expect(report.fields.filter((f) => f.status === "needs_user").map((f) => f.field.label)).toEqual(["City"]);
  });
});

describe("primaryAction: which button the agent may press", () => {
  const root = () => document.body;

  it("never presses other sign-ins, resume parsing, drafts, Back or Cancel", () => {
    mount(`<button>Apply with LinkedIn</button><button>Autofill with resume</button><button>Save as draft</button>
      <button>Back</button><button>Cancel</button><button>Sign in</button>`);
    expect(primaryAction(root())).toBeNull();
  });

  it("a final submit wins over Next; Next wins over an unlabelled submit", () => {
    mount(`<button type="submit">Next</button><button>Submit application</button>`);
    expect(primaryAction(root())).toMatchObject({ kind: "submit" });
    mount(`<button type="submit">Weiter</button>`);
    expect(primaryAction(root())).toMatchObject({ kind: "next" });
    mount(`<button type="submit">Go</button>`);
    expect(primaryAction(root())).toMatchObject({ kind: "submit" });
  });

  it("understands other languages", () => {
    for (const [label, kind] of [["Bewerbung absenden", "submit"], ["Postuler", "submit"], ["Enviar candidatura", "submit"],
      ["Suivant", "next"], ["Siguiente", "next"], ["Continuar", "next"]] as const) {
      mount(`<button type="submit">${label}</button>`);
      expect(primaryAction(root())?.kind, label).toBe(kind);
    }
    mount(`<button type="submit">Zurück</button>`);
    expect(primaryAction(root())).toBeNull();
  });
});

describe("forms inside web components (shadow DOM)", () => {
  it("reads labelled fields inside open shadow roots and fills them with events that leave the component", async () => {
    mount(`<h1>Designer</h1><div id="host"></div>`);
    const host = document.getElementById("host")!;
    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = `<form><label for="a">First name *</label><input id="a" required>
      <label for="b">Last name *</label><input id="b" required><label for="c">Email *</label><input id="c" type="email" required>
      <button type="submit">Submit application</button></form>`;
    let heard = 0;
    document.addEventListener("input", () => heard++);
    const fields = extractFields(document.body);
    expect(fields.map((f) => f.descriptor.label)).toEqual(["First name", "Last name", "Email"]);
    const report = await runOnce(document, { profile: PROFILE, answers: [], mode: "review" });
    expect(report.status).toBe("ready_to_submit");
    expect((shadow.getElementById("c") as HTMLInputElement).value).toBe("asha@example.com");
    expect(heard).toBe(3);
  });
});

describe("forms in other languages", () => {
  const field = (label: string, extra: Partial<FieldDescriptor> = {}): FieldDescriptor => ({
    key: "k", label, control: "text", required: true, options: [], name: "", autocomplete: "", placeholder: "", ...extra,
  });
  const kind = (label: string, extra?: Partial<FieldDescriptor>) => {
    const d = decide(field(label, extra), { ...PROFILE, location: "Pune", currentCompany: "Initech" }, []);
    return d.kind === "profile" ? `profile:${d.key}` : d.kind === "ask" ? `ask:${d.topic ?? d.reason}` : d.kind;
  };

  it("fills profile facts in German, French, Spanish, Portuguese, Italian and Dutch", () => {
    const cases: Record<string, string> = {
      Vorname: "profile:firstName", Nachname: "profile:lastName", "E-Mail-Adresse": "profile:email", Telefonnummer: "profile:phone",
      "Prénom": "profile:firstName", Nom: "profile:lastName", Courriel: "profile:email", "Téléphone portable": "profile:phone", Ville: "profile:location",
      Apellidos: "profile:lastName", "Correo electrónico": "profile:email", "Teléfono": "profile:phone", "Nombre completo": "profile:fullName",
      Sobrenome: "profile:lastName", "Nome completo": "profile:fullName", Cognome: "profile:lastName", Voornaam: "profile:firstName",
      "Aktueller Arbeitgeber": "profile:currentCompany", Wohnort: "profile:location",
    };
    for (const [label, expected] of Object.entries(cases)) expect(kind(label), label).toBe(expected);
  });

  it("never guesses sensitive questions in other languages either", () => {
    const cases: Record<string, string> = {
      Gehaltsvorstellung: "ask:salary", "Prétentions salariales": "ask:salary", "Expectativa salarial": "ask:salary",
      "Benötigen Sie eine Arbeitserlaubnis?": "ask:work_authorization", "Kündigungsfrist": "ask:notice_period",
      Geschlecht: "ask:gender", "Fecha de nacimiento": "ask:age", "Ich stimme der Datenschutzerklärung zu": "ask:consent",
      "J'accepte la politique de confidentialité": "ask:consent", Unterschrift: "ask:signature", "Steuer-ID": "ask:identity",
    };
    for (const [label, expected] of Object.entries(cases)) expect(kind(label), label).toBe(expected);
  });

  it("uploads the resume for Lebenslauf / Currículo", () => {
    expect(kind("Lebenslauf", { control: "file" })).toBe("resume");
    expect(kind("Currículo", { control: "file" })).toBe("resume");
  });

  it("normalize drops accents but keeps every script", () => {
    expect(normalize("Prénom")).toBe("prenom");
    expect(normalize("Straße")).toBe("strasse");
    expect(normalize("पूरा नाम")).not.toBe("");
  });
});

import { describe, it, expect } from "vitest";
import {
  detectPageLanguage,
  inspectAndTranslateField,
  translateLabel,
  translateOptions,
} from "../src/shared/i18n-labels";
import { decide } from "../src/content/classify";
import { EMPTY_PROFILE } from "../src/shared/storage";
import type { FieldDescriptor, Profile } from "../src/shared/types";

describe("Step 4b: Non-English form translation & safety traps", () => {
  const me: Profile = {
    ...EMPTY_PROFILE,
    firstName: "Maria",
    lastName: "Schmidt",
    email: "maria.schmidt@example.com",
    phone: "+49 170 1234567",
    facts: {
      ...EMPTY_PROFILE.facts!,
      expectedCtc: "85000",
      currentCtc: "75000",
      noticePeriod: "3 months",
    },
  };

  const makeField = (
    label: string,
    options: string[] = [],
    control: FieldDescriptor["control"] = "text",
    originalLabel?: string
  ): FieldDescriptor => ({
    key: "k",
    label,
    originalLabel,
    name: "field",
    control,
    required: true,
    options,
    autocomplete: "",
    placeholder: "",
  });

  describe("40 Translated-label tests", () => {
    // German (8)
    it("translates German Vorname -> First name", () => {
      expect(translateLabel("Vorname", "de")).toBe("First name");
    });
    it("translates German Nachname -> Last name", () => {
      expect(translateLabel("Nachname", "de")).toBe("Last name");
    });
    it("translates German E-Mail-Adresse -> Email", () => {
      expect(translateLabel("E-Mail-Adresse", "de")).toBe("Email");
    });
    it("translates German Telefonnummer -> Phone", () => {
      expect(translateLabel("Telefonnummer", "de")).toBe("Phone");
    });
    it("translates German Lebenslauf -> Resume", () => {
      expect(translateLabel("Lebenslauf", "de")).toBe("Resume");
    });
    it("translates German Anschreiben -> Cover letter", () => {
      expect(translateLabel("Anschreiben", "de")).toBe("Cover letter");
    });
    it("translates German Gehaltsvorstellung -> Expected salary", () => {
      expect(translateLabel("Gehaltsvorstellung", "de")).toBe("Expected salary");
    });
    it("translates German Kündigungsfrist -> Notice period", () => {
      expect(translateLabel("Kündigungsfrist", "de")).toBe("Notice period");
    });

    // French (8)
    it("translates French Prénom -> First name", () => {
      expect(translateLabel("Prénom", "fr")).toBe("First name");
    });
    it("translates French Nom -> Last name", () => {
      expect(translateLabel("Nom", "fr")).toBe("Last name");
    });
    it("translates French Courriel -> Email", () => {
      expect(translateLabel("Courriel", "fr")).toBe("Email");
    });
    it("translates French Téléphone -> Phone", () => {
      expect(translateLabel("Téléphone", "fr")).toBe("Phone");
    });
    it("translates French Lettre de motivation -> Cover letter", () => {
      expect(translateLabel("Lettre de motivation", "fr")).toBe("Cover letter");
    });
    it("translates French Prétentions salariales -> Expected salary", () => {
      expect(translateLabel("Prétentions salariales", "fr")).toBe("Expected salary");
    });
    it("translates French Préavis -> Notice period", () => {
      expect(translateLabel("Préavis", "fr")).toBe("Notice period");
    });
    it("translates French Ville -> City", () => {
      expect(translateLabel("Ville", "fr")).toBe("City");
    });

    // Spanish (8)
    it("translates Spanish Nombre -> First name", () => {
      expect(translateLabel("Nombre", "es")).toBe("First name");
    });
    it("translates Spanish Apellidos -> Last name", () => {
      expect(translateLabel("Apellidos", "es")).toBe("Last name");
    });
    it("translates Spanish Correo electrónico -> Email", () => {
      expect(translateLabel("Correo electrónico", "es")).toBe("Email");
    });
    it("translates Spanish Teléfono -> Phone", () => {
      expect(translateLabel("Teléfono", "es")).toBe("Phone");
    });
    it("translates Spanish Hoja de vida -> Resume", () => {
      expect(translateLabel("Hoja de vida", "es")).toBe("Resume");
    });
    it("translates Spanish Carta de presentación -> Cover letter", () => {
      expect(translateLabel("Carta de presentación", "es")).toBe("Cover letter");
    });
    it("translates Spanish Expectativa salarial -> Expected salary", () => {
      expect(translateLabel("Expectativa salarial", "es")).toBe("Expected salary");
    });
    it("translates Spanish Período de preaviso -> Notice period", () => {
      expect(translateLabel("Período de preaviso", "es")).toBe("Notice period");
    });

    // Dutch (6)
    it("translates Dutch Voornaam -> First name", () => {
      expect(translateLabel("Voornaam", "nl")).toBe("First name");
    });
    it("translates Dutch Achternaam -> Last name", () => {
      expect(translateLabel("Achternaam", "nl")).toBe("Last name");
    });
    it("translates Dutch E-mailadres -> Email", () => {
      expect(translateLabel("E-mailadres", "nl")).toBe("Email");
    });
    it("translates Dutch Motivatiebrief -> Cover letter", () => {
      expect(translateLabel("Motivatiebrief", "nl")).toBe("Cover letter");
    });
    it("translates Dutch Salarisindicatie -> Expected salary", () => {
      expect(translateLabel("Salarisindicatie", "nl")).toBe("Expected salary");
    });
    it("translates Dutch Opzegtermijn -> Notice period", () => {
      expect(translateLabel("Opzegtermijn", "nl")).toBe("Notice period");
    });

    // Portuguese (6)
    it("translates Portuguese Primeiro nome -> First name", () => {
      expect(translateLabel("Primeiro nome", "pt")).toBe("First name");
    });
    it("translates Portuguese Sobrenome -> Last name", () => {
      expect(translateLabel("Sobrenome", "pt")).toBe("Last name");
    });
    it("translates Portuguese Currículo -> Resume", () => {
      expect(translateLabel("Currículo", "pt")).toBe("Resume");
    });
    it("translates Portuguese Pretensão salarial -> Expected salary", () => {
      expect(translateLabel("Pretensão salarial", "pt")).toBe("Expected salary");
    });
    it("translates Portuguese Aviso prévio -> Notice period", () => {
      expect(translateLabel("Aviso prévio", "pt")).toBe("Notice period");
    });
    it("translates Portuguese Cidade -> City", () => {
      expect(translateLabel("Cidade", "pt")).toBe("City");
    });

    // Hindi-in-English (4)
    it("translates Hinglish Pehla naam -> First name", () => {
      expect(translateLabel("Pehla naam", "hi-en")).toBe("First name");
    });
    it("translates Hinglish Pura naam -> Full name", () => {
      expect(translateLabel("Pura naam", "hi-en")).toBe("Full name");
    });
    it("translates Hinglish Expected CTC kitna hai -> Expected salary", () => {
      expect(translateLabel("Expected CTC kitna hai", "hi-en")).toBe("Expected salary");
    });
    it("translates Hinglish Notice period kitna hai -> Notice period", () => {
      expect(translateLabel("Notice period kitna hai", "hi-en")).toBe("Notice period");
    });
  });

  describe("10 Safety traps (false friends & consent)", () => {
    // 1. German consent checkbox -> never auto-ticked
    it("Trap 1: German consent checkbox 'Ja, ich stimme zu' is flagged as consent", () => {
      const res = inspectAndTranslateField("Ja, ich stimme den Datenschutzbestimmungen zu", [], "de");
      expect(res.isConsent).toBe(true);
      const f = makeField(res.label, [], "checkbox");
      expect(decide(f, me, []).kind).toBe("ask");
    });

    // 2. German Monatsgehalt vs Jahresgehalt frequency trap
    it("Trap 2: German 'Monatsgehalt' is marked as monthly and does not match annual profile salary", () => {
      const res = inspectAndTranslateField("Monatsgehalt", [], "de");
      expect(res.frequency).toBe("monthly");
      expect(res.label).toBe("Expected monthly salary");
      const f = makeField(res.label, [], "text");
      // Annual salary in profile (85000) must NOT be filled into monthly salary
      const d = decide(f, me, []);
      expect(d.kind === "ask" || (d.kind === "profile" && d.value !== "85000")).toBe(true);
    });

    // 3. French consent trap -> never auto-ticked
    it("Trap 3: French consent 'J'accepte les conditions' is flagged as consent", () => {
      const res = inspectAndTranslateField("J'accepte la politique de confidentialité", [], "fr");
      expect(res.isConsent).toBe(true);
      const f = makeField(res.label, [], "checkbox");
      expect(decide(f, me, []).kind).toBe("ask");
    });

    // 4. German Zeugnis/Arbeitszeugnis is a certificate, NOT resume
    it("Trap 4: German Arbeitszeugnis is categorized as certificate, never resume", () => {
      const res = inspectAndTranslateField("Arbeitszeugnisse hochladen", [], "de");
      expect(res.documentType).toBe("certificate");
      expect(res.label).not.toBe("Resume");
      const f = makeField(res.label, [], "file");
      // Must not attach resume
      const d = decide(f, me, []);
      expect(d.kind).not.toBe("resume");
    });

    // 5. French Date de naissance is birthday, NOT start date
    it("Trap 5: French Date de naissance is Date of birth, not Start date", () => {
      const res = inspectAndTranslateField("Date de naissance", [], "fr");
      expect(res.label).toBe("Date of birth");
      expect(res.label).not.toContain("Start date");
      const f = makeField(res.label, [], "date");
      const d = decide(f, me, []);
      expect(d.kind).not.toBe("answer");
    });

    // 6. Spanish Apellidos is Last name, never nickname
    it("Trap 6: Spanish Apellidos translates to Last name and fills lastName", () => {
      const res = inspectAndTranslateField("Apellidos", [], "es");
      expect(res.label).toBe("Last name");
      const f = makeField(res.label, [], "text");
      const d = decide(f, me, []);
      expect(d.kind).toBe("profile");
      if (d.kind === "profile") expect(d.value).toBe("Schmidt");
    });

    // 7. Dutch Huidig salaris is Current salary, NOT Expected salary
    it("Trap 7: Dutch Huidig salaris translates to Current salary, not Expected salary", () => {
      const res = inspectAndTranslateField("Huidig salaris", [], "nl");
      expect(res.label).toBe("Current salary");
      const f = makeField(res.label, [], "text");
      const d = decide(f, me, []);
      expect(d.kind).toBe("answer");
      if (d.kind === "answer") expect(d.value).toBe("75000"); // currentCtc, not 85000
    });

    // 8. German Kündigungsfrist is Notice period, NOT Start date
    it("Trap 8: German Kündigungsfrist translates to Notice period, not Start date", () => {
      const res = inspectAndTranslateField("Kündigungsfrist", [], "de");
      expect(res.label).toBe("Notice period");
      const f = makeField(res.label, [], "text");
      const d = decide(f, me, []);
      expect(d.kind).toBe("answer");
      if (d.kind === "answer") expect(d.value).toBe("3 months");
    });

    // 9. Portuguese options: Sim/Não translated cleanly
    it("Trap 9: Portuguese Sim/Não options translate to Yes/No", () => {
      const options = translateOptions(["Sim", "Não"], "pt");
      expect(options).toEqual(["Yes", "No"]);
    });

    // 10. Unknown language form: asks for everything except HTML5 type-matched fields
    it("Trap 10: Unknown language marks lang as unknown and leaves unverified labels alone", () => {
      const detected = detectPageLanguage("sv", ["Namn", "E-post", "Telefon"]);
      expect(detected).toBe("unknown");
      const res = inspectAndTranslateField("Okänt fält", [], "unknown");
      expect(res.label).toBe("Okänt fält"); // Left untouched
      const f = makeField("Okänt fält", [], "text");
      const d = decide(f, me, []);
      expect(d.kind).toBe("ask");
    });
  });

  describe("Language detection", () => {
    it("detects language from html lang code", () => {
      expect(detectPageLanguage("de-DE")).toBe("de");
      expect(detectPageLanguage("fr-FR")).toBe("fr");
      expect(detectPageLanguage("es-ES")).toBe("es");
      expect(detectPageLanguage("nl-NL")).toBe("nl");
      expect(detectPageLanguage("pt-BR")).toBe("pt");
      expect(detectPageLanguage("en-US")).toBe("en");
    });

    it("detects language from label signatures when html lang is missing", () => {
      expect(detectPageLanguage("", ["Vorname", "Nachname", "Lebenslauf"])).toBe("de");
      expect(detectPageLanguage("", ["Prénom", "Courriel", "Préavis"])).toBe("fr");
      expect(detectPageLanguage("", ["Pehla naam", "Pura naam", "Kitna"])).toBe("hi-en");
    });
  });
});

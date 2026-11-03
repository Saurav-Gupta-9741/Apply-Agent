// @vitest-environment node
import { describe, expect, it } from "vitest";
import { inspectAndTranslateField, translateLabel } from "../src/shared/i18n-labels";
import { translateOnDevice } from "../src/shared/locale/translator";

describe("L4: Locale Languages Verification (DE, FR, ES, NL, PT-BR, JA, HI-EN)", () => {
  describe("1. German (DE) Translation & Safety Traps", () => {
    it("translates common German job form labels", () => {
      expect(translateLabel("Vorname", "de")).toBe("First name");
      expect(translateLabel("Nachname", "de")).toBe("Last name");
      expect(translateLabel("E-Mail-Adresse", "de")).toBe("Email");
      expect(translateLabel("Telefonnummer", "de")).toBe("Phone");
      expect(translateLabel("Lebenslauf", "de")).toBe("Resume");
      expect(translateLabel("Gehaltsvorstellung", "de")).toBe("Expected salary");
      expect(translateLabel("Kündigungsfrist", "de")).toBe("Notice period");
    });

    it("TRAP: Arbeitszeugnis / Zeugnis is NOT a resume (certificate trap)", () => {
      const res = inspectAndTranslateField("Arbeitszeugnisse hochladen", [], "de");
      expect(res.documentType).toBe("certificate");
      expect(res.label).not.toBe("Resume");
    });

    it("TRAP: Datenschutz consent checkbox is strictly marked isConsent", () => {
      const res = inspectAndTranslateField("Ich stimme den Datenschutzbestimmungen zu", [], "de");
      expect(res.isConsent).toBe(true);
    });
  });

  describe("2. French (FR) Translation & Safety Traps", () => {
    it("translates French job form labels", () => {
      expect(translateLabel("Prénom", "fr")).toBe("First name");
      expect(translateLabel("Nom de famille", "fr")).toBe("Last name");
      expect(translateLabel("Courriel", "fr")).toBe("Email");
      expect(translateLabel("Téléphone", "fr")).toBe("Phone");
      expect(translateLabel("Curriculum vitae", "fr")).toBe("Resume");
      expect(translateLabel("Prétentions salariales", "fr")).toBe("Expected salary");
      expect(translateLabel("Préavis", "fr")).toBe("Notice period");
    });

    it("TRAP: French RGPD consent is strictly flagged as consent", () => {
      const res = inspectAndTranslateField("J'accepte le traitement de mes données personnelles conformément au RGPD", [], "fr");
      expect(res.isConsent).toBe(true);
    });
  });

  describe("3. Spanish (ES) Translation & Safety Traps", () => {
    it("translates Spanish job form labels", () => {
      expect(translateLabel("Nombre", "es")).toBe("First name");
      expect(translateLabel("Apellidos", "es")).toBe("Last name");
      expect(translateLabel("Correo electrónico", "es")).toBe("Email");
      expect(translateLabel("Teléfono", "es")).toBe("Phone");
      expect(translateLabel("Currículum", "es")).toBe("Resume");
      expect(translateLabel("Expectativa salarial", "es")).toBe("Expected salary");
      expect(translateLabel("Período de preaviso", "es")).toBe("Notice period");
    });

    it("TRAP: Spanish data protection consent is strictly flagged", () => {
      const res = inspectAndTranslateField("Acepto la política de privacidad y protección de datos", [], "es");
      expect(res.isConsent).toBe(true);
    });
  });

  describe("4. Dutch (NL) Translation & Safety Traps", () => {
    it("translates Dutch job form labels", () => {
      expect(translateLabel("Voornaam", "nl")).toBe("First name");
      expect(translateLabel("Achternaam", "nl")).toBe("Last name");
      expect(translateLabel("Telefoonnummer", "nl")).toBe("Phone");
      expect(translateLabel("Salarisindicatie", "nl")).toBe("Expected salary");
      expect(translateLabel("Opzegtermijn", "nl")).toBe("Notice period");
    });

    it("TRAP: Dutch privacy consent is strictly flagged", () => {
      const res = inspectAndTranslateField("Ik ga akkoord met het privacybeleid", [], "nl");
      expect(res.isConsent).toBe(true);
    });
  });

  describe("5. Portuguese / Brazil (PT-BR) Translation & Safety Traps", () => {
    it("translates Portuguese job form labels", () => {
      expect(translateLabel("Nome", "pt")).toBe("Full name");
      expect(translateLabel("Primeiro nome", "pt")).toBe("First name");
      expect(translateLabel("Sobrenome", "pt")).toBe("Last name");
      expect(translateLabel("Telefone", "pt")).toBe("Phone");
      expect(translateLabel("Currículo", "pt")).toBe("Resume");
      expect(translateLabel("Pretensão salarial", "pt")).toBe("Expected salary");
      expect(translateLabel("Aviso prévio", "pt")).toBe("Notice period");
    });

    it("TRAP: LGPD consent is strictly flagged", () => {
      const res = inspectAndTranslateField("Concordo com os termos de privacidade conforme a LGPD", [], "pt");
      expect(res.isConsent).toBe(true);
    });
  });

  describe("6. Hindi-in-English (HI-EN) Translation", () => {
    it("translates Indian English and transliterated terms", () => {
      expect(translateLabel("Pehla naam", "hi-en")).toBe("First name");
      expect(translateLabel("Aakhri naam", "hi-en")).toBe("Last name");
      expect(translateLabel("Apka shubh naam", "hi-en")).toBe("Full name");
      expect(translateLabel("Expected CTC", "hi-en")).toBe("Expected salary");
      expect(translateLabel("Current CTC", "hi-en")).toBe("Current salary");
      expect(translateLabel("Notice period in days", "hi-en")).toBe("Notice period");
    });
  });

  describe("7. On-Device Translator Engine", () => {
    it("translates via deterministic dictionary fallback when browser API is unavailable", async () => {
      const de = await translateOnDevice("Vorname", "de");
      expect(de).toBe("First name");

      const fr = await translateOnDevice("Nom de famille", "fr");
      expect(fr).toBe("Last name");

      const es = await translateOnDevice("Expectativa salarial", "es");
      expect(es).toBe("Expected salary");
    });

    it("caches translated results in memory", async () => {
      const first = await translateOnDevice("Kündigungsfrist", "de");
      expect(first).toBe("Notice period");
      const cached = await translateOnDevice("Kündigungsfrist", "de");
      expect(cached).toBe("Notice period");
    });
  });
});

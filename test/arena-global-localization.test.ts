/** Comprehensive test suite for Arena Global Localization:
 * 1. Global compensation parsing & currency boundaries across EUR, GBP, USD, INR, JPY, CAD, AUD, BRL.
 * 2. Multi-currency safety: never guess exchange rates, prompt user safely when currencies differ.
 * 3. Worldwide statutory notice period terms and dropdown matching (German, French, Spanish, UK, India).
 * 4. Worldwide sensitive national ID & tax honeypot protection (Aadhaar, PAN, SSN, SIN, NI, Steuer-ID, Numéro de sécurité sociale, CPF, DNI/NIE).
 */

import { describe, expect, it } from "vitest";
import { decide, sensitiveTopic } from "../src/content/classify";
import { matchNoticeOption, parseNoticeDays, startImmediatelyValue } from "../src/content/facts";
import { extractFields } from "../src/content/extract";
import { mount } from "./fixtures";
import type { Decision, FieldDescriptor, Profile, QuickFacts } from "../src/shared/types";
import { EMPTY_PROFILE } from "../src/shared/storage";

const field = (
  label: string,
  control: FieldDescriptor["control"] = "text",
  options: string[] = [],
  placeholder = "",
  name = ""
): FieldDescriptor => ({
  key: "test_k",
  label,
  control,
  required: true,
  options,
  name,
  autocomplete: "",
  placeholder,
});

const value = (d: Decision) => (d.kind === "answer" ? d.value : d.kind);

// Base profiles
const makeCandidate = (facts: Partial<QuickFacts>, extraProfile: Partial<Profile> = {}): Profile => ({
  ...EMPTY_PROFILE,
  firstName: "Jane",
  lastName: "Doe",
  email: "jane.doe@example.com",
  country: "Germany",
  ...extraProfile,
  facts: {
    workCountries: "Germany, European Union",
    noticePeriod: "3 months",
    currentCtc: "",
    expectedCtc: "",
    relocate: "No",
    heardFrom: "LinkedIn",
    gender: "Female",
    hispanic: "No",
    race: "Decline",
    veteran: "No",
    disability: "No",
    ...facts,
  },
});

describe("Arena Global Localization: Compensation & Multi-Currency Safety", () => {
  describe("German Compensation Terms (Gehaltsvorstellung, Bruttojahresgehalt, Zielgehalt)", () => {
    const candidateEur = makeCandidate({
      expectedCtc: "65000 EUR",
      currentCtc: "55000 EUR",
    });

    it("fills Gehaltsvorstellung in EUR accurately in text input", () => {
      const f = field("Ihre Gehaltsvorstellung (in EUR / Jahr)", "text");
      const d = decide(f, candidateEur, []);
      expect(d.kind).toBe("answer");
      if (d.kind === "answer") {
        expect(d.value).toBe("65000 EUR");
      }
    });

    it("fills Gehaltsvorstellung in number input", () => {
      const f = field("Gehaltsvorstellung (EUR)", "number");
      const d = decide(f, candidateEur, []);
      expect(d.kind).toBe("answer");
      if (d.kind === "answer") {
        expect(d.value).toBe("65000");
      }
    });

    it("parses European number formatting with dot thousands (e.g. 65.000 €)", () => {
      const candidateDot = makeCandidate({
        expectedCtc: "65.000 €",
      });
      const f = field("Erwartetes Bruttojahresgehalt (€)", "number");
      const d = decide(f, candidateDot, []);
      expect(d.kind).toBe("answer");
      if (d.kind === "answer") {
        expect(d.value).toBe("65000");
      }
    });

    it("fills Zielgehalt (EUR) for target compensation", () => {
      const f = field("Zielgehalt (in EUR)", "text");
      const d = decide(f, candidateEur, []);
      expect(d.kind).toBe("answer");
      if (d.kind === "answer") {
        expect(d.value).toBe("65000 EUR");
      }
    });

    it("fills Aktuelles Gehalt from currentCtc", () => {
      const f = field("Aktuelles Gehalt (in EUR)", "text");
      const d = decide(f, candidateEur, []);
      expect(d.kind).toBe("answer");
      if (d.kind === "answer") {
        expect(d.value).toBe("55000 EUR");
      }
    });
  });

  describe("French Compensation Terms (Rémunération souhaitée, Salaire brut annuel, Prétentions salariales)", () => {
    const candidateFr = makeCandidate({
      expectedCtc: "60000 EUR",
    });

    it("fills Rémunération souhaitée in EUR", () => {
      const f = field("Rémunération souhaitée (en EUR)", "text");
      const d = decide(f, candidateFr, []);
      expect(d.kind).toBe("answer");
      if (d.kind === "answer") {
        expect(d.value).toBe("60000 EUR");
      }
    });

    it("fills Prétentions salariales in EUR", () => {
      const f = field("Prétentions salariales annuelles (€)", "text");
      const d = decide(f, candidateFr, []);
      expect(d.kind).toBe("answer");
      if (d.kind === "answer") {
        expect(d.value).toBe("60000 EUR");
      }
    });

    it("fills Salaire brut annuel souhaité in number box", () => {
      const f = field("Salaire brut annuel souhaité (€)", "number");
      const d = decide(f, candidateFr, []);
      expect(d.kind).toBe("answer");
      if (d.kind === "answer") {
        expect(d.value).toBe("60000");
      }
    });

    it("handles thousands k€/an brut when candidate wrote in k€", () => {
      const candidateK = makeCandidate({
        expectedCtc: "60k EUR",
      });
      const f = field("Prétentions salariales (k€/an brut)", "number");
      const d = decide(f, candidateK, []);
      expect(d.kind).toBe("answer");
      if (d.kind === "answer") {
        expect(d.value).toBe("60");
      }
    });
  });

  describe("Spanish Compensation Terms (Pretensión salarial, Salario bruto anual, Remuneración esperada)", () => {
    it("fills Pretensión salarial in EUR for EUR candidate", () => {
      const candidateEur = makeCandidate({ expectedCtc: "50000 EUR" });
      const f = field("Pretensión salarial (EUR)", "text");
      const d = decide(f, candidateEur, []);
      expect(d.kind).toBe("answer");
      if (d.kind === "answer") {
        expect(d.value).toBe("50000 EUR");
      }
    });

    it("fills Remuneración esperada in USD for USD candidate", () => {
      const candidateUsd = makeCandidate({ expectedCtc: "95,000 USD" });
      const f = field("Remuneración esperada (USD)", "text");
      const d = decide(f, candidateUsd, []);
      expect(d.kind).toBe("answer");
      if (d.kind === "answer") {
        expect(d.value).toBe("95,000 USD");
      }
    });

    it("fills Salario bruto anual esperado in USD", () => {
      const candidateUsd = makeCandidate({ expectedCtc: "$95,000" });
      const f = field("Salario bruto anual esperado ($)", "number");
      const d = decide(f, candidateUsd, []);
      expect(d.kind).toBe("answer");
      if (d.kind === "answer") {
        expect(d.value).toBe("95000");
      }
    });

    it("fills Pretensión salarial in MXN for MXN candidate", () => {
      const candidateMxn = makeCandidate({ expectedCtc: "600,000 MXN" });
      const f = field("Pretensión salarial (MXN)", "text");
      const d = decide(f, candidateMxn, []);
      expect(d.kind).toBe("answer");
      if (d.kind === "answer") {
        expect(d.value).toBe("600,000 MXN");
      }
    });
  });

  describe("Portuguese Compensation Terms (Pretensão salarial, Salário bruto anual, Remuneração desejada)", () => {
    it("fills Pretensão salarial in BRL for Brazilian candidate", () => {
      const candidateBrl = makeCandidate({ expectedCtc: "15000 BRL" });
      const f = field("Pretensão salarial (BRL)", "text");
      const d = decide(f, candidateBrl, []);
      expect(d.kind).toBe("answer");
      if (d.kind === "answer") {
        expect(d.value).toBe("15000 BRL");
      }
    });

    it("fills Remuneração desejada in R$", () => {
      const candidateBrl = makeCandidate({ expectedCtc: "R$ 15.000" });
      const f = field("Remuneração desejada (R$)", "number");
      const d = decide(f, candidateBrl, []);
      expect(d.kind).toBe("answer");
      if (d.kind === "answer") {
        expect(d.value).toBe("15000");
      }
    });

    it("fills Salário bruto anual desejado in EUR for Portugal", () => {
      const candidatePt = makeCandidate({ expectedCtc: "45000 EUR" });
      const f = field("Salário bruto anual desejado (€)", "text");
      const d = decide(f, candidatePt, []);
      expect(d.kind).toBe("answer");
      if (d.kind === "answer") {
        expect(d.value).toBe("45000 EUR");
      }
    });
  });

  describe("Japanese & APAC Compensation (年収, 希望給与, 万円, SGD, AUD, CAD)", () => {
    it("fills 希望給与 in 万円 (Man Yen) for Japanese candidate", () => {
      const candidateJp = makeCandidate({ expectedCtc: "1000 万円" });
      const fText = field("希望給与 (万円)", "text");
      expect(value(decide(fText, candidateJp, []))).toBe("1000 万円");

      const fNum = field("希望給与（万円）", "number");
      expect(value(decide(fNum, candidateJp, []))).toBe("1000");
    });

    it("fills 年収 (JPY) for Japanese candidate", () => {
      const candidateJp = makeCandidate({ expectedCtc: "10,000,000 JPY" });
      const f = field("希望年収 (JPY)", "text");
      expect(value(decide(f, candidateJp, []))).toBe("10,000,000 JPY");
    });

    it("fills Expected salary in SGD for Singapore candidate", () => {
      const candidateSg = makeCandidate({ expectedCtc: "120,000 SGD" });
      const f = field("Expected Salary (SGD)", "text");
      expect(value(decide(f, candidateSg, []))).toBe("120,000 SGD");
    });

    it("fills Desired salary in AUD for Australian candidate", () => {
      const candidateAu = makeCandidate({ expectedCtc: "140,000 AUD" });
      const f = field("Desired Salary (AUD)", "text");
      expect(value(decide(f, candidateAu, []))).toBe("140,000 AUD");
    });

    it("fills Expected salary in CAD for Canadian candidate", () => {
      const candidateCa = makeCandidate({ expectedCtc: "110,000 CAD" });
      const f = field("Expected Salary (CAD)", "text");
      expect(value(decide(f, candidateCa, []))).toBe("110,000 CAD");
    });
  });

  describe("India CTC & Fixed/Variable Split Safety", () => {
    const candidateInr = makeCandidate({
      expectedCtc: "20 LPA",
      currentCtc: "15 LPA",
    });

    it("fills Total Expected CTC in LPA cleanly into number box", () => {
      const f = field("Expected CTC (in LPA)", "number");
      expect(value(decide(f, candidateInr, []))).toBe("20");
    });

    it("fills Expected CTC (in lakhs) into number box", () => {
      const f = field("Expected CTC (in Lakhs)", "number");
      expect(value(decide(f, candidateInr, []))).toBe("20");
    });

    it("fills Total CTC (Fixed + Variable) when asked for combined total", () => {
      const f = field("Total Expected CTC (Fixed + Variable)", "text");
      expect(value(decide(f, candidateInr, []))).toBe("20 LPA");
    });

    it("safely prompts user (never guesses) when form asks for Fixed CTC split", () => {
      const f = field("Fixed CTC (LPA)", "text");
      const d = decide(f, candidateInr, []);
      expect(d.kind).toBe("ask");
      if (d.kind === "ask") {
        expect(d.topic).toBe("salary");
      }
    });

    it("safely prompts user (never guesses) when form asks for Variable Pay / Bonus split", () => {
      const f = field("Variable Pay / Annual Incentive", "text");
      const d = decide(f, candidateInr, []);
      expect(d.kind).toBe("ask");
      if (d.kind === "ask") {
        expect(d.topic).toBe("salary");
      }
    });

    it("safely prompts user when form asks for In-Hand / Take-Home split", () => {
      const f = field("Expected In-Hand Salary", "text");
      const d = decide(f, candidateInr, []);
      expect(d.kind).toBe("ask");
    });
  });

  describe("Multi-Currency Safety: Zero Guessing of Exchange Rates", () => {
    const candidateInr = makeCandidate({
      expectedCtc: "18 LPA",
      currentCtc: "12 LPA",
    });

    it("safely prompts candidate with INR CTC when form asks in EUR", () => {
      const f = field("Gehaltsvorstellung (in EUR)", "text");
      const d = decide(f, candidateInr, []);
      expect(d.kind).toBe("ask");
      if (d.kind === "ask") {
        expect(d.topic).toBe("salary");
      }
    });

    it("safely prompts candidate with INR CTC when form asks in USD ($)", () => {
      const f = field("Desired Salary in USD ($)", "number");
      const d = decide(f, candidateInr, []);
      expect(d.kind).toBe("ask");
      if (d.kind === "ask") {
        expect(d.topic).toBe("salary");
      }
    });

    it("safely prompts candidate with INR CTC when form asks in GBP (£)", () => {
      const f = field("Target Salary (GBP £)", "text");
      const d = decide(f, candidateInr, []);
      expect(d.kind).toBe("ask");
    });

    it("safely prompts candidate with INR CTC when form asks in JPY / 万円", () => {
      const f = field("希望給与 (万円)", "text");
      const d = decide(f, candidateInr, []);
      expect(d.kind).toBe("ask");
    });

    it("safely prompts candidate with INR CTC when form asks in CAD", () => {
      const f = field("Expected Salary (CAD)", "text");
      const d = decide(f, candidateInr, []);
      expect(d.kind).toBe("ask");
    });

    it("safely prompts candidate with INR CTC when form asks in AUD", () => {
      const f = field("Expected Salary (AUD)", "text");
      const d = decide(f, candidateInr, []);
      expect(d.kind).toBe("ask");
    });

    it("safely prompts candidate with INR CTC when form asks in BRL", () => {
      const f = field("Pretensão salarial (BRL)", "text");
      const d = decide(f, candidateInr, []);
      expect(d.kind).toBe("ask");
    });

    it("safely prompts candidate with EUR CTC when form asks in USD", () => {
      const candidateEur = makeCandidate({ expectedCtc: "65000 EUR" });
      const f = field("Expected Salary in USD ($)", "text");
      const d = decide(f, candidateEur, []);
      expect(d.kind).toBe("ask");
    });

    it("safely prompts candidate with USD CTC when form asks in EUR", () => {
      const candidateUsd = makeCandidate({ expectedCtc: "$120,000" });
      const f = field("Gehaltsvorstellung (€)", "text");
      const d = decide(f, candidateUsd, []);
      expect(d.kind).toBe("ask");
    });
  });
});

describe("Arena Global Localization: Notice Periods Worldwide", () => {
  describe("parseNoticeDays & startImmediatelyValue across languages", () => {
    it("parses German notice period units and statutory phrases", () => {
      expect(parseNoticeDays("1 Monat")).toBe(30);
      expect(parseNoticeDays("2 Monate")).toBe(60);
      expect(parseNoticeDays("3 Monate")).toBe(90);
      expect(parseNoticeDays("6 Monate zum Monatsende")).toBe(180);
      expect(parseNoticeDays("14 Tage")).toBe(14);
      expect(parseNoticeDays("Sofort")).toBe(0);
      expect(parseNoticeDays("ab sofort")).toBe(0);
    });

    it("parses French notice period units", () => {
      expect(parseNoticeDays("1 mois")).toBe(30);
      expect(parseNoticeDays("2 mois")).toBe(60);
      expect(parseNoticeDays("3 mois")).toBe(90);
      expect(parseNoticeDays("15 jours")).toBe(15);
      expect(parseNoticeDays("Immédiat")).toBe(0);
      expect(parseNoticeDays("sans préavis")).toBe(0);
    });

    it("parses Spanish notice period units", () => {
      expect(parseNoticeDays("15 días")).toBe(15);
      expect(parseNoticeDays("1 mes")).toBe(30);
      expect(parseNoticeDays("2 meses")).toBe(60);
      expect(parseNoticeDays("3 meses")).toBe(90);
      expect(parseNoticeDays("Inmediato")).toBe(0);
      expect(parseNoticeDays("sin preaviso")).toBe(0);
    });

    it("parses Portuguese notice period units", () => {
      expect(parseNoticeDays("15 dias")).toBe(15);
      expect(parseNoticeDays("1 mês")).toBe(30);
      expect(parseNoticeDays("2 meses")).toBe(60);
      expect(parseNoticeDays("3 meses")).toBe(90);
      expect(parseNoticeDays("Imediato")).toBe(0);
    });

    it("evaluates startImmediatelyValue accurately across languages", () => {
      expect(startImmediatelyValue("Sofort")).toBe("Yes");
      expect(startImmediatelyValue("ab sofort")).toBe("Yes");
      expect(startImmediatelyValue("Immédiat")).toBe("Yes");
      expect(startImmediatelyValue("Inmediato")).toBe("Yes");
      expect(startImmediatelyValue("Imediato")).toBe("Yes");

      expect(startImmediatelyValue("3 Monate")).toBe("No");
      expect(startImmediatelyValue("1 mois")).toBe("No");
      expect(startImmediatelyValue("15 días")).toBe("No");
      expect(startImmediatelyValue("30 days")).toBe("No");
    });
  });

  describe("German Notice Period Dropdown Matching", () => {
    const germanOptions = ["Sofort", "1 Monat", "2 Monate", "3 Monate", "6 Monate zum Monatsende"];

    it("maps candidate's 90-day / 3-month notice to '3 Monate'", () => {
      expect(matchNoticeOption("90 days", germanOptions)).toBe("3 Monate");
      expect(matchNoticeOption("3 months", germanOptions)).toBe("3 Monate");
      expect(matchNoticeOption("3 Monate", germanOptions)).toBe("3 Monate");
    });

    it("maps candidate's 180-day / 6-month notice to '6 Monate zum Monatsende'", () => {
      expect(matchNoticeOption("180 days", germanOptions)).toBe("6 Monate zum Monatsende");
      expect(matchNoticeOption("6 months", germanOptions)).toBe("6 Monate zum Monatsende");
    });

    it("maps candidate's 30-day / 1-month notice to '1 Monat'", () => {
      expect(matchNoticeOption("30 days", germanOptions)).toBe("1 Monat");
      expect(matchNoticeOption("1 month", germanOptions)).toBe("1 Monat");
    });

    it("maps candidate's immediate availability to 'Sofort'", () => {
      expect(matchNoticeOption("Immediate", germanOptions)).toBe("Sofort");
      expect(matchNoticeOption("Sofort", germanOptions)).toBe("Sofort");
    });

    it("handles German 'Können Sie ab sofort anfangen?' question", () => {
      const candidate90 = makeCandidate({ noticePeriod: "90 days" });
      const f = field("Können Sie ab sofort anfangen?", "select", ["Ja", "Nein"]);
      expect(value(decide(f, candidate90, []))).toBe("Nein");

      const candidateImmediate = makeCandidate({ noticePeriod: "Sofort" });
      expect(value(decide(f, candidateImmediate, []))).toBe("Ja");
    });
  });

  describe("French Notice Period Dropdown Matching", () => {
    const frenchOptions = ["Immédiat", "1 mois", "2 mois", "3 mois"];

    it("maps candidate's 90-day / 3-month notice to '3 mois'", () => {
      expect(matchNoticeOption("90 days", frenchOptions)).toBe("3 mois");
      expect(matchNoticeOption("3 months", frenchOptions)).toBe("3 mois");
    });

    it("maps candidate's 30-day notice to '1 mois'", () => {
      expect(matchNoticeOption("30 days", frenchOptions)).toBe("1 mois");
    });

    it("maps candidate's immediate availability to 'Immédiat'", () => {
      expect(matchNoticeOption("Immediate", frenchOptions)).toBe("Immédiat");
      expect(matchNoticeOption("Immédiat", frenchOptions)).toBe("Immédiat");
    });

    it("handles French 'Pouvez-vous commencer immédiatement ?' question", () => {
      const candidate30 = makeCandidate({ noticePeriod: "30 days" });
      const f = field("Pouvez-vous commencer immédiatement ?", "select", ["Oui", "Non"]);
      expect(value(decide(f, candidate30, []))).toBe("Non");

      const candidateImmediate = makeCandidate({ noticePeriod: "Immédiat" });
      expect(value(decide(f, candidateImmediate, []))).toBe("Oui");
    });
  });

  describe("Spanish Notice Period Dropdown Matching", () => {
    const spanishOptions = ["Inmediato", "15 días", "1 mes", "2 meses", "3 meses"];

    it("maps candidate's 15 days notice to '15 días'", () => {
      expect(matchNoticeOption("15 days", spanishOptions)).toBe("15 días");
      expect(matchNoticeOption("15 días", spanishOptions)).toBe("15 días");
    });

    it("maps candidate's 30 days notice to '1 mes'", () => {
      expect(matchNoticeOption("30 days", spanishOptions)).toBe("1 mes");
    });

    it("maps candidate's 60 days notice to '2 meses'", () => {
      expect(matchNoticeOption("60 days", spanishOptions)).toBe("2 meses");
    });

    it("maps candidate's 90 days notice to '3 meses'", () => {
      expect(matchNoticeOption("90 days", spanishOptions)).toBe("3 meses");
    });

    it("handles Spanish '¿Tiene disponibilidad inmediata?' question", () => {
      const candidate15 = makeCandidate({ noticePeriod: "15 days" });
      const f = field("¿Tiene disponibilidad inmediata?", "select", ["Sí", "No"]);
      expect(value(decide(f, candidate15, []))).toBe("No");

      const candidateImmediate = makeCandidate({ noticePeriod: "Inmediato" });
      expect(value(decide(f, candidateImmediate, []))).toBe("Sí");
    });
  });

  describe("UK and India Notice Period Matching", () => {
    const ukOptions = ["Immediate", "1 week", "2 weeks", "1 month", "3 months"];
    const indiaOptions = ["Immediate", "15 days", "30 days", "60 days", "90 days"];

    it("matches UK 2 weeks option from 14 days", () => {
      expect(matchNoticeOption("14 days", ukOptions)).toBe("2 weeks");
      expect(matchNoticeOption("2 weeks", ukOptions)).toBe("2 weeks");
    });

    it("matches UK 3 months option from 90 days", () => {
      expect(matchNoticeOption("90 days", ukOptions)).toBe("3 months");
    });

    it("matches India standard notice tiers: 15, 30, 60, 90 days", () => {
      expect(matchNoticeOption("15 days", indiaOptions)).toBe("15 days");
      expect(matchNoticeOption("30 days", indiaOptions)).toBe("30 days");
      expect(matchNoticeOption("60 days", indiaOptions)).toBe("60 days");
      expect(matchNoticeOption("90 days", indiaOptions)).toBe("90 days");
    });
  });
});

describe("Arena Global Localization: Sensitive Worldwide National ID & Honeypot Protections", () => {
  const candidate = makeCandidate({});

  const idLabels = [
    // India
    { name: "Aadhaar Card", label: "Aadhaar Number", country: "India" },
    { name: "Aadhaar UIDAI", label: "UIDAI / Aadhaar ID", country: "India" },
    { name: "PAN Card", label: "PAN Card Number", country: "India" },
    { name: "PAN", label: "Permanent Account Number (PAN)", country: "India" },
    // US
    { name: "SSN", label: "Social Security Number (SSN)", country: "United States" },
    { name: "SSN short", label: "SSN", country: "United States" },
    // Canada
    { name: "SIN", label: "Social Insurance Number (SIN)", country: "Canada" },
    { name: "Canadian SIN", label: "Canadian SIN Number", country: "Canada" },
    { name: "SIN short", label: "SIN", country: "Canada" },
    { name: "Canada NAS", label: "Numéro d'assurance sociale (NAS)", country: "Canada" },
    // UK
    { name: "National Insurance", label: "National Insurance Number", country: "United Kingdom" },
    { name: "NI Number", label: "NI Number", country: "United Kingdom" },
    { name: "NINO", label: "NINO", country: "United Kingdom" },
    // Germany
    { name: "Steuer-ID", label: "Steuer-ID", country: "Germany" },
    { name: "Steueridentifikationsnummer", label: "Steueridentifikationsnummer", country: "Germany" },
    { name: "Steuerliche Identifikationsnummer", label: "Steuerliche Identifikationsnummer", country: "Germany" },
    { name: "Sozialversicherungsnummer", label: "Sozialversicherungsnummer", country: "Germany" },
    { name: "Personalausweis", label: "Personalausweisnummer", country: "Germany" },
    // France
    { name: "Numéro de sécurité sociale", label: "Numéro de sécurité sociale", country: "France" },
    { name: "N° Sécurité sociale", label: "N° de sécurité sociale", country: "France" },
    { name: "NIR", label: "NIR (Numéro d'inscription au répertoire)", country: "France" },
    // Brazil
    { name: "CPF", label: "CPF (Cadastro de Pessoas Físicas)", country: "Brazil" },
    { name: "CPF short", label: "CPF", country: "Brazil" },
    { name: "RG", label: "RG (Registro Geral / Carteira de Identidade)", country: "Brazil" },
    { name: "PIS/PASEP", label: "PIS / PASEP", country: "Brazil" },
    // Spain
    { name: "DNI", label: "DNI (Documento Nacional de Identidad)", country: "Spain" },
    { name: "NIE", label: "NIE (Número de Identidad de Extranjero)", country: "Spain" },
    { name: "NIF", label: "NIF / CIF", country: "Spain" },
    { name: "Tarjeta de Residencia", label: "Tarjeta de Residencia", country: "Spain" },
    // Netherlands & Italy
    { name: "BSN", label: "BSN (Burgerservicenummer)", country: "Netherlands" },
    { name: "Codice Fiscale", label: "Codice Fiscale", country: "Italy" },
    // Japan
    { name: "My Number", label: "マイナンバー (My Number)", country: "Japan" },
    { name: "個人番号", label: "個人番号", country: "Japan" },
  ];

  for (const { name, label, country } of idLabels) {
    it(`never fills ${name} (${country}) and classifies as sensitive identity`, () => {
      const fReq = field(label, "text");
      expect(sensitiveTopic(fReq)).toBe("identity");

      const dReq = decide(fReq, candidate, []);
      // Required identity fields MUST be asked, never filled
      expect(dReq.kind).toBe("ask");
      if (dReq.kind === "ask") {
        expect(dReq.reason).toBe("sensitive");
        expect(dReq.topic).toBe("identity");
      }

      const fOpt = { ...field(label, "text"), required: false };
      const dOpt = decide(fOpt, candidate, []);
      // Optional identity fields MUST be skipped, never filled
      expect(dOpt.kind).toBe("skip");
    });
  }

  describe("Multilingual Honeypot Protection", () => {
    it("skips multilingual spam traps in German, French, Spanish, and Portuguese", () => {
      mount(`<form id="test-form">
        <label for="real1">Name</label><input id="real1">
        <label for="hp_de">Dieses Feld bitte freilassen</label><input id="hp_de">
        <label for="hp_de2">Leer lassen</label><input id="hp_de2">
        <label for="hp_fr">Laisser ce champ vide</label><input id="hp_fr">
        <label for="hp_fr2">Ne pas remplir</label><input id="hp_fr2">
        <label for="hp_es">Dejar este campo en blanco</label><input id="hp_es">
        <label for="hp_es2">Dejar vacio</label><input id="hp_es2">
        <label for="hp_pt">Deixe este campo em branco</label><input id="hp_pt">
        <label for="hp_pt2">Nao preencher</label><input id="hp_pt2">
        <label for="real2">Email</label><input id="real2" type="email">
      </form>`);

      const extracted = extractFields(document.getElementById("test-form")!);
      const labels = extracted.map((f) => f.descriptor.label);

      expect(labels).toContain("Name");
      expect(labels).toContain("Email");
      expect(labels).not.toContain("Dieses Feld bitte freilassen");
      expect(labels).not.toContain("Leer lassen");
      expect(labels).not.toContain("Laisser ce champ vide");
      expect(labels).not.toContain("Ne pas remplir");
      expect(labels).not.toContain("Dejar este campo en blanco");
      expect(labels).not.toContain("Dejar vacio");
      expect(labels).not.toContain("Deixe este campo em branco");
      expect(labels).not.toContain("Nao preencher");
    });
  });
});

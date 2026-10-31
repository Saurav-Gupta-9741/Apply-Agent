/** Arena Global Multilingual & International ATS Test Suite
 * 
 * Comprehensive evaluation across 6 international career markets:
 * - German (Personio, Greenhouse DE, Workable DE)
 * - French (Welcome to the Jungle, Lever FR)
 * - Spanish (Teamtailor ES, Workable ES)
 * - Portuguese / Brazilian (Gupy, Greenhouse PT-BR, Workable PT)
 * - Italian (Personio IT, Workable IT)
 * - Dutch (Personio NL, Workable NL)
 * 
 * Verifies:
 * 1. Zero wrong fills, zero value errors.
 * 2. Proper profile matching for names, contact details, URLs, documents.
 * 3. Notice period conversions & localized options matching.
 * 4. Work authorization & sponsorship polarity with localized country names and choices.
 * 5. Document disambiguation (Cover letters, transcripts, certificates vs Resume/CV).
 */

import { describe, expect, it } from "vitest";
import { decide, profileKeyFor, sensitiveTopic } from "../src/content/classify";
import { extractFields } from "../src/content/extract";
import { factDecision, isStartImmediatelyQuestion, matchNoticeOption, parseNoticeDays } from "../src/content/facts";
import { mount } from "./fixtures";
import type { FieldDescriptor, Profile, QuickFacts } from "../src/shared/types";
import { EMPTY_PROFILE } from "../src/shared/storage";

const BASE_FACTS: QuickFacts = {
  workCountries: "",
  noticePeriod: "",
  currentCtc: "",
  expectedCtc: "",
  relocate: "",
  heardFrom: "",
  gender: "",
  hispanic: "",
  race: "",
  veteran: "",
  disability: "",
  workMode: "",
  maxOfficeDays: "",
  travel: "",
  travelPercent: "",
  needsAccommodation: "",
  over18: "",
};

// ============================================================================
// 1. INTERNATIONAL PERSONAS
// ============================================================================

export const PERSONA_GERMAN: Profile = {
  ...EMPTY_PROFILE,
  firstName: "Klaus",
  lastName: "Müller",
  email: "klaus.mueller@example.de",
  phone: "+49 89 1234567",
  location: "München",
  country: "Germany",
  address: "Marienplatz 1, 80331 München",
  addressLine1: "Marienplatz 1",
  postalCode: "80331",
  currentCompany: "Siemens AG",
  currentTitle: "Senior Softwareentwickler",
  experienceYears: "8",
  linkedin: "https://linkedin.com/in/klaus-mueller",
  portfolio: "https://klausmueller.de",
  resume: { name: "Klaus_Mueller_Lebenslauf.pdf", type: "application/pdf", dataBase64: btoa("%PDF-1.4 test") },
  degree: "Master of Science",
  school: "Technische Universität München",
  discipline: "Informatik",
  graduationYear: "2016",
  languages: [
    { language: "German", proficiency: "Native" },
    { language: "English", proficiency: "Fluent" },
  ],
  languagesComplete: true,
  facts: {
    ...BASE_FACTS,
    workCountries: "Germany, EU",
    noticePeriod: "3 Monate",
    currentCtc: "75.000 €",
    expectedCtc: "90.000 €",
    relocate: "No",
    heardFrom: "Empfehlung",
    gender: "Male",
    over18: "Yes",
    workMode: "hybrid",
    maxOfficeDays: 2,
    travel: "No",
  },
};

export const PERSONA_FRENCH: Profile = {
  ...EMPTY_PROFILE,
  firstName: "Camille",
  lastName: "Dubois",
  email: "camille.dubois@example.fr",
  phone: "+33 1 42 68 55 00",
  location: "Paris",
  country: "France",
  address: "15 Rue de la Paix, 75008 Paris",
  addressLine1: "15 Rue de la Paix",
  postalCode: "75008",
  currentCompany: "Dassault Systèmes",
  currentTitle: "Chef de projet technique",
  experienceYears: "6",
  linkedin: "https://linkedin.com/in/camille-dubois",
  portfolio: "https://camilledubois.fr",
  resume: { name: "Camille_Dubois_CV.pdf", type: "application/pdf", dataBase64: btoa("%PDF-1.4 test") },
  degree: "Diplôme d'Ingénieur",
  school: "École Polytechnique",
  discipline: "Génie logiciel",
  graduationYear: "2018",
  languages: [
    { language: "French", proficiency: "Native" },
    { language: "English", proficiency: "Fluent" },
  ],
  languagesComplete: true,
  facts: {
    ...BASE_FACTS,
    workCountries: "France, EU",
    noticePeriod: "1 mois",
    currentCtc: "55 000 €",
    expectedCtc: "65 000 €",
    relocate: "No",
    heardFrom: "LinkedIn",
    gender: "Female",
    over18: "Yes",
    workMode: "hybrid",
    maxOfficeDays: 3,
    travel: "No",
  },
};

export const PERSONA_SPANISH: Profile = {
  ...EMPTY_PROFILE,
  firstName: "Mateo",
  lastName: "García",
  email: "mateo.garcia@example.es",
  phone: "+34 91 123 4567",
  location: "Madrid",
  country: "Spain",
  address: "Calle de Serrano 25, 28001 Madrid",
  addressLine1: "Calle de Serrano 25",
  postalCode: "28001",
  currentCompany: "Cabify",
  currentTitle: "Ingeniero de Software Senior",
  experienceYears: "5",
  linkedin: "https://linkedin.com/in/mateo-garcia",
  portfolio: "https://mateogarcia.dev",
  resume: { name: "Mateo_Garcia_Curriculum.pdf", type: "application/pdf", dataBase64: btoa("%PDF-1.4 test") },
  degree: "Grado en Ingeniería Informática",
  school: "Universidad Politécnica de Madrid",
  discipline: "Ingeniería del Software",
  graduationYear: "2019",
  languages: [
    { language: "Spanish", proficiency: "Native" },
    { language: "English", proficiency: "Professional" },
  ],
  languagesComplete: true,
  facts: {
    ...BASE_FACTS,
    workCountries: "Spain, EU",
    noticePeriod: "15 días",
    currentCtc: "42.000 €",
    expectedCtc: "52.000 €",
    relocate: "No",
    heardFrom: "Web de la empresa",
    gender: "Male",
    over18: "Yes",
    workMode: "hybrid",
    maxOfficeDays: 2,
    travel: "No",
  },
};

export const PERSONA_BRAZILIAN: Profile = {
  ...EMPTY_PROFILE,
  firstName: "Juliana",
  lastName: "Silva",
  email: "juliana.silva@example.com.br",
  phone: "+55 11 98765-4321",
  location: "São Paulo",
  country: "Brazil",
  address: "Avenida Paulista 1000, 01310-100 São Paulo",
  addressLine1: "Avenida Paulista 1000",
  postalCode: "01310-100",
  currentCompany: "Nubank",
  currentTitle: "Desenvolvedora Backend Pleno",
  experienceYears: "4",
  linkedin: "https://linkedin.com/in/juliana-silva",
  portfolio: "https://julianasilva.com.br",
  resume: { name: "Juliana_Silva_Curriculo.pdf", type: "application/pdf", dataBase64: btoa("%PDF-1.4 test") },
  degree: "Bacharelado em Ciência da Computação",
  school: "Universidade de São Paulo",
  discipline: "Ciência da Computação",
  graduationYear: "2020",
  languages: [
    { language: "Portuguese", proficiency: "Native" },
    { language: "English", proficiency: "Fluent" },
  ],
  languagesComplete: true,
  facts: {
    ...BASE_FACTS,
    workCountries: "Brazil",
    noticePeriod: "30 dias",
    currentCtc: "R$ 150.000",
    expectedCtc: "R$ 190.000",
    relocate: "No",
    heardFrom: "Indicação",
    gender: "Female",
    over18: "Yes",
    workMode: "remote",
    maxOfficeDays: 0,
    travel: "No",
  },
};

export const PERSONA_ITALIAN: Profile = {
  ...EMPTY_PROFILE,
  firstName: "Marco",
  lastName: "Rossi",
  email: "marco.rossi@example.it",
  phone: "+39 02 1234567",
  location: "Milano",
  country: "Italy",
  address: "Via Montenapoleone 8, 20121 Milano",
  addressLine1: "Via Montenapoleone 8",
  postalCode: "20121",
  currentCompany: "Bending Spoons",
  currentTitle: "Software Engineer",
  experienceYears: "5",
  linkedin: "https://linkedin.com/in/marco-rossi",
  portfolio: "https://marcorossi.it",
  resume: { name: "Marco_Rossi_CV.pdf", type: "application/pdf", dataBase64: btoa("%PDF-1.4 test") },
  degree: "Laurea Magistrale in Ingegneria Informatica",
  school: "Politecnico di Milano",
  discipline: "Ingegneria Informatica",
  graduationYear: "2019",
  facts: {
    ...BASE_FACTS,
    workCountries: "Italy, EU",
    noticePeriod: "2 mesi",
    currentCtc: "45.000 €",
    expectedCtc: "55.000 €",
    relocate: "No",
    gender: "Male",
    over18: "Yes",
    workMode: "hybrid",
    maxOfficeDays: 2,
    travel: "No",
  },
};

export const PERSONA_DUTCH: Profile = {
  ...EMPTY_PROFILE,
  firstName: "Daan",
  lastName: "van de Berg",
  email: "daan.vandeberg@example.nl",
  phone: "+31 20 123 4567",
  location: "Amsterdam",
  country: "Netherlands",
  address: "Keizersgracht 400, 1016 EK Amsterdam",
  addressLine1: "Keizersgracht 400",
  postalCode: "1016 EK",
  currentCompany: "Adyen",
  currentTitle: "Senior Backend Developer",
  experienceYears: "7",
  linkedin: "https://linkedin.com/in/daan-vandeberg",
  portfolio: "https://daanvandeberg.nl",
  resume: { name: "Daan_van_de_Berg_CV.pdf", type: "application/pdf", dataBase64: btoa("%PDF-1.4 test") },
  degree: "Master of Science in Computer Science",
  school: "Universiteit van Amsterdam",
  discipline: "Computer Science",
  graduationYear: "2017",
  facts: {
    ...BASE_FACTS,
    workCountries: "Netherlands, EU",
    noticePeriod: "1 maand",
    currentCtc: "70.000 €",
    expectedCtc: "82.000 €",
    relocate: "No",
    gender: "Male",
    over18: "Yes",
    workMode: "hybrid",
    maxOfficeDays: 2,
    travel: "No",
  },
};

function makeField(partial: Partial<FieldDescriptor> & { label: string }): FieldDescriptor {
  return {
    key: "f_test",
    name: "",
    autocomplete: "",
    placeholder: "",
    control: "text",
    required: true,
    options: [],
    ...partial,
  };
}

// ============================================================================
// 2. SUITE 1: GERMAN JOB APPLICATION FORMS
// ============================================================================

describe("Arena Global Multilingual Suite", () => {
  describe("German Career Forms (Personio / Greenhouse DE / Workable DE)", () => {
    const p = PERSONA_GERMAN;
    const dePage = { jobCountries: ["Germany"], url: "https://acme.jobs.personio.de/job/1001" };
    const usPage = { jobCountries: ["United States"], url: "https://boards.greenhouse.io/uscompany/jobs/2001" };

    it("correctly extracts and fills a full Personio-style German application form", () => {
      const html = `
        <form id="personio-application-form">
          <div class="field"><label for="first_name">Vorname *</label><input id="first_name" name="first_name" required></div>
          <div class="field"><label for="last_name">Nachname *</label><input id="last_name" name="last_name" required></div>
          <div class="field"><label for="email">E-Mail-Adresse *</label><input id="email" name="email" type="email" required></div>
          <div class="field"><label for="phone">Telefonnummer *</label><input id="phone" name="phone" type="tel" required></div>
          <div class="field"><label for="city">Wohnort / Stadt *</label><input id="city" name="city" required></div>
          <div class="field"><label for="zip">Postleitzahl *</label><input id="zip" name="zip" required></div>
          <div class="field"><label for="street">Straße und Hausnummer *</label><input id="street" name="street" required></div>
          <div class="field"><label for="resume">Lebenslauf *</label><input id="resume" name="resume" type="file" required></div>
          <div class="field"><label for="linkedin">LinkedIn-Profil</label><input id="linkedin" name="urls[linkedin]"></div>
          <div class="field"><label for="portfolio">Persönliche Website / Portfolio</label><input id="portfolio" name="urls[portfolio]"></div>
          <div class="field"><label for="notice">Kündigungsfrist *</label>
            <select id="notice" name="notice" required>
              <option value="">Bitte wählen...</option>
              <option>Sofort</option>
              <option>1 Monat</option>
              <option>3 Monate</option>
              <option>6 Monate</option>
            </select>
          </div>
          <fieldset>
            <legend>Sind Sie berechtigt, in Deutschland zu arbeiten? *</legend>
            <label><input type="radio" name="auth" value="ja" required> Ja</label>
            <label><input type="radio" name="auth" value="nein"> Nein</label>
          </fieldset>
          <fieldset>
            <legend>Benötigen Sie ein Visum oder Sponsoring für eine Beschäftigung in Deutschland? *</legend>
            <label><input type="radio" name="sponsor" value="ja" required> Ja</label>
            <label><input type="radio" name="sponsor" value="nein"> Nein</label>
          </fieldset>
          <div class="field"><label><input type="checkbox" id="privacy" name="privacy" required> Ich willige in die Verarbeitung meiner personenbezogenen Daten gemäß der Datenschutzerklärung ein. *</label></div>
        </form>
      `;

      mount(html);
      const fields = extractFields(document).map((f) => f.descriptor);
      expect(fields.length).toBe(14);

      // 1. Vorname
      const dFirst = decide(fields.find((f) => f.name === "first_name")!, p, [], dePage);
      expect(dFirst).toEqual({ kind: "profile", key: "firstName", value: "Klaus" });

      // 2. Nachname
      const dLast = decide(fields.find((f) => f.name === "last_name")!, p, [], dePage);
      expect(dLast).toEqual({ kind: "profile", key: "lastName", value: "Müller" });

      // 3. E-Mail-Adresse
      const dEmail = decide(fields.find((f) => f.name === "email")!, p, [], dePage);
      expect(dEmail).toEqual({ kind: "profile", key: "email", value: "klaus.mueller@example.de" });

      // 4. Telefonnummer
      const dPhone = decide(fields.find((f) => f.name === "phone")!, p, [], dePage);
      expect(dPhone).toEqual({ kind: "profile", key: "phone", value: "+49 89 1234567" });

      // 5. Wohnort / Stadt
      const dCity = decide(fields.find((f) => f.name === "city")!, p, [], dePage);
      expect(dCity).toEqual({ kind: "profile", key: "location", value: "München" });

      // 6. Postleitzahl
      const dZip = decide(fields.find((f) => f.name === "zip")!, p, [], dePage);
      expect(dZip).toEqual({ kind: "profile", key: "postalCode", value: "80331" });

      // 7. Straße und Hausnummer
      const dStreet = decide(fields.find((f) => f.name === "street")!, p, [], dePage);
      expect(dStreet).toEqual({ kind: "profile", key: "addressLine1", value: "Marienplatz 1" });

      // 8. Lebenslauf
      const dResume = decide(fields.find((f) => f.name === "resume")!, p, [], dePage);
      expect(dResume).toEqual({ kind: "resume" });

      // 9. LinkedIn-Profil
      const dLinkedin = decide(fields.find((f) => f.name === "urls[linkedin]")!, p, [], dePage);
      expect(dLinkedin).toEqual({ kind: "profile", key: "linkedin", value: "https://linkedin.com/in/klaus-mueller" });

      // 10. Persönliche Website / Portfolio
      const dPortfolio = decide(fields.find((f) => f.name === "urls[portfolio]")!, p, [], dePage);
      expect(dPortfolio).toEqual({ kind: "profile", key: "portfolio", value: "https://klausmueller.de" });

      // 11. Kündigungsfrist select -> 3 Monate
      const dNotice = decide(fields.find((f) => f.name === "notice")!, p, [], dePage);
      expect(dNotice).toEqual({ kind: "answer", value: "3 Monate", question: "Quick answers › notice period" });

      // 12. Arbeitserlaubnis Deutschland -> Ja
      const dAuth = decide(fields.find((f) => f.name === "auth")!, p, [], dePage);
      expect(dAuth).toEqual({ kind: "answer", value: "Ja", question: "Quick answers › work authorization" });

      // 13. Sponsoring Deutschland -> Nein
      const dSponsor = decide(fields.find((f) => f.name === "sponsor")!, p, [], dePage);
      expect(dSponsor).toEqual({ kind: "answer", value: "Nein", question: "Quick answers › sponsorship" });

      // 14. Datenschutz
      const dPrivacy = decide(fields.find((f) => f.name === "privacy")!, p, [], dePage);
      expect(dPrivacy).toEqual({ kind: "ask", reason: "sensitive", topic: "consent" });
    });

    it("handles compound name 'Vollständiger Name' / 'Vor- und Nachname'", () => {
      const f1 = makeField({ label: "Vollständiger Name *" });
      expect(profileKeyFor(f1)).toBe("fullName");
      expect((decide(f1, p, []) as any).value).toBe("Klaus Müller");

      const f2 = makeField({ label: "Vor- und Nachname" });
      expect(profileKeyFor(f2)).toBe("fullName");
      expect((decide(f2, p, []) as any).value).toBe("Klaus Müller");
    });

    it("handles German availability phrasing 'Frühester Eintrittstermin / Eintrittsdatum'", () => {
      const f1 = makeField({ label: "Frühester Eintrittstermin" });
      expect(sensitiveTopic(f1)).toBe("notice_period");

      const f2 = makeField({ label: "Frühestes Eintrittsdatum" });
      expect(sensitiveTopic(f2)).toBe("notice_period");

      const f3 = makeField({ label: "Eintrittsdatum" });
      expect(sensitiveTopic(f3)).toBe("notice_period");
    });

    it("handles German 'Can you start immediately?' questions", () => {
      expect(isStartImmediatelyQuestion("Können Sie sofort anfangen?")).toBe(true);
      expect(isStartImmediatelyQuestion("Sofort verfügbar?")).toBe(true);
      expect(isStartImmediatelyQuestion("Ab sofort verfügbar?")).toBe(true);

      const fImmediate = makeField({
        label: "Können Sie ab sofort anfangen?",
        control: "select",
        options: ["Ja", "Nein"],
      });
      // Klaus has 3 Monate notice period, so start immediately is "Nein"
      const d = decide(fImmediate, p, []);
      expect(d).toEqual({ kind: "answer", value: "Nein", question: "Quick answers › start immediately" });
    });

    it("properly identifies non-resume German documents (Anschreiben, Zeugnisse)", () => {
      const fCover = makeField({ label: "Anschreiben hochladen", control: "file", required: false });
      const fCert = makeField({ label: "Zeugnisse (Arbeitszeugnisse, Diplom)", control: "file", required: false });
      expect(decide(fCover, p, [])).toEqual({ kind: "skip", reason: "optional attachment (not your resume)" });
      expect(decide(fCert, p, [])).toEqual({ kind: "skip", reason: "optional attachment (not your resume)" });
    });

    it("accurately handles work authorization for US job when German persona applies", () => {
      const qAuthUS = makeField({
        label: "Besitzen Sie eine gültige Arbeitserlaubnis für die USA?",
        control: "radio",
        options: ["Ja", "Nein"],
      });
      const d = decide(qAuthUS, p, [], usPage);
      expect(d).toEqual({ kind: "answer", value: "Nein", question: "Quick answers › work authorization" });
    });
  });

  // ============================================================================
  // 3. SUITE 2: FRENCH JOB APPLICATION FORMS
  // ============================================================================

  describe("French Career Forms (Welcome to the Jungle / Lever FR)", () => {
    const p = PERSONA_FRENCH;
    const frPage = { jobCountries: ["France"], url: "https://jobs.lever.co/frenchunicorn/3001" };
    const usPage = { jobCountries: ["United States"], url: "https://jobs.lever.co/uscorp/4001" };

    it("correctly extracts and fills a Welcome to the Jungle-style French form", () => {
      const html = `
        <form id="wttj-form">
          <div class="field"><label for="prenom">Prénom *</label><input id="prenom" name="first_name" required></div>
          <div class="field"><label for="nom">Nom de famille *</label><input id="nom" name="last_name" required></div>
          <div class="field"><label for="email">Adresse e-mail *</label><input id="email" name="email" type="email" required></div>
          <div class="field"><label for="tel">Numéro de téléphone *</label><input id="tel" name="phone" type="tel" required></div>
          <div class="field"><label for="ville">Ville *</label><input id="ville" name="city" required></div>
          <div class="field"><label for="cp">Code postal *</label><input id="cp" name="postal_code" required></div>
          <div class="field"><label for="adresse">Adresse *</label><input id="adresse" name="street" required></div>
          <div class="field"><label for="cv">Mon CV (PDF) *</label><input id="cv" name="resume" type="file" required></div>
          <div class="field"><label for="linkedin">Profil LinkedIn</label><input id="linkedin" name="urls[linkedin]"></div>
          <div class="field"><label for="portfolio">Lien vers votre portfolio</label><input id="portfolio" name="urls[portfolio]"></div>
          <div class="field"><label for="preavis">Préavis *</label>
            <select id="preavis" name="notice" required>
              <option value="">Sélectionnez...</option>
              <option>Immédiat</option>
              <option>1 mois</option>
              <option>3 mois</option>
            </select>
          </div>
          <fieldset>
            <legend>Avez-vous une autorisation de travail valide en France ? *</legend>
            <label><input type="radio" name="auth" value="oui" required> Oui</label>
            <label><input type="radio" name="auth" value="non"> Non</label>
          </fieldset>
          <fieldset>
            <legend>Aurez-vous besoin d'un parrainage de visa pour travailler en France ? *</legend>
            <label><input type="radio" name="sponsor" value="oui" required> Oui</label>
            <label><input type="radio" name="sponsor" value="non"> Non</label>
          </fieldset>
          <div class="field"><label><input type="checkbox" id="rgpd" name="rgpd" required> J'accepte que mes données soient traitées conformément au RGPD *</label></div>
        </form>
      `;

      mount(html);
      const fields = extractFields(document).map((f) => f.descriptor);
      expect(fields.length).toBe(14);

      // 1. Prénom
      expect(decide(fields.find((f) => f.name === "first_name")!, p, [], frPage)).toEqual({
        kind: "profile",
        key: "firstName",
        value: "Camille",
      });

      // 2. Nom de famille
      expect(decide(fields.find((f) => f.name === "last_name")!, p, [], frPage)).toEqual({
        kind: "profile",
        key: "lastName",
        value: "Dubois",
      });

      // 3. Adresse e-mail
      expect(decide(fields.find((f) => f.name === "email")!, p, [], frPage)).toEqual({
        kind: "profile",
        key: "email",
        value: "camille.dubois@example.fr",
      });

      // 4. Numéro de téléphone
      expect(decide(fields.find((f) => f.name === "phone")!, p, [], frPage)).toEqual({
        kind: "profile",
        key: "phone",
        value: "+33 1 42 68 55 00",
      });

      // 5. Ville
      expect(decide(fields.find((f) => f.name === "city")!, p, [], frPage)).toEqual({
        kind: "profile",
        key: "location",
        value: "Paris",
      });

      // 6. Code postal
      expect(decide(fields.find((f) => f.name === "postal_code")!, p, [], frPage)).toEqual({
        kind: "profile",
        key: "postalCode",
        value: "75008",
      });

      // 7. Adresse
      expect(decide(fields.find((f) => f.name === "street")!, p, [], frPage)).toEqual({
        kind: "profile",
        key: "addressLine1",
        value: "15 Rue de la Paix",
      });

      // 8. CV
      expect(decide(fields.find((f) => f.name === "resume")!, p, [], frPage)).toEqual({ kind: "resume" });

      // 9. LinkedIn
      expect(decide(fields.find((f) => f.name === "urls[linkedin]")!, p, [], frPage)).toEqual({
        kind: "profile",
        key: "linkedin",
        value: "https://linkedin.com/in/camille-dubois",
      });

      // 10. Portfolio
      expect(decide(fields.find((f) => f.name === "urls[portfolio]")!, p, [], frPage)).toEqual({
        kind: "profile",
        key: "portfolio",
        value: "https://camilledubois.fr",
      });

      // 11. Préavis -> 1 mois
      expect(decide(fields.find((f) => f.name === "notice")!, p, [], frPage)).toEqual({
        kind: "answer",
        value: "1 mois",
        question: "Quick answers › notice period",
      });

      // 12. Autorisation de travail France -> Oui
      expect(decide(fields.find((f) => f.name === "auth")!, p, [], frPage)).toEqual({
        kind: "answer",
        value: "Oui",
        question: "Quick answers › work authorization",
      });

      // 13. Parrainage visa France -> Non
      expect(decide(fields.find((f) => f.name === "sponsor")!, p, [], frPage)).toEqual({
        kind: "answer",
        value: "Non",
        question: "Quick answers › sponsorship",
      });

      // 14. RGPD
      expect(decide(fields.find((f) => f.name === "rgpd")!, p, [], frPage)).toEqual({
        kind: "ask",
        reason: "sensitive",
        topic: "consent",
      });
    });

    it("handles standalone 'Nom' and 'Nom complet' / 'Nom et prénom'", () => {
      const fNom = makeField({ label: "Nom *" });
      expect(profileKeyFor(fNom)).toBe("lastName");

      const fComplet = makeField({ label: "Nom complet *" });
      expect(profileKeyFor(fComplet)).toBe("fullName");
      expect((decide(fComplet, p, []) as any).value).toBe("Camille Dubois");

      const fBoth = makeField({ label: "Nom et prénom" });
      expect(profileKeyFor(fBoth)).toBe("fullName");
    });

    it("handles French availability and start immediately questions", () => {
      expect(isStartImmediatelyQuestion("Pouvez-vous commencer immédiatement ?")).toBe(true);
      expect(isStartImmediatelyQuestion("Disponible immédiatement ?")).toBe(true);

      const fDate = makeField({ label: "Date de disponibilité" });
      expect(sensitiveTopic(fDate)).toBe("notice_period");
    });

    it("properly separates 'Lettre de motivation' from Resume/CV", () => {
      const fMotivation = makeField({ label: "Lettre de motivation", control: "file", required: false });
      expect(decide(fMotivation, p, [])).toEqual({
        kind: "skip",
        reason: "optional attachment (not your resume)",
      });
    });
  });

  // ============================================================================
  // 4. SUITE 3: SPANISH JOB APPLICATION FORMS
  // ============================================================================

  describe("Spanish Career Forms (Teamtailor ES / Workable ES)", () => {
    const p = PERSONA_SPANISH;
    const esPage = { jobCountries: ["Spain"], url: "https://company.teamtailor.com/jobs/5001" };
    const usPage = { jobCountries: ["United States"], url: "https://apply.workable.com/uscorp/j/6001" };

    it("correctly extracts and fills a Teamtailor-style Spanish form", () => {
      const html = `
        <form id="teamtailor-es-form">
          <div class="field"><label for="nombre">Nombre *</label><input id="nombre" name="first_name" required></div>
          <div class="field"><label for="apellidos">Apellidos *</label><input id="apellidos" name="last_name" required></div>
          <div class="field"><label for="email">Correo electrónico *</label><input id="email" name="email" type="email" required></div>
          <div class="field"><label for="telefono">Teléfono *</label><input id="telefono" name="phone" type="tel" required></div>
          <div class="field"><label for="ciudad">Ciudad *</label><input id="ciudad" name="city" required></div>
          <div class="field"><label for="cp">Código postal *</label><input id="cp" name="postal_code" required></div>
          <div class="field"><label for="direccion">Dirección *</label><input id="direccion" name="street" required></div>
          <div class="field"><label for="cv">Curriculum Vitae *</label><input id="cv" name="resume" type="file" required></div>
          <div class="field"><label for="linkedin">Perfil de LinkedIn</label><input id="linkedin" name="urls[linkedin]"></div>
          <div class="field"><label for="portfolio">Enlace al portafolio</label><input id="portfolio" name="urls[portfolio]"></div>
          <div class="field"><label for="preaviso">Plazo de preaviso *</label>
            <select id="preaviso" name="notice" required>
              <option value="">Selecciona...</option>
              <option>Sin preaviso (inmediato)</option>
              <option>15 días</option>
              <option>1 mes</option>
              <option>2 meses</option>
            </select>
          </div>
          <fieldset>
            <legend>¿Tiene derecho o permiso de trabajo para trabajar en España? *</legend>
            <label><input type="radio" name="auth" value="si" required> Sí</label>
            <label><input type="radio" name="auth" value="no"> No</label>
          </fieldset>
          <fieldset>
            <legend>¿Requiere patrocinio de visado para este puesto en España? *</legend>
            <label><input type="radio" name="sponsor" value="si" required> Sí</label>
            <label><input type="radio" name="sponsor" value="no"> No</label>
          </fieldset>
          <div class="field"><label><input type="checkbox" id="privacidad" name="privacidad" required> Acepto la política de privacidad y el tratamiento de mis datos personales *</label></div>
        </form>
      `;

      mount(html);
      const fields = extractFields(document).map((f) => f.descriptor);
      expect(fields.length).toBe(14);

      // 1. Nombre
      expect(decide(fields.find((f) => f.name === "first_name")!, p, [], esPage)).toEqual({
        kind: "profile",
        key: "firstName",
        value: "Mateo",
      });

      // 2. Apellidos
      expect(decide(fields.find((f) => f.name === "last_name")!, p, [], esPage)).toEqual({
        kind: "profile",
        key: "lastName",
        value: "García",
      });

      // 3. Correo electrónico
      expect(decide(fields.find((f) => f.name === "email")!, p, [], esPage)).toEqual({
        kind: "profile",
        key: "email",
        value: "mateo.garcia@example.es",
      });

      // 4. Teléfono
      expect(decide(fields.find((f) => f.name === "phone")!, p, [], esPage)).toEqual({
        kind: "profile",
        key: "phone",
        value: "+34 91 123 4567",
      });

      // 5. Ciudad
      expect(decide(fields.find((f) => f.name === "city")!, p, [], esPage)).toEqual({
        kind: "profile",
        key: "location",
        value: "Madrid",
      });

      // 6. Código postal
      expect(decide(fields.find((f) => f.name === "postal_code")!, p, [], esPage)).toEqual({
        kind: "profile",
        key: "postalCode",
        value: "28001",
      });

      // 7. Dirección
      expect(decide(fields.find((f) => f.name === "street")!, p, [], esPage)).toEqual({
        kind: "profile",
        key: "addressLine1",
        value: "Calle de Serrano 25",
      });

      // 8. CV
      expect(decide(fields.find((f) => f.name === "resume")!, p, [], esPage)).toEqual({ kind: "resume" });

      // 9. LinkedIn
      expect(decide(fields.find((f) => f.name === "urls[linkedin]")!, p, [], esPage)).toEqual({
        kind: "profile",
        key: "linkedin",
        value: "https://linkedin.com/in/mateo-garcia",
      });

      // 10. Portafolio
      expect(decide(fields.find((f) => f.name === "urls[portfolio]")!, p, [], esPage)).toEqual({
        kind: "profile",
        key: "portfolio",
        value: "https://mateogarcia.dev",
      });

      // 11. Plazo de preaviso -> 15 días (matches 14/15 days bracket)
      expect(decide(fields.find((f) => f.name === "notice")!, p, [], esPage)).toEqual({
        kind: "answer",
        value: "15 días",
        question: "Quick answers › notice period",
      });

      // 12. Permiso de trabajo España -> Sí
      expect(decide(fields.find((f) => f.name === "auth")!, p, [], esPage)).toEqual({
        kind: "answer",
        value: "Sí",
        question: "Quick answers › work authorization",
      });

      // 13. Patrocinio visado España -> No
      expect(decide(fields.find((f) => f.name === "sponsor")!, p, [], esPage)).toEqual({
        kind: "answer",
        value: "No",
        question: "Quick answers › sponsorship",
      });

      // 14. Privacidad
      expect(decide(fields.find((f) => f.name === "privacidad")!, p, [], esPage)).toEqual({
        kind: "ask",
        reason: "sensitive",
        topic: "consent",
      });
    });

    it("handles compound name 'Nombre completo' / 'Nombre y apellidos'", () => {
      const fFull = makeField({ label: "Nombre completo *" });
      expect(profileKeyFor(fFull)).toBe("fullName");
      expect((decide(fFull, p, []) as any).value).toBe("Mateo García");

      const fBoth = makeField({ label: "Nombre y apellidos" });
      expect(profileKeyFor(fBoth)).toBe("fullName");
    });

    it("handles Spanish availability & notice questions", () => {
      expect(isStartImmediatelyQuestion("¿Disponibilidad inmediata?")).toBe(true);
      expect(isStartImmediatelyQuestion("¿Puede incorporarse de inmediato?")).toBe(true);

      const fIncorp = makeField({ label: "Fecha de incorporación" });
      expect(sensitiveTopic(fIncorp)).toBe("notice_period");

      const fAviso = makeField({ label: "Plazo de aviso" });
      expect(sensitiveTopic(fAviso)).toBe("notice_period");
    });

    it("properly separates 'Carta de presentación' from Resume/CV", () => {
      const fCarta = makeField({ label: "Carta de presentación", control: "file", required: false });
      expect(decide(fCarta, p, [])).toEqual({
        kind: "skip",
        reason: "optional attachment (not your resume)",
      });
    });
  });

  // ============================================================================
  // 5. SUITE 4: PORTUGUESE / BRAZILIAN JOB APPLICATION FORMS
  // ============================================================================

  describe("Portuguese / Brazilian Career Forms (Gupy / Greenhouse PT-BR / Workable PT)", () => {
    const p = PERSONA_BRAZILIAN;
    const brPage = { jobCountries: ["Brazil"], url: "https://gupy.io/job/7001" };
    const usPage = { jobCountries: ["United States"], url: "https://jobs.lever.co/uscorp/8001" };

    it("correctly extracts and fills a Brazilian Gupy-style form", () => {
      const html = `
        <form id="gupy-br-form">
          <div class="field"><label for="nome">Nome *</label><input id="nome" name="first_name" required></div>
          <div class="field"><label for="sobrenome">Sobrenome *</label><input id="sobrenome" name="last_name" required></div>
          <div class="field"><label for="email">E-mail *</label><input id="email" name="email" type="email" required></div>
          <div class="field"><label for="tel">Telefone celular *</label><input id="tel" name="phone" type="tel" required></div>
          <div class="field"><label for="cidade">Cidade *</label><input id="cidade" name="city" required></div>
          <div class="field"><label for="cep">CEP *</label><input id="cep" name="postal_code" required></div>
          <div class="field"><label for="endereco">Endereço *</label><input id="endereco" name="street" required></div>
          <div class="field"><label for="curriculo">Currículo *</label><input id="curriculo" name="resume" type="file" required></div>
          <div class="field"><label for="linkedin">Link do perfil do LinkedIn</label><input id="linkedin" name="urls[linkedin]"></div>
          <div class="field"><label for="portfolio">Link do portfólio</label><input id="portfolio" name="urls[portfolio]"></div>
          <div class="field"><label for="aviso">Aviso prévio *</label>
            <select id="aviso" name="notice" required>
              <option value="">Selecione...</option>
              <option>Disponibilidade imediata</option>
              <option>30 dias</option>
              <option>60 dias</option>
            </select>
          </div>
          <fieldset>
            <legend>Você possui autorização para trabalhar no Brasil? *</legend>
            <label><input type="radio" name="auth" value="sim" required> Sim</label>
            <label><input type="radio" name="auth" value="nao"> Não</label>
          </fieldset>
          <fieldset>
            <legend>Você necessita de visto de trabalho ou patrocínio para esta posição no Brasil? *</legend>
            <label><input type="radio" name="sponsor" value="sim" required> Sim</label>
            <label><input type="radio" name="sponsor" value="nao"> Não</label>
          </fieldset>
          <div class="field"><label><input type="checkbox" id="lgpd" name="lgpd" required> Concordo com a política de privacidade e os termos da LGPD *</label></div>
        </form>
      `;

      mount(html);
      const fields = extractFields(document).map((f) => f.descriptor);
      expect(fields.length).toBe(14);

      // 1. Nome
      expect(decide(fields.find((f) => f.name === "first_name")!, p, [], brPage)).toEqual({
        kind: "profile",
        key: "firstName",
        value: "Juliana",
      });

      // 2. Sobrenome
      expect(decide(fields.find((f) => f.name === "last_name")!, p, [], brPage)).toEqual({
        kind: "profile",
        key: "lastName",
        value: "Silva",
      });

      // 3. E-mail
      expect(decide(fields.find((f) => f.name === "email")!, p, [], brPage)).toEqual({
        kind: "profile",
        key: "email",
        value: "juliana.silva@example.com.br",
      });

      // 4. Telefone celular
      expect(decide(fields.find((f) => f.name === "phone")!, p, [], brPage)).toEqual({
        kind: "profile",
        key: "phone",
        value: "+55 11 98765-4321",
      });

      // 5. Cidade
      expect(decide(fields.find((f) => f.name === "city")!, p, [], brPage)).toEqual({
        kind: "profile",
        key: "location",
        value: "São Paulo",
      });

      // 6. CEP
      expect(decide(fields.find((f) => f.name === "postal_code")!, p, [], brPage)).toEqual({
        kind: "profile",
        key: "postalCode",
        value: "01310-100",
      });

      // 7. Endereço
      expect(decide(fields.find((f) => f.name === "street")!, p, [], brPage)).toEqual({
        kind: "profile",
        key: "addressLine1",
        value: "Avenida Paulista 1000",
      });

      // 8. Currículo
      expect(decide(fields.find((f) => f.name === "resume")!, p, [], brPage)).toEqual({ kind: "resume" });

      // 9. LinkedIn
      expect(decide(fields.find((f) => f.name === "urls[linkedin]")!, p, [], brPage)).toEqual({
        kind: "profile",
        key: "linkedin",
        value: "https://linkedin.com/in/juliana-silva",
      });

      // 10. Portfólio
      expect(decide(fields.find((f) => f.name === "urls[portfolio]")!, p, [], brPage)).toEqual({
        kind: "profile",
        key: "portfolio",
        value: "https://julianasilva.com.br",
      });

      // 11. Aviso prévio -> 30 dias
      expect(decide(fields.find((f) => f.name === "notice")!, p, [], brPage)).toEqual({
        kind: "answer",
        value: "30 dias",
        question: "Quick answers › notice period",
      });

      // 12. Autorização trabalho Brasil -> Sim
      expect(decide(fields.find((f) => f.name === "auth")!, p, [], brPage)).toEqual({
        kind: "answer",
        value: "Sim",
        question: "Quick answers › work authorization",
      });

      // 13. Patrocínio visto Brasil -> Não
      expect(decide(fields.find((f) => f.name === "sponsor")!, p, [], brPage)).toEqual({
        kind: "answer",
        value: "Não",
        question: "Quick answers › sponsorship",
      });

      // 14. LGPD
      expect(decide(fields.find((f) => f.name === "lgpd")!, p, [], brPage)).toEqual({
        kind: "ask",
        reason: "sensitive",
        topic: "consent",
      });
    });

    it("handles Portuguese 'Nome de batismo' and 'Nome completo'", () => {
      const fBatismo = makeField({ label: "Nome de batismo *" });
      expect(profileKeyFor(fBatismo)).toBe("firstName");
      expect((decide(fBatismo, p, []) as any).value).toBe("Juliana");

      const fFull = makeField({ label: "Nome completo" });
      expect(profileKeyFor(fFull)).toBe("fullName");
      expect((decide(fFull, p, []) as any).value).toBe("Juliana Silva");
    });

    it("handles Portuguese availability & start immediately questions", () => {
      expect(isStartImmediatelyQuestion("Disponibilidade imediata?")).toBe(true);
      expect(isStartImmediatelyQuestion("Pode começar imediatamente?")).toBe(true);

      const fDate = makeField({ label: "Data de disponibilidade para início" });
      expect(sensitiveTopic(fDate)).toBe("notice_period");
    });

    it("properly separates 'Carta de motivação' from Currículo", () => {
      const fCarta = makeField({ label: "Carta de motivação / Apresentação", control: "file", required: false });
      expect(decide(fCarta, p, [])).toEqual({
        kind: "skip",
        reason: "optional attachment (not your resume)",
      });
    });
  });

  // ============================================================================
  // 6. SUITE 5: ITALIAN & DUTCH CAREER FORMS
  // ============================================================================

  describe("Italian & Dutch Career Forms", () => {
    it("handles Italian fields accurately", () => {
      const p = PERSONA_ITALIAN;
      const itPage = { jobCountries: ["Italy"], url: "https://acme.jobs.personio.de/it/job/9001" };

      const fFirst = makeField({ label: "Nome *" });
      expect(profileKeyFor(fFirst)).toBe("firstName");
      expect((decide(fFirst, p, []) as any).value).toBe("Marco");

      const fLast = makeField({ label: "Cognome *" });
      expect(profileKeyFor(fLast)).toBe("lastName");
      expect((decide(fLast, p, []) as any).value).toBe("Rossi");

      const fBoth = makeField({ label: "Nome e cognome" });
      expect(profileKeyFor(fBoth)).toBe("fullName");
      expect((decide(fBoth, p, []) as any).value).toBe("Marco Rossi");

      const fEmail = makeField({ label: "Indirizzo e-mail *" });
      expect(profileKeyFor(fEmail)).toBe("email");

      const fPhone = makeField({ label: "Numero di telefono" });
      expect(profileKeyFor(fPhone)).toBe("phone");

      const fCity = makeField({ label: "Città *" });
      expect(profileKeyFor(fCity)).toBe("location");
      expect((decide(fCity, p, []) as any).value).toBe("Milano");

      const fCap = makeField({ label: "CAP *" });
      expect(profileKeyFor(fCap)).toBe("postalCode");
      expect((decide(fCap, p, []) as any).value).toBe("20121");

      const fNotice = makeField({
        label: "Periodo di preavviso",
        control: "select",
        options: ["Nessuno (immediato)", "1 mese", "2 mesi", "3 mesi"],
      });
      expect(decide(fNotice, p, [])).toEqual({
        kind: "answer",
        value: "2 mesi",
        question: "Quick answers › notice period",
      });

      const fAuth = makeField({
        label: "Hai il permesso di lavorare in Italia?",
        control: "radio",
        options: ["Sì", "No"],
      });
      expect(decide(fAuth, p, [], itPage)).toEqual({
        kind: "answer",
        value: "Sì",
        question: "Quick answers › work authorization",
      });
    });

    it("handles Dutch fields accurately", () => {
      const p = PERSONA_DUTCH;
      const nlPage = { jobCountries: ["Netherlands"], url: "https://apply.workable.com/nlcompany/j/9501" };

      const fFirst = makeField({ label: "Voornaam *" });
      expect(profileKeyFor(fFirst)).toBe("firstName");
      expect((decide(fFirst, p, []) as any).value).toBe("Daan");

      const fLast = makeField({ label: "Achternaam *" });
      expect(profileKeyFor(fLast)).toBe("lastName");
      expect((decide(fLast, p, []) as any).value).toBe("van de Berg");

      const fFull = makeField({ label: "Volledige naam" });
      expect(profileKeyFor(fFull)).toBe("fullName");
      expect((decide(fFull, p, []) as any).value).toBe("Daan van de Berg");

      const fEmail = makeField({ label: "E-mailadres *" });
      expect(profileKeyFor(fEmail)).toBe("email");

      const fPhone = makeField({ label: "Telefoonnummer" });
      expect(profileKeyFor(fPhone)).toBe("phone");

      const fCity = makeField({ label: "Woonplaats *" });
      expect(profileKeyFor(fCity)).toBe("location");
      expect((decide(fCity, p, []) as any).value).toBe("Amsterdam");

      const fZip = makeField({ label: "Postcode *" });
      expect(profileKeyFor(fZip)).toBe("postalCode");
      expect((decide(fZip, p, []) as any).value).toBe("1016 EK");

      const fNotice = makeField({
        label: "Opzegtermijn",
        control: "select",
        options: ["Per direct", "1 maand", "2 maanden", "3 maanden"],
      });
      expect(decide(fNotice, p, [])).toEqual({
        kind: "answer",
        value: "1 maand",
        question: "Quick answers › notice period",
      });

      const fAuth = makeField({
        label: "Bent u gerechtigd om in Nederland te werken?",
        control: "radio",
        options: ["Ja", "Nee"],
      });
      expect(decide(fAuth, p, [], nlPage)).toEqual({
        kind: "answer",
        value: "Ja",
        question: "Quick answers › work authorization",
      });

      const fMotivation = makeField({ label: "Motivatiebrief toevoegen", control: "file", required: false });
      expect(decide(fMotivation, p, [])).toEqual({
        kind: "skip",
        reason: "optional attachment (not your resume)",
      });
    });
  });

  // ============================================================================
  // 7. SUITE 6: STRICT INVARIANTS & MULTILINGUAL NOTICE PERIOD PARSER
  // ============================================================================

  describe("Strict Invariants & Multilingual Notice Period Parser", () => {
    it("parses notice days across 6 languages", () => {
      // 0 days / immediate
      expect(parseNoticeDays("Sofort")).toBe(0);
      expect(parseNoticeDays("ab sofort")).toBe(0);
      expect(parseNoticeDays("Immédiat")).toBe(0);
      expect(parseNoticeDays("De inmediato")).toBe(0);
      expect(parseNoticeDays("Imediatamente")).toBe(0);
      expect(parseNoticeDays("Subito")).toBe(0);
      expect(parseNoticeDays("Per direct")).toBe(0);

      // Months
      expect(parseNoticeDays("1 Monat")).toBe(30);
      expect(parseNoticeDays("3 Monate")).toBe(90);
      expect(parseNoticeDays("1 mois")).toBe(30);
      expect(parseNoticeDays("3 mois")).toBe(90);
      expect(parseNoticeDays("1 mes")).toBe(30);
      expect(parseNoticeDays("3 meses")).toBe(90);
      expect(parseNoticeDays("2 mesi")).toBe(60);
      expect(parseNoticeDays("1 maand")).toBe(30);

      // Weeks & Days
      expect(parseNoticeDays("2 Wochen")).toBe(14);
      expect(parseNoticeDays("2 semaines")).toBe(14);
      expect(parseNoticeDays("2 semanas")).toBe(14);
      expect(parseNoticeDays("2 weken")).toBe(14);
      expect(parseNoticeDays("15 Tage")).toBe(15);
      expect(parseNoticeDays("15 jours")).toBe(15);
      expect(parseNoticeDays("15 días")).toBe(15);
      expect(parseNoticeDays("30 dias")).toBe(30);
    });

    it("matches tiered options in all international locales", () => {
      // German
      const deOpts = ["Sofort", "1 Monat", "3 Monate", "6 Monate"];
      expect(matchNoticeOption("3 Monate", deOpts)).toBe("3 Monate");
      expect(matchNoticeOption("90 Tage", deOpts)).toBe("3 Monate");
      expect(matchNoticeOption("sofort", deOpts)).toBe("Sofort");

      // French
      const frOpts = ["Immédiatement", "1 mois", "3 mois"];
      expect(matchNoticeOption("1 mois", frOpts)).toBe("1 mois");
      expect(matchNoticeOption("30 jours", frOpts)).toBe("1 mois");

      // Spanish
      const esOpts = ["De inmediato", "15 días", "1 mes", "2 meses"];
      expect(matchNoticeOption("15 días", esOpts)).toBe("15 días");
      expect(matchNoticeOption("2 semanas", esOpts)).toBe("15 días");

      // Portuguese
      const ptOpts = ["Imediata", "30 dias", "60 dias", "90 dias"];
      expect(matchNoticeOption("30 dias", ptOpts)).toBe("30 dias");
      expect(matchNoticeOption("1 mês", ptOpts)).toBe("30 dias");

      // Italian
      const itOpts = ["Subito", "1 mese", "2 mesi", "3 mesi"];
      expect(matchNoticeOption("2 mesi", itOpts)).toBe("2 mesi");
      expect(matchNoticeOption("60 giorni", itOpts)).toBe("2 mesi");

      // Dutch
      const nlOpts = ["Per direct", "1 maand", "2 maanden", "3 maanden"];
      expect(matchNoticeOption("1 maand", nlOpts)).toBe("1 maand");
    });
  });
});

import { describe, expect, it } from "vitest";
import { isPrivacyConsentCheckbox } from "../src/shared/consent";
import { tickConsentCheckboxes } from "../src/content/agent";

describe("isPrivacyConsentCheckbox", () => {
  it("recognises genuine privacy and data-processing consent checkboxes", () => {
    const valid = [
      "I have read and agree to the Privacy Policy",
      "I agree to the Privacy Notice and terms of data processing",
      "I consent to the processing of my personal data for this application",
      "Data protection consent",
      "GDPR data processing agreement",
      "Ich habe die Datenschutzerklärung gelesen und stimme zu",
      "J'accepte la politique de confidentialité",
      "Consiento el tratamiento de mis datos personales",
      "Concordo com a política de privacidade",
      "Acconsento al trattamento dei dati personali",
    ];
    for (const label of valid) {
      expect(isPrivacyConsentCheckbox(label), `expected true for: ${label}`).toBe(true);
    }
  });

  it("strictly rejects marketing, SMS, newsletters, and promotional consent", () => {
    const forbiddenMarketing = [
      "I agree to receive marketing communications",
      "Send me newsletters and promotional offers",
      "I consent to receive text messages / SMS about company updates",
      "Opt-in for marketing emails",
      "Sign me up for promotional updates",
    ];
    for (const label of forbiddenMarketing) {
      expect(isPrivacyConsentCheckbox(label), `expected false for: ${label}`).toBe(false);
    }
  });

  it("strictly rejects talent pools, candidate networks, and future opportunities", () => {
    const forbiddenFuture = [
      "Keep my resume for future job opportunities",
      "Join our talent pool for future roles",
      "Keep my data on file for future openings",
      "Allow us to contact you for future job matches",
      "Join our talent community",
    ];
    for (const label of forbiddenFuture) {
      expect(isPrivacyConsentCheckbox(label), `expected false for: ${label}`).toBe(false);
    }
  });

  it("strictly rejects certifications, declarations, legal attestations, and signatures", () => {
    const forbiddenLegal = [
      "I certify that all statements made in this application are true and correct",
      "I declare under penalty of perjury that the answers provided are true",
      "I attest that the information is true and accurate to the best of my knowledge",
      "Applicant declaration: I certify the accuracy of all information",
      "By ticking this box, I electronically sign this application",
      "E-sign declaration and signature",
    ];
    for (const label of forbiddenLegal) {
      expect(isPrivacyConsentCheckbox(label), `expected false for: ${label}`).toBe(false);
    }
  });

  it("strictly rejects mixed clauses that bundle privacy with marketing or future contact", () => {
    const mixed = [
      "I accept the privacy policy and agree to receive marketing updates",
      "Privacy statement agreement and join our talent network for future openings",
      "I consent to data processing and authorize SMS text messages",
    ];
    for (const label of mixed) {
      expect(isPrivacyConsentCheckbox(label), `expected false for mixed: ${label}`).toBe(false);
    }
  });
});

describe("tickConsentCheckboxes", () => {
  it("ticks only eligible privacy/data-processing checkboxes and leaves forbidden boxes untouched", () => {
    document.body.innerHTML = `
      <form id="job-form">
        <label><input type="checkbox" id="cb-privacy" /> I agree to the Privacy Policy</label>
        <label><input type="checkbox" id="cb-marketing" /> Send me promotional and marketing emails</label>
        <label><input type="checkbox" id="cb-data" /> I consent to data processing under GDPR</label>
        <label><input type="checkbox" id="cb-certify" /> I certify that all information is true and correct</label>
        <label><input type="checkbox" id="cb-already" checked /> Privacy Notice agreement</label>
      </form>
    `;

    const count = tickConsentCheckboxes(document);
    expect(count).toBe(2);

    expect((document.getElementById("cb-privacy") as HTMLInputElement).checked).toBe(true);
    expect((document.getElementById("cb-data") as HTMLInputElement).checked).toBe(true);
    expect((document.getElementById("cb-already") as HTMLInputElement).checked).toBe(true);

    // Forbidden must NEVER be ticked
    expect((document.getElementById("cb-marketing") as HTMLInputElement).checked).toBe(false);
    expect((document.getElementById("cb-certify") as HTMLInputElement).checked).toBe(false);

    // Second run ticks nothing new
    const secondCount = tickConsentCheckboxes(document);
    expect(secondCount).toBe(0);
  });
});

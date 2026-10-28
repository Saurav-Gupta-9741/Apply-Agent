/** Privacy and data-processing consent rules.
 * ApplyAgent never automatically ticks consent checkboxes.
 * A button in the panel allows the user to explicitly tick privacy and data-processing
 * consent boxes on the page, while strictly refusing marketing, SMS, future-contact,
 * certifications, declarations and signatures.
 */

import { normalize } from "./text";

/** Phrases that identify privacy or data-processing consent. */
const PRIVACY_OR_DATA_PROCESSING = /\b(privacy( policy| notice| statement)?|data (processing|protection)|processing of (my |personal )?data|personal data|datenschutz[a-z]*|gdpr|dsgvo|rgpd|confidentialite|privacidad|privacidade|tratamiento de( mis)? datos|trattamento dei dati)\b/i;

/** Phrases that must NEVER be ticked: marketing, SMS, future contact, certifications, declarations, signatures. */
const FORBIDDEN_CONSENT = /\b(marketing|sms|text message|promot(ion|ional)?|newsletter|future (job|role|opportunit|opening|contact)|keep (my )?(data|resume|cv)|talent (pool|network|community)|i certify|certif(y|ied|icate|ication)|i declare|declar(ation|e)|perjury|attest|i attest|true and (correct|accurate|complete)|accurate to the best|signature|sign here|electronically sign|e sign)\b/i;

/** Check whether a checkbox label represents an eligible privacy or data-processing consent box. */
export function isPrivacyConsentCheckbox(label: string): boolean {
  const norm = normalize(label);
  if (FORBIDDEN_CONSENT.test(norm)) return false;
  return PRIVACY_OR_DATA_PROCESSING.test(norm);
}

/**
 * Country-specific compliance and demographic rules.
 * Governs EEO question handling, UK diversity monitoring, GDPR consent protections,
 * and work authorization evaluations across jurisdictions.
 */

export type EeoHandling = "standard_voluntary" | "uk_monitoring" | "prohibited_or_skip" | "human_only";

/**
 * Determines whether demographic/EEO self-identification is applicable in the form's country.
 * - US: Standard voluntary self-identification (race, veteran, disability, gender).
 * - UK: Diversity monitoring is common; default to user choice or "Prefer not to say".
 * - DE / FR / EU: EEO questions are prohibited by labor / anti-discrimination laws or irrelevant; skip or ask.
 * - Consent/GDPR declarations: ALWAYS human_only. Never auto-tick.
 */
export function evaluateEeoPolicy(
  topic: string,
  countryAlpha2?: string
): EeoHandling {
  const normTopic = topic.toLowerCase();

  // Consent & GDPR declarations are inviolably human_only across all jurisdictions
  if (normTopic === "consent" || normTopic === "legal_declaration" || normTopic === "signature") {
    return "human_only";
  }

  const c = countryAlpha2?.toUpperCase();

  // Germany and France strictly prohibit race/ethnicity tracking in hiring
  if (c === "DE" || c === "FR") {
    return "prohibited_or_skip";
  }

  // United Kingdom uses diversity monitoring questions with "Prefer not to say" standard
  if (c === "GB") {
    return "uk_monitoring";
  }

  // United States standard voluntary EEO
  if (c === "US") {
    return "standard_voluntary";
  }

  return "standard_voluntary";
}

/**
 * Evaluates work authorization polarity for a target job country.
 * Invariant: Never assume "No" for an unlisted country unless the user explicitly
 * specified it in unauthorizedCountries. Otherwise, return "ask".
 */
export function checkCountryWorkAuthorization(
  targetCountry: string,
  authorizedCountries: string[],
  unauthorizedCountries?: string[]
): "yes" | "no" | "ask" {
  const normTarget = targetCountry.trim().toLowerCase();
  if (!normTarget) return "ask";

  const isAuth = authorizedCountries.some(
    (c) => c.trim().toLowerCase() === normTarget || normTarget.includes(c.trim().toLowerCase())
  );
  if (isAuth) return "yes";

  if (unauthorizedCountries && unauthorizedCountries.length > 0) {
    const isExplicitlyUnauth = unauthorizedCountries.some(
      (c) => c.trim().toLowerCase() === normTarget || normTarget.includes(c.trim().toLowerCase())
    );
    if (isExplicitlyUnauth) return "no";
  }

  // Unlisted country and not explicitly unauthorized -> must ask user
  return "ask";
}

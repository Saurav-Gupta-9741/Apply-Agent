/**
 * Reviewed i18n dictionaries and label translation for non-English forms:
 * German (de), French (fr), Spanish (es), Dutch (nl), Portuguese (pt), and Hindi-in-English (hi-en).
 *
 * Rules:
 * - Exact whole-label or whole-phrase matches only — no fuzzy matching.
 * - Translate the label BEFORE classify; keep the original text in field.originalLabel.
 * - Detect page language from <html lang> + form label signatures.
 * - Unknown language -> ask for everything except name/email/phone matched by input type/autocomplete.
 * - Consent tick-boxes and false friends are strictly protected.
 */

import { cleanLabel, normalize } from "./text";

export type SupportedLanguage = "de" | "fr" | "es" | "nl" | "pt" | "hi-en";

export interface TranslationResult {
  label: string;
  originalLabel: string;
  detectedLang?: SupportedLanguage | "unknown" | "en";
  isConsent?: boolean;
  frequency?: "monthly" | "annual";
  documentType?: "resume" | "cover_letter" | "certificate";
}

/** German form label dictionary -> English canonical labels */
const DE_DICTIONARY: Record<string, string> = {
  // Name
  "vorname": "First name",
  "ihr vorname": "First name",
  "nachname": "Last name",
  "ihr nachname": "Last name",
  "familienname": "Last name",
  "zuname": "Last name",
  "vollständiger name": "Full name",
  "vollstandiger name": "Full name",
  "name": "Full name",
  "ihr name": "Full name",

  // Contact
  "e-mail": "Email",
  "e-mail-adresse": "Email",
  "email": "Email",
  "e-mail adresse": "Email",
  "email-adresse": "Email",
  "mailadresse": "Email",
  "telefon": "Phone",
  "telefonnummer": "Phone",
  "handynummer": "Phone",
  "mobilnummer": "Phone",
  "rufnummer": "Phone",
  "tel.": "Phone",
  "mobil": "Phone",

  // Documents
  "lebenslauf": "Resume",
  "ihr lebenslauf": "Resume",
  "lebenslauf hochladen": "Resume",
  "cv": "Resume",
  "curriculum vitae": "Resume",
  "anschreiben": "Cover letter",
  "ihr anschreiben": "Cover letter",
  "motivationsschreiben": "Cover letter",
  "bewerbungsschreiben": "Cover letter",
  "anschreiben hochladen": "Cover letter",
  "zeugnisse": "Certificates",
  "arbeitszeugnisse": "Certificates",
  "arbeitszeugnis": "Certificates",
  "zeugnis": "Certificates",

  // Compensation
  "gehaltserwartung": "Expected salary",
  "gehaltsvorstellung": "Expected salary",
  "gehaltswunsch": "Expected salary",
  "wunschgehalt": "Expected salary",
  "jahresgehalt": "Expected annual salary",
  "jahresbruttogehalt": "Expected annual salary",
  "gehaltserwartung (brutto/jahr)": "Expected annual salary",
  "gehaltserwartung pro jahr": "Expected annual salary",
  "monatsgehalt": "Expected monthly salary",
  "monatsbruttogehalt": "Expected monthly salary",
  "aktuelles gehalt": "Current salary",

  // Timing
  "kündigungsfrist": "Notice period",
  "kundigungsfrist": "Notice period",
  "eintrittsdatum": "Start date",
  "frühestmögliches eintrittsdatum": "Start date",
  "fruhestmogliches eintrittsdatum": "Start date",
  "frühester eintrittstermin": "Start date",
  "fruhester eintrittstermin": "Start date",
  "startdatum": "Start date",

  // Address & Location
  "standort": "Location",
  "wohnort": "City",
  "ort": "City",
  "stadt": "City",
  "adresse": "Address",
  "straße": "Address line 1",
  "strasse": "Address line 1",
  "postleitzahl": "Postal code",
  "plz": "Postal code",
  "land": "Country",

  // Links
  "linkedin profil": "LinkedIn",
  "linkedin-profil": "LinkedIn",
  "xing profil": "Xing",
  "xing-profil": "Xing",
  "github profil": "GitHub",
  "github-profil": "GitHub",
  "portfolio": "Portfolio",
  "website": "Portfolio",
  "webseite": "Portfolio",

  // Options
  "ja": "Yes",
  "nein": "No",
};

/** French form label dictionary -> English canonical labels */
const FR_DICTIONARY: Record<string, string> = {
  // Name
  "prénom": "First name",
  "prenom": "First name",
  "votre prénom": "First name",
  "votre prenom": "First name",
  "nom": "Last name",
  "nom de famille": "Last name",
  "votre nom": "Last name",
  "nom complet": "Full name",
  "nom et prénom": "Full name",
  "nom et prenom": "Full name",

  // Contact
  "courriel": "Email",
  "adresse e-mail": "Email",
  "adresse email": "Email",
  "adresse de courriel": "Email",
  "e-mail": "Email",
  "email": "Email",
  "téléphone": "Phone",
  "telephone": "Phone",
  "numéro de téléphone": "Phone",
  "numero de telephone": "Phone",
  "portable": "Phone",
  "mobile": "Phone",

  // Documents
  "cv": "Resume",
  "votre cv": "Resume",
  "curriculum vitae": "Resume",
  "télécharger le cv": "Resume",
  "lettre de motivation": "Cover letter",
  "votre lettre de motivation": "Cover letter",
  "lettre": "Cover letter",

  // Compensation
  "prétentions salariales": "Expected salary",
  "pretentions salariales": "Expected salary",
  "rémunération souhaitée": "Expected salary",
  "remuneration souhaitee": "Expected salary",
  "salaire souhaité": "Expected salary",
  "salaire souhaite": "Expected salary",
  "salaire actuel": "Current salary",
  "salaire annuel brut": "Expected annual salary",
  "salaire mensuel brut": "Expected monthly salary",

  // Timing
  "préavis": "Notice period",
  "preavis": "Notice period",
  "période de préavis": "Notice period",
  "periode de preavis": "Notice period",
  "date de début": "Start date",
  "date de debut": "Start date",
  "date de disponibilité": "Start date",
  "date de disponibilite": "Start date",
  "disponible à partir du": "Start date",
  "disponible a partir du": "Start date",

  // Location
  "ville": "City",
  "adresse": "Address",
  "code postal": "Postal code",
  "pays": "Country",
  "lieu de résidence": "Location",
  "lieu de residence": "Location",

  // Links
  "profil linkedin": "LinkedIn",
  "profil github": "GitHub",
  "site web": "Portfolio",
  "portfolio": "Portfolio",

  // Options
  "oui": "Yes",
  "non": "No",
};

/** Spanish form label dictionary -> English canonical labels */
const ES_DICTIONARY: Record<string, string> = {
  // Name
  "nombre": "First name",
  "primer nombre": "First name",
  "apellidos": "Last name",
  "apellido": "Last name",
  "primer apellido": "Last name",
  "segundo apellido": "Last name",
  "nombre completo": "Full name",
  "nombres y apellidos": "Full name",

  // Contact
  "correo electrónico": "Email",
  "correo electronico": "Email",
  "correo": "Email",
  "email": "Email",
  "e-mail": "Email",
  "teléfono": "Phone",
  "telefono": "Phone",
  "número de teléfono": "Phone",
  "numero de telefono": "Phone",
  "móvil": "Phone",
  "movil": "Phone",
  "celular": "Phone",

  // Documents
  "currículum": "Resume",
  "curriculum": "Resume",
  "currículum vitae": "Resume",
  "curriculum vitae": "Resume",
  "hoja de vida": "Resume",
  "cv": "Resume",
  "adjuntar cv": "Resume",
  "carta de presentación": "Cover letter",
  "carta de presentacion": "Cover letter",
  "carta de motivación": "Cover letter",
  "carta de motivacion": "Cover letter",

  // Compensation
  "expectativa salarial": "Expected salary",
  "pretensiones salariales": "Expected salary",
  "salario deseado": "Expected salary",
  "salario pretendido": "Expected salary",
  "remuneración esperada": "Expected salary",
  "salario actual": "Current salary",
  "salario anual": "Expected annual salary",
  "salario mensual": "Expected monthly salary",

  // Timing
  "período de preaviso": "Notice period",
  "periodo de preaviso": "Notice period",
  "preaviso": "Notice period",
  "fecha de inicio": "Start date",
  "fecha de incorporación": "Start date",
  "fecha de incorporacion": "Start date",
  "disponibilidad": "Start date",
  "disponible a partir de": "Start date",

  // Location
  "ciudad": "City",
  "dirección": "Address",
  "direccion": "Address",
  "código postal": "Postal code",
  "codigo postal": "Postal code",
  "país": "Country",
  "pais": "Country",
  "ubicación": "Location",
  "ubicacion": "Location",

  // Links
  "perfil de linkedin": "LinkedIn",
  "perfil linkedin": "LinkedIn",
  "sitio web": "Portfolio",
  "portfolio": "Portfolio",
  "portafolio": "Portfolio",
  "github": "GitHub",

  // Options
  "sí": "Yes",
  "si": "Yes",
  "no": "No",
};

/** Dutch form label dictionary -> English canonical labels */
const NL_DICTIONARY: Record<string, string> = {
  // Name
  "voornaam": "First name",
  "roepnaam": "First name",
  "achternaam": "Last name",
  "familienaam": "Last name",
  "volledige naam": "Full name",
  "naam": "Full name",

  // Contact
  "e-mailadres": "Email",
  "e-mail": "Email",
  "emailadres": "Email",
  "email": "Email",
  "telefoonnummer": "Phone",
  "telefoon": "Phone",
  "mobiel nummer": "Phone",
  "mobiel": "Phone",

  // Documents
  "cv": "Resume",
  "curriculum vitae": "Resume",
  "cv uploaden": "Resume",
  "motivatiebrief": "Cover letter",
  "sollicitatiebrief": "Cover letter",
  "motivatie": "Cover letter",

  // Compensation
  "salarisindicatie": "Expected salary",
  "salarisverwachting": "Expected salary",
  "gewenst salaris": "Expected salary",
  "huidig salaris": "Current salary",

  // Timing
  "opzegtermijn": "Notice period",
  "beschikbaarheid": "Notice period",
  "startdatum": "Start date",
  "beschikbaar per": "Start date",
  "beschikbaar vanaf": "Start date",

  // Location
  "woonplaats": "City",
  "stad": "City",
  "adres": "Address",
  "postcode": "Postal code",
  "land": "Country",

  // Options
  "ja": "Yes",
  "nee": "No",
};

/** Portuguese form label dictionary -> English canonical labels */
const PT_DICTIONARY: Record<string, string> = {
  // Name
  "primeiro nome": "First name",
  "nome próprio": "First name",
  "nome proprio": "First name",
  "sobrenome": "Last name",
  "apelido": "Last name", // PT-PT for surname
  "último nome": "Last name",
  "ultimo nome": "Last name",
  "nome completo": "Full name",
  "nome": "Full name",

  // Contact
  "e-mail": "Email",
  "email": "Email",
  "correio eletrónico": "Email",
  "correio eletronico": "Email",
  "telefone": "Phone",
  "número de telefone": "Phone",
  "numero de telefone": "Phone",
  "telemóvel": "Phone",
  "telemovel": "Phone",
  "celular": "Phone",

  // Documents
  "currículo": "Resume",
  "curriculo": "Resume",
  "cv": "Resume",
  "anexar currículo": "Resume",
  "anexar curriculo": "Resume",
  "carta de apresentação": "Cover letter",
  "carta de apresentacao": "Cover letter",
  "carta de motivação": "Cover letter",
  "carta de motivacao": "Cover letter",

  // Compensation
  "pretensão salarial": "Expected salary",
  "pretensao salarial": "Expected salary",
  "salário desejado": "Expected salary",
  "salario desejado": "Expected salary",
  "expectativa salarial": "Expected salary",
  "salário atual": "Current salary",
  "salario atual": "Current salary",

  // Timing
  "aviso prévio": "Notice period",
  "aviso previo": "Notice period",
  "disponibilidade para início": "Start date",
  "disponibilidade para inicio": "Start date",
  "data de início": "Start date",
  "data de inicio": "Start date",

  // Location
  "cidade": "City",
  "endereço": "Address",
  "endereco": "Address",
  "código postal": "Postal code",
  "codigo postal": "Postal code",
  "cep": "Postal code",
  "país": "Country",
  "pais": "Country",

  // Options
  "sim": "Yes",
  "não": "No",
  "nao": "No",
};

/** Hindi-in-English (Hinglish) form label dictionary */
const HI_EN_DICTIONARY: Record<string, string> = {
  "pehla naam": "First name",
  "aakhri naam": "Last name",
  "apka naam": "Full name",
  "apka shubh naam": "Full name",
  "pura naam": "Full name",
  "naam": "Full name",
  "phone number": "Phone",
  "mobile number": "Phone",
  "sampark number": "Phone",
  "aapka shahar": "City",
  "kahan rehte hain": "City",
  "expected ctc": "Expected salary",
  "current ctc": "Current salary",
  "notice period in days": "Notice period",
  "notice period kitna hai": "Notice period",
  "kitne din mein join kar sakte hain": "Notice period",
  "expected ctc kitna hai": "Expected salary",
  "kitna salary chahiye": "Expected salary",
  "current ctc kitna hai": "Current salary",
  "haan": "Yes",
  "ha": "Yes",
  "nahi": "No",
  "nahin": "No",
};

/** Signatures for language detection based on distinctive vocabulary */
const LANG_SIGNATURES: Record<SupportedLanguage, RegExp[]> = {
  de: [/\b(vorname|nachname|lebenslauf|anschreiben|kündigungsfrist|gehaltserwartung)\b/i],
  fr: [/\b(prénom|courriel|lettre de motivation|prétentions salariales|préavis)\b/i],
  es: [/\b(apellidos|correo electrónico|hoja de vida|expectativa salarial|preaviso)\b/i],
  nl: [/\b(voornaam|achternaam|motivatiebrief|salarisindicatie|opzegtermijn)\b/i],
  pt: [/\b(sobrenome|telemóvel|pretensão salarial|aviso prévio|anexar currículo)\b/i],
  "hi-en": [/\b(pehla naam|aakhri naam|pura naam|kitna|rehte hain|ctc kitna|shahar)\b/i],
};

const DICTIONARIES: Record<SupportedLanguage, Record<string, string>> = {
  de: DE_DICTIONARY,
  fr: FR_DICTIONARY,
  es: ES_DICTIONARY,
  nl: NL_DICTIONARY,
  pt: PT_DICTIONARY,
  "hi-en": HI_EN_DICTIONARY,
};

/** False-friend traps: words that must NOT be auto-translated to regular fields */
const TRAP_CONSENT = /\b(ich stimme.*zu|stimme.*zu|einwilligung|datenschutz\w*|j'accepte|consentement|acepto\b|concordo|termo de consentimento|akkoord|privacybeleid|toestemming)\b/i;
const TRAP_ZEUGNIS = /\b(zeugnis|zeugnisse|arbeitszeugnis|arbeitszeugnisse)\b/i;
const TRAP_BIRTHDAY = /\b(date de naissance|geburtsdatum|fecha de nacimiento|data de nascimento|geboortedatum)\b/i;

/**
 * Detect language of the page from html lang attribute or label samples.
 */
export function detectPageLanguage(htmlLang?: string, sampleLabels: string[] = []): SupportedLanguage | "unknown" | "en" {
  if (htmlLang) {
    const code = htmlLang.toLowerCase().split("-")[0]?.trim();
    if (code === "de") return "de";
    if (code === "fr") return "fr";
    if (code === "es") return "es";
    if (code === "nl") return "nl";
    if (code === "pt") return "pt";
    if (code === "en") return "en";
    if (code && !["de", "fr", "es", "nl", "pt", "en"].includes(code)) return "unknown";
  }

  // Fallback: check vocabulary signatures in labels
  const text = sampleLabels.join(" ").toLowerCase();
  for (const [lang, patterns] of Object.entries(LANG_SIGNATURES) as Array<[SupportedLanguage, RegExp[]]>) {
    if (patterns.some((p) => p.test(text))) return lang;
  }

  return "en";
}

/**
 * Translates a single label cleanly if an exact reviewed match is found.
 * Never performs fuzzy guessing.
 */
export function translateLabel(label: string, lang: SupportedLanguage): string {
  const norm = cleanLabel(label).toLowerCase().replace(/[:*]/g, "").trim();
  const dict = DICTIONARIES[lang];
  if (!dict) return label;

  if (dict[norm]) return dict[norm]!;

  // Strip trailing required/optional markers
  const stripped = norm.replace(/\s*\((?:pflichtfeld|erforderlich|optionale angabe|obligatoire|facultatif|obligatorio|opcional|verplicht)\)$/i, "").trim();
  if (dict[stripped]) return dict[stripped]!;

  return label;
}

/**
 * Translates an option list (e.g. ["Ja", "Nein"] -> ["Yes", "No"]).
 */
export function translateOptions(options: string[], lang: SupportedLanguage): string[] {
  const dict = DICTIONARIES[lang];
  if (!dict) return options;
  return options.map((opt) => {
    const norm = cleanLabel(opt).toLowerCase().trim();
    return dict[norm] ?? opt;
  });
}

/**
 * Inspects a field and translates its label and options if applicable.
 */
export function inspectAndTranslateField(
  rawLabel: string,
  rawOptions: string[],
  detectedLang: SupportedLanguage | "unknown" | "en"
): TranslationResult {
  const norm = cleanLabel(rawLabel).toLowerCase();

  // Safety Trap 1: Consent checkboxes
  if (TRAP_CONSENT.test(norm)) {
    return {
      label: rawLabel,
      originalLabel: rawLabel,
      detectedLang,
      isConsent: true,
    };
  }

  // Safety Trap 2: Certificate/Zeugnis is NOT a resume
  if (TRAP_ZEUGNIS.test(norm)) {
    return {
      label: "Work certificates (Zeugnisse)",
      originalLabel: rawLabel,
      detectedLang,
      documentType: "certificate",
    };
  }

  // Safety Trap 3: Birthday is not start date
  if (TRAP_BIRTHDAY.test(norm)) {
    return {
      label: "Date of birth",
      originalLabel: rawLabel,
      detectedLang,
    };
  }

  // Frequency distinction for salaries
  const isMonthly = /\b(monat\w*|mensuel\w*|mensual\w*|maand\w*|mês|mes)\b/i.test(norm);
  const isAnnual = /\b(jahr\w*|an\w*|año\w*|ano\w*|jaar\w*|annuel\w*|anual\w*)\b/i.test(norm);

  if (detectedLang === "unknown" || detectedLang === "en") {
    return {
      label: rawLabel,
      originalLabel: rawLabel,
      detectedLang,
      frequency: isMonthly ? "monthly" : isAnnual ? "annual" : undefined,
    };
  }

  const translated = translateLabel(rawLabel, detectedLang);
  return {
    label: translated,
    originalLabel: rawLabel,
    detectedLang,
    frequency: isMonthly ? "monthly" : isAnnual ? "annual" : undefined,
  };
}

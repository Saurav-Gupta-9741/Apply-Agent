/** Checks for every Profile field. ApplyAgent cannot confirm that an address exists without sending it to a map
 * service (personal data never leaves the browser), so it catches what can be caught on the device: values that
 * cannot be right (a country that does not exist, a state that is not in that country, a PIN code in the wrong
 * format or for another state, a degree typed as a website) and likely typos ("gmial.com", "Banglore").
 * "error" blocks saving; "warn" is shown and the user decides. */

import { citySuggestion } from "./city-check";
import { countriesInLocation } from "./countries";
import { countriesOfCity, statesOfCity } from "./places";

export type IssueLevel = "error" | "warn";
export interface FieldIssue {
  key: string;
  level: IssueLevel;
  text: string;
}

// --- Countries --------------------------------------------------------------------------------------------

/** ISO 3166-1 alpha-2 codes of every country and territory. Names come from the browser (Intl.DisplayNames). */
const ISO2 = (
  "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ " +
  "CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR " +
  "GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO " +
  "JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR " +
  "MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO " +
  "RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV " +
  "TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW"
).split(" ");

/** Names forms use for a few countries, where the browser's own name differs. */
const PREFERRED_NAME: Record<string, string> = {
  US: "United States", GB: "United Kingdom", KR: "South Korea", KP: "North Korea", RU: "Russia", CZ: "Czechia",
  TR: "Turkey", VN: "Vietnam", IR: "Iran", SY: "Syria", LA: "Laos", BO: "Bolivia", VE: "Venezuela", TZ: "Tanzania",
  MD: "Moldova", PS: "Palestine", FM: "Micronesia", HK: "Hong Kong", MO: "Macao", CI: "Côte d'Ivoire",
};

/** Other ways people write a country. */
const ALIASES: Record<string, string> = {
  usa: "US", "u.s.": "US", "u.s.a.": "US", us: "US", america: "US", "united states of america": "US",
  uk: "GB", "u.k.": "GB", "great britain": "GB", britain: "GB", england: "GB", scotland: "GB", wales: "GB", "northern ireland": "GB",
  uae: "AE", emirates: "AE", bharat: "IN", hindustan: "IN", holland: "NL", "the netherlands": "NL", deutschland: "DE",
  "czech republic": "CZ", "republic of korea": "KR", korea: "KR", "south korea": "KR", "north korea": "KP", russia: "RU",
  "russian federation": "RU", turkey: "TR", türkiye: "TR", turkiye: "TR", vietnam: "VN", "viet nam": "VN", ksa: "SA",
  "ivory coast": "CI", burma: "MM", swaziland: "SZ", macedonia: "MK", "east timor": "TL", "cape verde": "CV",
  "republic of ireland": "IE", eire: "IE", prc: "CN", "people's republic of china": "CN", taiwan: "TW",
};

let names: Map<string, string> | undefined;
/** Country names by ISO code, in English. */
function countryNames(): Map<string, string> {
  if (names) return names;
  names = new Map();
  let display: Intl.DisplayNames | undefined;
  try {
    display = new Intl.DisplayNames(["en"], { type: "region" });
  } catch {
    display = undefined;
  }
  for (const code of ISO2) {
    const name = PREFERRED_NAME[code] ?? display?.of(code) ?? code;
    names.set(code, name);
  }
  return names;
}

/** Every country name, A to Z (for the Country list). */
export function allCountryNames(): string[] {
  return [...countryNames().values()].sort((a, b) => a.localeCompare(b));
}

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/** The ISO code of a country written as a name, code or common alias ("India", "IN", "USA", "UK"); undefined
 * when it is not a country. */
export function countryCode(value: string): string | undefined {
  const v = value.trim();
  if (!v) return undefined;
  if (/^[A-Za-z]{2}$/.test(v) && countryNames().has(v.toUpperCase()) && v === v.toUpperCase()) return v.toUpperCase();
  const f = fold(v);
  if (ALIASES[f]) return ALIASES[f];
  for (const [code, name] of countryNames()) if (fold(name) === f) return code;
  return undefined;
}

/** The country as forms get it ("usa" → "United States"); the value itself when it is not a country. */
export function canonicalCountry(value: string): string {
  const code = countryCode(value);
  return code ? countryNames().get(code)! : value.trim();
}

// --- States -----------------------------------------------------------------------------------------------

const STATES: Record<string, { names: string[]; codes?: Record<string, string>; aliases?: Record<string, string> }> = {
  IN: {
    names: ["Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana",
      "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
      "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
      "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
      "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"],
    codes: { AP: "Andhra Pradesh", AR: "Arunachal Pradesh", AS: "Assam", BR: "Bihar", CG: "Chhattisgarh", CT: "Chhattisgarh",
      GA: "Goa", GJ: "Gujarat", HR: "Haryana", HP: "Himachal Pradesh", JH: "Jharkhand", KA: "Karnataka", KL: "Kerala",
      MP: "Madhya Pradesh", MH: "Maharashtra", MN: "Manipur", ML: "Meghalaya", MZ: "Mizoram", NL: "Nagaland", OD: "Odisha",
      OR: "Odisha", PB: "Punjab", RJ: "Rajasthan", SK: "Sikkim", TN: "Tamil Nadu", TG: "Telangana", TS: "Telangana",
      TR: "Tripura", UP: "Uttar Pradesh", UK: "Uttarakhand", UT: "Uttarakhand", WB: "West Bengal", AN: "Andaman and Nicobar Islands",
      CH: "Chandigarh", DN: "Dadra and Nagar Haveli and Daman and Diu", DD: "Dadra and Nagar Haveli and Daman and Diu",
      DL: "Delhi", JK: "Jammu and Kashmir", LA: "Ladakh", LD: "Lakshadweep", PY: "Puducherry" },
    aliases: { orissa: "Odisha", uttaranchal: "Uttarakhand", pondicherry: "Puducherry", "new delhi": "Delhi",
      "nct of delhi": "Delhi", "delhi ncr": "Delhi", "national capital territory of delhi": "Delhi", "j&k": "Jammu and Kashmir",
      "jammu & kashmir": "Jammu and Kashmir", "andaman & nicobar": "Andaman and Nicobar Islands", "andaman and nicobar": "Andaman and Nicobar Islands" },
  },
  US: {
    names: ["Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "District of Columbia",
      "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine",
      "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
      "New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
      "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia",
      "Washington", "West Virginia", "Wisconsin", "Wyoming", "Puerto Rico", "Guam", "U.S. Virgin Islands", "American Samoa",
      "Northern Mariana Islands"],
    codes: { AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado", CT: "Connecticut",
      DE: "Delaware", DC: "District of Columbia", FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois",
      IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts",
      MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada",
      NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota",
      OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota",
      TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia",
      WI: "Wisconsin", WY: "Wyoming", PR: "Puerto Rico", GU: "Guam", VI: "U.S. Virgin Islands", AS: "American Samoa", MP: "Northern Mariana Islands" },
    aliases: { "washington dc": "District of Columbia", "washington d.c.": "District of Columbia", "d.c.": "District of Columbia" },
  },
  CA: {
    names: ["Alberta", "British Columbia", "Manitoba", "New Brunswick", "Newfoundland and Labrador", "Nova Scotia", "Ontario",
      "Prince Edward Island", "Quebec", "Saskatchewan", "Northwest Territories", "Nunavut", "Yukon"],
    codes: { AB: "Alberta", BC: "British Columbia", MB: "Manitoba", NB: "New Brunswick", NL: "Newfoundland and Labrador",
      NS: "Nova Scotia", ON: "Ontario", PE: "Prince Edward Island", QC: "Quebec", SK: "Saskatchewan", NT: "Northwest Territories",
      NU: "Nunavut", YT: "Yukon" },
    aliases: { québec: "Quebec" },
  },
  AU: {
    names: ["Australian Capital Territory", "New South Wales", "Northern Territory", "Queensland", "South Australia", "Tasmania",
      "Victoria", "Western Australia"],
    codes: { ACT: "Australian Capital Territory", NSW: "New South Wales", NT: "Northern Territory", QLD: "Queensland",
      SA: "South Australia", TAS: "Tasmania", VIC: "Victoria", WA: "Western Australia" },
  },
  GB: { names: ["England", "Scotland", "Wales", "Northern Ireland"] },
};

/** The states / provinces of a country, when ApplyAgent knows them (India, US, Canada, Australia, UK). */
export function statesFor(country: string): string[] {
  const code = countryCode(country);
  return code && STATES[code] ? STATES[code].names : [];
}

/** A state written as a name, code or alias ("KA", "orissa") as its full name; undefined when it is not one of the
 * country's states. */
export function canonicalState(country: string, value: string): string | undefined {
  const code = countryCode(country);
  const table = code ? STATES[code] : undefined;
  const v = value.trim();
  if (!table || !v) return undefined;
  const upper = v.replace(/\./g, "").toUpperCase();
  if (table.codes?.[upper]) return table.codes[upper];
  const f = fold(v);
  if (table.aliases?.[f]) return table.aliases[f];
  return table.names.find((n) => fold(n) === f);
}

// --- Postal codes -----------------------------------------------------------------------------------------

const POSTAL: Record<string, { re: RegExp; example: string }> = {
  IN: { re: /^[1-9]\d{2} ?\d{3}$/, example: "560001" },
  US: { re: /^\d{5}(-\d{4})?$/, example: "94105 or 94105-1234" },
  CA: { re: /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z] ?\d[ABCEGHJ-NPRSTV-Z]\d$/i, example: "M5V 2T6" },
  GB: { re: /^(GIR ?0AA|[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2})$/i, example: "SW1A 1AA" },
  IE: { re: /^[A-Z]\d[\dW] ?[A-Z\d]{4}$/i, example: "D02 X285" },
  DE: { re: /^\d{5}$/, example: "10115" }, FR: { re: /^\d{5}$/, example: "75001" }, ES: { re: /^\d{5}$/, example: "28001" },
  IT: { re: /^\d{5}$/, example: "00118" }, FI: { re: /^\d{5}$/, example: "00100" }, MX: { re: /^\d{5}$/, example: "06600" },
  MY: { re: /^\d{5}$/, example: "50450" }, TH: { re: /^\d{5}$/, example: "10110" }, SA: { re: /^\d{5}(-\d{4})?$/, example: "11564" },
  NL: { re: /^\d{4} ?[A-Z]{2}$/i, example: "1012 AB" }, AU: { re: /^\d{4}$/, example: "2000" }, NZ: { re: /^\d{4}$/, example: "1010" },
  AT: { re: /^\d{4}$/, example: "1010" }, BE: { re: /^\d{4}$/, example: "1000" }, CH: { re: /^\d{4}$/, example: "8001" },
  DK: { re: /^\d{4}$/, example: "1050" }, NO: { re: /^\d{4}$/, example: "0150" }, PH: { re: /^\d{4}$/, example: "1000" },
  ZA: { re: /^\d{4}$/, example: "2000" }, HU: { re: /^\d{4}$/, example: "1051" }, BD: { re: /^\d{4}$/, example: "1000" },
  SE: { re: /^\d{3} ?\d{2}$/, example: "111 22" }, CZ: { re: /^\d{3} ?\d{2}$/, example: "110 00" }, SK: { re: /^\d{3} ?\d{2}$/, example: "811 01" },
  GR: { re: /^\d{3} ?\d{2}$/, example: "105 57" }, PL: { re: /^\d{2}-\d{3}$/, example: "00-001" }, PT: { re: /^\d{4}-\d{3}$/, example: "1000-001" },
  BR: { re: /^\d{5}-?\d{3}$/, example: "01310-100" }, JP: { re: /^\d{3}-?\d{4}$/, example: "100-0001" },
  SG: { re: /^\d{6}$/, example: "018989" }, CN: { re: /^\d{6}$/, example: "100000" }, RU: { re: /^\d{6}$/, example: "101000" },
  PK: { re: /^\d{5}$/, example: "44000" }, LK: { re: /^\d{5}$/, example: "00100" }, NP: { re: /^\d{5}$/, example: "44600" },
  IL: { re: /^\d{7}$/, example: "6100000" }, KR: { re: /^\d{5}$/, example: "03187" }, TW: { re: /^\d{3}(\d{2,3})?$/, example: "100" },
};

/** India: the states a PIN code's first two digits belong to (postal circles). */
const PIN_STATES: Array<[RegExp, string[]]> = [
  [/^11/, ["Delhi"]], [/^1[23]/, ["Haryana", "Punjab"]], [/^1[45]/, ["Punjab", "Haryana"]],
  [/^16/, ["Punjab", "Chandigarh", "Haryana", "Himachal Pradesh"]], [/^17/, ["Himachal Pradesh"]],
  [/^1[89]/, ["Jammu and Kashmir", "Ladakh"]], [/^2[0-8]/, ["Uttar Pradesh", "Uttarakhand"]], [/^3[0-4]/, ["Rajasthan"]],
  [/^3[6-9]/, ["Gujarat", "Dadra and Nagar Haveli and Daman and Diu"]], [/^4[0-4]/, ["Maharashtra", "Goa"]],
  [/^4[5-8]/, ["Madhya Pradesh", "Chhattisgarh"]], [/^49/, ["Chhattisgarh", "Madhya Pradesh"]],
  [/^5[0-3]/, ["Telangana", "Andhra Pradesh"]], [/^5[6-9]/, ["Karnataka"]], [/^6[0-4]/, ["Tamil Nadu", "Puducherry"]],
  [/^6[7-9]/, ["Kerala", "Lakshadweep", "Puducherry"]], [/^7[0-4]/, ["West Bengal", "Sikkim", "Andaman and Nicobar Islands"]],
  [/^7[5-7]/, ["Odisha"]], [/^78/, ["Assam"]],
  [/^79/, ["Arunachal Pradesh", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Tripura", "Assam"]],
  [/^8[0-5]/, ["Bihar", "Jharkhand"]],
];

// --- Helpers ----------------------------------------------------------------------------------------------

const EMAIL = /^[A-Za-z0-9](?:[A-Za-z0-9._%+-]{0,62}[A-Za-z0-9_+-])?@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,24}$/;
const EMAIL_DOMAINS = ["gmail.com", "yahoo.com", "yahoo.co.in", "hotmail.com", "outlook.com", "live.com", "icloud.com",
  "rediffmail.com", "protonmail.com", "proton.me", "aol.com", "zoho.com", "msn.com", "ymail.com"];
const TLD_TYPOS: Record<string, string> = { con: "com", cmo: "com", cpm: "com", vom: "com", comm: "com", om: "com", ocm: "com", nte: "net", ogr: "org", inn: "in" };

function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]!;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cur = row[j]!;
      row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
  }
  return row[b.length]!;
}

/** "name@gmial.com" → "name@gmail.com"; undefined when the address looks right. */
export function emailSuggestion(email: string): string | undefined {
  const at = email.lastIndexOf("@");
  if (at < 1) return undefined;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1).toLowerCase();
  if (EMAIL_DOMAINS.includes(domain)) return undefined;
  const best = EMAIL_DOMAINS.map((d) => [d, distance(domain, d)] as const).sort((a, b) => a[1] - b[1])[0]!;
  if (best[1] <= 2 && domain.length >= 5) return `${local}@${best[0]}`;
  const tld = domain.split(".").pop()!;
  if (TLD_TYPOS[tld]) return `${local}@${domain.slice(0, -tld.length)}${TLD_TYPOS[tld]}`;
  return undefined;
}

/** Degree names that look like web addresses ("M.Tech", "B.Sc", "Ph.D"): never a link. */
export const DEGREE_LIKE = /^(?:b|m|ph|b\.?s|m\.?s|b\.?a|m\.?a|b\.?e|m\.?e|b\.?b|m\.?b|b\.?c|m\.?c|p\.?g|d|ll)\.(?:tech|sc|com|e|a|s|d|phil|ed|arch|pharm|des|ba|ca|voc|lib|fa|st|eng|b|m)\.?$/i;

/** Whether a value is a degree written with dots rather than a website ("M.TECH", "https://M.Tech", "B.Sc."). */
export function looksLikeDegree(value: string): boolean {
  const host = value.trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/+$/, "");
  return DEGREE_LIKE.test(host);
}

/** Countries that are also their own city. */
const CITY_STATES = new Set(["SG", "HK", "MO", "MC", "VA", "GI", "LU", "KW", "DJ", "BH", "SM", "QA"]);

const NAME = /^[\p{L}\p{M}][\p{L}\p{M}' .-]*$/u;
const HAS_URL_OR_EMAIL = /https?:\/\/|www\.|@/i;

/** Phone digits after any country code, and checks by country. */
function phoneIssue(phone: string, countryIso: string | undefined): FieldIssue | undefined {
  const v = phone.trim();
  if (!/^\+?[\d\s().-]+$/.test(v)) return { key: "phone", level: "error", text: "A phone number has only digits, spaces, ( ) - and an optional + at the start." };
  const digits = v.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return { key: "phone", level: "error", text: "That phone number is too short or too long. Include your country code, e.g. +91 98765 43210." };
  const plus = v.startsWith("+");
  const india = (local: string): FieldIssue | undefined => {
    if (local.length !== 10) return { key: "phone", level: "error", text: "An Indian mobile number has 10 digits after +91." };
    if (!/^[6-9]/.test(local)) return { key: "phone", level: "warn", text: "Indian mobile numbers start with 6, 7, 8 or 9. Check the number." };
    return undefined;
  };
  const nanp = (local: string): FieldIssue | undefined =>
    local.length === 10 ? undefined : { key: "phone", level: "error", text: "A US / Canada number has 10 digits after +1." };
  if (plus) {
    if (digits.startsWith("91")) return india(digits.slice(2));
    if (digits.startsWith("1")) return nanp(digits.slice(1));
    if (countryIso === "IN") return { key: "phone", level: "warn", text: "Your country is India, but this number has another country code. Forms get it as typed." };
    return undefined;
  }
  if (countryIso === "IN") {
    const issue = india(digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits.replace(/^0/, ""));
    if (issue) return issue;
  } else if (countryIso === "US" || countryIso === "CA") {
    const issue = nanp(digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits);
    if (issue) return issue;
  }
  return { key: "phone", level: "warn", text: "Add your country code (e.g. +91) so employers abroad can call you." };
}

const TIMEZONE_ABBR = new Set(["UTC", "GMT", "IST", "EST", "EDT", "CST", "CDT", "MST", "MDT", "PST", "PDT", "AKST", "AKDT", "HST",
  "CET", "CEST", "EET", "EEST", "WET", "WEST", "BST", "JST", "KST", "SGT", "HKT", "AEST", "AEDT", "ACST", "AWST", "NZST", "NZDT",
  "GST", "PKT", "NPT", "BDT", "ICT", "WIB", "PHT", "MSK", "SAST", "WAT", "EAT", "CAT", "BRT", "ART", "AST", "ADT", "NST"]);

let zones: Set<string> | undefined;
function knownZones(): Set<string> {
  if (!zones) {
    try {
      zones = new Set((Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.("timeZone") ?? []);
    } catch {
      zones = new Set();
    }
    for (const z of ["Asia/Kolkata", "Asia/Calcutta", "UTC", "Europe/London", "America/New_York", "America/Los_Angeles"]) zones.add(z);
  }
  return zones;
}

/** Time zones offered in the Timezone list. */
export function timezoneChoices(): string[] {
  return [...TIMEZONE_ABBR, ...knownZones()];
}

export function timezoneValid(value: string): boolean {
  const v = value.trim();
  if (!v) return true;
  if (TIMEZONE_ABBR.has(v.toUpperCase())) return true;
  if (/^(UTC|GMT)\s?[+-−]\s?(0?\d|1[0-4])(:?[0-5]\d)?$/i.test(v)) return true;
  return knownZones().has(v) || [...knownZones()].some((z) => z.toLowerCase() === v.toLowerCase());
}

/** Problems with a link field. Shared with the resume import, so an imported link is checked the same way. */
export function linkIssue(key: "linkedin" | "github" | "portfolio" | "resumeUrl", value: string): string | undefined {
  const v = value.trim();
  if (!v) return undefined;
  // LinkedIn and GitHub have one shape each, and their message shows it; the general checks are for the other links.
  if (key !== "linkedin" && key !== "github" && /\s/.test(v)) return "A link has no spaces.";
  if (key !== "linkedin" && key !== "github" && looksLikeDegree(v)) return `"${v.replace(/^https?:\/\//i, "")}" looks like a degree, not a website.`;
  const bare = v.replace(/^https?:\/\//i, "");
  if (/^[^/]*@/.test(bare)) return "That is an email address, not a link.";
  const host = bare.split(/[/?#]/)[0]!.toLowerCase().replace(/^www\./, "");
  const validHost = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/.test(host);
  switch (key) {
    case "linkedin":
      return /^(https?:\/\/)?([a-z]{2,3}\.)?linkedin\.com\/(in|pub)\/[^\s/?#]+\/?([?#]\S*)?$/i.test(v)
        ? undefined : "That isn't a LinkedIn profile link. It looks like linkedin.com/in/your-name.";
    case "github":
      return /^(https?:\/\/)?(www\.)?github\.com\/[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})\/?$/i.test(v)
        ? undefined : "That isn't a GitHub profile link. It looks like github.com/your-username.";
    case "portfolio":
      if (!validHost) return "That isn't a web address. It looks like yourname.dev or https://yourname.com.";
      if (/(^|\.)linkedin\.com$/.test(host)) return "That is your LinkedIn link: put it in LinkedIn URL. Portfolio is your own site.";
      if (/^github\.com$/.test(host) && /^github\.com\/[^/]+\/?$/i.test(bare.replace(/^www\./i, ""))) return "That is your GitHub profile: put it in GitHub URL. A GitHub Pages site (you.github.io) is fine here.";
      return undefined;
    case "resumeUrl":
      if (!validHost) return "That isn't a link to your resume. Paste the share link, e.g. https://drive.google.com/…";
      return undefined;
  }
}

const RESUME_HOSTS = /(^|\.)(drive\.google\.com|docs\.google\.com|dropbox\.com|onedrive\.live\.com|1drv\.ms|sharepoint\.com|box\.com|icloud\.com|notion\.site|notion\.so|github\.io|github\.com|canva\.com|wetransfer\.com)$/;

export interface ProfileValues {
  [key: string]: string | undefined;
}

/** Every problem with the Profile form's values. `today` sets the year for graduation checks. */
export function validateProfile(values: ProfileValues, today = new Date()): FieldIssue[] {
  const issues: FieldIssue[] = [];
  const add = (key: string, level: IssueLevel, text: string) => issues.push({ key, level, text });
  const val = (k: string) => (values[k] ?? "").trim();

  for (const key of ["firstName", "lastName"]) {
    const v = val(key);
    if (!v) continue;
    if (!NAME.test(v)) add(key, "error", "A name has only letters, spaces and ' - . (no digits or symbols).");
    else if (v.length > 50) add(key, "error", "That name is too long (50 letters at most).");
    else if (v.length === 1) add(key, "warn", "Forms usually need your full name, not an initial.");
  }

  const email = val("email");
  if (email) {
    if (!EMAIL.test(email)) add("email", "error", "That isn't an email address. It looks like name@example.com.");
    else {
      const better = emailSuggestion(email);
      if (better) add("email", "warn", `Did you mean ${better}?`);
    }
  }

  const countryRaw = val("country");
  const iso = countryRaw ? countryCode(countryRaw) : undefined;
  if (countryRaw && !iso) add("country", "error", `"${countryRaw}" isn't a country. Choose one from the list.`);

  const phone = val("phone");
  if (phone) {
    const issue = phoneIssue(phone, iso);
    if (issue) issues.push(issue);
  }

  const city = val("location");
  if (city) {
    if (/\d/.test(city) || HAS_URL_OR_EMAIL.test(city)) add("location", "error", "A city has no digits, links or emails. Put the street in Address line 1.");
    else if (countryCode(city) && !CITY_STATES.has(countryCode(city)!)) add("location", "warn", "That is a country. City is the town or city you live in.");
    else {
      const better = citySuggestion(city);
      if (better) add("location", "warn", `Did you mean ${better}? Forms get the city exactly as you type it.`);
      else if (iso) {
        const name = canonicalCountry(countryRaw);
        // The offline city lists first (India, US, Canada, Australia, UK), then the big job-market cities.
        const listed = countriesOfCity(city);
        const places = listed.length ? listed.map((c) => canonicalCountry(c)) : countriesInLocation(city);
        if (places.length && !places.includes(name)) add("location", "warn", `${city} is in ${places[0]}, but your country is ${name}. Check both.`);
        else {
          const stateName = canonicalState(countryRaw, val("state"));
          const where = stateName ? statesOfCity(iso, city) : [];
          if (stateName && where.length && !where.includes(stateName)) add("location", "warn", `${city} is in ${where[0]}, but your state is ${stateName}. Check both.`);
        }
      }
    }
  }

  for (const key of ["addressLine1", "addressLine2"]) {
    const v = val(key);
    if (!v) continue;
    if (HAS_URL_OR_EMAIL.test(v)) add(key, "error", "An address has no links or emails.");
    else if (v.length > 120) add(key, "error", "That address line is too long (120 characters at most).");
    else if (key === "addressLine1" && !/[\p{L}]/u.test(v)) add(key, "warn", "An address usually has a street or area name, not only numbers.");
  }

  const state = val("state");
  if (state) {
    if (/\d/.test(state) || HAS_URL_OR_EMAIL.test(state)) add("state", "error", "A state has no digits, links or emails.");
    else if (iso && STATES[iso] && !canonicalState(countryRaw, state))
      add("state", "error", `"${state}" isn't a state of ${canonicalCountry(countryRaw)}. Choose one from the list.`);
  }

  const postal = val("postalCode");
  if (postal) {
    const rule = iso ? POSTAL[iso] : undefined;
    if (!/^[A-Za-z0-9][A-Za-z0-9 -]{1,9}$/.test(postal)) add("postalCode", "error", "A postal code has only letters, digits, spaces and -.");
    else if (rule && !rule.re.test(postal)) add("postalCode", "error", `That isn't a ${canonicalCountry(countryRaw)} postal code. It looks like ${rule.example}.`);
    else if (iso === "IN" && state) {
      const st = canonicalState(countryRaw, state);
      const circle = PIN_STATES.find(([re]) => re.test(postal));
      if (st && circle && !circle[1].includes(st)) add("postalCode", "warn", `PIN codes starting ${postal.slice(0, 2)} are in ${circle[1][0]}, but your state is ${st}. Check both.`);
    }
  }

  const tz = val("timezone");
  if (tz && !timezoneValid(tz)) add("timezone", "error", "That isn't a time zone. Choose one from the list, e.g. IST, UTC or Asia/Kolkata.");

  for (const key of ["linkedin", "github", "portfolio", "resumeUrl"] as const) {
    const v = val(key);
    if (!v) continue;
    const problem = linkIssue(key, v);
    if (problem) add(key, "error", problem);
    else if (key === "resumeUrl") {
      const host = v.replace(/^https?:\/\//i, "").split(/[/?#]/)[0]!.toLowerCase().replace(/^www\./, "");
      if (!RESUME_HOSTS.test(host)) add(key, "warn", "Most forms expect a Google Drive, Dropbox or OneDrive share link. Make sure anyone with the link can open it.");
    }
  }

  for (const key of ["currentTitle", "currentCompany", "school", "degree", "educationLevel", "discipline"]) {
    const v = val(key);
    if (!v) continue;
    if (HAS_URL_OR_EMAIL.test(v)) add(key, "error", "This has no links or emails.");
    else if (v.length > 120) add(key, "error", "That is too long (120 characters at most).");
  }

  const exp = val("experienceYears");
  let expYears: number | undefined;
  if (exp) {
    if (!/^\d{1,2}(\.\d)?$/.test(exp) || Number(exp) > 60) add("experienceYears", "error", "Enter your years as a number: 0 if you are a fresher, or e.g. 2 or 2.5.");
    else expYears = Number(exp);
  }

  const grad = val("graduationYear");
  const year = today.getFullYear();
  if (grad) {
    if (!/^(19[5-9]\d|20[0-4]\d)$/.test(grad)) add("graduationYear", "error", "Enter a 4-digit year, e.g. 2026 (your expected year if you are still studying).");
    else {
      const g = Number(grad);
      const status = val("educationStatus");
      if (status === "pursuing" && g < year) add("graduationYear", "warn", `You are still studying, but ${grad} is in the past. Use the year you expect to finish.`);
      if (status === "completed" && g > year) add("graduationYear", "warn", `You have completed your studies, but ${grad} is in the future. Check the year.`);
      if (g > year + 7) add("graduationYear", "warn", `${grad} is more than 7 years away. Check the year.`);
      if (expYears !== undefined && expYears >= 3 && expYears > year - g + 3)
        add("experienceYears", "warn", `${expYears} years of experience but graduating in ${grad}. Check both (internships count only if forms ask for them).`);
    }
  }

  for (const key of ["targetRoles", "preferredLocations", "skills"]) {
    const v = val(key);
    if (v && v.length > 600) add(key, "error", "That list is too long (600 characters at most).");
    else if (v && HAS_URL_OR_EMAIL.test(v)) add(key, "error", "This list has no links or emails.");
  }

  return issues;
}

/** Values as forms get them: the country's and state's full names, a PIN code without spaces, links with https. */
export function normalizeProfileValue(key: string, value: string, values: ProfileValues): string {
  const v = value.trim();
  if (!v) return v;
  if (key === "country") return canonicalCountry(v);
  if (key === "state") return canonicalState(values.country ?? "", v) ?? v;
  if (key === "postalCode") {
    const iso = countryCode(values.country ?? "");
    if (iso === "IN") return v.replace(/\s/g, "");
    if (iso === "CA" || iso === "GB" || iso === "NL" || iso === "IE") return v.toUpperCase();
    return v;
  }
  if (key === "email") return v.toLowerCase();
  if (key === "linkedin" || key === "github" || key === "portfolio" || key === "resumeUrl") return /^https?:\/\//i.test(v) ? v : `https://${v}`;
  return v;
}

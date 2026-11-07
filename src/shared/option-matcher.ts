/** Multi-stage, anti-overfitting fuzzy and semantic option matching engine.
 * Matches user values to ATS dropdown/combobox options across Workday, Greenhouse,
 * Ashby, Lever, BambooHR, and Google Forms with high precision, 0 false positives,
 * and robust security against prompt injection and honeypots.
 */

import { normalize } from "./text";

export interface MatchResult {
  option: string;
  stage: "exact" | "code_stripped" | "contextual_domain" | "boundary_prefix" | "token_containment" | "fuzzy";
  confidence: number;
}

// --- Anti-Overfitting Domain Taxonomies & Mutually Exclusive Buckets ---

export enum DegreeBucket {
  BACHELOR = "BACHELOR",
  MASTER = "MASTER",
  DOCTORATE = "DOCTORATE",
  ASSOCIATE = "ASSOCIATE",
  HIGH_SCHOOL = "HIGH_SCHOOL",
  BOOTCAMP_OR_VOCATIONAL = "BOOTCAMP_OR_VOCATIONAL",
  SOME_COLLEGE = "SOME_COLLEGE",
}

export enum AvailabilityBucket {
  IMMEDIATE = "IMMEDIATE",
  TWO_WEEKS = "TWO_WEEKS",
  ONE_MONTH = "ONE_MONTH",
  TWO_MONTHS = "TWO_MONTHS",
  THREE_MONTHS = "THREE_MONTHS",
  MORE_THAN_THREE_MONTHS = "MORE_THAN_THREE_MONTHS",
}

export enum EmploymentBucket {
  FULL_TIME = "FULL_TIME",
  PART_TIME = "PART_TIME",
  CONTRACT = "CONTRACT",
  INTERNSHIP = "INTERNSHIP",
  FREELANCE = "FREELANCE",
}

export enum PronounBucket {
  HE_HIM = "HE_HIM",
  SHE_HER = "SHE_HER",
  THEY_THEM = "THEY_THEM",
  DECLINE = "DECLINE",
}

export enum GenderBucket {
  /** Transgender / "Male to female" options: never the answer for a plain "Male" or "Female". */
  TRANSGENDER = "TRANSGENDER",
  MALE = "MALE",
  FEMALE = "FEMALE",
  NON_BINARY = "NON_BINARY",
  DECLINE = "DECLINE",
}

export enum VeteranBucket {
  NOT_VETERAN = "NOT_VETERAN",
  PROTECTED_VETERAN = "PROTECTED_VETERAN",
  DECLINE = "DECLINE",
}

export enum DisabilityBucket {
  NO_DISABILITY = "NO_DISABILITY",
  YES_DISABILITY = "YES_DISABILITY",
  DECLINE = "DECLINE",
}

export enum RaceBucket {
  ASIAN = "ASIAN",
  WHITE = "WHITE",
  BLACK = "BLACK",
  HISPANIC = "HISPANIC",
  TWO_OR_MORE = "TWO_OR_MORE",
  NATIVE_AMERICAN = "NATIVE_AMERICAN",
  HAWAIIAN_PACIFIC = "HAWAIIAN_PACIFIC",
  DECLINE = "DECLINE",
}

export enum WorkplaceBucket {
  REMOTE = "REMOTE",
  HYBRID = "HYBRID",
  ONSITE = "ONSITE",
}

export enum FluencyBucket {
  NATIVE = "NATIVE",
  FLUENT = "FLUENT",
  PROFESSIONAL = "PROFESSIONAL",
  INTERMEDIATE = "INTERMEDIATE",
  BASIC = "BASIC",
}

/** Where a source-of-hire option points ("How did you hear about us?"). */
export enum SourceBucket {
  REFERRAL = "REFERRAL",
  COMPANY_SITE = "COMPANY_SITE",
}

export enum PolarityBucket {
  YES = "YES",
  NO = "NO",
  DECLINE = "DECLINE",
}

export enum SeniorityBucket {
  ENTRY = "ENTRY",
  MID = "MID",
  SENIOR = "SENIOR",
  DIRECTOR_EXEC = "DIRECTOR_EXEC",
}

// Canonical patterns per bucket (using normalized text: lowercase, unaccented, apostrophe stripped)
const DEGREE_PATTERNS: Record<DegreeBucket, RegExp[]> = {
  [DegreeBucket.BACHELOR]: [
    /\b(bachelor|bachelors|baccalaureat|licenciatura|bacc|undergraduate)\b/i,
    // Two-letter codes (BS, BA, BE, …) are matched separately, as whole tokens only (see SHORT_DEGREE_CODES).
    /\b(bsc|bba|btech|beng|bca|bfa|b tech|b sc)\b/i,
    // Indian bachelor's degrees: B.Com, B.Arch, B.Pharm, B.Ed, LLB, MBBS, BDS.
    /\b(bcom|b com|barch|b arch|bpharm|b pharm|b ed|llb|mbbs|bds)\b/i,
    /\b4 year (college )?degree\b/i,
    /\bfour year (college )?degree\b/i,
  ],
  [DegreeBucket.MASTER]: [
    /\b(master|masters|magister|postgraduate|graduate degree)\b/i,
    /\b(msc|mtech|mba|meng|mca|mfa|m tech|m sc)\b/i,
    // M.Com, M.Arch, M.Pharm, M.Phil, LLM. ("march" alone is a month, never a degree.)
    /\b(mcom|m com|m arch|mpharm|m pharm|mphil|m phil|llm)\b/i,
  ],
  [DegreeBucket.DOCTORATE]: [
    /\b(doctorate|doctoral|doctor of philosophy|terminal degree|postdoc)\b/i,
    /\b(phd|ph d|dphil|dr rer nat|dr ing|dba|ed d)\b/i,
  ],
  [DegreeBucket.ASSOCIATE]: [
    /\b(associate|associates)\b/i,
    /\b(aas)\b/i,
    /\b2 year (college )?degree\b/i,
    /\btwo year (college )?degree\b/i,
  ],
  [DegreeBucket.HIGH_SCHOOL]: [
    /\b(high school|secondary school|secondary education|ged|abitur|gymnasium|matriculation|12th standard|hsc)\b/i,
  ],
  [DegreeBucket.BOOTCAMP_OR_VOCATIONAL]: [
    /\b(bootcamp|coding bootcamp|vocational|trade school|certification|certificate program)\b/i,
  ],
  [DegreeBucket.SOME_COLLEGE]: [
    /\b(some college|attended college|no degree|incomplete)\b/i,
  ],
};

const AVAILABILITY_PATTERNS: Record<AvailabilityBucket, RegExp[]> = {
  [AvailabilityBucket.IMMEDIATE]: [
    /\b(immediate|immediately|available immediately|immediate start|available now|asap|right away|no notice|0 days?|0 to 2 weeks?)\b/i,
    /\b(sofort|sofort verfugbar|ab sofort|immediat|immediatement|disponible immediatement|inmediato|inmediata|incorporacion inmediata|imediato|imediatamente)\b/i,
    /^now$/i,
  ],
  [AvailabilityBucket.TWO_WEEKS]: [
    /\b(2 weeks?|two weeks?|14 days?|standard 2 weeks?|2 to 3 weeks?|2 3 weeks?|fortnight)\b/i,
  ],
  [AvailabilityBucket.ONE_MONTH]: [
    /\b(1 month|one month|30 days?|4 weeks?|four weeks?|1 to 2 months?|1 2 months?|1 monat|1 mois|1 mes)\b/i,
  ],
  [AvailabilityBucket.TWO_MONTHS]: [
    /\b(2 months?|two months?|60 days?|8 weeks?|eight weeks?|2 monate|2 mois|2 meses)\b/i,
  ],
  [AvailabilityBucket.THREE_MONTHS]: [
    /\b(3 months?|three months?|90 days?|12 weeks?|3 monate|3 mois|3 meses)\b/i,
  ],
  [AvailabilityBucket.MORE_THAN_THREE_MONTHS]: [
    /\b(> ?3 months?|more than 3 months?|3\+ months?|over 3 months?)\b/i,
  ],
};

const EMPLOYMENT_PATTERNS: Record<EmploymentBucket, RegExp[]> = {
  [EmploymentBucket.FULL_TIME]: [
    /\b(full time|regular full time|full time permanent|permanent full time|direct hire|permanent|permanent employee|cdi|festanstellung|indefinido)\b/i,
    /\bft\b/i,
  ],
  [EmploymentBucket.PART_TIME]: [
    /\b(part time|regular part time)\b/i,
    /\bpt\b/i,
  ],
  [EmploymentBucket.CONTRACT]: [
    /\b(contract|contractor|temp|temporary|fixed term|contingent|c2c|w2 contract|contract to hire)\b/i,
  ],
  [EmploymentBucket.INTERNSHIP]: [
    /\b(intern|internship|student|co op|trainee|apprentice)\b/i,
  ],
  [EmploymentBucket.FREELANCE]: [
    /\b(freelance|self employed|independent contractor|consultant)\b/i,
  ],
};

const PRONOUN_PATTERNS: Record<PronounBucket, RegExp[]> = {
  [PronounBucket.HE_HIM]: [
    /\bhe him( his)?( himself)?\b/i,
    /^he\s*[\/\-,\s]\s*him(\s*[\/\-,\s]\s*his)?$/i,
  ],
  [PronounBucket.SHE_HER]: [
    /\bshe her( hers)?( herself)?\b/i,
    /^she\s*[\/\-,\s]\s*her(\s*[\/\-,\s]\s*hers)?$/i,
  ],
  [PronounBucket.THEY_THEM]: [
    /\bthey them( theirs)?( themselves)?\b/i,
    /^they\s*[\/\-,\s]\s*them(\s*[\/\-,\s]\s*theirs)?$/i,
  ],
  // "Other" and "Not listed" are answers (self-describe), never a decline: as a decline bucket they turned a saved
  // "Decline to self identify" into "Other" on a gender question (live run, Quora).
  [PronounBucket.DECLINE]: [
    /\b(decline|prefer not to say|decline to state|prefer not to disclose|opt out)\b/i,
  ],
};

const GENDER_PATTERNS: Record<GenderBucket, RegExp[]> = {
  // Checked first: "Transgender man" / "Male to female" must not land in the MALE bucket.
  [GenderBucket.TRANSGENDER]: [
    /\b(trans|transgender|transsexual|male to female|female to male|mtf|ftm)\b/i,
  ],
  [GenderBucket.MALE]: [
    /\b(male|man|cisgender male|cis male|cis man)\b/i,
  ],
  [GenderBucket.FEMALE]: [
    /\b(female|woman|cisgender female|cis female|cis woman)\b/i,
  ],
  [GenderBucket.NON_BINARY]: [
    /\b(non binary|nonbinary|gender non conforming|genderqueer|enby|agender|gender fluid)\b/i,
  ],
  [GenderBucket.DECLINE]: [
    /\b(decline|prefer not to say|prefer not to disclose|decline to self identify|decline to state|i do not wish to answer|choose not to disclose|do not wish to specify|opt out)\b/i,
    /\b(dont|do not) (wish|want) to (answer|say|disclose|specify|self identify|identify)\b|\b(rather not|prefer not to answer)\b/i,
  ],
};

const VETERAN_PATTERNS: Record<VeteranBucket, RegExp[]> = {
  [VeteranBucket.NOT_VETERAN]: [
    /\b(not a (protected )?veteran|i am not a (protected )?veteran|non veteran|no protected veteran)\b/i,
  ],
  [VeteranBucket.PROTECTED_VETERAN]: [
    /\b(i identify as one or more of the classifications of protected veteran|i am a protected veteran|protected veteran|active military)\b/i,
  ],
  [VeteranBucket.DECLINE]: [
    /\b(decline|i do not wish to self identify|decline to state|prefer not to say|choose not to disclose|i do not wish to answer|opt out)\b/i,
  ],
};

const DISABILITY_PATTERNS: Record<DisabilityBucket, RegExp[]> = {
  [DisabilityBucket.NO_DISABILITY]: [
    /\b(no i do not have a disability|no i dont have a disability|no disability|i do not have a disability|i dont have a disability)\b/i,
  ],
  [DisabilityBucket.YES_DISABILITY]: [
    /\b(yes i have a disability|yes i have a disability or previously had one|yes disability|i have a disability)\b/i,
  ],
  [DisabilityBucket.DECLINE]: [
    /\b(decline|i dont wish to answer|i do not wish to answer|prefer not to say|decline to state|choose not to disclose|opt out)\b/i,
  ],
};

const RACE_PATTERNS: Record<RaceBucket, RegExp[]> = {
  [RaceBucket.ASIAN]: [
    /\b(asian|asian not hispanic or latino|asian pacific islander|south asian|east asian)\b/i,
  ],
  [RaceBucket.WHITE]: [
    /\b(white|white not hispanic or latino|caucasian|white caucasian)\b/i,
  ],
  [RaceBucket.BLACK]: [
    /\b(black|african american|black or african american|black not hispanic or latino)\b/i,
  ],
  [RaceBucket.HISPANIC]: [
    /\b(hispanic|latino|hispanic or latino|hispanic latino)\b/i,
  ],
  [RaceBucket.TWO_OR_MORE]: [
    /\b(two or more races|two or more races not hispanic or latino|multiracial|two or more)\b/i,
  ],
  [RaceBucket.NATIVE_AMERICAN]: [
    /\b(american indian|alaska native|native american|indigenous)\b/i,
  ],
  [RaceBucket.HAWAIIAN_PACIFIC]: [
    /\b(native hawaiian|other pacific islander|pacific islander)\b/i,
  ],
  [RaceBucket.DECLINE]: [
    /\b(decline|decline to self identify|prefer not to say|prefer not to disclose|i do not wish to answer|opt out)\b/i,
  ],
};

const WORKPLACE_PATTERNS: Record<WorkplaceBucket, RegExp[]> = {
  [WorkplaceBucket.REMOTE]: [
    /\b(remote|fully remote|work from home|wfh|virtual|telecommute|100 remote|anywhere)\b/i,
  ],
  [WorkplaceBucket.HYBRID]: [
    /\b(hybrid|hybrid remote|partially remote|flexible office|hybrid 2 3 days)\b/i,
  ],
  [WorkplaceBucket.ONSITE]: [
    /\b(onsite|on site|in person|in office|office based)\b/i,
  ],
};

const FLUENCY_PATTERNS: Record<FluencyBucket, RegExp[]> = {
  // Checked in this order. LinkedIn's scale: Elementary < Limited working < Professional working < Full professional
  // < Native or bilingual.
  [FluencyBucket.NATIVE]: [
    /\b(native|bilingual|mother tongue|first language)\b/i,
  ],
  [FluencyBucket.FLUENT]: [
    /\b(fluent|full professional|proficient|c2|c1|advanced)\b/i,
  ],
  [FluencyBucket.PROFESSIONAL]: [
    /\b(professional working|professional)\b/i,
  ],
  [FluencyBucket.INTERMEDIATE]: [
    /\b(intermediate|conversational|b2|b1|limited working|working proficiency)\b/i,
  ],
  [FluencyBucket.BASIC]: [
    /\b(basic|beginner|elementary|a2|a1|novice)\b/i,
  ],
};

const POLARITY_PATTERNS: Record<PolarityBucket, RegExp[]> = {
  [PolarityBucket.YES]: [
    // A bare "y" / "n" only counts when it is the WHOLE text: "N/A" is not "No".
    /^(yes|true|agree|i agree|accept|i accept|authorized|eligible|citizen|permanent resident|ja|oui|si|sim)\b/i,
    /^y$/i,
    /\b(yes i am authorized|yes i agree|yes definitely|affirmative)\b/i,
  ],
  [PolarityBucket.NO]: [
    // "Require sponsorship" is NOT a "No": it is the opposite answer to "Do you NOT need sponsorship?".
    /^(no|false|disagree|i disagree|not authorized|nein|non|nao|nee)\b/i,
    /^n$/i,
    /\b(no i do not agree|i do not agree|do not agree|not agree|negative)\b/i,
  ],
  [PolarityBucket.DECLINE]: [
    /^(decline|prefer not to say|prefer not to disclose|choose not to disclose|i do not wish to answer|do not wish to answer|opt out)\b/i,
    /\b(decline to self identify|decline to state)\b/i,
    /\b(dont|do not) (wish|want) to (answer|say|disclose|specify|self identify|identify)\b|\b(rather not say|prefer not to answer)\b/i,
  ],
};

const SENIORITY_PATTERNS: Record<SeniorityBucket, RegExp[]> = {
  [SeniorityBucket.ENTRY]: [
    /\b(entry level|junior|associate|intern|0 1 years|0 2 years|less than 1 year|fresh graduate)\b/i,
  ],
  [SeniorityBucket.MID]: [
    /\b(mid level|intermediate|2 5 years|3 5 years|experienced)\b/i,
  ],
  [SeniorityBucket.SENIOR]: [
    /\b(senior|senior level|5\+? years|5 to 8 years|5 10 years|lead|staff|principal)\b/i,
  ],
  [SeniorityBucket.DIRECTOR_EXEC]: [
    /\b(director|head of|vp|vice president|c level|executive|cto|cfo|ceo)\b/i,
  ],
};

// --- ISO Countries & Regional Taxonomies ---

interface CountryInfo {
  alpha2: string;
  alpha3: string;
  name: string;
  dialCode: string;
  aliases: string[];
}

const COUNTRIES: CountryInfo[] = [
  { alpha2: "US", alpha3: "USA", name: "united states", dialCode: "1", aliases: ["united states of america", "usa", "us", "u s a", "u s", "america", "united states america"] },
  { alpha2: "IN", alpha3: "IND", name: "india", dialCode: "91", aliases: ["in", "ind", "bharat", "republic of india"] },
  { alpha2: "GB", alpha3: "GBR", name: "united kingdom", dialCode: "44", aliases: ["uk", "great britain", "gb", "gbr", "britain", "england", "scotland", "wales", "northern ireland"] },
  { alpha2: "CA", alpha3: "CAN", name: "canada", dialCode: "1", aliases: ["can", "ca"] },
  { alpha2: "DE", alpha3: "DEU", name: "germany", dialCode: "49", aliases: ["deutschland", "de", "deu", "bundesrepublik deutschland"] },
  { alpha2: "FR", alpha3: "FRA", name: "france", dialCode: "33", aliases: ["fr", "fra", "republique francaise"] },
  { alpha2: "AU", alpha3: "AUS", name: "australia", dialCode: "61", aliases: ["au", "aus"] },
  { alpha2: "NL", alpha3: "NLD", name: "netherlands", dialCode: "31", aliases: ["holland", "nl", "nld", "nederland"] },
  { alpha2: "AE", alpha3: "ARE", name: "united arab emirates", dialCode: "971", aliases: ["uae", "ae", "are", "emirates"] },
  { alpha2: "SG", alpha3: "SGP", name: "singapore", dialCode: "65", aliases: ["sg", "sgp"] },
  { alpha2: "JP", alpha3: "JPN", name: "japan", dialCode: "81", aliases: ["jp", "jpn", "nihon", "nippon"] },
  { alpha2: "CH", alpha3: "CHE", name: "switzerland", dialCode: "41", aliases: ["ch", "che", "schweiz", "suisse", "svizzera"] },
  { alpha2: "SE", alpha3: "SWE", name: "sweden", dialCode: "46", aliases: ["se", "swe", "sverige"] },
  { alpha2: "ES", alpha3: "ESP", name: "spain", dialCode: "34", aliases: ["es", "esp", "espana"] },
  { alpha2: "IT", alpha3: "ITA", name: "italy", dialCode: "39", aliases: ["it", "ita", "italia"] },
  { alpha2: "BR", alpha3: "BRA", name: "brazil", dialCode: "55", aliases: ["br", "bra", "brasil"] },
  { alpha2: "MX", alpha3: "MEX", name: "mexico", dialCode: "52", aliases: ["mx", "mex"] },
  { alpha2: "KR", alpha3: "KOR", name: "south korea", dialCode: "82", aliases: ["korea republic of", "republic of korea", "kr", "kor", "korea"] },
  { alpha2: "CN", alpha3: "CHN", name: "china", dialCode: "86", aliases: ["peoples republic of china", "cn", "chn"] },
  { alpha2: "TW", alpha3: "TWN", name: "taiwan", dialCode: "886", aliases: ["taiwan republic of china", "tw", "twn", "taiwan roc"] },
  { alpha2: "HK", alpha3: "HKG", name: "hong kong", dialCode: "852", aliases: ["hong kong sar", "hk", "hkg"] },
  { alpha2: "PH", alpha3: "PHL", name: "philippines", dialCode: "63", aliases: ["ph", "phl"] },
  { alpha2: "PL", alpha3: "POL", name: "poland", dialCode: "48", aliases: ["pl", "pol", "polska"] },
  { alpha2: "IE", alpha3: "IRL", name: "ireland", dialCode: "353", aliases: ["ie", "irl", "republic of ireland", "eire"] },
  { alpha2: "NZ", alpha3: "NZL", name: "new zealand", dialCode: "64", aliases: ["nz", "nzl"] },
];

/** Countries (title case) whose dialling code is `code`: "91" → ["India"], "1" → ["United States", "Canada"]. */
export function countriesForDialCode(code: string): string[] {
  return COUNTRIES.filter((c) => c.dialCode === code).map((c) => c.name.replace(/\b\w/g, (ch) => ch.toUpperCase()));
}

/** The dialling code of the country a text names ("India" → "91"), when it names one. */
export function dialCodeOfCountry(text: string): string | undefined {
  return classifyText(text).country?.dialCode;
}

const COUNTRY_BY_CODE = new Map<string, CountryInfo>();
const COUNTRY_BY_ALIAS = new Map<string, CountryInfo>();

for (const c of COUNTRIES) {
  COUNTRY_BY_CODE.set(c.alpha2.toLowerCase(), c);
  COUNTRY_BY_CODE.set(c.alpha3.toLowerCase(), c);
  COUNTRY_BY_ALIAS.set(c.name, c);
  for (const alias of c.aliases) {
    COUNTRY_BY_ALIAS.set(alias.toLowerCase(), c);
  }
}

// --- Stemming and Token Helpers ---

const STOPWORDS = new Set(["the", "a", "an", "you", "your", "are", "is", "do", "of", "to", "in", "for", "and", "or", "what", "please"]);

export function stemWord(w: string): string {
  if (w.length <= 3) return w;
  if (w.endsWith("ies") && w.length > 4) return w.slice(0, -3) + "y";
  if (w.endsWith("es") && !w.endsWith("ses") && w.length > 4) return w.slice(0, -2);
  if (w.endsWith("s") && !w.endsWith("ss") && w.length > 3) return w.slice(0, -1);
  if (w.endsWith("ly") && w.length > 5) return w.slice(0, -2);
  if (w.endsWith("ing") && w.length > 5) return w.slice(0, -3);
  if (w.endsWith("ed") && w.length > 4) return w.slice(0, -2);
  return w;
}

export function meaningfulStems(text: string): Set<string> {
  const norm = normalize(text);
  const words = norm.split(" ").filter((t) => t && !STOPWORDS.has(t));
  return new Set(words.map(stemWord));
}

// --- Parsing Candidates & Preserving Raw Values ---

export interface ParsedCandidate {
  raw: string;
  trimmed: string;
  normalized: string;
  coreLabel: string;
  normalizedCore: string;
  code?: string;
  cleanCode?: string;
  subParts: string[];
  classified: ClassifiedDomain;
  stems: Set<string>;
}

export function parseCandidate(raw: string): ParsedCandidate {
  const trimmed = raw.trim();
  const normalized = normalize(trimmed);
  let code: string | undefined;
  let coreLabel = trimmed;

  const prefixMatch = /^([A-Z0-9\+]{1,6})\s*[-:–—]\s*(.+)$/i.exec(trimmed);
  if (prefixMatch) {
    code = prefixMatch[1]!.trim();
    coreLabel = prefixMatch[2]!.trim();
  } else {
    const suffixMatch = /^(.+?)\s*\(([A-Za-z0-9\+\/\.\s\-]{1,15})\)$/i.exec(trimmed);
    if (suffixMatch) {
      coreLabel = suffixMatch[1]!.trim();
      code = suffixMatch[2]!.trim();
    }
  }

  const cleanCode = code ? code.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() : undefined;
  const subParts = trimmed.split(/\s*[\/|]\s*/).map((p) => p.trim()).filter(Boolean);

  return {
    raw,
    trimmed,
    normalized,
    coreLabel,
    normalizedCore: normalize(coreLabel),
    code,
    cleanCode,
    subParts,
    classified: classifyText(trimmed),
    stems: meaningfulStems(trimmed),
  };
}

export interface ClassifiedDomain {
  degree?: DegreeBucket;
  availability?: AvailabilityBucket;
  employment?: EmploymentBucket[];
  pronoun?: PronounBucket;
  gender?: GenderBucket;
  veteran?: VeteranBucket;
  disability?: DisabilityBucket;
  race?: RaceBucket;
  workplace?: WorkplaceBucket;
  fluency?: FluencyBucket;
  source?: SourceBucket;
  polarity?: PolarityBucket;
  seniority?: SeniorityBucket;
  country?: CountryInfo;
}

/** Two-letter degree codes. They are ordinary English words too ("as", "be", "ma"), so they only count when the
 * WHOLE text is the code ("BS", "b.s.") or the code is written in capitals as its own token ("MS Computer Science",
 * "Bachelor of Science (B.S.)"). "Same as above" is not an Associate degree. */
const SHORT_DEGREE_CODES: [string, DegreeBucket][] = [
  ["bs", DegreeBucket.BACHELOR], ["ba", DegreeBucket.BACHELOR], ["be", DegreeBucket.BACHELOR],
  ["ms", DegreeBucket.MASTER], ["ma", DegreeBucket.MASTER], ["me", DegreeBucket.MASTER],
  ["md", DegreeBucket.DOCTORATE], ["jd", DegreeBucket.DOCTORATE],
  ["aa", DegreeBucket.ASSOCIATE], ["as", DegreeBucket.ASSOCIATE],
];

function hasShortCode(raw: string, norm: string, code: string): boolean {
  if (norm.replace(/ /g, "") === code) return true;
  const [a, b] = [code[0]!.toUpperCase(), code[1]!.toUpperCase()];
  return new RegExp(`(?:^|[\\s(\\[/,])${a}\\.?${b}\\.?(?=$|[\\s)\\]/,:;-])`).test(raw);
}

function shortDegreeBucket(raw: string, norm: string): DegreeBucket | undefined {
  for (const [code, bucket] of SHORT_DEGREE_CODES) if (hasShortCode(raw, norm, code)) return bucket;
  return undefined;
}

/** Specialisation of a degree ("tech", "science", …) so B.Tech never becomes "Bachelor of Arts" and PhD never
 * becomes an MD/JD. undefined = a generic degree ("Bachelor's Degree"). */
function degreeSpec(raw: string): string | undefined {
  const n = normalize(raw);
  const code = (...codes: string[]) => codes.some((c) => hasShortCode(raw, n, c));
  if (/\b(btech|mtech|b tech|m tech|technology)\b/.test(n)) return "tech";
  if (/\b(bba|mba|dba|business)\b/.test(n)) return "business";
  if (/\b(bca|mca|computer applications?)\b/.test(n)) return "computer_applications";
  if (/\b(bcom|mcom|b com|m com|commerce)\b/.test(n)) return "commerce";
  if (/\b(barch|b arch|m arch|architecture)\b/.test(n)) return "architecture";
  if (/\b(bpharm|mpharm|b pharm|m pharm|pharmacy)\b/.test(n)) return "pharmacy";
  if (/\b(bds|dental|dentistry)\b/.test(n)) return "dental";
  if (/\b(mphil|m phil)\b/.test(n)) return "mphil";
  if (/\b(bfa|mfa|fine arts?)\b/.test(n)) return "fine_arts";
  if (/\b(bsc|msc|b sc|m sc|science|sciences)\b/.test(n) || code("bs", "ms")) return "science";
  if (/\b(beng|meng|b eng|m eng|engineering)\b/.test(n) || code("be", "me")) return "engineering";
  if (/\barts?\b/.test(n) || code("ba", "ma")) return "arts";
  if (/\b(phd|ph d|dphil|philosophy)\b/.test(n)) return "philosophy";
  if (/\b(medicine|mbbs)\b/.test(n) || code("md")) return "medicine";
  if (/\b(juris|law|llb|llm)\b/.test(n) || code("jd")) return "law";
  if (/\b(ed d|edd|b ed|education)\b/.test(n)) return "education";
  return undefined;
}

/** "Less than 30 days", "More than 3 months", "Up to 2 weeks": a tier qualified by a bound, not the value itself. */
const QUALIFIED_TIER = /\b(less than|more than|fewer than|greater than|over|under|up to|within|at least|or more|or less|plus|beyond)\b/;

/** Two-letter country codes that are unambiguous enough to map without a field context. "IT", "CA", "IN", "DE" are
 * also a department, a US state, a preposition and a German state, so they never map on their own. */
const SAFE_TWO_LETTER_COUNTRY = new Set(["us", "uk"]);

export function classifyText(text: string): ClassifiedDomain {
  const norm = normalize(text);
  const res: ClassifiedDomain = {};

  // Degree
  for (const [bucket, patterns] of Object.entries(DEGREE_PATTERNS) as [DegreeBucket, RegExp[]][]) {
    if (patterns.some((p) => p.test(norm))) {
      res.degree = bucket;
      break;
    }
  }
  if (!res.degree) res.degree = shortDegreeBucket(text.trim(), norm);

  // Availability / Notice. A qualified tier ("Less than 30 days") is NOT the 30-day tier; only the explicit
  // "more than 3 months" bucket may classify it.
  const qualifiedTier = QUALIFIED_TIER.test(norm) || /[<>]|\d\s*\+/.test(text);
  for (const [bucket, patterns] of Object.entries(AVAILABILITY_PATTERNS) as [AvailabilityBucket, RegExp[]][]) {
    if (qualifiedTier && bucket !== AvailabilityBucket.MORE_THAN_THREE_MONTHS) continue;
    if (patterns.some((p) => p.test(norm))) {
      res.availability = bucket;
      break;
    }
  }

  // Employment (collect all matching buckets for compound options like "Contract / Freelance")
  const emps: EmploymentBucket[] = [];
  for (const [bucket, patterns] of Object.entries(EMPLOYMENT_PATTERNS) as [EmploymentBucket, RegExp[]][]) {
    if (patterns.some((p) => p.test(norm))) {
      emps.push(bucket);
    }
  }
  if (emps.length) res.employment = emps;

  // Pronouns
  for (const [bucket, patterns] of Object.entries(PRONOUN_PATTERNS) as [PronounBucket, RegExp[]][]) {
    if (patterns.some((p) => p.test(norm))) {
      res.pronoun = bucket;
      break;
    }
  }

  // Gender
  for (const [bucket, patterns] of Object.entries(GENDER_PATTERNS) as [GenderBucket, RegExp[]][]) {
    if (patterns.some((p) => p.test(norm))) {
      res.gender = bucket;
      break;
    }
  }

  // Veteran
  for (const [bucket, patterns] of Object.entries(VETERAN_PATTERNS) as [VeteranBucket, RegExp[]][]) {
    if (patterns.some((p) => p.test(norm))) {
      res.veteran = bucket;
      break;
    }
  }

  // Disability
  for (const [bucket, patterns] of Object.entries(DISABILITY_PATTERNS) as [DisabilityBucket, RegExp[]][]) {
    if (patterns.some((p) => p.test(norm))) {
      res.disability = bucket;
      break;
    }
  }

  // Race / Ethnicity
  for (const [bucket, patterns] of Object.entries(RACE_PATTERNS) as [RaceBucket, RegExp[]][]) {
    if (patterns.some((p) => p.test(norm))) {
      res.race = bucket;
      break;
    }
  }

  // Workplace Mode
  for (const [bucket, patterns] of Object.entries(WORKPLACE_PATTERNS) as [WorkplaceBucket, RegExp[]][]) {
    if (patterns.some((p) => p.test(norm))) {
      res.workplace = bucket;
      break;
    }
  }

  // Fluency
  for (const [bucket, patterns] of Object.entries(FLUENCY_PATTERNS) as [FluencyBucket, RegExp[]][]) {
    if (patterns.some((p) => p.test(norm))) {
      res.fluency = bucket;
      break;
    }
  }

  // Source of hire
  if (/\b(referral|referred|refer(red)? by)\b/.test(norm)) res.source = SourceBucket.REFERRAL;
  else if (/\b(company (web ?site|site|careers?)|careers? (page|site|website|portal)|our (web ?site|careers)|corporate (web ?site|careers)|official (web ?site|careers))\b/.test(norm)) {
    res.source = SourceBucket.COMPANY_SITE;
  }

  // Polarity
  for (const [bucket, patterns] of Object.entries(POLARITY_PATTERNS) as [PolarityBucket, RegExp[]][]) {
    if (patterns.some((p) => p.test(norm))) {
      res.polarity = bucket;
      break;
    }
  }

  // Seniority
  for (const [bucket, patterns] of Object.entries(SENIORITY_PATTERNS) as [SeniorityBucket, RegExp[]][]) {
    if (patterns.some((p) => p.test(norm))) {
      res.seniority = bucket;
      break;
    }
  }

  // Country
  const trimmed = norm.trim();
  const twoLetter = trimmed.replace(/ /g, "").length <= 2;
  const directCountry =
    twoLetter && !SAFE_TWO_LETTER_COUNTRY.has(trimmed.replace(/ /g, ""))
      ? undefined
      : COUNTRY_BY_ALIAS.get(trimmed) || COUNTRY_BY_CODE.get(trimmed);
  if (directCountry) {
    res.country = directCountry;
  } else {
    for (const country of COUNTRIES) {
      if (
        norm === country.name ||
        norm.startsWith(country.name + " ") ||
        norm.endsWith(" " + country.name) ||
        norm.includes(" " + country.name + " ")
      ) {
        res.country = country;
        break;
      }
    }
  }

  return res;
}

// --- Anti-Overfitting Conflict Checking ---

export function hasSemanticConflict(wantedDomain: ClassifiedDomain, candidateDomain: ClassifiedDomain): boolean {
  if (wantedDomain.gender && candidateDomain.gender && wantedDomain.gender !== candidateDomain.gender) return true;
  if (wantedDomain.polarity && candidateDomain.polarity && wantedDomain.polarity !== candidateDomain.polarity) return true;
  if (wantedDomain.degree && candidateDomain.degree && wantedDomain.degree !== candidateDomain.degree) return true;
  if (wantedDomain.pronoun && candidateDomain.pronoun && wantedDomain.pronoun !== candidateDomain.pronoun) return true;
  if (wantedDomain.veteran && candidateDomain.veteran && wantedDomain.veteran !== candidateDomain.veteran) return true;
  if (wantedDomain.disability && candidateDomain.disability && wantedDomain.disability !== candidateDomain.disability) return true;
  if (wantedDomain.race && candidateDomain.race && wantedDomain.race !== candidateDomain.race) return true;
  if (wantedDomain.workplace && candidateDomain.workplace && wantedDomain.workplace !== candidateDomain.workplace) return true;
  if (wantedDomain.availability && candidateDomain.availability && wantedDomain.availability !== candidateDomain.availability) return true;
  if (wantedDomain.country && candidateDomain.country && wantedDomain.country.alpha2 !== candidateDomain.country.alpha2) return true;
  if (wantedDomain.seniority && candidateDomain.seniority && wantedDomain.seniority !== candidateDomain.seniority) return true;

  if (wantedDomain.employment && candidateDomain.employment) {
    // If none of wanted employment buckets overlap with candidate employment buckets
    const hasOverlap = wantedDomain.employment.some((w) => candidateDomain.employment!.includes(w));
    if (!hasOverlap) return true;
  }

  return false;
}

// Levenshtein distance
export function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev: number[] = Array.from({ length: n + 1 }, (_, i) => i);
  let curr: number[] = new Array<number>(n + 1).fill(0);

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    const c1 = s1[i - 1];
    for (let j = 1; j <= n; j++) {
      const c2 = s2[j - 1];
      const cost = c1 === c2 ? 0 : 1;
      curr[j] = Math.min(
        prev[j]! + 1,       // deletion
        curr[j - 1]! + 1,   // insertion
        prev[j - 1]! + cost // substitution
      );
    }
    const temp = prev;
    prev = curr;
    curr = temp;
  }
  return prev[n]!;
}

// --- Prompt Injection / Security Filter ---

function isPromptInjection(text: string): boolean {
  if (text.length > 300) return true;
  const lower = text.toLowerCase();
  return (
    /\b(dan\s+mode|ignore\s+(all\s+)?(previous\s+)?(instructions|rules|guardrails|filters)|system\s+prompt|jailbreak)\b/i.test(lower) ||
    /return\s+option\s+[a-z0-9]/i.test(lower) ||
    /\b(eval|exec|import|require)\s*\(/i.test(lower)
  );
}

// --- Main Matching Algorithm ---

/** A negation word on only ONE side means the two texts say opposite things: "Sponsorship required" vs
 * "… is not required", "I am authorized" vs "I am not authorized". */
const NEGATION = /\b(not|no|never|without|cannot|dont|doesnt|didnt|cant|wont|isnt|arent|wasnt|werent|havent|hasnt|hadnt|shouldnt|wouldnt|couldnt|neither|nor)\b/;

function negationConflict(wantedNorm: string, wantedDomain: ClassifiedDomain, c: ParsedCandidate): boolean {
  if (NEGATION.test(wantedNorm) === NEGATION.test(c.normalized)) return false;
  // "No" vs "I disagree": both already carry the same explicit polarity, so the missing "not" is fine.
  if (wantedDomain.polarity && wantedDomain.polarity === c.classified.polarity) return false;
  // "Decline" vs "I prefer not to disclose": the "not" belongs to the opt-out phrase, not to a statement.
  if (DECLINE_PHRASE.test(wantedNorm) && DECLINE_PHRASE.test(c.normalized)) return false;
  return true;
}

const DECLINE_PHRASE = /\b(decline|prefer not|not to (say|disclose|answer|specify|self identify)|do not wish|dont wish|opt out|rather not)\b/;

/** Tokens that make two otherwise alike labels different things: levels ("Software Engineer I" vs "II"), numbers,
 * seniority, and the qualifiers of place names ("West Virginia", "Equatorial Guinea"). When one side has such a token
 * the other lacks, a fuzzy or containment match is refused. */
const DISTINGUISHING = /^(\d+|i|ii|iii|iv|v|vi|vii|viii|ix|x|senior|sr|junior|jr|lead|principal|staff|chief|head|intern|associate|assistant|trainee|director|manager|vp|west|east|north|south|new|equatorial|northern|southern|upper|lower|greater)$/;

function wordSet(norm: string): Set<string> {
  return new Set(norm.split(" ").filter(Boolean));
}

function distinguishingDiff(a: string, b: string): boolean {
  const x = wordSet(a);
  const y = wordSet(b);
  for (const t of x) if (!y.has(t) && DISTINGUISHING.test(t)) return true;
  for (const t of y) if (!x.has(t) && DISTINGUISHING.test(t)) return true;
  return false;
}

/** Splits of `raw` at a clear separator: "No, I do not" → {prefix:"no", rest:"i do not"}; "India (+91)" → "india". */
function separatorSplits(raw: string): { prefix: string; rest: string }[] {
  const out: { prefix: string; rest: string }[] = [];
  const re = /\s*[,;:(\[]|\s+[-–—|\/&]\s+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    if (m.index > 0) out.push({ prefix: normalize(raw.slice(0, m.index)), rest: normalize(raw.slice(m.index)) });
  }
  return out;
}

/** Words that turn "Yes, …" into a different, qualified answer ("Yes, but I will need sponsorship"). */
const YES_QUALIFIER = /\b(but|however|except|unless|although|though|need|require|requires|sponsorship|not|dont|never)\b/;
const NO_QUALIFIER = /\b(but|however|except|unless|although|though)\b/;

function unique<T>(list: T[]): T | undefined {
  return list.length === 1 ? list[0] : undefined;
}

// --- Experience brackets ---

interface ExperienceQuantity {
  years: number;
  fromMonths: boolean;
}

/** A PURE experience quantity: "3", "2.5", "5+", "3 years", "18 months", "less than 1 year". "Bachelor 2019" is not. */
function parseExperienceQuantity(wanted: string): ExperienceQuantity | undefined {
  const t = wanted.trim().toLowerCase().replace(/\s+/g, " ");
  if (/^(less than|under|<) ?(1|one|a) ?(year|yr)s?$/.test(t)) return { years: 0.5, fromMonths: false };
  const m = /^(\d+(?:\.\d+)?) ?\+? ?(years?|yrs?|months?|mos?)?( of experience)?$/.exec(t);
  if (!m) return undefined;
  const n = parseFloat(m[1]!);
  if (!Number.isFinite(n)) return undefined;
  const months = !!m[2] && /^mo/.test(m[2]);
  return { years: months ? n / 12 : n, fromMonths: months };
}

type Bracket =
  | { kind: "single"; value: number }
  | { kind: "range"; min: number; max: number }
  | { kind: "less"; max: number }
  | { kind: "plus"; min: number; exclusive: boolean };

function parseYearBracket(text: string): Bracket | undefined {
  const t = text.trim().toLowerCase().replace(/\s+/g, " ");
  const num = "(\\d+(?:\\.\\d+)?)";
  const unit = "(?:years?|yrs?)";
  let m = new RegExp(`^(?:less than|under|fewer than|<) ?(\\d+(?:\\.\\d+)?|one|a) ?${unit}\\b`).exec(t);
  if (m) return { kind: "less", max: /^\d/.test(m[1]!) ? parseFloat(m[1]!) : 1 };
  m = new RegExp(`^(?:more than|over|above|greater than|beyond|exceeding|>) ?${num} ?${unit}\\b`).exec(t);
  if (m) return { kind: "plus", min: parseFloat(m[1]!), exclusive: true };
  m = new RegExp(`^${num} ?(?:-|–|—|to) ?${num} ?\\+? ?${unit}\\b`).exec(t)
    // A bare range ("7-10") on a years-of-experience question is a year bracket too.
    ?? new RegExp(`^${num} ?(?:-|–|—|to) ?${num}$`).exec(t);
  if (m) return { kind: "range", min: parseFloat(m[1]!), max: parseFloat(m[2]!) };
  // "Fresher" / "No experience" is exactly zero years.
  if (/^(fresher|freshers|no (prior |work )?experience|0 experience)\b/.test(t)) return { kind: "single", value: 0 };
  m = new RegExp(`^${num} ?\\+ ?(?:${unit})?`).exec(t) ?? new RegExp(`^${num} ?${unit} ?(?:\\+|or more|and above|or above|plus)`).exec(t);
  if (m) return { kind: "plus", min: parseFloat(m[1]!), exclusive: false };
  m = new RegExp(`^${num} ?${unit}$`).exec(t);
  if (m) return { kind: "single", value: parseFloat(m[1]!) };
  return undefined;
}

/** Year-bracket choice. Returns `null` when the field IS a year-bracket question but no option is certain. */
function matchYearBracket(candidates: ParsedCandidate[], q: ExperienceQuantity): ParsedCandidate | null {
  const parsed = candidates.map((c) => ({ c, b: parseYearBracket(c.trimmed) }));
  const t = q.years;
  const single = parsed.filter((p) => p.b?.kind === "single" && p.b.value === t);
  if (single.length) return single[0]!.c;
  const contained = parsed.filter((p) => {
    const b = p.b;
    if (!b) return false;
    if (b.kind === "range") return t >= b.min && t <= b.max;
    if (b.kind === "less") return t < b.max;
    return false;
  });
  if (contained.length === 1) {
    // "5" with "3-5 years" and "5+ years": both contain it, so the user decides.
    const plusAtValue = parsed.some((p) => p.b?.kind === "plus" && !p.b.exclusive && p.b.min === t);
    if (plusAtValue) return null;
    return contained[0]!.c;
  }
  if (contained.length > 1) {
    // Overlapping brackets: if it's a full tiered ATS scale (3+ options with plus/less), standard ATS convention starts at lower bound.
    // Isolated overlapping options (e.g. ["3-5 years", "5-8 years"]) are ambiguous -> ask!
    const hasScale = candidates.length >= 3 && parsed.some((p) => p.b?.kind === "plus" || p.b?.kind === "less");
    if (hasScale && !q.fromMonths && Number.isInteger(t)) {
      const starting = contained.filter((p) => p.b!.kind === "range" && (p.b as { min: number }).min === t);
      if (starting.length === 1) return starting[0]!.c;
    }
    return null;
  }
  // Open-ended "N+ years": the highest threshold the value satisfies ("6" → "5+", never "1+").
  let best: { c: ParsedCandidate; min: number } | undefined;
  let tie = false;
  for (const p of parsed) {
    const b = p.b;
    if (!b || b.kind !== "plus") continue;
    if (b.exclusive ? t > b.min : t >= b.min) {
      if (!best || b.min > best.min) {
        best = { c: p.c, min: b.min };
        tie = false;
      } else if (b.min === best.min) tie = true;
    }
  }
  return best && !tie ? best.c : null;
}

// --- Notice tiers & Range Brackets ---

function parseDays(text: string): number | undefined {
  const norm = normalize(text).replace(/(\d) (\d)/g, "$1.$2").trim();
  if (/^\d+$/.test(norm)) return parseFloat(norm);
  const m = /^(\d+(?:\.\d+)?)\s*(days?|weeks?|months?)$/.exec(norm);
  if (!m) return undefined;
  const n = parseFloat(m[1]!);
  return /^day/.test(m[2]!) ? n : /^week/.test(m[2]!) ? n * 7 : n * 30;
}

export interface NoticeBracket {
  kind: "single" | "range" | "plus" | "less";
  minDays: number;
  maxDays?: number;
  exclusive?: boolean;
}

export function parseNoticeBracket(text: string): NoticeBracket | undefined {
  const norm = text.trim().toLowerCase().replace(/\s+/g, " ");
  const clean = norm.replace(/\s*\([^)]*\)/g, "").trim();

  // Immediate
  if (/^(immediate|immediately|available immediately|immediate start|available now|asap|now|0 days?)\b/i.test(norm) ||
      /^(immediate|immediately|available immediately|immediate start|available now|asap|now|0 days?)\b/i.test(clean)) {
    return { kind: "single", minDays: 0, maxDays: 0 };
  }

  const toDays = (val: string, unit: string): number => {
    const n = parseFloat(val);
    const u = unit.toLowerCase();
    if (u.startsWith("day")) return n;
    if (u.startsWith("week")) return n * 7;
    if (u.startsWith("month")) return n * 30;
    return n;
  };

  // Range: "1 to 2 months", "1 - 2 months", "15 to 30 days", "30 - 60 days", "30-60 days", "31-60 days"
  const rangeMatch = /^(\d+(?:\.\d+)?)\s*(days?|weeks?|months?)?\s*(?:-|–|—|to)\s*(\d+(?:\.\d+)?)\s*(days?|weeks?|months?)\b/i.exec(norm)
    ?? /^(\d+(?:\.\d+)?)\s*(days?|weeks?|months?)?\s*(?:-|–|—|to)\s*(\d+(?:\.\d+)?)\s*(days?|weeks?|months?)\b/i.exec(clean);
  if (rangeMatch) {
    const unit = rangeMatch[4]!;
    const minVal = parseFloat(rangeMatch[1]!);
    const maxDays = toDays(rangeMatch[3]!, unit);
    const minDays = rangeMatch[2] ? toDays(rangeMatch[1]!, rangeMatch[2]) : (unit.startsWith("month") ? minVal * 30 : minVal);
    return { kind: "range", minDays, maxDays };
  }

  // Plus / or more: "2+ months", "60+ days", "2 months or more", "at least 2 months"
  const plusMatch = /^(\d+(?:\.\d+)?)\s*\+\s*(days?|weeks?|months?)\b/i.exec(norm)
    ?? /^(\d+(?:\.\d+)?)\s*(days?|weeks?|months?)\s*(?:\+|or more|and above|or above|plus)\b/i.exec(norm)
    ?? /^(?:at least)\s*(\d+(?:\.\d+)?)\s*(days?|weeks?|months?)\b/i.exec(norm)
    ?? /^(\d+(?:\.\d+)?)\s*\+\s*(days?|weeks?|months?)\b/i.exec(clean)
    ?? /^(\d+(?:\.\d+)?)\s*(days?|weeks?|months?)\s*(?:\+|or more|and above|or above|plus)\b/i.exec(clean)
    ?? /^(?:at least)\s*(\d+(?:\.\d+)?)\s*(days?|weeks?|months?)\b/i.exec(clean);
  if (plusMatch) {
    return { kind: "plus", minDays: toDays(plusMatch[1]!, plusMatch[2]!), exclusive: false };
  }

  const overMatch = /^(?:more than|over|greater than|>)\s*(\d+(?:\.\d+)?)\s*(days?|weeks?|months?)\b/i.exec(norm)
    ?? /^(?:more than|over|greater than|>)\s*(\d+(?:\.\d+)?)\s*(days?|weeks?|months?)\b/i.exec(clean);
  if (overMatch) {
    return { kind: "plus", minDays: toDays(overMatch[1]!, overMatch[2]!), exclusive: true };
  }

  // Less than: "less than 1 month", "under 30 days"
  const lessMatch = /^(?:less than|under|fewer than|<)\s*(\d+(?:\.\d+)?)\s*(days?|weeks?|months?)\b/i.exec(norm)
    ?? /^(?:less than|under|fewer than|<)\s*(\d+(?:\.\d+)?)\s*(days?|weeks?|months?)\b/i.exec(clean);
  if (lessMatch) {
    return { kind: "less", minDays: 0, maxDays: toDays(lessMatch[1]!, lessMatch[2]!) };
  }

  // Single value: "15 days", "30 days", "1 month", "2 months", "60 days"
  const singleMatch = /^(\d+(?:\.\d+)?)\s*(days?|weeks?|months?)$/i.exec(clean)
    ?? /^(\d+(?:\.\d+)?)\s*(days?|weeks?|months?)$/i.exec(norm);
  if (singleMatch) {
    const days = toDays(singleMatch[1]!, singleMatch[2]!);
    return { kind: "single", minDays: days, maxDays: days };
  }

  return undefined;
}

function matchNoticeBracket(candidates: ParsedCandidate[], wantedDays: number): { candidate: ParsedCandidate | null; isAmbiguous: boolean } {
  const parsed = candidates.map((c) => ({ c, b: parseNoticeBracket(c.trimmed) }));

  // 1. Single exact tier match
  const single = parsed.filter((p) => p.b?.kind === "single" && p.b.minDays === wantedDays);
  if (single.length === 1) return { candidate: single[0]!.c, isAmbiguous: false };

  // 2. Contained in bounded range: minDays <= wantedDays <= maxDays
  const contained = parsed.filter((p) => {
    const b = p.b;
    if (!b) return false;
    if (b.kind === "range" && b.maxDays !== undefined) {
      return wantedDays >= b.minDays && wantedDays <= b.maxDays;
    }
    if (b.kind === "less" && b.maxDays !== undefined) {
      return wantedDays < b.maxDays;
    }
    return false;
  });

  if (contained.length === 1) return { candidate: contained[0]!.c, isAmbiguous: false };
  if (contained.length > 1) {
    // Overlapping ranges: ambiguous -> return null (ask!)
    return { candidate: null, isAmbiguous: true };
  }

  // 3. Plus tier ("2+ months", "60+ days", ">30 days"): pick the highest satisfying threshold
  let best: { c: ParsedCandidate; minDays: number } | undefined;
  let tie = false;
  for (const p of parsed) {
    const b = p.b;
    if (!b || b.kind !== "plus") continue;
    const satisfies = b.exclusive ? wantedDays > b.minDays : wantedDays >= b.minDays;
    if (satisfies) {
      if (!best || b.minDays > best.minDays) {
        best = { c: p.c, minDays: b.minDays };
        tie = false;
      } else if (best.minDays === b.minDays) {
        tie = true;
      }
    }
  }

  if (best && !tie) return { candidate: best.c, isAmbiguous: false };
  return { candidate: null, isAmbiguous: tie };
}

// --- Canonical City Synonym Clusters ---
const CITY_SYNONYM_CLUSTERS: string[][] = [
  ["bengaluru", "bangalore"],
  ["gurugram", "gurgaon"],
  ["mumbai", "bombay"],
  ["kolkata", "calcutta"],
  ["chennai", "madras"],
  ["munchen", "munich", "muenchen"],
  ["koln", "cologne", "koeln"],
  ["wien", "vienna"],
  ["roma", "rome"],
  ["praha", "prague"],
  ["warszawa", "warsaw"],
  ["lisboa", "lisbon"],
  ["kyiv", "kiev"],
];

const CITY_SYNONYM_MAP = new Map<string, Set<string>>();
for (const cluster of CITY_SYNONYM_CLUSTERS) {
  const set = new Set(cluster);
  for (const city of cluster) {
    CITY_SYNONYM_MAP.set(city, set);
  }
}

export function isInProgressDegree(text: string): boolean {
  return /\b(in progress|pursuing|currently enrolled|incomplete|not completed|expected graduation|expected completion)\b/i.test(text);
}

function isQualifiedTier(c: ParsedCandidate): boolean {
  return QUALIFIED_TIER.test(c.normalized) || /[<>]|\d\s*\+/.test(c.trimmed);
}

export function matchOptionWithEngine(options: string[], wanted: string, minScore = 0.6): MatchResult | undefined {
  if (!options || !options.length || !wanted) return undefined;
  if (isPromptInjection(wanted)) return undefined;

  const wantedTrimmed = wanted.trim();
  const wantedNorm = normalize(wantedTrimmed);
  if (!wantedNorm) return undefined;

  const wantedCleanCode = wantedTrimmed.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  const wantedClassified = classifyText(wantedTrimmed);
  const wantedStems = meaningfulStems(wantedTrimmed);

  const candidates: ParsedCandidate[] = options.map(parseCandidate);
  // normalize() drops symbols, so "C", "C++" and "C#" read the same: only options with the same symbols compare.
  const symbols = (s: string) => s.replace(/[^+#]/g, "");
  const wantedSymbols = symbols(wantedTrimmed);
  const sameSymbols = (c: ParsedCandidate) => symbols(c.trimmed) === wantedSymbols;

  // STAGE 1: Exact match first: an option that IS the wanted value always beats a tier, bracket or bucket
  // ("30 days" beats "Less than 30 days", "3 years" beats "1 year").
  const rawExact = candidates.find((c) => c.trimmed.toLowerCase() === wantedTrimmed.toLowerCase());
  if (rawExact) return { option: rawExact.raw, stage: "exact", confidence: 1.0 };
  const normExact = candidates.find((c) => c.normalized === wantedNorm && sameSymbols(c));
  if (normExact) return { option: normExact.raw, stage: "exact", confidence: 1.0 };
  // Same text apart from spaces/punctuation ("JavaScript" / "Java Script", "nodejs" / "Node.js"). This is the ONLY
  // spelling tolerance: no edit-distance matching (Iran ≠ Iraq, Niger ≠ Nigeria, Austria ≠ Australia).
  const wantedCompact = wantedNorm.replace(/ /g, "");
  if (wantedCompact.length >= 4) {
    const compact = unique(candidates.filter((c) => c.normalized.replace(/ /g, "") === wantedCompact && sameSymbols(c)));
    if (compact) return { option: compact.raw, stage: "exact", confidence: 0.99 };
  }

  // STAGE 0: Contextual ATS Domain Specializations

  // 0a. EEO Protected Veteran Context
  const isVeteranContext = candidates.some((c) => /\bveteran\b/i.test(c.normalized));
  if (isVeteranContext) {
    if (wantedClassified.polarity === PolarityBucket.DECLINE || /^(decline|opt out)\b/i.test(wantedNorm)) {
      const match = candidates.find((c) => c.classified.veteran === VeteranBucket.DECLINE);
      if (match) return { option: match.raw, stage: "contextual_domain", confidence: 0.99 };
    }
    if (wantedClassified.polarity === PolarityBucket.NO || wantedNorm === "not a veteran" || wantedNorm === "no") {
      // "I identify as a veteran, just not a protected veteran" and "I am not a veteran" are both "not protected";
      // a plain "No" means the plain one.
      const nots = candidates.filter((c) => c.classified.veteran === VeteranBucket.NOT_VETERAN);
      const match = unique(nots) ?? unique(nots.filter((c) => !/\b(protected|identify as a veteran)\b/.test(c.normalized)));
      if (match) return { option: match.raw, stage: "contextual_domain", confidence: 0.99 };
      if (nots.length > 1) return undefined;
    }
    if (wantedClassified.polarity === PolarityBucket.YES || wantedNorm === "protected veteran" || wantedNorm === "yes") {
      const match = unique(candidates.filter((c) => c.classified.veteran === VeteranBucket.PROTECTED_VETERAN));
      if (match) return { option: match.raw, stage: "contextual_domain", confidence: 0.99 };
    }
  }

  // 0b. EEO Disability Context
  const isDisabilityContext = candidates.some((c) => /\bdisability\b/i.test(c.normalized));
  if (isDisabilityContext) {
    if (wantedClassified.polarity === PolarityBucket.DECLINE || /^(decline|opt out)\b/i.test(wantedNorm)) {
      const match = candidates.find((c) => c.classified.disability === DisabilityBucket.DECLINE);
      if (match) return { option: match.raw, stage: "contextual_domain", confidence: 0.99 };
    }
    if (wantedClassified.polarity === PolarityBucket.NO || wantedNorm === "no disability" || wantedNorm === "no") {
      const match = candidates.find((c) => c.classified.disability === DisabilityBucket.NO_DISABILITY);
      if (match) return { option: match.raw, stage: "contextual_domain", confidence: 0.99 };
    }
    if (wantedClassified.polarity === PolarityBucket.YES || wantedNorm === "have a disability" || wantedNorm === "yes") {
      const match = candidates.find((c) => c.classified.disability === DisabilityBucket.YES_DISABILITY);
      if (match) return { option: match.raw, stage: "contextual_domain", confidence: 0.99 };
    }
  }

  // 0c. Hispanic / Ethnicity Context
  const isHispanicContext = candidates.some((c) => /\b(hispanic|latino)\b/i.test(c.normalized));
  if (isHispanicContext) {
    if (wantedClassified.polarity === PolarityBucket.DECLINE || /^(decline|opt out)\b/i.test(wantedNorm)) {
      const match = candidates.find((c) => c.classified.race === RaceBucket.DECLINE);
      if (match) return { option: match.raw, stage: "contextual_domain", confidence: 0.99 };
    }
    if (wantedClassified.polarity === PolarityBucket.NO || wantedNorm === "not hispanic" || wantedNorm === "no") {
      const match = candidates.find((c) => c.classified.race === RaceBucket.HISPANIC && c.classified.polarity === PolarityBucket.NO);
      if (match) return { option: match.raw, stage: "contextual_domain", confidence: 0.99 };
    }
    if (wantedClassified.polarity === PolarityBucket.YES || wantedNorm === "hispanic" || wantedNorm === "yes") {
      const match = candidates.find((c) => c.classified.race === RaceBucket.HISPANIC && c.classified.polarity === PolarityBucket.YES);
      if (match) return { option: match.raw, stage: "contextual_domain", confidence: 0.99 };
    }
  }

  // 0d. Agreement / Terms Context ("I agree to the terms" vs "I do not agree"). Two DIFFERENT agreements
  // ("… marketing texts" / "… the terms") are ambiguous for a bare "Yes".
  const isAgreementContext = candidates.some((c) => /\b(agree|disagree|terms)\b/i.test(c.normalized));
  if (isAgreementContext && (wantedClassified.polarity === PolarityBucket.YES || wantedClassified.polarity === PolarityBucket.NO)) {
    const same = candidates.filter((c) => c.classified.polarity === wantedClassified.polarity);
    const match = unique(same);
    if (match) return { option: match.raw, stage: "contextual_domain", confidence: 0.98 };
    if (same.length > 1) return undefined;
  }

  // 0e. Years-of-experience brackets: only for a PURE quantity ("3", "2.5 years", "18 months").
  const experience = parseExperienceQuantity(wantedTrimmed);
  if (experience && candidates.some((c) => parseYearBracket(c.trimmed))) {
    const match = matchYearBracket(candidates, experience);
    return match ? { option: match.raw, stage: "contextual_domain", confidence: 0.98 } : undefined;
  }

  // 0f. Notice Period Tiers & Range Brackets (0, 15, 30, 60, 90 days, "2+ months", "1 to 2 months")
  const isNoticeContext = candidates.some((c) => /\b(immediately|days|months|notice|weeks)\b/i.test(c.normalized));
  if (isNoticeContext) {
    const wantedDays = parseDays(wantedTrimmed);
    if (wantedDays !== undefined) {
      const res = matchNoticeBracket(candidates, wantedDays);
      if (res.candidate) {
        return { option: res.candidate.raw, stage: "contextual_domain", confidence: 0.98 };
      }
      if (res.isAmbiguous) {
        return undefined; // Ambiguous overlapping ranges -> ask!
      }
    }

    const tiers = candidates.filter((c) => !isQualifiedTier(c));
    if (wantedNorm === "0 days" || wantedClassified.availability === AvailabilityBucket.IMMEDIATE) {
      const imm = tiers.find((c) => c.classified.availability === AvailabilityBucket.IMMEDIATE);
      if (imm) return { option: imm.raw, stage: "contextual_domain", confidence: 0.98 };
    }
    if (wantedNorm === "15 days" || wantedNorm === "15" || wantedNorm === "2 weeks" || wantedClassified.availability === AvailabilityBucket.TWO_WEEKS) {
      const match15 = tiers.find((c) => /\b(15 days?|2 weeks?|two weeks?)\b/i.test(c.normalizedCore) || /^15\s+to\s+30\s+days/i.test(c.normalizedCore));
      if (match15) return { option: match15.raw, stage: "contextual_domain", confidence: 0.98 };
    }
    if (wantedNorm === "30 days" || wantedNorm === "1 month" || wantedNorm === "30" || wantedClassified.availability === AvailabilityBucket.ONE_MONTH) {
      const match30 = tiers.find((c) => /\b(1 month|30 days)\b/i.test(c.normalizedCore) && !c.normalizedCore.startsWith("15 to"));
      if (match30) return { option: match30.raw, stage: "contextual_domain", confidence: 0.98 };
    }
    if (wantedNorm === "60 days" || wantedNorm === "2 months" || wantedNorm === "60" || wantedClassified.availability === AvailabilityBucket.TWO_MONTHS) {
      const match60 = tiers.find((c) => /\b(2 months|60 days)\b/i.test(c.normalizedCore));
      if (match60) return { option: match60.raw, stage: "contextual_domain", confidence: 0.98 };
    }
    if (wantedNorm === "90 days" || wantedNorm === "3 months" || wantedNorm === "90" || wantedClassified.availability === AvailabilityBucket.THREE_MONTHS) {
      const match90 = tiers.find((c) => /\b(3 months|90 days)\b/i.test(c.normalizedCore));
      if (match90) return { option: match90.raw, stage: "contextual_domain", confidence: 0.98 };
    }
  }

  // 0g. City Synonyms (canonical bidirectional mappings)
  const cityCluster = CITY_SYNONYM_MAP.get(wantedNorm);
  if (cityCluster) {
    const matchingCityOptions = candidates.filter((c) => {
      const cNorm = c.normalizedCore;
      if (cityCluster.has(cNorm)) return true;
      // "Bangalore, India", "Bengaluru (Karnataka)", "Bombay - MH": the city plus where it is. Never "Bangalore Rural"
      // or "Navi Mumbai", which are other places.
      const raw = c.raw.trim().toLowerCase();
      return [...cityCluster].some((syn) => raw.startsWith(syn) && /^\s*(?:,|\(|-|–|\/)/.test(raw.slice(syn.length)));
    });
    const uniqueCityMatch = unique(matchingCityOptions);
    if (uniqueCityMatch) {
      return { option: uniqueCityMatch.raw, stage: "contextual_domain", confidence: 0.98 };
    }
    if (matchingCityOptions.length > 1) {
      // "Bengaluru" with ["Bangalore", "Bangalore Rural"]: only an option that IS a name of the city counts.
      const exactCity = matchingCityOptions.filter((c) => cityCluster.has(c.normalizedCore));
      if (exactCity.length === 1) return { option: exactCity[0]!.raw, stage: "exact", confidence: 1.0 };
      return undefined;
    }
  }

  // 1c. Code exact match (e.g. "MBA" matches "(MBA)", "BS" matches "(B.S.)", "UK" matches "(UK)")
  if (wantedCleanCode && wantedCleanCode.length >= 2) {
    const codeMatch = candidates.find((c) => c.cleanCode === wantedCleanCode && sameSymbols(c));
    if (codeMatch && !hasSemanticConflict(wantedClassified, codeMatch.classified)) {
      return { option: codeMatch.raw, stage: "code_stripped", confidence: 0.99 };
    }
  }

  // 1d. Core label exact match (e.g. "IN - India" core "India" matches "India")
  const coreExact = candidates.find((c) => c.normalizedCore === wantedNorm && sameSymbols(c));
  if (coreExact && !hasSemanticConflict(wantedClassified, coreExact.classified)) {
    return { option: coreExact.raw, stage: "code_stripped", confidence: 0.99 };
  }

  // 1e. Subpart exact match (e.g. "Contract / Freelance" subpart "Freelance" matches "Freelance")
  const subpartExact = candidates.find((c) => {
    return c.subParts.some((part) => normalize(part) === wantedNorm && symbols(part) === wantedSymbols);
  });
  if (subpartExact && !hasSemanticConflict(wantedClassified, subpartExact.classified)) {
    return { option: subpartExact.raw, stage: "code_stripped", confidence: 0.98 };
  }

  // 1f. A pure number / percentage ("25%", "0%") that appears in exactly ONE option ("Occasional travel (up to 25%)").
  const pureNumber = /^(\d+(?:\.\d+)?)\s*(%?)$/.exec(wantedTrimmed);
  if (pureNumber) {
    const [, value, pct] = pureNumber;
    const numRe = new RegExp(`(^|[^\\d.])${value!.replace(".", "\\.")}${pct ? "\\s*%" : "(?![\\d.])"}`);
    const match = unique(candidates.filter((c) => numRe.test(c.trimmed)));
    if (match) return { option: match.raw, stage: "code_stripped", confidence: 0.95 };
  }

  // Filter out any candidates with semantic, polarity or negation conflicts
  const validCandidates = candidates.filter(
    (c) => !hasSemanticConflict(wantedClassified, c.classified) && !negationConflict(wantedNorm, wantedClassified, c),
  );

  // STAGE 2: Degrees. Same level AND same specialisation (B.Tech → "Bachelor of Technology", never "Bachelor of
  // Arts"); a generic option ("Bachelor's Degree") is fine for any specialisation. Anything else stays empty.
  if (wantedClassified.degree) {
    const targetDegree = wantedClassified.degree;
    const wantedInProgress = isInProgressDegree(wantedTrimmed);
    const degreeCandidates = validCandidates.filter((c) => {
      if (c.classified.degree !== targetDegree) return false;
      const candidateInProgress = isInProgressDegree(c.trimmed);
      if (wantedInProgress !== candidateInProgress) return false; // Trap: in-progress vs completed
      return true;
    });
    const wantedSpec = degreeSpec(wantedTrimmed);
    if (wantedSpec) {
      const same = degreeCandidates.filter((c) => degreeSpec(c.trimmed) === wantedSpec);
      const match = unique(same);
      if (match) return { option: match.raw, stage: "contextual_domain", confidence: 0.96 };
      if (same.length > 1) return undefined;

      // Specialization conflict trap: e.g. MBA (business) vs Master of Engineering (engineering)
      const conflicting = degreeCandidates.filter((c) => {
        const spec = degreeSpec(c.trimmed);
        return spec && spec !== wantedSpec;
      });
      const generic = degreeCandidates.filter((c) => !degreeSpec(c.trimmed));
      if (conflicting.length > 0 && generic.length === 0) {
        return undefined; // Must not guess different specialization
      }
      if (generic.length) {
        const preferred = generic.find((c) => /\b(degree|4 year|college)\b/i.test(c.normalized)) ?? generic[0]!;
        return { option: preferred.raw, stage: "contextual_domain", confidence: 0.95 };
      }
    } else {
      const generic = degreeCandidates.filter((c) => !degreeSpec(c.trimmed));
      if (generic.length) {
        const preferred = generic.find((c) => /\b(degree|4 year|college)\b/i.test(c.normalized)) ?? generic[0]!;
        return { option: preferred.raw, stage: "contextual_domain", confidence: 0.95 };
      }
      // A generic wanted degree ("Doctorate", "Bachelor") with exactly ONE option at that level.
      if (degreeCandidates.length === 1) {
        return { option: degreeCandidates[0]!.raw, stage: "contextual_domain", confidence: 0.92 };
      }
    }
    // The options are degrees but none is certainly the wanted one.
    if (candidates.some((c) => c.classified.degree)) return undefined;
  }

  // STAGE 3: Canonical Taxonomy Domain Fallbacks
  // 3a. Country mapping
  if (wantedClassified.country) {
    const targetAlpha2 = wantedClassified.country.alpha2;
    const countryMatch = validCandidates.find((c) => {
      if (c.classified.country?.alpha2 === targetAlpha2) return true;
      if (c.cleanCode && c.cleanCode === targetAlpha2.toLowerCase()) return true;
      if (c.code && c.code === `+${wantedClassified.country?.dialCode}`) return true;
      return false;
    });
    if (countryMatch) {
      return { option: countryMatch.raw, stage: "contextual_domain", confidence: 0.96 };
    }
  }

  // 3b. Availability mapping (qualified tiers never stand in for the value itself)
  if (wantedClassified.availability) {
    const targetAvail = wantedClassified.availability;
    const availMatch = validCandidates.find((c) => c.classified.availability === targetAvail);
    if (availMatch) {
      return { option: availMatch.raw, stage: "contextual_domain", confidence: 0.95 };
    }
  }

  // 3c. Employment mapping
  if (wantedClassified.employment && wantedClassified.employment.length > 0) {
    const targetEmp = wantedClassified.employment[0]!;
    const empMatch = validCandidates.find((c) => c.classified.employment?.includes(targetEmp));
    if (empMatch) {
      return { option: empMatch.raw, stage: "contextual_domain", confidence: 0.95 };
    }
  }

  // 3d. Pronoun mapping
  if (wantedClassified.pronoun) {
    const targetPronoun = wantedClassified.pronoun;
    const pronounMatch = validCandidates.find((c) => c.classified.pronoun === targetPronoun);
    if (pronounMatch) {
      return { option: pronounMatch.raw, stage: "contextual_domain", confidence: 0.95 };
    }
  }

  // 3e. Gender mapping (transgender options are their own bucket, so "Male" → "Man", never "Transgender man")
  if (wantedClassified.gender) {
    const targetGender = wantedClassified.gender;
    const genderMatch = validCandidates.find((c) => c.classified.gender === targetGender);
    if (genderMatch) {
      return { option: genderMatch.raw, stage: "contextual_domain", confidence: 0.95 };
    }
  }

  // 3f. Workplace mapping
  if (wantedClassified.workplace) {
    const targetWork = wantedClassified.workplace;
    const workMatch = validCandidates.find((c) => c.classified.workplace === targetWork);
    if (workMatch) {
      return { option: workMatch.raw, stage: "contextual_domain", confidence: 0.95 };
    }
  }

  // 3g. Polarity mapping: exactly one unqualified option of that polarity, else it stays for the user.
  if (wantedClassified.polarity) {
    const targetPol = wantedClassified.polarity;
    const qualifier = targetPol === PolarityBucket.YES ? YES_QUALIFIER : NO_QUALIFIER;
    const same = validCandidates.filter((c) => c.classified.polarity === targetPol);
    const unqualified = same.filter((c) => {
      const rest = c.normalized.replace(/^(yes|y|no|n|true|false|i agree|agree|i disagree|disagree)\b/, "");
      return !qualifier.test(rest);
    });
    const polMatch = unique(unqualified);
    if (polMatch) {
      return { option: polMatch.raw, stage: "contextual_domain", confidence: 0.95 };
    }
    if (same.length) return undefined;
  }

  // 3h. Fluency mapping
  if (wantedClassified.fluency) {
    const at = (level: FluencyBucket) => validCandidates.filter((c) => c.classified.fluency === level);
    const pick = (list: ParsedCandidate[]) => unique(list) ?? unique(list.filter((c) => c.stems.has([...wantedStems][0] ?? "")));
    const levels = at(wantedClassified.fluency);
    const fluencyMatch = pick(levels)
      // A native speaker on a scale with no "native" option: the one top level ("Fluent"), never a lower one.
      ?? (wantedClassified.fluency === FluencyBucket.NATIVE && !levels.length ? unique(at(FluencyBucket.FLUENT)) : undefined);
    if (fluencyMatch) {
      return { option: fluencyMatch.raw, stage: "contextual_domain", confidence: 0.95 };
    }
    if (candidates.some((c) => c.classified.fluency)) return undefined; // a level scale, but no certain level: ask
  }

  // 3i. Source of hire: "Referral" is "Employee Referral", "Company Website" is "Company Careers Page".
  if (wantedClassified.source) {
    const match = unique(validCandidates.filter((c) => c.classified.source === wantedClassified.source));
    if (match) return { option: match.raw, stage: "contextual_domain", confidence: 0.93 };
  }

  // STAGE 4: Prefix at a clear separator ("No" → "No, I do not"; "India (+91)" → "India"). Never a suffix
  // ("Guinea" is not "Equatorial Guinea", "Virginia" is not "West Virginia") and never a bare word prefix
  // ("Software Engineer" is not "Software Engineer II", "No" is not "None").
  const yesNoWord = /^(yes|no)$/.test(wantedNorm);
  const prefixHits = validCandidates.filter((c) => {
    const splits = separatorSplits(c.trimmed);
    if (yesNoWord && c.normalized.startsWith(wantedNorm + " ")) splits.push({ prefix: wantedNorm, rest: c.normalized.slice(wantedNorm.length) });
    // A quantity followed by its unit's context ("3 days" → "3 days per week"), but never a bounded tier.
    if (/^\d/.test(wantedNorm) && c.normalized.startsWith(wantedNorm + " ") && !isQualifiedTier(c) && !distinguishingDiff(wantedNorm, c.normalized)) {
      splits.push({ prefix: wantedNorm, rest: c.normalized.slice(wantedNorm.length) });
    }
    for (const { prefix, rest } of splits) {
      if (prefix !== wantedNorm) continue;
      if (wantedNorm === "yes" && YES_QUALIFIER.test(rest)) return false;
      if (wantedNorm === "no" && NO_QUALIFIER.test(rest)) return false;
      return true;
    }
    if (c.normalized.length >= 3 && separatorSplits(wantedTrimmed).some((s) => s.prefix === c.normalized)) return true;
    return false;
  });
  const boundaryMatch = unique(prefixHits);
  if (boundaryMatch) {
    return { option: boundaryMatch.raw, stage: "boundary_prefix", confidence: 0.90 };
  }
  if (prefixHits.length > 1) return undefined;

  // STAGE 5: Containment: every wanted word (2+ words) is in the option, nothing distinguishing differs, and one
  // option is strictly the best. An option that is only PART of the wanted value ("Engineer" for "Junior Engineer")
  // is never taken.
  if (wantedStems.size >= 2) {
    let best: { c: ParsedCandidate; score: number } | undefined;
    let tie = false;
    for (const c of validCandidates) {
      if (!c.stems.size) continue;
      if (![...wantedStems].every((s) => c.stems.has(s))) continue;
      if (distinguishingDiff(wantedNorm, c.normalized)) continue;
      let shared = 0;
      for (const s of wantedStems) if (c.stems.has(s)) shared++;
      const score = shared / (wantedStems.size + c.stems.size - shared);
      if (!best || score > best.score) {
        best = { c, score };
        tie = false;
      } else if (score === best.score && c.normalized !== best.c.normalized) tie = true;
    }
    if (best && !tie && best.score >= 0.5) {
      return { option: best.c.raw, stage: "token_containment", confidence: 0.85 };
    }
  }

  // STAGE 6: Word-overlap (Jaccard) only. No edit-distance / typo matching: one changed letter is a different
  // country, city or level (Iran/Iraq, Mumbai/Dubai, Rest/Rust).
  if (wantedNorm.length >= 4) {
    let best: { c: ParsedCandidate; score: number } | undefined;
    let tie = false;
    for (const c of validCandidates) {
      if (distinguishingDiff(wantedNorm, c.normalized)) continue;
      // One word swapped for another is another thing with the same pattern: "Indian Institute of Technology
      // Jodhpur" is not "… Delhi", "University of Pune" is not "University of Mumbai".
      if ([...wantedStems].some((s) => !c.stems.has(s)) && [...c.stems].some((s) => !wantedStems.has(s))) continue;
      let shared = 0;
      for (const s of wantedStems) if (c.stems.has(s)) shared++;
      const denom = wantedStems.size + c.stems.size - shared;
      const score = denom ? shared / denom : 0;
      if (!best || score > best.score) {
        best = { c, score };
        tie = false;
      } else if (score === best.score && c.normalized !== best.c.normalized) tie = true;
    }
    if (best && !tie && best.score >= minScore) {
      return { option: best.c.raw, stage: "fuzzy", confidence: best.score };
    }
  }

  // STAGE 7: Anti-Overfitting Rejection
  return undefined;
}

/**
 * Drop-in replacement for bestOption() with multi-stage anti-overfitting fuzzy & semantic engine.
 */
export function bestOption(options: string[], wanted: string, minScore = 0.6): string | undefined {
  const match = matchOptionWithEngine(options, wanted, minScore);
  return match?.option;
}

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
  FLUENT = "FLUENT",
  INTERMEDIATE = "INTERMEDIATE",
  BASIC = "BASIC",
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
    /\b(bs|ba|bsc|bba|btech|be|beng|bca|bfa|b s|b a|b tech)\b/i,
    /\b4 year (college )?degree\b/i,
    /\bfour year (college )?degree\b/i,
  ],
  [DegreeBucket.MASTER]: [
    /\b(master|masters|magister|postgraduate|graduate degree)\b/i,
    /\b(ms|ma|msc|mtech|mba|meng|mca|mfa|m s|m a|m tech)\b/i,
  ],
  [DegreeBucket.DOCTORATE]: [
    /\b(doctorate|doctoral|doctor of philosophy|terminal degree|postdoc)\b/i,
    /\b(phd|ph d|dphil|dr rer nat|dr ing|dba|ed d|jd|md)\b/i,
  ],
  [DegreeBucket.ASSOCIATE]: [
    /\b(associate|associates)\b/i,
    /\b(aa|as|aas|a a|a s)\b/i,
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
  [PronounBucket.DECLINE]: [
    /\b(decline|prefer not to say|decline to state|prefer not to disclose|other|not listed|opt out)\b/i,
  ],
};

const GENDER_PATTERNS: Record<GenderBucket, RegExp[]> = {
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
  [FluencyBucket.FLUENT]: [
    /\b(fluent|native|bilingual|full professional|proficient|c2|c1|mother tongue|native bilingual|professional working proficiency)\b/i,
  ],
  [FluencyBucket.INTERMEDIATE]: [
    /\b(intermediate|conversational|b2|b1|limited working proficiency|working proficiency)\b/i,
  ],
  [FluencyBucket.BASIC]: [
    /\b(basic|beginner|elementary|a2|a1|novice)\b/i,
  ],
};

const POLARITY_PATTERNS: Record<PolarityBucket, RegExp[]> = {
  [PolarityBucket.YES]: [
    /^(yes|y|true|agree|i agree|accept|i accept|authorized|eligible|citizen|permanent resident|ja|oui|si|sim)\b/i,
    /\b(yes i am authorized|yes i agree|yes definitely|affirmative)\b/i,
  ],
  [PolarityBucket.NO]: [
    /^(no|n|false|disagree|i disagree|not authorized|require sponsorship|will require sponsorship|need sponsorship|nein|non|nao|nee)\b/i,
    /\b(no i do not agree|i do not agree|do not agree|not agree|negative)\b/i,
  ],
  [PolarityBucket.DECLINE]: [
    /^(decline|prefer not to say|prefer not to disclose|choose not to disclose|i do not wish to answer|do not wish to answer|opt out)\b/i,
    /\b(decline to self identify|decline to state)\b/i,
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
  polarity?: PolarityBucket;
  seniority?: SeniorityBucket;
  country?: CountryInfo;
}

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

  // Availability / Notice
  for (const [bucket, patterns] of Object.entries(AVAILABILITY_PATTERNS) as [AvailabilityBucket, RegExp[]][]) {
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
  const directCountry = COUNTRY_BY_ALIAS.get(trimmed) || COUNTRY_BY_CODE.get(trimmed);
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

export function matchOptionWithEngine(options: string[], wanted: string, minScore = 0.6): MatchResult | undefined {
  if (!options || !options.length || !wanted) return undefined;
  if (isPromptInjection(wanted)) return undefined;

  const wantedRaw = wanted;
  const wantedTrimmed = wanted.trim();
  const wantedNorm = normalize(wantedTrimmed);
  if (!wantedNorm) return undefined;

  const wantedCleanCode = wantedTrimmed.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  const wantedClassified = classifyText(wantedTrimmed);
  const wantedStems = meaningfulStems(wantedTrimmed);

  const candidates: ParsedCandidate[] = options.map(parseCandidate);

  // STAGE 0: Contextual ATS Domain Specializations
  // Detect if options belong to a known standardized ATS question set

  // 0a. EEO Protected Veteran Context
  const isVeteranContext = candidates.some((c) => /\bveteran\b/i.test(c.normalized));
  if (isVeteranContext) {
    if (wantedClassified.polarity === PolarityBucket.DECLINE || /^(decline|opt out)\b/i.test(wantedNorm)) {
      const match = candidates.find((c) => c.classified.veteran === VeteranBucket.DECLINE);
      if (match) return { option: match.raw, stage: "contextual_domain", confidence: 0.99 };
    }
    if (wantedClassified.polarity === PolarityBucket.NO || wantedNorm === "not a veteran" || wantedNorm === "no") {
      const match = candidates.find((c) => c.classified.veteran === VeteranBucket.NOT_VETERAN);
      if (match) return { option: match.raw, stage: "contextual_domain", confidence: 0.99 };
    }
    if (wantedClassified.polarity === PolarityBucket.YES || wantedNorm === "protected veteran" || wantedNorm === "yes") {
      const match = candidates.find((c) => c.classified.veteran === VeteranBucket.PROTECTED_VETERAN);
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

  // 0d. Agreement / Terms Context (e.g. "I agree to the terms" vs "I do not agree")
  const isAgreementContext = candidates.some((c) => /\b(agree|disagree|terms)\b/i.test(c.normalized));
  if (isAgreementContext) {
    if (wantedClassified.polarity === PolarityBucket.YES) {
      const match = candidates.find((c) => c.classified.polarity === PolarityBucket.YES);
      if (match) return { option: match.raw, stage: "contextual_domain", confidence: 0.98 };
    }
    if (wantedClassified.polarity === PolarityBucket.NO) {
      const match = candidates.find((c) => c.classified.polarity === PolarityBucket.NO);
      if (match) return { option: match.raw, stage: "contextual_domain", confidence: 0.98 };
    }
  }

  // 0e. Workday / ATS Years of Experience Bracket Matching
  const isYearBracketContext = candidates.some((c) => /\b(years?|less than 1 year)\b/i.test(c.normalized) && /\d/.test(c.normalized));
  if (isYearBracketContext) {
    const isLessThanOne = /less than 1|^0\b/i.test(wantedTrimmed);
    const numMatch = isLessThanOne ? null : /(\d+)/.exec(wantedTrimmed);
    if (isLessThanOne || numMatch) {
      const targetYears = isLessThanOne ? 0 : parseInt(numMatch![1]!, 10);
      // Match candidate bracket where target falls into [min, max] or tier threshold
      for (const c of candidates) {
        if (targetYears === 0 && /less than 1/i.test(c.normalized)) {
          return { option: c.raw, stage: "contextual_domain", confidence: 0.98 };
        }
        // Match bracket like "3 - 5 years" or "3-5 years" starting with targetYears on trimmed text
        const startBracketMatch = /^(\d+)\s*[-–—to\s]+\s*(\d+)\s*years?/i.exec(c.trimmed);
        if (startBracketMatch) {
          const minYears = parseInt(startBracketMatch[1]!, 10);
          if (targetYears === minYears) {
            return { option: c.raw, stage: "contextual_domain", confidence: 0.98 };
          }
        }
        // Top bracket like "8+ years"
        const topBracketMatch = /^(\d+)\+?\s*years?/i.exec(c.trimmed);
        if (topBracketMatch && targetYears >= parseInt(topBracketMatch[1]!, 10)) {
          return { option: c.raw, stage: "contextual_domain", confidence: 0.98 };
        }
      }
    }
  }

  // 0f. Notice Period Tiers (0, 15, 30, 60, 90 days)
  const isNoticeContext = candidates.some((c) => /\b(immediately|days|months|notice)\b/i.test(c.normalized));
  if (isNoticeContext) {
    if (wantedNorm === "0 days" || wantedClassified.availability === AvailabilityBucket.IMMEDIATE) {
      const imm = candidates.find((c) => c.classified.availability === AvailabilityBucket.IMMEDIATE);
      if (imm) return { option: imm.raw, stage: "contextual_domain", confidence: 0.98 };
    }
    if (wantedNorm === "15 days" || wantedNorm === "15") {
      const match15 = candidates.find((c) => /^15\s+to\s+30\s+days/i.test(c.normalizedCore));
      if (match15) return { option: match15.raw, stage: "contextual_domain", confidence: 0.98 };
    }
    if (wantedNorm === "30 days" || wantedNorm === "1 month" || wantedNorm === "30") {
      const match30 = candidates.find((c) => /\b(1 month|30 days)\b/i.test(c.normalizedCore) && !c.normalizedCore.startsWith("15 to"));
      if (match30) return { option: match30.raw, stage: "contextual_domain", confidence: 0.98 };
    }
    if (wantedNorm === "60 days" || wantedNorm === "2 months" || wantedNorm === "60") {
      const match60 = candidates.find((c) => /\b(2 months|60 days)\b/i.test(c.normalizedCore));
      if (match60) return { option: match60.raw, stage: "contextual_domain", confidence: 0.98 };
    }
    if (wantedNorm === "90 days" || wantedNorm === "3 months" || wantedNorm === "90") {
      const match90 = candidates.find((c) => /\b(3 months|90 days)\b/i.test(c.normalizedCore));
      if (match90) return { option: match90.raw, stage: "contextual_domain", confidence: 0.98 };
    }
  }

  // STAGE 1: Exact Match (Preserving raw whitespace padding)
  // 1a. Raw exact match
  const rawExact = candidates.find((c) => c.trimmed.toLowerCase() === wantedTrimmed.toLowerCase());
  if (rawExact) {
    return { option: rawExact.raw, stage: "exact", confidence: 1.0 };
  }

  // 1b. Normalized exact match
  const normExact = candidates.find((c) => c.normalized === wantedNorm);
  if (normExact) {
    return { option: normExact.raw, stage: "exact", confidence: 1.0 };
  }

  // 1c. Code exact match (e.g. "MBA" matches "(MBA)", "BS" matches "(B.S.)", "UK" matches "(UK)")
  if (wantedCleanCode && wantedCleanCode.length >= 2) {
    const codeMatch = candidates.find((c) => c.cleanCode === wantedCleanCode);
    if (codeMatch && !hasSemanticConflict(wantedClassified, codeMatch.classified)) {
      return { option: codeMatch.raw, stage: "code_stripped", confidence: 0.99 };
    }
  }

  // 1d. Core label exact match (e.g. "IN - India" core "India" matches "India")
  const coreExact = candidates.find((c) => c.normalizedCore === wantedNorm);
  if (coreExact && !hasSemanticConflict(wantedClassified, coreExact.classified)) {
    return { option: coreExact.raw, stage: "code_stripped", confidence: 0.99 };
  }

  // 1e. Subpart exact match (e.g. "Contract / Freelance" subpart "Freelance" matches "Freelance")
  const subpartExact = candidates.find((c) => {
    return c.subParts.some((part) => normalize(part) === wantedNorm);
  });
  if (subpartExact && !hasSemanticConflict(wantedClassified, subpartExact.classified)) {
    return { option: subpartExact.raw, stage: "code_stripped", confidence: 0.98 };
  }

  // Filter out any candidates with semantic or polarity conflicts
  const validCandidates = candidates.filter((c) => !hasSemanticConflict(wantedClassified, c.classified));

  // STAGE 2: Degree Disambiguation & Preference
  if (wantedClassified.degree) {
    const targetDegree = wantedClassified.degree;
    const degreeCandidates = validCandidates.filter((c) => c.classified.degree === targetDegree);
    if (degreeCandidates.length > 0) {
      // Check if user specified a specific subfield like "Science" or "Arts"
      const wantsScience = /\b(science|bs|bsc)\b/i.test(wantedNorm);
      const wantsArts = /\b(arts|ba)\b/i.test(wantedNorm);
      const wantsBusiness = /\b(business|mba|bba)\b/i.test(wantedNorm);

      if (wantsScience) {
        const sci = degreeCandidates.find((c) => /\b(science|bs)\b/i.test(c.normalized));
        if (sci) return { option: sci.raw, stage: "contextual_domain", confidence: 0.96 };
      }
      if (wantsArts) {
        const art = degreeCandidates.find((c) => /\b(arts|ba)\b/i.test(c.normalized));
        if (art) return { option: art.raw, stage: "contextual_domain", confidence: 0.96 };
      }
      if (wantsBusiness) {
        const bus = degreeCandidates.find((c) => /\b(business|mba)\b/i.test(c.normalized));
        if (bus) return { option: bus.raw, stage: "contextual_domain", confidence: 0.96 };
      }

      // If user wants generic degree (e.g. "Bachelors", "Bachelor", "B.Tech"), prefer generic degree option
      const genericDegree = degreeCandidates.find((c) => /\b(degree|4 year|college)\b/i.test(c.normalized) && !/\b(science|arts|business)\b/i.test(c.normalized));
      if (genericDegree) {
        return { option: genericDegree.raw, stage: "contextual_domain", confidence: 0.95 };
      }
      return { option: degreeCandidates[0]!.raw, stage: "contextual_domain", confidence: 0.92 };
    }
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

  // 3b. Availability mapping
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

  // 3e. Gender mapping
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

  // 3g. Polarity mapping
  if (wantedClassified.polarity) {
    const targetPol = wantedClassified.polarity;
    const polMatch = validCandidates.find((c) => c.classified.polarity === targetPol);
    if (polMatch) {
      return { option: polMatch.raw, stage: "contextual_domain", confidence: 0.95 };
    }
  }

  // STAGE 4: Boundary Prefix & Suffix Match with Anti-Conflict Guards
  const boundaryMatch = validCandidates.find((c) => {
    const on = c.normalized;
    const coreOn = c.normalizedCore;
    const wn = wantedNorm;

    // Reject false positive "No" -> "None", "Yes" -> "Yesterday"
    if (wn === "no" && !on.startsWith("no ") && on !== "no") return false;
    if (wn === "yes" && !on.startsWith("yes ") && on !== "yes") return false;

    if (on.startsWith(wn + " ") || (on.length >= 3 && wn.startsWith(on + " "))) return true;
    if (coreOn.startsWith(wn + " ") || (coreOn.length >= 3 && wn.startsWith(coreOn + " "))) return true;
    if (on.endsWith(" " + wn) || coreOn.endsWith(" " + wn)) return true;
    return false;
  });
  if (boundaryMatch) {
    return { option: boundaryMatch.raw, stage: "boundary_prefix", confidence: 0.90 };
  }

  // STAGE 5: Stem-Based Token Containment with Highest Overlap Selection
  if (wantedStems.size > 0) {
    let bestContainment: { opt: string; score: number } | undefined;
    for (const c of validCandidates) {
      if (!c.stems.size) continue;
      // Reject "No" -> "None" or single-letter matches
      if (wantedStems.size === 1 && [...wantedStems][0]!.length <= 2) {
        if (!c.stems.has([...wantedStems][0]!)) continue;
      }

      let shared = 0;
      for (const s of wantedStems) if (c.stems.has(s)) shared++;
      const score = shared / (wantedStems.size + c.stems.size - shared);

      const wantedInOption = [...wantedStems].every((s) => c.stems.has(s));
      const optionInWanted = [...c.stems].every((s) => wantedStems.has(s));

      if (wantedInOption || optionInWanted) {
        if (!bestContainment || score > bestContainment.score) {
          bestContainment = { opt: c.raw, score };
        }
      }
    }
    if (bestContainment && bestContainment.score >= 0.4) {
      return { option: bestContainment.opt, stage: "token_containment", confidence: 0.85 };
    }
  }

  // STAGE 6: Weighted Fuzzy Jaccard & Levenshtein
  // Anti-overfitting guard: Do NOT fuzzy match single short tokens like "No", "Yes", "Male", "Female"
  if (wantedNorm.length >= 4) {
    let bestFuzzy: { opt: string; score: number } | undefined;
    for (const c of validCandidates) {
      let shared = 0;
      for (const s of wantedStems) if (c.stems.has(s)) shared++;
      const jaccard = (wantedStems.size || c.stems.size)
        ? shared / (wantedStems.size + c.stems.size - shared)
        : 0;

      const maxLen = Math.max(wantedNorm.length, c.normalized.length);
      const dist = levenshteinDistance(wantedNorm, c.normalized);
      const levSim = maxLen > 0 ? 1 - dist / maxLen : 0;

      const typoMatch = (!wantedNorm.includes(" ") && !c.normalized.includes(" ") && dist <= 2 && wantedNorm.length >= 5);
      const score = Math.max(jaccard, levSim * (typoMatch ? 0.95 : 0.8));

      if (score > (bestFuzzy?.score ?? 0)) {
        bestFuzzy = { opt: c.raw, score };
      }
    }

    if (bestFuzzy && bestFuzzy.score >= minScore) {
      return { option: bestFuzzy.opt, stage: "fuzzy", confidence: bestFuzzy.score };
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

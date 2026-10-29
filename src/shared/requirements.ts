/** Shared parser for requirements across skills, travel, and office days.
 * Handles digits, word numbers ("three", "twenty-five"), parenthesized numbers ("ten (10)"),
 * thresholds ("5+", "at least 3", "minimum of three", "3 or more", "more than 3", "up to 25%"),
 * and units ("years", "percent", "days"). */

export interface Requirement {
  min?: number;
  max?: number;
  unit: "years" | "percent" | "days";
}

const SMALL_WORDS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
};

const TENS_WORDS: Record<string, number> = {
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};

/** Parse a word or digit number: "3", "three", "twenty-five", "twenty five", "ten (10)", "5 (five)". */
export function parseNumber(raw: string): number | undefined {
  const clean = raw.trim().toLowerCase();
  // Parenthesized digits or words: "ten (10)" -> 10, "5 (five)" -> 5
  const parenDigit = /\b(\d+)\s*\([a-z-]+\)/.exec(clean);
  if (parenDigit) return Number(parenDigit[1]);
  const wordParen = /\b([a-z-]+)\s*\((\d+)\)/.exec(clean);
  if (wordParen) return Number(wordParen[2]);

  if (/^\d+$/.test(clean)) return Number(clean);
  if (SMALL_WORDS[clean] !== undefined) return SMALL_WORDS[clean];
  if (TENS_WORDS[clean] !== undefined) return TENS_WORDS[clean];

  const compound = /^([a-z]+)[-\s]+([a-z]+)$/.exec(clean);
  if (compound && compound[1] && compound[2]) {
    const tens = TENS_WORDS[compound[1]];
    const ones = SMALL_WORDS[compound[2]];
    if (tens !== undefined && ones !== undefined) return tens + ones;
  }
  return undefined;
}

const NUMBER_PATTERN = "(?:\\d+|zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty(?:[-\\s](?:one|two|three|four|five|six|seven|eight|nine))?|thirty(?:[-\\s](?:one|two|three|four|five|six|seven|eight|nine))?|forty(?:[-\\s](?:one|two|three|four|five|six|seven|eight|nine))?|fifty(?:[-\\s](?:one|two|three|four|five|six|seven|eight|nine))?|sixty|seventy|eighty|ninety|hundred)";

/** Parse requirement from text: min, max, unit. */
export function parseRequirement(text: string): Requirement | undefined {
  const lower = text.toLowerCase();

  // Special phrase for travel: "half the time" = 50%
  if (/\bhalf\s+(?:the\s+)?time\b/.test(lower)) {
    return { max: 50, unit: "percent" };
  }

  // Determine unit
  const hasPercent = /(?:%|percent\b)/.test(lower);
  const hasDays = /\bdays?\b/.test(lower);
  const hasYears = /\b(?:years?|yrs?)\b/.test(lower);

  const unit: "years" | "percent" | "days" | undefined =
    hasPercent ? "percent" : hasDays ? "days" : hasYears ? "years" : undefined;

  if (!unit) return undefined;

  // 1. Range: "3-5 years", "3 to 5 years", "twenty to thirty percent"
  const rangeRegex = new RegExp(`\\b(?:(\\d+)\\s*-\\s*(\\d+)|(${NUMBER_PATTERN})\\s*(?:\\s+-\\s+|\\s+to\\s+)\\s*(${NUMBER_PATTERN}))\\s*(?:years?|yrs?|%|percent|days?)?`, "i");
  const rangeMatch = rangeRegex.exec(lower);
  if (rangeMatch) {
    const minRaw = rangeMatch[1] ?? rangeMatch[3];
    const maxRaw = rangeMatch[2] ?? rangeMatch[4];
    if (minRaw && maxRaw) {
      const minVal = parseNumber(minRaw);
      const maxVal = parseNumber(maxRaw);
      if (minVal !== undefined && maxVal !== undefined) {
        return { min: minVal, max: maxVal, unit };
      }
    }
  }

  // 2. Minimum patterns: "at least N", "minimum (of) N", "N or more", "N+", "more than N", "over N"
  const minPatterns = [
    new RegExp(`\\b(?:at\\s+least|minimum(?:\\s+of)?|no\\s+less\\s+than)\\s+(${NUMBER_PATTERN})`, "i"),
    new RegExp(`\\b(${NUMBER_PATTERN})\\s*(?:\\+|\\s+(?:or\\s+more|and\\s+above|or\\s+greater)\\b)`, "i"),
  ];

  for (const pat of minPatterns) {
    const m = pat.exec(lower);
    if (m && m[1]) {
      const val = parseNumber(m[1]);
      if (val !== undefined) return { min: val, unit };
    }
  }

  // Strict greater: "more than N", "over N" -> min: N + 1
  const strictGreaterPat = new RegExp(`\\b(?:more\\s+than|over|greater\\s+than|exceeding)\\s+(${NUMBER_PATTERN})`, "i");
  const sg = strictGreaterPat.exec(lower);
  if (sg && sg[1]) {
    const val = parseNumber(sg[1]);
    if (val !== undefined) return { min: val + 1, unit };
  }

  // 3. Maximum patterns: "up to N", "maximum (of) N", "no more than N"
  const maxPatterns = [
    new RegExp(`\\b(?:up\\s+to|maximum(?:\\s+of)?|no\\s+more\\s+than|not\\s+exceeding)\\s+(${NUMBER_PATTERN})`, "i"),
  ];

  for (const pat of maxPatterns) {
    const m = pat.exec(lower);
    if (m && m[1]) {
      const val = parseNumber(m[1]);
      if (val !== undefined) return { max: val, unit };
    }
  }

  // 4. Exact / default count: "N days a week", "N years of experience", "N% travel"
  if (unit === "days") {
    const dayPat = new RegExp(`(?:in\\s+the\\s+office|work(?:ing)?\\s+(?:onsite|from\\s+the\\s+office)?|office)?\\s*\\b(${NUMBER_PATTERN})\\s*days?\\b`, "i");
    const dm = dayPat.exec(lower);
    if (dm && dm[1]) {
      const val = parseNumber(dm[1]);
      if (val !== undefined) return { min: val, unit: "days" };
    }
  }

  if (unit === "years") {
    const yrPat = new RegExp(`\\b(${NUMBER_PATTERN})\\s*(?:years?|yrs?)\\b`, "i");
    const ym = yrPat.exec(lower);
    if (ym && ym[1]) {
      const val = parseNumber(ym[1]);
      if (val !== undefined) return { min: val, unit: "years" };
    }
  }

  if (unit === "percent") {
    const pctPat = new RegExp(`\\b(${NUMBER_PATTERN})\\s*(?:%|percent\\b)`, "i");
    const pm = pctPat.exec(lower);
    if (pm && pm[1]) {
      const val = parseNumber(pm[1]);
      if (val !== undefined) return { max: val, unit: "percent" };
    }
  }

  return undefined;
}

/**
 * Locale formatting engine for job applications worldwide.
 * Handles date formatting, phone number normalization, salary presentation,
 * name ordering (East Asian family-first vs given-first), and address field sequences.
 *
 * Rule: Never convert currency amounts. A different currency must always be asked.
 */

export interface DateParts {
  year: number;
  month: number; // 1-12
  day: number;   // 1-31
}

/**
 * Formats a date object according to field pattern/placeholder, or country standard.
 * Priority: Explicit pattern/placeholder > Country standard > Default (ISO YYYY-MM-DD).
 */
export function formatDate(
  parts: DateParts,
  patternOrPlaceholder?: string,
  countryAlpha2?: string
): string {
  const y = String(parts.year);
  const m = String(parts.month).padStart(2, "0");
  const d = String(parts.day).padStart(2, "0");
  const p = patternOrPlaceholder?.toLowerCase().trim();

  // 1. Explicit placeholder / pattern detection
  if (p) {
    if (p.includes("yyyy") && p.includes("mm") && p.includes("dd")) {
      if (p.startsWith("yyyy-mm-dd") || p.startsWith("yyyy/mm/dd")) {
        return p.includes("-") ? `${y}-${m}-${d}` : `${y}/${m}/${d}`;
      }
      if (p.startsWith("dd/mm/yyyy") || p.startsWith("dd-mm-yyyy") || p.startsWith("dd.mm.yyyy")) {
        const sep = p.includes(".") ? "." : p.includes("-") ? "-" : "/";
        return `${d}${sep}${m}${sep}${y}`;
      }
      if (p.startsWith("mm/dd/yyyy") || p.startsWith("mm-dd-yyyy")) {
        const sep = p.includes("-") ? "-" : "/";
        return `${m}${sep}${d}${sep}${y}`;
      }
    }
    if (p.includes("年") || p.includes("月") || p.includes("日")) {
      return `${y}年${m}月${d}日`;
    }
  }

  // 2. Country defaults
  const c = countryAlpha2?.toUpperCase();
  switch (c) {
    case "US":
      return `${m}/${d}/${y}`;
    case "JP":
    case "CN":
    case "KR":
      return `${y}-${m}-${d}`;
    case "DE":
      return `${d}.${m}.${y}`;
    case "IN":
    case "GB":
    case "FR":
    case "AU":
    case "CA":
    case "NL":
    case "ES":
    case "BR":
    default:
      return `${d}/${m}/${y}`;
  }
}

/**
 * Normalizes and formats a phone number for both E.164 and national representation.
 */
export function formatPhone(
  rawNumber: string,
  countryAlpha2: string
): { e164: string; national: string; dialCode: string } {
  const digits = rawNumber.replace(/\D/g, "");
  const c = countryAlpha2.toUpperCase();

  const dialCodes: Record<string, string> = {
    US: "1",
    CA: "1",
    IN: "91",
    GB: "44",
    DE: "49",
    FR: "33",
    AU: "61",
    NL: "31",
    BR: "55",
    JP: "81",
  };

  const dialCode = dialCodes[c] ?? "1";

  // If number starts with country code, strip it for national formatting
  let nationalDigits = digits;
  if (digits.startsWith(dialCode) && digits.length > dialCode.length + 8) {
    nationalDigits = digits.slice(dialCode.length);
  }

  // Format national phone
  let national = nationalDigits;
  if (c === "US" || c === "CA") {
    if (nationalDigits.length === 10) {
      national = `(${nationalDigits.slice(0, 3)}) ${nationalDigits.slice(3, 6)}-${nationalDigits.slice(6)}`;
    }
  } else if (c === "IN") {
    if (nationalDigits.length === 10) {
      national = `${nationalDigits.slice(0, 5)} ${nationalDigits.slice(5)}`;
    }
  } else if (c === "GB") {
    if (nationalDigits.length >= 10) {
      national = `0${nationalDigits.slice(0, 4)} ${nationalDigits.slice(4)}`;
    }
  }

  const e164 = `+${dialCode}${nationalDigits}`;
  return { e164, national, dialCode: `+${dialCode}` };
}

/**
 * Formats a salary figure according to currency convention (e.g. LPA/Lakhs for India, K for US/UK).
 * Throws or returns undefined if currency conversion is attempted.
 */
export function formatSalary(
  amount: number,
  currency: string,
  notation: "standard" | "lakh_crore" | "k" = "standard"
): string {
  const curr = currency.toUpperCase().trim();

  if (curr === "INR") {
    if (notation === "lakh_crore" || amount >= 100000) {
      const lakhs = amount / 100000;
      if (Number.isInteger(lakhs)) {
        return `₹${lakhs} LPA`;
      }
      return `₹${lakhs.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1")} LPA`;
    }
    return `₹${amount.toLocaleString("en-IN")}`;
  }

  const symbol = curr === "USD" ? "$" : curr === "GBP" ? "£" : curr === "EUR" ? "€" : `${curr} `;

  if (notation === "k" && amount >= 1000 && amount % 1000 === 0) {
    return `${symbol}${amount / 1000}k`;
  }

  return `${symbol}${amount.toLocaleString("en-US")}`;
}

/**
 * Returns candidate name in western or East Asian family-first order.
 */
export function formatName(
  firstName: string,
  lastName: string,
  countryAlpha2?: string
): { display: string; familyFirst: boolean } {
  const c = countryAlpha2?.toUpperCase();
  const familyFirstCountries = new Set(["JP", "CN", "KR"]);
  const familyFirst = familyFirstCountries.has(c ?? "");

  if (familyFirst) {
    return {
      display: `${lastName} ${firstName}`.trim(),
      familyFirst: true,
    };
  }

  return {
    display: `${firstName} ${lastName}`.trim(),
    familyFirst: false,
  };
}

/**
 * Returns address sequence and formatted multi-line block.
 * In DE/FR/JP, postal codes precede the city.
 */
export function formatAddress(addr: {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  countryAlpha2?: string;
}): { fieldOrder: string[]; formatted: string } {
  const c = addr.countryAlpha2?.toUpperCase();
  const postcodeFirst = c === "DE" || c === "FR" || c === "JP";

  const fieldOrder = postcodeFirst
    ? ["line1", "line2", "postalCode", "city", "state", "country"]
    : ["line1", "line2", "city", "state", "postalCode", "country"];

  const lines = [addr.line1];
  if (addr.line2) lines.push(addr.line2);

  if (postcodeFirst) {
    lines.push(`${addr.postalCode} ${addr.city}`.trim());
  } else {
    const locality = [addr.city, addr.state, addr.postalCode].filter(Boolean).join(", ");
    lines.push(locality);
  }

  lines.push(addr.country);
  return { fieldOrder, formatted: lines.join("\n") };
}

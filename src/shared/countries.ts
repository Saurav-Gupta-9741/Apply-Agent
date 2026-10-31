/** Which countries a piece of text names ("authorized to work in the U.S.", "sponsorship in the UK"), so one quick
 * answer ("I can work in India without sponsorship") can answer every wording. Ambiguous words are avoided: "us" as
 * in "work for us" is not the United States; only "US" written in capitals, "U.S." or "USA" is. */

import { normalize } from "./text";

const COUNTRIES: Array<[string, RegExp]> = [
  ["India", /\b(india|indian)\b/],
  ["United States", /\b(united states( of america)?|usa|u s a|u s|america|american)\b/],
  ["United Kingdom", /\b(united kingdom|uk|u k|great britain|britain|england|scotland|wales|northern ireland)\b/],
  ["Canada", /\bcanada\b/],
  ["European Union", /\b(european union|eu|eea|europe|schengen)\b/],
  ["Germany", /\b(germany|deutschland|allemagne|alemania|germania)\b/],
  ["France", /\b(france|frankreich|francia)\b/],
  ["Netherlands", /\b(netherlands|holland|nederland|pays bas|paises bajos|paesi bassi)\b/],
  ["Ireland", /\b(ireland|republic of ireland)\b/],
  ["Spain", /\b(spain|espana|spanien|espagne|spagna)\b/],
  ["Italy", /\b(italy|italia|italien|italie)\b/],
  ["Poland", /\bpoland\b/],
  ["Portugal", /\bportugal\b/],
  ["Sweden", /\bsweden\b/],
  ["Switzerland", /\bswitzerland\b/],
  ["Australia", /\baustralia\b/],
  ["New Zealand", /\bnew zealand\b/],
  ["Singapore", /\bsingapore\b/],
  ["Japan", /\bjapan\b/],
  ["United Arab Emirates", /\b(united arab emirates|uae|dubai|abu dhabi)\b/],
  ["Saudi Arabia", /\b(saudi arabia|ksa)\b/],
  ["Israel", /\bisrael\b/],
  ["Brazil", /\b(brazil|brasil|brasilien|bresil|brasile)\b/],
  ["Mexico", /\bmexico\b/],
  ["Philippines", /\bphilippines\b/],
  ["Malaysia", /\bmalaysia\b/],
  ["South Africa", /\bsouth africa\b/],
  ["Austria", /\b(austria|osterreich)\b/],
  ["Belgium", /\b(belgium|belgique|belgien)\b/],
  ["Czechia", /\b(czechia|czech republic)\b/],
  ["Denmark", /\b(denmark|danmark)\b/],
  ["Finland", /\b(finland|suomi)\b/],
  ["Greece", /\b(greece|hellas)\b/],
  ["Hungary", /\b(hungary|magyarorszag)\b/],
  ["Romania", /\bromania\b/],
  ["Slovakia", /\bslovakia\b/],
];

/** EU member states covered by an EU work right (all 27 member states). */
const EU_MEMBERS = new Set([
  "Austria", "Belgium", "Bulgaria", "Croatia", "Cyprus", "Czechia", "Denmark",
  "Estonia", "Finland", "France", "Germany", "Greece", "Hungary", "Ireland",
  "Italy", "Latvia", "Lithuania", "Luxembourg", "Malta", "Netherlands", "Poland",
  "Portugal", "Romania", "Slovakia", "Slovenia", "Spain", "Sweden",
]);

/** Countries named in a text (canonical names), in order of appearance, without duplicates. */
export function countriesIn(raw: string): string[] {
  const text = normalize(raw);
  const found = COUNTRIES.filter(([, pattern]) => pattern.test(text)).map(([name]) => name);
  // "US" in capitals is the country; "us" in "work for us" is not, so it is only read from the original text.
  if (/(^|[^A-Za-z])US([^A-Za-z]|$)/.test(raw) && !found.includes("United States")) found.push("United States");
  // "u s" can come from "work for us" after normalising only if written "u.s."; "us" alone never matched above.
  return [...new Set(found)];
}

/** The countries a user listed ("India, EU") as canonical names. */
export function canonicalCountries(list: string): string[] {
  return list.split(/[,;/]|\band\b/).flatMap((part) => countriesIn(part.trim())).filter((c, i, all) => all.indexOf(c) === i);
}

/** Whether the user may work in a country without sponsorship, given their list (an EU right covers EU members). */
export function canWorkIn(country: string, allowed: string[]): boolean {
  return allowed.includes(country) || (EU_MEMBERS.has(country) && allowed.includes("European Union"));
}

/** Big job-market cities, so "Bengaluru" or "London" in a job's location tells the country. */
const CITIES: Array<[string, RegExp]> = [
  ["India", /\b(bengaluru|bangalore|hyderabad|pune|mumbai|bombay|delhi|new delhi|gurugram|gurgaon|noida|chennai|kolkata|ahmedabad|jaipur|kochi|chandigarh|indore|coimbatore|thiruvananthapuram|trivandrum)\b/],
  ["United States", /\b(new york|nyc|san francisco|seattle|austin|boston|chicago|los angeles|denver|atlanta|washington dc|san jose|palo alto|mountain view|menlo park|sunnyvale|redmond|miami|dallas|houston|philadelphia|pittsburgh|portland|raleigh|redlands)\b/],
  ["United Kingdom", /\b(london|manchester|edinburgh|cambridge uk|bristol|leeds|glasgow|belfast)\b/],
  ["Canada", /\b(toronto|vancouver|montreal|ottawa|calgary|waterloo)\b/],
  ["Germany", /\b(berlin|munich|munchen|hamburg|frankfurt|cologne|koln|dusseldorf|stuttgart)\b/],
  ["France", /\bparis\b/],
  ["Netherlands", /\b(amsterdam|rotterdam|utrecht|eindhoven)\b/],
  ["Ireland", /\bdublin\b/],
  ["Spain", /\b(madrid|barcelona)\b/],
  ["Poland", /\b(warsaw|krakow|wroclaw)\b/],
  ["Singapore", /\bsingapore\b/],
  ["Australia", /\b(sydney|melbourne|brisbane|perth)\b/],
  ["United Arab Emirates", /\b(dubai|abu dhabi)\b/],
  ["Japan", /\b(tokyo|osaka)\b/],
];
const US_STATE = /,\s*(A[LKZR]|C[AOT]|D[EC]|FL|GA|HI|I[ADLN]|K[SY]|LA|M[ADEINOST]|N[CDEHJMVY]|O[HKR]|PA|RI|S[CD]|T[NX]|UT|V[AT]|W[AIVY])\b/;
const CODES: Record<string, string> = {
  IN: "India", US: "United States", USA: "United States", GB: "United Kingdom", UK: "United Kingdom", CA: "Canada", DE: "Germany",
  FR: "France", NL: "Netherlands", IE: "Ireland", ES: "Spain", IT: "Italy", PL: "Poland", PT: "Portugal", SE: "Sweden", CH: "Switzerland",
  AU: "Australia", NZ: "New Zealand", SG: "Singapore", JP: "Japan", AE: "United Arab Emirates", SA: "Saudi Arabia", IL: "Israel",
  BR: "Brazil", MX: "Mexico", PH: "Philippines", MY: "Malaysia", ZA: "South Africa",
};

/** Countries in a job's location text ("Bengaluru, India", "Austin, TX", "Remote - US", "London"). */
export function countriesInLocation(raw: string): string[] {
  const found = countriesIn(raw);
  const text = normalize(raw);
  for (const [country, pattern] of CITIES) if (pattern.test(text) && !found.includes(country)) found.push(country);
  if (US_STATE.test(raw) && !found.includes("United States")) found.push("United States");
  return found;
}

/** All recognized cities and countries in a text. */
export function extractPlacesInText(raw: string): string[] {
  const found: string[] = [];
  const text = normalize(raw);
  for (const [, pattern] of CITIES) {
    const match = pattern.exec(text);
    if (match && match[1]) found.push(match[1]);
  }
  for (const [country, pattern] of COUNTRIES) {
    if (pattern.test(text) && !found.includes(country.toLowerCase())) found.push(country.toLowerCase());
  }
  return found;
}

/** A country given as an ISO code or a name ("IN", "USA", "India"). */
export function countryFromCode(value: string): string | undefined {
  const v = value.trim();
  return CODES[v.toUpperCase()] ?? countriesIn(v)[0];
}

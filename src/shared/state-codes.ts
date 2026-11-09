/** Two-letter codes of US states and Canadian provinces, for option lists that use them ("TX" for Texas; Oura's
 * "State" list, live run 7). Plain data with no imports, so the option matcher can use it without an import cycle. */
const CODES: Record<string, string> = {
  AL: "alabama", AK: "alaska", AZ: "arizona", AR: "arkansas", CA: "california", CO: "colorado", CT: "connecticut", DE: "delaware",
  DC: "district of columbia", FL: "florida", GA: "georgia", HI: "hawaii", ID: "idaho", IL: "illinois", IN: "indiana", IA: "iowa",
  KS: "kansas", KY: "kentucky", LA: "louisiana", ME: "maine", MD: "maryland", MA: "massachusetts", MI: "michigan", MN: "minnesota",
  MS: "mississippi", MO: "missouri", MT: "montana", NE: "nebraska", NV: "nevada", NH: "new hampshire", NJ: "new jersey",
  NM: "new mexico", NY: "new york", NC: "north carolina", ND: "north dakota", OH: "ohio", OK: "oklahoma", OR: "oregon",
  PA: "pennsylvania", RI: "rhode island", SC: "south carolina", SD: "south dakota", TN: "tennessee", TX: "texas", UT: "utah",
  VT: "vermont", VA: "virginia", WA: "washington", WV: "west virginia", WI: "wisconsin", WY: "wyoming", PR: "puerto rico",
  AB: "alberta", BC: "british columbia", MB: "manitoba", NB: "new brunswick", NL: "newfoundland and labrador", NS: "nova scotia",
  ON: "ontario", PE: "prince edward island", QC: "quebec", SK: "saskatchewan",
};
const BY_NAME = new Map(Object.entries(CODES).map(([code, name]) => [name, code]));

/** The code of a US state / Canadian province name ("texas" → "TX"), or undefined. */
export function stateCode(name: string): string | undefined {
  return BY_NAME.get(name.trim().toLowerCase());
}

/** The name of a code ("TX" → "texas"), or undefined. */
export function stateName(code: string): string | undefined {
  return CODES[code.trim().toUpperCase()];
}

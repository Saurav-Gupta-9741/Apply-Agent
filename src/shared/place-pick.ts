/** Picking the user's own city in a location type-ahead (Ashby's "Current Location", Greenhouse's "Location (City)").
 *
 * Live run 7: the saved "Austin, TX" found no option on 9 such lists. They search a places service and answer with
 * their own wording ("Austin, Texas, United States", "Austin, TX, USA"), often only once the city alone is typed. So the
 * city alone is searched too, and an option is taken only when it is clearly the same place: the same city, the user's
 * own state when the option names one, and the user's own country when it names one. "Austin, Minnesota" or
 * "Austin, Manitoba" is never taken for an Austin, Texas user. Pure (no DOM), so tested offline. */

import { canonicalCountries, countriesIn } from "./countries";
import { foldPlace, sameCity } from "./places";
import { REGION_NAMES, stateCode, stateName } from "./state-codes";

export interface Home {
  /** The saved location ("Austin, TX", "Pune, Maharashtra", "London"). */
  location: string;
  /** The saved state or province, when there is one. */
  state?: string;
  /** The saved country. */
  country?: string;
}

/** The city of a saved location: the part before a comma, bracket or dash. */
export function cityOf(location: string): string {
  return (location.split(/[,(/]| - /)[0] ?? "").trim();
}

/** The user's region, folded ("texas", "maharashtra"): the saved state, else what follows the city ("Austin, TX"). */
function regionOf(home: Home): string | undefined {
  const raw = (home.state ?? "").trim() || (home.location.split(",")[1] ?? "").trim();
  if (!raw) return undefined;
  const fromCode = /^[A-Za-z]{2}$/.test(raw) ? stateName(raw) : undefined;
  const folded = foldPlace(fromCode ?? raw);
  // "Austin, USA": the part after the comma is a country, not a region.
  return countriesIn(folded).length ? undefined : folded;
}

/** The user's country, canonical ("United States"): the saved country, else one named in the location. */
function countryOf(home: Home): string | undefined {
  return canonicalCountries(home.country ?? "")[0] ?? countriesIn(home.location)[0];
}

/** Every US state / Canadian province an option names, by full name or as a capitalised two-letter code. */
function regionsIn(original: string): string[] {
  const folded = ` ${foldPlace(original).replace(/[^a-z ]/g, " ").replace(/\s+/g, " ")} `;
  const found = new Set<string>();
  for (const m of original.matchAll(/(?<![A-Za-z])([A-Z]{2})(?![A-Za-z])/g)) {
    const name = stateName(m[1]!);
    if (name) found.add(name);
  }
  for (const name of REGION_NAMES) if (folded.includes(` ${name} `)) found.add(name);
  return [...found];
}

/** Other whole names lists give a country. */
const COUNTRY_NAMES: Record<string, string[]> = {
  "United States": ["united states of america", "usa", "us", "u s a", "u s"],
  "United Kingdom": ["uk", "great britain", "united kingdom of great britain and northern ireland"],
  "United Arab Emirates": ["uae"],
};

/** The option that is clearly the user's own city, or undefined. */
export function pickPlace(labels: string[], home: Home): string | undefined {
  const city = cityOf(home.location);
  if (!city) return undefined;
  const region = regionOf(home);
  const regionCode = region ? stateCode(region) : undefined;
  const country = countryOf(home);
  const scored: Array<{ label: string; score: number }> = [];
  for (const label of labels) {
    const parts = label.split(/,|\s[-–]\s|\s*\(/).map((p) => p.replace(/\)\s*$/, "").trim()).filter(Boolean);
    if (!parts.length || !sameCity(parts[0]!, city)) continue;
    const rest = parts.slice(1).join(", ");
    const restFolded = ` ${foldPlace(rest).replace(/[^a-z ]/g, " ").replace(/\s+/g, " ")} `;
    const regions = regionsIn(rest);
    const countries = canonicalCountries(countriesIn(rest).join(", "));
    const regionHit = !!region && (restFolded.includes(` ${region} `) || (!!regionCode && regions.includes(region)));
    // Another state or province named: another place of the same name.
    if (regions.some((r) => r !== region)) continue;
    if (country && countries.length && !countries.includes(country)) continue;
    const countryHit = !!country && countries.includes(country);
    scored.push({ label, score: 1 + (regionHit ? 2 : 0) + (countryHit ? 1 : 0) });
  }
  if (!scored.length) return undefined;
  const best = Math.max(...scored.map((s) => s.score));
  const top = scored.filter((s) => s.score === best);
  // With a saved region, the option must name it (an "Austin, United States" could be Austin, Minnesota), unless the
  // only state-less option is the city in a country without regions on the list.
  if (region && best < 3) return undefined;
  // Without one, the option must at least name the country, or be the only city of that name on the list.
  if (!region && best < 2 && scored.length > 1) return undefined;
  if (!region && best < 2 && !country) return undefined;
  return top[0]!.label;
}

/** What to type into a location type-ahead after the saved value itself: the city with its state's full name
 * ("Austin, Texas"), then the city alone ("Austin"). */
export function placeQueries(home: Home): string[] {
  const city = cityOf(home.location);
  if (!city) return [];
  const region = regionOf(home);
  const pretty = region ? region.replace(/\b[a-z]/g, (c) => c.toUpperCase()) : undefined;
  const country = countryOf(home);
  return [...new Set([pretty ? `${city}, ${pretty}` : "", city, country ?? ""].filter((q) => q && q !== home.location))];
}

/** The list's choice for a saved location: the user's own city when the list names places, else (a short list of
 * offices or regions with no option of the same city name) the ordinary best match. An option of the same city name
 * that is not clearly the user's place is never taken. */
export function placeOption(labels: string[], home: Home, best: (labels: string[]) => string | undefined): string | undefined {
  const own = pickPlace(labels, home);
  if (own) return own;
  const city = cityOf(home.location);
  if (labels.some((l) => sameCity(cityOf(l), city))) return undefined;
  // A list of countries only (Ashby "Location" on Paddle and ElevenLabs, live round 8): the user's own country.
  const country = countryOf(home);
  const countryOnly = labels.filter((l) => !/[,(]/.test(l) && l.trim().split(/\s+/).length <= 5 && canonicalCountries(l)[0] === country);
  // "United States" before "US Virgin Islands" and "United States Minor Outlying Islands" (Ashby, live round 8).
  const exact = countryOnly.filter((l) => foldPlace(l) === foldPlace(country ?? "") || (COUNTRY_NAMES[country ?? ""] ?? []).includes(foldPlace(l)));
  if (country && exact.length >= 1 && new Set(exact).size === 1) return exact[0];
  if (country && countryOnly.length === 1) return countryOnly[0];
  return best(labels);
}

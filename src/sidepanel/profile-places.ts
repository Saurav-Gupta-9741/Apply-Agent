/** Profile location as linked pickers: Country → State / Province → City. Each field keeps a suggestion list
 * (a datalist, so any real place can still be typed); the State list follows the country and the City list follows
 * the state. Changing the country (or the state) clears a state or city that belongs elsewhere, with a short note,
 * so a wrong combination is never kept silently. The saved keys and formats (country, state, location) are
 * unchanged, so form filling reads them as before. */

import { KNOWN_CITIES } from "../shared/city-check";
import { countriesInLocation } from "../shared/countries";
import { canonicalCountry, canonicalState, countryCode, statesFor } from "../shared/profile-validate";
import { PLACE_COUNTRIES, citiesIn, countriesOfCity, statesOfCity } from "../shared/places";

export interface PlaceValues {
  country: string;
  state: string;
  location: string;
}

export interface PlaceFix {
  /** Fields to empty: "state" and/or "location" (the City field). */
  clear: Array<"state" | "location">;
  /** What was cleared and why, for the user. */
  note: string;
}

const quoted = (v: string) => `"${v.trim()}"`;

/** City suggestions: the chosen state's cities, else the country's, else the common job-market cities (for a
 * country without lists, only those in that country). */
export function citySuggestions(country: string, state: string): string[] {
  const iso = countryCode(country);
  if (!iso) return KNOWN_CITIES;
  const st = canonicalState(country, state);
  const listed = citiesIn(iso, st);
  if (listed.length) return listed;
  if (st) return citiesIn(iso);
  return KNOWN_CITIES.filter((c) => countriesInLocation(c).some((name) => countryCode(name) === iso));
}

/** True when the typed city is known to be somewhere else than this country (ISO code). Unknown cities are kept. */
function cityElsewhere(iso: string, city: string): boolean {
  const listed = countriesOfCity(city);
  if (listed.length) return !listed.includes(iso);
  const named = countriesInLocation(city).map((name) => countryCode(name)).filter((c): c is string => !!c);
  return named.length > 0 && !named.includes(iso);
}

/** After the country changes: the state and city that do not belong to the new country. Nothing while the country
 * is not (yet) a real one. */
export function fixForCountry(v: PlaceValues): PlaceFix | undefined {
  const iso = countryCode(v.country);
  if (!iso) return undefined;
  const clear: PlaceFix["clear"] = [];
  const parts: string[] = [];
  const state = v.state.trim();
  if (state && !canonicalState(v.country, state)) {
    // A state of another country (by name or code), or any unknown state where this country's states are known.
    const otherCountry = PLACE_COUNTRIES.some((c) => c !== iso && canonicalState(c, state));
    if (statesFor(v.country).length || otherCountry) {
      clear.push("state");
      parts.push(`State ${quoted(state)}`);
    }
  }
  const city = v.location.trim();
  if (city && cityElsewhere(iso, city)) {
    clear.push("location");
    parts.push(`City ${quoted(city)}`);
  }
  if (!clear.length) return undefined;
  const they = parts.length > 1 ? "they are" : "it is";
  const them = parts.length > 1 ? "them" : "it";
  return { clear, note: `Cleared ${parts.join(" and ")} because ${they} not in ${canonicalCountry(v.country)}. You can type ${them} again.` };
}

/** After the state changes: the city, when it was in the old state and is not in the new one. A city typed before
 * any state was chosen is left alone (the City note flags a mismatch instead). */
export function fixForState(v: PlaceValues, previousState: string): PlaceFix | undefined {
  const iso = countryCode(v.country);
  const city = v.location.trim();
  if (!iso || !city) return undefined;
  const next = canonicalState(v.country, v.state);
  const prev = canonicalState(v.country, previousState);
  if (!next || !prev || next === prev) return undefined;
  const states = statesOfCity(iso, city);
  if (!states.includes(prev) || states.includes(next)) return undefined;
  return { clear: ["location"], note: `Cleared City ${quoted(city)} because it is not in ${next}. You can type it again.` };
}

// --- The Profile form ---------------------------------------------------------------------------------------

const input = (name: string) => document.querySelector<HTMLInputElement>(`#profile-form input[name='${name}']`);
const read = (): PlaceValues => ({ country: input("country")?.value ?? "", state: input("state")?.value ?? "", location: input("location")?.value ?? "" });

/** The country and state as last committed (to tell what a change replaced). */
let committed = { country: "", state: "" };

function fillDatalist(id: string, values: readonly string[]): void {
  let list = document.getElementById(id);
  if (!list) {
    list = document.createElement("datalist");
    list.id = id;
    document.body.append(list);
  }
  list.replaceChildren(...values.map((value) => Object.assign(document.createElement("option"), { value })));
}

/** Points the State and City suggestion lists at the chosen country and state. */
export function refreshPlaceLists(): void {
  const v = read();
  fillDatalist("state-list", statesFor(v.country));
  fillDatalist("city-suggestions", citySuggestions(v.country, v.state));
}

/** Called after the Profile form is drawn: remembers the saved places, adds the note line under City, fills the lists. */
export function mountPlaces(): void {
  const v = read();
  committed = { country: v.country, state: v.state };
  const cityField = input("location")?.closest("label");
  if (cityField && !document.getElementById("place-note")) {
    const note = document.createElement("span");
    note.id = "place-note";
    note.className = "field-note warn span-2";
    note.setAttribute("role", "status");
    cityField.after(note);
  }
  refreshPlaceLists();
}

/** The user committed a new country or state: clears what no longer belongs, explains it, refreshes the lists.
 * Returns the cleared field names. */
export function linkPlaces(changed: "country" | "state"): string[] {
  const v = read();
  const fix = changed === "country" ? fixForCountry(v) : fixForState(v, committed.state);
  const note = document.getElementById("place-note");
  if (note) note.textContent = fix?.note ?? "";
  for (const key of fix?.clear ?? []) {
    const el = input(key);
    if (el) el.value = "";
  }
  const after = read();
  committed = { country: after.country, state: after.state };
  refreshPlaceLists();
  return fix?.clear ?? [];
}

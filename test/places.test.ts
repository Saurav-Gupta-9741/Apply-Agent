// Profile location as linked pickers (Country → State → City): the offline place data, the pure linking rules, and
// the Profile form wiring (datalists, clearing a state / city that belongs elsewhere, the note under City).
import { statSync } from "node:fs";
import { beforeEach, describe, expect, test } from "vitest";
import { citySuggestion, KNOWN_CITIES } from "../src/shared/city-check";
import { statesFor, validateProfile } from "../src/shared/profile-validate";
import {
  PLACE_COUNTRIES, citiesIn, countriesOfCity, foldPlace, isListedCity, placeStates, sameCity, statesOfCity,
} from "../src/shared/places";
import { citySuggestions, fixForCountry, fixForState, linkPlaces, mountPlaces, refreshPlaceLists } from "../src/sidepanel/profile-places";

const issue = (values: Record<string, string>, key: string) => validateProfile(values, new Date("2026-11-04")).find((i) => i.key === key);

describe("place data", () => {
  test("every state / province / territory of India, US, Canada, Australia and UK has a city list, and only those", () => {
    for (const iso of PLACE_COUNTRIES) {
      expect(placeStates(iso).slice().sort()).toEqual(statesFor(iso).slice().sort());
      for (const state of placeStates(iso)) expect(citiesIn(iso, state).length, `${iso} ${state}`).toBeGreaterThan(0);
    }
    expect(placeStates("IN")).toHaveLength(36); // 28 states + 8 union territories
    expect(placeStates("US")).toHaveLength(56); // 50 states + DC + 5 territories
    expect(placeStates("CA")).toHaveLength(13);
    expect(placeStates("AU")).toHaveLength(8);
    expect(placeStates("GB")).toHaveLength(4);
  });

  test("India lists its 100k+ cities in the right states", () => {
    const where: Array<[string, string]> = [
      ["Bengaluru", "Karnataka"], ["Mysuru", "Karnataka"], ["Hubballi", "Karnataka"], ["Pune", "Maharashtra"],
      ["Nagpur", "Maharashtra"], ["Jodhpur", "Rajasthan"], ["Jaipur", "Rajasthan"], ["Bhilwara", "Rajasthan"],
      ["Lucknow", "Uttar Pradesh"], ["Rampur", "Uttar Pradesh"], ["Coimbatore", "Tamil Nadu"], ["Hyderabad", "Telangana"],
      ["Visakhapatnam", "Andhra Pradesh"], ["Kochi", "Kerala"], ["Indore", "Madhya Pradesh"], ["Gurugram", "Haryana"],
      ["Bhubaneswar", "Odisha"], ["Guwahati", "Assam"], ["Patna", "Bihar"], ["Ranchi", "Jharkhand"], ["Raipur", "Chhattisgarh"],
      ["Dehradun", "Uttarakhand"], ["Ludhiana", "Punjab"], ["Surat", "Gujarat"], ["Kolkata", "West Bengal"], ["Srinagar", "Jammu and Kashmir"],
    ];
    for (const [city, state] of where) expect(statesOfCity("IN", city), city).toContain(state);
    expect(citiesIn("IN").length).toBeGreaterThan(450);
  });

  test("other countries list their major cities per state", () => {
    expect(statesOfCity("US", "Austin")).toEqual(["Texas"]);
    expect(statesOfCity("US", "Seattle")).toEqual(["Washington"]);
    expect(statesOfCity("US", "Washington DC")).toEqual(["District of Columbia"]);
    expect(statesOfCity("CA", "Toronto")).toEqual(["Ontario"]);
    expect(statesOfCity("CA", "Montréal")).toEqual(["Quebec"]);
    expect(statesOfCity("AU", "Melbourne")).toEqual(["Victoria"]);
    expect(statesOfCity("GB", "Edinburgh")).toEqual(["Scotland"]);
    expect(statesOfCity("GB", "Bangor").sort()).toEqual(["Northern Ireland", "Wales"]);
    expect(countriesOfCity("London").sort()).toEqual(["CA", "GB"]); // London, Ontario too
    expect(countriesOfCity("Portland")).toEqual(["US"]);
  });

  test("city lists are A to Z without duplicates", () => {
    for (const iso of PLACE_COUNTRIES) {
      const all = citiesIn(iso);
      expect(new Set(all).size).toBe(all.length);
      expect(all).toEqual(all.slice().sort((a, b) => a.localeCompare(b)));
    }
  });

  test("spelling variants are the same place (saved profiles keep working)", () => {
    expect(sameCity("Bangalore", "Bengaluru")).toBe(true);
    expect(sameCity("Gurgaon", "Gurugram")).toBe(true);
    expect(sameCity("Bombay", "Mumbai")).toBe(true);
    expect(sameCity("Mysore", "Mysuru")).toBe(true);
    expect(sameCity("Pune", "Mumbai")).toBe(false);
    for (const old of ["Bangalore", "Gurgaon", "Bombay", "Calcutta", "Madras", "Trivandrum", "Cochin", "Allahabad"]) expect(isListedCity(old), old).toBe(true);
    expect(statesOfCity("IN", "Bangalore")).toEqual(["Karnataka"]);
    expect(statesOfCity("IN", "Pune, Maharashtra")).toEqual(["Maharashtra"]);
    expect(statesOfCity("IN", "Bengaluru (Hybrid)")).toEqual(["Karnataka"]);
    expect(foldPlace("St. John's")).toBe(foldPlace("Saint Johns"));
    expect(isListedCity("Pimpri Chinchwad")).toBe(true);
    expect(isListedCity("Smallville")).toBe(false);
  });

  test("the data file stays small", () => {
    expect(statSync("src/shared/places.ts").size).toBeLessThan(250 * 1024);
  });
});

describe("linking rules", () => {
  test("State and City suggestions follow the country and state", () => {
    const karnataka = citySuggestions("India", "Karnataka");
    expect(karnataka).toContain("Mysuru");
    expect(karnataka).not.toContain("Pune");
    expect(citySuggestions("India", "KA")).toContain("Bengaluru"); // a state code works too
    const india = citySuggestions("India", "");
    expect(india).toEqual(expect.arrayContaining(["Pune", "Mysuru", "Jodhpur"]));
    const germany = citySuggestions("Germany", "Bavaria");
    expect(germany).toContain("Munich");
    expect(germany).not.toContain("Bengaluru");
    expect(citySuggestions("", "")).toEqual(KNOWN_CITIES);
    expect(citySuggestions("Wakanda", "")).toEqual(KNOWN_CITIES);
  });

  test("a new country clears a state and city of another country, with a note", () => {
    const fix = fixForCountry({ country: "Germany", state: "Karnataka", location: "Bengaluru" });
    expect(fix?.clear).toEqual(["state", "location"]);
    expect(fix?.note).toBe('Cleared State "Karnataka" and City "Bengaluru" because they are not in Germany. You can type them again.');
    expect(fixForCountry({ country: "United States", state: "Karnataka", location: "" })?.clear).toEqual(["state"]);
    expect(fixForCountry({ country: "India", state: "", location: "Berlin" })?.clear).toEqual(["location"]);
    expect(fixForCountry({ country: "India", state: "Maharashtra", location: "Seattle" })?.note).toContain('City "Seattle"');
  });

  test("a new country keeps what belongs to it and anything unknown", () => {
    expect(fixForCountry({ country: "India", state: "Karnataka", location: "Bangalore" })).toBeUndefined();
    expect(fixForCountry({ country: "india", state: "ka", location: "Pune, Maharashtra" })).toBeUndefined();
    expect(fixForCountry({ country: "Canada", state: "Ontario", location: "London" })).toBeUndefined();
    expect(fixForCountry({ country: "Germany", state: "Bavaria", location: "Munich" })).toBeUndefined();
    expect(fixForCountry({ country: "Kenya", state: "Nairobi County", location: "Nairobi" })).toBeUndefined();
    expect(fixForCountry({ country: "India", state: "", location: "Smallville" })).toBeUndefined(); // never blocks a real place
    expect(fixForCountry({ country: "Wakanda", state: "Karnataka", location: "Bengaluru" })).toBeUndefined(); // not a country yet
  });

  test("a new state clears a city of the old state; a city typed first is left alone", () => {
    const fix = fixForState({ country: "India", state: "Karnataka", location: "Pune" }, "Maharashtra");
    expect(fix?.clear).toEqual(["location"]);
    expect(fix?.note).toBe('Cleared City "Pune" because it is not in Karnataka. You can type it again.');
    expect(fixForState({ country: "India", state: "Karnataka", location: "Pune" }, "")).toBeUndefined();
    expect(fixForState({ country: "India", state: "Karnataka", location: "Mysore" }, "Maharashtra")).toBeUndefined();
    expect(fixForState({ country: "India", state: "Karnataka", location: "Smallville" }, "Maharashtra")).toBeUndefined();
    expect(fixForState({ country: "India", state: "KA", location: "Bengaluru" }, "Karnataka")).toBeUndefined();
    expect(fixForState({ country: "India", state: "Bihar", location: "Aurangabad" }, "Maharashtra")).toBeUndefined(); // both have one
  });
});

describe("Profile checks with the place lists", () => {
  test("a listed city is not 'corrected' to a nearby big city; real typos still are", () => {
    expect(citySuggestion("Rampur")).toBeUndefined(); // not a typo of Raipur
    expect(citySuggestion("Davanagere")).toBeUndefined();
    expect(citySuggestion("Banglore")).toMatch(/Bangalore|Bengaluru/);
    expect(citySuggestion("Hyderbad")).toBe("Hyderabad");
  });

  test("a city of another state or country is flagged (amber), never blocked", () => {
    const state = issue({ country: "India", state: "Karnataka", location: "Pune" }, "location");
    expect(state?.level).toBe("warn");
    expect(state?.text).toBe("Pune is in Maharashtra, but your state is Karnataka. Check both.");
    expect(issue({ country: "United States", location: "Mysuru" }, "location")?.text).toContain("is in India");
    expect(issue({ country: "India", state: "Karnataka", location: "Bangalore" }, "location")).toBeUndefined();
    expect(issue({ country: "India", state: "Karnataka", location: "Smallville" }, "location")).toBeUndefined();
    expect(issue({ country: "United Kingdom", location: "Perth" }, "location")).toBeUndefined(); // Perth, Scotland
    expect(issue({ location: "London", country: "India" }, "location")?.level).toBe("warn");
  });
});

describe("Profile form wiring", () => {
  const field = (name: string) => document.querySelector<HTMLInputElement>(`#profile-form input[name='${name}']`)!;
  const options = (id: string) => [...document.querySelectorAll<HTMLOptionElement>(`#${id} option`)].map((o) => o.value);

  beforeEach(() => {
    document.body.innerHTML = `<form id="profile-form"><div class="form-grid">
      <label class="field-label">Country <input name="country" value="India" /></label>
      <label class="field-label">State / Province <input name="state" value="Maharashtra" /></label>
      <label class="field-label">City <input name="location" value="Pune" /></label>
    </div></form>`;
    mountPlaces();
  });

  test("lists follow the saved country and state; a note line sits under City", () => {
    expect(options("state-list")).toContain("Karnataka");
    expect(options("city-suggestions")).toContain("Nagpur");
    expect(options("city-suggestions")).not.toContain("Mysuru");
    const note = document.getElementById("place-note")!;
    expect(note.getAttribute("role")).toBe("status");
    expect(field("location").closest("label")!.nextElementSibling).toBe(note);
  });

  test("choosing another state clears the city and explains it; the City list follows", () => {
    field("state").value = "Karnataka";
    expect(linkPlaces("state")).toEqual(["location"]);
    expect(field("location").value).toBe("");
    expect(document.getElementById("place-note")!.textContent).toContain('Cleared City "Pune"');
    expect(options("city-suggestions")).toContain("Mysuru");
  });

  test("choosing another country clears both; the State list follows; the note goes when nothing is cleared", () => {
    field("country").value = "Australia";
    expect(linkPlaces("country")).toEqual(["state", "location"]);
    expect(field("state").value).toBe("");
    expect(options("state-list")).toContain("New South Wales");
    field("state").value = "Victoria";
    refreshPlaceLists();
    expect(options("city-suggestions")).toContain("Melbourne");
    field("location").value = "Melbourne";
    expect(linkPlaces("state")).toEqual([]);
    expect(document.getElementById("place-note")!.textContent).toBe("");
  });
});

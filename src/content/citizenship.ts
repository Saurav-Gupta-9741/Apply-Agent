/** Citizenship questions, answered from the user's saved citizenship (Quick answers → "Countries you are a citizen
 * of", and permanent residence such as a US green card).
 *
 * Live run 7 (a US candidate on 225 real forms) left these to the user every time: "Citizenship Status", "In which
 * country/region do you have citizenship?", "Are you a US citizen or lawful permanent resident?", "Please indicate
 * whether you are a 'U.S. person'", "Are you a current citizen of Russia, Syria, Iran, or North Korea?". Being allowed
 * to work in a country does not make anyone its citizen, so nothing here is derived from the work countries; only the
 * user's own saved citizenship is used. Follow-ups ("If Other, please explain"), history questions ("Since obtaining
 * your most recent citizenship…", "Have you ever held…") and anything unclear stay with the user. */

import { canonicalCountries, countriesIn } from "../shared/countries";
import { bestOption, normalize, yesNoOption } from "../shared/text";
import type { Decision, FieldDescriptor, Profile } from "../shared/types";
import type { PageFacts } from "./facts";

const ABOUT_CITIZENSHIP = /\bcitizen(ship)?s?\b|\bnationalit(y|ies)\b|\bu ?s person\b|\bgreen card\b|\bpermanent resident\b/;
/** A follow-up, an explanation, a history or a comparison: the user's own words. */
const NOT_PLAIN = /\b(if|explain|describe|specify|elaborate|since|afterwards|previous(ly)?|former(ly)?|ever|renounc\w*|other than|apart from|besides|acquired|obtain\w*|date|when|year|how long|parents?|spouse|family)\b/;
const EU = new Set(["Austria", "Belgium", "Bulgaria", "Croatia", "Cyprus", "Czechia", "Denmark", "Estonia", "Finland", "France", "Germany", "Greece", "Hungary", "Ireland", "Italy", "Latvia", "Lithuania", "Luxembourg", "Malta", "Netherlands", "Poland", "Portugal", "Romania", "Slovakia", "Slovenia", "Spain", "Sweden"]);

/** How nationality lists name a country's people ("Indian", "American"). */
const DEMONYM: Record<string, string> = {
  India: "Indian", "United States": "American", "United Kingdom": "British", Canada: "Canadian", Germany: "German",
  France: "French", Netherlands: "Dutch", Ireland: "Irish", Spain: "Spanish", Italy: "Italian", Poland: "Polish",
  Portugal: "Portuguese", Sweden: "Swedish", Switzerland: "Swiss", Australia: "Australian", "New Zealand": "New Zealander",
  Singapore: "Singaporean", Japan: "Japanese", Israel: "Israeli", Brazil: "Brazilian", Mexico: "Mexican",
  Philippines: "Filipino", Malaysia: "Malaysian", "South Africa": "South African", Austria: "Austrian", Belgium: "Belgian",
};

interface Mine {
  citizen: string[];
  resident: string[];
  workCountries: string[];
}

/** Saved countries by their canonical names; a name ApplyAgent does not know ("Russia") is kept as typed. */
function countryList(raw: string): string[] {
  return [...new Set(raw.split(/[,;/]|\band\b/).map((s) => s.trim()).filter(Boolean).map((s) => canonicalCountries(s)[0] ?? s))];
}

function mineOf(profile: Profile): Mine | undefined {
  const citizen = countryList(profile.facts?.citizenship ?? "");
  if (!citizen.length) return undefined;
  return {
    citizen,
    resident: countryList(profile.facts?.permanentResidence ?? ""),
    workCountries: canonicalCountries(profile.facts?.workCountries ?? ""),
  };
}

/** True when the text names this country (by any name ApplyAgent knows, its people's name, or as an EU member). */
function names(text: string, country: string): boolean {
  const found = countriesIn(text);
  if (found.includes(country) || (EU.has(country) && found.includes("European Union"))) return true;
  const n = ` ${normalize(text)} `;
  return n.includes(` ${normalize(country)} `) || (!!DEMONYM[country] && n.includes(` ${normalize(DEMONYM[country]!)} `));
}

/** Yes/No in the list's own words (also "I am a U.S. person" / "I am not a U.S. person"). */
function yesNo(field: FieldDescriptor, yes: boolean): string | undefined {
  const raw = yes ? "Yes" : "No";
  if (!field.options.length) return ["select", "combobox", "dropdown", "radio", "text"].includes(field.control) ? raw : undefined;
  const plain = yesNoOption(field.options, raw);
  if (plain) return plain;
  if (field.options.length !== 2) return undefined;
  const negative = field.options.filter((o) => /\b(not|non|no)\b/i.test(o));
  if (negative.length !== 1) return undefined;
  return yes ? field.options.find((o) => o !== negative[0]) : negative[0];
}

const answer = (value: string): Decision => ({ kind: "answer", value, question: "Quick answers › citizenship", source: "citizenship" });

/** The countries a question is about: named in it, or the job's own country when it says "this country". */
function placesOf(label: string, page?: PageFacts): string[] {
  const named = countriesIn(label);
  if (named.length) return named;
  if (/\b(this|the same|that) country\b|\bcountry (where|in which) (the |this )?(job|role|position)\b|\bcountry of (this|the) (job|role|position)\b/.test(normalize(label))) {
    return page?.jobCountries.length === 1 ? page.jobCountries : [];
  }
  return [];
}

export function citizenshipAnswer(field: FieldDescriptor, profile: Profile, page?: PageFacts): Decision | undefined {
  if (field.control === "textarea" || field.control === "file" || field.control === "checkbox_group" || field.control === "checkbox") return undefined;
  const q = normalize(field.label);
  if (!ABOUT_CITIZENSHIP.test(q) || NOT_PLAIN.test(q)) return undefined;
  // Two questions in one label: the user's.
  if ((field.label.match(/\?/g) ?? []).length > 1) return undefined;
  const mine = mineOf(profile);
  if (!mine) return undefined;

  // "U.S. person": a US citizen or national, a lawful permanent resident, or a refugee or asylee there.
  if (/\bu ?s person\b/.test(q)) {
    const us = mine.citizen.includes("United States") || mine.resident.includes("United States");
    // Refugees and asylees may work in the US: without US work rights the user is none of them.
    if (!us && mine.workCountries.includes("United States")) return undefined;
    // Some forms widen it (Monzo: "born in the US", "a parent born in the US", "a US tax resident"): facts ApplyAgent
    // does not hold, so only a Yes is certain (live round 8).
    if (!us && /\b(born|birth|parents?|tax|taxes|green card holder|substantial presence)\b/.test(normalize(`${field.label} ${field.hint ?? ""}`))) return undefined;
    const v = yesNo(field, us);
    return v ? answer(v) : undefined;
  }

  const yesNoAsk = /^(are|is|do|does|have|has|were)\b/.test(q);
  const statusList = field.options.length > 2 && field.options.some((o) => /citizen/i.test(o));

  // "Citizenship Status": U.S. Citizen / Permanent Resident / Visa holder / Other.
  if (statusList && !yesNoAsk) {
    const all = `${field.label} ${field.options.join(" ")}`;
    const places = countriesIn(all).filter((c) => c !== "European Union");
    const country = places.length === 1 ? places[0]! : page?.jobCountries.length === 1 ? page.jobCountries[0]! : undefined;
    if (!country) return undefined;
    const positive = (o: string) => !/\b(non|not)\b/i.test(o);
    if (mine.citizen.includes(country)) {
      const opts = field.options.filter((o) => /\b(citizen|national)\b/i.test(o) && positive(o) && !/permanent|green card|resident/i.test(o));
      return opts.length === 1 ? answer(opts[0]!) : undefined;
    }
    if (mine.resident.includes(country)) {
      const opts = field.options.filter((o) => /permanent resident|green card|\blpr\b/i.test(o) && positive(o));
      return opts.length === 1 ? answer(opts[0]!) : undefined;
    }
    // Neither: which visa or permit is the user's to say, unless the list has a single "not a citizen" choice and
    // nothing about visas or permits.
    const non = field.options.filter((o) => /\b(non|not a)\b[\s.-]*(u ?s\.? |us )?citizen/i.test(o));
    const visa = field.options.some((o) => /visa|permit|authori[sz]|h ?1 ?b|opt|other|refugee|asyl/i.test(o));
    return non.length === 1 && !visa ? answer(non[0]!) : undefined;
  }

  // "Country of citizenship", "Nationality", "In which country/region do you have citizenship?"
  const countryAsk = !yesNoAsk && (/\b(country|countries|country region|region)\b/.test(q) || /^(citizenship|nationality|citizenship country|country of citizenship|current citizenship|citizenships?)$/.test(q));
  if (countryAsk) {
    if (/\bdual\b|\ball\b|\blist\b|\bcountries\b/.test(q) && mine.citizen.length > 1 && !field.options.length) return answer(mine.citizen.join(", "));
    if (mine.citizen.length !== 1) return undefined;
    const c = mine.citizen[0]!;
    if (!field.options.length) {
      // A combobox searches its own list; a text box takes the country's name.
      return ["text", "combobox"].includes(field.control) ? answer(c) : undefined;
    }
    const pick = bestOption(field.options, c) ?? (DEMONYM[c] ? bestOption(field.options, DEMONYM[c]!) : undefined);
    return pick ? answer(pick) : undefined;
  }

  if (!yesNoAsk) return undefined;

  // "Do you hold dual citizenship?"
  if (/\b(dual|multiple|more than one) (citizenship|nationalit)/.test(q)) {
    const v = yesNo(field, mine.citizen.length > 1);
    return v ? answer(v) : undefined;
  }

  // "Are you a US citizen?", "…citizen or lawful permanent resident?", "Are you a citizen of Russia, Syria, Iran, or
  // North Korea?", "Are you a citizen of this country?"
  if (/\b(any|another|other|which|what)\b/.test(q)) return undefined;
  const residentToo = /\bpermanent resident|green card|\blpr\b/.test(q);
  const places = placesOf(field.label, page);
  const listed = /\bcitizens? (of|in)\b/.test(q) && /\b(citizens? (of|in)) [A-Z]/.test(field.label);
  if (!places.length && !listed) return undefined;
  const hit = mine.citizen.some((c) => names(field.label, c) || places.includes(c) || (EU.has(c) && places.includes("European Union")))
    || (residentToo && mine.resident.some((c) => names(field.label, c) || places.includes(c)));
  if (!hit) {
    // "…citizen, permanent resident, refugee or asylee, or visa holder?": other statuses mean work rights there; a
    // No is safe only where the user has none.
    const otherStatus = /\b(refugee|asyl\w*|protected|visa|permit|temporary resident|authori[sz]ed)\b/.test(q);
    if (otherStatus && places.some((p) => mine.workCountries.includes(p))) return undefined;
  }
  const v = yesNo(field, hit);
  return v ? answer(v) : undefined;
}

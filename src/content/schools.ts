/** School names in a searchable list (Greenhouse's School box and the like). A school is one exact institution:
 * "IIT Jodhpur" is "Indian Institute of Technology Jodhpur", but never "… Delhi", and a bare "Indian Institute of
 * Technology" is no campus at all. So only the same name, after expanding well-known short forms, counts. */

const SHORT_FORMS: [RegExp, string][] = [
  [/\biiit\b/g, "indian institute of information technology"],
  [/\biiser\b/g, "indian institute of science education and research"],
  [/\biisc\b/g, "indian institute of science"],
  [/\biit\b/g, "indian institute of technology"],
  [/\bnit\b/g, "national institute of technology"],
  [/\biim\b/g, "indian institute of management"],
  [/\bbits\b/g, "birla institute of technology and science"],
  [/\buniv\b/g, "university"],
  [/\binst\b/g, "institute"],
  [/&/g, " and "],
];

/** A school name reduced to what identifies it: lower case, no dots or punctuation, short forms spelled out, no
 * "(IIT)"-style asides, no "campus" or a trailing country. */
export function schoolKey(raw: string): string {
  let s = ` ${raw.toLowerCase().replace(/\([^)]*\)/g, " ").replace(/\./g, "")} `;
  s = s.replace(/[^a-z0-9& ]+/g, " ");
  for (const [short, full] of SHORT_FORMS) s = s.replace(short, full);
  return s.replace(/\b(the|campus)\b/g, " ").replace(/\s+/g, " ").trim().replace(/ india$/, "");
}

/** The listed option that is this school, when exactly one is. */
export function pickSchool(labels: string[], value: string): string | undefined {
  const want = schoolKey(value);
  if (!want) return undefined;
  const hits = labels.filter((label) => schoolKey(label) === want);
  return hits.length === 1 ? hits[0] : undefined;
}

const GENERIC = new Set(["university", "institute", "college", "school", "technology", "science", "sciences", "engineering",
  "management", "indian", "national", "international", "of", "and", "for", "information", "education", "research", "state"]);

/** What to type into the search box, in order: the name as saved, the name with short forms spelled out, then its most
 * distinctive word (a city or a proper name: "Jodhpur"), which lists every school that carries it. */
export function schoolQueries(value: string): string[] {
  const full = schoolKey(value);
  const distinctive = full.split(" ").filter((w) => w.length >= 4 && !GENERIC.has(w)).sort((a, b) => b.length - a.length)[0];
  return [...new Set([value.trim(), full, distinctive ?? ""].filter(Boolean))];
}

/** Matching jobs to a person, fully on this computer. Nothing about the person or the jobs is sent anywhere.
 *
 * The score (0-100) has four parts, each shown to the user with its reason:
 *   Role 40       the job title against the roles they want (or, if they set none, roles read from their profile)
 *   Skills 25     their skills found in the job's own description; skills the job names that they lack are listed
 *   Experience 20 the years / level the job asks for against theirs (students and freshers are treated as such)
 *   Location 15   their cities, remote work open to them, the countries they may work in
 * A job in an unrelated field, or asking for two or more years more than they have, is not shown at all
 * (`excluded`), and the reason is counted so the user can see what was left out and why. */

import type { Profile } from "../types";
import type { JobFilterOptions, JobMatchResult, JobPosting, MatchPart } from "./types";
import { canonicalCountries, canWorkIn, countriesInLocation } from "../countries";
import { extractTechTerms } from "../techterms";
import { jobLevel, requiredYears } from "./job-filters";

// --- role families --------------------------------------------------------------------------------------------

export type RoleFamily =
  | "software" | "data" | "analytics" | "design" | "product" | "sales" | "marketing" | "support" | "operations" | "finance" | "people"
  | "legal" | "hardware" | "mechanical" | "healthcare" | "education";

/** Checked in this order: "Sales Engineer" is sales, "Data Engineer" is data, "Product Designer" is design. */
const FAMILY_RULES: Array<[RoleFamily, RegExp]> = [
  ["product", /\b(product manager|product management|product owner|program manager|technical program|product lead)\b/],
  ["design", /\b(designer|design|ux|ui ux|user research|researcher ux|illustrator|art director)\b/],
  ["sales", /\b(sales|account executive|business development|bdr|sdr|account manager|partnerships|pre ?sales|solutions consultant)\b/],
  ["marketing", /\b(marketing|seo|content writer|content strategist|brand|social media|copywriter|writer|pr manager|communications manager)\b/],
  ["support", /\b(customer success|customer support|support engineer|support specialist|customer service|technical support|implementation|onboarding specialist)\b/],
  ["finance", /\b(finance|financial|accountant|accounting|tax|treasury|fp a|controller|audit|auditor|payroll|actuar)\w*/],
  ["people", /\b(recruiter|recruiting|talent|people partner|people operations|hr|human resources|hrbp)\b/],
  ["legal", /\b(legal|counsel|lawyer|attorney|compliance|paralegal)\b/],
  ["healthcare", /\b(nurse|nursing|clinical|clinician|physician|doctor|pharmacist|therapist|medical|dental|caregiver|surgeon)\b/],
  ["education", /\b(teacher|tutor|lecturer|professor|instructor|faculty|curriculum)\b/],
  ["data", /\b(data scien\w*|data engineer\w*|data platform|data infrastructure|big data|machine learning|ml|ai|artificial intelligence|scientist|nlp|computer vision|llm|deep learning|mlops|research engineer)\b/],
  ["analytics", /\b(data|analytics|analyst|business intelligence|bi developer|bi engineer|statistician|insights|reporting)\b/],
  ["software", /\b(software|developer|programmer|sde|swe|backend|frontend|fullstack|full stack|mobile|ios|android|devops|sre|site reliability|platform|infrastructure|cloud|qa|test|tester|automation|security|web|firmware|embedded|member technical|growth engineer|application engineer|systems engineer)\b/],
  ["hardware", /\b(hardware|electrical|electronics|asic|fpga|rf|chip|silicon|vlsi|pcb)\b/],
  ["mechanical", /\b(mechanical|manufacturing|civil|structural|construction|site engineer|site supervisor|site manager|plant|process engineer|chemical|automotive)\b/],
  ["operations", /\b(operations|ops|supply chain|logistics|procurement|strategy|business analyst|project manager|consultant|coordinator)\b/],
  // "Engineer" alone, last: a "Mechanical Engineer" or "Sales Engineer" was already placed above.
  ["software", /\b(engineer|architect|technical staff)\b/],
];
const RELATED: Partial<Record<RoleFamily, RoleFamily[]>> = {
  software: ["data", "hardware"],
  data: ["software", "analytics"],
  analytics: ["data", "finance", "operations"],
  design: ["product"],
  product: ["design", "operations"],
  sales: ["marketing", "support"],
  marketing: ["sales"],
  support: ["sales", "operations"],
  operations: ["product", "support", "finance", "analytics"],
  finance: ["operations", "analytics"],
  hardware: ["software", "mechanical"],
  mechanical: ["hardware"],
};

/** "Senior Backend Engineer II" → "backend engineer": spellings unified, level words removed (the level is scored
 * separately, so "Junior Backend Engineer" is the same role as "Backend Engineer"). */
export function roleWords(title: string): string {
  return ` ${title.toLowerCase().normalize("NFKD")} `
    .replace(/[^a-z0-9+#]+/g, " ")
    .replace(/ (sde|swe|sdet) /g, " software engineer ")
    .replace(/ (developer|programmer|dev) /g, " engineer ")
    .replace(/ (back end|back-end) /g, " backend ")
    .replace(/ (front end|front-end) /g, " frontend ")
    .replace(/ (full stack|full-stack) /g, " fullstack ")
    .replace(/ ml /g, " machine learning ")
    .replace(/ engineering(?= )/g, " engineer")
    .replace(/ (sr|senior|jr|junior|staff|principal|lead|head|associate|intern|internship|trainee|graduate|new grad|entry level|fresher|i|ii|iii|iv|v|l\d|level \d|\d+)(?= )/g, " ")
    .replace(/ (of|and|the|for|in|at|to|with|remote|hybrid|onsite|contract|full time|part time)(?= )/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function roleFamily(title: string): RoleFamily | undefined {
  const t = ` ${roleWords(title)} `;
  return FAMILY_RULES.find(([, re]) => re.test(t))?.[0];
}

const GENERIC = new Set(["engineer", "specialist", "manager", "executive", "associate", "officer", "analyst", "consultant", "representative"]);

/** How close a job title is to one wanted role (0-1), and the words for it. */
function roleCloseness(jobTitle: string, role: string): { sim: number; text: string } {
  const t = roleWords(jobTitle);
  const r = roleWords(role);
  if (!r) return { sim: 0, text: "" };
  const tWords = new Set(t.split(" "));
  const rWords = r.split(" ");
  if (` ${t} `.includes(` ${r} `) || rWords.every((w) => tWords.has(w))) return { sim: 1, text: `Matches "${role}"` };
  const tf = roleFamily(jobTitle);
  const rf = roleFamily(role);
  const shared = rWords.filter((w) => !GENERIC.has(w) && tWords.has(w));
  if (tf && tf === rf && shared.length) return { sim: 0.8, text: `Close to "${role}"` };
  if (tf && tf === rf) return { sim: 0.6, text: `Same field as "${role}"` };
  if (tf && rf && RELATED[rf]?.includes(tf)) return { sim: 0.3, text: `Related to "${role}"` };
  return { sim: 0, text: "" };
}

// --- what the person is looking for ------------------------------------------------------------------------

export interface SearchProfile {
  /** The roles jobs are matched against. */
  roles: string[];
  /** Where the roles came from, to say so on screen. */
  rolesFrom: "target" | "title" | "history" | "education" | "none";
  families: RoleFamily[];
  /** Total years of experience; 0 for a student who gave none. Undefined: unknown. */
  years?: number;
  student: boolean;
  skills: string[];
  /** Cities they want (lowercase, with common other spellings). */
  places: string[];
  /** Display names of those places. */
  placeNames: string[];
  homeCountry: string;
  /** Countries they may work in without sponsorship (canonical names). */
  workCountries: string[];
  wantsRemote: boolean;
  remoteOnly: boolean;
  relocate: boolean;
}

const CITY_ALIASES: Record<string, string[]> = {
  bengaluru: ["bangalore"], bangalore: ["bengaluru"], gurugram: ["gurgaon"], gurgaon: ["gurugram"], mumbai: ["bombay"],
  bombay: ["mumbai"], chennai: ["madras"], kolkata: ["calcutta"], "new delhi": ["delhi"], delhi: ["new delhi", "ncr"],
  noida: ["delhi ncr"], kochi: ["cochin"], cochin: ["kochi"], thiruvananthapuram: ["trivandrum"], trivandrum: ["thiruvananthapuram"],
  mysuru: ["mysore"], mysore: ["mysuru"], "new york": ["nyc", "new york city"], "san francisco": ["sf", "bay area"],
};

export function splitList(text: string | undefined): string[] {
  return (text ?? "").split(/[,;\n|]/).map((s) => s.trim()).filter(Boolean);
}

/** A role to look for, from a field of study, when the profile names no role at all. */
function rolesFromEducation(discipline: string, skills: string[]): string[] {
  const d = discipline.toLowerCase();
  const ml = skills.some((s) => /^(machine learning|deep learning|pytorch|tensorflow|scikit-learn|nlp|computer vision|llm|keras)$/i.test(s));
  if (/data science|statistic|analytics|artificial intelligence|\bai\b|machine learning/.test(d)) return ["Data Scientist", "Machine Learning Engineer", "Data Analyst"];
  if (/computer|software|information tech|\bit\b|informatics|\bcse\b|computing/.test(d)) return ml ? ["Software Engineer", "Machine Learning Engineer"] : ["Software Engineer"];
  if (/electronic|electrical|\bece\b|\beee\b|instrumentation/.test(d)) return ["Electrical Engineer", "Embedded Software Engineer"];
  if (/mechanical|automobile|aerospace|production/.test(d)) return ["Mechanical Engineer"];
  if (/civil|structural/.test(d)) return ["Civil Engineer"];
  if (/design|ux|interaction/.test(d)) return ["Product Designer", "UX Designer"];
  if (/business|management|\bmba\b|commerce|economics/.test(d)) return ["Business Analyst", "Product Manager"];
  if (/finance|accounting|\bca\b/.test(d)) return ["Financial Analyst", "Accountant"];
  if (/marketing/.test(d)) return ["Marketing Associate"];
  return [];
}

/** Everything the matcher needs, read from the profile (which the resume import fills, with the user's consent). */
export function searchProfile(profile: Profile): SearchProfile {
  const skills = [...new Set([...splitList(profile.skills), ...(profile.skillsInventory ?? []).map((s) => s.name.trim()).filter(Boolean)])];
  let roles = splitList(profile.targetRoles);
  let rolesFrom: SearchProfile["rolesFrom"] = roles.length ? "target" : "none";
  if (!roles.length && profile.currentTitle?.trim()) { roles = [profile.currentTitle.trim()]; rolesFrom = "title"; }
  if (!roles.length) {
    roles = [...new Set((profile.workHistory ?? []).map((w) => w.title.trim()).filter(Boolean))].slice(0, 2);
    if (roles.length) rolesFrom = "history";
  }
  if (!roles.length) {
    roles = rolesFromEducation(`${profile.discipline ?? ""} ${profile.degree ?? ""}`, skills);
    if (roles.length) rolesFrom = "education";
  }
  const families = [...new Set(roles.map(roleFamily).filter((f): f is RoleFamily => !!f))];

  const student = profile.educationStatus === "pursuing";
  const parsed = Number.parseFloat(profile.experienceYears ?? "");
  const years = Number.isFinite(parsed) ? Math.max(0, parsed) : student ? 0 : undefined;

  const wanted = splitList(profile.preferredLocations);
  const cityList = (wanted.length ? wanted : splitList(profile.location).slice(0, 1))
    .filter((p) => !/^(remote|anywhere|any|wfh|work from home)$/i.test(p));
  const places = [...new Set(cityList.flatMap((p) => {
    const n = p.toLowerCase().replace(/\s+/g, " ").trim();
    return [n, ...(CITY_ALIASES[n] ?? [])];
  }))];
  const workMode = profile.facts?.workMode ?? "";
  const homeCountry = canonicalCountries(profile.country ?? "")[0] ?? (profile.country ?? "").trim();
  const listed = canonicalCountries(profile.facts?.workCountries ?? "");
  return {
    roles, rolesFrom, families, years, student, skills, places, placeNames: cityList,
    homeCountry,
    workCountries: listed.length ? listed : homeCountry ? [homeCountry] : [],
    wantsRemote: workMode !== "onsite" || wanted.some((p) => /remote|anywhere/i.test(p)),
    remoteOnly: workMode === "remote",
    relocate: profile.facts?.relocate === "Yes",
  };
}

// --- the four parts -----------------------------------------------------------------------------------------

const WEIGHT = { role: 40, skills: 25, experience: 20, location: 15 } as const;

function rolePart(job: JobPosting, sp: SearchProfile): { part: MatchPart; exclude?: string; short: string } {
  const max = WEIGHT.role;
  if (!sp.roles.length) {
    return { part: { key: "role", label: "Role", points: Math.round(max / 2), max, text: "Add the roles you want in Profile → Target roles" }, short: "" };
  }
  let best = { sim: 0, text: "" };
  for (const r of sp.roles) {
    const c = roleCloseness(job.title, r);
    if (c.sim > best.sim) best = c;
  }
  if (best.sim === 0) {
    const fam = roleFamily(job.title);
    return { part: { key: "role", label: "Role", points: 0, max, text: "A different field" }, exclude: fam ? `different field (${fam})` : "different field", short: "" };
  }
  return { part: { key: "role", label: "Role", points: Math.round(max * best.sim), max, text: best.text }, short: best.text.replace(/"/g, "") };
}

/** Skills, compared by their usual names ("ReactJS" and "React" are the same skill). */
function skillKey(skill: string): string {
  return (extractTechTerms(skill)[0] ?? skill).toLowerCase();
}
function mentions(text: string, skill: string): boolean {
  const s = skill.trim();
  if (s.length < 2) return false;
  const escaped = s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9+#])${escaped}($|[^a-z0-9+#])`, "i").test(text);
}

function skillsPart(job: JobPosting, sp: SearchProfile): { part: MatchPart; matched: string[]; missing: string[]; short: string } {
  const max = WEIGHT.skills;
  const text = [job.title, job.description ?? job.descriptionSnippet ?? "", ...(job.requirements ?? [])].join("\n");
  const hasDescription = text.length - job.title.length > 80;
  const jobTerms = extractTechTerms(text);
  const jobKeys = new Set(jobTerms.map((t) => t.toLowerCase()));
  const mine = new Set(sp.skills.map(skillKey));
  const matched = sp.skills.filter((s) => jobKeys.has(skillKey(s)) || mentions(text, s));
  const missing = jobTerms.filter((t) => !mine.has(t.toLowerCase())).slice(0, 4);
  if (!sp.skills.length) {
    return { part: { key: "skills", label: "Skills", points: Math.round(max * 0.4), max, text: "Add your skills in Profile to compare them" }, matched, missing, short: "" };
  }
  if (!hasDescription) {
    const points = matched.length ? max : Math.round(max * 0.5);
    return { part: { key: "skills", label: "Skills", points, max, text: matched.length ? `Title mentions ${matched.slice(0, 3).join(", ")}` : "This board shows no description here; open the job to check" }, matched, missing, short: "" };
  }
  if (!jobTerms.length && !matched.length) {
    return { part: { key: "skills", label: "Skills", points: Math.round(max * 0.5), max, text: "The job names no specific skills" }, matched, missing, short: "" };
  }
  const needed = Math.min(Math.max(jobTerms.length, 1), 6);
  const share = Math.min(1, matched.length / needed);
  const text2 = matched.length
    ? `You have ${matched.slice(0, 4).join(", ")}${matched.length > 4 ? ` +${matched.length - 4}` : ""}`
    : "None of your skills are named";
  return {
    part: { key: "skills", label: "Skills", points: Math.round(max * share), max, text: text2 },
    matched, missing,
    short: matched.length ? `${matched.length} of your skills` : "",
  };
}

function experiencePart(job: JobPosting, sp: SearchProfile): { part: MatchPart; exclude?: string; short: string } {
  const max = WEIGHT.experience;
  const level = jobLevel(job);
  const asks = requiredYears(job);
  const y = sp.years;
  const part = (share: number, text: string): MatchPart => ({ key: "experience", label: "Experience", points: Math.round(max * share), max, text });
  if (y === undefined) return { part: part(0.6, "Add your years of experience in Profile to check this"), short: "" };
  const yText = sp.student && y === 0 ? "you are still studying" : `you have ${y} yr${y === 1 ? "" : "s"}`;
  if (asks !== undefined) {
    if (asks - y >= 2) return { part: part(0, `Asks for ${asks}+ years; ${yText}`), exclude: "needs more experience", short: "" };
    if (asks > y) return { part: part(0.5, `Asks for ${asks}+ years; ${yText}`), short: "" };
    if (level === "internship" && y >= 2) return { part: part(0.3, `An internship; ${yText}`), short: "" };
    return { part: part(1, `Asks for ${asks}+ years; ${yText}`), short: "fits your experience" };
  }
  switch (level) {
    case "senior":
      if (y < 3) return { part: part(0, `A senior role; ${yText}`), exclude: "needs more experience", short: "" };
      return y < 5 ? { part: part(0.5, `A senior role; ${yText}`), short: "" } : { part: part(1, `A senior role; ${yText}`), short: "fits your experience" };
    case "internship":
      return sp.student || y < 1
        ? { part: part(1, "An internship: right for where you are"), short: "internship" }
        : { part: part(y >= 2 ? 0.2 : 0.5, `An internship; ${yText}`), short: "" };
    case "entry":
      return y <= 2 ? { part: part(1, `Entry level; ${yText}`), short: "entry level" } : { part: part(0.6, `Entry level; ${yText}`), short: "" };
    default:
      // No level and no years written: most such jobs want some experience.
      return y < 1
        ? { part: part(0.5, "Level not stated; may want some experience"), short: "" }
        : { part: part(0.9, "Level not stated"), short: "" };
  }
}

const OPEN_REMOTE = /\b(anywhere|worldwide|global|globally|any location|fully distributed)\b/i;
const NOT_A_PLACE = /^\s*(n\/?a|tbd|tba|none|unknown|various|multiple( locations)?|flexible|-+)\s*$/i;

/** Tech-hub cities whose country the shared list does not name, so "Bucharest" or "Taipei" is not taken for a place
 * the person can work. Names as the country list writes them. */
const WORLD_CITIES: Array<[string, RegExp]> = [
  ["Romania", /\b(bucharest|cluj|iasi|timisoara)\b/], ["Taiwan", /\b(taiwan|taipei|hsinchu)\b/], ["China", /\b(china|beijing|shanghai|shenzhen|hangzhou|guangzhou)\b/],
  ["Hong Kong", /\bhong kong\b/], ["South Korea", /\b(korea|seoul)\b/], ["Israel", /\b(tel aviv|herzliya|haifa|jerusalem)\b/],
  ["Portugal", /\b(lisbon|lisboa|porto)\b/], ["Switzerland", /\b(zurich|zürich|geneva|lausanne|basel)\b/], ["Sweden", /\b(stockholm|gothenburg|malmo)\b/],
  ["Denmark", /\b(copenhagen|aarhus)\b/], ["Norway", /\b(norway|oslo)\b/], ["Finland", /\b(helsinki|espoo)\b/], ["Czechia", /\b(prague|brno)\b/],
  ["Hungary", /\bbudapest\b/], ["Austria", /\b(vienna|wien)\b/], ["Belgium", /\b(brussels|antwerp|ghent)\b/], ["Greece", /\bathens\b/],
  ["Turkey", /\b(turkey|türkiye|turkiye|istanbul|ankara)\b/], ["Ukraine", /\b(ukraine|kyiv|kiev|lviv)\b/], ["Serbia", /\b(serbia|belgrade)\b/],
  ["Bulgaria", /\b(bulgaria|sofia)\b/], ["Estonia", /\b(estonia|tallinn)\b/], ["Lithuania", /\b(lithuania|vilnius)\b/], ["Latvia", /\b(latvia|riga)\b/],
  ["Thailand", /\b(thailand|bangkok)\b/], ["Indonesia", /\b(indonesia|jakarta|bali)\b/], ["Vietnam", /\b(vietnam|hanoi|ho chi minh)\b/],
  ["Philippines", /\b(manila|makati|cebu)\b/], ["Malaysia", /\bkuala lumpur\b/], ["Pakistan", /\b(pakistan|karachi|lahore|islamabad)\b/],
  ["Bangladesh", /\b(bangladesh|dhaka)\b/], ["Sri Lanka", /\b(sri lanka|colombo)\b/], ["Nepal", /\b(nepal|kathmandu)\b/],
  ["Egypt", /\b(egypt|cairo)\b/], ["Nigeria", /\b(nigeria|lagos|abuja)\b/], ["Kenya", /\b(kenya|nairobi)\b/], ["South Africa", /\b(cape town|johannesburg)\b/],
  ["Colombia", /\b(colombia|bogota|bogotá|medellin)\b/], ["Argentina", /\b(argentina|buenos aires)\b/], ["Chile", /\b(chile|santiago)\b/],
  ["Peru", /\b(peru|lima)\b/], ["Brazil", /\b(sao paulo|são paulo|rio de janeiro|belo horizonte)\b/], ["Mexico", /\b(mexico city|ciudad de mexico|guadalajara|monterrey)\b/],
  ["Qatar", /\b(qatar|doha)\b/], ["Saudi Arabia", /\b(riyadh|jeddah)\b/], ["Australia", /\b(canberra|adelaide)\b/], ["New Zealand", /\b(auckland|wellington)\b/],
  ["Canada", /\b(montréal|quebec|edmonton|winnipeg|halifax)\b/], ["Germany", /\b(leipzig|dresden|nuremberg|nürnberg|karlsruhe)\b/],
  ["Spain", /\b(valencia|seville|malaga|bilbao)\b/], ["Italy", /\b(milan|milano|rome|roma|turin|torino)\b/], ["France", /\b(lyon|toulouse|nantes|bordeaux|lille)\b/],
  ["Japan", /\b(kyoto|fukuoka|yokohama)\b/], ["United Kingdom", /\b(birmingham|oxford|cambridge|reading|cardiff|newcastle|liverpool|sheffield|nottingham)\b/],
];

/** Every country a job's location names: the shared list, then the tech hubs above. */
function locationCountries(text: string): string[] {
  const found = countriesInLocation(text);
  const t = text.toLowerCase();
  for (const [country, re] of WORLD_CITIES) if (!found.includes(country) && re.test(t)) found.push(country);
  return found;
}

function locationPart(job: JobPosting, sp: SearchProfile): { part: MatchPart; canWork: boolean; short: string } {
  const max = WEIGHT.location;
  const loc = `${job.location ?? ""}`.toLowerCase();
  const part = (share: number, text: string): MatchPart => ({ key: "location", label: "Location", points: Math.round(max * share), max, text });
  const countries = locationCountries(`${job.location ?? ""} ${job.country ?? ""}`);
  const allowed = (c: string): boolean => !sp.workCountries.length || canWorkIn(c, sp.workCountries);
  const city = sp.places.find((p) => p.length > 1 && new RegExp(`(^|[^a-z])${p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^a-z])`).test(loc));
  if (city && !(job.isRemote && sp.remoteOnly)) {
    const name = sp.placeNames.find((n) => n.toLowerCase() === city || (CITY_ALIASES[n.toLowerCase()] ?? []).includes(city)) ?? city;
    return { part: part(1, `In ${name}`), canWork: true, short: name };
  }
  if (job.isRemote) {
    if (!countries.length || OPEN_REMOTE.test(loc)) return { part: part(sp.wantsRemote ? 0.9 : 0.6, "Remote"), canWork: true, short: "remote" };
    const ok = countries.filter(allowed);
    if (ok.length) return { part: part(sp.wantsRemote ? 0.9 : 0.6, `Remote (${ok[0]})`), canWork: true, short: "remote" };
    return { part: part(0, `Remote, but only from ${countries.slice(0, 2).join(" / ")}`), canWork: false, short: "" };
  }
  if ((!loc.trim() || NOT_A_PLACE.test(loc)) && !countries.length) return { part: part(0.5, "Location not stated"), canWork: true, short: "" };
  if (!countries.length) return { part: part(0.3, `In ${job.location} (the job does not say which country)`), canWork: true, short: "" };
  const inAllowed = countries.find(allowed);
  if (inAllowed) {
    if (sp.remoteOnly) return { part: part(0.3, `On-site in ${job.location}; you prefer remote`), canWork: true, short: "" };
    const near = sp.homeCountry && inAllowed === sp.homeCountry ? `Elsewhere in ${inAllowed}` : `In ${inAllowed}`;
    return { part: part(!sp.places.length ? 0.8 : sp.relocate ? 0.7 : 0.5, `${near} (${job.location})`), canWork: true, short: "" };
  }
  return { part: part(0, `In ${countries[0]}: you may need a visa there`), canWork: false, short: "" };
}

// --- the score -------------------------------------------------------------------------------------------------

/** Match one posting against the person, with the reason for every point. */
export function matchJob(job: JobPosting, profile: Profile, sp: SearchProfile = searchProfile(profile)): JobMatchResult {
  const role = rolePart(job, sp);
  const exp = experiencePart(job, sp);
  // A job that will not be shown needs no skills check (the slow part, over the whole description).
  const skills = role.exclude || exp.exclude
    ? { part: { key: "skills" as const, label: "Skills", points: 0, max: WEIGHT.skills, text: "Not checked" }, matched: [], missing: [], short: "" }
    : skillsPart(job, sp);
  const loc = locationPart(job, sp);
  const parts = [role.part, skills.part, exp.part, loc.part];
  const excluded = role.exclude ?? exp.exclude;
  // A job that is not shown scores 0, so no list or count can ever rank it as a match.
  const score = excluded ? 0 : Math.max(0, Math.min(100, parts.reduce((s, p) => s + p.points, 0)));
  const bits = [role.short, skills.short, loc.short].filter(Boolean);
  let why = bits.length ? bits.join(", ") : "Partly matches your profile";
  const words = why.split(/\s+/);
  if (words.length > 8) why = words.slice(0, 8).join(" ").replace(/,$/, "");
  return {
    job, score, parts, why,
    matchedSkills: skills.matched,
    missingSkills: skills.missing,
    isEligibleWorkCountry: loc.canWork,
    ...(excluded ? { excluded } : {}),
  };
}

/** Days since the job was posted, when the board says. */
export function postedDaysAgo(job: JobPosting, now = Date.now()): number | undefined {
  const t = job.publishedAt ? Date.parse(job.publishedAt) : NaN;
  return Number.isFinite(t) ? Math.max(0, Math.floor((now - t) / 86_400_000)) : undefined;
}

/** Rank postings: best match first, newer first among equals. Jobs that are `excluded` are left out. */
export function rankJobs(jobs: JobPosting[], profile: Profile, options: JobFilterOptions = {}): JobMatchResult[] {
  const sp = searchProfile(profile);
  let results = jobs.map((j) => matchJob(j, profile, sp)).filter((r) => !r.excluded);
  if (options.roleQuery) {
    const q = options.roleQuery.toLowerCase();
    results = results.filter((r) => r.job.title.toLowerCase().includes(q));
  }
  if (options.country) {
    const c = options.country.toLowerCase();
    results = results.filter((r) => (r.job.country || r.job.location || "").toLowerCase().includes(c));
  }
  if (options.remoteOnly) results = results.filter((r) => r.job.isRemote);
  if (options.minScore !== undefined) results = results.filter((r) => r.score >= options.minScore!);
  const now = Date.now();
  results.sort((a, b) => b.score - a.score || (postedDaysAgo(a.job, now) ?? 999) - (postedDaysAgo(b.job, now) ?? 999));
  if (options.limit && options.limit > 0) results = results.slice(0, options.limit);
  return results;
}

/** Why jobs were left out, counted ("different field": 212, "needs more experience": 31). */
export function exclusionCounts(jobs: JobPosting[], profile: Profile): Record<string, number> {
  const sp = searchProfile(profile);
  const counts: Record<string, number> = {};
  for (const j of jobs) {
    const r = matchJob(j, profile, sp);
    if (r.excluded) {
      const key = r.excluded.startsWith("different field") ? "different field" : r.excluded;
      counts[key] = (counts[key] ?? 0) + 1;
    }
  }
  return counts;
}

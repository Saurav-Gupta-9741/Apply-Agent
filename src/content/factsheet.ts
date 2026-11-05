/** The fact sheet: what the user's own Profile (and, in the panel, the text of their own resume) says about them,
 * laid out for the "new questions" real forms keep adding ("Who is your current or previous employer?", "Branch",
 * "Year of passing", "Have you worked with Kafka?"). Deterministic, no language model, nothing leaves the browser.
 *
 * Rules every answer here keeps:
 *  - a value only ever comes from the user's saved data, and says where it came from ("from your work history: Acme")
 *  - fills are marked for a quick check in the panel (MODEL_DECISIONS, shown as "AI")
 *  - anything the facts do not settle is asked: a "previous employer" while the user has a current job, a skill that
 *    is in no saved list, years of experience with a skill that has no saved years, a "No" on the user's behalf
 *  - sensitive questions never get here (decide() handles them first and they are never answered from the resume)
 *
 * Content-script safe: no import of the resume parser (it would pull the PDF reader into the page script). The panel
 * passes an already parsed resume when it has one. */

import type { Decision, FieldDescriptor, Profile, WorkEntry } from "../shared/types";
import type { ParsedResume } from "../shared/resume-parse";
import { bestOption, normalize, yesNoOption } from "../shared/text";
import { parseRequirement } from "../shared/requirements";
import { extractTechTerms } from "../shared/techterms";
import { notAProfileFact } from "./classify";
import { answerableLength, narrowerSkill, yesNoField } from "./facts";
import { countriesIn } from "../shared/countries";
import { countriesOfCity, sameCity } from "../shared/places";
import { countryCode } from "../shared/profile-validate";

export interface SheetJob {
  company: string;
  title: string;
  current: boolean;
  intern: boolean;
  start: string;
  end: string;
  summary: string;
  /** Whole years in this role, from its dates (undefined when a date is missing). Shown, never typed as "experience". */
  years?: number;
  /** "your work history" or "your resume". */
  origin: string;
}

export interface SheetSkill {
  name: string;
  /** Years the user saved for this skill (never estimated). */
  years?: number;
  /** Where it is written: "your skills", "your work history: Acme", "your resume project: Foo". */
  evidence: string;
  /** Seen in a job (work history), not only listed as a skill or in a project. */
  atWork: boolean;
  /** The catalogue names this skill stands for ("ReactJS" → React), worked out once. */
  terms: string[];
}

export interface SheetProject {
  name: string;
  technologies: string[];
}

export interface FactSheet {
  /** Newest first: the current job(s) first, then by end / start date. */
  jobs: SheetJob[];
  /** Total years of experience exactly as the user stated it ("2"). */
  statedExperienceYears?: string;
  /** Worked out from full-time job dates (internships not counted). Shown as a hint, never filled. */
  computedExperienceYears?: number;
  degree?: string;
  educationLevel?: string;
  discipline?: string;
  school?: string;
  graduationYear?: string;
  /** "May", when the profile's graduation date names a month ("May 2027", "2027-05"). */
  graduationMonth?: string;
  studying: boolean;
  location?: string;
  skills: SheetSkill[];
  projects: SheetProject[];
  certifications: string[];
  languages: string[];
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const INTERN = /\b(intern|interns|internship|trainee|apprentice\w*|co ?op|summer analyst)\b/;

function isIntern(title: string): boolean {
  return INTERN.test(normalize(title));
}

/** "YYYY-MM" or "YYYY" → months since year 0 (undefined when unreadable). */
function monthIndex(date: string): number | undefined {
  const m = /^(\d{4})(?:-(\d{1,2}))?/.exec(date.trim());
  if (!m) return undefined;
  return Number(m[1]) * 12 + (m[2] ? Number(m[2]) - 1 : 0);
}

function roleYears(entry: WorkEntry, today: Date): number | undefined {
  const start = monthIndex(entry.start);
  const end = entry.current ? today.getFullYear() * 12 + today.getMonth() : monthIndex(entry.end);
  if (start === undefined || end === undefined || end < start) return undefined;
  return Math.floor((end - start + 1) / 12);
}

function sortJobs(jobs: SheetJob[]): SheetJob[] {
  const key = (j: SheetJob) => (j.current ? 1e9 : monthIndex(j.end) ?? monthIndex(j.start) ?? -1);
  // Stable: entries with no dates keep the user's order (work history is saved newest first).
  return jobs.map((j, i) => ({ j, i })).sort((a, b) => key(b.j) - key(a.j) || a.i - b.i).map((x) => x.j);
}

/** Splits "Python, SQL; Power BI / Excel" into names. */
function listItems(text: string): string[] {
  return text.split(/[,;\n|•]+/).map((s) => s.trim()).filter((s) => s && s.length <= 60);
}

/** The "Projects" and "Certifications" sections of a resume's text: a project's name is the first line of an entry
 * (before " | ", " - " or ":"), its technologies the tech terms written in that entry. */
export function resumeProjectsAndCertifications(text: string): { projects: SheetProject[]; certifications: string[] } {
  const projects: SheetProject[] = [];
  const certifications: string[] = [];
  let section: "projects" | "certifications" | "other" = "other";
  let current: { name: string; body: string[] } | undefined;
  const flush = () => {
    if (current?.name) projects.push({ name: current.name, technologies: extractTechTerms([current.name, ...current.body].join("\n")) });
    current = undefined;
  };
  for (const raw of text.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const heading = line.replace(/[:：]\s*$/, "").toLowerCase().replace(/[^a-z& ]/g, " ").replace(/\s+/g, " ").trim();
    if (heading.split(" ").length <= 4 && /^((academic|personal|key|selected|major|technical) )?projects$/.test(heading)) {
      flush();
      section = "projects";
      continue;
    }
    if (heading.split(" ").length <= 4 && /^(certifications?|licenses (and|&) certifications|certificates?)$/.test(heading)) {
      flush();
      section = "certifications";
      continue;
    }
    if (heading.split(" ").length <= 4 && /^(education|experience|work experience|professional experience|skills|technical skills|languages|achievements|awards|interests|hobbies|summary|profile|references|publications|activities|positions of responsibility|employment|internships?|coursework)$/.test(heading)) {
      flush();
      section = "other";
      continue;
    }
    const bullet = /^[•●○◦▪▫■□♦◆➢➤►▸✓✔*·-]\s*/.test(line);
    const clean = line.replace(/^[•●○◦▪▫■□♦◆➢➤►▸✓✔*·-]\s*/, "").trim();
    if (section === "certifications") {
      if (clean.length <= 120) certifications.push(clean);
    } else if (section === "projects") {
      if (!bullet || !current) {
        flush();
        const name = clean.split(/\s+[|–—-]\s+|:\s/)[0]!.trim();
        current = { name: name.length <= 80 ? name : name.slice(0, 80), body: [clean] };
      } else current.body.push(clean);
    }
  }
  flush();
  return { projects, certifications };
}

/** The fact sheet for a profile. A parsed resume (panel only) adds what the profile leaves empty, marked "your resume". */
export function buildFactSheet(profile: Profile, resume?: { parsed: ParsedResume; text: string }, today: Date = new Date()): FactSheet {
  const history = profile.workHistory ?? [];
  let jobs: SheetJob[] = history
    .filter((w) => (w.company || w.title).trim())
    .map((w) => ({
      company: w.company.trim(), title: w.title.trim(), current: !!w.current, intern: isIntern(w.title), start: w.start, end: w.end,
      summary: w.summary ?? "", years: roleYears(w, today), origin: "your work history",
    }));
  if (!jobs.length && resume?.parsed.work.length) {
    jobs = resume.parsed.work.map((w) => ({
      company: w.company.trim(), title: w.title.trim(), current: !!w.current, intern: w.intern || isIntern(w.title), start: w.start, end: w.end,
      summary: w.summary ?? "", years: roleYears(w, today), origin: "your resume",
    }));
  }
  jobs = sortJobs(jobs);
  const fullTime = jobs.filter((j) => !j.intern);
  const computed = fullTime.length && fullTime.every((j) => j.years !== undefined)
    ? fullTime.reduce((sum, j) => sum + (j.years ?? 0), 0) : undefined;

  const edu = resume?.parsed.education.filter((e) => e.degree).sort((a, b) => Number(b.year) - Number(a.year))[0];
  const gradRaw = profile.graduationYear?.trim() || edu?.year || "";
  const gradYear = /\b(19|20)\d{2}\b/.exec(gradRaw)?.[0];
  const monthWord = MONTHS.find((m) => new RegExp(`\\b${m.slice(0, 3)}`, "i").test(gradRaw));
  const monthNum = /\b(?:19|20)\d{2}[-/.](\d{1,2})\b|\b(\d{1,2})[-/.](?:19|20)\d{2}\b/.exec(gradRaw);
  const monthFromNum = monthNum ? MONTHS[Number(monthNum[1] ?? monthNum[2]) - 1] : undefined;

  const skills: SheetSkill[] = [];
  const addSkill = (name: string, evidence: string, atWork: boolean, years?: number) => {
    const key = normalize(name);
    if (!key) return;
    const existing = skills.find((s) => normalize(s.name) === key);
    if (existing) {
      if (atWork && !existing.atWork) Object.assign(existing, { atWork, evidence });
      return;
    }
    skills.push({ name: name.trim(), evidence, atWork, terms: extractTechTerms(name), ...(years !== undefined ? { years } : {}) });
  };
  for (const s of profile.skillsInventory ?? []) addSkill(s.name, "your skills", false, typeof s.years === "number" && s.years > 0 ? s.years : undefined);
  for (const s of listItems(profile.skills ?? "")) addSkill(s, "your skills", false);
  for (const j of jobs) {
    for (const t of extractTechTerms(`${j.title}\n${j.summary}`)) addSkill(t, `${j.origin}: ${j.company || j.title}`, true);
  }
  const extra = resume ? resumeProjectsAndCertifications(resume.text) : { projects: [], certifications: [] };
  for (const p of extra.projects) for (const t of p.technologies) addSkill(t, `your resume project: ${p.name}`, false);
  for (const s of resume?.parsed.skills ?? []) addSkill(s, "your resume", false);

  return {
    jobs,
    statedExperienceYears: profile.experienceYears?.trim() || undefined,
    computedExperienceYears: computed,
    degree: profile.degree?.trim() || edu?.degree || undefined,
    educationLevel: profile.educationLevel?.trim() || undefined,
    discipline: profile.discipline?.trim() || edu?.discipline || undefined,
    school: profile.school?.trim() || edu?.institution || undefined,
    graduationYear: gradYear,
    graduationMonth: monthWord ?? monthFromNum,
    studying: profile.educationStatus === "pursuing" || (!profile.educationStatus && !!edu?.ongoing),
    location: profile.location?.trim() || undefined,
    skills,
    projects: extra.projects,
    certifications: extra.certifications,
    languages: (profile.languages ?? []).map((l) => l.language),
  };
}

// --- questions ---------------------------------------------------------------------------------------------

/** Someone else's details, or something about the job rather than the user: never from the fact sheet. */
const NOT_THE_USERS = /\b(reference|referee|referr\w*|manager|supervisor|emergency|spouse|parent|father|mother|guardian|friend|relative|recruiter|interviewer|hiring|contact person)\b/;
/** About the job or a wish, not a fact: "Which company are you applying to?", "Desired job title". */
const NOT_A_HISTORY_FACT = /\b(appl(y|ied|ying)|interested|desired|target|dream|preferred|expected|seeking|looking for|want|wish|next|future|join|hire)\b/;
/** Another detail of the job, not its name: "Reason for leaving your current employer", "Current company address". */
const OTHER_DETAIL = /\b(reason|why|leav\w*|left|address|phone|email|e mail|website|url|location|city|country|industry|size|type|sector|domain|salary|ctc|notice|contact|reporting|description|describe|responsibilit\w*|achievement\w*|duration|tenure|how long|since|start|end|date|joined|joining|level|grade|band|team|department|division|number of|how many|employees|revenue|duties|summary|years?)\b/;

const ORG_WORD = /\b(employer|company|organi[sz]ation|firm|workplace|org)\b/;
const TITLE_WORD = /\b(job title|title|designation|role|position)\b/;
const SCOPE_CURRENT = /\b(current|currently|present|presently|now)\b/;
const SCOPE_PREVIOUS = /\b(previous|prior|former|past|preceding)\b/;
const SCOPE_RECENT = /\b(most recent|recent|latest|last)\b/;
/** "(excluding internships)", "full-time employer": internships do not count. */
const NO_INTERNSHIPS = /\b(excluding|exclude|excluded|not including|other than|except|apart from|besides|without|non) (any |an |your )?(internships?|interns?)\b|\binternships? (do not|don t|does not|doesn t) count\b|\bfull time\b|\bpermanent\b/;

type Scope = "current" | "recent" | "previous";

function scopeOf(q: string): Scope | undefined {
  const current = SCOPE_CURRENT.test(q);
  const previous = SCOPE_PREVIOUS.test(q);
  const recent = SCOPE_RECENT.test(q);
  if (recent || (current && previous)) return "recent";
  if (current) return "current";
  if (previous) return "previous";
  if (/^(who|where) do you work( for)?$|^who is your employer$|^where do you work$/.test(q)) return "current";
  return undefined;
}

/** What a history question asks for, if it is one: the employer or the job title, and which job. */
export function historyQuestion(field: FieldDescriptor): { part: "company" | "title"; scope: Scope; noInterns: boolean } | undefined {
  if (field.workBlock !== undefined) return undefined; // a "My Experience" block: workDecision() owns it
  if (!["text", "combobox", "select", "dropdown"].includes(field.control)) return undefined;
  if (!answerableLength(field.label) || notAProfileFact(field)) return undefined;
  const q = normalize(field.label).replace(/\b(if any|if applicable|optional|required)\b/g, " ").replace(/\s+/g, " ").trim();
  if (!q || NOT_THE_USERS.test(q) || NOT_A_HISTORY_FACT.test(q)) return undefined;
  const noInterns = NO_INTERNSHIPS.test(q);
  const core = q.replace(NO_INTERNSHIPS, " ").replace(/\b(intern\w*)\b/g, " ");
  if (OTHER_DETAIL.test(core)) return undefined;
  const org = ORG_WORD.test(core) || /\bwho do you (currently )?work for\b|\bwhere do you (currently )?work\b/.test(core);
  const title = TITLE_WORD.test(core);
  if (org === title) return undefined; // neither, or both in one box ("Current title and company"): asked
  const scope = scopeOf(core) ?? (title && /^(what is )?(your )?job title$/.test(core) ? "current" : undefined);
  if (!scope) return undefined;
  return { part: org ? "company" : "title", scope, noInterns };
}

function pickJob(sheet: FactSheet, profile: Profile, scope: Scope, noInterns: boolean): { company: string; title: string; from: string } | undefined {
  // The profile's own "current company / title" first: the user typed them.
  const profCompany = profile.currentCompany?.trim() ?? "";
  const profTitle = profile.currentTitle?.trim() ?? "";
  if ((profCompany || profTitle) && scope !== "previous" && !(noInterns && isIntern(profTitle))) {
    return { company: profCompany, title: profTitle, from: "your profile" };
  }
  const jobs = sheet.jobs.filter((j) => !(noInterns && j.intern));
  const anyCurrent = sheet.jobs.some((j) => j.current) || !!profCompany;
  let job: SheetJob | undefined;
  if (scope === "current") job = jobs.find((j) => j.current);
  else if (scope === "recent") job = jobs[0];
  // "Previous employer" while the user has a current job could mean either: asked.
  else job = anyCurrent ? undefined : jobs[0];
  if (!job) return undefined;
  const when = job.current ? "now" : job.end ? job.end.slice(0, 4) : "";
  const what = [job.company, [job.title, when].filter(Boolean).join(", ")].filter(Boolean);
  return { company: job.company, title: job.title, from: `${job.origin}: ${what[0]}${what[1] && what[0] !== what[1] ? ` (${what[1]})` : ""}` };
}

/** A value for a list of choices: the matching choice, or nothing (a list that does not hold it is asked). */
function choose(field: FieldDescriptor, value: string): string | undefined {
  if (!field.options.length) return value;
  return bestOption(field.options, value, 0.75);
}

function historyAnswer(field: FieldDescriptor, profile: Profile, sheet: FactSheet): Decision | undefined {
  const asked = historyQuestion(field);
  if (!asked) return undefined;
  const job = pickJob(sheet, profile, asked.scope, asked.noInterns);
  if (!job) return undefined;
  const raw = asked.part === "company" ? job.company : job.title;
  const value = raw ? choose(field, raw) : undefined;
  if (!value) return undefined;
  return { kind: "profile", key: asked.part === "company" ? "currentCompany" : "currentTitle", value, source: `from ${job.from}` };
}

// Education wordings the profile rules do not name (mostly Indian forms): "Branch", "Stream", "Year of passing"…
const DISCIPLINE_Q = /^(your |which |what )?(branch|stream|area of study|course of study|field of specialisation|field of specialization|main subject|subject|concentration|program of study|programme of study|major subject)( of (study|engineering|graduation))?( did you (study|pursue|major in))?$|^(which|what) (branch|stream|major|discipline|field of study|subject) (did|do|are) you\b/;
const SCHOOL_Q = /^(name of (your |the )?(institute|institution|college|university|school)|(your )?(institute|college|university) name|alma mater|(your )?institute|(which|what) (college|university|school|institute|institution) (did|do|are) you\b.*)$/;
const GRAD_Q = /^(your )?(year of passing|passing year|pass ?out year|passed out year|passing out year|year of completion|completion year|batch|batch year|graduating year|graduating class|expected (year of )?graduation( year)?)$|^(when|which year|what year) (did|do|will) you (graduate|pass out|complete your (degree|graduation))$/;
const DEGREE_Q = /^(your )?(highest )?(degree|degree obtained|degree earned|qualification|highest qualification|education qualification|educational qualification|highest education)$|^(what|which) (is your highest )?(degree|qualification)( do you (hold|have))?$|^(what is |what s )?(your )?highest (level of )?(education|educational attainment|education level|degree)( level)?( (you have )?(completed|attained|obtained|earned|achieved|received))?$/;
/** A degree already finished: a student's degree in progress is not one. */
const FINISHED = /\b(completed|complete|attained|obtained|earned|achieved|received|awarded|finished|held|hold)\b/;
/** A question about one level of study ("Year of passing (12th)", "PG branch"): asked, the profile holds one degree. */
const NAMED_LEVEL = /\b(ug|pg|undergrad\w*|postgrad\w*|post graduation|bachelor\w*|master\w*|phd|doctor\w*|diploma|10th|12th|ssc|hsc|high school|secondary|intermediate|mba)\b/;

function educationAnswer(field: FieldDescriptor, profile: Profile, sheet: FactSheet): Decision | undefined {
  if (field.workBlock !== undefined || !["text", "combobox", "select", "dropdown", "number"].includes(field.control)) return undefined;
  if (!answerableLength(field.label) || notAProfileFact(field)) return undefined;
  const q = normalize(field.label).replace(/\b(if any|optional|required)\b/g, " ").replace(/\s+/g, " ").trim();
  if (NOT_THE_USERS.test(q) || NAMED_LEVEL.test(q)) return undefined;
  const fromProfile = (key: "discipline" | "school" | "graduationYear" | "degree", value: string | undefined, from: string): Decision | undefined => {
    const v = value ? choose(field, value) : undefined;
    return v ? { kind: "profile", key, value: v, source: `from ${from}` } : undefined;
  };
  if (DISCIPLINE_Q.test(q)) return fromProfile("discipline", profile.discipline?.trim(), "your profile (field of study)");
  if (SCHOOL_Q.test(q)) return fromProfile("school", profile.school?.trim(), "your profile (school)");
  if (GRAD_Q.test(q)) {
    // A date box or a month wants more than a year.
    if (field.control === "date" || /\b(month|date|dd|mm)\b/.test(normalize(`${field.label} ${field.placeholder}`))) return undefined;
    return fromProfile("graduationYear", sheet.graduationYear && profile.graduationYear?.trim() ? sheet.graduationYear : undefined, "your profile (graduation year)");
  }
  if (DEGREE_Q.test(q)) {
    // "Highest level of education completed" for a student: the degree they study for is not finished, so asked.
    if (profile.educationStatus === "pursuing" && FINISHED.test(normalize(`${field.label} ${field.placeholder}`))) return undefined;
    if (profile.degree?.trim()) return fromProfile("degree", profile.degree.trim(), "your profile (degree)");
    // No degree saved: the highest level finished stands for it on a list of levels ("Master's Degree"), never typed,
    // and never for a student (the degree they study for is not their highest finished one).
    if (field.options.length && profile.educationStatus !== "pursuing" && profile.educationLevel?.trim()) {
      return fromProfile("degree", profile.educationLevel.trim(), "your profile (education level)");
    }
  }
  return undefined;
}

/** "How many years of experience do you have?": the user's own total, never one worked out from dates. */
const TOTAL_EXPERIENCE_Q = /^(how many )?(total |overall )?(years of )?(total |overall )?(work |working |professional |industry )?experience( do you have)?( in years| years| yrs)?$|^(how many|number of) years of (total |overall )?(work |working |professional )?experience( do you have)?( in total| overall)?$|^(total|overall) (work |professional )?experience( in years| years)?$|^experience in years$/;

/** "2-4 years", "5+", "Less than 1 year", "10 or more years", "0": a count of years and nothing else. */
const YEARS_OPTION = /^(less than|under|below|over|more than|above|at least|up to|upto|<|>|<=|>=)?\s*\d+(\.\d+)?\s*\+?\s*((-|–|—|to|and)\s*\d+(\.\d+)?\s*\+?)?\s*(years?|yrs?)?\s*(\+|plus|or more|or above|and above|and more|or less|and below)?\s*(years?|yrs?)?$/i;
/** "Select…", "Please select", "None", "Fresher", "No experience": a list may hold these beside the counts. */
const PLACEHOLDER_OPTION = /^(|-+|select\b.*|please select\b.*|choose\b.*|--.*--|none|n\/a|na|fresher|no experience|not applicable|prefer not to say)$/i;

function experienceAnswer(field: FieldDescriptor, profile: Profile): Decision | undefined {
  if (!["text", "number", "select", "combobox", "dropdown"].includes(field.control) || !answerableLength(field.label)) return undefined;
  // The whole question must be one of the shapes below, so the general guards (which read "experience in years" as
  // "experience in <a skill>") are not needed; someone else's experience is still never the user's.
  const q = normalize(field.label).replace(/\b(yrs?)\b/g, "years").replace(/\bexp\b/g, "experience").replace(/\s+/g, " ").trim();
  if (NOT_THE_USERS.test(q)) return undefined;
  // "Experience" or "Work experience" alone may want a description: only a question about years or a total counts.
  if (!TOTAL_EXPERIENCE_Q.test(q) || !/\b(years|total|overall|how many)\b/.test(q)) return undefined;
  const stated = profile.experienceYears?.trim();
  if (!stated || !/^\d+(\.\d+)?\+?$/.test(stated)) return undefined;
  if (!field.options.length) return { kind: "profile", key: "experienceYears", value: stated, source: "from your profile (total experience)" };
  // Only a list of year counts: a list labelled with this question that holds anything else (a phone box's country
  // codes, "Afghanistan+93", seen on a real Greenhouse form) is not about years at all.
  if (!field.options.every((o) => YEARS_OPTION.test(o.trim()) || PLACEHOLDER_OPTION.test(o.trim()))) return undefined;
  const years = parseFloat(stated);
  const option = bestOption(field.options, stated, 0.9) ?? field.options.find((o) => {
    const r = parseRequirement(/year|yr/i.test(o) ? o : `${o} years`);
    if (!r || r.unit !== "years") return false;
    return (r.min === undefined || years >= r.min) && (r.max === undefined || years <= r.max);
  });
  return option ? { kind: "profile", key: "experienceYears", value: option, source: "from your profile (total experience)" } : undefined;
}

/** "Do you have experience with Kafka?" / "Have you worked with React?" / "Are you familiar with Docker?". */
const HAS_EXPERIENCE_Q = /^(do you have|have you got|have you|are you|do you) (ever |any |some |prior |previous |hands on |practical |working |professional |industry |production |commercial )*(experience|exposure|knowledge|familiarity|worked|used|familiar)\b/;
/** Experience only a job shows ("professional experience with…"): a skill list or a project is not enough. */
const AT_WORK = /\b(professional|industry|production|commercial|enterprise|paid|client|in a work setting|on the job|at work)\b/;
/** Judgement or scale beyond "has used it": asked. */
const JUDGEMENT = /\b(managing|leading|lead|led|architect\w*|expert|expertise|advanced|deep|extensive|senior|mentor\w*|scale|large scale|at scale|migrat\w*|certif\w*|teaching|owning|owned|from scratch|end to end)\b/;

function skillAnswer(field: FieldDescriptor, sheet: FactSheet): Decision | undefined {
  if (!yesNoField(field) || !answerableLength(field.label)) return undefined;
  const q = normalize(field.label);
  if (!HAS_EXPERIENCE_Q.test(q) || NOT_THE_USERS.test(q) || JUDGEMENT.test(q)) return undefined;
  if (/\b(if (yes|so)|please (describe|explain|list|specify)|which|how)\b/.test(q)) return undefined;
  // "Have you worked for Amazon?" is about an employer, not a skill.
  if (/\b(worked|work|employed|interned) (for|at|in the|as)\b|\bemployed\b/.test(q)) return undefined;
  // A number of years is answered only from saved skill years (skillsExperienceAnswer), never from a mention.
  if (/\b(years?|yrs?|months?)\b/.test(q) || parseRequirement(field.label)) return undefined;
  const terms = extractTechTerms(field.label);
  if (!terms.length) return undefined;
  const workOnly = AT_WORK.test(q);
  const anyOf = /\b(or|either|any of|one of)\b/.test(q);
  const found = terms.map((t) => sheet.skills.find((s) => (!workOnly || s.atWork) && s.terms.includes(t)));
  // "Distributed SQL" for someone who knows SQL is a narrower skill: asked.
  if (terms.some((t) => narrowerSkill(field.label, t, terms.filter((o) => o !== t)))) return undefined;
  const hit = anyOf ? found.find(Boolean) : found.every(Boolean) ? found[0] : undefined;
  if (!hit) return undefined; // never "No" for the user: asked
  const value = field.options.length ? yesNoOption(field.options, "Yes") : "Yes";
  if (!value) return undefined;
  const evidence = (anyOf ? [hit] : found).filter(Boolean).map((s) => `${s!.name} (${s!.evidence})`);
  return { kind: "answer", value, question: "Quick answers › skills", source: `from ${evidence.join(", ")}` };
}

/** One fact sheet per profile object (a form asks many questions of the same profile). */
const SHEETS = new WeakMap<Profile, FactSheet>();
export function factSheetOf(profile: Profile): FactSheet {
  let sheet = SHEETS.get(profile);
  if (!sheet) SHEETS.set(profile, (sheet = buildFactSheet(profile)));
  return sheet;
}

// --- where the user lives ----------------------------------------------------------------------------------------

/** "Are you based in India?", "Do you currently reside in the Denver Metro area?": one place, asked about now. */
const RESIDES_Q = /^(?:are|do) you (?:currently |presently |now |still )?(?:live|living|reside|residing|based|located|a resident)(?: out of| in| within| at| of)? (.+)$/i;
/** Anything beyond one place is asked: "…or willing to relocate", "…and able to work Sunday to Thursday", "near our
 * facility", "commuting distance", time zones, and lists ("one of the following countries: Belarus, Cuba…" is an
 * export-control declaration). */
const NOT_ONE_PLACE = /\b(or|and|near|nearby|around|close|commut\w*|willing|relocat\w*|distance|miles?|kms?|kilomet\w*|any|one of|following|these|those|our|time ?zones?|est|pst|mst|cst|cet|gmt|utc|ist|facility|office|hub|campus|listed|specified|posting|outside|abroad|overseas|anywhere)\b|[,;/&:]/i;
const JOB_COUNTRY = /^the country (?:where|in which) (?:this|the) (?:job|role|position|opening|vacancy) (?:is|will be) (?:located|based)$/i;

/** Yes or No to "Do you live in X?" from the Profile's country and city. Yes for the user's own country or city; No
 * for another country, or a city that is only in another country. A different city in the user's own country is
 * asked (suburbs and metro areas: someone in Noida may well say they are in Delhi). */
function residenceAnswer(field: FieldDescriptor, profile: Profile, page?: { jobCountries: string[] }): Decision | undefined {
  if (!yesNoField(field) || field.control === "checkbox") return undefined;
  const label = field.label.trim().replace(/\s+/g, " ").replace(/\s*[?.!]+\s*$/, "");
  const m = RESIDES_Q.exec(label);
  if (!m) return undefined;
  const home = profile.country?.trim() ? countryCode(profile.country) : undefined;
  if (!home) return undefined;
  const homeName = profile.country!.trim();
  const city = profile.location?.trim() ?? "";
  const asked = m[1]!.trim();
  let yes: boolean | undefined;
  let from = "";
  if (JOB_COUNTRY.test(asked)) {
    const job = page?.jobCountries ?? [];
    const iso = job.length === 1 ? countryCode(job[0]!) : undefined;
    if (!iso) return undefined;
    yes = iso === home;
    from = `your Profile country (${homeName}) and the job's country (${job[0]})`;
  } else {
    if (NOT_ONE_PLACE.test(asked)) return undefined;
    const place = asked.replace(/^the /i, "").replace(/\s+(?:metro(?:politan)?\s+)?(?:area|region)$/i, "").trim();
    const countries = countriesIn(place);
    // The place is a country: its whole name ("Cyprus", "the US"), or one country in a few words ("mainland India").
    const iso = countryCode(place) ?? (countries.length === 1 && normalize(place).split(" ").length <= 4 ? countryCode(countries[0]!) : undefined);
    if (iso) {
      yes = iso === home;
      from = `your Profile country (${homeName})`;
    } else if (!countries.length) {
      const cityCountries = countriesOfCity(place);
      if (!cityCountries.length) return undefined;
      if (city && sameCity(city, place)) yes = true;
      else if (!cityCountries.includes(home)) yes = false;
      else return undefined;
      from = `your Profile (${[city, homeName].filter(Boolean).join(", ")})`;
    } else return undefined;
  }
  const value = field.options.length ? yesNoOption(field.options, yes ? "Yes" : "No") : yes ? "Yes" : "No";
  if (!value) return undefined;
  return { kind: "answer", value, question: "Quick answers › where you live", source: `from ${from}` };
}

/** The answer the fact sheet gives to a question the rules could not answer, or nothing (the question is asked). */
export function factSheetAnswer(field: FieldDescriptor, profile: Profile, sheet: FactSheet = factSheetOf(profile),
  page?: { jobCountries: string[] }): Decision | undefined {
  if (field.control === "file" || field.control === "checkbox_group" || field.control === "textarea") return undefined;
  if (field.section && NOT_THE_USERS.test(normalize(field.section))) return undefined;
  return historyAnswer(field, profile, sheet)
    ?? educationAnswer(field, profile, sheet)
    ?? experienceAnswer(field, profile)
    ?? skillAnswer(field, sheet)
    ?? residenceAnswer(field, profile, page);
}

// --- panel help for questions that stay asked -----------------------------------------------------------------

/** A suggestion shown in the panel's answer box for a question that is asked. The user checks it and saves it; it
 * is never filled by itself. */
export interface AnswerSuggestion {
  value: string;
  /** Why: "from your profile: graduating May 2027". */
  from: string;
}

const START_FULL_TIME = /\b(available|availability|start|join|begin|commence)\b/;

/** "When are you available to start full-time?" for a student: "After graduating in May 2027", only when the
 * profile names both the month and the year, and the user is still studying (or the date is still ahead). */
export function answerSuggestion(field: FieldDescriptor, profile: Profile, sheet: FactSheet = factSheetOf(profile), today: Date = new Date()): AnswerSuggestion | undefined {
  if (field.options.length || !["text", "textarea"].includes(field.control)) return undefined;
  const q = normalize(field.label);
  if (!START_FULL_TIME.test(q) || !/\b(when|date|earliest|availability|available)\b/.test(q)) return undefined;
  if (NOT_THE_USERS.test(q)) return undefined;
  if (!sheet.graduationYear || !sheet.graduationMonth) return undefined;
  const month = MONTHS.indexOf(sheet.graduationMonth);
  const ahead = Number(sheet.graduationYear) * 12 + month >= today.getFullYear() * 12 + today.getMonth();
  if (!ahead || (profile.educationStatus && profile.educationStatus !== "pursuing")) return undefined;
  return { value: `After graduating in ${sheet.graduationMonth} ${sheet.graduationYear}`, from: `your profile: graduation ${sheet.graduationMonth} ${sheet.graduationYear}` };
}

/** The Quick answer that would answer an asked question on every form, when it is still empty. */
export function missingQuickAnswer(decision: Decision, profile: Profile): { key: "workCountries" | "noticePeriod" | "relocate"; label: string } | undefined {
  if (decision.kind !== "ask" || decision.reason !== "sensitive") return undefined;
  const facts = profile.facts;
  if ((decision.topic === "work_authorization" || decision.topic === "sponsorship") && !facts?.workCountries?.trim()) {
    return { key: "workCountries", label: "Countries where you can work without a visa" };
  }
  if (decision.topic === "notice_period" && !facts?.noticePeriod?.trim()) return { key: "noticePeriod", label: "Notice period / when you can join" };
  if (decision.topic === "relocation" && !facts?.relocate) return { key: "relocate", label: "Willing to relocate?" };
  return undefined;
}

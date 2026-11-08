/** Data shared by the content script, background worker and side panel. */

export interface ResumeFile {
  name: string;
  type: string;
  dataBase64: string;
}

/** One job in the user's work history, newest first. Dates are "YYYY-MM"; `end` is empty while `current`. */
export interface WorkEntry {
  title: string;
  company: string;
  location: string;
  start: string;
  end: string;
  current: boolean;
  summary: string;
}

/** One answer for each question that most forms ask in their own words. Every value is optional: empty means
 * "ask me on the form". Diversity answers are only used where a form offers a list of choices. */
export interface SkillEntry {
  name: string;
  years: number;
  level?: string;
}

export interface LanguageEntry {
  language: string;
  proficiency: "Native" | "Fluent" | "Professional" | "Conversational" | "Basic";
}

export interface QuickFacts {
  /** Countries where the user may work without sponsorship ("India, EU"). */
  workCountries: string;
  /** Countries where user has temporary authorization (e.g. US F-1 OPT, STEM OPT, Canada PGWP, UK Graduate Route). */
  temporaryWorkCountries?: string;
  /** Countries where the user is NOT authorized to work at all. */
  unauthorizedCountries?: string;
  /** Independent future sponsorship declaration ("Yes" if requiring H-1B/Skilled Worker later, "No" if permanent). */
  needsFutureSponsorship?: "" | "Yes" | "No" | "Decline";
  /** Jobs in any country NOT listed above: "sponsorship" = the user is not authorized there and would need visa
   * sponsorship (authorization questions: No; sponsorship questions: Yes); "ask" or empty = ask each time. */
  otherCountries?: "" | "sponsorship" | "ask";
  /** Bound by a non-compete / non-solicitation agreement. */
  nonCompete?: "" | "Yes" | "No";
  /** "No": no relatives or partner work at companies the user applies to (any other case: asked each time). */
  relativesAtCompanies?: "" | "No";
  /** "None": the user has never held a government security clearance. */
  securityClearance?: "" | "None";
  /** Expected salary for jobs paid in other currencies, one per currency ("USD 70000, EUR 60000, GBP 50000"). */
  expectedSalaryAbroad?: string;
  /** Notice period / earliest start ("Immediate", "30 days", "June 2027"). */
  noticePeriod: string;
  currentCtc: string;
  expectedCtc: string;
  /** Willing to relocate (answers only the general question "Are you willing to relocate?"). */
  relocate: "" | "Yes" | "No";
  /** "How did you hear about us?" */
  heardFrom: string;
  gender: "" | "Male" | "Female" | "Non-binary" | "Decline";
  hispanic: "" | "Yes" | "No" | "Decline";
  race: string;
  veteran: "" | "Yes" | "No" | "Decline";
  disability: "" | "Yes" | "No" | "Decline";
  introVideoUrl?: string;
  projectUrl?: string;
  workMode?: "" | "onsite" | "hybrid" | "remote" | "any";
  travel?: "" | "Yes" | "No" | "Decline";
  travelPercent?: string;
  maxOfficeDays?: number | string;
  needsAccommodation?: "" | "Yes" | "No" | "Decline";
  pronouns?: string;
  sexualOrientation?: string;
  transgender?: "" | "Yes" | "No" | "Decline";
  over18?: "" | "Yes" | "No";
  age?: string;
}

/** Facts about the user. The agent may only ever submit facts that come from here or the answer bank. */
export interface Profile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  country: string;
  linkedin: string;
  github: string;
  portfolio: string;
  resumeUrl?: string;
  introVideoUrl?: string;
  projectUrl?: string;
  currentCompany: string;
  currentTitle: string;
  school: string;
  degree: string;
  discipline: string;
  graduationYear: string;
  /** Total years of professional experience, as the user states it (e.g. "2"). */
  experienceYears: string;
  /** Job-search preferences used for fit scoring (comma-separated in the UI). */
  targetRoles: string;
  preferredLocations: string;
  skills: string;
  address?: string;
  addressLine1?: string;
  addressLine2?: string;
  postalCode?: string;
  state?: string;
  educationLevel?: string;
  /** "completed": finished studying. "pursuing": currently studying for a degree. Empty: not said (asked on forms). */
  educationStatus?: "completed" | "pursuing" | "";
  timezone?: string;
  skillsInventory?: SkillEntry[];
  skillsComplete?: boolean;
  languages?: LanguageEntry[];
  languagesComplete?: boolean;
  /** Jobs for "My Experience"-style repeating sections, newest first (optional). */
  workHistory?: WorkEntry[];
  workHistoryComplete?: boolean;
  /** Answers to the questions most forms ask, in any wording (Answers → Quick answers). Empty = ask me. */
  facts?: QuickFacts;
  resume?: ResumeFile;
}

/** One job from the JobReach feed (official ATS postings only). */
export interface FeedJob {
  id: string;
  company: string;
  platform: string;
  title: string;
  location: string;
  is_india: boolean;
  is_remote: boolean;
  work_mode: string;
  seniority: string;
  exp_min: number | null;
  exp_max: number | null;
  employment_type: string;
  posted_at: string | null;
  first_seen_at: string;
  quality_score: number;
  url: string;
  /** Direct link to the official application form, when it differs from the job page. */
  apply_url?: string;
}

export interface FitResult {
  job: FeedJob;
  score: number;
  /** Why it matched (shown to the user). */
  reasons: string[];
  /** Why it was filtered out, if it was. */
  excluded?: string;
}

export type ProfileKey = Exclude<keyof Profile, "resume" | "workHistory" | "facts" | "languages" | "skillsInventory" | "skillsComplete" | "languagesComplete" | "workHistoryComplete" | "educationStatus">;

/** Questions only the user may answer: the agent never guesses these. */
export type SensitiveTopic =
  /** Identity documents and bank details: never filled, never stored. The user types them on the page. */
  | "identity"
  /** Signatures and "type your name to sign": a legal act the agent never performs. */
  | "signature"
  | "work_authorization"
  | "sponsorship"
  | "salary"
  | "notice_period"
  | "relocation"
  | "gender"
  | "race"
  | "veteran"
  | "disability"
  | "sexual_orientation"
  | "age"
  | "criminal"
  | "consent" | "pronouns" | "transgender" | "accommodation";

export interface AnswerEntry {
  question: string;
  answer: string;
  topic?: SensitiveTopic;
  updatedAt: string;
  company?: string;
  country?: string;
  reused?: boolean;
  intent?: string;
}

export interface UserCorrection {
  question: string;
  answer: string;
  count: number;
  lastUpdated: string;
}

export type ControlType =
  | "text"
  | "email"
  | "tel"
  | "url"
  | "number"
  | "date"
  | "textarea"
  | "select"
  | "radio"
  | "checkbox"
  /** Several checkboxes answering one question ("Select all that apply"). */
  | "checkbox_group"
  | "file"
  | "combobox"
  /** A button that opens a list of choices (Workday, MUI and many design systems). */
  | "dropdown";

export interface FieldDescriptor {
  /** Stable key within one page scan (used to find the element again). */
  key: string;
  label: string;
  /** Original un-translated page label when translated by i18n-labels. */
  originalLabel?: string;
  /** Translated English label when translated by i18n-labels. */
  translatedLabel?: string;
  /** The English label came from the browser's on-device translator (not the reviewed dictionary): only basic
   * contact fields may be filled from it; everything else is asked (a machine translation can flip a "not"). */
  machineTranslated?: boolean;
  control: ControlType;
  required: boolean;
  options: string[];
  name: string;
  autocomplete: string;
  placeholder: string;
  /** Character limit set by the site (maxlength), if any. */
  maxLength?: number;
  /** Help text shown with a text box ("Max. 200 words", "0 / 500 characters"), read for length limits. */
  hint?: string;
  /** Which job block of a repeating work-experience section this field belongs to (0 = first). */
  workBlock?: number;
  /** The heading of the form section the field sits in ("References", "Emergency contact"…), if any. */
  section?: string;
}

/** Topics whose answers are never stored or filled by the agent. */
export const NEVER_REMEMBER: ReadonlySet<SensitiveTopic> = new Set<SensitiveTopic>(["identity", "signature"]);

export type Decision =
  /** `source`: where a value found by the fact sheet came from ("from your work history: Acme"), shown in the panel. */
  | { kind: "profile"; key: ProfileKey | "fullName"; value: string; source?: string }
  | { kind: "answer"; value: string; question: string; reused?: boolean; source?: string }
  /** A value from the user's work history, for a field in the n-th job block. */
  | { kind: "work"; index: number; part: keyof WorkEntry; value: string }
  | { kind: "resume" }
  | { kind: "draft"; value: string; question: string }
  | { kind: "ask"; reason: "sensitive" | "unknown" | "missing_profile_value"; topic?: SensitiveTopic }
  | { kind: "skip"; reason: string };

// >>> L1 tags
export type FillTag = "auto" | "asked" | "reused" | "drafted";
// <<< L1

export type FieldStatus = "filled" | "already_filled" | "failed" | "needs_user" | "skipped";

export interface FieldResult {
  field: FieldDescriptor;
  decision: Decision;
  status: FieldStatus;
  detail?: string;
  /** The site pre-filled a value that differs from the user's profile: the user should check it. */
  review?: boolean;
  tag?: FillTag;
  /** Filled from the user's saved data because the local question model understood a wording the rules did not. */
  understood?: boolean;
}

export type RunStatus =
  | "not_a_form"
  | "needs_user"
  | "ready_to_submit"
  | "submitted_confirmed"
  | "submitted_unconfirmed";

export interface RunReport {
  status: RunStatus;
  platform: string;
  url: string;
  jobTitle: string;
  fields: FieldResult[];
  captcha: boolean;
  confirmationText?: string;
  submittedAt?: string;
  screenshotKey?: string;
  errors: string[];
  /** Steps completed on a multi-step application (absent for one-page forms). */
  steps?: number;
  /** This page of a multi-page form is filled and has a "Next" button: the user checks it and presses Next
   * themselves (Fill never moves a form on or sends it). */
  nextStep?: boolean;
  /** The site showed a robot check or a rate-limit page: the run stopped there (ApplyAgent never solves these). */
  challenge?: string;
}

export type Mode = "review" | "auto";

export type ApplicationStatus = "applied_confirmed" | "needs_check" | "in_progress";

export interface ApplicationRecord {
  id: string;
  url: string;
  platform: string;
  jobTitle: string;
  status: ApplicationStatus;
  createdAt: string;
  submittedAt?: string;
  confirmationText?: string;
  /** Storage key of a PNG screenshot taken on the confirmation page, when permitted. */
  screenshotKey?: string;
  // --- tracker CRM (all optional; set by the user in the Tracker) ---
  /** Where this application stands. Absent: "Applied" (the agent recorded a submission). */
  stage?: TrackerStage;
  company?: string;
  location?: string;
  notes?: string;
  /** Next follow-up day, "YYYY-MM-DD" (local). */
  followUpAt?: string;
  /** First time the employer responded (stage reached Assessment, Interview or Offer). */
  respondedAt?: string;
  stageChangedAt?: string;
}

/** Stages of an application in the tracker (a light CRM, kept on this computer). */
export type TrackerStage = "Saved" | "Applied" | "Assessment" | "Interview" | "Offer" | "Rejected" | "Withdrawn";

/** A job the user saved from any page (title and address only, read from the tab: nothing on the page is touched).
 * Kept apart from submitted applications, so a saved job never counts as a submission. */
export interface SavedJob {
  id: string;
  url: string;
  title: string;
  company: string;
  createdAt: string;
  stage: TrackerStage;
  notes?: string;
  followUpAt?: string;
  /** When the user marked it applied (by hand, outside ApplyAgent). */
  appliedAt?: string;
  respondedAt?: string;
  stageChangedAt?: string;
}

/** A candidate profile persona allowing users to maintain multiple profiles (e.g. Fullstack SWE, Data Scientist). */
export interface CandidateProfile {
  id: string;
  name: string;
  targetRole?: string;
  profile: Profile;
  createdAt: string;
  updatedAt: string;
}

export type ProfilePersona = CandidateProfile;

export type QueueStatus =
  | "queued"
  | "running"
  | "needs_user" // waiting for the user: a question, a CAPTCHA, a site permission, or a validation error
  | "ready" // review mode: filled and waiting for the user to press Submit
  | "applied"
  | "needs_check"
  | "failed"
  | "skipped";

/** A question a queued job is waiting on, answerable once in the Queue's questions inbox. */
export interface PendingQuestion {
  label: string;
  /** Section heading, kept so answers about other people are saved apart (see questionKey). */
  section?: string;
  control: ControlType;
  options: string[];
  required: boolean;
  topic?: SensitiveTopic;
  maxLength?: number;
}

export interface QueueItem {
  id: string;
  url: string;
  title: string;
  company: string;
  status: QueueStatus;
  note?: string;
  tabId?: number;
  /** Questions this job needs answered before it can continue (status "needs_user"). */
  questions?: PendingQuestion[];
  /** Safe pacing: a queued item that waits for a limit or a pause, until this time (ms since epoch). */
  waitUntil?: number;
  addedAt: string;
  updatedAt: string;
}

export interface Settings {
  mode: Mode;
  /** Applications worked on at the same time (1-5). */
  maxParallel: number;
  /** Applications open at the same time on one site, to stay human-paced. */
  perHostMax: number;
  /** Submissions per day. */
  dailyCap: number;
  /** Days before applying to the same company again. */
  cooldownDays: number;
  /** Silent detection of application forms: never types, only recognises pages and updates the badge. */
  detection: "off" | "job_sites" | "allowed_sites";
  /** The local question model (offline, on this computer). Off: the rules alone. */
  understanding: boolean;
}

/** What the silent detector found on a page (read-only). */
export interface Detection {
  kind: "application_form" | "job_page" | "login_wall" | "other";
  platform: string;
  jobTitle: string;
  hasApplyButton: boolean;
  /** Fields the agent would fill / questions it would ask / all fields (application forms only). */
  fill?: number;
  ask?: number;
  total?: number;
  url: string;
}

/** Messages between the extension's parts. */
export type Message =
  /** continuing: a later step of a run already under way (a new page of the same application).
   * resume: a resume for this application only (Apply panel); attached instead of the Profile's resume, which is
   * never changed. Absent: the Profile's resume (the queue never sends one). */
  | { type: "RUN"; mode: Mode; continuing?: boolean; fillOnly?: boolean; resume?: ResumeFile }
  /** Read-only preview: what the agent would do, without touching the page. */
  | { type: "SCAN"; /** A resume chosen for this application only (Preview reads it like Fill). */ resume?: ResumeFile }
  /** Sent by the silent detector after reading a page (nothing typed). */
  | { type: "DETECTED"; detection: Detection }
  /** Click the page's own "Apply" button (only when the user asks, from the panel). */
  | { type: "OPEN_APPLICATION" }
  /** Re-register the silent detector after settings or site permissions changed. */
  | { type: "DETECTION_SYNC" }
  /** Which frame of the tab holds an application form (answered only by that frame). */
  | { type: "PING" }
  /** What the local question model reads in these questions (content script → background → offscreen page). */
  | { type: "UNDERSTAND"; texts: string[] }
  /** The agent started or finished working in this tab (the toolbar icon animates meanwhile). */
  | { type: "AGENT_BUSY"; busy: boolean }
  /** The toolbar icon was clicked: the panel re-reads the page (one-time access may have been granted). */
  | { type: "PANEL_REFRESH" }
  /** Scroll to a field and outline it, so the user can answer it on the page. */
  | { type: "HIGHLIGHT"; label: string; key?: string }
  /** The panel's live checklist: which fields of the application hold a value now (read-only). */
  | { type: "FIELD_STATE" }
  /** The user typed or chose something on the application after a fill (page → panel: read the fields again). */
  | { type: "PAGE_FIELDS_CHANGED" }
  /** Consent review: list the consent and agreement boxes on the application (read-only). */
  | { type: "CONSENT_LIST" }
  /** Scroll to one consent box and outline it. */
  | { type: "CONSENT_SHOW"; id: string }
  /** Tick exactly one consent box, after the user clicked "Tick this box" for it. Refused when its label or place
   * changed since the list was read, or when it is in another frame. */
  | { type: "CONSENT_TICK"; id: string; label: string; frameUrl: string }
  | { type: "SUBMIT" }
  | { type: "RECORD_CORRECTION"; question: string; answer: string; control?: string }
  | { type: "RUN_RESULT"; report: RunReport }
  /** Sent by the content script right before it clicks Submit, so the tracker can expect a confirmation. */
  | { type: "MARK_SUBMITTING"; url: string; jobTitle: string; platform: string }
  | { type: "QUEUE_START" }
  | { type: "QUEUE_PAUSE" }
  | { type: "QUEUE_PUMP" }
  | { type: "QUEUE_SUBMIT"; id: string }
  /** Queue edits from the side panel; the background worker is the only writer of the queue. */
  | { type: "QUEUE_ADD"; jobs: Array<Pick<QueueItem, "url" | "title" | "company">> }
  | { type: "QUEUE_RETRY"; id: string }
  /** Run the agent again in the job's existing tab (after the user answered its questions). */
  | { type: "QUEUE_RERUN"; id: string }
  | { type: "QUEUE_REMOVE"; id: string }
  | { type: "QUEUE_CLEAR_FINISHED" }
// >>> L3 form structure
  | { type: "GET_FORM_STRUCTURE" };
// <<< L3

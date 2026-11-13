/** The agent: reads the form, decides every field, fills and verifies, and submits only when everything
 * required is filled, no CAPTCHA is waiting, and (in review mode) the user has pressed Submit. */

import { translateFieldsOnDevice } from "../shared/locale/translator";
import type { AnswerEntry, ApplicationRecord, Decision, FieldResult, FillTag, Mode, Profile, ResumeFile, RunReport } from "../shared/types";
import { detectSignInWall, generic, isGoogleForms, pickAdapter } from "./adapters";
import { sensitiveTopic, workEntries } from "./classify";
import { codeOptionFor, dialCodePickerFor, isDialCodePicker, JUST_A_DIAL_CODE, phoneBoxFor, selectedCode, splitPhone } from "./phone";
import { decideWithMeaning, MODEL_DECISIONS, type Meaning } from "./meaning";
import { detectChallenge, detectConfirmation, hasCaptcha, visibleErrors } from "./detect";
import { DROPDOWN, extractFields, inWorkSection, sectionHeadings, type ExtractedField } from "./extract";
import { currentValue, fillCombobox, fillDropdown, fillField, fillPhone, type FillOutcome } from "./fill";
import { pickSchool, schoolQueries } from "./schools";
import { deepQueryAll } from "./dom";
import { HEARD_ABOUT, isDeclineAnswer, type PageFacts } from "./facts";
import { jobCountriesWithApi } from "./joblocation";
import { placeOption, placeQueries } from "../shared/place-pick";
import { bestOption, normalize, yesNoOption, type YesNoHint } from "../shared/text";
import { canonicalCountries, countriesIn } from "../shared/countries";
import { pruneDisconnectedCorrections, trackCorrection } from "./corrections";
import { isConsentLabel } from "../shared/consent-review";
import { questionKey } from "./classify";

/** Scroll a field into view and outline it briefly, so the user can answer it on the page. */
let highlightTimeout: ReturnType<typeof setTimeout> | undefined;

export function highlightField(doc: Document, label: string, key?: string): boolean {
  if (highlightTimeout !== undefined) {
    clearTimeout(highlightTimeout);
    highlightTimeout = undefined;
  }
  const { root } = locate(doc);
  if (!root) return false;
  const fields = extractFields(root);
  const field = fields.find((f) => f.descriptor.key === key && f.descriptor.label === label)
    ?? fields.find((f) => f.descriptor.label === label);
  // Hidden file inputs sit behind a styled button: highlight the visible wrapper instead.
  const target = (field?.elements[0]?.closest("[role='group'], .field, fieldset, li, div") as HTMLElement | null) ?? field?.elements[0];
  if (!target) return false;
  target.scrollIntoView?.({ behavior: "smooth", block: "center" });
  const previous = { outline: target.style.outline, offset: target.style.outlineOffset, radius: target.style.borderRadius };
  target.style.outline = "3px solid #8b8cff";
  target.style.outlineOffset = "4px";
  target.style.borderRadius = "6px";
  highlightTimeout = setTimeout(() => {
    highlightTimeout = undefined;
    target.style.outline = previous.outline;
    target.style.outlineOffset = previous.offset;
    target.style.borderRadius = previous.radius;
  }, 2500);
  (field?.elements[0] as HTMLElement | undefined)?.focus?.({ preventScroll: true });
  return true;
}

/** Puts a file the user approved (a cover letter written in the panel) into one file box of the form, found like
 * "Show on page" finds it. Only a file box; never submits. */
export function attachFileTo(doc: Document, label: string, key: string | undefined, file: ResumeFile): { ok: boolean; detail?: string } | undefined {
  const { root } = locate(doc);
  if (!root) return undefined;
  const fields = extractFields(root).filter((f) => f.descriptor.control === "file");
  const field = fields.find((f) => f.descriptor.key === key && f.descriptor.label === label) ?? fields.find((f) => f.descriptor.label === label);
  // Not in this frame: another frame of the page answers (Ashby adds an empty frame after a fill; live round 8).
  if (!field) return undefined;
  const outcome = fillField(field, file.name, file);
  return outcome.ok ? { ok: true } : { ok: false, detail: "The page did not take the file. Please attach it yourself." };
}

export interface AgentContext {
  profile: Profile;
  answers: AnswerEntry[];
  mode: Mode;
  /** How long to wait for the next step after pressing "Next" (tests shorten it). */
  stepTimeoutMs?: number;
  /** What the page says about the job (filled in by the agent). */
  page?: PageFacts;
  /** The local question model: what each question means (absent in tests and when the model cannot run). */
  understand?: (texts: string[]) => Promise<Array<Meaning | null> | null>;
  applications?: ApplicationRecord[];
  /** Safe pacing: a fixed pause after each field the agent fills, so the page's own scripts react (0 when absent). */
  pauseBetweenFieldsMs?: number;
  /** Stop at once when the page shows a robot check or a rate-limit message (on unless switched off). */
  stopOnChallenge?: boolean;
  /** The side panel's "Fill this application", on a form the user has open: fill this page only, never press Next
   * (the queue, working in background tabs, moves through the steps and stops before the final Submit). */
  fillOnly?: boolean;
}

/** The run stops here: the site shows a robot check or says it is limiting requests. Never solved, never bypassed. */
function challengeReport(report: RunReport, kind: string, detail: string): RunReport {
  return { ...report, status: "needs_user", captcha: kind === "captcha" || report.captcha, challenge: detail };
}

/** Consent and agreement boxes are the user's decision: the agent ticks one only with the user's own saved answer to
 * exactly that box. Everything else is left for the side panel's consent review, one box at a time. */
function consentGuard(field: ExtractedField["descriptor"], decision: Decision): Decision | undefined {
  if (field.control !== "checkbox" || !isConsentLabel(field.label)) return undefined;
  const exact = decision.kind === "answer" && normalize(decision.question) === normalize(questionKey(field));
  return exact ? undefined : { kind: "ask", reason: "sensitive", topic: "consent" };
}

const CONSENT_DETAIL = "Consent box: read it and decide under \"Consent boxes on this page\"";

const UNDERSTAND_TIMEOUT_MS = 10_000;

/** The model's reading of each question, by label. Slow, failing or absent model: no readings (rules alone). */
async function readMeanings(fields: ExtractedField[], ctx: Pick<AgentContext, "understand">): Promise<Map<string, Meaning>> {
  const out = new Map<string, Meaning>();
  if (!ctx.understand) return out;
  const labels = [...new Set(fields.map((f) => f.descriptor.label).filter(Boolean))];
  if (!labels.length) return out;
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), UNDERSTAND_TIMEOUT_MS));
  const readings = await Promise.race([ctx.understand(labels).catch(() => null), timeout]);
  if (Array.isArray(readings)) labels.forEach((label, i) => readings[i] && out.set(label, readings[i]!));
  return out;
}

export function locate(doc: Document) {
  const adapter = pickAdapter(doc);
  const root = adapter.formRoot(doc) ?? generic.formRoot(doc);
  return { adapter, root };
}

function baseReport(doc: Document, platform: string, jobTitle: string): RunReport {
  return { status: "not_a_form", platform, url: doc.location?.href ?? "", jobTitle, fields: [], captcha: false, errors: [] };
}

/** Read-only preview: every field and what the agent would do with it. Types nothing, uploads nothing. */
export async function scanForm(doc: Document, ctx: Omit<AgentContext, "mode">): Promise<RunReport> {
  const { adapter, root } = locate(doc);
  const report = baseReport(doc, adapter.platform, adapter.jobTitle(doc));
  const wall = detectSignInWall(doc);
  if (wall.isWall) {
    return {
      ...report,
      status: "needs_user",
      challenge: wall.reason || "Sign in, then press Continue",
      errors: ["Sign in, then press Continue. ApplyAgent never types passwords or creates accounts."],
    };
  }
  if (!root) return report;
  const page: PageFacts = ctx.page ?? { jobCountries: await jobCountriesWithApi(doc), url: doc.location?.href ?? "", applications: ctx.applications };
  const fields = extractFields(root);
  await translateFieldsOnDevice(fields.map((f) => f.descriptor), doc.documentElement?.lang ?? "");
  const meanings = await readMeanings(fields, ctx);
  report.fields = fields.map((field) => {
    const first = field.elements[0];
    const code = first && isDialCodePicker(first) && phoneBoxFor(first) ? splitPhone(ctx.profile.phone).code : undefined;
    const decided: Decision = code ? { kind: "profile", key: "phone", value: `+${code}` }
      : decideWithMeaning(field.descriptor, ctx.profile, ctx.answers, page, meanings.get(field.descriptor.label));
    const guarded = consentGuard(field.descriptor, decided);
    const decision: Decision = guarded ?? decided;
    const existing = code ? "" : currentValue(field); // a picker's default code is not the user's choice
    const status: FieldResult["status"] = existing ? "already_filled"
      : guarded && !field.descriptor.required ? "skipped"
      : decision.kind === "ask" ? "needs_user" : decision.kind === "draft" ? "needs_user" : decision.kind === "skip" ? "skipped" : "filled";
    if (guarded && !existing) return { field: field.descriptor, decision, status, detail: CONSENT_DETAIL };
    return { field: field.descriptor, decision, status, review: decision.kind === "draft" || undefined, detail: decision.kind === "draft" ? "draft ready for review" : status === "filled" ? "would fill" : undefined,
      understood: (status === "filled" && MODEL_DECISIONS.has(decision)) || undefined };
  });
  report.captcha = hasCaptcha(doc);
  report.status = report.fields.some((r) => r.field.required && r.status === "needs_user") || report.captcha
    ? "needs_user" : "ready_to_submit";
  const challenge = ctx.stopOnChallenge === false ? null : detectChallenge(doc);
  if (challenge) report.challenge = challenge.detail;
  return report;
}

/** Wait until the form stops changing (fields appear, values get set): a value snapshot unchanged for `quietMs`. */
async function settle(doc: Document, quietMs = 900, maxMs = 8000, minMs = 0): Promise<void> {
  const snapshot = () => {
    const { root } = locate(doc);
    return root ? extractFields(root).map((f) => `${f.descriptor.label}=${currentValue(f)}`).join("\n") : "";
  };
  let last = snapshot();
  let stableSince = Date.now();
  const started = Date.now();
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline && (Date.now() - stableSince < quietMs || Date.now() - started < minMs)) {
    await sleep(150);
    const now = snapshot();
    if (now !== last) {
      last = now;
      stableSince = Date.now();
    }
  }
}

const ADD_TEXT = /^(\+\s*)?(add( another| more| new)?( work)?( experience| position| job| employment| entry)?|weitere hinzuf[üu]gen|hinzuf[üu]gen|ajouter|a[ñn]adir|agregar|adicionar|aggiungi|toevoegen)$/i;

function workBlocks(scope: ParentNode): number {
  return new Set(extractFields(scope).map((f) => f.descriptor.workBlock).filter((b) => b !== undefined)).size;
}

/** "Add" controls: buttons, and links that go nowhere (Breezy's "+ Add Position" is `<a href="">` run by a script).
 * A link with a real address would leave the form, so it is never pressed. */
const ADD_CONTROLS = "button, [role='button'], a";
const goesNowhere = (el: HTMLElement): boolean => {
  if (el.tagName !== "A") return true;
  const href = (el.getAttribute("href") ?? "").trim();
  return href === "" || href === "#" || /^javascript:/i.test(href);
};
const captionOf = (el: HTMLElement): string => (el.textContent || el.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim();

/** Press an "Add" control. A link that goes nowhere still follows `href=""` (a reload) unless the page stops it, so the
 * default is stopped after the page's own handler has run. */
async function pressAdd(doc: Document, add: HTMLElement): Promise<void> {
  if (add.tagName === "A") add.addEventListener("click", (e) => e.preventDefault(), { once: true });
  add.click();
  await settle(doc, 400, 4000);
}

/** Repeating work-experience sections start with fewer job blocks than the user has jobs: press the section's own
 * "Add" button until every job has a block (one click per missing job, stopping if a click adds nothing).
 * Blocks are never removed: the user may have added them on purpose. */
async function addWorkBlocks(doc: Document, ctx: AgentContext): Promise<void> {
  const wanted = Math.min(workEntries(ctx.profile).length, 6);
  for (let i = 0; i < wanted; i++) {
    const blocks = workBlocks(locate(doc).root ?? doc.body);
    if (blocks >= wanted) return;
    const headings = sectionHeadings(doc);
    const add = deepQueryAll<HTMLElement>(doc, ADD_CONTROLS).find((b) => ADD_TEXT.test(captionOf(b)) && goesNowhere(b) && inWorkSection(b, headings));
    if (!add) return;
    await pressAdd(doc, add);
    if (workBlocks(locate(doc).root ?? doc.body) <= blocks) return;
  }
}

const ADD_EDUCATION = /^(\+\s*)?add( another| more| new)?( education| school| degree| qualification)$/i;
const SCHOOL_BOX = /\b(school|university|college|institution|universit\w*|hochschule|ecole|escuela|faculdade)\b/i;

/** An "Education" section with an "+ Add Education" control and no school box yet (Breezy): one block for the school in
 * the profile. Pressed once; never when the user has no school saved or the form already shows a school box. */
async function addEducationBlock(doc: Document, ctx: AgentContext): Promise<void> {
  if (!ctx.profile.school?.trim()) return;
  if (extractFields(locate(doc).root ?? doc.body).some((f) => SCHOOL_BOX.test(f.descriptor.label))) return;
  const add = deepQueryAll<HTMLElement>(doc, ADD_CONTROLS).find((b) => ADD_EDUCATION.test(captionOf(b)) && goesNowhere(b));
  if (add) await pressAdd(doc, add);
}

/** A country-code picker beside a phone box is part of the phone number: it gets the code of the user's number, unless
 * the user already typed a number there (then it is theirs, like the number). */
async function fillDialCode(field: ExtractedField, picker: Element, box: HTMLInputElement, ctx: AgentContext): Promise<FieldResult> {
  const { code } = splitPhone(ctx.profile.phone);
  if (!code) {
    return { field: field.descriptor, decision: { kind: "skip", reason: "your phone number has no +country code" }, status: "skipped",
      detail: "Add the +country code to your phone number in your profile" };
  }
  const decision: Decision = { kind: "profile", key: "phone", value: `+${code}` };
  const typed = box.value.trim();
  if (typed && !JUST_A_DIAL_CODE.test(typed)) return { field: field.descriptor, decision, status: "already_filled", detail: currentValue(field) };
  if (selectedCode(picker) === code) return { field: field.descriptor, decision, status: "filled", detail: `+${code}` };
  let outcome: FillOutcome;
  if (picker instanceof HTMLSelectElement) {
    const option = codeOptionFor(picker, code, ctx.profile.country);
    outcome = option ? fillField(field, option.text) : { ok: false, detail: `+${code} is not in this list` };
    if (option && picker.selectedOptions[0] !== option) outcome = { ok: false, detail: `could not choose +${code}` };
  } else {
    outcome = await fillDropdown(picker as HTMLElement, `+${code}`);
    if (outcome.ok && selectedCode(picker) !== code) outcome = { ok: false, detail: `could not choose +${code}` };
  }
  return { field: field.descriptor, decision, status: outcome.ok ? "filled" : "failed", detail: outcome.ok ? `+${code}` : outcome.detail };
}

/** The number for a phone box: national when its own picker shows the user's code, the full number when there is no
 * picker, nothing when a picker shows some other code (the user sets it: a number under the wrong code is wrong). */
function phoneFor(box: Element, ctx: AgentContext): { value: string } | { problem: string } {
  const full = ctx.profile.phone;
  const picker = dialCodePickerFor(box);
  if (!picker) return { value: full };
  const { code, national } = splitPhone(full);
  if (!code) return { value: full };
  const shown = selectedCode(picker);
  if (shown === code) return { value: national };
  // A list of countries without codes: right when it shows the user's country.
  if (!shown && ctx.profile.country && normalize(picker instanceof HTMLSelectElement ? picker.selectedOptions[0]?.text ?? "" : picker.textContent ?? "")
    .includes(normalize(ctx.profile.country))) return { value: national };
  return { problem: shown ? `The country code shows +${shown}, your number is +${code}: set the code, then the number` : `Choose the country code +${code}, then the number` };
}

function fillTagFor(d: Decision): FillTag | undefined {
  if (d.kind === "answer") return d.reused ? "reused" : "auto";
  if (d.kind === "profile" || d.kind === "work" || d.kind === "resume") return "auto";
  if (d.kind === "draft") return "drafted";
  if (d.kind === "ask") return "asked";
  return undefined;
}

/** Boxes the agent types into (their value is the text itself). */
const TYPED_CONTROLS = new Set(["text", "email", "tel", "url", "number", "textarea"]);

async function fillOne(field: ExtractedField, ctx: AgentContext, meaning?: Meaning): Promise<FieldResult> {
  const first = field.elements[0];
  const box = first && isDialCodePicker(first) ? phoneBoxFor(first) : undefined;
  if (first && box) return fillDialCode(field, first, box, ctx);
  const decision = decideWithMeaning(field.descriptor, ctx.profile, ctx.answers, ctx.page, meaning);
  const phone = decision.kind === "profile" && decision.key === "phone";
  // A phone widget's pre-filled "+1" is not the user's number: it is replaced.
  // A salary-currency list still on the page's own default (Breezy shows "US Dollar" before anyone chooses) is not the
  // user's choice: the currency of the salary ApplyAgent types replaces it (live round 8: "95000" went in as dollars
  // for a euro salary on a job in Dublin).
  const pageDefault = decision.kind === "answer" && decision.question === "Quick answers › salary currency"
    && first instanceof HTMLSelectElement && (first.selectedIndex <= 0 || !!first.options[first.selectedIndex]?.defaultSelected);
  const existing = (phone && JUST_A_DIAL_CODE.test(currentValue(field))) || pageDefault ? "" : currentValue(field);
  if (existing) {
    // Never overwrite, but flag a site pre-fill (e.g. resume parsing) that disagrees with the user's facts.
    const differs = (decision.kind === "profile" || decision.kind === "work") && !sameValue(existing, decision.value);
    return {
      field: field.descriptor, decision, status: "already_filled", review: differs || undefined,
      detail: differs ? `The site filled "${existing}"; your profile says "${decision.value}"` : existing,
      tag: fillTagFor(decision),
    };
  }
  if (decision.kind === "skip") return { field: field.descriptor, decision, status: "skipped", detail: decision.reason };
  const guarded = consentGuard(field.descriptor, decision);
  if (guarded) return { field: field.descriptor, decision: guarded, status: field.descriptor.required ? "needs_user" : "skipped", detail: CONSENT_DETAIL };
  if (decision.kind === "ask") return { field: field.descriptor, decision, status: "needs_user", tag: "asked" };
  const el = field.elements[0]!;
  let value = decision.kind === "resume" ? ctx.profile.resume?.name ?? "" : decision.value;
  if (phone) {
    const number = phoneFor(el, ctx);
    if ("problem" in number) return { field: field.descriptor, decision, status: "needs_user", detail: number.problem };
    value = number.value;
  }
  // A school is one exact institution: its own matching and searches ("IIT Jodhpur" is listed by its full name).
  const school = decision.kind === "profile" && decision.key === "school";
  // A saved "Decline to self identify" lands only on a choice that declines (lists whose choices show once opened).
  const declineOnly = decision.kind === "answer" && isDeclineAnswer(value) ? (labels: string[]) => {
    const declines = labels.filter(isDeclineAnswer);
    return bestOption(declines, value, 0.3) ?? (declines.length === 1 ? declines[0] : undefined);
  } : undefined;
  // The user's own city in a places type-ahead: the city alone is searched too, and only the same place is taken
  // (live run 7: "Austin, TX" found nothing on 9 Ashby and Greenhouse location lists).
  const home = decision.kind === "profile" && decision.key === "location"
    ? { location: value, state: ctx.profile.state, country: ctx.profile.country } : undefined;
  // A Yes or No decided before the list showed its options (react-select lists open only when clicked): the option
  // that says it, read from the whole list ("I do not have a valid work permit…", "Yes, I will require sponsorship now…").
  const yesNo = decision.kind === "answer" && !declineOnly && /^(yes|no)$/i.test(value.trim())
    ? (labels: string[]) => yesNoOption(labels, value, yesNoHint(field, ctx)) : undefined;
  // "How did you hear about us?": "LinkedIn" among "LinkedIn advertisement" and "LinkedIn job search" (Fivetran).
  const source = decision.kind === "answer" && HEARD_ABOUT.test(normalize(field.descriptor.label))
    ? (labels: string[]) => bestOption(labels, value) ?? sourceOption(labels, value) : undefined;
  // A state list for US states only, with "I am located outside the United States" (Bill.com), for a user abroad.
  const abroad = decision.kind === "profile" && decision.key === "state" && livesOutsideUs(ctx.profile)
    ? (labels: string[]) => bestOption(labels, value) ?? outsideUsOption(labels) : undefined;
  const custom = declineOnly ?? yesNo ?? source ?? abroad;
  let outcome = field.descriptor.control === "combobox" ? await fillCombobox(el as HTMLInputElement, value, 6000,
      school ? { queries: schoolQueries(value), pick: (labels) => pickSchool(labels, value) }
        : declineOnly ? { pick: declineOnly, first: ["", "decline", "wish", "prefer not"] }
          // The full place name first ("Austin, Texas"): Greenhouse's city search finds nothing for "Austin, TX" and
          // only gives up after the wait (round 10: 6.2 s on every Greenhouse location list).
          // Only when the saved location uses a short state code: otherwise the user's own wording goes first ("Pune"
          // first, never the country "India" before it).
          : home ? { first: /,\s*[A-Z]{2}\s*$/.test(value) ? placeQueries(home).filter((p) => p.includes(",")).slice(0, 1) : [], queries: placeQueries(home), pick: (labels) => placeOption(labels, home, (l) => bestOption(l, value)) }
            : custom ? { pick: custom, first: yesNo || abroad ? [""] : [] } : {})
    : field.descriptor.control === "dropdown" || el.matches(DROPDOWN) ? await fillDropdown(el, value, 4000, custom)
    // Phone boxes often format the number as it is typed, or beside a country picker keep only the national part.
    : phone && (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) ? fillPhone(el, value, splitPhone(ctx.profile.phone).code)
    : fillField(field, value, ctx.profile.resume);
  // A school the list does not know (many Indian colleges are missing from Greenhouse's list): "Other", and the
  // school's name in the box that "Other" opens, if it opens one. Flagged so the user sees it.
  let review: boolean | undefined;
  if (!outcome.ok && school && field.descriptor.control === "combobox" && /^no option matches/.test(outcome.detail ?? "")) {
    const other = await schoolNotListed(field, value);
    if (other) {
      outcome = other;
      review = true;
    }
  }
  return {
    field: field.descriptor, decision, status: outcome.ok ? "filled" : "failed", detail: outcome.detail,
    tag: fillTagFor(decision), understood: MODEL_DECISIONS.has(decision) || undefined, review,
  };
}

/** What helps a Yes/No land on the right option: the question's topic, and whether the user may work in the job's
 * one country today (their own Quick answer for that country; unknown otherwise). */
function yesNoHint(field: ExtractedField, ctx: AgentContext): YesNoHint {
  const topic = sensitiveTopic(field.descriptor);
  const job = ctx.page?.jobCountries ?? [];
  let authorizedHere: boolean | undefined;
  if (job.length === 1) {
    const entry = ctx.answers.find((a) => a.topic === "work_authorization" && a.country && countriesIn(a.country).length === 1
      && countriesIn(a.country)[0] === job[0] && /^(yes|no)$/i.test(a.answer.trim()));
    if (entry) authorizedHere = /^yes$/i.test(entry.answer.trim());
  }
  return { topic, authorizedHere };
}

/** Among several options naming the source, the one for a job listing ("LinkedIn job search", not "LinkedIn
 * advertisement"); nothing when that is not clear. */
export function sourceOption(labels: string[], value: string): string | undefined {
  const want = normalize(value);
  if (!want) return undefined;
  const named = labels.filter((l) => ` ${normalize(l)} `.includes(` ${want} `));
  if (named.length === 1) return named[0];
  const listing = named.filter((l) => /\b(job|jobs|search|posting|listing|board|careers?)\b/.test(normalize(l)) && !/\b(ad|ads|advert\w*|sponsored|recruiter|message|inmail|post)\b/.test(normalize(l)));
  return listing.length === 1 ? listing[0] : undefined;
}

const livesOutsideUs = (profile: Profile) => {
  const home = canonicalCountries(profile.country ?? "")[0];
  return !!home && home !== "United States";
};

/** "I am located outside the United States and its territories", when the list has exactly one such option. */
export function outsideUsOption(labels: string[]): string | undefined {
  const hits = labels.filter((l) => /\b(outside|not in|not located in|not based in) (of )?(the )?(united states|us|usa|u s|u s a)\b|\bnon us\b|^(international|outside us)$/.test(normalize(l)));
  return hits.length === 1 ? hits[0] : undefined;
}

const NOT_LISTED = /^(other|others|other school|other university|other institution|my school is not listed|school not listed|not listed|(school|university|institution) not (listed|in (the )?list))$/;

/** The school list's own "Other", then the school's name in a box that appears for it ("Other school", "Please
 * specify"). Nothing when the list has no such option. */
async function schoolNotListed(field: ExtractedField, school: string): Promise<FillOutcome | undefined> {
  const input = field.elements[0] as HTMLInputElement;
  const doc = input.ownerDocument;
  const scan = () => extractFields(locate(doc).root ?? doc.body);
  const before = new Set(scan().map((f) => f.descriptor.key));
  const picked = await fillCombobox(input, "Other", 4000, { pick: (labels) => labels.find((l) => NOT_LISTED.test(normalize(l))), first: ["Other", ""] });
  if (!picked.ok) return undefined;
  await sleep(500);
  const extra = scan().find((f) => !before.has(f.descriptor.key)
    && (f.descriptor.control === "text" || f.descriptor.control === "textarea")
    && /other|specify|school|universit|college|institution|name/i.test(f.descriptor.label) && !currentValue(f));
  const chose = picked.chosen ?? "Other";
  if (extra) {
    const typed = fillField(extra, school);
    if (typed.ok) return { ok: true, detail: `your school is not in this list: chose "${chose}" and typed it in "${extra.descriptor.label}"`, chosen: chose };
  }
  return { ok: true, detail: `your school is not in this list: chose "${chose}"; please check`, chosen: chose };
}

/** Fill everything the agent is allowed to fill. Never overwrites a value already present. */
/** While a fill runs, nothing may send or move the form on. Opening a custom dropdown can click a plain <button>
 * inside the form, and a button with no type is a Submit button; a page script may also submit on a value change.
 * Clicks still reach the page (the dropdown opens); only the submit itself is cancelled. */
function guardSubmits(doc: Document): () => void {
  const isSubmitter = (el: Element | null): boolean => {
    const b = el?.closest("button, input[type='submit'], input[type='image']");
    if (!b) return false;
    if (b instanceof HTMLButtonElement) return b.type === "submit" && !!b.form;
    return !!(b as HTMLInputElement).form;
  };
  const onSubmit = (e: Event) => {
    e.preventDefault();
    e.stopImmediatePropagation();
  };
  const onClick = (e: Event) => {
    if (isSubmitter(e.target as Element | null)) e.preventDefault();
  };
  doc.addEventListener("submit", onSubmit, true);
  doc.addEventListener("click", onClick, true);
  return () => {
    doc.removeEventListener("submit", onSubmit, true);
    doc.removeEventListener("click", onClick, true);
  };
}

/** What each field of the application holds now, for the panel's live checklist. File inputs often sit behind a
 * styled button that shows the chosen file elsewhere: their state is not guessed (null). */
export function fieldStates(doc: Document): Array<{ key: string; label: string; filled: boolean | null; value: string }> {
  const { root } = locate(doc);
  if (!root) return [];
  return extractFields(root).map((f) => {
    if (f.descriptor.control === "file") return { key: f.descriptor.key, label: f.descriptor.label, filled: null, value: "" };
    const value = currentValue(f).trim();
    return { key: f.descriptor.key, label: f.descriptor.label, filled: !!value, value: value.slice(0, 120) };
  });
}

/** Required fields that are still empty on the page right now (whatever the fill thought). */
export function emptyRequired(root: HTMLElement): string[] {
  return extractFields(root)
    .filter((f) => f.descriptor.required && f.descriptor.control !== "file" && !currentValue(f))
    .map((f) => f.descriptor.label || f.descriptor.name || "a required field");
}

export async function fillForm(doc: Document, context: AgentContext): Promise<RunReport> {
  const release = guardSubmits(doc);
  try {
    return await fillFormUnguarded(doc, context);
  } finally {
    // The page's own reactions to the last values (a re-render, a validation) settle before the guard goes.
    await sleep(50);
    release();
  }
}

async function fillFormUnguarded(doc: Document, context: AgentContext): Promise<RunReport> {
  // Where the job is, read once: it answers "Will you require sponsorship to work here?" (see facts.ts).
  const ctx: AgentContext = { ...context, page: context.page ?? { jobCountries: await jobCountriesWithApi(doc), url: doc.location?.href ?? "", applications: context.applications } };
  const { adapter, root } = locate(doc);
  const report = baseReport(doc, adapter.platform, adapter.jobTitle(doc));
  const stopOnChallenge = ctx.stopOnChallenge !== false;
  const challengeNow = () => (stopOnChallenge ? detectChallenge(doc) : null);
  const pause = Math.max(0, ctx.pauseBetweenFieldsMs ?? 0);
  // A robot check or rate-limit page: stop before touching anything.
  const before = challengeNow();
  if (before) return challengeReport(report, before.kind, before.detail);
  const wall = detectSignInWall(doc);
  if (wall.isWall) {
    return {
      ...report,
      status: "needs_user",
      challenge: wall.reason || "Sign in, then press Continue",
      errors: ["Sign in, then press Continue. ApplyAgent never types passwords or creates accounts."],
    };
  }
  if (!root) {
    // A page without a form may be the confirmation page of an earlier submission.
    const confirmation = detectConfirmation(doc);
    return confirmation.confirmed ? { ...report, status: "submitted_confirmed", confirmationText: confirmation.text, submittedAt: new Date().toISOString() } : report;
  }

  // 1. The resume first: many sites read it and fill the form themselves. Wait until that is finished, then fill
  //    only what is still empty (and flag what the site filled differently from the user's facts).
  const phases: Record<string, number> = {};
  let mark = Date.now();
  const lap = (name: string) => { const now = Date.now(); phases[name] = (phases[name] ?? 0) + now - mark; mark = now; };
  const timed = async (field: ExtractedField, meaning?: Meaning): Promise<FieldResult> => {
    const t0 = Date.now();
    const r = await fillOne(field, ctx, meaning);
    return { ...r, ms: Date.now() - t0 };
  };
  const uploads: FieldResult[] = [];
  const uploaded = new Set<Element>();
  for (const field of extractFields(root).filter((f) => f.descriptor.control === "file")) {
    const result = await timed(field);
    if (result.status === "filled") uploaded.add(field.elements[0]!);
    uploads.push(result);
  }
  // Resume parsers start a moment after the upload and take a few seconds: give them time before typing.
  // Start pre-reading question meanings concurrently while the resume parser settles:
  const preRemaining = extractFields(locate(doc).root ?? root).filter((f) => f.descriptor.control !== "file");
  await translateFieldsOnDevice(preRemaining.map((f) => f.descriptor), doc.documentElement?.lang ?? "");
  const meaningsPromise = readMeanings(preRemaining, ctx);
  lap("upload");
  // Resume parsers start a moment after the upload. A value the page clears afterwards is typed again in step 4, so
  // the wait ends as soon as the form is quiet (round 10: a fixed 2 s on every form).
  if (uploaded.size) await settle(doc, 700, 10_000, 800);
  lap("resumeSettle");
  // 2. One block per job in the work history ("Add another" in a repeating experience section).
  await addWorkBlocks(doc, ctx);
  await addEducationBlock(doc, ctx);
  lap("addBlocks");
  // 3. Everything else, read again: the page may have changed meanwhile.
  const rest: FieldResult[] = [];
  const remaining = extractFields(locate(doc).root ?? root).filter((f) => f.descriptor.control !== "file"); // files: step 1
  await translateFieldsOnDevice(remaining.map((f) => f.descriptor), doc.documentElement?.lang ?? "");
  const meanings = await meaningsPromise;
  const newFields = remaining.filter((f) => !meanings.has(f.descriptor.label));
  if (newFields.length) {
    const postMeanings = await readMeanings(newFields, ctx);
    for (const [label, m] of postMeanings) meanings.set(label, m);
  }
  lap("meanings");
  for (const [index, field] of remaining.entries()) {
    // A robot check that appears while filling (some sites show one after a few fields): stop right there.
    const challenge = challengeNow();
    if (challenge) return challengeReport({ ...report, fields: [...uploads, ...rest] }, challenge.kind, challenge.detail);
    const res = await timed(field, meanings.get(field.descriptor.label));
    if (res.status === "filled" && (res.decision.kind === "profile" || res.decision.kind === "answer" || res.decision.kind === "work")) {
      trackCorrection(doc, field);
    }
    rest.push(res);
    // A fixed pause (the same every time) so the page's own scripts can react to the value: reliability, not disguise.
    if (pause && index < remaining.length - 1 && (res.status === "filled" || res.status === "failed")) await sleep(pause);
  }
  // 4. Typed values the page has cleared since (live run: Greenhouse emptied the first name, last name and email typed
  //    while its resume handling was still busy, and the report said "filled"). Empty again, so typing them once more
  //    overwrites nothing; a value the page clears twice is reported as not filled.
  for (const [index, field] of remaining.entries()) {
    const res = rest[index];
    const box = field.elements[0];
    if (!res || res.status !== "filled" || !TYPED_CONTROLS.has(field.descriptor.control) || !(box instanceof HTMLInputElement || box instanceof HTMLTextAreaElement)
      || !box.isConnected || currentValue(field)) continue;
    const again = await fillOne(field, ctx, meanings.get(field.descriptor.label));
    rest[index] = again.status === "filled" && currentValue(field)
      ? { ...again, detail: again.detail ?? "typed again: the page had cleared it" }
      : { ...res, status: "failed", detail: "the page cleared this value: type it yourself" };
  }
  lap("fields");
  const results = [...uploads, ...rest];

  report.fields = results;
  report.phases = phases;
  const after = challengeNow();
  if (after) return challengeReport(report, after.kind, after.detail);
  report.captcha = hasCaptcha(doc);
  const blocking = results.some(
    (r) => r.field.required && (r.status === "needs_user" || r.status === "failed"),
  );
  report.status = blocking || report.captcha ? "needs_user" : "ready_to_submit";
  return report;
}


/** Same fact written differently ("ASHA VERMA" / "Asha Verma", "+91 90000 00000" / "9000000000")? */
export function sameValue(a: string, b: string): boolean {
  const x = normalize(a);
  const y = normalize(b);
  if (!x || !y) return false;
  if (x === y || x.includes(y) || y.includes(x)) return true;
  const dx = a.replace(/\D/g, "");
  const dy = b.replace(/\D/g, "");
  return dx.length >= 7 && dy.length >= 7 && dx.slice(-10) === dy.slice(-10);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Click submit and wait for the employer's confirmation. Never reports success without it. */
export type BeforeSubmit = (report: RunReport) => Promise<void>;

/** Fields the browser's own validation would reject (required but empty, wrong format, ...). */
function invalidFields(root: HTMLElement): string[] {
  const form = root instanceof HTMLFormElement ? root : root.closest("form");
  if (!form || form.noValidate || form.checkValidity()) return [];
  return extractFields(form)
    .filter((f) => f.elements.some((e) => "checkValidity" in e && typeof (e as HTMLInputElement).checkValidity === "function" && !(e as HTMLInputElement).checkValidity()))
    .map((f) => { const first = f.elements[0]; const msg = first && "validationMessage" in first && typeof (first as HTMLInputElement).validationMessage === "string" ? (first as HTMLInputElement).validationMessage : "invalid"; return `${f.descriptor.label || f.descriptor.name}: ${msg || "invalid"}`; });
}

export async function submitForm(doc: Document, timeoutMs = 20000, beforeSubmit?: BeforeSubmit): Promise<RunReport> {
  const { adapter, root } = locate(doc);
  const report = baseReport(doc, adapter.platform, adapter.jobTitle(doc));
  const wall = detectSignInWall(doc);
  if (wall.isWall) return { ...report, status: "needs_user", challenge: wall.reason || "Sign in, then press Continue", errors: ["Sign in, then press Continue"] };
  if (!root) return report;
  if (hasCaptcha(doc)) return { ...report, status: "needs_user", captcha: true, challenge: "a CAPTCHA" };
  const action = adapter.action(root);
  if (!action) return { ...report, status: "needs_user", errors: ["Submit button not found"] };
  // Pressing "Next" is not submitting: the tracker must never record an application that was not sent.
  if (action.kind === "next") {
    return { ...report, status: "needs_user", errors: ["This isn't the last step yet. Press Fill to continue to the next step."] };
  }
  const button = action.button;
  // Every required field must hold a value on the page itself, whatever the fill reported (round 4: a form was
  // sent with required fields still empty). Then the browser's own checks.
  const empty = emptyRequired(root);
  if (empty.length) return { ...report, status: "needs_user", errors: [`Still empty: ${empty.slice(0, 6).join("; ")}${empty.length > 6 ? ` and ${empty.length - 6} more` : ""}. Fill them, then submit.`] };
  // The browser silently refuses to submit an invalid form, so check first and say exactly what is missing.
  const invalid = invalidFields(root);
  if (invalid.length) return { ...report, status: "needs_user", errors: invalid };

  // Only errors that appear after clicking count; some pages carry static "alert" banners.
  const before = new Set(visibleErrors(doc));
  await beforeSubmit?.(report);
  button.click();
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await sleep(500);
    const confirmation = detectConfirmation(doc);
    if (confirmation.confirmed) return { ...report, status: "submitted_confirmed", confirmationText: confirmation.text, submittedAt: new Date().toISOString() };
    if (hasCaptcha(doc)) return { ...report, status: "needs_user", captcha: true, challenge: "a CAPTCHA" };
    const errors = visibleErrors(doc).filter((e) => !before.has(e));
    if (errors.length) return { ...report, status: "needs_user", errors };
  }
  // If the page navigated away, the confirmation page reports itself on load (see content/index.ts).
  return { ...report, status: "submitted_unconfirmed" };
}

export const MAX_STEPS = 8;
const STEP_WAIT_MS = 10_000;

/** What the current step asks, and which of its fields hold a value: changes when the next step appears, even
 * when it repeats the same questions (a second "Work experience" block starts empty). */
function stepSignature(doc: Document): string {
  const { root } = locate(doc);
  if (!root) return "";
  return extractFields(root).map((f) => `${f.descriptor.label}|${f.descriptor.control}|${currentValue(f) ? 1 : 0}`).join("\n");
}

type StepOutcome =
  | { kind: "advanced" }
  | { kind: "confirmed"; text?: string }
  | { kind: "errors"; errors: string[] }
  | { kind: "captcha" }
  | { kind: "stuck" };

/** Press "Next" and wait until the next step has rendered and settled (same fields on two checks in a row). A step
 * with no fields at all (a "Review" page) counts as new once the pressed button has been replaced. */
async function pressNext(doc: Document, button: HTMLElement, timeoutMs: number): Promise<StepOutcome> {
  const before = stepSignature(doc);
  const errorsBefore = new Set(visibleErrors(doc));
  button.click();
  const deadline = Date.now() + timeoutMs;
  let previous = before;
  while (Date.now() < deadline) {
    await sleep(300);
    const confirmation = detectConfirmation(doc);
    if (confirmation.confirmed) return { kind: "confirmed", text: confirmation.text };
    if (hasCaptcha(doc)) return { kind: "captcha" };
    const errors = visibleErrors(doc).filter((e) => !errorsBefore.has(e));
    if (errors.length) return { kind: "errors", errors };
    const now = stepSignature(doc);
    const changed = now !== before || !button.isConnected;
    if (changed && now === previous && (now || !button.isConnected)) return { kind: "advanced" };
    previous = now;
  }
  return { kind: "stuck" };
}

/** Earlier steps are behind the user now: an optional question left open there stays blank. */
function settled(fields: FieldResult[], step: number): FieldResult[] {
  return fields.map((f) => ({
    ...f,
    status: f.status === "needs_user" ? "skipped" as const : f.status,
    detail: `Step ${step}${f.detail ? `: ${f.detail}` : ""}`,
  }));
}

/** The agent: fill, and on a multi-step application press "Next" for every complete step (that sends nothing),
 * until the last step. Then submit automatically only in auto mode, when nothing blocks it. */
export async function runOnce(doc: Document, ctx: AgentContext, beforeSubmit?: BeforeSubmit): Promise<RunReport> {
  const earlier: FieldResult[] = [];
  for (let step = 1; ; step++) {
    const filled = await fillForm(doc, ctx);
    const done = (r: RunReport): RunReport => ({ ...r, fields: [...earlier, ...r.fields], steps: step > 1 ? step : undefined });
    // A form without any field is only ever a later step of this run (a "Review" page), never a place to start.
    if (step === 1 && filled.status === "ready_to_submit" && !filled.fields.length) {
      // The last "Review" page of a multi-page application the user moved to themselves: nothing to fill, and the
      // panel offers Submit for the user to press (review mode only; auto mode never starts on such a page).
      const { adapter, root } = locate(doc);
      const action = root ? adapter.action(root) : null;
      if (ctx.mode !== "auto" && action?.kind === "submit") return done(filled);
      return done({ ...filled, status: "not_a_form" });
    }
    if (filled.status !== "ready_to_submit") return done(filled);
    // Pre-filled values that disagree with the profile: the user checks them before anything moves on.
    if (filled.fields.some((f) => f.review)) return done(filled);
    const { adapter, root } = locate(doc);
    const action = root ? adapter.action(root) : null;
    if (action?.kind !== "next") {
      if (ctx.mode !== "auto") return done(filled);
      // Auto-submit only when nothing at all is left for the user: no question open and no field that failed (a
      // dropdown that ended on another option would send a wrong answer), required or not.
      if (filled.fields.some((f) => f.status === "needs_user" || f.status === "failed")) return done({ ...filled, status: "needs_user" });
      const submitted = await submitForm(doc, 20000, beforeSubmit);
      return done({ ...submitted, fields: filled.fields });
    }
    // The panel's Fill fills this page only. The user checks it and presses Next on the page (that button can send
    // the application on some sites, and moving on hides the page before the user has seen what was filled).
    if (ctx.fillOnly) return done({ ...filled, nextStep: true });
    if (step >= MAX_STEPS) {
      return done({ ...filled, status: "needs_user", errors: [`Stopped after ${MAX_STEPS} steps. Check the form, then press Fill again.`] });
    }
    // A full page load per step ends this script here; the next Fill (or the queue's retry) continues on the new page.
    const outcome = await pressNext(doc, action.button, ctx.stepTimeoutMs ?? STEP_WAIT_MS);
    if (outcome.kind === "confirmed") {
      // That "Next" button sent the application: record it like a submission, honestly.
      await beforeSubmit?.(filled);
      return done({ ...filled, status: "submitted_confirmed", confirmationText: outcome.text, submittedAt: new Date().toISOString() });
    }
    if (outcome.kind === "captcha") return done({ ...filled, status: "needs_user", captcha: true, challenge: "a CAPTCHA" });
    if (outcome.kind === "errors") return done({ ...filled, status: "needs_user", errors: outcome.errors });
    if (outcome.kind === "stuck") {
      return done({ ...filled, status: "needs_user", errors: ["The Next button didn't open a new step. Check the page, then press Fill again."] });
    }
    earlier.push(...settled(filled.fields, step));
    pruneDisconnectedCorrections();
  }
}

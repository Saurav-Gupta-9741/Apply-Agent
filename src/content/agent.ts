/** The agent: reads the form, decides every field, fills and verifies, and submits only when everything
 * required is filled, no CAPTCHA is waiting, and (in review mode) the user has pressed Submit. */

import type { AnswerEntry, ApplicationRecord, Decision, FieldResult, Mode, Profile, RunReport } from "../shared/types";
import { generic, pickAdapter } from "./adapters";
import { workEntries } from "./classify";
import { codeOptionFor, dialCodePickerFor, isDialCodePicker, JUST_A_DIAL_CODE, phoneBoxFor, selectedCode, splitPhone } from "./phone";
import { decideWithMeaning, type Meaning } from "./meaning";
import { detectConfirmation, hasCaptcha, visibleErrors } from "./detect";
import { DROPDOWN, extractFields, inWorkSection, sectionHeadings, type ExtractedField } from "./extract";
import { currentValue, fillCombobox, fillDropdown, fillField, fire, type FillOutcome } from "./fill";
import { deepQueryAll } from "./dom";
import type { PageFacts } from "./facts";
import { jobCountries } from "./joblocation";
import { normalize } from "../shared/text";
import { isPrivacyConsentCheckbox } from "../shared/consent";
import { trackCorrection } from "./corrections";

/** Scroll a field into view and outline it briefly, so the user can answer it on the page. */
export function highlightField(doc: Document, label: string, key?: string): boolean {
  const { root } = locate(doc);
  if (!root) return false;
  const fields = extractFields(root);
  const field = fields.find((f) => f.descriptor.key === key && f.descriptor.label === label)
    ?? fields.find((f) => f.descriptor.label === label);
  // Hidden file inputs sit behind a styled button: highlight the visible wrapper instead.
  const target = (field?.elements[0]?.closest("[role='group'], .field, fieldset, li, div") as HTMLElement | null) ?? field?.elements[0];
  if (!target) return false;
  target.scrollIntoView({ behavior: "smooth", block: "center" });
  const previous = { outline: target.style.outline, offset: target.style.outlineOffset, radius: target.style.borderRadius };
  target.style.outline = "3px solid #8b8cff";
  target.style.outlineOffset = "4px";
  target.style.borderRadius = "6px";
  setTimeout(() => {
    target.style.outline = previous.outline;
    target.style.outlineOffset = previous.offset;
    target.style.borderRadius = previous.radius;
  }, 2500);
  (field?.elements[0] as HTMLElement | undefined)?.focus?.({ preventScroll: true });
  return true;
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
}

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

function locate(doc: Document) {
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
  if (!root) return report;
  const page: PageFacts = ctx.page ?? { jobCountries: jobCountries(doc), url: doc.location?.href ?? "", applications: ctx.applications };
  const fields = extractFields(root);
  const meanings = await readMeanings(fields, ctx);
  report.fields = fields.map((field) => {
    const first = field.elements[0];
    const code = first && isDialCodePicker(first) && phoneBoxFor(first) ? splitPhone(ctx.profile.phone).code : undefined;
    const decision: Decision = code ? { kind: "profile", key: "phone", value: `+${code}` }
      : decideWithMeaning(field.descriptor, ctx.profile, ctx.answers, page, meanings.get(field.descriptor.label));
    const existing = code ? "" : currentValue(field); // a picker's default code is not the user's choice
    const status: FieldResult["status"] = existing ? "already_filled"
      : decision.kind === "ask" ? "needs_user" : decision.kind === "draft" ? "needs_user" : decision.kind === "skip" ? "skipped" : "filled";
    return { field: field.descriptor, decision, status, review: decision.kind === "draft" || undefined, detail: decision.kind === "draft" ? "draft ready for review" : status === "filled" ? "would fill" : undefined };
  });
  report.captcha = hasCaptcha(doc);
  report.status = report.fields.some((r) => r.field.required && r.status === "needs_user") || report.captcha
    ? "needs_user" : "ready_to_submit";
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

/** Repeating work-experience sections start with fewer job blocks than the user has jobs: press the section's own
 * "Add" button until every job has a block (one click per missing job, stopping if a click adds nothing).
 * Blocks are never removed: the user may have added them on purpose. */
async function addWorkBlocks(doc: Document, ctx: AgentContext): Promise<void> {
  const wanted = Math.min(workEntries(ctx.profile).length, 6);
  for (let i = 0; i < wanted; i++) {
    const blocks = workBlocks(locate(doc).root ?? doc.body);
    if (blocks >= wanted) return;
    const headings = sectionHeadings(doc);
    const add = deepQueryAll<HTMLElement>(doc, "button, [role='button']").find((b) =>
      ADD_TEXT.test((b.textContent || b.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim()) && inWorkSection(b, headings));
    if (!add) return;
    add.click();
    await settle(doc, 400, 4000);
    if (workBlocks(locate(doc).root ?? doc.body) <= blocks) return;
  }
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

async function fillOne(field: ExtractedField, ctx: AgentContext, meaning?: Meaning): Promise<FieldResult> {
  const first = field.elements[0];
  const box = first && isDialCodePicker(first) ? phoneBoxFor(first) : undefined;
  if (first && box) return fillDialCode(field, first, box, ctx);
  const decision = decideWithMeaning(field.descriptor, ctx.profile, ctx.answers, ctx.page, meaning);
  const phone = decision.kind === "profile" && decision.key === "phone";
  // A phone widget's pre-filled "+1" is not the user's number: it is replaced.
  const existing = phone && JUST_A_DIAL_CODE.test(currentValue(field)) ? "" : currentValue(field);
  if (existing) {
    // Never overwrite, but flag a site pre-fill (e.g. resume parsing) that disagrees with the user's facts.
    const differs = (decision.kind === "profile" || decision.kind === "work") && !sameValue(existing, decision.value);
    return {
      field: field.descriptor, decision, status: "already_filled", review: differs || undefined,
      detail: differs ? `The site filled "${existing}"; your profile says "${decision.value}"` : existing,
    };
  }
  if (decision.kind === "skip") return { field: field.descriptor, decision, status: "skipped", detail: decision.reason };
  if (decision.kind === "ask") return { field: field.descriptor, decision, status: "needs_user" };
  const el = field.elements[0]!;
  let value = decision.kind === "resume" ? ctx.profile.resume?.name ?? "" : decision.value;
  if (phone) {
    const number = phoneFor(el, ctx);
    if ("problem" in number) return { field: field.descriptor, decision, status: "needs_user", detail: number.problem };
    value = number.value;
  }
  const outcome = field.descriptor.control === "combobox" ? await fillCombobox(el as HTMLInputElement, value)
    : field.descriptor.control === "dropdown" || el.matches(DROPDOWN) ? await fillDropdown(el, value)
    : fillField(field, value, ctx.profile.resume);
  return { field: field.descriptor, decision, status: outcome.ok ? "filled" : "failed", detail: outcome.detail };
}

/** Fill everything the agent is allowed to fill. Never overwrites a value already present. */
export async function fillForm(doc: Document, context: AgentContext): Promise<RunReport> {
  // Where the job is, read once: it answers "Will you require sponsorship to work here?" (see facts.ts).
  const ctx: AgentContext = { ...context, page: context.page ?? { jobCountries: jobCountries(doc), url: doc.location?.href ?? "", applications: context.applications } };
  const { adapter, root } = locate(doc);
  const report = baseReport(doc, adapter.platform, adapter.jobTitle(doc));
  if (!root) {
    // A page without a form may be the confirmation page of an earlier submission.
    const confirmation = detectConfirmation(doc);
    return confirmation.confirmed ? { ...report, status: "submitted_confirmed", confirmationText: confirmation.text } : report;
  }

  // 1. The resume first: many sites read it and fill the form themselves. Wait until that is finished, then fill
  //    only what is still empty (and flag what the site filled differently from the user's facts).
  const uploads: FieldResult[] = [];
  const uploaded = new Set<Element>();
  for (const field of extractFields(root).filter((f) => f.descriptor.control === "file")) {
    const result = await fillOne(field, ctx);
    if (result.status === "filled") uploaded.add(field.elements[0]!);
    uploads.push(result);
  }
  // Resume parsers start a moment after the upload and take a few seconds: give them time before typing.
  // Start pre-reading question meanings concurrently while the resume parser settles:
  const preRemaining = extractFields(locate(doc).root ?? root).filter((f) => f.descriptor.control !== "file");
  const meaningsPromise = readMeanings(preRemaining, ctx);
  if (uploaded.size) await settle(doc, 1000, 10_000, 2000);
  // 2. One block per job in the work history ("Add another" in a repeating experience section).
  await addWorkBlocks(doc, ctx);
  // 3. Everything else, read again: the page may have changed meanwhile.
  const rest: FieldResult[] = [];
  const remaining = extractFields(locate(doc).root ?? root).filter((f) => f.descriptor.control !== "file"); // files: step 1
  const meanings = await meaningsPromise;
  const newFields = remaining.filter((f) => !meanings.has(f.descriptor.label));
  if (newFields.length) {
    const postMeanings = await readMeanings(newFields, ctx);
    for (const [label, m] of postMeanings) meanings.set(label, m);
  }
  for (const field of remaining) {
    const res = await fillOne(field, ctx, meanings.get(field.descriptor.label));
    if (res.status === "filled" && (res.decision.kind === "profile" || res.decision.kind === "answer" || res.decision.kind === "work")) {
      trackCorrection(doc, field);
    }
    rest.push(res);
  }
  const results = [...uploads, ...rest];

  report.fields = results;
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
    .filter((f) => f.elements.some((e) => !e.checkValidity()))
    .map((f) => `${f.descriptor.label || f.descriptor.name}: ${f.elements[0]?.validationMessage || "invalid"}`);
}

export async function submitForm(doc: Document, timeoutMs = 20000, beforeSubmit?: BeforeSubmit): Promise<RunReport> {
  const { adapter, root } = locate(doc);
  const report = baseReport(doc, adapter.platform, adapter.jobTitle(doc));
  if (!root) return report;
  if (hasCaptcha(doc)) return { ...report, status: "needs_user", captcha: true };
  const action = adapter.action(root);
  if (!action) return { ...report, status: "needs_user", errors: ["Submit button not found"] };
  // Pressing "Next" is not submitting: the tracker must never record an application that was not sent.
  if (action.kind === "next") {
    return { ...report, status: "needs_user", errors: ["This isn't the last step yet. Press Fill to continue to the next step."] };
  }
  const button = action.button;
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
    if (confirmation.confirmed) return { ...report, status: "submitted_confirmed", confirmationText: confirmation.text };
    if (hasCaptcha(doc)) return { ...report, status: "needs_user", captcha: true };
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
    if (step === 1 && filled.status === "ready_to_submit" && !filled.fields.length) return done({ ...filled, status: "not_a_form" });
    if (filled.status !== "ready_to_submit") return done(filled);
    // Pre-filled values that disagree with the profile: the user checks them before anything moves on.
    if (filled.fields.some((f) => f.review)) return done(filled);
    const { adapter, root } = locate(doc);
    const action = root ? adapter.action(root) : null;
    if (action?.kind !== "next") {
      if (ctx.mode !== "auto") return done(filled);
      const submitted = await submitForm(doc, 20000, beforeSubmit);
      return done({ ...submitted, fields: filled.fields });
    }
    if (step >= MAX_STEPS) {
      return done({ ...filled, status: "needs_user", errors: [`Stopped after ${MAX_STEPS} steps. Check the form, then press Fill again.`] });
    }
    // A full page load per step ends this script here; the next Fill (or the queue's retry) continues on the new page.
    const outcome = await pressNext(doc, action.button, ctx.stepTimeoutMs ?? STEP_WAIT_MS);
    if (outcome.kind === "confirmed") {
      // That "Next" button sent the application: record it like a submission, honestly.
      await beforeSubmit?.(filled);
      return done({ ...filled, status: "submitted_confirmed", confirmationText: outcome.text });
    }
    if (outcome.kind === "captcha") return done({ ...filled, status: "needs_user", captcha: true });
    if (outcome.kind === "errors") return done({ ...filled, status: "needs_user", errors: outcome.errors });
    if (outcome.kind === "stuck") {
      return done({ ...filled, status: "needs_user", errors: ["The Next button didn't open a new step. Check the page, then press Fill again."] });
    }
    earlier.push(...settled(filled.fields, step));
  }
}

/** Ticks only eligible privacy/data-processing consent checkboxes on user command. Never ticks marketing or certifications. */
export function tickConsentCheckboxes(doc: Document): number {
  const { root } = locate(doc);
  if (!root) return 0;
  const fields = extractFields(root).filter((f) => f.descriptor.control === "checkbox");
  let count = 0;
  for (const f of fields) {
    if (isPrivacyConsentCheckbox(f.descriptor.label)) {
      const el = f.elements[0] as HTMLInputElement;
      if (el && !el.checked) {
        el.click();
        if (!el.checked) {
          el.checked = true;
          fire(el, "input");
          fire(el, "change");
        }
        count++;
      }
    }
  }
  return count;
}

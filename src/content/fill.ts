/** Puts values into form controls the way a real user would, so React/Vue forms register them, then reads
 * the value back to verify it stuck. */

import { deepQueryAll, scopeOf } from "./dom";
import type { ExtractedField, FieldElement } from "./extract";
import type { ResumeFile } from "../shared/types";
import { bestOption, cleanLabel, cssAttr, normalize } from "../shared/text";

export interface FillOutcome {
  ok: boolean;
  detail?: string;
}

export function fire(el: Element, type: string): void {
  // composed: the event leaves a shadow root, so frameworks listening above a web component hear it too.
  el.dispatchEvent(new Event(type, { bubbles: true, composed: true }));
}

/** Frameworks track values through the native setter; assigning `.value` directly is invisible to them. */
function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string): void {
  const proto = Object.getPrototypeOf(el) as object;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  if (setter) setter.call(el, value);
  else el.value = value;
}

function optionLabel(option: HTMLOptionElement): string {
  return cleanLabel(option.textContent ?? "");
}

// --- dates ---------------------------------------------------------------------------------------------------
const ISO_DATE = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/;
const DATE_PATTERN = /\b(dd|mm|yyyy|yy|tt|jjjj|aaaa)([\/.\- ])(dd|mm|yyyy|yy|tt|jjjj|aaaa)(?:\2(dd|mm|yyyy|yy|tt|jjjj|aaaa))?\b/i;

/** Dates are stored as "YYYY-MM" or "YYYY-MM-DD"; each date box gets the format it asks for: native date and
 * month inputs, or a typed format shown in its placeholder or label ("MM/YYYY", "DD.MM.YYYY", "TT.MM.JJJJ"…). */
export function formatDateFor(el: HTMLInputElement | HTMLTextAreaElement, value: string, hint = ""): string {
  const iso = ISO_DATE.exec(value.trim());
  if (!iso) return value;
  const [, year, month, day = "01"] = iso as unknown as [string, string, string, string?];
  if (el instanceof HTMLInputElement && el.type === "date") return `${year}-${month}-${day}`;
  if (el instanceof HTMLInputElement && el.type === "month") return `${year}-${month}`;
  const pattern = DATE_PATTERN.exec(`${el.getAttribute("placeholder") ?? ""} ${el.getAttribute("aria-label") ?? ""} ${hint}`);
  if (!pattern) return value;
  const [, a, sep, b, c] = pattern as unknown as [string, string, string, string, string?];
  const part = (token: string) => {
    const t = token.toLowerCase();
    if (t === "dd" || t === "tt") return day;
    if (t === "mm") return month;
    if (t === "yy") return year.slice(2);
    return year; // yyyy, jjjj (German), aaaa (French/Spanish)
  };
  return [a, b, c].filter((t): t is string => !!t).map(part).join(sep);
}

function fillText(el: HTMLInputElement | HTMLTextAreaElement, rawValue: string, hint = ""): FillOutcome {
  const value = formatDateFor(el, rawValue, hint);
  // The browser would silently cut a long answer at maxlength: refuse instead, so the user can shorten it.
  if (el.maxLength > 0 && value.length > el.maxLength) {
    return { ok: false, detail: `answer is ${value.length} characters; this field allows ${el.maxLength}` };
  }
  el.focus();
  setNativeValue(el, value);
  fire(el, "input");
  fire(el, "change");
  el.blur();
  return el.value === value ? { ok: true } : { ok: false, detail: "value did not stick" };
}

function fillSelect(el: HTMLSelectElement, value: string): FillOutcome {
  const options = Array.from(el.options);
  const match = bestOption(options.map(optionLabel), value);
  const option = options.find((o) => optionLabel(o) === match) ?? options.find((o) => normalize(o.value) === normalize(value));
  if (!option) return { ok: false, detail: `no option matches "${value}"` };
  setNativeValue(el, option.value);
  fire(el, "input");
  fire(el, "change");
  return el.value === option.value ? { ok: true } : { ok: false, detail: "selection did not stick" };
}

function radioLabel(radio: HTMLInputElement): string {
  const byFor = radio.id ? scopeOf(radio).querySelector(`label[for="${cssAttr(radio.id)}"]`) : null;
  return cleanLabel((byFor ?? radio.closest("label"))?.textContent ?? radio.value);
}

function fillRadio(radios: HTMLInputElement[], value: string): FillOutcome {
  const labels = radios.map(radioLabel);
  const match = bestOption(labels, value);
  const radio = radios[labels.indexOf(match ?? "\u0000")];
  if (!radio) return { ok: false, detail: `no choice matches "${value}"` };
  if (!radio.checked) radio.click();
  return radio.checked ? { ok: true } : { ok: false, detail: "choice did not stick" };
}

const YES = /^(yes|y|true|1|agree|i agree|checked)$/i;
const NO = /^(no|n|false|0|unchecked)$/i;

function fillCheckbox(el: HTMLInputElement, value: string): FillOutcome {
  const want = YES.test(value.trim()) ? true : NO.test(value.trim()) ? false : undefined;
  if (want === undefined) return { ok: false, detail: `"${value}" is not a yes/no answer` };
  if (el.checked !== want) el.click();
  return el.checked === want ? { ok: true } : { ok: false, detail: "checkbox did not change" };
}

/** "Select all that apply": tick every listed choice; fail (and change nothing) if any choice is unknown. */
function fillCheckboxGroup(boxes: HTMLInputElement[], value: string): FillOutcome {
  const labels = boxes.map(radioLabel);
  const wanted = value.split(/[,;|]/).map((v) => v.trim()).filter(Boolean);
  const picks = wanted.map((w) => labels.indexOf(bestOption(labels, w) ?? "\u0000"));
  if (!wanted.length || picks.some((i) => i < 0)) return { ok: false, detail: `no choices match "${value}"` };
  for (const i of picks) if (!boxes[i]!.checked) boxes[i]!.click();
  return picks.every((i) => boxes[i]!.checked) ? { ok: true } : { ok: false, detail: "choices did not stick" };
}

function base64ToBytes(data: string): Uint8Array<ArrayBuffer> {
  const binary = atob(data);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function fillFile(el: HTMLInputElement, resume: ResumeFile): FillOutcome {
  if (typeof DataTransfer === "undefined") return { ok: false, detail: "file upload not supported here" };
  const transfer = new DataTransfer();
  transfer.items.add(new File([base64ToBytes(resume.dataBase64)], resume.name, { type: resume.type }));
  el.files = transfer.files;
  fire(el, "input");
  fire(el, "change");
  return el.files?.length === 1 && el.files[0]?.name === resume.name ? { ok: true } : { ok: false, detail: "upload did not stick" };
}

/** Whether the field already holds a value (so a re-run never overwrites what the user typed). */
export function currentValue(field: ExtractedField): string {
  const [el] = field.elements;
  if (!el) return "";
  if (field.descriptor.control === "radio") {
    const checked = (field.elements as HTMLInputElement[]).find((r) => r.checked);
    return checked ? radioLabel(checked) : "";
  }
  if (field.descriptor.control === "checkbox_group") {
    return (field.elements as HTMLInputElement[]).filter((c) => c.checked).map(radioLabel).join(", ");
  }
  if (el instanceof HTMLInputElement && el.type === "checkbox") return el.checked ? "yes" : "";
  if (el instanceof HTMLInputElement && el.type === "file") return el.files?.length ? el.files[0]!.name : "";
  if (field.descriptor.control === "dropdown") return dropdownValue(el);
  if (el instanceof HTMLSelectElement) {
    const selected = el.selectedOptions[0];
    return selected && selected.value ? optionLabel(selected) : "";
  }
  return el.value.trim();
}

export function fillField(field: ExtractedField, value: string, resume?: ResumeFile): FillOutcome {
  const els: FieldElement[] = field.elements;
  const el = els[0];
  if (!el) return { ok: false, detail: "element missing" };
  switch (field.descriptor.control) {
    case "radio":
      return fillRadio(els as HTMLInputElement[], value);
    case "checkbox":
      return fillCheckbox(el as HTMLInputElement, value);
    case "checkbox_group":
      return fillCheckboxGroup(els as HTMLInputElement[], value);
    case "select":
      return fillSelect(el as HTMLSelectElement, value);
    case "file":
      return resume ? fillFile(el as HTMLInputElement, resume) : { ok: false, detail: "no resume in profile" };
    case "combobox":
    case "dropdown":
      // Type-and-pick and open-and-pick interactions are asynchronous: the agent uses fillCombobox / fillDropdown.
      return { ok: false, detail: field.descriptor.control };
    default:
      return fillText(el as HTMLInputElement | HTMLTextAreaElement, value, `${field.descriptor.label} ${field.descriptor.placeholder}`);
  }
}

/** Placeholder rows shown while results load, or when there are none: never picked, never a reason to give up. */
const NOT_AN_OPTION = /^(loading|searching|please wait|no (results|options|matches)|type to search|start typing|keine ergebnisse|aucun r[ée]sultat|sin resultados|nenhum resultado)\b|…$|\.\.\.$/i;

function visibleOptions(scope: ParentNode): HTMLElement[] {
  return deepQueryAll<HTMLElement>(scope, "[role='option']").filter((o) => {
    if (o.getAttribute("aria-disabled") === "true" || o.closest("[hidden], [aria-hidden='true']")) return false;
    const style = o.ownerDocument.defaultView?.getComputedStyle(o);
    return !style || (style.display !== "none" && style.visibility !== "hidden");
  });
}

/** The list a dropdown opened, when it does not name it: the one inside the field's own group, else the only open list
 * on the page. Never every option on the page: another open list, or a menu built of options, is not this field's. */
function listNear(owner: HTMLElement): ParentNode | undefined {
  let node: Element | null = owner.parentElement;
  for (let depth = 0; node && depth < 5; depth++, node = node.parentElement) {
    if (visibleOptions(node).length) return node;
  }
  const lists = deepQueryAll<HTMLElement>(owner.ownerDocument, "[role='listbox']").filter((l) => visibleOptions(l).length);
  if (lists.length === 1) return lists[0];
  if (lists.length) return undefined;
  // Options with no list around them (a portal at the end of the page): only when they all sit together.
  const options = visibleOptions(owner.ownerDocument);
  const parents = new Set(options.map((o) => o.parentElement));
  return parents.size === 1 ? owner.ownerDocument : undefined;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function choose(option: HTMLElement): void {
  option.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, composed: true }));
  option.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, composed: true }));
  option.click();
}

/** Wait for the list's real results (results arrive late, and stale or "Loading…" rows come first), then pick the
 * best match. Gives up only when the time is out, closing the list again. */
async function pickFromList(owner: HTMLElement, value: string, timeoutMs: number): Promise<FillOutcome> {
  const doc = owner.ownerDocument;
  const listId = owner.getAttribute("aria-controls") ?? owner.getAttribute("aria-owns");
  const deadline = Date.now() + timeoutMs;
  let seen: string[] = [];
  while (Date.now() < deadline) {
    const scope: ParentNode | undefined = (listId && (scopeOf(owner).getElementById(listId) ?? doc.getElementById(listId))) || listNear(owner);
    if (!scope) {
      await sleep(150); // the list has not opened yet, or there are several and none is clearly this one
      continue;
    }
    const options = visibleOptions(scope).filter((o) => !NOT_AN_OPTION.test(cleanLabel(o.textContent ?? "")));
    const labels = options.map((o) => cleanLabel(o.textContent ?? ""));
    const match = bestOption(labels, value);
    if (match) {
      choose(options[labels.indexOf(match)]!);
      return { ok: true, detail: match === value ? undefined : `chose "${match}"` };
    }
    seen = labels.length ? labels : seen;
    await sleep(120);
  }
  owner.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, composed: true }));
  return { ok: false, detail: seen.length ? `no option matches "${value}"` : "options did not appear" };
}

/** Type into a searchable dropdown (e.g. a location typeahead backed by a server) and pick the best match. */
export async function fillCombobox(input: HTMLInputElement, value: string, timeoutMs = 6000): Promise<FillOutcome> {
  input.focus();
  setNativeValue(input, value);
  fire(input, "input");
  input.dispatchEvent(new KeyboardEvent("keyup", { key: value.slice(-1), bubbles: true, composed: true }));
  return pickFromList(input, value, timeoutMs);
}

const DROPDOWN_PLACEHOLDER = /^(select( one| an option)?|choose( one)?|please select|--+|—|bitte w[äa]hlen|s[ée]lectionner|seleccion(e|a|ar)|selecione)\W*$/i;

/** What a custom dropdown currently shows, without its placeholder ("Select One"). */
export function dropdownValue(el: Element): string {
  const text = cleanLabel(el.textContent ?? "") || cleanLabel(el.getAttribute("value") ?? "");
  return DROPDOWN_PLACEHOLDER.test(text) ? "" : text;
}

/** Open a custom dropdown (a button with a list of choices), pick the best match, and check that it shows it. */
export async function fillDropdown(el: HTMLElement, value: string, timeoutMs = 4000): Promise<FillOutcome> {
  el.focus();
  el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, composed: true }));
  el.click();
  if (el.getAttribute("aria-expanded") === "false") el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, composed: true }));
  const picked = await pickFromList(el, value, timeoutMs);
  if (!picked.ok) return picked;
  await sleep(120);
  const shown = dropdownValue(el);
  return shown ? picked : { ok: false, detail: "choice did not stick" };
}

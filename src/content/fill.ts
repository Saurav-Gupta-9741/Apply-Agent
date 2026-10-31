/** Puts values into form controls the way a real user would, so React/Vue forms register them, then reads
 * the value back to verify it stuck. */

import { deepQueryAll, scopeOf } from "./dom";
import { isDropzone, visibleText, type ExtractedField, type FieldElement } from "./extract";
import type { ResumeFile } from "../shared/types";
import { bestOption, cleanLabel, cssAttr, normalize } from "../shared/text";

export interface FillOutcome {
  ok: boolean;
  detail?: string;
}

export function fireEvent(el: Element, type: string, init: Record<string, unknown> = {}): boolean {
  let event: Event;
  const eventInit = { bubbles: true, composed: true, cancelable: true, ...init };

  try {
    if (type.startsWith("pointer") && typeof PointerEvent !== "undefined") {
      event = new PointerEvent(type, {
        pointerId: 1,
        pointerType: "mouse",
        isPrimary: true,
        ...eventInit,
      });
    } else if ((type.startsWith("mouse") || type === "click") && typeof MouseEvent !== "undefined") {
      event = new MouseEvent(type, {
        button: 0,
        buttons: type === "pointerdown" || type === "mousedown" ? 1 : 0,
        ...eventInit,
      });
    } else if (type.startsWith("key") && typeof KeyboardEvent !== "undefined") {
      event = new KeyboardEvent(type, {
        key: typeof init.key === "string" ? init.key : "Unidentified",
        code: typeof init.code === "string" ? init.code : "",
        ...eventInit,
      });
    } else if ((type === "focus" || type === "blur") && typeof FocusEvent !== "undefined") {
      event = new FocusEvent(type, {
        ...eventInit,
      });
    } else if (type === "input" && typeof InputEvent !== "undefined") {
      event = new InputEvent(type, {
        inputType: "insertText",
        data: typeof init.data === "string" ? init.data : undefined,
        ...eventInit,
      });
    } else {
      event = new Event(type, eventInit);
    }
  } catch {
    event = new Event(type, eventInit);
  }

  return el.dispatchEvent(event);
}

export function fire(el: Element, type: string): void {
  // composed: the event leaves a shadow root, so frameworks listening above a web component hear it too.
  fireEvent(el, type);
}

/** Frameworks track values through the native setter; assigning `.value` directly is invisible to them. */
export function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string): void {
  // React 16+ uses a custom _valueTracker on inputs to detect whether value changed
  const tracker = (el as any)._valueTracker;
  if (tracker && typeof tracker.setValue === "function") {
    tracker.setValue("");
  }
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

export interface TypingOptions {
  delayMs?: number;
  keystrokeDelayMs?: number;
}

export function fillText(el: HTMLInputElement | HTMLTextAreaElement, rawValue: string, hint = ""): FillOutcome {
  const value = formatDateFor(el, rawValue, hint);
  // The browser would silently cut a long answer at maxlength: refuse instead, so the user can shorten it.
  if (el.maxLength > 0 && value.length > el.maxLength) {
    return { ok: false, detail: `answer is ${value.length} characters; this field allows ${el.maxLength}` };
  }
  // Realistic anti-bot event sequence: pointerdown -> focus -> keydown -> input -> change -> blur
  fireEvent(el, "pointerdown");
  fireEvent(el, "mousedown");
  el.focus();
  fireEvent(el, "focusin");
  fireEvent(el, "focus");

  const lastChar = value.slice(-1) || "a";
  fireEvent(el, "keydown", { key: lastChar });
  setNativeValue(el, value);
  fireEvent(el, "input", { data: value });
  fireEvent(el, "keyup", { key: lastChar });

  fireEvent(el, "change");
  el.blur();
  fireEvent(el, "focusout");
  fireEvent(el, "blur");

  return el.value === value ? { ok: true } : { ok: false, detail: "value did not stick" };
}

export async function fillTextHumanized(
  el: HTMLInputElement | HTMLTextAreaElement,
  rawValue: string,
  hint = "",
  options: TypingOptions = {}
): Promise<FillOutcome> {
  const value = formatDateFor(el, rawValue, hint);
  if (el.maxLength > 0 && value.length > el.maxLength) {
    return { ok: false, detail: `answer is ${value.length} characters; this field allows ${el.maxLength}` };
  }

  // 1. Pointer targeting & focus
  fireEvent(el, "pointerdown");
  fireEvent(el, "mousedown");
  el.focus();
  fireEvent(el, "focusin");
  fireEvent(el, "focus");
  fireEvent(el, "pointerup");
  fireEvent(el, "mouseup");
  fireEvent(el, "click");

  const delay = options.keystrokeDelayMs ?? (options.delayMs ?? 10);
  if (delay > 0) await sleep(delay);

  // 2. Character-by-character typing with synthetic delays
  setNativeValue(el, "");
  for (let i = 0; i < value.length; i++) {
    const char = value[i]!;
    fireEvent(el, "keydown", { key: char, code: `Key${char.toUpperCase()}` });
    const current = value.slice(0, i + 1);
    setNativeValue(el, current);
    fireEvent(el, "input", { data: char, inputType: "insertText" });
    fireEvent(el, "keyup", { key: char, code: `Key${char.toUpperCase()}` });
    if (delay > 0 && i < value.length - 1) {
      await sleep(delay);
    }
  }

  // 3. Commit and blur
  fireEvent(el, "change");
  el.blur();
  fireEvent(el, "focusout");
  fireEvent(el, "blur");

  return el.value === value ? { ok: true } : { ok: false, detail: "value did not stick" };
}

function fillSelect(el: HTMLSelectElement, value: string): FillOutcome {
  const allOptions = Array.from(el.options);
  // Exclude placeholder and disabled options from match candidates
  const validOptions = allOptions.filter((o) => !o.disabled && !DROPDOWN_PLACEHOLDER.test(cleanLabel(o.textContent ?? "")));
  const candidates = validOptions.length > 0 ? validOptions : allOptions;

  // 1. Try matching by option label
  const labels = candidates.map(optionLabel);
  const matchLabel = bestOption(labels, value);
  let option = matchLabel ? candidates[labels.indexOf(matchLabel)] : undefined;

  // 2. Try matching by option value attribute
  if (!option) {
    const values = candidates.map((o) => cleanLabel(o.value));
    const matchVal = bestOption(values, value);
    if (matchVal) {
      option = candidates[values.indexOf(matchVal)];
    }
  }

  // 3. Fallback to raw normalized value match
  if (!option) {
    option = candidates.find((o) => normalize(o.value) === normalize(value));
  }

  if (!option) return { ok: false, detail: `no option matches "${value}"` };

  fireEvent(el, "pointerdown");
  fireEvent(el, "mousedown");
  el.focus();

  el.selectedIndex = allOptions.indexOf(option);
  option.selected = true;
  setNativeValue(el, option.value);

  fire(el, "input");
  fire(el, "change");

  // Trigger plugin events if wrapped in Chosen or Select2
  try {
    const customSelect = el.parentElement?.querySelector(".select2-container, .chosen-container");
    if (customSelect) {
      fireEvent(el, "chosen:updated");
      fireEvent(el, "select2:select");
    }
  } catch {}

  el.blur();
  fireEvent(el, "blur");
  return el.value === option.value ? { ok: true } : { ok: false, detail: "selection did not stick" };
}

function radioLabel(radio: HTMLInputElement): string {
  const byFor = radio.id ? scopeOf(radio).querySelector(`label[for="${cssAttr(radio.id)}"]`) : null;
  const roleChoice = radio.closest("[role='radio'], [role='checkbox'], .docssharedWizToggleLabeledControl");
  const roleAria = roleChoice?.getAttribute("aria-label");
  const roleText = roleChoice ? cleanLabel(visibleText(roleChoice)) : "";
  const labelText = (byFor ?? radio.closest("label"))?.textContent ?? "";
  return cleanLabel(roleAria || labelText || roleText || radio.value);
}

function fillRadio(radios: HTMLInputElement[], value: string): FillOutcome {
  const labels = radios.map(radioLabel);
  const match = bestOption(labels, value);
  const radio = radios[labels.indexOf(match ?? "\u0000")];
  if (!radio) return { ok: false, detail: `no choice matches "${value}"` };
  const target = (radio.closest("[role='radio']") as HTMLElement | null) ?? radio;
  if (!radio.checked) {
    fireEvent(target, "pointerdown");
    fireEvent(target, "mousedown");
    target.click();
    if (!radio.checked) {
      fireEvent(radio, "pointerdown");
      radio.click();
    }
  }
  const isChecked = radio.checked || target.getAttribute("aria-checked") === "true";
  return isChecked ? { ok: true } : { ok: false, detail: "choice did not stick" };
}

const YES = /^(yes|y|true|1|agree|i agree|checked)$/i;
const NO = /^(no|n|false|0|unchecked)$/i;

function fillCheckbox(el: HTMLInputElement, value: string): FillOutcome {
  const want = YES.test(value.trim()) ? true : NO.test(value.trim()) ? false : undefined;
  if (want === undefined) return { ok: false, detail: `"${value}" is not a yes/no answer` };
  const target = (el.closest("[role='checkbox']") as HTMLElement | null) ?? el;
  const current = el.checked || target.getAttribute("aria-checked") === "true";
  if (current !== want) {
    fireEvent(target, "pointerdown");
    fireEvent(target, "mousedown");
    target.click();
    if (el.checked !== want && target.getAttribute("aria-checked") !== (want ? "true" : "false")) {
      fireEvent(el, "pointerdown");
      el.click();
    }
  }
  const isChecked = el.checked || target.getAttribute("aria-checked") === "true";
  return isChecked === want ? { ok: true } : { ok: false, detail: "checkbox did not change" };
}

/** "Select all that apply": tick every listed choice; fail (and change nothing) if any choice is unknown. */
function fillCheckboxGroup(boxes: HTMLInputElement[], value: string): FillOutcome {
  const labels = boxes.map(radioLabel);
  const wanted = value.split(/[,;|]/).map((v) => v.trim()).filter(Boolean);
  const picks = wanted.map((w) => labels.indexOf(bestOption(labels, w) ?? "\u0000"));
  if (!wanted.length || picks.some((i) => i < 0)) return { ok: false, detail: `no choices match "${value}"` };
  for (const i of picks) {
    const box = boxes[i]!;
    const target = (box.closest("[role='checkbox']") as HTMLElement | null) ?? box;
    const isChecked = box.checked || target.getAttribute("aria-checked") === "true";
    if (!isChecked) {
      target.click();
      if (!box.checked && target.getAttribute("aria-checked") !== "true") box.click();
    }
  }
  return picks.every((i) => boxes[i]!.checked || boxes[i]!.closest("[role='checkbox']")?.getAttribute("aria-checked") === "true")
    ? { ok: true } : { ok: false, detail: "choices did not stick" };
}

function base64ToBytes(data: string): Uint8Array<ArrayBuffer> {
  const binary = atob(data);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function fillFile(el: HTMLElement, resume: ResumeFile): FillOutcome {
  if (typeof DataTransfer === "undefined") return { ok: false, detail: "file upload not supported here" };
  const transfer = new DataTransfer();
  transfer.items.add(new File([base64ToBytes(resume.dataBase64)], resume.name, { type: resume.type }));
  if (el instanceof HTMLInputElement && el.type === "file") {
    el.files = transfer.files;
    fire(el, "input");
    fire(el, "change");
    return el.files?.length === 1 && el.files[0]?.name === resume.name ? { ok: true } : { ok: false, detail: "upload did not stick" };
  }
  const dragOverEvent = typeof DragEvent !== "undefined"
    ? new DragEvent("dragover", { bubbles: true, cancelable: true, composed: true })
    : new Event("dragover", { bubbles: true, cancelable: true, composed: true });
  try { Object.defineProperty(dragOverEvent, "dataTransfer", { value: transfer }); } catch {}
  el.dispatchEvent(dragOverEvent);
  const dropEvent = typeof DragEvent !== "undefined"
    ? new DragEvent("drop", { bubbles: true, cancelable: true, composed: true })
    : new Event("drop", { bubbles: true, cancelable: true, composed: true });
  try { Object.defineProperty(dropEvent, "dataTransfer", { value: transfer }); } catch {}
  el.dispatchEvent(dropEvent);
  el.click();
  const dynamicInput = el.querySelector<HTMLInputElement>("input[type='file']") ?? scopeOf(el).querySelector<HTMLInputElement>("input[type='file']");
  if (dynamicInput && dynamicInput.files !== transfer.files) {
    try {
      dynamicInput.files = transfer.files;
    } catch {
      try {
        Object.defineProperty(dynamicInput, "files", { value: transfer.files, configurable: true });
      } catch {}
    }
    fire(dynamicInput, "input");
    fire(dynamicInput, "change");
  }
  const val = currentValue({ descriptor: { control: "file" } as any, elements: [el as any] });
  const hasStuck = !!val || (dynamicInput?.files?.length === 1) || el.getAttribute("data-filename") === resume.name || el.classList.contains("has-file") || (el.textContent?.includes(resume.name) ?? false);
  return hasStuck ? { ok: true } : { ok: false, detail: "upload did not stick" };
}

/** Whether the field already holds a value (so a re-run never overwrites what the user typed). */
export function currentValue(field: ExtractedField): string {
  const [el] = field.elements;
  if (!el) return "";
  if (field.descriptor.control === "radio") {
    // ARIA radio groups (Google Forms): check aria-checked on div[role="radio"] children
    if (el.getAttribute?.("role") === "radiogroup") {
      const checked = el.querySelector("[role='radio'][aria-checked='true']");
      return checked ? cleanLabel(checked.getAttribute("aria-label") || checked.textContent || "") : "";
    }
    const checked = (field.elements as HTMLInputElement[]).find((r) => r.checked);
    return checked ? radioLabel(checked) : "";
  }
  if (field.descriptor.control === "checkbox_group") {
    // ARIA checkbox groups (Google Forms)
    if (el.getAttribute?.("role") === "group" && el.querySelector("[role='checkbox']")) {
      return Array.from(el.querySelectorAll("[role='checkbox'][aria-checked='true']"))
        .map((b) => cleanLabel(b.getAttribute("aria-label") || b.textContent || "")).join(", ");
    }
    return (field.elements as HTMLInputElement[]).filter((c) => c.checked).map(radioLabel).join(", ");
  }
  if (el instanceof HTMLInputElement && el.type === "checkbox") return el.checked ? "yes" : "";
  if (el instanceof HTMLInputElement && el.type === "file") return el.files?.length ? el.files[0]!.name : "";
  if (isDropzone(el)) {
    const dynamicInput = el.querySelector<HTMLInputElement>("input[type='file']");
    if (dynamicInput?.files?.length) return dynamicInput.files[0]!.name;
    const dataFile = el.getAttribute("data-filename");
    if (dataFile) return dataFile;
    const nameEl = el.querySelector("[class*='filename' i], [class*='file-name' i], .file-name, .uploaded-file");
    if (nameEl && cleanLabel(nameEl.textContent ?? "")) return cleanLabel(nameEl.textContent ?? "");
  }
  if (field.descriptor.control === "dropdown") return dropdownValue(el);
  if (el instanceof HTMLSelectElement) {
    const selected = el.selectedOptions[0];
    return selected && selected.value ? optionLabel(selected) : "";
  }
  return ("value" in el) ? el.value.trim() : "";
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

export async function fillFieldHumanized(
  field: ExtractedField,
  value: string,
  resume?: ResumeFile,
  options?: TypingOptions
): Promise<FillOutcome> {
  const els: FieldElement[] = field.elements;
  const el = els[0];
  if (!el) return { ok: false, detail: "element missing" };
  switch (field.descriptor.control) {
    case "combobox":
      return fillCombobox(el as HTMLInputElement, value, 6000, options?.keystrokeDelayMs ?? options?.delayMs);
    case "dropdown":
      return fillDropdown(el as HTMLElement, value);
    case "radio":
    case "checkbox":
    case "checkbox_group":
    case "select":
    case "file":
      return fillField(field, value, resume);
    default:
      return fillTextHumanized(
        el as HTMLInputElement | HTMLTextAreaElement,
        value,
        `${field.descriptor.label} ${field.descriptor.placeholder}`,
        options
      );
  }
}

/** Placeholder rows shown while results load, or when there are none: never picked, never a reason to give up. */
const NOT_AN_OPTION = /^(loading|searching|please wait|no (results|options|matches)|type to search|start typing|keine ergebnisse|aucun r[ée]sultat|sin resultados|nenhum resultado)\b|…$|\.\.\.$/i;

const OPTION_SELECTOR = [
  "[role='option']",
  "[data-automation-id='promptOption']",
  "[data-reach-combobox-option]",
  "li.select2-results__option",
  "li.active-result",
  "[role='listbox'] > li",
  "[role='listbox'] > div[tabindex]",
  ".quantumWizMenuPaperselectOption",
  ".select-options > .option",
  ".fabric-select-option",
  ".dropdown-menu > li",
  ".dropdown-menu > .dropdown-item",
].join(", ");

function visibleOptions(scope: ParentNode): HTMLElement[] {
  const elements = deepQueryAll<HTMLElement>(scope, OPTION_SELECTOR);
  const unique = Array.from(new Set(elements));
  return unique.filter((o) => {
    if (
      o.getAttribute("aria-disabled") === "true" ||
      o.classList.contains("disabled") ||
      (o as any).disabled === true ||
      o.closest("[hidden], [aria-hidden='true']")
    ) {
      return false;
    }
    const style = o.ownerDocument.defaultView?.getComputedStyle(o);
    return !style || (style.display !== "none" && style.visibility !== "hidden");
  });
}

const LIST_CONTAINERS = "[role='listbox'], .exportSelectPopup, .select2-dropdown, .chosen-drop, [data-automation-id*='promptPopup'], [data-automation-id*='menu'], .dropdown-menu.show, .fabric-select-menu";

/** The list a dropdown opened, when it does not name it: the one inside the field's own group, else the only open list
 * on the page. Never every option on the page: another open list, or a menu built of options, is not this field's. */
function listNear(owner: HTMLElement): ParentNode | undefined {
  let node: Element | null = owner.parentElement;
  for (let depth = 0; node && depth < 5; depth++, node = node.parentElement) {
    if (visibleOptions(node).length) return node;
  }
  const lists = deepQueryAll<HTMLElement>(owner.ownerDocument, LIST_CONTAINERS).filter((l) => visibleOptions(l).length);
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
  fireEvent(option, "pointerdown");
  fireEvent(option, "mousedown");
  fireEvent(option, "pointerup");
  fireEvent(option, "mouseup");
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
    const labels = options.map((o) => {
      const primary = o.querySelector("[data-automation-id='promptOptionTitle'], .primary-text, .title");
      return cleanLabel((primary ?? o).textContent ?? "");
    });
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
export async function fillCombobox(input: HTMLInputElement, value: string, timeoutMs = 6000, delayMs = 0): Promise<FillOutcome> {
  if (delayMs > 0) {
    await fillTextHumanized(input, value, "", { keystrokeDelayMs: delayMs });
  } else {
    fillText(input, value);
  }
  return pickFromList(input, value, timeoutMs);
}

const DROPDOWN_PLACEHOLDER = /^(select|choose|please select)\b|^(select( one| an option)?|choose( one)?|please select|--+|—|bitte w[äa]hlen|s[ée]lectionner|seleccion(e|a|ar)|selecione)\W*$/i;

/** What a custom dropdown currently shows, without its placeholder ("Select One"). */
export function dropdownValue(el: Element): string {
  const selectedChild = el.querySelector(".combobox-selected-text, .selected-value, [data-selected], .filter-option-inner-inner");
  const text = cleanLabel(selectedChild?.textContent ?? "") ||
    cleanLabel(el.textContent ?? "") ||
    cleanLabel(el.getAttribute("data-value") ?? "") ||
    cleanLabel(el.getAttribute("data-selected") ?? "") ||
    cleanLabel(el.getAttribute("value") ?? "");
  return DROPDOWN_PLACEHOLDER.test(text) ? "" : text;
}

/** Open a custom dropdown (a button with a list of choices), pick the best match, and check that it shows it. */
export async function fillDropdown(el: HTMLElement, value: string, timeoutMs = 4000): Promise<FillOutcome> {
  el.focus();
  fireEvent(el, "pointerdown");
  fireEvent(el, "mousedown");
  fireEvent(el, "pointerup");
  fireEvent(el, "mouseup");
  el.click();
  if (el.getAttribute("aria-expanded") === "false") {
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, composed: true }));
  }
  const picked = await pickFromList(el, value, timeoutMs);
  if (!picked.ok) return picked;
  await sleep(120);
  const shown = dropdownValue(el);
  return shown ? picked : { ok: false, detail: "choice did not stick" };
}

/** Puts values into form controls the way a real user would, so React/Vue forms register them, then reads
 * the value back to verify it stuck. */

import { formatDate } from "../shared/locale/formats";
import { deepQueryAll, scopeOf } from "./dom";
import { isDropzone, visibleText, type ExtractedField, type FieldElement } from "./extract";
import type { ResumeFile } from "../shared/types";
import { bestOption, cleanLabel, cssAttr, normalize } from "../shared/text";
import { checkLength, lengthLimit } from "../shared/length-limit";

export interface FillOutcome {
  ok: boolean;
  detail?: string;
  /** The option that was picked from a list, to check that the list shows it. */
  chosen?: string;
}

export function fire(el: Element, type: string): void {
  // composed: the event leaves a shadow root, so frameworks listening above a web component hear it too.
  el.dispatchEvent(new Event(type, { bubbles: true, composed: true }));
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
  const textContext = `${el.getAttribute("placeholder") ?? ""} ${el.getAttribute("aria-label") ?? ""} ${hint} ${el.getAttribute("data-automation-id") ?? ""}`;
  const pattern = DATE_PATTERN.exec(textContext);
  // Japanese forms: "年月日" (e.g. 2026年05月01日). Only when the box itself shows that form.
  if (!pattern && /年.*月.*日|yyyy年/i.test(textContext)) {
    return formatDate({ year: Number(year), month: Number(month), day: Number(day) }, "年月日");
  }
  if (!pattern) {
    if (/\b(mm|month)\b/i.test(textContext) && !/\b(yy|yyyy|year)\b/i.test(textContext)) return month;
    if (/\b(yyyy|year)\b/i.test(textContext) && !/\b(mm|month)\b/i.test(textContext)) return year;
    return value;
  }
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

export function fillText(el: HTMLInputElement | HTMLTextAreaElement, rawValue: string, hint = ""): FillOutcome {
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

const digitsOf = (s: string) => s.replace(/\D/g, "");

/** Type text key by key, the way a person does: phone boxes that format as you type, or that keep their own state and
 * ignore a whole value put in at once, take it this way. */
function typeKeys(el: HTMLInputElement | HTMLTextAreaElement, text: string): void {
  const key = (type: string, k: string) => el.dispatchEvent(new KeyboardEvent(type, { key: k, bubbles: true, composed: true, cancelable: true }));
  el.focus();
  if (el.value) {
    setNativeValue(el, "");
    el.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true, inputType: "deleteContentBackward" }));
  }
  for (const ch of text) {
    key("keydown", ch);
    key("keypress", ch);
    const before = new InputEvent("beforeinput", { bubbles: true, composed: true, cancelable: true, data: ch, inputType: "insertText" });
    if (el.dispatchEvent(before)) {
      setNativeValue(el, el.value + ch);
      el.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true, data: ch, inputType: "insertText" }));
    }
    key("keyup", ch);
  }
  fire(el, "change");
  el.blur();
}

/** A phone number box. Many format the number as it is typed ("9000000000" shows as "90000 00000") or keep it in
 * their own state: the number counts as filled when the box holds its digits. A box that shows the country code
 * itself before the number (`code`, from the picker beside it) is fine; the same code twice ("+91 +91 …") is not. */
export function fillPhone(el: HTMLInputElement | HTMLTextAreaElement, value: string, code?: string): FillOutcome {
  const want = digitsOf(value);
  // The national number in a box that adds the code itself is fine; a full "+91…" number in such a box is not (it
  // would read "+91 +91 …"), so that only counts when the digits are exactly the number's.
  const holds = () => {
    const got = digitsOf(el.value);
    return !!want && (got === want || (!!code && !value.trim().startsWith("+") && got === code + want)
      // A box beside a country picker keeps only the national number of a full "+91 …" number.
      || (!!code && value.trim().startsWith("+") && want === code + got && got.length >= 6));
  };
  const first = fillText(el, value);
  if (first.ok || holds()) return { ok: true };
  if (/characters; this field allows/.test(first.detail ?? "")) return first;
  typeKeys(el, value);
  if (holds()) return { ok: true };
  return { ok: false, detail: el.value.trim() ? `the box shows "${el.value.trim()}", not ${value}` : "value did not stick" };
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
      fire(el, "chosen:updated");
      fire(el, "select2:select");
    }
  } catch {}

  el.blur();
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
    target.click();
    if (!radio.checked) radio.click();
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
    target.click();
    if (el.checked !== want && target.getAttribute("aria-checked") !== (want ? "true" : "false")) el.click();
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
  // react-select empties its text box once a choice is made and shows the choice beside it.
  if (el instanceof HTMLInputElement && el.getAttribute("role") === "combobox") return el.value.trim() || comboboxShown(el);
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
    default: {
      // A limit the question states ("max 200 words", "500 Zeichen"): an answer over it is given to the user to
      // shorten, never typed (the box's own maxlength is checked in fillText).
      const d = field.descriptor;
      const fit = checkLength(value, lengthLimit(`${d.label} ${d.hint ?? ""} ${d.placeholder}`));
      if (!fit.ok) return { ok: false, detail: `answer is ${fit.problem}` };
      return fillText(el as HTMLInputElement | HTMLTextAreaElement, value, `${d.label} ${d.placeholder}`);
    }
  }
}

/** Placeholder rows shown while results load, or when there are none: never picked, never a reason to give up. */
const NOT_AN_OPTION = /^(loading|searching|please wait|no (results|options|matches)|type to search|start typing|keine ergebnisse|aucun r[ée]sultat|sin resultados|nenhum resultado)\b|…$|\.\.\.$/i;

const OPTION_SELECTOR = [
  "[role='option']",
  "[data-automation-id='promptOption']",
  "[data-automation-id='select-option']",
  "[data-automation-id='menuItem']",
  "[data-reach-combobox-option]",
  // react-select (new Greenhouse job boards, many React forms); versions before 5.8 give options no role.
  ".select__option",
  "li.select2-results__option",
  "li.active-result",
  "[role='listbox'] > li",
  "[role='listbox'] > div[tabindex]",
  ".quantumWizMenuPaperselectOption",
  ".select-options > .option",
  ".fabric-select-option",
  ".dropdown-menu > li",
  ".dropdown-menu > .dropdown-item",
  ".sapMSelectListItem",
  ".sapMComboBoxItem",
  ".oj-listbox-result",
  ".oj-listbox-item",
  "oj-option",
  "mat-option",
  ".mat-option",
  ".mat-mdc-option",
  ".zp_select_option",
  ".zp_option",
  "li.zp_dropdown_item",
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

const LIST_CONTAINERS = "[role='listbox'], .select__menu, .exportSelectPopup, .select2-dropdown, .chosen-drop, [data-automation-id*='promptPopup'], [data-automation-id*='menu'], .dropdown-menu.show, .fabric-select-menu, .sapMPopover, .sapMSelectItems, .sapMComboBoxList, .oj-listbox-results, .oj-select-results, .mat-select-panel, .mat-mdc-select-panel, .cdk-overlay-pane, .zp_dropdown_menu, .zp_select_options";

const FIELD_CONTROLS = "[role='combobox']";

/** The node holds another dropdown than `owner` (and other than `owner`'s own parts). */
function otherFieldsIn(node: Element, owner: HTMLElement): boolean {
  return Array.from(node.querySelectorAll(FIELD_CONTROLS)).some((c) => c !== owner && !c.contains(owner) && !owner.contains(c));
}

/** An open list that belongs to another dropdown: another field names it (aria-controls / aria-owns), or the nearest
 * widget around it holds another field and not this one. A phone's country list left open must never answer a
 * "Which country are you based in?" question (live run: "India+91" picked for it from the phone's list). */
function ownedByAnother(list: Element, owner: HTMLElement): boolean {
  const ids = new Set<string>();
  for (let n: Element | null = list; n && ids.size < 4; n = n.parentElement) if (n.id) ids.add(n.id);
  for (const id of ids) {
    const namers = deepQueryAll<HTMLElement>(owner.ownerDocument, `[aria-controls~="${cssAttr(id)}"], [aria-owns~="${cssAttr(id)}"]`);
    if (namers.some((n) => n !== owner && !n.contains(owner) && !owner.contains(n))) return true;
  }
  let node: Element | null = list.parentElement;
  for (let depth = 0; node && depth < 6; depth++, node = node.parentElement) {
    if (node.contains(owner)) return false;
    if (Array.from(node.querySelectorAll(FIELD_CONTROLS)).some((c) => !list.contains(c))) return true;
  }
  return false;
}

/** The list a dropdown opened, when it does not name it: the one inside the field's own group, else the only open list
 * on the page. Never every option on the page: another open list, or a menu built of options, is not this field's. */
function listNear(owner: HTMLElement): ParentNode | undefined {
  let node: Element | null = owner.parentElement;
  for (let depth = 0; node && depth < 5; depth++, node = node.parentElement) {
    if (otherFieldsIn(node, owner)) break; // another field's widget: its options are not this field's
    if (visibleOptions(node).length) return node;
  }
  const open = deepQueryAll<HTMLElement>(owner.ownerDocument, LIST_CONTAINERS).filter((l) => visibleOptions(l).length && !ownedByAnother(l, owner));
  // A menu and the list inside it are one list.
  const lists = open.filter((l) => !open.some((inner) => inner !== l && l.contains(inner)));
  if (lists.length === 1) return lists[0];
  if (lists.length) return undefined;
  // Options with no list around them (a portal at the end of the page): only when they all sit together.
  const all = visibleOptions(owner.ownerDocument);
  const options = all.filter((o) => !ownedByAnother(o, owner));
  const parents = new Set(options.map((o) => o.parentElement));
  if (parents.size !== 1) return undefined;
  // Some options belong to another dropdown: look only where this field's options are.
  return options.length === all.length ? owner.ownerDocument : ([...parents][0] ?? undefined);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function choose(option: HTMLElement): void {
  option.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, composed: true }));
  option.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, composed: true }));
  option.click();
}

/** Catch-all choices ("Other", "My school is not listed", "None of the above") need the user's own words in another
 * box: never picked unless the answer itself is that choice. */
const CATCH_ALL = /^(other|others|none of the above|not listed|(my )?(school|university|college|institution|degree|option) (is )?not listed|not (in|on) (the |this )?list)( please specify)?$/;

function withoutCatchAll(value: string, pick: (labels: string[]) => string | undefined): (labels: string[]) => string | undefined {
  if (CATCH_ALL.test(normalize(value))) return pick;
  return (labels) => pick(labels.filter((l) => !CATCH_ALL.test(normalize(l))));
}

/** Rows a list shows while it searches or when it found nothing (react-select's menu notices, select2's message…). */
const LIST_NOTICE = "[class*='menu-notice' i], [class*='no-options' i], [class*='nooptions' i], [class*='no-results' i], [class*='noresults' i], [class*='loading' i], [aria-busy='true'], .select2-results__message";

/** Whether the field's list is still loading, or says it found nothing. Looks in the list and in the field's own widget. */
function listStatus(owner: HTMLElement, scope: ParentNode | undefined): "loading" | "empty" | undefined {
  const roots: ParentNode[] = scope ? [scope] : [];
  let node: Element | null = owner.parentElement;
  for (let depth = 0; node && depth < 5; depth++, node = node.parentElement) {
    if (node.querySelectorAll("[role='combobox']").length > 1) break; // another field's widget
    roots.push(node);
  }
  for (const root of roots) {
    for (const notice of Array.from(root.querySelectorAll<HTMLElement>(LIST_NOTICE))) {
      if (notice.closest("[hidden], [aria-hidden='true']")) continue;
      const text = cleanLabel(notice.textContent ?? "");
      if (/^(loading|searching|please wait)/i.test(text) || notice.getAttribute("aria-busy") === "true" || (!text && /loading/i.test(String(notice.className)))) return "loading";
      if (text && NOT_AN_OPTION.test(text)) return "empty";
    }
  }
  return undefined;
}

function optionText(option: HTMLElement): string {
  const primary = option.querySelector("[data-automation-id='promptOptionTitle'], .primary-text, .title");
  return cleanLabel((primary ?? option).textContent ?? "");
}

interface ListPick {
  chosen?: string;
  /** The real options the list showed last. */
  seen: string[];
}

/** Wait for the list's real results (they arrive late, and stale or "Loading…" rows come first) and click the one
 * `pick` names. Returns without a choice when the time is out, or when the list has shown the same finished results
 * (or "No options") for `settleMs`: nothing better is coming for this search. The list is not closed here. */
async function waitAndPick(owner: HTMLElement, pick: (labels: string[]) => string | undefined, timeoutMs: number, settleMs: number): Promise<ListPick> {
  const doc = owner.ownerDocument;
  const deadline = Date.now() + timeoutMs;
  let seen: string[] = [];
  let signature = "\u0000";
  let stableSince = Date.now();
  while (Date.now() < deadline) {
    // Read every time: react-select names its list (aria-controls) only once the list is open.
    const listId = owner.getAttribute("aria-controls") || owner.getAttribute("aria-owns");
    const scope: ParentNode | undefined = (listId && (scopeOf(owner).getElementById(listId) ?? doc.getElementById(listId))) || listNear(owner);
    const options = scope ? visibleOptions(scope).filter((o) => !NOT_AN_OPTION.test(cleanLabel(o.textContent ?? ""))) : [];
    const labels = options.map(optionText);
    if (labels.length) {
      const match = pick(labels);
      if (match) {
        choose(options[labels.indexOf(match)]!);
        return { chosen: match, seen: labels };
      }
      seen = labels;
    }
    const status = listStatus(owner, scope);
    const now = `${status ?? ""}|${labels.join("\n")}`;
    if (now !== signature) {
      signature = now;
      stableSince = Date.now();
    } else if (status !== "loading" && (labels.length || status === "empty") && Date.now() - stableSince >= settleMs) {
      return { seen };
    }
    await sleep(scope ? 120 : 150); // the list has not opened yet, or there are several and none is clearly this one
  }
  return { seen };
}

/** Close the list on the field itself only. A bubbling Escape reaches the page, and pop-up application forms close on
 * Escape: the user's form would vanish (round 4 report). Leaving the field closes most lists too. */
function closeList(owner: HTMLElement): void {
  owner.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: false, composed: false }));
  owner.blur();
}

/** Open a list and pick the best match for `value`; gives up only when the time is out, closing the list again. */
async function pickFromList(owner: HTMLElement, value: string, timeoutMs: number, pick?: (labels: string[]) => string | undefined): Promise<FillOutcome> {
  const { chosen, seen } = await waitAndPick(owner, withoutCatchAll(value, pick ?? ((labels) => bestOption(labels, value))), timeoutMs, Infinity);
  if (chosen) return { ok: true, detail: chosen === value ? undefined : `chose "${chosen}"`, chosen };
  closeList(owner);
  return { ok: false, detail: seen.length ? `no option matches "${value}"` : "options did not appear" };
}

/** What a searchable dropdown shows as chosen. react-select keeps its text box empty and shows the choice beside it
 * (".select__single-value"); other widgets show it in the box. Only inside the field's own widget. */
export function comboboxShown(el: Element): string {
  let node: Element | null = el.parentElement;
  for (let depth = 0; node && depth < 5; depth++, node = node.parentElement) {
    if (node.querySelectorAll("[role='combobox']").length > 1) return "";
    const multi = Array.from(node.querySelectorAll("[class*='multi-value__label' i], [class*='multiValue'] [class*='Label']"));
    if (multi.length) return multi.map((m) => cleanLabel(m.textContent ?? "")).filter(Boolean).join(", ");
    const single = node.querySelector("[class*='single-value' i], [class*='singleValue']");
    if (single) return cleanLabel(single.textContent ?? "");
  }
  return "";
}

/** Put a search into a type-ahead box the way typing does (native setter, input event, a key). An empty search opens
 * the whole list (react-select lists everything when nothing is typed). */
function typeQuery(input: HTMLInputElement, query: string, first: boolean): void {
  if (first || input.value !== query) {
    setNativeValue(input, query);
    fire(input, "input");
    input.dispatchEvent(new KeyboardEvent("keyup", { key: query.slice(-1) || "Backspace", bubbles: true, composed: true }));
  }
  // ArrowDown opens a closed list (it never submits or closes anything on the page).
  if (!query) input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", code: "ArrowDown", bubbles: true, composed: true, cancelable: true }));
}

export interface ComboboxOptions {
  /** Other things to type when the value itself finds nothing ("Indian Institute of Technology Jodhpur" for
   * "IIT Jodhpur", a distinctive word). The whole list (an empty search) is always tried last. */
  queries?: string[];
  /** Which listed option is the answer (default: the best match for the value). Never a catch-all "Other". */
  pick?: (labels: string[]) => string | undefined;
}

const sameChoice = (a: string, b: string) => {
  const n = (s: string) => normalize(s).replace(/\s+/g, "");
  return n(a) === n(b) || n(a).includes(n(b)) || n(b).includes(n(a));
};

/** Type into a searchable dropdown (a location typeahead backed by a server, a react-select list) and pick the option
 * that clearly is the value. Searches that find nothing ("M.Tech" in a list of "Master's Degree"…, a school list that
 * knows "IIT Jodhpur" by its full name) are followed by the other queries and then by the whole list. Gives up, leaving
 * the field for the user, when no option clearly matches. */
export async function fillCombobox(input: HTMLInputElement, value: string, timeoutMs = 6000, options: ComboboxOptions = {}): Promise<FillOutcome> {
  const pick = withoutCatchAll(value, options.pick ?? ((labels) => bestOption(labels, value)));
  const queries = [...new Set([value, ...(options.queries ?? []).filter(Boolean), ""])];
  // Every search together stays within a little more than one wait: a long form with several lists must not crawl.
  const deadline = Date.now() + timeoutMs + 3000;
  let seen: string[] = [];
  input.focus();
  for (const [index, query] of queries.entries()) {
    const left = deadline - Date.now();
    if (left <= 0) break;
    typeQuery(input, query, index === 0);
    // A search answers within ~1.2 s of showing its results; nothing better comes after that. The whole list (an
    // empty search) is there at once or not at all.
    const result = await waitAndPick(input, pick, Math.min(left, query ? timeoutMs : 3000), 1200);
    if (result.seen.length) seen = result.seen;
    if (result.chosen) {
      await sleep(120);
      let shown = comboboxShown(input);
      // react-select always shows its choice beside the box: nothing there means the click landed in another list.
      if (!shown && input.closest("[class*='value-container' i], [class*='ValueContainer']")) {
        await sleep(400);
        shown = comboboxShown(input);
        if (!shown) return { ok: false, detail: `"${result.chosen}" did not stick` };
      }
      if (shown && !sameChoice(shown, result.chosen)) return { ok: false, detail: `the list shows "${shown}", not "${result.chosen}"` };
      return { ok: true, detail: result.chosen === value ? undefined : `chose "${result.chosen}"`, chosen: result.chosen };
    }
  }
  // Nothing typed for a search stays behind (a half name is a wrong answer); the field is left for the user.
  if (input.value && input.value !== value) {
    setNativeValue(input, "");
    fire(input, "input");
  }
  closeList(input);
  return { ok: false, detail: seen.length ? `no option matches "${value}"` : "options did not appear" };
}

const DROPDOWN_PLACEHOLDER = /^(select|choose|please select)\b|^(select( one| an option)?|choose( one)?|please select|--+|—|bitte w[äa]hlen|s[ée]lectionner|seleccion(e|a|ar)|selecione)\W*$/i;

/** What a custom dropdown currently shows, without its placeholder ("Select One"). */
export function dropdownValue(el: Element): string {
  const selectedChild = el.querySelector(".combobox-selected-text, .selected-value, [data-selected], .filter-option-inner-inner, .mat-select-value-text, .mat-mdc-select-value-text, .mat-select-value, .oj-select-single-label, [data-automation-id='promptOptionTitle'], [data-automation-id='selectedItem'], .zp_selected_value, .sapMSltLabel");
  const text = cleanLabel(selectedChild?.textContent ?? "") ||
    cleanLabel(el.textContent ?? "") ||
    cleanLabel(el.getAttribute("data-value") ?? "") ||
    cleanLabel(el.getAttribute("data-selected") ?? "") ||
    cleanLabel(el.getAttribute("value") ?? "");
  return DROPDOWN_PLACEHOLDER.test(text) ? "" : text;
}

/** Open a custom dropdown (a button with a list of choices), pick the best match, and check that it shows it. */
export async function fillDropdown(el: HTMLElement, value: string, timeoutMs = 4000, pick?: (labels: string[]) => string | undefined): Promise<FillOutcome> {
  el.focus();
  el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, composed: true }));
  el.click();
  if (el.getAttribute("aria-expanded") === "false") el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, composed: true }));
  const picked = await pickFromList(el, value, timeoutMs, pick);
  if (!picked.ok) return picked;
  await sleep(120);
  const shown = dropdownValue(el);
  if (!shown) return { ok: false, detail: "choice did not stick" };
  // It must show the option that was chosen (round 4): a widget that ends on another option is a wrong answer.
  const chosen = picked.chosen ?? value;
  const n = (s: string) => normalize(s).replace(/\s+/g, "");
  const same = n(shown) === n(chosen) || n(shown).includes(n(chosen)) || n(chosen).includes(n(shown));
  return same ? picked : { ok: false, detail: `the list shows "${shown}", not "${chosen}"` };
}

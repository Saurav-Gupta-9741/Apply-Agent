/** Reads an application form: every visible field, its question text, type, options and whether it is required.
 *
 * Question text is resolved the way a person reads a form, in this order: explicit ARIA labels, the field's own
 * <label>, the label of its group (role="group"/fieldset), and finally the nearest label-like text before the field
 * inside its "question container" (the largest ancestor holding no other field). Generic control captions such as
 * "Attach" or "Type your response" are never taken as the question. Hidden status text is never read. */

import type { ControlType, FieldDescriptor } from "../shared/types";
import { cleanLabel, cssAttr } from "../shared/text";
import { deepQueryAll, scopeOf } from "./dom";

/** Native controls, plus buttons that open a list of choices (custom dropdowns). */
export type FieldElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLButtonElement | HTMLElement;

export interface ExtractedField {
  descriptor: FieldDescriptor;
  /** The control, or for radio/checkbox groups every control in the group. */
  elements: FieldElement[];
}

const SKIP_INPUT_TYPES = new Set(["hidden", "submit", "button", "reset", "image", "search", "password"]);
export const DROPDOWN = "button[aria-haspopup='listbox'], [role='combobox']:not(input):not(select), [role='listbox'][tabindex='0']:not(select)";
export const DROPZONE = "[data-dropzone], [data-testid*='dropzone' i], [data-ui*='dropzone' i], [class*='dropzone' i], [class*='drop-zone' i], [class*='file-drop' i], [class*='fileDrop' i]";

export function isDropzone(el: Element): boolean {
  if (!(el instanceof HTMLElement) || el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement || el instanceof HTMLButtonElement) return false;
  if (!el.matches(DROPZONE)) return false;
  if (el.parentElement?.closest(DROPZONE)) return false;
  if (el.querySelector("input[type='file']") || el.parentElement?.querySelector(":scope > input[type='file']")) return false;
  return true;
}
const CONTROLS = `input, textarea, select, ${DROPDOWN}, ${DROPZONE}`;
const LABELISH = "legend, label, .label, [class*='label'], [class*='Label'], [class*='question-title'], [class*='questionTitle'], [role='heading'], h3, h4";
const GENERIC_LABEL = /^(attach|attach file|upload|upload file|browse|choose( a)? file|select( a)? file|drop (your )?files?( here)?|enter manually|type your response|your answer|answer|select|choose|select an option|please select|optional)\W*$/i;

let computedStyleCache = new WeakMap<Element, CSSStyleDeclaration>();
let styleHiddenCache = new WeakMap<Element, boolean>();
let isHiddenCache = new WeakMap<Element, boolean>();

export function clearExtractCaches(): void {
  computedStyleCache = new WeakMap<Element, CSSStyleDeclaration>();
  styleHiddenCache = new WeakMap<Element, boolean>();
  isHiddenCache = new WeakMap<Element, boolean>();
}

function getStyle(el: Element): CSSStyleDeclaration | null | undefined {
  let s = computedStyleCache.get(el);
  if (!s) {
    s = el.ownerDocument.defaultView?.getComputedStyle(el) ?? undefined;
    if (s) computedStyleCache.set(el, s);
  }
  return s;
}

function styleHidden(el: Element): boolean {
  const cached = styleHiddenCache.get(el);
  if (cached !== undefined) return cached;
  if (el instanceof HTMLElement) {
    const d = el.style.display;
    const v = el.style.visibility;
    if (d === "none" || v === "hidden") {
      styleHiddenCache.set(el, true);
      return true;
    }
    if (!el.ownerDocument.styleSheets?.length) {
      styleHiddenCache.set(el, false);
      return false;
    }
  }
  const style = getStyle(el);
  const isH = !!style && (style.display === "none" || style.visibility === "hidden");
  styleHiddenCache.set(el, isH);
  return isH;
}

/** Spam traps ("honeypots"): text boxes people cannot see or are told to leave empty. A form that finds one filled
 * throws the application away as a bot's. Real choice widgets often hide their native input (opacity 0): those are
 * radios, checkboxes, files and comboboxes, never plain text boxes, so they are not affected. */
const HONEYPOT_WORDS = /honey ?pot|leave (this |it )?(field |box )?(blank|empty)(?!\s*(if|unless|when|for|or)\b)|(should|must) be left (blank|empty)|do not (fill|type|enter)( anything)? (in )?(this|here)|if you are (a )?human|bot[-_ ]?(field|check|trap)|anti[-_ ]?spam|^hp[-_]|[-_]hp|leer lassen|bitte freilassen|nicht ausf[uü]llen|laisser (ce champ )?vide|ne pas remplir|dejar (este campo )?en blanco|dejar vac[ií]o|no (llenar|rellenar)|deix[ae]r? (este campo )?em branco|n[aã]o preencher/i;

function isHoneypot(el: FieldElement, labelsByFor?: Map<string, HTMLLabelElement>): boolean {
  const textLike = el instanceof HTMLTextAreaElement
    || el instanceof HTMLInputElement && !["radio", "checkbox", "file"].includes(el.type) && el.getAttribute("role") !== "combobox" && !el.hasAttribute("aria-autocomplete");
  if (!textLike) return false;
  const labelText = (el.id && labelsByFor?.get(el.id)?.textContent) || el.closest("label")?.textContent || "";
  const describedAs = [el.getAttribute("name"), el.id, el.getAttribute("placeholder"), el.getAttribute("aria-label"),
    labelledBy(el), labelText].join(" ");
  if (HONEYPOT_WORDS.test(describedAs)) return true;
  // Where the browser has laid the page out: a box of a pixel or less, or placed far outside the page, is not for people.
  const rect = el.getBoundingClientRect();
  const laidOut = el.ownerDocument.documentElement.getBoundingClientRect().width > 0;
  if (laidOut && el.getClientRects().length && (rect.width <= 1 || rect.height <= 1 || rect.right < -100 || rect.bottom < -100)) return true;
  // The same from the styles (also where nothing is laid out yet): see-through, moved off-screen, clipped, or 1 px.
  const far = (v: string) => {
    const m = /^(-\d+(?:\.\d+)?)(px|em|rem)$/.exec(v);
    return !!m && parseFloat(m[1]!) * (m[2] === "px" ? 1 : 16) <= -500;
  };
  const hasSheets = !!el.ownerDocument.styleSheets?.length;
  for (let node: Element | null = el, d = 0; node && d < 8; node = node.parentElement, d++) {
    if (!hasSheets) {
      if (node instanceof HTMLElement) {
        const s = node.style;
        if (s.opacity !== "" && parseFloat(s.opacity) === 0) return true;
        if ((s.position === "absolute" || s.position === "fixed") && (far(s.left) || far(s.top))) return true;
        if (/translate[xy3d]*\(\s*-\d{3,}/i.test(s.transform)) return true;
        if (/rect\(\s*0(px)?[ ,]+0(px)?[ ,]+0(px)?\s*\)/.test(s.clip) || /inset\(\s*50%|circle\(\s*0/.test(s.clipPath)) return true;
        if (node === el && (/^[01](\.\d+)?px$/.test(s.width) || /^[01](\.\d+)?px$/.test(s.height))) return true;
      }
      continue;
    }
    const style = getStyle(node);
    if (!style) continue;
    if (style.opacity !== "" && parseFloat(style.opacity) === 0) return true;
    if ((style.position === "absolute" || style.position === "fixed") && (far(style.left) || far(style.top))) return true;
    if (/translate[xy3d]*\(\s*-\d{3,}/i.test(style.transform)) return true;
    if (/rect\(\s*0(px)?[ ,]+0(px)?[ ,]+0(px)?\s*\)/.test(style.clip) || /inset\(\s*50%|circle\(\s*0/.test(style.clipPath)) return true;
    if (node === el && (/^[01](\.\d+)?px$/.test(style.width) || /^[01](\.\d+)?px$/.test(style.height))) return true;
  }
  return false;
}

function isHidden(el: Element, depth = 0): boolean {
  if (depth > 32) return false;
  const cached = isHiddenCache.get(el);
  if (cached !== undefined) return cached;
  if (el.hasAttribute("hidden") || el.getAttribute("aria-hidden") === "true") {
    isHiddenCache.set(el, true);
    return true;
  }
  if (styleHidden(el)) {
    isHiddenCache.set(el, true);
    return true;
  }
  const parent = el.parentElement;
  if (parent && parent.nodeType === Node.ELEMENT_NODE && parent !== el.ownerDocument.documentElement) {
    if (isHidden(parent, depth + 1)) {
      isHiddenCache.set(el, true);
      return true;
    }
  }
  isHiddenCache.set(el, false);
  return false;
}

/** Text a person can see: skips hidden status messages, option lists and nested controls. */
export function visibleText(el: Element | null | undefined, depth = 0, visited = new WeakSet<Element>()): string {
  if (!el || depth > 128 || visited.has(el)) return "";
  visited.add(el);
  let out = "";
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) out += node.textContent ?? "";
    else if (node instanceof Element) {
      const tag = node.tagName.toLowerCase();
      if (["select", "option", "input", "textarea", "script", "style", "button"].includes(tag)) continue;
      if (node.getAttribute("role") === "listbox" || node.hasAttribute("hidden") || node.getAttribute("aria-hidden") === "true") continue;
      if (styleHidden(node)) continue;
      out += " " + visibleText(node, depth + 1, visited) + " ";
    }
  }
  return out;
}

function labelledBy(el: Element | null): string {
  const ids = el?.getAttribute("aria-labelledby");
  if (!el || !ids) return "";
  const scope = scopeOf(el);
  return ids.split(/\s+/).map((id) => visibleText(scope.getElementById(id) ?? el.ownerDocument.getElementById(id))).join(" ");
}

/** Names like "cards[59e7ee0c-...][field1]" or random ids say nothing about the question. */
function humanName(name: string): string {
  if (!name || /[0-9a-f]{8}-[0-9a-f]{4}|\[|\]|^[\w-]{24,}$/i.test(name)) return "";
  return name.replace(/^_+|systemfield_/gi, "").replace(/[_-]+/g, " ");
}

function hasOtherControl(container: Element, own: Set<Element>): boolean {
  const controls = container.querySelectorAll(CONTROLS);
  for (let i = 0; i < controls.length; i++) {
    const c = controls[i];
    if (!c || own.has(c)) continue;
    if (c instanceof HTMLInputElement && SKIP_INPUT_TYPES.has(c.type)) continue;
    if (c.matches(DROPZONE) && !isDropzone(c)) continue;
    if (c instanceof HTMLInputElement && c.type === "file") return true;
    if (isDropzone(c)) return true;
    if (!isHidden(c)) return true;
  }
  return false;
}

function controlsIn(container: Element): FieldElement[] {
  return deepQueryAll<FieldElement>(container, CONTROLS).filter(
    (c) => !(c instanceof HTMLInputElement && SKIP_INPUT_TYPES.has(c.type)) && !(c.matches(DROPZONE) && !isDropzone(c)) && ((c instanceof HTMLInputElement && c.type === "file") || isDropzone(c) || !isHidden(c)),
  );
}

/** Nearest label-like text before the field, inside the largest ancestor that holds no other field. */
export function questionText(el: FieldElement, group: FieldElement[] = [el], stopAt?: Element): string {
  const own = new Set<Element>(group);
  let container: Element | null = null;
  for (let node = el.parentElement, depth = 0; node && depth < 8 && node !== stopAt?.parentElement; node = node.parentElement, depth++) {
    if (node instanceof HTMLFormElement || node.tagName === "FORM" || hasOtherControl(node, own)) break;
    container = node;
  }
  if (!container) return "";
  const candidates = Array.from(container.querySelectorAll<Element>(LABELISH)).filter((c) =>
    !group.some((g) => c.contains(g))
    && c.querySelector(CONTROLS) === null
    && !!(c.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING),
  );
  for (const candidate of candidates.reverse()) {
    const text = cleanLabel(visibleText(candidate));
    if (text && !GENERIC_LABEL.test(text)) return visibleText(candidate);
  }
  // No label-like element (BambooHR: <p>Resume*</p> above the upload button): the first short text in the field's
  // own block that comes before it and is not a button caption or a status line.
  for (const node of Array.from(container.querySelectorAll("p, span, div, strong, b"))) {
    if (!(node.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) || node.closest("button, [role='button']")) continue;
    const own = Array.from(node.childNodes).filter((c) => c.nodeType === Node.TEXT_NODE).map((c) => c.textContent ?? "").join(" ").trim();
    const text = cleanLabel(own);
    if (!text || text.length > 150 || !/\p{L}/u.test(text) || GENERIC_LABEL.test(text) || NOT_A_QUESTION.test(text)) continue;
    if (isHidden(node)) continue;
    return own;
  }
  return "";
}

/** Status lines and captions around upload and choice widgets. */
const NOT_A_QUESTION = /^(no file (selected|chosen)|choose file|drag (and|&) drop|or drag|max(imum)? (file )?size|accepted (file )?(types|formats)|supported (file )?(types|formats)|\.?pdf\b|optional|required)\W*$/i;

/** Raw question text (with its "*" markers) for one control. */
const MACHINE_NAME = /^[a-z0-9]+([-_][a-z0-9]+)+$/;

function rawLabel(el: FieldElement, root: ParentNode, labelsByFor?: Map<string, HTMLLabelElement>): string {
  const isChoice = el instanceof HTMLInputElement && (el.type === "radio" || el.type === "checkbox");
  // label[for] resolves in the element's own tree (document or shadow root), like the browser does.
  const forLabel = el.id
    ? (labelsByFor?.get(el.id) ?? scopeOf(el).querySelector(`label[for="${cssAttr(el.id)}"]`) ?? root.querySelector(`label[for="${cssAttr(el.id)}"]`))
    : null;
  const candidates: Array<() => string> = [
    () => labelledBy(el),
    () => visibleText(forLabel) || forLabel?.textContent || "", // visually-hidden labels still count
    () => (isChoice ? visibleText(el.closest("label")) : ""),
    () => (isChoice ? (el.closest("[role='radio'], [role='checkbox']")?.getAttribute("aria-label") ?? visibleText(el.closest("[role='radio'], [role='checkbox']"))) : ""),
    () => (isChoice ? "" : labelledBy(el.closest("[role='group'][aria-labelledby], [role='radiogroup'][aria-labelledby]"))),
    () => (isChoice ? "" : visibleText(el.closest("label"))),
    // A developer's name ("file-input", "text_field_3") is not a label: the question is in the text around it.
    () => (MACHINE_NAME.test(el.getAttribute("aria-label") ?? "") ? "" : el.getAttribute("aria-label") ?? ""),
    () => questionText(el, [el], root instanceof Element ? root : undefined),
    () => el.getAttribute("placeholder") ?? "",
    () => (isChoice ? "" : labelAfter(el)),
    () => humanName(el.getAttribute("name") || el.id),
  ];
  for (const get of candidates) {
    const raw = get();
    const label = cleanLabel(raw);
    // A rule drawn with characters ("______") or a lone symbol is decoration, not a question.
    if (label && /\p{L}/u.test(label) && !GENERIC_LABEL.test(label)) {
      const placeholder = (el instanceof HTMLElement && el.getAttribute("placeholder") || "").trim();
      if (placeholder && /\b(current|present)\b/i.test(label) && /\b(expect|desired)\b/i.test(label)) {
        const pCurrent = /\b(current|present)\b/i.test(placeholder);
        const pExpected = /\b(expect|desired)\b/i.test(placeholder);
        if (pCurrent !== pExpected) {
          return `${raw} › ${placeholder}`;
        }
      }
      return raw;
    }
  }
  return "";
}

export function labelFor(el: FieldElement, root: ParentNode, labelsByFor?: Map<string, HTMLLabelElement>): string {
  return cleanLabel(rawLabel(el, root, labelsByFor));
}

function optionsForCustomDropdown(el: HTMLElement, root: ParentNode): string[] {
  const container = el.closest("[role='listitem'], [role='group'], fieldset, .field, form") ?? el.parentElement ?? root;
  const opts = Array.from(container.querySelectorAll<HTMLElement>("[role='option']"))
    .map((o) => cleanLabel(o.textContent ?? ""))
    .filter((o) => o && !/^(select|choose|--|please select)/i.test(o));
  if (opts.length > 0) return opts;
  const listId = el.getAttribute("aria-controls") ?? el.getAttribute("aria-owns");
  if (listId) {
    const list = el.ownerDocument.getElementById(listId);
    if (list) {
      return Array.from(list.querySelectorAll<HTMLElement>("[role='option']"))
        .map((o) => cleanLabel(o.textContent ?? ""))
        .filter((o) => o && !/^(select|choose|--|please select)/i.test(o));
    }
  }
  return [];
}

function controlType(el: FieldElement): ControlType {
  if (el.matches(DROPDOWN)) return "dropdown";
  if (el instanceof HTMLTextAreaElement) return "textarea";
  if (el instanceof HTMLSelectElement) return "select";
  if (el.getAttribute("role") === "combobox") return "combobox";
  if (isDropzone(el)) return "file";
  const type = (el.getAttribute("type") ?? "text").toLowerCase();
  const known: ControlType[] = ["email", "tel", "url", "number", "date", "radio", "checkbox", "file"];
  return (known as string[]).includes(type) ? (type as ControlType) : "text";
}

const REQUIRED_MARK = /[*✱]|\(required\)/i;

function isRequired(els: FieldElement[], raw: string): boolean {
  return els.some((e) => ("required" in e && e.required) || e.getAttribute("aria-required") === "true"
    || (e.matches(DROPDOWN) && /\brequired\W*$/i.test(e.getAttribute("aria-label") ?? ""))
    || e.closest("[role='group'], [role='radiogroup']")?.getAttribute("aria-required") === "true") || REQUIRED_MARK.test(raw);
}

function groupRaw(group: HTMLInputElement[], root: ParentNode, labelsByFor?: Map<string, HTMLLabelElement>): string {
  const first = group[0]!;
  const legend = first.closest("fieldset")?.querySelector("legend");
  return visibleText(legend)
    || labelledBy(first.closest("[role='radiogroup'], [role='group']"))
    || questionText(first, group, root instanceof Element ? root : undefined)
    || humanName(first.name);
}

const groupKeys = new WeakMap<Element, string>();
let groupCount = 0;
function groupKey(container: Element | null): string | undefined {
  if (!container) return undefined;
  if (!groupKeys.has(container)) groupKeys.set(container, `__group${groupCount++}`);
  return groupKeys.get(container);
}

/** A label right after its box with nothing tying them ("<input><label>Email</label>"): the next sibling, if it is short. */
function labelAfter(el: Element): string {
  const next = el.nextElementSibling;
  if (!next || !next.matches("label, span, small") || next.querySelector("input, select, textarea")) return "";
  const text = (next.textContent ?? "").trim();
  return text.length <= 80 ? text : "";
}

export function extractFields(root: ParentNode): ExtractedField[] {
  clearExtractCaches();
  const out: ExtractedField[] = [];
  const groups = new Map<string, HTMLInputElement[]>();
  let counter = 0;
  const all = deepQueryAll<FieldElement>(root, CONTROLS);
  const position = new Map(all.map((el, i) => [el as Element, i]));

  const labelsByFor = new Map<string, HTMLLabelElement>();
  for (const l of deepQueryAll<HTMLLabelElement>(root, "label[for]")) {
    const targetId = l.htmlFor || l.getAttribute("for");
    if (targetId && !labelsByFor.has(targetId)) {
      labelsByFor.set(targetId, l);
    }
  }

  for (const el of all) {
    if (el instanceof HTMLInputElement && SKIP_INPUT_TYPES.has(el.type)) continue;
    if (el.matches(DROPZONE) && !isDropzone(el)) continue;
    // Disabled and read-only fields (often pre-filled by the site) are not the user's to change.
    if (("disabled" in el && (el as HTMLInputElement).disabled) || ((el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) && el.readOnly)) continue;
    // File inputs are usually hidden behind a styled "Upload" button but still accept files.
    const isFile = (el instanceof HTMLInputElement && el.type === "file") || isDropzone(el);
    if (!isFile && isHidden(el)) continue;
    if (isHoneypot(el, labelsByFor)) continue;
    // Radios, and checkboxes sharing a name, are one question with several options.
    if (el instanceof HTMLInputElement && (el.type === "radio" || (el.type === "checkbox" && el.name))) {
      // Radios without a name: one question per fieldset or radio group (a stray one stands alone).
      const key = `${el.type}:${el.name || groupKey(el.closest("fieldset, [role='radiogroup'], [role='group']")) || `__${counter++}`}`;
      groups.set(key, [...(groups.get(key) ?? []), el]);
      continue;
    }
    const raw = rawLabel(el, root, labelsByFor);
    if (HONEYPOT_WORDS.test(raw) && !["radio", "checkbox", "file"].includes(el instanceof HTMLInputElement ? el.type : "")) continue;
    // Custom dropdowns often name themselves "Country Select One Required": the question is "Country".
    const label = el.matches(DROPDOWN) ? cleanLabel(raw).replace(/(\s+(select one|please select|select|required))+$/i, "") : cleanLabel(raw);
    out.push({
      elements: [el],
      descriptor: {
        key: `f${counter++}`,
        label,
        control: controlType(el),
        required: isRequired([el], raw),
        options: el instanceof HTMLSelectElement
          ? Array.from(el.options).map((o) => cleanLabel(o.textContent ?? "")).filter((o) => o && !/^(select|choose|--|please select)/i.test(o))
          : optionsForCustomDropdown(el, root),
        name: el.getAttribute("name") || el.id,
        autocomplete: el.getAttribute("autocomplete") ?? "",
        placeholder: el.getAttribute("placeholder") ?? "",
        maxLength: (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) && el.maxLength > 0 ? el.maxLength : undefined,
      },
    });
  }

  for (const [key, group] of groups) {
    const first = group[0]!;
    // A lone named checkbox ("I agree…") is a yes/no question labelled by its own text.
    if (first.type === "checkbox" && group.length === 1) {
      const raw = rawLabel(first, root, labelsByFor);
      out.push({
        elements: group,
        descriptor: {
          key: `f${counter++}`, label: cleanLabel(raw), control: "checkbox", required: isRequired(group, raw), options: [],
          name: first.name, autocomplete: "", placeholder: "",
        },
      });
      continue;
    }
    const raw = groupRaw(group, root, labelsByFor);
    out.push({
      elements: group,
      descriptor: {
        key: `f${counter++}`,
        label: cleanLabel(raw),
        control: first.type === "radio" ? "radio" : "checkbox_group",
        required: isRequired(group, raw),
        options: group.map((r) => cleanLabel(
        visibleText(r.closest("label"))
        || r.closest("[role='radio'], [role='checkbox']")?.getAttribute("aria-label")
        || visibleText(r.closest("[role='radio'], [role='checkbox'], .docssharedWizToggleLabeledControl"))
        || labelFor(r, root, labelsByFor)
        || r.value
      )),
        name: key.slice(key.indexOf(":") + 1),
        autocomplete: "",
        placeholder: "",
      },
    });
  }
  // Same order as on the page, so questions are shown to the user top to bottom.
  const sorted = out.sort((a, b) => (position.get(a.elements[0]!) ?? 0) - (position.get(b.elements[0]!) ?? 0));
  assignWorkBlocks(sorted, root);
  assignSections(sorted, root);
  return sorted;
}

/** Each field's section: the closest heading before it inside the form (never the page's h1, which is usually the
 * job title: "Product Manager" must not make every field look like a question about a manager). */
function assignSections(fields: ExtractedField[], root: ParentNode): void {
  const headings = deepQueryAll(root, "h2, h3, h4, h5, h6, legend, [role='heading']:not([aria-level='1'])");
  if (!headings.length) return;
  const headingTexts = headings.map((h) => cleanLabel(visibleText(h) || h.textContent || "").slice(0, 80));
  let hIdx = 0;
  for (const field of fields) {
    const el = field.elements[0]!;
    while (hIdx + 1 < headings.length && before(headings[hIdx + 1]!, el)) {
      hIdx++;
    }
    const current = headings.length && before(headings[hIdx]!, el) ? headings[hIdx] : undefined;
    const text = current ? headingTexts[hIdx] : "";
    if (text && text !== field.descriptor.label) field.descriptor.section = text;
  }
}

// --- repeating work-experience sections ------------------------------------------------------------------------


export const WORK_SECTION = /work experience|employment history|professional experience|work history|my experience|berufserfahrung|exp[ée]rience professionnelle|experiencia (laboral|profesional)|experi[êe]ncia profissional|esperienza lavorativa|werkervaring/i;
const HEADINGS = "h1, h2, h3, h4, h5, h6, legend, [role='heading'], [data-automation-id$='Header' i]";

function before(a: Element, b: Element): boolean {
  return !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
}

/** Headings of the form in page order, each marked as a work-experience heading or not. */
export function sectionHeadings(root: ParentNode): Array<{ el: Element; work: boolean; number?: number }> {
  return deepQueryAll(root, HEADINGS).map((el) => {
    const text = cleanLabel(visibleText(el) || el.textContent || "");
    const work = WORK_SECTION.test(text) && !/education|ausbildung|formation|educaci[oó]n/i.test(text);
    const n = /\b(\d{1,2})\b/.exec(text)?.[1];
    return { el, work, number: work && n ? Number(n) : undefined };
  });
}

/** The work section an element sits in: the closest heading before it decides (undefined when not in one). */
export function inWorkSection(el: Element, headings: ReturnType<typeof sectionHeadings>): boolean {
  let last: (typeof headings)[number] | undefined;
  for (const h of headings) if (before(h.el, el)) last = h;
  return !!last?.work;
}

/** Fields after a work-experience heading belong to job blocks: a numbered heading ("Work Experience 2") starts a
 * block, and so does a question that repeats ("Job Title" a second time). Everything else has no block. */
function assignWorkBlocks(fields: ExtractedField[], root: ParentNode): void {
  const headings = sectionHeadings(root);
  if (!headings.some((h) => h.work)) return;
  let block = -1;
  let seen = new Set<string>();
  let lastHeading: Element | undefined;
  let hIdx = 0;
  for (const field of fields) {
    const el = field.elements[0]!;
    while (hIdx + 1 < headings.length && before(headings[hIdx + 1]!.el, el)) {
      hIdx++;
    }
    const current = headings.length && before(headings[hIdx]!.el, el) ? headings[hIdx] : undefined;
    if (!current?.work) {
      block = -1;
      seen = new Set();
      lastHeading = undefined;
      continue;
    }
    const label = field.descriptor.label.toLowerCase();
    if (current.el !== lastHeading) {
      lastHeading = current.el;
      if (current.number !== undefined) {
        block = current.number - 1;
        seen = new Set();
      } else if (block < 0) block = 0;
    }
    if (block < 0) block = 0;
    if (seen.has(label)) {
      block++;
      seen = new Set();
    }
    seen.add(label);
    field.descriptor.workBlock = block;
  }
}

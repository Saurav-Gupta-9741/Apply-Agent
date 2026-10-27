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
export type FieldElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLButtonElement;

export interface ExtractedField {
  descriptor: FieldDescriptor;
  /** The control, or for radio/checkbox groups every control in the group. */
  elements: FieldElement[];
}

const SKIP_INPUT_TYPES = new Set(["hidden", "submit", "button", "reset", "image", "search", "password"]);
export const DROPDOWN = "button[aria-haspopup='listbox'], [role='combobox']:not(input):not(select)";
const CONTROLS = `input, textarea, select, ${DROPDOWN}`;
const LABELISH = "legend, label, .label, [class*='label'], [class*='Label'], [class*='question-title'], [class*='questionTitle'], h3, h4";
const GENERIC_LABEL = /^(attach|attach file|upload|upload file|browse|choose( a)? file|select( a)? file|drop (your )?files?( here)?|enter manually|type your response|your answer|answer|select|choose|select an option|please select|optional)\W*$/i;

function styleHidden(el: Element): boolean {
  const style = el.ownerDocument.defaultView?.getComputedStyle(el);
  return !!style && (style.display === "none" || style.visibility === "hidden");
}

/** Spam traps ("honeypots"): text boxes people cannot see or are told to leave empty. A form that finds one filled
 * throws the application away as a bot's. Real choice widgets often hide their native input (opacity 0): those are
 * radios, checkboxes, files and comboboxes, never plain text boxes, so they are not affected. */
const HONEYPOT_WORDS = /honey ?pot|leave (this |it )?(field |box )?(blank|empty)(?!\s*(if|unless|when|for|or)\b)|(should|must) be left (blank|empty)|do not (fill|type|enter)( anything)? (in )?(this|here)|if you are (a )?human|bot[-_ ]?(field|check|trap)|anti[-_ ]?spam|^hp[-_]|[-_]hp$/i;

function isHoneypot(el: FieldElement): boolean {
  const textLike = el instanceof HTMLTextAreaElement
    || el instanceof HTMLInputElement && !["radio", "checkbox", "file"].includes(el.type) && el.getAttribute("role") !== "combobox" && !el.hasAttribute("aria-autocomplete");
  if (!textLike) return false;
  const describedAs = [el.getAttribute("name"), el.id, el.getAttribute("placeholder"), el.getAttribute("aria-label"),
    ...Array.from(el.labels ?? [], (l) => l.textContent)].join(" ");
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
  for (let node: Element | null = el; node; node = node.parentElement) {
    const style = node.ownerDocument.defaultView?.getComputedStyle(node);
    if (!style) continue;
    if (style.opacity === "0") return true;
    if ((style.position === "absolute" || style.position === "fixed") && (far(style.left) || far(style.top))) return true;
    if (/translate[xy3d]*\(\s*-\d{3,}/i.test(style.transform)) return true;
    if (/rect\(\s*0(px)?[ ,]+0(px)?[ ,]+0(px)?[ ,]+0(px)?\s*\)/.test(style.clip) || /inset\(\s*50%|circle\(\s*0/.test(style.clipPath)) return true;
    if (node === el && (/^[01](\.\d+)?px$/.test(style.width) || /^[01](\.\d+)?px$/.test(style.height))) return true;
  }
  return false;
}

function isHidden(el: Element): boolean {
  if (el.closest("[hidden], [aria-hidden='true']")) return true;
  for (let node: Element | null = el; node; node = node.parentElement) if (styleHidden(node)) return true;
  return false;
}

/** Text a person can see: skips hidden status messages, option lists and nested controls. */
export function visibleText(el: Element | null | undefined): string {
  if (!el) return "";
  let out = "";
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) out += node.textContent ?? "";
    else if (node instanceof Element) {
      const tag = node.tagName.toLowerCase();
      if (["select", "option", "input", "textarea", "script", "style", "button"].includes(tag)) continue;
      if (node.getAttribute("role") === "listbox" || node.hasAttribute("hidden") || node.getAttribute("aria-hidden") === "true") continue;
      if (styleHidden(node)) continue;
      out += " " + visibleText(node) + " ";
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

function controlsIn(container: Element): FieldElement[] {
  return deepQueryAll<FieldElement>(container, CONTROLS).filter(
    (c) => !(c instanceof HTMLInputElement && SKIP_INPUT_TYPES.has(c.type)) && (c.type === "file" || !isHidden(c)),
  );
}

/** Nearest label-like text before the field, inside the largest ancestor that holds no other field. */
export function questionText(el: FieldElement, group: FieldElement[] = [el], stopAt?: Element): string {
  const own = new Set<Element>(group);
  let container: Element | null = null;
  for (let node = el.parentElement, depth = 0; node && depth < 8 && node !== stopAt?.parentElement; node = node.parentElement, depth++) {
    if (controlsIn(node).some((c) => !own.has(c))) break;
    container = node;
  }
  if (!container) return "";
  const candidates = deepQueryAll(container, LABELISH).filter((c) =>
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

function rawLabel(el: FieldElement, root: ParentNode): string {
  const isChoice = el instanceof HTMLInputElement && (el.type === "radio" || el.type === "checkbox");
  // label[for] resolves in the element's own tree (document or shadow root), like the browser does.
  const forLabel = el.id ? (scopeOf(el).querySelector(`label[for="${cssAttr(el.id)}"]`) ?? root.querySelector(`label[for="${cssAttr(el.id)}"]`)) : null;
  const candidates: Array<() => string> = [
    () => labelledBy(el),
    () => visibleText(forLabel) || forLabel?.textContent || "", // visually-hidden labels still count
    () => (isChoice ? visibleText(el.closest("label")) : ""),
    () => labelledBy(el.closest("[role='group'][aria-labelledby], [role='radiogroup'][aria-labelledby]")),
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
    if (label && /\p{L}/u.test(label) && !GENERIC_LABEL.test(label)) return raw;
  }
  return "";
}

export function labelFor(el: FieldElement, root: ParentNode): string {
  return cleanLabel(rawLabel(el, root));
}

function controlType(el: FieldElement): ControlType {
  if (el.matches(DROPDOWN)) return "dropdown";
  if (el instanceof HTMLTextAreaElement) return "textarea";
  if (el instanceof HTMLSelectElement) return "select";
  if (el.getAttribute("role") === "combobox") return "combobox";
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

function groupRaw(group: HTMLInputElement[], root: ParentNode): string {
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
  const out: ExtractedField[] = [];
  const groups = new Map<string, HTMLInputElement[]>();
  let counter = 0;
  const all = deepQueryAll<FieldElement>(root, CONTROLS);
  const position = new Map(all.map((el, i) => [el as Element, i]));

  for (const el of all) {
    if (el instanceof HTMLInputElement && SKIP_INPUT_TYPES.has(el.type)) continue;
    // Disabled and read-only fields (often pre-filled by the site) are not the user's to change.
    if (el.disabled || ((el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) && el.readOnly)) continue;
    // File inputs are usually hidden behind a styled "Upload" button but still accept files.
    const isFile = el instanceof HTMLInputElement && el.type === "file";
    if (!isFile && isHidden(el)) continue;
    if (isHoneypot(el)) continue;
    // Radios, and checkboxes sharing a name, are one question with several options.
    if (el instanceof HTMLInputElement && (el.type === "radio" || (el.type === "checkbox" && el.name))) {
      // Radios without a name: one question per fieldset or radio group (a stray one stands alone).
      const key = `${el.type}:${el.name || groupKey(el.closest("fieldset, [role='radiogroup'], [role='group']")) || `__${counter++}`}`;
      groups.set(key, [...(groups.get(key) ?? []), el]);
      continue;
    }
    const raw = rawLabel(el, root);
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
          : [],
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
      const raw = rawLabel(first, root);
      out.push({
        elements: group,
        descriptor: {
          key: `f${counter++}`, label: cleanLabel(raw), control: "checkbox", required: isRequired(group, raw), options: [],
          name: first.name, autocomplete: "", placeholder: "",
        },
      });
      continue;
    }
    const raw = groupRaw(group, root);
    out.push({
      elements: group,
      descriptor: {
        key: `f${counter++}`,
        label: cleanLabel(raw),
        control: first.type === "radio" ? "radio" : "checkbox_group",
        required: isRequired(group, raw),
        options: group.map((r) => cleanLabel(visibleText(r.closest("label")) || labelFor(r, root))),
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
  for (const field of fields) {
    const el = field.elements[0]!;
    let current: Element | undefined;
    for (const h of headings) if (before(h, el)) current = h;
    const text = current ? cleanLabel(visibleText(current) || current.textContent || "").slice(0, 80) : "";
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
  for (const field of fields) {
    const el = field.elements[0]!;
    let current: (typeof headings)[number] | undefined;
    for (const h of headings) if (before(h.el, el)) current = h;
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

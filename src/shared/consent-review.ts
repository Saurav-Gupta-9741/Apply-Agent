/** Consent review: the consent and agreement boxes on an application, for the user to read and decide one by one.
 * ApplyAgent never ticks these during a fill. The side panel lists them after a fill; "Tick this box" ticks exactly one
 * box, only after the user clicked it, and only if its label is still the one the user read. There is no "tick all". */

import { deepQueryAll } from "../content/dom";
import { cssAttr, normalize } from "./text";

/** "legal": arbitration, background checks, certifications (read carefully). "marketing": newsletters, texts, job
 * alerts (optional, shown last). "consent": privacy policies, terms, data processing. */
export type ConsentTag = "legal" | "marketing" | "consent";

export interface ConsentBox {
  /** Stable while the box and its label stay the same (its place among the consent boxes, and its label). */
  id: string;
  /** The full label text, exactly as the page shows it (whitespace collapsed). */
  label: string;
  tag: ConsentTag;
  /** The form requires it (required attribute, aria-required or an asterisk). */
  required: boolean;
  checked: boolean;
  /** The box says no ("I do not consent", "opt out"): ticking it refuses something. */
  optOut: boolean;
}

export interface ConsentList {
  boxes: ConsentBox[];
  /** The frame the boxes are in: a tick is only accepted in this same frame. */
  frameUrl: string;
}

export interface TickResult {
  ok: boolean;
  /** Already ticked before the click (nothing was changed). */
  already?: boolean;
  reason?: string;
  box?: ConsentBox;
}

// A consent box says what the user agrees to. Single words ("Marketing", "Communications" as job areas) are not.
const CONSENT_ACT = /\b(agree|agreed|agreement|consent|consents|acknowledge|acknowledged|certify|attest|accept|accepted|confirm|understand|authori[sz]e|declare|opt(ed)?[ -]?in|opt[ -]?out|subscribe|unsubscribe|sign me up|send me|email me|text me|contact me|notify me|message me|keep me (informed|updated|posted)|(wish|want|like|happy) to (receive|be contacted|hear)|receive)\b/;
const CONSENT_TOPIC = /\b(privacy|policy|policies|notice|terms|conditions|arbitration|marketing|communications?|sms|text messages?|texts|whatsapp|newsletters?|background (check|checks|screening|investigation|verification)|data (retention|processing|protection|storage|privacy)|retain|retention|gdpr|ccpa|dsgvo|personal (data|information)|e ?signature|electronic signature)\b/;

const LEGAL = /\b(arbitration|class action|jury trial|waive|waiver|background (check|checks|screening|investigation|verification)|criminal|drug (test|testing|screen|screening)|certify|certification|attest|perjury|true,? (and )?(complete|correct|accurate)|(accurate|correct) and complete|falsif\w*|misrepresent\w*|legally binding|e ?signature|electronic signature|non ?compete|declare)\b/;
const MARKETING = /\b(marketing|newsletters?|promotional|promotions|sms|text messages?|texts|whatsapp|job alerts?|future (job|jobs|opportunit\w*|openings|roles|positions|vacancies)|talent (community|network|pool)|keep me (informed|updated|posted)|news and updates|updates about|email me|text me|message me|subscribe|communications)\b/;
const OPT_OUT = /\b(do not|don t|dont|not)\b.{0,40}\b(consent|agree|wish|want|receive|share|sell|contact)\b|\bopt(ed)? ?out\b|\bunsubscribe\b/;
const REQUIRED_MARK = /[*✱]|\(required\)/i;

/** Does this label ask the user to agree to, consent to, or opt into something? */
export function isConsentLabel(label: string): boolean {
  const text = normalize(label);
  if (!text || text.split(" ").length < 2) return false;
  return CONSENT_ACT.test(text) && (CONSENT_TOPIC.test(text) || /\b(i|we|me|my)\b/.test(text));
}

export function classifyConsent(label: string): { tag: ConsentTag; optOut: boolean } {
  const text = normalize(label);
  const tag: ConsentTag = LEGAL.test(text) ? "legal" : MARKETING.test(text) ? "marketing" : "consent";
  return { tag, optOut: OPT_OUT.test(text) };
}

/** Required boxes first (legal ones on top), then optional ones, marketing opt-ins last; page order otherwise. */
export function reviewOrder(boxes: ConsentBox[]): ConsentBox[] {
  const rank = (b: ConsentBox) => (b.tag === "marketing" && !b.required ? 3 : b.required ? (b.tag === "legal" ? 0 : 1) : 2);
  return boxes.map((b, i) => ({ b, i })).sort((x, y) => rank(x.b) - rank(y.b) || x.i - y.i).map((x) => x.b);
}

function text(el: Element | null | undefined): string {
  return (el?.textContent ?? "").replace(/\s+/g, " ").trim();
}

function byIds(el: Element, attr: string): string {
  const ids = el.getAttribute(attr);
  if (!ids) return "";
  const root = el.getRootNode() as Document | ShadowRoot;
  return ids.split(/\s+/).map((id) => text(root.getElementById?.(id) ?? el.ownerDocument.getElementById(id))).filter(Boolean).join(" ");
}

/** The words the page shows for one box: its label, wherever the page put it. */
export function consentLabelOf(el: HTMLElement): string {
  const own = byIds(el, "aria-labelledby");
  if (own) return own;
  if (el.id) {
    const root = el.getRootNode() as Document | ShadowRoot;
    const forLabel = root.querySelector?.(`label[for="${cssAttr(el.id)}"]`);
    if (forLabel && text(forLabel)) return text(forLabel);
  }
  const wrapping = el.closest("label");
  if (wrapping && text(wrapping)) return text(wrapping);
  const aria = el.getAttribute("aria-label")?.trim();
  if (aria) return aria.replace(/\s+/g, " ");
  if (el.getAttribute("role") === "checkbox" && text(el)) return text(el);
  // <div><input type=checkbox> <span>I agree…</span></div>: the box's own small container.
  const parent = el.parentElement;
  if (parent && parent.querySelectorAll("input[type='checkbox'], [role='checkbox']").length === 1) {
    const words = text(parent);
    if (words.length <= 2000) return words;
  }
  return "";
}

function isChecked(el: HTMLElement): boolean {
  return el instanceof HTMLInputElement ? el.checked : el.getAttribute("aria-checked") === "true";
}

function isRequired(el: HTMLElement, label: string): boolean {
  return (el instanceof HTMLInputElement && el.required) || el.getAttribute("aria-required") === "true" || REQUIRED_MARK.test(label);
}

function hidden(el: HTMLElement): boolean {
  const style = el.ownerDocument.defaultView?.getComputedStyle(el);
  // A styled box often hides the real input behind its label: that still counts when the label is shown.
  if (el.closest("[hidden], [aria-hidden='true']") && !el.closest("label")) return true;
  return !!style && style.display === "none" && !el.closest("label");
}

/** A short, stable fingerprint of a label (djb2): part of the box's id, so a changed label is a different box. */
function fingerprint(label: string): string {
  let h = 5381;
  for (let i = 0; i < label.length; i++) h = ((h << 5) + h + label.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

/** Every consent or agreement box in the application, with the element it belongs to. */
export function findConsentBoxes(root: ParentNode): Array<{ box: ConsentBox; element: HTMLElement }> {
  const out: Array<{ box: ConsentBox; element: HTMLElement }> = [];
  const seen = new Set<HTMLElement>();
  for (const el of deepQueryAll<HTMLElement>(root, "input[type='checkbox'], [role='checkbox']")) {
    // A custom box wrapping a real one is the same box.
    const element = el.getAttribute("role") === "checkbox" && el.querySelector("input[type='checkbox']") ? el.querySelector<HTMLElement>("input[type='checkbox']")! : el;
    if (seen.has(element) || hidden(element)) continue;
    seen.add(element);
    const label = consentLabelOf(element) || consentLabelOf(el);
    if (!isConsentLabel(label)) continue;
    const { tag, optOut } = classifyConsent(label);
    out.push({
      element,
      box: { id: `c${out.length}-${fingerprint(label)}`, label, tag, required: isRequired(element, label), checked: isChecked(element), optOut },
    });
  }
  return out;
}

export function listConsentBoxes(root: ParentNode, frameUrl: string): ConsentList {
  return { boxes: reviewOrder(findConsentBoxes(root).map((x) => x.box)), frameUrl };
}

/** Tick one box the user chose. Refused when the list is out of date: the box is gone, moved, or its label changed. */
export function tickConsentBox(root: ParentNode, id: string, label: string): TickResult {
  const found = findConsentBoxes(root).find((x) => x.box.id === id);
  if (!found) {
    return { ok: false, reason: "This box moved or its text changed since the list was made. Nothing was ticked. Refresh the list and read it again." };
  }
  if (found.box.label !== label) {
    return { ok: false, reason: "The text of this box changed since you read it. Nothing was ticked. Read the new text first." };
  }
  const { element } = found;
  if ((element as HTMLInputElement).disabled || element.getAttribute("aria-disabled") === "true") {
    return { ok: false, reason: "The page does not allow this box to be ticked right now.", box: found.box };
  }
  if (isChecked(element)) return { ok: true, already: true, box: found.box };
  element.click(); // one real click on one box: the page's own scripts see it like the user's click
  const checked = isChecked(element);
  return checked
    ? { ok: true, box: { ...found.box, checked } }
    : { ok: false, reason: "The box did not tick. Tick it on the page yourself.", box: found.box };
}

/** The element of one listed box (to show it on the page). */
export function consentElement(root: ParentNode, id: string): HTMLElement | undefined {
  return findConsentBoxes(root).find((x) => x.box.id === id)?.element;
}

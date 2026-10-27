/** Phone numbers on forms that ask for the country code separately: a "Country code" picker next to the number box
 * takes "+91", the box takes the national number. Typing the full "+91 90000 00000" there doubles the code, and many
 * forms reject it. Phone widgets that read "+91…" themselves (intl-tel-input, react-phone-input) get the full number. */

import { DROPDOWN } from "./extract";
import { normalize } from "../shared/text";

const DIAL_CODE_WORDS = /country ?code|dial(l?ing)? ?code|calling code|phone code|\bisd\b|country prefix|vorwahl|indicatif|prefijo|c[oó]digo (de )?pa[ií]s|prefisso/i;
const DIAL_OPTION = /\+\s?\d{1,4}\b/;

/** A box that holds only a dialling code ("+1", "+91 "), as phone widgets pre-fill it: not the user's number yet. */
export const JUST_A_DIAL_CODE = /^\s*\+?\d{1,4}\s*$/;

/** Two-digit country codes; the rest are one digit (1, 7) or three. Codes never start with another code, so the
 * length can be read off the first digits. */
const TWO_DIGIT = new Set("20 27 30 31 32 33 34 36 39 40 41 43 44 45 46 47 48 49 51 52 53 54 55 56 57 58 60 61 62 63 64 65 66 81 82 84 86 90 91 92 93 94 95 98".split(" "));

/** "+91 90000 00000" or "+919000000000" → code 91 and the national number. Numbers without a "+" are left as they are. */
export function splitPhone(phone: string): { code?: string; national: string } {
  const text = phone.trim();
  if (!text.startsWith("+")) return { national: text };
  const digits = text.slice(1).replace(/^\s+/, "");
  const length = /^[17]/.test(digits) ? 1 : TWO_DIGIT.has(digits.slice(0, 2)) ? 2 : 3;
  const code = digits.slice(0, length);
  if (!/^\d+$/.test(code)) return { national: text };
  return { code, national: digits.slice(length).replace(/^[\s.-]+/, "").trim() };
}

function describes(el: Element): string {
  const own = [el.getAttribute("aria-label"), el.getAttribute("name"), el.id, el.getAttribute("title"), el.getAttribute("placeholder")];
  const labels = el instanceof HTMLSelectElement || el instanceof HTMLInputElement ? Array.from(el.labels ?? [], (l) => l.textContent) : [];
  return [...own, ...labels].join(" ");
}

/** A country-code picker: named so, or a list (or a button) of "+91"-style codes. */
export function isDialCodePicker(el: Element): boolean {
  if (DIAL_CODE_WORDS.test(describes(el))) return true;
  if (el instanceof HTMLSelectElement) {
    const real = Array.from(el.options).filter((o) => o.value && o.text.trim());
    const coded = real.filter((o) => DIAL_OPTION.test(o.text)).length;
    return coded >= 2 && coded >= real.length * 0.8;
  }
  // A custom picker showing the selected code ("🇮🇳 +91").
  return el.matches(DROPDOWN) && DIAL_OPTION.test(el.textContent ?? "") && (el.textContent ?? "").trim().length <= 24;
}

const CONTROLS = `input:not([type='hidden']), select, textarea, ${DROPDOWN}`;
const textBox = (el: Element) => el instanceof HTMLInputElement && ["text", "tel", "number", ""].includes(el.type);

/** The small group of controls an element belongs to (a phone row: picker + box), or none. */
function groupOf(el: Element, fits: (controls: Element[]) => Element | undefined): Element | undefined {
  let group: Element | null = el.parentElement;
  for (let depth = 0; group && depth < 4; depth++, group = group.parentElement) {
    const controls = Array.from(group.querySelectorAll(CONTROLS));
    if (controls.length > 4) return undefined; // reached the rest of the form
    const found = fits(controls);
    if (found) return found;
  }
  return undefined;
}

/** The country-code picker right before this phone box, if it has its own. */
export function dialCodePickerFor(box: Element): Element | undefined {
  if (box.closest(".iti, .intl-tel-input, .react-tel-input, .PhoneInput")) return undefined; // these widgets parse "+91…"
  return groupOf(box, (controls) => controls.slice(0, controls.indexOf(box)).reverse().find(isDialCodePicker));
}

/** The phone box right after this country-code picker. */
export function phoneBoxFor(picker: Element): HTMLInputElement | undefined {
  if (picker.closest(".iti, .intl-tel-input, .react-tel-input, .PhoneInput")) return undefined;
  return groupOf(picker, (controls) => controls.slice(controls.indexOf(picker) + 1).find(textBox)) as HTMLInputElement | undefined;
}

const codeIn = (text: string) => text.match(/\+\s?(\d{1,4})(?!\d)/)?.[1];

/** The code a picker shows now ("91"), if it shows one. */
export function selectedCode(picker: Element): string | undefined {
  if (picker instanceof HTMLSelectElement) {
    const option = picker.selectedOptions[0];
    return option?.value ? codeIn(option.text) ?? codeIn(option.value) : undefined;
  }
  return codeIn(picker.textContent ?? "");
}

/** The option for the user's code. Several countries share some codes (+1 USA and Canada, +7, +44…): the user's own
 * country first. Lists of countries without codes: the user's country. */
export function codeOptionFor(select: HTMLSelectElement, code: string, country: string): HTMLOptionElement | undefined {
  const options = Array.from(select.options).filter((o) => o.value);
  const named = (o: HTMLOptionElement) => !!country && normalize(o.text).includes(normalize(country));
  const coded = options.filter((o) => (codeIn(o.text) ?? codeIn(o.value)) === code);
  return coded.find(named) ?? coded[0] ?? (options.some((o) => codeIn(o.text)) ? undefined : options.find(named));
}

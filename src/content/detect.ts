/** Page-state detection: CAPTCHAs, submission confirmation and validation errors. */

const CAPTCHA_SELECTORS = [
  "iframe[src*='recaptcha'][src*='bframe']", // the visible reCAPTCHA challenge window
  "iframe[src*='hcaptcha.com']",
  "iframe[src*='challenges.cloudflare.com']",
  ".g-recaptcha:not([data-size='invisible'])",
  ".h-captcha",
  ".cf-turnstile",
  // Robot checks shown instead of the page (seen on real application sites).
  "iframe[src*='captcha-delivery.com']", // DataDome
  "#px-captcha, iframe[src*='px-cloud.net'], iframe[src*='perimeterx']", // PerimeterX / HUMAN
  "iframe[src*='arkoselabs'], iframe[src*='funcaptcha']", // Arkose Labs
  "#captcha-container iframe, awswaf-captcha, iframe[src*='awswaf']", // AWS WAF
  ".geetest_holder, .geetest_panel", // GeeTest
];

export function hasCaptcha(doc: Document): boolean {
  return CAPTCHA_SELECTORS.some((selector) => {
    const el = doc.querySelector<HTMLElement>(selector);
    if (!el) return false;
    const style = doc.defaultView?.getComputedStyle(el);
    return !(style && (style.display === "none" || style.visibility === "hidden"));
  });
}

/** Words a site shows when it suspects automation or is limiting requests. Matched only where such a message lives (the
 * title, headings, alerts) or on a short page that is nothing but that message: a job description that mentions
 * "robotics", "rate limiting" or "access to benefits" is not a challenge. */
const CHALLENGE_TEXT: Array<[RegExp, string]> = [
  [/\bunusual (activity|traffic)\b/i, "unusual activity"],
  [/\btoo many requests\b/i, "too many requests"],
  [/\bare you (a )?(robot|human)\b/i, "are you a robot"],
  [/\b(verify|confirm|prove) (that )?you( a|’|')?re (a )?human\b|\bverify you are (a )?human\b|\b(i am|i'm|you are|you're) not a robot\b/i, "verify you are human"],
  [/\brate[- ]limit(ed)?\b/i, "rate limit"],
  [/\baccess (is )?denied\b/i, "access denied"],
  [/^\s*(error\s*)?429\b|\b(http|error|status)\s*429\b/i, "HTTP 429"],
  [/\bchecking (if the site connection is secure|your browser)\b/i, "browser check"],
];

/** A page that is only a message ("Access denied", "429 Too Many Requests") is short. */
const SHORT_PAGE_CHARS = 1500;

export interface Challenge {
  kind: "captcha" | "text" | "http429";
  detail: string;
}

function challengeIn(text: string): string | undefined {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return undefined;
  return CHALLENGE_TEXT.find(([pattern]) => pattern.test(clean))?.[1];
}

/** A CAPTCHA that is part of an application form (Lever puts an hCaptcha inside every application form, checked when
 * the user presses Submit): inside a form with fields to fill. Not a robot check: ApplyAgent fills the fields and leaves
 * the CAPTCHA and Submit to the user, as always. Round 12: treated as a robot check, so nothing was filled on Lever. */
function captchaIsPartOfForm(doc: Document): boolean {
  const found = CAPTCHA_SELECTORS.map((s) => doc.querySelector<HTMLElement>(s)).filter((el): el is HTMLElement => !!el);
  if (!found.length) return false;
  // The visible challenge window (reCAPTCHA's "bframe") or a block-page checker is never part of a form.
  if (found.some((el) => /bframe|captcha-delivery|px-cloud|perimeterx|arkoselabs|funcaptcha|awswaf|challenges\.cloudflare/i.test(el.getAttribute("src") ?? "") || el.id === "px-captcha")) return false;
  return found.every((el) => {
    const form = el.closest("form");
    if (!form) return false;
    const fields = Array.from(form.querySelectorAll<HTMLElement>("input:not([type=hidden]):not([type=submit]):not([type=button]), textarea, select"));
    return fields.length >= 3;
  });
}

/** A robot check, rate-limit or block page. ApplyAgent stops at these; it never tries to solve or get past them. */
export function detectChallenge(doc: Document): Challenge | null {
  if (hasCaptcha(doc) && !captchaIsPartOfForm(doc)) return { kind: "captcha", detail: "a CAPTCHA" };
  const navigation = (doc.defaultView?.performance?.getEntriesByType?.("navigation")?.[0] as { responseStatus?: number } | undefined);
  if (navigation?.responseStatus === 429) return { kind: "http429", detail: "HTTP 429 (too many requests)" };
  const places = [doc.title, ...Array.from(doc.querySelectorAll<HTMLElement>("h1, h2, h3, [role='alert'], [role='alertdialog'], .error-title, #challenge-title"),
    (el) => el.textContent ?? "")];
  for (const text of places) {
    const found = challengeIn(text);
    if (found) return { kind: "text", detail: `"${found}"` };
  }
  const body = (doc.body?.textContent ?? "").replace(/\s+/g, " ").trim();
  if (body.length <= SHORT_PAGE_CHARS) {
    const found = challengeIn(body);
    if (found) return { kind: "text", detail: `"${found}"` };
  }
  return null;
}

// "Thank you for your interest in X" is NOT here on purpose: many application forms open with it.
const CONFIRMATION_TEXT = [
  /thank(s| you) for (applying|your application|submitting)/i,
  /(your )?application (has been|was) (submitted|received|sent)/i,
  /we('ve| have) received your application/i,
  /application (submitted|received|complete)/i,
];
const CONFIRMATION_URL = /confirmation|thank[-_]?you|application[-_]?submitted|\/submitted\b/i;

export interface Confirmation {
  confirmed: boolean;
  text?: string;
}

/** "Applied" is only ever claimed with an explicit confirmation from the employer's site. */
export function detectConfirmation(doc: Document): Confirmation {
  const candidates = Array.from(doc.querySelectorAll<HTMLElement>("h1, h2, h3, [role='alert'], [role='status'], main p, .confirmation, [class*='confirm'], [class*='success']"));
  for (const el of candidates) {
    const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
    if (text && CONFIRMATION_TEXT.some((p) => p.test(text))) return { confirmed: true, text: text.slice(0, 300) };
  }
  const url = doc.location?.href ?? "";
  if (CONFIRMATION_URL.test(url)) {
    const body = (doc.body?.textContent ?? "").replace(/\s+/g, " ");
    const match = CONFIRMATION_TEXT.map((p) => body.match(p)).find(Boolean);
    if (match) return { confirmed: true, text: match[0] };
  }
  return { confirmed: false };
}

export function visibleErrors(root: ParentNode): string[] {
  const errors = new Set<string>();
  root.querySelectorAll<HTMLElement>("[aria-invalid='true']").forEach((el) => {
    const message = el.getAttribute("aria-errormessage") ?? el.getAttribute("aria-describedby");
    const text = message
      ? message.split(/\s+/).map((id) => el.ownerDocument.getElementById(id)?.textContent ?? "").join(" ")
      : "";
    errors.add((text || `Invalid: ${el.getAttribute("name") ?? el.id}`).replace(/\s+/g, " ").trim());
  });
  root.querySelectorAll<HTMLElement>("[role='alert'], .error, .field-error, [class*='error-message']").forEach((el) => {
    const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
    if (text && !/^(error)?$/i.test(text) && !CONFIRMATION_TEXT.some((p) => p.test(text))) errors.add(text.slice(0, 200));
  });
  return Array.from(errors).filter(Boolean);
}

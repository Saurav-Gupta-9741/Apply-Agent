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

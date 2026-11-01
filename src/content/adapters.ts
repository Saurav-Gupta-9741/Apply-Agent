/** Per-platform knowledge: where the application form is, which button submits it, and the job title.
 * A generic adapter covers any other site; platform adapters only add precision. */

import { deepQueryAll } from "./dom";

export interface Adapter {
  platform: string;
  matches(url: URL, doc: Document): boolean;
  formRoot(doc: Document): HTMLElement | null;
  /** The form's main button: the final submit, or "Next/Continue" on a multi-step application. */
  action(root: HTMLElement): FormAction | null;
  jobTitle(doc: Document): string;
}

export interface FormAction {
  kind: "submit" | "next";
  button: HTMLElement;
}

function text(el: Element | null | undefined): string {
  return (el?.textContent ?? "").replace(/\s+/g, " ").trim();
}

function buttonText(el: HTMLElement): string {
  const value = el instanceof HTMLInputElement ? el.value : text(el);
  return (value || el.getAttribute("aria-label") || el.getAttribute("title") || "").replace(/\s+/g, " ").trim();
}

// English first, then German, French, Spanish, Portuguese, Italian and Dutch.
export const SUBMIT_TEXT = /submit|send( my)? application|^apply( now)?$|^apply for (this )?(job|position|role)$|complete (my )?application|^finish|^done$|absenden|bewerbung (senden|abschicken)|^envoyer|soumettre|postuler|^enviar|candidatar|^inviare|^invia|^verzenden|solliciteren/i;
export const STEP_TEXT = /^(next|continue|save (and|&) (continue|next)|next step|proceed|review( (my|your)? ?application)?|weiter|suivant|continuer|siguiente|continuar|pr[oó]ximo|avanti|volgende|doorgaan)\b/i;
/** Buttons that must never be pressed: other sign-ins, re-parsing the resume, leaving or abandoning the form. */
/** "google" is excluded on non-Google-Forms pages; on Google Forms itself, the Submit button text is "Submit" (safe). */
export const NEVER_PRESS = /linked ?in|indeed|sign in with google|google sign.?in|clear form|clear selection|facebook|apple|github|autofill|auto-fill|import|parse|upload|attach|draft|^back|previous|cancel|withdraw|delete|remove|sign ?in|log ?in|sign ?up|register|create account|zur[uü]ck|retour|pr[ée]c[ée]dent|atr[aá]s|anterior|indietro|terug|annuler|abbrechen|cancelar/i;

function visible(el: HTMLElement): boolean {
  if (el.closest("[hidden], [aria-hidden='true']")) return false;
  const style = el.ownerDocument.defaultView?.getComputedStyle(el);
  return !style || (style.display !== "none" && style.visibility !== "hidden");
}

/** The main action, by what its label says (a "Next" button is often type="submit" underneath):
 * a final-submit label wins, then a step label, then any other submit-type button. Never a NEVER_PRESS button. */
export function primaryAction(root: HTMLElement, submitLabel: RegExp = SUBMIT_TEXT): FormAction | null {
  const buttons = deepQueryAll<HTMLElement>(root, "button, [role='button'], input[type='submit'], input[type='button']")
    .filter((b) => visible(b) && !(b as HTMLButtonElement).disabled && !NEVER_PRESS.test(buttonText(b)));
  const submit = buttons.find((b) => submitLabel.test(buttonText(b)));
  if (submit) return { kind: "submit", button: submit };
  const step = buttons.find((b) => STEP_TEXT.test(buttonText(b)));
  if (step) return { kind: "next", button: step };
  const typed = buttons.find((b) => b.matches("button[type='submit'], input[type='submit']") && buttonText(b));
  return typed ? { kind: "submit", button: typed } : null;
}

function countFields(el: Element): number {
  return deepQueryAll(el, "input:not([type='hidden']), textarea, select").length;
}

const MIN_APPLICATION_FIELDS = 3;

/** The application, not just the biggest form: Ashby puts a demographic survey (dozens of tick boxes) next to the
 * application form, and it must not win. An email box or a file upload marks the application. */
function applicationScore(el: Element): number {
  const has = (selector: string) => deepQueryAll(el, selector).length > 0;
  return countFields(el)
    + (has("input[type='email'], input[name*='email' i], input[id*='email' i], input[autocomplete='email']") ? 100 : 0)
    + (has("input[type='file']") ? 50 : 0);
}

function mostFields(els: HTMLElement[]): HTMLElement | undefined {
  return els.sort((a, b) => applicationScore(b) - applicationScore(a))[0];
}

/** Where the application lives. An element carrying the platform's own application-form marker counts with any
 * number of fields; anything else is a guess and needs at least 3 fields, so a small "autofill from resume" box
 * never wins. Pages that render the application without any <form> (e.g. Ashby) fall back to the page body. */
function bestRoot(doc: Document, guessSelector: string, markerSelector?: string): HTMLElement | null {
  const marked = markerSelector ? mostFields(Array.from(doc.querySelectorAll<HTMLElement>(markerSelector))) : undefined;
  if (marked && countFields(marked) > 0) return marked;
  const guesses = Array.from(doc.querySelectorAll<HTMLElement>(guessSelector));
  const guess = mostFields([...guesses]);
  if (guess && countFields(guess) >= MIN_APPLICATION_FIELDS) return guess;
  // One step of a multi-step application often has only one or two fields: it counts when its own button
  // clearly says "Next" or "Submit application" (a search box or newsletter sign-up never does).
  // A "Review" step may have no field at all, only its Submit button (the agent never starts on such a page).
  const step = guesses.find((g) => countFields(g) > 0 && isStepOrFinal(g)) ?? guesses.find((g) => isStepOrFinal(g));
  if (step) return step;
  return doc.body && countFields(doc.body) >= MIN_APPLICATION_FIELDS ? doc.body : null;
}

function isStepOrFinal(root: HTMLElement): boolean {
  const action = primaryAction(root);
  return !!action && (action.kind === "next" || SUBMIT_TEXT.test(buttonText(action.button)));
}

const greenhouse: Adapter = {
  platform: "greenhouse",
  matches: (url, doc) =>
    /(^|\.)greenhouse\.io$/.test(url.hostname) || !!doc.querySelector("#application-form, form#application_form"),
  formRoot: (doc) => bestRoot(doc, "form", "#application-form, form#application_form, form[action*='greenhouse']"),
  action: (root) => primaryAction(root),
  jobTitle: (doc) => text(doc.querySelector(".job__title h1, .app-title, h1")),
};

const lever: Adapter = {
  platform: "lever",
  matches: (url) => /(^|\.)lever\.co$/.test(url.hostname),
  formRoot: (doc) => bestRoot(doc, "form", "form#application-form, form[action*='lever'], .application-form form"),
  action: (root) => primaryAction(root),
  jobTitle: (doc) => text(doc.querySelector(".posting-headline h2, h2, h1")),
};

const ashby: Adapter = {
  platform: "ashby",
  matches: (url) => /(^|\.)ashbyhq\.com$/.test(url.hostname),
  formRoot: (doc) => bestRoot(doc, "form", ".ashby-application-form-container, [class*='application-form-container']"),
  action: (root) => primaryAction(root),
  jobTitle: (doc) => text(doc.querySelector("h1")),
};

/** Google Forms: forms at docs.google.com/forms/… use a single <form action="…/formResponse">. */
export function isGoogleForms(url: URL | string): boolean {
  try {
    const u = typeof url === "string" ? new URL(url) : url;
    return u.hostname === "docs.google.com" && /\/forms\//.test(u.pathname);
  } catch { return false; }
}

const googleForms: Adapter = {
  platform: "google_forms",
  matches: (url) => isGoogleForms(url),
  formRoot: (doc) => {
    const form = doc.querySelector<HTMLElement>("form[action*='formResponse']");
    if (form) return form;
    return doc.querySelector<HTMLElement>("[role='list']")?.closest<HTMLElement>("form") ?? bestRoot(doc, "form");
  },
  action: (root) => primaryAction(root),
  jobTitle: (doc) => {
    const title = doc.querySelector("[role='heading'][aria-level='1']") ?? doc.querySelector("h1");
    const raw = (title?.textContent ?? doc.title ?? "").replace(/\s+/g, " ").trim();
    return raw.replace(/\s*-\s*Google Forms\s*$/i, "").trim();
  },
};

const workday: Adapter = {
  platform: "workday",
  matches: (url, doc) =>
    /(^|\.)(wd\d+\.)?myworkdayjobs\.com$|(^|\.)(wd\d+\.)?workday\.com$/.test(url.hostname)
    || !!doc.querySelector("[data-automation-id='jobApplicationRoot'], [data-automation-id='applicationForm'], [data-automation-id='workdayApplication']"),
  formRoot: (doc) =>
    doc.querySelector<HTMLElement>("[data-automation-id='jobApplicationRoot'], [data-automation-id='applicationForm'], [data-automation-id='workdayApplication']")
    ?? bestRoot(doc, "form", "[data-automation-id*='application' i], [data-automation-id*='jobApplication' i]"),
  action: (root) => {
    const nextBtn = root.querySelector<HTMLElement>("[data-automation-id='bottom-navigation-next-button'], [data-automation-id='page-footer-save-and-continue']");
    if (nextBtn && visible(nextBtn) && !(nextBtn as HTMLButtonElement).disabled) return { kind: "next", button: nextBtn };
    const submitBtn = root.querySelector<HTMLElement>("[data-automation-id='page-footer-submit'], button[data-automation-id='submit-button']");
    if (submitBtn && visible(submitBtn) && !(submitBtn as HTMLButtonElement).disabled) return { kind: "submit", button: submitBtn };
    return primaryAction(root);
  },
  jobTitle: (doc) => text(doc.querySelector("[data-automation-id='jobPostingHeader'], [data-automation-id='jobTitle'], h1")) || doc.title,
};

const smartRecruiters: Adapter = {
  platform: "smartrecruiters",
  matches: (url, doc) => /(^|\.)smartrecruiters\.com$/.test(url.hostname) || !!doc.querySelector("spl-job-application, form[action*='smartrecruiters']"),
  formRoot: (doc) => doc.querySelector<HTMLElement>("spl-job-application, form#application-form") ?? bestRoot(doc, "form"),
  action: (root) => primaryAction(root),
  jobTitle: (doc) => text(doc.querySelector("h1.job-title, .job-title, h1")) || doc.title,
};

const successFactors: Adapter = {
  platform: "successfactors",
  matches: (url, doc) => /(^|\.)successfactors\.(com|eu)$/.test(url.hostname) || !!doc.querySelector("#careerCenterApp, form[action*='successfactors']"),
  formRoot: (doc) => doc.querySelector<HTMLElement>("#careerCenterApp, form") ?? bestRoot(doc, "form"),
  action: (root) => primaryAction(root),
  jobTitle: (doc) => text(doc.querySelector(".sapMTitle, .jobTitle, h1")) || doc.title,
};

const icims: Adapter = {
  platform: "icims",
  matches: (url, doc) => /(^|\.)icims\.com$/.test(url.hostname) || !!doc.querySelector("iframe#icims_iframe, iframe[title*='iCIMS' i], form[action*='icims']"),
  formRoot: (doc) => {
    const iframe = doc.querySelector<HTMLIFrameElement>("iframe#icims_iframe, iframe[title*='iCIMS' i]");
    try {
      if (iframe?.contentDocument?.body && countFields(iframe.contentDocument.body) > 0) {
        return bestRoot(iframe.contentDocument, "form") ?? iframe.contentDocument.body;
      }
    } catch {}
    return bestRoot(doc, "form");
  },
  action: (root) => primaryAction(root),
  jobTitle: (doc) => text(doc.querySelector(".iCIMS_Header h1, .iCIMS_JobTitle, h1")) || doc.title,
};

const taleo: Adapter = {
  platform: "taleo",
  matches: (url, doc) => /(^|\.)taleo\.net$/.test(url.hostname) || !!doc.querySelector("form[name='dlgfrm'], #requisitionDescriptionInterface"),
  formRoot: (doc) => doc.querySelector<HTMLElement>("form[name='dlgfrm'], form") ?? bestRoot(doc, "form"),
  action: (root) => primaryAction(root),
  jobTitle: (doc) => text(doc.querySelector(".mastertable h1, .titlepage, h1")) || doc.title,
};

const oracleCloud: Adapter = {
  platform: "oraclecloud",
  matches: (url, doc) => /(^|\.)oraclecloud\.com$/.test(url.hostname) || !!doc.querySelector("oj-form-layout, [data-oracle-app]"),
  formRoot: (doc) => doc.querySelector<HTMLElement>("oj-form-layout, form") ?? bestRoot(doc, "form"),
  action: (root) => primaryAction(root),
  jobTitle: (doc) => text(doc.querySelector("oj-heading, h1")) || doc.title,
};

const darwinbox: Adapter = {
  platform: "darwinbox",
  matches: (url, doc) => /(^|\.)darwinbox\.(in|com)$/.test(url.hostname) || !!doc.querySelector(".candidate-application-form, #candidate_form, form[action*='darwinbox']"),
  formRoot: (doc) => doc.querySelector<HTMLElement>(".candidate-application-form, #candidate_form, form") ?? bestRoot(doc, "form"),
  action: (root) => primaryAction(root),
  jobTitle: (doc) => text(doc.querySelector(".job-title, h1")) || doc.title,
};

const keka: Adapter = {
  platform: "keka",
  matches: (url, doc) => /(^|\.)keka\.com$/.test(url.hostname) || !!doc.querySelector(".keka-application-form, [data-keka-form], form[action*='keka']"),
  formRoot: (doc) => doc.querySelector<HTMLElement>(".keka-application-form, [data-keka-form], form") ?? bestRoot(doc, "form"),
  action: (root) => primaryAction(root),
  jobTitle: (doc) => text(doc.querySelector(".job-title, h1")) || doc.title,
};

const zohoRecruit: Adapter = {
  platform: "zohorecruit",
  matches: (url, doc) => /(^|\.)zohorecruit\.(com|in|eu)$/.test(url.hostname) || !!doc.querySelector("#zp_candidate_form, .zp_candidate_form, form[action*='zohorecruit']"),
  formRoot: (doc) => doc.querySelector<HTMLElement>("#zp_candidate_form, .zp_candidate_form, form") ?? bestRoot(doc, "form"),
  action: (root) => primaryAction(root),
  jobTitle: (doc) => text(doc.querySelector(".rec-job-title, h1")) || doc.title,
};

const freshteam: Adapter = {
  platform: "freshteam",
  matches: (url, doc) => /(^|\.)freshteam\.com$/.test(url.hostname) || !!doc.querySelector("#ft-career-portal, .freshteam-application-form, form[action*='freshteam']"),
  formRoot: (doc) => doc.querySelector<HTMLElement>("#ft-career-portal, .freshteam-application-form, form") ?? bestRoot(doc, "form"),
  action: (root) => primaryAction(root),
  jobTitle: (doc) => text(doc.querySelector(".posting-header h1, h1")) || doc.title,
};

const jazzhr: Adapter = {
  platform: "jazzhr",
  matches: (url, doc) => /(^|\.)(applytojob\.com|jazzhr\.com)$/.test(url.hostname) || !!doc.querySelector("#resumator-form, .resumator-job, form[action*='applytojob']"),
  formRoot: (doc) => doc.querySelector<HTMLElement>("#resumator-form, form") ?? bestRoot(doc, "form"),
  action: (root) => primaryAction(root),
  jobTitle: (doc) => text(doc.querySelector(".job-title, h1")) || doc.title,
};

const recruitee: Adapter = {
  platform: "recruitee",
  matches: (url, doc) => /(^|\.)recruitee\.com$/.test(url.hostname) || !!doc.querySelector("#new_candidate, .careers-form, form[action*='recruitee']"),
  formRoot: (doc) => doc.querySelector<HTMLElement>("#new_candidate, .careers-form, form") ?? bestRoot(doc, "form"),
  action: (root) => primaryAction(root),
  jobTitle: (doc) => text(doc.querySelector("h1, .job-title")) || doc.title,
};

/** Any other site: the form with the most fields, if it looks like an application. */
export const generic: Adapter = {
  platform: "generic",
  matches: () => true,
  formRoot: (doc) => bestRoot(doc, "form"),
  action: (root) => primaryAction(root),
  jobTitle: (doc) => text(doc.querySelector("h1")) || doc.title,
};

const ADAPTERS = [
  greenhouse, lever, ashby, workday, smartRecruiters, successFactors, icims,
  taleo, oracleCloud, darwinbox, keka, zohoRecruit, freshteam, jazzhr, recruitee,
  googleForms, generic,
];

export function pickAdapter(doc: Document, href: string = doc.location?.href ?? "about:blank"): Adapter {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    url = new URL("about:blank");
  }
  return ADAPTERS.find((a) => a.matches(url, doc)) ?? generic;
}

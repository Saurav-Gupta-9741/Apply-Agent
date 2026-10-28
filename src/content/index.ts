/** Content script: runs inside the job page (and inside embedded application iframes). */

import type { Detection, Message, RunReport } from "../shared/types";
import { loadAnswers, loadApplications, loadProfile, loadSettings } from "../shared/storage";
import { generic, pickAdapter } from "./adapters";
import { highlightField, runOnce, scanForm, submitForm, tickConsentCheckboxes } from "./agent";
import { detectConfirmation, hasCaptcha } from "./detect";
import { findApplyControl, sensePage } from "./sense";
import { isApplicationPage } from "./target";
import { HANDS_OFF_MESSAGE, platformFor, shouldDetect } from "../shared/platforms";

declare global {
  interface Window {
    __applyAgentLoaded?: boolean;
  }
}

function formRoot(): HTMLElement | null {
  return pickAdapter(document).formRoot(document) ?? generic.formRoot(document);
}

function hasApplicationForm(): boolean {
  return !!formRoot() || detectConfirmation(document).confirmed;
}

/** This frame's platform. A form embedded in a hands-off platform's page (e.g. an ATS frame inside LinkedIn) is
 * hands-off too: Chrome tells a frame the origins of the pages around it. */
/** The local question model, asked through the background worker (it runs in the extension's offscreen page). */
const understand = (texts: string[]) =>
  chrome.runtime.sendMessage({ type: "UNDERSTAND", texts } satisfies Message).catch(() => null) as Promise<Array<{ intent: string; confidence: number } | null> | null>;

const platform = ((): ReturnType<typeof platformFor> => {
  const own = platformFor(location.href);
  if (own.policy === "hands_off") return own;
  for (const origin of Array.from(location.ancestorOrigins ?? [])) {
    const around = platformFor(`${origin}/`);
    if (around.policy === "hands_off") return around;
  }
  return own;
})();

/** Hands-off platforms get a clear refusal instead of any reading or typing. */
function handsOffReport(): RunReport {
  return {
    status: "not_a_form", platform: platform.name, url: location.href, jobTitle: document.title, fields: [], captcha: false,
    errors: [HANDS_OFF_MESSAGE(platform.name)],
  };
}

// --- silent detection (read-only) --------------------------------------------------------------------
const MAX_RECHECKS = 12;
const RECHECK_DELAY_MS = 1200;
let lastSignature = "";
let rechecks = 0;
let timer: ReturnType<typeof setTimeout> | undefined;

async function detect(): Promise<void> {
  const sense = sensePage(document, location.href);
  const detection: Detection = {
    kind: sense.kind, platform: sense.platform, jobTitle: sense.jobTitle, hasApplyButton: sense.hasApplyButton, url: location.href,
  };
  if (sense.kind === "application_form") {
    // What the agent WOULD do. Nothing is typed or uploaded.
    const scan = await scanForm(document, { profile: await loadProfile(), answers: await loadAnswers(), applications: await loadApplications(), understand });
    detection.total = scan.fields.length;
    detection.fill = scan.fields.filter((f) => f.status === "filled").length;
    detection.ask = scan.fields.filter((f) => f.status === "needs_user").length;
  }
  // Say nothing about pages that are not about jobs, but do report a form that went away (badge goes out).
  if (sense.kind === "other" && !lastSignature) return;
  // The address is part of it: single-page sites change pages without reloading, and the badge is cleared then.
  const signature = JSON.stringify([location.href, detection.kind, detection.fill, detection.ask, detection.total]);
  if (signature === lastSignature) return;
  lastSignature = signature;
  chrome.runtime.sendMessage({ type: "DETECTED", detection } satisfies Message).catch(() => undefined);
}

let checkedHref = location.href;

/** Throttled, not debounced: pages that never stop changing (tickers, carousels) still get checked. Capped per
 * address so a busy page costs a dozen reads at most; a single-page site moving to a new address starts again. */
function scheduleDetect(): void {
  if (location.href !== checkedHref) {
    checkedHref = location.href;
    rechecks = 0;
  }
  if (timer !== undefined || rechecks >= MAX_RECHECKS) return;
  timer = setTimeout(() => {
    timer = undefined;
    rechecks++;
    void detect().catch(() => undefined);
  }, RECHECK_DELAY_MS);
}

async function startSilentDetection(): Promise<void> {
  if (platform.policy === "hands_off") return;
  if (!shouldDetect((await loadSettings()).detection, location.href)) return;
  await detect().catch(() => undefined);
  // Many sites show the form only after "Apply" is clicked: re-check quietly when the page changes.
  new MutationObserver(() => scheduleDetect()).observe(document.documentElement, { childList: true, subtree: true });
}

/** One run at a time per page: a second Fill, Save-and-refill or Submit while one is under way would type into the
 * same fields twice, or press Submit twice. */
let busy = false;

function plainReport(status: RunReport["status"], error: string): RunReport {
  const sense = sensePage(document, location.href);
  return { status, platform: sense.platform, url: location.href, jobTitle: sense.jobTitle, fields: [], captcha: false, errors: error ? [error] : [] };
}

// Guard against double injection (registered detector + on-demand injection).
if (!window.__applyAgentLoaded) {
  window.__applyAgentLoaded = true;
  // Each frame rates its own page, so the extension can send its messages to the one frame holding the application
  // (never to a search box or newsletter form on the page around an embedded application). See shared/frames.ts.
  (globalThis as { __applyAgentRate?: () => unknown }).__applyAgentRate = () => {
    const sense = sensePage(document, location.href);
    return { score: sense.score, kind: sense.kind, form: !!formRoot(), handsOff: platform.policy === "hands_off" };
  };

  chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse: (r: unknown) => void) => {
    const acting = ["RUN", "SUBMIT", "SCAN", "HIGHLIGHT", "OPEN_APPLICATION", "TICK_CONSENT"].includes(message.type);
    if (acting && platform.policy === "hands_off") {
      // Answer once: from the top frame, or from the frame that holds the form when the page around it is not ours.
      if (window !== window.top && !formRoot()) return false;
      sendResponse(handsOffReport());
      return false;
    }
    if (message.type === "PING") {
      // The panel asks which frame holds an application form (it may sit inside a page that is not allowed).
      if (!formRoot()) return false;
      sendResponse({ form: true, url: location.href, platform: platform.name, handsOff: platform.policy === "hands_off" });
      return false;
    }
    if (message.type === "OPEN_APPLICATION") {
      const control = findApplyControl(document);
      if (!control) return false;
      // A real link is opened by the panel (in this tab): a scripted click on a new-window link would be blocked as a
      // pop-up, because the user clicked in the panel, not on the page. Buttons are clicked: they open forms in place.
      const href = control instanceof HTMLAnchorElement ? control.href : "";
      if (/^https?:/i.test(href) && !/#$/.test(href)) sendResponse({ href });
      else {
        control.click();
        sendResponse({ clicked: true });
      }
      return false;
    }
    // Every frame receives the message; only the frame holding the form answers.
    if (message.type === "TICK_CONSENT") {
      if (!formRoot()) return false;
      const count = tickConsentCheckboxes(document);
      sendResponse({ count });
      return false;
    }
    if (message.type === "HIGHLIGHT") {
      if (!formRoot()) return false;
      sendResponse(highlightField(document, message.label, message.key));
      return false;
    }
    if (message.type === "SCAN") {
      if (!formRoot()) return false;
      if (!isApplicationPage(document)) {
        sendResponse(plainReport("not_a_form", "")); // the job description: the panel opens the application
        return false;
      }
      (async () => {
        try {
          sendResponse(await scanForm(document, { profile: await loadProfile(), answers: await loadAnswers(), applications: await loadApplications(), understand }));
        } catch (error) {
          sendResponse(plainReport("needs_user", `Could not read this form: ${String(error)}`));
        }
      })();
      return true;
    }
    if ((message.type === "RUN" || message.type === "SUBMIT") && !hasApplicationForm() && window === window.top) {
      // A sign-in wall (Workday, Taleo…): say so plainly instead of "no form found". Passwords are the user's.
      const sense = sensePage(document, location.href);
      if (hasCaptcha(document)) {
        // The site shows a robot check instead of the form: the user solves it, then presses Fill again.
        sendResponse({
          status: "needs_user", platform: sense.platform, url: location.href, jobTitle: sense.jobTitle, fields: [], captcha: true, errors: [],
        } satisfies RunReport);
        return false;
      }
      if (sense.kind === "login_wall") {
        sendResponse({
          status: "needs_user", platform: sense.platform, url: location.href, jobTitle: sense.jobTitle, fields: [], captcha: false,
          errors: [`${sense.platform || "This site"} asks you to sign in (or create an account) before applying. Sign in yourself (ApplyAgent never handles passwords), then press Fill.`],
        } satisfies RunReport);
        return false;
      }
    }
    if ((message.type !== "RUN" && message.type !== "SUBMIT") || !hasApplicationForm()) return false;
    if (busy) {
      sendResponse(plainReport("needs_user", "ApplyAgent is already working on this page. Wait for it to finish."));
      return false;
    }
    // A job description with its own small form (job alerts, newsletter) is not the application: the caller opens
    // the application instead. Later steps of a run under way are trusted.
    if (message.type === "RUN" && !message.continuing && !isApplicationPage(document)) {
      sendResponse(plainReport("not_a_form", ""));
      return false;
    }
    busy = true;
    const markSubmitting = async (r: RunReport) => {
      await chrome.runtime.sendMessage({
        type: "MARK_SUBMITTING", url: r.url, jobTitle: r.jobTitle, platform: r.platform,
      } satisfies Message);
    };
    const working = (busy: boolean) => chrome.runtime.sendMessage({ type: "AGENT_BUSY", busy } satisfies Message).catch(() => undefined);
    (async () => {
      void working(true); // the toolbar icon animates while this tab is being filled
      try {
        const report = message.type === "RUN"
          ? await runOnce(document, { profile: await loadProfile(), answers: await loadAnswers(), applications: await loadApplications(), mode: message.mode, understand }, markSubmitting)
          : await submitForm(document, 20000, markSubmitting);
        sendResponse(report);
        chrome.runtime.sendMessage({ type: "RUN_RESULT", report } satisfies Message).catch(() => undefined);
      } catch (error) {
        // Never leave the panel or the queue waiting forever: say what went wrong.
        sendResponse(plainReport("needs_user", `Something on this page stopped ApplyAgent (${String(error)}). Check the form, then press Fill again.`));
      } finally {
        busy = false;
        void working(false);
      }
    })();
    return true; // keep the channel open for the async response
  });

  // A submission that navigated to a new page reports its confirmation from here.
  const confirmation = formRoot() ? { confirmed: false } : detectConfirmation(document);
  if (confirmation.confirmed && platform.policy !== "hands_off") {
    const adapter = pickAdapter(document);
    const report: RunReport = {
      status: "submitted_confirmed",
      platform: adapter.platform,
      url: location.href,
      jobTitle: adapter.jobTitle(document),
      fields: [],
      captcha: false,
      confirmationText: confirmation.text,
      errors: [],
    };
    chrome.runtime.sendMessage({ type: "RUN_RESULT", report } satisfies Message).catch(() => undefined);
  }

  void startSilentDetection();
}

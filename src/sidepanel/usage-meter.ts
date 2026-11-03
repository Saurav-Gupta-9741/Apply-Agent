/** "12 of 20 free fills used this month" on the Apply page, a friendly upgrade prompt at 15 and at 20, and the
 * one-time 7-day Pro trial unlocked by saving 10 answers. Everything is counted from what is stored in this browser:
 * a rerun of the same application uses no second fill (see submittedThisMonth). */

import type { ApplicationRecord } from "../shared/types";
import {
  currentLicense, loadTrial, maybeUnlockTrial, TRIAL_DAYS, TRIAL_UNLOCK_ANSWERS, trialActive, usageState,
  type LicensePayload, type ProTrial, type UsageState,
} from "../shared/license";
import { exclusive, loadApplications } from "../shared/storage";
import { el } from "./tracker";

export const PRO_PRICE_LINE = "₹149 for 30 days ≈ ₹5/day";

export interface MeterView {
  /** Hidden for paid Pro. */
  hidden: boolean;
  text: string;
  /** 0–100, how much of the free allowance is used. */
  percent: number;
  level: UsageState["level"] | "trial";
  prompt?: string;
  trialHint?: string;
}

function firstOfNextMonth(now: Date): string {
  return new Date(now.getFullYear(), now.getMonth() + 1, 1).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/** What the meter says, from the plan, this month's submissions, the trial and the number of saved answers. */
export function meterView(license: LicensePayload | null, applications: ApplicationRecord[], trial: ProTrial | null, answerCount: number, now: Date): MeterView {
  if (license && !license.trial) return { hidden: true, text: "", percent: 0, level: "ok" };
  if (license?.trial || trialActive(trial, now)) {
    const ends = trial ? Date.parse(trial.endsAt) : license!.exp * 1000;
    const days = Math.max(1, Math.ceil((ends - now.getTime()) / 86_400_000));
    return { hidden: false, text: `Pro trial · ${days} day${days === 1 ? "" : "s"} left · all Pro features unlocked`, percent: 0, level: "trial" };
  }
  const view: MeterView = {
    hidden: false,
    text: "Free plan · Unlimited single-form autofill",
    percent: 100,
    level: "ok",
    prompt: `Want queue apply, resume import, and 1-click AI drafts? Pro is ${PRO_PRICE_LINE}.`,
  };
  if (!trial) {
    view.trialHint = answerCount >= TRIAL_UNLOCK_ANSWERS
      ? `Your free ${TRIAL_DAYS}-day Pro trial is ready.`
      : `Save ${TRIAL_UNLOCK_ANSWERS - answerCount} more answer${TRIAL_UNLOCK_ANSWERS - answerCount === 1 ? "" : "s"} to unlock a free ${TRIAL_DAYS}-day Pro trial (once).`;
  }
  return view;
}

export interface MeterUi {
  toast: (text: string, tone?: "ok" | "warn" | "bad" | "") => void;
  /** Opens Profile & plan (where Pro is bought or a key is entered). */
  showPlan: () => void;
}

export async function renderUsageMeter(ui: MeterUi, now = new Date()): Promise<MeterView | undefined> {
  const box = document.getElementById("usage-meter");
  if (!box) return undefined;
  const [license, applications, trial, { answers }] = await Promise.all([
    currentLicense(now), loadApplications(), loadTrial(), chrome.storage.local.get("answers"),
  ]);
  const view = meterView(license, applications, trial, Array.isArray(answers) ? answers.length : 0, now);
  box.hidden = view.hidden;
  if (view.hidden) return view;
  box.className = `card usage-meter ${view.level}`;
  const bar = el("span", { class: "usage-fill" });
  bar.style.width = `${view.percent}%`;
  const children: Array<Node> = [
    el("div", { class: "usage-head" }, el("strong", { id: "usage-text" }, view.text)),
  ];
  if (view.level !== "trial") {
    children.push(el("div", {
      class: "usage-bar", role: "progressbar", "aria-label": "Free fills used this month",
      "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": String(view.percent),
    }, bar));
  }
  if (view.prompt) {
    const more = el("button", { class: "btn btn-primary btn-sm", type: "button", id: "usage-upgrade" }, "See Pro");
    more.addEventListener("click", () => ui.showPlan());
    children.push(el("div", { class: "usage-prompt", id: "usage-prompt", role: "status" }, el("span", {}, view.prompt), more));
  }
  if (view.trialHint) children.push(el("p", { class: "hint usage-trial", id: "usage-trial" }, view.trialHint));
  box.replaceChildren(...children);
  return view;
}

/** Re-render on plan, application, answer or trial changes, and unlock the trial when the 10th answer is saved. */
export function initUsageMeter(ui: MeterUi): void {
  const unlock = () => void exclusive("proTrial", () => maybeUnlockTrial()).catch(() => null);
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes.answers) unlock();
    if (changes.proTrial?.newValue && !changes.proTrial.oldValue) {
      ui.toast(`You unlocked a free ${TRIAL_DAYS}-day Pro trial: unlimited fills until ${new Date((changes.proTrial.newValue as ProTrial).endsAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}.`);
    }
    if (changes.license || changes.applications || changes.answers || changes.proTrial) void renderUsageMeter(ui);
  });
  unlock();
  void renderUsageMeter(ui);
}

/** "Resume for this application" on the Apply screen: which resume a Fill in this tab attaches, and a way to use a
 * different one for this application only. The Profile's resume is never changed here (see shared/resume-override). */

import type { Message, RunReport } from "../shared/types";
import { loadProfile } from "../shared/storage";
import {
  checkResumeFile, clearResumeOverride, fileToResume, forgetIfMovedOn, loadResumeOverride, noteResumeFields,
  pruneResumeOverrides, RESUME_ACCEPT, saveResumeOverride, withTabResume,
} from "../shared/resume-override";
import { icon } from "./icons";
import { el } from "./tracker";

type Toast = (text: string, tone?: "ok" | "warn" | "bad" | "") => void;

interface Ui {
  toast: Toast;
  showProfile: () => void;
}

let ui: Ui = { toast: () => undefined, showProfile: () => undefined };
/** The tab (and its address) the row shows now. */
let shown: { tabId: number; url: string } | undefined;
let token = 0;
let drawn = "";
let announced = { tabId: -1, at: 0 };

/** Say once (both the page check and the tab's move notice it) that the tab is back on the Profile resume. */
function announceMoved(tabId: number): void {
  if (shown?.tabId !== tabId || (announced.tabId === tabId && Date.now() - announced.at < 3000)) return;
  announced = { tabId, at: Date.now() };
  ui.toast("This tab is on another job now, so it uses your Profile resume again.", "");
}

/** Wire the row once (the panel calls this at start). Resumes of tabs closed meanwhile are forgotten. */
export function initApplyResume(options: Ui): void {
  ui = options;
  void chrome.tabs.query({}).then((tabs) => pruneResumeOverrides(tabs.flatMap((t) => (t.id === undefined ? [] : [t.id])))).catch(() => undefined);
}

/** Show the row for this tab. `canFill`: ApplyAgent may fill this page (otherwise the row is hidden). */
export async function renderApplyResume(tabId: number | undefined, url: string, canFill: boolean): Promise<void> {
  const box = document.getElementById("apply-resume");
  if (!box) return;
  const mine = ++token;
  if (tabId === undefined || !canFill) {
    shown = undefined;
    drawn = "";
    box.hidden = true;
    return;
  }
  shown = { tabId, url };
  const moved = await forgetIfMovedOn(tabId, url).catch(() => false);
  const [override, profile] = await Promise.all([loadResumeOverride(tabId).catch(() => undefined), loadProfile()]);
  if (mine !== token) return; // the user moved to another tab meanwhile
  if (moved) announceMoved(tabId);
  const saved = profile.resume?.name ?? "";
  // Nothing changed: leave the row as it is (redrawing would take the keyboard focus away from its buttons).
  const signature = JSON.stringify([tabId, override?.chosenAt, override?.resume.name, saved]);
  if (signature === drawn && !box.hidden) return;
  drawn = signature;

  const picker = el("input", { type: "file", id: "apply-resume-file", accept: RESUME_ACCEPT, hidden: true, "aria-label": "Choose a resume for this application only" });
  picker.addEventListener("change", () => void choose(picker));
  const pick = el("button", { class: "btn btn-secondary btn-sm", type: "button", id: "apply-resume-change" },
    icon("upload", 14), el("span", {}, saved || override ? "Use a different resume" : "Use a resume for this application"));
  pick.addEventListener("click", () => picker.click());

  const actions = el("div", { class: "apply-resume-actions" }, pick);
  let line: HTMLElement;
  if (override) {
    line = el("p", { class: "apply-resume-file" }, icon("file", 16), el("strong", { id: "apply-resume-name" }, override.resume.name),
      el("span", { class: "chip info plain" }, "This application only"));
    const remove = el("button", { class: "btn btn-ghost btn-sm", type: "button", id: "apply-resume-remove" },
      saved ? "Remove (use my Profile resume again)" : "Remove");
    remove.addEventListener("click", () => void removeOverride());
    actions.append(remove);
  } else if (saved) {
    line = el("p", { class: "apply-resume-file" }, icon("file", 16), el("strong", { id: "apply-resume-name" }, saved),
      el("span", { class: "chip plain" }, "From your Profile"));
  } else {
    const link = el("button", { class: "btn btn-ghost btn-sm", type: "button", id: "apply-resume-profile" }, "Add one in Profile");
    link.addEventListener("click", () => ui.showProfile());
    line = el("p", { class: "apply-resume-file muted" }, icon("file", 16), el("span", { id: "apply-resume-name" }, "No resume saved in your Profile."));
    actions.prepend(link);
  }
  box.replaceChildren(el("span", { class: "apply-resume-title muted", id: "apply-resume-title" }, "Resume for this application"), line, actions, picker);
  box.setAttribute("aria-labelledby", "apply-resume-title");
  box.hidden = false;
}

async function choose(input: HTMLInputElement): Promise<void> {
  const file = input.files?.[0];
  const target = shown;
  input.value = "";
  if (!file || !target) return;
  const problem = checkResumeFile(file);
  if (problem) {
    ui.toast(problem, "bad");
    return;
  }
  try {
    await saveResumeOverride(target.tabId, await fileToResume(file), target.url);
  } catch {
    ui.toast("Could not keep this file for this tab. Remove a resume chosen in another tab, then try again.", "bad");
    return;
  }
  ui.toast(`${file.name} will be used for this application only`);
  if (shown?.tabId === target.tabId) await renderApplyResume(target.tabId, target.url, true);
}

async function removeOverride(): Promise<void> {
  const target = shown;
  if (!target) return;
  await clearResumeOverride(target.tabId).catch(() => undefined);
  ui.toast("Your Profile resume will be used");
  if (shown?.tabId === target.tabId) await renderApplyResume(target.tabId, target.url, true);
  document.getElementById("apply-resume-change")?.focus();
}

/** The tab closed: its resume is forgotten. */
export function applyResumeTabClosed(tabId: number): void {
  void clearResumeOverride(tabId).catch(() => undefined);
}

/** The tab moved to another page (not a step of a Fill under way): forget its resume if that is another job. */
export function applyResumeTabMoved(tabId: number, url: string | undefined): void {
  void forgetIfMovedOn(tabId, url).then((moved) => {
    if (!moved || shown?.tabId !== tabId) return;
    announceMoved(tabId);
    void renderApplyResume(tabId, url ?? "", true);
  }).catch(() => undefined);
}

/** Send a Fill to the tab with its own resume (if one was chosen), and name the attached file in the checklist.
 * Other messages go out unchanged. */
export async function sendWithResume(tabId: number, message: Message, deliver: (m: Message) => Promise<RunReport | undefined>): Promise<RunReport | undefined> {
  if (message.type !== "RUN" && message.type !== "SCAN") return deliver(message);
  const url = await chrome.tabs.get(tabId).then((t) => t.url, () => undefined);
  const { message: out, override } = await withTabResume(message, tabId, url).catch(() => ({ message, override: undefined }));
  const report = await deliver(out);
  if (override) {
    // A run that moved on to the next page of this application keeps the resume there.
    // (Not when the user removed or replaced it meanwhile.)
    const now = report?.url ? await loadResumeOverride(tabId).catch(() => undefined) : undefined;
    if (report?.url && now?.chosenAt === override.chosenAt && now.url !== report.url) {
      await saveResumeOverride(tabId, override.resume, report.url, override.chosenAt).catch(() => undefined);
    }
    return noteResumeFields(report, override.resume.name, true);
  }
  return noteResumeFields(report, (await loadProfile().catch(() => undefined))?.resume?.name ?? "", false);
}

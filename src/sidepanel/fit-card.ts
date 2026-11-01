/** Job-vs-profile fit on the Apply page: "Matches 7 of 10 skills · Missing: Kubernetes, Terraform · Experience:
 * needs 3+ yrs, you have 2". Read-only: it reads the job description's text and never changes a field or an answer.
 * Never asked of hands-off platforms (LinkedIn, Naukri, …): the panel does not read those pages at all. */

import type { Profile } from "../shared/types";
import { fitSummary, type FitSummary } from "../content/fit";
import { loadProfile } from "../shared/storage";
import { el } from "./tracker";

/** The job description's text from the tab: the page script's read-only reader, in whichever frame has the most. */
async function jobText(tabId: number): Promise<string> {
  await chrome.scripting.executeScript({ target: { tabId, allFrames: true }, files: ["content.js"] }).catch(() => undefined);
  const results = await chrome.scripting.executeScript({
    target: { tabId, allFrames: true },
    func: () => ((globalThis as { __applyAgentJobText?: () => string | null }).__applyAgentJobText?.() ?? null),
  }).catch(() => []);
  return results.map((r) => (typeof r.result === "string" ? r.result : "")).sort((a, b) => b.length - a.length)[0] ?? "";
}

export function hasFitProfile(profile: Profile): boolean {
  return !!(profile.skills?.trim() || profile.skillsInventory?.length || profile.experienceYears?.trim());
}

/** Below this many characters a page has no real job description (a bare application form). */
export const MIN_JD_CHARS = 200;

let token = 0;

/** Show (or hide) the fit card for this tab. `canRead`: the page is allowed (or opened once) and not hands-off. */
export async function renderFitCard(tabId: number | undefined, canRead: boolean, showProfile: () => void): Promise<FitSummary | undefined> {
  const box = document.getElementById("fit-card");
  if (!box) return undefined;
  const mine = ++token;
  if (tabId === undefined || !canRead) {
    box.hidden = true;
    return undefined;
  }
  const [text, profile] = await Promise.all([jobText(tabId), loadProfile()]);
  if (mine !== token) return undefined; // the user moved to another tab meanwhile
  if (text.length < MIN_JD_CHARS) {
    box.hidden = true;
    return undefined;
  }
  box.hidden = false;
  const head = el("div", { class: "card-head" }, el("h2", {}, "Job fit"), el("span", { class: "muted" }, "Read-only"));
  if (!hasFitProfile(profile)) {
    const go = el("button", { class: "btn btn-secondary btn-sm", type: "button" }, "Add skills");
    go.addEventListener("click", showProfile);
    box.replaceChildren(head, el("p", { class: "hint" }, "Add your skills and years of experience in Profile to see how you fit this job."), go);
    return undefined;
  }
  const fit = fitSummary(text, profile);
  const tone = !fit.total ? "" : fit.matched / fit.total >= 0.7 && fit.experience?.ok !== false ? "ok" : fit.matched / fit.total >= 0.4 ? "warn" : "bad";
  box.className = `card fit-card ${tone}`;
  const chips = el("div", { class: "chips" });
  for (const s of fit.missing.slice(0, 6)) chips.append(el("span", { class: "chip warn" }, s));
  const children: (Node | string)[] = [
    head,
    el("p", { id: "fit-line", class: "fit-line" }, fit.line),
  ];
  if (fit.missing.length) children.push(chips);
  children.push(el("p", { class: "hint" }, "From the job description on this page and your profile. It never changes your answers."));
  box.replaceChildren(...children);
  return fit;
}

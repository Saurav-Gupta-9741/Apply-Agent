/** Talking to the one frame that holds the application. A tab can have several frames with forms (a careers page with
 * a job search, and the employer's application embedded in a frame); sending to every frame would let each of them
 * fill, or press Submit. Each frame's page script rates its own page (content/index.ts, __applyAgentRate) and the
 * best-rated one gets the message. */

import type { Message, RunReport } from "./types";

interface Rating {
  score: number;
  kind: string;
  form: boolean;
  handsOff: boolean;
}

/** The frame to act in: a hands-off platform's frame first (it answers with a refusal), then the frame whose page
 * looks most like an application. Undefined when no frame has ApplyAgent's page script or a form. */
export async function applicationFrame(tabId: number): Promise<number | undefined> {
  const results = await chrome.scripting.executeScript({
    target: { tabId, allFrames: true },
    func: () => ((globalThis as { __applyAgentRate?: () => unknown }).__applyAgentRate?.() ?? null) as Rating | null,
  }).catch(() => []);
  const rated = results.map((r) => ({ frameId: r.frameId, rating: r.result as Rating | null }))
    .filter((r): r is { frameId: number; rating: Rating } => !!r.rating && (r.rating.form || r.rating.handsOff));
  if (!rated.length) return undefined;
  const handsOff = rated.find((r) => r.rating.handsOff);
  if (handsOff) return handsOff.frameId;
  rated.sort((a, b) => b.rating.score - a.rating.score || (a.frameId === 0 ? 1 : 0) - (b.frameId === 0 ? 1 : 0));
  return rated[0]!.frameId;
}

/** Inject the page script (all frames, it ignores double loads), then send the message to the application's frame
 * only. Falls back to the whole tab when frames cannot be rated (a message with no form answers nothing). */
export async function sendToApplication(tabId: number, message: Message): Promise<RunReport | undefined> {
  await chrome.scripting.executeScript({ target: { tabId, allFrames: true }, files: ["content.js"] }).catch(() => undefined);
  const frameId = await applicationFrame(tabId);
  try {
    return (await (frameId === undefined
      ? chrome.tabs.sendMessage(tabId, message)
      : chrome.tabs.sendMessage(tabId, message, { frameId }))) as RunReport | undefined;
  } catch {
    return undefined; // no frame answered, or the page changed under the agent
  }
}

/** A submission started in this tab (the page script asked to record it just before pressing Submit). */
export interface PendingSubmission {
  id: string;
  at: number;
}

/** How long after pressing Submit a confirmation still belongs to that submission. */
export const PENDING_MS = 10 * 60_000;

export async function pendingSubmission(tabId: number, now = Date.now()): Promise<PendingSubmission | undefined> {
  const data = await chrome.storage.session.get("pending");
  const entry = ((data.pending as Record<string, PendingSubmission | string> | undefined) ?? {})[String(tabId)];
  if (!entry || typeof entry === "string") return undefined; // the old format had no time: never trust it
  return now - entry.at <= PENDING_MS ? entry : undefined;
}

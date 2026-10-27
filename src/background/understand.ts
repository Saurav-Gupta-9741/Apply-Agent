/** Relays questions to the local question model in the offscreen page (started on first use) and remembers the
 * readings while the worker lives: the same questions come back on form after form. Any failure → no readings, and
 * ApplyAgent works with its rules alone. */

import type { Reading } from "../shared/intent-model";

const PAGE = "offscreen.html";
let creating: Promise<void> | undefined;
const remembered = new Map<string, Reading>();

async function ensurePage(): Promise<void> {
  const url = chrome.runtime.getURL(PAGE);
  const open = await chrome.runtime.getContexts({ contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT], documentUrls: [url] });
  if (open.length) return;
  creating ??= chrome.offscreen.createDocument({
    url: PAGE, reasons: [chrome.offscreen.Reason.WORKERS], justification: "Runs ApplyAgent's local question-understanding model, offline",
  }).finally(() => (creating = undefined));
  await creating;
}

/** The model needs ~150 MB while it runs. On computers with 1 GB of memory or less it is not started: rules alone. */
export function modelFits(): boolean {
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return memory === undefined || memory > 1;
}

export async function understand(texts: string[]): Promise<Array<Reading | null>> {
  const unknown = [...new Set(texts.filter((t) => t && !remembered.has(t)))];
  if (unknown.length) {
    await ensurePage();
    const readings = (await chrome.runtime.sendMessage({ target: "offscreen", type: "UNDERSTAND", texts: unknown })) as Reading[] | null;
    if (Array.isArray(readings)) unknown.forEach((t, i) => readings[i] && remembered.set(t, readings[i]!));
  }
  return texts.map((t) => remembered.get(t) ?? null);
}

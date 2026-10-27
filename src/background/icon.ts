/** The toolbar icon while ApplyAgent fills a tab: the check mark draws itself over and over, the same motion as the
 * side panel's logo (frames from scripts/icons.mjs). Per tab; stops when the work ends, the page changes or the tab
 * closes, and after two minutes at most. Still when the user's system asks for reduced motion. */

const FRAMES = 10;
const FRAME_MS = 130;
const MAX_MS = 120_000;
const DEFAULT_ICON = { 16: "icons/icon16.png", 32: "icons/icon32.png" };

const frame = (i: number) => ({ 16: `icons/working/w${i}-16.png`, 32: `icons/working/w${i}-32.png` });

interface Animation {
  timer: ReturnType<typeof setInterval>;
  started: number;
  frame: number;
}

const running = new Map<number, Animation>();
/** The latest request per tab: a "stop" that arrives while a "start" is still reading settings wins. */
const wanted = new Map<number, boolean>();

export async function setWorking(tabId: number, on: boolean): Promise<void> {
  wanted.set(tabId, on);
  const current = running.get(tabId);
  if (!on) {
    wanted.delete(tabId);
    if (!current) return;
    clearInterval(current.timer);
    running.delete(tabId);
    await chrome.action.setIcon({ tabId, path: DEFAULT_ICON }).catch(() => undefined); // the tab may be gone
    return;
  }
  if (current) {
    current.started = Date.now(); // still working: extend the safety limit
    return;
  }
  const { reduceMotion } = await chrome.storage.local.get("reduceMotion");
  if (reduceMotion === true || wanted.get(tabId) !== true || running.has(tabId)) return;
  const animation: Animation = {
    started: Date.now(),
    frame: 0,
    timer: setInterval(() => {
      if (Date.now() - animation.started > MAX_MS) {
        void setWorking(tabId, false);
        return;
      }
      animation.frame = (animation.frame + 1) % FRAMES;
      chrome.action.setIcon({ tabId, path: frame(animation.frame) }).catch(() => void setWorking(tabId, false));
    }, FRAME_MS),
  };
  running.set(tabId, animation);
}

export function isWorking(tabId: number): boolean {
  return running.has(tabId);
}

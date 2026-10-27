/** The toolbar icon animation: frames while a tab is being filled, back to the still icon when done, never stuck. */

import { existsSync, readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const setIcon = vi.fn(async (_details: { tabId: number; path: Record<number, string> }) => undefined);
let storage: Record<string, unknown> = {};
(globalThis as unknown as { chrome: unknown }).chrome = {
  action: { setIcon },
  storage: { local: { get: async (key: string) => ({ [key]: storage[key] }) } },
};

const { setWorking, isWorking } = await import("../src/background/icon");
const lastPath = () => setIcon.mock.calls.at(-1)?.[0].path[16];

describe("toolbar icon while the agent works", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setIcon.mockClear();
    storage = {};
  });
  afterEach(async () => {
    await setWorking(1, false);
    vi.useRealTimers();
  });

  it("plays the working frames, then returns to the still icon", async () => {
    await setWorking(1, true);
    await vi.advanceTimersByTimeAsync(130 * 3);
    expect(setIcon).toHaveBeenCalledTimes(3);
    expect(lastPath()).toBe("icons/working/w3-16.png");
    await setWorking(1, false);
    expect(lastPath()).toBe("icons/icon16.png");
    const calls = setIcon.mock.calls.length;
    await vi.advanceTimersByTimeAsync(1000);
    expect(setIcon.mock.calls.length).toBe(calls); // really stopped
  });

  it("a stop that arrives while the start is still starting wins (no endless animation)", async () => {
    const starting = setWorking(1, true);
    await setWorking(1, false);
    await starting;
    await vi.advanceTimersByTimeAsync(1000);
    expect(isWorking(1)).toBe(false);
    expect(setIcon.mock.calls.every((c) => c[0].path[16] === "icons/icon16.png")).toBe(true);
  });

  it("stays still when the user's system asks for reduced motion", async () => {
    storage.reduceMotion = true;
    await setWorking(1, true);
    await vi.advanceTimersByTimeAsync(1000);
    expect(setIcon).not.toHaveBeenCalled();
  });

  it("stops by itself after two minutes, whatever happens to the page", async () => {
    await setWorking(1, true);
    await vi.advanceTimersByTimeAsync(121_000);
    expect(isWorking(1)).toBe(false);
    expect(lastPath()).toBe("icons/icon16.png");
  });
});

describe("icon files", () => {
  it("every icon the extension uses exists, including all working frames", () => {
    const manifest = JSON.parse(readFileSync("static/manifest.json", "utf8"));
    const paths = [...Object.values(manifest.icons), ...Object.values(manifest.action.default_icon)] as string[];
    for (let i = 0; i < 10; i++) paths.push(`icons/working/w${i}-16.png`, `icons/working/w${i}-32.png`);
    paths.push("brand/mark.svg", "brand/mark-intro.svg", "brand/mark-working.svg", "brand/mark-celebrate.svg");
    expect(paths.filter((p) => !existsSync(`static/${p}`))).toEqual([]);
  });
});

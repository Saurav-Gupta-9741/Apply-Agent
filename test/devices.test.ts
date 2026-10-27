/** Other browsers and smaller computers: the panel opens where Chrome's side panel is missing (Opera, some Edge
 * builds), and the model is not started on computers with very little memory. */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Listener = (...args: unknown[]) => unknown;

/** A chrome.* stand-in: every event records its listeners, every call resolves; parts can be overridden. */
function fakeChrome(overrides: Record<string, unknown>): { chrome: unknown; listeners: Map<string, Listener[]>; calls: Array<[string, unknown[]]> } {
  const listeners = new Map<string, Listener[]>();
  const calls: Array<[string, unknown[]]> = [];
  const node = (path: string): unknown => new Proxy(function () {}, {
    get(_t, key: string) {
      const full = path ? `${path}.${key}` : key;
      if (full in overrides) return overrides[full];
      if (key === "addListener") return (fn: Listener) => listeners.set(path, [...(listeners.get(path) ?? []), fn]);
      if (key === "then") return undefined;
      return node(full);
    },
    apply(_t, _this, args: unknown[]) {
      calls.push([path, args]);
      return Promise.resolve(path.endsWith("get") || path.endsWith("query") || path.endsWith("getContexts") ? [] : undefined);
    },
  });
  return { chrome: node(""), listeners, calls };
}

describe("the panel opens in browsers without Chrome's side panel", () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.unstubAllGlobals());

  async function clickIcon(overrides: Record<string, unknown>) {
    const fake = fakeChrome({
      "runtime.getURL": (p: string) => `chrome-extension://id/${p}`,
      "windows.get": async () => ({ left: 0, top: 0, width: 1400, height: 860 }),
      ...overrides,
    });
    vi.stubGlobal("chrome", fake.chrome);
    await import("../src/background/index");
    const [onClicked] = fake.listeners.get("action.onClicked") ?? [];
    expect(onClicked).toBeTypeOf("function");
    onClicked!({ id: 7, windowId: 1 });
    await new Promise((r) => setTimeout(r, 0));
    return fake.calls;
  }

  it("no side panel API at all (Opera): a small window with the panel for this tab", async () => {
    const calls = await clickIcon({ sidePanel: undefined });
    const created = calls.find(([path]) => path === "windows.create");
    expect(created?.[1][0]).toMatchObject({ url: "chrome-extension://id/sidepanel.html?tabId=7", type: "popup", width: 420, left: 980 });
  });

  it("the side panel refuses to open: the same window instead", async () => {
    const calls = await clickIcon({ "sidePanel.open": () => Promise.reject(new Error("not supported")) });
    expect(calls.some(([path]) => path === "windows.create")).toBe(true);
  });

  it("Chrome with its side panel: no extra window", async () => {
    const calls = await clickIcon({ "sidePanel.open": () => Promise.resolve() });
    expect(calls.some(([path]) => path === "windows.create")).toBe(false);
  });
});

describe("the question model on small computers", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("is not started with 1 GB of memory or less, and is with more (or when the browser does not say)", async () => {
    const { modelFits } = await import("../src/background/understand");
    for (const [memory, fits] of [[0.5, false], [1, false], [2, true], [8, true], [undefined, true]] as const) {
      vi.stubGlobal("navigator", { deviceMemory: memory });
      expect(modelFits()).toBe(fits);
    }
  });
});

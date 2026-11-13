/** The side panel's link to the writer in the offscreen page: starts the page (through the background), keeps one
 * port open, remembers the latest status and passes every message on to listeners. Also keeps the user's writer
 * settings (consent, chosen model, measured speed) in extension storage, which the offscreen page cannot read. */

import { WRITER_PORT, type FromWriter, type ToWriter, type WriterStatus } from "./protocol";

declare const __APPLYAGENT_TEST__: boolean | undefined;
export const TEST_BUILD = typeof __APPLYAGENT_TEST__ !== "undefined" && __APPLYAGENT_TEST__ === true;

export interface WriterSettings {
  /** The user agreed to download the writing model. */
  consented?: boolean;
  /** The model downloaded (or being downloaded) for this computer. */
  modelId?: string;
  /** A download was under way: resume it when the panel opens again. */
  downloading?: boolean;
  /** Start drafts by themselves after Fill when the writer is ready (never a download); on unless switched off. */
  autoDraft?: boolean;
  /** Measured writing speed per model (tokens per second). */
  tokensPerSec?: Record<string, number>;
}

/** Test builds only: serve the model from the local test server and pick a given model. */
export interface WriterTestOverride {
  baseUrl?: string;
  modelId?: string;
}

const KEY = "writer";

export async function loadWriterSettings(): Promise<WriterSettings> {
  try {
    return ((await chrome.storage.local.get(KEY))[KEY] as WriterSettings | undefined) ?? {};
  } catch {
    return {};
  }
}

export async function saveWriterSettings(patch: Partial<WriterSettings>): Promise<WriterSettings> {
  const next = { ...(await loadWriterSettings()), ...patch };
  await chrome.storage.local.set({ [KEY]: next });
  return next;
}

/** The test override (always empty in real builds: the key is not even read). */
export async function testOverride(): Promise<WriterTestOverride> {
  if (!TEST_BUILD) return {};
  try {
    return ((await chrome.storage.local.get("writerTest")).writerTest as WriterTestOverride | undefined) ?? {};
  } catch {
    return {};
  }
}

type Listener = (msg: FromWriter) => void;

export class WriterClient {
  private port?: chrome.runtime.Port;
  private connecting?: Promise<void>;
  private listeners = new Set<Listener>();
  status?: WriterStatus;
  private statusWaiters: Array<(s: WriterStatus) => void> = [];

  /** Opens the offscreen page and the port (once). */
  connect(): Promise<void> {
    if (this.port) return Promise.resolve();
    this.connecting ??= (async () => {
      for (let attempt = 0; attempt < 3 && !this.port; attempt++) {
        const ok = await chrome.runtime.sendMessage({ type: "WRITER_OPEN" }).catch(() => false);
        if (!ok) throw new Error("The on-device writer could not start");
        const port = chrome.runtime.connect({ name: WRITER_PORT });
        // The first answer proves the page is listening; a port nobody listens to disconnects at once.
        const alive = await new Promise<boolean>((resolve) => {
          const timer = setTimeout(() => resolve(false), 5000);
          port.onDisconnect.addListener(() => {
            clearTimeout(timer);
            if (this.port === port) this.port = undefined;
            resolve(false);
          });
          port.onMessage.addListener((msg: FromWriter) => {
            clearTimeout(timer);
            resolve(true);
            this.receive(msg);
          });
          port.postMessage({ type: "status" } satisfies ToWriter);
        });
        if (!alive) {
          try {
            port.disconnect();
          } catch {
            /* already closed */
          }
          await new Promise((r) => setTimeout(r, 300));
          continue;
        }
        this.port = port;
      }
      if (!this.port) throw new Error("The on-device writer could not start");
    })().finally(() => (this.connecting = undefined));
    return this.connecting;
  }

  private receive(msg: FromWriter): void {
    if (msg.type === "status") {
      this.status = msg.status;
      const waiters = this.statusWaiters;
      this.statusWaiters = [];
      for (const w of waiters) w(msg.status);
    }
    for (const l of [...this.listeners]) {
      try {
        l(msg);
      } catch (e) {
        console.warn("ApplyAgent writer listener:", e);
      }
    }
  }

  async send(msg: ToWriter): Promise<void> {
    await this.connect();
    this.port!.postMessage(msg);
  }

  /** The current status, fresh from the offscreen page. */
  async fetchStatus(): Promise<WriterStatus> {
    await this.connect();
    const p = new Promise<WriterStatus>((resolve) => this.statusWaiters.push(resolve));
    this.port!.postMessage({ type: "status" } satisfies ToWriter);
    return p;
  }

  on(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

/** One per panel. */
export const writer = new WriterClient();

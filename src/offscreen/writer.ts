/** The writer host in the offscreen page: downloads models (in a worker), loads one, drafts the queued questions one
 * at a time and streams the words to every open side panel over a runtime port. It lives as long as the browser, so
 * drafts continue when the panel is closed and are still there when it reopens. Unloads the model after a few idle
 * minutes to give the memory back. Fully local: the only network use is the model download, which sends nothing
 * about the user. */

import { CATALOG, modelById, modelUrl } from "../shared/writer/catalog";
import type { WriterEngine } from "../shared/writer/engine";
import { fileSize, modelFile, readProgress, removeModelFiles } from "../shared/writer/opfs";
import { maxTokensFor, writerMessages, type DraftRequest } from "../shared/writer/prompt";
import { WRITER_PORT, type FromWriter, type ModelFileState, type ToWriter, type WriterStatus } from "../shared/writer/protocol";
import { TIER_THRESHOLDS } from "../shared/writer/tier";

declare const __APPLYAGENT_TEST__: boolean | undefined;
const TEST_BUILD = typeof __APPLYAGENT_TEST__ !== "undefined" && __APPLYAGENT_TEST__ === true;

/** Unload the model after this long without work. */
export const IDLE_UNLOAD_MS = 3 * 60_000;
const MAX_FINISHED = 50;

const ports = new Set<chrome.runtime.Port>();
/** The engine (and wllama) is loaded on first use, so the question model alone keeps this page light. */
let engine: WriterEngine | undefined;
async function theEngine(): Promise<WriterEngine> {
  if (!engine) {
    const { WriterEngine: Engine } = await import("../shared/writer/engine");
    engine ??= new Engine(chrome.runtime.getURL("wllama/wllama.wasm"));
  }
  return engine;
}
let worker: Worker | undefined;
let workerDone: Promise<void> | undefined;
let download: { modelId: string; done: number; bytes: number } | undefined;
let loading: string | undefined;
const queue: Array<{ modelId: string; request: DraftRequest }> = [];
let running: { id: string; ctrl: AbortController } | undefined;
const finished = new Map<string, { raw: string; ms: number }>();
let idleTimer: ReturnType<typeof setTimeout> | undefined;

function broadcast(msg: FromWriter): void {
  for (const p of ports) {
    try {
      p.postMessage(msg);
    } catch {
      ports.delete(p);
    }
  }
}

async function fileState(id: string, bytes: number): Promise<ModelFileState> {
  if (download?.modelId === id) return { done: download.done, bytes, complete: false };
  const [size, prog] = await Promise.all([fileSize(id), readProgress(id)]);
  return { done: Math.min(size, prog?.done ?? size), bytes, complete: !!prog?.complete && size === bytes };
}

async function status(): Promise<WriterStatus> {
  const files: Record<string, ModelFileState> = {};
  for (const m of CATALOG) files[m.id] = await fileState(m.id, m.bytes);
  return {
    files, download, loading, loaded: engine?.loaded, queue: queue.map((q) => q.request.id), running: running?.id,
    finished: Object.fromEntries(finished), crossOriginIsolated: self.crossOriginIsolated, threads: navigator.hardwareConcurrency || 1,
  };
}

async function sendStatus(): Promise<void> {
  broadcast({ type: "status", status: await status() });
}

function startDownload(modelId: string, baseUrl?: string): void {
  const model = modelById(modelId);
  if (!model || worker) return;
  if (engine?.loaded === modelId) return;
  const url = modelUrl(model, TEST_BUILD && baseUrl ? baseUrl : undefined);
  download = { modelId, done: 0, bytes: model.bytes };
  const w = new Worker(chrome.runtime.getURL("writer-download.js"), { type: "module" });
  worker = w;
  workerDone = new Promise<void>((resolve) => {
    w.onmessage = (e: MessageEvent) => {
      const m = e.data as { type: string; done?: number; total?: number; code?: string; message?: string };
      if (m.type === "progress" && download) {
        download.done = m.done ?? 0;
        void sendStatus();
        return;
      }
      if (m.type === "error") broadcast({ type: "download-error", modelId, code: m.code ?? "network", message: m.message ?? "" });
      w.terminate();
      worker = undefined;
      download = undefined;
      resolve();
      void sendStatus();
    };
    w.onerror = (e) => {
      broadcast({ type: "download-error", modelId, code: "network", message: e.message || "The download stopped" });
      w.terminate();
      worker = undefined;
      download = undefined;
      resolve();
      void sendStatus();
    };
  });
  w.postMessage({ type: "start", modelId, url, bytes: model.bytes, sha256: model.sha256 });
  void sendStatus();
}

async function cancelDownload(): Promise<void> {
  worker?.postMessage({ type: "cancel" });
  await workerDone;
}

async function ensureLoaded(modelId: string): Promise<void> {
  if (engine?.loaded === modelId) return;
  const model = modelById(modelId);
  const file = await modelFile(modelId);
  const prog = await readProgress(modelId);
  if (!model || !file || file.size !== model.bytes || !prog?.complete) throw new Error("The writing model is not downloaded yet");
  loading = modelId;
  void sendStatus();
  try {
    const needsGpu = TIER_THRESHOLDS.models.find((t) => t.id === modelId)?.needsWebGPU ?? false;
    await (await theEngine()).load(modelId, file, { gpu: needsGpu });
  } finally {
    loading = undefined;
  }
}

function armIdle(): void {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (!running && !queue.length) void engine?.unload().then(sendStatus);
  }, IDLE_UNLOAD_MS);
}

async function pump(): Promise<void> {
  if (running || !queue.length) return;
  const next = queue.shift()!;
  const id = next.request.id;
  const ctrl = new AbortController();
  running = { id, ctrl };
  clearTimeout(idleTimer);
  void sendStatus();
  const t0 = performance.now();
  try {
    await ensureLoaded(next.modelId);
    if (ctrl.signal.aborted) throw new DOMException("stopped", "AbortError");
    void sendStatus(); // loaded: the panels stop saying "Loading…"
    let last = 0;
    const r = await engine!.generate(writerMessages(next.request), maxTokensFor(next.request.limit), ctrl.signal, (text) => {
      const now = performance.now();
      if (now - last > 120) {
        last = now;
        broadcast({ type: "token", id, text });
      }
    });
    if (r.stopped) {
      broadcast({ type: "draft-error", id, message: "stopped" });
    } else {
      const ms = Math.round(performance.now() - t0);
      finished.set(id, { raw: r.text, ms });
      while (finished.size > MAX_FINISHED) finished.delete(finished.keys().next().value!);
      broadcast({ type: "draft-done", id, raw: r.text, ms, tokensPerSec: r.tokensPerSec });
    }
  } catch (e) {
    const message = ctrl.signal.aborted ? "stopped" : String((e as Error)?.message ?? e);
    broadcast({ type: "draft-error", id, message });
    if (!ctrl.signal.aborted) await engine?.unload(); // a failed model may be in a bad state: load it again next time
  } finally {
    running = undefined;
    armIdle();
    void sendStatus();
    void pump();
  }
}

async function handle(msg: ToWriter): Promise<void> {
  switch (msg.type) {
    case "status":
      break;
    case "download":
      startDownload(msg.modelId, msg.baseUrl);
      break;
    case "cancel-download":
      await cancelDownload();
      break;
    case "remove":
      if (download?.modelId === msg.modelId) await cancelDownload();
      if (engine?.loaded === msg.modelId) {
        running?.ctrl.abort();
        queue.length = 0;
        await engine?.unload();
      }
      await removeModelFiles(msg.modelId);
      break;
    case "draft": {
      const id = msg.request.id;
      if (running?.id === id || queue.some((q) => q.request.id === id)) break;
      finished.delete(id); // asked again: a new draft
      queue.push({ modelId: msg.modelId, request: msg.request });
      void pump();
      break;
    }
    case "stop": {
      const i = queue.findIndex((q) => q.request.id === msg.id);
      if (i >= 0) {
        queue.splice(i, 1);
        broadcast({ type: "draft-error", id: msg.id, message: "stopped" });
      }
      if (running?.id === msg.id) running.ctrl.abort();
      break;
    }
    case "speed-test": {
      if (running) break;
      try {
        await ensureLoaded(msg.modelId);
        const tokensPerSec = await engine!.speedTest(TIER_THRESHOLDS.speedTestMs);
        broadcast({ type: "speed", modelId: msg.modelId, tokensPerSec });
        armIdle();
      } catch (e) {
        broadcast({ type: "draft-error", id: "speed-test", message: String((e as Error)?.message ?? e) });
      }
      break;
    }
  }
  await sendStatus();
}

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== WRITER_PORT) return;
  ports.add(port);
  port.onDisconnect.addListener(() => ports.delete(port));
  port.onMessage.addListener((msg: ToWriter) => {
    void handle(msg).catch((e) => console.warn("ApplyAgent writer:", e));
  });
});

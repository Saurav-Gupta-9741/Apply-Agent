/** A worker of the offscreen page that downloads a writing model into the browser's private storage. A worker, because
 * only workers can write a file in place (a sync access handle): progress is saved every few megabytes, and a closed
 * browser resumes there instead of starting over. Messages: { type: "start", modelId, url, bytes, sha256 } and
 * { type: "cancel" }; answers { type: "progress", done, total }, { type: "done" } or { type: "error", code, message }. */

import { DownloadError, downloadModel, type ByteSink, type DownloadProgress, type ProgressStore } from "../shared/writer/download";
import { modelFileName, progressFileName, writerDir } from "../shared/writer/opfs";

interface SyncHandle {
  getSize(): number;
  read(buffer: Uint8Array, options?: { at: number }): number;
  write(buffer: Uint8Array, options?: { at: number }): number;
  truncate(size: number): void;
  flush(): void;
  close(): void;
}
type SyncFileHandle = FileSystemFileHandle & { createSyncAccessHandle(): Promise<SyncHandle> };

let ctrl: AbortController | undefined;

async function start(m: { modelId: string; url: string; bytes: number; sha256: string }): Promise<void> {
  ctrl = new AbortController();
  const dir = await writerDir();
  const file = await (await dir.getFileHandle(modelFileName(m.modelId), { create: true }) as SyncFileHandle).createSyncAccessHandle();
  const prog = await (await dir.getFileHandle(progressFileName(m.modelId), { create: true }) as SyncFileHandle).createSyncAccessHandle();
  const enc = new TextEncoder();
  const sink: ByteSink = {
    size: () => file.getSize(),
    write: (d, at) => {
      for (let off = 0; off < d.length;) off += file.write(d.subarray(off), { at: at + off });
    },
    truncate: (n) => file.truncate(n),
    flush: () => file.flush(),
  };
  const store: ProgressStore = {
    async load() {
      const n = prog.getSize();
      if (!n) return undefined;
      const buf = new Uint8Array(n);
      prog.read(buf, { at: 0 });
      try {
        return JSON.parse(new TextDecoder().decode(buf)) as DownloadProgress;
      } catch {
        return undefined;
      }
    },
    async save(p) {
      const b = enc.encode(JSON.stringify(p));
      prog.write(b, { at: 0 });
      prog.truncate(b.length);
      prog.flush();
    },
    async clear() {
      prog.truncate(0);
      prog.flush();
    },
  };
  let last = 0;
  try {
    await downloadModel({
      modelId: m.modelId, url: m.url, bytes: m.bytes, sha256: m.sha256, sink, store, signal: ctrl.signal,
      onProgress: (done, total) => {
        const now = performance.now();
        if (now - last > 300 || done === total) {
          last = now;
          postMessage({ type: "progress", done, total });
        }
      },
    });
    postMessage({ type: "done" });
  } catch (e) {
    postMessage({ type: "error", code: e instanceof DownloadError ? e.code : "network", message: String((e as Error)?.message ?? e) });
  } finally {
    file.close();
    prog.close();
  }
}

self.onmessage = (e: MessageEvent) => {
  const m = e.data as { type: string; modelId: string; url: string; bytes: number; sha256: string };
  if (m.type === "cancel") ctrl?.abort();
  else if (m.type === "start") void start(m).catch((err) => postMessage({ type: "error", code: "network", message: String(err?.message ?? err) }));
};

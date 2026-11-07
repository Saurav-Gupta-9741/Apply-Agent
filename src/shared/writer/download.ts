/** One-time, resumable download of a writing model into one file in the browser's private storage (OPFS).
 *
 * - HTTP Range requests of at most 500 MB each (Chrome has crashed outright on single reads near 1 GB), streamed piece
 *   by piece into the file: memory use stays small whatever the model size.
 * - Every few megabytes the file is flushed and the progress (bytes done + the running SHA-256 state) is saved, so a
 *   closed browser or a lost connection resumes where it stopped, without hashing the first part again.
 * - At the end the size and the SHA-256 must match the catalog; otherwise the file is deleted.
 *
 * The file and the progress store are passed in (an OPFS sync access handle in the browser, memory in tests). Only the
 * model file is requested: nothing about the user is sent. */

import { Sha256, type Sha256State } from "./sha256";

/** Chrome reads of about 1 GB at once have crashed the whole browser: never ask for more than this in one request. */
export const MAX_CHUNK_BYTES = 500_000_000;

/** The file being written (an OPFS FileSystemSyncAccessHandle in the browser). */
export interface ByteSink {
  size(): number;
  write(data: Uint8Array, at: number): void;
  truncate(size: number): void;
  flush(): void;
}

export interface DownloadProgress {
  modelId: string;
  sha256: string;
  bytes: number;
  done: number;
  hash: Sha256State;
  complete?: boolean;
}

/** Where the progress is kept between sessions (a small JSON file next to the model in the browser). */
export interface ProgressStore {
  load(): Promise<DownloadProgress | undefined>;
  save(p: DownloadProgress): Promise<void>;
  clear(): Promise<void>;
}

export type DownloadErrorCode = "aborted" | "network" | "http" | "no-range" | "mismatch";

export class DownloadError extends Error {
  constructor(public code: DownloadErrorCode, message: string) {
    super(message);
    this.name = "DownloadError";
  }
}

export interface DownloadOptions {
  modelId: string;
  url: string;
  bytes: number;
  sha256: string;
  sink: ByteSink;
  store: ProgressStore;
  fetch?: typeof fetch;
  /** Bytes per Range request (at most MAX_CHUNK_BYTES). */
  chunkBytes?: number;
  /** Flush and save progress after this many new bytes. */
  commitBytes?: number;
  retries?: number;
  signal?: AbortSignal;
  onProgress?: (done: number, total: number) => void;
  sleep?: (ms: number) => Promise<void>;
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Downloads (or resumes, or just confirms) the model file. Resolves when the file is complete and verified. */
export async function downloadModel(o: DownloadOptions): Promise<void> {
  const doFetch = o.fetch ?? fetch.bind(globalThis);
  const chunk = Math.max(1, Math.min(o.chunkBytes ?? 256 * 2 ** 20, MAX_CHUNK_BYTES));
  const commit = o.commitBytes ?? 16 * 2 ** 20;
  const retries = o.retries ?? 4;
  const sleep = o.sleep ?? wait;

  // Resume from saved progress when it belongs to this exact file and the file on disk has at least that much.
  let saved = await o.store.load();
  if (saved && (saved.modelId !== o.modelId || saved.sha256 !== o.sha256 || saved.bytes !== o.bytes || o.sink.size() < saved.done)) saved = undefined;
  if (saved?.complete && o.sink.size() === o.bytes) {
    o.onProgress?.(o.bytes, o.bytes);
    return;
  }
  let hash = saved ? Sha256.from(saved.hash) : new Sha256();
  let done = saved ? saved.done : 0;
  if (o.sink.size() !== done) o.sink.truncate(done);

  const progress = (): DownloadProgress => ({ modelId: o.modelId, sha256: o.sha256, bytes: o.bytes, done, hash: hash.state() });
  const checkpoint = async () => {
    o.sink.flush();
    await o.store.save(progress());
  };
  o.onProgress?.(done, o.bytes);

  let failures = 0;
  while (done < o.bytes) {
    if (o.signal?.aborted) {
      await checkpoint();
      throw new DownloadError("aborted", "Download stopped");
    }
    const end = Math.min(done + chunk, o.bytes) - 1;
    const before = done;
    try {
      const res = await doFetch(o.url, { headers: { Range: `bytes=${done}-${end}` }, signal: o.signal, cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer" });
      if (res.status === 200) {
        // The server ignored the range: only acceptable for a small file read from the start.
        if (done !== 0 || o.bytes > chunk) throw new DownloadError("no-range", "The download server cannot resume downloads");
      } else if (res.status === 206) {
        const start = Number(/bytes\s+(\d+)-/.exec(res.headers.get("content-range") ?? "")?.[1]);
        if (start !== done) throw new DownloadError("no-range", `The download server sent the wrong part (${start} instead of ${done})`);
      } else if (res.status === 416 || res.status === 404 || res.status === 403 || res.status === 410) {
        throw new DownloadError("http", `The download server answered ${res.status}`);
      } else {
        throw new DownloadError("network", `The download server answered ${res.status}`);
      }
      if (!res.body) throw new DownloadError("network", "Empty answer from the download server");
      const reader = res.body.getReader();
      let sinceCommit = 0;
      try {
        for (;;) {
          const { done: finished, value } = await reader.read();
          if (finished) break;
          if (!value?.length) continue;
          const room = end + 1 - done;
          const piece = value.length > room ? value.subarray(0, room) : value;
          o.sink.write(piece, done);
          hash.update(piece);
          done += piece.length;
          sinceCommit += piece.length;
          if (sinceCommit >= commit) {
            sinceCommit = 0;
            await checkpoint();
          }
          o.onProgress?.(done, o.bytes);
          if (done > end) break;
        }
      } finally {
        reader.cancel().catch(() => undefined);
      }
      await checkpoint();
      if (done <= end) throw new DownloadError("network", "The connection closed early");
      failures = 0;
    } catch (e) {
      // Keep whatever arrived (it is hashed and written in order), then retry or give up.
      await checkpoint().catch(() => undefined);
      if (o.signal?.aborted || (e as Error)?.name === "AbortError") throw new DownloadError("aborted", "Download stopped");
      if (e instanceof DownloadError && (e.code === "http" || e.code === "no-range")) throw e;
      if (done === before) failures++;
      else failures = 0;
      if (failures > retries) throw e instanceof DownloadError ? e : new DownloadError("network", `Network error: ${(e as Error)?.message ?? e}`);
      await sleep(Math.min(30_000, 1000 * 2 ** failures));
    }
  }

  const digest = hash.hex();
  if (o.sink.size() !== o.bytes || digest !== o.sha256) {
    o.sink.truncate(0);
    o.sink.flush();
    await o.store.clear();
    throw new DownloadError("mismatch", "The downloaded file did not match the expected one, so it was deleted. Please try again.");
  }
  hash = new Sha256(); // the finished hash cannot be saved again
  await o.store.save({ modelId: o.modelId, sha256: o.sha256, bytes: o.bytes, done, hash: hash.state(), complete: true });
}

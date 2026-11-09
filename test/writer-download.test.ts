// @vitest-environment node
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { DownloadError, downloadModel, MAX_CHUNK_BYTES, type ByteSink, type DownloadProgress, type ProgressStore } from "../src/shared/writer/download";
import { Sha256 } from "../src/shared/writer/sha256";

const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");

function bytesOf(n: number, seed = 7): Uint8Array {
  const b = new Uint8Array(n);
  let x = seed;
  for (let i = 0; i < n; i++) {
    x = (x * 1103515245 + 12345) >>> 0;
    b[i] = x >>> 24;
  }
  return b;
}

class MemorySink implements ByteSink {
  data = new Uint8Array(0);
  flushes = 0;
  size() { return this.data.length; }
  write(d: Uint8Array, at: number) {
    if (at + d.length > this.data.length) {
      const grown = new Uint8Array(at + d.length);
      grown.set(this.data);
      this.data = grown;
    }
    this.data.set(d, at);
  }
  truncate(n: number) { this.data = this.data.slice(0, n); }
  flush() { this.flushes++; }
}

class MemoryStore implements ProgressStore {
  value?: DownloadProgress;
  async load() { return this.value && JSON.parse(JSON.stringify(this.value)); }
  async save(p: DownloadProgress) { this.value = JSON.parse(JSON.stringify(p)); }
  async clear() { this.value = undefined; }
}

interface ServerOptions {
  /** Ignore Range headers. */
  noRange?: boolean;
  /** Stop the body after this many bytes of the response (simulates a dropped connection), once per listed request. */
  cutAfter?: Record<number, number>;
  /** Abort this controller once this many bytes were sent overall. */
  abortAt?: { bytes: number; ctrl: AbortController };
}

/** A fake server with Range support, streaming in 64 KB pieces. Records each requested range. */
function server(file: Uint8Array, opts: ServerOptions = {}) {
  const ranges: string[] = [];
  let sent = 0;
  const f = (async (_url: string, init?: RequestInit) => {
    const range = new Headers(init?.headers).get("range") ?? "";
    ranges.push(range);
    const signal = init?.signal;
    if (signal?.aborted) throw new DOMException("aborted", "AbortError");
    const m = /bytes=(\d+)-(\d+)/.exec(range);
    const [start, end] = m && !opts.noRange ? [Number(m[1]), Math.min(Number(m[2]), file.length - 1)] : [0, file.length - 1];
    const body = file.subarray(start, end + 1);
    const cut = opts.cutAfter?.[ranges.length - 1];
    let pos = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(c) {
        if (signal?.aborted) return c.error(new DOMException("aborted", "AbortError"));
        if (cut !== undefined && pos >= cut) return c.error(new TypeError("network error"));
        if (pos >= body.length) return c.close();
        const n = Math.min(65536, body.length - pos, cut !== undefined ? cut - pos : Infinity);
        c.enqueue(body.slice(pos, pos + n));
        pos += n;
        sent += n;
        if (opts.abortAt && sent >= opts.abortAt.bytes) opts.abortAt.ctrl.abort();
      },
    });
    const headers = new Headers(m && !opts.noRange ? { "content-range": `bytes ${start}-${end}/${file.length}` } : {});
    return new Response(stream, { status: m && !opts.noRange ? 206 : 200, headers });
  }) as unknown as typeof fetch;
  return { fetch: f, ranges };
}

const noSleep = async () => undefined;

describe("incremental SHA-256", () => {
  it("matches node's hash for empty, short, block-edge and multi-piece input", () => {
    for (const n of [0, 3, 55, 56, 63, 64, 65, 1000, 200_001]) {
      const b = bytesOf(n, n);
      const h = new Sha256();
      for (let i = 0; i < n; i += 997) h.update(b.subarray(i, i + 997));
      expect(h.hex()).toBe(sha(b));
    }
  });
  it("can be saved and restored mid-stream", () => {
    const b = bytesOf(10_000);
    const a = new Sha256().update(b.subarray(0, 4321));
    const resumed = Sha256.from(JSON.parse(JSON.stringify(a.state())));
    expect(resumed.update(b.subarray(4321)).hex()).toBe(sha(b));
  });
});

describe("model download", () => {
  const file = bytesOf(1_000_000);
  const base = { modelId: "m", url: "https://example.test/m.gguf", bytes: file.length, sha256: sha(file), sleep: noSleep };

  it("downloads in Range chunks, verifies the hash and records completion", async () => {
    const sink = new MemorySink();
    const store = new MemoryStore();
    const s = server(file);
    const seen: number[] = [];
    await downloadModel({ ...base, sink, store, fetch: s.fetch, chunkBytes: 300_000, commitBytes: 100_000, onProgress: (d) => seen.push(d) });
    expect(sha(sink.data)).toBe(base.sha256);
    expect(s.ranges).toEqual(["bytes=0-299999", "bytes=300000-599999", "bytes=600000-899999", "bytes=900000-999999"]);
    expect(store.value?.complete).toBe(true);
    expect(seen.at(-1)).toBe(file.length);
    // A second call finds the finished file and requests nothing.
    const again = server(file);
    await downloadModel({ ...base, sink, store, fetch: again.fetch });
    expect(again.ranges).toEqual([]);
  });

  it("never asks for more than 500 MB in one request", async () => {
    expect(MAX_CHUNK_BYTES).toBeLessThanOrEqual(500_000_000);
    const s = server(file);
    await downloadModel({ ...base, sink: new MemorySink(), store: new MemoryStore(), fetch: s.fetch, chunkBytes: 5e9 });
    expect(s.ranges).toEqual([`bytes=0-${file.length - 1}`]);
  });

  it("resumes after the user stops it, without re-downloading what arrived", async () => {
    const sink = new MemorySink();
    const store = new MemoryStore();
    const ctrl = new AbortController();
    const s1 = server(file, { abortAt: { bytes: 420_000, ctrl } });
    await expect(downloadModel({ ...base, sink, store, fetch: s1.fetch, chunkBytes: 300_000, commitBytes: 50_000, signal: ctrl.signal }))
      .rejects.toMatchObject({ code: "aborted" });
    const doneBefore = store.value!.done;
    expect(doneBefore).toBeGreaterThanOrEqual(300_000);
    expect(sink.size()).toBe(doneBefore);
    const s2 = server(file);
    await downloadModel({ ...base, sink, store, fetch: s2.fetch, chunkBytes: 300_000 });
    expect(s2.ranges[0]).toBe(`bytes=${doneBefore}-${doneBefore + 299_999}`);
    expect(sha(sink.data)).toBe(base.sha256);
  });

  it("resumes after a browser crash that left unsaved bytes in the file", async () => {
    const sink = new MemorySink();
    const store = new MemoryStore();
    const half = file.subarray(0, 500_000);
    sink.write(file.subarray(0, 650_000), 0); // written, but progress was saved only up to 500,000
    await store.save({ modelId: "m", sha256: base.sha256, bytes: file.length, done: 500_000, hash: new Sha256().update(half).state() });
    const s = server(file);
    await downloadModel({ ...base, sink, store, fetch: s.fetch, chunkBytes: 1_000_000 });
    expect(s.ranges).toEqual(["bytes=500000-999999"]);
    expect(sha(sink.data)).toBe(base.sha256);
  });

  it("retries a dropped connection from where it stopped", async () => {
    const sink = new MemorySink();
    const s = server(file, { cutAfter: { 0: 123_456 } });
    await downloadModel({ ...base, sink, store: new MemoryStore(), fetch: s.fetch, chunkBytes: 400_000 });
    expect(s.ranges.slice(0, 2)).toEqual(["bytes=0-399999", "bytes=123456-523455"]);
    expect(sha(sink.data)).toBe(base.sha256);
  });

  it("deletes the file when the hash does not match", async () => {
    const sink = new MemorySink();
    const store = new MemoryStore();
    const tampered = file.slice();
    tampered[777] = tampered[777]! ^ 0xff;
    await expect(downloadModel({ ...base, sink, store, fetch: server(tampered).fetch }))
      .rejects.toMatchObject({ code: "mismatch" });
    expect(sink.size()).toBe(0);
    expect(store.value).toBeUndefined();
  });

  it("starts again when the saved progress belongs to another file", async () => {
    const sink = new MemorySink();
    const store = new MemoryStore();
    sink.write(bytesOf(1000, 99), 0);
    await store.save({ modelId: "other", sha256: "x", bytes: 5, done: 1000, hash: new Sha256().state() });
    const s = server(file);
    await downloadModel({ ...base, sink, store, fetch: s.fetch, chunkBytes: 2_000_000 });
    expect(s.ranges[0]).toBe("bytes=0-999999");
    expect(sha(sink.data)).toBe(base.sha256);
  });

  it("refuses a server that cannot resume a big file", async () => {
    await expect(downloadModel({ ...base, sink: new MemorySink(), store: new MemoryStore(), fetch: server(file, { noRange: true }).fetch, chunkBytes: 100_000 }))
      .rejects.toBeInstanceOf(DownloadError);
  });

  it("gives up after repeated network failures, keeping the progress", async () => {
    const store = new MemoryStore();
    const failing = (async () => { throw new TypeError("offline"); }) as unknown as typeof fetch;
    await expect(downloadModel({ ...base, sink: new MemorySink(), store, fetch: failing, retries: 2 })).rejects.toMatchObject({ code: "network" });
    expect(store.value?.done).toBe(0);
  });
});

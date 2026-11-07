import { describe, expect, it } from "vitest";
import { chooseWriter, pickTier, TIER_THRESHOLDS, type Hardware } from "../src/shared/writer/tier";
import { CATALOG, gb, modelUrl } from "../src/shared/writer/catalog";

const hw = (h: Partial<Hardware>): Hardware => ({ threads: 4, webgpu: false, ...h });
const id = (h: Partial<Hardware>) => {
  const t = pickTier(hw(h));
  return t.kind === "model" ? t.model.id : `none:${t.reason}`;
};

describe("PC tier", () => {
  it("gives no writer to computers with too little memory or a single thread", () => {
    expect(id({ totalGiB: 3.8 })).toBe("none:memory");
    expect(id({ totalGiB: 5.2 })).toBe("none:memory");
    expect(id({ totalGiB: 16, threads: 1 })).toBe("none:threads");
  });
  it("picks by memory and threads (the user's i3 laptop: 8 GB, 4 threads)", () => {
    expect(id({ totalGiB: 7.8, threads: 4 })).toBe("qwen3-1.7b");
    expect(id({ totalGiB: 7.8, threads: 2 })).toBe("qwen3.5-0.8b");
    expect(id({ totalGiB: 5.9, threads: 8 })).toBe("qwen3.5-0.8b");
    expect(id({ totalGiB: 15.8, threads: 8 })).toBe("qwen3.5-2b");
    expect(id({ totalGiB: 15.8, threads: 8, webgpu: true })).toBe("qwen3.5-4b");
    expect(id({ totalGiB: 31.9, threads: 16, webgpu: false })).toBe("qwen3.5-2b");
  });
  it("assumes an ordinary 8 GB computer when memory cannot be read", () => {
    expect(id({ threads: 4 })).toBe("qwen3-1.7b");
  });
  it("steps down when too little memory is free right now", () => {
    expect(id({ totalGiB: 7.8, availableGiB: 0.9, threads: 4 })).toBe("qwen3.5-0.8b");
    expect(id({ totalGiB: 7.8, availableGiB: 0.3, threads: 4 })).toBe("qwen3.5-0.8b"); // smallest: still offered
  });
  it("steps down after a slow speed test, and gives up when even the smallest is too slow", () => {
    expect(id({ totalGiB: 7.8, threads: 4, tokensPerSec: { "qwen3-1.7b": 1.2 } })).toBe("qwen3.5-0.8b");
    expect(id({ totalGiB: 7.8, threads: 4, tokensPerSec: { "qwen3-1.7b": 1.2, "qwen3.5-0.8b": 1.0 } })).toBe("none:slow");
    expect(id({ totalGiB: 7.8, threads: 4, tokensPerSec: { "qwen3-1.7b": 6 } })).toBe("qwen3-1.7b");
  });
  it("keeps every threshold model in the catalog", () => {
    for (const t of TIER_THRESHOLDS.models) expect(CATALOG.some((m) => m.id === t.id)).toBe(true);
  });
});

describe("writer choice", () => {
  const local = pickTier(hw({ totalGiB: 7.8 }));
  const none = pickTier(hw({ totalGiB: 4 }));
  it("uses Gemini Nano when it is ready", () => {
    expect(chooseWriter("available", local)).toMatchObject({ writer: "nano", offerNano: false });
  });
  it("offers the Nano download and still offers our model", () => {
    expect(chooseWriter("downloadable", local)).toMatchObject({ writer: "local", offerNano: true, local: { id: "qwen3-1.7b" } });
    expect(chooseWriter("downloading", local)).toMatchObject({ offerNano: true });
  });
  it("falls back to our model, or to none on a small computer", () => {
    expect(chooseWriter("unavailable", local)).toMatchObject({ writer: "local", offerNano: false });
    expect(chooseWriter("unavailable", none)).toMatchObject({ writer: "none", noneReason: "memory" });
    expect(chooseWriter("downloadable", none)).toMatchObject({ writer: "nano", offerNano: true });
  });
});

describe("catalog", () => {
  it("pins Apache-2.0 files to a revision with a SHA-256", () => {
    for (const m of CATALOG) {
      expect(m.license).toBe("apache-2.0");
      expect(m.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(m.revision).toMatch(/^[0-9a-f]{40}$/);
      expect(modelUrl(m)).toBe(`https://huggingface.co/${m.repo}/resolve/${m.revision}/${m.file}`);
    }
    expect(modelUrl(CATALOG[0]!, "http://127.0.0.1:8182/")).toMatch(/^http:\/\/127\.0\.0\.1:8182\/unsloth\//);
    expect(gb(1_107_409_472)).toBe("1.1 GB");
  });
});

// Which writer each kind of real computer gets (PROVISIONAL thresholds; the user's Chrome-only speed test sets the
// final ones). One row per common device, on every desktop OS Chrome extensions run on (Windows, macOS, Linux,
// ChromeOS). Phones and Firefox/Safari cannot run Chrome extensions at all.
import { describe, expect, it } from "vitest";
import { chooseWriter, engineSupported, pickTier, type Hardware } from "../src/shared/writer/tier";
import { noWriterText } from "../src/sidepanel/drafts";

const ok = { wasmOk: true, freeDiskGiB: 100 };
const rows: Array<[string, Hardware, string]> = [
  ["Chromebook, 4 GB, 2 threads (ChromeOS)", { totalGiB: 3.8, availableGiB: 1.5, threads: 2, webgpu: false, ...ok }, "none:memory"],
  ["Budget laptop, 8 GB, i3 4 threads (Windows, the user's laptop)", { totalGiB: 7.8, availableGiB: 3, threads: 4, webgpu: true, ...ok }, "qwen3-1.7b"],
  ["Same laptop with many tabs open (1 GB free)", { totalGiB: 7.8, availableGiB: 1, threads: 4, webgpu: true, ...ok }, "qwen3.5-0.8b"],
  ["Old dual-core, 8 GB, 2 threads (Linux)", { totalGiB: 7.7, availableGiB: 4, threads: 2, webgpu: false, ...ok }, "qwen3.5-0.8b"],
  ["Office PC, 16 GB, 8 threads, no usable GPU (Windows)", { totalGiB: 15.8, availableGiB: 9, threads: 8, webgpu: false, ...ok }, "qwen3.5-2b"],
  ["MacBook Air M2, 8 GB, 8 cores (macOS)", { totalGiB: 8, availableGiB: 3, threads: 8, webgpu: true, ...ok }, "qwen3-1.7b"],
  ["MacBook Pro M3, 18 GB, 11 cores (macOS)", { totalGiB: 18, availableGiB: 10, threads: 11, webgpu: true, ...ok }, "qwen3.5-4b"],
  ["Gaming desktop, 32 GB, 16 threads, GPU (Windows)", { totalGiB: 31.9, availableGiB: 20, threads: 16, webgpu: true, ...ok }, "qwen3.5-4b"],
  ["Workstation, 32 GB, 16 threads, GPU blocked (Linux)", { totalGiB: 31.9, availableGiB: 20, threads: 16, webgpu: false, ...ok }, "qwen3.5-2b"],
  ["Brave hides the core count (reports 2)", { totalGiB: 15.8, availableGiB: 8, threads: 2, webgpu: false, ...ok }, "qwen3.5-0.8b"],
  ["Memory unreadable (permission missing): treated as 8 GB", { threads: 4, webgpu: false, ...ok }, "qwen3-1.7b"],
  ["Chrome older than 137 (no JSPI / 64-bit memory)", { totalGiB: 15.8, availableGiB: 8, threads: 8, webgpu: true, wasmOk: false, freeDiskGiB: 100 }, "none:browser"],
  ["Disk nearly full: 1.2 GB free (only the smallest model fits)", { totalGiB: 15.8, availableGiB: 8, threads: 8, webgpu: false, wasmOk: true, freeDiskGiB: 1.2 }, "qwen3.5-0.8b"],
  ["Disk full: 0.8 GB free", { totalGiB: 15.8, availableGiB: 8, threads: 8, webgpu: false, wasmOk: true, freeDiskGiB: 0.8 }, "none:disk"],
  ["Measured too slow on every model it could run", { totalGiB: 7.8, availableGiB: 3, threads: 4, webgpu: false, ...ok, tokensPerSec: { "qwen3-1.7b": 1.2, "qwen3.5-0.8b": 1.5 } }, "none:slow"],
  ["Measured slow on 1.7B but fine on 0.8B", { totalGiB: 7.8, availableGiB: 3, threads: 4, webgpu: false, ...ok, tokensPerSec: { "qwen3-1.7b": 1.2, "qwen3.5-0.8b": 2.4 } }, "qwen3.5-0.8b"],
];

describe("writer per device", () => {
  it.each(rows)("%s", (_name, hw, expected) => {
    const t = pickTier(hw);
    expect(t.kind === "model" ? t.model.id : `none:${t.reason}`).toBe(expected);
  });

  it("Gemini Nano (when Chrome has it ready) wins on any device, even one too small for our models", () => {
    expect(chooseWriter("available", pickTier(rows[0]![1])).writer).toBe("nano");
  });

  it("every 'no writer' reason has a plain message with the one thing to do", () => {
    expect(noWriterText("browser")).toMatch(/update Chrome.*Help.*About Google Chrome/);
    expect(noWriterText("disk")).toMatch(/not enough free space.*Delete some files/);
    expect(noWriterText("memory")).toMatch(/not powerful enough/);
    for (const r of ["memory", "threads", "slow", "browser", "disk", undefined] as const) expect(noWriterText(r)).toMatch(/write this answer yourself/);
  });
});

describe("engineSupported", () => {
  const MEM64 = new Uint8Array([0, 0x61, 0x73, 0x6d, 1, 0, 0, 0, 5, 3, 1, 4, 1]);
  it("needs both JSPI and 64-bit memory", () => {
    const fake = (jspi: boolean, mem64: boolean) =>
      ({ Suspending: jspi ? function Suspending() {} : undefined, validate: (b: Uint8Array) => (b.length === MEM64.length ? mem64 : true) }) as unknown as typeof WebAssembly;
    expect(engineSupported(fake(true, true))).toBe(true);
    expect(engineSupported(fake(false, true))).toBe(false);
    expect(engineSupported(fake(true, false))).toBe(false);
    expect(engineSupported(undefined)).toBe(false);
  });
  it("the 64-bit memory test module is valid WebAssembly", () => {
    expect(WebAssembly.validate(MEM64)).toBe(true);
  });
});

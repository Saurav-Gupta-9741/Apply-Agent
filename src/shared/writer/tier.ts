/** Which writer this computer gets: Chrome's built-in model when it is ready, otherwise one of our own models sized to
 * the computer (memory, processor threads, graphics chip, and the measured speed once known), or none at all (then the
 * user writes the answer; the length counter and the checks still help). The choice is a pure function, tested; the
 * probe that reads the hardware is a thin wrapper. */

import { CATALOG, modelById, type WriterModel } from "./catalog";

/** PROVISIONAL thresholds. The user's Chrome-only speed test (step 0) sets the final numbers; change them only here.
 * Memory is in GiB as Chrome reports it (an "8 GB" laptop reports about 7.6–7.9). Speeds are words-pieces (tokens) per
 * second while writing: at 2 tokens/s a 150-word answer takes about 2 minutes. */
export const TIER_THRESHOLDS = {
  /** Below this much memory in total: no on-device writer. */
  minTotalGiB: 5.5,
  minThreads: 2,
  /** Each model, biggest first: the first one the computer meets is chosen. */
  models: [
    { id: "qwen3.5-4b", minTotalGiB: 15, minThreads: 8, needsWebGPU: true, minTokensPerSec: 4 },
    { id: "qwen3.5-2b", minTotalGiB: 11.5, minThreads: 8, needsWebGPU: false, minTokensPerSec: 3 },
    { id: "qwen3-1.7b", minTotalGiB: 7, minThreads: 4, needsWebGPU: false, minTokensPerSec: 2.5 },
    { id: "qwen3.5-0.8b", minTotalGiB: 5.5, minThreads: 2, needsWebGPU: false, minTokensPerSec: 2 },
  ],
  /** The model's size plus this much must be free right now, or a smaller model is chosen. */
  freeHeadroomGiB: 0.4,
  /** How long the speed test may run. */
  speedTestMs: 10_000,
} as const;

export interface Hardware {
  /** Total memory, GiB (undefined when it cannot be read). */
  totalGiB?: number;
  /** Free memory now, GiB. */
  availableGiB?: number;
  threads: number;
  webgpu: boolean;
  /** Measured writing speed per model id (tokens per second), from the speed test after the first setup. */
  tokensPerSec?: Record<string, number>;
}

export type Tier =
  | { kind: "model"; model: WriterModel }
  | { kind: "none"; reason: "memory" | "threads" | "slow" };

/** The on-device model for this computer, or none. */
export function pickTier(hw: Hardware): Tier {
  const total = hw.totalGiB;
  if (total !== undefined && total < TIER_THRESHOLDS.minTotalGiB) return { kind: "none", reason: "memory" };
  if (hw.threads < TIER_THRESHOLDS.minThreads) return { kind: "none", reason: "threads" };
  let tooSlow = false;
  for (const t of TIER_THRESHOLDS.models) {
    const model = modelById(t.id)!;
    // Unknown memory (no permission): assume an ordinary 8 GB computer.
    if ((total ?? 7.5) < t.minTotalGiB || hw.threads < t.minThreads || (t.needsWebGPU && !hw.webgpu)) continue;
    const measured = hw.tokensPerSec?.[t.id];
    if (measured !== undefined && measured < t.minTokensPerSec) {
      tooSlow = true;
      continue;
    }
    const smaller = TIER_THRESHOLDS.models.slice(TIER_THRESHOLDS.models.indexOf(t) + 1);
    if (hw.availableGiB !== undefined && smaller.length && hw.availableGiB < model.bytes / 2 ** 30 + TIER_THRESHOLDS.freeHeadroomGiB) continue;
    return { kind: "model", model };
  }
  return tooSlow ? { kind: "none", reason: "slow" } : { kind: "model", model: modelById(TIER_THRESHOLDS.models[TIER_THRESHOLDS.models.length - 1]!.id)! };
}

export type NanoStatus = "available" | "downloadable" | "downloading" | "unavailable";

export interface WriterChoice {
  /** What writes the drafts now. */
  writer: "nano" | "local" | "none";
  /** Offer the "Download Chrome's built-in AI" button (Chrome can fetch Gemini Nano). */
  offerNano: boolean;
  /** Our own model for this computer (also offered next to the Nano download). */
  local?: WriterModel;
  /** Why there is no writer. */
  noneReason?: "memory" | "threads" | "slow";
}

/** Gemini Nano first when it is ready; when Chrome can download it, offer that and still offer our model. */
export function chooseWriter(nano: NanoStatus, tier: Tier): WriterChoice {
  const local = tier.kind === "model" ? tier.model : undefined;
  if (nano === "available") return { writer: "nano", offerNano: false, local };
  const offerNano = nano === "downloadable" || nano === "downloading";
  if (local) return { writer: "local", offerNano, local };
  return { writer: offerNano ? "nano" : "none", offerNano, noneReason: tier.kind === "none" ? tier.reason : undefined };
}

/** Reads the hardware (thin and untested by design: each part fails soft). chrome.system.memory needs the
 * "system.memory" permission; without it the memory is read as unknown. */
export async function probeHardware(): Promise<Omit<Hardware, "tokensPerSec">> {
  let totalGiB: number | undefined;
  let availableGiB: number | undefined;
  try {
    const mem = await (chrome as unknown as { system?: { memory?: { getInfo(): Promise<{ capacity: number; availableCapacity: number }> } } }).system?.memory?.getInfo();
    if (mem) {
      totalGiB = mem.capacity / 2 ** 30;
      availableGiB = mem.availableCapacity / 2 ** 30;
    }
  } catch {
    /* no permission */
  }
  if (totalGiB === undefined) {
    // navigator.deviceMemory is rounded and capped at 8: only trust it to say "small".
    const dm = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    if (dm !== undefined && dm < 8) totalGiB = dm;
  }
  let webgpu = false;
  try {
    const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
    webgpu = !!(gpu && (await gpu.requestAdapter()));
  } catch {
    /* no WebGPU */
  }
  return { totalGiB, availableGiB, threads: navigator.hardwareConcurrency || 2, webgpu };
}

/** The catalog, smallest first (for the "use a smaller model" choice). */
export const SMALLEST_FIRST = [...CATALOG].sort((a, b) => a.bytes - b.bytes);

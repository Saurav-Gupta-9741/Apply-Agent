/** Messages between the side panel and the writing engine in the offscreen page (over a runtime port named
 * WRITER_PORT). The offscreen page has no access to extension storage, so the panel sends everything a draft needs. */

import type { DraftRequest } from "./prompt";

export const WRITER_PORT = "applyagent-writer";

export interface ModelFileState {
  /** Bytes on disk so far. */
  done: number;
  bytes: number;
  /** Downloaded and verified. */
  complete: boolean;
}

export interface WriterStatus {
  files: Record<string, ModelFileState>;
  download?: { modelId: string; done: number; bytes: number };
  loading?: string;
  loaded?: string;
  /** Ids waiting to be drafted, in order; `running` is being drafted now. */
  queue: string[];
  running?: string;
  /** Finished drafts kept while the browser is open (so a reopened panel still shows them). */
  finished: Record<string, { raw: string; ms: number }>;
  crossOriginIsolated: boolean;
  threads: number;
}

export type ToWriter =
  | { type: "status" }
  | { type: "download"; modelId: string; /** Test builds only: where the model files are served. */ baseUrl?: string }
  | { type: "cancel-download" }
  | { type: "remove"; modelId: string }
  | { type: "draft"; modelId: string; request: DraftRequest }
  | { type: "stop"; id: string }
  | { type: "speed-test"; modelId: string };

export type FromWriter =
  | { type: "status"; status: WriterStatus }
  | { type: "token"; id: string; text: string }
  | { type: "draft-done"; id: string; raw: string; ms: number; tokensPerSec?: number }
  | { type: "draft-error"; id: string; message: string }
  | { type: "download-error"; modelId: string; code: string; message: string }
  | { type: "speed"; modelId: string; tokensPerSec: number };

/** A stable id for a question of a job: the same question on the same job maps to the same draft. */
export function draftId(job: { title: string; company: string }, question: string): string {
  const s = `${job.company}\u0000${job.title}\u0000${question}`;
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return `d${(h >>> 0).toString(36)}${s.length.toString(36)}`;
}

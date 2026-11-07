/** The on-device writing engine: llama.cpp compiled to WebAssembly (wllama, MIT), running in the extension's offscreen
 * page so it keeps working when the side panel is closed. Loads the model from the browser's private storage, writes
 * one draft at a time, streams the words as they come, can be stopped, and is unloaded when idle to free memory.
 * Nothing leaves the computer. */

// The published build (the package has no "exports"; its root index.ts is the raw source).
import { LoggerWithoutDebug, Wllama } from "@wllama/wllama/esm/index.js";

export interface GenerateResult {
  text: string;
  tokensPerSec?: number;
  stopped: boolean;
}

type Messages = Array<{ role: "system" | "user"; content: string }>;

/** Threads for the model: all but one (the browser needs one to stay responsive). Multi-threaded WebAssembly needs a
 * cross-origin isolated page; without it, one thread. */
export function threadsToUse(isolated: boolean, cores: number): number {
  return isolated ? Math.max(1, Math.min(8, (cores || 2) - 1)) : 1;
}

export class WriterEngine {
  private w?: Wllama;
  private id?: string;

  constructor(private wasmUrl: string) {}

  get loaded(): string | undefined {
    return this.id;
  }

  async load(id: string, file: Blob, opts: { gpu?: boolean } = {}): Promise<void> {
    if (this.w && this.id === id) return;
    await this.unload();
    const w = new Wllama({ default: this.wasmUrl }, { logger: LoggerWithoutDebug });
    try {
      await w.loadModel([file], {
        // Prompts are ~600-800 tokens (rules, facts, a short job description, 4 resume lines) plus up to 480 written.
        n_ctx: 1536,
        n_batch: 256,
        n_ubatch: 256,
        n_threads: threadsToUse(self.crossOriginIsolated, navigator.hardwareConcurrency),
        n_gpu_layers: opts.gpu && w.isSupportWebGPU() ? 999 : 0,
        default_template_kwargs: { enable_thinking: false },
      });
    } catch (e) {
      await w.exit().catch(() => undefined);
      throw e;
    }
    this.w = w;
    this.id = id;
  }

  /** Writes an answer, calling `onText` with the text so far. Stops early (stopped: true) when `signal` aborts. */
  async generate(messages: Messages, maxTokens: number, signal: AbortSignal, onText: (text: string) => void): Promise<GenerateResult> {
    if (!this.w) throw new Error("The writing model is not loaded");
    let text = "";
    let tokensPerSec: number | undefined;
    try {
      await this.w.createChatCompletion({
        messages,
        stream: true,
        max_tokens: maxTokens,
        temperature: 0.3,
        top_k: 20,
        top_p: 0.9,
        penalty_repeat: 1.05,
        cache_prompt: true, // the shared start of the prompt is reused between the questions of a job
        chat_template_kwargs: { enable_thinking: false },
        abortSignal: signal,
        onData: (chunk) => {
          const d = chunk.choices?.[0]?.delta?.content;
          if (d) {
            text += d;
            onText(text);
          }
          const t = (chunk as { timings?: { predicted_per_second?: number } }).timings;
          if (t?.predicted_per_second) tokensPerSec = t.predicted_per_second;
        },
      });
    } catch (e) {
      if (!signal.aborted) throw e;
    }
    return { text, tokensPerSec, stopped: signal.aborted };
  }

  /** Writing speed on this computer (tokens per second), measured for at most `ms`. */
  async speedTest(ms: number): Promise<number> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);
    const t0 = performance.now();
    let first = 0;
    let pieces = 0;
    try {
      const r = await this.generate(
        [{ role: "user", content: "Write three short sentences about why clear documentation helps a software team." }],
        64, ctrl.signal, () => {
          if (!first) first = performance.now();
          pieces++;
        });
      if (r.tokensPerSec && !r.stopped) return r.tokensPerSec;
    } finally {
      clearTimeout(timer);
    }
    const secs = (performance.now() - (first || t0)) / 1000;
    return secs > 0 ? pieces / secs : 0;
  }

  async unload(): Promise<void> {
    const w = this.w;
    this.w = undefined;
    this.id = undefined;
    await w?.exit().catch(() => undefined);
  }
}

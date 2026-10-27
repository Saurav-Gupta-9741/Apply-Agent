/** The local question model, running in the extension's offscreen page: offline, on the user's computer, nothing is
 * sent anywhere. Loaded once, on first use. Answers { target: "offscreen", type: "UNDERSTAND", texts } with one reading
 * per text (or none when the model cannot run here; ApplyAgent then works with its rules alone). */

import * as ort from "onnxruntime-web/wasm";
import { encode, vocabFrom, type Vocab } from "../shared/wordpiece";
import { meanPool, readIntent, type IntentHead, type Reading } from "../shared/intent-model";

const MODEL_DIR = "intent/";

interface Loaded {
  session: ort.InferenceSession;
  vocab: Vocab;
  head: IntentHead;
}

let loading: Promise<Loaded> | undefined;

async function load(): Promise<Loaded> {
  ort.env.wasm.wasmPaths = chrome.runtime.getURL("ort/");
  ort.env.wasm.numThreads = 1; // extension pages are not cross-origin isolated: no shared memory for threads
  ort.env.wasm.proxy = false;
  const [modelBytes, tokenizer, head] = await Promise.all([
    fetch(chrome.runtime.getURL(`${MODEL_DIR}model_quantized.onnx`)).then((r) => r.arrayBuffer()),
    fetch(chrome.runtime.getURL(`${MODEL_DIR}tokenizer.json`)).then((r) => r.json()),
    fetch(chrome.runtime.getURL(`${MODEL_DIR}model.json`)).then((r) => r.json() as Promise<IntentHead>),
  ]);
  const session = await ort.InferenceSession.create(new Uint8Array(modelBytes), { executionProviders: ["wasm"] });
  return { session, vocab: vocabFrom(tokenizer), head };
}

/** One question per model run. The quantized model scales its numbers across everything in a run, so a padded batch
 * would make a question's confidence depend on the other questions beside it (by up to 0.03 in tests): a reading near
 * the threshold could then differ between Preview and Fill. ~25 ms per question once loaded; repeats are remembered. */
async function read(texts: string[]): Promise<Reading[]> {
  loading ??= load();
  const { session, vocab, head } = await loading;
  const out: Reading[] = [];
  for (const text of texts) {
    const ids = encode(text.slice(0, 300), vocab);
    const n = ids.length;
    const result = await session.run({
      input_ids: new ort.Tensor("int64", BigInt64Array.from(ids, BigInt), [1, n]),
      attention_mask: new ort.Tensor("int64", new BigInt64Array(n).fill(1n), [1, n]),
      token_type_ids: new ort.Tensor("int64", new BigInt64Array(n), [1, n]),
    });
    const hidden = result.last_hidden_state!;
    out.push(readIntent(meanPool(hidden.data as Float32Array, n, hidden.dims[2]!), head));
  }
  return out;
}

chrome.runtime.onMessage.addListener((message: { target?: string; type?: string; texts?: string[] }, _sender, sendResponse) => {
  if (message.target !== "offscreen" || message.type !== "UNDERSTAND" || !Array.isArray(message.texts)) return false;
  read(message.texts).then(sendResponse, (error: unknown) => {
    console.warn("ApplyAgent: local question model unavailable", error);
    loading = undefined; // try again next time
    sendResponse(null);
  });
  return true;
});

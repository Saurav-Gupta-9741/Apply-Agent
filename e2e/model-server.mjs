// Local stand-in for Hugging Face in the writer's end-to-end test (e2e/writer-llm.spec.ts): serves a model file by its
// name from the 500 MB pieces in MODEL_DIR (joined on the fly: no joined copy is written to disk), with HTTP Range
// support and the same CORS answer as the real CDN. GET /log lists the ranges asked for; GET /reset clears it.
//   MODEL_DIR=C:\Users\Lenovo\ApplyAgent-model-test\models node e2e/model-server.mjs   (port 8182, or MODEL_PORT)
import { createServer } from "node:http";
import { createReadStream, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const DIR = process.env.MODEL_DIR ?? "C:\\Users\\Lenovo\\ApplyAgent-model-test\\models";
const PORT = Number(process.env.MODEL_PORT ?? 8182);
/** Slow the answer to this many bytes per second (0 = full speed), so a test can interrupt a download. */
let throttle = Number(process.env.MODEL_THROTTLE ?? 0);
const log = [];

/** "Qwen3.5-0.8B-Q4_K_M.gguf" → its pieces in order, with sizes. */
function piecesOf(file) {
  const stem = file.replace(/\.gguf$/, "");
  const parts = readdirSync(DIR).filter((n) => n.startsWith(`${stem}.part`)).sort();
  return parts.map((n) => ({ path: join(DIR, n), size: statSync(join(DIR, n)).size }));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function sendRange(res, pieces, start, end) {
  let offset = 0;
  for (const p of pieces) {
    const pStart = offset, pEnd = offset + p.size - 1;
    offset += p.size;
    if (pEnd < start || pStart > end) continue;
    const from = Math.max(start, pStart) - pStart, to = Math.min(end, pEnd) - pStart;
    const stream = createReadStream(p.path, { start: from, end: to, highWaterMark: 1 << 20 });
    for await (const chunk of stream) {
      if (res.destroyed) return stream.destroy();
      if (!res.write(chunk)) await new Promise((r) => res.once("drain", r));
      if (throttle) await sleep((chunk.length / throttle) * 1000);
    }
  }
  res.end();
}

createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Range", "Access-Control-Expose-Headers": "Content-Range, Content-Length, ETag" };
  if (url.pathname === "/log") return res.writeHead(200, { "Content-Type": "application/json", ...cors }).end(JSON.stringify(log));
  if (url.pathname === "/reset") {
    log.length = 0;
    throttle = Number(url.searchParams.get("throttle") ?? 0);
    return res.writeHead(200, cors).end("ok");
  }
  if (req.method === "OPTIONS") return res.writeHead(204, { ...cors, "Access-Control-Allow-Methods": "GET" }).end();
  const name = decodeURIComponent(url.pathname.split("/").pop() ?? "");
  const pieces = name.endsWith(".gguf") ? piecesOf(name) : [];
  if (!pieces.length) return res.writeHead(404, cors).end("not found");
  const total = pieces.reduce((n, p) => n + p.size, 0);
  const m = /bytes=(\d+)-(\d*)/.exec(req.headers.range ?? "");
  log.push({ path: url.pathname, range: req.headers.range ?? null, at: Date.now() });
  if (!m) {
    res.writeHead(200, { ...cors, "Content-Length": total, "Content-Type": "application/octet-stream" });
    return sendRange(res, pieces, 0, total - 1);
  }
  const start = Number(m[1]);
  const end = Math.min(m[2] ? Number(m[2]) : total - 1, total - 1);
  if (start >= total || start > end) return res.writeHead(416, { ...cors, "Content-Range": `bytes */${total}` }).end();
  res.writeHead(206, { ...cors, "Content-Range": `bytes ${start}-${end}/${total}`, "Content-Length": end - start + 1, "Content-Type": "application/octet-stream" });
  return sendRange(res, pieces, start, end);
}).listen(PORT, "127.0.0.1", () => console.log(`model files on http://127.0.0.1:${PORT}`));

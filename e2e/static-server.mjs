// Tiny static server for the practice pages (reachable as 127.0.0.1 and localhost: two "different sites").
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../testpages/", import.meta.url));
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".json": "application/json" };

createServer(async (req, res) => {
  const relative = decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/^\/+/, "") || "apply.html";
  const file = resolve(join(ROOT, relative));
  if (!file.startsWith(resolve(ROOT) + sep)) return res.writeHead(400).end(); // no path traversal
  let body;
  try {
    body = await readFile(file); // read first: headers must not be sent before we know the file exists
  } catch {
    return res.writeHead(404).end("not found");
  }
  res.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" }).end(body);
}).listen(8181, "0.0.0.0", () => console.log("test pages on http://127.0.0.1:8181"));

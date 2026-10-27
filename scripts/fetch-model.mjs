// Downloads the small sentence model ApplyAgent runs offline (all-MiniLM-L6-v2, quantized, ~23 MB) into models/.
//   node scripts/fetch-model.mjs      (once; the build copies it into the extension)
import { existsSync, mkdirSync, writeFileSync } from "node:fs";

const DIR = "models/Xenova/all-MiniLM-L6-v2";
const BASE = "https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/main";
for (const file of ["config.json", "tokenizer.json", "tokenizer_config.json", "special_tokens_map.json", "onnx/model_quantized.onnx"]) {
  const target = `${DIR}/${file}`;
  if (existsSync(target)) continue;
  mkdirSync(target.slice(0, target.lastIndexOf("/")), { recursive: true });
  const response = await fetch(`${BASE}/${file}`);
  if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
  writeFileSync(target, Buffer.from(await response.arrayBuffer()));
  console.log(`fetched ${file}`);
}
console.log(`model ready in ${DIR}`);

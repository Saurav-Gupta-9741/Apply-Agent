// Bundles the extension into dist/ (load it via chrome://extensions → "Load unpacked" → dist).
//   node build.mjs           production build → dist/
//   node build.mjs --watch   rebuild on change
//   node build.mjs --test    end-to-end test build → dist-test/ (pre-allowed on the local test server only)
import { build, context } from "esbuild";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

const watch = process.argv.includes("--watch");
const testBuild = process.argv.includes("--test");
const outdir = testBuild ? "dist-test" : "dist";
export const TEST_ORIGINS = [
  "http://127.0.0.1:8181/*", "http://localhost:8181/*",
  // read-only live scans (e2e/live-scan.spec.ts) of real job boards
  "https://*.greenhouse.io/*", "https://*.lever.co/*", "https://*.ashbyhq.com/*",
  "https://*.smartrecruiters.com/*", "https://*.workable.com/*",
  "https://*.bamboohr.com/*", "https://*.teamtailor.com/*", "https://*.recruitee.com/*", "https://*.breezy.hr/*",
  "https://*.personio.com/*", "https://*.personio.de/*",
];

rmSync(outdir, { recursive: true, force: true });
mkdirSync(outdir);
cpSync("static", outdir, { recursive: true });
// Inter (SIL Open Font License) is bundled: extension pages never load remote fonts.
mkdirSync(`${outdir}/fonts`, { recursive: true });
cpSync("node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2", `${outdir}/fonts/inter-latin-wght.woff2`);
cpSync("node_modules/@fontsource-variable/inter/LICENSE", `${outdir}/fonts/OFL.txt`);
// The local question model (offline): the sentence model and its tokenizer (fetched once by scripts/fetch-model.mjs),
// the trained layer (static/intent/model.json, from scripts/train-intents.mjs) and the WebAssembly runtime to run it.
const MODEL = "models/Xenova/all-MiniLM-L6-v2";
if (!existsSync(`${MODEL}/onnx/model_quantized.onnx`)) {
  console.error(`Missing ${MODEL}: run "node scripts/fetch-model.mjs" once.`);
  process.exit(1);
}
cpSync(`${MODEL}/onnx/model_quantized.onnx`, `${outdir}/intent/model_quantized.onnx`);
cpSync(`${MODEL}/tokenizer.json`, `${outdir}/intent/tokenizer.json`);
mkdirSync(`${outdir}/ort`, { recursive: true });
for (const f of ["ort-wasm-simd-threaded.wasm", "ort-wasm-simd-threaded.mjs"]) cpSync(`node_modules/onnxruntime-web/dist/${f}`, `${outdir}/ort/${f}`);
if (testBuild) {
  const manifest = JSON.parse(readFileSync(`${outdir}/manifest.json`, "utf8"));
  manifest.host_permissions = TEST_ORIGINS;
  writeFileSync(`${outdir}/manifest.json`, JSON.stringify(manifest, null, 2));
}

const common = {
  outdir,
  bundle: true,
  target: "chrome116",
  sourcemap: watch ? "inline" : false,
  logLevel: testBuild ? "warning" : "info",
};

const configs = [
  { ...common, format: "esm", entryPoints: { background: "src/background/index.ts", sidepanel: "src/sidepanel/index.ts", offscreen: "src/offscreen/index.ts" } },
  // Injected scripts cannot be ES modules, so the content script is a classic script (IIFE).
  { ...common, format: "iife", entryPoints: { content: "src/content/index.ts" } },
];

if (testBuild) {
  // The React practice page: a real React app, because React ignores naive value assignment.
  configs.push({
    ...common, outdir: "testpages/build", format: "iife", entryPoints: { "react-app": "testpages/src/react-app.tsx" },
    define: { "process.env.NODE_ENV": '"production"' }, jsx: "automatic",
  });
}

if (watch) {
  for (const config of configs) await (await context(config)).watch();
} else {
  await Promise.all(configs.map((config) => build(config)));
}

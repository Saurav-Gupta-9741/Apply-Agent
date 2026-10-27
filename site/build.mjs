// Builds the website into site/dist/ with the values from site/site.config.json filled in.
// Refuses while any value is empty or any {{PLACEHOLDER}} is left, so an unfinished page is never published.
//   node site/build.mjs   → upload site/dist/ to Cloudflare Pages or GitHub Pages (free)
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";

const CONFIG = process.env.SITE_CONFIG ?? "site/site.config.json";
const OUT = process.env.SITE_OUT ?? "site/dist";
const config = JSON.parse(readFileSync(CONFIG, "utf8"));
const missing = Object.entries(config).filter(([, v]) => !String(v).trim()).map(([k]) => k);
if (missing.length) {
  console.error(`Fill these in ${CONFIG} first: ${missing.join(", ")}`);
  process.exit(1);
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
for (const file of readdirSync("site")) {
  if (file.endsWith(".html")) {
    const html = readFileSync(`site/${file}`, "utf8").replace(/\{\{(\w+)\}\}/g, (all, key) => config[key] ?? all);
    const left = html.match(/\{\{\w+\}\}/g);
    if (left) {
      console.error(`${file}: no value for ${[...new Set(left)].join(", ")}`);
      process.exit(1);
    }
    writeFileSync(`${OUT}/${file}`, html);
  } else if (/\.(css|svg)$/.test(file)) cpSync(`site/${file}`, `${OUT}/${file}`);
}
cpSync("store/screenshot-fill.png", `${OUT}/screenshot-fill.png`);
console.log(`${OUT} ready: ${readdirSync(OUT).join(", ")}`);

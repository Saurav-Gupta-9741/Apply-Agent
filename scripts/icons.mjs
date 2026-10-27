// Renders every logo asset from the one mark in brand-mark.mjs (run after changing the mark):
//   node scripts/icons.mjs
//   → static/icons/icon{16,32,48,128}.png        toolbar, extensions page and Chrome Web Store icons
//   → static/icons/working/w{0-9}-{16,32}.png    toolbar frames while the agent fills a form (the check draws)
//   → static/brand/mark{,-intro,-working,-celebrate}.svg   the side panel's logo, still and animated
//   → brand/                                      the same SVGs, a store promo tile and preview.html, for the web
import { chromium } from "@playwright/test";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { mark } from "./brand-mark.mjs";

mkdirSync("static/icons/working", { recursive: true });
mkdirSync("static/brand", { recursive: true });
mkdirSync("brand", { recursive: true });

const browser = await chromium.launch({ channel: "chromium" });
const page = await browser.newPage();

async function png(svg, size, path, { padding = 0, shadow = false } = {}) {
  const inner = size - 2 * padding;
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<style>html,body{margin:0;background:transparent}
    div{width:${size}px;height:${size}px;display:grid;place-items:center}
    svg{width:${inner}px;height:${inner}px;display:block${shadow ? ";filter:drop-shadow(0 2px 3px rgba(20,10,60,.35))" : ""}}</style><div>${svg}</div>`);
  await page.locator("div").screenshot({ path, omitBackground: true });
}

// Toolbar sizes get the heavier "small" drawing; the store icon keeps 16 px of padding, as the Web Store asks.
await png(mark({ variant: "small" }), 16, "static/icons/icon16.png");
await png(mark({ variant: "small" }), 32, "static/icons/icon32.png");
await png(mark(), 48, "static/icons/icon48.png", { padding: 2 });
await png(mark(), 128, "static/icons/icon128.png", { padding: 16, shadow: true });

// "Working" frames: the check draws itself, holds, and starts again.
const PROGRESS = [0.04, 0.22, 0.42, 0.62, 0.82, 1, 1, 1, 1, 1];
for (const [i, progress] of PROGRESS.entries()) {
  for (const size of [16, 32]) await png(mark({ variant: "small", progress }), size, `static/icons/working/w${i}-${size}.png`);
}

// The side panel's logo, and the same files for the website.
const svgs = {
  "mark.svg": mark(),
  "mark-intro.svg": mark({ motion: "intro" }),
  "mark-working.svg": mark({ motion: "working" }),
  "mark-celebrate.svg": mark({ motion: "celebrate" }),
};
for (const [name, svg] of Object.entries(svgs)) {
  writeFileSync(`static/brand/${name}`, svg);
  writeFileSync(`brand/${name}`, svg);
}
copyFileSync("static/icons/icon128.png", "brand/icon128.png");

// Chrome Web Store small promo tile (440×280).
const inter = readFileSync("node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2").toString("base64");
await page.setViewportSize({ width: 440, height: 280 });
await page.setContent(`<style>
  @font-face { font-family: Inter; src: url(data:font/woff2;base64,${inter}) format("woff2"); font-weight: 100 900; }
  html, body { margin: 0; }
  .promo { width: 440px; height: 280px; box-sizing: border-box; padding: 0 34px; display: flex; align-items: center; gap: 26px;
    font-family: Inter, sans-serif; color: #e8eaf0; overflow: hidden; position: relative;
    background: radial-gradient(120% 90% at 0% 0%, #2a2470 0%, #12142a 45%, #0a0c11 100%); }
  .glow { position: absolute; width: 260px; height: 260px; left: -40px; top: 10px; border-radius: 50%;
    background: radial-gradient(circle, rgba(142,108,247,.45), rgba(142,108,247,0) 70%); }
  .promo svg { width: 112px; height: 112px; flex: none; position: relative; filter: drop-shadow(0 10px 24px rgba(80,50,200,.55)); }
  h1 { margin: 0 0 8px; font-size: 34px; font-weight: 750; letter-spacing: -0.03em; }
  p { margin: 0; font-size: 14px; line-height: 1.45; color: #b9bdd0; font-weight: 500; }
  b { color: #7CF0C5; font-weight: 650; }
</style><div class="promo"><div class="glow"></div>${mark({ id: "promo" })}
  <div style="position:relative"><h1>ApplyAgent</h1><p>Job applications, <b>filled for you</b>.<br>You review it. You submit it.</p></div></div>`);
await page.locator(".promo").screenshot({ path: "brand/promo-tile-440x280.png" });

await browser.close();

// A page to see the animations (open brand/preview.html in a browser).
writeFileSync("brand/preview.html", `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>ApplyAgent logo</title>
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; font: 15px/1.5 system-ui, sans-serif; background: #0a0c11; color: #e8eaf0; }
  main { max-width: 900px; margin: 0 auto; padding: 32px 16px; }
  h1 { font-size: 22px; margin: 0 0 4px; } p { color: #9198aa; margin: 0 0 20px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 16px; }
  .card { background: #11141b; border: 1px solid rgba(255,255,255,.08); border-radius: 14px; padding: 18px; text-align: center; }
  .card img { width: 128px; height: 128px; display: block; margin: 0 auto 12px; }
  button { font: inherit; color: inherit; background: #1c212c; border: 1px solid rgba(255,255,255,.12); border-radius: 8px; padding: 6px 12px; cursor: pointer; }
  .sizes { display: flex; gap: 18px; align-items: end; flex-wrap: wrap; margin-top: 24px; padding: 18px; border-radius: 14px; background: #fff; }
  .sizes.dark { background: #202124; }
</style></head><body><main>
<h1>ApplyAgent logo</h1><p>An "A" whose crossbar is a check mark: the application, done. The spark is the agent.</p>
<div class="grid">
  <div class="card"><img id="intro" src="mark-intro.svg" alt="Intro animation"><button onclick="replay('intro','mark-intro.svg')">Replay intro</button></div>
  <div class="card"><img src="mark-working.svg" alt="Working animation"><div>Working (while filling)</div></div>
  <div class="card"><img id="celebrate" src="mark-celebrate.svg" alt="Celebrate animation"><button onclick="replay('celebrate','mark-celebrate.svg')">Replay "Applied"</button></div>
  <div class="card"><img src="mark.svg" alt="Still"><div>Still</div></div>
</div>
${["", " dark"].map((cls) => `<div class="sizes${cls}">${[16, 24, 32, 48, 64, 96].map((s) => `<img src="mark.svg" width="${s}" height="${s}" alt="">`).join("")}</div>`).join("")}
<p style="margin-top:20px">Store art: <a style="color:#8b8cff" href="promo-tile-440x280.png">promo tile 440×280</a> · <a style="color:#8b8cff" href="icon128.png">icon 128×128</a></p>
<script>
  function replay(id, src) { const img = document.getElementById(id); img.src = "mark.svg"; requestAnimationFrame(() => (img.src = src + "?" + Date.now())); }
</script>
</main></body></html>
`);
console.log("logo assets written: static/icons, static/brand, brand/");

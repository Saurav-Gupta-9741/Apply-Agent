// The ApplyAgent mark: an "A" whose crossbar is a check mark ("the application, done"), on a violet tile, with a
// small spark for the agent. One builder for every use: toolbar icons, store art, the side panel's animated logo.
//
//   mark({ variant, tick, motion })  → SVG string
//     variant: "full" (detail: shine, edge, spark) | "small" (16–32 px: heavier strokes, no detail)
//     motion:  "none" | "intro" (draws itself once) | "working" (the check keeps drawing) | "celebrate" (pop + sparkle)
//     progress: 0..1, how much of the check is drawn (static toolbar frames of the "working" animation)

export const COLORS = {
  tileA: "#6E70F8", tileB: "#8E6CF7", tileC: "#AE6BF3", // the side panel's accent gradient, deepened
  glyph: "#FFFFFF",
  tick: "#7CF0C5", // mint: "done"
  shadow: "#2E1A7A",
};

const LEGS = "M38 98 L64 32 L90 98";
const TICK = "M49 74.5 L59 84 L79 63";
const SPARK = "M101 17 C102.2 23.6 104.4 25.8 111 27 C104.4 28.2 102.2 30.4 101 37 C99.8 30.4 97.6 28.2 91 27 C97.6 25.8 99.8 23.6 101 17 Z";

const MOTION_CSS = {
  none: "",
  intro: `
    .tile { transform-origin: 64px 64px; animation: tile-in .42s cubic-bezier(.2,.9,.25,1.25) both; }
    .legs { stroke-dasharray: 100; animation: draw .5s .28s cubic-bezier(.65,0,.35,1) both; }
    .tick { stroke-dasharray: 100; animation: draw .34s .72s cubic-bezier(.3,0,.2,1) both; }
    .tick-g { transform-origin: 62px 74px; animation: pop .36s 1.02s cubic-bezier(.3,1.6,.5,1) both; }
    .spark { transform-origin: 101px 27px; animation: spark-in .5s 1.05s cubic-bezier(.3,1.5,.5,1) both; }
    @keyframes tile-in { from { transform: scale(.82); opacity: 0; } to { transform: none; opacity: 1; } }
    @keyframes draw { from { stroke-dashoffset: 100; } to { stroke-dashoffset: 0; } }
    @keyframes pop { 0% { transform: none; } 45% { transform: scale(1.16); } 100% { transform: none; } }
    @keyframes spark-in { from { transform: scale(0) rotate(-90deg); opacity: 0; } to { transform: none; opacity: 1; } }`,
  working: `
    .tick { stroke-dasharray: 100; animation: work 1.3s cubic-bezier(.65,0,.35,1) infinite; }
    .spark { transform-origin: 101px 27px; animation: twinkle 1.3s ease-in-out infinite; }
    .shine { animation: breathe 2.6s ease-in-out infinite; }
    @keyframes work { 0% { stroke-dashoffset: 100; } 55%, 80% { stroke-dashoffset: 0; } 100% { stroke-dashoffset: -100; } }
    @keyframes twinkle { 0%, 100% { transform: scale(.7) rotate(0); opacity: .55; } 50% { transform: scale(1.1) rotate(45deg); opacity: 1; } }
    @keyframes breathe { 0%, 100% { opacity: .7; } 50% { opacity: 1; } }`,
  celebrate: `
    .tick-g { transform-origin: 62px 74px; animation: pop .5s cubic-bezier(.3,1.7,.5,1) both; }
    .spark { transform-origin: 101px 27px; animation: burst .7s cubic-bezier(.3,1.5,.5,1) both; }
    .ring { transform-origin: 64px 64px; animation: ring .7s ease-out both; }
    @keyframes pop { 0% { transform: scale(.6); } 60% { transform: scale(1.22); } 100% { transform: none; } }
    @keyframes burst { 0% { transform: scale(.4) rotate(-120deg); } 60% { transform: scale(1.5) rotate(20deg); } 100% { transform: none; } }
    @keyframes ring { from { transform: scale(.86); opacity: .95; } to { transform: scale(1.04); opacity: 0; } }`,
};

export function mark({ variant = "full", tick = COLORS.tick, motion = "none", progress = 1, id = "aa" } = {}) {
  const small = variant === "small";
  const legWidth = small ? 17 : 13;
  const tickWidth = small ? 15 : 11.5;
  const drawn = Math.max(0, Math.min(1, progress));
  const reduce = motion === "none" ? "" : `@media (prefers-reduced-motion: reduce) { * { animation: none !important; } }`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128" role="img" aria-label="ApplyAgent">
<defs>
  <linearGradient id="${id}-bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${COLORS.tileA}"/><stop offset=".55" stop-color="${COLORS.tileB}"/><stop offset="1" stop-color="${COLORS.tileC}"/>
  </linearGradient>
  <radialGradient id="${id}-shine" cx=".28" cy=".1" r=".95">
    <stop offset="0" stop-color="#fff" stop-opacity=".38"/><stop offset=".45" stop-color="#fff" stop-opacity=".07"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
  </radialGradient>
  <filter id="${id}-shadow" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="0" dy="${small ? 1.5 : 2.5}" stdDeviation="${small ? 1.5 : 2.6}" flood-color="${COLORS.shadow}" flood-opacity=".45"/>
  </filter>
</defs>
${motion === "none" ? "" : `<style>${MOTION_CSS[motion]}${reduce}</style>`}
<g class="tile">
  <rect width="128" height="128" rx="30" fill="url(#${id}-bg)"/>
  ${small ? "" : `<rect class="shine" width="128" height="128" rx="30" fill="url(#${id}-shine)"/>
  <rect x=".75" y=".75" width="126.5" height="126.5" rx="29.25" fill="none" stroke="#fff" stroke-opacity=".2" stroke-width="1.5"/>`}
  ${motion === "celebrate" ? `<rect class="ring" x="4" y="4" width="120" height="120" rx="27" fill="none" stroke="${tick}" stroke-width="3"/>` : ""}
  <g filter="url(#${id}-shadow)" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path class="legs" d="${LEGS}" pathLength="100" stroke="${COLORS.glyph}" stroke-width="${legWidth}"/>
    <g class="tick-g">
      <path class="tick" d="${TICK}" pathLength="100" stroke="${tick}" stroke-width="${tickWidth}"
        ${drawn < 1 ? `stroke-dasharray="100" stroke-dashoffset="${(100 * (1 - drawn)).toFixed(1)}"` : ""}/>
    </g>
  </g>
  ${small ? "" : `<path class="spark" d="${SPARK}" fill="#fff"/>`}
</g>
</svg>`;
}

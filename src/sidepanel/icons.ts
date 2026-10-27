/** Inline SVG icons built with DOM APIs (no HTML strings). 24×24 grid, 1.75 stroke, round caps. */

const PATHS: Record<string, string[]> = {
  menu: ["M4 7h16", "M4 12h16", "M4 17h10"],
  close: ["M6 6l12 12", "M18 6L6 18"],
  pencil: ["M4 20h4L18.5 9.5a2.12 2.12 0 0 0-3-3L5 17z", "M13.5 6.5l3 3"],
  download: ["M12 4v11", "M7.5 10.5L12 15l4.5-4.5", "M5 19.5h14"],
  circle: ["M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17z"],
  jobs: ["M4 8.5A1.5 1.5 0 0 1 5.5 7h13A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z", "M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7", "M4 12.5h16"],
  apply: ["M12 3l1.9 4.6L18.5 9.5 13.9 11.4 12 16l-1.9-4.6L5.5 9.5l4.6-1.9z", "M18.5 15.5l.8 1.9 1.9.8-1.9.8-.8 1.9-.8-1.9-1.9-.8 1.9-.8z"],
  queue: ["M4 6h11", "M4 12h11", "M4 18h7", "M18 9v9", "M15 15l3 3 3-3"],
  tracker: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M8.5 12.5l2.4 2.4 4.6-5.3"],
  answers: ["M5 5.5A1.5 1.5 0 0 1 6.5 4h11A1.5 1.5 0 0 1 19 5.5v9a1.5 1.5 0 0 1-1.5 1.5H10l-4 3.5V16h0.5A1.5 1.5 0 0 1 5 14.5z", "M9 9h6", "M9 12h4"],
  profile: ["M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M4.5 20a7.5 7.5 0 0 1 15 0"],
  shield: ["M12 3l7 3v5.5c0 4.2-2.9 8.1-7 9.5-4.1-1.4-7-5.3-7-9.5V6z", "M9 12l2 2 4-4"],
  lock: ["M7 11V8a5 5 0 0 1 10 0v3", "M5.5 11h13A1.5 1.5 0 0 1 20 12.5v6A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5v-6A1.5 1.5 0 0 1 5.5 11z"],
  globe: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M3.5 9h17", "M3.5 15h17", "M12 3c2.5 2.6 3.5 5.6 3.5 9s-1 6.4-3.5 9c-2.5-2.6-3.5-5.6-3.5-9s1-6.4 3.5-9z"],
  play: ["M8 5.5v13l10-6.5z"],
  pause: ["M8 5v14", "M16 5v14"],
  plus: ["M12 5v14", "M5 12h14"],
  upload: ["M12 15V4", "M7.5 8.5L12 4l4.5 4.5", "M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15"],
  link: ["M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1.5 1.5", "M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1.5-1.5"],
  trash: ["M4 7h16", "M10 11v6", "M14 11v6", "M6 7l1 12a1.5 1.5 0 0 0 1.5 1.4h7a1.5 1.5 0 0 0 1.5-1.4L18 7", "M9 7V4.5h6V7"],
  external: ["M14 4h6v6", "M20 4l-9 9", "M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"],
  retry: ["M20 11a8 8 0 1 0-2.3 5.7", "M20 4v7h-7"],
  send: ["M4 12l16-8-6 16-2.5-6.5z", "M11.5 13.5L20 4"],
  wand: ["M5 19L16 8", "M14 6l4 4", "M19 3v3", "M17.5 4.5h3", "M8 3v2", "M7 4h2"],
  check: ["M5 12.5l4.5 4.5L19 7.5"],
  alert: ["M12 4l9 16H3z", "M12 10v4", "M12 17v.01"],
  info: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M12 11v5", "M12 8v.01"],
  image: ["M5.5 4h13A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-13A1.5 1.5 0 0 1 5.5 4z", "M4 16l4.5-4.5 4 4 2.5-2.5L20 18", "M15 9.5v.01"],
  file: ["M7 3.5h7l5 5v11A1.5 1.5 0 0 1 17.5 21h-10A1.5 1.5 0 0 1 6 19.5V5a1.5 1.5 0 0 1 1-1.5z", "M14 3.5V9h5"],
  sparkle: ["M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6z"],
  key: ["M14.5 9.5a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0z", "M13.5 12.5L20 19", "M17 16l2-2", "M15.5 14.5l1.5-1.5"],
  broom: ["M4 20l7-7", "M13 4l7 7-5 5-7-7z"],
};

const SVG = "http://www.w3.org/2000/svg";

export function icon(name: keyof typeof PATHS | string, size = 18): SVGSVGElement {
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.75");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("icon");
  for (const d of PATHS[name] ?? PATHS.info!) {
    const path = document.createElementNS(SVG, "path");
    path.setAttribute("d", d);
    svg.append(path);
  }
  return svg;
}

/** Fill <span data-icon="name"> placeholders in static HTML. */
export function hydrateIcons(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>("[data-icon]").forEach((slot) => {
    if (!slot.firstChild) slot.append(icon(slot.dataset.icon!, Number(slot.dataset.size) || 18));
  });
}

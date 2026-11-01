/** Spam traps hidden in every way the audit found: none of them may be extracted (and so filled). */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { clearExtractCaches, extractFields } from "../src/content/extract";
import { mount } from "./fixtures";

const labels = () => {
  clearExtractCaches();
  return extractFields(document.getElementById("f")!).map((f) => f.descriptor.label);
};
const form = (trap: string) => mount(`<form id="f"><label for="fn">First name</label><input id="fn">${trap}<button type="submit">Submit</button></form>`);

afterEach(() => {
  document.head.innerHTML = "";
  document.body.innerHTML = "";
});

describe("inline-style traps (nothing laid out, no style sheets)", () => {
  const TRAPS: Record<string, string> = {
    "clip rect(0px, 0px, 0px, 0px)": `<div style="position:absolute; clip:rect(0px, 0px, 0px, 0px)"><label for="t">Website</label><input id="t"></div>`,
    "clip rect(0 0 0 0)": `<div style="position:absolute; clip:rect(0 0 0 0)"><label for="t">Website</label><input id="t"></div>`,
    "clip-path inset(50%)": `<label for="t">Website</label><input id="t" style="clip-path: inset(50%)">`,
    "clip-path inset(100%)": `<label for="t">Website</label><input id="t" style="clip-path: inset(100%)">`,
    "clip-path inset(0 50%)": `<label for="t">Website</label><input id="t" style="clip-path: inset(0 50%)">`,
    "clip-path inset(60% 0 40% 0 round 2px)": `<label for="t">Website</label><input id="t" style="clip-path: inset(60% 0 40% 0 round 2px)">`,
    "opacity 0.05 on the field": `<label for="t">Website</label><input id="t" style="opacity:0.05">`,
    "opacity 0.01 on a far ancestor": `<div style="opacity:0.01"><div><div><div><div><div><div><div><div><div><label for="t">Website</label><input id="t"></div></div></div></div></div></div></div></div></div></div>`,
    "overflow:hidden 1px wrapper": `<div style="overflow:hidden; height:1px"><label for="t">Website</label><input id="t"></div>`,
    "overflow:hidden 0 width wrapper": `<div style="overflow:hidden; width:0"><label for="t">Website</label><input id="t"></div>`,
    "inert": `<div inert><label for="t">Website</label><input id="t"></div>`,
    "closed details": `<details><summary>More</summary><label for="t">Website</label><input id="t"></details>`,
    "aria-hidden ancestor": `<div aria-hidden="true"><div><label for="t">Website</label><input id="t"></div></div>`,
    "hidden ancestor more than 32 levels up": `<div style="display:none">${"<div>".repeat(40)}<label for="t">Website</label><input id="t">${"</div>".repeat(40)}</div>`,
    "far-off ancestor more than 8 levels up": `<div style="position:absolute; left:-9999px">${"<div>".repeat(12)}<label for="t">Website</label><input id="t">${"</div>".repeat(12)}</div>`,
  };
  for (const [name, trap] of Object.entries(TRAPS)) {
    it(`skips: ${name}`, () => {
      form(trap);
      expect(labels()).toEqual(["First name"]);
    });
  }

  it("keeps fields in an open <details>, in a <summary>, deep in visible markup, and with mild opacity", () => {
    mount(`<form id="f">
      <details open><summary>Contact</summary><label for="a">First name</label><input id="a"></details>
      <details><summary><label for="b">Last name</label><input id="b"></summary><p>more</p></details>
      ${"<div>".repeat(40)}<label for="c">City</label><input id="c">${"</div>".repeat(40)}
      <div style="opacity:0.5"><label for="d">Phone</label><input id="d"></div>
      <div style="overflow:hidden; height:200px"><label for="e">Email</label><input id="e" type="email"></div>
      <label for="g">Website</label><input id="g" style="clip-path: inset(10%)">
      <button type="submit">Submit</button></form>`);
    expect(labels()).toEqual(["First name", "Last name", "City", "Phone", "Email", "Website"]);
  });
});

describe("traps found through computed styles (a style sheet is present)", () => {
  it("catches clip rect, clip-path inset, low opacity and collapsed overflow from CSS rules", () => {
    document.head.innerHTML = `<style>
      .a { position:absolute; clip: rect(0px, 0px, 0px, 0px); }
      .b { clip-path: inset(100%); }
      .c { opacity: 0.02; }
      .d { overflow: hidden; height: 1px; }
    </style>`;
    form(`<div class="a"><label for="t1">Website</label><input id="t1"></div>
      <label for="t2">Company</label><input id="t2" class="b">
      <div class="c"><div><label for="t3">Phone</label><input id="t3"></div></div>
      <div class="d"><label for="t4">Twitter</label><input id="t4"></div>`);
    expect(labels()).toEqual(["First name"]);
  });
});

describe("layout and browser visibility signals (stubbed: jsdom does not lay out)", () => {
  function withLayout(rect: Partial<DOMRect>, run: () => void, check?: (el: Element) => boolean): void {
    const proto = Element.prototype as unknown as Record<string, unknown>;
    const saved = { gbcr: proto.getBoundingClientRect, gcr: proto.getClientRects, cv: proto.checkVisibility };
    proto.getBoundingClientRect = function (this: Element) {
      if (this === document.documentElement) return { width: 1024, height: 800, top: 0, left: 0, right: 1024, bottom: 800 } as DOMRect;
      if (this.id === "t") return { width: 150, height: 20, top: 0, left: 0, right: 150, bottom: 20, ...rect } as DOMRect;
      return { width: 150, height: 20, top: 100, left: 10, right: 160, bottom: 120 } as DOMRect;
    };
    proto.getClientRects = function () { return [{}] as unknown as DOMRectList; };
    if (check) proto.checkVisibility = function (this: Element) { return check(this); };
    try { run(); } finally {
      proto.getBoundingClientRect = saved.gbcr;
      proto.getClientRects = saved.gcr;
      if (saved.cv === undefined) delete proto.checkVisibility; else proto.checkVisibility = saved.cv;
    }
  }

  it("a field just off the left or top of the page is a trap; one on the page is not", () => {
    form(`<label for="t">Website</label><input id="t">`);
    withLayout({ left: -60, right: -10 }, () => expect(labels()).toEqual(["First name"]));
    withLayout({ top: -40, bottom: -20 }, () => expect(labels()).toEqual(["First name"]));
    withLayout({ top: 300, bottom: 320 }, () => expect(labels()).toEqual(["First name", "Website"]));
  });

  it("uses checkVisibility where the browser has it", () => {
    form(`<label for="t">Website</label><input id="t">`);
    withLayout({ top: 300, bottom: 320 }, () => expect(labels()).toEqual(["First name"]), (el) => el.id !== "t");
    withLayout({ top: 300, bottom: 320 }, () => expect(labels()).toEqual(["First name", "Website"]), () => true);
  });
});

describe("background passes the control type to the correction check", () => {
  it("RECORD_CORRECTION handler calls isLearnableCorrection with the message's control", () => {
    const src = readFileSync(join(__dirname, "../src/background/index.ts"), "utf8");
    expect(src).toMatch(/isLearnableCorrection\(message\.question,\s*\(message as CorrectionMessage\)\.control\)/);
  });
});

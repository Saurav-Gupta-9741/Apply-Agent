/** Real application forms saved by the coverage scan (test/corpus, scripts and styles removed), replayed offline.
 * Each must keep being read the same way: any change in how a real question is handled shows up as a snapshot diff
 * to review, and the basics (email and name found, nothing of the user's put into someone else's field) must hold. */

import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { decide } from "../src/content/classify";
import { extractFields } from "../src/content/extract";
import { mount, PROFILE } from "./fixtures";

const DIR = "test/corpus";
const files = (() => {
  try {
    return readdirSync(DIR).filter((f) => f.endsWith(".html")).sort();
  } catch {
    return [];
  }
})();

const OTHER_PERSON = /emergency|referee|referrer|reference|manager'?s|supervisor/i;

describe.skipIf(!files.length)("real forms, offline", () => {
  for (const file of files) {
    it(file, () => {
      mount(readFileSync(`${DIR}/${file}`, "utf8").replace(/^<!--.*?-->\s*/s, ""));
      const fields = extractFields(document.body);
      const decisions = fields.map((f) => {
        const d = decide(f.descriptor, PROFILE, []);
        const summary = d.kind === "profile" ? `profile:${d.key}` : d.kind === "work" ? `work:${d.part}` : d.kind === "ask" ? `ask:${d.topic ?? d.reason}` : d.kind;
        return `${f.descriptor.required ? "*" : " "} ${f.descriptor.control.padEnd(9)} ${summary.padEnd(28)} ${f.descriptor.label}`;
      });
      expect(fields.length, "fields found").toBeGreaterThanOrEqual(4);
      expect(decisions.some((d) => d.includes("profile:email")), "email recognised").toBe(true);
      expect(decisions.some((d) => /profile:(firstName|fullName)/.test(d)), "name recognised").toBe(true);
      expect(decisions.filter((d) => d.includes("profile:") && OTHER_PERSON.test(d)), "own details in someone else's field").toEqual([]);
      expect(decisions).toMatchSnapshot();
    });
  }
});

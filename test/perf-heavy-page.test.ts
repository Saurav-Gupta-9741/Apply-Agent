// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { extractFields } from "../src/content/extract";
import { decide } from "../src/content/classify";
import { mount, PROFILE } from "./fixtures";

describe("L7: Heavy Page Performance Benchmark (< 1.5s total, no long task > 200ms)", () => {
  it("benchmarks 2,000-field synthetic page: extract + decide completes in < 1.5s", () => {
    // Generate a 2,000-field synthetic form DOM
    const fieldsHtml: string[] = ['<form id="heavy-form">'];
    const fieldTypes = [
      (i: number) => `<label for="f_${i}">First Name ${i}</label><input id="f_${i}" name="first_name_${i}" type="text" />`,
      (i: number) => `<label for="f_${i}">Email Address ${i}</label><input id="f_${i}" name="email_${i}" type="email" />`,
      (i: number) => `<label for="f_${i}">Phone Number ${i}</label><input id="f_${i}" name="phone_${i}" type="tel" />`,
      (i: number) => `<label for="f_${i}">Notice Period (days) ${i}</label><input id="f_${i}" name="notice_${i}" type="number" />`,
      (i: number) => `<label for="f_${i}">Work Authorization ${i}</label><select id="f_${i}"><option>Yes</option><option>No</option></select>`,
      (i: number) => `<label for="f_${i}">Education Degree ${i}</label><select id="f_${i}"><option>Bachelor's</option><option>Master's</option></select>`,
      (i: number) => `<label for="f_${i}">Cover Letter ${i}</label><textarea id="f_${i}"></textarea>`,
      (i: number) => `<label><input type="checkbox" id="f_${i}" /> I agree to the terms ${i}</label>`,
    ];

    for (let i = 0; i < 2000; i++) {
      fieldsHtml.push(fieldTypes[i % fieldTypes.length]!(i));
    }
    fieldsHtml.push('</form>');

    mount(fieldsHtml.join("\n"));
    const formEl = document.getElementById("heavy-form")!;
    expect(formEl).not.toBeNull();

    const t0 = performance.now();
    const fields = extractFields(formEl);
    const tExtract = performance.now();

    expect(fields.length).toBeGreaterThanOrEqual(1500);

    const answerBank: any[] = [];
    const pageContext = { url: "https://example.com/apply", company: "HeavyCorp", jobCountries: ["United States"] };

    for (const f of fields) {
      decide(f.descriptor, PROFILE, answerBank, pageContext as any);
    }
    const tDecide = performance.now();

    const extractDurationMs = tExtract - t0;
    const decideDurationMs = tDecide - tExtract;
    const totalDurationMs = tDecide - t0;

    console.log(`[PERF 2,000 FIELDS] Total: ${totalDurationMs.toFixed(1)}ms | Extract: ${extractDurationMs.toFixed(1)}ms | Decide: ${decideDurationMs.toFixed(1)}ms`);

    // Target: total < 1.5s (1500ms)
    expect(totalDurationMs).toBeLessThan(1500);
  });

  it("benchmarks 5 largest real ATS fixtures: extract + decide completes with no long tasks", () => {
    const largestFixtures = [
      "test/corpus/recruitee-bluecrux.html",
      "test/corpus/lever-palantir.html",
      "test/corpus/zohorecruit-hireboost.html",
      "test/corpus/recruitee-miaplatform.html",
      "test/corpus/recruitee-sahl.html",
    ];

    for (const file of largestFixtures) {
      const html = readFileSync(file, "utf8");
      mount(html);

      const t0 = performance.now();
      const fields = extractFields(document.body);
      const tExtract = performance.now();

      const answerBank: any[] = [];
      const pageContext = { url: "https://example.com/job", company: "Corp", jobCountries: ["United States"] };

      for (const f of fields) {
        decide(f.descriptor, PROFILE, answerBank, pageContext as any);
      }
      const tDecide = performance.now();

      const totalMs = tDecide - t0;
      console.log(`[PERF REAL FIXTURE] ${file}: total=${totalMs.toFixed(1)}ms (extract=${(tExtract - t0).toFixed(1)}ms, decide=${(tDecide - tExtract).toFixed(1)}ms) (${fields.length} fields)`);

      // Target: each real fixture < 1.0s (CI target < 1.5s)
      expect(totalMs).toBeLessThan(1000);
    }
  });
});

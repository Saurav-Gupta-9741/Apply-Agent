// @vitest-environment node
import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

function findTsFiles(dir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findTsFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".ts")) {
      results.push(fullPath);
    }
  }
  return results;
}

/** Strip single-line, multi-line comments and quoted strings from source code. */
function stripCommentsAndStrings(code: string): string {
  // Replace strings with empty string to avoid false positives on skill keywords like "WebSockets"
  return code
    .replace(/\/\*[\s\S]*?\*\//g, "") // multi-line comments
    .replace(/\/\/.*/g, "") // single-line comments
    .replace(/(["'`])(?:\\.|(?!\1)[^\\])*\1/g, '""'); // string literals
}

describe("No-network static safety audit (Step 9)", () => {
  const rootDir = path.resolve(__dirname, "..");
  const dirsToCheck = [
    path.join(rootDir, "src", "content"),
    path.join(rootDir, "src", "offscreen"),
    path.join(rootDir, "src", "shared"),
  ];

  const allowedExceptions = new Set([
    path.normalize(path.join(rootDir, "src", "shared", "license.ts")), // POST /activate with license key
  ]);

  const allTsFiles = dirsToCheck.flatMap((d) => findTsFiles(d));

  it("finds TypeScript files to audit across content, offscreen, and shared", () => {
    expect(allTsFiles.length).toBeGreaterThan(15);
  });

  for (const file of allTsFiles) {
    const normalizedFile = path.normalize(file);
    const relPath = path.relative(rootDir, file).replace(/\\/g, "/");

    if (allowedExceptions.has(normalizedFile)) {
      continue;
    }

    it(`verifies no network requests in ${relPath}`, () => {
      const raw = fs.readFileSync(file, "utf-8");

      // In src/offscreen, local chrome.runtime.getURL fetch of bundled onnx model is permitted
      let codeToAnalyze = stripCommentsAndStrings(raw);
      if (relPath.startsWith("src/offscreen/")) {
        codeToAnalyze = codeToAnalyze.replace(/fetch\s*\(\s*chrome\.runtime\.getURL\([^)]*\)\s*\)/g, "/*local asset*/");
      }

      // Check for forbidden network calls
      const forbiddenPatterns: { name: string; pattern: RegExp }[] = [
        { name: "fetch API", pattern: /\bfetch\s*\(/ },
        { name: "XMLHttpRequest", pattern: /\b(?:new\s+)?XMLHttpRequest\b/ },
        { name: "navigator.sendBeacon", pattern: /\bsendBeacon\s*\(/ },
        { name: "WebSocket", pattern: /\bnew\s+WebSocket\b/ },
        { name: "EventSource", pattern: /\bnew\s+EventSource\b/ },
      ];

      for (const { name, pattern } of forbiddenPatterns) {
        const match = pattern.exec(codeToAnalyze);
        expect(
          match,
          `Found forbidden network call (${name}) in ${relPath}: "${match ? match[0] : ""}"`
        ).toBeNull();
      }
    });
  }
});

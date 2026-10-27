// @vitest-environment node
/** Guard rails checked on every test run: no HTML injection sinks, no remote code, minimal permissions. */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

describe("source safety", () => {
  it("extension code never writes HTML strings or evaluates code", () => {
    const sinks = /\.innerHTML\s*=|\.outerHTML\s*=|insertAdjacentHTML|document\.write|\beval\(|new Function\(/;
    const offenders = files("src").filter((f) => f.endsWith(".ts") && sinks.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });

  it("no secrets or private keys are committed in the extension", () => {
    const suspicious = /rzp_live_|"d"\s*:\s*"[A-Za-z0-9_-]{20,}"|BEGIN (RSA |EC )?PRIVATE KEY/;
    const offenders = [...files("src"), ...files("static")].filter((f) => suspicious.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });
});

describe("manifest", () => {
  const manifest = JSON.parse(readFileSync("static/manifest.json", "utf8"));

  it("is Manifest V3 with exactly the permissions we justify to the Chrome Web Store", () => {
    expect(manifest.manifest_version).toBe(3);
    expect([...manifest.permissions].sort()).toEqual(
      ["activeTab", "alarms", "contextMenus", "offscreen", "scripting", "sidePanel", "storage", "unlimitedStorage"],
    );
    expect(manifest.host_permissions ?? []).toEqual([]); // sites are allowed one by one, at runtime
    expect(manifest.content_scripts).toBeUndefined(); // nothing runs on pages the user did not allow
    // The default strict MV3 policy, plus WebAssembly for the local question model (no remote code, no eval).
    expect(manifest.content_security_policy).toEqual({ extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'" });
    expect(manifest.externally_connectable).toBeUndefined(); // web pages cannot message the extension
  });

  it("loads only bundled scripts (no remote code)", () => {
    const html = readFileSync("static/sidepanel.html", "utf8");
    const sources = [...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map((m) => m[1]);
    expect(sources).toEqual(["sidepanel.js"]);
    expect(html).not.toMatch(/(src|href)\s*=\s*"(https?:)?\/\//); // no remote scripts, styles or fonts
  });
});

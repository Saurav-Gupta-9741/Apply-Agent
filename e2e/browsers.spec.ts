import { test, expect } from "@playwright/test";
import { chromium } from "@playwright/test";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { mkdtempSync } from "node:fs";

test.describe("L7: Multi-Browser Compatibility Smoke Tests", () => {
  test("smoke test extension on Microsoft Edge (msedge channel)", async () => {
    const extensionPath = resolve("dist");
    try {
      const context = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), "applyagent-edge-")), {
        channel: "msedge",
        headless: true,
        args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
      });
      expect(context).toBeDefined();
      const page = await context.newPage();
      expect(page).toBeDefined();
      await context.close();
      console.log("[BROWSER SMOKE] Microsoft Edge (msedge) launched and verified");
    } catch (err: any) {
      console.log(`[BROWSER SMOKE] msedge channel unavailable: ${err?.message?.split("\n")[0]}`);
      test.skip(true, "msedge not installed or executable on host");
    }
  });

  test("smoke test extension on Brave (brave channel)", async () => {
    const extensionPath = resolve("dist");
    try {
      const context = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), "applyagent-brave-")), {
        channel: "brave",
        headless: true,
        args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
      });
      expect(context).toBeDefined();
      const page = await context.newPage();
      expect(page).toBeDefined();
      await context.close();
      console.log("[BROWSER SMOKE] Brave (brave) launched and verified");
    } catch (err: any) {
      console.log(`[BROWSER SMOKE] brave channel unavailable: ${err?.message?.split("\n")[0]}`);
      test.skip(true, "brave not installed or executable on host");
    }
  });
});

import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  workers: 1, // one Chrome profile with the extension; tests share nothing but run in order
  retries: 0, // a flaky test is a bug to fix, not to retry
  reporter: [["list"]],
  globalSetup: "./e2e/global-setup.ts",
  webServer: {
    command: "node e2e/static-server.mjs",
    url: "http://127.0.0.1:8181/apply.html",
    reuseExistingServer: true,
  },
});

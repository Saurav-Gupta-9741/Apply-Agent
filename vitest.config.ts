import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    // Node 20 on CI: Promise.withResolvers for pdf.js (see the file).
    setupFiles: ["test/setup-node-polyfills.ts"],
    include: ["test/**/*.test.ts"],
    // Timing tests run alone (npm run test:perf): under a parallel run they measure machine load, not the code.
    exclude: ["**/node_modules/**", "test/perf-heavy-page.test.ts"],
    poolOptions: {
      threads: {
        maxThreads: 4,
      },
    },
  },
});

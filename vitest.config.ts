import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
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

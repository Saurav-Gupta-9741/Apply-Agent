import { defineConfig } from "vitest/config";

/** Strict timing limits (1,500 ms for 2,000 fields, 1,000 ms per real form), run alone so other tests don't skew them. */
export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["test/perf-heavy-page.test.ts"],
    fileParallelism: false,
  },
});

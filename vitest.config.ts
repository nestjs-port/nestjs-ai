import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    passWithNoTests: true,
    testTimeout: 30_000,
    exclude: ["**/node_modules/**", "**/dist/**"],
  },
});

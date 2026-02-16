import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@nestjs-ai/commons": path.resolve(__dirname, "packages/commons/src"),
      "@nestjs-ai/model": path.resolve(__dirname, "packages/model/src"),
      "@nestjs-ai/retry": path.resolve(__dirname, "packages/retry/src"),
      "@nestjs-ai/testing": path.resolve(__dirname, "packages/testing/src"),
      "@nestjs-ai/template-st": path.resolve(
        __dirname,
        "packages/template-st/src",
      ),
    },
  },
  test: {
    globals: true,
    exclude: ["**/node_modules/**", "**/dist/**"],
    setupFiles: [path.resolve(__dirname, "vitest.setup.ts")],
  },
});

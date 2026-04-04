import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@nestjs-ai/client-chat": path.resolve(
        __dirname,
        "packages/client-chat/src",
      ),
      "@nestjs-ai/commons": path.resolve(__dirname, "packages/commons/src"),
      "@nestjs-ai/jsdbc": path.resolve(__dirname, "packages/jsdbc/src"),
      "@nestjs-ai/model": path.resolve(__dirname, "packages/model/src"),
      "@nestjs-ai/model-openai": path.resolve(
        __dirname,
        "packages/models/openai/src",
      ),
      "@nestjs-ai/model-google-genai": path.resolve(
        __dirname,
        "packages/models/google-genai/src",
      ),
      "@nestjs-ai/model-transformers": path.resolve(
        __dirname,
        "packages/models/transformers/src",
      ),
      "@nestjs-ai/model-chat-memory-repository-redis": path.resolve(
        __dirname,
        "packages/memory/repository/model-chat-memory-repository-redis/src",
      ),
      "@nestjs-ai/observation": path.resolve(
        __dirname,
        "packages/observation/src",
      ),
      "@nestjs-ai/platform": path.resolve(__dirname, "packages/platform/src"),
      "@nestjs-ai/retry": path.resolve(__dirname, "packages/retry/src"),
      "@nestjs-ai/testing": path.resolve(__dirname, "packages/testing/src"),
      "@nestjs-ai/template-st": path.resolve(
        __dirname,
        "packages/template-st/src",
      ),
      "@nestjs-ai/vector-store": path.resolve(
        __dirname,
        "packages/vector-store/src",
      ),
      "@nestjs-ai/vector-store-redis": path.resolve(
        __dirname,
        "packages/vector-stores/redis-store/src",
      ),
    },
  },
  test: {
    globals: true,
    testTimeout: 30_000,
    exclude: ["**/node_modules/**", "**/dist/**"],
    setupFiles: [path.resolve(__dirname, "vitest.setup.ts")],
  },
});

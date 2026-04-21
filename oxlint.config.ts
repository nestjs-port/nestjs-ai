import { defineConfig } from "oxlint";

export default defineConfig({
  ignorePatterns: [
    ".claude",
    "docs/antora/ui-bundle",
    "packages/vector-store/src/filter/antlr4/**/*",
    "!packages/vector-store/src/filter/antlr4/index.ts",
  ],
  plugins: [
    "eslint",
    "typescript",
    "unicorn",
    "oxc",
    "import",
    "node",
    "vitest",
  ],
  categories: {
    correctness: "error",
  },
  rules: {},
  env: {
    builtin: true,
    node: true,
  },
});

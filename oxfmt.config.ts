import { defineConfig } from "oxfmt";

export default defineConfig({
  useTabs: false,
  tabWidth: 2,
  printWidth: 80,
  singleQuote: false,
  jsxSingleQuote: false,
  quoteProps: "as-needed",
  trailingComma: "all",
  semi: true,
  arrowParens: "always",
  bracketSameLine: false,
  bracketSpacing: true,
  ignorePatterns: [
    ".claude",
    "docs/antora/ui-bundle",
    "packages/vector-store/src/filter/antlr4/**/*",
    "!packages/vector-store/src/filter/antlr4/index.ts",
  ],
  overrides: [
    {
      files: ["**/*.yml", "**/*.yaml"],
      options: {
        singleQuote: true,
      },
    },
  ],
});

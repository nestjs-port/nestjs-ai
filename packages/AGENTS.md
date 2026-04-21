# packages Workspace

## Package Identity

- `packages/` contains reusable TypeScript libraries for the NestJS AI monorepo.
- Most packages follow `src/` + `dist/` output and export through `src/index.ts`.

## Setup & Run

- Workspace install (from repo root): `pnpm install`
- Build all packages: `pnpm build`
- Typecheck all packages: `pnpm typecheck`
- Test all packages: `pnpm test:packages`
- Lint all packages: `pnpm lint`

## Patterns & Conventions

- DO: keep public exports in package barrel files like `packages/model/src/index.ts` and `packages/commons/src/index.ts`.
- DO: colocate tests in `__tests__` folders, e.g. `packages/client-chat/src/__tests__/default-chat-client-builder.spec.ts`.
- DO: use package-level factory/builder entry points, e.g. `packages/models/openai/src/autoconfigure/open-ai-chat-model-auto-configuration.ts`.
- DO: keep cross-cutting tokens/constants in shared packages (`packages/commons/src/constant/tokens.ts`).
- DON'T: edit generated outputs in `packages/*/dist/**` (example: `packages/model/dist/index.js`).
- DON'T: place production source inside test-only folders like `packages/models/google-genai/src/cache/__tests__/`.

## Key Files

- Workspace manifest: `pnpm-workspace.yaml`
- Turbo task graph: `turbo.json`
- Root test config: `vitest.config.ts`
- Formatter/linter config: `biome.json`

## JIT Index Hints

- Find package manifests: `find packages -name package.json | sort`
- Find package entry barrels: `find packages -path "*/src/index.ts" | sort`
- Find build scripts: `rg -n '"build"' packages/**/package.json`
- Find peer deps: `rg -n '"peerDependencies"' packages/**/package.json`

## Common Gotchas

- Package `test` scripts are not uniform; some rely on root Vitest.
- `turbo run test` only runs where package `test` scripts exist.
- Root Vitest aliases are defined in `vitest.config.ts`; keep them aligned with package layout.

## Pre-PR Checks

`pnpm build && pnpm typecheck && pnpm test:packages && pnpm lint`

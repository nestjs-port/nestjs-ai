# @nestjs-ai/vector-store

## Package Identity
- Vector store abstractions and support code for NestJS AI.
- Mirrors Spring AI vector-store package structure for migration.

## Setup & Run
- Build: `pnpm --filter @nestjs-ai/vector-store build`
- Typecheck: `pnpm --filter @nestjs-ai/vector-store typecheck`
- Test: `pnpm --filter @nestjs-ai/vector-store test`
- Clean: `pnpm --filter @nestjs-ai/vector-store clean`

## Patterns & Conventions
- DO: preserve Spring AI package topology during migration (`aot`, `filter`, `observation`, `properties`).
- DO: export surface only via index barrels.
- DO: keep parser/converter code grouped under `packages/vector-store/src/filter`.
- DON'T: migrate Java files verbatim; adapt to TypeScript conventions.
- DON'T: edit generated artifacts under `packages/vector-store/dist/**`.

## Key Files
- Entry barrel: `packages/vector-store/src/index.ts`
- AOT namespace: `packages/vector-store/src/aot/index.ts`
- Filter namespace: `packages/vector-store/src/filter/index.ts`
- Observation namespace: `packages/vector-store/src/observation/index.ts`
- Properties namespace: `packages/vector-store/src/properties/index.ts`

## JIT Index Hints
- Find exports: `rg -n "export" packages/vector-store/src`
- Find filter submodules: `find packages/vector-store/src/filter -maxdepth 3 -type f`

## Common Gotchas
- Keep root/index exports synchronized with added submodules.
- Avoid leaking provider-specific behavior into base abstractions.

## Pre-PR Checks
`pnpm --filter @nestjs-ai/vector-store build && pnpm --filter @nestjs-ai/vector-store typecheck && pnpm --filter @nestjs-ai/vector-store test`

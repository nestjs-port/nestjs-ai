# @nestjs-ai/testing

## Package Identity
- Shared testing utilities for NestJS AI packages.
- Provides test-focused helpers and observation testing support.

## Setup & Run
- Build: `pnpm --filter @nestjs-ai/testing build`
- Typecheck: `pnpm --filter @nestjs-ai/testing typecheck`
- Test: `pnpm --filter @nestjs-ai/testing test`
- Clean: `pnpm --filter @nestjs-ai/testing clean`

## Patterns & Conventions
- DO: keep helper APIs minimal and stable.
- DO: export public helpers only through `packages/testing/src/index.ts`.
- DO: keep observation-specific helpers under `packages/testing/src/observation`.
- DON'T: add app/runtime logic here; keep scope test-only.
- DON'T: edit `packages/testing/dist/**` directly.

## Key Files
- Entry barrel: `packages/testing/src/index.ts`
- Observation helpers: `packages/testing/src/observation/index.ts`

## JIT Index Hints
- Find exports: `rg -n "export" packages/testing/src`
- Find tests: `find packages/testing/src -path "*/__tests__/*.spec.ts"`

## Common Gotchas
- Keep dependencies lightweight; avoid creating cycles with runtime packages.
- Avoid package-specific assumptions in shared test helpers.

## Pre-PR Checks
`pnpm --filter @nestjs-ai/testing build && pnpm --filter @nestjs-ai/testing typecheck && pnpm --filter @nestjs-ai/testing test`

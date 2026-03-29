# @nestjs-ai/integration-tests

## Package Identity
- Integration test harness for migrated Spring AI scenarios.
- Holds cross-package test fixtures and integration-style specs.

## Setup & Run
- Build: `pnpm --filter @nestjs-ai/integration-tests build`
- Typecheck: `pnpm --filter @nestjs-ai/integration-tests typecheck`
- Test: `pnpm --filter @nestjs-ai/integration-tests test`
- Clean: `pnpm --filter @nestjs-ai/integration-tests clean`

## Patterns & Conventions
- DO: keep production code out of this package unless it is test support.
- DO: prefer small, reusable fixtures over one-off setup inside specs.
- DO: keep the package barrel minimal.
- DON'T: add published API surface without a migration need.
- DON'T: edit generated artifacts under `dist/`.

## Key Files
- Entry barrel: `packages/integration-tests/src/index.ts`

## Pre-PR Checks
`pnpm --filter @nestjs-ai/integration-tests build && pnpm --filter @nestjs-ai/integration-tests typecheck && pnpm --filter @nestjs-ai/integration-tests test`

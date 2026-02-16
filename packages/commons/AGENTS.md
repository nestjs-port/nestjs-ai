# @nestjs-ai/commons

## Package Identity
- Shared primitives: logging, observation API, retry primitives, web client, constants, utility helpers.
- Serves as foundational dependency for most other packages.

## Setup & Run
- Build: `pnpm --filter @nestjs-ai/commons build`
- Typecheck: `pnpm --filter @nestjs-ai/commons typecheck`
- Package tests: `pnpm test packages/commons/src`
- Single test file: `pnpm test packages/commons/src/retry/__tests__/retry-template.spec.ts`
- Clean: `pnpm --filter @nestjs-ai/commons clean`

## Patterns & Conventions
- DO: keep DI tokens centralized in `packages/commons/src/constant/tokens.ts`.
- DO: place public contracts as `*.interface.ts` (example: `packages/commons/src/web/http-client.interface.ts`).
- DO: keep retry internals under `packages/commons/src/retry/` and support helpers in `retry/support/`.
- DO: keep observation base abstractions in `packages/commons/src/observation/api/`.
- DO: re-export module boundaries in `packages/commons/src/index.ts`.
- DON'T: duplicate constants already defined in `packages/commons/src/constant/`.
- DON'T: edit generated files under `packages/commons/dist/**`.

## Key Files
- Entry barrel: `packages/commons/src/index.ts`
- DI tokens: `packages/commons/src/constant/tokens.ts`
- HTTP client contract: `packages/commons/src/web/http-client.interface.ts`
- Observation registry contracts: `packages/commons/src/observation/api/observation-registry.interface.ts`
- Retry template: `packages/commons/src/retry/retry-template.ts`

## JIT Index Hints
- Find tokens/constants: `rg -n "TOKEN|token" packages/commons/src/constant`
- Find observation APIs: `rg -n "interface|class" packages/commons/src/observation/api`
- Find retry strategy classes: `rg -n "Retry|BackOff" packages/commons/src/retry`
- Find tests: `find packages/commons/src -path "*/__tests__/*.spec.ts"`

## Common Gotchas
- This package is widely depended on; avoid breaking exported names.
- Retry and observation APIs are reused by provider packages; preserve compatibility.
- Keep interfaces framework-agnostic where possible.

## Pre-PR Checks
`pnpm --filter @nestjs-ai/commons build && pnpm --filter @nestjs-ai/commons typecheck && pnpm test packages/commons/src`

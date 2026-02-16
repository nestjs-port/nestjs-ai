# @nestjs-ai/retry

## Package Identity
- Thin retry-focused package exposing transient/non-transient AI exceptions and retry helpers.
- Complements retry primitives already available in `@nestjs-ai/commons`.

## Setup & Run
- Build: `pnpm --filter @nestjs-ai/retry build`
- Typecheck: `pnpm --filter @nestjs-ai/retry typecheck`
- Test: `pnpm --filter @nestjs-ai/retry test`
- Watch tests: `pnpm --filter @nestjs-ai/retry test:watch`
- Clean: `pnpm --filter @nestjs-ai/retry clean`

## Patterns & Conventions
- DO: keep package API minimal in `packages/retry/src/index.ts`.
- DO: keep retry utility logic in `packages/retry/src/retry-utils.ts`.
- DO: keep exception classes isolated (`transient-ai-exception.ts`, `non-transient-ai-exception.ts`).
- DO: add behavior tests in `packages/retry/src/__tests__/retry-utils.spec.ts`.
- DON'T: duplicate retry policy implementations from `packages/commons/src/retry/`.
- DON'T: edit generated output under `packages/retry/dist/**`.

## Key Files
- Entry barrel: `packages/retry/src/index.ts`
- Retry utilities: `packages/retry/src/retry-utils.ts`
- Transient exception: `packages/retry/src/transient-ai-exception.ts`
- Non-transient exception: `packages/retry/src/non-transient-ai-exception.ts`

## JIT Index Hints
- Find retry helpers: `rg -n "Retry|retry" packages/retry/src`
- Find exception usage: `rg -n "TransientAiException|NonTransientAiException" packages/retry/src`
- Find tests: `find packages/retry/src -path "*/__tests__/*.spec.ts"`

## Common Gotchas
- Keep error classification deterministic; callers use it to decide retry behavior.
- Avoid adding provider-specific logic here.

## Pre-PR Checks
`pnpm --filter @nestjs-ai/retry build && pnpm --filter @nestjs-ai/retry typecheck && pnpm --filter @nestjs-ai/retry test`

# @nestjs-ai/observation

## Package Identity
- OpenTelemetry observation handlers for tracing/meter integration on AI operations.
- Works with observation abstractions from `@nestjs-ai/commons`.

## Setup & Run
- Build: `pnpm --filter @nestjs-ai/observation build`
- Typecheck: `pnpm --filter @nestjs-ai/observation typecheck`
- Test: `pnpm --filter @nestjs-ai/observation test`
- Clean: `pnpm --filter @nestjs-ai/observation clean`

## Patterns & Conventions
- DO: keep handler implementations under `packages/observation/src/handlers/`.
- DO: expose handlers via `packages/observation/src/handlers/index.ts` and package `src/index.ts`.
- DO: maintain both trace and meter parity (`otel-tracing-observation-handler.ts`, `otel-meter-observation-handler.ts`).
- DO: keep scenario tests in `packages/observation/src/handlers/__tests__/`.
- DON'T: hardwire app-specific metric names inside handlers like `packages/observation/src/handlers/otel-meter-observation-handler.ts`; align with shared conventions in `packages/commons/src/observation/conventions/ai-observation-metric-names.ts`.
- DON'T: edit generated output under `packages/observation/dist/**`.

## Key Files
- Entry barrel: `packages/observation/src/index.ts`
- Handler barrel: `packages/observation/src/handlers/index.ts`
- Tracing handler: `packages/observation/src/handlers/otel-tracing-observation-handler.ts`
- Meter handler: `packages/observation/src/handlers/otel-meter-observation-handler.ts`

## JIT Index Hints
- Find OpenTelemetry usage: `rg -n "@opentelemetry|Span|Meter" packages/observation/src`
- Find handler methods: `rg -n "onStart|onStop|runInScope" packages/observation/src/handlers`
- Find tests: `find packages/observation/src -path "*/__tests__/*.spec.ts"`

## Common Gotchas
- Handler lifecycle order matters (`start` vs `stop`).
- Ensure safe behavior when lifecycle methods are called without prior state.

## Pre-PR Checks
`pnpm --filter @nestjs-ai/observation build && pnpm --filter @nestjs-ai/observation typecheck && pnpm --filter @nestjs-ai/observation test`

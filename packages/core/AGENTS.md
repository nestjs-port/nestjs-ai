# @nestjs-ai/core

## Package Identity
- NestJS integration layer: module wiring, decorators, and Nest logger bridge.
- Focuses on DI-friendly integration with commons/model tokens.

## Setup & Run
- Build: `pnpm --filter @nestjs-ai/core build`
- Typecheck: `pnpm --filter @nestjs-ai/core typecheck`
- Workspace tests touching core: `pnpm test packages/core/src`
- Clean: `pnpm --filter @nestjs-ai/core clean`

## Patterns & Conventions
- DO: keep module setup in `packages/core/src/module/nest-ai.module.ts`.
- DO: keep module options contract in `packages/core/src/module/nest-ai-module.options.ts`.
- DO: define decorators in `packages/core/src/decorators/` and export from `decorators/index.ts`.
- DO: keep logger adapter implementation in `packages/core/src/logging/nest-logger-factory.ts`.
- DON'T: hardcode provider tokens in module wiring; follow token usage in `packages/core/src/module/nest-ai.module.ts` and constants from `packages/commons/src/constant/tokens.ts`.
- DON'T: edit generated output under `packages/core/dist/**`.

## Key Files
- Entry barrel: `packages/core/src/index.ts`
- Main module: `packages/core/src/module/nest-ai.module.ts`
- Module options: `packages/core/src/module/nest-ai-module.options.ts`
- Inject decorator: `packages/core/src/decorators/inject-chat-model.decorator.ts`
- Nest logger bridge: `packages/core/src/logging/nest-logger-factory.ts`

## JIT Index Hints
- Find module providers: `rg -n "@Module|providers|exports" packages/core/src/module`
- Find decorators: `rg -n "export function|Inject" packages/core/src/decorators`
- Find logging integration: `rg -n "Logger" packages/core/src/logging`

## Common Gotchas
- Keep Nest peer dependency compatibility (`^10 || ^11`).
- Avoid framework leakage into non-core packages.
- Export new decorators/modules via `packages/core/src/index.ts`.

## Pre-PR Checks
`pnpm --filter @nestjs-ai/core build && pnpm --filter @nestjs-ai/core typecheck && pnpm test packages/core/src`

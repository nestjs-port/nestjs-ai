# @nestjs-ai/platform

## Package Identity
- NestJS integration layer: module wiring, decorators, and Nest logger bridge.
- Focuses on DI-friendly integration with commons/model tokens.

## Setup & Run
- Build: `pnpm --filter @nestjs-ai/platform build`
- Typecheck: `pnpm --filter @nestjs-ai/platform typecheck`
- Workspace tests touching platform: `pnpm test packages/platform/src`
- Clean: `pnpm --filter @nestjs-ai/platform clean`

## Patterns & Conventions
- DO: keep module setup in `packages/platform/src/module/nest-ai.module.ts`.
- DO: keep module options contract in `packages/platform/src/module/nest-ai-module.options.ts`.
- DO: define decorators in `packages/platform/src/decorators/` and export from `decorators/index.ts`.
- DO: keep logger adapter implementation in `packages/platform/src/logging/nest-logger-factory.ts`.
- DON'T: hardcode provider tokens in module wiring; follow token usage in `packages/platform/src/module/nest-ai.module.ts` and constants from `packages/commons/src/constant/tokens.ts`.
- DON'T: edit generated output under `packages/platform/dist/**`.

## Key Files
- Entry barrel: `packages/platform/src/index.ts`
- Main module: `packages/platform/src/module/nest-ai.module.ts`
- Module options: `packages/platform/src/module/nest-ai-module.options.ts`
- Inject decorator: `packages/platform/src/decorators/inject-tokens.decorator.ts`
- Nest logger bridge: `packages/platform/src/logging/nest-logger-factory.ts`

## JIT Index Hints
- Find module providers: `rg -n "@Module|providers|exports" packages/platform/src/module`
- Find decorators: `rg -n "export function|Inject" packages/platform/src/decorators`
- Find logging integration: `rg -n "Logger" packages/platform/src/logging`

## Common Gotchas
- Keep Nest peer dependency compatibility (`^10 || ^11`).
- Avoid framework leakage into non-platform packages.
- Export new decorators/modules via `packages/platform/src/index.ts`.

## Pre-PR Checks
`pnpm --filter @nestjs-ai/platform build && pnpm --filter @nestjs-ai/platform typecheck && pnpm test packages/platform/src`

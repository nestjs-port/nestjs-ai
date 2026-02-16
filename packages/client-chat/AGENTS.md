# @nestjs-ai/client-chat

## Package Identity
- High-level client API for prompting chat models with advisors, observation, and templating integration.
- Primary tech: TypeScript classes with fluent request builder patterns.

## Setup & Run
- Build: `pnpm --filter @nestjs-ai/client-chat build`
- Typecheck: `pnpm --filter @nestjs-ai/client-chat typecheck`
- Package tests: `pnpm test packages/client-chat/src`
- Single test file: `pnpm test packages/client-chat/src/__tests__/default-chat-client-builder.spec.ts`
- Clean: `pnpm --filter @nestjs-ai/client-chat clean`

## Patterns & Conventions
- DO: follow fluent API style in `packages/client-chat/src/default-chat-client.ts`.
- DO: keep construction logic in `packages/client-chat/src/default-chat-client-builder.ts`.
- DO: place advisor contracts under `packages/client-chat/src/advisor/api/`.
- DO: keep observation conventions under `packages/client-chat/src/observation/`.
- DO: colocate advisor tests in `packages/client-chat/src/advisor/__tests__/`.
- DON'T: move package surface exports away from `packages/client-chat/src/index.ts`.
- DON'T: modify generated output under `packages/client-chat/dist/**`.

## Key Files
- Entry barrel: `packages/client-chat/src/index.ts`
- Core client: `packages/client-chat/src/default-chat-client.ts`
- Builder: `packages/client-chat/src/default-chat-client-builder.ts`
- Advisor chain: `packages/client-chat/src/advisor/default-around-advisor-chain.ts`
- Observation defaults: `packages/client-chat/src/observation/default-chat-client-observation-convention.ts`

## JIT Index Hints
- Find fluent methods: `rg -n "default[A-Z]|prompt\(|user\(|system\(" packages/client-chat/src`
- Find advisor APIs: `rg -n "interface .*Advisor|class .*Advisor" packages/client-chat/src/advisor`
- Find observation classes: `rg -n "Observation" packages/client-chat/src/observation`
- Find tests: `find packages/client-chat/src -path "*/__tests__/*.spec.ts"`

## Common Gotchas
- Overloaded methods require runtime type guards; preserve behavior while refactoring.
- Defaults are stateful in builder/request spec objects; clone carefully.
- Maintain compatibility with `@nestjs-ai/model` chat option types.

## Pre-PR Checks
`pnpm --filter @nestjs-ai/client-chat build && pnpm --filter @nestjs-ai/client-chat typecheck && pnpm test packages/client-chat/src`

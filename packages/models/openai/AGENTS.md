# @nestjs-ai/model-openai

## Package Identity

- OpenAI provider implementation for NestJS AI.

## Setup & Run

- Build: `pnpm --filter @nestjs-ai/model-openai build`
- Typecheck: `pnpm --filter @nestjs-ai/model-openai typecheck`
- Clean: `pnpm --filter @nestjs-ai/model-openai clean`

## Key Files

- Entry barrel: `packages/models/openai/src/index.ts`
- Module barrel: `packages/models/openai/src/module/index.ts`
- Module class: `packages/models/openai/src/module/open-ai-chat-model.module.ts`
- Model: `packages/models/openai/src/open-ai-chat-model.ts`
- Options: `packages/models/openai/src/open-ai-chat-options.ts`

## Common Gotchas

- Keep the package export surface aligned with `src/index.ts`.
- Preserve the public `OpenAi*` names without reintroducing `Sdk` suffixes.

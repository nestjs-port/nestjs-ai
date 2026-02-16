# packages/models Workspace

## Package Identity
- Provider implementations for external model vendors.
- Current providers: OpenAI and Google GenAI.

## Setup & Run
- Build providers: `pnpm --filter @nestjs-ai/model-openai build && pnpm --filter @nestjs-ai/model-google-genai build`
- Typecheck providers: `pnpm --filter @nestjs-ai/model-openai typecheck && pnpm --filter @nestjs-ai/model-google-genai typecheck`
- Test OpenAI package scope: `pnpm test packages/models/openai/src`
- Test Google GenAI package scope: `pnpm test packages/models/google-genai/src`

## Patterns & Conventions
- DO: keep OpenAI API translation under `packages/models/openai/src/api/`.
- DO: keep factory entry points in `packages/models/openai/src/open-ai-chat-model-factory.ts` and `packages/models/google-genai/src/google-gen-ai-chat-model-factory.ts`.
- DO: keep metadata extraction in `packages/models/openai/src/metadata/` and `packages/models/google-genai/src/metadata/`.
- DO: preserve shared `ChatModel` contract usage as seen in `packages/models/openai/src/open-ai-chat-model.ts` and `packages/models/google-genai/src/google-gen-ai-chat-model.ts`.
- DON'T: mix OpenAI DTOs from `packages/models/openai/src/api/open-ai-api.types.ts` into Google provider files like `packages/models/google-genai/src/google-gen-ai-chat-model.ts`.
- DON'T: edit generated artifacts in `packages/models/*/dist/**`.

## Key Files
- OpenAI factory: `packages/models/openai/src/open-ai-chat-model-factory.ts`
- OpenAI model: `packages/models/openai/src/open-ai-chat-model.ts`
- Google factory: `packages/models/google-genai/src/google-gen-ai-chat-model-factory.ts`
- Google model: `packages/models/google-genai/src/google-gen-ai-chat-model.ts`

## JIT Index Hints
- Find provider factories: `rg -n "chat-model-factory|ChatModelFactory" packages/models/*/src`
- Find provider options: `rg -n "ChatOptions|Properties" packages/models/*/src`
- Find tool-calling integration: `rg -n "ToolCalling|tool" packages/models/*/src`
- Find tests: `find packages/models -path "*/__tests__/*.spec.ts"`

## Common Gotchas
- Keep provider defaults explicit and documented in options classes.
- Provider packages depend on commons/model/retry contracts; avoid breaking interfaces.

## Pre-PR Checks
`pnpm --filter @nestjs-ai/model-openai build && pnpm --filter @nestjs-ai/model-openai typecheck && pnpm --filter @nestjs-ai/model-google-genai build && pnpm --filter @nestjs-ai/model-google-genai typecheck && pnpm test packages/models/openai/src && pnpm test packages/models/google-genai/src`

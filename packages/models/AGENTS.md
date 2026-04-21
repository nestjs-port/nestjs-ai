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

- DO: keep OpenAI implementation under `packages/models/openai/src/`.
- DO: keep factory entry points in `packages/models/openai/src/module/` and `packages/models/google-genai/src/autoconfigure/`.
- DO: keep metadata extraction in `packages/models/openai/src/metadata/` and `packages/models/google-genai/src/metadata/`.
- DO: preserve shared `ChatModel` contract usage as seen in `packages/models/openai/src/open-ai-chat-model.ts` and `packages/models/google-genai/src/google-gen-ai-chat-model.ts`.
- DON'T: mix provider-specific DTOs across package boundaries.
- DON'T: edit generated artifacts in `packages/models/*/dist/**`.

## Key Files

- OpenAI module: `packages/models/openai/src/module/open-ai-chat-model.module.ts`
- OpenAI model: `packages/models/openai/src/open-ai-chat-model.ts`
- Google factory: `packages/models/google-genai/src/autoconfigure/google-gen-ai-chat-model-auto-configuration.ts`
- Google model: `packages/models/google-genai/src/google-gen-ai-chat-model.ts`

## JIT Index Hints

- Find provider factories: `rg -n "chat-model-auto-configuration|ChatModelFactory" packages/models/*/src`
- Find provider options: `rg -n "ChatOptions|Properties" packages/models/*/src`
- Find tool-calling integration: `rg -n "ToolCalling|tool" packages/models/*/src`
- Find tests: `find packages/models -path "*/__tests__/*.spec.ts"`

## Common Gotchas

- Keep provider defaults explicit and documented in options classes.
- Provider packages depend on commons/model/retry contracts; avoid breaking interfaces.

## Pre-PR Checks

`pnpm --filter @nestjs-ai/model-openai build && pnpm --filter @nestjs-ai/model-openai typecheck && pnpm --filter @nestjs-ai/model-google-genai build && pnpm --filter @nestjs-ai/model-google-genai typecheck && pnpm test packages/models/openai/src && pnpm test packages/models/google-genai/src`

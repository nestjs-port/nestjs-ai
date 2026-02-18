# @nestjs-ai/model-openai

## Package Identity
- OpenAI chat model provider implementation for NestJS AI.
- Handles API request/response mapping, metadata extraction, and tool-calling flow.

## Setup & Run
- Build: `pnpm --filter @nestjs-ai/model-openai build`
- Typecheck: `pnpm --filter @nestjs-ai/model-openai typecheck`
- Package tests: `pnpm test packages/models/openai/src`
- Single test file: `pnpm test packages/models/openai/src/api/__tests__/open-ai-api.spec.ts`
- Clean: `pnpm --filter @nestjs-ai/model-openai clean`

## API Patterns
- Model implementation: `packages/models/openai/src/open-ai-chat-model.ts`
- Factory wiring: `packages/models/openai/src/autoconfigure/open-ai-chat-model-auto-configuration.ts`
- API client layer: `packages/models/openai/src/api/open-ai-api.ts`
- DTO/types mapping: `packages/models/openai/src/api/open-ai-api.types.ts`
- Constants: `packages/models/openai/src/api/common/open-ai-api-constants.ts`
- Metadata extraction: `packages/models/openai/src/metadata/support/open-ai-response-header-extractor.ts`

## Patterns & Conventions
- DO: translate provider payloads in `src/api/` before domain mapping.
- DO: keep retry + observation logic inside `open-ai-chat-model.ts`.
- DO: keep factory dependency injection in `autoconfigure/open-ai-chat-model-auto-configuration.ts`.
- DO: keep response header parsing in `src/metadata/support/`.
- DO: keep binary fixtures test-only (example: `packages/models/openai/src/api/__tests__/speech1.mp3`).
- DON'T: leak raw API DTOs from `packages/models/openai/src/api/open-ai-api.types.ts` into top-level exports in `packages/models/openai/src/index.ts`.
- DON'T: place production code in `packages/models/openai/src/api/__tests__/`.

## Key Files
- Entry barrel: `packages/models/openai/src/index.ts`
- Chat model: `packages/models/openai/src/open-ai-chat-model.ts`
- Factory: `packages/models/openai/src/autoconfigure/open-ai-chat-model-auto-configuration.ts`
- API client: `packages/models/openai/src/api/open-ai-api.ts`
- Header extractor: `packages/models/openai/src/metadata/support/open-ai-response-header-extractor.ts`

## JIT Index Hints
- Find request mapping: `rg -n "createRequest|chatCompletion|toPrompt" packages/models/openai/src`
- Find stream handling: `rg -n "stream|chunk|SSE|server-sent" packages/models/openai/src`
- Find rate-limit parsing: `rg -n "rate|header|extract" packages/models/openai/src/metadata`
- Find tests: `find packages/models/openai/src -path "*/__tests__/*.spec.ts"`

## Common Gotchas
- Ensure tool-calling recursion/continuation remains deterministic.
- Header-based metadata may be absent; keep null-safe extraction.
- Keep compatibility with `@nestjs-ai/model` `ChatResponse` semantics.

## Pre-PR Checks
`pnpm --filter @nestjs-ai/model-openai build && pnpm --filter @nestjs-ai/model-openai typecheck && pnpm test packages/models/openai/src`

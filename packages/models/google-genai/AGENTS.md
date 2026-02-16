# @nestjs-ai/model-google-genai

## Package Identity
- Google GenAI (Gemini/Vertex) provider integration for NestJS AI.
- Handles client construction, request conversion, metadata usage accounting, and cache helpers.

## Setup & Run
- Build: `pnpm --filter @nestjs-ai/model-google-genai build`
- Typecheck: `pnpm --filter @nestjs-ai/model-google-genai typecheck`
- Package tests: `pnpm test packages/models/google-genai/src`
- Single test file: `pnpm test packages/models/google-genai/src/schema/__tests__/json-schema-converter.spec.ts`
- Clean: `pnpm --filter @nestjs-ai/model-google-genai clean`

## API Patterns
- Model implementation: `packages/models/google-genai/src/google-gen-ai-chat-model.ts`
- Factory wiring: `packages/models/google-genai/src/google-gen-ai-chat-model-factory.ts`
- Cache service: `packages/models/google-genai/src/cache/google-gen-ai-cached-content-service.ts`
- Schema conversion: `packages/models/google-genai/src/schema/json-schema-converter.ts`
- Tool-calling adapter: `packages/models/google-genai/src/schema/google-genai-tool-calling-manager.ts`
- Metadata usage: `packages/models/google-genai/src/metadata/google-gen-ai-usage.ts`

## Patterns & Conventions
- DO: keep provider enums/constants under `packages/models/google-genai/src/common/`.
- DO: keep cache request/response contracts in `packages/models/google-genai/src/cache/`.
- DO: convert schema/tool wiring in `packages/models/google-genai/src/schema/`.
- DO: keep factory client-mode split (API key vs Vertex) in `google-gen-ai-chat-model-factory.ts`.
- DO: isolate test helpers in `packages/models/google-genai/src/cache/__tests__/test-google-gen-ai-cached-content-service.ts`.
- DON'T: move test helper `packages/models/google-genai/src/cache/__tests__/test-google-gen-ai-cached-content-service.ts` into production root like `packages/models/google-genai/src/cache/google-gen-ai-cached-content-service.ts`.
- DON'T: edit generated output under `packages/models/google-genai/dist/**`.

## Key Files
- Entry barrel: `packages/models/google-genai/src/index.ts`
- Chat model: `packages/models/google-genai/src/google-gen-ai-chat-model.ts`
- Factory: `packages/models/google-genai/src/google-gen-ai-chat-model-factory.ts`
- Cache service: `packages/models/google-genai/src/cache/google-gen-ai-cached-content-service.ts`
- Tool schema manager: `packages/models/google-genai/src/schema/google-genai-tool-calling-manager.ts`

## JIT Index Hints
- Find client construction: `rg -n "buildClient|GoogleGenAI|vertex" packages/models/google-genai/src`
- Find cached content code: `rg -n "cache|cached" packages/models/google-genai/src/cache`
- Find schema/tool conversion: `rg -n "schema|tool" packages/models/google-genai/src/schema`
- Find tests: `find packages/models/google-genai/src -path "*/__tests__/*.spec.ts"`

## Common Gotchas
- `apiKey` mode and Vertex mode have different required fields.
- Keep cache support optional (`enableCachedContent` behavior).
- Preserve usage metadata mapping for cumulative token accounting.

## Pre-PR Checks
`pnpm --filter @nestjs-ai/model-google-genai build && pnpm --filter @nestjs-ai/model-google-genai typecheck && pnpm test packages/models/google-genai/src`

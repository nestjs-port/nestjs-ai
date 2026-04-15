# @nestjs-ai/model-openai-sdk

## Package Identity
- Scaffold for the OpenAI SDK-based provider implementation.

## Setup & Run
- Build: `pnpm --filter @nestjs-ai/model-openai-sdk build`
- Typecheck: `pnpm --filter @nestjs-ai/model-openai-sdk typecheck`
- Clean: `pnpm --filter @nestjs-ai/model-openai-sdk clean`

## Key Files
- Entry barrel: `packages/models/openai-sdk/src/index.ts`
- Module barrel: `packages/models/openai-sdk/src/module/index.ts`
- Module class: `packages/models/openai-sdk/src/module/open-ai-sdk-chat-model.module.ts`
- Model placeholder: `packages/models/openai-sdk/src/open-ai-sdk-chat-model.ts`
- Options placeholder: `packages/models/openai-sdk/src/open-ai-sdk-chat-options.ts`

## Common Gotchas
- Keep the package export surface minimal until the real OpenAI SDK adapter is implemented.
- Add provider-specific API translation and tests under `src/` when implementation starts.

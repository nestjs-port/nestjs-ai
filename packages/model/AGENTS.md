# @nestjs-ai/model

## Package Identity

- Core model abstractions: chat messages, prompts, converters, tool-calling, metadata.
- Primary tech: strict TypeScript with builder-style domain APIs.

## Setup & Run

- Build: `pnpm --filter @nestjs-ai/model build`
- Typecheck: `pnpm --filter @nestjs-ai/model typecheck`
- Unit tests (package scope): `pnpm test packages/model/src`
- Single test file: `pnpm test packages/model/src/chat/prompt/__tests__/prompt-template.spec.ts`
- Clean: `pnpm --filter @nestjs-ai/model clean`

## Patterns & Conventions

- DO: export package surface through `packages/model/src/index.ts`.
- DO: group domains by folder (`chat`, `converter`, `model`, `tool`, `util`).
- DO: follow builder patterns used in `packages/model/src/chat/prompt/prompt-template.ts`.
- DO: keep tool execution orchestration in `packages/model/src/model/tool/default-tool-calling-manager.ts`.
- DO: add focused specs in nearby `__tests__`, e.g. `packages/model/src/model/tool/__tests__/default-tool-calling-manager.spec.ts`.
- DON'T: bypass package API by editing `packages/model/dist/**` directly.
- DON'T: add non-test assets under production folders; keep test-only files like `packages/model/src/converter/__tests__/list-output-converter.spec.ts` in `__tests__/`.

## Key Files

- Package entry: `packages/model/src/index.ts`
- Prompt templating core: `packages/model/src/chat/prompt/prompt-template.ts`
- Tool-calling manager: `packages/model/src/model/tool/default-tool-calling-manager.ts`
- Message contracts: `packages/model/src/chat/messages/message.interface.ts`
- JSON schema generation: `packages/model/src/util/json/schema/json-schema-generator.ts`

## JIT Index Hints

- Find chat entities: `rg -n "export (class|interface).*(Chat|Message|Prompt)" packages/model/src`
- Find tool pipeline: `rg -n "Tool(Call|Execution|Callback|Manager)" packages/model/src`
- Find converters: `rg -n "Converter" packages/model/src/converter`
- Find tests: `find packages/model/src -path "*/__tests__/*.spec.ts"`

## Common Gotchas

- Many APIs are overloaded; preserve signature order and runtime guards.
- `Prompt` and `ChatOptions` merging logic is central; avoid ad-hoc mutation.
- Keep barrel exports synced when adding new modules.

## Pre-PR Checks

`pnpm --filter @nestjs-ai/model build && pnpm --filter @nestjs-ai/model typecheck && pnpm test packages/model/src`

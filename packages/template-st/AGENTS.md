# @nestjs-ai/template-st

## Package Identity

- StringTemplate4ts adapter package implementing template rendering used by prompt flows.
- Small integration package consumed by `model` and `client-chat`.

## Setup & Run

- Build: `pnpm --filter @nestjs-ai/template-st build`
- Typecheck: `pnpm --filter @nestjs-ai/template-st typecheck`
- Package tests: `pnpm test packages/template-st/src`
- Single test file: `pnpm test packages/template-st/src/__tests__/st-template-renderer.spec.ts`
- Clean: `pnpm --filter @nestjs-ai/template-st clean`

## Patterns & Conventions

- DO: keep renderer implementation in `packages/template-st/src/st-template-renderer.ts`.
- DO: keep package entry clean in `packages/template-st/src/index.ts`.
- DO: keep parser/listener support isolated (`packages/template-st/src/slf4j-st-error-listener.ts`).
- DO: validate behavior through edge tests in `packages/template-st/src/__tests__/st-template-renderer-edge.spec.ts`.
- DON'T: embed chat/business orchestration from files like `packages/client-chat/src/default-chat-client.ts` into this adapter package.
- DON'T: edit generated output under `packages/template-st/dist/**`.

## Key Files

- Entry barrel: `packages/template-st/src/index.ts`
- Renderer: `packages/template-st/src/st-template-renderer.ts`
- Error listener: `packages/template-st/src/slf4j-st-error-listener.ts`
- Core tests: `packages/template-st/src/__tests__/st-template-renderer.spec.ts`

## JIT Index Hints

- Find renderer API: `rg -n "class .*Renderer|apply\(" packages/template-st/src`
- Find tests: `find packages/template-st/src -path "*/__tests__/*.spec.ts"`
- Find ST references: `rg -n "stringtemplate|ST" packages/template-st/src`

## Common Gotchas

- Keep template behavior stable; small output changes can break many prompt tests.
- Preserve compatibility with `TemplateRenderer` contract from commons.

## Pre-PR Checks

`pnpm --filter @nestjs-ai/template-st build && pnpm --filter @nestjs-ai/template-st typecheck && pnpm test packages/template-st/src`

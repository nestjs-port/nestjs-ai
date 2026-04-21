# @nestjs-ai/rag

## Package Identity

- Retrieval Augmented Generation (RAG) package for NestJS AI.
- Covers pre-retrieval, retrieval, post-retrieval, and generation flows.

## Setup & Run

- Build: `pnpm --filter @nestjs-ai/rag build`
- Typecheck: `pnpm --filter @nestjs-ai/rag typecheck`
- Test: `pnpm --filter @nestjs-ai/rag test`
- Clean: `pnpm --filter @nestjs-ai/rag clean`

## Patterns & Conventions

- DO: keep public API exports in `packages/rag/src/index.ts`.
- DO: keep lifecycle stages separated by directory (`preretrieval`, `retrieval`, `postretrieval`, `generation`).
- DO: add specs in nearby `__tests__` directories.
- DON'T: place generated output under source folders.
- DON'T: edit built artifacts under `packages/rag/dist/**`.

## Key Files

- Entry barrel: `packages/rag/src/index.ts`
- Pre-retrieval query models: `packages/rag/src/preretrieval/query/index.ts`
- Retrieval contracts: `packages/rag/src/retrieval/index.ts`
- Generation contracts: `packages/rag/src/generation/index.ts`
- Post-retrieval contracts: `packages/rag/src/postretrieval/index.ts`

## JIT Index Hints

- Find stage exports: `rg -n "export \* from" packages/rag/src`
- Find query transformation code: `rg -n "Transformer|Expander" packages/rag/src/preretrieval`
- Find retriever/joiner code: `rg -n "Retriever|Joiner" packages/rag/src/retrieval`
- Find tests: `find packages/rag/src -path "*/__tests__/*.spec.ts"`

## Common Gotchas

- Keep stage boundaries explicit; avoid cross-stage coupling.
- Keep barrel exports synchronized when adding files.

## Pre-PR Checks

`pnpm --filter @nestjs-ai/rag build && pnpm --filter @nestjs-ai/rag typecheck && pnpm --filter @nestjs-ai/rag test`

# @nestjs-ai/model-ollama

## Package Identity

- Ollama provider integration for NestJS AI.
- Port target for Spring AI's `spring-ai-ollama` module.

## Setup & Run

- Build: `pnpm --filter @nestjs-ai/model-ollama build`
- Typecheck: `pnpm --filter @nestjs-ai/model-ollama typecheck`
- Package tests: `pnpm test packages/models/ollama/src`
- Clean: `pnpm --filter @nestjs-ai/model-ollama clean`

## Patterns & Conventions

- DO: keep public exports in `packages/models/ollama/src/index.ts`.
- DO: follow the provider package patterns under `packages/models/openai`, `packages/models/anthropic`, and `packages/models/google-genai`.
- DO: add implementation files with Apache license headers.
- DON'T: edit generated output under `packages/models/ollama/dist/**`.

## Key Files

- Entry barrel: `packages/models/ollama/src/index.ts`

## JIT Index Hints

- Find source files: `find packages/models/ollama/src -type f | sort`
- Find Spring AI Ollama sources: `find ../models/spring-ai-ollama -type f | sort`

## Pre-PR Checks

`pnpm --filter @nestjs-ai/model-ollama build && pnpm --filter @nestjs-ai/model-ollama typecheck`

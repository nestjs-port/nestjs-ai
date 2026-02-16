# nestjs-ai

## Project Snapshot
- Repository type: pnpm + Turborepo monorepo (`packages/*`, `packages/models/*`)
- Primary stack: TypeScript, Node.js, NestJS ecosystem packages
- Tooling: Turbo (build graph), Biome (format/lint), Vitest (tests), Husky + lint-staged (pre-commit)
- Package outputs are built into per-package `dist/`
- This root file is intentionally lightweight; use nearest sub-folder `AGENTS.md` for package-specific rules.

## Root Setup Commands
- Install: `pnpm install`
- Build all: `pnpm build`
- Typecheck all: `pnpm typecheck`
- Lint all: `pnpm lint`
- Auto-fix lint/format: `pnpm lint:fix && pnpm format`
- Test all (Turbo graph): `pnpm test`
- Clean all artifacts: `pnpm clean`

## Universal Conventions
- Language/style: strict TypeScript, Biome formatting, tabs + double quotes.
- Keep package public APIs in `src/index.ts` barrels (ex: `packages/model/src/index.ts`).
- Prefer package imports (`@nestjs-ai/...`) instead of relative cross-package imports.
- Keep tests in `__tests__` folders with `*.spec.ts` naming.
- Commit format: conventional commits (`feat|fix|refactor|test|docs|chore(scope): subject`).
- Scope examples: `model`, `core`, `commons`, `openai`.
- Keep subject imperative and concise; include bullet body for non-trivial changes.
- Open focused PRs with passing build/typecheck/tests before review.

## Security & Secrets
- Never commit API keys, tokens, credentials, or `.env` files.
- Keep provider secrets in environment variables, not source or tests.
- Avoid logging sensitive prompt/user payloads in production code.
- Remove or redact real identifiers from fixtures before commit.

## JIT Index
### Package Structure
- Package overview: `packages/` -> [see packages/AGENTS.md](packages/AGENTS.md)
- Core model abstractions: `packages/model/` -> [see packages/model/AGENTS.md](packages/model/AGENTS.md)
- Chat client orchestration: `packages/client-chat/` -> [see packages/client-chat/AGENTS.md](packages/client-chat/AGENTS.md)
- Shared primitives/utilities: `packages/commons/` -> [see packages/commons/AGENTS.md](packages/commons/AGENTS.md)
- Nest integration module: `packages/core/` -> [see packages/core/AGENTS.md](packages/core/AGENTS.md)
- Retry wrapper package: `packages/retry/` -> [see packages/retry/AGENTS.md](packages/retry/AGENTS.md)
- StringTemplate renderer: `packages/template-st/` -> [see packages/template-st/AGENTS.md](packages/template-st/AGENTS.md)
- OpenTelemetry handlers: `packages/observation/` -> [see packages/observation/AGENTS.md](packages/observation/AGENTS.md)
- Model providers umbrella: `packages/models/` -> [see packages/models/AGENTS.md](packages/models/AGENTS.md)
- OpenAI provider: `packages/models/openai/` -> [see packages/models/openai/AGENTS.md](packages/models/openai/AGENTS.md)
- Google GenAI provider: `packages/models/google-genai/` -> [see packages/models/google-genai/AGENTS.md](packages/models/google-genai/AGENTS.md)

### Quick Find Commands
- Find exported symbols: `rg -n "^export" packages/**/src`
- Find classes/interfaces: `rg -n "^(export )?(class|interface) " packages/**/src`
- Find builder/factory patterns: `rg -n "builder\(|Factory" packages/**/src`
- Find chat model implementations: `rg -n "extends ChatModel" packages/**/src`
- Find tests: `find packages -path "*/__tests__/*.spec.ts"`
- Find TODO/FIXME: `rg -n "TODO|FIXME" packages/**/src`

## Definition of Done
- Changed package(s) build successfully.
- Changed package(s) typecheck cleanly.
- Relevant tests pass (or new tests added for behavior changes).
- Biome lint passes; no generated `dist/` edits are committed.
- Public API/export changes are reflected in package `src/index.ts` when needed.

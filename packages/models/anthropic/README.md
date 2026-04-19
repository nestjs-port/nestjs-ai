# NestJS AI

> A TypeScript/NestJS port of [Spring AI](https://github.com/spring-projects/spring-ai) — bringing the same powerful AI abstraction layer to the Node.js ecosystem.

**Last synced Spring AI commit:** `da8db657` (Remove Anthropic IT that no longer makes sense)

## Overview

**NestJS AI** is a comprehensive TypeScript port of the [Spring AI](https://github.com/spring-projects/spring-ai) project, reimagined for the NestJS/Node.js ecosystem. It provides a unified abstraction layer for integrating Large Language Models (LLMs), vector stores, document readers, and RAG pipelines into NestJS applications.

The project faithfully mirrors Spring AI's module structure and API design while leveraging TypeScript idioms, RxJS reactive streams, and NestJS dependency injection.

## Key Features

- **Model Abstraction** — Unified `ChatModel` and `EmbeddingModel` interfaces across providers
- **Multi-Provider Support** — OpenAI, Google GenAI (Gemini), Hugging Face Transformers
- **Tool Calling** — Structured function/tool calling orchestration
- **RAG Pipeline** — End-to-end Retrieval Augmented Generation with vector stores
- **Chat Memory** — In-memory and Redis-backed conversation history
- **Document Readers** — PDF, Markdown, HTML (Cheerio), Apache Tika
- **Vector Stores** — Abstract interface with Redis implementation
- **Observability** — OpenTelemetry tracing and metrics
- **Prompt Templating** — StringTemplate-based prompt rendering
- **NestJS Integration** — Modules, decorators, and DI support

## Tech Stack

| Category | Technology |
|---|---|
| Language | TypeScript 6.x (strict mode) |
| Runtime | Node.js >= 20 |
| Framework | NestJS 11.x |
| Package Manager | pnpm 10.x |
| Build | Turborepo + tsc |
| Test | Vitest 4.x + TestContainers |
| Lint/Format | Biomejs 2.x |
| Reactive | RxJS 7.x |
| Validation | Zod 4.x |

## Porting Progress

Spring AI module porting status to NestJS AI. (~520 source files, ~180 test files ported across 22 packages)

| Category | Spring AI Module | nestjs-ai Package | Progress |
|---|---|---|---|
| **Core** | spring-ai-model | `@nestjs-ai/model` | 100% |
| | spring-ai-client-chat | `@nestjs-ai/client-chat` | 100% |
| | spring-ai-commons | `@nestjs-ai/commons` | 100% |
| | spring-ai-retry | `@nestjs-ai/retry` | 100% |
| | spring-ai-template-st | `@nestjs-ai/template-st` | 100% |
| | spring-ai-observation | `@nestjs-ai/observation` | 100% |
| | spring-ai-test | `@nestjs-ai/testing` | 100% |
| **Model Providers** | spring-ai-openai | `@nestjs-ai/model-openai` | 100% |
| | spring-ai-openai-sdk | `@nestjs-ai/model-openai-sdk` | 100% |
| | spring-ai-google-genai | `@nestjs-ai/model-google-genai` | 100% |
| | spring-ai-transformers | `@nestjs-ai/model-transformers` | 100% |
| | spring-ai-anthropic | — | 0% |
| | spring-ai-azure-openai | — | 0% |
| | spring-ai-bedrock | — | 0% |
| | spring-ai-mistral-ai | — | 0% |
| | spring-ai-ollama | — | 0% |
| **RAG & Vector Stores** | spring-ai-rag | `@nestjs-ai/rag` | 100% |
| | spring-ai-vector-store | `@nestjs-ai/vector-store` | 100% |
| | spring-ai-redis-store | `@nestjs-ai/vector-store-redis` | 100% |
| | spring-ai-advisors-vector-store | `@nestjs-ai/advisors-vector-store` | 100% |
| | spring-ai-pgvector-store | — | 0% |
| | spring-ai-chroma-store | — | 0% |
| | spring-ai-pinecone-store | — | 0% |
| | spring-ai-milvus-store | — | 0% |
| **Document Readers** | spring-ai-pdf-document-reader | `@nestjs-ai/document-reader-pdf` | 100% |
| | spring-ai-markdown-document-reader | `@nestjs-ai/document-reader-markdown` | 100% |
| | spring-ai-tika-document-reader | `@nestjs-ai/document-reader-tika` | 100% |
| | (cheerio - NestJS specific) | `@nestjs-ai/document-reader-cheerio` | 100% |
| **Memory** | spring-ai-model-chat-memory-redis | `@nestjs-ai/model-chat-memory-repository-redis` | 100% |
| | spring-ai-model-chat-memory-jdbc | — | 0% |
| | spring-ai-model-chat-memory-cassandra | — | 0% |
| **Platform** | spring-ai-autoconfigure | `@nestjs-ai/platform` | 100% |
| | spring-ai-mcp | `@nestjs-ai/mcp-common` | 10% |
| | spring-ai-jsdbc | `@nestjs-ai/jsdbc` | 30% |

## Project Structure

```
nestjs-ai/
├── packages/
│   ├── model/                    # Core chat/embedding abstractions
│   ├── client-chat/              # High-level client API & advisors
│   ├── commons/                  # Shared utilities & tokens
│   ├── platform/                 # NestJS module integration
│   ├── rag/                      # RAG pipeline
│   ├── vector-store/             # Vector store abstractions
│   ├── observation/              # OpenTelemetry integration
│   ├── retry/                    # Retry utilities
│   ├── template-st/             # Prompt templating
│   ├── testing/                  # Test utilities
│   ├── jsdbc/                    # JDBC integration layer
│   ├── models/
│   │   ├── openai/               # OpenAI provider
│   │   ├── google-genai/         # Google GenAI provider
│   │   └── transformers/         # Hugging Face local embeddings
│   ├── mcp/
│   │   └── common/               # Model Context Protocol
│   ├── vector-stores/
│   │   └── redis-store/          # Redis vector store
│   ├── memory/
│   │   └── repository/
│   │       └── model-chat-memory-repository-redis/
│   ├── document-readers/
│   │   ├── pdf-reader/           # PDF.js reader
│   │   ├── markdown-reader/      # Markdown reader
│   │   ├── cheerio-reader/       # HTML/web scraping
│   │   └── tika-reader/          # Apache Tika reader
│   └── advisors/
│       └── advisors-vector-store/
├── docs/                         # Antora documentation site
└── turbo.json                    # Turborepo configuration
```

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 10.0.0

### Installation

```bash
pnpm install
```

### Build

```bash
pnpm build
```

### Test

```bash
pnpm test
```

### Lint & Format

```bash
pnpm lint
pnpm format
```

## Java File Dependency Order

The list below reflects the direct `import` count for the Spring AI Anthropic Java files, sorted from the fewest dependencies to the most dependencies.

| Imports | Java File |
|---|---|
| 0 | `AnthropicCacheStrategy.java` |
| 0 | `AnthropicSkillType.java` |
| 1 | `AnthropicCacheTtl.java` |
| 1 | `AnthropicServiceTier.java` |
| 1 | `AnthropicWebSearchResult.java` |
| 1 | `package-info.java` |
| 2 | `CacheBreakpointTracker.java` |
| 2 | `Citation.java` |
| 3 | `AnthropicSkillRecord.java` |
| 3 | `AnthropicWebSearchTool.java` |
| 4 | `AnthropicSkill.java` |
| 5 | `AbstractAnthropicOptions.java` |
| 5 | `AnthropicSkillContainer.java` |
| 8 | `AnthropicCacheOptions.java` |
| 9 | `CacheEligibilityResolver.java` |
| 12 | `AnthropicSetup.java` |
| 14 | `AnthropicCitationDocument.java` |
| 18 | `AnthropicSkillsResponseHelper.java` |
| 29 | `AnthropicChatOptions.java` |
| 85 | `AnthropicChatModel.java` |

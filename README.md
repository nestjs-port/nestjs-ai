<div align="center">
  <img src="https://raw.githubusercontent.com/nestjs-port/nestjs-ai/main/docs/antora/modules/ROOT/images/nestjs-ai-logo.svg" alt="NestJS AI logo" width="160" style="display:block; margin:0 auto 0.25rem;" />
</div>

# NestJS AI

> A TypeScript/NestJS port of [Spring AI](https://github.com/spring-projects/spring-ai) — bringing the same powerful AI abstraction layer to the Node.js ecosystem.

**Last synced Spring AI commit:** `d3e495d2` (Expose conversationHistoryEnabled getter in ToolCallAdvisor.Builder)

## Overview

**NestJS AI** is a comprehensive TypeScript port of the [Spring AI](https://github.com/spring-projects/spring-ai) project, reimagined for the NestJS/Node.js ecosystem. It provides a unified abstraction layer for integrating Large Language Models (LLMs), vector stores, document readers, and RAG pipelines into NestJS applications.

The project faithfully mirrors Spring AI's module structure and API design while leveraging TypeScript idioms, RxJS reactive streams, and NestJS dependency injection.

## Documentation & Resources

- 📖 **Reference Documentation**: [https://nestjs-port.github.io/nestjs-ai](https://nestjs-port.github.io/nestjs-ai)
- 💡 **Example Applications**: [nestjs-port/nestjs-ai-examples](https://github.com/nestjs-port/nestjs-ai-examples)
- 🔗 **Upstream Project**: [Spring AI](https://github.com/spring-projects/spring-ai) — the Java/Spring project this port tracks

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

| Category        | Technology                                                                     |
| --------------- | ------------------------------------------------------------------------------ |
| Language        | TypeScript 6.x (strict mode)                                                   |
| Runtime         | Node.js >= 22.12                                                               |
| Module format   | ESM only                                                                       |
| Framework       | NestJS 11.x                                                                    |
| Package Manager | pnpm 10.x                                                                      |
| Build           | Turborepo + tsc                                                                |
| Test            | Vitest 4.x + TestContainers                                                    |
| Lint/Format     | Oxlint + Oxfmt                                                                 |
| Reactive        | RxJS 7.x                                                                       |
| Validation      | [Standard Schema](https://standardschema.dev/) (zod / valibot / arktype / ...) |

## Porting Progress

| Category                | Spring AI Module                      | nestjs-ai Package                                 | Progress |
| ----------------------- | ------------------------------------- | ------------------------------------------------- | -------- |
| **Core**                | spring-ai-model                       | `@nestjs-ai/model`                                | 100%     |
|                         | spring-ai-client-chat                 | `@nestjs-ai/client-chat`                          | 100%     |
|                         | spring-ai-commons                     | `@nestjs-ai/commons`                              | 100%     |
|                         | spring-ai-retry                       | `@nestjs-ai/retry`                                | 100%     |
|                         | spring-ai-template-st                 | `@nestjs-ai/template-st`                          | 100%     |
| **Model Providers**     | spring-ai-openai                      | `@nestjs-ai/model-openai`                         | 100%     |
|                         | spring-ai-google-genai                | `@nestjs-ai/model-google-genai`                   | 100%     |
|                         | spring-ai-transformers                | `@nestjs-ai/model-transformers`                   | 100%     |
|                         | spring-ai-anthropic                   | `@nestjs-ai/model-anthropic`                      | 100%     |
|                         | spring-ai-azure-openai                | —                                                 | 0%       |
|                         | spring-ai-bedrock                     | —                                                 | 0%       |
|                         | spring-ai-mistral-ai                  | —                                                 | 0%       |
|                         | spring-ai-ollama                      | —                                                 | 0%       |
| **RAG & Vector Stores** | spring-ai-rag                         | `@nestjs-ai/rag`                                  | 100%     |
|                         | spring-ai-vector-store                | `@nestjs-ai/vector-store`                         | 100%     |
|                         | spring-ai-redis-store                 | `@nestjs-ai/vector-store-redis`                   | 100%     |
|                         | spring-ai-advisors-vector-store       | `@nestjs-ai/advisors-vector-store`                | 100%     |
|                         | spring-ai-pgvector-store              | `@nestjs-ai/vector-store-pgvector`                | 100%     |
|                         | spring-ai-chroma-store                | —                                                 | 0%       |
|                         | spring-ai-pinecone-store              | —                                                 | 0%       |
|                         | spring-ai-milvus-store                | —                                                 | 0%       |
| **Document Readers**    | spring-ai-pdf-document-reader         | `@nestjs-ai/document-reader-pdf`                  | 100%     |
|                         | spring-ai-markdown-document-reader    | `@nestjs-ai/document-reader-markdown`             | 100%     |
|                         | spring-ai-tika-document-reader        | `@nestjs-ai/document-reader-tika`                 | 100%     |
|                         | (cheerio - NestJS specific)           | `@nestjs-ai/document-reader-cheerio`              | 100%     |
| **Memory**              | spring-ai-model-chat-memory-redis     | `@nestjs-ai/model-chat-memory-repository-redis`   | 100%     |
|                         | spring-ai-model-chat-memory-mongodb   | `@nestjs-ai/model-chat-memory-repository-mongodb` | 100%     |
|                         | spring-ai-model-chat-memory-jdbc      | `@nestjs-ai/model-chat-memory-repository-jsdbc`   | 100%     |
|                         | spring-ai-model-chat-memory-cassandra | —                                                 | 0%       |
| **Platform**            | spring-ai-autoconfigure               | `@nestjs-ai/platform`                             | 100%     |
|                         | spring-ai-mcp                         | `@nestjs-ai/mcp-common`                           | 10%      |
|                         | spring-ai-mcp-annotations             | `@nestjs-ai/mcp-annotations`                      | 5%       |

## Differences from Spring AI

NestJS AI mirrors Spring AI's module structure and API design, but adapts the following areas to fit the Node.js / TypeScript ecosystem.

### 1. Standard Schema instead of reflection-based JSON Schema

Spring AI derives JSON Schema for tool/function calling from Java classes via reflection. Node.js reflection is limited, so NestJS AI accepts any schema that implements [**Standard Schema**](https://standardschema.dev/) as the source of truth for tool parameters and structured output. Standard Schema is a vendor-neutral interface (`~standard.validate()` + `~standard.jsonSchema`) that [zod](https://github.com/colinhacks/zod), [valibot](https://github.com/fabian-hiller/valibot), [arktype](https://github.com/arktypeio/arktype), [effect](https://github.com/Effect-TS/effect), and others implement out of the box, so you can pick whichever library you prefer. The schema is both the runtime validator and the JSON Schema fed to the model.

```typescript
import { Tool } from "@nestjs-ai/model";
import { z } from "zod"; // or valibot, arktype, ... — any Standard-Schema-compatible library works

class WeatherTools {
  @Tool({
    description: "Get current weather for a city",
    parameters: z.object({
      city: z.string(),
      unit: z.enum(["celsius", "fahrenheit"]).optional(),
    }),
  })
  getWeather(input: { city: string; unit?: "celsius" | "fahrenheit" }) {
    return fetchWeather(input.city, input.unit);
  }
}
```

Structured output works the same way — pass a Standard Schema to `.entity()`:

```typescript
const sentiment = await chatClient
  .prompt("Classify: I love this product!")
  .call()
  .entity(z.object({ sentiment: z.enum(["positive", "negative", "neutral"]) }));
```

### 2. NestJS dynamic modules instead of Spring Boot auto-configuration

Spring AI wires beans through `@EnableAutoConfiguration` and `application.properties`. NestJS AI uses NestJS dynamic modules — `forRoot()`, `forFeature()`, `forFeatureAsync()` — so configuration is explicit in your module graph.

```typescript
import { Module } from "@nestjs/common";
import { NestAiModule } from "@nestjs-ai/platform";
import { OpenAiChatModelModule } from "@nestjs-ai/model-openai";
import { ChatClientModule } from "@nestjs-ai/client-chat";

@Module({
  imports: [
    NestAiModule.forRoot(),
    OpenAiChatModelModule.forFeature({
      apiKey: process.env.OPENAI_API_KEY,
      options: { model: "gpt-4o-mini", temperature: 0.7 },
    }),
    ChatClientModule.forFeature(),
  ],
})
export class AppModule {}
```

For dynamic configuration (e.g., `ConfigService`), use the async variant:

```typescript
OpenAiChatModelModule.forFeatureAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    apiKey: config.getOrThrow("OPENAI_API_KEY"),
    options: { model: config.get("OPENAI_MODEL", "gpt-4o-mini") },
  }),
});
```

### 3. Props objects instead of builder-only configuration

Spring AI's options classes are constructed via `.builder()...build()`. NestJS AI keeps the builder available (via `.builder()` / `.mutate()`) but options constructors accept a **plain props object (JSON literal)**, which matches TypeScript idioms and avoids fluent-chain ceremony.

```typescript
import { OpenAiChatOptions } from "@nestjs-ai/model-openai";

// Props style (preferred)
const options = new OpenAiChatOptions({
  model: "gpt-4o-mini",
  temperature: 0.7,
  maxTokens: 1024,
});

// Builder style (still supported, useful for partial mutation)
const tuned = OpenAiChatOptions.builder()
  .temperature(0.9)
  .maxTokens(2048)
  .build();
```

### 4. ChatClient `prompt()` accepts both fluent API and JSON literal

Spring AI's `ChatClient.prompt()` is fluent. NestJS AI's `prompt()` is overloaded so you can pick whichever style fits the call site — a bare string, a `Prompt` instance, a props object, or the fluent chain.

```typescript
// Fluent API (Spring AI-style)
await chatClient
  .prompt()
  .system("You are a helpful assistant.")
  .user("Summarize TypeScript in one sentence.")
  .call()
  .content();

// String shorthand
await chatClient
  .prompt("Summarize TypeScript in one sentence.")
  .call()
  .content();

// JSON literal props — most ergonomic when options are dynamic
await chatClient
  .prompt({
    system: "You are a helpful assistant.",
    user: "Summarize TypeScript in one sentence.",
    options: OpenAiChatOptions.builder().temperature(0.3),
  })
  .call()
  .content();
```

All four forms return the same `ChatClientRequestSpec`, so `.call()`, `.stream()`, `.entity(zodSchema)`, and advisor/tool composition work uniformly.

## Project Structure

```
nestjs-ai/
├── packages/
│   ├── model/                    # Core chat/embedding abstractions
│   ├── client-chat/              # High-level fluent ChatClient API
│   ├── commons/                  # Shared utilities & tokens
│   ├── platform/                 # NestJS module integration (NestAiModule)
│   ├── rag/                      # RAG pipeline
│   ├── vector-store/             # Vector store abstractions
│   ├── retry/                    # Retry utilities
│   ├── template-st/              # StringTemplate-based prompt templating
│   ├── integration-tests/        # Cross-package integration test suite
│   ├── models/
│   │   ├── openai/               # OpenAI provider
│   │   ├── google-genai/         # Google GenAI (Gemini / Vertex AI) provider
│   │   ├── anthropic/            # Anthropic (Claude) provider
│   │   └── transformers/         # Hugging Face local embeddings
│   ├── mcp/
│   │   ├── common/               # Model Context Protocol core
│   │   └── annotations/          # MCP annotations (WIP)
│   ├── vector-stores/
│   │   └── redis-store/          # Redis vector store
│   ├── memory/
│   │   └── repository/
│   │       ├── model-chat-memory-repository-redis/   # Redis-backed chat memory
│   │       ├── model-chat-memory-repository-mongodb/  # MongoDB-backed chat memory
│   │       └── model-chat-memory-repository-jsdbc/   # SQL-backed chat memory (MySQL/Postgres/Oracle/SQL Server/SQLite)
│   ├── document-readers/
│   │   ├── pdf-reader/           # PDF reader
│   │   ├── markdown-reader/      # Markdown reader
│   │   ├── cheerio-reader/       # HTML/web scraping
│   │   └── tika-reader/          # Apache Tika reader
│   └── advisors/
│       └── advisors-vector-store/ # Vector-store-backed advisors
├── docs/                         # Antora documentation site
└── turbo.json                    # Turborepo configuration
```

## Getting Started

### Prerequisites

- Node.js >= 22.12.0 (required for `require(esm)` support so ESM-only packages can be consumed from CJS)
- pnpm >= 10.0.0

All packages are published as **ESM only**. Consumer apps running Node.js 22.12+ can import them from either ESM or CJS code.

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

## License

NestJS AI is released under the [Apache License 2.0](./LICENSE), matching the license of the upstream [Spring AI](https://github.com/spring-projects/spring-ai) project.

## Acknowledgments

NestJS AI would not exist without the foundational work of the [Spring AI](https://github.com/spring-projects/spring-ai) team and contributors. This project is a faithful TypeScript/NestJS port of Spring AI's abstractions, module structure, and API design — all credit for the original architecture and research belongs to them.

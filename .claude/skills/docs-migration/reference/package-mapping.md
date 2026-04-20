# Package Mapping — Spring AI Artifacts to NestJS AI Packages

This file maps Spring AI Maven/Gradle artifacts to their @nestjs-ai npm package equivalents,
including required dependencies and module options.

## Ported Packages

These Spring AI artifacts have NestJS AI equivalents.

### Core Packages

| Spring AI Artifact | npm Package | Required Deps | Source Dir |
|-------------------|-------------|---------------|-----------|
| `spring-ai-model` | `@nestjs-ai/model` | — (core) | `packages/model/` |
| `spring-ai-commons` | `@nestjs-ai/commons` | — (core) | `packages/commons/` |
| `spring-ai-client-chat` | `@nestjs-ai/client-chat` | `@nestjs-ai/platform`, a chat model pkg | `packages/client-chat/` |
| (platform) | `@nestjs-ai/platform` | — (root) | `packages/platform/` |
| `spring-ai-template-st` | `@nestjs-ai/template-st` | — | `packages/template-st/` |
| `spring-ai-retry` | `@nestjs-ai/retry` | — | `packages/retry/` |
| `spring-ai-rag` | `@nestjs-ai/rag` | `@nestjs-ai/platform`, a chat model pkg | `packages/rag/` |

### Chat Model Packages

| Spring AI Artifact | npm Package | Required Deps | Source Dir |
|-------------------|-------------|---------------|-----------|
| `spring-ai-starter-model-openai` | `@nestjs-ai/model-openai` | `@nestjs-ai/platform` | `packages/models/openai/` |
| `spring-ai-starter-model-google-genai` | `@nestjs-ai/model-google-genai` | `@nestjs-ai/platform` | `packages/models/google-genai/` |

### Embedding Model Packages

| Spring AI Artifact | npm Package | Required Deps | Source Dir |
|-------------------|-------------|---------------|-----------|
| `spring-ai-transformers` / ONNX | `@nestjs-ai/model-transformers` | — | `packages/models/transformers/` |

### Vector Store Packages

| Spring AI Artifact | npm Package | Required Deps | Source Dir |
|-------------------|-------------|---------------|-----------|
| `spring-ai-starter-vector-store-redis` | `@nestjs-ai/vector-store-redis` | `@nestjs-ai/platform`, an embedding model pkg | `packages/vector-stores/redis-store/` |
| (base vector store) | `@nestjs-ai/vector-store` | — | `packages/vector-store/` |

### Memory / Chat History Packages

| Spring AI Artifact | npm Package | Required Deps | Source Dir |
|-------------------|-------------|---------------|-----------|
| (JDBC chat memory) | `@nestjs-ai/model-chat-memory-repository-jsdbc` | An ORM module (TypeORM, Prisma, etc.) | `packages/memory/repository/model-chat-memory-repository-jsdbc/` |
| (Redis chat memory) | `@nestjs-ai/model-chat-memory-repository-redis` | — | `packages/memory/repository/model-chat-memory-repository-redis/` |

### Infrastructure Packages

| Spring AI Artifact | npm Package | Required Deps | Source Dir |
|-------------------|-------------|---------------|-----------|
| (observation) | `@nestjs-ai/observation` | — | `packages/observation/` |
| (JSDBC) | `@nestjs-port/jsdbc` | An ORM module | — |

### MCP Packages

| Spring AI Artifact | npm Package | Required Deps | Source Dir |
|-------------------|-------------|---------------|-----------|
| `spring-ai-mcp` | `@nestjs-ai/mcp-common` | — | `packages/mcp/common/` |
| (MCP annotations) | `@nestjs-ai/mcp-annotations` | — | `packages/mcp/annotations/` |

### Document Reader Packages

| Spring AI Artifact | npm Package | Required Deps | Source Dir |
|-------------------|-------------|---------------|-----------|
| (PDF reader) | `@nestjs-ai/document-reader-pdf` | — | `packages/document-readers/pdf-reader/` |
| (Markdown reader) | `@nestjs-ai/document-reader-markdown` | — | `packages/document-readers/markdown-reader/` |
| (Cheerio/HTML reader) | `@nestjs-ai/document-reader-cheerio` | — | `packages/document-readers/cheerio-reader/` |
| (Tika reader) | `@nestjs-ai/document-reader-tika` | — | `packages/document-readers/tika-reader/` |

---

## Unported Packages

These Spring AI artifacts do **NOT** have NestJS AI equivalents yet.
When converting documentation for these, add a `[NOTE]` admonition block.

### Chat Models (not yet ported)
- `spring-ai-starter-model-anthropic` (Anthropic)
- `spring-ai-starter-model-azure-openai` (Azure OpenAI)
- `spring-ai-starter-model-bedrock-converse` (Amazon Bedrock)
- `spring-ai-starter-model-mistralai` (Mistral AI)
- `spring-ai-starter-model-ollama` (Ollama)
- `spring-ai-starter-model-deepseek` (DeepSeek)
- `spring-ai-starter-model-groq` (Groq)
- `spring-ai-starter-model-minimax` (MiniMax)
- `spring-ai-starter-model-moonshot` (Moonshot AI)
- `spring-ai-starter-model-nvidia` (NVIDIA)
- `spring-ai-starter-model-perplexity` (Perplexity AI)
- `spring-ai-starter-model-qianfan` (QianFan)

### Embedding Models (not yet ported)
- `spring-ai-starter-model-openai` (OpenAI embeddings — check if `@nestjs-ai/model-openai` includes embeddings)
- `spring-ai-bedrock-cohere-embedding`
- `spring-ai-bedrock-titan-embedding`
- `spring-ai-azure-openai-embeddings`
- `spring-ai-mistralai-embeddings`
- `spring-ai-ollama-embeddings`
- `spring-ai-postgresml-embeddings`

### Vector Stores (not yet ported)
- `spring-ai-starter-vector-store-pgvector` (PGvector)
- `spring-ai-starter-vector-store-pinecone` (Pinecone)
- `spring-ai-starter-vector-store-qdrant` (Qdrant)
- `spring-ai-starter-vector-store-weaviate` (Weaviate)
- `spring-ai-starter-vector-store-chroma` (Chroma)
- `spring-ai-starter-vector-store-neo4j` (Neo4j)
- `spring-ai-starter-vector-store-mongodb` (MongoDB Atlas)
- `spring-ai-starter-vector-store-milvus` (Milvus)
- `spring-ai-starter-vector-store-elasticsearch` (Elasticsearch)

### Image Models (not yet ported)
- `spring-ai-openai-image`
- `spring-ai-stabilityai-image`

### Audio Models (not yet ported)
- `spring-ai-openai-audio-speech`
- `spring-ai-openai-audio-transcription`

---

## Install Command Templates

When converting dependency blocks in documentation, use these templates.

### Chat model with platform

```bash
pnpm add @nestjs-ai/platform @nestjs-ai/model-openai
```

### Chat model with ChatClient

```bash
pnpm add @nestjs-ai/platform @nestjs-ai/model-openai @nestjs-ai/client-chat
```

### Embedding model (local transformers)

```bash
pnpm add @nestjs-ai/model-transformers
```

### Vector store with embedding model

```bash
pnpm add @nestjs-ai/platform @nestjs-ai/model-transformers @nestjs-ai/vector-store-redis
```

### RAG setup

```bash
pnpm add @nestjs-ai/platform @nestjs-ai/model-openai @nestjs-ai/client-chat @nestjs-ai/rag @nestjs-ai/model-transformers @nestjs-ai/vector-store-redis
```

### Chat memory (Redis)

```bash
pnpm add @nestjs-ai/model-chat-memory-repository-redis
```

### Chat memory (JSDBC — requires ORM)

```bash
pnpm add @nestjs-ai/model-chat-memory-repository-jsdbc @nestjs-port/jsdbc
```

### Observation

```bash
pnpm add @nestjs-ai/observation
```

---

## Module Options Quick Reference

### NestAiModule (from `@nestjs-ai/platform`)

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `httpClient` | `HttpClient` | `FetchHttpClient` | Custom HTTP client implementation |
| `global` | `boolean` | `true` | Whether to register as global module |

### OpenAiChatModelModule (from `@nestjs-ai/model-openai`)

Properties passed to `forFeature()` / `forFeatureAsync()`:

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `apiKey` | `string` | — | OpenAI API key |
| `baseUrl` | `string` | — | Custom base URL (for proxies or compatible APIs) |
| `projectId` | `string` | — | OpenAI project ID |
| `organizationId` | `string` | — | OpenAI organization ID |
| `completionsPath` | `string` | — | Custom completions endpoint path |
| `options.model` | `string` | — | Model name (e.g., `gpt-4o`, `gpt-4o-mini`) |
| `options.temperature` | `number` | — | Sampling temperature (0.0–2.0) |
| `options.maxTokens` | `number` | — | Maximum tokens in response |
| `options.topP` | `number` | — | Nucleus sampling parameter |
| `options.frequencyPenalty` | `number` | — | Frequency penalty (-2.0–2.0) |
| `options.presencePenalty` | `number` | — | Presence penalty (-2.0–2.0) |
| `options.stop` | `string[]` | — | Stop sequences |
| `options.seed` | `number` | — | Random seed for deterministic output |
| `options.user` | `string` | — | End-user identifier |
| `options.n` | `number` | — | Number of completions to generate |
| `options.reasoningEffort` | `string` | — | Reasoning effort level |

### GoogleGenAiChatModelModule (from `@nestjs-ai/model-google-genai`)

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `apiKey` | `string` | — | Google AI API key (for Gemini API) |
| `projectId` | `string` | — | GCP project ID (for Vertex AI) |
| `location` | `string` | — | GCP region (for Vertex AI) |
| `credentialsUri` | `string` | — | Path to credentials file (Vertex AI) |
| `vertexAi` | `boolean` | — | Use Vertex AI instead of Gemini API |
| `enableCachedContent` | `boolean` | — | Enable prompt caching service |
| `options.model` | `string` | — | Model name (e.g., `gemini-2.0-flash`) |
| `options.temperature` | `number` | — | Sampling temperature |
| `options.topP` | `number` | — | Nucleus sampling |
| `options.topK` | `number` | — | Top-K sampling |
| `options.maxOutputTokens` | `number` | — | Maximum output tokens |
| `options.candidateCount` | `number` | — | Number of candidates |
| `options.thinkingBudget` | `number` | — | Token budget for thinking |
| `options.includeThoughts` | `boolean` | — | Include thinking in response |

### TransformersEmbeddingModelModule (from `@nestjs-ai/model-transformers`)

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `model` | `string` | — | HuggingFace model ID |
| `quantized` | `boolean` | — | Use quantized model |
| `localFilesOnly` | `boolean` | — | Only use locally cached models |
| `revision` | `string` | — | Model revision |
| `cache.directory` | `string \| null` | — | Custom cache directory |
| `metadataMode` | `MetadataMode` | — | Metadata inclusion mode |

### RedisVectorStoreModule (from `@nestjs-ai/vector-store-redis`)

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `client` | `RedisClientType` | — | Pre-configured Redis client |
| `clientOptions` | `RedisClientOptions` | — | Redis connection options |
| `initializeSchema` | `boolean` | — | Auto-create index schema |
| `indexName` | `string` | — | Redis search index name |
| `prefix` | `string` | — | Key prefix |
| `contentFieldName` | `string` | — | Field name for document content |
| `embeddingFieldName` | `string` | — | Field name for embeddings |
| `vectorAlgorithm` | `RedisVectorAlgorithm` | — | `"FLAT"` or `"HNSW"` |
| `distanceMetric` | `RedisDistanceMetric` | — | `"COSINE"`, `"L2"`, or `"IP"` |
| `metadataFields` | `RedisMetadataField[]` | — | Metadata field definitions |
| `hnsw.m` | `number` | — | Max connections per HNSW node |
| `hnsw.efConstruction` | `number` | — | Construction effort |
| `hnsw.efRuntime` | `number` | — | Runtime search effort |

### RedisChatMemoryModule (from `@nestjs-ai/model-chat-memory-repository-redis`)

NOTE: Returns `Provider[]`, must be spread in `providers` array, not `imports`.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `client` | `RedisClientType` | — | Pre-configured Redis client |
| `clientOptions` | `RedisClientOptions` | — | Redis connection options |
| `indexName` | `string` | — | Redis search index name |
| `keyPrefix` | `string` | — | Key prefix for memory entries |
| `timeToLive` | `number \| null` | — | TTL in seconds |
| `initializeSchema` | `boolean` | — | Auto-create schema |
| `maxConversationIds` | `number` | — | Max conversations to retain |
| `maxMessagesPerConversation` | `number` | — | Max messages per conversation |
| `metadataFields` | `RedisChatMemoryMetadataField[]` | — | Metadata field definitions |

### JsdbcChatMemoryRepositoryModule (from `@nestjs-ai/model-chat-memory-repository-jsdbc`)

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `initializeSchema` | `boolean` | — | Auto-create database tables |

### ObservationModule (from `@nestjs-ai/observation`)

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `tracer` | `Tracer` | — | OpenTelemetry tracer instance |
| `meter` | `Meter` | — | OpenTelemetry meter instance |
| `ignoredMeters` | `IgnoredMeters[]` | — | Meters to exclude |
| `toolCalling.includeContent` | `boolean` | — | Include tool content in observations |

### ChatClientModule (from `@nestjs-ai/client-chat`)

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `customizer` | `(builder: ChatClient.Builder) => void` | — | Builder customizer function |
| `observations.logPrompt` | `boolean` | `false` | Log prompts in observations |
| `observations.logCompletion` | `boolean` | `false` | Log completions in observations |

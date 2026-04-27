/*
 * Copyright 2023-present the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { randomUUID } from "node:crypto";
import { DataSource } from "typeorm";
import { ChatClient } from "@nestjs-ai/client-chat";
import { Document } from "@nestjs-ai/commons";
import { ChatMemory } from "@nestjs-ai/model";
import {
  OpenAiChatModel,
  OpenAiChatOptions,
  OpenAiEmbeddingModel,
  OpenAiEmbeddingOptions,
} from "@nestjs-ai/model-openai";
import { VectorStoreChatMemoryAdvisor } from "@nestjs-ai/advisors-vector-store";
import { JsdbcTemplate } from "@nestjs-port/jsdbc";
import { TypeOrmDataSource } from "@nestjs-port/jsdbc/typeorm";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { PgVectorStore } from "../pg-vector-store.js";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

describe.skipIf(!OPENAI_API_KEY)(
  "PgVectorStoreVectorStoreChatMemoryAdvisorIT",
  () => {
    let postgresContainer: StartedPostgreSqlContainer;
    let typeormDataSource: DataSource;

    beforeAll(async () => {
      postgresContainer = await new PostgreSqlContainer(
        "pgvector/pgvector:pg17",
      )
        .withDatabase("postgres")
        .withUsername("postgres")
        .withPassword("postgres")
        .start();

      typeormDataSource = new DataSource({
        type: "postgres",
        url: postgresContainer.getConnectionUri(),
        synchronize: false,
        logging: false,
      });
      await typeormDataSource.initialize();
    }, 240_000);

    afterAll(async () => {
      await typeormDataSource?.destroy();
      await postgresContainer?.stop();
    }, 60_000);

    it("use custom conversation id", async () => {
      const apiKey = OPENAI_API_KEY ?? "";

      // Use a real OpenAI embedding model
      const embeddingModel = new OpenAiEmbeddingModel({
        options: OpenAiEmbeddingOptions.builder()
          .apiKey(apiKey)
          .model(OpenAiEmbeddingOptions.DEFAULT_EMBEDDING_MODEL)
          .build(),
      });

      // Create PgVectorStore
      const jdbcTemplate = createJdbcTemplateWithConnectionToTestcontainer();
      const store = PgVectorStore.builder(jdbcTemplate, embeddingModel)
        .dimensions(1536) // OpenAI default embedding size (adjust if needed)
        .initializeSchema(true)
        .build();
      await store.onModuleInit();

      // Add a document to the store for recall
      const conversationId = randomUUID();
      await store.add([new Document("Hello from memory", { conversationId })]);

      // Build ChatClient with VectorStoreChatMemoryAdvisor
      const chatClient = ChatClient.builder(
        new OpenAiChatModel({
          options: OpenAiChatOptions.builder()
            .apiKey(apiKey)
            .model("gpt-4o-mini")
            .build(),
        }),
      )
        .defaultAdvisors(VectorStoreChatMemoryAdvisor.builder(store).build())
        .build();

      // Send a prompt
      const answer = await chatClient
        .prompt()
        .user("Say hello")
        .advisors((advisorSpec) =>
          advisorSpec.param(ChatMemory.CONVERSATION_ID, conversationId),
        )
        .call()
        .content();

      expect(answer).toMatch(/hello/i);
    });

    it("semantic search retrieves relevant memory", async () => {
      const apiKey = OPENAI_API_KEY ?? "";

      const embeddingModel = new OpenAiEmbeddingModel({
        options: OpenAiEmbeddingOptions.builder()
          .apiKey(apiKey)
          .model(OpenAiEmbeddingOptions.DEFAULT_EMBEDDING_MODEL)
          .build(),
      });
      const jdbcTemplate = createJdbcTemplateWithConnectionToTestcontainer();
      const store = PgVectorStore.builder(jdbcTemplate, embeddingModel)
        .dimensions(1536)
        .initializeSchema(true)
        .build();
      await store.onModuleInit();

      const conversationId = randomUUID();
      // Store diverse messages
      await store.add([
        new Document("The Eiffel Tower is in Paris.", { conversationId }),
        new Document("Bananas are yellow.", { conversationId }),
        new Document("Mount Everest is the tallest mountain in the world.", {
          conversationId,
        }),
        new Document("Dogs are loyal pets.", { conversationId }),
      ]);

      const chatClient = ChatClient.builder(
        new OpenAiChatModel({
          options: OpenAiChatOptions.builder()
            .apiKey(apiKey)
            .model("gpt-4o-mini")
            .build(),
        }),
      )
        .defaultAdvisors(
          VectorStoreChatMemoryAdvisor.builder(store).defaultTopK(1).build(),
        )
        .build();

      // Send a semantically related query
      const answer = await chatClient
        .prompt()
        .user("Where is the Eiffel Tower located?")
        .advisors((advisorSpec) =>
          advisorSpec.param(ChatMemory.CONVERSATION_ID, conversationId),
        )
        .call()
        .content();

      // Assert that the answer is based on the correct semantic memory
      expect(answer).toMatch(/paris/i);
      expect(answer).not.toMatch(/Bananas are yellow/i);
      expect(answer).not.toMatch(/Mount Everest/i);
      expect(answer).not.toMatch(/Dogs are loyal pets/i);
    });

    it("semantic synonym retrieval", async () => {
      const apiKey = OPENAI_API_KEY ?? "";

      const embeddingModel = new OpenAiEmbeddingModel({
        options: OpenAiEmbeddingOptions.builder()
          .apiKey(apiKey)
          .model(OpenAiEmbeddingOptions.DEFAULT_EMBEDDING_MODEL)
          .build(),
      });
      const jdbcTemplate = createJdbcTemplateWithConnectionToTestcontainer();
      const store = PgVectorStore.builder(jdbcTemplate, embeddingModel)
        .dimensions(1536)
        .initializeSchema(true)
        .build();
      await store.onModuleInit();

      const conversationId = randomUUID();
      await store.add([
        new Document("Automobiles are fast.", { conversationId }),
      ]);

      const chatClient = ChatClient.builder(
        new OpenAiChatModel({
          options: OpenAiChatOptions.builder()
            .apiKey(apiKey)
            .model("gpt-4o-mini")
            .build(),
        }),
      )
        .defaultAdvisors(
          VectorStoreChatMemoryAdvisor.builder(store).defaultTopK(1).build(),
        )
        .build();

      const answer = await chatClient
        .prompt()
        .user("Tell me about cars.")
        .advisors((advisorSpec) =>
          advisorSpec.param(ChatMemory.CONVERSATION_ID, conversationId),
        )
        .call()
        .content();

      expect(answer).toMatch(/automobile|fast/i);
    });

    it("irrelevant message exclusion", async () => {
      const apiKey = OPENAI_API_KEY ?? "";

      const embeddingModel = new OpenAiEmbeddingModel({
        options: OpenAiEmbeddingOptions.builder()
          .apiKey(apiKey)
          .model(OpenAiEmbeddingOptions.DEFAULT_EMBEDDING_MODEL)
          .build(),
      });
      const jdbcTemplate = createJdbcTemplateWithConnectionToTestcontainer();
      const store = PgVectorStore.builder(jdbcTemplate, embeddingModel)
        .dimensions(1536)
        .initializeSchema(true)
        .build();
      await store.onModuleInit();

      const conversationId = randomUUID();
      await store.add([
        new Document("The capital of Italy is Rome.", { conversationId }),
        new Document("Bananas are yellow.", { conversationId }),
      ]);

      const chatClient = ChatClient.builder(
        new OpenAiChatModel({
          options: OpenAiChatOptions.builder()
            .apiKey(apiKey)
            .model("gpt-4o-mini")
            .build(),
        }),
      )
        .defaultAdvisors(
          VectorStoreChatMemoryAdvisor.builder(store).defaultTopK(2).build(),
        )
        .build();

      const answer = await chatClient
        .prompt()
        .user("What is the capital of Italy?")
        .advisors((advisorSpec) =>
          advisorSpec.param(ChatMemory.CONVERSATION_ID, conversationId),
        )
        .call()
        .content();

      expect(answer).toMatch(/rome/i);
      expect(answer).not.toMatch(/banana/i);
    });

    it("top k semantic relevance", async () => {
      const apiKey = OPENAI_API_KEY ?? "";

      const embeddingModel = new OpenAiEmbeddingModel({
        options: OpenAiEmbeddingOptions.builder()
          .apiKey(apiKey)
          .model(OpenAiEmbeddingOptions.DEFAULT_EMBEDDING_MODEL)
          .build(),
      });
      const jdbcTemplate = createJdbcTemplateWithConnectionToTestcontainer();
      const store = PgVectorStore.builder(jdbcTemplate, embeddingModel)
        .dimensions(1536)
        .initializeSchema(true)
        .build();
      await store.onModuleInit();

      const conversationId = randomUUID();
      await store.add([
        new Document("The cat sat on the mat.", { conversationId }),
        new Document("A cat is a small domesticated animal.", {
          conversationId,
        }),
        new Document("Dogs are loyal pets.", { conversationId }),
      ]);

      const chatClient = ChatClient.builder(
        new OpenAiChatModel({
          options: OpenAiChatOptions.builder()
            .apiKey(apiKey)
            .model("gpt-4o-mini")
            .build(),
        }),
      )
        .defaultAdvisors(
          VectorStoreChatMemoryAdvisor.builder(store).defaultTopK(1).build(),
        )
        .build();

      const answer = await chatClient
        .prompt()
        .user("What can you tell me about cats?")
        .advisors((advisorSpec) =>
          advisorSpec.param(ChatMemory.CONVERSATION_ID, conversationId),
        )
        .call()
        .content();

      expect(answer).toMatch(/cat/i);
      expect(answer).not.toMatch(/dog/i);
    });

    it("semantic retrieval with paraphrasing", async () => {
      const apiKey = OPENAI_API_KEY ?? "";

      const embeddingModel = new OpenAiEmbeddingModel({
        options: OpenAiEmbeddingOptions.builder()
          .apiKey(apiKey)
          .model(OpenAiEmbeddingOptions.DEFAULT_EMBEDDING_MODEL)
          .build(),
      });
      const jdbcTemplate = createJdbcTemplateWithConnectionToTestcontainer();
      const store = PgVectorStore.builder(jdbcTemplate, embeddingModel)
        .dimensions(1536)
        .initializeSchema(true)
        .build();
      await store.onModuleInit();

      const conversationId = randomUUID();
      await store.add([
        new Document("The quick brown fox jumps over the lazy dog.", {
          conversationId,
        }),
      ]);

      const chatClient = ChatClient.builder(
        new OpenAiChatModel({
          options: OpenAiChatOptions.builder()
            .apiKey(apiKey)
            .model("gpt-4o-mini")
            .build(),
        }),
      )
        .defaultAdvisors(
          VectorStoreChatMemoryAdvisor.builder(store).defaultTopK(1).build(),
        )
        .build();

      const answer = await chatClient
        .prompt()
        .user("Tell me about a fast animal leaping over another.")
        .advisors((advisorSpec) =>
          advisorSpec.param(ChatMemory.CONVERSATION_ID, conversationId),
        )
        .call()
        .content();

      expect(answer).toMatch(/fox|dog/i);
    });

    it("multiple relevant memories top k", async () => {
      const apiKey = OPENAI_API_KEY ?? "";

      const embeddingModel = new OpenAiEmbeddingModel({
        options: OpenAiEmbeddingOptions.builder()
          .apiKey(apiKey)
          .model(OpenAiEmbeddingOptions.DEFAULT_EMBEDDING_MODEL)
          .build(),
      });
      const jdbcTemplate = createJdbcTemplateWithConnectionToTestcontainer();
      const store = PgVectorStore.builder(jdbcTemplate, embeddingModel)
        .dimensions(1536)
        .initializeSchema(true)
        .build();
      await store.onModuleInit();

      const conversationId = randomUUID();
      await store.add([
        new Document("Apples are red.", { conversationId }),
        new Document("Strawberries are also red.", { conversationId }),
        new Document("Bananas are yellow.", { conversationId }),
      ]);

      const chatClient = ChatClient.builder(
        new OpenAiChatModel({
          options: OpenAiChatOptions.builder()
            .apiKey(apiKey)
            .model("gpt-4o-mini")
            .build(),
        }),
      )
        .defaultAdvisors(
          VectorStoreChatMemoryAdvisor.builder(store).defaultTopK(2).build(),
        )
        .build();

      const answer = await chatClient
        .prompt()
        .user("What fruits are red?")
        .advisors((advisorSpec) =>
          advisorSpec.param(ChatMemory.CONVERSATION_ID, conversationId),
        )
        .call()
        .content();

      expect(answer).toMatch(/apple/i);
      expect(answer).toMatch(/strawber/i);
      expect(answer).not.toMatch(/banana/i);
    });

    it("no relevant memory", async () => {
      const apiKey = OPENAI_API_KEY ?? "";

      const embeddingModel = new OpenAiEmbeddingModel({
        options: OpenAiEmbeddingOptions.builder()
          .apiKey(apiKey)
          .model(OpenAiEmbeddingOptions.DEFAULT_EMBEDDING_MODEL)
          .build(),
      });
      const jdbcTemplate = createJdbcTemplateWithConnectionToTestcontainer();
      const store = PgVectorStore.builder(jdbcTemplate, embeddingModel)
        .dimensions(1536)
        .initializeSchema(true)
        .build();
      await store.onModuleInit();

      const conversationId = randomUUID();
      await store.add([new Document("The sun is a star.", { conversationId })]);

      const chatClient = ChatClient.builder(
        new OpenAiChatModel({
          options: OpenAiChatOptions.builder()
            .apiKey(apiKey)
            .model("gpt-4o-mini")
            .build(),
        }),
      )
        .defaultAdvisors(
          VectorStoreChatMemoryAdvisor.builder(store).defaultTopK(1).build(),
        )
        .build();

      const answer = await chatClient
        .prompt()
        .user("What is the capital of Spain?")
        .advisors((advisorSpec) =>
          advisorSpec.param(ChatMemory.CONVERSATION_ID, conversationId),
        )
        .call()
        .content();

      expect(answer).not.toMatch(/sun/i);
      expect(answer).not.toMatch(/star/i);
    });

    function createJdbcTemplateWithConnectionToTestcontainer(): JsdbcTemplate {
      return new JsdbcTemplate(new TypeOrmDataSource(typeormDataSource));
    }
  },
);

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
import {
  AssistantMessage,
  ChatMemory,
  ChatModel,
  ChatResponse,
  type EmbeddingModel,
  Generation,
  type Prompt,
  SystemMessage,
} from "@nestjs-ai/model";
import { VectorStoreChatMemoryAdvisor } from "@nestjs-ai/advisors-vector-store";
import { JsdbcTemplate } from "@nestjs-port/jsdbc";
import { TypeOrmDataSource } from "@nestjs-port/jsdbc/typeorm";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { type Observable, of } from "rxjs";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { PgVectorStore } from "../pg-vector-store.js";
import { SearchRequest } from "@nestjs-ai/vector-store";

describe("PgVectorStoreWithChatMemoryAdvisorIT", () => {
  let postgresContainer: StartedPostgreSqlContainer;
  let typeormDataSource: DataSource;

  const embed = [0.003961659, -0.0073295482, 0.02663665];

  class MockChatModel extends ChatModel {
    lastCallPrompt: Prompt | null = null;
    lastStreamPrompt: Prompt | null = null;

    get defaultOptions() {
      return super.defaultOptions;
    }

    protected override async callPrompt(prompt: Prompt): Promise<ChatResponse> {
      this.lastCallPrompt = prompt;
      // Mock the regular call method
      return createChatResponse(
        "Why don't scientists trust atoms?\nBecause they make up everything!\n",
      );
    }

    /**
     * Create a mock ChatModel that supports streaming responses for testing.
     * @return A mock ChatModel that returns a predefined streaming response
     */
    protected override streamPrompt(prompt: Prompt): Observable<ChatResponse> {
      this.lastStreamPrompt = prompt;
      // Mock the streaming method
      return of(
        createChatResponse("Why"),
        createChatResponse(" don't"),
        createChatResponse(" scientists"),
        createChatResponse(" trust"),
        createChatResponse(" atoms?"),
        createChatResponse("\nBecause"),
        createChatResponse(" they"),
        createChatResponse(" make"),
        createChatResponse(" up"),
        createChatResponse(" everything!"),
      );
    }
  }

  beforeAll(async () => {
    postgresContainer = await new PostgreSqlContainer("pgvector/pgvector:pg17")
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

  /**
   * Test that chats with {@link VectorStoreChatMemoryAdvisor} get advised with
   * similar messages from the (gp)vector store.
   */
  it("advised chat should have similar messages from vector store", async () => {
    const chatModel = new MockChatModel();
    const embeddingModel = createEmbeddingModel();
    const store = await createPgVectorStoreUsingTestcontainer(embeddingModel);
    const conversationId = randomUUID();
    await initStore(store, conversationId);

    await ChatClient.builder(chatModel)
      .build()
      .prompt()
      .user("joke")
      .advisors((advisorSpec) => {
        advisorSpec
          .advisors(VectorStoreChatMemoryAdvisor.builder(store).build())
          .param(ChatMemory.CONVERSATION_ID, conversationId);
      })
      .call()
      .chatResponse();

    verifyRequestHasBeenAdvisedWithMessagesFromVectorStore(chatModel);
  });

  it("advised chat should have similar messages from vector store when system message provided", async () => {
    const chatModel = new MockChatModel();
    const embeddingModel = createEmbeddingModel();
    const store = await createPgVectorStoreUsingTestcontainer(embeddingModel);
    const conversationId = randomUUID();
    await initStore(store, conversationId);

    await ChatClient.builder(chatModel)
      .build()
      .prompt()
      .system("You are a helpful assistant.")
      .user("joke")
      .advisors((advisorSpec) => {
        advisorSpec
          .advisors(VectorStoreChatMemoryAdvisor.builder(store).build())
          .param(ChatMemory.CONVERSATION_ID, conversationId);
      })
      .call()
      .chatResponse();

    const prompt = chatModel.lastCallPrompt;
    expect(prompt).not.toBeNull();
    expect(prompt?.instructions[0]).toBeInstanceOf(SystemMessage);
    expect(normalizeWhitespace(prompt?.instructions[0].text ?? "")).toBe(
      normalizeWhitespace(`
				You are a helpful assistant.

				Use the long term conversation memory from the LONG_TERM_MEMORY section to provide accurate answers.

				---------------------
				LONG_TERM_MEMORY:
				Tell me a good joke
				Tell me a bad joke
				---------------------
				`),
    );
  });

  /**
   * Test that streaming chats with {@link VectorStoreChatMemoryAdvisor} get advised
   * with similar messages from the vector store and properly handle streaming
   * responses.
   *
   * This test verifies that the fix for the bug reported in
   * https://github.com/spring-projects/spring-ai/issues/3152 works correctly. The
   * VectorStoreChatMemoryAdvisor now properly handles streaming responses and saves the
   * assistant's messages to the vector store.
   */
  it("advised streaming chat should have similar messages from vector store", async () => {
    // Create a ChatModel with streaming support
    const chatModel = new MockChatModel();
    const embeddingModel = createEmbeddingModel();
    // Create and initialize the vector store
    const store = await createPgVectorStoreUsingTestcontainer(embeddingModel);
    const conversationId = randomUUID();
    await initStore(store, conversationId);

    // Create a chat client with the VectorStoreChatMemoryAdvisor
    const chatClient = ChatClient.builder(chatModel).build();

    // Execute a streaming chat request
    const responseStream = chatClient
      .prompt()
      .user("joke")
      .advisors((advisorSpec) => {
        advisorSpec
          .advisors(VectorStoreChatMemoryAdvisor.builder(store).build())
          .param(ChatMemory.CONVERSATION_ID, conversationId);
      })
      .stream()
      .content();

    // Collect all streaming chunks
    const streamingChunks = await collectStream(responseStream);
    // Verify the streaming response
    expect(streamingChunks).not.toBeNull();
    expect(streamingChunks.join("")).toContain("scientists");
    expect(streamingChunks.join("")).toContain("atoms");
    expect(streamingChunks.join("")).toContain("everything");

    // Verify the request was properly advised with vector store content
    const prompt = chatModel.lastStreamPrompt;
    expect(prompt).not.toBeNull();
    expect(prompt?.instructions[0]).toBeInstanceOf(SystemMessage);
    expect(normalizeWhitespace(prompt?.instructions[0].text ?? "")).toBe(
      normalizeWhitespace(`
				Use the long term conversation memory from the LONG_TERM_MEMORY section to provide accurate answers.

				---------------------
				LONG_TERM_MEMORY:
				Tell me a good joke
				Tell me a bad joke
				---------------------
				`),
    );

    // Verify that the assistant's response was properly added to the vector store
    // after streaming completed
    // This verifies that the fix for the adviseStream implementation works correctly
    await waitForAssistantDocuments(store, conversationId);

    const assistantDocuments = await store.similaritySearch(
      SearchRequest.builder()
        .query("atoms")
        .topK(4)
        .similarityThreshold(0)
        .filterExpression(
          `conversationId=='${conversationId}' && messageType._name=='ASSISTANT'`,
        )
        .build(),
    );

    // With our fix, the assistant's response should be saved to the vector store
    expect(assistantDocuments).not.toHaveLength(0);
    expect(assistantDocuments[0].text).toContain("scientists");
    expect(assistantDocuments[0].text).toContain("atoms");
    expect(assistantDocuments[0].text).toContain("everything");
  });

  /**
   * Test that verifies the fix for the bug reported in
   * https://github.com/spring-projects/spring-ai/issues/3152. The
   * VectorStoreChatMemoryAdvisor now properly handles streaming responses with empty
   * messages by using ChatClientMessageAggregator to aggregate messages before calling
   * the after method.
   */
  it("vector store chat memory advisor should handle empty messages in stream", async () => {
    // Create a ChatModel with problematic streaming behavior
    const chatModel = new MockChatModelWithEmptyTail();
    const embeddingModel = createEmbeddingModel();
    // Create and initialize the vector store
    const store = await createPgVectorStoreUsingTestcontainer(embeddingModel);
    const conversationId = randomUUID();
    await initStore(store, conversationId);

    // Create a chat client with the VectorStoreChatMemoryAdvisor
    const chatClient = ChatClient.builder(chatModel).build();

    // Execute a streaming chat request
    // This should now succeed with our fix
    const responseStream = chatClient
      .prompt()
      .user("joke")
      .advisors((advisorSpec) => {
        advisorSpec
          .advisors(VectorStoreChatMemoryAdvisor.builder(store).build())
          .param(ChatMemory.CONVERSATION_ID, conversationId);
      })
      .stream()
      .content();

    // Collect all streaming chunks - this should no longer throw an exception
    const streamingChunks = await collectStream(responseStream);
    expect(streamingChunks).not.toBeNull();
    expect(streamingChunks.join("")).toContain("scientists");
    expect(streamingChunks.join("")).toContain("atoms");
    expect(streamingChunks.join("")).toContain("everything");

    // Verify that the assistant's response was properly added to the vector store
    // This verifies that our fix works correctly
    await waitForAssistantDocuments(store, conversationId);

    const assistantDocuments = await store.similaritySearch(
      SearchRequest.builder()
        .query("atoms")
        .topK(4)
        .similarityThreshold(0)
        .filterExpression(
          `conversationId=='${conversationId}' && messageType._name=='ASSISTANT'`,
        )
        .build(),
    );

    expect(assistantDocuments).not.toHaveLength(0);
    expect(assistantDocuments[0].text).toContain("scientists");
    expect(assistantDocuments[0].text).toContain("atoms");
    expect(assistantDocuments[0].text).toContain("everything");
  });

  function verifyRequestHasBeenAdvisedWithMessagesFromVectorStore(
    chatModel: MockChatModel,
  ): void {
    expect(chatModel.lastCallPrompt).not.toBeNull();
    expect(chatModel.lastCallPrompt?.instructions[0]).toBeInstanceOf(
      SystemMessage,
    );
    expect(
      normalizeWhitespace(chatModel.lastCallPrompt?.instructions[0].text ?? ""),
    ).toBe(
      normalizeWhitespace(`
				Use the long term conversation memory from the LONG_TERM_MEMORY section to provide accurate answers.

				---------------------
				LONG_TERM_MEMORY:
				Tell me a good joke
				Tell me a bad joke
				---------------------
				`),
    );
  }

  async function initStore(store: PgVectorStore, conversationId: string) {
    await store.onModuleInit();
    // fill the store
    await store.add([
      new Document("Tell me a good joke", { conversationId }),
      new Document("Tell me a bad joke", {
        conversationId,
        messageType: "USER",
      }),
    ]);
  }

  async function createPgVectorStoreUsingTestcontainer(
    embeddingModel: EmbeddingModel,
  ): Promise<PgVectorStore> {
    const jdbcTemplate = createJdbcTemplateWithConnectionToTestcontainer();
    return (
      PgVectorStore.builder(jdbcTemplate, embeddingModel)
        .dimensions(3) // match embedding dimensions
        // initialize embeddings schema
        .initializeSchema(true)
        .build()
    );
  }

  function createJdbcTemplateWithConnectionToTestcontainer(): JsdbcTemplate {
    return new JsdbcTemplate(new TypeOrmDataSource(typeormDataSource));
  }

  function createEmbeddingModel(): EmbeddingModel {
    return {
      dimensions: vi.fn(async () => 3),
      embed: vi.fn(async (...args: unknown[]) => {
        if (Array.isArray(args[0])) {
          return [embed, embed];
        }
        return embed;
      }),
    } as unknown as EmbeddingModel;
  }

  function createChatResponse(content: string): ChatResponse {
    return new ChatResponse({
      generations: [
        new Generation({
          assistantMessage: new AssistantMessage({ content }),
        }),
      ],
    });
  }

  async function collectStream(stream: Observable<string>): Promise<string[]> {
    const chunks: string[] = [];
    await new Promise<void>((resolve, reject) => {
      stream.subscribe({
        next: (chunk) => chunks.push(chunk),
        error: reject,
        complete: resolve,
      });
    });
    return chunks;
  }

  async function waitForAssistantDocuments(
    store: PgVectorStore,
    conversationId: string,
  ): Promise<void> {
    const request = SearchRequest.builder()
      .query("atoms")
      .topK(4)
      .similarityThreshold(0)
      .filterExpression(
        `conversationId=='${conversationId}' && messageType._name=='ASSISTANT'`,
      )
      .build();

    const deadline = Date.now() + 5_000;
    while (Date.now() < deadline) {
      const documents = await store.similaritySearch(request);
      if (documents.length > 0) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    throw new Error("Timed out waiting for assistant documents");
  }

  function normalizeWhitespace(value: string): string {
    return value.replace(/\s+/g, " ").trim();
  }

  /**
   * Create a mock ChatModel that simulates the problematic streaming behavior.
   * This mock includes a final empty message that triggers the bug in
   * VectorStoreChatMemoryAdvisor.
   * @return A mock ChatModel that returns a problematic streaming response
   */
  class MockChatModelWithEmptyTail extends MockChatModel {
    protected override streamPrompt(prompt: Prompt): Observable<ChatResponse> {
      this.lastStreamPrompt = prompt;
      // Mock the streaming method with a problematic final message (empty content)
      // This simulates the real-world condition that triggers the bug
      return of(
        createChatResponse("Why"),
        createChatResponse(" don't"),
        createChatResponse(" scientists"),
        createChatResponse(" trust"),
        createChatResponse(" atoms?"),
        createChatResponse("\nBecause"),
        createChatResponse(" they"),
        createChatResponse(" make"),
        createChatResponse(" up"),
        createChatResponse(" everything!"),
        // This final empty message triggers the bug in
        // VectorStoreChatMemoryAdvisor
        createChatResponse(""),
      );
    }
  }
});

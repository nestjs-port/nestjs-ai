import { randomUUID } from "node:crypto";
import { AssistantMessage, type Message, UserMessage } from "@nestjs-ai/model";
import { createClient } from "redis";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { RedisChatMemoryRepository } from "../redis-chat-memory-repository";

describe("RedisChatMemoryIT", () => {
  const conversationId = "test-conversation";

  let redisContainer: StartedTestContainer | null = null;
  let client: ReturnType<typeof createClient>;
  let chatMemory: RedisChatMemoryRepository;
  let indexName = "";
  let redisUrl = "";
  const cleanupIndexes = new Set<string>();

  beforeAll(async () => {
    redisContainer = await new GenericContainer("redis/redis-stack:latest")
      .withExposedPorts(6379)
      .start();
    redisUrl = `redis://${redisContainer.getHost()}:${redisContainer.getMappedPort(6379)}`;

    client = createClient({ url: redisUrl }).on("error", () => {
      // Keep tests deterministic even when redis emits background connection errors.
    });
    await client.connect();
  }, 120_000);

  beforeEach(async () => {
    indexName = `test-${randomUUID()}-chat-memory-idx`;
    cleanupIndexes.add(indexName);
    chatMemory = await RedisChatMemoryRepository.builder()
      .client(client)
      .indexName(indexName)
      .build();

    await chatMemory.deleteByConversationId(conversationId);
  });

  afterEach(async () => {
    for (const currentIndex of cleanupIndexes) {
      try {
        await client.sendCommand(["FT.DROPINDEX", currentIndex]);
      } catch {
        // Ignore cleanup errors in case index was not created or already removed.
      }
    }
    cleanupIndexes.clear();
  });

  afterAll(async () => {
    if (!client) {
      return;
    }

    if (client.isOpen) {
      const closable = client as unknown as {
        close?: () => Promise<void>;
        quit?: () => Promise<string>;
        disconnect?: () => void;
      };

      if (closable.close) {
        await closable.close();
        return;
      }

      if (closable.quit) {
        await closable.quit();
        return;
      }

      closable.disconnect?.();
    }

    await redisContainer?.stop();
  }, 60_000);

  it("should store and retrieve messages", async () => {
    await chatMemory.add(conversationId, new UserMessage({ content: "Hello" }));
    await chatMemory.add(
      conversationId,
      new AssistantMessage({ content: "Hi there!" }),
    );
    await chatMemory.add(
      conversationId,
      new UserMessage({ content: "How are you?" }),
    );

    const messages = await chatMemory.findByConversationId(conversationId);

    expect(messages).toHaveLength(3);
    expect(messages[0]?.text).toBe("Hello");
    expect(messages[1]?.text).toBe("Hi there!");
    expect(messages[2]?.text).toBe("How are you?");
  });

  it("should respect message limit", async () => {
    const limitedIndexName = `test-${randomUUID()}-limited-chat-memory-idx`;
    const limitedChatMemory = await RedisChatMemoryRepository.builder()
      .client(client)
      .indexName(limitedIndexName)
      .maxMessagesPerConversation(2)
      .build();
    cleanupIndexes.add(limitedIndexName);

    await limitedChatMemory.add(
      conversationId,
      new UserMessage({ content: "Message 1" }),
    );
    await limitedChatMemory.add(
      conversationId,
      new AssistantMessage({ content: "Message 2" }),
    );
    await limitedChatMemory.add(
      conversationId,
      new UserMessage({ content: "Message 3" }),
    );

    const messages =
      await limitedChatMemory.findByConversationId(conversationId);
    expect(messages).toHaveLength(2);
  });

  it("should clear conversation", async () => {
    await chatMemory.add(conversationId, new UserMessage({ content: "Hello" }));
    await chatMemory.add(
      conversationId,
      new AssistantMessage({ content: "Hi" }),
    );

    await chatMemory.deleteByConversationId(conversationId);

    const messages = await chatMemory.findByConversationId(conversationId);
    expect(messages).toHaveLength(0);
  });

  it("should handle batch message addition", async () => {
    const messageBatch: Message[] = [
      new UserMessage({ content: "Message 1" }),
      new AssistantMessage({ content: "Response 1" }),
      new UserMessage({ content: "Message 2" }),
      new AssistantMessage({ content: "Response 2" }),
    ];

    await chatMemory.addAll(conversationId, messageBatch);
    const retrievedMessages =
      await chatMemory.findByConversationId(conversationId);

    expect(retrievedMessages).toHaveLength(4);
  });

  it("should handle time to live", async () => {
    const ttlIndexName = `test-${randomUUID()}-ttl-chat-memory-idx`;
    const shortTtlMemory = await RedisChatMemoryRepository.builder()
      .client(client)
      .indexName(ttlIndexName)
      .keyPrefix("short-lived:")
      .ttlSeconds(2)
      .build();
    cleanupIndexes.add(ttlIndexName);

    await shortTtlMemory.add(
      conversationId,
      new UserMessage({ content: "This should expire" }),
    );
    expect(
      await shortTtlMemory.findByConversationId(conversationId),
    ).toHaveLength(1);

    await new Promise((resolve) => setTimeout(resolve, 2100));
    expect(
      await shortTtlMemory.findByConversationId(conversationId),
    ).toHaveLength(0);
  });

  it("should maintain message order", async () => {
    await chatMemory.add(conversationId, new UserMessage({ content: "First" }));
    await new Promise((resolve) => setTimeout(resolve, 10));
    await chatMemory.add(
      conversationId,
      new AssistantMessage({ content: "Second" }),
    );
    await new Promise((resolve) => setTimeout(resolve, 10));
    await chatMemory.add(conversationId, new UserMessage({ content: "Third" }));

    const messages = await chatMemory.findByConversationId(conversationId);
    expect(messages).toHaveLength(3);
    expect(messages[0]?.text).toBe("First");
    expect(messages[1]?.text).toBe("Second");
    expect(messages[2]?.text).toBe("Third");
  });

  it("should handle multiple conversations", async () => {
    const conv1 = "conversation-1";
    const conv2 = "conversation-2";

    await chatMemory.add(conv1, new UserMessage({ content: "Conv1 Message" }));
    await chatMemory.add(conv2, new UserMessage({ content: "Conv2 Message" }));

    const conv1Messages = await chatMemory.findByConversationId(conv1);
    const conv2Messages = await chatMemory.findByConversationId(conv2);

    expect(conv1Messages).toHaveLength(1);
    expect(conv2Messages).toHaveLength(1);
    expect(conv1Messages[0]?.text).toBe("Conv1 Message");
    expect(conv2Messages[0]?.text).toBe("Conv2 Message");
  });
});

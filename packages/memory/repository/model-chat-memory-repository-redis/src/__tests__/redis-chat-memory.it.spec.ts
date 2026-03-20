import { AssistantMessage, type Message, UserMessage } from "@nestjs-ai/model";
import { createClient } from "redis";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { RedisChatMemoryConfig } from "../redis-chat-memory-config";
import { RedisChatMemoryRepository } from "../redis-chat-memory-repository";

describe("RedisChatMemoryIT", () => {
  const conversationId = "test-conversation";

  let redisContainer: StartedTestContainer | null = null;
  let client: ReturnType<typeof createClient>;
  let chatMemory: RedisChatMemoryRepository;
  const cleanupIndexes = new Set<string>();

  beforeAll(async () => {
    redisContainer = await new GenericContainer("redis/redis-stack:latest")
      .withExposedPorts(6379)
      .start();
    const redisUrl = `redis://${redisContainer.getHost()}:${redisContainer.getMappedPort(6379)}`;

    client = createClient({ url: redisUrl });
    await client.connect();
  }, 120_000);

  beforeEach(async () => {
    chatMemory = await RedisChatMemoryRepository.builder()
      .client(client)
      .indexName(`test-${RedisChatMemoryConfig.DEFAULT_INDEX_NAME}`)
      .build();

    await chatMemory.clear(conversationId);
  });

  afterAll(async () => {
    if (!client) {
      return;
    }

    await client.close();
    await redisContainer?.stop();
  }, 60_000);

  it("should store and retrieve messages", async () => {
    // Add messages
    await chatMemory.add(conversationId, new UserMessage({ content: "Hello" }));
    await chatMemory.add(
      conversationId,
      new AssistantMessage({ content: "Hi there!" }),
    );
    await chatMemory.add(
      conversationId,
      new UserMessage({ content: "How are you?" }),
    );

    // Retrieve messages
    const messages = await chatMemory.get(conversationId, 10);

    expect(messages).toHaveLength(3);
    expect(messages[0]?.text).toBe("Hello");
    expect(messages[1]?.text).toBe("Hi there!");
    expect(messages[2]?.text).toBe("How are you?");
  });

  it("should respect message limit", async () => {
    // Add messages
    await chatMemory.add(
      conversationId,
      new UserMessage({ content: "Message 1" }),
    );
    await chatMemory.add(
      conversationId,
      new AssistantMessage({ content: "Message 2" }),
    );
    await chatMemory.add(
      conversationId,
      new UserMessage({ content: "Message 3" }),
    );

    // Retrieve limited messages
    const messages = await chatMemory.get(conversationId, 2);

    expect(messages).toHaveLength(2);
  });

  it("should clear conversation", async () => {
    // Add messages
    await chatMemory.add(conversationId, new UserMessage({ content: "Hello" }));
    await chatMemory.add(
      conversationId,
      new AssistantMessage({ content: "Hi" }),
    );

    // Clear conversation
    await chatMemory.clear(conversationId);

    // Verify messages are cleared
    const messages = await chatMemory.get(conversationId, 10);
    expect(messages).toHaveLength(0);
  });

  it("should handle batch message addition", async () => {
    const messageBatch: Message[] = [
      new UserMessage({ content: "Message 1" }),
      new AssistantMessage({ content: "Response 1" }),
      new UserMessage({ content: "Message 2" }),
      new AssistantMessage({ content: "Response 2" }),
    ];

    // Add batch of messages
    await chatMemory.add(conversationId, messageBatch);

    // Verify all messages were stored
    const retrievedMessages = await chatMemory.get(conversationId, 10);

    expect(retrievedMessages).toHaveLength(4);
  });

  it("should handle time to live", async () => {
    const ttlIndexName = `test-ttl-${RedisChatMemoryConfig.DEFAULT_INDEX_NAME}`;
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

    // Verify message exists
    expect(
      await shortTtlMemory.findByConversationId(conversationId),
    ).toHaveLength(1);

    // Wait for TTL to expire
    await new Promise((resolve) => setTimeout(resolve, 2100));

    // Verify message is gone
    expect(
      await shortTtlMemory.findByConversationId(conversationId),
    ).toHaveLength(0);
  });

  it("should maintain message order", async () => {
    // Add messages with minimal delay to test timestamp ordering
    await chatMemory.add(conversationId, new UserMessage({ content: "First" }));
    await new Promise((resolve) => setTimeout(resolve, 10));
    await chatMemory.add(
      conversationId,
      new AssistantMessage({ content: "Second" }),
    );
    await new Promise((resolve) => setTimeout(resolve, 10));
    await chatMemory.add(conversationId, new UserMessage({ content: "Third" }));

    const messages = await chatMemory.get(conversationId, 10);
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

    const conv1Messages = await chatMemory.get(conv1, 10);
    const conv2Messages = await chatMemory.get(conv2, 10);

    expect(conv1Messages).toHaveLength(1);
    expect(conv2Messages).toHaveLength(1);
    expect(conv1Messages[0]?.text).toBe("Conv1 Message");
    expect(conv2Messages[0]?.text).toBe("Conv2 Message");
  });
});

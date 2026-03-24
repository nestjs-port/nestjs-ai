import {
  AssistantMessage,
  type ChatMemoryRepository,
  type Message,
  UserMessage,
} from "@nestjs-ai/model";
import {
  RedisContainer,
  type StartedRedisContainer,
} from "@testcontainers/redis";
import { createClient } from "redis";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { RedisChatMemoryConfig } from "../redis-chat-memory-config";
import { RedisChatMemoryRepository } from "../redis-chat-memory-repository";

describe("RedisChatMemoryRepositoryIT", () => {
  let redisContainer: StartedRedisContainer | null = null;
  let client: ReturnType<typeof createClient>;
  let chatMemoryRepository: ChatMemoryRepository;

  beforeAll(async () => {
    redisContainer = await new RedisContainer(
      "redis/redis-stack:latest",
    ).start();
    const redisUrl = redisContainer.getConnectionUrl();

    client = createClient({ url: redisUrl });
    await client.connect();
  }, 120_000);

  beforeEach(async () => {
    // Create JedisPooled directly with container properties for more reliable
    // connection
    chatMemoryRepository = await RedisChatMemoryRepository.builder()
      .client(client)
      .indexName(`test-${RedisChatMemoryConfig.DEFAULT_INDEX_NAME}`)
      .build();

    // Clear any existing data
    for (const conversationId of await chatMemoryRepository.findConversationIds()) {
      await chatMemoryRepository.deleteByConversationId(conversationId);
    }
  });

  afterAll(async () => {
    if (!client) {
      return;
    }

    await client.close();
    await redisContainer?.stop();
  }, 60_000);

  it("should find all conversation ids", async () => {
    // Add messages for multiple conversations
    await chatMemoryRepository.saveAll("conversation-1", [
      new UserMessage({ content: "Hello from conversation 1" }),
      new AssistantMessage({ content: "Hi there from conversation 1" }),
    ]);

    await chatMemoryRepository.saveAll("conversation-2", [
      new UserMessage({ content: "Hello from conversation 2" }),
      new AssistantMessage({ content: "Hi there from conversation 2" }),
    ]);

    // Verify we can get all conversation IDs
    const conversationIds = await chatMemoryRepository.findConversationIds();
    expect(conversationIds).toHaveLength(2);
    expect(conversationIds).toEqual(
      expect.arrayContaining(["conversation-1", "conversation-2"]),
    );
  });

  it("should efficiently find all conversation ids with aggregation", async () => {
    // Add a large number of messages across fewer conversations to verify
    // deduplication
    for (let i = 0; i < 10; i++) {
      await chatMemoryRepository.saveAll("conversation-A", [
        new UserMessage({ content: `Message ${i} in A` }),
      ]);
      await chatMemoryRepository.saveAll("conversation-B", [
        new UserMessage({ content: `Message ${i} in B` }),
      ]);
      await chatMemoryRepository.saveAll("conversation-C", [
        new UserMessage({ content: `Message ${i} in C` }),
      ]);
    }

    const conversationIds = await chatMemoryRepository.findConversationIds();

    // Verify correctness
    expect(conversationIds).toHaveLength(3);
    expect(conversationIds).toEqual(
      expect.arrayContaining([
        "conversation-A",
        "conversation-B",
        "conversation-C",
      ]),
    );
  });

  it("should find messages by conversation id", async () => {
    // Add messages for a conversation
    const messages: Message[] = [
      new UserMessage({ content: "Hello" }),
      new AssistantMessage({ content: "Hi there!" }),
      new UserMessage({ content: "How are you?" }),
    ];
    await chatMemoryRepository.saveAll("test-conversation", messages);

    // Verify we can retrieve messages by conversation ID
    const retrievedMessages =
      await chatMemoryRepository.findByConversationId("test-conversation");
    expect(retrievedMessages).toHaveLength(3);
    expect(retrievedMessages[0]?.text).toBe("Hello");
    expect(retrievedMessages[1]?.text).toBe("Hi there!");
    expect(retrievedMessages[2]?.text).toBe("How are you?");
  });

  it("should save all messages for conversation", async () => {
    // Add some initial messages
    await chatMemoryRepository.saveAll("test-conversation", [
      new UserMessage({ content: "Initial message" }),
    ]);

    // Verify initial state
    const initialMessages =
      await chatMemoryRepository.findByConversationId("test-conversation");
    expect(initialMessages).toHaveLength(1);

    // Save all with new messages (should replace existing ones)
    const newMessages: Message[] = [
      new UserMessage({ content: "New message 1" }),
      new AssistantMessage({ content: "New message 2" }),
      new UserMessage({ content: "New message 3" }),
    ];
    await chatMemoryRepository.saveAll("test-conversation", newMessages);

    // Verify new state
    const latestMessages =
      await chatMemoryRepository.findByConversationId("test-conversation");
    expect(latestMessages).toHaveLength(3);
    expect(latestMessages[0]?.text).toBe("New message 1");
    expect(latestMessages[1]?.text).toBe("New message 2");
    expect(latestMessages[2]?.text).toBe("New message 3");
  });

  it("should delete conversation", async () => {
    // Add messages for a conversation
    await chatMemoryRepository.saveAll("test-conversation", [
      new UserMessage({ content: "Hello" }),
      new AssistantMessage({ content: "Hi there!" }),
    ]);

    // Verify initial state
    expect(
      await chatMemoryRepository.findByConversationId("test-conversation"),
    ).toHaveLength(2);

    // Delete the conversation
    await chatMemoryRepository.deleteByConversationId("test-conversation");

    // Verify conversation is gone
    expect(
      await chatMemoryRepository.findByConversationId("test-conversation"),
    ).toHaveLength(0);
    expect(await chatMemoryRepository.findConversationIds()).not.toContain(
      "test-conversation",
    );
  });
});

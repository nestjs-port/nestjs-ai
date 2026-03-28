import { randomUUID } from "node:crypto";
import {
  AssistantMessage,
  MessageType,
  SystemMessage,
  ToolResponseMessage,
  UserMessage,
} from "@nestjs-ai/model";
import {
  RedisContainer,
  type StartedRedisContainer,
} from "@testcontainers/redis";
import { createClient, type RedisClientType } from "redis";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { RedisChatMemoryRepository } from "../redis-chat-memory-repository";

const sleep = async (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

describe("RedisChatMemoryAdvancedQueryIT", () => {
  let redisContainer: StartedRedisContainer;
  let client: RedisClientType;
  let chatMemory: RedisChatMemoryRepository;

  beforeAll(async () => {
    redisContainer = await new RedisContainer(
      "redis/redis-stack:latest",
    ).start();
    const redisUrl = redisContainer.getConnectionUrl();

    client = createClient({ url: redisUrl }) as RedisClientType;
    await client.connect();
  }, 120_000);

  beforeEach(async () => {
    // Define metadata fields for proper indexing
    const metadataFields = [
      { name: "priority", type: "tag" as const },
      { name: "category", type: "tag" as const },
      { name: "score", type: "numeric" as const },
      { name: "confidence", type: "numeric" as const },
      { name: "model", type: "tag" as const },
      { name: "urgent", type: "tag" as const },
    ];

    // Use a unique index name to avoid conflicts with metadata schema
    const uniqueIndexName = `test-adv-app-${Date.now()}-${randomUUID()}`;
    const uniqueKeyPrefix = `test-adv-chat-memory:${Date.now()}-${randomUUID()}:`;
    chatMemory = await RedisChatMemoryRepository.builder()
      .client(client)
      .indexName(uniqueIndexName)
      .keyPrefix(uniqueKeyPrefix)
      .metadataFields(metadataFields)
      .build();

    for (const conversationId of await chatMemory.findConversationIds()) {
      await chatMemory.clear(conversationId);
    }
  });

  afterAll(async () => {
    await client.close();
    await redisContainer.stop();
  }, 60_000);

  it("should find messages by type single conversation", async () => {
    const conversationId = "test-find-by-type";

    // Add various message types to a single conversation
    await chatMemory.add(
      conversationId,
      new SystemMessage({ content: "System message 1" }),
    );
    await chatMemory.add(
      conversationId,
      new UserMessage({ content: "User message 1" }),
    );
    await chatMemory.add(
      conversationId,
      new AssistantMessage({ content: "Assistant message 1" }),
    );
    await chatMemory.add(
      conversationId,
      new UserMessage({ content: "User message 2" }),
    );
    await chatMemory.add(
      conversationId,
      new AssistantMessage({ content: "Assistant message 2" }),
    );
    await chatMemory.add(
      conversationId,
      new SystemMessage({ content: "System message 2" }),
    );

    // Test finding by USER type
    const userMessages = await chatMemory.findByType(MessageType.USER, 10);

    expect(userMessages).toHaveLength(2);
    expect(userMessages[0]?.message.text).toBe("User message 1");
    expect(userMessages[1]?.message.text).toBe("User message 2");
    expect(userMessages[0]?.conversationId).toBe(conversationId);
    expect(userMessages[1]?.conversationId).toBe(conversationId);

    // Test finding by SYSTEM type
    const systemMessages = await chatMemory.findByType(MessageType.SYSTEM, 10);

    expect(systemMessages).toHaveLength(2);
    expect(systemMessages[0]?.message.text).toBe("System message 1");
    expect(systemMessages[1]?.message.text).toBe("System message 2");

    // Test finding by ASSISTANT type
    const assistantMessages = await chatMemory.findByType(
      MessageType.ASSISTANT,
      10,
    );

    expect(assistantMessages).toHaveLength(2);
    expect(assistantMessages[0]?.message.text).toBe("Assistant message 1");
    expect(assistantMessages[1]?.message.text).toBe("Assistant message 2");

    // Test finding by TOOL type (should be empty)
    const toolMessages = await chatMemory.findByType(MessageType.TOOL, 10);

    expect(toolMessages).toHaveLength(0);
  });

  it("should find messages by type multiple conversations", async () => {
    const conversationId1 = `conv-1-${randomUUID()}`;
    const conversationId2 = `conv-2-${randomUUID()}`;

    // Add messages to first conversation
    await chatMemory.add(
      conversationId1,
      new UserMessage({ content: "User in conv 1" }),
    );
    await chatMemory.add(
      conversationId1,
      new AssistantMessage({ content: "Assistant in conv 1" }),
    );
    await chatMemory.add(
      conversationId1,
      new SystemMessage({ content: "System in conv 1" }),
    );

    // Add messages to second conversation
    await chatMemory.add(
      conversationId2,
      new UserMessage({ content: "User in conv 2" }),
    );
    await chatMemory.add(
      conversationId2,
      new AssistantMessage({ content: "Assistant in conv 2" }),
    );
    await chatMemory.add(
      conversationId2,
      new SystemMessage({ content: "System in conv 2" }),
    );
    await chatMemory.add(
      conversationId2,
      new UserMessage({ content: "Second user in conv 2" }),
    );

    // Find all USER messages across conversations
    const userMessages = await chatMemory.findByType(MessageType.USER, 10);

    expect(userMessages).toHaveLength(3);

    // Verify messages from both conversations are included
    const conversationIds = [
      ...new Set(userMessages.map((msg) => msg.conversationId)),
    ];

    expect(conversationIds).toHaveLength(2);
    expect(conversationIds).toContain(conversationId1);
    expect(conversationIds).toContain(conversationId2);

    // Count messages from each conversation
    const conv1Count = userMessages.filter(
      (msg) => msg.conversationId === conversationId1,
    ).length;
    const conv2Count = userMessages.filter(
      (msg) => msg.conversationId === conversationId2,
    ).length;

    expect(conv1Count).toBe(1);
    expect(conv2Count).toBe(2);
  });

  it("should respect limit parameter", async () => {
    const conversationId = "test-limit-parameter";

    // Add multiple messages of the same type
    await chatMemory.add(
      conversationId,
      new UserMessage({ content: "User message 1" }),
    );
    await chatMemory.add(
      conversationId,
      new UserMessage({ content: "User message 2" }),
    );
    await chatMemory.add(
      conversationId,
      new UserMessage({ content: "User message 3" }),
    );
    await chatMemory.add(
      conversationId,
      new UserMessage({ content: "User message 4" }),
    );
    await chatMemory.add(
      conversationId,
      new UserMessage({ content: "User message 5" }),
    );

    // Retrieve with a limit of 3
    const messages = await chatMemory.findByType(MessageType.USER, 3);

    // Verify only 3 messages are returned
    expect(messages).toHaveLength(3);
  });

  it("should handle tool messages", async () => {
    const conversationId = "test-tool-messages";

    // Create a ToolResponseMessage
    const toolMessage = new ToolResponseMessage({
      responses: [
        {
          id: "tool-1",
          name: "weather",
          responseData: '{"temperature":"22°C"}',
        },
      ],
    });

    // Add various message types
    await chatMemory.add(
      conversationId,
      new UserMessage({ content: "Weather query" }),
    );
    await chatMemory.add(conversationId, toolMessage);
    await chatMemory.add(
      conversationId,
      new AssistantMessage({ content: "It's 22°C" }),
    );

    // Find TOOL type messages
    const toolMessages = await chatMemory.findByType(MessageType.TOOL, 10);

    expect(toolMessages).toHaveLength(1);
    expect(toolMessages[0]?.message).toBeInstanceOf(ToolResponseMessage);

    const retrievedToolMessage = toolMessages[0]
      ?.message as ToolResponseMessage;
    expect(retrievedToolMessage.responses).toHaveLength(1);
    expect(retrievedToolMessage.responses[0]?.name).toBe("weather");
  });

  it("should return empty list when no messages of type exist", async () => {
    // Clear any existing test data
    for (const conversationId of await chatMemory.findConversationIds()) {
      await chatMemory.clear(conversationId);
    }

    const conversationId = "test-empty-type";

    // Add only user and assistant messages
    await chatMemory.add(conversationId, new UserMessage({ content: "Hello" }));
    await chatMemory.add(
      conversationId,
      new AssistantMessage({ content: "Hi there" }),
    );

    // Search for system messages which don't exist
    const systemMessages = await chatMemory.findByType(MessageType.SYSTEM, 10);

    // Verify an empty list is returned (not null)
    expect(systemMessages).not.toBeNull();
    expect(systemMessages).toHaveLength(0);
  });

  it("should find messages by content", async () => {
    const conversationId1 = "test-content-1";
    const conversationId2 = "test-content-2";

    // Add messages with different content patterns
    await chatMemory.add(
      conversationId1,
      new UserMessage({ content: "I love programming in Java" }),
    );
    await chatMemory.add(
      conversationId1,
      new AssistantMessage({ content: "Java is a great programming language" }),
    );
    await chatMemory.add(
      conversationId2,
      new UserMessage({ content: "Python programming is fun" }),
    );
    await chatMemory.add(
      conversationId2,
      new AssistantMessage({ content: "Tell me about Spring Boot" }),
    );
    await chatMemory.add(
      conversationId1,
      new UserMessage({ content: "What about JavaScript programming?" }),
    );

    // Search for messages containing "programming"
    const programmingMessages = await chatMemory.findByContent(
      "programming",
      10,
    );

    expect(programmingMessages).toHaveLength(4);
    // Verify all messages contain "programming"
    for (const msg of programmingMessages) {
      expect((msg.message.text ?? "").toLowerCase()).toContain("programming");
    }

    // Search for messages containing "Java"
    const javaMessages = await chatMemory.findByContent("Java", 10);

    expect(javaMessages).toHaveLength(2); // Only exact case matches
    // Verify messages are from conversation 1 only
    expect(new Set(javaMessages.map((m) => m.conversationId)).size).toBe(1);

    // Search for messages containing "Spring"
    const springMessages = await chatMemory.findByContent("Spring", 10);

    expect(springMessages).toHaveLength(1);
    expect(springMessages[0]?.message.text).toContain("Spring Boot");

    // Test with limit
    const limitedMessages = await chatMemory.findByContent("programming", 2);

    expect(limitedMessages).toHaveLength(2);

    // Clean up
    await chatMemory.clear(conversationId1);
    await chatMemory.clear(conversationId2);
  });

  it("should find messages by time range", async () => {
    const conversationId1 = "test-time-1";
    const conversationId2 = "test-time-2";

    // Record time before adding messages
    const startTime = Date.now();
    await sleep(10); // Small delay to ensure timestamps are different

    // Add messages to first conversation
    await chatMemory.add(
      conversationId1,
      new UserMessage({ content: "First message" }),
    );
    await sleep(10);
    await chatMemory.add(
      conversationId1,
      new AssistantMessage({ content: "Second message" }),
    );
    await sleep(10);

    const midTime = Date.now();
    await sleep(10);

    // Add messages to second conversation
    await chatMemory.add(
      conversationId2,
      new UserMessage({ content: "Third message" }),
    );
    await sleep(10);
    await chatMemory.add(
      conversationId2,
      new AssistantMessage({ content: "Fourth message" }),
    );
    await sleep(10);

    const endTime = Date.now();

    // Test finding messages in full time range across all conversations
    const allMessages = await chatMemory.findByTimeRange(
      null,
      new Date(startTime),
      new Date(endTime),
      10,
    );

    expect(allMessages).toHaveLength(4);

    // Test finding messages in first half of time range
    const firstHalfMessages = await chatMemory.findByTimeRange(
      null,
      new Date(startTime),
      new Date(midTime),
      10,
    );

    expect(firstHalfMessages).toHaveLength(2);
    expect(
      firstHalfMessages.every((m) => m.conversationId === conversationId1),
    ).toBe(true);

    // Test finding messages in specific conversation within time range
    const conv2Messages = await chatMemory.findByTimeRange(
      conversationId2,
      new Date(startTime),
      new Date(endTime),
      10,
    );

    expect(conv2Messages).toHaveLength(2);
    expect(
      conv2Messages.every((m) => m.conversationId === conversationId2),
    ).toBe(true);

    // Test with limit
    const limitedTimeMessages = await chatMemory.findByTimeRange(
      null,
      new Date(startTime),
      new Date(endTime),
      2,
    );

    expect(limitedTimeMessages).toHaveLength(2);

    // Clean up
    await chatMemory.clear(conversationId1);
    await chatMemory.clear(conversationId2);
  });

  it("should find messages by metadata", async () => {
    const conversationId = "test-metadata";

    // Create messages with different metadata
    const userMsg1 = new UserMessage({
      content: "User message with metadata",
      properties: { priority: "high", category: "question", score: 95 },
    });

    const assistantMsg = new AssistantMessage({
      content: "Assistant response",
      properties: { model: "gpt-4", confidence: 0.95, category: "answer" },
    });

    const userMsg2 = new UserMessage({
      content: "Another user message",
      properties: { priority: "low", category: "question", score: 75 },
    });

    // Add messages
    await chatMemory.add(conversationId, userMsg1);
    await chatMemory.add(conversationId, assistantMsg);
    await chatMemory.add(conversationId, userMsg2);

    // Give Redis time to index the documents
    await sleep(100);

    // Test finding by string metadata
    const highPriorityMessages = await chatMemory.findByMetadata(
      "priority",
      "high",
      10,
    );

    expect(highPriorityMessages).toHaveLength(1);
    expect(highPriorityMessages[0]?.message.text).toBe(
      "User message with metadata",
    );

    // Test finding by category
    const questionMessages = await chatMemory.findByMetadata(
      "category",
      "question",
      10,
    );

    expect(questionMessages).toHaveLength(2);

    // Test finding by numeric metadata
    const highScoreMessages = await chatMemory.findByMetadata("score", 95, 10);

    expect(highScoreMessages).toHaveLength(1);
    expect(highScoreMessages[0]?.message.metadata.score).toBe(95);

    // Test finding by double metadata
    const confidentMessages = await chatMemory.findByMetadata(
      "confidence",
      0.95,
      10,
    );

    expect(confidentMessages).toHaveLength(1);
    expect(confidentMessages[0]?.message.messageType).toBe(
      MessageType.ASSISTANT,
    );

    // Test with non-existent metadata
    const nonExistentMessages = await chatMemory.findByMetadata(
      "nonexistent",
      "value",
      10,
    );

    expect(nonExistentMessages).toHaveLength(0);

    // Clean up
    await chatMemory.clear(conversationId);
  });

  it("should execute custom query", async () => {
    const conversationId1 = "test-custom-1";
    const conversationId2 = "test-custom-2";

    // Add various messages
    const userMsg = new UserMessage({
      content: "I need help with Redis",
      properties: { urgent: "true" },
    });

    await chatMemory.add(conversationId1, userMsg);
    await chatMemory.add(
      conversationId1,
      new AssistantMessage({ content: "I can help you with Redis" }),
    );
    await chatMemory.add(
      conversationId2,
      new UserMessage({ content: "Tell me about Spring" }),
    );
    await chatMemory.add(
      conversationId2,
      new SystemMessage({ content: "System initialized" }),
    );

    // Test custom query for USER messages containing "Redis"
    const customQuery = "@type:USER @content:Redis";
    const redisUserMessages = await chatMemory.executeQuery(customQuery, 10);

    expect(redisUserMessages).toHaveLength(1);
    expect(redisUserMessages[0]?.message.text).toContain("Redis");
    expect(redisUserMessages[0]?.message.messageType).toBe(MessageType.USER);

    // Test custom query for all messages in a specific conversation
    // Note: conversation_id is a TAG field, so we need to escape special
    // characters
    const escapedConvId = conversationId1.replaceAll("-", "\\-");
    const convQuery = `@conversation_id:{${escapedConvId}}`;
    const conv1Messages = await chatMemory.executeQuery(convQuery, 10);

    expect(conv1Messages).toHaveLength(2);
    expect(
      conv1Messages.every((m) => m.conversationId === conversationId1),
    ).toBe(true);

    // Test complex query combining type and content
    const complexQuery = "(@type:USER | @type:ASSISTANT) @content:Redis";
    const complexResults = await chatMemory.executeQuery(complexQuery, 10);

    expect(complexResults).toHaveLength(2);

    // Test with limit
    const limitedResults = await chatMemory.executeQuery("*", 2);

    expect(limitedResults).toHaveLength(2);

    // Clean up
    await chatMemory.clear(conversationId1);
    await chatMemory.clear(conversationId2);
  });

  it("should handle special characters in queries", async () => {
    const conversationId = "test-special-chars";

    // Add messages with special characters
    await chatMemory.add(
      conversationId,
      new UserMessage({ content: "What is 2+2?" }),
    );
    await chatMemory.add(
      conversationId,
      new AssistantMessage({ content: "The answer is: 4" }),
    );
    await chatMemory.add(
      conversationId,
      new UserMessage({ content: "Tell me about C++" }),
    );

    // Test finding content with special characters
    const plusMessages = await chatMemory.findByContent("C++", 10);

    expect(plusMessages).toHaveLength(1);
    expect(plusMessages[0]?.message.text).toContain("C++");

    // Test finding content with colon - search for "answer is" instead
    const colonMessages = await chatMemory.findByContent("answer is", 10);

    expect(colonMessages).toHaveLength(1);

    // Clean up
    await chatMemory.clear(conversationId);
  });

  it("should return empty list for no matches", async () => {
    const conversationId = "test-no-matches";

    // Add a simple message
    await chatMemory.add(
      conversationId,
      new UserMessage({ content: "Hello world" }),
    );

    // Test content that doesn't exist
    const noContentMatch = await chatMemory.findByContent("nonexistent", 10);
    expect(noContentMatch).toHaveLength(0);

    // Test time range with no messages
    const noTimeMatch = await chatMemory.findByTimeRange(
      conversationId,
      new Date(Date.now() + 3_600_000), // Future
      // time
      new Date(Date.now() + 7_200_000), // Even more future
      10,
    );
    expect(noTimeMatch).toHaveLength(0);

    // Test metadata that doesn't exist
    const noMetadataMatch = await chatMemory.findByMetadata(
      "nonexistent",
      "value",
      10,
    );
    expect(noMetadataMatch).toHaveLength(0);

    // Test custom query with no matches
    const noQueryMatch = await chatMemory.executeQuery("@type:FUNCTION", 10);
    expect(noQueryMatch).toHaveLength(0);

    // Clean up
    await chatMemory.clear(conversationId);
  });
});

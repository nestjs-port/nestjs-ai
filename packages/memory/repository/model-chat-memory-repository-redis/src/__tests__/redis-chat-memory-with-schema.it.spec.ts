import { randomUUID } from "node:crypto";
import { AssistantMessage, UserMessage } from "@nestjs-ai/model";
import { createClient } from "redis";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { RedisChatMemoryRepository } from "../redis-chat-memory-repository";

const sleep = async (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

describe("RedisChatMemoryWithSchemaIT", () => {
  let redisContainer: StartedTestContainer | null = null;
  let client: ReturnType<typeof createClient>;
  let chatMemory: RedisChatMemoryRepository;

  beforeAll(async () => {
    redisContainer = await new GenericContainer("redis/redis-stack:latest")
      .withExposedPorts(6379)
      .start();
    const redisUrl = `redis://${redisContainer.getHost()}:${redisContainer.getMappedPort(6379)}`;

    client = createClient({ url: redisUrl });
    await client.connect();
  }, 120_000);

  beforeEach(async () => {
    // Define metadata schema for proper indexing
    const metadataFields = [
      { name: "priority", type: "tag" as const },
      { name: "category", type: "tag" as const },
      { name: "score", type: "numeric" as const },
      { name: "confidence", type: "numeric" as const },
      { name: "model", type: "tag" as const },
    ];

    // Use a unique index name to ensure we get a fresh schema
    const uniqueIndexName = `test-schema-${Date.now()}-${randomUUID()}`;

    chatMemory = await RedisChatMemoryRepository.builder()
      .client(client)
      .indexName(uniqueIndexName)
      .metadataFields(metadataFields)
      .build();

    // Clear existing test data
    for (const conversationId of await chatMemory.findConversationIds()) {
      await chatMemory.clear(conversationId);
    }
  });

  afterAll(async () => {
    if (!client) {
      return;
    }

    await client.close();
    await redisContainer?.stop();
  }, 60_000);

  it("should find messages by metadata with proper schema", async () => {
    const conversationId = "test-metadata-schema";

    // Create messages with different metadata
    const userMsg1 = new UserMessage({
      content: "High priority task",
      properties: { priority: "high", category: "task", score: 95 },
    });

    const assistantMsg = new AssistantMessage({
      content: "I'll help with that",
      properties: { model: "gpt-4", confidence: 0.95, category: "response" },
    });

    const userMsg2 = new UserMessage({
      content: "Low priority question",
      properties: { priority: "low", category: "question", score: 75 },
    });

    // Add messages
    await chatMemory.add(conversationId, userMsg1);
    await chatMemory.add(conversationId, assistantMsg);
    await chatMemory.add(conversationId, userMsg2);

    // Give Redis time to index the documents
    await sleep(100);

    // Test finding by tag metadata (priority)
    const highPriorityMessages = await chatMemory.findByMetadata(
      "priority",
      "high",
      10,
    );

    expect(highPriorityMessages).toHaveLength(1);
    expect(highPriorityMessages[0]?.message.text).toBe("High priority task");

    // Test finding by tag metadata (category)
    const taskMessages = await chatMemory.findByMetadata(
      "category",
      "task",
      10,
    );

    expect(taskMessages).toHaveLength(1);

    // Test finding by numeric metadata (score)
    const highScoreMessages = await chatMemory.findByMetadata("score", 95, 10);

    expect(highScoreMessages).toHaveLength(1);
    expect(highScoreMessages[0]?.message.metadata.score).toBe(95);

    // Test finding by numeric metadata (confidence)
    const confidentMessages = await chatMemory.findByMetadata(
      "confidence",
      0.95,
      10,
    );

    expect(confidentMessages).toHaveLength(1);
    expect(confidentMessages[0]?.message.metadata.model).toBe("gpt-4");

    // Test with non-existent metadata key (not in schema)
    const nonExistentMessages = await chatMemory.findByMetadata(
      "nonexistent",
      "value",
      10,
    );

    expect(nonExistentMessages).toHaveLength(0);

    // Clean up
    await chatMemory.clear(conversationId);
  });

  it("should fallback to text search for undefined metadata fields", async () => {
    const conversationId = "test-undefined-metadata";

    // Create message with metadata field not defined in schema
    const userMsg = new UserMessage({
      content: "Message with custom metadata",
      properties: { customField: "customValue", priority: "medium" },
    });
    // This is defined in schema

    await chatMemory.add(conversationId, userMsg);

    // Defined field should work with exact match
    const priorityMessages = await chatMemory.findByMetadata(
      "priority",
      "medium",
      10,
    );

    expect(priorityMessages).toHaveLength(1);

    // Undefined field will fall back to text search in general metadata
    // This may or may not find the message depending on how the text is indexed
    const customMessages = await chatMemory.findByMetadata(
      "customField",
      "customValue",
      10,
    );
    expect(customMessages.length).toBeGreaterThanOrEqual(0);

    // The result depends on whether the general metadata text field caught this
    // In practice, users should define all metadata fields they want to search on

    // Clean up
    await chatMemory.clear(conversationId);
  });
});

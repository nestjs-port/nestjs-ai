import { Document } from "@nestjs-ai/commons";
import { TransformersEmbeddingModel } from "@nestjs-ai/model-transformers";
import { SearchRequest } from "@nestjs-ai/vector-store";
import {
  RedisContainer,
  type StartedRedisContainer,
} from "@testcontainers/redis";
import { createClient, type RedisClientType } from "redis";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { RedisMetadataField } from "../redis-metadata-field";
import { RedisDistanceMetric, RedisVectorStore } from "../redis-vector-store";

describe("RedisVectorStoreDistanceMetricIT", () => {
  let redisContainer: StartedRedisContainer;
  let client: RedisClientType;
  let embeddingModel: TransformersEmbeddingModel;

  beforeAll(async () => {
    redisContainer = await new RedisContainer(
      "redis/redis-stack:latest",
    ).start();
    const redisUrl = redisContainer.getConnectionUrl();
    client = createClient({ url: redisUrl });
    await client.connect();

    embeddingModel = new TransformersEmbeddingModel();
    await embeddingModel.onModuleInit();
  }, 240_000);

  // Clean Redis completely before each test
  beforeEach(async () => {
    await client.flushAll();
  });

  afterAll(async () => {
    await client.close();
    await redisContainer.stop();
  }, 60_000);

  async function testVectorStoreWithDocuments(
    vectorStore: RedisVectorStore,
  ): Promise<void> {
    // Ensure schema initialization (using onModuleInit)
    await vectorStore.onModuleInit();

    // Verify index exists
    const indexes = await client.ft._list();
    // The index name is set in the builder, so we should verify it exists
    expect(indexes).not.toHaveLength(0);
    expect(indexes.length).toBeGreaterThan(0);

    // Add test documents
    const documents = [
      new Document(
        "Document about artificial intelligence and machine learning",
        { category: "AI" },
      ),
      new Document("Document about databases and storage systems", {
        category: "DB",
      }),
      new Document("Document about neural networks and deep learning", {
        category: "AI",
      }),
    ];

    await vectorStore.add(documents);

    // Test search for AI-related documents
    const results = await vectorStore.similaritySearch(
      SearchRequest.builder().query("AI machine learning").topK(2).build(),
    );

    // Verify that we're getting relevant results
    expect(results).not.toHaveLength(0);
    expect(results.length).toBeLessThanOrEqual(2); // We asked for topK=2

    // The top results should be AI-related documents
    expect(results[0].metadata).toHaveProperty("category", "AI");
    expect(
      results[0].text?.includes("artificial intelligence") ||
        results[0].text?.includes("neural networks"),
    ).toBe(true);

    // Verify scores are properly ordered (first result should have best score)
    if (results.length > 1) {
      expect(results[0].score).toBeGreaterThanOrEqual(results[1].score ?? 0);
    }

    // Test filtered search - should only return AI documents
    const filteredResults = await vectorStore.similaritySearch(
      SearchRequest.builder()
        .query("AI")
        .topK(5)
        .filterExpression("category == 'AI'")
        .build(),
    );

    // Verify all results are AI documents
    expect(filteredResults).not.toHaveLength(0);
    expect(filteredResults.length).toBeLessThanOrEqual(2); // We only have 2 AI
    // documents

    // All results should have category=AI
    for (const result of filteredResults) {
      expect(result.metadata).toHaveProperty("category", "AI");
      expect(
        result.text?.includes("artificial intelligence") ||
          result.text?.includes("neural networks") ||
          result.text?.includes("deep learning"),
      ).toBe(true);
    }

    // Test filtered search for DB category
    const dbFilteredResults = await vectorStore.similaritySearch(
      SearchRequest.builder()
        .query("storage")
        .topK(5)
        .filterExpression("category == 'DB'")
        .build(),
    );

    // Should only get the database document
    expect(dbFilteredResults).toHaveLength(1);
    expect(dbFilteredResults[0].metadata).toHaveProperty("category", "DB");
    expect(dbFilteredResults[0].text?.toLowerCase().includes("databases")).toBe(
      true,
    );
  }

  it("cosine distance metric", async () => {
    // Create the vector store with explicit COSINE distance metric
    const vectorStore = RedisVectorStore.builder(client, embeddingModel)
      .indexName("cosine-test-index")
      .distanceMetric(RedisDistanceMetric.COSINE) // New feature
      .metadataFields(RedisMetadataField.tag("category"))
      .initializeSchema(true)
      .build();

    // Test basic functionality with the configured distance metric
    await testVectorStoreWithDocuments(vectorStore);
  });

  it("l2 distance metric", async () => {
    // Create the vector store with explicit L2 distance metric
    const vectorStore = RedisVectorStore.builder(client, embeddingModel)
      .indexName("l2-test-index")
      .distanceMetric(RedisDistanceMetric.L2)
      .metadataFields(RedisMetadataField.tag("category"))
      .initializeSchema(true)
      .build();

    // Initialize the vector store schema
    await vectorStore.onModuleInit();

    // Add test documents first
    const documents = [
      new Document(
        "Document about artificial intelligence and machine learning",
        { category: "AI" },
      ),
      new Document("Document about databases and storage systems", {
        category: "DB",
      }),
      new Document("Document about neural networks and deep learning", {
        category: "AI",
      }),
    ];

    await vectorStore.add(documents);

    // Test L2 distance metric search with AI query
    const aiResults = await vectorStore.similaritySearch(
      SearchRequest.builder().query("AI machine learning").topK(10).build(),
    );

    // Verify we get relevant AI results
    expect(aiResults).not.toHaveLength(0);
    expect(aiResults.length).toBeGreaterThanOrEqual(2); // We have 2 AI
    // documents

    // The first result should be about AI (closest match)
    const topResult = aiResults[0];
    expect(topResult.metadata).toHaveProperty("category", "AI");
    expect(
      topResult.text?.toLowerCase().includes("artificial intelligence"),
    ).toBe(true);

    // Test with database query
    const dbResults = await vectorStore.similaritySearch(
      SearchRequest.builder().query("database systems").topK(10).build(),
    );

    // Verify we get results and at least one contains database content
    expect(dbResults).not.toHaveLength(0);

    // Find the database document in the results (might not be first with L2
    // distance)
    let foundDbDoc = false;
    for (const doc of dbResults) {
      if (
        doc.text?.toLowerCase().includes("databases") &&
        doc.metadata.category === "DB"
      ) {
        foundDbDoc = true;
        break;
      }
    }
    expect(foundDbDoc).toBe(true);
  });

  it("ip distance metric", async () => {
    // Create the vector store with explicit IP distance metric
    const vectorStore = RedisVectorStore.builder(client, embeddingModel)
      .indexName("ip-test-index")
      .distanceMetric(RedisDistanceMetric.IP) // New feature
      .metadataFields(RedisMetadataField.tag("category"))
      .initializeSchema(true)
      .build();

    // Test basic functionality with the configured distance metric
    await testVectorStoreWithDocuments(vectorStore);
  });
});

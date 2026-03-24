import type { Document } from "@nestjs-ai/commons";
import {
  DocumentMetadata,
  Document as VectorDocument,
} from "@nestjs-ai/commons";
import {
  Embedding,
  EmbeddingModel,
  type EmbeddingRequest,
  EmbeddingResponse,
} from "@nestjs-ai/model";
import { Filter, SearchRequest } from "@nestjs-ai/vector-store";
import { createClient } from "redis";
// @ts-expect-error - testcontainers is available at runtime via the workspace, but this
// package does not declare its type dependency.
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { RedisMetadataField } from "../redis-metadata-field";
import { RedisVectorStore } from "../redis-vector-store";

const SPRING_AI_TEXT =
  "The Spring AI project aims to streamline the development of applications that incorporate artificial intelligence functionality without unnecessary complexity. At its core, Spring AI provides abstractions that serve as the foundation for developing AI applications. These abstractions have multiple implementations, enabling easy component swapping with minimal code changes.";
const TIME_SHELTER_TEXT =
  "Somewhere in the Andes, they believe in this very day that the future is behind you. It comes up from behind your back, surprising and unforeseeable, while the past is always before your eyes, that which has already happened. When they talk about the past, the people of the Aymara tribe point in front of them. You walk forward facing the past, and you turn back toward the future. ― Georgi Gospodinov, Time Shelter";
const GREAT_DEPRESSION_TEXT =
  "The Great Depression (1929–1939) was an economic shock that affected most countries across the world. It was a period of economic depression that became evident after a major fall in stock prices in the United States.";

type RedisClient = ReturnType<typeof createClient>;

class MockEmbeddingModel extends EmbeddingModel {
  override async call(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    return new EmbeddingResponse(
      request.instructions.map(
        (instruction, index) =>
          new Embedding(this.vectorForText(instruction), index),
      ),
    );
  }

  protected override async embedDocument(
    document: Document,
  ): Promise<number[]> {
    return this.vectorForText(document.text ?? "");
  }

  private vectorForText(text: string): number[] {
    const normalized = text.toLowerCase();
    if (normalized.includes("spring")) {
      return [1, 0, 0];
    }
    if (normalized.includes("time shelter") || normalized.includes("andes")) {
      return [0.7, 0.7, 0];
    }
    if (normalized.includes("great depression")) {
      return [0, 1, 0];
    }
    if (normalized.includes("the world")) {
      return [0, 1, 0];
    }
    if (normalized.includes("content")) {
      return [0, 0, 1];
    }
    if (normalized.includes("foobar")) {
      return [0, 0, 1];
    }
    return [0.2, 0.2, 0.2];
  }
}

describe("RedisVectorStoreIT", () => {
  let redisContainer: StartedTestContainer | null = null;
  let client: RedisClient | null = null;
  let vectorStore: RedisVectorStore;

  const documents = [
    VectorDocument.builder()
      .id("1")
      .text(SPRING_AI_TEXT)
      .metadata({ meta1: "meta1" })
      .build(),
    VectorDocument.builder()
      .id("2")
      .text(TIME_SHELTER_TEXT)
      .metadata({})
      .build(),
    VectorDocument.builder()
      .id("3")
      .text(GREAT_DEPRESSION_TEXT)
      .metadata({ meta2: "meta2" })
      .build(),
  ];

  beforeAll(async () => {
    redisContainer = await new GenericContainer("redis/redis-stack:latest")
      .withExposedPorts(6379)
      .start();

    const redisUrl = `redis://${redisContainer.getHost()}:${redisContainer.getMappedPort(6379)}`;
    client = createClient({ url: redisUrl });
    await client.connect();
  }, 120_000);

  beforeEach(async () => {
    if (client == null) {
      throw new Error("Redis client was not initialized");
    }

    await client.flushAll();

    vectorStore = RedisVectorStore.builder(
      client as never,
      new MockEmbeddingModel(),
    )
      .metadataFields(
        RedisMetadataField.tag("meta1"),
        RedisMetadataField.tag("meta2"),
        RedisMetadataField.tag("country"),
        RedisMetadataField.numeric("year"),
        RedisMetadataField.numeric("priority"),
        RedisMetadataField.tag("type"),
      )
      .initializeSchema(true)
      .build();

    await vectorStore.onModuleInit();
  });

  afterAll(async () => {
    await client?.close();
    await redisContainer?.stop();
  }, 60_000);

  it("ensureIndexGetsCreated", async () => {
    if (client == null) {
      throw new Error("Redis client was not initialized");
    }

    expect(await client.ft._list()).toContain(
      RedisVectorStore.DEFAULT_INDEX_NAME,
    );
  });

  it("addAndSearch", async () => {
    await vectorStore.add(documents);

    const results = await vectorStore.similaritySearch(
      SearchRequest.builder().query("Spring").topK(1).build(),
    );

    expect(results).toHaveLength(1);
    const resultDoc = results[0];
    expect(resultDoc.id).toBe(documents[0].id);
    expect(resultDoc.text).toContain(
      "Spring AI provides abstractions that serve as the foundation for developing AI applications.",
    );
    expect(Object.keys(resultDoc.metadata)).toHaveLength(3);
    expect(resultDoc.metadata).toHaveProperty("meta1", "meta1");
    expect(resultDoc.metadata).toHaveProperty(
      RedisVectorStore.DISTANCE_FIELD_NAME,
    );
    expect(resultDoc.metadata).toHaveProperty(DocumentMetadata.DISTANCE);

    await vectorStore.delete(documents.map((document) => document.id));

    const emptyResults = await vectorStore.similaritySearch(
      SearchRequest.builder().query("Spring").topK(1).build(),
    );
    expect(emptyResults).toHaveLength(0);
  });

  it("searchWithFilters", async () => {
    const bgDocument = VectorDocument.builder()
      .text("The World is Big and Salvation Lurks Around the Corner")
      .metadata({ country: "BG", year: 2020 })
      .build();
    const nlDocument = VectorDocument.builder()
      .text("The World is Big and Salvation Lurks Around the Corner")
      .metadata({ country: "NL" })
      .build();
    const bgDocument2 = VectorDocument.builder()
      .text("The World is Big and Salvation Lurks Around the Corner")
      .metadata({ country: "BG", year: 2023 })
      .build();

    await vectorStore.add([bgDocument, nlDocument, bgDocument2]);

    let results = await vectorStore.similaritySearch(
      SearchRequest.builder().query("The World").topK(5).build(),
    );
    expect(results).toHaveLength(3);

    results = await vectorStore.similaritySearch(
      SearchRequest.builder()
        .query("The World")
        .topK(5)
        .similarityThresholdAll()
        .filterExpression("country == 'NL'")
        .build(),
    );
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe(nlDocument.id);

    results = await vectorStore.similaritySearch(
      SearchRequest.builder()
        .query("The World")
        .topK(5)
        .similarityThresholdAll()
        .filterExpression("country == 'BG'")
        .build(),
    );
    expect(results).toHaveLength(2);
    expect(results.map((document) => document.id)).toEqual(
      expect.arrayContaining([bgDocument.id, bgDocument2.id]),
    );

    results = await vectorStore.similaritySearch(
      SearchRequest.builder()
        .query("The World")
        .topK(5)
        .similarityThresholdAll()
        .filterExpression("country == 'BG' && year == 2020")
        .build(),
    );
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe(bgDocument.id);

    results = await vectorStore.similaritySearch(
      SearchRequest.builder()
        .query("The World")
        .topK(5)
        .similarityThresholdAll()
        .filterExpression("NOT(country == 'BG' && year == 2020)")
        .build(),
    );
    expect(results).toHaveLength(2);
    expect(results.map((document) => document.id)).toEqual(
      expect.arrayContaining([nlDocument.id, bgDocument2.id]),
    );
  });

  it("documentUpdate", async () => {
    const document = VectorDocument.builder()
      .id("d-1")
      .text("Spring AI rocks!!")
      .metadata({ meta1: "meta1" })
      .build();

    await vectorStore.add([document]);

    let results = await vectorStore.similaritySearch(
      SearchRequest.builder().query("Spring").topK(5).build(),
    );
    expect(results).toHaveLength(1);
    let resultDoc = results[0];
    expect(resultDoc.id).toBe(document.id);
    expect(resultDoc.text).toBe("Spring AI rocks!!");
    expect(resultDoc.metadata).toHaveProperty("meta1", "meta1");
    expect(resultDoc.metadata).toHaveProperty(
      RedisVectorStore.DISTANCE_FIELD_NAME,
    );
    expect(resultDoc.metadata).toHaveProperty(DocumentMetadata.DISTANCE);

    const sameIdDocument = VectorDocument.builder()
      .id(document.id)
      .text("The World is Big and Salvation Lurks Around the Corner")
      .metadata({ meta2: "meta2" })
      .build();

    await vectorStore.add([sameIdDocument]);

    results = await vectorStore.similaritySearch(
      SearchRequest.builder().query("FooBar").topK(5).build(),
    );
    expect(results).toHaveLength(1);
    resultDoc = results[0];
    expect(resultDoc.id).toBe(document.id);
    expect(resultDoc.text).toBe(
      "The World is Big and Salvation Lurks Around the Corner",
    );
    expect(resultDoc.metadata).toHaveProperty("meta2", "meta2");
    expect(resultDoc.metadata).toHaveProperty(
      RedisVectorStore.DISTANCE_FIELD_NAME,
    );
    expect(resultDoc.metadata).toHaveProperty(DocumentMetadata.DISTANCE);

    await vectorStore.delete([document.id]);
  });

  it("searchWithThreshold", async () => {
    await vectorStore.add(documents);

    const fullResult = await vectorStore.similaritySearch(
      SearchRequest.builder()
        .query("Spring")
        .topK(5)
        .similarityThresholdAll()
        .build(),
    );
    const scores = fullResult.map((document) => document.score ?? 0);

    expect(scores).toHaveLength(3);

    const similarityThreshold = (scores[0] + scores[1]) / 2;

    const results = await vectorStore.similaritySearch(
      SearchRequest.builder()
        .query("Spring")
        .topK(5)
        .similarityThreshold(similarityThreshold)
        .build(),
    );

    expect(results).toHaveLength(1);
    const resultDoc = results[0];
    expect(resultDoc.id).toBe(documents[0].id);
    expect(resultDoc.text).toContain(
      "Spring AI provides abstractions that serve as the foundation for developing AI applications.",
    );
    expect(resultDoc.metadata).toHaveProperty(
      RedisVectorStore.DISTANCE_FIELD_NAME,
    );
    expect(resultDoc.metadata).toHaveProperty(DocumentMetadata.DISTANCE);
    expect(resultDoc.score).toBeGreaterThanOrEqual(similarityThreshold);
  });

  it("deleteWithComplexFilterExpression", async () => {
    const doc1 = VectorDocument.builder()
      .text("Content 1")
      .metadata({ type: "A", priority: 1 })
      .build();
    const doc2 = VectorDocument.builder()
      .text("Content 2")
      .metadata({ type: "A", priority: 2 })
      .build();
    const doc3 = VectorDocument.builder()
      .text("Content 3")
      .metadata({ type: "B", priority: 1 })
      .build();

    await vectorStore.add([doc1, doc2, doc3]);

    const priorityFilter = new Filter.Expression(
      Filter.ExpressionType.GT,
      new Filter.Key("priority"),
      new Filter.Value(1),
    );
    const typeFilter = new Filter.Expression(
      Filter.ExpressionType.EQ,
      new Filter.Key("type"),
      new Filter.Value("A"),
    );
    const complexFilter = new Filter.Expression(
      Filter.ExpressionType.AND,
      typeFilter,
      priorityFilter,
    );

    await vectorStore.delete(complexFilter);

    const results = await vectorStore.similaritySearch(
      SearchRequest.builder()
        .query("Content")
        .topK(5)
        .similarityThresholdAll()
        .build(),
    );

    expect(results).toHaveLength(2);
    expect(results.map((document) => document.metadata.type)).toEqual(
      expect.arrayContaining(["A", "B"]),
    );
    expect(
      results.every((document) => Number(document.metadata.priority) === 1),
    ).toBe(true);
  });

  it("getNativeClientTest", () => {
    const nativeClient = vectorStore.getNativeClient<RedisClient>();
    expect(nativeClient).toBe(client);
  });
});

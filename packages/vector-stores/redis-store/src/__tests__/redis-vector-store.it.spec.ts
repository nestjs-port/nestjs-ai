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

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Document } from "@nestjs-ai/commons";
import {
  DocumentMetadata,
  Document as VectorDocument,
} from "@nestjs-ai/commons";
import { TransformersEmbeddingModel } from "@nestjs-ai/model-transformers";
import { Filter, SearchRequest } from "@nestjs-ai/vector-store";
import {
  RedisContainer,
  type StartedRedisContainer,
} from "@testcontainers/redis";
import { createClient, type RedisClientType } from "redis";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { RedisMetadataField } from "../redis-metadata-field";
import { RedisVectorStore } from "../redis-vector-store";

const readTestData = (fileName: string): string =>
  readFileSync(resolve(__dirname, fileName), "utf8");

const createRedisVectorStoreDocuments = (): Document[] => [
  new VectorDocument("1", readTestData("spring.ai.txt"), { meta1: "meta1" }),
  new VectorDocument("2", readTestData("time.shelter.txt"), {}),
  new VectorDocument("3", readTestData("great.depression.txt"), {
    meta2: "meta2",
  }),
];

describe("RedisVectorStoreIT", () => {
  let redisContainer: StartedRedisContainer;
  let client: RedisClientType;
  let embeddingModel: TransformersEmbeddingModel;
  let vectorStore: RedisVectorStore;

  const documents = createRedisVectorStoreDocuments();

  beforeAll(async () => {
    redisContainer = await new RedisContainer(
      "redis/redis-stack:latest",
    ).start();
    const redisUrl = redisContainer.getConnectionUrl();
    // Use the container connection URL directly for the Redis client.
    client = createClient({ url: redisUrl });
    await client.connect();

    embeddingModel = new TransformersEmbeddingModel();
    await embeddingModel.onModuleInit();
  }, 240_000);

  beforeEach(async () => {
    await client.flushAll();

    vectorStore = RedisVectorStore.builder(client, embeddingModel)
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
    await client.close();
    await redisContainer.stop();
  }, 60_000);

  it("ensure index gets created", async () => {
    expect(await client.ft._list()).toContain(
      RedisVectorStore.DEFAULT_INDEX_NAME,
    );
  });

  it("add and search", async () => {
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

    // Remove all documents from the store.
    await vectorStore.delete(documents.map((document) => document.id));

    const emptyResults = await vectorStore.similaritySearch(
      SearchRequest.builder().query("Spring").topK(1).build(),
    );
    expect(emptyResults).toHaveLength(0);
  });

  it("search with filters", async () => {
    const bgDocument = new VectorDocument(
      "The World is Big and Salvation Lurks Around the Corner",
      { country: "BG", year: 2020 },
    );
    const nlDocument = new VectorDocument(
      "The World is Big and Salvation Lurks Around the Corner",
      { country: "NL" },
    );
    const bgDocument2 = new VectorDocument(
      "The World is Big and Salvation Lurks Around the Corner",
      { country: "BG", year: 2023 },
    );

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

  it("document update", async () => {
    const document = new VectorDocument("d-1", "Spring AI rocks!!", {
      meta1: "meta1",
    });

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

    const sameIdDocument = new VectorDocument(
      document.id,
      "The World is Big and Salvation Lurks Around the Corner",
      { meta2: "meta2" },
    );
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

  it("search with threshold", async () => {
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

  it("delete with complex filter expression", async () => {
    const doc1 = new VectorDocument("Content 1", { type: "A", priority: 1 });
    const doc2 = new VectorDocument("Content 2", { type: "A", priority: 2 });
    const doc3 = new VectorDocument("Content 3", { type: "B", priority: 1 });

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
    // Complex filter expression: (type == 'A' AND priority > 1)
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

  it("get native client test", () => {
    const nativeClient =
      vectorStore.getNativeClient<ReturnType<typeof createClient>>();
    expect(nativeClient).toBe(client);
  });
});

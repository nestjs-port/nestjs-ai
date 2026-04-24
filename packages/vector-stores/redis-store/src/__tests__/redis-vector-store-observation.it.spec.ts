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
import type { Document } from "@nestjs-ai/commons";
import { Document as VectorDocument } from "@nestjs-ai/commons";
import { TransformersEmbeddingModel } from "@nestjs-ai/model-transformers";
import { SearchRequest } from "@nestjs-ai/vector-store";
import { TestObservationRegistry } from "@nestjs-port/testing";
import {
  RedisContainer,
  type StartedRedisContainer,
} from "@testcontainers/redis";
import { createClient, type RedisClientType } from "redis";
import {
  assert,
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import { RedisMetadataField } from "../redis-metadata-field.js";
import { RedisVectorStore } from "../redis-vector-store.js";

const readTestData = (fileName: string): string =>
  readFileSync(new URL(fileName, import.meta.url), "utf8");

const createRedisVectorStoreDocuments = (): Document[] => [
  new VectorDocument("1", readTestData("spring.ai.txt"), { meta1: "meta1" }),
  new VectorDocument("2", readTestData("time.shelter.txt"), {}),
  new VectorDocument("3", readTestData("great.depression.txt"), {
    meta2: "meta2",
  }),
];

describe("RedisVectorStoreObservationIT", () => {
  let redisContainer: StartedRedisContainer;
  let client: RedisClientType;
  let embeddingModel: TransformersEmbeddingModel;
  let vectorStore: RedisVectorStore;
  let observationRegistry: TestObservationRegistry;

  const documents = createRedisVectorStoreDocuments();

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

  beforeEach(async () => {
    await client.flushAll();

    observationRegistry = TestObservationRegistry.create();

    vectorStore = RedisVectorStore.builder(client, embeddingModel)
      .observationRegistry(observationRegistry as never)
      .customObservationConvention(null)
      .initializeSchema(true)
      .metadataFields(
        RedisMetadataField.tag("meta1"),
        RedisMetadataField.tag("meta2"),
        RedisMetadataField.tag("country"),
        RedisMetadataField.numeric("year"),
      )
      .build();

    await vectorStore.onModuleInit();
  });

  afterAll(async () => {
    await client.close();
    await redisContainer.stop();
  }, 60_000);

  it("add and search with default observation convention", async () => {
    await vectorStore.add(documents);

    const results = await vectorStore.similaritySearch(
      SearchRequest.builder().query("Spring").topK(1).build(),
    );

    expect(results).toHaveLength(1);
    const resultDoc = results[0];
    expect(resultDoc.text).toContain(
      "Spring AI provides abstractions that serve as the foundation for developing AI applications.",
    );
    expect(Object.keys(resultDoc.metadata)).toHaveLength(3);
    expect(resultDoc.metadata).toHaveProperty("meta1");
    expect(resultDoc.metadata).toHaveProperty(
      RedisVectorStore.DISTANCE_FIELD_NAME,
    );

    // Just verify that we have registry
    assert.exists(observationRegistry);
  });
});

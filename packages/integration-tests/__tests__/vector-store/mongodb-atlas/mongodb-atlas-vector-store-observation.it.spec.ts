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

import {
  Document,
  SpringAiKind,
  VectorStoreProvider,
} from "@nestjs-ai/commons";
import { TokenCountBatchingStrategy } from "@nestjs-ai/model";
import {
  OpenAiEmbeddingModel,
  OpenAiEmbeddingOptions,
} from "@nestjs-ai/model-openai";
import {
  DefaultVectorStoreObservationConvention,
  SearchRequest,
} from "@nestjs-ai/vector-store";
import { MongoDBAtlasVectorStore } from "@nestjs-ai/vector-store-mongodb-atlas";
import { TestObservationRegistry } from "@nestjs-port/testing";
import { MongoClient } from "mongodb";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  MongoDBAtlasLocalContainer,
  type StartedMongoDBAtlasLocalContainer,
} from "./mongodb-atlas-local-container.js";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const readTestData = (fileName: string): string =>
  readFileSync(new URL(`../resources/${fileName}`, import.meta.url), "utf8");

const createDocuments = (): Document[] => [
  new Document(readTestData("spring.ai.txt"), { meta1: "meta1" }),
  new Document(readTestData("time.shelter.txt")),
  new Document(readTestData("great.depression.txt"), { meta2: "meta2" }),
];

describe.skipIf(!OPENAI_API_KEY)("MongoDbVectorStoreObservationIT", () => {
  let mongoDbContainer: StartedMongoDBAtlasLocalContainer;
  let mongoClient: MongoClient;
  let embeddingModel: OpenAiEmbeddingModel;
  let observationRegistry: TestObservationRegistry;
  let vectorStore: MongoDBAtlasVectorStore;

  const documents = createDocuments();

  beforeAll(async () => {
    mongoDbContainer = await new MongoDBAtlasLocalContainer().start();
    mongoClient = new MongoClient(mongoDbContainer.getConnectionString());
    await mongoClient.connect();

    embeddingModel = new OpenAiEmbeddingModel({
      options: OpenAiEmbeddingOptions.builder()
        .apiKey(OPENAI_API_KEY ?? "")
        .model(OpenAiEmbeddingOptions.DEFAULT_EMBEDDING_MODEL)
        .build(),
    });

    await new Promise((resolve) => setTimeout(resolve, 30_000));
  }, 240_000);

  beforeEach(async () => {
    const collection = mongoClient
      .db()
      .collection(MongoDBAtlasVectorStore.DEFAULT_COLLECTION_NAME);

    await collection.deleteMany({});

    observationRegistry = TestObservationRegistry.create();

    vectorStore = MongoDBAtlasVectorStore.builder(mongoClient, embeddingModel)
      .metadataFieldsToFilter("country", "year")
      .initializeSchema(true)
      .observationRegistry(observationRegistry)
      .customObservationConvention(null)
      .batchingStrategy(new TokenCountBatchingStrategy())
      .build();

    await vectorStore.onModuleInit();
  }, 120_000);

  afterAll(async () => {
    await mongoClient.close();
    await mongoDbContainer.stop();
  }, 60_000);

  it("observation vector store add and query operations", async () => {
    await vectorStore.add(documents);

    const addObservation = observationRegistry.contexts.find(
      (entry) =>
        entry.context.name ===
          DefaultVectorStoreObservationConvention.DEFAULT_NAME &&
        entry.context.contextualName ===
          `${VectorStoreProvider.MONGODB.value} add`,
    );

    expect(addObservation).toBeDefined();
    expect(addObservation?.isObservationStarted).toBe(true);
    expect(addObservation?.isObservationStopped).toBe(true);
    expect(
      addObservation?.context.lowCardinalityKeyValues.get("db.operation.name"),
    ).toBe("add");
    expect(
      addObservation?.context.lowCardinalityKeyValues.get("db.system"),
    ).toBe(VectorStoreProvider.MONGODB.value);
    expect(
      addObservation?.context.lowCardinalityKeyValues.get("spring.ai.kind"),
    ).toBe(SpringAiKind.VECTOR_STORE.value);
    expect(
      addObservation?.context.highCardinalityKeyValues.get(
        "db.vector.query.content",
      ),
    ).toBeUndefined();
    expect(
      addObservation?.context.highCardinalityKeyValues.get(
        "db.vector.dimension_count",
      ),
    ).toBe("1536");
    expect(
      addObservation?.context.highCardinalityKeyValues.get(
        "db.collection.name",
      ),
    ).toBe(MongoDBAtlasVectorStore.DEFAULT_COLLECTION_NAME);
    expect(
      addObservation?.context.highCardinalityKeyValues.get("db.namespace"),
    ).toBeUndefined();
    expect(
      addObservation?.context.highCardinalityKeyValues.get(
        "db.vector.field_name",
      ),
    ).toBe("embedding");
    expect(
      addObservation?.context.highCardinalityKeyValues.get(
        "db.search.similarity_metric",
      ),
    ).toBeUndefined();
    expect(
      addObservation?.context.highCardinalityKeyValues.get(
        "db.vector.query.top_k",
      ),
    ).toBeUndefined();
    expect(
      addObservation?.context.highCardinalityKeyValues.get(
        "db.vector.query.similarity_threshold",
      ),
    ).toBeUndefined();

    expect(observationRegistry.currentObservation).toBeNull();

    observationRegistry.clear();

    const results = await vectorStore.similaritySearch(
      SearchRequest.builder().query("What is Great Depression").topK(1).build(),
    );

    expect(results).not.toHaveLength(0);

    const queryObservation = observationRegistry.contexts.find(
      (entry) =>
        entry.context.name ===
          DefaultVectorStoreObservationConvention.DEFAULT_NAME &&
        entry.context.contextualName ===
          `${VectorStoreProvider.MONGODB.value} query`,
    );

    expect(queryObservation).toBeDefined();
    expect(queryObservation?.isObservationStarted).toBe(true);
    expect(queryObservation?.isObservationStopped).toBe(true);
    expect(
      queryObservation?.context.lowCardinalityKeyValues.get(
        "db.operation.name",
      ),
    ).toBe("query");
    expect(
      queryObservation?.context.lowCardinalityKeyValues.get("db.system"),
    ).toBe(VectorStoreProvider.MONGODB.value);
    expect(
      queryObservation?.context.lowCardinalityKeyValues.get("spring.ai.kind"),
    ).toBe(SpringAiKind.VECTOR_STORE.value);
    expect(
      queryObservation?.context.highCardinalityKeyValues.get(
        "db.vector.query.content",
      ),
    ).toBe("What is Great Depression");
    expect(
      queryObservation?.context.highCardinalityKeyValues.get(
        "db.vector.dimension_count",
      ),
    ).toBe("1536");
    expect(
      queryObservation?.context.highCardinalityKeyValues.get(
        "db.collection.name",
      ),
    ).toBe(MongoDBAtlasVectorStore.DEFAULT_COLLECTION_NAME);
    expect(
      queryObservation?.context.highCardinalityKeyValues.get("db.namespace"),
    ).toBeUndefined();
    expect(
      queryObservation?.context.highCardinalityKeyValues.get(
        "db.vector.field_name",
      ),
    ).toBe("embedding");
    expect(
      queryObservation?.context.highCardinalityKeyValues.get(
        "db.search.similarity_metric",
      ),
    ).toBeUndefined();
    expect(
      queryObservation?.context.highCardinalityKeyValues.get(
        "db.vector.query.top_k",
      ),
    ).toBe("1");
    expect(
      queryObservation?.context.highCardinalityKeyValues.get(
        "db.vector.query.similarity_threshold",
      ),
    ).toBe("0");

    expect(observationRegistry.currentObservation).toBeNull();
  });
});

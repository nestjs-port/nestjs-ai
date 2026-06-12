/*
 * Copyright 2026-present the original author or authors.
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
import { Client } from "@elastic/elasticsearch";
import {
  Document,
  SpringAiKind,
  VectorStoreProvider,
  VectorStoreSimilarityMetric,
} from "@nestjs-ai/commons";
import {
  OpenAiEmbeddingModel,
  OpenAiEmbeddingOptions,
} from "@nestjs-ai/model-openai";
import {
  DefaultVectorStoreObservationConvention,
  SearchRequest,
} from "@nestjs-ai/vector-store";
import { TestObservationRegistry } from "@nestjs-port/testing";
import {
  ElasticsearchContainer,
  type StartedElasticsearchContainer,
} from "@testcontainers/elasticsearch";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { ElasticsearchVectorStore } from "../elasticsearch-vector-store.js";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const DEFAULT_INDEX_NAME = "spring-ai-document-index";

const readTestData = (fileName: string): string =>
  readFileSync(new URL(fileName, import.meta.url), "utf8");

const createDocuments = (): Document[] => [
  new Document(readTestData("spring.ai.txt"), { meta1: "meta1" }),
  new Document(readTestData("time.shelter.txt")),
  new Document(readTestData("great.depression.txt"), { meta2: "meta2" }),
];

describe.skipIf(!OPENAI_API_KEY)(
  "ElasticsearchVectorStoreObservationIT",
  () => {
    let elasticsearchContainer: StartedElasticsearchContainer;
    let client: Client;
    let embeddingModel: OpenAiEmbeddingModel;
    let observationRegistry: TestObservationRegistry;
    let vectorStore: ElasticsearchVectorStore;

    const documents = createDocuments();

    beforeAll(async () => {
      elasticsearchContainer = await new ElasticsearchContainer(
        "elasticsearch:9.2.0",
      ).start();

      client = new Client({
        node: elasticsearchContainer.getHttpUrl(),
        auth: {
          username: elasticsearchContainer.getUsername(),
          password: elasticsearchContainer.getPassword(),
        },
      });

      embeddingModel = new OpenAiEmbeddingModel({
        options: OpenAiEmbeddingOptions.builder()
          .apiKey(OPENAI_API_KEY ?? "")
          .model(OpenAiEmbeddingOptions.DEFAULT_EMBEDDING_MODEL)
          .build(),
      });
    }, 240_000);

    beforeEach(async () => {
      const indexExists = await client.indices.exists({
        index: DEFAULT_INDEX_NAME,
      });
      if (indexExists) {
        await client.indices.delete({ index: DEFAULT_INDEX_NAME });
      }

      observationRegistry = TestObservationRegistry.create();

      vectorStore = ElasticsearchVectorStore.builder(client, embeddingModel)
        .observationRegistry(observationRegistry as never)
        .customObservationConvention(null)
        .initializeSchema(true)
        .build();

      await vectorStore.onModuleInit();
    });

    afterAll(async () => {
      await client.close();
      await elasticsearchContainer.stop();
    }, 60_000);

    it("observation vector store add and query operations", async () => {
      await vectorStore.add(documents);

      const addObservation = observationRegistry.contexts.find(
        (entry) =>
          entry.context.name ===
            DefaultVectorStoreObservationConvention.DEFAULT_NAME &&
          entry.context.contextualName ===
            `${VectorStoreProvider.ELASTICSEARCH.value} add`,
      );

      expect(addObservation).toBeDefined();
      expect(addObservation?.isObservationStarted).toBe(true);
      expect(addObservation?.isObservationStopped).toBe(true);
      expect(
        addObservation?.context.lowCardinalityKeyValues.get(
          "db.operation.name",
        ),
      ).toBe("add");
      expect(
        addObservation?.context.lowCardinalityKeyValues.get("db.system"),
      ).toBe(VectorStoreProvider.ELASTICSEARCH.value);
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
      ).toBe(DEFAULT_INDEX_NAME);
      expect(
        addObservation?.context.highCardinalityKeyValues.get("db.namespace"),
      ).toBeUndefined();
      expect(
        addObservation?.context.highCardinalityKeyValues.get(
          "db.vector.field_name",
        ),
      ).toBeUndefined();
      expect(
        addObservation?.context.highCardinalityKeyValues.get(
          "db.search.similarity_metric",
        ),
      ).toBe(VectorStoreSimilarityMetric.COSINE.value);
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

      await client.indices.refresh({ index: DEFAULT_INDEX_NAME });
      observationRegistry.clear();

      const results = await vectorStore.similaritySearch(
        SearchRequest.builder()
          .query("What is Great Depression")
          .topK(1)
          .build(),
      );

      expect(results).not.toHaveLength(0);

      const queryObservation = observationRegistry.contexts.find(
        (entry) =>
          entry.context.name ===
            DefaultVectorStoreObservationConvention.DEFAULT_NAME &&
          entry.context.contextualName ===
            `${VectorStoreProvider.ELASTICSEARCH.value} query`,
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
      ).toBe(VectorStoreProvider.ELASTICSEARCH.value);
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
      ).toBe(DEFAULT_INDEX_NAME);
      expect(
        queryObservation?.context.highCardinalityKeyValues.get("db.namespace"),
      ).toBeUndefined();
      expect(
        queryObservation?.context.highCardinalityKeyValues.get(
          "db.vector.field_name",
        ),
      ).toBeUndefined();
      expect(
        queryObservation?.context.highCardinalityKeyValues.get(
          "db.search.similarity_metric",
        ),
      ).toBe(VectorStoreSimilarityMetric.COSINE.value);
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
  },
);

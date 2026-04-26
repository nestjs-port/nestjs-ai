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
import { DataSource } from "typeorm";
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
  SearchRequest,
  DefaultVectorStoreObservationConvention,
} from "@nestjs-ai/vector-store";
import { JsdbcTemplate } from "@nestjs-port/jsdbc";
import { TypeOrmDataSource } from "@nestjs-port/jsdbc/typeorm";
import { TestObservationRegistry } from "@nestjs-port/testing";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  PgDistanceType,
  PgIndexType,
  PgVectorStore,
} from "../pg-vector-store.js";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

describe.skipIf(!OPENAI_API_KEY)("PgVectorStoreObservationIT", () => {
  let postgresContainer: StartedPostgreSqlContainer;
  let typeormDataSource: DataSource;
  let jsdbcTemplate: JsdbcTemplate;
  let vectorStore: PgVectorStore;
  let observationRegistry: TestObservationRegistry;
  let embeddingModel: OpenAiEmbeddingModel;

  const documents = [
    new Document(
      readFileSync(new URL("spring.ai.txt", import.meta.url), "utf8"),
      { meta1: "meta1" },
    ),
    new Document(
      readFileSync(new URL("time.shelter.txt", import.meta.url), "utf8"),
    ),
    new Document(
      readFileSync(new URL("great.depression.txt", import.meta.url), "utf8"),
      { meta2: "meta2" },
    ),
  ];

  beforeAll(async () => {
    postgresContainer = await new PostgreSqlContainer("pgvector/pgvector:pg17")
      .withDatabase("postgres")
      .withUsername("postgres")
      .withPassword("postgres")
      .start();

    typeormDataSource = new DataSource({
      type: "postgres",
      url: postgresContainer.getConnectionUri(),
      synchronize: false,
      logging: false,
    });
    await typeormDataSource.initialize();

    jsdbcTemplate = new JsdbcTemplate(new TypeOrmDataSource(typeormDataSource));

    embeddingModel = new OpenAiEmbeddingModel({
      options: OpenAiEmbeddingOptions.builder()
        .apiKey(OPENAI_API_KEY ?? "")
        .model(OpenAiEmbeddingOptions.DEFAULT_EMBEDDING_MODEL)
        .build(),
    });

    observationRegistry = TestObservationRegistry.create();

    vectorStore = PgVectorStore.builder(jsdbcTemplate, embeddingModel)
      .distanceType(PgDistanceType.COSINE_DISTANCE)
      .indexType(PgIndexType.HNSW)
      .observationRegistry(observationRegistry)
      .initializeSchema(true)
      .build();

    await vectorStore.onModuleInit();
  }, 240_000);

  afterAll(async () => {
    await typeormDataSource?.destroy();
    await postgresContainer?.stop();
  }, 60_000);

  it("observation vector store add and query operations", async () => {
    await vectorStore.add(documents);

    const addObservation = observationRegistry.contexts.find(
      (entry) =>
        entry.context.name ===
          DefaultVectorStoreObservationConvention.DEFAULT_NAME &&
        entry.context.contextualName ===
          `${VectorStoreProvider.PG_VECTOR.value} add`,
    );

    expect(addObservation).toBeDefined();
    expect(addObservation?.isObservationStarted).toBe(true);
    expect(addObservation?.isObservationStopped).toBe(true);
    expect(
      addObservation?.context.lowCardinalityKeyValues.get("db.operation.name"),
    ).toBe("add");
    expect(
      addObservation?.context.lowCardinalityKeyValues.get("db.system"),
    ).toBe(VectorStoreProvider.PG_VECTOR.value);
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
    ).toBe(PgVectorStore.DEFAULT_TABLE_NAME);
    expect(
      addObservation?.context.highCardinalityKeyValues.get("db.namespace"),
    ).toBe("public");
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
          `${VectorStoreProvider.PG_VECTOR.value} query`,
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
    ).toBe(VectorStoreProvider.PG_VECTOR.value);
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
    ).toBe(PgVectorStore.DEFAULT_TABLE_NAME);
    expect(
      queryObservation?.context.highCardinalityKeyValues.get("db.namespace"),
    ).toBe("public");
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
});

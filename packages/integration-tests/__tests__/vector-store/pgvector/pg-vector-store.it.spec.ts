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

import "reflect-metadata";

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { DataSource } from "typeorm";
import { Document, DocumentMetadata } from "@nestjs-ai/commons";
import {
  OpenAiEmbeddingModel,
  OpenAiEmbeddingOptions,
} from "@nestjs-ai/model-openai";
import {
  FilterExpressionParseException,
  SearchRequest,
  type VectorStore,
} from "@nestjs-ai/vector-store";
import {
  PgDistanceType,
  PgIdType,
  PgIndexType,
  PgVectorStore,
  type PgVectorStoreProperties,
} from "@nestjs-ai/vector-store-pgvector";
import { JsdbcTemplate, sql } from "@nestjs-port/jsdbc";
import { TypeOrmDataSource } from "@nestjs-port/jsdbc/typeorm";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/* eslint-disable jest/no-standalone-expect */
import { BaseVectorStoreTests } from "../base-vector-store-tests.it-shared.js";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const DISTANCE_TYPES = [
  PgDistanceType.COSINE_DISTANCE,
  PgDistanceType.EUCLIDEAN_DISTANCE,
  PgDistanceType.NEGATIVE_INNER_PRODUCT,
] as const;

const DISTANCE_TYPE_CASES = DISTANCE_TYPES.map(
  (distanceType) => [distanceType.name, distanceType] as const,
);

const readTestData = (fileName: string): string =>
  readFileSync(new URL(fileName, import.meta.url), "utf8");

const createDocuments = (): Document[] => [
  new Document(readTestData("spring.ai.txt"), { meta1: "meta1" }),
  new Document(readTestData("time.shelter.txt")),
  new Document(readTestData("great.depression.txt"), { meta2: "meta2" }),
];

describe.skipIf(!OPENAI_API_KEY)("PgVectorStoreIT", () => {
  let postgresContainer: StartedPostgreSqlContainer;
  let typeormDataSource: DataSource;
  let jsdbcTemplate: JsdbcTemplate;
  let embeddingModel: OpenAiEmbeddingModel;
  let integration: PgVectorStoreIT;

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
      options: new OpenAiEmbeddingOptions({
        apiKey: OPENAI_API_KEY ?? "",
        model: OpenAiEmbeddingOptions.DEFAULT_EMBEDDING_MODEL,
      }),
    });

    integration = new PgVectorStoreIT(jsdbcTemplate, embeddingModel);
  }, 240_000);

  afterAll(async () => {
    await typeormDataSource?.destroy();
    await postgresContainer?.stop();
  }, 60_000);

  it.each(DISTANCE_TYPE_CASES)(
    "add and search with %s",
    async (_label, distanceType) => {
      await integration.addAndSearch(distanceType);
    },
  );

  it("test to pg type with uuid id type", async () => {
    await integration.testToPgTypeWithUuidIdType();
  });

  it("test to pg type with text id type", async () => {
    await integration.testToPgTypeWithTextIdType();
  });

  it("test to pg type with serial id type", async () => {
    await integration.testToPgTypeWithSerialIdType();
  });

  it("test to pg type with big serial id type", async () => {
    await integration.testToPgTypeWithBigSerialIdType();
  });

  it("test bulk operation with uuid id type", async () => {
    await integration.testBulkOperationWithUuidIdType();
  });

  it("test bulk operation with non uuid id type", async () => {
    await integration.testBulkOperationWithNonUuidIdType();
  });

  it.each([
    ["country in ['BG','NL']", 3],
    ["year in [2020]", 1],
    ["country not in ['BG']", 1],
    ["year not in [2020]", 2],
  ] as const)(
    "search with in filter %s should return %s records",
    async (expression, expectedRecords) => {
      await integration.searchWithInFilter(expression, expectedRecords);
    },
  );

  it.each(DISTANCE_TYPE_CASES)(
    "search with filters using %s",
    async (_label, distanceType) => {
      await integration.searchWithFilters(distanceType);
    },
  );

  it.each(DISTANCE_TYPE_CASES)(
    "document update with %s",
    async (_label, distanceType) => {
      await integration.documentUpdate(distanceType);
    },
  );

  it.each(DISTANCE_TYPE_CASES)(
    "search with threshold using %s",
    async (_label, distanceType) => {
      await integration.searchWithThreshold(distanceType);
    },
  );

  it("get native client test", async () => {
    await integration.getNativeClientTest();
  });

  it("delete by id", async () => {
    await integration.deleteById();
  });

  it("delete with string filter expression", async () => {
    await integration.deleteWithStringFilterExpression();
  });

  it("delete by filter", async () => {
    await integration.deleteByFilter();
  });
});

class PgVectorStoreIT extends BaseVectorStoreTests {
  constructor(
    private readonly jsdbcTemplate: JsdbcTemplate,
    private readonly embeddingModel: OpenAiEmbeddingModel,
  ) {
    super();
  }

  protected override async executeTest(
    testFunction: (vectorStore: VectorStore) => Promise<void> | void,
  ): Promise<void> {
    await this.runWithVectorStore({}, testFunction);
  }

  async addAndSearch(distanceType: PgDistanceType): Promise<void> {
    await this.runWithVectorStore({ distanceType }, async (vectorStore) => {
      const documents = createDocuments();
      await vectorStore.add(documents);

      const results = await vectorStore.similaritySearch(
        SearchRequest.builder()
          .query("What is Great Depression")
          .topK(1)
          .build(),
      );

      expect(results).toHaveLength(1);
      const resultDoc = results[0];
      expect(resultDoc.id).toBe(documents[2].id);
      expect(resultDoc.metadata).toHaveProperty("meta2", "meta2");
      expect(resultDoc.metadata).toHaveProperty(DocumentMetadata.DISTANCE);

      await vectorStore.delete(documents.map((document) => document.id));

      const emptyResults = await vectorStore.similaritySearch(
        SearchRequest.builder().query("Great Depression").topK(1).build(),
      );
      expect(emptyResults).toHaveLength(0);
    });
  }

  async testToPgTypeWithUuidIdType(): Promise<void> {
    await this.runWithVectorStore(
      { distanceType: PgDistanceType.COSINE_DISTANCE },
      async (vectorStore) => {
        await vectorStore.add([new Document(randomUUID(), "TEXT", {})]);
      },
    );
  }

  async testToPgTypeWithTextIdType(): Promise<void> {
    await this.runWithVectorStore(
      {
        distanceType: PgDistanceType.COSINE_DISTANCE,
        idType: PgIdType.TEXT,
      },
      async (vectorStore) => {
        await vectorStore.add([new Document("NOT_UUID", "TEXT", {})]);
      },
    );
  }

  async testToPgTypeWithSerialIdType(): Promise<void> {
    await this.runWithVectorStore(
      {
        distanceType: PgDistanceType.COSINE_DISTANCE,
        idType: PgIdType.SERIAL,
      },
      async (vectorStore) => {
        await vectorStore.add([new Document("1", "TEXT", {})]);
      },
    );
  }

  async testToPgTypeWithBigSerialIdType(): Promise<void> {
    await this.runWithVectorStore(
      {
        distanceType: PgDistanceType.COSINE_DISTANCE,
        idType: PgIdType.BIGSERIAL,
      },
      async (vectorStore) => {
        await vectorStore.add([new Document("1", "TEXT", {})]);
      },
    );
  }

  async testBulkOperationWithUuidIdType(): Promise<void> {
    await this.runWithVectorStore(
      { distanceType: PgDistanceType.COSINE_DISTANCE },
      async (vectorStore) => {
        const documents = [
          new Document(randomUUID(), "TEXT", {}),
          new Document(randomUUID(), "TEXT", {}),
          new Document(randomUUID(), "TEXT", {}),
        ];
        await vectorStore.add(documents);
        await vectorStore.delete(documents.map((document) => document.id));
      },
    );
  }

  async testBulkOperationWithNonUuidIdType(): Promise<void> {
    await this.runWithVectorStore(
      {
        distanceType: PgDistanceType.COSINE_DISTANCE,
        idType: PgIdType.TEXT,
      },
      async (vectorStore) => {
        const documents = [
          new Document("NON_UUID_1", "TEXT", {}),
          new Document("NON_UUID_2", "TEXT", {}),
          new Document("NON_UUID_3", "TEXT", {}),
        ];
        await vectorStore.add(documents);
        await vectorStore.delete(documents.map((document) => document.id));
      },
    );
  }

  async searchWithInFilter(
    expression: string,
    expectedRecords: number,
  ): Promise<void> {
    await this.runWithVectorStore(
      { distanceType: PgDistanceType.COSINE_DISTANCE },
      async (vectorStore) => {
        const bgDocument = new Document(
          "The World is Big and Salvation Lurks Around the Corner",
          { country: "BG", year: 2020, "foo bar 1": "bar.foo" },
        );
        const nlDocument = new Document(
          "The World is Big and Salvation Lurks Around the Corner",
          { country: "NL" },
        );
        const bgDocument2 = new Document(
          "The World is Big and Salvation Lurks Around the Corner",
          { country: "BG", year: 2023 },
        );

        await vectorStore.add([bgDocument, nlDocument, bgDocument2]);

        const results = await vectorStore.similaritySearch(
          SearchRequest.builder()
            .query("The World")
            .filterExpression(expression)
            .topK(5)
            .similarityThresholdAll()
            .build(),
        );

        expect(results).toHaveLength(expectedRecords);
      },
    );
  }

  async searchWithFilters(distanceType: PgDistanceType): Promise<void> {
    await this.runWithVectorStore({ distanceType }, async (vectorStore) => {
      const bgDocument = new Document(
        "The World is Big and Salvation Lurks Around the Corner",
        { country: "BG", year: 2020, "foo bar 1": "bar.foo" },
      );
      const nlDocument = new Document(
        "The World is Big and Salvation Lurks Around the Corner",
        { country: "NL" },
      );
      const bgDocument2 = new Document(
        "The World is Big and Salvation Lurks Around the Corner",
        { country: "BG", year: 2023 },
      );

      await vectorStore.add([bgDocument, nlDocument, bgDocument2]);

      const searchRequest = SearchRequest.builder()
        .query("The World")
        .topK(5)
        .similarityThresholdAll()
        .build();

      let results = await vectorStore.similaritySearch(searchRequest);
      expect(results).toHaveLength(3);

      results = await vectorStore.similaritySearch(
        SearchRequest.from(searchRequest)
          .filterExpression("country == 'NL'")
          .build(),
      );
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(nlDocument.id);

      results = await vectorStore.similaritySearch(
        SearchRequest.from(searchRequest)
          .filterExpression("country == 'BG'")
          .build(),
      );
      expect(results).toHaveLength(2);
      expect([bgDocument.id, bgDocument2.id]).toContain(results[0].id);
      expect([bgDocument.id, bgDocument2.id]).toContain(results[1].id);

      results = await vectorStore.similaritySearch(
        SearchRequest.from(searchRequest)
          .filterExpression("country == 'BG' && year == 2020")
          .build(),
      );
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(bgDocument.id);

      results = await vectorStore.similaritySearch(
        SearchRequest.from(searchRequest)
          .filterExpression(
            "(country == 'BG' && year == 2020) || (country == 'NL')",
          )
          .build(),
      );
      expect(results).toHaveLength(2);
      expect([bgDocument.id, nlDocument.id]).toContain(results[0].id);
      expect([bgDocument.id, nlDocument.id]).toContain(results[1].id);

      results = await vectorStore.similaritySearch(
        SearchRequest.from(searchRequest)
          .filterExpression(
            "NOT((country == 'BG' && year == 2020) || (country == 'NL'))",
          )
          .build(),
      );
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(bgDocument2.id);

      results = await vectorStore.similaritySearch(
        SearchRequest.builder()
          .query("The World")
          .topK(5)
          .similarityThresholdAll()
          .filterExpression("'\"foo bar 1\"' == 'bar.foo'")
          .build(),
      );
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(bgDocument.id);

      expect(() =>
        SearchRequest.from(searchRequest).filterExpression("country == NL"),
      ).toThrowError(FilterExpressionParseException);
      expect(() =>
        SearchRequest.from(searchRequest).filterExpression("country == NL"),
      ).toThrowError(/Error: no viable alternative at input 'NL'/);
    });
  }

  async documentUpdate(distanceType: PgDistanceType): Promise<void> {
    await this.runWithVectorStore({ distanceType }, async (vectorStore) => {
      const document = new Document(randomUUID(), "Spring AI rocks!!", {
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
      expect(resultDoc.metadata).toHaveProperty(DocumentMetadata.DISTANCE);

      const sameIdDocument = new Document(
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
      expect(resultDoc.metadata).toHaveProperty(DocumentMetadata.DISTANCE);
    });
  }

  async searchWithThreshold(distanceType: PgDistanceType): Promise<void> {
    await this.runWithVectorStore({ distanceType }, async (vectorStore) => {
      const documents = createDocuments();
      await vectorStore.add(documents);

      const fullResult = await vectorStore.similaritySearch(
        SearchRequest.builder()
          .query("Time Shelter")
          .topK(5)
          .similarityThresholdAll()
          .build(),
      );
      expect(fullResult).toHaveLength(3);
      expect(isSortedBySimilarity(fullResult)).toBe(true);

      const scores = fullResult.map((document) => document.score ?? 0);
      const similarityThreshold = (scores[0] + scores[1]) / 2;

      const results = await vectorStore.similaritySearch(
        SearchRequest.builder()
          .query("Time Shelter")
          .topK(5)
          .similarityThreshold(similarityThreshold)
          .build(),
      );

      expect(results).toHaveLength(1);
      const resultDoc = results[0];
      expect(resultDoc.id).toBe(documents[1].id);
      expect(resultDoc.score ?? 0).toBeGreaterThanOrEqual(similarityThreshold);
    });
  }

  async getNativeClientTest(): Promise<void> {
    await this.runWithVectorStore({}, async (vectorStore) => {
      const nativeClient = vectorStore.getNativeClient<JsdbcTemplate>();
      expect(nativeClient).not.toBeNull();
    });
  }

  private async runWithVectorStore(
    properties: Partial<PgVectorStoreProperties>,
    testFunction: (vectorStore: VectorStore) => Promise<void> | void,
  ): Promise<void> {
    const vectorStore = await this.createVectorStore(properties);
    try {
      await testFunction(vectorStore);
    } finally {
      await this.dropTable();
    }
  }

  private async createVectorStore(
    properties: Partial<PgVectorStoreProperties>,
  ): Promise<PgVectorStore> {
    const builder = PgVectorStore.builder(
      this.jsdbcTemplate,
      this.embeddingModel,
    )
      .dimensions(PgVectorStore.INVALID_EMBEDDING_DIMENSION)
      .distanceType(PgDistanceType.COSINE_DISTANCE)
      .indexType(PgIndexType.HNSW)
      .initializeSchema(true)
      .removeExistingVectorStoreTable(true);

    if (properties.distanceType != null) {
      builder.distanceType(properties.distanceType);
    }
    if (properties.idType != null) {
      builder.idType(properties.idType);
    }
    if (properties.indexType != null) {
      builder.indexType(properties.indexType);
    }
    if (properties.initializeSchema != null) {
      builder.initializeSchema(properties.initializeSchema);
    }
    if (properties.removeExistingVectorStoreTable != null) {
      builder.removeExistingVectorStoreTable(
        properties.removeExistingVectorStoreTable,
      );
    }
    if (properties.schemaName != null) {
      builder.schemaName(properties.schemaName);
    }
    if (properties.tableName != null) {
      builder.vectorTableName(properties.tableName);
    }
    if (properties.schemaValidation != null) {
      builder.vectorTableValidationsEnabled(properties.schemaValidation);
    }
    if (properties.dimensions != null) {
      builder.dimensions(properties.dimensions);
    }
    if (properties.maxDocumentBatchSize != null) {
      builder.maxDocumentBatchSize(properties.maxDocumentBatchSize);
    }

    const vectorStore = builder.build();
    await vectorStore.onModuleInit();
    return vectorStore;
  }

  private async dropTable(): Promise<void> {
    await this.jsdbcTemplate.update(
      sql`DROP TABLE IF EXISTS public.vector_store`,
    );
  }
}

function isSortedBySimilarity(docs: Document[]): boolean {
  const scores = docs.map((doc) => doc.score ?? 0);
  if (scores.length <= 1) {
    return true;
  }

  for (let index = 1; index < scores.length; index += 1) {
    if (scores[index - 1] < scores[index]) {
      return false;
    }
  }

  return true;
}

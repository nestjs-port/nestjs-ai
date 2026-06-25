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

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { DataSource } from "typeorm";
import { Document, DocumentMetadata } from "@nestjs-ai/commons";
import {
  OpenAiEmbeddingModel,
  OpenAiEmbeddingOptions,
} from "@nestjs-ai/model-openai";
import {
  Filter,
  FilterExpressionParseException,
  SearchRequest,
  type VectorStore,
} from "@nestjs-ai/vector-store";
import {
  MariaDBDistanceType,
  MariaDBVectorStore,
  type MariaDBVectorStoreProperties,
} from "@nestjs-ai/vector-store-mariadb";
import { JsdbcTemplate, sql } from "@nestjs-port/jsdbc";
import { TypeOrmDataSource } from "@nestjs-port/jsdbc/typeorm";
import {
  MariaDbContainer,
  type StartedMariaDbContainer,
} from "@testcontainers/mariadb";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/* eslint-disable jest/no-standalone-expect */
import { BaseVectorStoreTests } from "../base-vector-store-tests.it-shared.js";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const schemaName = "testdb";

const readTestData = (fileName: string): string =>
  readFileSync(new URL(`../resources/${fileName}`, import.meta.url), "utf8");

const createDocuments = (): Document[] => [
  new Document(readTestData("spring.ai.txt"), { meta1: "meta1" }),
  new Document(readTestData("time.shelter.txt")),
  new Document(readTestData("great.depression.txt"), { meta2: "meta2" }),
];

describe.skipIf(!OPENAI_API_KEY)("MariaDBStoreIT", () => {
  let mariaDbContainer: StartedMariaDbContainer;
  let typeormDataSource: DataSource;
  let jsdbcTemplate: JsdbcTemplate;
  let embeddingModel: OpenAiEmbeddingModel;
  let integration: MariaDBStoreIT;

  beforeAll(async () => {
    mariaDbContainer = await new MariaDbContainer("mariadb:11.7-rc")
      .withDatabase(schemaName)
      .withUsername("mariadb")
      .withUserPassword("mariadbpwd")
      .withRootPassword("mariadbpwd")
      .start();

    typeormDataSource = new DataSource({
      type: "mariadb",
      url: mariaDbContainer.getConnectionUri(),
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

    integration = new MariaDBStoreIT(jsdbcTemplate, embeddingModel);
  }, 240_000);

  afterAll(async () => {
    await typeormDataSource?.destroy();
    await mariaDbContainer?.stop();
  }, 60_000);

  it.each([
    ["COSINE", MariaDBDistanceType.COSINE],
    ["EUCLIDEAN", MariaDBDistanceType.EUCLIDEAN],
  ] as const)("add and search with %s", async (_label, distanceType) => {
    await integration.addAndSearch(distanceType);
  });

  it.each([
    ["country in ['BG','NL']", 3],
    ["year in [2020]", 1],
    ["country not in ['BG']", 1],
    ["year not in [2020]", 1],
  ] as const)(
    "search with in filter %s should return %s records",
    async (expression, expectedRecords) => {
      await integration.searchWithInFilter(expression, expectedRecords);
    },
  );

  it.each([
    ["COSINE", MariaDBDistanceType.COSINE],
    ["EUCLIDEAN", MariaDBDistanceType.EUCLIDEAN],
  ] as const)("search with filters using %s", async (_label, distanceType) => {
    await integration.searchWithFilters(distanceType);
  });

  it.each([
    ["COSINE", MariaDBDistanceType.COSINE],
    ["EUCLIDEAN", MariaDBDistanceType.EUCLIDEAN],
  ] as const)("document update with %s", async (_label, distanceType) => {
    await integration.documentUpdate(distanceType);
  });

  it.each([
    ["COSINE", MariaDBDistanceType.COSINE],
    ["EUCLIDEAN", MariaDBDistanceType.EUCLIDEAN],
  ] as const)(
    "search with threshold using %s",
    async (_label, distanceType) => {
      await integration.searchWithThreshold(distanceType);
    },
  );

  it("delete with complex filter expression", async () => {
    await integration.deleteWithComplexFilterExpression();
  });

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

class MariaDBStoreIT extends BaseVectorStoreTests {
  constructor(
    private readonly _jsdbcTemplate: JsdbcTemplate,
    private readonly _embeddingModel: OpenAiEmbeddingModel,
  ) {
    super();
  }

  protected override async executeTest(
    testFunction: (vectorStore: VectorStore) => Promise<void> | void,
  ): Promise<void> {
    await this.runWithVectorStore(
      { distanceType: MariaDBDistanceType.COSINE },
      testFunction,
    );
  }

  async addAndSearch(distanceType: MariaDBDistanceType): Promise<void> {
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

  async searchWithInFilter(
    expression: string,
    expectedRecords: number,
  ): Promise<void> {
    await this.runWithVectorStore(
      { distanceType: MariaDBDistanceType.COSINE },
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

        const searchRequest = SearchRequest.builder()
          .query("The World")
          .filterExpression(expression)
          .topK(5)
          .similarityThresholdAll()
          .build();

        const results = await vectorStore.similaritySearch(searchRequest);
        expect(results).toHaveLength(expectedRecords);
      },
    );
  }

  async searchWithFilters(distanceType: MariaDBDistanceType): Promise<void> {
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
      expect(results[0]?.id).toBe(nlDocument.id);

      results = await vectorStore.similaritySearch(
        SearchRequest.from(searchRequest)
          .filterExpression("country == 'BG'")
          .build(),
      );
      expect(results).toHaveLength(2);
      expect([bgDocument.id, bgDocument2.id]).toContain(results[0]?.id);
      expect([bgDocument.id, bgDocument2.id]).toContain(results[1]?.id);

      results = await vectorStore.similaritySearch(
        SearchRequest.from(searchRequest)
          .filterExpression("country == 'BG' && year == 2020")
          .build(),
      );
      expect(results).toHaveLength(1);
      expect(results[0]?.id).toBe(bgDocument.id);

      results = await vectorStore.similaritySearch(
        SearchRequest.from(searchRequest)
          .filterExpression(
            "(country == 'BG' && year == 2020) || (country == 'NL')",
          )
          .build(),
      );
      expect(results).toHaveLength(2);
      expect([bgDocument.id, nlDocument.id]).toContain(results[0]?.id);
      expect([bgDocument.id, nlDocument.id]).toContain(results[1]?.id);

      results = await vectorStore.similaritySearch(
        SearchRequest.from(searchRequest)
          .filterExpression(
            "NOT((country == 'BG' && year == 2020) || (country == 'NL'))",
          )
          .build(),
      );
      expect(results).toHaveLength(1);
      expect(results[0]?.id).toBe(bgDocument2.id);

      results = await vectorStore.similaritySearch(
        SearchRequest.builder()
          .query("The World")
          .topK(5)
          .similarityThresholdAll()
          .filterExpression("\"foo bar 1\" == 'bar.foo'")
          .build(),
      );
      expect(results).toHaveLength(1);
      expect(results[0]?.id).toBe(bgDocument.id);

      expect(() =>
        SearchRequest.from(searchRequest).filterExpression("country == NL"),
      ).toThrowError(FilterExpressionParseException);
      expect(() =>
        SearchRequest.from(searchRequest).filterExpression("country == NL"),
      ).toThrowError(/no viable alternative at input 'NL'/);
    });
  }

  async documentUpdate(distanceType: MariaDBDistanceType): Promise<void> {
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

  async searchWithThreshold(distanceType: MariaDBDistanceType): Promise<void> {
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
      const similarityThreshold = (scores[0]! + scores[1]!) / 2;

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
    });
  }

  async deleteWithComplexFilterExpression(): Promise<void> {
    await this.runWithVectorStore(
      { distanceType: MariaDBDistanceType.COSINE },
      async (vectorStore) => {
        const doc1 = new Document("Content 1", { type: "A", priority: 1 });
        const doc2 = new Document("Content 2", { type: "A", priority: 2 });
        const doc3 = new Document("Content 3", { type: "B", priority: 1 });

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
        expect(results.map((document) => document.metadata.priority)).toEqual(
          expect.arrayContaining([1, 1]),
        );
      },
    );
  }

  async getNativeClientTest(): Promise<void> {
    await this.runWithVectorStore(
      { distanceType: MariaDBDistanceType.COSINE },
      async (vectorStore) => {
        const nativeClient = vectorStore.getNativeClient<JsdbcTemplate>();
        expect(nativeClient).toBeDefined();
      },
    );
  }

  private async runWithVectorStore(
    properties: Partial<MariaDBVectorStoreProperties>,
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
    properties: Partial<MariaDBVectorStoreProperties>,
  ): Promise<MariaDBVectorStore> {
    const builder = MariaDBVectorStore.builder(
      this._jsdbcTemplate,
      this._embeddingModel,
    )
      .distanceType(MariaDBDistanceType.COSINE)
      .removeExistingVectorStoreTable(true)
      .initializeSchema(true);

    if (properties.distanceType != null) {
      builder.distanceType(properties.distanceType);
    }
    if (properties.schemaName != null) {
      builder.schemaName(properties.schemaName);
    }
    if (properties.tableName != null) {
      builder.vectorTableName(properties.tableName);
    }
    if (properties.schemaValidation != null) {
      builder.schemaValidation(properties.schemaValidation);
    }
    if (properties.dimensions != null) {
      builder.dimensions(properties.dimensions);
    }
    if (properties.removeExistingVectorStoreTable != null) {
      builder.removeExistingVectorStoreTable(
        properties.removeExistingVectorStoreTable,
      );
    }
    if (properties.contentFieldName != null) {
      builder.contentFieldName(properties.contentFieldName);
    }
    if (properties.embeddingFieldName != null) {
      builder.embeddingFieldName(properties.embeddingFieldName);
    }
    if (properties.idFieldName != null) {
      builder.idFieldName(properties.idFieldName);
    }
    if (properties.metadataFieldName != null) {
      builder.metadataFieldName(properties.metadataFieldName);
    }
    if (properties.maxDocumentBatchSize != null) {
      builder.maxDocumentBatchSize(properties.maxDocumentBatchSize);
    }

    const vectorStore = builder.build();
    await vectorStore.onModuleInit();
    return vectorStore;
  }

  private async dropTable(): Promise<void> {
    await this._jsdbcTemplate.update(sql`DROP TABLE IF EXISTS vector_store`);
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

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

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
import { Client } from "@elastic/elasticsearch";
import { Document, DocumentMetadata } from "@nestjs-ai/commons";
import {
  OpenAiEmbeddingModel,
  OpenAiEmbeddingOptions,
} from "@nestjs-ai/model-openai";
import {
  FilterExpressionBuilder,
  SearchRequest,
  type VectorStore,
} from "@nestjs-ai/vector-store";
import {
  ElasticsearchVectorStore,
  SimilarityFunction,
} from "@nestjs-ai/vector-store-elasticsearch";
import {
  ElasticsearchContainer,
  type StartedElasticsearchContainer,
} from "@testcontainers/elasticsearch";
import { afterAll, beforeAll, describe, it } from "vitest";

import { BaseVectorStoreTests } from "../base-vector-store-tests.it-shared.js";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const DEFAULT_INDEX_NAME = "spring-ai-document-index";
const CUSTOM_EMBEDDING_FIELD_NAME = "custom_embedding_field";

const VECTOR_STORE_CASES = [
  "cosine",
  "l2_norm",
  "dot_product",
  "custom_embedding_field",
] as const;
const ADD_AND_DELETE_CASES = ["cosine", "custom_embedding_field"] as const;

type VectorStoreCaseName = (typeof VECTOR_STORE_CASES)[number];

const readTestData = (fileName: string): string =>
  readFileSync(new URL(`../resources/${fileName}`, import.meta.url), "utf8");

const createDocuments = (): Document[] => [
  new Document("1", readTestData("spring.ai.txt"), { meta1: "meta1" }),
  new Document("2", readTestData("time.shelter.txt"), {}),
  new Document("3", readTestData("great.depression.txt"), { meta2: "meta2" }),
];

describe.skipIf(!OPENAI_API_KEY)("ElasticsearchVectorStoreIT", () => {
  let elasticsearchContainer: StartedElasticsearchContainer;
  let client: Client;
  let embeddingModel: OpenAiEmbeddingModel;
  let integration: ElasticsearchVectorStoreIT;

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

    integration = new ElasticsearchVectorStoreIT(client, embeddingModel);
  }, 240_000);

  afterAll(async () => {
    await client.close();
    await elasticsearchContainer.stop();
  }, 60_000);

  it.each(ADD_AND_DELETE_CASES)(
    "%s : add and delete documents test",
    async (vectorStoreBeanName) => {
      await integration.addAndDeleteDocumentsTest(vectorStoreBeanName);
    },
  );

  it.each(VECTOR_STORE_CASES)(
    "%s : add and search test",
    async (vectorStoreBeanName) => {
      await integration.addAndSearchTest(vectorStoreBeanName);
    },
  );

  it.each(VECTOR_STORE_CASES)(
    "%s : search with filters",
    async (vectorStoreBeanName) => {
      await integration.searchWithFilters(vectorStoreBeanName);
    },
  );

  it.each(VECTOR_STORE_CASES)(
    "%s : document update test",
    async (vectorStoreBeanName) => {
      await integration.documentUpdateTest(vectorStoreBeanName);
    },
  );

  it.each(VECTOR_STORE_CASES)(
    "%s : search threshold test",
    async (vectorStoreBeanName) => {
      await integration.searchThresholdTest(vectorStoreBeanName);
    },
  );

  it("search with is null filter", async () => {
    await integration.searchWithIsNullFilter();
  });

  it("search with is not null filter", async () => {
    await integration.searchWithIsNotNullFilter();
  });

  it("over default size test", async () => {
    await integration.overDefaultSizeTest();
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

class ElasticsearchVectorStoreIT extends BaseVectorStoreTests {
  constructor(
    private readonly _client: Client,
    private readonly _embeddingModel: OpenAiEmbeddingModel,
  ) {
    super();
  }

  protected override async executeTest(
    testFunction: (vectorStore: VectorStore) => Promise<void> | void,
  ): Promise<void> {
    await this.runWithVectorStore("cosine", async (vectorStore) => {
      await testFunction(vectorStore);
    });
  }

  async addAndDeleteDocumentsTest(
    vectorStoreBeanName: "cosine" | "custom_embedding_field",
  ): Promise<void> {
    await this.runWithVectorStore(vectorStoreBeanName, async (vectorStore) => {
      const documents = createDocuments();
      const indexName = this.getIndexName(vectorStoreBeanName);

      let stats = await this.getIndexStats(indexName);
      assert.equal(stats?.total?.docs?.count ?? 0, 0);

      await vectorStore.add(documents);
      await this.refreshIndex(indexName);

      stats = await this.getIndexStats(indexName);
      assert.equal(stats?.total?.docs?.count ?? 0, 3);

      await vectorStore.delete(["1", "2", "3"]);
      await this.refreshIndex(indexName);

      stats = await this.getIndexStats(indexName);
      assert.equal(stats?.total?.docs?.count ?? 0, 0);
    });
  }

  async addAndSearchTest(
    vectorStoreBeanName: VectorStoreCaseName,
  ): Promise<void> {
    await this.runWithVectorStore(vectorStoreBeanName, async (vectorStore) => {
      const documents = createDocuments();
      const searchRequest = SearchRequest.builder()
        .query("Great Depression")
        .topK(1)
        .similarityThresholdAll()
        .build();

      await vectorStore.add(documents);

      await this.waitForSearchLength(vectorStore, searchRequest, 1);

      const results = await vectorStore.similaritySearch(searchRequest);

      assert.equal(results.length, 1);
      const resultDoc = results[0];
      assert.equal(resultDoc.id, documents[2]?.id);
      assert.match(
        resultDoc.text,
        /The Great Depression \(1929–1939\) was an economic shock/,
      );
      assert.equal(Object.keys(resultDoc.metadata).length, 2);
      assert.equal(resultDoc.metadata.meta2, "meta2");
      assert.ok(DocumentMetadata.DISTANCE in resultDoc.metadata);

      // Remove all documents from the store
      await vectorStore.delete(
        documents.map((document: Document) => document.id),
      );

      await this.waitForSearchLength(vectorStore, searchRequest, 0);
    });
  }

  async searchWithFilters(
    vectorStoreBeanName: VectorStoreCaseName,
  ): Promise<void> {
    await this.runWithVectorStore(vectorStoreBeanName, async (vectorStore) => {
      const bgDocument = new Document(
        "1",
        "The World is Big and Salvation Lurks Around the Corner",
        { country: "BG", year: 2020, activationDate: new Date(1000) },
      );
      const nlDocument = new Document(
        "2",
        "The World is Big and Salvation Lurks Around the Corner",
        { country: "NL", activationDate: new Date(2000) },
      );
      const bgDocument2 = new Document(
        "3",
        "The World is Big and Salvation Lurks Around the Corner",
        { country: "BG", year: 2023, activationDate: new Date(3000) },
      );

      await vectorStore.add([bgDocument, nlDocument, bgDocument2]);

      const defaultSearchRequest = SearchRequest.builder()
        .query("The World")
        .topK(5)
        .similarityThresholdAll()
        .build();
      await this.waitForSearchLength(vectorStore, defaultSearchRequest, 3);

      let results = await vectorStore.similaritySearch(
        SearchRequest.builder()
          .query("The World")
          .topK(5)
          .similarityThresholdAll()
          .filterExpression("country == 'NL'")
          .build(),
      );
      assert.equal(results.length, 1);
      assert.equal(results[0]?.id, nlDocument.id);

      results = await vectorStore.similaritySearch(
        SearchRequest.builder()
          .query("The World")
          .topK(5)
          .similarityThresholdAll()
          .filterExpression("country == 'BG'")
          .build(),
      );
      assert.equal(results.length, 2);
      assertSameIds(results, [bgDocument.id, bgDocument2.id]);

      results = await vectorStore.similaritySearch(
        SearchRequest.builder()
          .query("The World")
          .topK(5)
          .similarityThresholdAll()
          .filterExpression("country == 'BG' && year == 2020")
          .build(),
      );
      assert.equal(results.length, 1);
      assert.equal(results[0]?.id, bgDocument.id);

      results = await vectorStore.similaritySearch(
        SearchRequest.builder()
          .query("The World")
          .topK(5)
          .similarityThresholdAll()
          .filterExpression("country in ['BG']")
          .build(),
      );
      assert.equal(results.length, 2);
      assertSameIds(results, [bgDocument.id, bgDocument2.id]);

      results = await vectorStore.similaritySearch(
        SearchRequest.builder()
          .query("The World")
          .topK(5)
          .similarityThresholdAll()
          .filterExpression("country in ['BG','NL']")
          .build(),
      );
      assert.equal(results.length, 3);

      results = await vectorStore.similaritySearch(
        SearchRequest.builder()
          .query("The World")
          .topK(5)
          .similarityThresholdAll()
          .filterExpression("country not in ['BG']")
          .build(),
      );
      assert.equal(results.length, 1);
      assert.equal(results[0]?.id, nlDocument.id);

      results = await vectorStore.similaritySearch(
        SearchRequest.builder()
          .query("The World")
          .topK(5)
          .similarityThresholdAll()
          .filterExpression("NOT(country not in ['BG'])")
          .build(),
      );
      assert.equal(results.length, 2);
      assertSameIds(results, [bgDocument.id, bgDocument2.id]);

      results = await vectorStore.similaritySearch(
        SearchRequest.builder()
          .query("The World")
          .topK(5)
          .similarityThresholdAll()
          .filterExpression(
            `activationDate > ${Date.parse("1970-01-01T00:00:02Z")}`,
          )
          .build(),
      );
      assert.equal(results.length, 1);
      assert.equal(results[0]?.id, bgDocument2.id);

      // Remove all documents from the store
      await vectorStore.delete([bgDocument.id, nlDocument.id, bgDocument2.id]);

      await this.waitForSearchLength(
        vectorStore,
        SearchRequest.builder().query("The World").topK(1).build(),
        0,
      );
    });
  }

  async documentUpdateTest(
    vectorStoreBeanName: VectorStoreCaseName,
  ): Promise<void> {
    await this.runWithVectorStore(vectorStoreBeanName, async (vectorStore) => {
      const document = new Document(randomUUID(), "Spring AI rocks!!", {
        meta1: "meta1",
      });
      await vectorStore.add([document]);

      const springSearchRequest = SearchRequest.builder()
        .query("Spring")
        .similarityThresholdAll()
        .topK(5)
        .build();
      await this.waitForSearchLength(vectorStore, springSearchRequest, 1);

      let results = await vectorStore.similaritySearch(springSearchRequest);

      assert.equal(results.length, 1);
      let resultDoc = results[0];
      assert.equal(resultDoc.id, document.id);
      assert.equal(resultDoc.text, "Spring AI rocks!!");
      assert.equal(resultDoc.metadata.meta1, "meta1");
      assert.ok(DocumentMetadata.DISTANCE in resultDoc.metadata);

      const sameIdDocument = new Document(
        document.id,
        "The World is Big and Salvation Lurks Around the Corner",
        { meta2: "meta2" },
      );

      await vectorStore.add([sameIdDocument]);
      const fooBarSearchRequest = SearchRequest.builder()
        .query("FooBar")
        .topK(5)
        .similarityThresholdAll()
        .build();

      await this.pollUntil(async () => {
        const updatedResults =
          await vectorStore.similaritySearch(fooBarSearchRequest);
        assert.equal(
          updatedResults[0]?.text,
          "The World is Big and Salvation Lurks Around the Corner",
        );
      });

      results = await vectorStore.similaritySearch(fooBarSearchRequest);

      assert.equal(results.length, 1);
      resultDoc = results[0];
      assert.equal(resultDoc.id, document.id);
      assert.equal(
        resultDoc.text,
        "The World is Big and Salvation Lurks Around the Corner",
      );
      assert.equal(resultDoc.metadata.meta2, "meta2");
      assert.ok(DocumentMetadata.DISTANCE in resultDoc.metadata);

      // Remove all documents from the store
      await vectorStore.delete([document.id]);

      await this.waitForSearchLength(vectorStore, fooBarSearchRequest, 0);
    });
  }

  async searchThresholdTest(
    vectorStoreBeanName: VectorStoreCaseName,
  ): Promise<void> {
    await this.runWithVectorStore(vectorStoreBeanName, async (vectorStore) => {
      const documents = createDocuments();
      await vectorStore.add(documents);

      const query = SearchRequest.builder()
        .query("Great Depression")
        .topK(50)
        .similarityThresholdAll()
        .build();

      await this.waitForSearchLength(vectorStore, query, 3);

      const fullResult = await vectorStore.similaritySearch(query);
      const scores = fullResult.map(
        (document: Document) => document.score ?? 0,
      );

      assert.equal(scores.length, 3);

      const similarityThreshold = (scores[0]! + scores[1]!) / 2;

      const results = await vectorStore.similaritySearch(
        SearchRequest.builder()
          .query("Great Depression")
          .topK(50)
          .similarityThreshold(similarityThreshold)
          .build(),
      );

      assert.equal(results.length, 1);
      const resultDoc = results[0];
      assert.equal(resultDoc.id, documents[2]?.id);
      assert.match(
        resultDoc.text,
        /The Great Depression \(1929–1939\) was an economic shock/,
      );
      assert.equal(resultDoc.metadata.meta2, "meta2");
      assert.ok(DocumentMetadata.DISTANCE in resultDoc.metadata);
      assert.ok((resultDoc.score ?? 0) >= similarityThreshold);

      // Remove all documents from the store
      await vectorStore.delete(
        documents.map((document: Document) => document.id),
      );

      await this.waitForSearchLength(vectorStore, query, 0);
    });
  }

  async searchWithIsNullFilter(): Promise<void> {
    await this.runWithVectorStore("cosine", async (vectorStore) => {
      const bgDocument = new Document(
        "1",
        "The World is Big and Salvation Lurks Around the Corner",
        { country: "BG", year: 2020, activationDate: new Date(1000) },
      );
      const nlDocument = new Document(
        "2",
        "The World is Big and Salvation Lurks Around the Corner",
        { country: "NL" },
      );
      const bgDocument2 = new Document(
        "3",
        "The World is Big and Salvation Lurks Around the Corner",
        { country: "BG", year: 2023, activationDate: new Date(3000) },
      );

      await vectorStore.add([bgDocument, nlDocument, bgDocument2]);

      await this.waitForSearchLength(
        vectorStore,
        SearchRequest.builder()
          .query("The World")
          .topK(5)
          .similarityThresholdAll()
          .build(),
        3,
      );

      // with text filter expression
      const resultWithText = await vectorStore.similaritySearch(
        SearchRequest.builder()
          .query("The World")
          .topK(5)
          .similarityThresholdAll()
          .filterExpression("year IS NULL")
          .build(),
      );

      assert.equal(resultWithText.length, 1);
      assert.equal(resultWithText[0]?.id, nlDocument.id);

      // with filter expression builder
      const resultsWithBuilder = await vectorStore.similaritySearch(
        SearchRequest.builder()
          .query("The World")
          .topK(5)
          .similarityThresholdAll()
          .filterExpression(
            new FilterExpressionBuilder().isNull("year").build(),
          )
          .build(),
      );

      assert.equal(resultsWithBuilder.length, 1);
      assert.equal(resultsWithBuilder[0]?.id, nlDocument.id);
    });
  }

  async searchWithIsNotNullFilter(): Promise<void> {
    await this.runWithVectorStore("cosine", async (vectorStore) => {
      const bgDocument = new Document(
        "1",
        "The World is Big and Salvation Lurks Around the Corner",
        { country: "BG", year: 2020, activationDate: new Date(1000) },
      );
      const nlDocument = new Document(
        "2",
        "The World is Big and Salvation Lurks Around the Corner",
        { country: "NL" },
      );
      const bgDocument2 = new Document(
        "3",
        "The World is Big and Salvation Lurks Around the Corner",
        { country: "BG", year: 2023, activationDate: new Date(3000) },
      );

      await vectorStore.add([bgDocument, nlDocument, bgDocument2]);

      await this.waitForSearchLength(
        vectorStore,
        SearchRequest.builder()
          .query("The World")
          .topK(5)
          .similarityThresholdAll()
          .build(),
        3,
      );

      const expectedResultSet = new Set([bgDocument.id, bgDocument2.id]);

      // with text filter expression
      const resultWithText = await vectorStore.similaritySearch(
        SearchRequest.builder()
          .query("The World")
          .topK(5)
          .similarityThresholdAll()
          .filterExpression("year IS NOT NULL")
          .build(),
      );

      assert.equal(resultWithText.length, 2);
      assert.ok(expectedResultSet.has(resultWithText[0]?.id ?? ""));
      assert.ok(expectedResultSet.has(resultWithText[1]?.id ?? ""));

      // with filter expression builder
      const resultsWithBuilder = await vectorStore.similaritySearch(
        SearchRequest.builder()
          .query("The World")
          .topK(5)
          .similarityThresholdAll()
          .filterExpression(
            new FilterExpressionBuilder().isNotNull("year").build(),
          )
          .build(),
      );

      assert.equal(resultsWithBuilder.length, 2);
      assert.ok(expectedResultSet.has(resultsWithBuilder[0]?.id ?? ""));
      assert.ok(expectedResultSet.has(resultsWithBuilder[1]?.id ?? ""));
    });
  }

  async overDefaultSizeTest(): Promise<void> {
    const overDefaultSize = 12;

    await this.runWithVectorStore("cosine", async (vectorStore) => {
      const testDocs = Array.from({ length: overDefaultSize }, (_, index) => {
        return new Document(String(index), `Great Depression ${index}`, {});
      });

      await vectorStore.add(testDocs);

      await this.waitForSearchLength(
        vectorStore,
        SearchRequest.builder()
          .query("Great Depression")
          .topK(1)
          .similarityThresholdAll()
          .build(),
        1,
      );

      const results = await vectorStore.similaritySearch(
        SearchRequest.builder()
          .query("Great Depression")
          .topK(overDefaultSize)
          .similarityThresholdAll()
          .build(),
      );

      assert.equal(results.length, overDefaultSize);

      // Remove all documents from the store
      await vectorStore.delete(
        testDocs.map((document: Document) => document.id),
      );

      await this.waitForSearchLength(
        vectorStore,
        SearchRequest.builder()
          .query("Great Depression")
          .topK(1)
          .similarityThresholdAll()
          .build(),
        0,
      );
    });
  }

  async getNativeClientTest(): Promise<void> {
    await this.runWithVectorStore("cosine", async (vectorStore) => {
      const indexName = this.getIndexName("cosine");

      // Test successful native client retrieval
      const nativeClient = vectorStore.getNativeClient<Client>();
      assert.notEqual(nativeClient, null);

      // Verify client functionality
      const stats = await nativeClient!.indices.stats({ index: indexName });
      assert.notEqual(
        (
          stats as {
            indices?: Record<string, unknown>;
          }
        ).indices?.[indexName],
        undefined,
      );
    });
  }

  private async runWithVectorStore(
    vectorStoreBeanName: VectorStoreCaseName,
    testFunction: (
      vectorStore: ElasticsearchVectorStore,
    ) => Promise<void> | void,
  ): Promise<void> {
    const indexName = this.getIndexName(vectorStoreBeanName);
    const vectorStore = this.createVectorStore(vectorStoreBeanName);

    await vectorStore.onModuleInit();

    try {
      await testFunction(vectorStore);
    } finally {
      await this.deleteIndexIfExists(indexName);
    }
  }

  private createVectorStore(
    vectorStoreBeanName: VectorStoreCaseName,
  ): ElasticsearchVectorStore {
    const indexName = this.getIndexName(vectorStoreBeanName);
    const builder = ElasticsearchVectorStore.builder(
      this._client,
      this._embeddingModel,
    ).initializeSchema(true);

    switch (vectorStoreBeanName) {
      case "cosine":
        builder.options({ indexName });
        break;
      case "l2_norm":
        builder.options({
          indexName,
          similarity: SimilarityFunction.L2_NORM,
        });
        break;
      case "dot_product":
        builder.options({
          indexName,
          similarity: SimilarityFunction.DOT_PRODUCT,
        });
        break;
      case "custom_embedding_field":
        builder.options({
          indexName,
          embeddingFieldName: CUSTOM_EMBEDDING_FIELD_NAME,
        });
        break;
    }

    return builder.build();
  }

  private getIndexName(vectorStoreBeanName: VectorStoreCaseName): string {
    switch (vectorStoreBeanName) {
      case "cosine":
        return DEFAULT_INDEX_NAME;
      case "l2_norm":
        return "index_l2";
      case "dot_product":
        return "index_dot_product";
      case "custom_embedding_field":
        return `${DEFAULT_INDEX_NAME}-${CUSTOM_EMBEDDING_FIELD_NAME}`;
    }
  }

  private async waitForSearchLength(
    vectorStore: ElasticsearchVectorStore,
    searchRequest: SearchRequest,
    expectedLength: number,
  ): Promise<void> {
    await this.pollUntil(async () => {
      const results = await vectorStore.similaritySearch(searchRequest);
      assert.equal(results.length, expectedLength);
    });
  }

  private async pollUntil(
    assertFunction: () => void | Promise<void>,
    timeoutMs = 60_000,
    pollIntervalMs = 1_000,
  ): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    let lastError: unknown;

    while (Date.now() <= deadline) {
      try {
        await assertFunction();
        return;
      } catch (error) {
        lastError = error;
      }

      await delay(pollIntervalMs);
    }

    throw lastError instanceof Error
      ? lastError
      : new Error("Condition was not met within the allotted time");
  }

  private async refreshIndex(indexName: string): Promise<void> {
    await this._client.indices.refresh({ index: indexName });
  }

  private async deleteIndexIfExists(indexName: string): Promise<void> {
    const exists = await this._client.indices.exists({ index: indexName });
    if (exists) {
      await this._client.indices.delete({ index: indexName });
    }
  }

  private async getIndexStats(indexName: string): Promise<{
    total?: {
      docs?: {
        count?: number;
      };
    };
  } | null> {
    const stats = await this._client.indices.stats({ index: indexName });
    return (
      (
        stats as {
          indices?: Record<
            string,
            {
              total?: {
                docs?: {
                  count?: number;
                };
              };
            }
          >;
        }
      ).indices?.[indexName] ?? null
    );
  }
}

function assertSameIds(documents: Document[], expectedIds: string[]): void {
  assert.deepEqual(
    documents.map((document) => document.id).sort(),
    [...expectedIds].sort(),
  );
}

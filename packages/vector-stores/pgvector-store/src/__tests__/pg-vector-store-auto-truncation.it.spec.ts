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

import { DataSource } from "typeorm";
import { Document } from "@nestjs-ai/commons";
import {
  Embedding,
  EmbeddingModel,
  EmbeddingResponse,
  type EmbeddingRequest,
  TokenCountBatchingStrategy,
} from "@nestjs-ai/model";
import { SearchRequest } from "@nestjs-ai/vector-store";
import {
  PgDistanceType,
  PgIdType,
  PgIndexType,
  PgVectorStore,
} from "../pg-vector-store.js";
import { JsdbcTemplate, sql } from "@nestjs-port/jsdbc";
import { TypeOrmDataSource } from "@nestjs-port/jsdbc/typeorm";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

class MockKeywordEmbeddingModel extends EmbeddingModel {
  override async call(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    return new EmbeddingResponse(
      request.instructions.map(
        (instruction, index) =>
          new Embedding(this.embedText(instruction), index),
      ),
    );
  }

  protected override async embedDocument(
    document: Document,
  ): Promise<number[]> {
    return this.embedText(document.text ?? "");
  }

  private embedText(text: string): number[] {
    const normalized = text.toLowerCase();

    if (normalized.includes("test document")) {
      return [1];
    }

    if (normalized.includes("large content")) {
      return [0.9];
    }

    return [0];
  }
}

describe("PgVectorStoreAutoTruncationIT", () => {
  const ARTIFICIAL_TOKEN_LIMIT = 132_900;

  let postgresContainer: StartedPostgreSqlContainer;
  let typeormDataSource: DataSource;
  let jsdbcTemplate: JsdbcTemplate;
  let embeddingModel: MockKeywordEmbeddingModel;

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
    embeddingModel = new MockKeywordEmbeddingModel();
  }, 240_000);

  afterAll(async () => {
    await typeormDataSource?.destroy();
    await postgresContainer?.stop();
  }, 60_000);

  async function createVectorStore(): Promise<PgVectorStore> {
    const vectorStore = PgVectorStore.builder(jsdbcTemplate, embeddingModel)
      .dimensions(PgVectorStore.INVALID_EMBEDDING_DIMENSION)
      .batchingStrategy(
        new TokenCountBatchingStrategy(
          "cl100k_base",
          ARTIFICIAL_TOKEN_LIMIT,
          0.1,
        ),
      )
      .idType(PgIdType.UUID)
      .distanceType(PgDistanceType.COSINE_DISTANCE)
      .initializeSchema(true)
      .indexType(PgIndexType.HNSW)
      .removeExistingVectorStoreTable(true)
      .build();

    await vectorStore.onModuleInit();
    return vectorStore;
  }

  async function dropTable(): Promise<void> {
    await jsdbcTemplate.update(sql`DROP TABLE IF EXISTS vector_store`);
  }

  it("test auto truncation with large document", async () => {
    const vectorStore = await createVectorStore();

    // Test with a document that exceeds normal token limits but is within our
    // artificially high limit
    const largeContent = "This is a test document. ".repeat(5000); // ~25,000
    // tokens
    const largeDocument = new Document(largeContent);
    largeDocument.metadata.test = "auto-truncation";

    // This should not throw an exception due to our high token limit in
    // BatchingStrategy
    await expect(vectorStore.add([largeDocument])).resolves.toBeUndefined();

    // Verify the document was stored
    const results = await vectorStore.similaritySearch(
      SearchRequest.builder().query("test document").topK(1).build(),
    );

    expect(results).toHaveLength(1);
    const resultDoc = results[0];
    expect(resultDoc.metadata).toMatchObject({ test: "auto-truncation" });

    // Test with multiple large documents to ensure batching still works
    const largeDocs: Document[] = [];
    for (let i = 0; i < 5; i += 1) {
      const doc = new Document(`Large content ${i} ${" ".repeat(4000)}`);
      doc.metadata.batch = String(i);
      largeDocs.push(doc);
    }

    await expect(vectorStore.add(largeDocs)).resolves.toBeUndefined();

    // Verify all documents were processed
    const batchResults = await vectorStore.similaritySearch(
      SearchRequest.builder().query("Large content").topK(5).build(),
    );

    expect(batchResults.length).toBeGreaterThanOrEqual(5);

    // Clean up
    await vectorStore.delete([largeDocument.id]);
    await Promise.all(largeDocs.map((doc) => vectorStore.delete([doc.id])));

    await dropTable();
  });

  it("test exceeding artificial limit", async () => {
    const batchingStrategy = new TokenCountBatchingStrategy(
      "cl100k_base",
      ARTIFICIAL_TOKEN_LIMIT,
      0.1,
    );

    // Create a document that exceeds even our artificially high limit
    const massiveContent = "word ".repeat(150000); // ~150,000 tokens (exceeds
    // 132,900)
    const massiveDocument = new Document(massiveContent);

    // This should throw an exception as it exceeds our configured limit
    expect(() => batchingStrategy.batch([massiveDocument])).toThrow(
      "Tokens in a single document exceeds the maximum number of allowed input tokens",
    );

    await dropTable();
  });
});

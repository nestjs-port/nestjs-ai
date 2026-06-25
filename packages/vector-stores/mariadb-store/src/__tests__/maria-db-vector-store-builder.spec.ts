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

import type { EmbeddingModel } from "@nestjs-ai/model";
import type { JsdbcTemplate } from "@nestjs-port/jsdbc";
import { describe, expect, it } from "vitest";

import {
  MariaDBDistanceType,
  MariaDBVectorStore,
} from "../maria-db-vector-store.js";

describe("MariaDBVectorStoreBuilderTests", () => {
  const jdbcTemplate = {} as JsdbcTemplate;
  const embeddingModel = {} as EmbeddingModel;

  it("should fail on missing embedding model", () => {
    expect(() =>
      MariaDBVectorStore.builder(
        jdbcTemplate,
        null as unknown as EmbeddingModel,
      ).build(),
    ).toThrow(/EmbeddingModel must be configured/);
  });

  it("should fail on missing jdbc template", () => {
    expect(() =>
      MariaDBVectorStore.builder(
        null as unknown as JsdbcTemplate,
        embeddingModel,
      ).build(),
    ).toThrow(/JdbcTemplate must not be null/);
  });

  it("should use default values", () => {
    const vectorStore = MariaDBVectorStore.builder(
      jdbcTemplate,
      embeddingModel,
    ).build() as unknown as {
      _vectorTableName: string;
      _schemaName: string | null;
      _schemaValidation: boolean;
      _dimensions: number;
      _distanceType: MariaDBDistanceType;
      _removeExistingVectorStoreTable: boolean;
      _initializeSchema: boolean;
      _maxDocumentBatchSize: number;
      _contentFieldName: string;
      _embeddingFieldName: string;
      _idFieldName: string;
      _metadataFieldName: string;
    };

    expect(vectorStore._vectorTableName).toBe("vector_store");
    expect(vectorStore._schemaName).toBeNull();
    expect(vectorStore._schemaValidation).toBe(false);
    expect(vectorStore._dimensions).toBe(-1);
    expect(vectorStore._distanceType).toBe(MariaDBDistanceType.COSINE);
    expect(vectorStore._removeExistingVectorStoreTable).toBe(false);
    expect(vectorStore._initializeSchema).toBe(false);
    expect(vectorStore._maxDocumentBatchSize).toBe(10000);
    expect(vectorStore._contentFieldName).toBe("content");
    expect(vectorStore._embeddingFieldName).toBe("embedding");
    expect(vectorStore._idFieldName).toBe("id");
    expect(vectorStore._metadataFieldName).toBe("metadata");
  });

  it("should configure custom values", () => {
    const vectorStore = MariaDBVectorStore.builder(jdbcTemplate, embeddingModel)
      .schemaName("custom_schema")
      .vectorTableName("custom_vectors")
      .schemaValidation(true)
      .dimensions(512)
      .distanceType(MariaDBDistanceType.EUCLIDEAN)
      .removeExistingVectorStoreTable(true)
      .initializeSchema(true)
      .maxDocumentBatchSize(5000)
      .contentFieldName("text")
      .embeddingFieldName("vector")
      .idFieldName("doc_id")
      .metadataFieldName("meta")
      .build() as unknown as {
      _vectorTableName: string;
      _schemaName: string | null;
      _schemaValidation: boolean;
      _dimensions: number;
      _distanceType: MariaDBDistanceType;
      _removeExistingVectorStoreTable: boolean;
      _initializeSchema: boolean;
      _maxDocumentBatchSize: number;
      _contentFieldName: string;
      _embeddingFieldName: string;
      _idFieldName: string;
      _metadataFieldName: string;
    };

    expect(vectorStore._vectorTableName).toBe("custom_vectors");
    expect(vectorStore._schemaName).toBe("custom_schema");
    expect(vectorStore._schemaValidation).toBe(true);
    expect(vectorStore._dimensions).toBe(512);
    expect(vectorStore._distanceType).toBe(MariaDBDistanceType.EUCLIDEAN);
    expect(vectorStore._removeExistingVectorStoreTable).toBe(true);
    expect(vectorStore._initializeSchema).toBe(true);
    expect(vectorStore._maxDocumentBatchSize).toBe(5000);
    expect(vectorStore._contentFieldName).toBe("text");
    expect(vectorStore._embeddingFieldName).toBe("vector");
    expect(vectorStore._idFieldName).toBe("doc_id");
    expect(vectorStore._metadataFieldName).toBe("meta");
  });

  it("should validate field names", () => {
    expect(() =>
      MariaDBVectorStore.builder(jdbcTemplate, embeddingModel)
        .contentFieldName("")
        .build(),
    ).toThrow(/ContentFieldName must not be empty/);

    expect(() =>
      MariaDBVectorStore.builder(jdbcTemplate, embeddingModel)
        .embeddingFieldName("")
        .build(),
    ).toThrow(/EmbeddingFieldName must not be empty/);

    expect(() =>
      MariaDBVectorStore.builder(jdbcTemplate, embeddingModel)
        .idFieldName("")
        .build(),
    ).toThrow(/IdFieldName must not be empty/);

    expect(() =>
      MariaDBVectorStore.builder(jdbcTemplate, embeddingModel)
        .metadataFieldName("")
        .build(),
    ).toThrow(/MetadataFieldName must not be empty/);
  });

  it("should validate max document batch size", () => {
    expect(() =>
      MariaDBVectorStore.builder(jdbcTemplate, embeddingModel)
        .maxDocumentBatchSize(0)
        .build(),
    ).toThrow(/MaxDocumentBatchSize must be positive/);

    expect(() =>
      MariaDBVectorStore.builder(jdbcTemplate, embeddingModel)
        .maxDocumentBatchSize(-1)
        .build(),
    ).toThrow(/MaxDocumentBatchSize must be positive/);
  });

  it("should validate distance type", () => {
    expect(() =>
      MariaDBVectorStore.builder(jdbcTemplate, embeddingModel)
        .distanceType(null as never)
        .build(),
    ).toThrow(/DistanceType must not be null/);
  });

  it("should validate batching strategy", () => {
    expect(() =>
      MariaDBVectorStore.builder(jdbcTemplate, embeddingModel)
        .batchingStrategy(null as never)
        .build(),
    ).toThrow(/BatchingStrategy must not be null/);
  });
});

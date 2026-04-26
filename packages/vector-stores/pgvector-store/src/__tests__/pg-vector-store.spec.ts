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

import { Document } from "@nestjs-ai/commons";
import type { EmbeddingModel } from "@nestjs-ai/model";
import type { JsdbcTemplate } from "@nestjs-port/jsdbc";
import { expect, it, describe, vi } from "vitest";

import { PgVectorSchemaValidator } from "../pg-vector-schema-validator.js";
import { PgVectorStore } from "../pg-vector-store.js";

describe("PgVectorStoreTests", () => {
  it.each([
    // Standard valid cases
    ["customvectorstore", true],
    ["user_data", true],
    ["test123", true],
    ["valid_table_name", true],
    // Edge cases
    ["", false], // Empty string
    ["   ", false], // Spaces only
    ["custom vector store", false], // Spaces in name
    ["customvectorstore;", false], // Semicolon appended
    ["customvectorstore--", false], // SQL comment appended
    ["drop table users;", false], // SQL command as a name
    ["customvectorstore;drop table users;", false], // Valid name followed by
    // command
    ["customvectorstore#", false], // Hash character included
    ["customvectorstore$", false], // Dollar sign included
    ["1", false], // Numeric only
    ["customvectorstore or 1=1", false], // SQL Injection attempt
    ["customvectorstore;--", false], // Ending with comment
    ["custom_vector_store; DROP TABLE users;", false], // Injection with valid part
    ["customvectorstore\u0000", false], // Null byte included
    ["customvectorstore\n", false], // Newline character
    [
      "12345678901234567890123456789012345678901234567890123456789012345",
      false,
    ], // More
    // than
    // 64
    // characters
  ])("%s - Verifies valid Table name", (tableName, expected) => {
    expect(
      PgVectorSchemaValidator.isValidNameForDatabaseObject(tableName),
    ).toBe(expected);
  });

  it("should add documents in batches and embed once", async () => {
    // Given
    const documents = Array.from({ length: 9989 }, () => new Document("foo"));

    const batchSizes: number[] = [];
    let updateCount = 0;
    const jdbcTemplate = {
      transaction: vi.fn(async (callback: () => Promise<void>) => {
        const updatesBeforeTransaction = updateCount;
        await callback();
        batchSizes.push(updateCount - updatesBeforeTransaction);
      }),
      update: vi.fn(async () => {
        updateCount += 1;
        return 1;
      }),
    } as unknown as JsdbcTemplate;

    const embeddingModel = {
      embed: vi.fn(async (input: Document[]) =>
        input.map((_, index) => [index]),
      ),
    } as unknown as EmbeddingModel;

    const pgVectorStore = PgVectorStore.builder(jdbcTemplate, embeddingModel)
      .maxDocumentBatchSize(1000)
      .build();

    // When
    await (
      pgVectorStore as unknown as {
        doAdd(documents: Document[]): Promise<void>;
      }
    ).doAdd(documents);

    // Then
    expect(embeddingModel.embed).toHaveBeenCalledTimes(1);
    expect(embeddingModel.embed).toHaveBeenCalledWith(
      documents,
      expect.anything(),
      expect.anything(),
    );
    expect(jdbcTemplate.transaction).toHaveBeenCalledTimes(10);
    expect(jdbcTemplate.update).toHaveBeenCalledTimes(9989);
    expect(batchSizes).toHaveLength(10);
    expect(batchSizes.slice(0, 9)).toEqual(Array(9).fill(1000));
    expect(batchSizes[9]).toBe(989);
  });
});

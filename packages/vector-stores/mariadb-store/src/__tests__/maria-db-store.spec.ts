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
import { describe, expect, it, vi } from "vitest";

import { MariaDBSchemaValidator } from "../maria-db-schema-validator.js";
import { MariaDBVectorStore } from "../maria-db-vector-store.js";

describe("MariaDBStoreTests", () => {
  it.each([
    ["customvectorstore", true, "`customvectorstore`"],
    ["user_data", true, "`user_data`"],
    ["test123", true, "`test123`"],
    ["valid_table_name", true, "`valid_table_name`"],
    ["customvectorstore", false, "customvectorstore"],
    ["user_data", false, "user_data"],
    ["test123", false, "test123"],
    ["valid_table_name", false, "valid_table_name"],
    [
      "1234567890123456789012345678901234567890123456789012345678901234",
      false,
      "`1234567890123456789012345678901234567890123456789012345678901234`",
    ],
  ])(
    "%s - enquote identifier validation",
    (tableName, alwaysQuote, expected) => {
      expect(
        MariaDBSchemaValidator.validateAndEnquoteIdentifier(
          tableName,
          alwaysQuote,
        ),
      ).toBe(expected);
    },
  );

  it.each([
    [
      "12345678901234567890123456789012345678901234567890123456789012345",
      false,
    ],
    ["12345678901234567890123456789012345678901234567890123456789012345", true],
    ["customvectorstore;drop table users;", false],
    ["some\u0000notpossibleValue", true],
  ])("%s - error identifier validation", (tableName, alwaysQuote) => {
    expect(() =>
      MariaDBSchemaValidator.validateAndEnquoteIdentifier(
        tableName,
        alwaysQuote,
      ),
    ).toThrow(/should only contain alphanumeric characters and underscores/);
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

    const mariadbVectorStore = MariaDBVectorStore.builder(
      jdbcTemplate,
      embeddingModel,
    )
      .maxDocumentBatchSize(1000)
      .build();

    // When
    await (
      mariadbVectorStore as unknown as {
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

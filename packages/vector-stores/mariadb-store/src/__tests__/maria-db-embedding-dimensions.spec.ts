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
import { describe, expect, it, vi } from "vitest";

import { MariaDBVectorStore } from "../maria-db-vector-store.js";

describe("MariaDBEmbeddingDimensionsTests", () => {
  it("explicitly set dimensions", async () => {
    const explicitDimensions = 696;
    const embeddingModel = {
      dimensions: vi.fn(),
    } as unknown as EmbeddingModel;

    const mariaDBVectorStore = MariaDBVectorStore.builder(
      {} as JsdbcTemplate,
      embeddingModel,
    )
      .dimensions(explicitDimensions)
      .build();

    const dimension = await mariaDBVectorStore.embeddingDimensions();

    expect(dimension).toBe(explicitDimensions);
    expect(embeddingModel.dimensions).not.toHaveBeenCalled();
  });

  it("use embedding model dimensions", async () => {
    const dimensions = vi.fn(async () => 969);
    const embeddingModel = {
      dimensions,
    } as unknown as EmbeddingModel;

    const mariaDBVectorStore = MariaDBVectorStore.builder(
      {} as JsdbcTemplate,
      embeddingModel,
    ).build();

    const dimension = await mariaDBVectorStore.embeddingDimensions();

    expect(dimension).toBe(969);
    expect(dimensions).toHaveBeenCalledTimes(1);
  });

  it("fall back to default dimensions", async () => {
    const dimensions = vi.fn(async () => {
      throw new Error("boom");
    });
    const embeddingModel = {
      dimensions,
    } as unknown as EmbeddingModel;

    const mariaDBVectorStore = MariaDBVectorStore.builder(
      {} as JsdbcTemplate,
      embeddingModel,
    ).build();

    const dimension = await mariaDBVectorStore.embeddingDimensions();

    expect(dimension).toBe(MariaDBVectorStore.OPENAI_EMBEDDING_DIMENSION_SIZE);
    expect(dimensions).toHaveBeenCalledTimes(1);
  });
});

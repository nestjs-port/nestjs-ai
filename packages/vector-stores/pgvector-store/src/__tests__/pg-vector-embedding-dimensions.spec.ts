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

import { expect, describe, it, vi } from "vitest";

import { PgVectorStore } from "../pg-vector-store.js";

describe("PgVectorEmbeddingDimensionsTests", () => {
  it("explicitly set dimensions", async () => {
    const explicitDimensions = 696;

    const embeddingModel = {
      dimensions: vi.fn(),
    };
    const jdbcTemplate = {};

    const pgVectorStore = PgVectorStore.builder(
      jdbcTemplate as never,
      embeddingModel as never,
    )
      .dimensions(explicitDimensions)
      .build();
    const dim = await pgVectorStore.embeddingDimensions();

    expect(dim).toBe(explicitDimensions);
    expect(embeddingModel.dimensions).not.toHaveBeenCalled();
  });

  it("embedding model dimensions", async () => {
    const expectedDimensions = 969;

    const embeddingModel = {
      dimensions: vi.fn().mockResolvedValue(expectedDimensions),
    };
    const jdbcTemplate = {};

    const pgVectorStore = PgVectorStore.builder(
      jdbcTemplate as never,
      embeddingModel as never,
    ).build();
    const actualDimensions = await pgVectorStore.embeddingDimensions();

    expect(actualDimensions).toBe(expectedDimensions);
    expect(embeddingModel.dimensions).toHaveBeenCalledTimes(1);
  });

  it("fall back to default dimensions", async () => {
    const embeddingModel = {
      dimensions: vi.fn().mockRejectedValue(new Error("Embedding model error")),
    };
    const jdbcTemplate = {};

    const pgVectorStore = PgVectorStore.builder(
      jdbcTemplate as never,
      embeddingModel as never,
    ).build();
    const actualDimensions = await pgVectorStore.embeddingDimensions();

    expect(actualDimensions).toBe(
      PgVectorStore.OPENAI_EMBEDDING_DIMENSION_SIZE,
    );
    expect(embeddingModel.dimensions).toHaveBeenCalledTimes(1);
  });

  it("embedding model returns zero dimensions", async () => {
    const embeddingModel = {
      dimensions: vi.fn().mockResolvedValue(0),
    };
    const jdbcTemplate = {};

    const pgVectorStore = PgVectorStore.builder(
      jdbcTemplate as never,
      embeddingModel as never,
    ).build();
    const actualDimensions = await pgVectorStore.embeddingDimensions();

    expect(actualDimensions).toBe(
      PgVectorStore.OPENAI_EMBEDDING_DIMENSION_SIZE,
    );
    expect(embeddingModel.dimensions).toHaveBeenCalledTimes(1);
  });

  it("embedding model returns negative dimensions", async () => {
    const embeddingModel = {
      dimensions: vi.fn().mockResolvedValue(-5),
    };
    const jdbcTemplate = {};

    const pgVectorStore = PgVectorStore.builder(
      jdbcTemplate as never,
      embeddingModel as never,
    ).build();
    const actualDimensions = await pgVectorStore.embeddingDimensions();

    expect(actualDimensions).toBe(
      PgVectorStore.OPENAI_EMBEDDING_DIMENSION_SIZE,
    );
    expect(embeddingModel.dimensions).toHaveBeenCalledTimes(1);
  });

  it("explicit zero dimensions uses embedding model", async () => {
    const embeddingModelDimensions = 768;
    const embeddingModel = {
      dimensions: vi.fn().mockResolvedValue(embeddingModelDimensions),
    };
    const jdbcTemplate = {};

    const pgVectorStore = PgVectorStore.builder(
      jdbcTemplate as never,
      embeddingModel as never,
    )
      .dimensions(0)
      .build();
    const actualDimensions = await pgVectorStore.embeddingDimensions();

    expect(actualDimensions).toBe(embeddingModelDimensions);
    expect(embeddingModel.dimensions).toHaveBeenCalledTimes(1);
  });

  it("explicit negative dimensions uses embedding model", async () => {
    const embeddingModelDimensions = 512;
    const embeddingModel = {
      dimensions: vi.fn().mockResolvedValue(embeddingModelDimensions),
    };
    const jdbcTemplate = {};

    const pgVectorStore = PgVectorStore.builder(
      jdbcTemplate as never,
      embeddingModel as never,
    )
      .dimensions(-1)
      .build();
    const actualDimensions = await pgVectorStore.embeddingDimensions();

    expect(actualDimensions).toBe(embeddingModelDimensions);
    expect(embeddingModel.dimensions).toHaveBeenCalledTimes(1);
  });
});

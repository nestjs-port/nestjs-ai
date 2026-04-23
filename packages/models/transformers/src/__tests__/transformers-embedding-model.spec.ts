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
import type { EmbeddingResponse } from "@nestjs-ai/model";
import { beforeAll, describe, expect, it } from "vitest";

import { TransformersEmbeddingModel } from "../transformers-embedding-model.js";

const DF = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 5,
});

describe("TransformersEmbeddingModel", () => {
  let embeddingModel: TransformersEmbeddingModel;

  beforeAll(async () => {
    embeddingModel = new TransformersEmbeddingModel();
    await embeddingModel.onModuleInit();
  }, 240_000);

  it("embed", async () => {
    const embed = await embeddingModel.embed("Hello world");

    expect(embed).toHaveLength(384);
    expect(format(embed[0])).toBe(format(-0.19744634628295898));
    expect(format(embed[383])).toBe(format(0.17298996448516846));
  });

  it("embed document", async () => {
    const embed = await embeddingModel.embed(new Document("Hello world"));

    expect(embed).toHaveLength(384);
    expect(format(embed[0])).toBe(format(-0.19744634628295898));
    expect(format(embed[383])).toBe(format(0.17298996448516846));
  });

  it("embed list", async () => {
    const embed = await embeddingModel.embed(["Hello world", "World is big"]);

    expect(embed).toHaveLength(2);
    expect(embed[0]).toHaveLength(384);
    expect(format(embed[0][0])).toBe(format(-0.19744634628295898));
    expect(format(embed[0][383])).toBe(format(0.17298996448516846));

    expect(embed[1]).toHaveLength(384);
    expect(format(embed[1][0])).toBe(format(0.4293745160102844));
    expect(format(embed[1][383])).toBe(format(0.05501303821802139));

    expect(embed[0]).not.toBe(embed[1]);
  });

  it("embed for response", async () => {
    const embed = (await embeddingModel.embedForResponse([
      "Hello world",
      "World is big",
    ])) as EmbeddingResponse;

    expect(embed.results).toHaveLength(2);
    expect(embed.metadata.isEmpty()).toBe(true);

    expect(embed.results[0].output).toHaveLength(384);
    expect(format(embed.results[0].output[0])).toBe(
      format(-0.19744634628295898),
    );
    expect(format(embed.results[0].output[383])).toBe(
      format(0.17298996448516846),
    );

    expect(embed.results[1].output).toHaveLength(384);
    expect(format(embed.results[1].output[0])).toBe(format(0.4293745160102844));
    expect(format(embed.results[1].output[383])).toBe(
      format(0.05501303821802139),
    );
  });

  it("dimensions", async () => {
    expect(await embeddingModel.dimensions()).toBe(384);
    expect(await embeddingModel.dimensions()).toBe(384);
  });
}, 240_000);

function format(value: number): string {
  return DF.format(value);
}

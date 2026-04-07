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

import { Document, MetadataMode } from "@nestjs-ai/commons";
import { describe, expect, it, vi } from "vitest";
import { AbstractEmbeddingModel } from "../abstract-embedding-model";
import { Embedding } from "../embedding";
import type { EmbeddingModel } from "../embedding-model";
import { EmbeddingOptions } from "../embedding-options.interface";
import type { EmbeddingRequest } from "../embedding-request";
import { EmbeddingResponse } from "../embedding-response";
import { TokenCountBatchingStrategy } from "../token-count-batching-strategy";

describe("AbstractEmbeddingModel", () => {
  it("unknown model dimension", async () => {
    const embedMock = vi
      .fn<(text: string) => Promise<number[]>>()
      .mockResolvedValue([0.1, 0.1, 0.1]);
    const embeddingModel = { embed: embedMock } as unknown as EmbeddingModel;

    await expect(
      AbstractEmbeddingModel.dimensions(
        embeddingModel,
        "unknown_model",
        "Hello world!",
      ),
    ).resolves.toBe(3);
    expect(embedMock).toHaveBeenCalledOnce();
    expect(embedMock).toHaveBeenCalledWith("Hello world!");
  });

  it("uses metadata-aware document content when batching", async () => {
    const embeddingModel = new DummyEmbeddingModel(MetadataMode.EMBED);
    const document = new Document("Some content", { title: "Getting Started" });

    await embeddingModel.embed(
      [document],
      EmbeddingOptions.builder().build(),
      new TokenCountBatchingStrategy(),
    );

    expect(embeddingModel.requests).toHaveLength(1);
    expect(embeddingModel.requests[0]).toHaveLength(1);
    expect(embeddingModel.requests[0][0]).toContain("Getting Started");
    expect(embeddingModel.requests[0][0]).toContain("Some content");
  });

  it("uses raw text when batching without metadata mode", async () => {
    const embeddingModel = new DummyEmbeddingModel();
    const document = new Document("Some content", { title: "Getting Started" });

    await embeddingModel.embed(
      [document],
      EmbeddingOptions.builder().build(),
      new TokenCountBatchingStrategy(),
    );

    expect(embeddingModel.requests).toHaveLength(1);
    expect(embeddingModel.requests[0]).toEqual(["Some content"]);
  });
});

class DummyEmbeddingModel extends AbstractEmbeddingModel {
  readonly requests: string[][] = [];

  constructor(private readonly metadataMode: MetadataMode | null = null) {
    super();
  }

  protected override getEmbeddingContent(document: Document): string {
    if (this.metadataMode != null) {
      return document.getFormattedContent(this.metadataMode);
    }
    return document.text ?? "";
  }

  protected override async embedDocument(
    document: Document,
  ): Promise<number[]> {
    return (await this.embed(this.getEmbeddingContent(document))) as number[];
  }

  override async call(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    this.requests.push(request.instructions);
    const embeddings = request.instructions.map(
      (_text: string, index: number) => new Embedding([0.1, 0.2, 0.3], index),
    );
    return new EmbeddingResponse(embeddings);
  }
}

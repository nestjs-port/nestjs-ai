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

import type { Document } from "@nestjs-ai/commons";
import { EmbeddingModel } from "./embedding-model";

/**
 * Abstract implementation of the {@link EmbeddingModel} interface that provides
 * dimensions calculation caching.
 */
export abstract class AbstractEmbeddingModel extends EmbeddingModel {
  private static readonly KNOWN_EMBEDDING_DIMENSIONS = new Map<string, number>([
    ["text-embedding-ada-002", 1536],
    ["text-similarity-ada-001", 1024],
    ["text-similarity-babbage-001", 2048],
    ["text-similarity-curie-001", 4096],
    ["text-similarity-davinci-001", 12288],
    ["text-search-ada-doc-001", 1024],
    ["text-search-ada-query-001", 1024],
    ["text-search-babbage-doc-001", 2048],
    ["text-search-babbage-query-001", 2048],
    ["text-search-curie-doc-001", 4096],
    ["text-search-curie-query-001", 4096],
    ["text-search-davinci-doc-001", 12288],
    ["text-search-davinci-query-001", 12288],
    ["code-search-ada-code-001", 1024],
    ["code-search-ada-text-001", 1024],
    ["code-search-babbage-code-001", 2048],
    ["code-search-babbage-text-001", 2048],
    ["sentence-transformers/all-MiniLM-L6-v2", 384],
    ["text-embedding-004", 768],
    ["text-multilingual-embedding-002", 768],
    ["multimodalembedding@001", 768],
  ]);

  /**
   * Cached embedding dimensions.
   */
  protected _embeddingDimensions = -1;

  protected override getEmbeddingContent(document: Document): string {
    return super.getEmbeddingContent(document);
  }

  /**
   * Return the dimension of the requested embedding model name.
   */
  static async dimensions(
    embeddingModel: EmbeddingModel,
    modelName: string,
    dummyContent: string,
  ): Promise<number> {
    const knownDimension =
      AbstractEmbeddingModel.KNOWN_EMBEDDING_DIMENSIONS.get(modelName);
    if (knownDimension != null) {
      // Retrieve the dimension from a pre-configured file.
      return knownDimension;
    }

    // Determine the dimensions empirically.
    // Generate an embedding and count the dimension size;
    return (await embeddingModel.embed(dummyContent)).length;
  }

  override async dimensions(): Promise<number> {
    if (this._embeddingDimensions < 0) {
      this._embeddingDimensions = await AbstractEmbeddingModel.dimensions(
        this,
        "Test",
        "Hello World",
      );
    }
    return this._embeddingDimensions;
  }
}

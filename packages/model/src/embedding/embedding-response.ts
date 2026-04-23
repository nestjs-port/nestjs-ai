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

import assert from "node:assert/strict";
import type { ModelResponse } from "../model/index.js";
import type { Embedding } from "./embedding.js";
import { EmbeddingResponseMetadata } from "./embedding-response-metadata.js";

/**
 * Embedding response object.
 */
export class EmbeddingResponse implements ModelResponse<Embedding> {
  /**
   * Embedding data.
   */
  private readonly _embeddings: Embedding[];

  /**
   * Embedding metadata.
   */
  private readonly _metadata: EmbeddingResponseMetadata;

  /**
   * Creates a new {@link EmbeddingResponse} instance.
   */
  constructor(
    embeddings: Embedding[],
    metadata: EmbeddingResponseMetadata = new EmbeddingResponseMetadata(),
  ) {
    this._embeddings = embeddings;
    this._metadata = metadata;
  }

  get metadata(): EmbeddingResponseMetadata {
    return this._metadata;
  }

  get result(): Embedding {
    assert(this._embeddings.length > 0, "No embedding data available.");
    return this._embeddings[0];
  }

  get results(): Embedding[] {
    return this._embeddings;
  }
}

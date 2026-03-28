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

import type { ModelResult } from "../model";
import { EmbeddingResultMetadata } from "./embedding-result-metadata";

/**
 * Represents a single embedding vector.
 */
export class Embedding implements ModelResult<number[]> {
  private readonly _embedding: number[];
  private readonly _index: number;
  private readonly _metadata: EmbeddingResultMetadata;

  /**
   * Creates a new {@link Embedding} instance.
   */
  constructor(
    embedding: number[],
    index: number,
    metadata: EmbeddingResultMetadata = EmbeddingResultMetadata.EMPTY,
  ) {
    this._embedding = embedding;
    this._index = index;
    this._metadata = metadata;
  }

  get output(): number[] {
    return this._embedding;
  }

  get index(): number {
    return this._index;
  }

  get metadata(): EmbeddingResultMetadata {
    return this._metadata;
  }
}

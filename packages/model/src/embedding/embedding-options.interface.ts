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

import type { ModelOptions } from "../model";
import { DefaultEmbeddingOptions } from "./default-embedding-options";

/**
 * Options for embedding models.
 */
export interface EmbeddingOptions extends ModelOptions {
  /**
   * Returns the model to use for the embedding.
   */
  model?: string | null;

  /**
   * Returns the number of output dimensions for the embedding.
   */
  dimensions?: number | null;
}

export namespace EmbeddingOptions {
  export function builder(): Builder {
    return DefaultEmbeddingOptions.builder();
  }

  export interface Builder {
    model(model: string | null): Builder;

    dimensions(dimensions: number | null): Builder;

    build(): EmbeddingOptions;
  }
}

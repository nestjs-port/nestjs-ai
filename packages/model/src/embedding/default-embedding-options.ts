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

import { DefaultEmbeddingOptionsBuilder } from "./default-embedding-options-builder.js";
import type { EmbeddingOptions } from "./embedding-options.interface.js";

export type DefaultEmbeddingOptionsProps = Partial<EmbeddingOptions>;

/**
 * Default implementation of {@link EmbeddingOptions}.
 */
export class DefaultEmbeddingOptions implements EmbeddingOptions {
  model?: string | null = null;
  dimensions?: number | null = null;

  constructor(options?: DefaultEmbeddingOptionsProps) {
    if (options) {
      this.model = options.model ?? null;
      this.dimensions = options.dimensions ?? null;
    }
  }

  static builder(): DefaultEmbeddingOptionsBuilder {
    return new DefaultEmbeddingOptionsBuilder();
  }
}

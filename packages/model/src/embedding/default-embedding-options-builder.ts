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

import { DefaultEmbeddingOptions } from "./default-embedding-options.js";
import type { EmbeddingOptions } from "./embedding-options.interface.js";

export class DefaultEmbeddingOptionsBuilder
  implements EmbeddingOptions.Builder
{
  private readonly _options = new DefaultEmbeddingOptions();

  model(model: string | null): this {
    this._options.model = model;
    return this;
  }

  dimensions(dimensions: number | null): this {
    this._options.dimensions = dimensions;
    return this;
  }

  build(): EmbeddingOptions {
    return this._options;
  }
}

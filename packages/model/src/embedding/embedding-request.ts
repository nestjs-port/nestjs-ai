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

import type { ModelRequest } from "../model";
import type { EmbeddingOptions } from "./embedding-options.interface";

/**
 * Request to embed a list of input instructions.
 */
export class EmbeddingRequest implements ModelRequest<string[]> {
  private readonly _inputs: string[];
  private readonly _options: EmbeddingOptions | null;

  constructor(inputs: string[], options: EmbeddingOptions | null = null) {
    this._inputs = inputs;
    this._options = options;
  }

  get instructions(): string[] {
    return this._inputs;
  }

  get options(): EmbeddingOptions | null {
    return this._options;
  }
}

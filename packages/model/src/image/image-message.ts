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

/**
 * Represents a message used for image generation.
 */
export class ImageMessage {
  private readonly _text: string;
  private readonly _weight: number | null;

  constructor(text: string, weight?: number | null) {
    assert(text != null, "text must not be null");
    this._text = text;
    this._weight = weight ?? null;
  }

  get text(): string {
    return this._text;
  }

  get weight(): number | null {
    return this._weight;
  }
}

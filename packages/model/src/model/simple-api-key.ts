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
import type { ApiKey } from "./api-key.interface.js";

/**
 * A simple implementation of {@link ApiKey} that holds an immutable API key value. This
 * implementation is suitable for cases where the API key is static and does not need to
 * be refreshed or rotated.
 */
export class SimpleApiKey implements ApiKey {
  private readonly _value: string;

  /**
   * Create a new SimpleApiKey.
   * @param value - the API key value, must not be null
   * @throws Error if value is null
   */
  constructor(value: string) {
    assert(value != null, "API key value must not be null");
    this._value = value;
  }

  get value(): string {
    return this._value;
  }

  [Symbol.toPrimitive](): string {
    return "SimpleApiKey{value='***'}";
  }
}

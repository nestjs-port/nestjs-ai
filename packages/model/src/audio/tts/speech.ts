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

import type { ModelResult, ResultMetadata } from "../../model/index.js";

/**
 * Implementation of the {@link ModelResult} interface for the speech model.
 */
export class Speech implements ModelResult<Uint8Array> {
  private readonly _speech: Uint8Array;

  constructor(speech: Uint8Array) {
    this._speech = speech;
  }

  get output(): Uint8Array {
    return this._speech;
  }

  get metadata(): ResultMetadata {
    return new (class implements ResultMetadata {})();
  }
}

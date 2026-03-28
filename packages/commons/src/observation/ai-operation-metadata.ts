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

export class AiOperationMetadata {
  private readonly _operationType: string;
  private readonly _provider: string;

  constructor(operationType: string, provider: string) {
    assert(
      operationType != null && operationType.trim().length > 0,
      "operationType cannot be null or empty",
    );
    assert(
      provider != null && provider.trim().length > 0,
      "provider cannot be null or empty",
    );
    this._operationType = operationType;
    this._provider = provider;
  }

  get operationType(): string {
    return this._operationType;
  }

  get provider(): string {
    return this._provider;
  }
}

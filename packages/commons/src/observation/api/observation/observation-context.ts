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

import type { KeyValue } from "../key-value";
import { KeyValues } from "../key-values";

/**
 * Context object that carries information throughout the observation lifecycle.
 * Corresponds to Micrometer's Observation.Context.
 */
export class ObservationContext {
  private _name = "";
  private _contextualName: string | null = null;
  private _error: Error | null = null;

  private readonly _lowCardinality = new Map<string, KeyValue>();
  private readonly _highCardinality = new Map<string, KeyValue>();

  get name(): string {
    return this._name;
  }

  setName(name: string): void {
    this._name = name;
  }

  get contextualName(): string | null {
    return this._contextualName;
  }

  setContextualName(contextualName: string | null): void {
    this._contextualName = contextualName;
  }

  get error(): Error | null {
    return this._error;
  }

  setError(error: Error | null): void {
    this._error = error;
  }

  get lowCardinalityKeyValues(): KeyValues {
    return KeyValues.of(...this._lowCardinality.values());
  }

  get highCardinalityKeyValues(): KeyValues {
    return KeyValues.of(...this._highCardinality.values());
  }

  addLowCardinalityKeyValue(keyValue: KeyValue): this {
    this._lowCardinality.set(keyValue.key, keyValue);
    return this;
  }

  addHighCardinalityKeyValue(keyValue: KeyValue): this {
    this._highCardinality.set(keyValue.key, keyValue);
    return this;
  }

  addLowCardinalityKeyValues(keyValues: KeyValues): this {
    for (const keyValue of keyValues) {
      this.addLowCardinalityKeyValue(keyValue);
    }
    return this;
  }

  addHighCardinalityKeyValues(keyValues: KeyValues): this {
    for (const keyValue of keyValues) {
      this.addHighCardinalityKeyValue(keyValue);
    }
    return this;
  }
}

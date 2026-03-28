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

import { KeyValue } from "./key-value";

/**
 * Collection of {@link KeyValue} entries.
 * Corresponds to Micrometer's KeyValues.
 */
export class KeyValues implements Iterable<KeyValue> {
  private readonly _values: KeyValue[];

  constructor(values: KeyValue[] = []) {
    this._values = [...values];
  }

  static empty(): KeyValues {
    return new KeyValues();
  }

  static of(...keyValues: KeyValue[]): KeyValues {
    return new KeyValues(keyValues);
  }

  and(key: string, value: string): KeyValues;
  and(keyValue: KeyValue): KeyValues;
  and(keyOrKeyValue: string | KeyValue, value?: string): KeyValues {
    if (keyOrKeyValue instanceof KeyValue) {
      return new KeyValues([...this._values, keyOrKeyValue]);
    }

    if (value === undefined) {
      throw new Error("value must be provided when key is a string");
    }

    return new KeyValues([...this._values, KeyValue.of(keyOrKeyValue, value)]);
  }

  toArray(): KeyValue[] {
    return [...this._values];
  }

  get(key: string): string | undefined {
    for (let i = this._values.length - 1; i >= 0; i--) {
      const keyValue = this._values[i];
      if (keyValue.key === key) {
        return keyValue.value;
      }
    }
    return undefined;
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  *keys(): IterableIterator<string> {
    const seen = new Set<string>();
    for (let i = this._values.length - 1; i >= 0; i--) {
      const key = this._values[i].key;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      yield key;
    }
  }

  [Symbol.iterator](): Iterator<KeyValue> {
    return this._values[Symbol.iterator]();
  }
}

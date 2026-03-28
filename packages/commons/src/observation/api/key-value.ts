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

/**
 * Represents a key-value pair for observation attributes.
 * Corresponds to Micrometer's KeyValue.
 */
export class KeyValue {
  static readonly NONE_VALUE = "none";

  private readonly _key: string;
  private readonly _value: string;

  constructor(key: string, value: string) {
    this._key = key;
    this._value = value;
  }

  get key(): string {
    return this._key;
  }

  get value(): string {
    return this._value;
  }

  static of(key: string, value: string): KeyValue {
    return new KeyValue(key, value);
  }
}

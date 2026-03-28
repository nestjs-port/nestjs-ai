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
 * Interface representing metadata associated with an AI model's response.
 */
export interface ResponseMetadata {
  /**
   * Gets an entry from the context. Returns `null` when entry is not present.
   * @typeParam T - value type
   * @param key - key
   * @returns entry or `null` if not present
   */
  get<T>(key: string): T | null;

  /**
   * Gets an entry from the context. Throws exception when entry is not present.
   * @typeParam T - value type
   * @param key - key
   * @returns entry
   * @throws Error if not present
   */
  getRequired<T>(key: string): T;

  /**
   * Checks if context contains a key.
   * @param key - key
   * @returns `true` when the context contains the entry with the given key
   */
  containsKey(key: string): boolean;

  /**
   * Returns an element or default if not present.
   * @typeParam T - value type
   * @param key - key
   * @param defaultValue - default object to return
   * @returns object or default if not present
   */
  getOrDefault<T>(key: string, defaultValue: T): T;

  /**
   * Returns the entries of the metadata.
   * @returns the entries of the metadata
   */
  entries(): Array<[string, unknown]>;

  /**
   * Returns the keys of the metadata.
   * @returns the keys of the metadata
   */
  keys(): string[];

  /**
   * Returns `true` if this map contains no key-value mappings.
   * @returns `true` if this map contains no key-value mappings
   */
  isEmpty(): boolean;
}

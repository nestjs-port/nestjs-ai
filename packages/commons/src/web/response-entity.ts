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
 * A typed wrapper around an HTTP response, analogous to Spring's ResponseEntity.
 *
 * Provides type-safe access to the parsed response body along with
 * HTTP metadata (status code and headers).
 *
 * @typeParam T - The type of the response body.
 */
export interface ResponseEntity<T> {
  /** The parsed response body. */
  body: T;
  /** The HTTP status code. */
  status: number;
  /** The response headers. */
  headers: Headers;
}

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

import type { Milliseconds } from "@nestjs-port/core";

/**
 * Abstract Data Type (ADT) encapsulating metadata from an AI provider's API rate limits
 * granted to the API key in use and the API key's current balance.
 */
export interface RateLimit {
  /**
   * Returns the maximum number of requests that are permitted before exhausting the
   * rate limit.
   *
   * @returns the maximum number of requests that are permitted before exhausting the
   * rate limit
   * @see {@link requestsRemaining}
   */
  get requestsLimit(): number;

  /**
   * Returns the remaining number of requests that are permitted before exhausting the
   * {@link requestsLimit rate limit}.
   *
   * @returns the remaining number of requests that are permitted before exhausting the
   * {@link requestsLimit rate limit}
   * @see {@link requestsLimit}
   */
  get requestsRemaining(): number;

  /**
   * Returns the time (in milliseconds) until the rate limit (based on requests) resets
   * to its {@link requestsLimit initial state}.
   *
   * @returns a number representing the time (in milliseconds) until the rate limit
   * (based on requests) resets to its {@link requestsLimit initial state}
   * @see {@link requestsLimit}
   */
  get requestsReset(): Milliseconds;

  /**
   * Returns the maximum number of tokens that are permitted before exhausting the rate
   * limit.
   *
   * @returns the maximum number of tokens that are permitted before exhausting the rate
   * limit
   * @see {@link tokensRemaining}
   */
  get tokensLimit(): number;

  /**
   * Returns the remaining number of tokens that are permitted before exhausting the
   * {@link tokensLimit rate limit}.
   *
   * @returns the remaining number of tokens that are permitted before exhausting the
   * {@link tokensLimit rate limit}
   * @see {@link tokensLimit}
   */
  get tokensRemaining(): number;

  /**
   * Returns the time (in milliseconds) until the rate limit (based on tokens) resets to
   * its {@link tokensLimit initial state}.
   *
   * @returns a number representing the time (in milliseconds) until the rate limit
   * (based on tokens) resets to its {@link tokensLimit initial state}
   * @see {@link tokensLimit}
   */
  get tokensReset(): Milliseconds;
}

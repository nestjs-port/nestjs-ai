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
 * `Ordered` can be implemented by objects that should be orderable, for example in a collection.
 *
 * The actual {@link order} value can be interpreted as prioritization:
 * the first object (with the lowest order value) has the highest priority.
 *
 * Higher values are interpreted as lower priority. Same order values result in
 * arbitrary sort positions for the affected objects.
 *
 * @see HIGHEST_PRECEDENCE
 * @see LOWEST_PRECEDENCE
 */
export interface Ordered {
  /**
   * Get the order value of this object.
   *
   * Higher values are interpreted as lower priority. As a consequence, the object
   * with the lowest value has the highest priority.
   *
   * @returns the order value
   */
  get order(): number;
}

/**
 * Useful constant for the highest precedence value.
 * Equivalent to Java `Integer.MIN_VALUE`.
 */
export const HIGHEST_PRECEDENCE = -2147483648;

/**
 * Useful constant for the lowest precedence value.
 * Equivalent to Java `Integer.MAX_VALUE`.
 */
export const LOWEST_PRECEDENCE = 2147483647;

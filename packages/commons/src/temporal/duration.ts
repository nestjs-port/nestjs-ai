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
 * Brand symbol for Milliseconds type
 */
declare const MillisecondsBrand: unique symbol;

/**
 * Branded type representing a duration in milliseconds.
 * Provides type safety to distinguish milliseconds from plain numbers.
 */
export type Milliseconds = number & {
  readonly [MillisecondsBrand]: typeof MillisecondsBrand;
};

/**
 * Creates a Milliseconds branded type from a number.
 * @param value - The number of milliseconds
 * @returns The value as a Milliseconds branded type
 */
export function ms(value: number): Milliseconds {
  return value as Milliseconds;
}

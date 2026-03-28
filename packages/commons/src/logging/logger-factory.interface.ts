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

import type { Logger } from "./logger.interface";

/**
 * Factory interface for creating Logger instances.
 *
 * Implementations of this interface are responsible for creating
 * Logger instances bound to specific logging frameworks.
 *
 * @example
 * ```typescript
 * class NestLoggerFactory implements ILoggerFactory {
 *   getLogger(name: string): Logger {
 *     return new NestLoggerAdapter(name);
 *   }
 * }
 * ```
 */
export interface ILoggerFactory {
  /**
   * Return a logger named according to the name parameter.
   *
   * @param name - The name of the logger
   * @returns A Logger instance
   */
  getLogger(name: string): Logger;
}

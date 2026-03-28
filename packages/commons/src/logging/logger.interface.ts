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
 * Logger interface similar to SLF4J's Logger.
 *
 * Provides logging methods for different severity levels.
 *
 * @example
 * ```typescript
 * const logger = LoggerFactory.getLogger('MyClass');
 *
 * logger.info('Application started');
 * logger.debug('Processing item: {}', itemId);
 *
 * if (logger.isDebugEnabled()) {
 *   logger.debug('Expensive debug info: {}', computeExpensiveInfo());
 * }
 * ```
 */
export interface Logger {
  /**
   * The name of this logger instance.
   */
  readonly name: string;

  /**
   * Log a message at TRACE level.
   */
  trace(message: string, ...args: unknown[]): void;

  /**
   * Log a message at DEBUG level.
   */
  debug(message: string, ...args: unknown[]): void;

  /**
   * Log a message at INFO level.
   */
  info(message: string, ...args: unknown[]): void;

  /**
   * Log a message at WARN level.
   */
  warn(message: string, ...args: unknown[]): void;

  /**
   * Log a message at ERROR level.
   */
  error(message: string, ...args: unknown[]): void;

  /**
   * Check if TRACE level is enabled.
   */
  isTraceEnabled(): boolean;

  /**
   * Check if DEBUG level is enabled.
   */
  isDebugEnabled(): boolean;

  /**
   * Check if INFO level is enabled.
   */
  isInfoEnabled(): boolean;

  /**
   * Check if WARN level is enabled.
   */
  isWarnEnabled(): boolean;

  /**
   * Check if ERROR level is enabled.
   */
  isErrorEnabled(): boolean;
}

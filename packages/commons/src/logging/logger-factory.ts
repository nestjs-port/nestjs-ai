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
import type { ILoggerFactory } from "./logger-factory.interface";

/**
 * Module-level reference to the bound factory, accessible by DelegatingLogger.
 */
let boundFactory: ILoggerFactory | null = null;

/**
 * A logger that delegates to the real logger once the factory is bound.
 */
class DelegatingLogger implements Logger {
  private _delegate?: Logger;

  constructor(readonly name: string) {}

  private get delegate(): Logger | undefined {
    if (!this._delegate && boundFactory) {
      this._delegate = boundFactory.getLogger(this.name);
    }
    return this._delegate;
  }

  trace(message: string, ...args: unknown[]): void {
    this.delegate?.trace(message, ...args);
  }

  debug(message: string, ...args: unknown[]): void {
    this.delegate?.debug(message, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    this.delegate?.info(message, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.delegate?.warn(message, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    this.delegate?.error(message, ...args);
  }

  isTraceEnabled(): boolean {
    return this.delegate?.isTraceEnabled() ?? false;
  }

  isDebugEnabled(): boolean {
    return this.delegate?.isDebugEnabled() ?? false;
  }

  isInfoEnabled(): boolean {
    return this.delegate?.isInfoEnabled() ?? false;
  }

  isWarnEnabled(): boolean {
    return this.delegate?.isWarnEnabled() ?? false;
  }

  isErrorEnabled(): boolean {
    return this.delegate?.isErrorEnabled() ?? false;
  }
}

/**
 * The LoggerFactory is a utility class producing Loggers for various logging APIs.
 *
 * This class is similar to SLF4J's LoggerFactory. It serves as a static facade
 * that delegates to the bound ILoggerFactory implementation.
 *
 * Before {@link bind} is called, loggers returned by {@link getLogger} are
 * no-op. Once a factory is bound, they automatically resolve to the real
 * logger on the next call. This allows safe usage during static initialization.
 *
 * @example
 * ```typescript
 * // At application startup, bind the logger factory
 * import { LoggerFactory } from '@nestjs-ai/commons/logging';
 * import { NestLoggerFactory } from '@nestjs-ai/platform';
 *
 * LoggerFactory.bind(new NestLoggerFactory());
 *
 * // Then use it anywhere in the application
 * const logger = LoggerFactory.getLogger('MyClass');
 * logger.info('Hello, world!');
 * ```
 */
export abstract class LoggerFactory {
  /**
   * Bind an ILoggerFactory implementation to this LoggerFactory.
   *
   * This method should be called once at application startup before
   * any logging calls are made.
   *
   * @param factory - The ILoggerFactory implementation to bind
   */
  static bind(factory: ILoggerFactory): void {
    boundFactory = factory;
  }

  /**
   * Return a logger named according to the name parameter.
   *
   * If no factory has been bound yet, the returned logger is no-op until
   * {@link bind} is called, after which it automatically delegates to the
   * real logger.
   *
   * @param name - The name of the logger
   * @returns A Logger instance
   */
  static getLogger(name: string): Logger {
    return new DelegatingLogger(name);
  }
}

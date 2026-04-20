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

import { Logger as NestLogger } from "@nestjs/common";
import type { ILoggerFactory, Logger } from "@nestjs-port/core";

/**
 * NestJS Logger adapter implementing the Logger interface.
 */
class NestLoggerAdapter implements Logger {
  private readonly nestLogger: NestLogger;

  constructor(public readonly name: string) {
    this.nestLogger = new NestLogger(name);
  }

  trace(message: string, ...args: unknown[]): void {
    this.nestLogger.verbose(message, args);
  }

  debug(message: string, ...args: unknown[]): void {
    this.nestLogger.debug(message, args);
  }

  info(message: string, ...args: unknown[]): void {
    this.nestLogger.log(message, args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.nestLogger.warn(message, args);
  }

  error(message: string, ...args: unknown[]): void {
    this.nestLogger.error(message, args);
  }

  isTraceEnabled(): boolean {
    return NestLogger.isLevelEnabled("verbose");
  }

  isDebugEnabled(): boolean {
    return NestLogger.isLevelEnabled("debug");
  }

  isInfoEnabled(): boolean {
    return NestLogger.isLevelEnabled("log");
  }

  isWarnEnabled(): boolean {
    return NestLogger.isLevelEnabled("warn");
  }

  isErrorEnabled(): boolean {
    return NestLogger.isLevelEnabled("error");
  }
}

/**
 * ILoggerFactory implementation that creates loggers backed by NestJS Logger.
 *
 * @example
 * ```typescript
 * import { LoggerFactory } from '@nestjs-port/core/logging';
 * import { NestLoggerFactory } from '@nestjs-ai/platform';
 *
 * // At application bootstrap
 * LoggerFactory.bind(new NestLoggerFactory());
 * ```
 */
export class NestLoggerFactory implements ILoggerFactory {
  getLogger(name: string): Logger {
    return new NestLoggerAdapter(name);
  }
}

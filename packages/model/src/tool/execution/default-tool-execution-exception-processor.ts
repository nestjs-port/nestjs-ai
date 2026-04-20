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

import assert from "node:assert/strict";
import { type Logger, LoggerFactory } from "@nestjs-port/core";
import type { ToolExecutionException } from "./tool-execution-exception";
import type { ToolExecutionExceptionProcessor } from "./tool-execution-exception-processor.interface";

/**
 * Default implementation of {@link ToolExecutionExceptionProcessor}. Can be configured
 * with an allowlist of exceptions that will be unwrapped from the
 * {@link ToolExecutionException} and rethrown as is.
 */
export class DefaultToolExecutionExceptionProcessor
  implements ToolExecutionExceptionProcessor
{
  private readonly logger: Logger = LoggerFactory.getLogger(
    DefaultToolExecutionExceptionProcessor.name,
  );

  private readonly _alwaysThrow: boolean;
  private readonly _rethrownExceptions: readonly (new (
    ...args: never[]
  ) => Error)[];

  constructor(alwaysThrow: boolean);
  constructor(
    alwaysThrow: boolean,
    rethrownExceptions: (new (...args: never[]) => Error)[],
  );
  constructor(
    alwaysThrow: boolean,
    rethrownExceptions?: (new (...args: never[]) => Error)[],
  ) {
    this._alwaysThrow = alwaysThrow;
    this._rethrownExceptions = rethrownExceptions ?? [];
  }

  process(exception: ToolExecutionException): string {
    assert(exception, "exception cannot be null");
    const cause = exception.cause;
    if (cause instanceof Error) {
      const matchesClass = this._rethrownExceptions.some(
        (ErrorClass) => cause instanceof ErrorClass,
      );
      const matchesName = this._rethrownExceptions
        .map((e) => e.name)
        .includes(cause.name);

      if (matchesClass || matchesName) {
        throw cause;
      }
    } else {
      throw exception;
    }

    if (this._alwaysThrow) {
      throw exception;
    }
    let message = exception.message;
    if (!message || message.trim() === "") {
      const causeName = cause?.constructor?.name;
      message = `Exception occurred in tool: ${exception.toolDefinition.name} (${causeName})`;
    }
    this.logger.debug(
      `Exception thrown by tool: ${exception.toolDefinition.name}. Message: ${message}`,
      exception,
    );
    return message;
  }
}

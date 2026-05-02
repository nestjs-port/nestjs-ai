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

import "reflect-metadata";

import type { LoggingMessageNotification } from "@modelcontextprotocol/server";

import type { McpLoggingMetadata } from "../../mcp-logging.js";
import {
  AbstractMcpLoggingMethodCallback,
  McpLoggingConsumerMethodException,
} from "./abstract-mcp-logging-method-callback.js";

/**
 * Class for creating Function callbacks around logging consumer methods that return
 * Promise.
 *
 * This class provides a way to convert methods annotated with `McpLogging` into
 * callback functions that can be used to handle logging message notifications in an
 * asynchronous way. It supports methods with either a single
 * LoggingMessageNotification parameter or three parameters (LoggingLevel, String,
 * String).
 */
export class McpLoggingMethodCallback extends AbstractMcpLoggingMethodCallback {
  constructor(bean: object, propertyKey: string | symbol) {
    super({ bean, propertyKey });
  }

  async apply(notification: LoggingMessageNotification): Promise<void> {
    if (notification == null) {
      throw new TypeError("Notification must not be null");
    }

    try {
      const args = this.buildArgs(notification);
      const result = await Promise.resolve(
        this._method.apply(this._bean, args),
      );

      if (result != null) {
        throw new TypeError(
          `Expected Promise<void> but got Promise<${typeof result === "object" ? ((result as { constructor?: { name?: string } }).constructor?.name ?? "object") : typeof result}>`,
        );
      }
    } catch (error) {
      throw new McpLoggingConsumerMethodException(
        `Error invoking logging consumer method: ${this.methodName}`,
        { cause: error instanceof Error ? error : undefined },
      );
    }
  }

  protected override validateReturnType(): void {
    const returnType = Reflect.getMetadata(
      "design:returntype",
      this._target,
      this._propertyKey,
    ) as { name?: string } | undefined;

    if (returnType !== undefined && returnType !== Promise) {
      throw new Error(
        `Method must have void or Promise<void> return type: ${this.methodName} in ${this.declaringClassName} returns ${returnType.name ?? "unknown"}`,
      );
    }
  }

  protected override isExchangeType(paramType: unknown): boolean {
    // No exchange type for logging methods
    return false;
  }

  static builder(): McpLoggingMethodCallbackBuilder {
    return new McpLoggingMethodCallbackBuilder();
  }
}

abstract class AbstractMcpLoggingMethodCallbackBuilder<
  T extends AbstractMcpLoggingMethodCallbackBuilder<T, R>,
  R,
> {
  protected _bean: object | null = null;

  protected _propertyKey: string | symbol | null = null;

  method(propertyKey: string | symbol | null): T {
    this._propertyKey = propertyKey;
    return this as unknown as T;
  }

  bean(bean: object | null): T {
    this._bean = bean;
    return this as unknown as T;
  }

  loggingConsumer(_loggingConsumer: McpLoggingMetadata): T {
    // No additional configuration needed from the annotation at this time
    return this as unknown as T;
  }

  protected validate(): void {
    if (this._propertyKey == null) {
      throw new Error("Method must not be null");
    }
    if (this._bean == null) {
      throw new Error("Bean must not be null");
    }
  }

  abstract build(): R;
}

export class McpLoggingMethodCallbackBuilder extends AbstractMcpLoggingMethodCallbackBuilder<
  McpLoggingMethodCallbackBuilder,
  McpLoggingMethodCallback
> {
  build(): McpLoggingMethodCallback {
    this.validate();
    return new McpLoggingMethodCallback(
      this._bean as object,
      this._propertyKey as string | symbol,
    );
  }
}

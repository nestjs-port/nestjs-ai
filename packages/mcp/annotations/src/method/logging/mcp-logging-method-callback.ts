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
import "reflect-metadata";

import type { LoggingMessageNotification } from "@modelcontextprotocol/server";

export interface McpLoggingMethodCallbackProps {
  provider: object;
  propertyKey: string | symbol;
}

export class McpLoggingConsumerMethodException extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "McpLoggingConsumerMethodException";
  }
}

/**
 * Class for creating Function callbacks around logging consumer methods that return
 * Promise.
 */
export class McpLoggingMethodCallback {
  protected readonly _provider: object;

  protected readonly _propertyKey: string | symbol;

  protected readonly _method: (...args: unknown[]) => unknown;

  constructor(props: McpLoggingMethodCallbackProps) {
    assert(props.propertyKey != null, "Method can't be null!");
    assert(props.provider != null, "Provider can't be null!");

    this._provider = props.provider;
    this._propertyKey = props.propertyKey;

    const candidate = (props.provider as Record<string | symbol, unknown>)[
      props.propertyKey
    ];
    if (typeof candidate !== "function") {
      throw new Error(
        `Method must not be null: ${String(props.propertyKey)} in ${this.declaringClassName}`,
      );
    }

    this._method = candidate as (...args: unknown[]) => unknown;
  }

  protected get methodName(): string {
    return typeof this._propertyKey === "string"
      ? this._propertyKey
      : this._propertyKey.toString();
  }

  protected get declaringClassName(): string {
    return this._provider.constructor?.name ?? "<anonymous>";
  }

  protected buildArgs(notification: LoggingMessageNotification): unknown[] {
    if (this._method.length === 1) {
      return [notification];
    }

    return [
      notification.params.level,
      notification.params.logger,
      notification.params.data,
    ];
  }

  async apply(notification: LoggingMessageNotification): Promise<void> {
    if (notification == null) {
      throw new TypeError("Notification must not be null");
    }

    try {
      const args = this.buildArgs(notification);
      await this._method.apply(this._provider, args);
    } catch (error) {
      throw new McpLoggingConsumerMethodException(
        `Error invoking logging consumer method: ${this.methodName}`,
        { cause: error instanceof Error ? error : undefined },
      );
    }
  }
}

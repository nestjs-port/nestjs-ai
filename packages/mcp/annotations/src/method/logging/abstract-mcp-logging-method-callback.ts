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
import assert from "node:assert/strict";
import type { LoggingMessageNotification } from "@modelcontextprotocol/server";

export interface AbstractMcpLoggingMethodCallbackProps {
  bean: object;
  propertyKey: string | symbol;
}

export class McpLoggingConsumerMethodException extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "McpLoggingConsumerMethodException";
  }
}

/**
 * Abstract base class for creating callbacks around logging consumer methods.
 *
 * This class provides common functionality for logging consumer method callbacks. It
 * contains shared logic for method validation, argument building, and other common
 * operations.
 */
export abstract class AbstractMcpLoggingMethodCallback {
  protected readonly _bean: object;

  protected readonly _propertyKey: string | symbol;

  protected readonly _target: object;

  protected readonly _method: (...args: unknown[]) => unknown;

  /**
   * Constructor for AbstractMcpLoggingMethodCallback.
   * @param bean The bean instance that contains the method
   * @param propertyKey The property key of the method to create a callback for
   */
  protected constructor(props: AbstractMcpLoggingMethodCallbackProps) {
    assert(props.propertyKey != null, "Method can't be null!");
    assert(props.bean != null, "Bean can't be null!");

    this._bean = props.bean;
    this._propertyKey = props.propertyKey;
    this._target = Object.getPrototypeOf(props.bean) as object;

    const candidate = (props.bean as Record<string | symbol, unknown>)[
      props.propertyKey
    ];
    if (typeof candidate !== "function") {
      throw new Error(
        `Method must not be null: ${String(props.propertyKey)} in ${this.declaringClassName}`,
      );
    }

    this._method = candidate as (...args: unknown[]) => unknown;
    this.validateMethod();
  }

  protected get methodName(): string {
    return typeof this._propertyKey === "string"
      ? this._propertyKey
      : this._propertyKey.toString();
  }

  protected get declaringClassName(): string {
    return this._bean.constructor?.name ?? "<anonymous>";
  }

  protected validateMethod(): void {
    this.validateReturnType();
    this.validateParameters();
  }

  protected abstract validateReturnType(): void;

  protected validateParameters(): void {
    const paramTypes =
      (Reflect.getMetadata(
        "design:paramtypes",
        this._target,
        this._propertyKey,
      ) as unknown[] | undefined) ?? [];

    if (paramTypes.length !== 1 && paramTypes.length !== 3) {
      throw new Error(
        `Method must have either 1 parameter (LoggingMessageNotification) or 3 parameters (LoggingLevel, String, String): ${this.methodName} in ${this.declaringClassName} has ${paramTypes.length} parameters`,
      );
    }

    if (paramTypes.length === 1) {
      const paramType = paramTypes[0] as { name?: string } | undefined;
      if (paramType !== Object) {
        throw new Error(
          `Single parameter must be of type LoggingMessageNotification: ${this.methodName} in ${this.declaringClassName} has parameter of type ${paramType?.name ?? "unknown"}`,
        );
      }
      return;
    }

    const [first, second, third] = paramTypes as [
      { name?: string } | undefined,
      { name?: string } | undefined,
      { name?: string } | undefined,
    ];

    if (first !== String) {
      throw new Error(
        `First parameter must be of type LoggingLevel: ${this.methodName} in ${this.declaringClassName} has parameter of type ${first?.name ?? "unknown"}`,
      );
    }
    if (second !== String) {
      throw new Error(
        `Second parameter must be of type String: ${this.methodName} in ${this.declaringClassName} has parameter of type ${second?.name ?? "unknown"}`,
      );
    }
    if (third !== String) {
      throw new Error(
        `Third parameter must be of type String: ${this.methodName} in ${this.declaringClassName} has parameter of type ${third?.name ?? "unknown"}`,
      );
    }
  }

  protected buildArgs(notification: LoggingMessageNotification): unknown[] {
    const paramTypes =
      (Reflect.getMetadata(
        "design:paramtypes",
        this._target,
        this._propertyKey,
      ) as unknown[] | undefined) ?? [];

    if (paramTypes.length === 1) {
      return [notification];
    }

    return [
      notification.params.level,
      notification.params.logger,
      notification.params.data,
    ];
  }

  protected abstract isExchangeType(paramType: unknown): boolean;
}

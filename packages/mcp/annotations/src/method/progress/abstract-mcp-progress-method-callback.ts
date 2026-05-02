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
import type { ProgressNotification } from "@modelcontextprotocol/server";

export class McpProgressMethodException extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "McpProgressMethodException";
  }
}

/**
 * Abstract base class for creating callbacks around progress methods.
 *
 * This class provides common functionality for both synchronous and asynchronous progress
 * method callbacks. It contains shared logic for method validation, argument building,
 * and other common operations.
 */
export abstract class AbstractMcpProgressMethodCallback {
  protected readonly _bean: object;

  protected readonly _propertyKey: string | symbol;

  protected readonly _target: object;

  protected readonly _method: (...args: unknown[]) => unknown;

  /**
   * Constructor for AbstractMcpProgressMethodCallback.
   * @param bean The bean instance that contains the method
   * @param propertyKey The property key of the method to create a callback for
   */
  protected constructor(bean: object, propertyKey: string | symbol) {
    assert(propertyKey != null, "Method can't be null!");
    assert(bean != null, "Bean can't be null!");

    this._bean = bean;
    this._propertyKey = propertyKey;
    this._target = Object.getPrototypeOf(bean) as object;

    const candidate = (bean as Record<string | symbol, unknown>)[propertyKey];
    if (typeof candidate !== "function") {
      throw new Error(
        `Method must not be null: ${String(propertyKey)} in ${this.declaringClassName}`,
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

  /**
   * Validates that the method signature is compatible with the progress callback.
   *
   * This method checks that the return type is valid and that the parameters match the
   * expected pattern.
   * @throws Error if the method signature is not compatible
   */
  protected validateMethod(): void {
    this.validateReturnType();
    this.validateParameters();
  }

  /**
   * Validates that the method return type is compatible with the progress callback.
   * This method should be implemented by subclasses to handle specific return type
   * validation.
   * @throws Error if the return type is not compatible
   */
  protected abstract validateReturnType(): void;

  /**
   * Validates method parameters. This method provides common validation logic and
   * delegates exchange type checking to subclasses.
   * @throws Error if the parameters are not compatible
   */
  protected validateParameters(): void {
    const paramTypes =
      (Reflect.getMetadata(
        "design:paramtypes",
        this._target,
        this._propertyKey,
      ) as unknown[] | undefined) ?? [];

    // Check parameter count - must have either 1 or 3 parameters
    if (paramTypes.length !== 1 && paramTypes.length !== 3) {
      throw new Error(
        `Method must have either 1 parameter (ProgressNotification) or 3 parameters (Double, String, String): ${this.methodName} in ${this.declaringClassName} has ${paramTypes.length} parameters`,
      );
    }

    // Check parameter types
    if (paramTypes.length === 1) {
      // Single parameter must be ProgressNotification
      const paramType = paramTypes[0] as { name?: string } | undefined;
      if (paramType !== Object) {
        throw new Error(
          `Single parameter must be of type ProgressNotification: ${this.methodName} in ${this.declaringClassName} has parameter of type ${paramType?.name ?? "unknown"}`,
        );
      }
    } else {
      // Three parameters must be Double, String, String
      const first = paramTypes[0] as { name?: string } | undefined;
      const second = paramTypes[1] as { name?: string } | undefined;
      const third = paramTypes[2] as { name?: string } | undefined;
      if (first !== Number) {
        throw new Error(
          `First parameter must be of type Double or double: ${this.methodName} in ${this.declaringClassName} has parameter of type ${first?.name ?? "unknown"}`,
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
  }

  /**
   * Builds the arguments array for invoking the method.
   *
   * This method constructs an array of arguments based on the method's parameter types
   * and the available values (exchange, notification).
   * @param exchange The server exchange
   * @param notification The progress notification
   * @returns An array of arguments for the method invocation
   */
  protected buildArgs(
    _exchange: unknown,
    notification: ProgressNotification,
  ): unknown[] {
    const paramTypes =
      (Reflect.getMetadata(
        "design:paramtypes",
        this._target,
        this._propertyKey,
      ) as unknown[] | undefined) ?? [];

    if (paramTypes.length === 1) {
      // Single parameter (ProgressNotification)
      return [notification];
    }
    // Three parameters (Double, String, String)
    const total = notification.params.total;
    return [
      notification.params.progress,
      notification.params.progressToken,
      total != null ? String(total) : null,
    ];
  }
}

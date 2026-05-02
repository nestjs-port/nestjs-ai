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
import type { Prompt } from "@modelcontextprotocol/server";

export class McpPromptListChangedConsumerMethodException extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "McpPromptListChangedConsumerMethodException";
  }
}

/**
 * Abstract base class for creating callbacks around prompt list changed consumer methods.
 *
 * This class provides common functionality for both synchronous and asynchronous prompt
 * list changed consumer method callbacks. It contains shared logic for method validation,
 * argument building, and other common operations.
 */
export abstract class AbstractMcpPromptListChangedMethodCallback {
  protected readonly _bean: object;

  protected readonly _propertyKey: string | symbol;

  protected readonly _target: object;

  protected readonly _method: (...args: unknown[]) => unknown;

  /**
   * Constructor for AbstractMcpPromptListChangedMethodCallback.
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
   * Validates that the method signature is compatible with the prompt list changed
   * consumer callback.
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
   * Validates that the method return type is compatible with the prompt list changed
   * consumer callback. This method should be implemented by subclasses to handle
   * specific return type validation.
   * @throws Error if the return type is not compatible
   */
  protected abstract validateReturnType(): void;

  /**
   * Validates method parameters. This method provides common validation logic.
   * @throws Error if the parameters are not compatible
   */
  protected validateParameters(): void {
    const paramTypes =
      (Reflect.getMetadata(
        "design:paramtypes",
        this._target,
        this._propertyKey,
      ) as unknown[] | undefined) ?? [];

    // Check parameter count - must have exactly 1 parameter
    if (paramTypes.length !== 1) {
      throw new Error(
        `Method must have exactly 1 parameter (List<McpSchema.Prompt>): ${this.methodName} in ${this.declaringClassName} has ${paramTypes.length} parameters`,
      );
    }

    // Check parameter type - must be List<McpSchema.Prompt>
    const paramType = paramTypes[0] as { name?: string } | undefined;
    if (paramType !== Array) {
      throw new Error(
        `Parameter must be of type List<McpSchema.Prompt>: ${this.methodName} in ${this.declaringClassName} has parameter of type ${paramType?.name ?? "unknown"}`,
      );
    }
  }

  /**
   * Builds the arguments array for invoking the method.
   *
   * This method constructs an array of arguments based on the method's parameter types
   * and the available values.
   * @param exchange The server exchange
   * @param updatedPrompts The updated list of prompts
   * @returns An array of arguments for the method invocation
   */
  protected buildArgs(_exchange: unknown, updatedPrompts: Prompt[]): unknown[] {
    // Single parameter (List<McpSchema.Prompt>)
    return [updatedPrompts];
  }
}

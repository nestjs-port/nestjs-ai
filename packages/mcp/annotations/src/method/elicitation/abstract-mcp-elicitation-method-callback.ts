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
import type { ElicitRequest, ElicitResult } from "@modelcontextprotocol/server";

import { StructuredElicitResult } from "../../context/structured-elicit-result.js";

export interface AbstractMcpElicitationMethodCallbackProps {
  bean: object;
  propertyKey: string | symbol;
}

export class McpElicitationMethodException extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "McpElicitationMethodException";
  }
}

/**
 * Abstract base class for creating callbacks around elicitation methods.
 *
 * This class provides common functionality for both synchronous and asynchronous
 * elicitation method callbacks. It contains shared logic for method validation, argument
 * building, and other common operations.
 */
export abstract class AbstractMcpElicitationMethodCallback {
  protected readonly _bean: object;

  protected readonly _propertyKey: string | symbol;

  protected readonly _target: object;

  protected readonly _method: (...args: unknown[]) => unknown;

  /**
   * Constructor for AbstractMcpElicitationMethodCallback.
   * @param bean The bean instance that contains the method
   * @param propertyKey The property key of the method to create a callback for
   */
  protected constructor(props: AbstractMcpElicitationMethodCallbackProps) {
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

  /**
   * Validates that the method signature is compatible with the elicitation callback.
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
   * Validates that the method return type is compatible with the elicitation callback.
   * This method should be implemented by subclasses to handle specific return type
   * validation.
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

    // Check parameter count - must have at least 1 parameter
    if (paramTypes.length < 1) {
      throw new Error(
        `Method must have at least 1 parameter (ElicitRequest): ${this.methodName} in ${this.declaringClassName} has ${paramTypes.length} parameters`,
      );
    }

    if (paramTypes.length !== 1) {
      // TODO: Support for multiple parameters corresponding to ElicitRequest fields
      // For now, we only support the single parameter version
      throw new Error(
        `Currently only methods with a single ElicitRequest parameter are supported: ${this.methodName} in ${this.declaringClassName} has ${paramTypes.length} parameters`,
      );
    }

    const paramType = paramTypes[0] as { name?: string } | undefined;
    if (paramType !== Object) {
      throw new Error(
        `Single parameter must be of type ElicitRequest: ${this.methodName} in ${this.declaringClassName} has parameter of type ${paramType?.name ?? "unknown"}`,
      );
    }
  }

  /**
   * Builds the arguments array for invoking the method.
   * @param request The elicitation request
   * @return An array of arguments for the method invocation
   */
  protected buildArgs(request: ElicitRequest): unknown[] {
    // Single parameter (ElicitRequest)
    return [request];
  }

  protected abstract isExchangeType(paramType: unknown): boolean;

  protected toElicitResult(result: unknown): ElicitResult {
    if (result instanceof StructuredElicitResult) {
      return {
        action: result.action,
        content:
          result.structuredContent != null
            ? this.toMap(result.structuredContent)
            : undefined,
        _meta: result.meta,
      };
    }

    if (this.isElicitResult(result)) {
      return result;
    }

    throw new McpElicitationMethodException(
      `Method must return ElicitResult or StructuredElicitResult: ${this.methodName}`,
    );
  }

  protected isElicitResult(value: unknown): value is ElicitResult {
    return (
      value != null &&
      typeof value === "object" &&
      "action" in value &&
      "content" in value
    );
  }

  protected toMap(value: unknown): ElicitResult["content"] {
    assert(value != null, "object cannot be null");

    if (typeof value === "object" && !Array.isArray(value)) {
      return {
        ...(value as Record<string, string | number | boolean | string[]>),
      };
    }

    return { value: value as string | number | boolean | string[] };
  }
}

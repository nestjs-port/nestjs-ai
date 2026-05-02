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

import type { ElicitRequest, ElicitResult } from "@modelcontextprotocol/server";

import type { McpElicitationMetadata } from "../../mcp-elicitation.js";
import {
  AbstractMcpElicitationMethodCallback,
  McpElicitationMethodException,
} from "./abstract-mcp-elicitation-method-callback.js";

/**
 * Class for creating Function callbacks around elicitation methods that return Promise.
 *
 * This class provides a way to convert methods annotated with `McpElicitation` into
 * callback functions that can be used to handle elicitation requests in a reactive way.
 * It supports methods with a single ElicitRequest parameter.
 */
export class McpElicitationMethodCallback extends AbstractMcpElicitationMethodCallback {
  constructor(bean: object, propertyKey: string | symbol) {
    super({ bean, propertyKey });
  }

  /**
   * Apply the callback to the given request.
   *
   * This method builds the arguments for the method call, invokes the method, and
   * returns a Promise that resolves when the method execution is done.
   * @param request The elicitation request, must not be null
   * @return A Promise that resolves when the method execution is done
   * @throws McpElicitationMethodException if there is an error invoking the elicitation
   * method
   * @throws TypeError if the request is null
   */
  async apply(request: ElicitRequest): Promise<ElicitResult> {
    if (request == null) {
      throw new TypeError("Request must not be null");
    }

    try {
      // Build arguments for the method call
      const args = this.buildArgs(request);

      // Invoke the method
      const result = await Promise.resolve(
        this._method.apply(this._bean, args),
      );
      return this.toElicitResult(result);
    } catch (error) {
      throw new McpElicitationMethodException(
        `Error invoking elicitation method: ${this.methodName}`,
        { cause: error instanceof Error ? error : undefined },
      );
    }
  }

  /**
   * Validates that the method return type is compatible with the elicitation callback.
   * @param method The method to validate
   * @throws Error if the return type is not compatible
   */
  protected override validateReturnType(): void {
    const returnType = Reflect.getMetadata(
      "design:returntype",
      this._target,
      this._propertyKey,
    ) as { name?: string } | undefined;

    if (returnType !== Promise) {
      throw new Error(
        `Method must return Promise<ElicitResult> or Promise<StructuredElicitResult>: ${this.methodName} in ${this.declaringClassName} returns ${returnType?.name ?? "unknown"}`,
      );
    }
  }

  /**
   * Checks if a parameter type is compatible with the exchange type.
   * @param paramType The parameter type to check
   * @return true if the parameter type is compatible with the exchange type, false
   * otherwise
   */
  protected override isExchangeType(paramType: unknown): boolean {
    // No exchange type for elicitation methods
    return false;
  }

  /**
   * Create a new builder.
   * @return A new builder instance
   */
  static builder(): McpElicitationMethodCallbackBuilder {
    return new McpElicitationMethodCallbackBuilder();
  }
}

/**
 * Builder for creating McpElicitationMethodCallback instances.
 *
 * This builder provides a fluent API for constructing
 * McpElicitationMethodCallback instances with the required parameters.
 */
export class McpElicitationMethodCallbackBuilder {
  private _bean: object | null = null;

  private _propertyKey: string | symbol | null = null;

  /**
   * Set the property key of the method to create a callback for.
   * @param propertyKey The property key of the method
   * @returns This builder
   */
  method(propertyKey: string | symbol | null): this {
    this._propertyKey = propertyKey;
    return this;
  }

  /**
   * Set the bean instance that contains the method.
   * @param bean The bean instance
   * @returns This builder
   */
  bean(bean: object | null): this {
    this._bean = bean;
    return this;
  }

  /**
   * Set the elicitation annotation.
   * @param _elicitation The elicitation metadata
   * @returns This builder
   */
  elicitation(_elicitation: McpElicitationMetadata): this {
    // No additional configuration needed from the annotation at this time
    return this;
  }

  /**
   * Build the callback.
   * @return A new McpElicitationMethodCallback instance
   */
  build(): McpElicitationMethodCallback {
    if (this._propertyKey == null) {
      throw new Error("Method must not be null");
    }
    if (this._bean == null) {
      throw new Error("Bean must not be null");
    }
    return new McpElicitationMethodCallback(this._bean, this._propertyKey);
  }
}

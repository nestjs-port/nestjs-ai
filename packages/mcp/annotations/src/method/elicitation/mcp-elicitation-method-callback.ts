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

import type { ElicitRequest, ElicitResult } from "@modelcontextprotocol/client";

import { StructuredElicitResult } from "../../context/index.js";

export interface McpElicitationMethodCallbackProps {
  provider: object;
  propertyKey: string | symbol;
}

export class McpElicitationMethodException extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "McpElicitationMethodException";
  }
}

/**
 * Class for creating Function callbacks around elicitation methods that return Promise.
 *
 * This class provides a way to convert methods annotated with `McpElicitation` into
 * callback functions that can be used to handle elicitation requests in a reactive way.
 * It supports methods with a single ElicitRequest parameter.
 */
export class McpElicitationMethodCallback {
  protected readonly _provider: object;

  protected readonly _propertyKey: string | symbol;

  protected readonly _method: (...args: unknown[]) => unknown;

  constructor(props: McpElicitationMethodCallbackProps) {
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
      const args = this.buildArgs(request);
      const result = await this._method.apply(this._provider, args);
      return this.toElicitResult(result);
    } catch (error) {
      throw new McpElicitationMethodException(
        `Error invoking elicitation method: ${this.methodName}`,
        { cause: error instanceof Error ? error : undefined },
      );
    }
  }

  protected buildArgs(request: ElicitRequest): unknown[] {
    return [request];
  }

  private toElicitResult(result: unknown): ElicitResult {
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

  private isElicitResult(value: unknown): value is ElicitResult {
    return (
      value != null &&
      typeof value === "object" &&
      "action" in value &&
      "content" in value
    );
  }

  private toMap(value: unknown): ElicitResult["content"] {
    assert(value != null, "object cannot be null");

    if (typeof value === "object" && !Array.isArray(value)) {
      return {
        ...(value as Record<string, string | number | boolean | string[]>),
      };
    }

    return { value: value as string | number | boolean | string[] };
  }
}

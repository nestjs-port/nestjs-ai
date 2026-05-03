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
import type { CreateMessageRequest } from "@modelcontextprotocol/server";

export interface AbstractMcpSamplingMethodCallbackProps {
  provider: object;
  propertyKey: string | symbol;
}

export class McpSamplingMethodException extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "McpSamplingMethodException";
  }
}

/**
 * Abstract base class for creating callbacks around sampling methods.
 *
 * This class provides common functionality for both synchronous and asynchronous
 * sampling method callbacks. It contains shared logic for argument building and other
 * common operations.
 */
export abstract class AbstractMcpSamplingMethodCallback {
  protected readonly _provider: object;

  protected readonly _propertyKey: string | symbol;

  protected readonly _method: (...args: unknown[]) => unknown;

  protected constructor(props: AbstractMcpSamplingMethodCallbackProps) {
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
   * Builds the arguments array for invoking the method.
   * @param request The sampling request
   * @return An array of arguments for the method invocation
   */
  protected buildArgs(request: CreateMessageRequest): unknown[] {
    return [request];
  }
}

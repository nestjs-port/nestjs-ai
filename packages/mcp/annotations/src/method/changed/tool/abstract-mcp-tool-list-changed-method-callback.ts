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

export class McpToolListChangedConsumerMethodException extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "McpToolListChangedConsumerMethodException";
  }
}

/**
 * Abstract base class for creating callbacks around tool list changed consumer methods.
 *
 * This class provides common functionality for both synchronous and asynchronous tool
 * list changed consumer method callbacks. It contains shared logic for method validation
 * and other common operations.
 */
export abstract class AbstractMcpToolListChangedMethodCallback {
  protected readonly _provider: object;

  protected readonly _propertyKey: string | symbol;

  protected readonly _method: (...args: unknown[]) => unknown;

  /**
   * Constructor for AbstractMcpToolListChangedMethodCallback.
   * @param provider The provider instance that contains the method
   * @param propertyKey The property key of the method to create a callback for
   */
  protected constructor(provider: object, propertyKey: string | symbol) {
    assert(propertyKey != null, "Method can't be null!");
    assert(provider != null, "Provider can't be null!");

    this._provider = provider;
    this._propertyKey = propertyKey;

    const candidate = (provider as Record<string | symbol, unknown>)[
      propertyKey
    ];
    if (typeof candidate !== "function") {
      throw new Error(
        `Method must not be null: ${String(propertyKey)} in ${this.declaringClassName}`,
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
}

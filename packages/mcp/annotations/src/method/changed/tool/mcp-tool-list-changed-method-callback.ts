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
import type { Tool } from "@modelcontextprotocol/server";

export interface McpToolListChangedMethodCallbackProps {
  provider: object;
  propertyKey: string | symbol;
}

export class McpToolListChangedConsumerMethodException extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "McpToolListChangedConsumerMethodException";
  }
}

/**
 * Class for creating Function callbacks around tool list changed consumer methods.
 *
 * This class provides a way to convert methods annotated with `McpToolListChanged` into
 * callback functions that can be used to handle tool list change notifications. It
 * supports methods with a single `Tool[]` parameter and a `void` or `Promise<void>`
 * return type.
 */
export class McpToolListChangedMethodCallback {
  protected readonly _provider: object;

  protected readonly _propertyKey: string | symbol;

  protected readonly _method: (...args: unknown[]) => unknown;

  constructor(props: McpToolListChangedMethodCallbackProps) {
    if (props.propertyKey == null) {
      throw new Error("Method can't be null!");
    }
    if (props.provider == null) {
      throw new Error("Provider can't be null!");
    }

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
   * Apply the callback to the given tool list.
   *
   * This method builds the arguments for the method call, invokes the method, and
   * returns a Promise that resolves when the method execution is done.
   * @param updatedTools The updated list of tools, must not be null
   * @returns A Promise that resolves when the method execution is done
   * @throws McpToolListChangedConsumerMethodException if there is an error invoking the
   * tool list changed consumer method
   * @throws TypeError if the updatedTools is null
   */
  async apply(updatedTools: Tool[]): Promise<void> {
    if (updatedTools == null) {
      throw new TypeError("Updated tools list must not be null");
    }

    try {
      await this._method.apply(this._provider, [updatedTools]);
    } catch (e) {
      throw new McpToolListChangedConsumerMethodException(
        `Error invoking tool list changed consumer method: ${this.methodName}`,
        { cause: e },
      );
    }
  }
}

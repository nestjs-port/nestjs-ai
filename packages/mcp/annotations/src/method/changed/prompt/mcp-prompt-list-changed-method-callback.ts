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
import type { Prompt } from "@modelcontextprotocol/server";
import type { McpPromptListChangedMetadata } from "../../../mcp-prompt-list-changed.js";
import {
  AbstractMcpPromptListChangedMethodCallback,
  McpPromptListChangedConsumerMethodException,
} from "./abstract-mcp-prompt-list-changed-method-callback.js";

/**
 * Class for creating Function callbacks around prompt list changed consumer methods that
 * return Promise.
 *
 * This class provides a way to convert methods annotated with `McpPromptListChanged` into
 * callback functions that can be used to handle prompt list change notifications in an
 * asynchronous way. It supports methods with a single `Prompt[]` parameter.
 */
export class McpPromptListChangedMethodCallback extends AbstractMcpPromptListChangedMethodCallback {
  constructor(bean: object, propertyKey: string | symbol) {
    super(bean, propertyKey);
  }

  /**
   * Apply the callback to the given prompt list.
   *
   * This method builds the arguments for the method call, invokes the method, and
   * returns a Promise that resolves when the method execution is done.
   * @param updatedPrompts The updated list of prompts, must not be null
   * @returns A Promise that resolves when the method execution is done
   * @throws McpPromptListChangedConsumerMethodException if there is an error invoking
   * the prompt list changed consumer method
   * @throws TypeError if the updatedPrompts is null
   */
  async apply(updatedPrompts: Prompt[]): Promise<void> {
    if (updatedPrompts == null) {
      throw new TypeError("Updated prompts list must not be null");
    }

    let result: unknown;
    try {
      // Build arguments for the method call
      const args = this.buildArgs(null, updatedPrompts);

      // Invoke the method
      result = this._method.apply(this._bean, args);
    } catch (e) {
      throw new McpPromptListChangedConsumerMethodException(
        `Error invoking prompt list changed consumer method: ${this.methodName}`,
        { cause: e },
      );
    }

    // If the method returns a Promise, handle it
    if (result instanceof Promise) {
      // We need to handle the case where the Promise is not a Promise<void>
      // This is expected by the test testInvalidMonoReturnType
      const value = await result;

      // Convert the Promise to a Promise<void> by checking the value
      // If the value is not null (i.e., not Void), throw a TypeError
      if (value != null) {
        // This will be caught by the test testInvalidMonoReturnType
        throw new TypeError(
          `Expected Promise<void> but got Promise<${typeof value === "object" ? (value.constructor?.name ?? "object") : typeof value}>`,
        );
      }
      return;
    }
    // If the method returns void, return a resolved Promise
  }

  /**
   * Validates that the method return type is compatible with the prompt list changed
   * consumer callback.
   * @throws Error if the return type is not compatible
   */
  protected override validateReturnType(): void {
    const returnType = Reflect.getMetadata(
      "design:returntype",
      this._target,
      this._propertyKey,
    ) as { name?: string } | undefined;

    // void return type appears as undefined; Promise return type appears as Promise.
    if (returnType !== undefined && returnType !== Promise) {
      throw new Error(
        `Method must have void or Mono<Void> return type: ${this.methodName} in ${this.declaringClassName} returns ${returnType.name ?? "unknown"}`,
      );
    }
  }

  /**
   * Create a new builder.
   * @returns A new builder instance
   */
  static builder(): McpPromptListChangedMethodCallbackBuilder {
    return new McpPromptListChangedMethodCallbackBuilder();
  }
}

/**
 * Builder for creating McpPromptListChangedMethodCallback instances.
 *
 * This builder provides a fluent API for constructing
 * McpPromptListChangedMethodCallback instances with the required parameters.
 */
export class McpPromptListChangedMethodCallbackBuilder {
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
   * Set the prompt list changed annotation metadata.
   * @param _promptListChanged The prompt list changed metadata
   * @returns This builder
   */
  promptListChanged(_promptListChanged: McpPromptListChangedMetadata): this {
    // No additional configuration needed from the annotation at this time
    return this;
  }

  /**
   * Build the callback.
   * @returns A new McpPromptListChangedMethodCallback instance
   */
  build(): McpPromptListChangedMethodCallback {
    if (this._propertyKey == null) {
      throw new Error("Method must not be null");
    }
    if (this._bean == null) {
      throw new Error("Bean must not be null");
    }
    return new McpPromptListChangedMethodCallback(
      this._bean,
      this._propertyKey,
    );
  }
}

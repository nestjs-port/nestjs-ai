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
import type { ProgressNotification } from "@modelcontextprotocol/server";
import type { McpProgressMetadata } from "../../mcp-progress.js";
import {
  AbstractMcpProgressMethodCallback,
  McpProgressMethodException,
} from "./abstract-mcp-progress-method-callback.js";

/**
 * Asynchronous implementation of a progress method callback.
 *
 * This class creates a Function that invokes a method annotated with `McpProgress`
 * asynchronously when a progress notification is received, returning a `Promise<void>`.
 */
export class McpProgressMethodCallback extends AbstractMcpProgressMethodCallback {
  constructor(bean: object, propertyKey: string | symbol) {
    super(bean, propertyKey);
  }

  protected override validateReturnType(): void {
    const returnType = Reflect.getMetadata(
      "design:returntype",
      this._target,
      this._propertyKey,
    ) as { name?: string } | undefined;

    // Check if return type is void or Promise<void>
    if (returnType === undefined) {
      // void is acceptable - we'll wrap it in Promise
      return;
    }

    if (returnType === Promise) {
      // Promise<void> is acceptable; the generic argument cannot be checked at runtime.
      return;
    }

    throw new Error(
      `Asynchronous progress methods must return void or Mono<Void>: ${this.methodName} in ${this.declaringClassName} returns ${returnType.name ?? "unknown"}`,
    );
  }

  /**
   * Apply the progress notification and process it asynchronously.
   *
   * This method builds the arguments for the method call and invokes the method,
   * returning a `Promise<void>`.
   * @param notification The progress notification, must not be null
   * @returns A Promise that resolves when the asynchronous operation completes
   * @throws McpProgressMethodException if there is an error invoking the progress method
   * @throws TypeError if the notification is null
   */
  async apply(notification: ProgressNotification): Promise<void> {
    if (notification == null) {
      throw new TypeError("Notification must not be null");
    }

    let result: unknown;
    try {
      // Build arguments for the method call
      const args = this.buildArgs(null, notification);

      // Invoke the method
      result = this._method.apply(this._bean, args);
    } catch (e) {
      throw new McpProgressMethodException(
        `Error invoking progress method: ${this.methodName}`,
        { cause: e },
      );
    }

    // Handle return type
    if (result instanceof Promise) {
      await result;
    }
    // void return type
  }

  /**
   * Create a new builder.
   * @returns A new builder instance
   */
  static builder(): McpProgressMethodCallbackBuilder {
    return new McpProgressMethodCallbackBuilder();
  }
}

/**
 * Builder for creating McpProgressMethodCallback instances.
 *
 * This builder provides a fluent API for constructing McpProgressMethodCallback
 * instances with the required parameters.
 */
export class McpProgressMethodCallbackBuilder {
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
   * Set the progress annotation metadata.
   * @param _progress The progress metadata
   * @returns This builder
   */
  progress(_progress: McpProgressMetadata): this {
    // No additional configuration needed from the annotation at this time
    return this;
  }

  /**
   * Build the callback.
   * @returns A new McpProgressMethodCallback instance
   */
  build(): McpProgressMethodCallback {
    if (this._propertyKey == null) {
      throw new Error("Method must not be null");
    }
    if (this._bean == null) {
      throw new Error("Bean must not be null");
    }
    return new McpProgressMethodCallback(this._bean, this._propertyKey);
  }
}

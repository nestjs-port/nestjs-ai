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

import type {
  CreateMessageRequest,
  CreateMessageResult,
} from "@modelcontextprotocol/server";

import type { McpSamplingMetadata } from "../../mcp-sampling.js";
import {
  AbstractMcpSamplingMethodCallback,
  McpSamplingMethodException,
} from "./abstract-mcp-sampling-method-callback.js";

/**
 * Promise-based implementation of a sampling method callback.
 */
export class McpSamplingMethodCallback extends AbstractMcpSamplingMethodCallback {
  constructor(bean: object, propertyKey: string | symbol) {
    super(bean, propertyKey);
  }

  async apply(request: CreateMessageRequest): Promise<CreateMessageResult> {
    if (request == null) {
      throw new TypeError("Request must not be null");
    }

    try {
      const args = this.buildArgs(request);
      const result = await Promise.resolve(
        this._method.apply(this._bean, args),
      );

      if (result == null || typeof result !== "object") {
        throw new TypeError(
          `Method must return CreateMessageResult or Promise<CreateMessageResult>: ${this.methodName}`,
        );
      }

      return result as CreateMessageResult;
    } catch (error) {
      throw new McpSamplingMethodException(
        `Error invoking sampling method: ${this.methodName}`,
        { cause: error instanceof Error ? error : undefined },
      );
    }
  }

  protected override validateReturnType(): void {
    const returnType = Reflect.getMetadata(
      "design:returntype",
      this._target,
      this._propertyKey,
    ) as { name?: string } | undefined;

    if (returnType === Promise || returnType === Object) {
      return;
    }

    throw new Error(
      `Method must return CreateMessageResult or Promise<CreateMessageResult>: ${this.methodName} in ${this.declaringClassName} returns ${returnType?.name ?? "unknown"}`,
    );
  }

  protected override isExchangeType(_paramType: unknown): boolean {
    return false;
  }

  static builder(): McpSamplingMethodCallbackBuilder {
    return new McpSamplingMethodCallbackBuilder();
  }
}

/**
 * Builder for creating McpSamplingMethodCallback instances.
 */
export class McpSamplingMethodCallbackBuilder {
  private _bean: object | null = null;

  private _propertyKey: string | symbol | null = null;

  method(propertyKey: string | symbol | null): this {
    this._propertyKey = propertyKey;
    return this;
  }

  bean(bean: object | null): this {
    this._bean = bean;
    return this;
  }

  sampling(_sampling: McpSamplingMetadata): this {
    return this;
  }

  build(): McpSamplingMethodCallback {
    if (this._propertyKey == null) {
      throw new Error("Method must not be null");
    }
    if (this._bean == null) {
      throw new Error("Bean must not be null");
    }

    return new McpSamplingMethodCallback(this._bean, this._propertyKey);
  }
}

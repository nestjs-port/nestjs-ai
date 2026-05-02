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
  GetPromptRequest,
  GetPromptResult,
  Prompt,
} from "@modelcontextprotocol/server";

import type { McpServerExchange } from "../../context/index.js";
import {
  AbstractMcpPromptMethodCallback,
  McpPromptMethodException,
} from "./abstract-mcp-prompt-method-callback.js";

/**
 * Asynchronous implementation of a prompt method callback.
 *
 * This class converts methods annotated with `McpPrompt` into callback functions that
 * return a `Promise<GetPromptResult>`.
 */
export class McpPromptMethodCallback extends AbstractMcpPromptMethodCallback {
  constructor(bean: object, propertyKey: string | symbol, prompt: Prompt) {
    super({ bean, propertyKey, prompt });
  }

  protected override validateReturnType(): void {
    const returnType = Reflect.getMetadata(
      "design:returntype",
      this._target,
      this._propertyKey,
    ) as { name?: string } | undefined;

    if (
      returnType === Promise ||
      returnType === String ||
      returnType === Array ||
      returnType === Object
    ) {
      return;
    }

    throw new Error(
      `Method must return GetPromptResult, PromptMessage, List<PromptMessage>, String, List<String>, or Promise<T>: ${this.methodName} in ${this.declaringClassName} returns ${returnType?.name ?? "unknown"}`,
    );
  }

  async apply(
    exchange: McpServerExchange | null,
    request: GetPromptRequest,
  ): Promise<GetPromptResult> {
    if (request == null) {
      throw new TypeError("Request must not be null");
    }

    try {
      const args = this.buildArgs(exchange, request);
      const result = await Promise.resolve(
        this._method.apply(this._bean, args),
      );
      return this.convertToGetPromptResult(result);
    } catch (error) {
      throw new McpPromptMethodException(
        `Error invoking prompt method: ${this.methodName}`,
        { cause: error instanceof Error ? error : undefined },
      );
    }
  }

  static builder(): McpPromptMethodCallbackBuilder {
    return new McpPromptMethodCallbackBuilder();
  }
}

/**
 * Builder for creating McpPromptMethodCallback instances.
 */
export class McpPromptMethodCallbackBuilder {
  private _bean: object | null = null;

  private _propertyKey: string | symbol | null = null;

  private _prompt: Prompt | null = null;

  method(propertyKey: string | symbol | null): this {
    this._propertyKey = propertyKey;
    return this;
  }

  bean(bean: object | null): this {
    this._bean = bean;
    return this;
  }

  prompt(prompt: Prompt | null): this {
    this._prompt = prompt;
    return this;
  }

  build(): McpPromptMethodCallback {
    if (this._propertyKey == null) {
      throw new Error("Method must not be null");
    }
    if (this._bean == null) {
      throw new Error("Bean must not be null");
    }
    if (this._prompt == null) {
      throw new Error("Prompt must not be null");
    }

    return new McpPromptMethodCallback(
      this._bean,
      this._propertyKey,
      this._prompt,
    );
  }
}

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
import type { CreateMessageRequest } from "@modelcontextprotocol/server";

export class McpSamplingMethodException extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "McpSamplingMethodException";
  }
}

/**
 * Abstract base class for creating callbacks around sampling methods.
 */
export abstract class AbstractMcpSamplingMethodCallback {
  protected readonly _bean: object;

  protected readonly _propertyKey: string | symbol;

  protected readonly _target: object;

  protected readonly _method: (...args: unknown[]) => unknown;

  protected constructor(bean: object, propertyKey: string | symbol) {
    assert(propertyKey != null, "Method can't be null!");
    assert(bean != null, "Bean can't be null!");

    this._bean = bean;
    this._propertyKey = propertyKey;
    this._target = Object.getPrototypeOf(bean) as object;

    const candidate = (bean as Record<string | symbol, unknown>)[propertyKey];
    if (typeof candidate !== "function") {
      throw new Error(
        `Method must not be null: ${String(propertyKey)} in ${this.declaringClassName}`,
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

  protected validateMethod(): void {
    this.validateReturnType();
    this.validateParameters();
  }

  protected abstract validateReturnType(): void;

  protected validateParameters(): void {
    const paramTypes =
      (Reflect.getMetadata(
        "design:paramtypes",
        this._target,
        this._propertyKey,
      ) as unknown[] | undefined) ?? [];

    if (paramTypes.length < 1) {
      throw new Error(
        `Method must have at least 1 parameter (CreateMessageRequest): ${this.methodName} in ${this.declaringClassName} has ${paramTypes.length} parameters`,
      );
    }

    if (paramTypes.length !== 1) {
      throw new Error(
        `Currently only methods with a single CreateMessageRequest parameter are supported: ${this.methodName} in ${this.declaringClassName} has ${paramTypes.length} parameters`,
      );
    }

    const paramType = paramTypes[0] as { name?: string } | undefined;
    if (paramType !== Object) {
      throw new Error(
        `Single parameter must be of type CreateMessageRequest: ${this.methodName} in ${this.declaringClassName} has parameter of type ${paramType?.name ?? "unknown"}`,
      );
    }
  }

  protected buildArgs(request: CreateMessageRequest): unknown[] {
    return [request];
  }

  protected abstract isExchangeType(paramType: unknown): boolean;
}

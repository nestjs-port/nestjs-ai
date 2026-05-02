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

import type {
  CompleteRequest,
  CompleteResult,
  ServerContext,
} from "@modelcontextprotocol/server";

import { McpServerExchange } from "../../context/index.js";
import type { McpCompleteMetadata } from "../../mcp-complete.js";

type CompleteCompletion = CompleteResult["completion"];
type CompleteMethodTarget = object;
type CompleteMethodPropertyKey = string | symbol;

interface CompleteMethodCallbackProps {
  bean: CompleteMethodTarget;
  propertyKey: CompleteMethodPropertyKey;
  complete: McpCompleteMetadata;
}

abstract class AbstractCompleteMethodCallback<TContext> {
  protected readonly _bean: CompleteMethodTarget;

  protected readonly _propertyKey: CompleteMethodPropertyKey;

  protected readonly _complete: McpCompleteMetadata;

  protected constructor(props: CompleteMethodCallbackProps) {
    assert(props.bean != null, "Bean can't be null!");
    assert(props.propertyKey != null, "Property key can't be null!");
    assert(props.complete != null, "Completion metadata can't be null!");

    this._bean = props.bean;
    this._propertyKey = props.propertyKey;
    this._complete = props.complete;

    this.validateMethod();
  }

  async apply(
    context: TContext,
    request: CompleteRequest,
  ): Promise<CompleteResult> {
    assert(request != null, "Request must not be null");

    try {
      const method = this.getMethod();
      const args = this.buildArgs(method, context, request);
      const result = await Promise.resolve(method.apply(this._bean, args));
      return this.toCompleteResult(result);
    } catch (error) {
      throw new Error(
        `Error invoking complete method: ${String(this._propertyKey)}`,
        { cause: error instanceof Error ? error : undefined },
      );
    }
  }

  protected abstract isContextType(paramType: unknown): boolean;

  protected abstract validateContextType(paramType: unknown): boolean;

  protected getMethod(): Function {
    const method = (this._bean as Record<string | symbol, unknown>)[
      this._propertyKey
    ];
    assert(
      typeof method === "function",
      `Method not found: ${String(this._propertyKey)}`,
    );
    return method as Function;
  }

  protected validateMethod(): void {
    const method = this.getMethod();
    if (method.constructor.name !== "AsyncFunction") {
      throw new Error(
        `Method must be async: ${String(this._propertyKey)} in ${this.getPrototype().constructor.name} returns ${method.constructor.name}`,
      );
    }

    this.validateParameters(method);
  }

  protected validateParameters(method: Function): void {
    const paramNames = this.getParameterNames(method);

    if (paramNames.length > 3) {
      throw new Error(
        `Method can have at most 3 input parameters: ${String(this._propertyKey)} in ${this.getPrototype().constructor.name} has ${paramNames.length} parameters`,
      );
    }

    let contextCount = 0;
    let requestCount = 0;
    let argumentCount = 0;

    for (let index = 0; index < paramNames.length; index += 1) {
      const paramName = paramNames[index] ?? "";
      const role = this.getParamRole(paramName);

      if (role === "context") {
        contextCount += 1;
        if (contextCount > 1) {
          throw new Error(
            `Method cannot have more than one exchange parameter: ${String(this._propertyKey)} in ${this.getPrototype().constructor.name}`,
          );
        }
        continue;
      }

      if (role === "request") {
        requestCount += 1;
        if (requestCount > 1) {
          throw new Error(
            `Method cannot have more than one CompleteRequest parameter: ${String(this._propertyKey)} in ${this.getPrototype().constructor.name}`,
          );
        }
        continue;
      }

      if (role === "argument") {
        argumentCount += 1;
        if (argumentCount > 1) {
          throw new Error(
            `Method cannot have more than one CompleteArgument parameter: ${String(this._propertyKey)} in ${this.getPrototype().constructor.name}`,
          );
        }
        continue;
      }

      void paramName;
    }
  }

  protected buildArgs(
    method: Function,
    context: TContext,
    request: CompleteRequest,
  ): unknown[] {
    const paramNames = this.getParameterNames(method);
    const args: unknown[] = [];

    let requestAssigned = false;
    let argumentAssigned = false;

    for (let index = 0; index < paramNames.length; index += 1) {
      const paramName = (paramNames[index] ?? "").toLowerCase();

      if (this.isContextName(paramName)) {
        args.push(context);
        continue;
      }

      if (this.isValueName(paramName)) {
        args.push(request.params.argument.value);
        continue;
      }

      if (this.isArgumentName(paramName) && !argumentAssigned) {
        args.push(request.params.argument);
        argumentAssigned = true;
        continue;
      }

      if (this.isRequestName(paramName) && !requestAssigned) {
        args.push(request);
        requestAssigned = true;
        continue;
      }

      if (!requestAssigned) {
        args.push(request);
        requestAssigned = true;
      } else if (!argumentAssigned) {
        args.push(request.params.argument);
        argumentAssigned = true;
      } else {
        args.push(request.params.argument.value);
      }
    }

    return args;
  }

  protected toCompleteResult(result: unknown): CompleteResult {
    if (result == null) {
      return this.createCompleteResult([]);
    }

    if (this.isCompleteResult(result)) {
      return result;
    }

    if (this.isCompleteCompletion(result)) {
      return { completion: result };
    }

    if (Array.isArray(result)) {
      const values = result.map((item) => {
        if (typeof item !== "string") {
          throw new Error("List items must be of type String");
        }
        return item;
      });
      return this.createCompleteResult(values);
    }

    if (typeof result === "string") {
      return this.createCompleteResult([result]);
    }

    throw new Error(`Unsupported return type: ${this.getTypeName(result)}`);
  }

  protected createCompleteResult(values: string[]): CompleteResult {
    return {
      completion: {
        values,
        total: values.length,
        hasMore: false,
      },
    };
  }

  protected getParameterTypes(): unknown[] {
    return [];
  }

  protected getPrototype(): object {
    return Object.getPrototypeOf(this._bean);
  }

  protected getParameterNames(method: Function): string[] {
    const source = Function.prototype.toString.call(method);
    const cleaned = source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    const match = cleaned.match(/^[^(]*\(([^)]*)\)/s);
    if (match == null || match[1].trim().length === 0) {
      return [];
    }

    return match[1]
      .split(",")
      .map((part) => part.trim())
      .map((part) => part.replace(/=.*$/, "").replace(/^\.\.\./, ""))
      .filter((part) => part.length > 0);
  }

  protected getTypeName(value: unknown): string {
    if (value == null) {
      return "unknown";
    }
    if (typeof value === "function" && value.name.length > 0) {
      return value.name;
    }
    if (typeof value === "object" && value.constructor?.name) {
      return value.constructor.name;
    }
    return typeof value;
  }

  protected isCompleteResult(value: unknown): value is CompleteResult {
    return typeof value === "object" && value !== null && "completion" in value;
  }

  protected isCompleteCompletion(value: unknown): value is CompleteCompletion {
    return (
      typeof value === "object" &&
      value !== null &&
      "values" in value &&
      Array.isArray((value as { values?: unknown }).values)
    );
  }

  protected isContextName(name: string): boolean {
    return name.includes("exchange") || name.includes("context");
  }

  protected isRequestName(name: string): boolean {
    return name.includes("request");
  }

  protected isArgumentName(name: string): boolean {
    return name.includes("argument");
  }

  protected isValueName(name: string): boolean {
    return name === "value" || name.endsWith("value");
  }

  protected getParamRole(paramName: string): string {
    if (this.isContextName(paramName)) {
      return "context";
    }
    if (this.isRequestName(paramName)) {
      return "request";
    }
    if (this.isArgumentName(paramName)) {
      return "argument";
    }
    if (this.isValueName(paramName)) {
      return "value";
    }
    return "unknown";
  }
}

export interface McpCompleteMethodCallbackProps {
  bean: CompleteMethodTarget;
  propertyKey: CompleteMethodPropertyKey;
  complete: McpCompleteMetadata;
}

export class McpCompleteMethodCallback extends AbstractCompleteMethodCallback<McpServerExchange> {
  constructor(props: McpCompleteMethodCallbackProps) {
    super(props);
  }

  protected isContextType(paramType: unknown): boolean {
    return paramType === McpServerExchange;
  }

  protected validateContextType(paramType: unknown): boolean {
    return this.isContextType(paramType);
  }
}

export class McpStatelessCompleteMethodCallback extends AbstractCompleteMethodCallback<ServerContext> {
  constructor(props: McpCompleteMethodCallbackProps) {
    super(props);
  }

  protected isContextType(_paramType: unknown): boolean {
    return false;
  }

  protected validateContextType(paramType: unknown): boolean {
    return paramType === Object;
  }
}

export type { CompleteCompletion };

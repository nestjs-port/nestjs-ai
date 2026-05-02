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
  GetPromptRequest,
  GetPromptResult,
  Prompt,
  PromptMessage,
  TextContent,
} from "@modelcontextprotocol/server";

import { McpMeta } from "../../mcp-meta.js";
import { MCP_ARG_METADATA_KEY } from "../../metadata.js";
import type { McpArgMetadata } from "../../mcp-arg.js";
import type { McpServerExchange } from "../../context/mcp-server-exchange.js";

export interface AbstractMcpPromptMethodCallbackProps {
  bean: object;
  propertyKey: string | symbol;
  prompt: Prompt;
}

export class McpPromptMethodException extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "McpPromptMethodException";
  }
}

/**
 * Abstract base class for creating callbacks around prompt methods.
 */
export abstract class AbstractMcpPromptMethodCallback {
  protected readonly _bean: object;

  protected readonly _propertyKey: string | symbol;

  protected readonly _target: object;

  protected readonly _method: (...args: unknown[]) => unknown;

  protected readonly _prompt: Prompt;

  protected constructor(props: AbstractMcpPromptMethodCallbackProps) {
    assert(props.propertyKey != null, "Method can't be null!");
    assert(props.bean != null, "Bean can't be null!");
    assert(props.prompt != null, "Prompt can't be null!");

    this._bean = props.bean;
    this._propertyKey = props.propertyKey;
    this._prompt = props.prompt;
    this._target = Object.getPrototypeOf(props.bean) as object;

    const candidate = (props.bean as Record<string | symbol, unknown>)[
      props.propertyKey
    ];
    if (typeof candidate !== "function") {
      throw new Error(
        `Method must not be null: ${String(props.propertyKey)} in ${this.declaringClassName}`,
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
        `Method must have at least 1 parameter: ${this.methodName} in ${this.declaringClassName} has ${paramTypes.length} parameters`,
      );
    }

    const paramNames = this.getParameterNames(this._method);
    let requestCount = 0;
    let contextCount = 0;
    let metaCount = 0;
    let argumentsCount = 0;

    for (let index = 0; index < paramTypes.length; index += 1) {
      const paramType = paramTypes[index];
      const paramName = (paramNames[index] ?? "").toLowerCase();

      if (this.isRequestName(paramName) || this.isRequestType(paramType)) {
        requestCount += 1;
        if (requestCount > 1) {
          throw new Error(
            `Method cannot have more than one GetPromptRequest parameter: ${this.methodName} in ${this.declaringClassName}`,
          );
        }
        continue;
      }

      if (this.isContextName(paramName) || this.isContextType(paramType)) {
        contextCount += 1;
        if (contextCount > 1) {
          throw new Error(
            `Method cannot have more than one request context parameter: ${this.methodName} in ${this.declaringClassName}`,
          );
        }
        continue;
      }

      if (this.isMetaType(paramType)) {
        metaCount += 1;
        if (metaCount > 1) {
          throw new Error(
            `Method cannot have more than one McpMeta parameter: ${this.methodName} in ${this.declaringClassName}`,
          );
        }
        continue;
      }

      if (this.isArgumentsType(paramType)) {
        argumentsCount += 1;
        if (argumentsCount > 1) {
          throw new Error(
            `Method cannot have more than one Map parameter: ${this.methodName} in ${this.declaringClassName}`,
          );
        }
      }
    }
  }

  protected buildArgs(
    exchange: McpServerExchange | null,
    request: GetPromptRequest,
  ): unknown[] {
    const paramTypes =
      (Reflect.getMetadata(
        "design:paramtypes",
        this._target,
        this._propertyKey,
      ) as unknown[] | undefined) ?? [];
    const paramNames = this.getParameterNames(this._method);
    const args: unknown[] = [];

    for (let index = 0; index < paramTypes.length; index += 1) {
      const paramType = paramTypes[index];
      const paramName = (paramNames[index] ?? "").toLowerCase();

      if (this.isContextName(paramName) || this.isContextType(paramType)) {
        args.push(this.buildContextValue(exchange));
        continue;
      }

      if (this.isRequestName(paramName) || this.isRequestType(paramType)) {
        args.push(request);
        continue;
      }

      if (this.isMetaType(paramType)) {
        args.push(new McpMeta(request.params._meta ?? null));
        continue;
      }

      if (this.isArgumentsType(paramType)) {
        args.push(new Map(Object.entries(request.params.arguments ?? {})));
        continue;
      }

      const argumentsMap = request.params.arguments ?? {};
      const metadata = this.getArgumentMetadata(index);
      const argumentName =
        metadata?.name != null && metadata.name.trim().length > 0
          ? metadata.name
          : paramName;
      const value =
        argumentName in argumentsMap ? argumentsMap[argumentName] : null;
      args.push(this.convertArgumentValue(value, paramType));
    }

    return args;
  }

  protected convertToGetPromptResult(result: unknown): GetPromptResult {
    if (this.isGetPromptResult(result)) {
      return result;
    }

    if (Array.isArray(result)) {
      if (result.length === 0) {
        return { messages: [] };
      }

      if (typeof result[0] === "string") {
        return { messages: this.toPromptMessages(result as string[]) };
      }

      return { messages: result as PromptMessage[] };
    }

    if (this.isPromptMessage(result)) {
      return { messages: [result] };
    }

    if (typeof result === "string") {
      return { messages: this.toPromptMessages([result]) };
    }

    throw new Error(
      `Unsupported result type: ${result == null ? "null" : this.getTypeName(result)}`,
    );
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

  protected getArgumentMetadata(index: number): McpArgMetadata | undefined {
    const metadataByIndex =
      (Reflect.getMetadata(
        MCP_ARG_METADATA_KEY,
        this._target,
        this._propertyKey,
      ) as Record<number, McpArgMetadata> | undefined) ?? {};
    return metadataByIndex[index];
  }

  protected convertArgumentValue(value: unknown, targetType: unknown): unknown {
    if (value == null) {
      return null;
    }

    if (targetType === String) {
      return String(value);
    }
    if (targetType === Number) {
      return typeof value === "number" ? value : Number(value);
    }
    if (targetType === Boolean) {
      return typeof value === "boolean" ? value : value === "true";
    }

    return value;
  }

  protected toPromptMessages(values: string[]): PromptMessage[] {
    return values.map((text) => ({
      role: "assistant",
      content: { type: "text", text } as TextContent,
    }));
  }

  protected isGetPromptResult(value: unknown): value is GetPromptResult {
    return typeof value === "object" && value != null && "messages" in value;
  }

  protected isPromptMessage(value: unknown): value is PromptMessage {
    return (
      typeof value === "object" &&
      value != null &&
      "role" in value &&
      "content" in value
    );
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

  protected isContextName(name: string): boolean {
    return name.includes("exchange") || name.includes("context");
  }

  protected isRequestName(name: string): boolean {
    return name.includes("request");
  }

  protected isRequestType(_paramType: unknown): boolean {
    return false;
  }

  protected isContextType(paramType: unknown): boolean {
    return paramType === Object;
  }

  protected isMetaType(paramType: unknown): boolean {
    return paramType === McpMeta;
  }

  protected isArgumentsType(paramType: unknown): boolean {
    return paramType === Map;
  }

  protected buildContextValue(exchange: McpServerExchange | null): unknown {
    return exchange;
  }
}

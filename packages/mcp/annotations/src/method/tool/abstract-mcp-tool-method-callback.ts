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
  CallToolRequest,
  CallToolResult,
} from "@modelcontextprotocol/server";
import { McpMeta } from "../../mcp-meta.js";
import { MCP_PROGRESS_TOKEN_METADATA_KEY } from "../../metadata.js";
import { ReturnMode } from "./return-mode.js";

/**
 * Abstract base class for creating Function callbacks around tool methods.
 *
 * This class provides common functionality for converting methods annotated with
 * `McpTool` into callback functions that can be used to handle tool requests. It
 * contains all the shared logic between synchronous and asynchronous implementations.
 */
export abstract class AbstractMcpToolMethodCallback<TContext, TRequestContext> {
  protected readonly _bean: object;

  protected readonly _propertyKey: string | symbol;

  protected readonly _target: object;

  protected readonly _method: (...args: unknown[]) => unknown;

  protected readonly _returnMode: ReturnMode;

  protected constructor(
    returnMode: ReturnMode,
    bean: object,
    propertyKey: string | symbol,
  ) {
    this._returnMode = returnMode;
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
  }

  protected get methodName(): string {
    return typeof this._propertyKey === "string"
      ? this._propertyKey
      : this._propertyKey.toString();
  }

  protected get declaringClassName(): string {
    return this._bean.constructor?.name ?? "<anonymous>";
  }

  protected get paramTypes(): unknown[] {
    return (
      (Reflect.getMetadata(
        "design:paramtypes",
        this._target,
        this._propertyKey,
      ) as unknown[] | undefined) ?? []
    );
  }

  protected get paramNames(): string[] {
    const source = Function.prototype.toString.call(this._method);
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

  protected get progressTokenIndices(): Set<number> {
    const map =
      (Reflect.getMetadata(
        MCP_PROGRESS_TOKEN_METADATA_KEY,
        this._target,
        this._propertyKey,
      ) as Record<number, true> | undefined) ?? {};
    return new Set(Object.keys(map).map((index) => Number(index)));
  }

  /**
   * Invokes the tool method with the provided arguments.
   * @param methodArguments The arguments to pass to the method
   * @returns The result of the method invocation
   */
  protected callMethod(methodArguments: unknown[]): unknown {
    try {
      return this._method.apply(this._bean, methodArguments);
    } catch (ex) {
      throw new Error(`Error invoking method: ${this.methodName}`, {
        cause: ex,
      });
    }
  }

  /**
   * Builds the method arguments from the context, tool input arguments, and optionally
   * the full request.
   */
  protected buildMethodArguments(
    exchangeOrContext: TContext,
    toolInputArguments: Record<string, unknown>,
    request: CallToolRequest | null,
  ): unknown[] {
    const paramTypes = this.paramTypes;
    const paramNames = this.paramNames;
    const progressTokens = this.progressTokenIndices;
    const args: unknown[] = Array.from({ length: paramTypes.length });

    for (let i = 0; i < paramTypes.length; i += 1) {
      const paramType = paramTypes[i];
      const paramName = paramNames[i] ?? "";

      if (this.isRequestContextName(paramName)) {
        args[i] = this.createRequestContext(exchangeOrContext, request);
        continue;
      }

      // Check if parameter is annotated with @McpProgressToken
      if (progressTokens.has(i)) {
        args[i] =
          (request?.params._meta as { progressToken?: unknown } | undefined)
            ?.progressToken ?? null;
        continue;
      }

      // Check if parameter is McpMeta type
      if (paramType === McpMeta) {
        args[i] = new McpMeta(
          (request?.params._meta as Record<string, unknown> | undefined) ??
            null,
        );
        continue;
      }

      // Check if parameter is CallToolRequest type (interface, identified by name)
      if (
        paramType === Object &&
        (paramName.toLowerCase() === "request" ||
          paramName.toLowerCase() === "req")
      ) {
        args[i] = request;
        continue;
      }

      // Check if parameter is the exchange or context type
      if (this.isExchangeOrContextType(paramType)) {
        args[i] = exchangeOrContext;
        continue;
      }

      // Otherwise, look up the value from the tool input arguments by name.
      args[i] = this.buildTypedArgument(toolInputArguments[paramName]);
    }

    return args;
  }

  /**
   * Builds a typed argument from a raw value. TypeScript erases generics at runtime,
   * so unlike Java this implementation passes through the parsed value without further
   * conversion.
   */
  protected buildTypedArgument(value: unknown): unknown {
    return value ?? null;
  }

  /**
   * Converts a method result value to a CallToolResult based on the return mode and
   * type. This method contains the common logic for processing results that is shared
   * between synchronous and asynchronous implementations.
   */
  protected convertValueToCallToolResult(result: unknown): CallToolResult {
    // Return the result if it's already a CallToolResult
    if (this.isCallToolResult(result)) {
      return result;
    }

    if (this._returnMode === ReturnMode.VOID || result === undefined) {
      return {
        content: [{ type: "text", text: JSON.stringify("Done") }],
      };
    }

    if (this._returnMode === ReturnMode.STRUCTURED) {
      return {
        content: [],
        structuredContent: result as Record<string, unknown>,
      };
    }

    // Default to text output
    if (result == null) {
      return { content: [{ type: "text", text: "null" }] };
    }

    // For string results in TEXT mode, return the string directly without JSON
    // serialization
    if (typeof result === "string") {
      return { content: [{ type: "text", text: result }] };
    }

    // For other types, serialize to JSON
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }

  /**
   * Creates the base error message for exceptions that occur during method invocation.
   */
  protected createErrorMessage(error: unknown): string {
    const message =
      error instanceof Error ? error.message : String(error ?? "");
    return `Error invoking method: ${message}`;
  }

  /**
   * Determines if the given parameter type is an exchange or context type that should
   * be injected.
   */
  protected abstract isExchangeOrContextType(paramType: unknown): boolean;

  /**
   * Determines whether the given parameter name refers to the request context.
   */
  protected isRequestContextName(name: string): boolean {
    const lower = name.toLowerCase();
    return (
      lower === "ctx" ||
      lower === "context" ||
      lower.endsWith("requestcontext") ||
      lower.endsWith("context")
    );
  }

  protected findCauseUsingPlainJava(throwable: Error): Error {
    let rootCause: Error = throwable;
    while (rootCause.cause instanceof Error && rootCause.cause !== rootCause) {
      rootCause = rootCause.cause;
    }
    return rootCause;
  }

  protected isCallToolResult(value: unknown): value is CallToolResult {
    return (
      typeof value === "object" &&
      value !== null &&
      "content" in value &&
      Array.isArray((value as { content: unknown }).content)
    );
  }

  protected abstract createRequestContext(
    exchange: TContext,
    request: CallToolRequest | null,
  ): TRequestContext;

  /**
   * Resolves the transport context from the exchange or context object.
   */
  protected abstract resolveTransportContext(
    exchangeOrContext: TContext,
  ): unknown;
}

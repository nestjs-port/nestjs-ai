/*
 * Copyright 2026-present the original author or authors.
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

import type {
  CallToolRequest,
  CallToolResult,
} from "@modelcontextprotocol/server";

import type {
  McpRequestContext,
  McpTransportContext,
} from "../../context/index.js";
import { McpMeta } from "../../mcp-meta.js";
import type { McpToolMethodArguments } from "./mcp-tool-method-arguments.js";
import { ReturnMode } from "./return-mode.js";

export interface AbstractMcpToolMethodCallbackProps {
  provider: object;
  propertyKey: string | symbol;
  returnMode: ReturnMode;
  toolCallExceptionClass?: new (...args: never[]) => Error;
}

/**
 * Abstract base class for creating callbacks around tool methods.
 *
 * This class provides common functionality for converting methods annotated with
 * `@McpTool` into callback functions that can be used to handle tool requests. It
 * contains all the shared logic between stateful and stateless implementations.
 */
export abstract class AbstractMcpToolMethodCallback<TContext> {
  protected readonly _provider: object;

  protected readonly _propertyKey: string | symbol;

  protected readonly _method: (...args: unknown[]) => unknown;

  protected readonly _returnMode: ReturnMode;

  protected readonly _toolCallExceptionClass: new (...args: never[]) => Error;

  protected constructor(props: AbstractMcpToolMethodCallbackProps) {
    assert(props.provider != null, "Provider can't be null!");
    assert(props.propertyKey != null, "Property key can't be null!");
    assert(props.returnMode != null, "Return mode can't be null!");

    this._provider = props.provider;
    this._propertyKey = props.propertyKey;
    this._returnMode = props.returnMode;
    this._toolCallExceptionClass = props.toolCallExceptionClass ?? Error;
    this._method = this.resolveMethod();
  }

  protected get methodName(): string {
    return typeof this._propertyKey === "string"
      ? this._propertyKey
      : this._propertyKey.toString();
  }

  protected get declaringClassName(): string {
    return this._provider.constructor?.name ?? "<anonymous>";
  }

  protected resolveMethod(): (...args: unknown[]) => unknown {
    const candidate = (this._provider as Record<string | symbol, unknown>)[
      this._propertyKey
    ];
    assert(
      typeof candidate === "function",
      `Method not found: ${String(this._propertyKey)} in ${this.declaringClassName}`,
    );
    return candidate as (...args: unknown[]) => unknown;
  }

  /**
   * Builds the single arguments object that is passed to the user method.
   */
  protected buildArgs(
    exchangeOrContext: TContext,
    request: CallToolRequest,
  ): McpToolMethodArguments {
    const meta =
      (request.params._meta as Record<string, unknown> | undefined) ?? null;
    const progressToken =
      (meta as { progressToken?: unknown } | null)?.progressToken ?? null;

    const args: McpToolMethodArguments = {
      context: this.resolveTransportContext(exchangeOrContext),
      request,
      arguments: { ...request.params.arguments },
      meta: new McpMeta(meta),
      progressToken,
    };

    if (this.isExchangeType(exchangeOrContext)) {
      args.exchange = exchangeOrContext as never;
    }

    const requestContext = this.createRequestContext(
      exchangeOrContext,
      request,
    );
    if (requestContext !== undefined) {
      args.requestContext = requestContext;
    }

    return args;
  }

  /**
   * Invokes the underlying method with the prebuilt arguments object.
   */
  protected callMethod(args: McpToolMethodArguments): unknown {
    return this._method.apply(this._provider, [args]);
  }

  /**
   * Converts a method result value to a CallToolResult based on the return mode.
   *
   * Mirrors the Java implementation: if the result is already a CallToolResult, pass
   * it through; for VOID return mode (or undefined results) emit a JSON `"Done"` text
   * block; for STRUCTURED emit a structuredContent block; otherwise serialize to
   * text content (strings pass through, other values are JSON serialized).
   */
  protected convertValueToCallToolResult(result: unknown): CallToolResult {
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

    if (result === null) {
      return { content: [{ type: "text", text: "null" }] };
    }

    if (typeof result === "string") {
      return { content: [{ type: "text", text: result }] };
    }

    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }

  /**
   * Awaits a possibly-async result and converts it to a CallToolResult.
   */
  protected async convertToCallToolResult(
    result: unknown,
  ): Promise<CallToolResult> {
    const resolved = result instanceof Promise ? await result : result;
    return this.convertValueToCallToolResult(resolved);
  }

  /**
   * Walks the cause chain to surface the deepest cause for error messages.
   */
  protected findRootCause(error: Error): Error {
    let rootCause: Error = error;
    while (rootCause.cause instanceof Error && rootCause.cause !== rootCause) {
      rootCause = rootCause.cause;
    }
    return rootCause;
  }

  /**
   * Builds an error CallToolResult mirroring the Java sync error formatter.
   */
  protected createErrorResult(error: Error): CallToolResult {
    const rootCause = this.findRootCause(error);
    const text =
      rootCause === error || rootCause.message === error.message
        ? error.message
        : `${error.message}\n${rootCause.message}`;
    return {
      content: [{ type: "text", text }],
      isError: true,
    };
  }

  protected isCallToolResult(value: unknown): value is CallToolResult {
    return (
      typeof value === "object" &&
      value !== null &&
      "content" in value &&
      Array.isArray((value as { content: unknown }).content)
    );
  }

  /**
   * Determines whether the supplied object is the exchange/context type used to
   * populate `args.exchange`.
   */
  protected abstract isExchangeType(value: unknown): boolean;

  /**
   * Creates a request context for stateful callbacks. Stateless implementations may
   * return `null` (or `undefined` to omit the field entirely).
   */
  protected abstract createRequestContext(
    exchangeOrContext: TContext,
    request: CallToolRequest,
  ): McpRequestContext | null | undefined;

  /**
   * Resolves the transport context from the exchange or context object.
   */
  protected abstract resolveTransportContext(
    exchangeOrContext: TContext,
  ): McpTransportContext | null;
}

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

import assert from "node:assert/strict";
import "reflect-metadata";

import type {
  CompleteRequest,
  CompleteResult,
  McpServer,
  ServerContext,
} from "@modelcontextprotocol/server";
import { McpServerExchange, McpTransportContext } from "@nestjs-ai/mcp-common";

import { CompleteAdapter } from "../../adapter/index.js";
import { McpMeta } from "../../mcp-meta.js";
import type {
  McpCompleteMetadata,
  McpCompleteMethodArguments,
} from "../../mcp-complete.js";

/**
 * Tuple compatible with internal completion-registration dispatch.
 */
export type CompleteRegistration = [
  reference: ReturnType<typeof CompleteAdapter.asCompleteReference>,
  callback: (
    request: CompleteRequest,
    ctx: ServerContext,
  ) => Promise<CompleteResult>,
];

export interface McpCompleteMethodCallbackProps {
  provider: object;
  propertyKey: string | symbol;
  complete: McpCompleteMetadata;
  mcpServer: McpServer;
}

export class McpCompleteMethodException extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = "McpCompleteMethodException";
  }
}

/**
 * Adapts a method annotated with `@McpComplete` to the internal completion
 * registration shape used by the MCP annotations package.
 *
 * `apply()` produces a tuple containing the completion reference and a
 * callback. The callback builds a fresh transport context and exchange from
 * the {@link ServerContext} the SDK supplies, then dispatches the annotated
 * method.
 */
export class McpCompleteMethodCallback {
  private readonly _provider: object;

  private readonly _propertyKey: string | symbol;

  private readonly _method: (...args: unknown[]) => unknown;

  private readonly _complete: McpCompleteMetadata;

  private readonly _mcpServer: McpServer;

  constructor(props: McpCompleteMethodCallbackProps) {
    assert(props.provider != null, "Provider can't be null!");
    assert(props.propertyKey != null, "Property key can't be null!");
    assert(props.complete != null, "Completion metadata can't be null!");
    assert(props.mcpServer != null, "mcpServer can't be null!");

    this._provider = props.provider;
    this._propertyKey = props.propertyKey;
    this._complete = props.complete;
    this._mcpServer = props.mcpServer;
    this._method = this.resolveMethod();
  }

  /**
   * Build the registration tuple for the annotated completion method.
   */
  apply(): CompleteRegistration {
    const reference = CompleteAdapter.asCompleteReference(this._complete);
    const callback = async (
      request: CompleteRequest,
      ctx: ServerContext,
    ): Promise<CompleteResult> => {
      const transportContext = McpTransportContext.EMPTY;
      const exchange = new McpServerExchange(
        this._mcpServer,
        ctx,
        transportContext,
      );

      return this.handleWithExchange(exchange, request);
    };

    return [reference, callback];
  }

  /**
   * Per-request handler. Invoked once per completion request.
   *
   * Constructs a fresh transport context and exchange, then calls the
   * underlying user method.
   */
  async handle(
    request: CompleteRequest,
    ctx: ServerContext,
  ): Promise<CompleteResult> {
    assert(request != null, "Request must not be null");

    const transportContext = McpTransportContext.EMPTY;
    const exchange = new McpServerExchange(
      this._mcpServer,
      ctx,
      transportContext,
    );

    return this.handleWithExchange(exchange, request);
  }

  protected async handleWithExchange(
    exchange: McpServerExchange,
    request: CompleteRequest,
  ): Promise<CompleteResult> {
    try {
      const args = this.buildArgs(exchange, request);
      const result = await this._method.apply(this._provider, [args]);
      return this.toCompleteResult(result);
    } catch (error) {
      if (error instanceof McpCompleteMethodException) {
        throw error;
      }
      throw new McpCompleteMethodException(
        `Error invoking completion method: ${this.methodName}`,
        { cause: error instanceof Error ? error : undefined },
      );
    }
  }

  protected buildArgs(
    context: unknown,
    request: CompleteRequest,
  ): McpCompleteMethodArguments {
    const argument = request.params.argument;
    return {
      exchange: this.isExchangeType(context) ? (context as never) : undefined,
      context: this.resolveTransportContext(context),
      request,
      argument,
      value: argument.value,
      meta: new McpMeta(request.params._meta ?? null),
      progressToken: request.params._meta?.progressToken ?? null,
    };
  }

  protected resolveTransportContext(
    exchangeOrContext: unknown,
  ): McpTransportContext | null {
    if (exchangeOrContext instanceof McpServerExchange) {
      return exchangeOrContext.transportContext();
    }
    return null;
  }

  protected isExchangeType(paramType: unknown): boolean {
    return paramType instanceof McpServerExchange;
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

  protected resolveMethod(): (...args: unknown[]) => unknown {
    const candidate = (this._provider as Record<string | symbol, unknown>)[
      this._propertyKey
    ];
    assert(
      typeof candidate === "function",
      `Method not found: ${String(this._propertyKey)}`,
    );
    return candidate as (...args: unknown[]) => unknown;
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

  protected isCompleteCompletion(
    value: unknown,
  ): value is CompleteResult["completion"] {
    return (
      typeof value === "object" &&
      value !== null &&
      "values" in value &&
      Array.isArray((value as { values?: unknown }).values)
    );
  }

  private get methodName(): string {
    return typeof this._propertyKey === "string"
      ? this._propertyKey
      : this._propertyKey.toString();
  }
}

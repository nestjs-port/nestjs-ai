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
import type {
  GetPromptResult,
  McpServer,
  PromptCallback,
  PromptMessage,
  ServerContext,
  StandardSchemaWithJSON,
  TextContent,
} from "@modelcontextprotocol/server";
import { McpServerExchange, McpTransportContext } from "@nestjs-ai/mcp-common";
import { MetaUtils } from "../../common/meta-utils.js";
import { McpMeta } from "../../mcp-meta.js";
import type {
  McpPromptMetadata,
  McpPromptMethodContext,
} from "../../mcp-prompt.js";

/**
 * Tuple compatible with `mcpServer.registerPrompt(...spec)` spread syntax.
 */
export type PromptRegistration = [
  name: string,
  config: Parameters<McpServer["registerPrompt"]>[1],
  callback: PromptCallback<StandardSchemaWithJSON | undefined>,
];

export interface McpPromptMethodCallbackProps {
  provider: object;
  propertyKey: string | symbol;
  metadata: McpPromptMetadata;
  mcpServer: McpServer;
}

export class McpPromptMethodException extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "McpPromptMethodException";
  }
}

/**
 * Adapts a method annotated with `@McpPrompt` to the shape required by
 * {@link McpServer.registerPrompt}.
 *
 * `apply()` produces a 3-tuple ready to spread into `registerPrompt`. The
 * callback inside that tuple invokes {@link handle} per request, building a
 * fresh {@link McpPromptMethodContext} from the {@link ServerContext} the SDK
 * supplies.
 */
export class McpPromptMethodCallback {
  private readonly _provider: object;

  private readonly _propertyKey: string | symbol;

  private readonly _method: (...args: unknown[]) => unknown;

  private readonly _metadata: McpPromptMetadata;

  private readonly _mcpServer: McpServer;

  constructor(props: McpPromptMethodCallbackProps) {
    assert(props.provider != null, "Provider can't be null!");
    assert(props.propertyKey != null, "Property key can't be null!");
    assert(props.metadata != null, "Metadata can't be null!");
    assert(props.mcpServer != null, "mcpServer can't be null!");

    this._provider = props.provider;
    this._propertyKey = props.propertyKey;
    this._metadata = props.metadata;
    this._mcpServer = props.mcpServer;
    this._method = this.resolveMethod();
  }

  /**
   * Build the registration tuple that can be spread into
   * `mcpServer.registerPrompt(...)`.
   */
  apply(): PromptRegistration {
    const { name, title, description, argsSchema, metaProvider } =
      this._metadata;

    const config: Parameters<McpServer["registerPrompt"]>[1] = {};
    if (title.length > 0) config.title = title;
    if (description.length > 0) config.description = description;
    if (argsSchema != null) config.argsSchema = argsSchema;
    const meta = MetaUtils.getMeta(metaProvider);
    if (meta != null) config._meta = meta;

    const callback: PromptCallback<StandardSchemaWithJSON | undefined> =
      argsSchema != null
        ? (((args: Record<string, unknown>, ctx: ServerContext) =>
            this.handle(args, ctx)) as PromptCallback<
            StandardSchemaWithJSON | undefined
          >)
        : (((ctx: ServerContext) =>
            this.handle(undefined, ctx)) as PromptCallback<
            StandardSchemaWithJSON | undefined
          >);

    const resolvedName = name.length > 0 ? name : String(this._propertyKey);
    return [resolvedName, config, callback];
  }

  /**
   * Per-request handler. Invoked once per `prompts/get` request.
   *
   * Constructs a fresh transport context, optional server exchange, and
   * `McpPromptMethodContext`, then calls the underlying user method.
   */
  async handle(
    args: Record<string, unknown> | undefined,
    ctx: ServerContext,
  ): Promise<GetPromptResult> {
    try {
      const transportContext = McpTransportContext.EMPTY;
      const exchange = new McpServerExchange(
        this._mcpServer,
        ctx,
        transportContext,
      );

      const methodContext: McpPromptMethodContext = {
        exchange,
        transportContext,
        meta: new McpMeta(ctx.mcpReq._meta ?? null),
        progressToken: ctx.mcpReq._meta?.progressToken ?? null,
        signal: ctx.mcpReq.signal,
      };

      const invocationArgs =
        this._metadata.argsSchema != null
          ? [args ?? {}, methodContext]
          : [methodContext];
      const result = await this._method.apply(this._provider, invocationArgs);
      return this.convertToGetPromptResult(result);
    } catch (error) {
      if (error instanceof McpPromptMethodException) {
        throw error;
      }
      throw new McpPromptMethodException(
        `Error invoking prompt method: ${this.methodName}`,
        { cause: error instanceof Error ? error : undefined },
      );
    }
  }

  private get methodName(): string {
    return typeof this._propertyKey === "string"
      ? this._propertyKey
      : this._propertyKey.toString();
  }

  private resolveMethod(): (...args: unknown[]) => unknown {
    const candidate = (this._provider as Record<string | symbol, unknown>)[
      this._propertyKey
    ];
    assert(
      typeof candidate === "function",
      `Method not found: ${String(this._propertyKey)}`,
    );
    return candidate as (...args: unknown[]) => unknown;
  }

  private convertToGetPromptResult(result: unknown): GetPromptResult {
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

  private toPromptMessages(values: string[]): PromptMessage[] {
    return values.map((text) => ({
      role: "assistant",
      content: { type: "text", text } as TextContent,
    }));
  }

  private isGetPromptResult(value: unknown): value is GetPromptResult {
    return typeof value === "object" && value != null && "messages" in value;
  }

  private isPromptMessage(value: unknown): value is PromptMessage {
    return (
      typeof value === "object" &&
      value != null &&
      "role" in value &&
      "content" in value
    );
  }

  private getTypeName(value: unknown): string {
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
}

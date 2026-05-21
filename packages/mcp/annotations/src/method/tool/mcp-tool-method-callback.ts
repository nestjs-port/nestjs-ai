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
  McpServer,
  StandardSchemaWithJSON,
  ToolAnnotations,
  ServerContext,
} from "@modelcontextprotocol/server";
import { McpServerExchange } from "@nestjs-ai/mcp-common";
import { MetaUtils } from "../../common/meta-utils.js";
import { DefaultMcpRequestContext } from "../../context/default-mcp-request-context.js";
import type { McpRequestContext } from "../../context/mcp-request-context.js";
import { MCP_TOOL_METADATA_KEY } from "../../metadata.js";
import { McpMeta } from "../../mcp-meta.js";
import type { McpToolMethodArguments } from "../../mcp-tool.js";
import { ReturnMode } from "./return-mode.js";
import type { McpToolMetadata } from "../../mcp-tool.js";

export interface McpToolMethodCallbackProps {
  provider: object;
  propertyKey: string | symbol;
  mcpServer?: McpServer | null;
  returnMode: ReturnMode;
  returnSchema?: StandardSchemaWithJSON | null;
  toolCallExceptionClass?: new (...args: never[]) => Error;
}

export type ToolRegistration = [
  string,
  {
    title?: string;
    description?: string;
    inputSchema?: StandardSchemaWithJSON;
    outputSchema?: StandardSchemaWithJSON;
    annotations?: ToolAnnotations;
    _meta?: Record<string, unknown>;
  },
  (
    args: Record<string, unknown> | undefined,
    ctx: ServerContext,
  ) => Promise<CallToolResult>,
];

/**
 * Class for creating callbacks around tool methods that operate on an MCP server
 * exchange.
 */
export class McpToolMethodCallback {
  protected readonly _provider: object;

  protected readonly _propertyKey: string | symbol;

  protected readonly _method: (...args: unknown[]) => unknown;

  protected readonly _mcpServer: McpServer;

  protected readonly _returnMode: ReturnMode;

  protected readonly _returnSchema: StandardSchemaWithJSON | null;

  protected readonly _toolCallExceptionClass: new (...args: never[]) => Error;

  private readonly _metadata: McpToolMetadata;

  constructor(props: McpToolMethodCallbackProps) {
    assert(props.provider != null, "Provider can't be null!");
    assert(props.propertyKey != null, "Property key can't be null!");
    assert(props.returnMode != null, "Return mode can't be null!");

    this._provider = props.provider;
    this._propertyKey = props.propertyKey;
    this._mcpServer = props.mcpServer ?? ({} as McpServer);
    this._returnMode = props.returnMode;
    this._returnSchema = props.returnSchema ?? null;
    this._toolCallExceptionClass = props.toolCallExceptionClass ?? Error;
    this._method = this.resolveMethod();
    this._metadata = this.resolveMetadata();
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

  protected buildArgs(
    exchange: McpServerExchange,
    request: CallToolRequest,
  ): McpToolMethodArguments {
    const meta =
      (request.params._meta as Record<string, unknown> | undefined) ?? null;
    const progressToken =
      (meta as { progressToken?: unknown } | null)?.progressToken ?? null;

    const args: McpToolMethodArguments = {
      context: exchange.transportContext(),
      request,
      toolArguments: { ...request.params.arguments },
      meta: new McpMeta(meta),
      progressToken,
    };

    args.exchange = exchange as never;

    const requestContext = this.createRequestContext(exchange, request);
    if (requestContext !== undefined) {
      args.requestContext = requestContext;
    }

    return args;
  }

  protected callMethod(args: McpToolMethodArguments): unknown {
    return this._method.apply(this._provider, [args]);
  }

  protected async convertValueToCallToolResult(
    result: unknown,
  ): Promise<CallToolResult> {
    if (this.isCallToolResult(result)) {
      return result;
    }

    if (this._returnMode === ReturnMode.VOID || result === undefined) {
      return {
        content: [{ type: "text", text: JSON.stringify("Done") }],
      };
    }

    if (this._returnSchema != null) {
      const validated = await this._returnSchema["~standard"].validate(result);
      if (validated.issues) {
        const messages = validated.issues
          .map((issue) => issue.message)
          .filter((message) => message != null && message !== "");
        throw new Error(
          messages.length > 0
            ? `Return value does not match the configured return schema: ${messages.join("; ")}`
            : "Return value does not match the configured return schema.",
        );
      }

      return {
        content: [],
        structuredContent: validated.value as Record<string, unknown>,
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

  protected async convertToCallToolResult(
    result: unknown,
  ): Promise<CallToolResult> {
    const resolved = result instanceof Promise ? await result : result;
    return this.convertValueToCallToolResult(resolved);
  }

  protected findRootCause(error: Error): Error {
    let rootCause: Error = error;
    while (rootCause.cause instanceof Error && rootCause.cause !== rootCause) {
      rootCause = rootCause.cause;
    }
    return rootCause;
  }

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

  apply(): ToolRegistration {
    const {
      name,
      title,
      description,
      annotations,
      inputSchema,
      returnSchema,
      metaProvider,
    } = this._metadata;
    const resolvedName = name.length > 0 ? name : this.methodName;
    const config: ToolRegistration[1] = {};
    if (title.length > 0) config.title = title;
    if (description.length > 0) config.description = description;
    if (inputSchema != null) config.inputSchema = inputSchema;
    if (returnSchema != null) config.outputSchema = returnSchema;
    config.annotations = { ...annotations };
    const meta = MetaUtils.getMeta(metaProvider);
    if (meta != null) config._meta = meta;

    const callback: ToolRegistration[2] = async (
      args: Record<string, unknown> | undefined,
      ctx: ServerContext,
    ): Promise<CallToolResult> => {
      const request: CallToolRequest = {
        params: {
          name: resolvedName,
          arguments: args ?? {},
          ...(ctx.mcpReq._meta == null ? {} : { _meta: ctx.mcpReq._meta }),
        },
      } as CallToolRequest;
      const exchange = new McpServerExchange(this._mcpServer, ctx);
      return this.handle(exchange, request);
    };

    return [resolvedName, config, callback];
  }

  async handle(
    exchange: McpServerExchange,
    request: CallToolRequest,
  ): Promise<CallToolResult> {
    assert(request != null, "Request must not be null");

    try {
      const args = this.buildArgs(exchange, request);
      const result = this.callMethod(args);
      return await this.convertToCallToolResult(result);
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      if (error instanceof this._toolCallExceptionClass) {
        return this.createErrorResult(error);
      }
      throw error;
    }
  }

  protected createRequestContext(
    exchange: McpServerExchange,
    request: CallToolRequest,
  ): McpRequestContext | null | undefined {
    return new DefaultMcpRequestContext({
      exchange,
      request,
    });
  }

  private resolveMetadata(): McpToolMetadata {
    const metadata = Reflect.getMetadata(
      MCP_TOOL_METADATA_KEY,
      Object.getPrototypeOf(this._provider),
      this._propertyKey,
    ) as McpToolMetadata | undefined;
    if (metadata == null) {
      throw new Error(
        `@McpTool metadata missing on ${String(this._propertyKey)}`,
      );
    }
    return metadata;
  }
}

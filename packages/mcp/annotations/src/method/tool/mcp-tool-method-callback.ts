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

import {
  DefaultMcpRequestContext,
  type McpRequestContext,
  McpServerExchange,
  type McpTransportContext,
} from "../../context/index.js";
import {
  AbstractMcpToolMethodCallback,
  type AbstractMcpToolMethodCallbackProps,
} from "./abstract-mcp-tool-method-callback.js";

export interface McpToolMethodCallbackProps extends AbstractMcpToolMethodCallbackProps {}

/**
 * Class for creating callbacks around tool methods that operate on an MCP server
 * exchange.
 *
 * Methods registered with this callback are expected to accept a single
 * `McpToolMethodArguments` object. Errors that match the configured
 * `toolCallExceptionClass` (defaulting to `Error`) are converted into error
 * `CallToolResult` payloads; other exceptions propagate to the caller.
 */
export class McpToolMethodCallback extends AbstractMcpToolMethodCallback<McpServerExchange> {
  constructor(props: McpToolMethodCallbackProps) {
    super(props);
  }

  protected isExchangeType(value: unknown): boolean {
    return value instanceof McpServerExchange;
  }

  protected createRequestContext(
    exchange: McpServerExchange,
    request: CallToolRequest,
  ): McpRequestContext {
    return new DefaultMcpRequestContext({ exchange, request });
  }

  protected resolveTransportContext(
    exchange: McpServerExchange,
  ): McpTransportContext | null {
    if (exchange instanceof McpServerExchange) {
      return exchange.transportContext();
    }
    return null;
  }

  /**
   * Apply the callback to the given request.
   *
   * Builds the typed arguments object, invokes the user method, and converts the
   * resolved value into a `CallToolResult`. Errors of the configured class type are
   * caught and converted into error results.
   */
  async apply(
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
}

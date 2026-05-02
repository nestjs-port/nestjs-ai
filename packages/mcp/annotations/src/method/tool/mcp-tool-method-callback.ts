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

import type {
  CallToolRequest,
  CallToolResult,
} from "@modelcontextprotocol/server";
import {
  DefaultMcpRequestContext,
  type McpRequestContext,
  McpServerExchange,
} from "../../context/index.js";
import { AbstractAsyncMcpToolMethodCallback } from "./abstract-async-mcp-tool-method-callback.js";
import type { ReturnMode } from "./return-mode.js";

/**
 * Class for creating Function callbacks around tool methods.
 *
 * This class provides a way to convert methods annotated with `McpTool` into
 * callback functions that can be used to handle tool requests.
 */
export class McpToolMethodCallback extends AbstractAsyncMcpToolMethodCallback<
  McpServerExchange,
  McpRequestContext
> {
  constructor(
    returnMode: ReturnMode,
    bean: object,
    propertyKey: string | symbol,
    toolCallExceptionClass: new (...args: never[]) => Error = Error,
  ) {
    super(returnMode, bean, propertyKey, toolCallExceptionClass);
  }

  protected override isExchangeOrContextType(paramType: unknown): boolean {
    return paramType === McpServerExchange;
  }

  protected override createRequestContext(
    exchange: McpServerExchange,
    request: CallToolRequest | null,
  ): McpRequestContext {
    if (request == null) {
      throw new Error(
        "Cannot create McpRequestContext without a CallToolRequest",
      );
    }
    return new DefaultMcpRequestContext({ exchange, request });
  }

  protected override resolveTransportContext(
    exchangeOrContext: McpServerExchange,
  ): unknown {
    return exchangeOrContext.transportContext();
  }

  /**
   * Apply the callback to the given request.
   *
   * This method builds the arguments for the method call, invokes the method, and
   * returns the result.
   */
  async apply(
    exchange: McpServerExchange,
    request: CallToolRequest,
  ): Promise<CallToolResult> {
    this.validateRequest(request);

    try {
      // Build arguments for the method call, passing the full request for
      // CallToolRequest parameter support
      const args = this.buildMethodArguments(
        exchange,
        request.params.arguments ?? {},
        request,
      );

      // Invoke the method
      const result = this.callMethod(args);

      // Handle reactive types - method return types should always be reactive
      return await this.convertToCallToolResult(result);
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      if (error instanceof this._toolCallExceptionClass) {
        return this.createAsyncErrorResult(error);
      }
      throw error;
    }
  }
}

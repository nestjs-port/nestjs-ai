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
  ServerContext,
} from "@modelcontextprotocol/server";
import type { McpRequestContext } from "../../context/index.js";
import { AbstractAsyncMcpToolMethodCallback } from "./abstract-async-mcp-tool-method-callback.js";
import type { ReturnMode } from "./return-mode.js";

/**
 * Class for creating Function callbacks around async stateless tool methods.
 *
 * This class provides a way to convert methods annotated with `McpTool` into
 * callback functions that can be used to handle tool requests asynchronously in a
 * stateless manner using `ServerContext`.
 */
export class McpStatelessToolMethodCallback extends AbstractAsyncMcpToolMethodCallback<
  ServerContext,
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

  protected override isExchangeOrContextType(_paramType: unknown): boolean {
    // ServerContext is an interface, identified by parameter name in build args.
    return false;
  }

  protected override createRequestContext(
    _exchange: ServerContext,
    _request: CallToolRequest | null,
  ): McpRequestContext {
    throw new Error(
      "Stateless tool methods do not support McpRequestContext parameter.",
    );
  }

  protected override resolveTransportContext(
    exchangeOrContext: ServerContext,
  ): unknown {
    return exchangeOrContext;
  }

  /**
   * Apply the callback to the given request.
   *
   * This method builds the arguments for the method call, invokes the method, and
   * returns the result asynchronously.
   */
  async apply(
    transportContext: ServerContext,
    request: CallToolRequest,
  ): Promise<CallToolResult> {
    this.validateRequest(request);

    try {
      const args = this.buildMethodArguments(
        transportContext,
        request.params.arguments ?? {},
        request,
      );

      const result = this.callMethod(args);

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

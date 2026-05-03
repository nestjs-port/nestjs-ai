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

import { McpTransportContext } from "../../context/index.js";
import {
  AbstractMcpToolMethodCallback,
  type AbstractMcpToolMethodCallbackProps,
} from "./abstract-mcp-tool-method-callback.js";

export interface McpStatelessToolMethodCallbackProps extends AbstractMcpToolMethodCallbackProps {}

/**
 * Class for creating callbacks around tool methods that operate on a stateless
 * transport context.
 *
 * Stateless callbacks never populate `args.exchange` or `args.requestContext`. The
 * remaining contract matches `McpToolMethodCallback`.
 */
export class McpStatelessToolMethodCallback extends AbstractMcpToolMethodCallback<McpTransportContext> {
  constructor(props: McpStatelessToolMethodCallbackProps) {
    super(props);
  }

  protected isExchangeType(_value: unknown): boolean {
    return false;
  }

  protected createRequestContext(
    _context: McpTransportContext,
    _request: CallToolRequest,
  ): undefined {
    return undefined;
  }

  protected resolveTransportContext(
    context: McpTransportContext,
  ): McpTransportContext | null {
    if (context instanceof McpTransportContext) {
      return context;
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
    context: McpTransportContext,
    request: CallToolRequest,
  ): Promise<CallToolResult> {
    assert(request != null, "Request must not be null");

    try {
      const args = this.buildArgs(context, request);
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

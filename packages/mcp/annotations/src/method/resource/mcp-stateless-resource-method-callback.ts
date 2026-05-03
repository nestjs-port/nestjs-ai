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
  ReadResourceRequest,
  ReadResourceResult,
} from "@modelcontextprotocol/server";

import { McpTransportContext } from "../../context/index.js";
import type { McpTransportContext as McpTransportContextType } from "../../context/index.js";
import {
  AbstractMcpResourceMethodCallback,
  McpResourceMethodException,
  type AbstractMcpResourceMethodCallbackProps,
} from "./abstract-mcp-resource-method-callback.js";

export type McpStatelessResourceMethodCallbackProps =
  AbstractMcpResourceMethodCallbackProps;

/**
 * Class for creating resource callbacks around methods that operate on a stateless
 * server context.
 */
export class McpStatelessResourceMethodCallback extends AbstractMcpResourceMethodCallback {
  constructor(props: McpStatelessResourceMethodCallbackProps) {
    super(props);
  }

  protected resolveTransportContext(
    context: unknown,
  ): McpTransportContextType | null {
    if (context instanceof McpTransportContext) {
      return context;
    }
    return null;
  }

  protected isExchangeType(_value: unknown): boolean {
    return false;
  }

  /**
   * Apply the callback to the given context and request.
   */
  async apply(
    context: McpTransportContextType,
    request: ReadResourceRequest,
  ): Promise<ReadResourceResult> {
    assert(request != null, "Request must not be null");

    try {
      const args = this.buildArgs(context, request);
      const result = await Promise.resolve(
        this._method.apply(this._provider, [args]),
      );
      return this._resultConverter.convertToReadResourceResult(
        result,
        request.params.uri,
        this._mimeType,
        this._contentType,
        this._meta,
      );
    } catch (error) {
      throw new McpResourceMethodException(
        `Error invoking resource method: ${this.methodName}`,
        { cause: error instanceof Error ? error : undefined },
      );
    }
  }
}

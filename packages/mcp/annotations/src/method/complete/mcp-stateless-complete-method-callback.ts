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
  CompleteRequest,
  CompleteResult,
  ServerContext,
} from "@modelcontextprotocol/server";

import type { McpCompleteMetadata } from "../../mcp-complete.js";
import { McpTransportContext } from "../../context/index.js";
import {
  AbstractMcpCompleteMethodCallback,
  McpCompleteMethodException,
  type AbstractMcpCompleteMethodCallbackProps,
} from "./abstract-mcp-complete-method-callback.js";

export interface McpStatelessCompleteMethodCallbackProps extends AbstractMcpCompleteMethodCallbackProps {
  complete: McpCompleteMetadata;
}

/**
 * Class for creating completion callbacks around async methods that operate on a
 * stateless server context.
 */
export class McpStatelessCompleteMethodCallback extends AbstractMcpCompleteMethodCallback<ServerContext> {
  constructor(props: McpStatelessCompleteMethodCallbackProps) {
    super(props);
  }

  protected resolveTransportContext(context: unknown): McpTransportContext {
    void context;
    return McpTransportContext.EMPTY;
  }

  protected isExchangeType(_paramType: unknown): boolean {
    return false;
  }

  async apply(
    context: ServerContext,
    request: CompleteRequest,
  ): Promise<CompleteResult> {
    assert(request != null, "Request must not be null");

    try {
      const args = this.buildArgs(context, request);
      const result = await Promise.resolve(
        this._method.apply(this._provider, [args]),
      );
      return this.toCompleteResult(result);
    } catch (error) {
      throw new McpCompleteMethodException(
        `Error invoking complete method: ${String(this._propertyKey)}`,
        error instanceof Error ? error : undefined,
      );
    }
  }
}

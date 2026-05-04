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
  GetPromptRequest,
  GetPromptResult,
} from "@modelcontextprotocol/server";

import { McpTransportContext } from "../../context/index.js";
import type { McpTransportContext as McpTransportContextType } from "../../context/index.js";
import {
  AbstractMcpPromptMethodCallback,
  McpPromptMethodException,
  type AbstractMcpPromptMethodCallbackProps,
} from "./abstract-mcp-prompt-method-callback.js";

export interface McpStatelessPromptMethodCallbackProps extends AbstractMcpPromptMethodCallbackProps {}

/**
 * Class for creating prompt callbacks around async methods that operate on a
 * stateless server context.
 */
export class McpStatelessPromptMethodCallback extends AbstractMcpPromptMethodCallback {
  constructor(props: McpStatelessPromptMethodCallbackProps) {
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

  protected isExchangeType(_paramType: unknown): boolean {
    return false;
  }

  async apply(
    context: McpTransportContextType,
    request: GetPromptRequest,
  ): Promise<GetPromptResult> {
    assert(request != null, "Request must not be null");

    try {
      const args = await this.buildArgs(context, request);
      const result = await this._method.apply(this._provider, args);
      return this.convertToGetPromptResult(result);
    } catch (error) {
      throw new McpPromptMethodException(
        `Error invoking prompt method: ${this.methodName}`,
        { cause: error instanceof Error ? error : undefined },
      );
    }
  }
}

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
import { AbstractMcpToolMethodCallback } from "./abstract-mcp-tool-method-callback.js";
import { ReturnMode } from "./return-mode.js";

/**
 * Abstract base class for creating Function callbacks around async tool methods.
 *
 * This class provides common functionality for converting methods annotated with
 * `McpTool` into callback functions that can be used to handle tool requests
 * asynchronously.
 */
export abstract class AbstractAsyncMcpToolMethodCallback<
  TContext,
  TRequestContext,
> extends AbstractMcpToolMethodCallback<TContext, TRequestContext> {
  protected readonly _toolCallExceptionClass: new (...args: never[]) => Error;

  protected constructor(
    returnMode: ReturnMode,
    bean: object,
    propertyKey: string | symbol,
    toolCallExceptionClass: new (...args: never[]) => Error = Error,
  ) {
    super(returnMode, bean, propertyKey);
    this._toolCallExceptionClass = toolCallExceptionClass;
  }

  /**
   * Convert reactive results to a Promise<CallToolResult>.
   *
   * If the method returned a Promise, await it and convert the resolved value. If the
   * method already returned a CallToolResult, pass it through. Otherwise convert the
   * value using the standard text/structured result conversion.
   */
  protected async convertToCallToolResult(
    result: unknown,
  ): Promise<CallToolResult> {
    let resolved: unknown = result;
    if (result instanceof Promise) {
      try {
        resolved = await result;
      } catch (e) {
        return {
          content: [
            {
              type: "text",
              text: `Error invoking method: ${e instanceof Error ? e.message : String(e)}`,
            },
          ],
          isError: true,
        };
      }
    }

    if (this.isCallToolResult(resolved)) {
      return resolved;
    }

    if (resolved == null && this._returnMode === ReturnMode.VOID) {
      return {
        content: [{ type: "text", text: JSON.stringify("Done") }],
      };
    }

    return this.mapValueToCallToolResult(resolved);
  }

  /**
   * Map individual values to CallToolResult.
   */
  protected mapValueToCallToolResult(value: unknown): CallToolResult {
    return this.convertValueToCallToolResult(value);
  }

  /**
   * Creates an error result for exceptions that occur during method invocation.
   */
  protected createAsyncErrorResult(error: Error): CallToolResult {
    const rootCause = this.findCauseUsingPlainJava(error);
    return {
      content: [
        {
          type: "text",
          text: `${error.message}\n${rootCause.message}`,
        },
      ],
      isError: true,
    };
  }

  /**
   * Validates that the request is not null.
   */
  protected validateRequest(request: CallToolRequest | null): void {
    if (request == null) {
      throw new TypeError("Request must not be null");
    }
  }
}

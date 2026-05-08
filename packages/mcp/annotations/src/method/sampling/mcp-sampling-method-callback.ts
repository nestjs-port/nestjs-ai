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
  CreateMessageRequest,
  CreateMessageResult,
} from "@modelcontextprotocol/client";

import {
  AbstractMcpSamplingMethodCallback,
  McpSamplingMethodException,
  type AbstractMcpSamplingMethodCallbackProps,
} from "./abstract-mcp-sampling-method-callback.js";

export type McpSamplingMethodCallbackProps =
  AbstractMcpSamplingMethodCallbackProps;

/**
 * Class for creating Function callbacks around sampling methods that return Promise.
 *
 * This class provides a way to convert methods annotated with `McpSampling` into
 * callback functions that can be used to handle sampling requests. It supports methods
 * with a single CreateMessageRequest parameter.
 */
export class McpSamplingMethodCallback extends AbstractMcpSamplingMethodCallback {
  constructor(props: McpSamplingMethodCallbackProps) {
    super(props);
  }

  /**
   * Apply the callback to the given request.
   *
   * This method builds the arguments for the method call, invokes the method, and
   * returns a Promise that resolves with the result of the method invocation. The
   * method may return a `CreateMessageResult` directly or a `Promise<CreateMessageResult>`.
   * @param request The sampling request, must not be null
   * @return A Promise that resolves with the result of the method invocation
   * @throws McpSamplingMethodException if there is an error invoking the sampling method
   * @throws TypeError if the request is null
   */
  async apply(request: CreateMessageRequest): Promise<CreateMessageResult> {
    if (request == null) {
      throw new TypeError("Request must not be null");
    }

    try {
      // Build arguments for the method call
      const args = this.buildArgs(request);

      // Invoke the method
      const result = await this._method.apply(this._provider, args);

      if (!this.isCreateMessageResult(result)) {
        throw new McpSamplingMethodException(
          `Method must return CreateMessageResult or Promise<CreateMessageResult>: ${this.methodName}`,
        );
      }

      return result;
    } catch (error) {
      if (error instanceof McpSamplingMethodException) {
        throw error;
      }
      throw new McpSamplingMethodException(
        `Error invoking sampling method: ${this.methodName}`,
        { cause: error instanceof Error ? error : undefined },
      );
    }
  }

  private isCreateMessageResult(value: unknown): value is CreateMessageResult {
    return (
      value != null &&
      typeof value === "object" &&
      "role" in value &&
      "content" in value &&
      "model" in value
    );
  }
}

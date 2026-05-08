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

import type {
  CreateMessageRequest,
  CreateMessageResult,
} from "@modelcontextprotocol/client";

import { McpSampling } from "../../../mcp-sampling.js";

/**
 * Example class with methods annotated with `McpSampling` for testing the sampling
 * method callback.
 */
export class McpSamplingMethodCallbackExample {
  /**
   * Example method that handles a sampling request and returns a result.
   */
  @McpSampling({ clients: ["test-client"] })
  handleSamplingRequest(request: CreateMessageRequest): CreateMessageResult {
    void request;

    // Process the request and return a result
    return {
      role: "assistant",
      content: {
        type: "text",
        text: "This is a response to the sampling request",
      },
      model: "test-model",
    };
  }

  /**
   * Example method that handles a sampling request asynchronously and returns a Promise
   * that resolves with the result.
   */
  @McpSampling({ clients: ["test-client"] })
  async handleAsyncSamplingRequest(
    request: CreateMessageRequest,
  ): Promise<CreateMessageResult> {
    void request;

    // Process the request asynchronously and return a result
    return {
      role: "assistant",
      content: {
        type: "text",
        text: "This is an async response to the sampling request",
      },
      model: "test-model",
    };
  }

  /**
   * Example method that returns a direct (non-Promise) result. Used to verify that the
   * callback can wrap a synchronous return value in a Promise.
   */
  @McpSampling({ clients: ["test-client"] })
  handleDirectSamplingRequest(
    request: CreateMessageRequest,
  ): CreateMessageResult {
    void request;

    // Process the request and return a direct result
    return {
      role: "assistant",
      content: {
        type: "text",
        text: "This is a direct response to the sampling request",
      },
      model: "test-model",
    };
  }

  // Invalid signatures for compile-time validation only

  // @ts-expect-error @McpSampling only supports methods returning CreateMessageResult or Promise<CreateMessageResult>
  @McpSampling({ clients: ["test-client"] })
  invalidReturnType(request: CreateMessageRequest): string {
    void request;

    return "Invalid return type";
  }

  // @ts-expect-error @McpSampling only supports methods returning CreateMessageResult or Promise<CreateMessageResult>
  @McpSampling({ clients: ["test-client"] })
  async invalidPromiseReturnType(
    request: CreateMessageRequest,
  ): Promise<string> {
    void request;

    return "Invalid Promise return type";
  }

  // @ts-expect-error @McpSampling only supports methods with a single CreateMessageRequest parameter
  @McpSampling({ clients: ["test-client"] })
  invalidParameterType(request: string): Promise<CreateMessageResult> {
    void request;

    return Promise.resolve({
      role: "assistant",
      content: {
        type: "text",
        text: "test",
      },
      model: "test-model",
    });
  }

  // @ts-expect-error @McpSampling only supports methods with a single CreateMessageRequest parameter
  @McpSampling({ clients: ["test-client"] })
  noParameters(): Promise<CreateMessageResult> {
    return Promise.resolve({
      role: "assistant",
      content: {
        type: "text",
        text: "test",
      },
      model: "test-model",
    });
  }

  // @ts-expect-error @McpSampling only supports methods with a single CreateMessageRequest parameter
  @McpSampling({ clients: ["test-client"] })
  tooManyParameters(
    request: CreateMessageRequest,
    extra: string,
  ): Promise<CreateMessageResult> {
    void request;
    void extra;

    return Promise.resolve({
      role: "assistant",
      content: {
        type: "text",
        text: "test",
      },
      model: "test-model",
    });
  }
}

void McpSamplingMethodCallbackExample;

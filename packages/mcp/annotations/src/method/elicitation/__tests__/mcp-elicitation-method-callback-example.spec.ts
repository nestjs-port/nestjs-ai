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

import type { ElicitRequest, ElicitResult } from "@modelcontextprotocol/server";
import { StructuredElicitResult } from "../../../context/index.js";
import { McpElicitation } from "../../../mcp-elicitation.js";

/**
 * Example class demonstrating elicitation method usage.
 */
export class McpElicitationMethodCallbackExample {
  @McpElicitation({ clients: ["my-client-id"] })
  handleElicitationRequest(request: ElicitRequest): ElicitResult {
    void request;

    return {
      action: "accept",
      content: {
        userInput: "Example async user input",
        confirmed: true,
        timestamp: Date.now(),
      },
    };
  }

  @McpElicitation({ clients: ["my-client-id"] })
  async handleDeclineElicitationRequest(
    request: ElicitRequest,
  ): Promise<ElicitResult> {
    void request;

    await new Promise((resolve) => setTimeout(resolve, 100));

    return {
      action: "decline",
      content: undefined,
    };
  }

  @McpElicitation({ clients: ["my-client-id"] })
  handleSyncElicitationRequest(request: ElicitRequest): ElicitResult {
    return {
      action: "accept",
      content: {
        syncResponse:
          "This was returned synchronously but wrapped in Promise in Java",
        requestMessage: request.params.message,
      },
    };
  }

  @McpElicitation({ clients: ["my-client-id"] })
  async handleCancelElicitationRequest(
    request: ElicitRequest,
  ): Promise<ElicitResult> {
    void request;

    return {
      action: "cancel",
      content: undefined,
    };
  }

  @McpElicitation({ clients: ["my-client-id"] })
  handleStructuredElicitationRequest(
    request: ElicitRequest,
  ): StructuredElicitResult<{
    structuredResponse: string;
    requestMessage: string;
  }> {
    return new StructuredElicitResult({
      action: "accept",
      structuredContent: {
        structuredResponse: "Structured response",
        requestMessage: request.params.message,
      },
      meta: {
        source: "structured",
      },
    });
  }

  // Test methods for invalid scenarios

  // @ts-expect-error @McpElicitation only supports methods returning ElicitResult, StructuredElicitResult, or Promise thereof
  @McpElicitation({ clients: ["my-client-id"] })
  invalidReturnType(request: ElicitRequest): string {
    void request;

    return "Invalid return type";
  }

  // @ts-expect-error @McpElicitation only supports methods returning ElicitResult, StructuredElicitResult, or Promise thereof
  @McpElicitation({ clients: ["my-client-id"] })
  async invalidMonoReturnType(request: ElicitRequest): Promise<string> {
    void request;

    return "Invalid Mono return type";
  }

  // @ts-expect-error @McpElicitation only supports methods with a single ElicitRequest parameter
  @McpElicitation({ clients: ["my-client-id"] })
  invalidParameterType(request: string): Promise<ElicitResult> {
    void request;

    return Promise.resolve({
      action: "accept",
      content: {
        test: "value",
      },
    });
  }

  // @ts-expect-error @McpElicitation only supports methods with a single ElicitRequest parameter
  @McpElicitation({ clients: ["my-client-id"] })
  noParameters(): Promise<ElicitResult> {
    return Promise.resolve({
      action: "accept",
      content: {
        test: "value",
      },
    });
  }

  // @ts-expect-error @McpElicitation only supports methods with a single ElicitRequest parameter
  @McpElicitation({ clients: ["my-client-id"] })
  tooManyParameters(
    request: ElicitRequest,
    extra: string,
  ): Promise<ElicitResult> {
    void request;
    void extra;

    return Promise.resolve({
      action: "accept",
      content: {
        test: "value",
      },
    });
  }
}

void McpElicitationMethodCallbackExample;
